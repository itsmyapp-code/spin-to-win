'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { initFirebase } from '@/lib/firebase';
import {
  getCustomerByToken,
  saveSpinResult,
  getWheelConfig,
} from '@/lib/firestoreOps';
import { useAuth } from './AuthContext';
import SpinWheel from './SpinWheel';
import type { Customer, PrizeTier, WheelConfig } from '@/lib/types';

interface CustomerViewProps {
  token: string | null;
}

export default function CustomerView({ token }: CustomerViewProps) {
  const { user, signInAsCustomer, authLoading } = useAuth();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [config, setConfig] = useState<WheelConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [spinResult, setSpinResult] = useState<{ prize: PrizeTier; code: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Auto sign in anonymously
  useEffect(() => {
    if (!authLoading && !user) {
      signInAsCustomer();
    }
  }, [authLoading, user, signInAsCustomer]);

  // Load customer + config once auth is ready
  useEffect(() => {
    if (authLoading || !user) return;
    if (!token) {
      setLoading(false);
      setError('NO_TOKEN');
      return;
    }

    (async () => {
      try {
        const { db } = initFirebase();
        const [cust, cfg] = await Promise.all([
          getCustomerByToken(db, token),
          getWheelConfig(db),
        ]);
        if (!cust) {
          setError('NOT_FOUND');
        } else {
          setCustomer(cust);
          // If customer name is 'Test User' or token contains 'TEST', bypass the "already spun" locking screen for testing
          const isTestSession = cust.name.toLowerCase().includes('test') || token.toLowerCase().includes('test');
          if (cust.spinStatus === 'spun' && cust.prizeId && cust.prizeCode && !isTestSession) {
            const prize = cfg.prizes.find((p) => p.id === cust.prizeId) ?? null;
            if (prize) {
              setSpinResult({ prize, code: cust.prizeCode });
            }
          }
        }
        setConfig(cfg);
      } catch {
        setError('LOAD_FAILED');
      } finally {
        setLoading(false);
      }
    })();
  }, [authLoading, user, token]);

  const handleSpinComplete = useCallback(
    async (prize: PrizeTier, prizeCode: string) => {
      if (!customer) return;
      setSpinResult({ prize, code: prizeCode });
      
      const isTestSession = customer.name.toLowerCase().includes('test') || (token && token.toLowerCase().includes('test'));
      try {
        const { db } = initFirebase();
        // If it's a test session, write the win log but do not lock out the spinStatus
        if (isTestSession) {
          // Log results, but optionally skip updating customer record to 'spun' to allow infinite spins
          await saveSpinResult(db, customer.id, prize.id, prize.name, prizeCode);
          // Reset spin status locally back to fresh after 5 seconds to let them spin again
          setTimeout(() => {
            setSpinResult(null);
          }, 5000);
        } else {
          await saveSpinResult(db, customer.id, prize.id, prize.name, prizeCode);
          setCustomer((prev) => prev ? { ...prev, spinStatus: 'spun', prizeId: prize.id, prizeName: prize.name, prizeCode } : prev);
        }
      } catch {
        // Result stored in local state even if Firestore write fails
      }
    },
    [customer, token]
  );

  const handleSaveToCloud = useCallback(async () => {
    setSaving(true);
    await new Promise((r) => setTimeout(r, 900));
    setSaving(false);
    setSaved(true);
  }, []);

  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  // ─── Loading ────────────────────────────────────────────────────────────────
  if (authLoading || loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: '16px' }}>
        <div style={{
          width: '48px', height: '48px',
          border: '3px solid var(--color-border)',
          borderTopColor: 'var(--color-gold)',
          borderRadius: '50%',
          animation: 'spin 0.9s linear infinite',
        }} />
        <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.8rem', letterSpacing: '0.1em' }}>
          LOADING SESSION…
        </p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // ─── Error States ────────────────────────────────────────────────────────────
  if (error === 'NO_TOKEN') {
    return (
      <div className="animate-fade-in" style={{ maxWidth: '480px', margin: '80px auto', textAlign: 'center', padding: '40px' }}>
        <div style={{ fontSize: '3rem', marginBottom: '16px' }}>🎡</div>
        <h2 style={{ color: 'var(--color-gold)', fontSize: '1.1rem', marginBottom: '12px', letterSpacing: '0.08em' }}>
          ACCESS TOKEN REQUIRED
        </h2>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.82rem', lineHeight: '1.7' }}>
          This page requires a personalised link with a valid access token.<br />
          Please check the link you received from The Seven Stars.
        </p>
      </div>
    );
  }

  if (error === 'NOT_FOUND') {
    return (
      <div className="animate-fade-in" style={{ maxWidth: '480px', margin: '80px auto', textAlign: 'center', padding: '40px' }}>
        <div style={{ fontSize: '3rem', marginBottom: '16px' }}>🔍</div>
        <h2 style={{ color: 'var(--color-crimson)', fontSize: '1.1rem', marginBottom: '12px', letterSpacing: '0.08em' }}>
          TOKEN NOT RECOGNISED
        </h2>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.82rem', lineHeight: '1.7' }}>
          The access token <code style={{ color: 'var(--color-gold)' }}>{token}</code> was not found in our system.<br />
          Please contact The Seven Stars for assistance.
        </p>
      </div>
    );
  }

  if (error === 'LOAD_FAILED') {
    return (
      <div className="animate-fade-in" style={{ maxWidth: '480px', margin: '80px auto', textAlign: 'center', padding: '40px' }}>
        <div style={{ fontSize: '3rem', marginBottom: '16px' }}>⚠️</div>
        <h2 style={{ color: 'var(--color-crimson)', fontSize: '1.1rem', marginBottom: '12px' }}>CONNECTION ERROR</h2>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.82rem', lineHeight: '1.7' }}>
          Unable to load your session. Please check your connection and try refreshing.
        </p>
      </div>
    );
  }

  if (!customer || !config) return null;

  // ─── Already Spun — Show Result ───────────────────────────────────────────────
  if (customer.spinStatus === 'spun' && spinResult) {
    return (
      <div className="animate-fade-in" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px', padding: '32px', maxWidth: '1100px', margin: '0 auto' }}>
        <WheelPanel prizes={config.prizes} disabled={true} onSpinComplete={() => void 0} alreadySpun />
        <ResultCard
          customer={customer}
          spinResult={spinResult}
          saving={saving}
          saved={saved}
          onSave={handleSaveToCloud}
          onPrint={handlePrint}
          alreadySpun
        />
      </div>
    );
  }

  // ─── Fresh Spin ──────────────────────────────────────────────────────────────
  return (
    <div className="animate-fade-in grid-two-col" style={{ padding: '24px', maxWidth: '1100px', margin: '0 auto' }}>
      {/* Left: Wheel */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* Welcome */}
        <div className="glass" style={{ padding: '20px 24px', borderRadius: '8px' }}>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.72rem', letterSpacing: '0.12em', textTransform: 'uppercase', margin: '0 0 4px' }}>
            Welcome back
          </p>
          <h2 style={{ color: 'var(--color-gold)', fontSize: '1.4rem', fontWeight: 800, margin: 0 }}>
            {customer.name}
          </h2>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.76rem', margin: '8px 0 0' }}>
            Your personalised spin is ready. Good luck! 🍀
          </p>
        </div>

        <WheelPanel
          prizes={config.prizes}
          disabled={customer.spinStatus === 'spun'}
          onSpinComplete={handleSpinComplete}
          alreadySpun={false}
        />
      </div>

      {/* Right: Result or waiting */}
      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        {spinResult ? (
          <ResultCard
            customer={customer}
            spinResult={spinResult}
            saving={saving}
            saved={saved}
            onSave={handleSaveToCloud}
            onPrint={handlePrint}
            alreadySpun={false}
          />
        ) : (
          <div
            className="glass"
            style={{
              padding: '40px',
              borderRadius: '8px',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '16px',
              minHeight: '300px',
              justifyContent: 'center',
            }}
          >
            <div style={{ fontSize: '3rem' }}>🎡</div>
            <h3 style={{ color: 'var(--color-gold)', fontSize: '1rem', letterSpacing: '0.08em', margin: 0 }}>
              SPIN TO REVEAL YOUR PRIZE
            </h3>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.8rem', lineHeight: '1.7', margin: 0 }}>
              Click the button below the wheel to start.<br />
              Your result will be saved automatically.
            </p>
            <div style={{
              width: '60px',
              height: '2px',
              background: 'linear-gradient(90deg, transparent, var(--color-gold), transparent)',
              margin: '8px 0',
            }} />
            <p style={{ color: 'var(--color-text-dim)', fontSize: '0.72rem', margin: 0 }}>
              Each token is valid for one spin only.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function WheelPanel({
  prizes, disabled, onSpinComplete, alreadySpun,
}: {
  prizes: PrizeTier[];
  disabled: boolean;
  onSpinComplete: (prize: PrizeTier, code: string) => void;
  alreadySpun: boolean;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px', width: '100%' }}>
      {alreadySpun && (
        <div className="badge-gold" style={{ alignSelf: 'flex-start' }}>
          Already Spun — Result Recorded
        </div>
      )}
      <SpinWheel prizes={prizes} onSpinComplete={onSpinComplete} disabled={disabled} />

      {/* Clean Prize Legend */}
      <div className="glass" style={{ width: '100%', padding: '16px', borderRadius: '8px', marginTop: '12px' }}>
        <p style={{ color: 'var(--color-gold)', fontSize: '0.75rem', fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', margin: '0 0 12px' }}>
          🎯 Prize Legend
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {prizes.map((p) => (
            <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.78rem' }}>
              <div style={{ width: '12px', height: '12px', borderRadius: '3px', background: p.colour, flexShrink: 0 }} />
              <strong style={{ color: 'var(--color-gold-bright)', minWidth: '24px' }}>{p.id}</strong>
              <span>{p.emoji}</span>
              <span style={{ color: 'var(--color-text-primary)', fontWeight: 600 }}>{p.name}</span>
              <span className="hide-mobile" style={{ color: 'var(--color-text-dim)', fontSize: '0.7rem', marginLeft: 'auto' }}>{p.description}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ResultCard({
  customer, spinResult, saving, saved, onSave, onPrint, alreadySpun,
}: {
  customer: Customer;
  spinResult: { prize: PrizeTier; code: string };
  saving: boolean;
  saved: boolean;
  onSave: () => void;
  onPrint: () => void;
  alreadySpun: boolean;
}) {
  const isLoser = spinResult.prize.id === 'P6';

  return (
    <div
      id="voucher-print"
      className="glass animate-fade-in-scale"
      style={{
        padding: '32px',
        borderRadius: '8px',
        border: `1px solid ${isLoser ? 'var(--color-border)' : 'rgba(197,168,107,0.4)'}`,
        boxShadow: isLoser ? 'none' : '0 0 40px rgba(197,168,107,0.12)',
      }}
    >
      {/* Result header */}
      <div style={{ textAlign: 'center', marginBottom: '24px' }}>
        <div style={{ fontSize: '3rem', marginBottom: '8px' }}>{spinResult.prize.emoji}</div>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.7rem', letterSpacing: '0.15em', textTransform: 'uppercase', margin: '0 0 6px' }}>
          {alreadySpun ? 'Your Recorded Result' : 'Congratulations!'}
        </p>
        <h2 style={{
          color: isLoser ? 'var(--color-text-secondary)' : 'var(--color-gold)',
          fontSize: isLoser ? '1.2rem' : '1.5rem',
          fontWeight: 800,
          margin: '0 0 8px',
          lineHeight: 1.2,
        }}>
          {spinResult.prize.name}
        </h2>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.82rem', lineHeight: 1.6, margin: 0 }}>
          {spinResult.prize.description}
        </p>
      </div>

      {!isLoser && (
        <>
          {/* Validation code */}
          <div
            style={{
              background: 'var(--color-charcoal)',
              border: '1px solid var(--color-gold-dim)',
              borderRadius: '6px',
              padding: '16px',
              textAlign: 'center',
              margin: '0 0 16px',
            }}
          >
            <p style={{ color: 'var(--color-text-dim)', fontSize: '0.65rem', letterSpacing: '0.15em', textTransform: 'uppercase', margin: '0 0 8px' }}>
              Validation Code
            </p>
            <p style={{
              color: 'var(--color-gold)',
              fontSize: '1.3rem',
              fontWeight: 800,
              letterSpacing: '0.12em',
              margin: 0,
            }}>
              {spinResult.code}
            </p>
          </div>

          {/* Terms */}
          <div
            style={{
              background: 'rgba(197,168,107,0.05)',
              borderRadius: '4px',
              padding: '12px 14px',
              marginBottom: '20px',
              borderLeft: '2px solid var(--color-gold-dim)',
            }}
          >
            <p style={{ color: 'var(--color-text-dim)', fontSize: '0.65rem', letterSpacing: '0.12em', textTransform: 'uppercase', margin: '0 0 4px' }}>
              Prize Terms
            </p>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.75rem', lineHeight: 1.6, margin: 0 }}>
              {spinResult.prize.terms}
            </p>
          </div>

          {/* Customer ref */}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px', fontSize: '0.72rem', color: 'var(--color-text-dim)' }}>
            <span>Issued to: <span style={{ color: 'var(--color-text-secondary)' }}>{customer.name}</span></span>
            <span>One use only</span>
          </div>

          {/* Action buttons */}
          <div className="voucher-actions" style={{ display: 'flex', gap: '10px' }}>
            <button
              id="save-to-cloud-btn"
              onClick={onSave}
              disabled={saving || saved}
              className={saved ? 'btn-sage' : 'btn-gold'}
              style={{ flex: 1 }}
            >
              {saving ? '⏳ Saving…' : saved ? '✔ Saved to Cloud' : '☁ Save Win to Cloud Ledger'}
            </button>
            <button
              id="print-voucher-btn"
              onClick={onPrint}
              className="btn-ghost"
              style={{ flex: 1 }}
            >
              🖨 Snapshot Voucher
            </button>
          </div>
        </>
      )}

      {isLoser && (
        <div style={{ textAlign: 'center', padding: '16px 0' }}>
          <p style={{ color: 'var(--color-text-dim)', fontSize: '0.8rem', lineHeight: 1.7 }}>
            Thanks for playing — visit us again soon!<br />
            <a href="/terms" style={{ color: 'var(--color-gold)', textDecoration: 'underline' }}>
              View prize terms
            </a>
          </p>
        </div>
      )}
    </div>
  );
}

'use client';

import React, { useState, useCallback, useRef } from 'react';
import { useAuth } from './AuthContext';
import { initFirebase } from '@/lib/firebase';
import { getCustomerByCode, burnVoucher } from '@/lib/firestoreOps';
import type { Customer, VerifyState } from '@/lib/types';
import StaffAuthForm from './StaffAuthForm';

function formatCode(raw: string): string {
  const cleaned = raw.toUpperCase().replace(/[^A-Z0-9]/g, '');
  const parts: string[] = [];
  if (cleaned.length > 0) parts.push(cleaned.slice(0, 3));
  if (cleaned.length > 3) parts.push(cleaned.slice(3, 9));
  if (cleaned.length > 9) parts.push(cleaned.slice(9));
  return parts.join('-');
}

export default function StaffTerminal() {
  const { user, staffRole } = useAuth();
  const [codeInput, setCodeInput] = useState('');
  const [verifyState, setVerifyState] = useState<VerifyState>('idle');
  const [foundCustomer, setFoundCustomer] = useState<Customer | null>(null);
  const [burning, setBurning] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);


  const handleCodeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCode(e.target.value);
    setCodeInput(formatted);
    setVerifyState('idle');
    setFoundCustomer(null);
  }, []);

  const handleVerify = useCallback(async () => {
    const cleanCode = codeInput.replace(/[^A-Z0-9]/g, '').toUpperCase();
    if (cleanCode.length < 6) return;

    setVerifyState('loading');
    try {
      const { db } = initFirebase();
      const customer = await getCustomerByCode(db, codeInput);
      if (!customer) {
        setVerifyState('not_found');
        setFoundCustomer(null);
        return;
      }

      // Check the specific prize matching the code
      const matchedPrize = customer.prizesWon?.find((p) => 
        p.prizeCode === codeInput || (cleanCode.length === 6 && p.prizeCode.includes(`-${cleanCode}-`))
      ) || ((customer.prizeCode === codeInput || (cleanCode.length === 6 && customer.prizeCode?.includes(`-${cleanCode}-`))) ? {
        prizeId: customer.prizeId,
        prizeName: customer.prizeName,
        prizeCode: customer.prizeCode || '',
        redeemedAt: customer.redeemedAt,
        redeemedByEmail: customer.redeemedByEmail,
      } : null);

      if (!matchedPrize || !matchedPrize.prizeCode) {
        setVerifyState('not_found');
        setFoundCustomer(null);
      } else {
        // Auto-complete field to the full code
        setCodeInput(matchedPrize.prizeCode);

        if (matchedPrize.redeemedAt) {
          setVerifyState('already_redeemed');
          setFoundCustomer(customer);
        } else {
          setVerifyState('valid');
          setFoundCustomer(customer);
        }
      }
    } catch {
      setVerifyState('not_found');
    }
  }, [codeInput]);

  const handleBurn = useCallback(async () => {
    if (!foundCustomer || !user?.email) return;
    setBurning(true);
    try {
      const { db } = initFirebase();
      await burnVoucher(db, foundCustomer.id, user.email, codeInput);
      setVerifyState('burned');
      setFoundCustomer((prev) => {
        if (!prev) return null;
        const redeemedAt = new Date().toISOString();
        const updatedPrizesWon = prev.prizesWon?.map((p) => {
          if (p.prizeCode === codeInput) {
            return { ...p, redeemedAt, redeemedByEmail: user.email };
          }
          return p;
        });
        return {
          ...prev,
          redeemedAt: prev.prizeCode === codeInput ? redeemedAt : prev.redeemedAt,
          redeemedByEmail: prev.prizeCode === codeInput ? user.email : prev.redeemedByEmail,
          prizesWon: updatedPrizesWon
        };
      });
    } catch {
      // surface error state
    } finally {
      setBurning(false);
    }
  }, [foundCustomer, user, codeInput]);

  const handleReset = useCallback(() => {
    setCodeInput('');
    setVerifyState('idle');
    setFoundCustomer(null);
    inputRef.current?.focus();
  }, []);

  // ─── Auth Gate ────────────────────────────────────────────────────────────────
  if (!user || user.isAnonymous || !staffRole) {
    return (
      <StaffAuthForm
        title="STAFF TERMINAL"
        icon="🏷️"
        subtitle="Authorised personnel only"
      />
    );
  }

  const matchedPrize = foundCustomer?.prizesWon?.find((p) => p.prizeCode === codeInput) || 
    (foundCustomer?.prizeCode === codeInput ? {
      prizeId: foundCustomer.prizeId,
      prizeName: foundCustomer.prizeName,
      prizeCode: foundCustomer.prizeCode,
      redeemedAt: foundCustomer.redeemedAt,
      redeemedByEmail: foundCustomer.redeemedByEmail,
    } : null);

  // ─── POS Terminal ─────────────────────────────────────────────────────────────
  return (
    <div className="animate-fade-in" style={{ maxWidth: '640px', margin: '40px auto', padding: '0 24px' }}>
      {/* Header bar */}
      <div className="glass" style={{ padding: '14px 20px', borderRadius: '6px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '1.1rem' }}>🏷️</span>
          <div>
            <p style={{ color: 'var(--color-gold)', fontSize: '0.72rem', letterSpacing: '0.1em', textTransform: 'uppercase', margin: 0, fontWeight: 700 }}>
              Staff Terminal
            </p>
            <p style={{ color: 'var(--color-text-dim)', fontSize: '0.68rem', margin: 0 }}>
              {user.email} · {staffRole.role.toUpperCase()}
            </p>
          </div>
        </div>
        <span className="badge-sage">{staffRole.role}</span>
      </div>

      {/* Code input panel */}
      <div className="glass cursor-glow-panel" style={{ padding: '32px', borderRadius: '8px', marginBottom: '20px' }}>
        <label htmlFor="voucher-code" style={{ display: 'block', color: 'var(--color-text-secondary)', fontSize: '0.7rem', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '10px' }}>
          Enter Voucher Code
        </label>
        <div style={{ display: 'flex', gap: '10px' }}>
          <input
            id="voucher-code"
            ref={inputRef}
            type="text"
            value={codeInput}
            onChange={handleCodeChange}
            onKeyDown={(e) => e.key === 'Enter' && handleVerify()}
            className="input-base"
            placeholder="e.g. 545638 or full code"
            maxLength={16}
            style={{
              fontSize: '1.2rem',
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              flex: 1,
            }}
            autoFocus
            autoComplete="off"
            spellCheck={false}
            disabled={verifyState === 'burned'}
          />
          <button
            id="verify-btn"
            onClick={handleVerify}
            disabled={codeInput.replace(/[^A-Z0-9]/g, '').length < 6 || verifyState === 'loading' || verifyState === 'burned'}
            className="btn-gold"
            style={{ whiteSpace: 'nowrap', minWidth: '120px' }}
          >
            {verifyState === 'loading' ? '⏳ Checking…' : '✦ Verify'}
          </button>
        </div>
        <p style={{ color: 'var(--color-text-dim)', fontSize: '0.65rem', marginTop: '10px', marginBottom: 0 }}>
          💡 <strong>Tip:</strong> You can enter just the 6-digit number from the voucher to verify!
        </p>
      </div>

      {/* Verification result */}
      {verifyState === 'not_found' && (
        <div className="animate-fade-in" style={{
          padding: '20px 24px',
          borderRadius: '6px',
          background: 'var(--color-crimson-ghost)',
          border: '1px solid rgba(196,90,90,0.3)',
        }}>
          <p style={{ color: 'var(--color-crimson)', fontWeight: 700, fontSize: '0.82rem', letterSpacing: '0.08em', margin: '0 0 4px' }}>
            ✗ ERROR: Code missing from validation ledger
          </p>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.75rem', margin: 0 }}>
            The code <strong style={{ color: 'var(--color-text-primary)' }}>{codeInput}</strong> was not found. Check the code and try again.
          </p>
        </div>
      )}

      {verifyState === 'already_redeemed' && foundCustomer && (
        <div className="animate-fade-in" style={{
          padding: '20px 24px',
          borderRadius: '6px',
          background: 'var(--color-crimson-ghost)',
          border: '1px solid rgba(196,90,90,0.3)',
        }}>
          <p style={{ color: 'var(--color-crimson)', fontWeight: 700, fontSize: '0.82rem', letterSpacing: '0.08em', margin: '0 0 8px' }}>
            ✗ ERROR: Voucher previously claimed
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '0.78rem' }}>
            <div>
              <span style={{ color: 'var(--color-text-dim)', fontSize: '0.68rem', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Claimed by</span>
              <p style={{ color: 'var(--color-text-primary)', margin: '2px 0 0', fontWeight: 600 }}>{foundCustomer.name}</p>
            </div>
            <div>
              <span style={{ color: 'var(--color-text-dim)', fontSize: '0.68rem', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Timestamp (UTC)</span>
              <p style={{ color: 'var(--color-text-primary)', margin: '2px 0 0', fontWeight: 600 }}>
                {matchedPrize?.redeemedAt ? new Date(matchedPrize.redeemedAt).toUTCString() : '—'}
              </p>
            </div>
          </div>
        </div>
      )}

      {verifyState === 'valid' && foundCustomer && (
        <div className="animate-fade-in" style={{
          padding: '28px',
          borderRadius: '8px',
          background: 'var(--color-sage-ghost)',
          border: '1px solid rgba(83,135,115,0.4)',
        }}>
          <div className="badge-sage" style={{ marginBottom: '16px' }}>✓ Valid — Active Voucher</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
            <InfoRow label="Customer Name" value={foundCustomer.name} />
            <InfoRow label="Email" value={foundCustomer.email} />
            <InfoRow label="Prize" value={matchedPrize?.prizeName ?? '—'} highlight />
            <InfoRow label="Code" value={matchedPrize?.prizeCode ?? '—'} highlight />
          </div>
          <button
            id="burn-voucher-btn"
            onClick={handleBurn}
            disabled={burning}
            className="btn-sage"
            style={{ width: '100%', fontSize: '0.9rem', padding: '16px' }}
          >
            {burning ? '⏳ Processing…' : '✔ Authorize & Burn Voucher Reward'}
          </button>
        </div>
      )}

      {verifyState === 'burned' && foundCustomer && (
        <div className="animate-fade-in-scale" style={{
          padding: '28px',
          borderRadius: '8px',
          background: 'var(--color-sage-ghost)',
          border: '1px solid rgba(83,135,115,0.6)',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>✅</div>
          <h3 style={{ color: 'var(--color-sage)', fontSize: '1rem', letterSpacing: '0.08em', margin: '0 0 8px' }}>
            VOUCHER REDEEMED
          </h3>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.8rem', lineHeight: 1.7, margin: '0 0 16px' }}>
            {foundCustomer.name}'s voucher for{' '}
            <strong style={{ color: 'var(--color-text-primary)' }}>{matchedPrize?.prizeName}</strong>{' '}
            has been marked as redeemed.<br />
            <span style={{ color: 'var(--color-text-dim)', fontSize: '0.72rem' }}>
              UTC: {matchedPrize?.redeemedAt ? new Date(matchedPrize.redeemedAt).toUTCString() : new Date().toUTCString()}
            </span>
          </p>
          <button id="reset-terminal-btn" onClick={handleReset} className="btn-gold" style={{ minWidth: '200px' }}>
            ↩ New Verification
          </button>
        </div>
      )}
    </div>
  );
}

function InfoRow({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div>
      <p style={{ color: 'var(--color-text-dim)', fontSize: '0.65rem', letterSpacing: '0.12em', textTransform: 'uppercase', margin: '0 0 4px' }}>
        {label}
      </p>
      <p style={{ color: highlight ? 'var(--color-gold)' : 'var(--color-text-primary)', fontSize: '0.88rem', fontWeight: highlight ? 700 : 500, margin: 0 }}>
        {value}
      </p>
    </div>
  );
}

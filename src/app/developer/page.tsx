'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '../components/AuthContext';
import { initFirebase } from '@/lib/firebase';
import { getWheelConfig, saveWheelConfig } from '@/lib/firestoreOps';
import type { WheelConfig, PrizeTier } from '@/lib/types';


export default function DeveloperPage() {
  const { user, authLoading } = useAuth();
  const [isVerified, setIsVerified] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const [config, setConfig] = useState<WheelConfig | null>(null);
  const [gameType, setGameType] = useState<'wheel' | 'scratch' | 'slots'>('wheel');
  const [prizes, setPrizes] = useState<PrizeTier[]>([]);
  const [customTerms, setCustomTerms] = useState('');
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);

  // Read verification status from sessionStorage
  useEffect(() => {
    const verified = sessionStorage.getItem('isDevVerified') === 'true';
    if (verified) {
      setIsVerified(true);
    }
  }, []);

  // Handle Passcode submission
  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setVerifying(true);
    setAuthError(null);
    try {
      const res = await fetch('/api/developer/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: passwordInput }),
      });
      if (res.ok) {
        sessionStorage.setItem('isDevVerified', 'true');
        setIsVerified(true);
      } else {
        setAuthError('Incorrect developer passcode.');
      }
    } catch {
      setAuthError('Connection error. Please try again.');
    } finally {
      setVerifying(false);
    }
  };

  // Load config once verified
  useEffect(() => {
    if (!isVerified) return;
    const { db } = initFirebase();
    (async () => {
      try {
        const cfg = await getWheelConfig(db);
        setConfig(cfg);
        setGameType(cfg.gameType || 'wheel');
        setPrizes(cfg.prizes || []);
        setCustomTerms(cfg.customTerms || '');
      } catch (e) {
        console.error('Error loading config:', e);
      } finally {
        setLoadingConfig(false);
      }
    })();
  }, [isVerified]);

  const handleSave = useCallback(async () => {
    setSaving(true);
    setSaveMsg(null);
    try {
      const { db } = initFirebase();
      // Ensure we have a valid email to pass to the config save (defaults to developer system email)
      const saveEmail = user?.email || 'developer@itsmyapp.co.uk';
      await saveWheelConfig(db, prizes, saveEmail, customTerms, gameType);
      setSaveMsg('✔ Game type updated successfully in Firestore.');
    } catch (e) {
      setSaveMsg('✗ Error saving configuration. Ensure you are signed in.');
      console.error(e);
    } finally {
      setSaving(false);
      setTimeout(() => setSaveMsg(null), 4000);
    }
  }, [user, prizes, customTerms, gameType]);

  // Loading spinner
  if (authLoading || (isVerified && loadingConfig)) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <LoadingSpinner label="Authenticating Developer Session…" />
      </div>
    );
  }

  // Passcode verification gate
  if (!isVerified) {
    return (
      <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '80vh', padding: '24px' }}>
        <div className="glass" style={{ maxWidth: '440px', width: '100%', padding: '40px', borderRadius: '12px', border: '1px solid var(--color-gold-dim)', textAlign: 'center' }}>
          <span style={{ fontSize: '3rem' }}>🛠️</span>
          <h2 style={{ color: 'var(--color-gold)', fontSize: '1.2rem', fontWeight: 800, margin: '16px 0 8px', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            DEVELOPER ACCESS ONLY
          </h2>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.78rem', marginBottom: '24px', lineHeight: 1.6 }}>
            This portal is restricted to product developers. Standard admin or manager credentials will not grant access.
          </p>

          <form onSubmit={handleVerify} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ textAlign: 'left' }}>
              <label htmlFor="dev-passcode" style={{ display: 'block', fontSize: '0.68rem', color: 'var(--color-text-dim)', letterSpacing: '0.08em', marginBottom: '6px' }}>
                ENTER DEVELOPER PASSCODE:
              </label>
              <input
                id="dev-passcode"
                type="password"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                className="input-base"
                placeholder="••••••••••••"
                required
                style={{ textAlign: 'center', fontSize: '1rem', padding: '12px' }}
              />
            </div>

            {authError && (
              <p style={{ color: 'var(--color-crimson)', fontSize: '0.72rem', margin: 0 }}>
                {authError}
              </p>
            )}

            <button
              type="submit"
              disabled={verifying}
              className="btn-gold"
              style={{ width: '100%', padding: '14px', fontSize: '0.85rem' }}
            >
              {verifying ? '⏳ Verifying…' : '🔑 Unlock Developer Suite'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '800px', margin: '60px auto', padding: '0 32px', fontFamily: 'var(--font-mono)' }}>
      {/* Back button */}
      <Link href="/" style={{ color: 'var(--color-gold)', fontSize: '0.75rem', textDecoration: 'none', letterSpacing: '0.08em', display: 'inline-block', marginBottom: '32px' }}>
        ← Back to Hub
      </Link>

      {/* Header */}
      <div style={{ marginBottom: '40px' }}>
        <span style={{ fontSize: '2.5rem' }}>🛠️</span>
        <h1 style={{ color: 'var(--color-gold)', fontSize: '1.4rem', fontWeight: 800, margin: '12px 0 6px', letterSpacing: '0.05em' }}>
          DEVELOPER CONTROL SUITE
        </h1>
        <p style={{ color: 'var(--color-text-dim)', fontSize: '0.74rem', margin: 0, letterSpacing: '0.05em' }}>
          Restricted Developer Console · Switch Engine & Game Mechanics
        </p>
      </div>

      {/* Settings Panel */}
      <div className="glass" style={{ padding: '32px', borderRadius: '12px', border: '1px solid var(--color-gold-dim)', display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <div>
          <h2 style={{ color: 'var(--color-gold-bright)', fontSize: '0.9rem', fontWeight: 700, margin: '0 0 8px', letterSpacing: '0.05em' }}>
            Active Campaign Game Type
          </h2>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.78rem', lineHeight: 1.6, margin: 0 }}>
            Choose which interactive game variant is presented to end-users on this deployment.
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <label htmlFor="dev-game-select" style={{ fontSize: '0.7rem', color: 'var(--color-text-dim)', letterSpacing: '0.08em' }}>
            SELECT ENGINE TYPE:
          </label>
          <select
            id="dev-game-select"
            value={gameType}
            onChange={(e) => setGameType(e.target.value as any)}
            className="input-base"
            style={{
              padding: '12px 18px',
              fontSize: '0.88rem',
              background: 'var(--color-charcoal)',
              border: '1px solid var(--color-border)',
              borderRadius: '6px',
              color: 'var(--color-text-primary)',
              width: '100%',
              cursor: 'pointer'
            }}
          >
            <option value="wheel">🎡 Spin to Win Wheel (CSS Transform Rotation)</option>
            <option value="scratch">🎫 12-Grid Match-3 Scratch Card (HTML5 Canvas)</option>
            <option value="slots">🎰 One-Armed Bandit Slot Reels (Vertical Drag/Release)</option>
          </select>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginTop: '10px' }}>
          <button
            onClick={handleSave}
            disabled={saving}
            className="btn-gold"
            style={{ padding: '12px 24px', fontSize: '0.85rem' }}
          >
            {saving ? '⏳ Persisting Configuration…' : '💾 Commit Game Type Changes'}
          </button>
          
          {saveMsg && (
            <span style={{ fontSize: '0.78rem', color: saveMsg.includes('Error') ? 'var(--color-crimson)' : 'var(--color-sage)' }}>
              {saveMsg}
            </span>
          )}
        </div>
      </div>

      {/* Notice */}
      <div style={{ marginTop: '24px', padding: '16px 20px', borderRadius: '8px', background: 'rgba(176, 62, 62, 0.03)', border: '1px solid rgba(176, 62, 62, 0.15)', fontSize: '0.74rem', color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>
        <strong style={{ color: 'var(--color-crimson)' }}>Operational Notice:</strong> Changing the game type changes the frontend layout for all customer URLs instantly. Existing win codes, claims ledger, and prize probabilities are preserved in Firestore.
      </div>
    </div>
  );
}

function LoadingSpinner({ label }: { label: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '50vh', gap: '16px' }}>
      <div style={{ width: '40px', height: '40px', border: '3px solid var(--color-border)', borderTopColor: 'var(--color-gold)', borderRadius: '50%', animation: 'spin 0.9s linear infinite' }} />
      <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.78rem', letterSpacing: '0.1em' }}>{label.toUpperCase()}</p>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

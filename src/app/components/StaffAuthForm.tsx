'use client';

import React, { useState, useCallback } from 'react';
import { useAuth } from './AuthContext';

type AuthMode = 'signin' | 'signup' | 'reset';

interface StaffAuthFormProps {
  title: string;
  icon: string;
  subtitle: string;
  requiredRole?: string;
}

export default function StaffAuthForm({ title, icon, subtitle }: StaffAuthFormProps) {
  const { signInAsStaff, createStaffAccount, sendPasswordReset, authError, authLoading, clearAuthError } = useAuth();

  const [mode, setMode] = useState<AuthMode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const switchMode = (next: AuthMode) => {
    setMode(next);
    setLocalError(null);
    clearAuthError();
    setResetSent(false);
    setPassword('');
    setConfirmPassword('');
  };

  const handleSignIn = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    await signInAsStaff(email, password);
  }, [email, password, signInAsStaff]);

  const handleSignUp = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    if (password !== confirmPassword) {
      setLocalError('Passwords do not match.');
      return;
    }
    if (password.length < 8) {
      setLocalError('Password must be at least 8 characters.');
      return;
    }
    await createStaffAccount(email, password);
  }, [email, password, confirmPassword, createStaffAccount]);

  const handleReset = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    const result = await sendPasswordReset(email);
    if (result === 'success') setResetSent(true);
  }, [email, sendPasswordReset]);

  const displayError = localError ?? authError;

  return (
    <div className="animate-fade-in" style={{ maxWidth: '440px', margin: '80px auto', padding: '0 24px' }}>
      <div className="glass" style={{ padding: '40px', borderRadius: '8px' }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div style={{ fontSize: '2rem', marginBottom: '10px' }}>{icon}</div>
          <h2 style={{ color: 'var(--color-gold)', fontSize: '1rem', letterSpacing: '0.1em', margin: '0 0 4px' }}>
            {title}
          </h2>
          <p style={{ color: 'var(--color-text-dim)', fontSize: '0.72rem', margin: 0 }}>{subtitle}</p>
        </div>

        {/* Mode tabs */}
        <div style={{ display: 'flex', gap: '2px', background: 'var(--color-charcoal)', borderRadius: '4px', padding: '3px', marginBottom: '24px' }}>
          {(['signin', 'signup', 'reset'] as AuthMode[]).map((m) => (
            <button
              key={m}
              onClick={() => switchMode(m)}
              style={{
                flex: 1,
                fontFamily: 'var(--font-mono)',
                fontSize: '0.68rem',
                fontWeight: mode === m ? 700 : 500,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                padding: '7px 4px',
                border: 'none',
                borderRadius: '3px',
                cursor: 'pointer',
                background: mode === m ? 'rgba(197,168,107,0.15)' : 'transparent',
                color: mode === m ? 'var(--color-gold)' : 'var(--color-text-dim)',
                transition: 'all 0.2s ease',
              }}
            >
              {m === 'signin' ? 'Sign In' : m === 'signup' ? 'Create Account' : 'Reset Password'}
            </button>
          ))}
        </div>

        {/* ── Sign In ── */}
        {mode === 'signin' && (
          <form onSubmit={handleSignIn} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <EmailField value={email} onChange={setEmail} id="signin-email" />
            <PasswordField
              id="signin-password"
              value={password}
              onChange={setPassword}
              show={showPassword}
              onToggle={() => setShowPassword((v) => !v)}
              label="Password"
            />
            {displayError && <ErrorBadge message={displayError} />}
            <button type="submit" disabled={authLoading} className="btn-gold" style={{ width: '100%', marginTop: '4px' }}>
              {authLoading ? 'Signing in…' : 'Sign In →'}
            </button>
            <button
              type="button"
              onClick={() => switchMode('reset')}
              style={{ background: 'none', border: 'none', color: 'var(--color-text-dim)', fontSize: '0.72rem', cursor: 'pointer', fontFamily: 'var(--font-mono)', textAlign: 'center', letterSpacing: '0.04em' }}
            >
              Forgot your password?
            </button>
          </form>
        )}

        {/* ── Create Account ── */}
        {mode === 'signup' && (
          <form onSubmit={handleSignUp} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <EmailField value={email} onChange={setEmail} id="signup-email" />
            <PasswordField
              id="signup-password"
              value={password}
              onChange={setPassword}
              show={showPassword}
              onToggle={() => setShowPassword((v) => !v)}
              label="Password (min 8 characters)"
            />
            <PasswordField
              id="signup-confirm"
              value={confirmPassword}
              onChange={setConfirmPassword}
              show={showConfirm}
              onToggle={() => setShowConfirm((v) => !v)}
              label="Confirm Password"
            />
            {displayError && <ErrorBadge message={displayError} />}
            <button type="submit" disabled={authLoading} className="btn-gold" style={{ width: '100%', marginTop: '4px' }}>
              {authLoading ? 'Creating account…' : 'Create Account →'}
            </button>
            <div style={{ padding: '10px 12px', borderRadius: '4px', background: 'rgba(197,168,107,0.06)', border: '1px solid rgba(197,168,107,0.15)' }}>
              <p style={{ color: 'var(--color-text-dim)', fontSize: '0.7rem', margin: 0, lineHeight: 1.6 }}>
                ⚠ After creating your account, an admin must assign your role in Firestore before you can access this panel.
              </p>
            </div>
          </form>
        )}

        {/* ── Reset Password ── */}
        {mode === 'reset' && (
          <form onSubmit={handleReset} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {resetSent ? (
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <div style={{ fontSize: '2rem', marginBottom: '10px' }}>📧</div>
                <p style={{ color: 'var(--color-sage)', fontWeight: 700, fontSize: '0.85rem', margin: '0 0 8px' }}>
                  Reset email sent!
                </p>
                <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.78rem', lineHeight: 1.6, margin: '0 0 16px' }}>
                  Check <strong style={{ color: 'var(--color-text-primary)' }}>{email}</strong> for a password reset link.
                </p>
                <button type="button" onClick={() => switchMode('signin')} className="btn-ghost" style={{ width: '100%' }}>
                  ← Back to Sign In
                </button>
              </div>
            ) : (
              <>
                <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.78rem', lineHeight: 1.6, margin: '0 0 4px' }}>
                  Enter your email address and we'll send you a link to reset your password.
                </p>
                <EmailField value={email} onChange={setEmail} id="reset-email" />
                {displayError && <ErrorBadge message={displayError} />}
                <button type="submit" disabled={authLoading} className="btn-gold" style={{ width: '100%' }}>
                  {authLoading ? 'Sending…' : 'Send Reset Link →'}
                </button>
                <button type="button" onClick={() => switchMode('signin')} className="btn-ghost" style={{ width: '100%' }}>
                  ← Back to Sign In
                </button>
              </>
            )}
          </form>
        )}
      </div>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function EmailField({ value, onChange, id }: { value: string; onChange: (v: string) => void; id: string }) {
  return (
    <div>
      <label htmlFor={id} style={{ display: 'block', color: 'var(--color-text-secondary)', fontSize: '0.7rem', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '6px' }}>
        Email Address
      </label>
      <input
        id={id}
        type="email"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="input-base"
        placeholder="you@example.com"
        required
        autoComplete="email"
      />
    </div>
  );
}

function PasswordField({
  id, value, onChange, show, onToggle, label,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  show: boolean;
  onToggle: () => void;
  label: string;
}) {
  return (
    <div>
      <label htmlFor={id} style={{ display: 'block', color: 'var(--color-text-secondary)', fontSize: '0.7rem', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '6px' }}>
        {label}
      </label>
      <div style={{ position: 'relative' }}>
        <input
          id={id}
          type={show ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="input-base"
          placeholder={show ? 'your password' : '••••••••'}
          required
          autoComplete={id.includes('confirm') ? 'new-password' : id.includes('signup') ? 'new-password' : 'current-password'}
          style={{ paddingRight: '44px' }}
        />
        <button
          type="button"
          onClick={onToggle}
          aria-label={show ? 'Hide password' : 'Show password'}
          style={{
            position: 'absolute',
            right: '10px',
            top: '50%',
            transform: 'translateY(-50%)',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--color-text-dim)',
            fontSize: '1rem',
            padding: '4px',
            lineHeight: 1,
          }}
        >
          {show ? '🙈' : '👁'}
        </button>
      </div>
    </div>
  );
}

function ErrorBadge({ message }: { message: string }) {
  return (
    <div style={{
      padding: '9px 12px',
      borderRadius: '4px',
      background: 'var(--color-crimson-ghost)',
      border: '1px solid rgba(196,90,90,0.3)',
      color: 'var(--color-crimson)',
      fontSize: '0.76rem',
      lineHeight: 1.5,
    }}>
      ✗ {message}
    </div>
  );
}

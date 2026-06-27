'use client';

import React from 'react';
import { useConsent } from './ConsentContext';

export default function CookieConsent() {
  const { status, accept, reject } = useConsent();

  if (status !== 'pending') return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Privacy preference centre"
      className="fixed bottom-0 left-0 right-0 z-50 animate-fade-in"
      style={{ background: 'rgba(7, 7, 10, 0.97)', borderTop: '1px solid rgba(197,168,107,0.2)' }}
    >
      <div className="max-w-screen-xl mx-auto px-8 py-5 flex items-center gap-8">
        {/* Icon */}
        <div style={{ fontSize: '1.5rem', flexShrink: 0 }}>🔐</div>

        {/* Text block */}
        <div className="flex-1 min-w-0">
          <p style={{ fontSize: '0.78rem', color: 'var(--color-text-primary)', lineHeight: '1.6', margin: 0 }}>
            <strong style={{ color: 'var(--color-gold)', fontWeight: 700 }}>Privacy Notice.</strong>{' '}
            This application uses{' '}
            <strong style={{ color: 'var(--color-text-primary)' }}>browser localStorage</strong> (not cookies)
            to store your consent preference and Firebase Authentication session data — no third-party tracking,
            no analytics cookies, no cross-site data sharing. Read our{' '}
            <a
              href="/privacy"
              style={{ color: 'var(--color-gold)', textDecoration: 'underline' }}
            >
              Privacy Policy
            </a>{' '}
            and{' '}
            <a
              href="/cookies"
              style={{ color: 'var(--color-gold)', textDecoration: 'underline' }}
            >
              Cookie Statement
            </a>.
          </p>
        </div>

        {/* Action buttons — equal visual weight per UK GDPR requirement */}
        <div className="flex gap-3 flex-shrink-0">
          <button
            id="consent-reject"
            onClick={reject}
            className="btn-ghost"
            style={{ minWidth: '120px' }}
            aria-label="Reject optional data storage"
          >
            Reject
          </button>
          <button
            id="consent-accept"
            onClick={accept}
            className="btn-gold"
            style={{ minWidth: '120px' }}
            aria-label="Accept data storage terms"
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  );
}

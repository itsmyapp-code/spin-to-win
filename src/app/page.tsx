'use client';

import React, { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import RoleSwitcher from './components/RoleSwitcher';
import CustomerView from './components/CustomerView';
import StaffTerminal from './components/StaffTerminal';
import ManagerDashboard from './components/ManagerDashboard';
import AdminPortal from './components/AdminPortal';
import type { ActiveView } from '@/lib/types';

function HubContent() {
  const searchParams = useSearchParams();
  const tokenParam = searchParams.get('token');
  // If customer has a token, lock to customer view and hide the menu entirely
  const isCustomerOnlyMode = Boolean(tokenParam);
  const [activeView, setActiveView] = useState<ActiveView>('customer');

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', position: 'relative' }}>
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 40,
          background: 'rgba(7,7,10,0.97)',
          backdropFilter: 'blur(20px)',
          borderBottom: '1px solid rgba(197,168,107,0.15)',
        }}
      >
        <div className="header-inner">
          {/* Branding */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
            {/* Logo */}
            <img
              src="/itsmyapp_logo.png"
              alt="Its My App"
              width={36}
              height={36}
              style={{
                width: '36px',
                height: '36px',
                flexShrink: 0,
                objectFit: 'contain',
                filter: 'drop-shadow(0 0 8px rgba(197,168,107,0.4))',
              }}
            />
            <div style={{ lineHeight: 1 }}>
              <p style={{ color: 'var(--color-gold)', fontSize: '0.72rem', fontWeight: 800, letterSpacing: '0.15em', textTransform: 'uppercase', margin: 0, whiteSpace: 'nowrap' }}>
                Its My App
              </p>
              <p className="hide-mobile" style={{ color: 'var(--color-text-dim)', fontSize: '0.62rem', letterSpacing: '0.08em', margin: 0 }}>
                Promotional Spin Hub
              </p>
            </div>
          </div>

          {/* Divider - hidden on mobile */}
          {!isCustomerOnlyMode && (
            <div className="hide-mobile" style={{ width: '1px', height: '32px', background: 'var(--color-border)', flexShrink: 0 }} />
          )}

          {/* Role switcher — only show to staff/manager/admin, not to customers arriving via token */}
          {!isCustomerOnlyMode && (
            <RoleSwitcher active={activeView} onChange={setActiveView} />
          )}

          {/* Customer-mode label */}
          {isCustomerOnlyMode && (
            <span className="badge-gold" style={{ fontSize: '0.62rem' }}>Spin Session</span>
          )}

          {/* Spacer */}
          <div style={{ flex: 1 }} />

          {/* Live indicator */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--color-sage)' }} />
            <span className="hide-mobile" style={{ color: 'var(--color-text-dim)', fontSize: '0.65rem', letterSpacing: '0.1em' }}>LIVE</span>
          </div>
        </div>
      </header>

      {/* ── Main Content ─────────────────────────────────────────────────────── */}
      <main style={{ flex: 1, position: 'relative', zIndex: 1 }}>
        {/* Decorative background grid */}
        <div
          aria-hidden="true"
          style={{
            position: 'fixed',
            inset: 0,
            backgroundImage: `
              linear-gradient(rgba(197,168,107,0.02) 1px, transparent 1px),
              linear-gradient(90deg, rgba(197,168,107,0.02) 1px, transparent 1px)
            `,
            backgroundSize: '48px 48px',
            pointerEvents: 'none',
            zIndex: 0,
          }}
        />

        {/* Customer panel — always rendered when token present */}
        <div
          id="panel-customer"
          role="tabpanel"
          aria-labelledby="tab-customer"
          style={{ display: (isCustomerOnlyMode || activeView === 'customer') ? 'block' : 'none', position: 'relative', zIndex: 1 }}
        >
          <CustomerView token={tokenParam} />
        </div>

        {!isCustomerOnlyMode && (
          <>
            <div
              id="panel-staff"
              role="tabpanel"
              aria-labelledby="tab-staff"
              style={{ display: activeView === 'staff' ? 'block' : 'none', position: 'relative', zIndex: 1 }}
            >
              <StaffTerminal />
            </div>

            <div
              id="panel-manager"
              role="tabpanel"
              aria-labelledby="tab-manager"
              style={{ display: activeView === 'manager' ? 'block' : 'none', position: 'relative', zIndex: 1 }}
            >
              <ManagerDashboard />
            </div>

            <div
              id="panel-admin"
              role="tabpanel"
              aria-labelledby="tab-admin"
              style={{ display: activeView === 'admin' ? 'block' : 'none', position: 'relative', zIndex: 1 }}
            >
              <AdminPortal />
            </div>
          </>
        )}
      </main>

      {/* ── Footer ───────────────────────────────────────────────────────────── */}
      <footer
        style={{
          borderTop: '1px solid var(--color-border-dim)',
          padding: '14px 20px',
          background: 'var(--color-charcoal)',
          position: 'relative',
          zIndex: 2,
        }}
      >
        <div style={{ maxWidth: '1400px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
          <p style={{ color: 'var(--color-text-dim)', fontSize: '0.65rem', margin: 0 }}>
            © {new Date().getFullYear()} Its My App · No cookies · Zero telemetry
          </p>
          <nav aria-label="Legal links" style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
            {[
              { href: '/terms', label: 'Terms' },
              { href: '/privacy', label: 'Privacy' },
              { href: '/cookies', label: 'Cookies' },
              { href: '/accessibility', label: 'Accessibility' },
            ].map(({ href, label }) => (
              <a
                key={href}
                href={href}
                style={{ color: 'var(--color-text-dim)', fontSize: '0.65rem', textDecoration: 'none', transition: 'color 0.2s' }}
                onMouseEnter={(e) => { (e.target as HTMLAnchorElement).style.color = 'var(--color-gold)'; }}
                onMouseLeave={(e) => { (e.target as HTMLAnchorElement).style.color = 'var(--color-text-dim)'; }}
              >
                {label}
              </a>
            ))}
          </nav>
        </div>
      </footer>
    </div>
  );
}

export default function HomePage() {
  return (
    <Suspense fallback={
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <div style={{ width: '48px', height: '48px', border: '3px solid var(--color-border)', borderTopColor: 'var(--color-gold)', borderRadius: '50%', animation: 'spin 0.9s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    }>
      <HubContent />
    </Suspense>
  );
}

'use client';

import React, { useState, useEffect, Suspense } from 'react';
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
  const [activeView, setActiveView] = useState<ActiveView>(tokenParam ? 'customer' : 'customer');

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', position: 'relative' }}>
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 40,
          background: 'rgba(7,7,10,0.96)',
          backdropFilter: 'blur(20px)',
          borderBottom: '1px solid rgba(197,168,107,0.15)',
          padding: '0 32px',
        }}
      >
        <div style={{ maxWidth: '1400px', margin: '0 auto', display: 'flex', alignItems: 'center', gap: '24px', height: '64px' }}>
          {/* Branding */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
            <div
              aria-hidden="true"
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #C5A86B, #8B7447)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1rem',
                fontWeight: 800,
                color: '#07070A',
                flexShrink: 0,
                boxShadow: '0 0 12px rgba(197,168,107,0.3)',
              }}
            >
              7★
            </div>
            <div style={{ lineHeight: 1 }}>
              <p style={{ color: 'var(--color-gold)', fontSize: '0.72rem', fontWeight: 800, letterSpacing: '0.15em', textTransform: 'uppercase', margin: 0 }}>
                The Seven Stars
              </p>
              <p style={{ color: 'var(--color-text-dim)', fontSize: '0.62rem', letterSpacing: '0.08em', margin: 0 }}>
                Promotional Spin Hub
              </p>
            </div>
          </div>

          {/* Divider */}
          <div style={{ width: '1px', height: '32px', background: 'var(--color-border)', flexShrink: 0 }} />

          {/* Role switcher */}
          <RoleSwitcher active={activeView} onChange={setActiveView} />

          {/* Spacer */}
          <div style={{ flex: 1 }} />

          {/* Status indicator */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--color-sage)', animation: 'pulseGold 2s ease-in-out infinite' }} />
            <span style={{ color: 'var(--color-text-dim)', fontSize: '0.65rem', letterSpacing: '0.1em' }}>LIVE</span>
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

        {/* View panels */}
        <div
          id={`panel-customer`}
          role="tabpanel"
          aria-labelledby="tab-customer"
          style={{ display: activeView === 'customer' ? 'block' : 'none', position: 'relative', zIndex: 1 }}
        >
          <CustomerView token={tokenParam} />
        </div>

        <div
          id={`panel-staff`}
          role="tabpanel"
          aria-labelledby="tab-staff"
          style={{ display: activeView === 'staff' ? 'block' : 'none', position: 'relative', zIndex: 1 }}
        >
          <StaffTerminal />
        </div>

        <div
          id={`panel-manager`}
          role="tabpanel"
          aria-labelledby="tab-manager"
          style={{ display: activeView === 'manager' ? 'block' : 'none', position: 'relative', zIndex: 1 }}
        >
          <ManagerDashboard />
        </div>

        <div
          id={`panel-admin`}
          role="tabpanel"
          aria-labelledby="tab-admin"
          style={{ display: activeView === 'admin' ? 'block' : 'none', position: 'relative', zIndex: 1 }}
        >
          <AdminPortal />
        </div>
      </main>

      {/* ── Footer ───────────────────────────────────────────────────────────── */}
      <footer
        style={{
          borderTop: '1px solid var(--color-border-dim)',
          padding: '16px 32px',
          background: 'var(--color-charcoal)',
          position: 'relative',
          zIndex: 2,
        }}
      >
        <div
          style={{
            maxWidth: '1400px',
            margin: '0 auto',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '8px',
          }}
        >
          <p style={{ color: 'var(--color-text-dim)', fontSize: '0.68rem', margin: 0, letterSpacing: '0.05em' }}>
            © {new Date().getFullYear()} The Seven Stars · All rights reserved · No cookies · Zero telemetry
          </p>
          <nav aria-label="Legal links" style={{ display: 'flex', gap: '20px' }}>
            {[
              { href: '/terms', label: 'Terms' },
              { href: '/privacy', label: 'Privacy' },
              { href: '/cookies', label: 'Cookies' },
              { href: '/accessibility', label: 'Accessibility' },
            ].map(({ href, label }) => (
              <a
                key={href}
                href={href}
                style={{
                  color: 'var(--color-text-dim)',
                  fontSize: '0.68rem',
                  textDecoration: 'none',
                  letterSpacing: '0.05em',
                  transition: 'color 0.2s',
                }}
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

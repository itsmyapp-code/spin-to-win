'use client';

import React from 'react';
import type { ActiveView } from '@/lib/types';

interface RoleSwitcherProps {
  active: ActiveView;
  onChange: (view: ActiveView) => void;
}

const TABS: { id: ActiveView; label: string; icon: string; desc: string }[] = [
  { id: 'customer', label: 'Customer View', icon: '🎡', desc: 'Spin the wheel' },
  { id: 'staff',    label: 'Staff Terminal', icon: '🏷️', desc: 'Verify & burn vouchers' },
  { id: 'manager',  label: 'Manager Dashboard', icon: '📊', desc: 'Prize config & audit' },
  { id: 'admin',    label: 'Admin Portal', icon: '⚙️', desc: 'Customer onboarding' },
];

export default function RoleSwitcher({ active, onChange }: RoleSwitcherProps) {
  return (
    <div
      role="tablist"
      aria-label="Application role switcher"
      className="role-tab-bar"
    >
      {TABS.map((tab) => {
        const isActive = active === tab.id;
        return (
          <button
            key={tab.id}
            id={`tab-${tab.id}`}
            role="tab"
            aria-selected={isActive}
            aria-controls={`panel-${tab.id}`}
            onClick={() => onChange(tab.id)}
            title={tab.desc}
            style={{
              fontFamily: 'var(--font-mono)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 16px',
              borderRadius: '4px',
              border: 'none',
              cursor: 'pointer',
              fontSize: '0.75rem',
              fontWeight: isActive ? 700 : 500,
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
              transition: 'all 0.2s ease',
              background: isActive
                ? 'linear-gradient(135deg, rgba(197,168,107,0.15), rgba(197,168,107,0.08))'
                : 'transparent',
              color: isActive ? 'var(--color-gold)' : 'var(--color-text-secondary)',
              borderBottom: isActive ? '2px solid var(--color-gold)' : '2px solid transparent',
              boxShadow: isActive ? '0 0 12px rgba(197,168,107,0.1)' : 'none',
            }}
          >
            <span style={{ fontSize: '0.9rem' }}>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
}

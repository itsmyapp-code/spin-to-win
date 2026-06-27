'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { initFirebase } from '@/lib/firebase';
import { getWheelConfig, saveWheelConfig } from '@/lib/firestoreOps';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import type { WheelConfig, PrizeTier, Customer } from '@/lib/types';
import StaffAuthForm from './StaffAuthForm';

export default function ManagerDashboard() {
  const { user, staffRole } = useAuth();
  const [config, setConfig] = useState<WheelConfig | null>(null);
  const [editedPrizes, setEditedPrizes] = useState<PrizeTier[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const [sortField, setSortField] = useState<keyof Customer>('createdAt');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [customTerms, setCustomTerms] = useState('');

  useEffect(() => {
    if (!user || user.isAnonymous || !staffRole) return;
    const { db } = initFirebase();

    // 1. Get initial wheel configurations
    (async () => {
      try {
        const cfg = await getWheelConfig(db);
        setConfig(cfg);
        setEditedPrizes(cfg.prizes.map((p) => ({ ...p })));
        setCustomTerms(cfg.customTerms || '');
      } catch (e) {
        console.error(e);
      }
    })();

    // 2. Set up real-time live customer sync listener
    const q = query(collection(db, 'spinCustomers'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const custs = snapshot.docs.map((doc) => doc.data() as Customer);
      setCustomers(custs);
      setLoading(false);
    }, (error) => {
      console.error("Firestore sync error:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user, staffRole]);


  const handlePrizeChange = useCallback(
    (id: string, field: keyof PrizeTier, value: string | number) => {
      setEditedPrizes((prev) =>
        prev.map((p) => (p.id === id ? { ...p, [field]: value } : p))
      );
    },
    []
  );

  const handleSaveConfig = useCallback(async () => {
    if (!user?.email) return;
    setSaving(true);
    setSaveMsg(null);
    try {
      const { db } = initFirebase();
      await saveWheelConfig(db, editedPrizes, user.email, customTerms);
      setConfig((prev) => prev ? { ...prev, prizes: editedPrizes, customTerms } : prev);
      setSaveMsg('Configuration saved successfully.');
    } catch {
      setSaveMsg('Error saving configuration. Please try again.');
    } finally {
      setSaving(false);
      setTimeout(() => setSaveMsg(null), 4000);
    }
  }, [user, editedPrizes, customTerms]);

  const handleSort = useCallback((field: keyof Customer) => {
    setSortField((prev) => {
      if (prev === field) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
      return field;
    });
  }, []);

  const sorted = [...customers].sort((a, b) => {
    const av = a[sortField] ?? '';
    const bv = b[sortField] ?? '';
    const cmp = String(av).localeCompare(String(bv));
    return sortDir === 'asc' ? cmp : -cmp;
  });

  const totalUnits = editedPrizes.filter((p) => p.inventory >= 0).reduce((s, p) => s + p.inventory, 0);
  const unclaimed = customers.filter((c) => c.spinStatus === 'spun' && !c.redeemedAt).length;
  const redeemed = customers.filter((c) => !!c.redeemedAt).length;
  const totalSpun = customers.filter((c) => c.spinStatus === 'spun').length;

  // ─── Auth gate ────────────────────────────────────────────────────────────────
  if (!user || user.isAnonymous || !staffRole || staffRole.role === 'staff') {
    return (
      <StaffAuthForm
        title="MANAGER DASHBOARD"
        icon="📊"
        subtitle="Manager or Admin access required"
      />
    );
  }

  if (loading) {
    return <LoadingSpinner label="Loading dashboard…" />;
  }

  const totalWeight = editedPrizes.reduce((s, p) => s + p.weight, 0);

  return (
    <div className="manager-content" style={{ padding: '24px 32px', maxWidth: '1400px', margin: '0 auto' }}>

      {/* Metric tally boxes */}
      <div className="grid-four-col">
        <MetricBox label="Total Customers" value={String(customers.length)} icon="👥" />
        <MetricBox label="Total Spun" value={String(totalSpun)} icon="🎡" />
        <MetricBox label="Unclaimed Outstanding" value={String(unclaimed)} icon="⏳" accent="gold" />
        <MetricBox label="Confirmed Redemptions" value={String(redeemed)} icon="✅" accent="sage" />
      </div>

      {/* Prize Config Matrix */}
      <section style={{ marginBottom: '40px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <h2 style={{ color: 'var(--color-gold)', fontSize: '0.9rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', margin: 0 }}>
              Prize Probability Matrix
            </h2>
            <p style={{ color: 'var(--color-text-dim)', fontSize: '0.72rem', margin: '4px 0 0' }}>
              Adjust weights and inventory. Total weight: <strong style={{ color: 'var(--color-text-primary)' }}>{totalWeight}</strong>
            </p>
          </div>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            {saveMsg && (
              <span style={{ fontSize: '0.75rem', color: saveMsg.includes('Error') ? 'var(--color-crimson)' : 'var(--color-sage)', animation: 'fadeIn 0.3s ease' }}>
                {saveMsg}
              </span>
            )}
            <button id="save-config-btn" onClick={handleSaveConfig} disabled={saving} className="btn-gold">
              {saving ? '⏳ Saving…' : '💾 Save Configuration'}
            </button>
          </div>
        </div>

        <div className="glass" style={{ borderRadius: '8px', overflow: 'hidden' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Prize</th>
                <th>Name</th>
                <th style={{ width: '120px' }}>Weight</th>
                <th style={{ width: '80px' }}>%</th>
                <th style={{ width: '120px' }}>Inventory</th>
                <th>Terms (abbreviated)</th>
              </tr>
            </thead>
            <tbody>
              {editedPrizes.map((prize) => {
                const pct = ((prize.weight / totalWeight) * 100).toFixed(1);
                return (
                  <tr key={prize.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ width: '12px', height: '12px', borderRadius: '2px', background: prize.colour, flexShrink: 0 }} />
                        <span style={{ color: 'var(--color-text-dim)', fontSize: '0.7rem' }}>{prize.id}</span>
                        <span style={{ fontSize: '1rem' }}>{prize.emoji}</span>
                      </div>
                    </td>
                    <td>
                      <input
                        type="text"
                        value={prize.name}
                        onChange={(e) => handlePrizeChange(prize.id, 'name', e.target.value)}
                        className="input-base"
                        style={{ padding: '6px 10px', fontSize: '0.8rem' }}
                        aria-label={`Name for prize ${prize.id}`}
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={prize.weight}
                        onChange={(e) => handlePrizeChange(prize.id, 'weight', Number(e.target.value))}
                        className="input-base"
                        style={{ padding: '6px 10px', fontSize: '0.85rem', textAlign: 'center' }}
                        aria-label={`Weight for prize ${prize.id}`}
                      />
                    </td>
                    <td>
                      <span style={{
                        color: Number(pct) > 30 ? 'var(--color-gold)' : 'var(--color-text-secondary)',
                        fontWeight: 600,
                        fontSize: '0.82rem',
                      }}>
                        {pct}%
                      </span>
                    </td>
                    <td>
                      <input
                        type="number"
                        min={-1}
                        value={prize.inventory}
                        onChange={(e) => handlePrizeChange(prize.id, 'inventory', Number(e.target.value))}
                        className="input-base"
                        style={{ padding: '6px 10px', fontSize: '0.85rem', textAlign: 'center' }}
                        aria-label={`Inventory for prize ${prize.id}`}
                        title="-1 = unlimited"
                      />
                    </td>
                    <td>
                      <input
                        type="text"
                        value={prize.terms}
                        onChange={(e) => handlePrizeChange(prize.id, 'terms', e.target.value)}
                        className="input-base"
                        style={{ padding: '6px 10px', fontSize: '0.8rem', minWidth: '240px' }}
                        aria-label={`Terms for prize ${prize.id}`}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* Terms and Conditions Editor */}
      <section style={{ marginBottom: '40px' }}>
        <div style={{ marginBottom: '12px' }}>
          <h2 style={{ color: 'var(--color-gold)', fontSize: '0.9rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', margin: 0 }}>
            Legal Terms & Conditions Editor
          </h2>
          <p style={{ color: 'var(--color-text-dim)', fontSize: '0.72rem', margin: '4px 0 0' }}>
            Managers can edit legal policy text displayed on the /terms page. Leave blank to use default policy.
          </p>
        </div>
        <div className="glass" style={{ padding: '20px', borderRadius: '8px' }}>
          <textarea
            value={customTerms}
            onChange={(e) => setCustomTerms(e.target.value)}
            className="input-base"
            placeholder="Enter custom terms and conditions text..."
            rows={10}
            style={{ resize: 'vertical', lineHeight: '1.6', fontFamily: 'var(--font-mono)' }}
          />
        </div>
      </section>

      {/* Audit Ledger */}
      <section>
        <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <div>
            <h2 style={{ color: 'var(--color-gold)', fontSize: '0.9rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', margin: 0 }}>
              Unified Audit Ledger
            </h2>
            <p style={{ color: 'var(--color-text-dim)', fontSize: '0.72rem', margin: '4px 0 0' }}>
              {customers.length} customers registered · Live-Synced ⚡
            </p>
          </div>
          <button
            onClick={() => {
              setLoading(true);
              const { db } = initFirebase();
              getWheelConfig(db).then((cfg) => {
                setConfig(cfg);
                setEditedPrizes(cfg.prizes.map((p) => ({ ...p })));
                setCustomTerms(cfg.customTerms || '');
                setLoading(false);
              }).catch(() => setLoading(false));
            }}
            className="btn-ghost"
            style={{ fontSize: '0.68rem', padding: '6px 12px' }}
          >
            🔄 Refresh Config
          </button>
        </div>

        <div className="glass" style={{ borderRadius: '8px', overflow: 'auto' }}>
          <table className="data-table" style={{ minWidth: '900px' }}>
            <thead>
              <tr>
                <SortableHeader label="Full Name" field="name" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                <SortableHeader label="Email" field="email" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                <SortableHeader label="Token / Spin URL" field="token" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                <SortableHeader label="Status" field="spinStatus" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                <SortableHeader label="Prize" field="prizeName" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                <th>Code</th>
                <SortableHeader label="Redemption" field="redeemedAt" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
              </tr>
            </thead>
            <tbody>
              {sorted.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', color: 'var(--color-text-dim)', padding: '32px', fontSize: '0.8rem' }}>
                    No customers registered yet. Use the Admin Portal to import customers.
                  </td>
                </tr>
              )}
              {sorted.map((c) => {
                const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
                const spinUrl = `${baseUrl}/?token=${c.token}`;
                return (
                  <tr key={c.id}>
                    <td style={{ fontWeight: 600 }}>{c.name}</td>
                    <td style={{ color: 'var(--color-text-secondary)' }}>{c.email}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <code style={{ fontSize: '0.72rem', color: 'var(--color-gold)', letterSpacing: '0.05em', fontWeight: 'bold' }}>{c.token}</code>
                        <a
                          href={spinUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            color: 'var(--color-sage)',
                            fontSize: '0.68rem',
                            textDecoration: 'none',
                            border: '1px solid rgba(83, 135, 115, 0.3)',
                            padding: '2px 6px',
                            borderRadius: '3px',
                            background: 'rgba(83, 135, 115, 0.05)'
                          }}
                        >
                          ↗ Link
                        </a>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(spinUrl);
                          }}
                          style={{
                            background: 'transparent',
                            border: '1px solid var(--color-border)',
                            color: 'var(--color-text-secondary)',
                            fontSize: '0.65rem',
                            cursor: 'pointer',
                            padding: '2px 6px',
                            borderRadius: '3px',
                            fontFamily: 'var(--font-mono)'
                          }}
                          title="Copy Link"
                        >
                          Copy
                        </button>
                      </div>
                    </td>
                    <td>
                      {c.spinStatus === 'fresh'
                        ? <span className="badge-error">Fresh</span>
                        : <span className="badge-sage">Spun</span>
                      }
                    </td>
                    <td style={{ color: 'var(--color-text-secondary)' }}>{c.prizeName ?? '—'}</td>
                    <td>
                      {c.prizeCode
                        ? <code style={{ color: 'var(--color-gold)', fontSize: '0.78rem', letterSpacing: '0.05em', fontWeight: 700 }}>{c.prizeCode}</code>
                        : <span style={{ color: 'var(--color-text-dim)' }}>—</span>
                      }
                    </td>
                    <td>
                      {c.redeemedAt
                        ? <span className="badge-sage" style={{ fontSize: '0.65rem' }}>{new Date(c.redeemedAt).toLocaleDateString('en-GB')} {new Date(c.redeemedAt).toLocaleTimeString('en-GB')}</span>
                        : <span className="badge-gold">UNCLAIMED</span>
                      }
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function MetricBox({ label, value, icon, accent }: { label: string; value: string; icon: string; accent?: 'gold' | 'sage' }) {
  return (
    <div className="glass cursor-glow-panel" style={{ padding: '20px 24px', borderRadius: '8px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
        <span style={{ fontSize: '1.4rem' }}>{icon}</span>
        <span style={{ fontSize: '0.65rem', color: 'var(--color-text-dim)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>{label}</span>
      </div>
      <p style={{
        fontSize: '2rem',
        fontWeight: 800,
        margin: 0,
        color: accent === 'gold' ? 'var(--color-gold)' : accent === 'sage' ? 'var(--color-sage)' : 'var(--color-text-primary)',
        lineHeight: 1,
      }}
      className="animate-count-up"
      >
        {value}
      </p>
    </div>
  );
}

function SortableHeader({
  label, field, sortField, sortDir, onSort,
}: {
  label: string;
  field: keyof Customer;
  sortField: keyof Customer;
  sortDir: 'asc' | 'desc';
  onSort: (f: keyof Customer) => void;
}) {
  const active = sortField === field;
  return (
    <th
      onClick={() => onSort(field)}
      style={{ cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' }}
    >
      {label} {active ? (sortDir === 'asc' ? '↑' : '↓') : ''}
    </th>
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

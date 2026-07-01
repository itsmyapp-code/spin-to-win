'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { initFirebase } from '@/lib/firebase';
import { getWheelConfig, saveWheelConfig, setStaffRole, deleteStaffRole } from '@/lib/firestoreOps';
import { collection, query, orderBy, onSnapshot, doc, updateDoc } from 'firebase/firestore';
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
  const [reportStart, setReportStart] = useState('');
  const [reportEnd, setReportEnd] = useState('');
  const [showHelp, setShowHelp] = useState(false);

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
      const currentGameType = config?.gameType || 'wheel';
      await saveWheelConfig(db, editedPrizes, user.email, customTerms, currentGameType);
      setConfig((prev) => prev ? { ...prev, prizes: editedPrizes, customTerms } : prev);
      setSaveMsg('Configuration saved successfully.');
    } catch {
      setSaveMsg('Error saving configuration. Please try again.');
    } finally {
      setSaving(false);
      setTimeout(() => setSaveMsg(null), 4000);
    }
  }, [user, editedPrizes, customTerms, config]);

  const [rolesList, setRolesList] = useState<any[]>([]);
  const [newStaffEmail, setNewStaffEmail] = useState('');
  const [newStaffName, setNewStaffName] = useState('');
  const [staffStatus, setStaffStatus] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    const { db } = initFirebase();
    const unsub = onSnapshot(collection(db, 'spinRoles'), (snap) => {
      const list = snap.docs.map((doc) => ({
        email: doc.id,
        ...doc.data(),
      }));
      setRolesList(list);
    });
    return unsub;
  }, [user]);

  const handleAddStaff = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStaffEmail.includes('@') || newStaffName.trim().length < 2) {
      setStaffStatus('✗ Invalid email or name.');
      return;
    }
    setStaffStatus('⏳ Adding...');
    try {
      const { db } = initFirebase();
      await setStaffRole(db, newStaffEmail.trim().toLowerCase(), 'staff', newStaffName.trim());
      setStaffStatus('✔ Staff added.');
      setNewStaffEmail('');
      setNewStaffName('');
    } catch {
      setStaffStatus('✗ Error adding staff access.');
    }
  }, [newStaffEmail, newStaffName]);

  const handleDeleteStaff = useCallback(async (email: string) => {
    const target = rolesList.find(r => r.email === email);
    if (target && target.role !== 'staff') {
      alert('Security: Managers can only manage staff access levels.');
      return;
    }
    if (confirm(`Remove access for ${email}?`)) {
      try {
        const { db } = initFirebase();
        await deleteStaffRole(db, email);
      } catch {
        alert('Error removing access.');
      }
    }
  }, [rolesList]);

  const handleGrantExtraSpin = useCallback(async (c: Customer) => {
    const newAllowed = (c.allowedSpins ?? 1) + 1;
    const newStatus = (c.spinsCount ?? 0) < newAllowed ? 'fresh' : 'spun';
    try {
      const { db } = initFirebase();
      await updateDoc(doc(db, 'spinCustomers', c.id), {
        allowedSpins: newAllowed,
        spinStatus: newStatus,
      });
    } catch (e) {
      console.error('Error updating allowedSpins:', e);
    }
  }, []);

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

  // ─── Generate prize report data ──────────────────────────────────────────
  const unifiedPrizesList: Array<{
    customerName: string;
    customerEmail: string;
    prizeName: string;
    prizeCode: string;
    wonAt: string;
    redeemedAt: string | null;
    redeemedByEmail: string | null;
  }> = [];

  customers.forEach((c) => {
    if (c.prizesWon && c.prizesWon.length > 0) {
      c.prizesWon.forEach((p) => {
        unifiedPrizesList.push({
          customerName: c.name,
          customerEmail: c.email,
          prizeName: p.prizeName,
          prizeCode: p.prizeCode,
          wonAt: p.wonAt,
          redeemedAt: p.redeemedAt || null,
          redeemedByEmail: p.redeemedByEmail || null,
        });
      });
    } else if (c.prizeCode) {
      unifiedPrizesList.push({
        customerName: c.name,
        customerEmail: c.email,
        prizeName: c.prizeName || '—',
        prizeCode: c.prizeCode,
        wonAt: c.createdAt || new Date().toISOString(),
        redeemedAt: c.redeemedAt || null,
        redeemedByEmail: c.redeemedByEmail || null,
      });
    }
  });

  const reportStartVal = reportStart ? new Date(reportStart) : null;
  const reportEndVal = reportEnd ? new Date(reportEnd) : null;
  if (reportEndVal) reportEndVal.setHours(23, 59, 59, 999);

  const filteredPrizes = unifiedPrizesList.filter((p) => {
    const d = new Date(p.wonAt);
    if (reportStartVal && d < reportStartVal) return false;
    if (reportEndVal && d > reportEndVal) return false;
    return true;
  });

  const filteredCustomersForSpins = customers.filter((c) => {
    const d = c.createdAt ? new Date(c.createdAt) : new Date();
    if (reportStartVal && d < reportStartVal) return false;
    if (reportEndVal && d > reportEndVal) return false;
    return true;
  });

  const reportRedeemed = filteredPrizes.filter((p) => p.redeemedAt).length;
  const reportOutstanding = filteredPrizes.filter((p) => !p.redeemedAt).length;
  const reportOutstandingSpins = filteredCustomersForSpins.reduce((acc, c) => acc + Math.max(0, (c.allowedSpins ?? 1) - (c.spinsCount ?? 0)), 0);

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

      {/* Exportable Redemption & Spin Report Section */}
      <section style={{ marginBottom: '40px' }}>
        <div style={{ marginBottom: '12px' }}>
          <h2 style={{ color: 'var(--color-gold)', fontSize: '0.9rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', margin: 0 }}>
            Redemption & Spin Audit Report
          </h2>
          <p style={{ color: 'var(--color-text-dim)', fontSize: '0.72rem', margin: '4px 0 0' }}>
            Generate a printable report summarizing all redeemed prizes, outstanding wins, and pending spins within a date range.
          </p>
        </div>

        <div className="glass" style={{ padding: '20px', borderRadius: '8px' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'center', marginBottom: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>From:</span>
              <input
                type="date"
                value={reportStart}
                onChange={(e) => setReportStart(e.target.value)}
                className="input-base"
                style={{ width: 'auto', padding: '6px 12px', fontSize: '0.78rem' }}
                aria-label="Report start date"
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>To:</span>
              <input
                type="date"
                value={reportEnd}
                onChange={(e) => setReportEnd(e.target.value)}
                className="input-base"
                style={{ width: 'auto', padding: '6px 12px', fontSize: '0.78rem' }}
                aria-label="Report end date"
              />
            </div>

            <button
              onClick={() => window.print()}
              className="btn-gold"
              style={{ fontSize: '0.75rem', padding: '8px 16px', marginLeft: 'auto' }}
            >
              🖨 Print / Export PDF Report
            </button>
          </div>

          {/* Mini Report Summary Preview */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
            <div style={{ background: 'rgba(45, 99, 77, 0.05)', border: '1px solid rgba(45, 99, 77, 0.15)', padding: '16px', borderRadius: '4px' }}>
              <p style={{ margin: 0, fontSize: '0.68rem', color: 'var(--color-sage)', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                Redeemed (Selected Range)
              </p>
              <p style={{ margin: '8px 0 0', fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--color-text-primary)' }}>
                {reportRedeemed} <span style={{ fontSize: '0.8rem', fontWeight: 'normal', color: 'var(--color-text-secondary)' }}>vouchers</span>
              </p>
            </div>

            <div style={{ background: 'rgba(150, 112, 45, 0.05)', border: '1px solid rgba(150, 112, 45, 0.15)', padding: '16px', borderRadius: '4px' }}>
              <p style={{ margin: 0, fontSize: '0.68rem', color: 'var(--color-gold)', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                Outstanding Unclaimed
              </p>
              <p style={{ margin: '8px 0 0', fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--color-text-primary)' }}>
                {reportOutstanding} <span style={{ fontSize: '0.8rem', fontWeight: 'normal', color: 'var(--color-text-secondary)' }}>vouchers</span>
              </p>
            </div>

            <div style={{ background: 'rgba(28, 27, 25, 0.03)', border: '1px solid var(--color-border)', padding: '16px', borderRadius: '4px' }}>
              <p style={{ margin: 0, fontSize: '0.68rem', color: 'var(--color-text-secondary)', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                Outstanding Spins Left
              </p>
              <p style={{ margin: '8px 0 0', fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--color-text-primary)' }}>
                {reportOutstandingSpins} <span style={{ fontSize: '0.8rem', fontWeight: 'normal', color: 'var(--color-text-secondary)' }}>spins</span>
              </p>
            </div>
          </div>
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

      {/* Staff Access Registry Section */}
      <section style={{ marginBottom: '40px' }}>
        <div style={{ marginBottom: '12px' }}>
          <h2 style={{ color: 'var(--color-gold)', fontSize: '0.9rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', margin: 0 }}>
            Staff Access Registry
          </h2>
          <p style={{ color: 'var(--color-text-dim)', fontSize: '0.72rem', margin: '4px 0 0' }}>
            Managers can authorize and manage Staff access here. Authorize emails to let them register themselves as Staff.
          </p>
        </div>

        <div className="admin-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '24px', alignItems: 'start' }}>
          {/* Add Staff form */}
          <div className="glass" style={{ padding: '20px', borderRadius: '8px' }}>
            <h3 style={{ color: 'var(--color-gold)', fontSize: '0.8rem', fontWeight: 700, marginBottom: '12px', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
              Authorize Staff Member
            </h3>
            <form onSubmit={handleAddStaff} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div>
                <input
                  type="email"
                  value={newStaffEmail}
                  onChange={(e) => setNewStaffEmail(e.target.value)}
                  placeholder="Email (e.g. staff@itsmyapp.co.uk)"
                  className="input-base"
                  required
                  style={{ fontSize: '0.78rem', padding: '8px 12px' }}
                />
              </div>
              <div>
                <input
                  type="text"
                  value={newStaffName}
                  onChange={(e) => setNewStaffName(e.target.value)}
                  placeholder="Staff Name (e.g. Sarah Connor)"
                  className="input-base"
                  required
                  style={{ fontSize: '0.78rem', padding: '8px 12px' }}
                />
              </div>

              {staffStatus && (
                <div style={{
                  fontSize: '0.72rem',
                  color: staffStatus.startsWith('✔') ? 'var(--color-sage)' : 'var(--color-crimson)'
                }}>
                  {staffStatus}
                </div>
              )}

              <button type="submit" className="btn-gold" style={{ fontSize: '0.75rem', padding: '8px 16px' }}>
                + Authorize Staff
              </button>
            </form>
          </div>

          {/* Staff List */}
          <div className="glass" style={{ borderRadius: '8px', overflow: 'hidden' }}>
            <div style={{ maxHeight: '240px', overflowY: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Staff Name</th>
                    <th>Email</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {rolesList.filter((r) => r.role === 'staff').length === 0 ? (
                    <tr>
                      <td colSpan={3} style={{ textAlign: 'center', color: 'var(--color-text-dim)', padding: '16px', fontSize: '0.74rem' }}>
                        No authorized staff members registered.
                      </td>
                    </tr>
                  ) : (
                    rolesList.filter((r) => r.role === 'staff').map((r) => (
                      <tr key={r.email}>
                        <td style={{ fontWeight: 600, fontSize: '0.76rem' }}>{r.displayName}</td>
                        <td style={{ color: 'var(--color-text-secondary)', fontSize: '0.72rem' }}>{r.email}</td>
                        <td>
                          <button
                            onClick={() => handleDeleteStaff(r.email)}
                            className="btn-danger"
                            style={{ fontSize: '0.55rem', padding: '2px 6px' }}
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
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
          <table className="data-table" style={{ minWidth: '1000px' }}>
            <thead>
              <tr>
                <SortableHeader label="Full Name" field="name" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                <SortableHeader label="Email" field="email" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                <SortableHeader label="Token / Spin URL" field="token" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                <SortableHeader label="Status" field="spinStatus" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                <th>Allowed</th>
                <th>Spun</th>
                <SortableHeader label="Latest Prize" field="prizeName" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                <th>Code</th>
                <SortableHeader label="Redemption" field="redeemedAt" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {sorted.length === 0 && (
                <tr>
                  <td colSpan={10} style={{ textAlign: 'center', color: 'var(--color-text-dim)', padding: '32px', fontSize: '0.8rem' }}>
                    No customers registered yet. Use the Admin Portal to import customers.
                  </td>
                </tr>
              )}
              {sorted.map((c) => {
                const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
                const spinUrl = `${baseUrl}/?token=${c.token}`;
                return (
                  <React.Fragment key={c.id}>
                    <tr>
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
                      <td style={{ fontWeight: 700, color: 'var(--color-gold)' }}>{c.allowedSpins ?? 1}</td>
                      <td>{c.spinsCount ?? 0}</td>
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
                      <td>
                        <button
                          onClick={() => handleGrantExtraSpin(c)}
                          className="btn-ghost"
                          style={{ fontSize: '0.62rem', padding: '4px 8px', letterSpacing: '0.02em', border: '1px solid var(--color-gold-bright)', color: 'var(--color-gold-bright)' }}
                        >
                          +1 Spin
                        </button>
                      </td>
                    </tr>

                    {/* Won prizes nested report list (Redemption Management Reports) */}
                    {c.prizesWon && c.prizesWon.length > 0 && (
                      <tr>
                        <td colSpan={10} style={{ padding: '4px 14px 12px', background: 'rgba(7,7,10,0.2)' }}>
                          <div style={{ padding: '10px 14px', borderRadius: '4px', background: 'rgba(197, 168, 107, 0.03)', border: '1px solid rgba(197, 168, 107, 0.08)' }}>
                            <p style={{ margin: '0 0 6px', fontSize: '0.7rem', fontWeight: 700, color: 'var(--color-gold)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                              Redemption & Win Log ({c.prizesWon.length})
                            </p>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                              {c.prizesWon.map((p, idx) => (
                                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--color-text-secondary)' }}>
                                  <span>
                                    • Win {idx + 1}: <strong style={{ color: 'var(--color-text-primary)' }}>{p.prizeName}</strong>
                                    {' '} (<code style={{ color: 'var(--color-gold)' }}>{p.prizeCode}</code>)
                                    {' '} - won on {new Date(p.wonAt).toLocaleDateString('en-GB')} {new Date(p.wonAt).toLocaleTimeString('en-GB')}
                                  </span>
                                  <span>
                                    {p.redeemedAt ? (
                                      <span style={{ color: 'var(--color-sage)' }}>
                                        Claimed on {new Date(p.redeemedAt).toLocaleDateString('en-GB')} {new Date(p.redeemedAt).toLocaleTimeString('en-GB')} {p.redeemedByEmail ? `by ${p.redeemedByEmail}` : ''}
                                      </span>
                                    ) : (
                                      <span style={{ color: 'var(--color-gold-bright)', fontWeight: 'bold' }}>UNCLAIMED</span>
                                    )}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* Manager Help Guide Accordion */}
      <section style={{ marginBottom: '40px' }}>
        <button
          onClick={() => setShowHelp(!showHelp)}
          className="btn-ghost"
          style={{ width: '100%', textAlign: 'left', padding: '12px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', border: '1px solid var(--color-border)' }}
        >
          <span>📖 Manager Help & Operations Guide</span>
          <span>{showHelp ? '▲ Close' : '▼ Open'}</span>
        </button>

        {showHelp && (
          <div className="glass animate-fade-in" style={{ padding: '24px', borderRadius: '0 0 6px 6px', borderTop: 'none', fontSize: '0.78rem', lineHeight: 1.7, color: 'var(--color-text-secondary)' }}>
            <h3 style={{ color: 'var(--color-gold)', margin: '0 0 10px', fontSize: '0.85rem', fontWeight: 700 }}>1. Adjusting Odds (Weights)</h3>
            <p style={{ margin: '0 0 14px' }}>
              The Probability Matrix lets you set relative segment weights. Odds are calculated dynamically as: <code style={{ background: 'var(--color-surface-raised)', padding: '2px 4px', borderRadius: '3px' }}>Odds = (Segment Weight / Total Weight) * 100</code>.
              To make a segment harder to hit, lower its weight. To disable a prize entirely without changing other segment angles, set its weight to <code style={{ background: 'var(--color-surface-raised)', padding: '2px 4px', borderRadius: '3px' }}>0</code>.
            </p>

            <h3 style={{ color: 'var(--color-gold)', margin: '0 0 10px', fontSize: '0.85rem', fontWeight: 700 }}>2. Managing Inventory</h3>
            <p style={{ margin: '0 0 14px' }}>
              Set a positive number to limit how many of a particular prize can be won. Once a prize's inventory hits <code style={{ background: 'var(--color-surface-raised)', padding: '2px 4px', borderRadius: '3px' }}>0</code>, the wheel automatically blacklists it, and rolls to the next eligible slice. Set inventory to <code style={{ background: 'var(--color-surface-raised)', padding: '2px 4px', borderRadius: '3px' }}>-1</code> for infinite/unlimited stock.
            </p>

            <h3 style={{ color: 'var(--color-gold)', margin: '0 0 10px', fontSize: '0.85rem', fontWeight: 700 }}>3. Granting Extra Spins</h3>
            <p style={{ margin: '0 0 14px' }}>
              In the **Unified Audit Ledger**, locate the customer and click **+1 Spin** under their Action column. This increments their allowed spins limit, resets their status, and enables them to spin again.
            </p>

            <h3 style={{ color: 'var(--color-gold)', margin: '0 0 10px', fontSize: '0.85rem', fontWeight: 700 }}>4. Staff Access Registry</h3>
            <p style={{ margin: '0 0 14px' }}>
              Add a staff member's email to pre-authorize them. They can then register their account under the **Staff** panel to scan and redeem tickets. Managers can only delete and create accounts with the **Staff** access level.
            </p>

            <h3 style={{ color: 'var(--color-gold)', margin: '0 0 10px', fontSize: '0.85rem', fontWeight: 700 }}>5. Generating Reports</h3>
            <p style={{ margin: 0 }}>
              Under **Redemption & Spin Audit Report**, select your desired start and end dates. Click **Print / Export PDF Report** to print a hardcopy summary ledger or save a digital PDF.
            </p>
          </div>
        )}
      </section>

      {/* Hidden print report wrapper */}
      <div id="report-print" style={{ display: 'none' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 'bold', margin: '0 0 6px' }}>ITS MY APP</h1>
        <p style={{ fontSize: '14px', margin: '0 0 20px', color: '#666' }}>Promotional Spin & Redemption Audit Report</p>
        
        <div style={{ borderBottom: '2px solid #333', paddingBottom: '12px', marginBottom: '20px' }}>
          <p style={{ margin: '4px 0', fontSize: '12px' }}>
            <strong>Generated:</strong> {new Date().toLocaleString('en-GB')}
          </p>
          <p style={{ margin: '4px 0', fontSize: '12px' }}>
            <strong>Date Range:</strong> {reportStart ? reportStart : 'All Time'} to {reportEnd ? reportEnd : 'All Time'}
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginBottom: '30px', borderBottom: '1px solid #ddd', paddingBottom: '20px' }}>
          <div>
            <span style={{ fontSize: '11px', textTransform: 'uppercase', color: '#666' }}>Redeemed Vouchers</span>
            <p style={{ fontSize: '24px', fontWeight: 'bold', margin: '4px 0' }}>{reportRedeemed}</p>
          </div>
          <div>
            <span style={{ fontSize: '11px', textTransform: 'uppercase', color: '#666' }}>Outstanding Unclaimed Vouchers</span>
            <p style={{ fontSize: '24px', fontWeight: 'bold', margin: '4px 0' }}>{reportOutstanding}</p>
          </div>
          <div>
            <span style={{ fontSize: '11px', textTransform: 'uppercase', color: '#666' }}>Outstanding Spins Remaining</span>
            <p style={{ fontSize: '24px', fontWeight: 'bold', margin: '4px 0' }}>{reportOutstandingSpins}</p>
          </div>
        </div>

        <h3 style={{ fontSize: '16px', fontWeight: 'bold', margin: '0 0 10px' }}>Voucher Ledgers ({filteredPrizes.length})</h3>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #333', textAlign: 'left' }}>
              <th style={{ padding: '6px' }}>Customer Name</th>
              <th style={{ padding: '6px' }}>Email</th>
              <th style={{ padding: '6px' }}>Prize Won</th>
              <th style={{ padding: '6px' }}>Code</th>
              <th style={{ padding: '6px' }}>Won Date</th>
              <th style={{ padding: '6px' }}>Redemption Status</th>
            </tr>
          </thead>
          <tbody>
            {filteredPrizes.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ padding: '20px', textAlign: 'center' }}>No vouchers won in this period.</td>
              </tr>
            ) : (
              filteredPrizes.map((p, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '6px', fontWeight: 'bold' }}>{p.customerName}</td>
                  <td style={{ padding: '6px' }}>{p.customerEmail}</td>
                  <td style={{ padding: '6px' }}>{p.prizeName}</td>
                  <td style={{ padding: '6px' }}><code style={{ fontFamily: 'monospace', fontWeight: 'bold' }}>{p.prizeCode}</code></td>
                  <td style={{ padding: '6px' }}>{new Date(p.wonAt).toLocaleDateString('en-GB')} {new Date(p.wonAt).toLocaleTimeString('en-GB')}</td>
                  <td style={{ padding: '6px' }}>
                    {p.redeemedAt ? (
                      <span style={{ color: '#2d634d', fontWeight: 'bold' }}>
                        Redeemed ({new Date(p.redeemedAt).toLocaleDateString('en-GB')}) {p.redeemedByEmail ? `by ${p.redeemedByEmail}` : ''}
                      </span>
                    ) : (
                      <span style={{ color: '#96702d', fontWeight: 'bold' }}>UNCLAIMED</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
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

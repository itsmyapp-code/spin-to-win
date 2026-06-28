'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { initFirebase } from '@/lib/firebase';
import { bulkCreateCustomers, setStaffRole, deleteStaffRole } from '@/lib/firestoreOps';
import { collection, onSnapshot } from 'firebase/firestore';
import type { Customer } from '@/lib/types';
import StaffAuthForm from './StaffAuthForm';
function generateToken(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

function parseCSV(raw: string): { name: string; email: string }[] {
  return raw
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith('#'))
    .map((line) => {
      const [name, email] = line.split(',').map((s) => s.trim());
      return { name: name ?? '', email: email ?? '' };
    })
    .filter((row) => row.name.length > 0 && row.email.includes('@'));
}

function buildCustomer(name: string, email: string, baseUrl: string, allowedSpins: number): Customer & { tokenUrl: string } {
  const id = `cust_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const token = generateToken();
  return {
    id,
    name,
    email,
    token,
    spinStatus: 'fresh',
    prizeId: null,
    prizeName: null,
    prizeCode: null,
    redeemedAt: null,
    redeemedByEmail: null,
    createdAt: new Date().toISOString(),
    tokenUrl: `${baseUrl}/?token=${token}`,
    allowedSpins,
    spinsCount: 0,
    prizesWon: [],
  };
}

export default function AdminPortal() {
  const { user, staffRole } = useAuth();
  const [csvInput, setCsvInput] = useState('');
  const [allowedSpins, setAllowedSpins] = useState(1);
  const [parsed, setParsed] = useState<(Customer & { tokenUrl: string })[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<string | null>(null);
  const [showHelp, setShowHelp] = useState(false);

  const [rolesList, setRolesList] = useState<any[]>([]);
  const [newRoleEmail, setNewRoleEmail] = useState('');
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleType, setNewRoleType] = useState<'staff' | 'manager' | 'admin'>('manager');
  const [roleStatus, setRoleStatus] = useState<string | null>(null);

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

  const handleAddRole = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoleEmail.includes('@') || newRoleName.trim().length < 2) {
      setRoleStatus('✗ Invalid email or name.');
      return;
    }
    setRoleStatus('⏳ Adding...');
    try {
      const { db } = initFirebase();
      await setStaffRole(db, newRoleEmail.trim().toLowerCase(), newRoleType, newRoleName.trim());
      setRoleStatus('✔ Access added.');
      setNewRoleEmail('');
      setNewRoleName('');
    } catch {
      setRoleStatus('✗ Error adding access.');
    }
  }, [newRoleEmail, newRoleName, newRoleType]);

  const handleDeleteRole = useCallback(async (email: string) => {
    if (confirm(`Remove access for ${email}?`)) {
      try {
        const { db } = initFirebase();
        await deleteStaffRole(db, email);
      } catch {
        alert('Error removing access.');
      }
    }
  }, []);


  const handleParse = useCallback(() => {
    setParseError(null);
    setImportResult(null);
    const rows = parseCSV(csvInput);
    if (rows.length === 0) {
      setParseError('No valid rows found. Format: Name, Email (one per line)');
      setParsed([]);
      return;
    }
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
    const customers = rows.map((r) => buildCustomer(r.name, r.email, baseUrl, allowedSpins));
    setParsed(customers);
  }, [csvInput, allowedSpins]);

  const handleImport = useCallback(async () => {
    if (parsed.length === 0) return;
    setImporting(true);
    setImportResult(null);
    try {
      const { db } = initFirebase();
      await bulkCreateCustomers(db, parsed);
      setImportResult(`✔ ${parsed.length} customer${parsed.length !== 1 ? 's' : ''} imported successfully.`);
      setCsvInput('');
      setParsed([]);
    } catch {
      setImportResult('✗ Import failed. Please try again.');
    } finally {
      setImporting(false);
    }
  }, [parsed]);

  const handleCopyLinks = useCallback(() => {
    const lines = parsed.map((c) => `${c.name}\t${c.email}\t${c.tokenUrl}`).join('\n');
    navigator.clipboard.writeText(lines).catch(() => {
      // fallback — show in textarea
    });
  }, [parsed]);

  // ─── Auth gate ────────────────────────────────────────────────────────────────
  if (!user || user.isAnonymous || !staffRole || staffRole.role !== 'admin') {
    return (
      <StaffAuthForm
        title="ADMIN PORTAL"
        icon="⚙️"
        subtitle="Admin access required"
      />
    );
  }

  return (
    <div className="animate-fade-in" style={{ padding: '24px 32px', maxWidth: '1100px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '28px' }}>
        <h2 style={{ color: 'var(--color-gold)', fontSize: '1rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', margin: '0 0 4px' }}>
          Admin Data Onboarding Matrix
        </h2>
        <p style={{ color: 'var(--color-text-dim)', fontSize: '0.75rem', margin: 0 }}>
          Paste comma-separated customer data, parse tokens, then execute bulk import to Firestore.
        </p>
      </div>

      <div className="admin-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', alignItems: 'start' }}>
        {/* Left: Input */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div className="glass" style={{ padding: '24px', borderRadius: '8px' }}>
            <div style={{ marginBottom: '16px' }}>
              <label htmlFor="spins-input" style={{ display: 'block', color: 'var(--color-text-secondary)', fontSize: '0.7rem', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '6px' }}>
                Allowed Spins Per Customer
              </label>
              <input
                id="spins-input"
                type="number"
                min={1}
                max={10}
                value={allowedSpins}
                onChange={(e) => { setAllowedSpins(Math.max(1, Number(e.target.value))); setParsed([]); }}
                className="input-base"
                style={{ maxWidth: '120px' }}
              />
            </div>

            <label htmlFor="csv-input" style={{ display: 'block', color: 'var(--color-text-secondary)', fontSize: '0.7rem', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '10px' }}>
              Raw CSV Input — Format: <code style={{ color: 'var(--color-gold)' }}>Name, Email</code>
            </label>
            <textarea
              id="csv-input"
              value={csvInput}
              onChange={(e) => { setCsvInput(e.target.value); setParsed([]); setParseError(null); setImportResult(null); }}
              className="input-base"
              placeholder={`John Smith, john@example.com\nJane Doe, jane@example.com\nAlex Brown, alex@example.com`}
              rows={12}
              style={{ resize: 'vertical', lineHeight: 1.7 }}
              spellCheck={false}
            />
          </div>

          {parseError && (
            <div className="badge-error" style={{ padding: '10px 14px', borderRadius: '4px', display: 'block', fontSize: '0.76rem' }}>
              {parseError}
            </div>
          )}

          <button
            id="parse-btn"
            onClick={handleParse}
            disabled={csvInput.trim().length < 5}
            className="btn-gold"
            style={{ width: '100%', fontSize: '0.85rem', padding: '14px' }}
          >
            ⚡ Execute Bulk Parse & Generate Access Tokens
          </button>
        </div>

        {/* Right: Preview */}
        <div>
          {parsed.length === 0 ? (
            <div className="glass" style={{ padding: '40px', borderRadius: '8px', textAlign: 'center', minHeight: '300px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: '2.5rem' }}>📋</span>
              <p style={{ color: 'var(--color-text-dim)', fontSize: '0.8rem', margin: 0 }}>
                Parsed customers will appear here.<br />Review before importing.
              </p>
            </div>
          ) : (
            <div className="glass animate-fade-in" style={{ borderRadius: '8px', overflow: 'hidden' }}>
              <div style={{ padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--color-border)' }}>
                <div>
                  <span className="badge-gold">{parsed.length} Records Parsed</span>
                </div>
                <button id="copy-links-btn" onClick={handleCopyLinks} className="btn-ghost" style={{ fontSize: '0.7rem', padding: '6px 14px' }}>
                  📋 Copy All Links
                </button>
              </div>
              <div style={{ maxHeight: '360px', overflowY: 'auto' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Token</th>
                      <th>Spin Link</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsed.map((c) => (
                      <tr key={c.id}>
                        <td style={{ fontWeight: 600 }}>{c.name}</td>
                        <td style={{ color: 'var(--color-text-secondary)', fontSize: '0.72rem' }}>{c.email}</td>
                        <td>
                          <code style={{ color: 'var(--color-gold)', fontSize: '0.75rem', letterSpacing: '0.05em' }}>{c.token}</code>
                        </td>
                        <td>
                          <a href={c.tokenUrl} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--color-sage)', fontSize: '0.7rem', textDecoration: 'none', letterSpacing: '0.02em' }}>
                            ↗ Open Link
                          </a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div style={{ padding: '16px 20px', borderTop: '1px solid var(--color-border)', display: 'flex', gap: '12px', alignItems: 'center' }}>
                {importResult && (
                  <span style={{ flex: 1, fontSize: '0.75rem', color: importResult.startsWith('✔') ? 'var(--color-sage)' : 'var(--color-crimson)' }}>
                    {importResult}
                  </span>
                )}
                <button
                  id="import-btn"
                  onClick={handleImport}
                  disabled={importing || parsed.length === 0}
                  className="btn-sage"
                  style={{ marginLeft: 'auto' }}
                >
                  {importing ? '⏳ Importing…' : `✔ Import ${parsed.length} Customer${parsed.length !== 1 ? 's' : ''}`}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Access Control Registry Section */}
      <section style={{ marginTop: '40px', borderTop: '1px solid var(--color-border)', paddingTop: '32px' }}>
        <div style={{ marginBottom: '20px' }}>
          <h2 style={{ color: 'var(--color-gold)', fontSize: '1.1rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', margin: '0 0 4px' }}>
            Access Control Registry
          </h2>
          <p style={{ color: 'var(--color-text-dim)', fontSize: '0.75rem', margin: 0 }}>
            Authorize and manage staff, manager, and admin logins dynamically. Users can sign up themselves once authorized here.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', alignItems: 'start' }}>
          {/* Add Authorization Form */}
          <div className="glass" style={{ padding: '24px', borderRadius: '8px' }}>
            <h3 style={{ color: 'var(--color-gold)', fontSize: '0.88rem', fontWeight: 700, marginBottom: '16px', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
              Authorize New Login
            </h3>
            <form onSubmit={handleAddRole} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label htmlFor="role-email" style={{ display: 'block', color: 'var(--color-text-secondary)', fontSize: '0.7rem', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '6px' }}>
                  Email Address
                </label>
                <input
                  id="role-email"
                  type="email"
                  value={newRoleEmail}
                  onChange={(e) => setNewRoleEmail(e.target.value)}
                  placeholder="name@itsmyapp.co.uk"
                  className="input-base"
                  required
                />
              </div>

              <div>
                <label htmlFor="role-name" style={{ display: 'block', color: 'var(--color-text-secondary)', fontSize: '0.7rem', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '6px' }}>
                  Full Name / Display Name
                </label>
                <input
                  id="role-name"
                  type="text"
                  value={newRoleName}
                  onChange={(e) => setNewRoleName(e.target.value)}
                  placeholder="e.g. John Doe"
                  className="input-base"
                  required
                />
              </div>

              <div>
                <label htmlFor="role-select" style={{ display: 'block', color: 'var(--color-text-secondary)', fontSize: '0.7rem', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '6px' }}>
                  Select Access Role
                </label>
                <select
                  id="role-select"
                  value={newRoleType}
                  onChange={(e) => setNewRoleType(e.target.value as any)}
                  className="input-base"
                  style={{ background: 'var(--color-charcoal)', color: 'var(--color-text-primary)' }}
                >
                  <option value="staff">Staff (Verify/Redeem only)</option>
                  <option value="manager">Manager (Adjust odds & terms)</option>
                  <option value="admin">Admin (Full Control)</option>
                </select>
              </div>

              {roleStatus && (
                <div style={{
                  fontSize: '0.75rem',
                  color: roleStatus.startsWith('✔') ? 'var(--color-sage)' : 'var(--color-crimson)',
                  marginTop: '4px'
                }}>
                  {roleStatus}
                </div>
              )}

              <button type="submit" className="btn-gold" style={{ marginTop: '8px' }}>
                + Authorize Access Role
              </button>
            </form>
          </div>

          {/* Current Authorized Users List */}
          <div className="glass" style={{ borderRadius: '8px', overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--color-border)' }}>
              <span className="badge-gold">{rolesList.length} Authorized Users</span>
            </div>
            <div style={{ maxHeight: '360px', overflowY: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {rolesList.length === 0 ? (
                    <tr>
                      <td colSpan={4} style={{ textAlign: 'center', color: 'var(--color-text-dim)', padding: '24px' }}>
                        No authorized users found.
                      </td>
                    </tr>
                  ) : (
                    rolesList.map((r) => (
                      <tr key={r.email}>
                        <td style={{ fontWeight: 600 }}>{r.displayName}</td>
                        <td style={{ color: 'var(--color-text-secondary)', fontSize: '0.72rem' }}>{r.email}</td>
                        <td>
                          <span className={r.role === 'admin' ? 'badge-gold' : r.role === 'manager' ? 'badge-sage' : 'badge-error'} style={{ fontSize: '0.62rem' }}>
                            {r.role}
                          </span>
                        </td>
                        <td>
                          <button
                            onClick={() => handleDeleteRole(r.email)}
                            className="btn-danger"
                            style={{ fontSize: '0.6rem', padding: '4px 8px' }}
                            disabled={r.email === user?.email}
                          >
                            Delete
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

      {/* Help Guide Accordion */}
      <section style={{ marginTop: '24px' }}>
        <button
          onClick={() => setShowHelp(!showHelp)}
          className="btn-ghost"
          style={{ width: '100%', textAlign: 'left', padding: '12px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', border: '1px solid var(--color-border)' }}
        >
          <span>📖 Admin Help & Operations Guide</span>
          <span>{showHelp ? '▲ Close' : '▼ Open'}</span>
        </button>

        {showHelp && (
          <div className="glass animate-fade-in" style={{ padding: '24px', borderRadius: '0 0 6px 6px', borderTop: 'none', fontSize: '0.78rem', lineHeight: 1.7, color: 'var(--color-text-secondary)' }}>
            <h3 style={{ color: 'var(--color-gold)', margin: '0 0 10px', fontSize: '0.85rem', fontWeight: 700 }}>1. Bulk Onboarding Customers</h3>
            <p style={{ margin: '0 0 14px' }}>
              Paste comma-separated rows inside the text box. The format must be exactly: <code style={{ background: 'var(--color-surface-raised)', padding: '2px 4px', borderRadius: '3px' }}>Name, Email</code>, one customer per line. For example:<br />
              <code style={{ display: 'block', background: 'var(--color-surface-raised)', padding: '6px 10px', borderRadius: '3px', marginTop: '4px', fontFamily: 'monospace' }}>
                John Doe, john@example.com<br />
                Jane Smith, jane@example.com
              </code>
            </p>

            <h3 style={{ color: 'var(--color-gold)', margin: '0 0 10px', fontSize: '0.85rem', fontWeight: 700 }}>2. Specifying Allowed Spins</h3>
            <p style={{ margin: '0 0 14px' }}>
              Before clicking <strong>Execute Bulk Parse</strong>, set the "Default Allowed Spins" number (e.g. 1 to 5). This specifies how many turns each newly imported customer is permitted to spin.
            </p>

            <h3 style={{ color: 'var(--color-gold)', margin: '0 0 10px', fontSize: '0.85rem', fontWeight: 700 }}>3. Managing Access Roles</h3>
            <p style={{ margin: '0 0 14px' }}>
              Under <strong>Access Control Registry</strong>, you can authorize emails. A user cannot log in unless their email is authorized here first.
              <ul style={{ margin: '6px 0 0 20px', padding: 0 }}>
                <li><strong>Admin:</strong> Full system control (Bulk imports, role creation).</li>
                <li><strong>Manager:</strong> Adjusts segment odds, inventory limits, and legal policy. Can authorize Staff access.</li>
                <li><strong>Staff:</strong> Front-of-house login to scan and redeem voucher codes.</li>
              </ul>
            </p>

            <h3 style={{ color: 'var(--color-gold)', margin: '0 0 10px', fontSize: '0.85rem', fontWeight: 700 }}>4. User Registration Flow</h3>
            <p style={{ margin: 0 }}>
              Once you authorize an email, tell the user to visit the site, select their dashboard role in the top header, click the <strong>Create Account</strong> tab on the sign-in form, and register using their exact pre-authorized email address.
            </p>
          </div>
        )}
      </section>

      {/* Tip */}
      <div style={{ marginTop: '24px', padding: '14px 18px', borderRadius: '6px', background: 'rgba(197,168,107,0.05)', border: '1px solid rgba(197,168,107,0.15)', fontSize: '0.74rem', color: 'var(--color-text-dim)' }}>
        <strong style={{ color: 'var(--color-gold)' }}>Tip:</strong> After importing, use "Copy All Links" to send personalised spin URLs to each customer.
        Each link contains a unique token — tokens are single-use for the spin, but can be redeemed at the bar anytime.
      </div>
    </div>
  );
}

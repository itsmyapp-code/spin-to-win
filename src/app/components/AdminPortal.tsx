'use client';

import React, { useState, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { initFirebase } from '@/lib/firebase';
import { bulkCreateCustomers } from '@/lib/firestoreOps';
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

function buildCustomer(name: string, email: string, baseUrl: string): Customer & { tokenUrl: string } {
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
  };
}

export default function AdminPortal() {
  const { user, staffRole } = useAuth();
  const [csvInput, setCsvInput] = useState('');
  const [parsed, setParsed] = useState<(Customer & { tokenUrl: string })[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<string | null>(null);


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
    const customers = rows.map((r) => buildCustomer(r.name, r.email, baseUrl));
    setParsed(customers);
  }, [csvInput]);

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

      {/* Tip */}
      <div style={{ marginTop: '24px', padding: '14px 18px', borderRadius: '6px', background: 'rgba(197,168,107,0.05)', border: '1px solid rgba(197,168,107,0.15)', fontSize: '0.74rem', color: 'var(--color-text-dim)' }}>
        <strong style={{ color: 'var(--color-gold)' }}>Tip:</strong> After importing, use "Copy All Links" to send personalised spin URLs to each customer.
        Each link contains a unique token — tokens are single-use for the spin, but can be redeemed at the bar anytime.
      </div>
    </div>
  );
}

'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { initFirebase } from '@/lib/firebase';
import { getWheelConfig } from '@/lib/firestoreOps';
import type { WheelConfig } from '@/lib/types';

export default function TermsPage() {
  const [config, setConfig] = useState<WheelConfig | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const { db } = initFirebase();
        const cfg = await getWheelConfig(db);
        setConfig(cfg);
      } catch (e) {
        // Fallback
      }
    })();
  }, []);

  const defaultTerms = [
    {
      heading: '1. Eligibility',
      body: 'This promotion is open to all customers who receive a valid personalised spin link from Its My App. Participants must be aged 18 or over. Employees and immediate family members of Its My App are excluded from this promotion.',
    },
    {
      heading: '2. How to Enter',
      body: 'Access your personalised spin link as provided. Each link contains a unique access token and is valid for one spin only. Tokens cannot be transferred, sold, or shared.',
    },
    {
      heading: '3. Prizes',
      body: 'Prizes are as displayed on the spin wheel at the time of use. Prize availability and weightings are subject to change at the discretion of the management. Its My App reserves the right to substitute prizes of equal or greater value.',
    },
    {
      heading: '4. Prize Redemption',
      body: 'Prizes must be redeemed in person at Its My App during normal opening hours. Present your WIN code (WIN-XXXXXX-XX) to a member of staff or contact hello@itsmyapp.co.uk. Prizes are non-transferable, have no cash alternative, and are subject to the specific terms displayed at the time of winning.',
    },
    {
      heading: '5. Validity',
      body: 'Win codes are valid for 90 days from the date of issue unless otherwise stated. After this period, prizes become void and cannot be exchanged.',
    },
    {
      heading: '6. Limitation of Liability',
      body: 'Its My App accepts no responsibility for technical failures that prevent participation. The decision of the management is final in all matters relating to this promotion.',
    },
    {
      heading: '7. Data Protection',
      body: 'Personal data collected in connection with this promotion is processed in accordance with our Privacy Policy and applicable UK data protection law (UK GDPR). Data is used solely for the administration of this promotion.',
    },
    {
      heading: '8. Governing Law',
      body: 'These terms are governed by and construed in accordance with the laws of England and Wales.',
    },
  ];

  return (
    <div style={{ maxWidth: '800px', margin: '60px auto', padding: '0 32px', fontFamily: 'var(--font-mono)' }}>
      <Link href="/" style={{ color: 'var(--color-gold)', fontSize: '0.75rem', textDecoration: 'none', letterSpacing: '0.08em', display: 'inline-block', marginBottom: '32px' }}>
        ← Back to Hub
      </Link>
      <h1 style={{ color: 'var(--color-gold)', fontSize: '1.4rem', fontWeight: 800, marginBottom: '8px', letterSpacing: '0.05em' }}>
        Terms & Conditions
      </h1>
      <p style={{ color: 'var(--color-text-dim)', fontSize: '0.72rem', marginBottom: '40px', letterSpacing: '0.05em' }}>
        Its My App Promotional Spin-the-Wheel Campaign · Effective: {new Date().getFullYear()}
      </p>

      {config?.customTerms ? (
        <div style={{ whiteSpace: 'pre-wrap', color: 'var(--color-text-secondary)', fontSize: '0.82rem', lineHeight: 1.8 }}>
          {config.customTerms}
        </div>
      ) : (
        defaultTerms.map(({ heading, body }) => (
          <section key={heading} style={{ marginBottom: '28px' }}>
            <h2 style={{ color: 'var(--color-gold)', fontSize: '0.85rem', fontWeight: 700, letterSpacing: '0.08em', marginBottom: '10px' }}>
              {heading}
            </h2>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.82rem', lineHeight: 1.8, margin: 0 }}>
              {body}
            </p>
          </section>
        ))
      )}
    </div>
  );
}

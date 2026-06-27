import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Cookie Statement — The Seven Stars Spin Hub',
  description: 'Cookie-free storage statement for The Seven Stars Spin Hub.',
};

export default function CookiesPage() {
  return (
    <div style={{ maxWidth: '800px', margin: '60px auto', padding: '0 32px', fontFamily: 'var(--font-mono)' }}>
      <Link href="/" style={{ color: 'var(--color-gold)', fontSize: '0.75rem', textDecoration: 'none', letterSpacing: '0.08em', display: 'inline-block', marginBottom: '32px' }}>
        ← Back to Hub
      </Link>
      <h1 style={{ color: 'var(--color-gold)', fontSize: '1.4rem', fontWeight: 800, marginBottom: '8px', letterSpacing: '0.05em' }}>
        Cookie Statement
      </h1>
      <p style={{ color: 'var(--color-text-dim)', fontSize: '0.72rem', marginBottom: '40px', letterSpacing: '0.05em' }}>
        No Cookies · Zero Tracking · Full Transparency
      </p>

      <div style={{ padding: '20px 24px', borderRadius: '6px', background: 'rgba(83,135,115,0.08)', border: '1px solid rgba(83,135,115,0.3)', marginBottom: '36px' }}>
        <p style={{ color: 'var(--color-sage)', fontSize: '0.88rem', fontWeight: 700, margin: '0 0 8px', letterSpacing: '0.05em' }}>
          ✓ This Application Uses Zero Cookies
        </p>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.8rem', lineHeight: 1.7, margin: 0 }}>
          The Seven Stars Spin Hub has been built from the ground up with a strict no-cookie policy.
          No cookies — first-party or third-party — are set or read at any point during your visit.
        </p>
      </div>

      {[
        {
          heading: 'What We Use Instead of Cookies',
          body: 'This application uses your browser\'s localStorage API to store a single item: your privacy consent preference (accepted or rejected). This data never leaves your device and is not transmitted to any server.',
        },
        {
          heading: 'Firebase Authentication Session',
          body: 'Firebase Authentication manages session state using IndexedDB — a browser-native storage mechanism — rather than cookies. This session data is scoped to this application only and is not accessible to any third-party website.',
        },
        {
          heading: 'Firestore Offline Cache',
          body: 'To provide offline resilience, Firestore may cache a limited amount of data in your browser\'s IndexedDB. This cache is scoped to this application only and contains no advertising or tracking data.',
        },
        {
          heading: 'No Analytics Cookies',
          body: 'No Google Analytics, no Facebook Pixel, no advertising networks, no heat-mapping tools, and no third-party tracking scripts of any kind are loaded by this application. There is zero cross-site tracking.',
        },
        {
          heading: 'No Persistent Advertising Identifiers',
          body: 'No advertising identifiers, device fingerprinting, or behavioural profiling mechanisms are used.',
        },
        {
          heading: 'Your Control',
          body: 'You can clear localStorage at any time via your browser\'s Developer Tools or Privacy Settings. Clearing localStorage will reset your consent preference, and you will be prompted again on your next visit.',
        },
        {
          heading: 'Changes to This Statement',
          body: 'If we ever introduce any cookies or tracking technologies in the future, we will update this statement and present a new consent prompt. Our commitment is to maintain full transparency.',
        },
      ].map(({ heading, body }) => (
        <section key={heading} style={{ marginBottom: '28px' }}>
          <h2 style={{ color: 'var(--color-gold)', fontSize: '0.85rem', fontWeight: 700, letterSpacing: '0.08em', marginBottom: '10px' }}>
            {heading}
          </h2>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.82rem', lineHeight: 1.8, margin: 0 }}>
            {body}
          </p>
        </section>
      ))}
    </div>
  );
}

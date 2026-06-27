import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Privacy Policy — The Seven Stars Spin Hub',
  description: 'UK GDPR privacy notice for The Seven Stars Spin Hub application.',
};

export default function PrivacyPage() {
  return (
    <div style={{ maxWidth: '800px', margin: '60px auto', padding: '0 32px', fontFamily: 'var(--font-mono)' }}>
      <Link href="/" style={{ color: 'var(--color-gold)', fontSize: '0.75rem', textDecoration: 'none', letterSpacing: '0.08em', display: 'inline-block', marginBottom: '32px' }}>
        ← Back to Hub
      </Link>
      <h1 style={{ color: 'var(--color-gold)', fontSize: '1.4rem', fontWeight: 800, marginBottom: '8px', letterSpacing: '0.05em' }}>
        Privacy Policy
      </h1>
      <p style={{ color: 'var(--color-text-dim)', fontSize: '0.72rem', marginBottom: '40px', letterSpacing: '0.05em' }}>
        UK GDPR Compliant · Last updated: {new Date().toLocaleDateString('en-GB', { year: 'numeric', month: 'long' })}
      </p>

      {[
        {
          heading: 'Controller',
          body: 'The Seven Stars acts as the data controller for personal data collected through this application. For data protection enquiries, contact us directly.',
        },
        {
          heading: 'Data We Collect',
          body: 'We collect your name and email address when you are registered for the promotional spin-the-wheel campaign. We also store your spin result, prize code, and redemption status. This data is held in Google Firestore, operated in the European Economic Area.',
        },
        {
          heading: 'Legal Basis for Processing',
          body: 'Processing is based on the performance of a contract (participation in the promotion) and legitimate interests (preventing fraud, managing the promotion, and verifying prize claims).',
        },
        {
          heading: 'Authentication Data',
          body: 'This application uses Firebase Authentication. Customers are signed in anonymously — no email or password is collected from customers. Staff and management are authenticated using email and password credentials stored securely in Firebase Authentication.',
        },
        {
          heading: 'Local Storage',
          body: 'This application stores your privacy consent preference in your browser\'s localStorage. No cookies are set. No third-party tracking or analytics cookies are used.',
        },
        {
          heading: 'Data Retention',
          body: 'Customer spin records are retained for 12 months following the end of the promotion, then permanently deleted. Authentication records are deleted within 30 days of a deletion request.',
        },
        {
          heading: 'Third-Party Processors',
          body: 'We use Google Firebase (Firestore and Authentication) as our sole data processor. Google\'s data processing terms are incorporated into our data processing arrangements. No other third-party processors have access to your personal data.',
        },
        {
          heading: 'Your Rights',
          body: 'Under UK GDPR you have the right to access, rectify, erase, and port your personal data. You also have the right to object to processing and to withdraw consent. To exercise any of these rights, contact The Seven Stars directly. You have the right to lodge a complaint with the Information Commissioner\'s Office (ICO) at ico.org.uk.',
        },
        {
          heading: 'International Transfers',
          body: 'Your data may be processed on Google infrastructure located outside the UK. Such transfers are protected by the UK International Data Transfer Agreement or equivalent adequacy mechanisms.',
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

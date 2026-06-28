import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Accessibility Statement — Its My App Spin Hub',
  description: 'WCAG AAA accessibility statement for Its My App Spin Hub.',
};

export default function AccessibilityPage() {
  return (
    <div style={{ maxWidth: '800px', margin: '60px auto', padding: '0 32px', fontFamily: 'var(--font-mono)' }}>
      <Link href="/" style={{ color: 'var(--color-gold)', fontSize: '0.75rem', textDecoration: 'none', letterSpacing: '0.08em', display: 'inline-block', marginBottom: '32px' }}>
        ← Back to Hub
      </Link>
      <h1 style={{ color: 'var(--color-gold)', fontSize: '1.4rem', fontWeight: 800, marginBottom: '8px', letterSpacing: '0.05em' }}>
        Accessibility Statement
      </h1>
      <p style={{ color: 'var(--color-text-dim)', fontSize: '0.72rem', marginBottom: '40px', letterSpacing: '0.05em' }}>
        WCAG 2.1 AAA Target · Its My App Spin Hub
      </p>

      {[
        {
          heading: 'Our Commitment',
          body: 'Its My App is committed to ensuring the Spin Hub is accessible to all users, including those using assistive technologies. We aim to meet Web Content Accessibility Guidelines (WCAG) 2.1 Level AAA standards.',
        },
        {
          heading: 'Contrast & Typography',
          body: 'All text content meets a minimum 7:1 contrast ratio against background surfaces, exceeding WCAG AAA requirements. JetBrains Mono is used throughout for maximum legibility and readability.',
        },
        {
          heading: 'Keyboard Navigation',
          body: 'All interactive elements — buttons, inputs, links, and tab panels — are fully keyboard accessible. Focus states are clearly visible with a 2px gold outline. Tab order follows a logical reading sequence.',
        },
        {
          heading: 'Screen Reader Support',
          body: 'ARIA roles, labels, and live regions are implemented throughout the application. The spin wheel includes an accessible label. Result states are announced via ARIA.',
        },
        {
          heading: 'Reduced Motion',
          body: 'Users who have enabled the "prefers-reduced-motion" system setting will experience reduced or eliminated animations. The spin wheel animation respects this preference.',
        },
        {
          heading: 'Minimum Target Size',
          body: 'All interactive elements meet the WCAG 2.5.5 AAA target size requirement of at least 44×44 CSS pixels.',
        },
        {
          heading: 'Known Issues',
          body: 'This application is optimised for landscape PC screens (minimum 1280px width). Users on small screens or mobile devices may experience a reduced layout. We are committed to improving this in future releases.',
        },
        {
          heading: 'Reporting Issues',
          body: (
            <>
              If you experience any accessibility barriers, please contact Its My App at{' '}
              <a href="mailto:hello@itsmyapp.co.uk" style={{ color: 'var(--color-gold)', textDecoration: 'underline' }}>
                hello@itsmyapp.co.uk
              </a>{' '}
              directly. We aim to respond to accessibility queries within 5 working days and to resolve critical issues within 10 working days.
            </>
          ),
        },
        {
          heading: 'Enforcement Procedure',
          body: 'If you are not satisfied with our response, you can contact the Equality Advisory and Support Service (EASS). The Equality and Human Rights Commission (EHRC) is the enforcement body for the Public Sector Bodies Accessibility Regulations in England, Scotland and Wales.',
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

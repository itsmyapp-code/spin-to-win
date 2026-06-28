import type { Metadata, Viewport } from 'next';
import './globals.css';
import Providers from './components/Providers';

export const metadata: Metadata = {
  title: 'Its My App — Promotional Spin Hub',
  description: 'Spin the wheel and win exclusive prizes at Its My App. A premium promotional experience.',
  manifest: '/manifest.json',
  keywords: ['Its My App', 'promotion', 'spin to win', 'prizes'],
  authors: [{ name: 'Its My App' }],
  robots: 'noindex, nofollow',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#C5A86B',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
      </head>
      <body>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}

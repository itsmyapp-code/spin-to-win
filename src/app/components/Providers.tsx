'use client';

import React from 'react';
import { ConsentProvider } from './ConsentContext';
import { AuthProvider } from './AuthContext';
import CookieConsent from './CookieConsent';
import CursorGlow from './CursorGlow';

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ConsentProvider>
      <AuthProvider>
        <CursorGlow />
        {children}
        <CookieConsent />
      </AuthProvider>
    </ConsentProvider>
  );
}

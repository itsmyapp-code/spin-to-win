'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { ConsentStatus } from '@/lib/types';

interface ConsentContextValue {
  status: ConsentStatus;
  accept: () => void;
  reject: () => void;
}

const ConsentContext = createContext<ConsentContextValue>({
  status: 'pending',
  accept: () => void 0,
  reject: () => void 0,
});

export function ConsentProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<ConsentStatus>('pending');

  useEffect(() => {
    const stored = localStorage.getItem('seven-stars-consent');
    if (stored === 'accepted') setStatus('accepted');
    else if (stored === 'rejected') setStatus('rejected');
  }, []);

  const accept = useCallback(() => {
    localStorage.setItem('seven-stars-consent', 'accepted');
    setStatus('accepted');
  }, []);

  const reject = useCallback(() => {
    localStorage.setItem('seven-stars-consent', 'rejected');
    setStatus('rejected');
  }, []);

  return (
    <ConsentContext.Provider value={{ status, accept, reject }}>
      {children}
    </ConsentContext.Provider>
  );
}

export function useConsent() {
  return useContext(ConsentContext);
}

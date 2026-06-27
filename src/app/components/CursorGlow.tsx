'use client';

import React, { useEffect, useRef } from 'react';

export default function CursorGlow() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handle = (e: MouseEvent) => {
      if (!ref.current) return;
      ref.current.style.setProperty('--gx', `${e.clientX}px`);
      ref.current.style.setProperty('--gy', `${e.clientY}px`);
    };
    window.addEventListener('mousemove', handle, { passive: true });
    return () => window.removeEventListener('mousemove', handle);
  }, []);

  return (
    <div
      ref={ref}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-0"
      style={{
        background:
          'radial-gradient(700px circle at var(--gx, 50%) var(--gy, 50%), rgba(197,168,107,0.04), transparent 65%)',
        transition: 'background 0.05s linear',
      }}
    />
  );
}

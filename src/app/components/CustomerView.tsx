'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { initFirebase } from '@/lib/firebase';
import {
  getCustomerByToken,
  saveSpinResult,
  getWheelConfig,
} from '@/lib/firestoreOps';
import { useAuth } from './AuthContext';
import SpinWheel from './SpinWheel';
import ScratchCard from './ScratchCard';
import SlotMachine from './SlotMachine';
import ConfettiEffect from './ConfettiEffect';
import type { Customer, PrizeTier, WheelConfig } from '@/lib/types';

interface CustomerViewProps {
  token: string | null;
}

export default function CustomerView({ token }: CustomerViewProps) {
  const { user, signInAsCustomer, authLoading } = useAuth();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [config, setConfig] = useState<WheelConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [spinResult, setSpinResult] = useState<{ prize: PrizeTier; code: string } | null>(null);
  const [showWinOverlay, setShowWinOverlay] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Auto sign in anonymously
  useEffect(() => {
    if (!authLoading && !user) {
      signInAsCustomer();
    }
  }, [authLoading, user, signInAsCustomer]);

  // Load customer + config once auth is ready
  useEffect(() => {
    if (authLoading || !user) return;
    if (!token) {
      setLoading(false);
      setError('NO_TOKEN');
      return;
    }

    (async () => {
      try {
        const { db } = initFirebase();
        const [cust, cfg] = await Promise.all([
          getCustomerByToken(db, token),
          getWheelConfig(db),
        ]);
        if (!cust) {
          setError('NOT_FOUND');
        } else {
          setCustomer(cust);
          // If customer has already spun all allowed spins, show the latest result
          const isTestSession = cust.name.toLowerCase().includes('test') || token.toLowerCase().includes('test');
          const maxSpins = cust.allowedSpins ?? 1;
          const spinsDone = cust.spinsCount ?? 0;
          if (spinsDone >= maxSpins && cust.prizeId && cust.prizeCode && !isTestSession) {
            const prize = cfg.prizes.find((p) => p.id === cust.prizeId) ?? null;
            if (prize) {
              setSpinResult({ prize, code: cust.prizeCode });
            }
          }
        }
        setConfig(cfg);
      } catch (e) {
        setError('LOAD_FAILED');
      } finally {
        setLoading(false);
      }
    })();
  }, [authLoading, user, token]);

  const handleSpinComplete = useCallback(
    async (prize: PrizeTier, prizeCode: string) => {
      if (!customer) return;
      
      const isTestSession = customer.name.toLowerCase().includes('test') || (token && token.toLowerCase().includes('test'));
      const newSpinsCount = (customer.spinsCount ?? 0) + 1;
      const maxSpins = customer.allowedSpins ?? 1;
      const spinStatus = newSpinsCount >= maxSpins ? 'spun' : 'fresh';

      const newPrizeWonItem = {
        prizeId: prize.id,
        prizeName: prize.name,
        prizeCode,
        redeemedAt: null,
        redeemedByEmail: null,
        wonAt: new Date().toISOString(),
      };

      const updatedPrizesWon = [...(customer.prizesWon || []), newPrizeWonItem];

      // Set spinResult to open overlay
      setSpinResult({ prize, code: prizeCode });
      setShowWinOverlay(true);

      try {
        const { db } = initFirebase();
        if (isTestSession) {
          await saveSpinResult(db, customer.id, prize.id, prize.name, prizeCode, newSpinsCount, 'fresh', updatedPrizesWon);
        } else {
          await saveSpinResult(db, customer.id, prize.id, prize.name, prizeCode, newSpinsCount, spinStatus, updatedPrizesWon);
        }
        setCustomer((prev) => prev ? {
          ...prev,
          spinsCount: newSpinsCount,
          spinStatus: isTestSession ? 'fresh' : spinStatus,
          prizeId: prize.id,
          prizeName: prize.name,
          prizeCode,
          prizesWon: updatedPrizesWon
        } : prev);
      } catch (e) {
        // Result stored locally even if network update fails
      }
    },
    [customer, token]
  );

  const handleSaveToCloud = useCallback(async () => {
    setSaving(true);
    await new Promise((r) => setTimeout(r, 900));
    setSaving(false);
    setSaved(true);
  }, []);

  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  // Generates and downloads a beautiful voucher card image using HTML5 Canvas
  const handleSaveImage = useCallback(() => {
    if (!customer || !spinResult) return;
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 600;
      canvas.height = 700;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Draw background
      ctx.fillStyle = '#07070A';
      ctx.fillRect(0, 0, 600, 700);

      // Gold border
      ctx.strokeStyle = '#C5A86B';
      ctx.lineWidth = 6;
      ctx.strokeRect(10, 10, 580, 680);

      // Inner border
      ctx.strokeStyle = 'rgba(197,168,107,0.3)';
      ctx.lineWidth = 1;
      ctx.strokeRect(20, 20, 560, 660);

      // Title & Branding
      ctx.fillStyle = '#C5A86B';
      ctx.font = 'bold 28px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('ITS MY APP', 300, 80);

      ctx.fillStyle = '#9A9490';
      ctx.font = '14px monospace';
      ctx.fillText('PROMOTIONAL PRIZE VOUCHER', 300, 115);

      // Line divider
      ctx.strokeStyle = 'rgba(197,168,107,0.2)';
      ctx.beginPath();
      ctx.moveTo(40, 140);
      ctx.lineTo(560, 140);
      ctx.stroke();

      // Emoji
      ctx.font = '72px sans-serif';
      ctx.fillText(spinResult.prize.emoji, 300, 230);

      // Prize Name
      ctx.fillStyle = '#C5A86B';
      ctx.font = 'bold 30px monospace';
      ctx.fillText(spinResult.prize.name, 300, 290);

      // Description
      ctx.fillStyle = '#9A9490';
      ctx.font = '16px monospace';
      ctx.fillText(spinResult.prize.description, 300, 335);

      // Code Box
      ctx.fillStyle = '#111113';
      ctx.fillRect(80, 380, 440, 110);
      ctx.strokeStyle = '#8B7447';
      ctx.lineWidth = 2;
      ctx.strokeRect(80, 380, 440, 110);

      ctx.fillStyle = '#5A5652';
      ctx.font = 'bold 12px monospace';
      ctx.fillText('VALIDATION CODE', 300, 410);

      ctx.fillStyle = '#C5A86B';
      ctx.font = 'bold 36px monospace';
      ctx.fillText(spinResult.code, 300, 462);

      // Terms box
      ctx.fillStyle = 'rgba(197,168,107,0.05)';
      ctx.fillRect(40, 510, 520, 100);
      
      ctx.fillStyle = '#5A5652';
      ctx.font = 'bold 12px monospace';
      ctx.fillText('PRIZE TERMS', 300, 532);

      ctx.fillStyle = '#9A9490';
      ctx.font = '12px monospace';

      const terms = spinResult.prize.terms;
      const words = terms.split(' ');
      let line = '';
      let y = 556;
      for (let n = 0; n < words.length; n++) {
        const testLine = line + words[n] + ' ';
        const metrics = ctx.measureText(testLine);
        if (metrics.width > 460 && n > 0) {
          ctx.fillText(line, 300, y);
          line = words[n] + ' ';
          y += 20;
        } else {
          line = testLine;
        }
      }
      ctx.fillText(line, 300, y);

      // Footer references
      ctx.fillStyle = '#5A5652';
      ctx.font = '12px monospace';
      ctx.textAlign = 'left';
      ctx.fillText(`Issued to: ${customer.name}`, 40, 650);
      ctx.textAlign = 'right';
      ctx.fillText(`Date: ${new Date().toLocaleDateString('en-GB')}`, 560, 650);

      // Output as PNG download
      const dataUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `voucher-${spinResult.code}.png`;
      link.href = dataUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (e) {
      console.error('Error generating voucher canvas:', e);
    }
  }, [customer, spinResult]);

  // Automatic reload page after 10 seconds when a win is shown
  useEffect(() => {
    if (spinResult) {
      const timer = setTimeout(() => {
        window.location.reload();
      }, 10000);
      return () => clearTimeout(timer);
    }
  }, [spinResult]);

  // ─── Loading ────────────────────────────────────────────────────────────────
  if (authLoading || loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: '16px' }}>
        <div style={{
          width: '48px', height: '48px',
          border: '3px solid var(--color-border)',
          borderTopColor: 'var(--color-gold)',
          borderRadius: '50%',
          animation: 'spin 0.9s linear infinite',
        }} />
        <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.8rem', letterSpacing: '0.1em' }}>
          LOADING SESSION…
        </p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // ─── Error States ────────────────────────────────────────────────────────────
  if (error === 'NO_TOKEN') {
    return (
      <div className="animate-fade-in" style={{ maxWidth: '480px', margin: '80px auto', textAlign: 'center', padding: '40px' }}>
        <div style={{ fontSize: '3rem', marginBottom: '16px' }}>🎡</div>
        <h2 style={{ color: 'var(--color-gold)', fontSize: '1.1rem', marginBottom: '12px', letterSpacing: '0.08em' }}>
          ACCESS TOKEN REQUIRED
        </h2>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.82rem', lineHeight: '1.7' }}>
          This page requires a personalised link with a valid access token.<br />
          Please check the link you received from Its My App.
        </p>
      </div>
    );
  }

  if (error === 'NOT_FOUND') {
    return (
      <div className="animate-fade-in" style={{ maxWidth: '480px', margin: '80px auto', textAlign: 'center', padding: '40px' }}>
        <div style={{ fontSize: '3rem', marginBottom: '16px' }}>🔍</div>
        <h2 style={{ color: 'var(--color-crimson)', fontSize: '1.1rem', marginBottom: '12px', letterSpacing: '0.08em' }}>
          TOKEN NOT RECOGNISED
        </h2>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.82rem', lineHeight: '1.7' }}>
          The access token <code style={{ color: 'var(--color-gold)' }}>{token}</code> was not found in our system.<br />
          Please contact Its My App for assistance.
        </p>
      </div>
    );
  }

  if (error === 'LOAD_FAILED') {
    return (
      <div className="animate-fade-in" style={{ maxWidth: '480px', margin: '80px auto', textAlign: 'center', padding: '40px' }}>
        <div style={{ fontSize: '3rem', marginBottom: '16px' }}>⚠️</div>
        <h2 style={{ color: 'var(--color-crimson)', fontSize: '1.1rem', marginBottom: '12px' }}>CONNECTION ERROR</h2>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.82rem', lineHeight: '1.7' }}>
          Unable to load your session. Please check your connection and try refreshing.
        </p>
      </div>
    );
  }

  if (!customer || !config) return null;

  const maxSpins = customer.allowedSpins ?? 1;
  const spinsDone = customer.spinsCount ?? 0;
  const spinsLeft = Math.max(0, maxSpins - spinsDone);
  const isSpunOut = spinsLeft <= 0;
  const isTestSession = customer.name.toLowerCase().includes('test') || (token && token.toLowerCase().includes('test'));
  const gameType = config.gameType || 'wheel';

  return (
    <>
      {/* Confetti overlay on winning a non-P6 prize */}
      {spinResult && spinResult.prize.id !== 'P6' && <ConfettiEffect />}

      <div className="animate-fade-in" style={{ padding: '24px', maxWidth: '1100px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>

      {/* Top Section: ResultCard (if won/lost) or Welcome (if fresh/idle) */}
      <div style={{ width: '100%' }}>
        {spinResult ? (
          <ResultCard
            customer={customer}
            spinResult={spinResult}
            saving={saving}
            saved={saved}
            onSave={handleSaveToCloud}
            onPrint={handlePrint}
            onSaveImage={handleSaveImage}
            alreadySpun={isSpunOut}
            spinsLeft={spinsLeft}
            onSpinAgain={() => setSpinResult(null)}
          />
        ) : (
          <div className="glass" style={{ padding: '20px 24px', borderRadius: '8px', width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.72rem', letterSpacing: '0.12em', textTransform: 'uppercase', margin: '0 0 4px' }}>
                  Welcome back
                </p>
                <h2 style={{ color: 'var(--color-gold)', fontSize: '1.4rem', fontWeight: 800, margin: 0 }}>
                  {customer.name}
                </h2>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span className="badge-gold">
                  Spins: {spinsDone} / {isTestSession || maxSpins >= 999999 ? '∞' : maxSpins}
                </span>
              </div>
            </div>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.76rem', margin: '8px 0 0' }}>
              {isSpunOut 
                ? 'You have completed all your promotional spins! Check your win ledger below.' 
                : isTestSession || maxSpins >= 999999
                  ? 'You have unlimited spins remaining. Good luck! 🍀'
                  : `You have ${spinsLeft} spin${spinsLeft !== 1 ? 's' : ''} remaining. Good luck! 🍀`
              }
            </p>
          </div>
        )}
      </div>

      {/* Main Grid: Game View (left/center) and Ledger/Info (right) */}
      <div className="grid-two-col" style={{ alignItems: 'start' }}>
        
        {/* Game Viewport placement */}
        <div style={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
          <GamePanel
            gameType={gameType}
            key={spinResult ? 'won' : 'idle'}
            prizes={config.prizes}
            disabled={isSpunOut && !isTestSession}
            onComplete={handleSpinComplete}
            alreadySpun={isSpunOut}
          />
        </div>

        {/* Right Info pane */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%' }}>
          {!spinResult && (
            <div
              className="glass"
              style={{
                padding: '40px',
                borderRadius: '8px',
                textAlign: 'center',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '16px',
                minHeight: '260px',
                justifyContent: 'center',
              }}
            >
              <div style={{ fontSize: '3rem' }}>{gameType === 'scratch' ? '🎫' : gameType === 'slots' ? '🎰' : '🎡'}</div>
              <h3 style={{ color: 'var(--color-gold)', fontSize: '1rem', letterSpacing: '0.08em', margin: 0 }}>
                {gameType === 'scratch' ? 'SCRATCH TO REVEAL YOUR PRIZE' : gameType === 'slots' ? 'PULL TO REVEAL YOUR PRIZE' : 'SPIN TO REVEAL YOUR PRIZE'}
              </h3>
              <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.8rem', lineHeight: '1.7', margin: 0 }}>
                {gameType === 'scratch' ? 'Scratch the card to uncover symbols.' : gameType === 'slots' ? 'Pull down the slot lever to spin reels.' : 'Click the button below the wheel to start.'}<br />
                Your result will be saved automatically.
              </p>
              <div style={{
                width: '60px',
                height: '2px',
                background: 'linear-gradient(90deg, transparent, var(--color-gold), transparent)',
                margin: '8px 0',
              }} />
              <p style={{ color: 'var(--color-text-dim)', fontSize: '0.72rem', margin: 0 }}>
                {isTestSession || maxSpins >= 999999
                  ? 'This promotional link allows unlimited spins.'
                  : `This promotional link allows ${maxSpins} total spin${maxSpins !== 1 ? 's' : ''}.`
                }
              </p>
            </div>
          )}

        {/* Historic won prizes summary list */}
        {customer.prizesWon && customer.prizesWon.length > 0 && (
          <div className="glass" style={{ width: '100%', padding: '20px', borderRadius: '8px' }}>
            <p style={{ color: 'var(--color-gold)', fontSize: '0.75rem', fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', margin: '0 0 12px' }}>
              🎁 Your Won Prizes ({customer.prizesWon.length})
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {[...customer.prizesWon].reverse().map((p, idx) => {
                const matchedPrize = config.prizes.find(x => x.id === p.prizeId);
                return (
                  <div 
                    key={idx} 
                    style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'space-between', 
                      padding: '10px 12px', 
                      background: 'rgba(255,255,255,0.02)', 
                      border: '1px solid var(--color-border-dim)', 
                      borderRadius: '4px' 
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontSize: '1.2rem' }}>{matchedPrize?.emoji ?? '🎁'}</span>
                      <div>
                        <p style={{ margin: 0, fontSize: '0.78rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>{matchedPrize?.name ?? p.prizeName}</p>
                        <code style={{ fontSize: '0.7rem', color: 'var(--color-gold)' }}>{p.prizeCode}</code>
                      </div>
                    </div>
                    <div>
                      {p.redeemedAt ? (
                        <span className="badge-sage" style={{ fontSize: '0.62rem' }}>Claimed</span>
                      ) : (
                        <span className="badge-gold" style={{ fontSize: '0.62rem' }}>Active</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  </div>

    {/* Cinematic scale-in post-win transition overlay */}
    {showWinOverlay && spinResult && (
      <div
        style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(7,7,10,0.85)',
          backdropFilter: 'blur(16px)',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'center',
          padding: '60px 20px',
          overflowY: 'auto',
        }}
        className="animate-fade-in"
      >
        <div
          className="glass animate-fade-in-scale"
          style={{
            maxWidth: '500px',
            width: '100%',
            padding: '28px',
            borderRadius: '12px',
            border: `2px solid var(--color-gold)`,
            boxShadow: '0 0 50px rgba(197, 168, 107, 0.25)',
            position: 'relative',
            marginBottom: '40px',
          }}
        >
          <button
            onClick={() => setShowWinOverlay(false)}
            style={{
              position: 'absolute',
              top: '16px',
              right: '16px',
              background: 'none',
              border: 'none',
              color: 'var(--color-text-dim)',
              fontSize: '1.5rem',
              cursor: 'pointer',
              lineHeight: 1,
            }}
            aria-label="Close win overlay"
          >
            ×
          </button>

          <ResultCard
            customer={customer}
            spinResult={spinResult}
            saving={saving}
            saved={saved}
            onSave={handleSaveToCloud}
            onPrint={handlePrint}
            onSaveImage={handleSaveImage}
            alreadySpun={false}
            spinsLeft={spinsLeft}
            onSpinAgain={() => {
              setSpinResult(null);
              setShowWinOverlay(false);
            }}
          />
        </div>
      </div>
    )}
  </>
);
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function GamePanel({
  gameType, prizes, disabled, onComplete, alreadySpun,
}: {
  gameType: 'wheel' | 'scratch' | 'slots';
  prizes: PrizeTier[];
  disabled: boolean;
  onComplete: (prize: PrizeTier, code: string) => void;
  alreadySpun: boolean;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px', width: '100%' }}>
      {alreadySpun && (
        <div className="badge-gold" style={{ alignSelf: 'flex-start' }}>
          All Allowed Plays Completed
        </div>
      )}
      
      {gameType === 'scratch' ? (
        <ScratchCard prizes={prizes} onComplete={onComplete} disabled={disabled} />
      ) : gameType === 'slots' ? (
        <SlotMachine prizes={prizes} onComplete={onComplete} disabled={disabled} />
      ) : (
        <SpinWheel prizes={prizes} onSpinComplete={onComplete} disabled={disabled} />
      )}

      {/* Clean Prize Legend */}
      <div className="glass" style={{ width: '100%', padding: '16px', borderRadius: '8px', marginTop: '12px' }}>
        <p style={{ color: 'var(--color-gold)', fontSize: '0.75rem', fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', margin: '0 0 12px' }}>
          🎯 Prize Legend
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {prizes.map((p) => (
            <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.78rem' }}>
              <div style={{ width: '12px', height: '12px', borderRadius: '3px', background: p.colour, flexShrink: 0 }} />
              <strong style={{ color: 'var(--color-gold-bright)', minWidth: '24px' }}>{p.id}</strong>
              <span>{p.emoji}</span>
              <span style={{ color: 'var(--color-text-primary)', fontWeight: 600 }}>{p.name}</span>
              <span className="hide-mobile" style={{ color: 'var(--color-text-dim)', fontSize: '0.7rem', marginLeft: 'auto' }}>{p.description}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

interface ResultCardProps {
  customer: Customer;
  spinResult: { prize: PrizeTier; code: string };
  saving: boolean;
  saved: boolean;
  onSave: () => void;
  onPrint: () => void;
  onSaveImage: () => void;
  alreadySpun: boolean;
  spinsLeft?: number;
  onSpinAgain?: () => void;
}

function ResultCard({
  customer, spinResult, saving, saved, onSave, onPrint, onSaveImage, alreadySpun, spinsLeft = 0, onSpinAgain,
}: ResultCardProps) {
  const isLoser = spinResult.prize.id === 'P6';

  return (
    <div
      id="voucher-print"
      className="glass animate-fade-in-scale"
      style={{
        padding: '32px',
        borderRadius: '8px',
        border: `1px solid ${isLoser ? 'var(--color-border)' : 'rgba(197,168,107,0.4)'}`,
        boxShadow: isLoser ? 'none' : '0 0 40px rgba(197,168,107,0.12)',
        width: '100%',
      }}
    >
      {/* Result header */}
      <div style={{ textAlign: 'center', marginBottom: '24px' }}>
        <div style={{ fontSize: '3rem', marginBottom: '8px' }}>{spinResult.prize.emoji}</div>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.7rem', letterSpacing: '0.15em', textTransform: 'uppercase', margin: '0 0 6px' }}>
          {alreadySpun ? 'Your Recorded Result' : 'Congratulations!'}
        </p>
        <h2 style={{
          color: isLoser ? 'var(--color-text-secondary)' : 'var(--color-gold)',
          fontSize: isLoser ? '1.2rem' : '1.5rem',
          fontWeight: 800,
          margin: '0 0 8px',
          lineHeight: 1.2,
        }}>
          {spinResult.prize.name}
        </h2>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.82rem', lineHeight: 1.6, margin: 0 }}>
          {spinResult.prize.description}
        </p>
      </div>

      {!isLoser && (
        <>
          {/* Validation code - massive and readable on mobile */}
          <div
            style={{
              background: 'var(--color-charcoal)',
              border: '2px solid var(--color-gold-dim)',
              borderRadius: '6px',
              padding: '24px 16px',
              textAlign: 'center',
              margin: '0 0 16px',
            }}
          >
            <p style={{ color: 'var(--color-text-dim)', fontSize: '0.7rem', letterSpacing: '0.15em', textTransform: 'uppercase', margin: '0 0 8px' }}>
              Validation Code
            </p>
            <p style={{
              color: 'var(--color-gold)',
              fontSize: 'min(2.5rem, 8vw)',
              fontWeight: 800,
              letterSpacing: '0.08em',
              margin: 0,
              wordBreak: 'break-all',
              lineHeight: 1.1
            }}>
              {spinResult.code}
            </p>
          </div>

          {/* Terms */}
          <div
            style={{
              background: 'rgba(197,168,107,0.05)',
              borderRadius: '4px',
              padding: '12px 14px',
              marginBottom: '20px',
              borderLeft: '2px solid var(--color-gold-dim)',
            }}
          >
            <p style={{ color: 'var(--color-text-dim)', fontSize: '0.65rem', letterSpacing: '0.12em', textTransform: 'uppercase', margin: '0 0 4px' }}>
              Prize Terms
            </p>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.75rem', lineHeight: 1.6, margin: 0 }}>
              {spinResult.prize.terms}
            </p>
          </div>

          {/* Customer ref */}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px', fontSize: '0.72rem', color: 'var(--color-text-dim)' }}>
            <span>Issued to: <span style={{ color: 'var(--color-text-secondary)' }}>{customer.name}</span></span>
            <span>One use only</span>
          </div>

          {/* Action buttons */}
          <div className="voucher-actions" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            
            {/* Save to Photos - fixes image saving */}
            <button
              id="save-image-btn"
              onClick={onSaveImage}
              className="btn-gold"
              style={{
                width: '100%',
                padding: '14px',
                fontSize: '0.85rem',
                border: '1px solid var(--color-gold-bright)',
                background: 'rgba(197,168,107,0.1)',
                color: 'var(--color-gold)'
              }}
            >
              📥 Download Win Voucher (PNG)
            </button>

            {/* Spin Again button if multi-spins are left */}
            {spinsLeft > 0 && onSpinAgain && (
              <button
                onClick={onSpinAgain}
                className="btn-sage"
                style={{
                  width: '100%',
                  padding: '14px',
                  fontSize: '0.88rem',
                  marginTop: '10px',
                  fontWeight: 'bold',
                  letterSpacing: '0.08em'
                }}
              >
                ✨ Spin Again! ({spinsLeft} Left)
              </button>
            )}
          </div>
        </>
      )}

      {isLoser && (
        <div style={{ textAlign: 'center', padding: '16px 0' }}>
          <p style={{ color: 'var(--color-text-dim)', fontSize: '0.8rem', lineHeight: 1.7 }}>
            Thanks for playing — visit us again soon!<br />
            <a href="/terms" style={{ color: 'var(--color-gold)', textDecoration: 'underline' }}>
              View prize terms
            </a>
          </p>
          {spinsLeft > 0 && onSpinAgain && (
            <button
              onClick={onSpinAgain}
              className="btn-sage"
              style={{
                width: '100%',
                padding: '12px',
                fontSize: '0.82rem',
                marginTop: '14px'
              }}
            >
              Spin Again ({spinsLeft} Left)
            </button>
          )}
        </div>
      )}
    </div>
  );
}

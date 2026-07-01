'use client';

import React, { useRef, useState, useCallback, useEffect } from 'react';
import type { PrizeTier } from '@/lib/types';

interface SlotMachineProps {
  prizes: PrizeTier[];
  disabled: boolean;
  onComplete: (prize: PrizeTier, prizeCode: string) => void;
}

export default function SlotMachine({ prizes, disabled, onComplete }: SlotMachineProps) {
  const [dragY, setDragY] = useState(0);
  const [spinState, setSpinState] = useState<'idle' | 'pulling' | 'spinning' | 'complete'>('idle');
  const [reelSymbols, setReelSymbols] = useState<PrizeTier[][]>([[], [], []]);
  const [offsets, setOffsets] = useState<number[]>([0, 0, 0]);
  const [blurs, setBlurs] = useState<number[]>([0, 0, 0]);
  const [scaleYs, setScaleYs] = useState<number[]>([1, 1, 1]);

  const dragStartY = useRef(0);
  const currentDragY = useRef(0);
  const lastTickY = useRef(0);
  const isDragging = useRef(false);

  // Play click tick sound
  const playTickSound = useCallback((freq: number = 800) => {
    if (typeof window === 'undefined') return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.04);
    } catch (e) {}
  }, []);

  const playWinChime = useCallback(() => {
    if (typeof window === 'undefined') return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const playNote = (freq: number, start: number, duration: number) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + start);
        gain.gain.setValueAtTime(0, ctx.currentTime + start);
        gain.gain.linearRampToValueAtTime(0.15, ctx.currentTime + start + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + duration);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + start);
        osc.stop(ctx.currentTime + start + duration);
      };
      playNote(523.25, 0, 0.15); // C5
      playNote(659.25, 0.12, 0.15); // E5
      playNote(783.99, 0.24, 0.4); // G5
    } catch (e) {}
  }, []);

  // Initialize reel symbols
  useEffect(() => {
    const list = [...prizes];
    if (list.length === 0) return;
    const makeStrip = () => {
      let strip: PrizeTier[] = [];
      while (strip.length < 24) {
        strip = [...strip, ...[...list].sort(() => Math.random() - 0.5)];
      }
      return strip;
    };
    setReelSymbols([
      makeStrip(),
      makeStrip(),
      makeStrip(),
    ]);
    setOffsets([-72, -72, -72]);
  }, [prizes]);

  // Touch / pointer drag start
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (disabled || spinState === 'spinning' || spinState === 'complete') return;
    isDragging.current = true;
    dragStartY.current = e.clientY;
    currentDragY.current = 0;
    lastTickY.current = 0;
    setSpinState('pulling');
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  // Touch / pointer drag move
  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging.current) return;
    const deltaY = Math.max(0, e.clientY - dragStartY.current);
    // Add dampening for large pulls
    const dampenedY = deltaY > 150 ? 150 + (deltaY - 150) * 0.3 : deltaY;
    
    currentDragY.current = dampenedY;
    setDragY(dampenedY);

    // Audio click sound every 20px
    if (Math.abs(dampenedY - lastTickY.current) >= 20) {
      playTickSound(600 + (dampenedY / 150) * 400); // Pitch goes up as we pull down
      lastTickY.current = dampenedY;
    }
  };

  // Touch / pointer drag end
  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging.current) return;
    isDragging.current = false;
    e.currentTarget.releasePointerCapture(e.pointerId);

    if (dragY >= 120) {
      triggerSpin();
    } else {
      // Snap back to normal
      setSpinState('idle');
      setDragY(0);
    }
  };

  const generateWinCode = (prizeId: string): string => {
    const digits = String(Math.floor(100000 + Math.random() * 900000));
    return `WIN-${digits}-${prizeId}`;
  };

  // Spin sequence trigger
  const triggerSpin = () => {
    setSpinState('spinning');
    setDragY(0);

    // 1. Select the outcome prize
    const totalWeight = prizes.reduce((s, p) => s + p.weight, 0);
    let rand = Math.random() * totalWeight;
    let selectedPrize = prizes[prizes.length - 1];
    for (let i = 0; i < prizes.length; i++) {
      rand -= prizes[i].weight;
      if (rand <= 0) {
        selectedPrize = prizes[i];
        break;
      }
    }

    const prizeCode = generateWinCode(selectedPrize.id);
    const isLoser = selectedPrize.id === 'P6'; // assuming P6 is loser

    // 2. Set the target symbols for each reel
    let targets: PrizeTier[] = [];
    if (!isLoser) {
      // Win: three of the same symbol
      targets = [selectedPrize, selectedPrize, selectedPrize];
    } else {
      // Loss: three different symbols
      const choices = prizes.filter(p => p.id !== 'P6');
      const shuf = [...choices].sort(() => Math.random() - 0.5);
      targets = [shuf[0], shuf[1], shuf[2]];
    }

    // 3. Staggered Spin Animation
    const spinDurations = [2000, 2600, 3200]; // sequential stop times

    spinDurations.forEach((duration, index) => {
      // Place target symbol at index 16 on the strip
      setReelSymbols(prev => {
        const next = [...prev];
        const newStrip = [...next[index]];
        newStrip[16] = targets[index];
        next[index] = newStrip;
        return next;
      });

      // Start blur and scaling
      setBlurs(prev => {
        const next = [...prev];
        next[index] = 6;
        return next;
      });
      setScaleYs(prev => {
        const next = [...prev];
        next[index] = 1.15;
        return next;
      });

      // Set target scroll offset (Item height: 100, gap: 12, centering: 40px offset)
      // translateY = 40 - (16 * 112) = -1752px
      setTimeout(() => {
        setOffsets(prev => {
          const next = [...prev];
          next[index] = 40 - (16 * 112);
          return next;
        });
      }, 50);

      // Reel tickers during spin
      const ticksInterval = setInterval(() => {
        playTickSound(300 + Math.random() * 100);
      }, 95);

      setTimeout(() => {
        clearInterval(ticksInterval);
        
        // Stop spin, reset blur/scale
        setBlurs(prev => {
          const next = [...prev];
          next[index] = 0;
          return next;
        });
        setScaleYs(prev => {
          const next = [...prev];
          next[index] = 1;
          return next;
        });

        playTickSound(900); // Loud stop click

        // If last reel is completed, finish game
        if (index === 2) {
          setTimeout(() => {
            setSpinState('complete');
            playWinChime();

            // Perform silent instant reset for all 3 reels
            for (let r = 0; r < 3; r++) {
              setReelSymbols(prev => {
                const next = [...prev];
                const newStrip = [...next[r]];
                newStrip[1] = targets[r];
                next[r] = newStrip;
                return next;
              });
              setOffsets(prev => {
                const next = [...prev];
                next[r] = -72; // Reset back to centered index 1 offset
                return next;
              });
            }

            onComplete(selectedPrize, prizeCode);
          }, 400);
        }
      }, duration);
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
      {/* Description */}
      <div className="glass" style={{ padding: '12px 24px', borderRadius: '8px', marginBottom: '20px', textAlign: 'center', width: '100%' }}>
        <p style={{ color: 'var(--color-gold)', fontSize: '0.85rem', fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', margin: 0 }}>
          🎰 ONE-ARMED BANDIT (SLOTS)
        </p>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.72rem', margin: '4px 0 0' }}>
          Drag down the slot handle or reels by 120px and release to spin!
        </p>
      </div>

      {/* Main Container */}
      <div 
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        style={{
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'stretch',
          gap: '24px',
          width: '100%',
          maxWidth: '520px',
          touchAction: 'none',
          cursor: spinState === 'idle' ? 'grab' : 'default',
        }}
      >
        {/* Slot Machine Body */}
        <div
          style={{
            flex: 1,
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '12px',
            background: 'linear-gradient(180deg, #18181B 0%, #0A0A0C 100%)',
            border: '3px solid var(--color-gold-dim)',
            borderRadius: '12px',
            padding: '16px',
            boxShadow: '0 16px 48px rgba(0,0,0,0.8), inset 0 0 30px rgba(197,168,107,0.1)',
            position: 'relative',
            overflow: 'hidden'
          }}
        >
          {/* Glass glare effect overlay */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'linear-gradient(135deg, rgba(255,255,255,0.05) 0%, transparent 50%, rgba(0,0,0,0.2) 100%)',
              pointerEvents: 'none',
              zIndex: 10,
            }}
          />

          {/* 3 Reels */}
          {[0, 1, 2].map((index) => {
            const symbols = reelSymbols[index] || [];

            return (
              <div
                key={index}
                style={{
                  height: '180px',
                  background: '#07070A',
                  border: '2px solid rgba(197,168,107,0.2)',
                  borderRadius: '8px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'flex-start',
                  position: 'relative',
                  overflow: 'hidden',
                  boxShadow: 'inset 0 0 16px rgba(0,0,0,0.9)',
                }}
              >
                {/* Reel Strip Wrapper with motion blur & vertical scrolling */}
                <div
                  style={{
                    transform: `translateY(${offsets[index] + dragY * 0.4}px)`,
                    transition: spinState === 'spinning' 
                      ? `transform ${[2.0, 2.6, 3.2][index]}s cubic-bezier(0.15, 0.85, 0.15, 1.05)` 
                      : 'none',
                    filter: `blur(${blurs[index]}px)`,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '12px',
                    paddingTop: '0px',
                  }}
                >
                  {symbols.map((symbol, idx) => (
                    <div
                      key={idx}
                      style={{
                        height: '100px', // Item height: 100px
                        width: '100px',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <span style={{ fontSize: '3rem', filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.6))' }}>
                        {symbol.emoji}
                      </span>
                      <span 
                        style={{ 
                          fontSize: '0.65rem', 
                          fontFamily: 'monospace', 
                          color: 'var(--color-gold)', 
                          fontWeight: 'bold',
                          letterSpacing: '0.08em'
                        }}
                      >
                        {symbol.id}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Pull Handle Widget */}
        <div
          style={{
            width: '60px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'flex-start',
            position: 'relative',
            height: '180px',
          }}
        >
          {/* Pivot Base socket */}
          <div
            style={{
              position: 'absolute',
              bottom: '15px',
              width: '24px',
              height: '24px',
              borderRadius: '50%',
              background: 'radial-gradient(circle at 6px 6px, #52525B, #18181B)',
              border: '2px solid #000',
              zIndex: 5,
            }}
          />

          {/* Rotating Lever Arm */}
          <div
            style={{
              position: 'absolute',
              bottom: '25px', // Anchor near the pivot socket
              width: '32px',
              height: '120px',
              transformOrigin: 'center 110px', // Rotate around pivot
              transform: `rotate(${spinState === 'spinning' ? 60 : -35 + Math.min(95, (dragY / 120) * 95)}deg)`,
              transition: isDragging.current ? 'none' : 'transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              zIndex: 4,
            }}
          >
            {/* Lever knob (at the top of the arm) */}
            <div
              style={{
                width: '28px',
                height: '28px',
                borderRadius: '50%',
                background: 'radial-gradient(circle at 8px 8px, #E05D5D, #8B2020)',
                border: '2px solid #000',
                boxShadow: '0 4px 8px rgba(0,0,0,0.4)',
              }}
            />

            {/* Lever shaft */}
            <div
              style={{
                width: '8px',
                height: '92px',
                background: 'linear-gradient(90deg, #52525B, #A1A1AA, #3F3F46)',
                borderRadius: '4px',
                marginTop: '-4px', // Connect directly to knob
              }}
            />
          </div>
        </div>
      </div>

      {/* Pull Progress indicator */}
      {spinState === 'pulling' && (
        <div style={{ marginTop: '16px', fontSize: '0.72rem', color: dragY >= 120 ? 'var(--color-sage)' : 'var(--color-text-dim)', letterSpacing: '0.05em' }}>
          {dragY >= 120 ? 'RELEASE NOW TO SPIN! ★' : `PULL: ${Math.floor((dragY / 120) * 100)}%`}
        </div>
      )}
    </div>
  );
}

'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import type { PrizeTier } from '@/lib/types';

interface ScratchCardProps {
  prizes: PrizeTier[];
  disabled: boolean;
  onComplete: (prize: PrizeTier, prizeCode: string) => void;
}

interface Cell {
  id: number;
  prize: PrizeTier;
  scratched: boolean;
  revealed: boolean;
}

export default function ScratchCard({ prizes, disabled, onComplete }: ScratchCardProps) {
  const [cells, setCells] = useState<Cell[]>([]);
  const [scratchProgress, setScratchProgress] = useState<{ [key: number]: number }>({});
  const [gameCompleted, setGameCompleted] = useState(false);
  const [outcomePrize, setOutcomePrize] = useState<PrizeTier | null>(null);
  const [outcomeCode, setOutcomeCode] = useState('');
  const cellsRef = useRef<Cell[]>([]);

  // Sound generator
  const playScratchSound = useCallback(() => {
    if (typeof window === 'undefined') return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = 'sine';
      // Quick pitch sweep for a rubbing/scratch noise
      osc.frequency.setValueAtTime(100 + Math.random() * 200, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(10 + Math.random() * 50, ctx.currentTime + 0.08);
      
      gain.gain.setValueAtTime(0.04, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.08);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.08);
    } catch (e) {}
  }, []);

  // Web Audio Win Chime
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

  // Generate win code
  const generateWinCode = (prizeId: string): string => {
    const digits = String(Math.floor(100000 + Math.random() * 900000));
    return `WIN-${digits}-${prizeId}`;
  };

  // Determine game outcome and layout cells on mount
  useEffect(() => {
    // 1. Select the true outcome based on weights
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

    setOutcomePrize(selectedPrize);
    const prizeCode = generateWinCode(selectedPrize.id);
    setOutcomeCode(prizeCode);

    // 2. Build 12 cell contents
    const newCells: Cell[] = [];
    const isLoser = selectedPrize.id === 'P6'; // Assuming P6 is loser

    if (!isLoser) {
      // Win session: must have exactly 3 cells with the winning prize
      const winPositions = new Set<number>();
      while (winPositions.size < 3) {
        winPositions.add(Math.floor(Math.random() * 12));
      }

      // Other symbols: ensure no other symbol matches 3 times
      const otherPrizes = prizes.filter(p => p.id !== selectedPrize.id);
      const pools: PrizeTier[] = [];
      otherPrizes.forEach(p => {
        // Add up to 2 of each other prize to prevent match-3
        pools.push(p, p);
      });

      // Shuffle other pool
      const shuffledPool = pools.sort(() => Math.random() - 0.5);

      let poolIdx = 0;
      for (let i = 0; i < 12; i++) {
        if (winPositions.has(i)) {
          newCells.push({ id: i, prize: selectedPrize, scratched: false, revealed: false });
        } else {
          newCells.push({ id: i, prize: shuffledPool[poolIdx++] || selectedPrize, scratched: false, revealed: false });
        }
      }
    } else {
      // Loss session: no prize must have 3 matching cells
      const pools: PrizeTier[] = [];
      prizes.forEach(p => {
        pools.push(p, p); // 2 of each is 12 cells (assuming 6 prizes)
      });
      // If we don't have exactly 12, fill/truncate
      while (pools.length < 12) {
        pools.push(prizes[Math.floor(Math.random() * prizes.length)]);
      }
      const shuffledPool = pools.sort(() => Math.random() - 0.5);
      
      // Ensure no 3 matches are present
      // A simple check-and-fix loop
      let attempts = 0;
      while (attempts < 10) {
        const counts: { [key: string]: number } = {};
        let hasThree = false;
        for (const p of shuffledPool) {
          counts[p.id] = (counts[p.id] || 0) + 1;
          if (counts[p.id] >= 3) {
            hasThree = true;
            break;
          }
        }
        if (!hasThree) break;
        // Reshuffle
        shuffledPool.sort(() => Math.random() - 0.5);
        attempts++;
      }

      for (let i = 0; i < 12; i++) {
        newCells.push({ id: i, prize: shuffledPool[i], scratched: false, revealed: false });
      }
    }

    setCells(newCells);
    cellsRef.current = newCells;
  }, [prizes]);

  // Check if match-3 conditions are met
  const checkCompletion = useCallback((updatedProgress: { [key: number]: number }) => {
    if (gameCompleted || !outcomePrize) return;

    // Check how many cells are fully revealed (scratch percentage >= 45%)
    let revealedCount = 0;
    const currentCells = [...cellsRef.current];

    currentCells.forEach(cell => {
      if (updatedProgress[cell.id] >= 45 && !cell.revealed) {
        cell.revealed = true;
      }
      if (cell.revealed) {
        revealedCount++;
      }
    });

    setCells(currentCells);
    cellsRef.current = currentCells;

    // Trigger complete when 6 cells are revealed or when the outcome prize has 3 revealed
    const winRevealed = currentCells.filter(c => c.revealed && c.prize.id === outcomePrize.id).length;
    const isLoser = outcomePrize.id === 'P6';

    const shouldComplete = isLoser 
      ? revealedCount >= 8  // If loser, complete when they reveal 8 cells
      : winRevealed >= 3;   // If winner, complete when they find all 3 matching

    if (shouldComplete) {
      setGameCompleted(true);
      // Auto-reveal all remaining cells
      const finalCells = currentCells.map(c => ({ ...c, revealed: true, scratched: true }));
      setCells(finalCells);
      cellsRef.current = finalCells;

      playWinChime();
      onComplete(outcomePrize, outcomeCode);
    }
  }, [gameCompleted, outcomePrize, outcomeCode, onComplete, playWinChime]);

  // Canvas Scratching Handler
  const handleScratch = (
    cellId: number,
    canvas: HTMLCanvasElement,
    clientX: number,
    clientY: number
  ) => {
    if (disabled || gameCompleted) return;

    const rect = canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Draw destination-out circle
    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();
    ctx.arc(x, y, 18, 0, Math.PI * 2);
    ctx.fill();

    playScratchSound();

    // Check scratch percentage
    const width = canvas.width;
    const height = canvas.height;
    const imgData = ctx.getImageData(0, 0, width, height);
    const pixels = imgData.data;
    let transparentCount = 0;

    for (let i = 3; i < pixels.length; i += 4) {
      if (pixels[i] === 0) transparentCount++;
    }

    const percent = (transparentCount / (pixels.length / 4)) * 100;
    
    setScratchProgress(prev => {
      const next = { ...prev, [cellId]: percent };
      if (percent >= 50) {
        // Fade out the canvas
        canvas.style.opacity = '0';
        canvas.style.transition = 'opacity 0.4s ease';
      }
      checkCompletion(next);
      return next;
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
      {/* Title */}
      <div className="glass" style={{ padding: '12px 24px', borderRadius: '8px', marginBottom: '20px', textAlign: 'center', width: '100%' }}>
        <p style={{ color: 'var(--color-gold)', fontSize: '0.85rem', fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', margin: 0 }}>
          🎫 MATCH-3 SCRATCH CARD
        </p>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.72rem', margin: '4px 0 0' }}>
          Scratch off the cells to reveal the symbols. Find 3 matching to win!
        </p>
      </div>

      {/* Grid Container */}
      <div 
        className="scratch-grid"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '12px',
          width: '100%',
          maxWidth: '560px',
          aspectRatio: '4/3',
          background: 'rgba(255,255,255,0.02)',
          border: '2px solid var(--color-gold-dim)',
          borderRadius: '12px',
          padding: '12px',
          boxShadow: 'inset 0 0 20px rgba(0,0,0,0.8)'
        }}
      >
        {cells.map((cell) => (
          <ScratchCell
            key={cell.id}
            cell={cell}
            disabled={disabled || gameCompleted}
            onScratch={(canvas, x, y) => handleScratch(cell.id, canvas, x, y)}
          />
        ))}
      </div>

      {/* Style rules */}
      <style>{`
        @media (max-width: 480px) {
          .scratch-grid {
            grid-template-columns: repeat(3, 1fr) !important;
            aspect-ratio: 3/4 !important;
          }
        }
      `}</style>
    </div>
  );
}

// ScratchCell Sub-component to manage local Canvas rendering
function ScratchCell({
  cell,
  disabled,
  onScratch,
}: {
  cell: Cell;
  disabled: boolean;
  onScratch: (canvas: HTMLCanvasElement, clientX: number, clientY: number) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawing = useRef(false);

  // Initialize canvas with scratch-off overlay texture
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Reset styles
    canvas.style.opacity = '1';
    canvas.style.transition = 'none';

    // Set resolution
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    canvas.width = w;
    canvas.height = h;

    // Fill background with elegant gold dust pattern
    const grad = ctx.createLinearGradient(0, 0, w, h);
    grad.addColorStop(0, '#C5A86B');
    grad.addColorStop(0.3, '#E2CD9C');
    grad.addColorStop(0.7, '#A3854B');
    grad.addColorStop(1, '#8B7447');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // Draw premium inner borders
    ctx.strokeStyle = 'rgba(255,255,255,0.18)';
    ctx.lineWidth = 2;
    ctx.strokeRect(4, 4, w - 8, h - 8);

    // Draw generic question marks or label
    ctx.fillStyle = 'rgba(7,7,10,0.6)';
    ctx.font = 'bold 24px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('★', w / 2, h / 2);
  }, []);

  // Force fully clear canvas if cell is fully revealed
  useEffect(() => {
    if (cell.revealed && canvasRef.current) {
      canvasRef.current.style.opacity = '0';
    }
  }, [cell.revealed]);

  const startScratch = () => {
    if (disabled) return;
    isDrawing.current = true;
  };

  const endScratch = () => {
    isDrawing.current = false;
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing.current || disabled) return;

    let clientX = 0;
    let clientY = 0;

    if ('touches' in e) {
      if (e.touches.length === 0) return;
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    if (canvasRef.current) {
      onScratch(canvasRef.current, clientX, clientY);
    }
  };

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        background: '#111113',
        border: '1px solid var(--color-border-dim)',
        borderRadius: '6px',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        userSelect: 'none',
      }}
    >
      {/* Hidden prize symbol */}
      <span style={{ fontSize: '2.5rem', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))' }}>
        {cell.prize.emoji}
      </span>
      <span 
        style={{ 
          fontSize: '0.62rem', 
          color: 'var(--color-gold)', 
          fontFamily: 'monospace', 
          marginTop: '4px',
          fontWeight: 'bold',
          letterSpacing: '0.05em'
        }}
      >
        {cell.prize.id}
      </span>

      {/* Canvas Mask Layer */}
      <canvas
        ref={canvasRef}
        onMouseDown={startScratch}
        onMouseUp={endScratch}
        onMouseLeave={endScratch}
        onMouseMove={draw}
        onTouchStart={startScratch}
        onTouchEnd={endScratch}
        onTouchMove={draw}
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          cursor: 'crosshair',
          zIndex: 5,
        }}
      />
    </div>
  );
}

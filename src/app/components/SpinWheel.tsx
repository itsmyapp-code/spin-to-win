'use client';

import React, { useRef, useState, useCallback } from 'react';
import type { PrizeTier, SpinState } from '@/lib/types';

interface SpinWheelProps {
  prizes: PrizeTier[];
  onSpinComplete: (prize: PrizeTier, prizeCode: string) => void;
  disabled: boolean;
}

const SIZE = 560;
const CX = SIZE / 2;
const CY = SIZE / 2;
const RADIUS = 256;
const INNER_RADIUS = 40;

function angleToPoint(angleDeg: number, r: number): { x: number; y: number } {
  const rad = (angleDeg * Math.PI) / 180;
  return {
    x: CX + r * Math.sin(rad),
    y: CY - r * Math.cos(rad),
  };
}

function buildSegmentPath(startAngle: number, endAngle: number): string {
  const outer1 = angleToPoint(startAngle, RADIUS);
  const outer2 = angleToPoint(endAngle, RADIUS);
  const inner1 = angleToPoint(startAngle, INNER_RADIUS);
  const inner2 = angleToPoint(endAngle, INNER_RADIUS);
  const span = endAngle - startAngle;
  const largeArc = span > 180 ? 1 : 0;
  return [
    `M ${inner1.x.toFixed(3)},${inner1.y.toFixed(3)}`,
    `L ${outer1.x.toFixed(3)},${outer1.y.toFixed(3)}`,
    `A ${RADIUS},${RADIUS} 0 ${largeArc},1 ${outer2.x.toFixed(3)},${outer2.y.toFixed(3)}`,
    `L ${inner2.x.toFixed(3)},${inner2.y.toFixed(3)}`,
    `A ${INNER_RADIUS},${INNER_RADIUS} 0 ${largeArc},0 ${inner1.x.toFixed(3)},${inner1.y.toFixed(3)}`,
    'Z',
  ].join(' ');
}

function buildLabelTransform(midAngle: number): string {
  const r = INNER_RADIUS + (RADIUS - INNER_RADIUS) * 0.58;
  const pt = angleToPoint(midAngle, r);
  return `translate(${pt.x.toFixed(3)},${pt.y.toFixed(3)}) rotate(${(midAngle).toFixed(3)})`;
}

function selectWeightedRandom(prizes: PrizeTier[]): number {
  const total = prizes.reduce((s, p) => s + p.weight, 0);
  let rand = Math.random() * total;
  for (let i = 0; i < prizes.length; i++) {
    rand -= prizes[i].weight;
    if (rand <= 0) return i;
  }
  return prizes.length - 1;
}

function generateWinCode(prizeId: string): string {
  const digits = String(Math.floor(100000 + Math.random() * 900000));
  return `WIN-${digits}-${prizeId}`;
}

export default function SpinWheel({ prizes, onSpinComplete, disabled }: SpinWheelProps) {
  const [rotation, setRotation] = useState(0);
  const [spinState, setSpinState] = useState<SpinState>('idle');
  const currentRotation = useRef(0);
  const wheelRef = useRef<SVGGElement>(null);

  const totalWeight = prizes.reduce((s, p) => s + p.weight, 0);

  // Build segment angles
  const segments: { prize: PrizeTier; startAngle: number; endAngle: number; midAngle: number }[] = [];
  let angle = 0;
  for (const prize of prizes) {
    const span = (prize.weight / totalWeight) * 360;
    segments.push({
      prize,
      startAngle: angle,
      endAngle: angle + span,
      midAngle: angle + span / 2,
    });
    angle += span;
  }

  const handleSpin = useCallback(() => {
    if (spinState !== 'idle' || disabled) return;
    setSpinState('spinning');

    const selectedIndex = selectWeightedRandom(prizes);
    const selectedSegment = segments[selectedIndex];
    const prizeCode = generateWinCode(selectedSegment.prize.id);

    // Compute target rotation so the selected segment center aligns with the needle (top = 0°)
    const targetAngle = selectedSegment.midAngle;
    const extraSpins = (7 + Math.floor(Math.random() * 4)) * 360;
    const target = currentRotation.current + extraSpins + (360 - (currentRotation.current % 360)) - targetAngle + (360 - (currentRotation.current % 360));

    // Simpler: align so midAngle of chosen segment ends at 0°
    const alignTo = 360 - (selectedSegment.midAngle % 360);
    const newRotation = currentRotation.current - (currentRotation.current % 360) + 360 * 8 + alignTo;

    currentRotation.current = newRotation;
    setRotation(newRotation);

    setTimeout(() => {
      setSpinState('complete');
      onSpinComplete(selectedSegment.prize, prizeCode);
    }, 3600);
  }, [spinState, disabled, prizes, segments, onSpinComplete]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '24px' }}>
      {/* Wheel container */}
      <div style={{ position: 'relative', width: SIZE, height: SIZE }}>
        {/* Outer glow ring */}
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            inset: '-12px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(197,168,107,0.08) 60%, transparent 80%)',
            animation: spinState === 'spinning' ? 'pulseGold 1s ease-in-out infinite' : 'none',
          }}
        />

        {/* SVG Wheel */}
        <svg
          width={SIZE}
          height={SIZE}
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          aria-label="Prize spin wheel"
          style={{ display: 'block', filter: 'drop-shadow(0 8px 32px rgba(0,0,0,0.6))' }}
        >
          <defs>
            <filter id="segment-shadow" x="-5%" y="-5%" width="110%" height="110%">
              <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.4" />
            </filter>
            <radialGradient id="center-grad" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#2A2A2E" />
              <stop offset="100%" stopColor="#111113" />
            </radialGradient>
          </defs>

          {/* Rotating group */}
          <g
            ref={wheelRef}
            style={{
              transformOrigin: `${CX}px ${CY}px`,
              transform: `rotate(${rotation}deg)`,
              transition: spinState === 'spinning'
                ? 'transform 3.5s cubic-bezier(0.1, 0.8, 0.3, 1)'
                : 'none',
            }}
          >
            {/* Outer ring border */}
            <circle cx={CX} cy={CY} r={RADIUS + 6} fill="none" stroke="#C5A86B" strokeWidth="3" opacity="0.5" />

            {/* Segments */}
            {segments.map((seg, i) => (
              <g key={seg.prize.id}>
                {/* Segment fill */}
                <path
                  d={buildSegmentPath(seg.startAngle, seg.endAngle)}
                  fill={seg.prize.colour}
                  stroke="#0D0D10"
                  strokeWidth="1.5"
                  opacity="0.92"
                  filter="url(#segment-shadow)"
                />
                {/* Alternating sheen overlay */}
                <path
                  d={buildSegmentPath(seg.startAngle, seg.endAngle)}
                  fill={i % 2 === 0 ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.12)'}
                />
                {/* Label */}
                <g transform={buildLabelTransform(seg.midAngle)}>
                  <text
                    textAnchor="middle"
                    dominantBaseline="middle"
                    style={{
                      fontSize: prizes.length > 6 ? '9px' : '11px',
                      fontFamily: 'JetBrains Mono, monospace',
                      fontWeight: 700,
                      fill: '#F0EDE8',
                      paintOrder: 'stroke',
                      stroke: 'rgba(0,0,0,0.5)',
                      strokeWidth: '3px',
                    }}
                  >
                    {seg.prize.emoji}
                  </text>
                  <text
                    textAnchor="middle"
                    dominantBaseline="middle"
                    dy="14"
                    style={{
                      fontSize: prizes.length > 6 ? '7px' : '9px',
                      fontFamily: 'JetBrains Mono, monospace',
                      fontWeight: 600,
                      fill: '#F0EDE8',
                      paintOrder: 'stroke',
                      stroke: 'rgba(0,0,0,0.6)',
                      strokeWidth: '2px',
                    }}
                  >
                    {seg.prize.name.length > 14 ? seg.prize.name.substring(0, 13) + '…' : seg.prize.name}
                  </text>
                </g>
              </g>
            ))}

            {/* Border dividers */}
            {segments.map((seg) => {
              const p = angleToPoint(seg.startAngle, RADIUS + 6);
              const pi = angleToPoint(seg.startAngle, INNER_RADIUS);
              return (
                <line
                  key={`div-${seg.prize.id}`}
                  x1={pi.x} y1={pi.y}
                  x2={p.x} y2={p.y}
                  stroke="#C5A86B"
                  strokeWidth="1"
                  opacity="0.4"
                />
              );
            })}

            {/* Centre hub */}
            <circle cx={CX} cy={CY} r={INNER_RADIUS} fill="url(#center-grad)" stroke="#C5A86B" strokeWidth="2" />
            <text
              x={CX} y={CY}
              textAnchor="middle"
              dominantBaseline="middle"
              style={{
                fontSize: '10px',
                fontFamily: 'JetBrains Mono, monospace',
                fontWeight: 800,
                fill: '#C5A86B',
                letterSpacing: '0.05em',
              }}
            >
              7★
            </text>
          </g>

          {/* Needle (fixed, does not rotate) */}
          <g style={{ filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.8))' }}>
            <polygon
              points={`${CX - 10},${CY - RADIUS - 8} ${CX + 10},${CY - RADIUS - 8} ${CX},${CY - RADIUS + 22}`}
              fill="#C5A86B"
              stroke="#07070A"
              strokeWidth="2"
            />
            <polygon
              points={`${CX - 10},${CY - RADIUS - 8} ${CX + 10},${CY - RADIUS - 8} ${CX},${CY - RADIUS - 28}`}
              fill="#D4B97A"
              stroke="#07070A"
              strokeWidth="2"
            />
          </g>
        </svg>
      </div>

      {/* Spin button */}
      <button
        id="spin-button"
        onClick={handleSpin}
        disabled={spinState !== 'idle' || disabled}
        className="btn-gold animate-pulse-gold-ring"
        style={{
          fontSize: '1rem',
          padding: '16px 48px',
          letterSpacing: '0.15em',
          borderRadius: '6px',
          minWidth: '220px',
        }}
        aria-label="Spin the wheel"
      >
        {spinState === 'idle' && '★ SPIN THE WHEEL ★'}
        {spinState === 'spinning' && '✦ SPINNING…'}
        {spinState === 'complete' && '✔ WHEEL LOCKED'}
      </button>
    </div>
  );
}

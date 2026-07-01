'use client';

import React, { useEffect, useRef } from 'react';

export default function ConfettiEffect() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const colors = [
      '#C5A86B', // Gold
      '#D4B97A', // Light Gold
      '#8B7447', // Dark Gold
      '#538773', // Sage
      '#4A7FA5', // Slate Blue
      '#7A4F9B', // Purple
      '#E05D5D', // Soft Red
    ];

    const confettiCount = 120;
    const confettiList: Array<{
      x: number;
      y: number;
      size: number;
      color: string;
      speedY: number;
      speedX: number;
      rotation: number;
      rotationSpeed: number;
    }> = [];

    for (let i = 0; i < confettiCount; i++) {
      confettiList.push({
        x: Math.random() * width,
        y: Math.random() * -height - 20,
        size: Math.random() * 8 + 6,
        color: colors[Math.floor(Math.random() * colors.length)],
        speedY: Math.random() * 3 + 2,
        speedX: Math.random() * 2 - 1,
        rotation: Math.random() * 360,
        rotationSpeed: Math.random() * 4 - 2,
      });
    }

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    const draw = () => {
      ctx.clearRect(0, 0, width, height);

      let alive = false;
      for (const c of confettiList) {
        c.y += c.speedY;
        c.x += c.speedX;
        c.rotation += c.rotationSpeed;

        if (c.y < height) {
          alive = true;
        } else {
          c.y = -20;
          c.x = Math.random() * width;
        }

        ctx.save();
        ctx.translate(c.x, c.y);
        ctx.rotate((c.rotation * Math.PI) / 180);
        ctx.fillStyle = c.color;
        ctx.fillRect(-c.size / 2, -c.size / 2, c.size, c.size * 1.5);
        ctx.restore();
      }

      animationFrameId = requestAnimationFrame(draw);
    };

    draw();

    const timeoutId = setTimeout(() => {
      cancelAnimationFrame(animationFrameId);
      ctx.clearRect(0, 0, width, height);
    }, 8500);

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
      clearTimeout(timeoutId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 9999,
        width: '100vw',
        height: '100vh',
      }}
    />
  );
}

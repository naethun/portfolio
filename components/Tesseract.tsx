'use client';

import { useEffect, useRef } from 'react';
import { useReducedMotion } from '@/hooks/useReducedMotion';

export default function Tesseract() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    const setCanvasSize = () => {
      canvas.width = canvas.offsetWidth * window.devicePixelRatio;
      canvas.height = canvas.offsetHeight * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    };
    setCanvasSize();

    let animationFrameId: number;
    let rotation = 0;

    // 4D Tesseract vertices (hypercube in 4D)
    const vertices4D = [
      [-1, -1, -1, -1], [1, -1, -1, -1], [1, 1, -1, -1], [-1, 1, -1, -1],
      [-1, -1, 1, -1], [1, -1, 1, -1], [1, 1, 1, -1], [-1, 1, 1, -1],
      [-1, -1, -1, 1], [1, -1, -1, 1], [1, 1, -1, 1], [-1, 1, -1, 1],
      [-1, -1, 1, 1], [1, -1, 1, 1], [1, 1, 1, 1], [-1, 1, 1, 1],
    ];

    // Tesseract edges
    const edges = [
      // Inner cube
      [0, 1], [1, 2], [2, 3], [3, 0],
      [4, 5], [5, 6], [6, 7], [7, 4],
      [0, 4], [1, 5], [2, 6], [3, 7],
      // Outer cube
      [8, 9], [9, 10], [10, 11], [11, 8],
      [12, 13], [13, 14], [14, 15], [15, 12],
      [8, 12], [9, 13], [10, 14], [11, 15],
      // Connections between cubes
      [0, 8], [1, 9], [2, 10], [3, 11],
      [4, 12], [5, 13], [6, 14], [7, 15],
    ];

    // 4D rotation matrices
    const rotate4D = (point: number[], angleXY: number, angleZW: number) => {
      const [x, y, z, w] = point;

      // Rotate in XY plane
      const cosXY = Math.cos(angleXY);
      const sinXY = Math.sin(angleXY);
      const x1 = x * cosXY - y * sinXY;
      const y1 = x * sinXY + y * cosXY;

      // Rotate in ZW plane
      const cosZW = Math.cos(angleZW);
      const sinZW = Math.sin(angleZW);
      const z1 = z * cosZW - w * sinZW;
      const w1 = z * sinZW + w * cosZW;

      return [x1, y1, z1, w1];
    };

    // Project from 4D to 3D
    const project4Dto3D = (point: number[], distance: number) => {
      const w = point[3];
      const factor = distance / (distance - w);
      return [point[0] * factor, point[1] * factor, point[2] * factor];
    };

    // Project from 3D to 2D
    const project3Dto2D = (point: number[], width: number, height: number) => {
      const scale = 80;
      return [
        width / 2 + point[0] * scale,
        height / 2 + point[1] * scale,
      ];
    };

    const draw = () => {
      const width = canvas.offsetWidth;
      const height = canvas.offsetHeight;

      ctx.clearRect(0, 0, width, height);

      // Rotate
      if (!prefersReducedMotion) {
        rotation += 0.005;
      }

      // Transform vertices
      const projectedVertices = vertices4D.map(vertex => {
        const rotated = rotate4D(vertex, rotation, rotation * 0.7);
        const projected3D = project4Dto3D(rotated, 4);
        return project3Dto2D(projected3D, width, height);
      });

      // Draw edges
      ctx.strokeStyle = 'rgba(99, 102, 241, 0.6)';
      ctx.lineWidth = 1.5;

      edges.forEach(([start, end]) => {
        const [x1, y1] = projectedVertices[start];
        const [x2, y2] = projectedVertices[end];

        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      });

      // Draw vertices
      ctx.fillStyle = 'rgba(99, 102, 241, 0.8)';
      projectedVertices.forEach(([x, y]) => {
        ctx.beginPath();
        ctx.arc(x, y, 3, 0, Math.PI * 2);
        ctx.fill();
      });

      animationFrameId = requestAnimationFrame(draw);
    };

    draw();

    // Handle window resize
    window.addEventListener('resize', setCanvasSize);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', setCanvasSize);
    };
  }, [prefersReducedMotion]);

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-full"
      style={{ width: '100%', height: '100%' }}
    />
  );
}

import React from 'react';
import type { ArtKind } from '../../domain/yai/dailyGreeting';

// Hand-drawn SVG art for the daily greeting card (no external images, so nothing to license and it works offline).
// The Buddha image is a simple, respectful seated silhouette with a golden halo, shown on วันพระ.

const Flower: React.FC<{ x: number; y: number; r: number; color: string; center?: string; petals?: number }> = ({ x, y, r, color, center = '#ffd84d', petals = 6 }) => (
  <g transform={`translate(${x} ${y})`}>
    {Array.from({ length: petals }, (_, i) => (
      <ellipse key={i} cx={0} cy={-r * 0.62} rx={r * 0.36} ry={r * 0.62} fill={color} opacity={0.92} transform={`rotate(${(360 / petals) * i})`} />
    ))}
    <circle r={r * 0.32} fill={center} />
  </g>
);

const Leaf: React.FC<{ x: number; y: number; rot: number; s?: number }> = ({ x, y, rot, s = 1 }) => (
  <path d="M0 0 C 10 -14, 30 -14, 40 0 C 30 14, 10 14, 0 0 Z" fill="#5fae6e" transform={`translate(${x} ${y}) rotate(${rot}) scale(${s})`} />
);

const Lotus: React.FC<{ x: number; y: number; s: number; color?: string }> = ({ x, y, s, color = '#f29bbd' }) => (
  <g transform={`translate(${x} ${y}) scale(${s})`}>
    <path d="M0 0 C -6 -20, -2 -36, 0 -44 C 2 -36, 6 -20, 0 0 Z" fill={color} />
    <path d="M0 0 C -16 -12, -22 -28, -20 -38 C -12 -30, -4 -16, 0 0 Z" fill={color} opacity={0.85} />
    <path d="M0 0 C 16 -12, 22 -28, 20 -38 C 12 -30, 4 -16, 0 0 Z" fill={color} opacity={0.85} />
    <path d="M0 0 C -26 -4, -36 -16, -38 -24 C -26 -20, -12 -10, 0 0 Z" fill={color} opacity={0.7} />
    <path d="M0 0 C 26 -4, 36 -16, 38 -24 C 26 -20, 12 -10, 0 0 Z" fill={color} opacity={0.7} />
    <ellipse cx={0} cy={2} rx={34} ry={5} fill="#5fae6e" opacity={0.8} />
  </g>
);

const Buddha: React.FC = () => (
  <g>
    <defs>
      <radialGradient id="halo" cx="50%" cy="40%" r="50%">
        <stop offset="0%" stopColor="#fff3c4" />
        <stop offset="70%" stopColor="#f7c948" stopOpacity={0.55} />
        <stop offset="100%" stopColor="#f7c948" stopOpacity={0} />
      </radialGradient>
      <linearGradient id="gold" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#f6d365" />
        <stop offset="100%" stopColor="#c98a1b" />
      </linearGradient>
    </defs>
    <circle cx={100} cy={70} r={62} fill="url(#halo)" />
    {/* seated figure in meditation */}
    <path d="M100 34 c 3 -6 3 -10 0 -14 c -3 4 -3 8 0 14 Z" fill="url(#gold)" />
    <circle cx={100} cy={46} r={13} fill="url(#gold)" />
    <path d="M86 62 C 78 66, 74 80, 74 96 L 126 96 C 126 80, 122 66, 114 62 C 108 60, 92 60, 86 62 Z" fill="url(#gold)" />
    <path d="M62 112 C 70 98, 88 94, 100 94 C 112 94, 130 98, 138 112 C 124 118, 76 118, 62 112 Z" fill="url(#gold)" />
    <ellipse cx={100} cy={102} rx={10} ry={5} fill="#e9b43a" />
    <Lotus x={100} y={128} s={1.25} color="#f6a8c6" />
  </g>
);

export const GreetingArt: React.FC<{ art: ArtKind; color: string; light: string; variant: number }> = ({ art, color, light, variant }) => (
  <svg viewBox="0 0 200 140" className="h-full w-full" role="img" aria-label={art === 'BUDDHA' ? 'พระพุทธรูปและดอกบัว' : art === 'LOTUS' ? 'ดอกบัว' : art === 'SUN' ? 'พระอาทิตย์ยามเช้าและดอกไม้' : art === 'HEART' ? 'หัวใจและดอกไม้' : 'ช่อดอกไม้'}>
    <rect width={200} height={140} rx={18} fill={art === 'BUDDHA' ? '#fff8e6' : light} />
    {art === 'BUDDHA' && <Buddha />}
    {art === 'SUN' && (
      <g>
        <circle cx={150} cy={44} r={22} fill="#ffcf3f" />
        {Array.from({ length: 10 }, (_, i) => (
          <rect key={i} x={148} y={8} width={4} height={12} rx={2} fill="#ffcf3f" transform={`rotate(${i * 36} 150 44)`} />
        ))}
        <path d="M0 112 C 40 92, 80 104, 120 96 C 150 90, 180 98, 200 92 L 200 140 L 0 140 Z" fill="#9fd6a3" />
      </g>
    )}
    {art === 'LOTUS' && (
      <g>
        <ellipse cx={100} cy={118} rx={92} ry={14} fill="#bfe3f2" />
        <Lotus x={100} y={112} s={1.5} />
        <Lotus x={42} y={118} s={0.8} color="#f7c1d6" />
        <Lotus x={158} y={118} s={0.8} color="#f7c1d6" />
      </g>
    )}
    {art === 'HEART' && <path d="M100 118 C 40 80, 46 30, 78 30 C 90 30, 98 38, 100 46 C 102 38, 110 30, 122 30 C 154 30, 160 80, 100 118 Z" fill={color} opacity={0.85} />}
    {(art === 'FLOWERS' || art === 'SUN' || art === 'HEART') && (
      <g>
        <Leaf x={30} y={118} rot={-40} />
        <Leaf x={150} y={120} rot={-150} />
        <Leaf x={92} y={128} rot={-90} s={0.8} />
        {variant === 0 && (
          <>
            <Flower x={40} y={100} r={20} color={color} />
            <Flower x={78} y={112} r={14} color={color} petals={5} />
            <Flower x={168} y={104} r={18} color={color} />
          </>
        )}
        {variant === 1 && (
          <>
            <Flower x={30} y={108} r={16} color={color} petals={8} />
            <Flower x={60} y={96} r={12} color="#ffffff" center={color} />
            <Flower x={176} y={110} r={16} color={color} petals={8} />
            <Flower x={150} y={96} r={10} color="#ffffff" center={color} />
          </>
        )}
        {variant === 2 && (
          <>
            <Flower x={46} y={106} r={22} color={color} petals={10} />
            <Flower x={160} y={102} r={22} color={color} petals={10} />
          </>
        )}
      </g>
    )}
  </svg>
);

import React from 'react';

const GlowFilter = ({ id, blur }) => (
  <filter id={id} x="-50%" y="-50%" width="200%" height="200%">
    <feGaussianBlur stdDeviation={blur} result="blur" />
    <feComponentTransfer in="blur" result="glow">
      <feFuncA type="linear" slope="1.5" />
    </feComponentTransfer>
    <feMerge>
      <feMergeNode in="glow" />
      <feMergeNode in="SourceGraphic" />
    </feMerge>
  </filter>
);

export const GoldMedal = ({ size = 48 }) => (
  <svg width={size} height={size} viewBox="0 0 100 100" style={{ filter: 'drop-shadow(0 4px 12px rgba(245, 158, 11, 0.6))', overflow: 'visible' }}>
    <defs>
      <linearGradient id="gold-grad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#FEF08A" />
        <stop offset="50%" stopColor="#F59E0B" />
        <stop offset="100%" stopColor="#78350F" />
      </linearGradient>
      <GlowFilter id="glow-gold" blur="6" />
    </defs>
    
    <text x="50" y="80" fontFamily="'Georgia', 'Times New Roman', serif" fontStyle="italic" fontSize="80" fontWeight="900" fill="url(#gold-grad)" textAnchor="middle" filter="url(#glow-gold)">1</text>
    
    {/* Elegant Star flare */}
    <path d="M 60 15 L 62 25 L 72 27 L 62 29 L 60 39 L 58 29 L 48 27 L 58 25 Z" fill="#FFFFFF" opacity="0.9" filter="blur(0.5px)" />
    <path d="M 60 15 L 62 25 L 72 27 L 62 29 L 60 39 L 58 29 L 48 27 L 58 25 Z" fill="#FFFFFF" transform="rotate(45 60 27) scale(0.6)" opacity="0.6" />
  </svg>
);

export const SilverMedal = ({ size = 40 }) => (
  <svg width={size} height={size} viewBox="0 0 100 100" style={{ filter: 'drop-shadow(0 4px 8px rgba(156, 163, 175, 0.5))', overflow: 'visible' }}>
    <defs>
      <linearGradient id="silver-grad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#FFFFFF" />
        <stop offset="50%" stopColor="#9CA3AF" />
        <stop offset="100%" stopColor="#374151" />
      </linearGradient>
      <GlowFilter id="glow-silver" blur="4" />
    </defs>
    
    <text x="50" y="80" fontFamily="'Georgia', 'Times New Roman', serif" fontStyle="italic" fontSize="72" fontWeight="900" fill="url(#silver-grad)" textAnchor="middle" filter="url(#glow-silver)">2</text>
    
    {/* Subtle Star flare */}
    <path d="M 60 18 L 61.5 25 L 68.5 26.5 L 61.5 28 L 60 35 L 58.5 28 L 51.5 26.5 L 58.5 25 Z" fill="#FFFFFF" opacity="0.7" filter="blur(0.5px)" />
  </svg>
);

export const BronzeMedal = ({ size = 40 }) => (
  <svg width={size} height={size} viewBox="0 0 100 100" style={{ filter: 'drop-shadow(0 4px 8px rgba(205, 127, 50, 0.5))', overflow: 'visible' }}>
    <defs>
      <linearGradient id="bronze-grad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#FDBA74" />
        <stop offset="50%" stopColor="#C2410C" />
        <stop offset="100%" stopColor="#431407" />
      </linearGradient>
      <GlowFilter id="glow-bronze" blur="4" />
    </defs>
    
    <text x="50" y="80" fontFamily="'Georgia', 'Times New Roman', serif" fontStyle="italic" fontSize="72" fontWeight="900" fill="url(#bronze-grad)" textAnchor="middle" filter="url(#glow-bronze)">3</text>
  </svg>
);

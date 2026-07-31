import React from 'react';

const colorStyles = {
  emerald: 'text-emerald-500 drop-shadow-[0_2px_4px_rgba(16,185,129,0.5)]',
  gold: 'text-amber-400 drop-shadow-[0_2px_4px_rgba(251,191,36,0.6)]',
  sapphire: 'text-blue-500 drop-shadow-[0_2px_4px_rgba(59,130,246,0.5)]',
  ruby: 'text-rose-500 drop-shadow-[0_2px_4px_rgba(244,63,94,0.5)]',
  amethyst: 'text-purple-500 drop-shadow-[0_2px_4px_rgba(168,85,247,0.5)]',
  slate: 'text-slate-500 drop-shadow-[0_2px_4px_rgba(100,116,139,0.5)]',
  white: 'text-white drop-shadow-[0_2px_4px_rgba(255,255,255,0.4)]',
};

export default function PremiumIcon({ icon: Icon, color = 'emerald', size = 24, className = '' }) {
  if (!Icon) return null;
  const gradientClass = colorStyles[color] || colorStyles.emerald;
  
  return (
    <span className={`inline-flex items-center justify-center ${className}`}>
      <Icon 
        size={size} 
        strokeWidth={2.5}
        className={`${gradientClass} transform transition-all duration-300 hover:scale-110 hover:rotate-6`}
      />
    </span>
  );
}

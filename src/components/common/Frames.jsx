import React from 'react';

// ═══════════════════════════════════════════════════════════════════════════════
// ECOSPARK AVATAR FRAMES — ULTRA PREMIUM LEGENDARY EDITION
// ═══════════════════════════════════════════════════════════════════════════════

const SharedDefs = () => (
  <defs>
    {/* Metallic Gradients */}
    <linearGradient id="bronze-metallic" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stopColor="#E8B887" />
      <stop offset="25%" stopColor="#CD7F32" />
      <stop offset="50%" stopColor="#E8C888" />
      <stop offset="75%" stopColor="#CD7F32" />
      <stop offset="100%" stopColor="#8C5A1A" />
    </linearGradient>
    <linearGradient id="silver-metallic" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stopColor="#FFFFFF" />
      <stop offset="25%" stopColor="#C0C0C0" />
      <stop offset="50%" stopColor="#F0F0F0" />
      <stop offset="75%" stopColor="#A8A8A8" />
      <stop offset="100%" stopColor="#808080" />
    </linearGradient>
    <linearGradient id="gold-metallic" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stopColor="#FFF7CC" />
      <stop offset="20%" stopColor="#FFD700" />
      <stop offset="40%" stopColor="#FFF4A3" />
      <stop offset="60%" stopColor="#DAA520" />
      <stop offset="80%" stopColor="#FFD700" />
      <stop offset="100%" stopColor="#B8860B" />
    </linearGradient>
    <linearGradient id="platinum-metallic" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stopColor="#FFFFFF" />
      <stop offset="20%" stopColor="#E0E7FF" />
      <stop offset="40%" stopColor="#A78BFA" />
      <stop offset="60%" stopColor="#DDD6FE" />
      <stop offset="80%" stopColor="#7C3AED" />
      <stop offset="100%" stopColor="#4C1D95" />
    </linearGradient>

    {/* God Frame */}
    <radialGradient id="god-core" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stopColor="#FFFFFF" />
      <stop offset="40%" stopColor="#FDE047" />
      <stop offset="80%" stopColor="#B45309" />
      <stop offset="100%" stopColor="#000000" />
    </radialGradient>
    <radialGradient id="god-flare" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stopColor="#FFFFFF" />
      <stop offset="30%" stopColor="#FACC15" />
      <stop offset="100%" stopColor="transparent" />
    </radialGradient>

    {/* Glow Filters */}
    <filter id="glow-sm" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="3" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="over" />
    </filter>
    <filter id="glow-md" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur stdDeviation="5" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="over" />
    </filter>
    <filter id="glow-lg" x="-40%" y="-40%" width="180%" height="180%">
      <feGaussianBlur stdDeviation="7" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="over" />
    </filter>
    <filter id="glow-xl" x="-60%" y="-60%" width="220%" height="220%">
      <feGaussianBlur stdDeviation="10" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="over" />
    </filter>
    <filter id="glow-intense" x="-100%" y="-100%" width="300%" height="300%">
      <feGaussianBlur stdDeviation="14" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="over" />
    </filter>

    <mask id="center-hole">
      <rect x="-100" y="-100" width="300" height="300" fill="white" />
      <circle cx="50" cy="50" r="38" fill="black" />
    </mask>
  </defs>
);

// ═══════════════════════════════════════════════════════════════════════════════
// 🥉 BRONZE — Nature's Embrace
// ═══════════════════════════════════════════════════════════════════════════════
export const BronzeFrame = () => (
  <svg viewBox="0 0 100 100" style={{ width: '100%', height: '100%', overflow: 'visible' }}>
    <SharedDefs />
    <style>{`
      @keyframes bronze-shimmer { 0%,100%{opacity:.3} 50%{opacity:.8} }
      .bronze-shine { animation: bronze-shimmer 4s ease-in-out infinite; }
    `}</style>
    <g mask="url(#center-hole)">
      <circle cx="50" cy="50" r="41" fill="none" stroke="url(#bronze-metallic)" strokeWidth="7" filter="url(#glow-sm)" />
      <circle cx="50" cy="50" r="45" fill="none" stroke="#8C501A" strokeWidth=".8" opacity=".6" />
      <circle cx="50" cy="50" r="37" fill="none" stroke="#E8B887" strokeWidth=".5" opacity=".4" />
      <path d="M 10 50 Q 20 20 50 10" fill="none" stroke="#2E7D32" strokeWidth="1.8" strokeDasharray="5,2" opacity=".9" />
      <path d="M 90 50 Q 80 80 50 90" fill="none" stroke="#2E7D32" strokeWidth="1.8" strokeDasharray="5,2" opacity=".9" />
      <path d="M 15 35 Q 10 25 20 20 Q 25 30 15 35 Z" fill="#4CAF50" stroke="#1B5E20" strokeWidth=".5" />
      <path d="M 28 18 Q 30 5 40 10 Q 35 18 28 18 Z" fill="#4CAF50" stroke="#1B5E20" strokeWidth=".5" />
      <path d="M 85 65 Q 90 75 80 80 Q 75 70 85 65 Z" fill="#4CAF50" stroke="#1B5E20" strokeWidth=".5" />
      <path d="M 72 82 Q 70 95 60 90 Q 65 82 72 82 Z" fill="#4CAF50" stroke="#1B5E20" strokeWidth=".5" />
      <circle cx="50" cy="50" r="41" fill="none" stroke="#FEF08A" strokeWidth="1" opacity=".2" className="bronze-shine" />
    </g>
  </svg>
);

// ═══════════════════════════════════════════════════════════════════════════════
// 🥈 SILVER — Precision Engineering
// ═══════════════════════════════════════════════════════════════════════════════
export const SilverFrame = () => (
  <svg viewBox="0 0 100 100" style={{ width: '100%', height: '100%', overflow: 'visible' }}>
    <SharedDefs />
    <style>{`
      @keyframes silver-pulse { 0%,100%{opacity:.4} 50%{opacity:1} }
      @keyframes silver-rotate { 100%{transform:rotate(360deg)} }
      .silver-glow { animation: silver-pulse 3s ease-in-out infinite; }
      .silver-spin { transform-origin:50px 50px; animation: silver-rotate 30s linear infinite; }
    `}</style>
    <g mask="url(#center-hole)">
      <circle cx="50" cy="50" r="41" fill="none" stroke="url(#silver-metallic)" strokeWidth="8" filter="url(#glow-sm)" />
      <circle cx="50" cy="50" r="44" fill="none" stroke="#6B7280" strokeWidth="1.5" strokeDasharray="3,2" opacity=".7" />
      <g className="silver-spin">
        <circle cx="50" cy="50" r="46" fill="none" stroke="#D1D5DB" strokeWidth=".5" strokeDasharray="2,8" />
      </g>
      {[[15,50],[85,50],[50,15],[50,85]].map(([x,y],i) => <circle key={i} cx={x} cy={y} r={2.5} fill="#FFFFFF" className="silver-glow" />)}
      {[[25,25],[75,25],[25,75],[75,75]].map(([x,y],i) => <circle key={i+4} cx={x} cy={y} r={1.5} fill="#9CA3AF" className="silver-glow" />)}
      <path d="M 50 5 L 53 11 L 47 11 Z" fill="url(#silver-metallic)" />
      <path d="M 50 95 L 53 89 L 47 89 Z" fill="url(#silver-metallic)" />
      <path d="M 5 50 L 11 47 L 11 53 Z" fill="url(#silver-metallic)" />
      <path d="M 95 50 L 89 47 L 89 53 Z" fill="url(#silver-metallic)" />
    </g>
  </svg>
);

// ═══════════════════════════════════════════════════════════════════════════════
// 🥇 GOLD — Royal Laurels
// ═══════════════════════════════════════════════════════════════════════════════
export const GoldFrame = () => (
  <svg viewBox="0 0 100 100" style={{ width: '100%', height: '100%', overflow: 'visible' }}>
    <SharedDefs />
    <style>{`
      @keyframes gold-sparkle { 0%,100%{opacity:0;transform:scale(.5)} 50%{opacity:1;transform:scale(1.2)} }
      @keyframes gold-breathe { 0%,100%{opacity:.6} 50%{opacity:1} }
      .gold-s1 { transform-origin:center; animation:gold-sparkle 2.5s ease-in-out infinite; }
      .gold-s2 { transform-origin:center; animation:gold-sparkle 2.5s ease-in-out infinite .8s; }
      .gold-s3 { transform-origin:center; animation:gold-sparkle 2.5s ease-in-out infinite 1.6s; }
      .gold-aura { animation:gold-breathe 3s ease-in-out infinite; }
    `}</style>
    <g mask="url(#center-hole)">
      <circle cx="50" cy="50" r="43" fill="none" stroke="#78350F" strokeWidth="1.5" opacity=".5" />
      <circle cx="50" cy="50" r="37" fill="none" stroke="#78350F" strokeWidth="1.5" opacity=".5" />
      <circle cx="50" cy="50" r="40" fill="none" stroke="url(#gold-metallic)" strokeWidth="7" filter="url(#glow-md)" />
      <circle cx="50" cy="50" r="44" fill="none" stroke="#FFD700" strokeWidth="2" opacity=".3" filter="url(#glow-md)" className="gold-aura" />
      <g fill="#FBBF24" stroke="#B45309" strokeWidth=".5">
        <path d="M 50 92 Q 25 90 10 60 Q 20 70 30 80 Q 40 85 50 88 Z" />
        <path d="M 12 60 Q 8 45 15 30 Q 18 45 15 55 Z" />
        <path d="M 50 92 Q 75 90 90 60 Q 80 70 70 80 Q 60 85 50 88 Z" />
        <path d="M 88 60 Q 92 45 85 30 Q 82 45 85 55 Z" />
      </g>
      <path d="M 50 0 L 52 8 L 60 10 L 52 12 L 50 20 L 48 12 L 40 10 L 48 8 Z" fill="#FEF08A" filter="url(#glow-md)" className="gold-s1" />
      <path d="M 20 15 L 21 20 L 26 21 L 21 22 L 20 27 L 19 22 L 14 21 L 19 20 Z" fill="#FEF08A" className="gold-s2" />
      <path d="M 80 15 L 81 20 L 86 21 L 81 22 L 80 27 L 79 22 L 74 21 L 79 20 Z" fill="#FEF08A" className="gold-s3" />
    </g>
  </svg>
);

// ═══════════════════════════════════════════════════════════════════════════════
// 💎 PLATINUM — Crystal Geometry
// ═══════════════════════════════════════════════════════════════════════════════
export const PlatinumFrame = () => (
  <svg viewBox="0 0 100 100" style={{ width: '100%', height: '100%', overflow: 'visible' }}>
    <SharedDefs />
    <style>{`
      @keyframes plat-rot { 100%{transform:rotate(360deg)} }
      @keyframes plat-rev { 100%{transform:rotate(-360deg)} }
      @keyframes plat-tw { 0%,100%{opacity:.2} 50%{opacity:.9} }
      .plat-o { transform-origin:50px 50px; animation:plat-rot 25s linear infinite; }
      .plat-i { transform-origin:50px 50px; animation:plat-rev 18s linear infinite; }
      .plat-t1 { animation:plat-tw 2s ease-in-out infinite; }
      .plat-t2 { animation:plat-tw 2s ease-in-out infinite .7s; }
      .plat-t3 { animation:plat-tw 2s ease-in-out infinite 1.4s; }
    `}</style>
    <g mask="url(#center-hole)">
      <circle cx="50" cy="50" r="41" fill="none" stroke="url(#platinum-metallic)" strokeWidth="8" filter="url(#glow-lg)" />
      <g className="plat-o">
        <path d="M 50 8 L 82 22 L 92 50 L 82 78 L 50 92 L 18 78 L 8 50 L 18 22 Z" fill="none" stroke="#E0E7FF" strokeWidth="1" strokeDasharray="2,2" opacity=".7" />
      </g>
      <g className="plat-i">
        <path d="M 50 14 L 76 25 L 86 50 L 76 75 L 50 86 L 24 75 L 14 50 L 24 25 Z" fill="none" stroke="#818CF8" strokeWidth=".8" opacity=".6" />
      </g>
      <g id="pd" transform="translate(50,5) scale(1)">
        <polygon points="0,-8 6,0 0,10 -6,0" fill="url(#platinum-metallic)" stroke="#FFF" strokeWidth=".8" />
        <polygon points="0,-8 3,0 0,10 -3,0" fill="#E0E7FF" opacity=".5" />
      </g>
      <use href="#pd" transform="rotate(90 50 50)" />
      <use href="#pd" transform="rotate(180 50 50)" />
      <use href="#pd" transform="rotate(270 50 50)" />
      <path d="M 22 22 L 23 27 L 28 28 L 23 29 L 22 34 L 21 29 L 16 28 L 21 27 Z" fill="#FFF" filter="url(#glow-lg)" className="plat-t1" />
      <path d="M 78 22 L 79 27 L 84 28 L 79 29 L 78 34 L 77 29 L 72 28 L 77 27 Z" fill="#FFF" filter="url(#glow-lg)" className="plat-t2" />
      <path d="M 22 78 L 23 83 L 28 84 L 23 85 L 22 90 L 21 85 L 16 84 L 21 83 Z" fill="#FFF" className="plat-t3" />
      <path d="M 78 78 L 79 83 L 84 84 L 79 85 L 78 90 L 77 85 L 72 84 L 77 83 Z" fill="#FFF" className="plat-t1" />
    </g>
  </svg>
);

// ═══════════════════════════════════════════════════════════════════════════════
// 👑 SUPREME GOD — Celestial Apex
// ═══════════════════════════════════════════════════════════════════════════════
export const GodFrame = () => (
  <svg viewBox="0 0 100 100" style={{ width: '100%', height: '100%', overflow: 'visible' }}>
    <SharedDefs />
    <style>{`
      @keyframes gs { 100%{transform:rotate(360deg)} }
      @keyframes gsr { 100%{transform:rotate(-360deg)} }
      @keyframes gp { 0%,100%{opacity:.6;transform:scale(1)} 50%{opacity:1;transform:scale(1.06)} }
      @keyframes gf { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-5px)} }
      @keyframes gr { 0%,100%{opacity:.1} 50%{opacity:.5} }
      .go { transform-origin:50px 50px; animation:gs 20s linear infinite; }
      .gi { transform-origin:50px 50px; animation:gsr 14s linear infinite; }
      .gp { transform-origin:50px 50px; animation:gp 4s ease-in-out infinite; }
      .gc { transform-origin:50px 15px; animation:gf 3s ease-in-out infinite; }
      .gr { animation:gr 3s ease-in-out infinite; }
    `}</style>
    <g mask="url(#center-hole)">
      <circle cx="50" cy="50" r="48" fill="none" stroke="url(#god-flare)" strokeWidth="5" opacity=".5" filter="url(#glow-xl)" className="gp" />
      <circle cx="50" cy="50" r="44" fill="none" stroke="url(#god-core)" strokeWidth="6" filter="url(#glow-lg)" />
      {[0,45,90,135,180,225,270,315].map((a,i) => (
        <line key={i} x1="50" y1="50" x2={50+48*Math.cos(a*Math.PI/180)} y2={50+48*Math.sin(a*Math.PI/180)} stroke="#FDE047" strokeWidth=".5" opacity=".3" className="gr" />
      ))}
      <g className="go">
        <circle cx="50" cy="50" r="48" fill="none" stroke="#FEF08A" strokeWidth="1" strokeDasharray="1,6" opacity=".8" />
        <path d="M 50 0 L 53 6 L 50 12 L 47 6 Z" fill="#FFF" filter="url(#glow-lg)" />
        <path d="M 50 88 L 53 94 L 50 100 L 47 94 Z" fill="#FFF" filter="url(#glow-lg)" />
        <path d="M 0 50 L 6 53 L 12 50 L 6 47 Z" fill="#FFF" filter="url(#glow-lg)" />
        <path d="M 88 50 L 94 53 L 100 50 L 94 47 Z" fill="#FFF" filter="url(#glow-lg)" />
        <circle cx="15" cy="15" r="2.5" fill="#FFF" filter="url(#glow-lg)" />
        <circle cx="85" cy="15" r="2.5" fill="#FFF" filter="url(#glow-lg)" />
        <circle cx="15" cy="85" r="2.5" fill="#FFF" filter="url(#glow-lg)" />
        <circle cx="85" cy="85" r="2.5" fill="#FFF" filter="url(#glow-lg)" />
      </g>
      <g className="gi">
        <polygon points="50,8 80,20 92,50 80,80 50,92 20,80 8,50 20,20" fill="none" stroke="#FDE047" strokeWidth="1.5" opacity=".9" />
        <polygon points="50,12 77,23 88,50 77,77 50,88 23,77 12,50 23,23" fill="none" stroke="#FFF" strokeWidth=".5" strokeDasharray="3,3" opacity=".6" />
      </g>
      <g className="gc">
        <path d="M 32 18 L 50 -2 L 68 18 L 55 22 L 50 12 L 45 22 Z" fill="url(#god-flare)" filter="url(#glow-xl)" />
        <polygon points="50,2 54,10 50,14 46,10" fill="#FFF" />
        <circle cx="50" cy="-5" r="3" fill="#FFF" filter="url(#glow-xl)" className="gp" />
      </g>
      <path d="M 15 80 Q 50 110 85 80 Q 75 88 50 94 Q 25 88 15 80 Z" fill="url(#god-flare)" opacity=".6" filter="url(#glow-lg)" />
    </g>
  </svg>
);

// ═══════════════════════════════════════════════════════════════════════════════
// 🌿 GAIA CROWN — Earth's Guardian (LEGENDARY — 25,000 pts)
// A massive emerald-gold cosmic nature frame with floating crown, ancient runes,
// swirling vine energy, and a dramatic golden diadem
// ═══════════════════════════════════════════════════════════════════════════════
export const GaiaFrame = () => (
  <svg viewBox="0 0 100 100" style={{ width: '100%', height: '100%', overflow: 'visible' }}>
    <SharedDefs />
    <defs>
      <linearGradient id="gaia-ring" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#6EE7B7" />
        <stop offset="25%" stopColor="#059669" />
        <stop offset="50%" stopColor="#FDE047" />
        <stop offset="75%" stopColor="#10B981" />
        <stop offset="100%" stopColor="#047857" />
      </linearGradient>
      <linearGradient id="gaia-gold" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#B8860B" />
        <stop offset="30%" stopColor="#FFD700" />
        <stop offset="50%" stopColor="#FFFACD" />
        <stop offset="70%" stopColor="#FFD700" />
        <stop offset="100%" stopColor="#B8860B" />
      </linearGradient>
      <radialGradient id="gaia-aura" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor="#34D399" stopOpacity=".5" />
        <stop offset="60%" stopColor="#059669" stopOpacity=".25" />
        <stop offset="100%" stopColor="#047857" stopOpacity="0" />
      </radialGradient>
      <filter id="gaia-glow" x="-80%" y="-80%" width="260%" height="260%">
        <feGaussianBlur stdDeviation="12" result="blur" />
        <feComposite in="SourceGraphic" in2="blur" operator="over" />
      </filter>
    </defs>
    <style>{`
      @keyframes gaia-spin { 100% { transform: rotate(360deg); } }
      @keyframes gaia-rev { 100% { transform: rotate(-360deg); } }
      @keyframes gaia-pulse { 
        0%, 100% { opacity: .4; transform: scale(1); } 
        50% { opacity: .95; transform: scale(1.1); } 
      }
      @keyframes gaia-float { 
        0%, 100% { transform: translateY(0); } 
        50% { transform: translateY(-6px); } 
      }
      @keyframes gaia-shimmer {
        0%, 100% { opacity: .2; }
        50% { opacity: 1; }
      }
      @keyframes gaia-leaf {
        0%, 100% { transform: rotate(-8deg) scale(1); }
        50% { transform: rotate(8deg) scale(1.1); }
      }
      @keyframes gaia-spark {
        0%, 100% { opacity: 0; transform: scale(.3); }
        50% { opacity: 1; transform: scale(1.5); }
      }
      .gaia-outer { transform-origin: 50px 50px; animation: gaia-spin 28s linear infinite; }
      .gaia-inner { transform-origin: 50px 50px; animation: gaia-rev 18s linear infinite; }
      .gaia-mid { transform-origin: 50px 50px; animation: gaia-spin 40s linear infinite; }
      .gaia-aura { transform-origin: 50px 50px; animation: gaia-pulse 4s ease-in-out infinite; }
      .gaia-crown { transform-origin: 50px 8px; animation: gaia-float 3s ease-in-out infinite; }
      .gaia-shim1 { animation: gaia-shimmer 2.5s ease-in-out infinite; }
      .gaia-shim2 { animation: gaia-shimmer 2.5s ease-in-out infinite .8s; }
      .gaia-shim3 { animation: gaia-shimmer 2.5s ease-in-out infinite 1.6s; }
      .gaia-l1 { transform-origin: 14px 22px; animation: gaia-leaf 3.5s ease-in-out infinite; }
      .gaia-l2 { transform-origin: 86px 22px; animation: gaia-leaf 3.5s ease-in-out infinite .6s; }
      .gaia-l3 { transform-origin: 14px 78px; animation: gaia-leaf 3.5s ease-in-out infinite 1.2s; }
      .gaia-l4 { transform-origin: 86px 78px; animation: gaia-leaf 3.5s ease-in-out infinite 1.8s; }
      .gaia-sp1 { transform-origin: center; animation: gaia-spark 2s ease-in-out infinite; }
      .gaia-sp2 { transform-origin: center; animation: gaia-spark 2s ease-in-out infinite .5s; }
      .gaia-sp3 { transform-origin: center; animation: gaia-spark 2s ease-in-out infinite 1s; }
      .gaia-sp4 { transform-origin: center; animation: gaia-spark 2s ease-in-out infinite 1.5s; }
    `}</style>
    <g mask="url(#center-hole)">
      {/* === LAYER 1: Deep emerald aura (breathing) === */}
      <circle cx="50" cy="50" r="49" fill="url(#gaia-aura)" className="gaia-aura" />
      <circle cx="50" cy="50" r="49" fill="none" stroke="#34D399" strokeWidth="3" opacity=".25" filter="url(#gaia-glow)" className="gaia-aura" />
      
      {/* === LAYER 2: Thick primary emerald-gold ring === */}
      <circle cx="50" cy="50" r="43" fill="none" stroke="url(#gaia-ring)" strokeWidth="8" filter="url(#glow-lg)" />
      {/* Inner/outer accent lines */}
      <circle cx="50" cy="50" r="47" fill="none" stroke="#6EE7B7" strokeWidth="1.2" opacity=".5" />
      <circle cx="50" cy="50" r="39" fill="none" stroke="#34D399" strokeWidth=".8" opacity=".4" />

      {/* === LAYER 3: Rotating golden shimmer ring === */}
      <g className="gaia-mid">
        <circle cx="50" cy="50" r="45" fill="none" stroke="url(#gaia-gold)" strokeWidth="2" opacity=".6" />
        <circle cx="50" cy="50" r="45" fill="none" stroke="#FDE047" strokeWidth=".5" strokeDasharray="1,8" opacity=".8" />
      </g>

      {/* === LAYER 4: Rotating outer ring with orbiting orbs === */}
      <g className="gaia-outer">
        <circle cx="50" cy="50" r="48" fill="none" stroke="#059669" strokeWidth=".8" strokeDasharray="3,4" opacity=".6" />
        {/* Big orbiting emerald orbs */}
        <circle cx="50" cy="1" r="4" fill="#34D399" stroke="#6EE7B7" strokeWidth=".5" filter="url(#glow-lg)" />
        <circle cx="99" cy="50" r="3" fill="#A7F3D0" filter="url(#glow-md)" />
        <circle cx="50" cy="99" r="4" fill="#34D399" stroke="#6EE7B7" strokeWidth=".5" filter="url(#glow-lg)" />
        <circle cx="1" cy="50" r="3" fill="#A7F3D0" filter="url(#glow-md)" />
        {/* Smaller orbs between */}
        <circle cx="78" cy="10" r="2" fill="#FDE047" filter="url(#glow-sm)" />
        <circle cx="90" cy="78" r="2" fill="#FDE047" filter="url(#glow-sm)" />
        <circle cx="22" cy="90" r="2" fill="#FDE047" filter="url(#glow-sm)" />
        <circle cx="10" cy="22" r="2" fill="#FDE047" filter="url(#glow-sm)" />
      </g>

      {/* === LAYER 5: Counter-rotating inner geometry === */}
      <g className="gaia-inner">
        <polygon points="50,8 80,20 92,50 80,80 50,92 20,80 8,50 20,20" fill="none" stroke="#6EE7B7" strokeWidth="1.2" opacity=".6" />
        <polygon points="50,14 74,24 84,50 74,76 50,86 26,76 16,50 26,24" fill="none" stroke="#A7F3D0" strokeWidth=".5" strokeDasharray="2,3" opacity=".4" />
      </g>

      {/* === LAYER 6: Swaying animated leaves at corners === */}
      <g className="gaia-l1">
        <path d="M 8 28 Q -2 12 14 6 Q 20 18 8 28 Z" fill="#10B981" stroke="#047857" strokeWidth=".8" filter="url(#glow-sm)" />
        <path d="M 12 14 Q 8 28 8 28" fill="none" stroke="#047857" strokeWidth=".4" />
        <path d="M 18 18 Q 8 8 20 4 Q 24 12 18 18 Z" fill="#34D399" stroke="#059669" strokeWidth=".5" />
      </g>
      <g className="gaia-l2">
        <path d="M 92 28 Q 102 12 86 6 Q 80 18 92 28 Z" fill="#10B981" stroke="#047857" strokeWidth=".8" filter="url(#glow-sm)" />
        <path d="M 88 14 Q 92 28 92 28" fill="none" stroke="#047857" strokeWidth=".4" />
        <path d="M 82 18 Q 92 8 80 4 Q 76 12 82 18 Z" fill="#34D399" stroke="#059669" strokeWidth=".5" />
      </g>
      <g className="gaia-l3">
        <path d="M 8 72 Q -2 88 14 94 Q 20 82 8 72 Z" fill="#10B981" stroke="#047857" strokeWidth=".8" filter="url(#glow-sm)" />
        <path d="M 18 82 Q 8 92 20 96 Q 24 88 18 82 Z" fill="#34D399" stroke="#059669" strokeWidth=".5" />
      </g>
      <g className="gaia-l4">
        <path d="M 92 72 Q 102 88 86 94 Q 80 82 92 72 Z" fill="#10B981" stroke="#047857" strokeWidth=".8" filter="url(#glow-sm)" />
        <path d="M 82 82 Q 92 92 80 96 Q 76 88 82 82 Z" fill="#34D399" stroke="#059669" strokeWidth=".5" />
      </g>

      {/* === LAYER 7: The Gaia Diadem Crown (floating at top) === */}
      <g className="gaia-crown">
        {/* Crown base */}
        <path d="M 28 20 L 36 2 L 43 14 L 50 -8 L 57 14 L 64 2 L 72 20 Z" fill="url(#gaia-gold)" stroke="#B8860B" strokeWidth=".8" filter="url(#glow-xl)" />
        {/* Crown gems */}
        <circle cx="50" cy="-4" r="4" fill="#34D399" stroke="#6EE7B7" strokeWidth=".8" filter="url(#glow-lg)" />
        <circle cx="36" cy="5" r="2.5" fill="#FDE047" stroke="#B8860B" strokeWidth=".5" filter="url(#glow-md)" />
        <circle cx="64" cy="5" r="2.5" fill="#FDE047" stroke="#B8860B" strokeWidth=".5" filter="url(#glow-md)" />
        {/* Crown tip beacon */}
        <circle cx="50" cy="-10" r="3" fill="#FFFFFF" filter="url(#gaia-glow)" className="gaia-aura" />
        {/* Crown inner line */}
        <path d="M 34 16 L 50 0 L 66 16" fill="none" stroke="#FFFACD" strokeWidth=".6" opacity=".5" />
      </g>

      {/* === LAYER 8: Animated golden sparkles === */}
      <path d="M 26 8 L 27 13 L 32 14 L 27 15 L 26 20 L 25 15 L 20 14 L 25 13 Z" fill="#FDE047" filter="url(#glow-md)" className="gaia-sp1" />
      <path d="M 74 8 L 75 13 L 80 14 L 75 15 L 74 20 L 73 15 L 68 14 L 73 13 Z" fill="#FDE047" filter="url(#glow-md)" className="gaia-sp2" />
      <path d="M 6 50 L 7 55 L 12 56 L 7 57 L 6 62 L 5 57 L 0 56 L 5 55 Z" fill="#A7F3D0" filter="url(#glow-md)" className="gaia-sp3" />
      <path d="M 94 50 L 95 55 L 100 56 L 95 57 L 94 62 L 93 57 L 88 56 L 93 55 Z" fill="#A7F3D0" filter="url(#glow-md)" className="gaia-sp4" />

      {/* === LAYER 9: Bottom energy wave flourish === */}
      <path d="M 12 82 Q 30 108 50 98 Q 70 108 88 82" fill="none" stroke="#34D399" strokeWidth="2" opacity=".7" filter="url(#glow-lg)" />
      <path d="M 18 85 Q 34 104 50 96 Q 66 104 82 85" fill="none" stroke="#FDE047" strokeWidth="1" opacity=".5" filter="url(#glow-md)" />
      <path d="M 15 80 Q 50 112 85 80 Q 70 92 50 98 Q 30 92 15 80 Z" fill="url(#gaia-aura)" opacity=".6" filter="url(#glow-lg)" />
      <circle cx="50" cy="97" r="3" fill="#FDE047" filter="url(#glow-lg)" className="gaia-sp1" />
    </g>
  </svg>
);

// ═══════════════════════════════════════════════════════════════════════════════
// 🌌 SUPERNOVA — Cosmic Energy (LEGENDARY — 50,000 pts)
// Deep space: triple rotating neon rings, orbiting energy orbs, pulsing cosmic
// aura, star field, energy crown, plasma waves
// ═══════════════════════════════════════════════════════════════════════════════
export const SupernovaFrame = () => (
  <svg viewBox="0 0 100 100" style={{ width: '100%', height: '100%', overflow: 'visible' }}>
    <SharedDefs />
    <defs>
      <linearGradient id="sn-r1" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#06B6D4" />
        <stop offset="33%" stopColor="#8B5CF6" />
        <stop offset="66%" stopColor="#EC4899" />
        <stop offset="100%" stopColor="#3B82F6" />
      </linearGradient>
      <linearGradient id="sn-r2" x1="100%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#F472B6" />
        <stop offset="50%" stopColor="#A78BFA" />
        <stop offset="100%" stopColor="#22D3EE" />
      </linearGradient>
      <linearGradient id="sn-r3" x1="0%" y1="100%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#22D3EE" />
        <stop offset="50%" stopColor="#EC4899" />
        <stop offset="100%" stopColor="#8B5CF6" />
      </linearGradient>
      <linearGradient id="sn-crown" x1="0%" y1="100%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#7C3AED" />
        <stop offset="30%" stopColor="#EC4899" />
        <stop offset="60%" stopColor="#22D3EE" />
        <stop offset="100%" stopColor="#8B5CF6" />
      </linearGradient>
      <radialGradient id="sn-aura" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor="#C084FC" stopOpacity=".5" />
        <stop offset="40%" stopColor="#7C3AED" stopOpacity=".25" />
        <stop offset="100%" stopColor="#1E1B4B" stopOpacity="0" />
      </radialGradient>
      <filter id="sn-glow" x="-80%" y="-80%" width="260%" height="260%">
        <feGaussianBlur stdDeviation="14" result="blur" />
        <feComposite in="SourceGraphic" in2="blur" operator="over" />
      </filter>
    </defs>
    <style>{`
      @keyframes sn-fast { 100% { transform: rotate(360deg); } }
      @keyframes sn-slow { 100% { transform: rotate(-360deg); } }
      @keyframes sn-mid { 100% { transform: rotate(360deg); } }
      @keyframes sn-pulse {
        0%, 100% { opacity: .3; transform: scale(1); }
        50% { opacity: .9; transform: scale(1.12); }
      }
      @keyframes sn-float {
        0%, 100% { transform: translateY(0); }
        50% { transform: translateY(-7px); }
      }
      @keyframes sn-flicker {
        0%, 100% { opacity: .4; }
        25% { opacity: 1; }
        50% { opacity: .2; }
        75% { opacity: .9; }
      }
      @keyframes sn-star {
        0%, 100% { opacity: 0; transform: scale(.2); }
        50% { opacity: 1; transform: scale(1.6); }
      }
      @keyframes sn-orb {
        0% { transform: rotate(0deg) translateX(47px) rotate(0deg); }
        100% { transform: rotate(360deg) translateX(47px) rotate(-360deg); }
      }
      .sn-ring1 { transform-origin: 50px 50px; animation: sn-fast 8s linear infinite; }
      .sn-ring2 { transform-origin: 50px 50px; animation: sn-slow 14s linear infinite; }
      .sn-ring3 { transform-origin: 50px 50px; animation: sn-mid 22s linear infinite; }
      .sn-aura { transform-origin: 50px 50px; animation: sn-pulse 3.5s ease-in-out infinite; }
      .sn-crown { transform-origin: 50px 8px; animation: sn-float 3s ease-in-out infinite; }
      .sn-fl { animation: sn-flicker 2s ease-in-out infinite; }
      .sn-s1 { transform-origin: center; animation: sn-star 1.8s ease-in-out infinite; }
      .sn-s2 { transform-origin: center; animation: sn-star 1.8s ease-in-out infinite .35s; }
      .sn-s3 { transform-origin: center; animation: sn-star 1.8s ease-in-out infinite .7s; }
      .sn-s4 { transform-origin: center; animation: sn-star 1.8s ease-in-out infinite 1.05s; }
      .sn-s5 { transform-origin: center; animation: sn-star 1.8s ease-in-out infinite 1.4s; }
      .sn-o1 { transform-origin: 50px 50px; animation: sn-orb 5s linear infinite; }
      .sn-o2 { transform-origin: 50px 50px; animation: sn-orb 7s linear infinite reverse; }
      .sn-o3 { transform-origin: 50px 50px; animation: sn-orb 9s linear infinite; }
    `}</style>
    <g mask="url(#center-hole)">
      {/* === LAYER 1: Deep cosmic aura (breathing) === */}
      <circle cx="50" cy="50" r="49" fill="url(#sn-aura)" className="sn-aura" />
      <circle cx="50" cy="50" r="49" fill="none" stroke="#7C3AED" strokeWidth="4" opacity=".2" filter="url(#sn-glow)" className="sn-aura" />

      {/* === LAYER 2: Primary neon ring (fast spin) === */}
      <g className="sn-ring1">
        <circle cx="50" cy="50" r="44" fill="none" stroke="url(#sn-r1)" strokeWidth="6" filter="url(#glow-lg)" />
        <circle cx="50" cy="50" r="44" fill="none" stroke="#22D3EE" strokeWidth="1" strokeDasharray="2,10" opacity=".9" />
        {/* Large energy nodes on primary ring */}
        <circle cx="50" cy="6" r="4" fill="#22D3EE" stroke="#06B6D4" strokeWidth=".8" filter="url(#glow-lg)" className="sn-fl" />
        <circle cx="94" cy="50" r="3.5" fill="#EC4899" stroke="#F472B6" strokeWidth=".8" filter="url(#glow-lg)" className="sn-fl" />
        <circle cx="50" cy="94" r="4" fill="#8B5CF6" stroke="#A78BFA" strokeWidth=".8" filter="url(#glow-lg)" className="sn-fl" />
        <circle cx="6" cy="50" r="3.5" fill="#3B82F6" stroke="#60A5FA" strokeWidth=".8" filter="url(#glow-lg)" className="sn-fl" />
      </g>

      {/* === LAYER 3: Secondary ring (slow counter-spin) === */}
      <g className="sn-ring2">
        <circle cx="50" cy="50" r="48" fill="none" stroke="url(#sn-r2)" strokeWidth="2" opacity=".7" />
        <circle cx="50" cy="50" r="48" fill="none" stroke="#F472B6" strokeWidth=".5" strokeDasharray="4,6" opacity=".5" />
        {/* Smaller energy sparks */}
        <circle cx="78" cy="6" r="2.5" fill="#F472B6" filter="url(#glow-md)" className="sn-fl" />
        <circle cx="94" cy="78" r="2.5" fill="#A78BFA" filter="url(#glow-md)" className="sn-fl" />
        <circle cx="22" cy="94" r="2.5" fill="#22D3EE" filter="url(#glow-md)" className="sn-fl" />
        <circle cx="6" cy="22" r="2.5" fill="#60A5FA" filter="url(#glow-md)" className="sn-fl" />
      </g>

      {/* === LAYER 4: Third ring — geometric (mid-speed) === */}
      <g className="sn-ring3">
        <polygon points="50,4 86,18 96,50 86,82 50,96 14,82 4,50 14,18" fill="none" stroke="#C084FC" strokeWidth=".8" opacity=".5" />
        <polygon points="50,10 80,22 90,50 80,78 50,90 20,78 10,50 20,22" fill="none" stroke="#818CF8" strokeWidth=".4" strokeDasharray="2,4" opacity=".4" />
      </g>

      {/* === LAYER 5: Orbiting energy orbs (independent orbits) === */}
      <g className="sn-o1">
        <circle cx="97" cy="50" r="3.5" fill="#06B6D4" stroke="#22D3EE" strokeWidth=".5" filter="url(#glow-lg)" />
      </g>
      <g className="sn-o2">
        <circle cx="97" cy="50" r="2.5" fill="#EC4899" stroke="#F472B6" strokeWidth=".5" filter="url(#glow-lg)" />
      </g>
      <g className="sn-o3">
        <circle cx="97" cy="50" r="2" fill="#8B5CF6" stroke="#A78BFA" strokeWidth=".5" filter="url(#glow-md)" />
      </g>

      {/* === LAYER 6: Energy burst rays from center === */}
      {[0,30,60,90,120,150,180,210,240,270,300,330].map((a,i) => (
        <line key={i} x1="50" y1="50" x2={50+48*Math.cos(a*Math.PI/180)} y2={50+48*Math.sin(a*Math.PI/180)}
          stroke={['#06B6D4','#8B5CF6','#EC4899'][i%3]} strokeWidth=".4" opacity=".15" className="sn-fl" />
      ))}

      {/* === LAYER 7: Cosmic Crown (floating at top) === */}
      <g className="sn-crown">
        {/* Crown body */}
        <path d="M 30 20 L 37 0 L 43 12 L 50 -10 L 57 12 L 63 0 L 70 20 Z" fill="url(#sn-crown)" stroke="#C084FC" strokeWidth=".6" filter="url(#glow-xl)" />
        {/* Crown gems */}
        <circle cx="50" cy="-6" r="4.5" fill="#22D3EE" stroke="#06B6D4" strokeWidth="1" filter="url(#sn-glow)" className="sn-aura" />
        <circle cx="37" cy="3" r="2.5" fill="#EC4899" stroke="#F472B6" strokeWidth=".5" filter="url(#glow-md)" />
        <circle cx="63" cy="3" r="2.5" fill="#8B5CF6" stroke="#A78BFA" strokeWidth=".5" filter="url(#glow-md)" />
        {/* Crown tip beacon */}
        <circle cx="50" cy="-12" r="3.5" fill="#FFFFFF" filter="url(#sn-glow)" className="sn-aura" />
        {/* Crown inner highlight */}
        <path d="M 36 16 L 50 -2 L 64 16" fill="none" stroke="#FFFFFF" strokeWidth=".5" opacity=".4" />
      </g>

      {/* === LAYER 8: Twinkling star particles === */}
      <path d="M 16 16 L 17 22 L 23 23 L 17 24 L 16 30 L 15 24 L 9 23 L 15 22 Z" fill="#22D3EE" filter="url(#glow-lg)" className="sn-s1" />
      <path d="M 84 16 L 85 22 L 91 23 L 85 24 L 84 30 L 83 24 L 77 23 L 83 22 Z" fill="#F472B6" filter="url(#glow-lg)" className="sn-s2" />
      <path d="M 16 84 L 17 90 L 23 91 L 17 92 L 16 98 L 15 92 L 9 91 L 15 90 Z" fill="#A78BFA" filter="url(#glow-lg)" className="sn-s3" />
      <path d="M 84 84 L 85 90 L 91 91 L 85 92 L 84 98 L 83 92 L 77 91 L 83 90 Z" fill="#60A5FA" filter="url(#glow-lg)" className="sn-s4" />
      <path d="M 50 -4 L 51 2 L 57 3 L 51 4 L 50 10 L 49 4 L 43 3 L 49 2 Z" fill="#FFFFFF" filter="url(#glow-xl)" className="sn-s5" />

      {/* === LAYER 9: Bottom plasma wave === */}
      <path d="M 10 82 Q 30 110 50 100 Q 70 110 90 82" fill="none" stroke="#8B5CF6" strokeWidth="2.5" opacity=".6" filter="url(#glow-lg)" />
      <path d="M 15 84 Q 33 106 50 98 Q 67 106 85 84" fill="none" stroke="#22D3EE" strokeWidth="1.2" opacity=".5" filter="url(#glow-md)" />
      <path d="M 20 86 Q 35 102 50 96 Q 65 102 80 86" fill="none" stroke="#EC4899" strokeWidth=".8" opacity=".4" filter="url(#glow-sm)" />
      <path d="M 12 80 Q 50 115 88 80 Q 70 94 50 100 Q 30 94 12 80 Z" fill="url(#sn-aura)" opacity=".5" filter="url(#glow-lg)" />
      <circle cx="50" cy="99" r="3.5" fill="#C084FC" filter="url(#glow-xl)" className="sn-s1" />
    </g>
  </svg>
);

// ═══════════════════════════════════════════════════════════════════════════════
// ✨ PRIME FRAME — The Ascended Admin Exclusive (UNOBTAINABLE)
// A reality-bending, god-tier frame meant only for admins and the most elite.
// Features: 24-point sunburst, 6-point & 12-point stars, ethereal wings, grand crown.
// ═══════════════════════════════════════════════════════════════════════════════
export const PrimeFrame = () => (
  <svg viewBox="0 0 100 100" style={{ width: '100%', height: '100%', overflow: 'visible' }}>
    <SharedDefs />
    <defs>
      <linearGradient id="prime-grad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#FFFFFF" />
        <stop offset="25%" stopColor="#22D3EE" />
        <stop offset="50%" stopColor="#A855F7" />
        <stop offset="75%" stopColor="#F472B6" />
        <stop offset="100%" stopColor="#FDE047" />
      </linearGradient>
      <linearGradient id="prime-gold" x1="0%" y1="100%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#F59E0B" />
        <stop offset="50%" stopColor="#FEF08A" />
        <stop offset="100%" stopColor="#D97706" />
      </linearGradient>
      <radialGradient id="prime-aura" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor="#22D3EE" stopOpacity="0.8" />
        <stop offset="30%" stopColor="#A855F7" stopOpacity="0.4" />
        <stop offset="70%" stopColor="#F472B6" stopOpacity="0.1" />
        <stop offset="100%" stopColor="#000000" stopOpacity="0" />
      </radialGradient>
      <filter id="prime-glow" x="-100%" y="-100%" width="300%" height="300%">
        <feGaussianBlur stdDeviation="15" result="blur" />
        <feComposite in="SourceGraphic" in2="blur" operator="over" />
      </filter>
      <filter id="prime-glow-intense" x="-100%" y="-100%" width="300%" height="300%">
        <feGaussianBlur stdDeviation="8" result="blur" />
        <feComponentTransfer in="blur" result="glow">
          <feFuncA type="linear" slope="2" />
        </feComponentTransfer>
        <feMerge>
          <feMergeNode in="glow" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
    </defs>
    <style>{`
      @keyframes pr-spin-f { 100% { transform: rotate(360deg); } }
      @keyframes pr-spin-s { 100% { transform: rotate(-360deg); } }
      @keyframes pr-pulse { 0%, 100% { transform: scale(1); opacity: 0.6; } 50% { transform: scale(1.15); opacity: 1; } }
      @keyframes pr-float { 0%, 100% { transform: translateY(0px); } 50% { transform: translateY(-8px); } }
      @keyframes pr-wing-l { 0%, 100% { transform: rotate(0deg); } 50% { transform: rotate(-10deg); } }
      @keyframes pr-wing-r { 0%, 100% { transform: rotate(0deg); } 50% { transform: rotate(10deg); } }
      @keyframes pr-star { 0%, 100% { transform: scale(0); opacity: 0; } 50% { transform: scale(2); opacity: 1; } }
      .pr-sf { transform-origin: 50px 50px; animation: pr-spin-f 12s linear infinite; }
      .pr-ss { transform-origin: 50px 50px; animation: pr-spin-s 25s linear infinite; }
      .pr-p { transform-origin: 50px 50px; animation: pr-pulse 3s ease-in-out infinite; }
      .pr-c { transform-origin: 50px 0px; animation: pr-float 3s ease-in-out infinite; }
      .pr-wl { transform-origin: 20px 50px; animation: pr-wing-l 4s ease-in-out infinite; }
      .pr-wr { transform-origin: 80px 50px; animation: pr-wing-r 4s ease-in-out infinite; }
      .pr-st1 { transform-origin: center; animation: pr-star 2s ease-in-out infinite 0s; }
      .pr-st2 { transform-origin: center; animation: pr-star 2s ease-in-out infinite 0.5s; }
      .pr-st3 { transform-origin: center; animation: pr-star 2s ease-in-out infinite 1s; }
      .pr-st4 { transform-origin: center; animation: pr-star 2s ease-in-out infinite 1.5s; }
    `}</style>
    <g mask="url(#center-hole)">
      {/* 1. Base Aura */}
      <circle cx="50" cy="50" r="50" fill="url(#prime-aura)" filter="url(#prime-glow)" className="pr-p" />
      
      {/* 2. Sunburst Rays */}
      <g className="pr-ss">
        {[...Array(24)].map((_, i) => (
          <line key={i} x1="50" y1="50" x2={50 + 55 * Math.cos((i * 15 * Math.PI) / 180)} y2={50 + 55 * Math.sin((i * 15 * Math.PI) / 180)} stroke="url(#prime-grad)" strokeWidth="0.8" opacity="0.4" />
        ))}
      </g>

      {/* 3. Outer Hexagram (6-point star) */}
      <g className="pr-sf">
        <polygon points="50,2 91,26 91,74 50,98 9,74 9,26" fill="none" stroke="url(#prime-grad)" strokeWidth="1" filter="url(#glow-md)" opacity="0.6" />
        <polygon points="50,2 91,26 91,74 50,98 9,74 9,26" fill="none" stroke="#FFFFFF" strokeWidth="0.5" transform="rotate(30 50 50)" opacity="0.4" />
      </g>

      {/* 4. Orbiting Energy Spheres */}
      <g className="pr-ss">
        {[0, 90, 180, 270].map((angle, i) => (
          <circle key={i} cx={50 + 46 * Math.cos((angle * Math.PI) / 180)} cy={50 + 46 * Math.sin((angle * Math.PI) / 180)} r="4" fill="#FFFFFF" filter="url(#prime-glow-intense)" />
        ))}
      </g>

      {/* 5. Ethereal Wings (Left & Right) */}
      <g className="pr-wl">
        <path d="M 12 40 Q -10 20 2 0 Q 5 25 18 35 Z" fill="url(#prime-grad)" opacity="0.8" filter="url(#glow-lg)" />
        <path d="M 12 50 Q -15 40 -5 20 Q 2 40 18 45 Z" fill="url(#prime-grad)" opacity="0.6" filter="url(#glow-md)" />
        <path d="M 15 60 Q -5 60 0 80 Q 5 65 20 55 Z" fill="url(#prime-grad)" opacity="0.7" filter="url(#glow-lg)" />
      </g>
      <g className="pr-wr">
        <path d="M 88 40 Q 110 20 98 0 Q 95 25 82 35 Z" fill="url(#prime-grad)" opacity="0.8" filter="url(#glow-lg)" />
        <path d="M 88 50 Q 115 40 105 20 Q 98 40 82 45 Z" fill="url(#prime-grad)" opacity="0.6" filter="url(#glow-md)" />
        <path d="M 85 60 Q 105 60 100 80 Q 95 65 80 55 Z" fill="url(#prime-grad)" opacity="0.7" filter="url(#glow-lg)" />
      </g>

      {/* 6. Core Golden Ring */}
      <circle cx="50" cy="50" r="43" fill="none" stroke="url(#prime-gold)" strokeWidth="6" filter="url(#prime-glow-intense)" />
      <circle cx="50" cy="50" r="45" fill="none" stroke="#FFFFFF" strokeWidth="1" opacity="0.8" />
      <circle cx="50" cy="50" r="41" fill="none" stroke="#FFFFFF" strokeWidth="1" opacity="0.8" />

      {/* 7. The Ultimate Crown */}
      <g className="pr-c">
        {/* Giant Halo Behind Crown */}
        <circle cx="50" cy="-10" r="15" fill="none" stroke="#FDE047" strokeWidth="1.5" opacity="0.8" filter="url(#glow-xl)" className="pr-p" />
        <path d="M 20 15 L 35 -15 L 50 -25 L 65 -15 L 80 15 L 65 10 L 50 15 L 35 10 Z" fill="url(#prime-gold)" stroke="#FFFFFF" strokeWidth="1" filter="url(#prime-glow-intense)" />
        <circle cx="50" cy="-25" r="5" fill="#FFFFFF" filter="url(#prime-glow-intense)" />
        <circle cx="35" cy="-15" r="3.5" fill="#22D3EE" filter="url(#glow-md)" />
        <circle cx="65" cy="-15" r="3.5" fill="#F472B6" filter="url(#glow-md)" />
        <path d="M 38 5 L 50 -10 L 62 5" fill="none" stroke="#FFFFFF" strokeWidth="1.5" opacity="0.6" />
      </g>

      {/* 8. Blinding Stars */}
      <g className="pr-st1" transform="translate(15, 15)"><polygon points="0,-4 1,-1 4,0 1,1 0,4 -1,1 -4,0 -1,-1" fill="#FFFFFF" filter="url(#glow-lg)" /></g>
      <g className="pr-st2" transform="translate(85, 15)"><polygon points="0,-4 1,-1 4,0 1,1 0,4 -1,1 -4,0 -1,-1" fill="#FFFFFF" filter="url(#glow-lg)" /></g>
      <g className="pr-st3" transform="translate(15, 85)"><polygon points="0,-4 1,-1 4,0 1,1 0,4 -1,1 -4,0 -1,-1" fill="#FFFFFF" filter="url(#glow-lg)" /></g>
      <g className="pr-st4" transform="translate(85, 85)"><polygon points="0,-4 1,-1 4,0 1,1 0,4 -1,1 -4,0 -1,-1" fill="#FFFFFF" filter="url(#glow-lg)" /></g>

      {/* 9. Bottom Floating Runes / Orbs */}
      <path d="M 30 95 Q 50 115 70 95" fill="none" stroke="url(#prime-grad)" strokeWidth="2" filter="url(#glow-lg)" opacity="0.8" />
      <circle cx="50" cy="105" r="4" fill="#FFFFFF" filter="url(#prime-glow-intense)" />
      <circle cx="40" cy="100" r="2" fill="#22D3EE" filter="url(#glow-md)" />
      <circle cx="60" cy="100" r="2" fill="#F472B6" filter="url(#glow-md)" />
    </g>
  </svg>
);

// ═══════════════════════════════════════════════════════════════════════════════
// 🧫 BIO-CIRCUIT WEAVE — Quantum Tier (75,000 pts)
// Living circuitry grown from photosynthetic silicon. Data-sap flows through
// glowing traces; hex lattices rotate; leaf-chips blink like status LEDs.
// ═══════════════════════════════════════════════════════════════════════════════
export const BiocircuitFrame = () => (
  <svg viewBox="0 0 100 100" style={{ width: '100%', height: '100%', overflow: 'visible' }}>
    <SharedDefs />
    <defs>
      <linearGradient id="bio-ring" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#67E8F9" />
        <stop offset="30%" stopColor="#22D3EE" />
        <stop offset="55%" stopColor="#34D399" />
        <stop offset="80%" stopColor="#A3E635" />
        <stop offset="100%" stopColor="#0891B2" />
      </linearGradient>
      <radialGradient id="bio-aura" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor="#22D3EE" stopOpacity=".45" />
        <stop offset="60%" stopColor="#0E7490" stopOpacity=".2" />
        <stop offset="100%" stopColor="#164E63" stopOpacity="0" />
      </radialGradient>
    </defs>
    <style>{`
      @keyframes bio-spin { 100% { transform: rotate(360deg); } }
      @keyframes bio-rev { 100% { transform: rotate(-360deg); } }
      @keyframes bio-pulse { 0%,100%{opacity:.35;transform:scale(1)} 50%{opacity:.95;transform:scale(1.08)} }
      @keyframes bio-flow { 100% { stroke-dashoffset: -120; } }
      @keyframes bio-blink { 0%,100%{opacity:.2} 50%{opacity:1} }
      .bio-aura { transform-origin:50px 50px; animation: bio-pulse 3.5s ease-in-out infinite; }
      .bio-o { transform-origin:50px 50px; animation: bio-spin 24s linear infinite; }
      .bio-i { transform-origin:50px 50px; animation: bio-rev 16s linear infinite; }
      .bio-flow { animation: bio-flow 3s linear infinite; }
      .bio-b1 { animation: bio-blink 1.8s ease-in-out infinite; }
      .bio-b2 { animation: bio-blink 1.8s ease-in-out infinite .45s; }
      .bio-b3 { animation: bio-blink 1.8s ease-in-out infinite .9s; }
      .bio-b4 { animation: bio-blink 1.8s ease-in-out infinite 1.35s; }
    `}</style>
    <g mask="url(#center-hole)">
      {/* Breathing photonic aura */}
      <circle cx="50" cy="50" r="49" fill="url(#bio-aura)" className="bio-aura" />
      {/* Primary bio-metal ring */}
      <circle cx="50" cy="50" r="42" fill="none" stroke="url(#bio-ring)" strokeWidth="7" filter="url(#glow-lg)" />
      <circle cx="50" cy="50" r="46.5" fill="none" stroke="#22D3EE" strokeWidth=".8" opacity=".5" />
      <circle cx="50" cy="50" r="37.5" fill="none" stroke="#A3E635" strokeWidth=".6" opacity=".4" />
      {/* Flowing data-sap ring */}
      <circle cx="50" cy="50" r="44.5" fill="none" stroke="#67E8F9" strokeWidth="1.4" strokeDasharray="5 15" className="bio-flow" filter="url(#glow-sm)" />
      {/* Circuit traces at corners with flowing packets */}
      <g stroke="#22D3EE" strokeWidth="1" fill="none" opacity=".9">
        <path d="M 8 26 H 20 L 28 18 V 8" strokeDasharray="3 6" className="bio-flow" />
        <path d="M 92 26 H 80 L 72 18 V 8" strokeDasharray="3 6" className="bio-flow" />
        <path d="M 8 74 H 20 L 28 82 V 92" strokeDasharray="3 6" className="bio-flow" />
        <path d="M 92 74 H 80 L 72 82 V 92" strokeDasharray="3 6" className="bio-flow" />
      </g>
      {/* Terminal nodes (status LEDs) */}
      <circle cx="8" cy="26" r="2" fill="#67E8F9" filter="url(#glow-md)" className="bio-b1" />
      <circle cx="92" cy="26" r="2" fill="#A3E635" filter="url(#glow-md)" className="bio-b2" />
      <circle cx="8" cy="74" r="2" fill="#A3E635" filter="url(#glow-md)" className="bio-b3" />
      <circle cx="92" cy="74" r="2" fill="#67E8F9" filter="url(#glow-md)" className="bio-b4" />
      {/* Rotating hex lattices */}
      <g className="bio-o">
        <polygon points="50,4 89.8,27 89.8,73 50,96 10.2,73 10.2,27" fill="none" stroke="#22D3EE" strokeWidth=".9" strokeDasharray="4 3" opacity=".55" />
      </g>
      <g className="bio-i">
        <polygon points="50,10 84.6,30 84.6,70 50,90 15.4,70 15.4,30" fill="none" stroke="#34D399" strokeWidth=".6" strokeDasharray="2 4" opacity=".5" />
        <rect x="46.5" y="6.5" width="7" height="7" rx="1.5" fill="#0E7490" stroke="#67E8F9" strokeWidth=".7" />
        <rect x="46.5" y="86.5" width="7" height="7" rx="1.5" fill="#0E7490" stroke="#A3E635" strokeWidth=".7" />
      </g>
      {/* Photosynthetic leaf-chip crest */}
      <g filter="url(#glow-md)">
        <path d="M 50 2 Q 58 8 50 16 Q 42 8 50 2 Z" fill="#34D399" stroke="#A7F3D0" strokeWidth=".7" />
        <path d="M 50 4 V 14" stroke="#ECFDF5" strokeWidth=".6" opacity=".8" />
      </g>
      {/* Pulse sparks */}
      <circle cx="50" cy="94" r="2.4" fill="#67E8F9" filter="url(#glow-lg)" className="bio-b2" />
      <circle cx="6" cy="50" r="2" fill="#22D3EE" filter="url(#glow-md)" className="bio-b3" />
      <circle cx="94" cy="50" r="2" fill="#A3E635" filter="url(#glow-md)" className="bio-b4" />
    </g>
  </svg>
);

// ═══════════════════════════════════════════════════════════════════════════════
// 🧬 GENESIS HELIX — Mythic Tier (120,000 pts)
// Twin strands of terraforming light orbit the avatar — the blueprint of a
// reborn biosphere. Emerald-gold nucleotide orbs, floating DNA crest.
// ═══════════════════════════════════════════════════════════════════════════════
export const HelixFrame = () => (
  <svg viewBox="0 0 100 100" style={{ width: '100%', height: '100%', overflow: 'visible' }}>
    <SharedDefs />
    <defs>
      <linearGradient id="hx-ring" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#BBF7D0" />
        <stop offset="30%" stopColor="#4ADE80" />
        <stop offset="55%" stopColor="#FDE047" />
        <stop offset="80%" stopColor="#22C55E" />
        <stop offset="100%" stopColor="#15803D" />
      </linearGradient>
      <radialGradient id="hx-aura" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor="#4ADE80" stopOpacity=".5" />
        <stop offset="60%" stopColor="#16A34A" stopOpacity=".22" />
        <stop offset="100%" stopColor="#14532D" stopOpacity="0" />
      </radialGradient>
      <filter id="hx-glow" x="-80%" y="-80%" width="260%" height="260%">
        <feGaussianBlur stdDeviation="12" result="blur" />
        <feComposite in="SourceGraphic" in2="blur" operator="over" />
      </filter>
    </defs>
    <style>{`
      @keyframes hx-spin { 100% { transform: rotate(360deg); } }
      @keyframes hx-rev { 100% { transform: rotate(-360deg); } }
      @keyframes hx-pulse { 0%,100%{opacity:.4;transform:scale(1)} 50%{opacity:.95;transform:scale(1.1)} }
      @keyframes hx-float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-6px)} }
      @keyframes hx-tw { 0%,100%{opacity:0;transform:scale(.3)} 50%{opacity:1;transform:scale(1.4)} }
      .hx-aura { transform-origin:50px 50px; animation: hx-pulse 4s ease-in-out infinite; }
      .hx-a { transform-origin:50px 50px; animation: hx-spin 12s linear infinite; }
      .hx-b { transform-origin:50px 50px; animation: hx-rev 12s linear infinite; }
      .hx-rungs { transform-origin:50px 50px; animation: hx-spin 30s linear infinite; }
      .hx-crest { transform-origin:50px 6px; animation: hx-float 3s ease-in-out infinite; }
      .hx-t1 { transform-origin:center; animation: hx-tw 2.2s ease-in-out infinite; }
      .hx-t2 { transform-origin:center; animation: hx-tw 2.2s ease-in-out infinite .55s; }
      .hx-t3 { transform-origin:center; animation: hx-tw 2.2s ease-in-out infinite 1.1s; }
      .hx-t4 { transform-origin:center; animation: hx-tw 2.2s ease-in-out infinite 1.65s; }
    `}</style>
    <g mask="url(#center-hole)">
      {/* Biosphere aura */}
      <circle cx="50" cy="50" r="49" fill="url(#hx-aura)" className="hx-aura" />
      <circle cx="50" cy="50" r="49" fill="none" stroke="#4ADE80" strokeWidth="3" opacity=".22" filter="url(#hx-glow)" className="hx-aura" />
      {/* Primary emerald-gold ring */}
      <circle cx="50" cy="50" r="43" fill="none" stroke="url(#hx-ring)" strokeWidth="7" filter="url(#glow-lg)" />
      <circle cx="50" cy="50" r="47" fill="none" stroke="#BBF7D0" strokeWidth=".9" opacity=".45" />
      {/* Strand A — terraforming light band */}
      <g className="hx-a">
        <ellipse cx="50" cy="50" rx="46" ry="15" fill="none" stroke="#4ADE80" strokeWidth="1.6" opacity=".8" filter="url(#glow-md)" transform="rotate(28 50 50)" />
        <circle cx="96" cy="50" r="3" fill="#BBF7D0" filter="url(#glow-lg)" transform="rotate(28 50 50)" />
        <circle cx="4" cy="50" r="3" fill="#4ADE80" filter="url(#glow-lg)" transform="rotate(28 50 50)" />
      </g>
      {/* Strand B — counter-rotating golden band */}
      <g className="hx-b">
        <ellipse cx="50" cy="50" rx="46" ry="15" fill="none" stroke="#FDE047" strokeWidth="1.3" opacity=".7" filter="url(#glow-md)" transform="rotate(-28 50 50)" />
        <circle cx="96" cy="50" r="2.6" fill="#FEF9C3" filter="url(#glow-lg)" transform="rotate(-28 50 50)" />
        <circle cx="4" cy="50" r="2.6" fill="#FDE047" filter="url(#glow-lg)" transform="rotate(-28 50 50)" />
      </g>
      {/* Base-pair rungs */}
      <g className="hx-rungs">
        <circle cx="50" cy="50" r="45" fill="none" stroke="#86EFAC" strokeWidth="2.2" strokeDasharray="1.2 10" opacity=".7" />
      </g>
      {/* Floating DNA crest */}
      <g className="hx-crest" filter="url(#glow-lg)">
        <path d="M 42 -6 Q 50 0 58 -6" fill="none" stroke="#4ADE80" strokeWidth="1.6" />
        <path d="M 42 6 Q 50 0 58 6" fill="none" stroke="#FDE047" strokeWidth="1.6" />
        <path d="M 44 -3.5 L 56 3.5 M 44 3.5 L 56 -3.5 M 50 -1.5 V 1.5" stroke="#ECFDF5" strokeWidth=".7" opacity=".9" />
        <circle cx="42" cy="-6" r="1.8" fill="#BBF7D0" />
        <circle cx="58" cy="-6" r="1.8" fill="#FDE047" />
        <circle cx="42" cy="6" r="1.8" fill="#FDE047" />
        <circle cx="58" cy="6" r="1.8" fill="#BBF7D0" />
      </g>
      {/* Spore sparkles */}
      <path d="M 18 20 L 19 25 L 24 26 L 19 27 L 18 32 L 17 27 L 12 26 L 17 25 Z" fill="#BBF7D0" filter="url(#glow-md)" className="hx-t1" />
      <path d="M 82 20 L 83 25 L 88 26 L 83 27 L 82 32 L 81 27 L 76 26 L 81 25 Z" fill="#FDE047" filter="url(#glow-md)" className="hx-t2" />
      <path d="M 18 70 L 19 75 L 24 76 L 19 77 L 18 82 L 17 77 L 12 76 L 17 75 Z" fill="#FDE047" filter="url(#glow-md)" className="hx-t3" />
      <path d="M 82 70 L 83 75 L 88 76 L 83 77 L 82 82 L 81 77 L 76 76 L 81 75 Z" fill="#BBF7D0" filter="url(#glow-md)" className="hx-t4" />
      {/* Root-system energy wave */}
      <path d="M 12 82 Q 30 106 50 97 Q 70 106 88 82" fill="none" stroke="#4ADE80" strokeWidth="2" opacity=".65" filter="url(#glow-lg)" />
      <path d="M 18 85 Q 34 102 50 95 Q 66 102 82 85" fill="none" stroke="#FDE047" strokeWidth="1" opacity=".5" filter="url(#glow-md)" />
      <circle cx="50" cy="96" r="2.8" fill="#BBF7D0" filter="url(#glow-lg)" className="hx-t2" />
    </g>
  </svg>
);

// ═══════════════════════════════════════════════════════════════════════════════
// 🌌 VERDANT SINGULARITY — Singularity Tier (250,000 pts)
// A collapsed star of pure life-energy. Emerald-fuchsia accretion disk,
// photon ring flicker, matter spiralling inward, gravitational lens arcs.
// ═══════════════════════════════════════════════════════════════════════════════
export const SingularityFrame = () => (
  <svg viewBox="0 0 100 100" style={{ width: '100%', height: '100%', overflow: 'visible' }}>
    <SharedDefs />
    <defs>
      <linearGradient id="sg-grad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#F0ABFC" />
        <stop offset="30%" stopColor="#A21CAF" />
        <stop offset="55%" stopColor="#34D399" />
        <stop offset="80%" stopColor="#6D28D9" />
        <stop offset="100%" stopColor="#F0ABFC" />
      </linearGradient>
      <radialGradient id="sg-aura" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor="#2E1065" stopOpacity=".8" />
        <stop offset="55%" stopColor="#A21CAF" stopOpacity=".3" />
        <stop offset="100%" stopColor="#000000" stopOpacity="0" />
      </radialGradient>
      <filter id="sg-glow" x="-90%" y="-90%" width="280%" height="280%">
        <feGaussianBlur stdDeviation="13" result="blur" />
        <feComposite in="SourceGraphic" in2="blur" operator="over" />
      </filter>
    </defs>
    <style>{`
      @keyframes sg-fast { 100% { transform: rotate(360deg); } }
      @keyframes sg-rev { 100% { transform: rotate(-360deg); } }
      @keyframes sg-pulse { 0%,100%{opacity:.35;transform:scale(1)} 50%{opacity:.9;transform:scale(1.1)} }
      @keyframes sg-flicker { 0%,100%{opacity:.35} 20%{opacity:1} 45%{opacity:.25} 70%{opacity:.85} }
      @keyframes sg-fall { 0%{opacity:0;transform:scale(1) rotate(0deg)} 25%{opacity:1} 100%{opacity:0;transform:scale(.08) rotate(220deg)} }
      @keyframes sg-tw { 0%,100%{opacity:0;transform:scale(.2)} 50%{opacity:1;transform:scale(1.6)} }
      .sg-aura { transform-origin:50px 50px; animation: sg-pulse 3.8s ease-in-out infinite; }
      .sg-d1 { transform-origin:50px 50px; animation: sg-fast 7s linear infinite; }
      .sg-d2 { transform-origin:50px 50px; animation: sg-rev 12s linear infinite; }
      .sg-d3 { transform-origin:50px 50px; animation: sg-fast 24s linear infinite; }
      .sg-ph { animation: sg-flicker 2.4s ease-in-out infinite; }
      .sg-f1 { transform-origin:50px 50px; animation: sg-fall 3.2s ease-in infinite; }
      .sg-f2 { transform-origin:50px 50px; animation: sg-fall 3.2s ease-in infinite 1.1s; }
      .sg-f3 { transform-origin:50px 50px; animation: sg-fall 3.2s ease-in infinite 2.2s; }
      .sg-t1 { transform-origin:center; animation: sg-tw 2s ease-in-out infinite; }
      .sg-t2 { transform-origin:center; animation: sg-tw 2s ease-in-out infinite .66s; }
      .sg-t3 { transform-origin:center; animation: sg-tw 2s ease-in-out infinite 1.33s; }
    `}</style>
    <g mask="url(#center-hole)">
      {/* Gravity-well aura */}
      <circle cx="50" cy="50" r="49" fill="url(#sg-aura)" className="sg-aura" />
      {/* Accretion disk — three counter-rotating dashed rings */}
      <g className="sg-d1">
        <circle cx="50" cy="50" r="47" fill="none" stroke="#F0ABFC" strokeWidth="1.6" strokeDasharray="14 8" opacity=".75" filter="url(#glow-md)" />
      </g>
      <g className="sg-d2">
        <circle cx="50" cy="50" r="44.5" fill="none" stroke="#34D399" strokeWidth="1.2" strokeDasharray="8 12" opacity=".65" filter="url(#glow-md)" />
      </g>
      <g className="sg-d3">
        <circle cx="50" cy="50" r="48.5" fill="none" stroke="#A78BFA" strokeWidth=".7" strokeDasharray="3 9" opacity=".5" />
      </g>
      {/* Primary singularity ring */}
      <circle cx="50" cy="50" r="42" fill="none" stroke="url(#sg-grad)" strokeWidth="6" filter="url(#sg-glow)" />
      {/* Event horizon + photon ring */}
      <circle cx="50" cy="50" r="37" fill="none" stroke="#0A0A0F" strokeWidth="3" opacity=".85" />
      <circle cx="50" cy="50" r="38.6" fill="none" stroke="#F0ABFC" strokeWidth=".9" className="sg-ph" filter="url(#glow-md)" />
      {/* Gravitational lens arcs */}
      <path d="M 14 30 Q 50 12 86 30" fill="none" stroke="#E9D5FF" strokeWidth=".8" opacity=".5" filter="url(#glow-sm)" />
      <path d="M 14 70 Q 50 88 86 70" fill="none" stroke="#A7F3D0" strokeWidth=".8" opacity=".5" filter="url(#glow-sm)" />
      {/* Matter spiralling inward */}
      <g className="sg-f1"><circle cx="18" cy="18" r="2.4" fill="#F0ABFC" filter="url(#glow-md)" /></g>
      <g className="sg-f2"><circle cx="84" cy="26" r="2" fill="#34D399" filter="url(#glow-md)" /></g>
      <g className="sg-f3"><circle cx="24" cy="82" r="2.2" fill="#A78BFA" filter="url(#glow-md)" /></g>
      {/* Collapsed-star crest at top */}
      <g filter="url(#sg-glow)">
        <circle cx="50" cy="2" r="5" fill="#0A0A0F" stroke="#F0ABFC" strokeWidth="1.2" className="sg-ph" />
        <path d="M 50 -8 V -4 M 50 8 V 12 M 40 2 H 44 M 56 2 H 60" stroke="#E9D5FF" strokeWidth=".9" opacity=".8" />
        <circle cx="50" cy="2" r="2" fill="#34D399" className="sg-t2" />
      </g>
      {/* Bloom stars along the horizon */}
      <path d="M 14 50 L 15 55 L 20 56 L 15 57 L 14 62 L 13 57 L 8 56 L 13 55 Z" fill="#F0ABFC" filter="url(#glow-lg)" className="sg-t1" />
      <path d="M 86 50 L 87 55 L 92 56 L 87 57 L 86 62 L 85 57 L 80 56 L 85 55 Z" fill="#34D399" filter="url(#glow-lg)" className="sg-t2" />
      <path d="M 50 86 L 51 91 L 56 92 L 51 93 L 50 98 L 49 93 L 44 92 L 49 91 Z" fill="#A78BFA" filter="url(#glow-lg)" className="sg-t3" />
      {/* Bottom accretion wave */}
      <path d="M 10 80 Q 30 108 50 99 Q 70 108 90 80" fill="none" stroke="#A21CAF" strokeWidth="2.2" opacity=".6" filter="url(#glow-lg)" />
      <path d="M 16 83 Q 34 104 50 96 Q 66 104 84 83" fill="none" stroke="#34D399" strokeWidth="1" opacity=".5" filter="url(#glow-md)" />
    </g>
  </svg>
);

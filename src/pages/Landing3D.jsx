// src/pages/Landing3D.jsx
// Full-screen iframe wrapper for the Sylva-based 3D immersive landing page.
// The 3D page is a self-contained HTML document with inline Three.js, procedural
// moss generation, liquid-metal WebGL buttons, and pointer-parallax — far too
// complex to decompose into React components. The iframe keeps its own stacking
// contexts, animation loops, and pointer events isolated.

import { useEffect } from 'react';

export default function Landing3D() {
  // Prevent the parent page from scrolling while the 3D landing is active
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  return (
    <iframe
      id="landing-3d-frame"
      title="EcoSpark 3D Landing Experience"
      src="/sylva/index.html"
      style={{
        position: 'fixed',
        inset: 0,
        width: '100%',
        height: '100%',
        border: 'none',
        zIndex: 0,
      }}
      allow="autoplay"
      loading="eager"
    />
  );
}

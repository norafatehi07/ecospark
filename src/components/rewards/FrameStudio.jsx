// src/components/rewards/FrameStudio.jsx
// ═══════════════════════════════════════════════════════════════════════════════
// FRAME FITTING STUDIO — cursor-reactive WebGL stage for previewing avatar frames.
// Liquid metallic sheen shader + bioluminescent particles (three/r3f + drei),
// chromatic-aberration ghost layers, dynamic flare, parallax rig (framer-motion).
// ═══════════════════════════════════════════════════════════════════════════════
import { useRef, useState, useEffect, Suspense, useMemo } from 'react';
import { motion, AnimatePresence, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { Canvas, useFrame } from '@react-three/fiber';
import { Sparkles } from '@react-three/drei';
import * as THREE from 'three';
import { TIER_CONFIG } from '../../constants/rewards';
import styles from './FrameStudio.module.css';

// ─── WebGL: liquid metallic sheen reacting to the cursor ────────────────────
const SHEEN_VERT = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const SHEEN_FRAG = /* glsl */ `
  varying vec2 vUv;
  uniform float uTime;
  uniform vec2 uMouse;
  uniform vec3 uTint;

  float wave(vec2 p, float t) {
    return sin(p.x * 3.1 + t) * 0.5
         + sin(p.y * 4.3 - t * 1.3) * 0.5
         + sin((p.x + p.y) * 2.2 + t * 0.7) * 0.5;
  }

  void main() {
    vec2 p = vUv * 2.0 - 1.0;
    float t = uTime * 0.35;
    float n = wave(p * 1.6, t) + 0.5 * wave(p * 3.2 + 2.0, t * 1.6);
    float sheen = smoothstep(-0.2, 1.4, n);

    vec3 deep   = vec3(0.015, 0.05, 0.045);
    vec3 mossy  = vec3(0.05, 0.38, 0.30);
    vec3 cyan   = vec3(0.13, 0.62, 0.82);
    vec3 violet = vec3(0.34, 0.18, 0.72);

    vec3 col = mix(deep, mossy, sheen);
    col = mix(col, cyan, smoothstep(0.55, 1.0, sheen) * 0.6);
    col = mix(col, violet, smoothstep(0.8, 1.2, n) * 0.35);

    // Cursor flare with subtle chromatic split
    float dr = length(p - uMouse - vec2(0.015, 0.0));
    float dg = length(p - uMouse);
    float db = length(p - uMouse + vec2(0.015, 0.0));
    col.r += 0.10 / (dr + 0.14) * uTint.r * 0.4;
    col.g += 0.10 / (dg + 0.14) * uTint.g * 0.4;
    col.b += 0.10 / (db + 0.14) * uTint.b * 0.4;

    float vig = smoothstep(1.65, 0.25, length(p));
    gl_FragColor = vec4(col * vig, 1.0);
  }
`;

function LiquidSheen({ mouseRef, tint }) {
  const mat = useRef();
  const target = useMemo(() => new THREE.Vector2(0, 0), []);
  const tintVec = useMemo(() => new THREE.Color(tint), [tint]);

  useFrame((state) => {
    if (!mat.current) return;
    mat.current.uniforms.uTime.value = state.clock.elapsedTime;
    target.set(mouseRef.current.x, mouseRef.current.y);
    mat.current.uniforms.uMouse.value.lerp(target, 0.08);
    mat.current.uniforms.uTint.value.lerp(tintVec, 0.04);
  });

  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uMouse: { value: new THREE.Vector2(0, 0) },
    uTint: { value: new THREE.Color(tint) },
  }), []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <mesh scale={[16, 9, 1]}>
      <planeGeometry args={[1, 1]} />
      <shaderMaterial ref={mat} vertexShader={SHEEN_VERT} fragmentShader={SHEEN_FRAG} uniforms={uniforms} />
    </mesh>
  );
}

function StudioBackdrop({ mouseRef, tint }) {
  return (
    <Canvas
      className={styles.canvas}
      dpr={[1, 1.5]}
      camera={{ position: [0, 0, 5], fov: 45 }}
      gl={{ antialias: false, alpha: false, powerPreference: 'low-power' }}
    >
      <Suspense fallback={null}>
        <LiquidSheen mouseRef={mouseRef} tint={tint} />
        <Sparkles count={70} scale={[12, 7, 3]} size={2.6} speed={0.35} color="#6EE7B7" opacity={0.55} />
        <Sparkles count={30} scale={[10, 6, 2]} size={4} speed={0.18} color="#22D3EE" opacity={0.35} />
      </Suspense>
    </Canvas>
  );
}

// ─── The studio itself ───────────────────────────────────────────────────────
export default function FrameStudio({
  frames,               // frame rewards (with tier/pointCost/etc.)
  frameComponents,      // id -> component map
  avatarUrl,
  displayName,
  userPoints,
  equippedId,
  checkOwned,
  onEquip,
  onUnequip,
  onRedeem,
  reducedMotion = false,
}) {
  const stageRef = useRef(null);
  const mouseRef = useRef({ x: 0, y: 0 });
  const [previewId, setPreviewId] = useState(() => equippedId || frames[0]?.id || null);

  // Keep preview valid if frames list changes
  useEffect(() => {
    if (previewId && !frames.some((f) => f.id === previewId)) {
      setPreviewId(equippedId || frames[0]?.id || null);
    }
  }, [frames, previewId, equippedId]);

  const preview = frames.find((f) => f.id === previewId) || null;
  const cfg = preview ? (TIER_CONFIG[preview.tier] || TIER_CONFIG.bronze) : TIER_CONFIG.bronze;
  const FrameComp = preview ? frameComponents[preview.id] : null;
  const owned = preview ? checkOwned(preview) : false;
  const isEquipped = preview && equippedId === preview.id;
  const canAfford = preview ? userPoints >= preview.pointCost : false;

  // Cursor rig — normalized -1..1 across the stage
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const sx = useSpring(mx, { stiffness: 110, damping: 18, mass: 0.6 });
  const sy = useSpring(my, { stiffness: 110, damping: 18, mass: 0.6 });

  const rotateY = useTransform(sx, [-1, 1], [-11, 11]);
  const rotateX = useTransform(sy, [-1, 1], [9, -9]);
  const ghostX = useTransform(sx, [-1, 1], [-7, 7]);
  const ghostY = useTransform(sy, [-1, 1], [-5, 5]);
  const ghostXNeg = useTransform(sx, [-1, 1], [7, -7]);
  const ghostYNeg = useTransform(sy, [-1, 1], [5, -5]);
  const flareLeft = useTransform(sx, [-1, 1], ['8%', '92%']);
  const flareTop = useTransform(sy, [-1, 1], ['8%', '92%']);

  const handleMove = (e) => {
    const rect = stageRef.current?.getBoundingClientRect();
    if (!rect) return;
    const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const ny = ((e.clientY - rect.top) / rect.height) * 2 - 1;
    mx.set(nx);
    my.set(ny);
    mouseRef.current = { x: nx, y: -ny }; // GL space flips Y
  };

  const handleLeave = () => {
    mx.set(0);
    my.set(0);
    mouseRef.current = { x: 0, y: 0 };
  };

  const initial = (displayName || 'E').charAt(0).toUpperCase();

  return (
    <motion.section
      className={styles.studio}
      initial={{ opacity: 0, y: 28 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
    >
      {/* ── Stage ── */}
      <div
        ref={stageRef}
        className={styles.stage}
        onMouseMove={handleMove}
        onMouseLeave={handleLeave}
        style={{ '--tier-color': cfg.color }}
      >
        {!reducedMotion && <StudioBackdrop mouseRef={mouseRef} tint={cfg.color} />}
        <div className={styles.stageVignette} />

        {/* Dynamic cursor flare */}
        <motion.div className={styles.flare} style={{ left: flareLeft, top: flareTop, background: `radial-gradient(circle, ${cfg.color}55 0%, transparent 65%)` }} />

        {/* Parallax avatar rig */}
        <motion.div className={styles.rig} style={{ rotateX, rotateY, transformPerspective: 900 }}>
          {/* Chromatic aberration ghosts */}
          {FrameComp && !reducedMotion && (
            <>
              <motion.div className={styles.ghost} style={{ x: ghostX, y: ghostY, filter: 'hue-rotate(-45deg) blur(1px)' }} aria-hidden>
                <FrameComp />
              </motion.div>
              <motion.div className={styles.ghost} style={{ x: ghostXNeg, y: ghostYNeg, filter: 'hue-rotate(140deg) blur(1px)' }} aria-hidden>
                <FrameComp />
              </motion.div>
            </>
          )}

          {/* Avatar core */}
          <div className={styles.avatarCore} style={{ boxShadow: `0 0 60px ${cfg.color}44, inset 0 0 30px rgba(0,0,0,0.5)` }}>
            {avatarUrl ? (
              <img src={avatarUrl} alt={displayName || 'Avatar'} className={styles.avatarImg} referrerPolicy="no-referrer" />
            ) : (
              <span className={styles.avatarInitial}>{initial}</span>
            )}
          </div>

          {/* The frame itself */}
          <div className={styles.frameLayer}>
            <AnimatePresence mode="wait">
              <motion.div
                key={previewId || 'none'}
                className={styles.frameInner}
                initial={{ opacity: 0, scale: 0.82, rotate: -6 }}
                animate={{ opacity: 1, scale: 1, rotate: 0 }}
                exit={{ opacity: 0, scale: 1.12 }}
                transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
              >
                {FrameComp ? <FrameComp /> : null}
              </motion.div>
            </AnimatePresence>
          </div>
        </motion.div>

        {/* Lore plate */}
        <AnimatePresence mode="wait">
          {preview && (
            <motion.div
              key={preview.id}
              className={styles.lore}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.35 }}
            >
              <span className={styles.loreTier} style={{ color: cfg.color, textShadow: cfg.glow }}>
                {cfg.label} Tier
              </span>
              <h3 className={styles.loreName}>{preview.name}</h3>
              <p className={styles.loreDesc}>{preview.description}</p>

              {owned ? (
                isEquipped ? (
                  <button className={styles.studioBtnGhost} onClick={() => onUnequip('frame')}>Unequip</button>
                ) : (
                  <button
                    className={styles.studioBtn}
                    style={{ background: cfg.color, boxShadow: cfg.glow }}
                    onClick={() => onEquip('frame', preview.id)}
                  >
                    Equip Frame
                  </button>
                )
              ) : (
                <button
                  className={styles.studioBtn}
                  disabled={!canAfford}
                  style={canAfford ? { background: cfg.color, boxShadow: cfg.glow } : {}}
                  onClick={() => canAfford && onRedeem(preview)}
                >
                  {canAfford
                    ? `Redeem — ${preview.pointCost.toLocaleString()} pts`
                    : `🔒 ${preview.pointCost.toLocaleString()} pts`}
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Selector rail ── */}
      <div className={styles.rail}>
        <span className={styles.railTitle}>Fitting Studio</span>
        <div className={styles.railScroll}>
          {frames.map((f) => {
            const fCfg = TIER_CONFIG[f.tier] || TIER_CONFIG.bronze;
            const FC = frameComponents[f.id];
            const fOwned = checkOwned(f);
            const active = f.id === previewId;
            return (
              <motion.button
                key={f.id}
                className={`${styles.railItem} ${active ? styles.railActive : ''}`}
                onClick={() => setPreviewId(f.id)}
                whileHover={{ scale: 1.06 }}
                whileTap={{ scale: 0.95 }}
                style={{ '--tier-color': fCfg.color, borderColor: active ? fCfg.color : undefined, boxShadow: active ? fCfg.glow : undefined }}
                title={f.name}
              >
                <span className={styles.railThumb}>{FC ? <FC /> : f.icon}</span>
                {!fOwned && <span className={styles.railLock}>🔒</span>}
                {equippedId === f.id && <span className={styles.railEquipped}>✓</span>}
              </motion.button>
            );
          })}
        </div>
      </div>
    </motion.section>
  );
}

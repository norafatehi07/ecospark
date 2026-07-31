// src/components/hero/EcoHero3D.jsx
// Lazy-loaded WebGL hero using react-three-fiber
// Only rendered on capable devices (deviceMemory >= 4 OR hardwareConcurrency >= 4)

import { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Environment, Float, Stars, useTexture } from '@react-three/drei';
import { EffectComposer, Bloom, ChromaticAberration } from '@react-three/postprocessing';
import { BlendFunction } from 'postprocessing';
import * as THREE from 'three';

function EcoOrb() {
  const meshRef = useRef();
  const cloudsRef = useRef();
  const markerRef = useRef();

  // Load high-resolution realistic textures
  const textures = useTexture([
    'https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/earth_atmos_2048.jpg',
    'https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/earth_normal_2048.jpg',
    'https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/earth_specular_2048.jpg',
    'https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/earth_clouds_1024.png'
  ]);
  
  // Apply maximum anisotropic filtering to eliminate blurriness at grazing angles
  useMemo(() => {
    textures.forEach(t => {
      t.anisotropy = 16;
      t.minFilter = THREE.LinearMipmapLinearFilter;
      t.magFilter = THREE.LinearFilter;
    });
  }, [textures]);

  const [colorMap, normalMap, specularMap, cloudsMap] = textures;

  const earthGeometry = useMemo(() => new THREE.SphereGeometry(1.4, 64, 64), []);
  const cloudsGeometry = useMemo(() => new THREE.SphereGeometry(1.42, 64, 64), []);

  // India (Uttar Pradesh) Texture Coordinates
  // The user confirmed these coordinates place the pin exactly on India:
  const upPhi = 1.12; 
  const upTheta = -3.21;
  
  // To bring the pin exactly to the center of the camera (+Z), we need to:
  // 1. Rotate the globe around Y by 3.21 to center the longitude.
  // 2. Rotate the globe around X by 0.45 (which is Math.PI/2 - 1.12) to center the latitude.
  const targetQuat = useMemo(() => {
    const qY = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), -upTheta);
    const qX = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), (Math.PI / 2) - upPhi);
    // multiplyQuaternions(A, B) applies B then A. So Y rotation is applied first, then X.
    return new THREE.Quaternion().multiplyQuaternions(qX, qY);
  }, []);

  const cloudTargetQuat = useMemo(() => {
    const qY = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), -upTheta + 0.1);
    const qX = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), (Math.PI / 2) - upPhi);
    return new THREE.Quaternion().multiplyQuaternions(qX, qY);
  }, []);
  
  const targetCameraPos = useMemo(() => new THREE.Vector3(0, 0, 2.5), []);

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime;
    
    if (!meshRef.current) return;

    if (t < 2.5) {
      // Phase 1: Fast cinematic spinning
      meshRef.current.rotation.y = t * 1.5;
      if (cloudsRef.current) cloudsRef.current.rotation.y = t * 1.6;
      state.camera.position.z = 8 - (t * 0.5); // Start pulling in slightly
    } else {
      // Phase 2: Smooth swoop to India (Uttar Pradesh)
      // Directly slerp the mesh quaternion to avoid heavy memory allocation and freezing
      meshRef.current.quaternion.slerp(targetQuat, 2.0 * delta);
      
      if (cloudsRef.current) {
        cloudsRef.current.quaternion.slerp(cloudTargetQuat, 1.5 * delta);
      }

      // Lerp camera zoom
      state.camera.position.lerp(targetCameraPos, 2.5 * delta);
    }
  });

  return (
    <group scale={1.4}>
      <mesh ref={meshRef} geometry={earthGeometry} castShadow receiveShadow>
        <meshPhongMaterial
          map={colorMap}
          normalMap={normalMap}
          specularMap={specularMap}
          specular={new THREE.Color('grey')}
          shininess={15}
        />
        
        {/* Location Pin for UP / India */}
        <mesh position={new THREE.Vector3().setFromSphericalCoords(1.4, upPhi, upTheta)}>
          <sphereGeometry args={[0.03, 16, 16]} />
          <meshBasicMaterial color="#10b981" />
          <mesh position={[0, 0, 0]}>
            <sphereGeometry args={[0.06, 16, 16]} />
            <meshBasicMaterial color="#10b981" transparent opacity={0.4} blending={THREE.AdditiveBlending} />
          </mesh>
        </mesh>
      </mesh>
      
      <mesh ref={cloudsRef} geometry={cloudsGeometry}>
        <meshPhongMaterial
          map={cloudsMap}
          transparent={true}
          opacity={0.8}
          blending={THREE.AdditiveBlending}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}

export default function EcoHero3D() {
  return (
    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, overflow: 'hidden' }}>
      <Canvas
        style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', display: 'block' }}
        camera={{ position: [0, 0, 5], fov: 50 }}
        gl={{ antialias: true, alpha: true, preserveDrawingBuffer: true }}
        dpr={window.devicePixelRatio ? Math.min(window.devicePixelRatio, 2) : 1}
      >
        {/* Lighting */}
        <ambientLight intensity={0.4} />
        <pointLight position={[5, 5, 5]} intensity={1.5} color="#66BB6A" />
        <pointLight position={[-5, -3, -5]} intensity={0.8} color="#00897B" />
        <pointLight position={[0, 8, 0]} intensity={0.6} color="#ffffff" />

        {/* Stars background */}
        <Stars radius={80} depth={30} count={800} factor={2} saturation={0.3} fade speed={0.5} />

        {/* Main eco orb */}
        <EcoOrb />

        {/* Environment for PBR reflections */}
        <Environment preset="forest" />

        {/* Post-processing: bloom for glow effect */}
        <EffectComposer>
          <Bloom
            intensity={0.6}
            luminanceThreshold={0.3}
            luminanceSmoothing={0.9}
            blendFunction={BlendFunction.ADD}
          />
          <ChromaticAberration
            blendFunction={BlendFunction.NORMAL}
            offset={[0.0005, 0.0005]}
          />
        </EffectComposer>
      </Canvas>
    </div>
  );
}

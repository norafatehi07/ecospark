import React from 'react';
import { BronzeFrame, SilverFrame, GoldFrame, PlatinumFrame, GodFrame, GaiaFrame, SupernovaFrame, PrimeFrame } from './Frames';
import styles from './Avatar.module.css';

const FRAME_COMPONENTS = {
  'frame-bronze': BronzeFrame,
  'frame-silver': SilverFrame,
  'frame-gold': GoldFrame,
  'frame-platinum': PlatinumFrame,
  'frame-god': GodFrame,
  'frame-gaia': GaiaFrame,
  'frame-supernova': SupernovaFrame,
  'frame-prime': PrimeFrame,
};

export default function Avatar({ src, activeFrame, size = 48, alt = 'Avatar', className = '', style = {} }) {
  const FrameComponent = activeFrame ? FRAME_COMPONENTS[activeFrame] : null;

  return (
    <div 
      className={`${styles.avatarWrapper} ${className}`} 
      style={{ 
        width: size, 
        height: size, 
        ...style 
      }}
    >
      <img src={src || '/logo-8k.jpeg'} alt={alt} className={styles.avatarImg} />
      {FrameComponent && (
        <div className={styles.frameOverlay}>
          <FrameComponent />
        </div>
      )}
    </div>
  );
}

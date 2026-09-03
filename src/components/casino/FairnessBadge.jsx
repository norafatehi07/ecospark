// src/components/casino/FairnessBadge.jsx
// Small "Provably Fair" pill shown on every game. Opens FairnessModal, which
// is the actual seed display + verifier — kept separate so the badge can be
// dropped into any game's sidebar without pulling in the modal's state.
import { useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import FairnessModal from './FairnessModal';
import styles from './FairnessBadge.module.css';

export default function FairnessBadge() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" className={styles.badge} onClick={() => setOpen(true)}>
        <ShieldCheck size={14} /> Provably Fair
      </button>
      {open && <FairnessModal onClose={() => setOpen(false)} />}
    </>
  );
}

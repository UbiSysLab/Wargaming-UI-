import React from 'react';
import brandLogo from '../../assets/lANDWARGAMING.svg';
import styles from './TacticalMapView.module.css';

export function TacticalMapView() {
  return (
    <div className={styles.container}>
      {/* Brand logo header */}
      <div className={styles.brandHeader}>
        <img src={brandLogo} alt="Land Wargaming" className={styles.brandImg} />
      </div>

      {/* Main Map / Image Area (clean space left open as requested) */}
      <div className={styles.mapViewport} aria-label="Map viewport area" />
    </div>
  );
}

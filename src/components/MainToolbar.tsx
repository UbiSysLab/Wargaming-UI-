import React from 'react';
import IconButton from './IconButton';
import styles from './mainToolbar.module.css';

const loadPlan = new URL('../assets/Load-Plan.svg', import.meta.url).href;
const brand = new URL('../assets/LAND-WARGAMING.svg', import.meta.url).href;

export default function MainToolbar() {
  return (
    <div className={styles.container}>
      <div className={styles.brand} aria-hidden="false">
        <img src={brand} alt="Land Wargaming" className={styles.brandImg} />
      </div>

      <div className={styles.actions} role="toolbar" aria-label="Main actions">
        <IconButton icon={loadPlan} label="Load Plan" />
        <IconButton icon={loadPlan} label="Upload Plan Audio" />
        <IconButton icon={loadPlan} label="Upload Plan Document" />
        <IconButton icon={loadPlan} label="Record Audio" />
        <IconButton icon={loadPlan} label="Upload Plan Image" />
        <IconButton icon={loadPlan} label="Create Plan" />
      </div>
    </div>
  );
}

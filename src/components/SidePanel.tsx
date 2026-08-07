import React from 'react';
import { OpOrderPanel } from '../features/opOrder/OpOrderPanel';
import styles from './sidePanel.module.css';

export function SidePanel() {
  return (
    <section className={styles.panel} aria-label="Side panel">
      <div className={styles.content}>
        <OpOrderPanel />
      </div>
    </section>
  );
}

import React from 'react';
import { useWizard } from '../stores/WizardContext';
import { OpOrderPanel } from '../features/opOrder/OpOrderPanel';
import { OpeningNarrativePanel } from '../features/narrative/OpeningNarrativePanel';
import styles from './sidePanel.module.css';

export function SidePanel() {
  const { state } = useWizard();

  return (
    <section className={styles.panel} aria-label="Side panel">
      <div className={styles.content}>
        {state.currentStep === 'startPreparation' ? (
          <OpOrderPanel />
        ) : (
          <OpeningNarrativePanel />
        )}
      </div>
    </section>
  );
}

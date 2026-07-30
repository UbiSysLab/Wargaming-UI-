import React from 'react';
import { useWizard } from '../stores/WizardContext';
import { STEP_ORDER } from '../stores/wizard.constants';
import type { WizardStep } from '../types/wizard.types';
import styles from './stepBar.module.css';

export function StepBar() {
  const { state, dispatch } = useWizard();
  const currentStep: WizardStep = state.currentStep;

  return (
    <nav className={styles.stepBar} aria-label="Wizard steps" style={{ padding: '0.3rem 0.4rem' }}>
      {STEP_ORDER.map((step) => {
        const isActive = step.id === currentStep;
        return (
          <button
            key={step.id}
            type="button"
            className={`${styles.step} ${isActive ? styles.stepActive : ''}`}
            onClick={() => dispatch({ type: 'GO_TO_STEP', payload: step.id })}
            aria-current={isActive ? 'step' : undefined}
          >
            <span className={`${styles.oval} ${isActive ? styles.ovalActive : ''}`}>{step.order}</span>
            <span className={`${styles.label} ${isActive ? styles.labelActive : ''}`}>{step.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
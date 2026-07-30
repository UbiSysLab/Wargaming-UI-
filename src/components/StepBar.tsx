import React, { useState } from 'react';
import { STEP_ORDER } from '../stores/wizard.constants';
import type { WizardStep } from '../types/wizard.types';
import styles from './stepBar.module.css';

export function StepBar() {
  const [currentStep, setCurrentStep] = useState<WizardStep>('startPreparation');

  return (
    <nav className={styles.stepBar} aria-label="Wizard steps">
      {STEP_ORDER.map((step) => {
        const isActive = step.id === currentStep;
        return (
          <button
            key={step.id}
            type="button"
            className={`${styles.step} ${isActive ? styles.stepActive : ''}`}
            onClick={() => setCurrentStep(step.id)}
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
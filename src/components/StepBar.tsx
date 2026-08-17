import React from 'react';
import { useWizard } from '../stores/WizardContext';
import { STEP_ORDER } from '../stores/wizard.constants';
import type { WizardStep } from '../types/wizard.types';
import styles from './stepBar.module.css';

export function StepBar() {
  const { state, dispatch } = useWizard();
  const currentStep: WizardStep = state.currentStep;

  // Format step labels dynamically into two lines to match screenshots
  const renderLabel = (label: string) => {
    if (label.includes(' / ')) {
      const parts = label.split(' / ');
      return (
        <>
          {parts[0]} /
          <br />
          {parts[1]}
        </>
      );
    }
    if (label.includes(' & ')) {
      const parts = label.split(' & ');
      return (
        <>
          {parts[0]} &
          <br />
          {parts[1]}
        </>
      );
    }
    return label;
  };

  return (
    <nav className={styles.stepBar} aria-label="Wizard steps">
      {STEP_ORDER.map((step) => {
        const isActive = step.id === currentStep;
        return (
          <button
            key={step.id}
            type="button"
            className={styles.step}
            onClick={() => dispatch({ type: 'GO_TO_STEP', payload: step.id })}
            aria-current={isActive ? 'step' : undefined}
          >
            <span className={`${styles.circle} ${isActive ? styles.circleActive : ''}`}>
              {step.order}
            </span>
            <span className={`${styles.label} ${isActive ? styles.labelActive : ''}`}>
              {renderLabel(step.label)}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
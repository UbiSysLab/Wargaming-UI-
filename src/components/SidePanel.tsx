import React from 'react';
import { useWizard } from '../stores/WizardContext';
import { OpOrderPanel } from '../features/opOrder/OpOrderPanel';
import { OpeningNarrativePanel } from '../features/narrative/OpeningNarrativePanel';
import styles from './sidePanel.module.css';

interface SidePanelProps {
  onOpenEditor?: () => void;
  onGenerateGraphics?: () => void;
  isGenerating?: boolean;
}

export function SidePanel({ onOpenEditor, onGenerateGraphics, isGenerating = false }: SidePanelProps = {}) {
  const { state } = useWizard();

  return (
    <section className={styles.panel} aria-label="Side panel">
      <div className={styles.content}>
        {state.currentStep === 'startPreparation' ? (
          <OpOrderPanel 
            onOpenEditor={onOpenEditor} 
            onGenerateGraphics={onGenerateGraphics}
            isGenerating={isGenerating}
          />
        ) : (
          <OpeningNarrativePanel />
        )}
      </div>
    </section>
  );
}

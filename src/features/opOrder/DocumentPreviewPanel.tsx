import React from 'react';
import { useWizard } from '../../stores/WizardContext';
import styles from './DocumentPreviewPanel.module.css';

interface DocumentPreviewPanelProps {
  onClose?: () => void;
  onGenerateGraphics?: () => void;
  onOpenEditor?: () => void;
  isGenerating?: boolean;
}

export function DocumentPreviewPanel({ 
  onClose, 
  onGenerateGraphics, 
  onOpenEditor,
  isGenerating = false,
}: DocumentPreviewPanelProps) {
  const { state } = useWizard();
  const opOrder = state.data.startPreparation;

  return (
    <div className={styles.container}>
      {/* Centered Document Paper Sheet */}
      <div className={styles.paperSheet}>
        {onClose && (
          <button 
            type="button" 
            className={styles.closeBtn} 
            onClick={onClose}
            aria-label="Close document preview"
          >
            ✕
          </button>
        )}

        <div className={styles.documentBody}>
          {opOrder.reportNumber && (
            <div className={styles.docRow}>
              <span className={styles.docLabel}>REPORT NUMBER:</span>
              <span className={styles.docValue}>{opOrder.reportNumber}</span>
            </div>
          )}

          {opOrder.classification && (
            <div className={styles.docRow}>
              <span className={styles.docLabel}>CLASSIFICATION:</span>
              <span className={styles.docValue}>{opOrder.classification}</span>
            </div>
          )}

          {opOrder.dtg && (
            <div className={styles.docRow}>
              <span className={styles.docLabel}>DTG:</span>
              <span className={styles.docValue}>{opOrder.dtg}</span>
            </div>
          )}

          {opOrder.references && (
            <div className={styles.docRow}>
              <span className={styles.docLabel}>REFERENCES:</span>
              <span className={styles.docValue}>{opOrder.references}</span>
            </div>
          )}

          {opOrder.from && (
            <div className={styles.docRow}>
              <span className={styles.docLabel}>FROM:</span>
              <span className={styles.docValue}>{opOrder.from}</span>
            </div>
          )}

          {opOrder.to && (
            <div className={styles.docRow}>
              <span className={styles.docLabel}>TO:</span>
              <span className={styles.docValue}>{opOrder.to}</span>
            </div>
          )}

          {opOrder.enemy && (
            <div className={styles.docSection}>
              <div className={styles.docSectionHeading}>ENEMY:</div>
              <div className={styles.docParagraph}>{opOrder.enemy}</div>
            </div>
          )}

          {opOrder.own && (
            <div className={styles.docSection}>
              <div className={styles.docSectionHeading}>OWN:</div>
              <div className={styles.docParagraph}>{opOrder.own}</div>
            </div>
          )}

          {opOrder.mission && (
            <div className={styles.docSection}>
              <div className={styles.docSectionHeading}>MISSION:</div>
              <div className={styles.docParagraph}>{opOrder.mission}</div>
            </div>
          )}

          {opOrder.execution && (
            <div className={styles.docSection}>
              <div className={styles.docSectionHeading}>EXECUTION:</div>
              <div className={styles.docParagraphExecution}>
                {opOrder.execution.split('\n\n').map((para, idx) => (
                  <p key={idx} className={styles.executionPara}>{para}</p>
                ))}
              </div>
            </div>
          )}

          {opOrder.adminLogistics && (
            <div className={styles.docSection}>
              <div className={styles.docSectionHeading}>ADMINISTRATION &amp; LOGISTICS:</div>
              <div className={styles.docParagraph}>{opOrder.adminLogistics}</div>
            </div>
          )}

          {opOrder.commandSignal && (
            <div className={styles.docSection}>
              <div className={styles.docSectionHeading}>COMMAND &amp; SIGNAL:</div>
              <div className={styles.docParagraph}>{opOrder.commandSignal}</div>
            </div>
          )}
        </div>
      </div>

      {/* Action Buttons Row under Document Paper Sheet */}
      <div className={styles.actionsRow}>
        <button 
          type="button" 
          className={styles.actionBtn}
          onClick={onGenerateGraphics}
          disabled={isGenerating}
          style={isGenerating ? { opacity: 0.7, cursor: 'wait' } : undefined}
        >
          {isGenerating ? 'Generating Graphics & Task Sync...' : 'Generate Graphics'}
        </button>

        <button 
          type="button" 
          className={styles.actionBtn}
          onClick={onOpenEditor}
        >
          <span>Open Editor</span>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="7" y1="17" x2="17" y2="7" />
            <polyline points="7 7 17 7 17 17" />
          </svg>
        </button>
      </div>
    </div>
  );
}

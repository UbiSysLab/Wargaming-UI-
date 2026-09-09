import React, { useRef, useState } from 'react';
import { useWizard } from '../../stores/WizardContext';
import { OpOrderData } from './opOrder.types';
import { DictationTarget } from '../../types/wizard.types';
import { transcribeAudio } from '../recordAudio/transcribeApi';
import styles from './OpOrderPanel.module.css';

interface FieldDefinition {
  key: keyof OpOrderData;
  label: string;
  placeholder?: string;
  type: 'input' | 'textarea';
  isDictateable?: boolean;
  height?: string;
}

const OPORD_FIELDS: FieldDefinition[] = [
  { key: 'reportNumber', label: 'REPORT NUMBER:', type: 'input', isDictateable: true },
  { key: 'classification', label: 'CLASSIFICATION:', type: 'input', isDictateable: true },
  { key: 'dtg', label: 'DTG:', placeholder: 'Date & Time', type: 'input', isDictateable: true },
  { key: 'references', label: 'REFERENCES:', placeholder: 'Reference', type: 'input', isDictateable: true },
  { key: 'from', label: 'From:', placeholder: '-', type: 'input', isDictateable: true },
  { key: 'to', label: 'To:', placeholder: '-', type: 'input', isDictateable: true },
  { key: 'enemy', label: 'Enemy:', type: 'textarea', isDictateable: true, height: '56px' },
  { key: 'own', label: 'Own:', type: 'textarea', isDictateable: true, height: '80px' },
  { key: 'mission', label: 'MISSION:', type: 'textarea', isDictateable: true, height: '75px' },
  { key: 'execution', label: 'EXECUTION:', type: 'textarea', isDictateable: true, height: '110px' },
  { key: 'adminLogistics', label: 'ADMINISTRATION & LOGISTICS:', type: 'textarea', isDictateable: true, height: '75px' },
  { key: 'commandSignal', label: 'COMMAND & SIGNAL:', type: 'textarea', isDictateable: true, height: '75px' },
];

interface OpOrderPanelProps {
  onOpenEditor?: () => void;
  onGenerateGraphics?: () => void;
  isGenerating?: boolean;
}

export function OpOrderPanel({ onOpenEditor, onGenerateGraphics, isGenerating = false }: OpOrderPanelProps = {}) {
  const { state, dispatch } = useWizard();
  const opOrder = state.data.startPreparation;
  const [transcribingField, setTranscribingField] = useState<keyof OpOrderData | null>(null);
  const [boxError, setBoxError] = useState<{ field: keyof OpOrderData; message: string } | null>(null);

  const handleChange = (field: keyof OpOrderData, value: string) => {
    dispatch({
      type: 'UPDATE_STEP_DATA',
      payload: { step: 'startPreparation', data: { [field]: value } },
    });
  };

  const handleFieldSelect = (fieldKey: keyof OpOrderData) => {
    dispatch({
      type: 'SET_DICTATION_TARGET',
      payload: fieldKey as DictationTarget,
    });
  };

  const handleBoxAudioUpload = async (file: File, targetField: keyof OpOrderData) => {
    if (!file) return;
    setTranscribingField(targetField);
    setBoxError(null);

    try {
      const result = await transcribeAudio(file);
      const text = result.text.trim();
      dispatch({
        type: 'UPDATE_STEP_DATA',
        payload: { step: 'startPreparation', data: { [targetField]: text } },
      });
    } catch (err) {
      setBoxError({
        field: targetField,
        message: err instanceof Error ? err.message : 'Transcription failed',
      });
    } finally {
      setTranscribingField(null);
    }
  };

  const handleDropOnBox = (e: React.DragEvent, fieldKey: keyof OpOrderData) => {
    e.preventDefault();
    handleFieldSelect(fieldKey);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.type.startsWith('audio/') || /\.(wav|mp3|m4a|ogg|aac|flac|webm)$/i.test(file.name)) {
        handleBoxAudioUpload(file, fieldKey);
      }
    }
  };

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <h2 className={styles.title}>Op ORDER (OPORD)</h2>
        <span className={styles.subtitleHint}>Click any box to dictate or upload audio</span>
      </div>

      {/* Grid container with downward scrollability */}
      <div className={styles.grid}>
        {OPORD_FIELDS.map((field) => {
          const isSelected = state.dictationTarget === field.key;
          const isDictateable = field.isDictateable;
          const isTranscribing = transcribingField === field.key;
          const showDividerBefore = field.key === 'enemy';

          return (
            <React.Fragment key={field.key}>
              {showDividerBefore && <div className={styles.divider} />}
              
              <div 
                className={`${styles.row} ${isDictateable && field.type === 'textarea' ? styles.dictateableRow : ''} ${isSelected ? styles.selectedBoxRow : ''}`}
                onClick={() => handleFieldSelect(field.key)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => handleDropOnBox(e, field.key)}
              >
                <div className={styles.leftContainer}>
                  <label 
                    htmlFor={`opord-${field.key}`}
                    className={`${styles.left} ${isSelected ? styles.activeLabel : ''}`}
                  >
                    {field.label}
                  </label>
                </div>

                <div className={isDictateable && field.type === 'textarea' ? styles.rightArea : styles.right}>
                  <div className={styles.inputWrapper}>
                    {field.type === 'textarea' ? (
                      <textarea
                        id={`opord-${field.key}`}
                        className={`${styles.textarea} ${isSelected ? styles.dictationActive : ''}`}
                        style={field.height ? { height: field.height, minHeight: field.height } : undefined}
                        value={opOrder[field.key] || ''}
                        onChange={(e) => handleChange(field.key, e.target.value)}
                        onFocus={() => handleFieldSelect(field.key)}
                        placeholder={isTranscribing ? 'Transcribing audio...' : (field.placeholder || '')}
                        disabled={isTranscribing}
                      />
                    ) : (
                      <input
                        id={`opord-${field.key}`}
                        type="text"
                        className={`${styles.input} ${isSelected ? styles.dictationActive : ''}`}
                        value={opOrder[field.key] || ''}
                        onChange={(e) => handleChange(field.key, e.target.value)}
                        onFocus={() => handleFieldSelect(field.key)}
                        placeholder={isTranscribing ? 'Transcribing audio...' : (field.placeholder || '')}
                        disabled={isTranscribing}
                      />
                    )}

                    {isTranscribing && (
                      <div className={styles.boxLoadingOverlay}>
                        <div className={styles.inlineSpinner} />
                        <span>Transcribing audio...</span>
                      </div>
                    )}
                  </div>

                  {boxError && boxError.field === field.key && (
                    <span className={styles.fieldError}>{boxError.message}</span>
                  )}
                </div>
              </div>
            </React.Fragment>
          );
        })}
      </div>

      {/* Bottom Action Buttons Row */}
      <div className={styles.bottomActions}>
        <button 
          type="button" 
          className={styles.bottomBtn} 
          onClick={onGenerateGraphics}
          disabled={isGenerating}
          style={isGenerating ? { opacity: 0.7, cursor: 'wait' } : undefined}
        >
          {isGenerating ? 'Generating...' : 'Generate Graphics'}
        </button>
        <button type="button" className={styles.bottomBtn} onClick={onOpenEditor}>
          <span>Open Editor</span>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="7" y1="17" x2="17" y2="7" />
            <polyline points="7 7 17 7 17 17" />
          </svg>
        </button>
      </div>
    </div>
  );
}
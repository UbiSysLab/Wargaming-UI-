import React from 'react';
import { useWizard } from '../../stores/WizardContext';
import { OpOrderData } from './opOrder.types';
import { DictationTarget } from '../../types/wizard.types';
import styles from './OpOrderPanel.module.css';

interface FieldDefinition {
  key: keyof OpOrderData;
  label: string;
  type: 'input' | 'textarea';
  isDictateable?: boolean;
  height?: string;
}

const METADATA_FIELDS: FieldDefinition[] = [
  { key: 'reportNumber', label: 'REPORT NUMBER:', type: 'input' },
  { key: 'classification', label: 'CLASSIFICATION:', type: 'input' },
  { key: 'dtg', label: 'DTG:', type: 'input' },
  { key: 'references', label: 'REFERENCES:', type: 'input' },
  { key: 'from', label: 'FROM:', type: 'input' },
  { key: 'to', label: 'TO:', type: 'input' },
];

const DICTATEABLE_FIELDS: FieldDefinition[] = [
  { key: 'mission', label: 'MISSION:', type: 'textarea', isDictateable: true, height: '68px' },
  { key: 'situation', label: 'SITUATION:', type: 'textarea', isDictateable: true, height: '100px' },
  { key: 'execution', label: 'EXECUTION:', type: 'textarea', isDictateable: true, height: '140px' },
];

export function OpOrderPanel() {
  const { state, dispatch } = useWizard();
  const opOrder = state.data.startPreparation;

  const handleChange = (field: keyof OpOrderData, value: string) => {
    dispatch({
      type: 'UPDATE_STEP_DATA',
      payload: { step: 'startPreparation', data: { [field]: value } },
    });
  };

  const handleFieldSelect = (fieldKey: keyof OpOrderData, isDictateable?: boolean) => {
    if (isDictateable) {
      dispatch({
        type: 'SET_DICTATION_TARGET',
        payload: fieldKey as DictationTarget,
      });
    }
  };

  return (
    <div className={styles.panel}>
      <h2 className={styles.title}>Op ORDER (OPORD)</h2>

      {/* Fixed metadata area at the top */}
      <div className={styles.metadataGrid}>
        {METADATA_FIELDS.map((field) => {
          const isSelected = state.dictationTarget === field.key;
          const isDictateable = field.isDictateable;

          return (
            <div key={field.key} className={styles.row}>
              <div className={styles.leftContainer}>
                <label 
                  htmlFor={`opord-${field.key}`}
                  className={`${styles.left} ${isSelected ? styles.activeLabel : ''}`}
                >
                  {field.label}
                </label>
              </div>

              <div className={styles.right}>
                <input
                  id={`opord-${field.key}`}
                  type="text"
                  className={`${styles.input} ${isSelected ? styles.dictationActive : ''}`}
                  value={opOrder[field.key] || ''}
                  onChange={(e) => handleChange(field.key, e.target.value)}
                  onFocus={() => handleFieldSelect(field.key, isDictateable)}
                  placeholder=""
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Separation divider line starting the dictation section */}
      <div className={styles.divider} />

      {/* Scrollable dictation area at the bottom */}
      <div className={styles.scrollableDictation}>
        {DICTATEABLE_FIELDS.map((field) => {
          const isSelected = state.dictationTarget === field.key;
          const isDictateable = field.isDictateable;

          return (
            <div 
              key={field.key} 
              className={`${styles.row} ${styles.dictateableRow}`}
              style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}
            >
              <div className={styles.leftContainer}>
                <label 
                  htmlFor={`opord-${field.key}`}
                  className={`${styles.left} ${isSelected ? styles.activeLabel : ''}`}
                >
                  {field.label}
                </label>
              </div>

              <div className={styles.rightArea}>
                <textarea
                  id={`opord-${field.key}`}
                  className={`${styles.textarea} ${isSelected ? styles.dictationActive : ''}`}
                  style={field.height ? { height: field.height, minHeight: field.height } : undefined}
                  value={opOrder[field.key] || ''}
                  disabled={state.isTranscribing && isSelected}
                  onChange={(e) => handleChange(field.key, e.target.value)}
                  onFocus={() => handleFieldSelect(field.key, isDictateable)}
                  placeholder={state.isTranscribing && isSelected ? "Transcribing audio... Please wait." : ""}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
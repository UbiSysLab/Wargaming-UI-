import React from 'react';
import { useWizard } from '../../stores/WizardContext';
import { OpOrderData } from './opOrder.types';
import { DictationTarget } from '../../types/wizard.types';
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
  { key: 'reportNumber', label: 'REPORT NUMBER:', type: 'input' },
  { key: 'classification', label: 'CLASSIFICATION:', type: 'input' },
  { key: 'dtg', label: 'DTG:', placeholder: 'Date & Time', type: 'input' },
  { key: 'references', label: 'REFERENCES:', placeholder: 'Reference', type: 'input' },
  { key: 'from', label: 'FROM:', type: 'input' },
  { key: 'to', label: 'TO:', type: 'input' },
  { key: 'mission', label: 'MISSION:', type: 'textarea', isDictateable: true, height: '48px' },
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

      {/* Grid container with downward scrollability (overflow-y: auto) */}
      <div className={styles.grid}>
        {OPORD_FIELDS.map((field) => {
          const isSelected = state.dictationTarget === field.key;
          const isDictateable = field.isDictateable;
          const showDividerBefore = field.key === 'mission';

          return (
            <React.Fragment key={field.key}>
              {showDividerBefore && <div className={styles.divider} />}
              
              <div 
                className={`${styles.row} ${isDictateable ? styles.dictateableRow : ''}`}
                style={field.type === 'textarea' ? { display: 'flex', flexDirection: 'column', gap: '0.25rem' } : undefined}
              >
                <div className={styles.leftContainer}>
                  <label 
                    htmlFor={`opord-${field.key}`}
                    className={`${styles.left} ${isSelected ? styles.activeLabel : ''}`}
                  >
                    {field.label}
                  </label>
                  {isDictateable && (
                    <span 
                      onClick={() => dispatch({ 
                        type: 'SET_DICTATION_TARGET', 
                        payload: isSelected ? 'none' : field.key as DictationTarget 
                      })}
                      className={`${styles.micIndicator} ${isSelected ? styles.micActive : ''}`}
                      title={isSelected ? "Dictation active on this field. Click to disable." : "Click to dictate this field"}
                    >
                      🎙️
                    </span>
                  )}
                </div>

                <div className={field.type === 'textarea' ? styles.rightArea : styles.right}>
                  {field.type === 'textarea' ? (
                    <textarea
                      id={`opord-${field.key}`}
                      className={`${styles.textarea} ${isSelected ? styles.dictationActive : ''}`}
                      style={field.height ? { height: field.height, minHeight: field.height } : undefined}
                      value={opOrder[field.key]}
                      onChange={(e) => handleChange(field.key, e.target.value)}
                      onFocus={() => handleFieldSelect(field.key, isDictateable)}
                      placeholder={field.placeholder || ''}
                    />
                  ) : (
                    <input
                      id={`opord-${field.key}`}
                      type="text"
                      className={`${styles.input} ${isSelected ? styles.dictationActive : ''}`}
                      value={opOrder[field.key]}
                      onChange={(e) => handleChange(field.key, e.target.value)}
                      onFocus={() => handleFieldSelect(field.key, isDictateable)}
                      placeholder={field.placeholder || ''}
                    />
                  )}
                </div>
              </div>
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}
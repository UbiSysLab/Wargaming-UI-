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
  { key: 'from', label: 'From:', placeholder: '-', type: 'input' },
  { key: 'to', label: 'To:', placeholder: '-', type: 'input' },
  { key: 'enemy', label: 'Enemy:', type: 'textarea', isDictateable: true, height: '56px' },
  { key: 'own', label: 'Own:', type: 'textarea', isDictateable: true, height: '80px' },
  { key: 'mission', label: 'MISSION:', type: 'textarea', isDictateable: true, height: '75px' },
  { key: 'execution', label: 'EXECUTION:', type: 'textarea', isDictateable: true, height: '110px' },
  { key: 'adminLogistics', label: 'ADMINISTRATION & LOGISTICS:', type: 'textarea', isDictateable: true, height: '75px' },
  { key: 'commandSignal', label: 'COMMAND & SIGNAL:', type: 'textarea', isDictateable: true, height: '75px' },
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

      {/* Grid container with downward scrollability */}
      <div className={styles.grid}>
        {OPORD_FIELDS.map((field) => {
          const isSelected = state.dictationTarget === field.key;
          const isDictateable = field.isDictateable;
          const showDividerBefore = field.key === 'enemy';

          return (
            <React.Fragment key={field.key}>
              {showDividerBefore && <div className={styles.divider} />}
              
              <div className={`${styles.row} ${isDictateable ? styles.dictateableRow : ''}`}>
                <div className={styles.leftContainer}>
                  <label 
                    htmlFor={`opord-${field.key}`}
                    className={`${styles.left} ${isSelected ? styles.activeLabel : ''}`}
                  >
                    {field.label}
                  </label>
                </div>

                <div className={isDictateable ? styles.rightArea : styles.right}>
                  {field.type === 'textarea' ? (
                    <textarea
                      id={`opord-${field.key}`}
                      className={`${styles.textarea} ${isSelected ? styles.dictationActive : ''}`}
                      style={field.height ? { height: field.height, minHeight: field.height } : undefined}
                      value={opOrder[field.key] || ''}
                      onChange={(e) => handleChange(field.key, e.target.value)}
                      onFocus={() => handleFieldSelect(field.key, isDictateable)}
                      placeholder={field.placeholder || ''}
                    />
                  ) : (
                    <input
                      id={`opord-${field.key}`}
                      type="text"
                      className={`${styles.input} ${isSelected ? styles.dictationActive : ''}`}
                      value={opOrder[field.key] || ''}
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
import React from 'react';
import { useWizard } from '../../stores/WizardContext';
import { OpOrderData } from './opOrder.types';
import styles from './OpOrderPanel.module.css';

export function OpOrderPanel() {
  const { state, dispatch } = useWizard();
  const opOrder = state.data.startPreparation;

  const handleChange = (field: keyof OpOrderData, value: string) => {
    dispatch({ type: 'UPDATE_STEP_DATA', payload: { step: 'startPreparation', data: { [field]: value } } });
  };

  return (
    <div className={styles.panel}>
      <h2 className={styles.title}>Op ORDER (OPORD)</h2>

      <div className={styles.grid}>
        <div className={styles.row}>
          <span className={styles.left}>REPORT NUMBER:</span>
          <div className={styles.right}>
            <input className={styles.input} value={opOrder.reportNumber} onChange={(e) => handleChange('reportNumber', e.target.value)} />
          </div>
        </div>

        <div className={styles.row}>
          <span className={styles.left}>CLASSIFICATION:</span>
          <div className={styles.right}>
            <input className={styles.input} value={opOrder.classification} onChange={(e) => handleChange('classification', e.target.value)} />
          </div>
        </div>

        <div className={styles.row}>
          <span className={styles.left}>DTG:</span>
          <div className={styles.right}>
            <input className={styles.input} placeholder="Date & Time" value={opOrder.dtg} onChange={(e) => handleChange('dtg', e.target.value)} />
          </div>
        </div>

        <div className={styles.row}>
          <span className={styles.left}>REFERENCES:</span>
          <div className={styles.right}>
            <input className={styles.input} placeholder="Reference" value={opOrder.references} onChange={(e) => handleChange('references', e.target.value)} />
          </div>
        </div>

        <div className={styles.row}>
          <span className={styles.left}>FROM:</span>
          <div className={styles.right}>
            <input className={styles.input} value={opOrder.from} onChange={(e) => handleChange('from', e.target.value)} />
          </div>
        </div>

        <div className={styles.row}>
          <span className={styles.left}>TO:</span>
          <div className={styles.right}>
            <input className={styles.input} value={opOrder.to} onChange={(e) => handleChange('to', e.target.value)} />
          </div>
        </div>

        <div className={styles.divider} />

        <div className={styles.row}>
          <span className={styles.left}>MISSION:</span>
          <div className={styles.rightArea}>
            <textarea className={styles.textarea} value={opOrder.mission} onChange={(e) => handleChange('mission', e.target.value)} />
          </div>
        </div>

        <div className={styles.row}>
          <span className={styles.left}>EXECUTION:</span>
          <div className={styles.rightArea}>
            <textarea className={`${styles.textarea} ${styles.textareaLarge}`} value={opOrder.execution} onChange={(e) => handleChange('execution', e.target.value)} />
          </div>
        </div>
      </div>

      <div className={styles.divider} />
    </div>
  );
}
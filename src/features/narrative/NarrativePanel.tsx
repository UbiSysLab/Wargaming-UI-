import React from 'react';
import { useWizard } from '../../stores/WizardContext';
import type { NarrativeData } from './narrative.types';

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '0.9rem 1rem',
  borderRadius: '0.85rem',
  border: '1px solid #e5e7eb',
  background: '#f8fafc',
  color: '#111827',
  fontSize: '0.95rem',
  minHeight: '170px',
};

export function NarrativePanel({ step }: { step: 'openingNarrative' | 'warningOrder' }) {
  const { state, dispatch } = useWizard();
  const narrativeData = state.data[step] as NarrativeData;
  const title = step === 'openingNarrative' ? 'Opening Narrative' : 'Warning Order';

  const handleChange = (value: string) => {
    dispatch({
      type: 'UPDATE_STEP_DATA',
      payload: { step, data: { narrativeText: value } },
    });
  };

  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: '1rem', minHeight: 0 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.75rem' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#111827' }}>{title}</h3>
          <p style={{ margin: '0.45rem 0 0', color: '#475569', fontSize: '0.9rem' }}>
            Capture the key concept for this stage.
          </p>
        </div>
      </div>
      <textarea
        style={inputStyle}
        value={narrativeData.narrativeText}
        onChange={(event) => handleChange(event.target.value)}
        placeholder="Write the narrative here..."
      />
    </section>
  );
}

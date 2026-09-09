import React from 'react';
import { useWizard } from '../../stores/WizardContext';
import type { LoginData } from './login.types';

const fieldStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '0.35rem',
  marginBottom: '1rem',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '0.7rem 0.85rem',
  borderRadius: '0.75rem',
  border: '1px solid #e5e7eb',
  background: '#f8fafc',
  color: '#111827',
  fontSize: '0.95rem',
};

export function LoginPanel() {
  const [username, setUsername] = React.useState('');

  const handleChange = (value: string) => {
    setUsername(value);
  };

  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: '1rem', minHeight: 0 }}>
      <div style={fieldStyle}>
        <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#374151' }} htmlFor="login-username">
          Username
        </label>
        <input
          id="login-username"
          style={inputStyle}
          value={username}
          onChange={(event) => handleChange(event.target.value)}
          placeholder="Enter username"
        />
      </div>
      <div style={{ padding: '1rem', borderRadius: '1rem', background: '#eef2ff', color: '#1e3a8a' }}>
        <strong>Tip:</strong> This screen is the login step.
      </div>
    </section>
  );
}

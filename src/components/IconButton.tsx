import React from 'react';
import styles from './iconButton.module.css';

type IconButtonProps = {
  icon: string;
  label?: React.ReactNode;
  onClick?: () => void;
  size?: string;
  'aria-label'?: string;
  active?: boolean;
};

export function IconButton({ icon, label, onClick, size, active, ...rest }: IconButtonProps) {
  return (
    <button 
      className={`${styles.iconButton} ${active ? styles.active : ''}`} 
      onClick={onClick} 
      type="button" 
      {...rest}
    >
      <img src={icon} alt={typeof label === 'string' ? label : ''} className={styles.icon} style={size ? { width: size, height: size } : undefined} />
      {label && <span className={styles.label}>{label}</span>}
    </button>
  );
}

export default IconButton;


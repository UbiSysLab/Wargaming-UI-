import React from 'react';
import styles from './iconButton.module.css';

type IconButtonProps = {
  icon: string;
  label?: string;
  onClick?: () => void;
  size?: string;
  'aria-label'?: string;
};

export function IconButton({ icon, label, onClick, size, ...rest }: IconButtonProps) {
  return (
    <button className={styles.iconButton} onClick={onClick} type="button" {...rest}>
      <img src={icon} alt={label ?? ''} className={styles.icon} style={size ? { width: size, height: size } : undefined} />
      {label && <span className={styles.label}>{label}</span>}
    </button>
  );
}

export default IconButton;

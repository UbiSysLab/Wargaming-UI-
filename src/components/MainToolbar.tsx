import React from 'react';
import IconButton from './IconButton';
import styles from './mainToolbar.module.css';

const loadPlan = new URL('../assets/loadPlan.svg', import.meta.url).href;
const uploadPlanAudio = new URL('../assets/uploadPlanAudio.svg', import.meta.url).href;
const uploadPlanDocument = new URL('../assets/uploadPlanDocument.svg', import.meta.url).href;
const recordAudio = new URL('../assets/recordAudio.svg', import.meta.url).href;
const uploadPlanImage = new URL('../assets/uploadPlanImage.svg', import.meta.url).href;
const createPlan = new URL('../assets/createPlan.svg', import.meta.url).href;
const landWargaming = new URL('../assets/landwargaming.svg', import.meta.url).href;

type MainToolbarProps = {
  onRecordAudioClick?: () => void;
};

export default function MainToolbar({ onRecordAudioClick }: MainToolbarProps) {
  return (
    <div className={styles.container}>
      <div className={styles.brand} aria-hidden="false">
        <img src={landWargaming} alt="Land Wargaming" className={styles.brandImg} />
      </div>

      <div className={styles.actions} role="toolbar" aria-label="Main actions">
        <IconButton icon={loadPlan} label="Load Plan" />
        <IconButton icon={uploadPlanAudio} label="Upload Plan Audio" />
        <IconButton icon={uploadPlanDocument} label="Upload Plan Document" />
        <IconButton icon={recordAudio} label="Record Audio" onClick={onRecordAudioClick} />
        <IconButton icon={uploadPlanImage} label="Upload Plan Image" />
        <IconButton icon={createPlan} label="Create Plan" />
      </div>
    </div>
  );
}

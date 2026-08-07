import React from 'react';
import { IconButton } from './IconButton';
import styles from './mainToolbar.module.css';
import brandLogo from '../assets/lANDWARGAMING.svg';
import loadPlan from '../assets/loadPlan.svg';
import uploadPlanAudio from '../assets/uploadPlanAudio.svg';
import uploadPlanDocument from '../assets/uploadPlanDocument.svg';
import recordAudio from '../assets/recordAudio.svg';
import uploadPlanImage from '../assets/uploadPlanImage.svg';
import createPlan from '../assets/createPlan.svg';

interface MainToolbarProps {
  activeButton: 'record' | 'upload_audio' | 'upload_document' | 'upload_image' | 'load_plan' | 'none';
  onRecordAudioClick: () => void;
  onUploadAudioClick: () => void;
  onUploadDocumentClick: () => void;
  onUploadImageClick: () => void;
  onLoadPlanClick: () => void;
  onCreatePlanClick: () => void;
}

export default function MainToolbar({ 
  activeButton,
  onRecordAudioClick, 
  onUploadAudioClick,
  onUploadDocumentClick,
  onUploadImageClick,
  onLoadPlanClick,
  onCreatePlanClick
}: MainToolbarProps) {
  return (
    <div className={styles.container}>
      <div className={styles.brand}>
        <img src={brandLogo} alt="Land Wargaming Logo" className={styles.brandImg} />
      </div>

      <div className={styles.actions} role="toolbar" aria-label="Main actions">
        <IconButton 
          icon={loadPlan} 
          label={<>Load<br />Plan</>} 
          active={activeButton === 'load_plan'}
          onClick={onLoadPlanClick}
        />
        <IconButton 
          icon={uploadPlanAudio} 
          label={<>Upload<br />Plan Audio</>} 
          active={activeButton === 'upload_audio'} 
          onClick={onUploadAudioClick} 
        />
        <IconButton 
          icon={uploadPlanDocument} 
          label={<>Upload<br />Plan Document</>} 
          active={activeButton === 'upload_document'}
          onClick={onUploadDocumentClick}
        />
        <IconButton 
          icon={recordAudio} 
          label={<>Record<br />Audio</>} 
          active={activeButton === 'record'} 
          onClick={onRecordAudioClick} 
        />
        <IconButton 
          icon={uploadPlanImage} 
          label={<>Upload<br />Plan Image</>} 
          active={activeButton === 'upload_image'}
          onClick={onUploadImageClick}
        />
        <IconButton 
          icon={createPlan} 
          label={<>Create<br />Plan</>} 
          onClick={onCreatePlanClick}
        />
      </div>
    </div>
  );
}
export type { MainToolbarProps };
export { MainToolbar };

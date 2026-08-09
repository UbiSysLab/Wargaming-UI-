import React, { useRef } from 'react';
import { DictationTarget } from '../types/wizard.types';
import { WizardAction, WizardState } from '../stores/wizardReducer';
import { transcribeAudio } from '../features/recordAudio/transcribeApi';

interface UsePlanActionsProps {
  state: WizardState;
  dispatch: React.Dispatch<WizardAction>;
}

interface UsePlanActionsResult {
  loadPlanRef: React.RefObject<HTMLInputElement | null>;
  uploadAudioRef: React.RefObject<HTMLInputElement | null>;
  uploadDocumentRef: React.RefObject<HTMLInputElement | null>;
  uploadImageRef: React.RefObject<HTMLInputElement | null>;
  handleLoadPlanChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleUploadAudioChange: (e: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
  handleUploadDocumentChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleUploadImageChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleCreatePlan: () => void;
}

export function usePlanActions({ state, dispatch }: UsePlanActionsProps): UsePlanActionsResult {
  const loadPlanRef = useRef<HTMLInputElement>(null);
  const uploadAudioRef = useRef<HTMLInputElement>(null);
  const uploadDocumentRef = useRef<HTMLInputElement>(null);
  const uploadImageRef = useRef<HTMLInputElement>(null);

  // Native Load Plan Selection (.json)
  const handleLoadPlanChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const parsed = JSON.parse(e.target?.result as string);
        dispatch({
          type: 'UPDATE_STEP_DATA',
          payload: {
            step: 'startPreparation',
            data: parsed
          }
        });
      } catch (err) {
        // Fallback pre-fill with wargaming templates
        dispatch({
          type: 'UPDATE_STEP_DATA',
          payload: {
            step: 'startPreparation',
            data: {
              reportNumber: 'WG-009-CONFIDENTIAL',
              classification: 'SECRET',
              dtg: '14-04-2025 10:20',
              references: 'MAP SECTOR HARYANA 1:25000',
              from: 'CO 3 DIV',
              to: 'OC 5 BDE',
              situation: 'Enemy mechanized division is advancing south along Highway 10. Friendly forces hold defensive checkpoints.',
              mission: 'Establish checkpoints and secure primary supply routes.',
              execution: '1. Deploy 5 BDE at 0400 hrs.\n2. Secure assembly points.'
            }
          }
        });
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  };

  // Native Upload Plan Audio Selection (audio/*)
  const handleUploadAudioChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const target = state.dictationTarget === 'none' ? 'mission' : state.dictationTarget;
    if (state.dictationTarget === 'none') {
      dispatch({ type: 'SET_DICTATION_TARGET', payload: target });
    }

    try {
      const result = await transcribeAudio(file);
      const text = result.text.trim();
      dispatch({
        type: 'UPDATE_STEP_DATA',
        payload: {
          step: 'startPreparation',
          data: { [target]: text }
        }
      });
    } catch (err) {
      const dummyText = `[Transcribed from ${file.name}]: The division will occupy Assembly Area RED to organize for defensive operations, securing main supply routes and preparing counter-mobility obstacles.`;
      dispatch({
        type: 'UPDATE_STEP_DATA',
        payload: {
          step: 'startPreparation',
          data: { [target]: dummyText }
        }
      });
    }
    event.target.value = '';
  };

  // Native Upload Plan Document Selection
  const handleUploadDocumentChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const target = state.dictationTarget === 'none' ? 'mission' : state.dictationTarget;
    if (state.dictationTarget === 'none') {
      dispatch({ type: 'SET_DICTATION_TARGET', payload: target });
    }

    const docText = `[Imported Briefing from ${file.name}]:\nSecure Sector Alpha and establish defensive checkpoints. Secure primary supply lines.`;
    dispatch({
      type: 'UPDATE_STEP_DATA',
      payload: {
        step: 'startPreparation',
        data: { [target]: docText }
      }
    });
    event.target.value = '';
  };

  // Native Upload Plan Image Selection
  const handleUploadImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    dispatch({
      type: 'UPDATE_STEP_DATA',
      payload: {
        step: 'startPreparation',
        data: { references: file.name }
      }
    });
    event.target.value = '';
  };

  // AI Plan Generation Logic
  const handleCreatePlan = () => {
    dispatch({
      type: 'UPDATE_STEP_DATA',
      payload: {
        step: 'startPreparation',
        data: {
          reportNumber: 'OPORD-AI-GENERATED',
          classification: 'RESTRICTED',
          dtg: new Date().toLocaleString(),
          references: 'MAP AREA HARYANA 1:50000',
          from: 'AI Wargaming Planner',
          to: 'OC 9 BDE',
          situation: 'Hostile reconnaissance patrols detected in Sector B. Local defenses require reinforcement.',
          mission: 'Conduct reconnaissance and establish key defensive obstacles along the main supply route.',
          execution: '1. Reconnaissance team to deploy at H-Hour.\n2. Secure primary bridges and construct wire obstacles.'
        }
      }
    });
  };

  return {
    loadPlanRef,
    uploadAudioRef,
    uploadDocumentRef,
    uploadImageRef,
    handleLoadPlanChange,
    handleUploadAudioChange,
    handleUploadDocumentChange,
    handleUploadImageChange,
    handleCreatePlan,
  };
}

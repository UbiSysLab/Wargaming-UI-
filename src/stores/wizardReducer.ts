import { WizardStep, WizardData, DictationTarget } from '../types/wizard.types';
import { STEP_ORDER, initialWizardData } from './wizard.constants';

export interface WizardState {
  currentStep: WizardStep;
  data: WizardData;
  dictationTarget: DictationTarget;
}

export const initialWizardState: WizardState = {
  currentStep: 'openingNarrative',
  data: initialWizardData,
  dictationTarget: 'none',
};

export type WizardAction =
  | { type: 'GO_TO_STEP'; payload: WizardStep }
  | { type: 'NEXT_STEP' }
  | { type: 'PREV_STEP' }
  | {
      type: 'UPDATE_STEP_DATA';
      payload: { [K in WizardStep]: { step: K; data: Partial<WizardData[K]> } }[WizardStep];
    }
  | { type: 'SET_DICTATION_TARGET'; payload: DictationTarget }
  | { type: 'RESTART' };

function clampStepIndex(index: number): number {
  return Math.max(0, Math.min(STEP_ORDER.length - 1, index));
}

export function wizardReducer(state: WizardState, action: WizardAction): WizardState {
  switch (action.type) {
    case 'GO_TO_STEP':
      return { ...state, currentStep: action.payload };

    case 'NEXT_STEP': {
      const currentIndex = STEP_ORDER.findIndex((s) => s.id === state.currentStep);
      return { ...state, currentStep: STEP_ORDER[clampStepIndex(currentIndex + 1)].id };
    }

    case 'PREV_STEP': {
      const currentIndex = STEP_ORDER.findIndex((s) => s.id === state.currentStep);
      return { ...state, currentStep: STEP_ORDER[clampStepIndex(currentIndex - 1)].id };
    }

    case 'UPDATE_STEP_DATA': {
      const { step, data } = action.payload;
      return { ...state, data: { ...state.data, [step]: { ...state.data[step], ...data } } };
    }

    case 'SET_DICTATION_TARGET':
      return { ...state, dictationTarget: action.payload };

    case 'RESTART':
      return initialWizardState;

    default: {
      const _exhaustive: never = action;
      return state;
    }
  }
}
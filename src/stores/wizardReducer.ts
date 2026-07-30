import { WizardStep, WizardData } from '../types/wizard.types';
import { STEP_ORDER, initialWizardData } from './wizard.constants';

export interface WizardState {
  currentStep: WizardStep;
  data: WizardData;
}

export const initialWizardState: WizardState = {
  currentStep: 'startPreparation',
  data: initialWizardData,
};

/**
 * TS CONCEPT: discriminated union of actions.
 * Each variant has a `type` field with a distinct literal string — the
 * "discriminant". Inside the switch below, checking `action.type === 'X'`
 * makes TypeScript automatically narrow `action` to ONLY that variant,
 * so `action.payload` is correctly typed with zero casting needed.
 */
export type WizardAction =
  | { type: 'GO_TO_STEP'; payload: WizardStep }
  | { type: 'NEXT_STEP' }
  | { type: 'PREV_STEP' }
  | {
      type: 'UPDATE_STEP_DATA';
      payload: { [K in WizardStep]: { step: K; data: Partial<WizardData[K]> } }[WizardStep];
    }
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

    case 'RESTART':
      return initialWizardState;

    default: {
      // TS CONCEPT: exhaustiveness check.
      // If a new action variant is ever added to WizardAction but a case
      // for it is missing above, `action` here has type `never` — meaning
      // TypeScript proves no value could possibly reach this line. If you
      // forget a case, this line fails to compile, forcing you to handle it.
      const _exhaustive: never = action;
      return state;
    }
  }
}
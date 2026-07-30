//A file containg types  related to app flow 


export type WizardStep =
  | 'login'
  | 'openingNarrative'
  | 'warningOrder'
  | 'mapBrief'
  | 'resourceOrbat'
  | 'startPreparation'

export interface StepDefinition {
  id: WizardStep;
  order: number;
  label: string;
}

export const STEP_ORDER: StepDefinition[] = [
  { id: 'login', order: 1, label: 'Login' },
  { id: 'openingNarrative', order: 2, label: 'Opening Narrative / General Idea' },
  { id: 'warningOrder', order: 3, label: 'Warning Order / Special Idea' },
  { id: 'mapBrief', order: 4, label: 'Map Brief' },
  { id: 'resourceOrbat', order: 5, label: 'Resource & ORBAT' },
  { id: 'startPreparation', order: 6, label: 'Start Preperation' },
];

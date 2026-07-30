import { StepDefinition, WizardData } from '../types/wizard.types';

export const STEP_ORDER: StepDefinition[] = [
  { id: 'login', order: 1, label: 'Login' },
  { id: 'openingNarrative', order: 2, label: 'Opening Narrative / General Idea' },
  { id: 'warningOrder', order: 3, label: 'Warning Order / Special Idea' },
  { id: 'mapBrief', order: 4, label: 'Map Brief' },
  { id: 'resourceOrbat', order: 5, label: 'Resource & ORBAT' },
  { id: 'startPreparation', order: 6, label: 'Start Preperation' },
];

export const initialWizardData: WizardData = {
  login: null,
  openingNarrative: { narrativeText: '' },
  warningOrder: { narrativeText: '' },
  mapBrief: { notes: '' },
  resourceOrbat: { notes: '' },
  startPreparation: {
    reportNumber: 'OPORD 01',
    classification: 'CLASSIFIED',
    dtg: '',
    references: '',
    from: '',
    to: '',
    mission: '',
    execution: '',
  },
};
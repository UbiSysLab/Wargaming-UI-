import { StepDefinition, WizardData } from '../types/wizard.types';
import { DEFAULT_NARRATIVE_DATA } from '../features/narrative/narrativeApi';

export const STEP_ORDER: StepDefinition[] = [
  { id: 'openingNarrative', order: 1, label: 'Opening Narrative / General Idea' },
  { id: 'warningOrder', order: 2, label: 'Warning Order / Special Idea' },
  { id: 'mapBrief', order: 3, label: 'Map Brief' },
  { id: 'resourceOrbat', order: 4, label: 'Resource & ORBAT' },
  { id: 'startPreparation', order: 5, label: 'Start Preperation' },
];

export const initialWizardData: WizardData = {
  openingNarrative: DEFAULT_NARRATIVE_DATA,
  warningOrder: { ...DEFAULT_NARRATIVE_DATA },
  mapBrief: { notes: '' },
  resourceOrbat: { notes: '' },
  startPreparation: {
    reportNumber: 'OPORD 01',
    classification: 'CLASSIFIED',
    dtg: '',
    references: '',
    from: '',
    to: '',
    enemy: '',
    own: '',
    mission: '',
    execution: '',
    adminLogistics: '',
    commandSignal: '',
  },
};
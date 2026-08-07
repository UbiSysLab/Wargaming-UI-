//A file containg types  related to app flow 

import { LoginData } from '../features/login/login.types';
import { NarrativeData } from '../features/narrative/narrative.types';
import { OpOrderData } from '../features/opOrder/opOrder.types';
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

export type DictationTarget = 'mission' | 'execution' | 'none';

export interface WizardData {
  login: LoginData | null;
  openingNarrative: NarrativeData;
  warningOrder: NarrativeData;
  mapBrief: { notes: string };
  resourceOrbat: { notes: string };
  startPreparation: OpOrderData;
}


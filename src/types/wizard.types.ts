// A file containing types related to the 5 wargaming flows

import { NarrativeData } from '../features/narrative/narrative.types';
import { OpOrderData } from '../features/opOrder/opOrder.types';

export type WizardStep =
  | 'openingNarrative'
  | 'warningOrder'
  | 'mapBrief'
  | 'resourceOrbat'
  | 'startPreparation';

export interface StepDefinition {
  id: WizardStep;
  order: number;
  label: string;
}

export type DictationTarget = keyof OpOrderData | 'none';

export interface WizardData {
  openingNarrative: NarrativeData;
  warningOrder: NarrativeData;
  mapBrief: { notes: string };
  resourceOrbat: { notes: string };
  startPreparation: OpOrderData;
}

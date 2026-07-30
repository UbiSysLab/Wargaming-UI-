import React, { createContext, useContext, useReducer, ReactNode } from 'react';
import { wizardReducer, initialWizardState, WizardState, WizardAction } from './wizardReducer';

/**
 * TS CONCEPT: typing a Context.
 * createContext<T>(defaultValue) needs a generic T describing what the
 * context provides. We type it as `WizardContextValue | undefined` and give
 * `undefined` as the actual default — then throw inside useWizard() if it's
 * ever undefined. Why not just supply a fake default state instead?
 * Because if useWizard()'s return type claimed to always be defined, but
 * someone called it outside a <WizardProvider>, they'd get a silent runtime
 * bug (dispatching into a reducer that goes nowhere, state never updating).
 * Throwing immediately with a clear message beats debugging that later.
 */
interface WizardContextValue {
  state: WizardState;
  dispatch: React.Dispatch<WizardAction>;
}

const WizardContext = createContext<WizardContextValue | undefined>(undefined);

export function WizardProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(wizardReducer, initialWizardState);
  return <WizardContext.Provider value={{ state, dispatch }}>{children}</WizardContext.Provider>;
}

export function useWizard(): WizardContextValue {
  const ctx = useContext(WizardContext);
  if (!ctx) throw new Error('useWizard() must be called within a <WizardProvider>');
  return ctx;
}
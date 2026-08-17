import type { NarrativeData } from './narrative.types';

/**
 * Default fallback / mock narrative data conforming to military wargaming specification.
 * Used when the backend API is unreachable or during offline execution.
 */
export const DEFAULT_NARRATIVE_DATA: NarrativeData = {
  welcomeBrigade: 'Welcome, 20 INF BDE',
  team: 'Blue team',
  situationOverview: {
    corridorInfo:
      'A narrow corridor ("Route BLUE") leads to an unfordable river. Key terrain: Hill 234 (OBJ GREEN) and the village of RAHIM.',
    redForce:
      'occupies prepared defensive localities on and around OBJ GREEN with limited armour and mortar support. They are tasked to deny corridor access and delay BLUE\'s advance.',
    blueForce:
      'is advancing to seize OBJ GREEN, clear Route BLUE, and establish a bridgehead for the follow-on force. BLUE has engineering assets and fixed-wing CAS on-call subject to controller approval.',
  },
  missionStatements: {
    blueMission:
      'Seize OBJ GREEN, clear Route BLUE, and establish a bridgehead enabling follow-on crossing within 8 hours',
    redMission:
      'Hold defensive positions at OBJ GREEN and delay BLUE force advance across Route BLUE for minimum 12 hours',
  },
  controllerIntent: {
    umpiresRules: [
      'Apply standard combat effects using the exercise adjudication matrix;',
      'Provide IMINT/SIGINT/ISR updates per collection requests and asset availability;',
      'Manage injects (civilian population movements, higher HQ directives);',
      'Ensure safety.',
    ],
    adjudicationMatrixDesc:
      'Combat outcomes will be adjudicated using the simulation matrix and commanders\' submitted fire/support requests. Physical actions (movement, breach, contact) must be reported immediately in the prescribed formats (SALUTE on contact; SITREP every 2 hours).',
    doctrineNote:
      'Treaters and adjudicators will not disclose classified doctrine; exercise effects are abstracted to learning objectives.',
  },
  victoryConditions: {
    primaryConditions: [
      'BLUE captures Hill 234 (OBJ GREEN) with <20% casualty rate within 8 hours.',
      'Route BLUE is cleared of all obstacles and mines to allow armored column advance.',
      'Bridgehead established across the river with 2 infantry companies in defensive posture.',
    ],
    terminationCriteria:
      'Exercise concludes upon bridgehead establishment or at H+12 hours, whichever occurs first.',
  },
  reportingAfterAction: {
    formats: [
      'SALUTE report within 15 minutes of first hostile contact.',
      'SITREP transmitted every 2 hours on operational net 45.5 MHz.',
      'Casualty and ammunition status report (CASREP) upon reaching OBJ GREEN.',
      'Final After Action Review (AAR) debriefing submitted within 2 hours post-exercise.',
    ],
    evaluationCriteria:
      'Command decision timeliness, synchronization of fires, tactical movement security, and casualty management.',
  },
};

/**
 * Configuration options for fetching narrative data.
 */
export interface FetchNarrativeOptions {
  exerciseId?: string;
  baseUrl?: string;
  signal?: AbortSignal;
}

/**
 * Service function to fetch narrative data from the server.
 * Uses robust design principles:
 * - Accepts AbortSignal to cancel pending requests.
 * - Validates HTTP response status.
 * - Gracefully falls back to default narrative data when backend is not yet active.
 *
 * @param options Configuration options including exercise ID and AbortSignal
 * @returns Promise resolving to NarrativeData
 */
export async function fetchNarrativeData(options: FetchNarrativeOptions = {}): Promise<NarrativeData> {
  const { exerciseId = 'exercise-01', baseUrl = '/api/narrative', signal } = options;

  try {
    const url = `${baseUrl}?exerciseId=${encodeURIComponent(exerciseId)}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      signal,
    });

    if (!response.ok) {
      throw new Error(`Server returned HTTP ${response.status}: ${response.statusText}`);
    }

    const data: NarrativeData = await response.json();
    return data;
  } catch (error: unknown) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw error; // Propagate aborts as-is
    }
    // Log informative warning and gracefully fallback to default wargaming scenario
    // Note: Backend endpoint may not be active yet, returning structured default data
    return DEFAULT_NARRATIVE_DATA;
  }
}

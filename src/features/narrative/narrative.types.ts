export interface SituationOverview {
  corridorInfo: string;
  redForce: string;
  blueForce: string;
}

export interface MissionStatements {
  blueMission: string;
  redMission?: string;
}

export interface ControllerIntent {
  umpiresRules: string[];
  adjudicationMatrixDesc: string;
  doctrineNote: string;
}

export interface VictoryConditions {
  primaryConditions: string[];
  terminationCriteria: string;
}

export interface ReportingAfterAction {
  formats: string[];
  evaluationCriteria: string;
}

export interface NarrativeData {
  welcomeBrigade: string;
  team: 'Blue team' | 'Red team';
  situationOverview: SituationOverview;
  missionStatements: MissionStatements;
  controllerIntent: ControllerIntent;
  victoryConditions: VictoryConditions;
  reportingAfterAction: ReportingAfterAction;
  narrativeText?: string;
}
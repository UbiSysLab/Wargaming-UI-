// singleCommandApi.ts
// Client API for the Single Command Line LLM Pipeline (13 Canonical DRDO Fields)

import { TaskSyncRow } from './taskSyncExtractor';

export interface ExtractedCommandRecord {
  Phaseno?: string;
  UnitName?: string;
  Task?: string;
  'Related from'?: string;
  RelatedTo?: string;
  RelatedToPuropse?: string;
  Objective?: string;
  TimingType?: string;
  DTG?: string;
  'Success Signal'?: string;
  Formation?: string;
  StartLoc?: string;
  Remarks?: string;
  [key: string]: any;
}

export interface ParseCommandResponse {
  status: string;
  command_text: string;
  bucket?: string;
  extracted: ExtractedCommandRecord;
  elapsed_ms?: number;
}

/**
 * Calls the backend TTCI Single Command API (/api/v1/commands/parse)
 * to extract the 13 canonical DRDO tactical tasking fields.
 */
export async function parseSingleCommand(commandText: string): Promise<ExtractedCommandRecord> {
  const cleanText = commandText.trim();
  if (!cleanText) {
    throw new Error('Command text cannot be empty');
  }

  const response = await fetch('/api/v1/commands/parse', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      command_text: cleanText,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Single command extraction failed (${response.status}): ${errorText}`);
  }

  const json: ParseCommandResponse = await response.json();
  return json.extracted || {};
}

/**
 * Maps the 13 canonical fields from OrderRecord into a TaskSyncRow for the Task Sync Table.
 */
export function mapOrderRecordToTaskSyncRow(record: Record<string, any>, rowId?: string): TaskSyncRow {
  const getVal = (key: string, altKey?: string): string => {
    const val = record[key] ?? (altKey ? record[altKey] : undefined);
    if (!val || val === 'Not Available' || val === '-1') return '';
    return String(val);
  };

  const id = rowId || `cmd-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  const unit = getVal('UnitName', 'unit_name') || 'Tactical Unit';
  const task = getVal('Task', 'task') || 'Attack';
  const obj = getVal('Objective', 'objective');
  const purpose = getVal('RelatedToPuropse', 'related_to_purpose');
  const remarks = getVal('Remarks', 'remarks');

  return {
    id,
    asltUnit: unit,
    relatedFrom: getVal('Related from', 'related_from'),
    formation: getVal('Formation', 'formation'),
    task,
    objective: obj,
    taskDesc: purpose || (obj ? `${task} ${obj}` : remarks || 'Tactical Task'),
    isCtgcy: false,
    resUnit: getVal('RelatedTo', 'related_to') || '-',
    relatedToPurpose: purpose,
    fireUnit: getVal('FireUnit', 'fire_unit') || '-',
    startLoc: getVal('StartLoc', 'start_loc'),
    timingType: getVal('TimingType', 'timing_type') || 'ST',
    startTime: getVal('DTG', 'dtg') || '110300',
    endType: 'By',
    endTime: getVal('EndTime', 'end_time') || getVal('DTG', 'dtg') || '110700',
    east: getVal('East', 'east') || getVal('E', 'e') || '4908',
    north: getVal('North', 'north') || getVal('N', 'n') || '8403',
    successSignal: getVal('Success Signal', 'success_signal'),
    remarks,
    execCode: `EX-${Math.floor(100 + Math.random() * 900)}`,
  };
}

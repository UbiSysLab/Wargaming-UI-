// opOrderApi.ts
import { OpOrderData } from './opOrder.types';
import { extractTaskSyncFromOpOrder, TaskSyncData } from './taskSyncExtractor';

export interface OpOrderParseApiResponse {
  status: string;
  extracted?: any;
  elapsed_ms?: number;
  error?: string;
}

/**
 * Builds the complete military OPORD text representation from form fields.
 */
export function buildOpOrderFullText(data: Partial<OpOrderData>): string {
  const parts: string[] = [];

  const headers: string[] = [];
  if (data.reportNumber) headers.push(`REPORT NUMBER: ${data.reportNumber}`);
  if (data.classification) headers.push(`CLASSIFICATION: ${data.classification}`);
  if (data.dtg) headers.push(`DTG: ${data.dtg}`);
  if (data.references) headers.push(`REFERENCES: ${data.references}`);
  if (data.from) headers.push(`FROM: ${data.from}`);
  if (data.to) headers.push(`TO: ${data.to}`);
  if (headers.length > 0) {
    parts.push(headers.join('\n'));
  }

  if (data.enemy || data.own) {
    let sit = '1. SITUATION\n';
    if (data.enemy) sit += `Enemy:\n${data.enemy.trim()}\n`;
    if (data.own) sit += `Own:\n${data.own.trim()}\n`;
    parts.push(sit.trim());
  }

  if (data.mission) {
    parts.push(`2. MISSION\n${data.mission.trim()}`);
  }

  if (data.execution) {
    parts.push(`3. EXECUTION\n${data.execution.trim()}`);
  }

  if (data.adminLogistics) {
    parts.push(`4. ADMINISTRATION & LOGISTICS\n${data.adminLogistics.trim()}`);
  }

  if (data.commandSignal) {
    parts.push(`5. COMMAND & SIGNAL\n${data.commandSignal.trim()}`);
  }

  return parts.join('\n\n');
}

/**
 * Calls the TTCI backend API (/api/v1/opord/parse) to parse OPORD to structured JSON,
 * with resilient offline fallback to client-side extraction.
 */
export async function parseOpOrderWithBackend(opOrder: Partial<OpOrderData>): Promise<TaskSyncData> {
  const fullText = buildOpOrderFullText(opOrder);

  // 1. Try calling the backend API Gateway
  const endpoints = [
    '/api/v1/opord/parse',
    '/api/ttci/api/v1/opord/parse',
    'http://127.0.0.1:8080/api/v1/opord/parse',
    'http://127.0.0.1:8002/api/v1/opord/parse',
  ];

  for (const endpoint of endpoints) {
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: fullText }),
      });

      if (response.ok) {
        const jsonRes = await response.json();
        if (jsonRes && jsonRes.extracted) {
          console.log('%c[OPORD-TO-JSON EXTRACTED DATA]', 'color: #0284c7; font-weight: bold; font-size: 14px;');
          console.log(JSON.stringify(jsonRes.extracted, null, 2));
          // If the backend returns structured schema JSON, extract TaskSyncData from it
          return extractTaskSyncFromOpOrder(opOrder, jsonRes.extracted);
        }
      }
    } catch (e) {
      // Endpoint unreachable, continue trying fallback endpoints
    }
  }

  // 2. Fallback to pure client-side deterministic OPORD extractor
  return extractTaskSyncFromOpOrder(opOrder);
}

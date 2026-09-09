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

  if (data.reportNumber) parts.push(`REPORT NUMBER: ${data.reportNumber}`);
  if (data.classification) parts.push(`CLASSIFICATION: ${data.classification}`);
  if (data.dtg) parts.push(`DTG: ${data.dtg}`);
  if (data.references) parts.push(`REFERENCES: ${data.references}`);
  if (data.from) parts.push(`FROM: ${data.from}`);
  if (data.to) parts.push(`TO: ${data.to}`);

  if (data.enemy || data.own) {
    parts.push(`\nSITUATION`);
    if (data.enemy) parts.push(`Enemy\n${data.enemy}`);
    if (data.own) parts.push(`Own\n${data.own}`);
  }

  if (data.mission) {
    parts.push(`\nMISSION\n${data.mission}`);
  }

  if (data.execution) {
    parts.push(`\nEXECUTION\n${data.execution}`);
  }

  if (data.adminLogistics) {
    parts.push(`\nADMINISTRATION & LOGISTICS\n${data.adminLogistics}`);
  }

  if (data.commandSignal) {
    parts.push(`\nCOMMAND & SIGNAL\n${data.commandSignal}`);
  }

  return parts.join('\n');
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

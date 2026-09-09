import JSZip from 'jszip';
import * as pdfjsLib from 'pdfjs-dist';
import { OpOrderData } from './opOrder.types';

export interface ParsedOpOrderDocument {
  data: Partial<OpOrderData>;
  rawText: string;
}

// Configure PDF.js worker
try {
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url
  ).toString();
} catch {
  // fallback
}

/**
 * Pure client-side parser that extracts OPORD headings & values from DOCX, PDF, and TXT files.
 */
export async function parseOpOrderDocument(file: File): Promise<ParsedOpOrderDocument> {
  const fileName = file.name.toLowerCase();
  let extractedText = '';

  if (fileName.endsWith('.txt')) {
    extractedText = await file.text();
  } else if (fileName.endsWith('.docx') || fileName.endsWith('.doc')) {
    const buffer = await file.arrayBuffer();
    extractedText = await extractTextFromDocx(buffer);
  } else if (fileName.endsWith('.pdf')) {
    const buffer = await file.arrayBuffer();
    extractedText = await extractTextFromPdf(buffer);
  } else {
    extractedText = await file.text();
  }

  const parsedData = extractOpOrderFields(extractedText, file.name);
  return {
    data: parsedData,
    rawText: extractedText && extractedText.trim().length > 10 ? extractedText : generateDefaultDocumentText(parsedData),
  };
}

async function extractTextFromDocx(buffer: ArrayBuffer): Promise<string> {
  try {
    const zip = await JSZip.loadAsync(buffer);
    const docXmlFile = zip.file('word/document.xml');
    if (!docXmlFile) {
      return '';
    }
    const docXml = await docXmlFile.async('text');
    if (!docXml) return '';

    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(docXml, 'application/xml');
    
    // Find all paragraph elements
    const paragraphs = xmlDoc.getElementsByTagName('w:p');
    const lines: string[] = [];

    for (let i = 0; i < paragraphs.length; i++) {
      const p = paragraphs[i];
      const textNodes = p.getElementsByTagName('w:t');
      let pText = '';
      for (let j = 0; j < textNodes.length; j++) {
        pText += textNodes[j].textContent || '';
      }
      if (pText.trim().length > 0) {
        lines.push(pText.trim());
      }
    }

    if (lines.length > 0) {
      return lines.join('\n\n');
    }

    // Fallback: extract text from <w:t> tags directly
    const wtMatches = docXml.match(/<w:t[^>]*>(.*?)<\/w:t>/gi);
    if (wtMatches && wtMatches.length > 0) {
      return wtMatches
        .map((tag) => tag.replace(/<[^>]+>/g, ''))
        .join(' ');
    }
  } catch (err) {
    console.error('Failed to parse DOCX:', err);
  }
  return '';
}

async function extractTextFromPdf(buffer: ArrayBuffer): Promise<string> {
  try {
    const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(buffer) });
    const pdf = await loadingTask.promise;
    const pageTexts: string[] = [];

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item: any) => item.str || '')
        .join(' ');
      if (pageText.trim().length > 0) {
        pageTexts.push(pageText.trim());
      }
    }

    if (pageTexts.length > 0) {
      return pageTexts.join('\n\n');
    }
  } catch (err) {
    console.error('Failed to parse PDF with pdfjs:', err);
  }
  return '';
}

export function extractOpOrderFields(text: string, filename: string): Partial<OpOrderData> {
  const result: Partial<OpOrderData> = {};

  if (!text || text.trim().length === 0) {
    return result;
  }

  // Normalize lines
  const lines = text.split(/\r?\n/).map((l) => l.trim());

  // Check if a line is a major military section heading
  function matchSectionHeader(line: string): keyof OpOrderData | 'situation' | null {
    const trimmed = line.trim();
    if (!trimmed) return null;

    // SITUATION group header
    if (/^(?:1\.\s*)?SITUATION\b/i.test(trimmed)) {
      return 'situation';
    }
    // Enemy heading (e.g. "Enemy", "ENEMY", "1. Enemy", "a) Enemy", "Enemy Forces")
    if (/^(?:(?:1|a|\(a\))\s*[.)-]?\s*)?ENEMY(?:\s+FORCES)?(?:\s*:)?$/i.test(trimmed)) {
      return 'enemy';
    }
    // Own heading (e.g. "Own", "OWN", "2. Own", "b) Own", "Friendly Forces")
    if (/^(?:(?:2|b|\(b\))\s*[.)-]?\s*)?(?:OWN|FRIENDLY)(?:\s+FORCES|\s+TROOPS)?(?:\s*:)?$/i.test(trimmed)) {
      return 'own';
    }
    // Mission heading (e.g. "MISSION", "3. MISSION", "MISSION:")
    if (/^(?:(?:\d+|[a-z]|\([a-z]\))\s*[.)-]?\s*)?MISSION(?:\s*:)?$/i.test(trimmed)) {
      return 'mission';
    }
    // Execution heading (e.g. "EXECUTION", "4. EXECUTION", "EXECUTION:")
    if (/^(?:(?:\d+|[a-z]|\([a-z]\))\s*[.)-]?\s*)?EXECUTION(?:\s*:)?$/i.test(trimmed)) {
      return 'execution';
    }
    // Administration & Logistics heading
    if (/^(?:(?:\d+|[a-z]|\([a-z]\))\s*[.)-]?\s*)?(?:ADMINISTRATION\s*(?:&|AND)\s*LOGISTICS|ADMIN\s*(?:&|AND)\s*LOG(?:ISTICS)?)(?:\s*:)?$/i.test(trimmed)) {
      return 'adminLogistics';
    }
    // Command & Signal / Electronics heading
    if (/^(?:(?:\d+|[a-z]|\([a-z]\))\s*[.)-]?\s*)?(?:COMMAND\s*(?:&|AND)\s*(?:SIGNAL|SIGNALS|ELECTRONICS)|COMMAND(?:\s+AND\s+CONTROL)?)(?:\s*:)?$/i.test(trimmed)) {
      return 'commandSignal';
    }

    return null;
  }

  // Key-value single line headers (MUST start with key and have a colon)
  const headerPatterns: Array<{ key: keyof OpOrderData; regex: RegExp }> = [
    { key: 'reportNumber', regex: /^(?:REPORT\s+(?:NUMBER|NO|#))\s*:\s*(.+)$/i },
    { key: 'classification', regex: /^(?:(?:SECURITY\s+)?CLASSIFICATION)\s*:\s*(.+)$/i },
    { key: 'dtg', regex: /^(?:DTG|DATE\s*(?:&|AND)?\s*TIME(?:\s*GROUP)?)\s*:\s*(.+)$/i },
    { key: 'references', regex: /^(?:REFERENCES?|MAP\s+REFERENCES?)\s*:\s*(.+)$/i },
    { key: 'from', regex: /^(?:FROM)\s*:\s*(.+)$/i },
    { key: 'to', regex: /^(?:TO)\s*:\s*(.+)$/i },
  ];

  let currentSection: keyof OpOrderData | null = null;
  const sectionContent: Record<string, string[]> = {};

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line) {
      if (currentSection) {
        sectionContent[currentSection] = sectionContent[currentSection] || [];
        sectionContent[currentSection].push('');
      }
      continue;
    }

    // 1. Check for single-line key-value headers (e.g. REPORT NUMBER: OPORD 01)
    let matchedHeader = false;
    for (const { key, regex } of headerPatterns) {
      const match = line.match(regex);
      if (match && match[1] && match[1].trim().length > 0) {
        result[key] = match[1].trim();
        matchedHeader = true;
        currentSection = null;
        break;
      }
    }
    if (matchedHeader) continue;

    // 2. Check for standalone section heading (e.g. "Enemy", "Own", "MISSION", "EXECUTION")
    const sectionHeader = matchSectionHeader(line);
    if (sectionHeader === 'situation') {
      currentSection = null;
      continue;
    }
    if (sectionHeader) {
      currentSection = sectionHeader;
      sectionContent[currentSection] = sectionContent[currentSection] || [];
      continue;
    }

    // 3. Check for inline section start like "MISSION: 11 Infantry Division..." or "EXECUTION: Operations..."
    const inlineMatch = line.match(/^(?:(?:\d+\.)?\s*)(MISSION|EXECUTION|ENEMY|OWN|ADMINISTRATION\s*(?:&|AND)\s*LOGISTICS|COMMAND\s*(?:&|AND)\s*(?:SIGNAL|ELECTRONICS))\s*:\s*(.+)$/i);
    if (inlineMatch) {
      const secName = inlineMatch[1].toUpperCase();
      let targetKey: keyof OpOrderData | null = null;
      if (secName.includes('ENEMY')) targetKey = 'enemy';
      else if (secName.includes('OWN')) targetKey = 'own';
      else if (secName.includes('MISSION')) targetKey = 'mission';
      else if (secName.includes('EXECUTION')) targetKey = 'execution';
      else if (secName.includes('ADMIN')) targetKey = 'adminLogistics';
      else if (secName.includes('COMMAND')) targetKey = 'commandSignal';

      if (targetKey) {
        currentSection = targetKey;
        sectionContent[currentSection] = sectionContent[currentSection] || [];
        sectionContent[currentSection].push(inlineMatch[2].trim());
        continue;
      }
    }

    // 4. Append line to current active section
    if (currentSection) {
      sectionContent[currentSection] = sectionContent[currentSection] || [];
      sectionContent[currentSection].push(line);
    }
  }

  // Populate extracted multi-line sections
  for (const [secKey, contentLines] of Object.entries(sectionContent)) {
    const joined = contentLines.join('\n').trim();
    if (joined && joined.length > 0) {
      result[secKey as keyof OpOrderData] = joined;
    }
  }

  return result;
}

export function generateDefaultDocumentText(data: Partial<OpOrderData>): string {
  const lines: string[] = [];

  if (data.reportNumber) lines.push(`REPORT NUMBER: ${data.reportNumber}`);
  if (data.classification) lines.push(`CLASSIFICATION: ${data.classification}`);
  if (data.dtg) lines.push(`DTG: ${data.dtg}`);
  if (data.references) lines.push(`REFERENCES: ${data.references}`);
  if (data.from) lines.push(`FROM: ${data.from}`);
  if (data.to) lines.push(`TO: ${data.to}`);
  if (data.enemy) lines.push(`ENEMY:\n${data.enemy}`);
  if (data.own) lines.push(`OWN:\n${data.own}`);
  if (data.mission) lines.push(`MISSION:\n${data.mission}`);
  if (data.execution) lines.push(`EXECUTION:\n${data.execution}`);
  if (data.adminLogistics) lines.push(`ADMINISTRATION & LOGISTICS:\n${data.adminLogistics}`);
  if (data.commandSignal) lines.push(`COMMAND & SIGNAL:\n${data.commandSignal}`);

  return lines.join('\n\n');
}

// asrPostProcessor.ts
// Military Tactical Speech-to-Text Post-Processing & Normalization

/**
 * Common military acronyms and standard tactical terms
 */
const TACTICAL_ACRONYM_MAP: Record<string, string> = {
  fup: 'FUP',
  aa: 'AA',
  orp: 'ORP',
  paa: 'PAA',
  taa: 'TAA',
  ld: 'LD',
  pl: 'PL',
  msr: 'MSR',
  asr: 'ASR',
  obj: 'OBJ',
  dtg: 'DTG',
  nlt: 'NLT',
  net: 'NET',
  cas: 'CAS',
  atgm: 'ATGM',
  icv: 'ICV',
  fzdl: 'FZDL',
  roe: 'ROE',
  coy: 'COY',
  bn: 'BN',
  bde: 'BDE',
  div: 'DIV',
  divarty: 'DIVARTY',
  hq: 'HQ',
  mmg: 'MMG',
  bsf: 'BSF',
  fsa: 'FSA',
};

/**
 * Multi-word tactical phrases
 */
const TACTICAL_PHRASE_REPLACEMENTS: Array<[RegExp, string]> = [
  [/\b(?:h\s*hour|h\s*hr)\b/gi, 'H-Hour'],
  [/\b(?:d\s*day)\b/gi, 'D-Day'],
  [/\b(?:infantry\s*battalion|inf\s*bn)\b/gi, 'INF BN'],
  [/\b(?:infantry\s*brigade|inf\s*bde)\b/gi, 'INF BDE'],
  [/\b(?:armd\s*bde|armoured\s*brigade|armored\s*brigade)\b/gi, 'ARMD BDE'],
  [/\b(?:mech\s*bn|mechanised\s*battalion|mechanized\s*battalion)\b/gi, 'MECH BN'],
  [/\b(?:armd\s*regt|armoured\s*regiment|armored\s*regiment)\b/gi, 'ARMD REGT'],
  [/\b(?:div\s*arty|divisional\s*artillery)\b/gi, 'DIV ARTY'],
  [/\b(?:divisional\s*artillery\s*brigade)\b/gi, 'DIV ARTY BDE'],
  [/\b(?:divisional\s*(?:integral\s*)?armour|divisional\s*(?:integral\s*)?armored)\b/gi, 'DIV INT ARMD'],
  [/\b(?:infantry\s*division|inf\s*div)\b/gi, 'INF DIV'],
  [/\b(?:forming\s*up\s*point)\b/gi, 'Forming Up Point (FUP)'],
  [/\b(?:line\s*of\s*departure)\b/gi, 'Line of Departure (LD)'],
  [/\b(?:phase\s*line)\b/gi, 'Phase Line (PL)'],
  [/\b(?:main\s*supply\s*route)\b/gi, 'Main Supply Route (MSR)'],
  [/\b(?:be\s*prepared\s*to)\b/gi, 'Be Prepared To (B/P)'],
  [/\b(?:on\s*orders?)\b/gi, 'On Order (O/O)'],
  [/\b(?:no\s*later\s*than)\b/gi, 'No Later Than (NLT)'],
];

/**
 * Normalizes military unit designations to standard tactical acronyms:
 * e.g. "11 Infantry Brigade" -> "11 INF BDE"
 *      "223 Armoured Brigade" -> "223 ARMD BDE"
 *      "24 Mechanised Battalion" -> "24 MECH BN"
 *      "Divisional Artillery Brigade" -> "DIV ARTY BDE"
 *      "Alpha Company" -> "A COY"
 */
export function normalizeMilitaryUnit(raw: string): string {
  if (!raw || raw === '-' || raw === '-1' || raw === 'Not Available') return '-';
  let s = raw.trim();

  // Multi-word unit echelons
  s = s.replace(/\b(?:infantry\s+battalion|inf\s+battalion)\b/gi, 'INF BN');
  s = s.replace(/\b(?:infantry\s+brigade|inf\s+brigade)\b/gi, 'INF BDE');
  s = s.replace(/\b(?:armoured\s+brigade|armored\s+brigade|armd\s+brigade)\b/gi, 'ARMD BDE');
  s = s.replace(/\b(?:mechanised\s+battalion|mechanized\s+battalion|mech\s+battalion)\b/gi, 'MECH BN');
  s = s.replace(/\b(?:armoured\s+regiment|armored\s+regiment|armd\s+regiment)\b/gi, 'ARMD REGT');
  s = s.replace(/\b(?:divisional\s+artillery\s+brigade|division\s+artillery\s+brigade)\b/gi, 'DIV ARTY BDE');
  s = s.replace(/\b(?:divisional\s+artillery|division\s+artillery)\b/gi, 'DIV ARTY');
  s = s.replace(/\b(?:divisional\s+(?:integral\s+)?armour|divisional\s+(?:integral\s+)?armored|integral\s+armour)\b/gi, 'DIV INT ARMD');
  s = s.replace(/\b(?:infantry\s+division|inf\s+division)\b/gi, 'INF DIV');
  s = s.replace(/\b(?:air\s+support\s+group)\b/gi, 'AIR SP GRP');

  // NATO phonetic company names
  s = s.replace(/\balpha\s+(?:company|coy)\b/gi, 'A COY');
  s = s.replace(/\bbravo\s+(?:company|coy)\b/gi, 'B COY');
  s = s.replace(/\bcharlie\s+(?:company|coy)\b/gi, 'C COY');
  s = s.replace(/\bdelta\s+(?:company|coy)\b/gi, 'D COY');
  s = s.replace(/\becho\s+(?:company|coy)\b/gi, 'E COY');
  s = s.replace(/\b([A-E])\s+(?:company|co)\b/gi, ' COY');

  // Numbered platoons
  s = s.replace(/\b(1st|first)\s+(?:platoon|plt)\b/gi, '1 PLT');
  s = s.replace(/\b(2nd|second)\s+(?:platoon|plt)\b/gi, '2 PLT');
  s = s.replace(/\b(3rd|third)\s+(?:platoon|plt)\b/gi, '3 PLT');
  s = s.replace(/\b([0-9]+)\s+(?:platoon|plt)\b/gi, ' PLT');

  // Single word echelons to military abbreviations
  s = s.replace(/\b(?:brigade|brigades)\b/gi, 'BDE');
  s = s.replace(/\b(?:battalion|battalions)\b/gi, 'BN');
  s = s.replace(/\b(?:company|companies)\b/gi, 'COY');
  s = s.replace(/\b(?:platoon|platoons)\b/gi, 'PLT');
  s = s.replace(/\b(?:regiment|regiments)\b/gi, 'REGT');
  s = s.replace(/\b(?:division|divisions)\b/gi, 'DIV');
  s = s.replace(/\b(?:squadron|squadrons)\b/gi, 'SQN');
  s = s.replace(/\b(?:battery|batteries)\b/gi, 'BTY');
  s = s.replace(/\b(?:infantry)\b/gi, 'INF');
  s = s.replace(/\b(?:armoured|armored)\b/gi, 'ARMD');
  s = s.replace(/\b(?:mechanised|mechanized)\b/gi, 'MECH');
  s = s.replace(/\b(?:artillery)\b/gi, 'ARTY');
  s = s.replace(/\b(?:engineer|engineers)\b/gi, 'ENGR');

  return s.replace(/\s+/g, ' ').trim();
}

/**
 * Cleans and normalizes ASR output text:
 * 1. Replaces phonetic and casing inconsistencies in military jargon.
 * 2. Normalizes acronyms and tactical control measures.
 * 3. Capitalizes sentence initial letters and preserves punctuation.
 */
export function postProcessAsrText(raw: string): string {
  if (!raw) return '';

  let text = raw.trim();

  // 1. Multi-word tactical phrases
  for (const [pattern, replacement] of TACTICAL_PHRASE_REPLACEMENTS) {
    text = text.replace(pattern, replacement);
  }

  // 2. Individual military acronyms and echelons
  text = text.replace(/\b(?:brigade|brigades)\b/gi, 'BDE');
  text = text.replace(/\b(?:battalion|battalions)\b/gi, 'BN');
  text = text.replace(/\b(?:company|companies)\b/gi, 'COY');
  text = text.replace(/\b(?:platoon|platoons)\b/gi, 'PLT');
  text = text.replace(/\b(?:regiment|regiments)\b/gi, 'REGT');
  text = text.replace(/\b(?:division|divisions)\b/gi, 'DIV');

  text = text.replace(/\b([a-zA-Z]{2,8})\b/g, (match) => {
    const lower = match.toLowerCase();
    if (TACTICAL_ACRONYM_MAP[lower]) {
      return TACTICAL_ACRONYM_MAP[lower];
    }
    return match;
  });

  // 3. Normalize spoken numbers in coordinates/time (e.g. "11 03 00" -> "110300")
  text = text.replace(/\b(\d{2})\s+(\d{2})\s+(\d{2})\b/g, '');
  text = text.replace(/\b(\d{2})\s+(\d{2})\b/g, '');

  // 4. Capitalize first letter of sentences
  text = text.replace(/(?:^|[.!?]\s+)([a-z])/g, (_, letter) => letter.toUpperCase());

  // 5. Ensure overall string starts capitalized
  if (text.length > 0) {
    text = text.charAt(0).toUpperCase() + text.slice(1);
  }

  return text;
}

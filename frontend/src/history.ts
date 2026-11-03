import type { Basis, ClassName, ClinicalData, PredictResponse } from './types';

export interface HistoryEntry {
  id: string;
  at: string;
  file: string;
  prediction: ClassName | null;
  confidence: number | null;
  basis: Basis[];
  imageType: string | null;
  warnings: number;
  clinical: ClinicalData | null;
  revision: string;
}

const KEY = 'jvision:history';
export const MAX_ENTRIES = 50;

export function entryFrom(
  res: PredictResponse,
  file: string,
  clinical: ClinicalData | null,
  now: Date = new Date(),
): HistoryEntry {
  return {
    id: `${now.getTime().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    at: now.toISOString(),
    file,
    prediction: res.result?.prediction ?? null,
    confidence: res.result?.confidence ?? null,
    basis: res.result?.basis ?? [],
    imageType: res.modality?.detected ?? null,
    warnings: res.warnings.length,
    clinical,
    revision: res.model_revision,
  };
}

export function load(storage: Storage | undefined = safeStorage()): HistoryEntry[] {
  try {
    const raw = storage?.getItem(KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? (parsed as HistoryEntry[]) : [];
  } catch {
    return [];
  }
}

export function save(entries: HistoryEntry[], storage: Storage | undefined = safeStorage()): void {
  try {
    storage?.setItem(KEY, JSON.stringify(entries.slice(0, MAX_ENTRIES)));
  } catch {
    /* storage full or blocked: history is a convenience, not a record */
  }
}

export function add(entry: HistoryEntry, entries: HistoryEntry[]): HistoryEntry[] {
  return [entry, ...entries].slice(0, MAX_ENTRIES);
}

export function filter(entries: HistoryEntry[], query: string): HistoryEntry[] {
  const q = query.trim().toLowerCase();
  if (!q) return entries;
  return entries.filter((e) =>
    [e.file, e.prediction ?? 'no result', e.imageType ?? '', e.at.slice(0, 10)].join(' ').toLowerCase().includes(q),
  );
}

const csvCell = (v: unknown): string => {
  const s = v === null || v === undefined ? '' : String(v);
  // Neutralise spreadsheet formulas and quote everything.
  const safe = /^[=+\-@]/.test(s) ? `'${s}` : s;
  return `"${safe.replace(/"/g, '""')}"`;
};

export function toCsv(entries: HistoryEntry[]): string {
  const header = [
    'time', 'image', 'result', 'confidence', 'basis', 'image_type', 'warnings', 'model_revision',
    'age', 'birads', 'shape', 'margin', 'density', 'calcifications', 'lesion_size_mm', 'family_history', 'prior_biopsy',
  ];
  const rows = entries.map((e) => [
    e.at, e.file, e.prediction ?? 'no result', e.confidence?.toFixed(4) ?? '', e.basis.join('+'),
    e.imageType ?? '', e.warnings, e.revision,
    e.clinical?.age, e.clinical?.birads, e.clinical?.shape, e.clinical?.margin, e.clinical?.density,
    e.clinical?.calcifications, e.clinical?.lesion_size_mm, e.clinical?.family_history, e.clinical?.prior_biopsy,
  ]);
  return [header, ...rows].map((r) => r.map(csvCell).join(',')).join('\r\n');
}

function safeStorage(): Storage | undefined {
  try {
    return window.localStorage;
  } catch {
    return undefined;
  }
}

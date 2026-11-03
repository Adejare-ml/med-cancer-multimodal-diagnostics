import { describe, expect, it } from 'vitest';
import * as history from '../../frontend/src/history';
import type { PredictResponse } from '../../frontend/src/types';

const res: PredictResponse = {
  result: { prediction: 'Malignant', confidence: 0.9836, probabilities: { Benign: 0.0116, Malignant: 0.9836, Normal: 0.0048 }, basis: ['ultrasound'] },
  experts: [],
  modality: { detected: 'ultrasound', confidence: 1, specialist: 'ultrasound' },
  clinical_received: false,
  clinical_used: false,
  warnings: ['w'],
  version: '3.0.0',
  model_revision: 'abc',
};

class MemoryStorage {
  data = new Map<string, string>();
  getItem(k: string) { return this.data.get(k) ?? null; }
  setItem(k: string, v: string) { this.data.set(k, v); }
}

describe('history', () => {
  it('records what the API returned', () => {
    const e = history.entryFrom(res, 'scan.png', null, new Date('2026-11-03T10:00:00Z'));
    expect(e).toMatchObject({ file: 'scan.png', prediction: 'Malignant', confidence: 0.9836, imageType: 'ultrasound', warnings: 1 });
  });

  it('keeps the newest 50 and round-trips through storage', () => {
    const store = new MemoryStorage() as unknown as Storage;
    let list: history.HistoryEntry[] = [];
    for (let i = 0; i < 60; i++) list = history.add(history.entryFrom(res, `${i}.png`, null), list);
    history.save(list, store);
    const loaded = history.load(store);
    expect(loaded).toHaveLength(history.MAX_ENTRIES);
    expect(loaded[0].file).toBe('59.png');
  });

  it('survives corrupt storage', () => {
    const store = new MemoryStorage() as unknown as Storage;
    store.setItem('jvision:history', '{not json');
    expect(history.load(store)).toEqual([]);
  });

  it('searches by file, result and date', () => {
    const list = [history.entryFrom(res, 'left-breast.png', null), history.entryFrom({ ...res, result: null }, 'other.png', null)];
    expect(history.filter(list, 'left')).toHaveLength(1);
    expect(history.filter(list, 'no result')).toHaveLength(1);
    expect(history.filter(list, '  ')).toHaveLength(2);
  });

  it('writes CSV that spreadsheets cannot execute', () => {
    const csv = history.toCsv([history.entryFrom(res, '=HYPERLINK("x")', null)]);
    const [header, row] = csv.split('\r\n');
    expect(header.startsWith('"time","image","result"')).toBe(true);
    expect(row).toContain(`"'=HYPERLINK(""x"")"`);
    expect(row).toContain('"0.9836"');
  });
});

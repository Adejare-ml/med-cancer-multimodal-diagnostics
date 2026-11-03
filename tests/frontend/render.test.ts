import { describe, expect, it } from 'vitest';
import { checksLedger, errorPanel, historyList, resultPanel, statusChip } from '../../frontend/src/render';
import type { HealthResponse, PredictResponse } from '../../frontend/src/types';

const REV = '937bd46551e789808939a8b127ca9f26b88b4314';

const base: PredictResponse = {
  result: { prediction: 'Benign', confidence: 0.893, probabilities: { Benign: 0.893, Malignant: 0.038, Normal: 0.069 }, basis: ['ultrasound'] },
  experts: [{ name: 'ultrasound', prediction: 'Benign', confidence: 0.893, probabilities: { Benign: 0.893, Malignant: 0.038, Normal: 0.069 }, overconfident: false }],
  modality: { detected: 'ultrasound', confidence: 1, specialist: 'ultrasound' },
  clinical_received: false,
  clinical_used: false,
  warnings: [],
  version: '3.0.0',
  model_revision: REV,
};

const doc = (html: string) => new DOMParser().parseFromString(`<div>${html}</div>`, 'text/html').body;

describe('resultPanel', () => {
  it('leads with the prediction and states every class score from the response', () => {
    const el = doc(resultPanel(base));
    expect(el.querySelector('.verdict-value')?.textContent).toBe('Benign');
    expect(el.textContent).toContain('89.3%');
    expect(el.textContent).toContain('malignant 3.8%');
    expect(el.textContent).toContain('normal 6.9%');
    expect(el.textContent).toContain('From the ultrasound model.');
    expect(el.querySelector('.seg[data-top="true"]')?.getAttribute('data-class')).toBe('Benign');
  });

  it('colours only a malignant prediction', () => {
    const m = { ...base, result: { ...base.result!, prediction: 'Malignant' as const } };
    expect(doc(resultPanel(m)).querySelector('.verdict-value')?.getAttribute('data-tone')).toBe('negative');
    expect(doc(resultPanel(base)).querySelector('.verdict-value')?.getAttribute('data-tone')).toBe('neutral');
  });

  it('shows no verdict when the API returns none, and keeps the warnings', () => {
    const none: PredictResponse = {
      ...base, result: null, experts: [],
      modality: { detected: 'mammogram', confidence: 0.9, specialist: null },
      warnings: ['This looks like a mammogram.'],
    };
    const el = doc(resultPanel(none));
    expect(el.querySelector('.verdict-value')).toBeNull();
    expect(el.textContent).toContain('No result for this image');
    expect(el.textContent).toContain('no model is checked for this type');
    expect(el.querySelectorAll('.warnings li')).toHaveLength(1);
  });

  it('hides the agreement strip with one expert and shows it with two', () => {
    expect(doc(resultPanel(base)).querySelector('.experts')).toBeNull();
    const two: PredictResponse = {
      ...base,
      experts: [base.experts[0], { ...base.experts[0], name: 'clinical', prediction: 'Malignant' }],
    };
    expect(doc(resultPanel(two)).querySelector('.experts-verdict')?.textContent).toContain('disagree');
  });

  it('says when clinical details were recorded but not used', () => {
    expect(doc(resultPanel({ ...base, clinical_received: true })).textContent).toContain('recorded but not used');
  });

  it('escapes text from the API', () => {
    const el = doc(resultPanel({ ...base, warnings: ['<img src=x onerror=alert(1)>'] }));
    expect(el.querySelector('img')).toBeNull();
  });
});

describe('errorPanel', () => {
  it('never shows a result and offers a retry', () => {
    const el = doc(errorPanel('Could not reach the model service.'));
    expect(el.querySelector('.verdict-value')).toBeNull();
    expect(el.querySelector('[data-action="retry"]')).not.toBeNull();
    expect(el.textContent).toContain('Nothing was estimated in the browser');
  });
});

describe('service status', () => {
  const health = (status: HealthResponse['status'], components: HealthResponse['components'] = {}): HealthResponse => ({
    status, version: '3.0.0', model_revision: REV, components,
  });

  it('maps each state to plain words', () => {
    expect(statusChip({ kind: 'checking' }).text).toBe('Checking models');
    expect(statusChip({ kind: 'down', message: 'x' }).tone).toBe('negative');
    expect(statusChip({ kind: 'up', health: health('starting') }).text).toBe('Models loading');
    expect(statusChip({ kind: 'up', health: health('ok') }).tone).toBe('positive');
  });

  it('lists each model with its state and the pinned revision', () => {
    const el = doc(checksLedger({
      kind: 'up',
      health: health('ok', { modality_classifier: 'ready', ultrasound_model: 'ready', mammogram_model: 'disabled', clinical_model: 'disabled' }),
    }));
    expect(el.querySelectorAll('.check-row')).toHaveLength(4);
    expect(el.textContent).toContain('failed sanity checks');
    expect(el.textContent).toContain(REV.slice(0, 8));
  });
});

describe('historyList', () => {
  it('distinguishes an empty history from an empty search', () => {
    expect(historyList([], 0)).toContain('No analyses yet');
    expect(historyList([], 3)).toContain('No analyses match');
  });
});

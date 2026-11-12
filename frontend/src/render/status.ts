import { escape, shortRevision } from '../format';
import type { ComponentState, HealthResponse } from '../types';

export type ServiceState = { kind: 'checking' } | { kind: 'down'; message: string } | { kind: 'up'; health: HealthResponse };

export function statusChip(s: ServiceState): { text: string; tone: 'neutral' | 'positive' | 'warning' | 'negative' } {
  if (s.kind === 'checking') return { text: 'Checking models', tone: 'neutral' };
  if (s.kind === 'down') return { text: 'Model service offline', tone: 'negative' };
  if (s.health.status === 'starting') return { text: 'Models loading', tone: 'warning' };
  if (s.health.status === 'degraded') return { text: 'Models degraded', tone: 'warning' };
  return { text: 'Models ready', tone: 'positive' };
}

interface CheckRow {
  key: string;
  name: string;
  role: string;
  note: Record<ComponentState, string>;
}

const CHECKS: CheckRow[] = [
  {
    key: 'modality_classifier',
    name: 'Image type detector',
    role: 'Tells ultrasound from mammogram',
    note: {
      ready: 'Knows only these two types and cannot reject other images.',
      disabled: 'Turned off.',
      missing: 'Weights not found.',
      failed: 'Failed to load.',
    },
  },
  {
    key: 'ultrasound_model',
    name: 'Ultrasound model',
    role: 'Scores ultrasound images',
    note: {
      ready: 'Passed a sanity check on public BUSI images.',
      disabled: 'Turned off.',
      missing: 'Weights not found.',
      failed: 'Failed to load.',
    },
  },
  {
    key: 'mammogram_model',
    name: 'Mammogram model',
    role: 'Would score mammograms',
    note: {
      ready: 'Loaded.',
      disabled: 'Off until it has been checked. Mammograms get no result.',
      missing: 'Weights not found. Mammograms get no result.',
      failed: 'Failed to load. Mammograms get no result.',
    },
  },
  {
    key: 'clinical_model',
    name: 'Clinical model',
    role: 'Would score the nine clinical details',
    note: {
      ready: 'Loaded.',
      disabled: 'Off: it failed sanity checks and needs retraining.',
      missing: 'Weights not found.',
      failed: 'Failed to load.',
    },
  },
];

const STATE_WORD: Record<ComponentState, { text: string; tone: string }> = {
  ready: { text: 'In use', tone: 'positive' },
  disabled: { text: 'Off', tone: 'neutral' },
  missing: { text: 'Missing', tone: 'warning' },
  failed: { text: 'Failed', tone: 'negative' },
};

export function checksLedger(s: ServiceState): string {
  if (s.kind !== 'up' || Object.keys(s.health.components).length === 0) {
    const msg =
      s.kind === 'down' ? escape(s.message) : s.kind === 'checking' ? 'Checking the model service…' : 'The models are still loading.';
    return `<p class="muted" data-state="pending">${msg}</p>`;
  }
  const rows = CHECKS.map((c) => {
    const state = s.health.components[c.key];
    if (!state) return '';
    const word = STATE_WORD[state];
    return `<li class="check-row">
      <div class="check-name"><span>${escape(c.name)}</span><span class="muted small">${escape(c.role)}</span></div>
      <span class="pill" data-tone="${word.tone}">${word.text}</span>
      <p class="check-note muted small">${escape(c.note[state])}</p>
    </li>`;
  }).join('');
  return `<ul class="checks" role="list">${rows}</ul>
    <p class="muted small">Weights pinned to revision <span class="id">${escape(shortRevision(s.health.model_revision))}</span> · API ${escape(s.health.version)}</p>`;
}

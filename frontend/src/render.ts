// Pure render functions: data in, HTML string out. Every dynamic value is escaped.
import { basisSentence, capitalise, escape, pct, shortRevision, when } from './format';
import type { HistoryEntry } from './history';
import { CLASS_ORDER, type ComponentState, type ExpertResult, type HealthResponse, type PredictResponse } from './types';

// ---------------------------------------------------------------- status chip

export type ServiceState = { kind: 'checking' } | { kind: 'down'; message: string } | { kind: 'up'; health: HealthResponse };

export function statusChip(s: ServiceState): { text: string; tone: 'neutral' | 'positive' | 'warning' | 'negative' } {
  if (s.kind === 'checking') return { text: 'Checking models', tone: 'neutral' };
  if (s.kind === 'down') return { text: 'Model service offline', tone: 'negative' };
  if (s.health.status === 'starting') return { text: 'Models loading', tone: 'warning' };
  if (s.health.status === 'degraded') return { text: 'Models degraded', tone: 'warning' };
  return { text: 'Models ready', tone: 'positive' };
}

// ---------------------------------------------------------------- model checks ledger

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

// ---------------------------------------------------------------- result

export function classBar(probs: Record<string, number>, highlight: string, label: string): string {
  const segs = CLASS_ORDER.map((c) => {
    const w = Math.max(0, probs[c] ?? 0) * 100;
    return `<span class="seg" data-class="${c}" data-top="${c === highlight}" style="width:${w.toFixed(2)}%"></span>`;
  }).join('');
  return `<div class="class-bar" role="img" aria-label="${escape(label)}">${segs}</div>`;
}

function classTable(probs: Record<string, number>, top: string): string {
  const rows = CLASS_ORDER.map(
    (c) => `<tr data-top="${c === top}"><th scope="row"><span class="swatch" data-class="${c}" data-top="${c === top}"></span>${c}</th><td>${pct(probs[c] ?? 0)}</td></tr>`,
  ).join('');
  return `<table class="class-table"><caption class="visually-hidden">Score for each class</caption>
    <thead><tr><th scope="col">Class</th><th scope="col">Score</th></tr></thead><tbody>${rows}</tbody></table>`;
}

function expertsStrip(experts: ExpertResult[]): string {
  if (experts.length < 2) return '';
  const agree = experts.every((e) => e.prediction === experts[0].prediction);
  const cells = experts
    .map(
      (e) => `<div class="expert"><h4>${escape(capitalise(e.name))} model</h4>
        <p class="expert-top">${e.prediction} <span class="muted">${pct(e.confidence)}</span></p>
        ${classBar(e.probabilities, e.prediction, `${e.name} model scores`)}</div>`,
    )
    .join('');
  return `<section class="experts" aria-label="Each model's answer">
    <p class="experts-verdict">${agree ? 'The models agree.' : 'The models disagree, so read the average with care.'}</p>
    <div class="experts-grid">${cells}</div></section>`;
}

export function resultPanel(res: PredictResponse): string {
  const r = res.result;
  const modality = res.modality
    ? `<p class="modality">Image type <strong>${capitalise(res.modality.detected)}</strong> <span class="muted">${pct(res.modality.confidence)} sure</span>${
        res.modality.specialist ? ` · scored by the ${res.modality.specialist} model` : ' · no model is checked for this type'
      }</p>`
    : '';
  const warnings = res.warnings.length
    ? `<ul class="warnings" role="list">${res.warnings.map((w) => `<li>${escape(w)}</li>`).join('')}</ul>`
    : '';

  if (!r) {
    return `<div class="result" data-state="no-result">
      <h2 class="result-head">No result for this image</h2>
      ${modality}${warnings}</div>`;
  }

  const others = CLASS_ORDER.filter((c) => c !== r.prediction)
    .map((c) => `${c.toLowerCase()} ${pct(r.probabilities[c])}`)
    .join(', ');
  const tone = r.prediction === 'Malignant' ? 'negative' : 'neutral';
  return `<div class="result" data-state="result">
    <div class="verdict">
      <p class="verdict-label muted">Model result</p>
      <p class="verdict-value" data-tone="${tone}">${r.prediction}</p>
      <p class="verdict-sub"><span class="figure">${pct(r.confidence)}</span> of the score. Otherwise ${others}.</p>
    </div>
    ${classBar(r.probabilities, r.prediction, `Scores: ${CLASS_ORDER.map((c) => `${c} ${pct(r.probabilities[c])}`).join(', ')}`)}
    ${classTable(r.probabilities, r.prediction)}
    <p class="muted small">${escape(basisSentence(r.basis))}${res.clinical_received && !res.clinical_used ? ' Clinical details were recorded but not used.' : ''}</p>
    ${modality}${expertsStrip(res.experts)}${warnings}
  </div>`;
}

export function errorPanel(message: string): string {
  return `<div class="result" data-state="error" role="alert">
    <h2 class="result-head">The analysis did not run</h2>
    <p>${escape(message)}</p>
    <p class="muted small">No result is shown when the model service fails. Nothing was estimated in the browser.</p>
    <button type="button" class="btn" data-action="retry">Try again</button>
  </div>`;
}

export const emptyPanel = (): string => `<div class="result" data-state="empty">
  <h2 class="result-head">No analysis yet</h2>
  <p class="muted">Add an ultrasound image and run the analysis. The result, the image type and any warnings appear here.</p>
</div>`;

export const loadingPanel = (): string => `<div class="result" data-state="loading" aria-busy="true">
  <h2 class="result-head">Running the image models…</h2>
  <div class="class-bar is-loading" aria-hidden="true"><span class="seg"></span></div>
  <p class="muted small">The first run after the service wakes up can take up to a minute.</p>
</div>`;

// ---------------------------------------------------------------- history

export function historyList(entries: HistoryEntry[], total: number): string {
  if (total === 0) return `<p class="muted" data-state="empty">No analyses yet. Runs you make in this browser are listed here.</p>`;
  if (entries.length === 0) return `<p class="muted" data-state="empty">No analyses match your search.</p>`;
  const rows = entries
    .map(
      (e) => `<tr>
        <td><span class="cell-main">${escape(e.file)}</span><span class="cell-sub muted">${escape(when(e.at))}</span></td>
        <td>${e.prediction ? `<span class="pill" data-tone="${e.prediction === 'Malignant' ? 'negative' : 'neutral'}">${e.prediction}</span>` : '<span class="muted">No result</span>'}</td>
        <td class="num">${e.confidence === null ? '<span class="muted">—</span>' : pct(e.confidence)}</td>
      </tr>`,
    )
    .join('');
  return `<table class="history-table"><thead><tr><th scope="col">Image</th><th scope="col">Result</th><th scope="col" class="num">Score</th></tr></thead><tbody>${rows}</tbody></table>`;
}

import './styles/tokens.css';
import './styles/app.css';
import './styles/print.css';

import { ApiError, getHealth, predict } from './api';
import { BIRADS, DENSITY_GROUPS, MARGINS, SHAPES, type Option } from './clinical';
import { pct } from './format';
import * as history from './history';
import {
  checksLedger,
  emptyPanel,
  errorPanel,
  historyList,
  loadingPanel,
  resultPanel,
  statusChip,
  type ServiceState,
} from './render';
import { readClinical } from './form';
import type { PredictResponse } from './types';

const MAX_BYTES = 10 * 1024 * 1024;
const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;

const form = $<HTMLFormElement>('case-form');
const input = $<HTMLInputElement>('image-input');
const preview = $<HTMLImageElement>('preview');
const drop = $('drop');
const runBtn = $<HTMLButtonElement>('run');
const printBtn = $<HTMLButtonElement>('print-report');
const resultEl = $('result');
const checksEl = $('checks');
const statusEl = $('service-status');
const drawer = $<HTMLDialogElement>('history');
const confirmDlg = $<HTMLDialogElement>('confirm');
const historySearch = $<HTMLInputElement>('history-search');

let image: File | null = null;
let previewUrl: string | null = null;
let running = false;
let service: ServiceState = { kind: 'checking' };
let entries = history.load();

// ---------------------------------------------------------------- form options

function fillOptions(): void {
  const opts = (list: Option[]) => list.map((o) => new Option(o.label, o.value));
  form.querySelectorAll<HTMLSelectElement>('select[data-options]').forEach((sel) => {
    const kind = sel.dataset.options;
    if (kind === 'birads') sel.append(...opts(BIRADS));
    if (kind === 'shape') sel.append(...opts(SHAPES));
    if (kind === 'margin') sel.append(...opts(MARGINS));
    if (kind === 'density') {
      sel.append(new Option('Not assessed', 'unknown'));
      for (const g of DENSITY_GROUPS) {
        const group = document.createElement('optgroup');
        group.label = g.label;
        group.append(...opts(g.options));
        sel.append(group);
      }
    }
  });
}

// ---------------------------------------------------------------- image

function showError(id: string, message: string | null): void {
  const el = $(id);
  el.textContent = message ?? '';
  el.hidden = !message;
}

function setImage(file: File | null): void {
  showError('image-error', null);
  if (file && !file.type.startsWith('image/')) return showError('image-error', 'That file is not an image.');
  if (file && file.size > MAX_BYTES) return showError('image-error', 'The image is larger than 10 MB.');
  image = file;
  if (previewUrl) URL.revokeObjectURL(previewUrl);
  previewUrl = file ? URL.createObjectURL(file) : null;
  preview.hidden = !file;
  preview.src = previewUrl ?? '';
  preview.alt = file ? `Selected image: ${file.name}` : '';
  $('drop-empty').hidden = !!file;
  drop.dataset.filled = String(!!file);
  $('file-row').hidden = !file;
  $('file-name').textContent = file ? `${file.name} · ${(file.size / 1024).toFixed(0)} KB` : '';
  if (!file) input.value = '';
  syncRun();
}

input.addEventListener('change', () => setImage(input.files?.[0] ?? null));
$('clear-image').addEventListener('click', () => setImage(null));
for (const type of ['dragenter', 'dragover'] as const) {
  drop.addEventListener(type, (e) => {
    e.preventDefault();
    drop.dataset.over = 'true';
  });
}
for (const type of ['dragleave', 'drop'] as const) {
  drop.addEventListener(type, () => delete drop.dataset.over);
}
drop.addEventListener('drop', (e) => {
  e.preventDefault();
  const file = e.dataTransfer?.files?.[0];
  if (file) setImage(file);
});

$<HTMLSelectElement>('sample').addEventListener('change', async (e) => {
  const sel = e.currentTarget as HTMLSelectElement;
  const name = sel.value;
  sel.value = '';
  if (!name) return;
  try {
    const res = await fetch(`${import.meta.env.BASE_URL}samples/${name}`);
    if (!res.ok) throw new Error();
    setImage(new File([await res.blob()], name, { type: 'image/png' }));
  } catch {
    showError('image-error', 'The sample image could not be loaded.');
  }
});

// ---------------------------------------------------------------- clinical

$('clear-clinical').addEventListener('click', () => {
  form.querySelectorAll<HTMLInputElement | HTMLSelectElement>('#clinical input, #clinical select').forEach((el) => {
    if (el instanceof HTMLInputElement && el.type === 'checkbox') el.checked = false;
    else el.value = el instanceof HTMLSelectElement && el.name !== 'birads' ? 'unknown' : '';
  });
  showError('clinical-error', null);
});

// ---------------------------------------------------------------- run

function syncRun(): void {
  runBtn.disabled = running || !image;
  runBtn.textContent = running ? 'Analysing…' : 'Run analysis';
  runBtn.setAttribute('aria-busy', String(running));
}

let lastResponse: PredictResponse | null = null;

async function run(): Promise<void> {
  if (!image || running) return;
  const { data: clinical, error } = readClinical(form);
  showError('clinical-error', error);
  if (error) {
    ($('clinical') as HTMLDetailsElement).open = true;
    return;
  }
  running = true;
  syncRun();
  resultEl.innerHTML = loadingPanel();
  try {
    const res = await predict(image, clinical);
    lastResponse = res;
    resultEl.innerHTML = resultPanel(res);
    entries = history.add(history.entryFrom(res, image.name, clinical), entries);
    history.save(entries);
    renderHistory();
    printBtn.disabled = false;
    $('print-meta').textContent = `${image.name} · ${new Date().toLocaleString()} · model ${res.model_revision.slice(0, 8)}${
      res.result ? ` · ${res.result.prediction} ${pct(res.result.confidence)}` : ''
    }`;
  } catch (err) {
    lastResponse = null;
    printBtn.disabled = true;
    const message = err instanceof ApiError ? err.message : 'Something went wrong while running the analysis.';
    resultEl.innerHTML = errorPanel(message);
  } finally {
    running = false;
    syncRun();
  }
}

form.addEventListener('submit', (e) => {
  e.preventDefault();
  void run();
});
resultEl.addEventListener('click', (e) => {
  if ((e.target as HTMLElement).closest('[data-action="retry"]')) void run();
});
printBtn.addEventListener('click', () => {
  if (lastResponse) window.print();
});

// ---------------------------------------------------------------- health

let failures = 0;
let timer: number | undefined;

async function checkHealth(): Promise<void> {
  window.clearTimeout(timer);
  try {
    const health = await getHealth(AbortSignal.timeout(15000));
    service = { kind: 'up', health };
    failures = 0;
  } catch (err) {
    failures += 1;
    service = { kind: 'down', message: err instanceof ApiError ? err.message : 'The model service did not answer.' };
  }
  const chip = statusChip(service);
  statusEl.textContent = chip.text;
  statusEl.dataset.tone = chip.tone;
  checksEl.innerHTML = checksLedger(service);
  const starting = service.kind === 'up' && service.health.status === 'starting';
  // Poll often while the models load, every minute when settled, back off after repeated failures.
  const delay = starting ? 5000 : failures >= 3 ? 600000 : 60000;
  if (!document.hidden) timer = window.setTimeout(checkHealth, delay);
}

document.addEventListener('visibilitychange', () => {
  if (document.hidden) window.clearTimeout(timer);
  else void checkHealth();
});

// ---------------------------------------------------------------- history drawer

function renderHistory(): void {
  $('history-list').innerHTML = historyList(history.filter(entries, historySearch.value), entries.length);
  $<HTMLButtonElement>('export-csv').disabled = entries.length === 0;
  $<HTMLButtonElement>('clear-history').disabled = entries.length === 0;
}

$('open-history').addEventListener('click', () => {
  renderHistory();
  drawer.showModal();
});
historySearch.addEventListener('input', renderHistory);
$('export-csv').addEventListener('click', () => {
  const blob = new Blob([history.toCsv(entries)], { type: 'text/csv' });
  const a = Object.assign(document.createElement('a'), {
    href: URL.createObjectURL(blob),
    download: `jvision-history-${new Date().toISOString().slice(0, 10)}.csv`,
  });
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
});
$('clear-history').addEventListener('click', () => confirmDlg.showModal());
$('confirm-clear').addEventListener('click', () => {
  entries = [];
  history.save(entries);
  renderHistory();
  confirmDlg.close();
});
for (const dlg of [drawer, confirmDlg]) {
  dlg.addEventListener('click', (e) => {
    const t = e.target as HTMLElement;
    if (t === dlg || t.closest('[data-close]')) dlg.close();
  });
}

// ---------------------------------------------------------------- theme

const themeBtn = $<HTMLButtonElement>('theme-toggle');
function applyTheme(theme: 'light' | 'dark'): void {
  document.documentElement.dataset.theme = theme;
  themeBtn.setAttribute('aria-label', theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme');
  try {
    localStorage.setItem('jvision:theme', theme);
  } catch {
    /* ignore */
  }
}
themeBtn.addEventListener('click', () =>
  applyTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'),
);
themeBtn.setAttribute(
  'aria-label',
  document.documentElement.dataset.theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme',
);

// ---------------------------------------------------------------- start

fillOptions();
resultEl.innerHTML = emptyPanel();
checksEl.innerHTML = checksLedger(service);
syncRun();
void checkHealth();

import { basisSentence, capitalise, escape, pct } from '../format';
import { CLASS_ORDER, type ExpertResult, type PredictResponse } from '../types';

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

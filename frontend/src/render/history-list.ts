import { escape, pct, when } from '../format';
import type { HistoryEntry } from '../history';

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

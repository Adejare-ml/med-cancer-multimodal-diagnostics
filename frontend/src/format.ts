export const escape = (s: unknown): string =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

/** 0.8932 -> "89.3%". One decimal everywhere probabilities are shown. */
export const pct = (p: number): string => `${(p * 100).toFixed(1)}%`;

export const capitalise = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1);

export const shortRevision = (sha: string): string => sha.slice(0, 8);

export function when(iso: string, now: Date = new Date()): string {
  const d = new Date(iso);
  const time = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const sameDay = d.toDateString() === now.toDateString();
  return sameDay ? `Today ${time}` : `${d.toISOString().slice(0, 10)} ${time}`;
}

const BASIS_WORDS: Record<string, string> = {
  ultrasound: 'the ultrasound model',
  mammogram: 'the mammogram model',
  clinical: 'the clinical model',
};

export function basisSentence(basis: string[]): string {
  const words = basis.map((b) => BASIS_WORDS[b] ?? b);
  if (words.length <= 1) return `From ${words[0] ?? 'no model'}.`;
  return `Average of ${words.slice(0, -1).join(', ')} and ${words[words.length - 1]}.`;
}

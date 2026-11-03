import type { ClinicalData } from './types';

/** Reads the optional clinical section. Returns null data when nothing was filled in. */
export function readClinical(f: HTMLFormElement): { data: ClinicalData | null; error: string | null } {
  const fd = new FormData(f);
  const text = (k: string) => String(fd.get(k) ?? '').trim();
  const ageRaw = text('age');
  const biradsRaw = text('birads');
  const touched =
    ageRaw !== '' ||
    biradsRaw !== '' ||
    text('lesion_size_mm') !== '' ||
    ['shape', 'margin', 'density'].some((k) => text(k) !== 'unknown' && text(k) !== '') ||
    ['calcifications', 'family_history', 'prior_biopsy'].some((k) => fd.has(k));
  if (!touched) return { data: null, error: null };
  if (ageRaw === '' || biradsRaw === '') {
    return { data: null, error: 'To record clinical details, give at least the age and the BI-RADS category.' };
  }
  const age = Number(ageRaw);
  if (!Number.isFinite(age) || age < 18 || age > 110) return { data: null, error: 'Age must be between 18 and 110.' };
  const size = text('lesion_size_mm') === '' ? 0 : Number(text('lesion_size_mm'));
  if (!Number.isFinite(size) || size < 0 || size > 200) return { data: null, error: 'Lesion size must be between 0 and 200 mm.' };
  return {
    error: null,
    data: {
      age,
      birads: Number(biradsRaw),
      shape: text('shape') || 'unknown',
      margin: text('margin') || 'unknown',
      density: text('density') || 'unknown',
      calcifications: fd.has('calcifications'),
      lesion_size_mm: size,
      family_history: fd.has('family_history'),
      prior_biopsy: fd.has('prior_biopsy'),
    },
  };
}

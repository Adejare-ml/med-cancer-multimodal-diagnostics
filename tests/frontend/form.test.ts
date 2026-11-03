import { describe, expect, it } from 'vitest';
import { readClinical } from '../../frontend/src/form';

function form(fields: Record<string, string | boolean>): HTMLFormElement {
  const f = document.createElement('form');
  const defaults: Record<string, string | boolean> = {
    age: '', birads: '', shape: 'unknown', margin: 'unknown', density: 'unknown', lesion_size_mm: '',
    calcifications: false, family_history: false, prior_biopsy: false,
  };
  for (const [name, value] of Object.entries({ ...defaults, ...fields })) {
    const input = document.createElement('input');
    input.name = name;
    if (typeof value === 'boolean') {
      input.type = 'checkbox';
      input.checked = value;
    } else input.value = value;
    f.append(input);
  }
  return f;
}

describe('readClinical', () => {
  it('sends nothing when the section is untouched', () => {
    expect(readClinical(form({}))).toEqual({ data: null, error: null });
  });

  it('needs age and BI-RADS once anything is filled in', () => {
    expect(readClinical(form({ shape: 'oval' })).error).toMatch(/age and the BI-RADS/);
    expect(readClinical(form({ family_history: true })).error).toMatch(/age and the BI-RADS/);
  });

  it('checks ranges', () => {
    expect(readClinical(form({ age: '12', birads: '3' })).error).toMatch(/Age/);
    expect(readClinical(form({ age: '40', birads: '3', lesion_size_mm: '900' })).error).toMatch(/Lesion size/);
  });

  it('builds the payload the API expects', () => {
    const { data } = readClinical(form({ age: '58', birads: '4', shape: 'irregular', margin: 'spiculated', calcifications: true, lesion_size_mm: '24.5' }));
    expect(data).toEqual({
      age: 58, birads: 4, shape: 'irregular', margin: 'spiculated', density: 'unknown',
      calcifications: true, lesion_size_mm: 24.5, family_history: false, prior_biopsy: false,
    });
  });
});

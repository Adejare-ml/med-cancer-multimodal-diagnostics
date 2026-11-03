import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { MARGINS, SHAPES, allDensities } from '../../frontend/src/clinical';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (p: string) => readFileSync(join(root, p), 'utf8');

function enumValues(py: string, name: string): string[] {
  const block = py.split(`class ${name}(str, Enum):`)[1].split(/\nclass /)[0];
  return [...block.matchAll(/^\s+\w+ = "([\w-]+)"/gm)].map((m) => m[1]).sort();
}

describe('frontend and backend agree', () => {
  const schemas = read('src/app/schemas.py');

  it('offers exactly the clinical values the API accepts', () => {
    expect(SHAPES.map((o) => o.value).sort()).toEqual(enumValues(schemas, 'Shape'));
    expect(MARGINS.map((o) => o.value).sort()).toEqual(enumValues(schemas, 'Margin'));
    expect(allDensities().sort()).toEqual(enumValues(schemas, 'Density'));
  });

  it('uses the same API version', () => {
    const py = read('src/app/__init__.py').match(/__version__ = "([\d.]+)"/)?.[1];
    expect(JSON.parse(read('package.json')).version).toBe(py);
  });
});

describe('no unbacked claims in the page', () => {
  const html = read('frontend/index.html');
  const sources = ['render.ts', 'main.ts', 'format.ts'].map((f) => read(`frontend/src/${f}`)).join('\n');

  it('ships no percentage or accuracy figure in markup', () => {
    const text = html.replace(/<[^>]+>/g, ' ');
    expect(text).not.toMatch(/\d+(\.\d+)?\s*%/);
    expect(text).not.toMatch(/\b(accuracy|acc|auc|sensitivity|specificity|f1)\b/i);
  });

  it('removed the old simulated features for good', () => {
    for (const banned of [/simulateClientInference/, /Grad-?CAM/i, /\bSHAP\b/, /tumou?r board/i, /DICOM SR/i, /OncoBot/i, /Enterprise/i]) {
      expect(html + sources).not.toMatch(banned);
    }
  });

  it('never invents a result in the browser', () => {
    expect(sources).not.toMatch(/Math\.random\(\)[^\n]*prob/i);
    expect(read('frontend/src/api.ts')).not.toMatch(/fallback/i);
  });
});

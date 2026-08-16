import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const html = readFileSync(join(here, '..', 'frontend', 'index.html'), 'utf8');
const script = readFileSync(join(here, '..', 'frontend', 'script.js'), 'utf8');

/**
 * The interface may not present a number as a measured quantity unless
 * something actually measures it. A figure hardcoded into markup looks
 * identical to a computed one on screen, so the only durable guard is
 * structural: if an element ships with a numeric claim baked in, code must
 * demonstrably write to that element.
 */
describe('no fabricated numeric claims in markup', () => {
    // <span id="foo">99.8%</span> -> {id: 'foo', text: '99.8%'}
    const idWithText = [...html.matchAll(/<(\w+)[^>]*\bid="([\w-]+)"[^>]*>([^<]*)</g)]
        .map(m => ({ id: m[2], text: m[3].trim() }));

    const NUMERIC_CLAIM = /\d+(\.\d+)?\s*%|\b\d+\.\d+\b/;

    const claims = idWithText.filter(el => NUMERIC_CLAIM.test(el.text));

    it('every baked-in numeric value is written by script.js', () => {
        const orphans = claims.filter(el => !script.includes(el.id));
        expect(
            orphans.map(o => `#${o.id} shows "${o.text}" but nothing writes to it`)
        ).toEqual([]);
    });

    it('does not advertise a confidence figure for a classifier that never runs', () => {
        // The modality label is derived from image orientation (width > height).
        // No trained modality classifier exists in the served path, so no
        // accuracy or confidence figure may be attached to it.
        expect(html).not.toMatch(/ResNet[^<]*Confidence/i);
        expect(html).not.toMatch(/99\.8\s*%/);
    });

    it('does not state an accuracy figure anywhere in static markup', () => {
        const accuracyClaims = [...html.matchAll(/([^<>]{0,60}\b\d{2,3}(\.\d+)?\s*%[^<>]{0,40})/g)]
            .map(m => m[1].trim())
            .filter(t => /accuracy|confidence|precision|recall|sensitivit|specificit/i.test(t));
        expect(accuracyClaims).toEqual([]);
    });
});

import { describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const AnalysisBasis = require('../frontend/analysis-basis.js');

/** Flattens a row group to searchable text so assertions read as prose. */
const text = rows => rows.map(r => [r.label, r.value, r.note].filter(Boolean).join(' ')).join('\n');
const says = (rows, phrase) => text(rows).includes(phrase);

/** The nine fields with the form's own defaults; shape/margin/density start "unknown". */
function defaultClinical(overrides = {}) {
    const base = {
        age: '50', birads: '3', shape: 'unknown', margin: 'unknown', density: 'unknown',
        calcifications: 'none', lesion_size_mm: '15', family_history: 'no', prior_biopsy: 'no'
    };
    return Object.entries({ ...base, ...overrides }).map(([id, value]) => ({ id, value }));
}

const ruleBasedResult = (over = {}) => ({
    prediction: 'Benign',
    confidence: 0.83,
    probabilities: { Malignant: 0.12, Benign: 0.83, Normal: 0.05 },
    transport: 'client',
    ...over
});

describe('supplied-value detection', () => {
    it('treats blank and the "unknown" placeholder as not supplied', () => {
        expect(AnalysisBasis.isSupplied('oval')).toBe(true);
        expect(AnalysisBasis.isSupplied('')).toBe(false);
        expect(AnalysisBasis.isSupplied('   ')).toBe(false);
        expect(AnalysisBasis.isSupplied('unknown')).toBe(false);
        expect(AnalysisBasis.isSupplied('Unknown')).toBe(false);
        expect(AnalysisBasis.isSupplied(undefined)).toBe(false);
    });
});

describe('clinical evidence', () => {
    it('counts completeness over all nine fields', () => {
        const b = AnalysisBasis.collect({
            mode: 'combined', clinical: defaultClinical(), image: null, result: ruleBasedResult()
        });
        // shape, margin and density default to "unknown" -> 6 of 9.
        expect(b.summary.suppliedCount).toBe(6);
        expect(b.summary.missingCount).toBe(3);
        expect(b.summary.completeness).toBe(67);
        expect(says(b.input, 'Shape, Margin, Density / echogenicity')).toBe(true);
    });

    it('marks supplied fields the scorer never reads', () => {
        const b = AnalysisBasis.collect({
            mode: 'clinical', clinical: defaultClinical(), image: null, result: ruleBasedResult()
        });
        expect(says(b.clinical, '4 supplied field(s) did not influence the score.')).toBe(true);
        expect(says(b.clinical, 'Only Age, BI-RADS, Shape, Margin, Density / echogenicity enter the calculation.')).toBe(true);
        // Recorded-but-unused fields are shown, flagged as not read.
        const lesion = b.clinical.find(r => r.label === 'Lesion size (mm):');
        expect(lesion.note).toBe('Recorded, but not read by the scoring function.');
    });
});

describe('engine provenance', () => {
    it('reports the in-browser fallback when the request never reached the server', () => {
        const b = AnalysisBasis.collect({
            mode: 'clinical', clinical: defaultClinical(), image: null,
            result: ruleBasedResult({ transport: 'client' })
        });
        expect(says(b.output, 'in-browser fallback engine')).toBe(true);
        expect(says(b.limits, 'This result never reached the server.')).toBe(true);
    });

    it('drops the fallback caveat when the backend answered', () => {
        const b = AnalysisBasis.collect({
            mode: 'clinical', clinical: defaultClinical(), image: null,
            result: ruleBasedResult({ transport: 'backend' })
        });
        expect(says(b.output, 'backend /predict endpoint')).toBe(true);
        expect(says(b.limits, 'never reached the server')).toBe(false);
    });

    it('defers to backend engine metadata instead of assuming rule-based', () => {
        const b = AnalysisBasis.collect({
            mode: 'combined', clinical: defaultClinical(), image: null,
            result: ruleBasedResult({
                transport: 'backend',
                engine: {
                    type: 'medclip_tabnet_late_fusion',
                    trained_model_loaded: true,
                    image_used_for_scoring: true,
                    calibrated: true,
                    scoring_inputs_used: ['age', 'birads', 'shape', 'margin', 'density',
                                          'calcifications', 'lesion_size_mm', 'family_history', 'prior_biopsy']
                }
            })
        });
        // Standing caveats about the rule engine must not survive a real model.
        expect(says(b.limits, 'hand-set rules')).toBe(false);
        expect(says(b.limits, 'does not affect the result')).toBe(false);
        expect(says(b.limits, 'not calibrated')).toBe(false);
        expect(says(b.output, 'medclip_tabnet_late_fusion')).toBe(true);
    });
});

describe('class scores', () => {
    it('flags scores that do not sum to a distribution', () => {
        const b = AnalysisBasis.collect({
            mode: 'clinical', clinical: defaultClinical(), image: null,
            result: ruleBasedResult({ probabilities: { Malignant: 0.9, Benign: 0.9, Normal: 0.1 } })
        });
        expect(says(b.output, 'do not form a probability distribution')).toBe(true);
    });

    it('stays quiet when they do sum to one', () => {
        const b = AnalysisBasis.collect({
            mode: 'clinical', clinical: defaultClinical(), image: null, result: ruleBasedResult()
        });
        expect(says(b.output, 'do not form a probability distribution')).toBe(false);
    });
});

describe('image evidence', () => {
    it('describes a decoded image without claiming the model looked at it', () => {
        const b = AnalysisBasis.collect({
            mode: 'combined', clinical: defaultClinical(),
            image: { name: 'scan.png', type: 'image/png', size: 204800, decoded: { width: 800, height: 600 }, roiDrawn: false },
            result: ruleBasedResult()
        });
        expect(says(b.image, '800 x 600 px')).toBe(true);
        expect(says(b.image, 'Ultrasound (USG)')).toBe(true);
        expect(says(b.image, 'Derived from image orientation')).toBe(true);
        expect(says(b.image, 'Image pixels did not contribute to the classification score.')).toBe(true);
    });

    // Finding 1: the submit handler uploads imageInput.files[0] regardless of
    // whether img.onload has fired, so decoding must not gate the claim that a
    // file was analysed.
    it('does not deny an image that was uploaded but never decoded', () => {
        const b = AnalysisBasis.collect({
            mode: 'combined', clinical: defaultClinical(),
            image: { name: 'large.tif', type: 'image/tiff', size: 9437184, decoded: null, roiDrawn: false },
            result: ruleBasedResult()
        });

        expect(b.summary.imageSubmitted).toBe(true);
        expect(b.summary.imageDecoded).toBe(false);
        expect(says(b.image, 'No image was submitted with this case.')).toBe(false);
        expect(says(b.limits, 'No image was analysed for this case.')).toBe(false);
        expect(says(b.input, 'Multimodal mode was selected, but no image was supplied.')).toBe(false);
        // It should say what it does know: the file went out, the preview did not.
        expect(says(b.image, 'large.tif')).toBe(true);
        expect(says(b.image, 'could not be decoded for preview')).toBe(true);
    });

    it('still reports a genuinely absent image', () => {
        const b = AnalysisBasis.collect({
            mode: 'combined', clinical: defaultClinical(), image: null, result: ruleBasedResult()
        });
        expect(b.summary.imageSubmitted).toBe(false);
        expect(says(b.image, 'No image was submitted with this case.')).toBe(true);
        expect(says(b.limits, 'No image was analysed for this case.')).toBe(true);
    });
});

describe('result status', () => {
    it('always labels the output as non-diagnostic', () => {
        const b = AnalysisBasis.collect({
            mode: 'combined', clinical: defaultClinical(), image: null, result: ruleBasedResult()
        });
        expect(b.status).toContain('AI-generated');
        expect(b.status).toContain('Not a diagnosis');
        expect(b.status).toContain('Requires professional interpretation');
    });
});

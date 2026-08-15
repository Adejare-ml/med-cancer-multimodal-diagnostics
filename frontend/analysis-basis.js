/**
 * ANALYSIS BASIS - EVIDENCE COLLECTION
 *
 * Pure logic behind the "Analysis Basis" panel: given a snapshot of what was
 * submitted and what came back, decide what can honestly be said about the
 * result. No DOM access lives here, so the rules are testable in isolation;
 * script.js supplies the snapshot and renders the rows.
 *
 * Contract: a row is only emitted for something present in the snapshot. If a
 * fact cannot be established from the snapshot it is reported as unknown or
 * absent, never assumed.
 */
(function (root, factory) {
    if (typeof module === 'object' && module.exports) {
        module.exports = factory();
    } else {
        root.AnalysisBasis = factory();
    }
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {

    // The nine collected clinical fields.
    const CLINICAL_FIELDS = [
        { id: 'age',            label: 'Age' },
        { id: 'birads',         label: 'BI-RADS' },
        { id: 'shape',          label: 'Shape' },
        { id: 'margin',         label: 'Margin' },
        { id: 'density',        label: 'Density / echogenicity' },
        { id: 'calcifications', label: 'Calcifications' },
        { id: 'lesion_size_mm', label: 'Lesion size (mm)' },
        { id: 'family_history', label: 'Family history' },
        { id: 'prior_biopsy',   label: 'Prior biopsy' }
    ];

    // Of those nine, only these five are read by the scoring function. The
    // backend /predict endpoint and the in-browser fallback both use exactly
    // this set; the rest are collected but do not move the score.
    const SCORING_FIELDS = ['age', 'birads', 'shape', 'margin', 'density'];

    const MODE_NAMES = {
        combined:   'Multimodal (image + clinical)',
        radiomics:  'Multimodal (image + clinical)',
        ultrasound: 'Image only (ultrasound)',
        mammogram:  'Image only (mammogram)',
        clinical:   'Clinical data only'
    };

    function row(state, label, value, note) {
        return { state: state, label: label, value: value || '', note: note || '' };
    }

    function fieldLabel(id) {
        const match = CLINICAL_FIELDS.filter(f => f.id === id)[0];
        return match ? match.label.replace(/ \(mm\)$/, '') : id;
    }

    /** A value counts as supplied unless it is blank or an explicit "unknown". */
    function isSupplied(raw) {
        const v = String(raw === undefined || raw === null ? '' : raw).trim();
        return v !== '' && v.toLowerCase() !== 'unknown';
    }

    /**
     * @param {object} snapshot
     *   mode      - selected analysis mode id
     *   clinical  - [{id, value}] raw form values, before scoring defaults
     *   image     - {name, type, size, decoded:{width,height}|null, roiDrawn} or null
     *               `image` is non-null whenever a file was selected for upload,
     *               even if the browser has not decoded it.
     *   result    - {prediction, confidence, probabilities, engine, transport}
     */
    function collect(snapshot) {
        const s = snapshot || {};
        const result = s.result || {};
        const engine = result.engine || null;

        const trainedModel = !!(engine && engine.trained_model_loaded === true);
        const imageScores = !!(engine && engine.image_used_for_scoring === true);
        const calibrated = !!(engine && engine.calibrated === true);
        const scoringFields = (engine && Array.isArray(engine.scoring_inputs_used) && engine.scoring_inputs_used.length)
            ? engine.scoring_inputs_used
            : SCORING_FIELDS;

        const raw = s.clinical || [];
        const clinical = CLINICAL_FIELDS.map(f => {
            const entry = raw.filter(c => c.id === f.id)[0];
            const value = entry ? entry.value : '';
            return {
                id: f.id,
                label: f.label,
                value: value,
                supplied: isSupplied(value),
                usedInScore: scoringFields.indexOf(f.id) !== -1
            };
        });
        const supplied = clinical.filter(c => c.supplied);
        const missing = clinical.filter(c => !c.supplied);
        const completeness = Math.round((supplied.length / clinical.length) * 100);

        const img = s.image || null;
        // Whether a file was sent to the analyser, independent of decoding.
        const imageSubmitted = !!img;
        // Whether the browser decoded it, which is what pixel-level rows need.
        const imageDecoded = !!(img && img.decoded);
        const transportIsLocal = result.transport !== 'backend';

        // ---------- INPUT ----------
        const input = [];
        input.push(row('info', 'Selected mode:', MODE_NAMES[s.mode] || s.mode || 'unknown'));
        input.push(imageSubmitted
            ? row('ok', 'Image:', 'supplied')
            : row('absent', 'Image:', 'not supplied'));
        input.push(supplied.length
            ? row('ok', 'Clinical fields:', supplied.length + ' of ' + clinical.length + ' supplied',
                  'Input completeness ' + completeness + '%')
            : row('absent', 'Clinical fields:', 'none supplied'));

        if ((s.mode === 'combined' || s.mode === 'radiomics') && !imageSubmitted) {
            input.push(row('warn', 'Multimodal mode was selected, but no image was supplied.', '',
                'This result rests on the clinical fields alone.'));
        }
        if ((s.mode === 'ultrasound' || s.mode === 'mammogram') && supplied.length && !imageScores) {
            input.push(row('warn', 'Image-only mode was selected, but the score still came from clinical fields.', '',
                'The scoring function reads no image data in any mode.'));
        }
        if (missing.length) {
            input.push(row('absent', 'Not supplied:', missing.map(m => m.label).join(', ')));
        }

        // ---------- IMAGE EVIDENCE ----------
        const image = [];
        if (imageSubmitted) {
            image.push(row('ok', 'File:', img.name + ' (' + (img.type || 'type unreported') + ')'));
            if (typeof img.size === 'number') {
                image.push(row('ok', 'Size:', (img.size / 1024).toFixed(0) + ' KB'));
            }

            if (imageDecoded) {
                image.push(row('ok', 'Decoded:', img.decoded.width + ' x ' + img.decoded.height + ' px'));
                const orientation = img.decoded.width > img.decoded.height ? 'Ultrasound (USG)' : 'Mammogram (MX)';
                image.push(row('warn', 'Modality label:', orientation,
                    'Derived from image orientation (width vs. height) only. No trained modality classifier runs here.'));
                image.push(img.roiDrawn
                    ? row('ok', 'Region of interest:', 'drawn by user',
                          'Measurements are user-defined, not model-detected.')
                    : row('absent', 'Region of interest:', 'not drawn'));
            } else {
                // The file was uploaded but this browser never decoded it, so
                // nothing pixel-derived can be stated about it here.
                image.push(row('warn', 'Not displayed in this browser.', '',
                    'The file was sent for analysis, but could not be decoded for preview, so no dimensions, orientation or region measurements are available.'));
            }

            if (!imageScores) {
                image.push(row('warn', 'No lesion detection or segmentation was performed on this image.', '',
                    'Image pixels did not contribute to the classification score.'));
            }
        } else {
            image.push(row('absent', 'No image was submitted with this case.'));
            image.push(row('info', 'No image-derived evidence is available for this result.'));
        }

        // ---------- CLINICAL EVIDENCE ----------
        const clinicalRows = [];
        if (!supplied.length) {
            clinicalRows.push(row('absent', 'No clinical values were supplied.'));
        } else {
            supplied.forEach(c => {
                clinicalRows.push(c.usedInScore
                    ? row('ok', c.label + ':', c.value)
                    : row('absent', c.label + ':', c.value,
                          'Recorded, but not read by the scoring function.'));
            });
        }
        const unusedSupplied = supplied.filter(c => !c.usedInScore);
        if (unusedSupplied.length) {
            clinicalRows.push(row('warn',
                unusedSupplied.length + ' supplied field(s) did not influence the score.', '',
                'Only ' + scoringFields.map(fieldLabel).join(', ') + ' enter the calculation.'));
        }

        // ---------- MODEL OUTPUT ----------
        const output = [];
        output.push(row('info', 'Result:', result.prediction));
        if (typeof result.confidence === 'number') {
            output.push(row('info', 'Score:', (result.confidence * 100).toFixed(1) + '%',
                calibrated ? 'Calibrated probability.' : 'Raw scoring output. Not a calibrated probability.'));
        }

        const probs = result.probabilities || {};
        const probKeys = Object.keys(probs);
        if (probKeys.length) {
            output.push(row('info', 'Class scores:',
                probKeys.map(k => k + ' ' + (probs[k] * 100).toFixed(1) + '%').join('  |  ')));

            // The class scores are built by clipped arithmetic, so they are not
            // guaranteed to sum to 1.
            const probSum = probKeys.reduce((acc, k) => acc + Number(probs[k] || 0), 0);
            if (Math.abs(probSum - 1) > 0.01) {
                output.push(row('warn', 'Class scores sum to', probSum.toFixed(3),
                    'They do not form a probability distribution and should not be read as one.'));
            }
        }

        output.push(transportIsLocal
            ? row('warn', 'Produced by:', 'in-browser fallback engine',
                  'The backend API was unreachable, so the score was computed locally in this page.')
            : row('info', 'Produced by:', 'backend /predict endpoint'));

        output.push(trainedModel
            ? row('info', 'Engine type:', engine.type || 'trained model')
            : row('warn', 'Engine type:', 'fixed rule-based scoring function',
                  'A deterministic set of weighted rules over ' + scoringFields.length +
                  ' clinical fields. No trained model is executed in this path.'));

        // ---------- WHERE THIS MAY FAIL ----------
        // Conditions specific to this run first, then the standing limits.
        const limits = [];
        if (transportIsLocal) {
            limits.push(row('warn', 'This result never reached the server.', '',
                'It was computed entirely in the browser after the backend failed to respond.'));
        }
        if (!imageSubmitted) {
            limits.push(row('warn', 'No image was analysed for this case.'));
        }
        if (missing.length) {
            limits.push(row('warn',
                missing.length + ' clinical field(s) were left empty and were replaced by fixed defaults.', '',
                'Missing values are substituted silently, not imputed from data.'));
        }
        if (!trainedModel) {
            limits.push(row('warn', 'The score comes from hand-set rules, not from data.', '',
                'Weights such as "spiculated margin adds 0.32" are constants written into the source. They were not fitted to, or validated against, any dataset.'));
        }
        if (!imageScores) {
            limits.push(row('warn', 'The uploaded image does not affect the result.', '',
                'It is used for display, user-drawn measurement, and whole-image intensity statistics only.'));
        }
        if (!calibrated) {
            limits.push(row('warn', 'The confidence value is not calibrated.', '',
                'No reliability data exists for this engine, so a 90% score does not mean the result is correct 90% of the time.'));
        }
        limits.push(row('warn', 'The decision thresholds are fixed constants.', '',
            'They were not selected using a validation set or any clinical operating point.'));
        limits.push(row('warn', 'No performance evidence is available.', '',
            'Sensitivity, specificity, calibration and subgroup performance have not been measured for this engine.'));
        limits.push(row('warn', 'Radiomics values are whole-image statistics.', '',
            'They are not lesion segmentation output and do not describe the lesion specifically.'));
        limits.push(row('warn', 'Applicability to any individual has not been established.', '',
            'There is no evidence about which populations, devices or acquisition settings this engine holds for.'));

        const status = [
            'AI-generated',
            'Research & education only',
            'Not a diagnosis',
            'Requires professional interpretation'
        ];

        return {
            input: input,
            image: image,
            clinical: clinicalRows,
            output: output,
            limits: limits,
            status: status,
            summary: {
                mode: s.mode,
                imageSubmitted: imageSubmitted,
                imageDecoded: imageDecoded,
                suppliedCount: supplied.length,
                missingCount: missing.length,
                completeness: completeness,
                trainedModel: trainedModel,
                transportIsLocal: transportIsLocal
            }
        };
    }

    return {
        CLINICAL_FIELDS: CLINICAL_FIELDS,
        SCORING_FIELDS: SCORING_FIELDS,
        fieldLabel: fieldLabel,
        isSupplied: isSupplied,
        collect: collect
    };
}));

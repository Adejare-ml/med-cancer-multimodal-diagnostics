# Jvision rework — frontend + backend

**Product name: Jvision.** It replaces "OncoVision" everywhere: `<title>`, the top-bar wordmark and mark, `package.json` name (`jvision`), the FastAPI title ("Jvision API"), README, Space README title (replacing "Heart Disease Backend"), the print report header, CSV export filename (`jvision-history.csv`), `localStorage` keys (`jvision:history`, `jvision:theme`), and the canvas-design mark and social image. Version restarts at 3.0.0.

## Context
You asked for a full rework of the frontend and backend: remove redundant features and make the UI professional and clear, using the skills you named.

What exists today:
- **Frontend:** one static page (`frontend/index.html` 739 lines, `script.js` 1211, `style.css` 1367). About two-thirds of what it shows is fake or broken:
  - Fake content: SHAP numbers, a fictional "MDT tumor board", fake 3D slices, a fake compare view, a fake Grad-CAM, a keyword chatbot, fake DICOM SR, fake radiomics.
  - Dead buttons: webcam, Sheets sync, history search, the nav voice button.
  - A second scoring engine runs in the browser and silently replaces any server error.
  - The look is heavy glass with particles and orbs.
- **Backend in repo (`src/`):** its trained-model path can't run. `models/tabnet_combined_model.joblib` is a 2-byte placeholder, the paths are wrong and Docker leaves `models/` out. So every request is answered by hand-written rules, and those rules are duplicated with different numbers in the frontend.
- **Real model:** it runs on the Hugging Face Space `AdejareworkStudio/Breast_cancer_predictor` (live; `GET /` returns 200). Its design is different from the repo's:
  - A MedCLIP modality classifier that tells mammogram from ultrasound.
  - An EfficientNet-B0 specialist for each modality.
  - A 9-feature TabNet clinical model.
  - Late fusion that averages the two.
- **Space bugs found:**
  - `/health` returns 500: it reads `model_service.type_classifier`, but the attribute is `type_clf`.
  - CORS is `*`.
  - The README title says "Heart Disease Backend".
  - `image_type_classifier.pth` (98 MB) is never loaded.
- **Model red flag:** a clinical-only probe (age 58, BI-RADS 4, irregular, spiculated, 24 mm, family history) returned **Benign at 1.0 confidence**. The repo notebook labels the classes `{0 Normal, 1 Benign, 2 Malignant}`; the Space labels them `{0 Benign, 1 Malignant, 2 Normal}`. A label-order or feature-encoding mismatch is the likely cause. This must be checked before the UI shows any verdict.

Decisions you made: the Space's model is the real backend; Vite + TypeScript with no framework; a light clinical look with a dark toggle.

## Approach
Make the repo the single source of truth for the Space's code. `src/` becomes the cleaned Space service, the weights stay on the Hub, and a new frontend talks only to that API. There will be one scorer (the real models) and no fallbacks that pretend.

### 0. Process setup (10x-team + llm-council + find-skills)
- Create `.10x/` using the Discovery Protocol. Mark what was found as `[DISCOVERED]` and write:
  - the spec `.10x/specs/2026-11-03-rework-design.md`
  - ADR-001 "Repo owns the Space service; weights from the Hub"
  - ADR-002 "Vite + TS, no framework"
  - ADR-003 "No client-side scoring"
  - Commit these on a new branch `rework/v3`. You're on `master`; the main branch is `main`.
- Run `/llm-council` once on the cut list and the model red flag, to stress-test what goes before deleting anything.
- Run `/find-skills` for a Vite/TypeScript or accessibility-testing skill. Install only if one clearly helps.

### 1. Model check first (blocks the verdict UI)
- `scripts/probe_model.py`: about 8 reference cases, from clear benign (BI-RADS 2, oval, circumscribed) to clear malignant (BI-RADS 5, spiculated). Run them against the loaded predictor, print each expert's probabilities, and flag any case where an obviously malignant input comes out Benign above 0.9.
- Check the label order and the `SHAPE/MARGIN/DENSITY_MAP` encodings against how TabNet was trained. If the order is wrong, fix `LABELS`. If it can't be confirmed, the UI marks the clinical expert "unverified" and leaves it out of fusion until you confirm.

### 2. Backend rework (`src/`)
New layout. Each file has one job:
- `src/app/main.py`:
  - FastAPI with lifespan startup instead of `on_event`.
  - CORS read from `ALLOWED_ORIGINS`.
  - 10 MB upload cap and an image content-type check.
  - Routes `GET /health` (fixed: always 200 with per-model status) and `POST /predict`.
- `src/app/config.py`: settings from env vars (`ALLOWED_ORIGINS`, `MODEL_DIR`, `HF_MODEL_REPO`, `MAX_UPLOAD_MB`).
- `src/app/schemas.py`:
  - Pydantic v2.
  - `ClinicalData` uses enums whose values are exactly the keys of the encoding maps, so the form can't send a value the model doesn't know.
  - `PredictResponse` keeps the Space's shape: `final_diagnosis`, `vision_expert`, `clinical_expert`, `detected_modality`, plus `models`.
- `src/app/predictor.py`:
  - The Space's `inference.py`, cleaned: one `LABELS`, the maps in one place, and the type classifier stored as `type_clf` everywhere.
  - Fusion is skipped, and says so, when an expert is flagged unverified.
- `src/app/weights.py`: uses `huggingface_hub.snapshot_download` to fetch the weights from the Space repo into `MODEL_DIR` once. Local files win if present.
- `src/requirements.txt`: the Space's pinned versions plus `huggingface_hub` and `pydantic-settings`. `src/Dockerfile`: the Space's Dockerfile (Python 3.10, non-root, port 7860).

Delete:
- `src/bootstrapper.py`, the old `src/inference.py`, `rule_based_score`, `/api/presets`, the fake "radiomics" image statistics, the hardcoded recommendation strings and the guessed `detected_modality`.
- `models/*.joblib`, which the Space doesn't use.
- `notebooks/project_text_progress.ipynb` (broken).
- `frontend/docs`.
- `image_type_classifier.pth`, from the deploy list only.

The two working notebooks stay, as research.

### 3. Frontend rework (`frontend/` → Vite + TS)
**Layout:** one working screen, "Case review", with no sidebar (there are few destinations), following design-taste-frontend's app-screen rules.
- **Top bar (48px):** a drawn Jvision mark and name, a "Research prototype" label, a model-service status chip (from `/health`), History, and a theme toggle.
- **Title row:** the h1 "Case review", one grey line on the scope ("Research use only, not for diagnosis"), and one primary action, "Run analysis".
- **Left column, inputs:**
  - Image drop zone with a plain preview.
  - The 9 clinical fields in three groups: Patient (age, family history, prior biopsy), Imaging findings (BI-RADS, shape, margin, density, calcifications), Lesion (size).
  - "Load example case" menu with 3 cases kept in one data file.
  - Clear.
- **Right column, result.** The screen's question is "What did the models conclude, and do they agree?"
  - **Verdict block (biggest thing on screen):** the fused prediction, its mode (image + clinical / image only / clinical only), and a 100% stacked bar of the three classes with the main hue on the predicted class.
  - **Signature element, the expert agreement strip:** image expert and clinical expert side by side. Each shows its own three-class bar and its top class, with "Agree" or "Disagree" stated. When either expert gives ≥0.99, it is flagged "uncalibrated".
  - **Modality line:** detected type, confidence, and whether a fallback specialist was used (the Space's `note`).
  - **Evidence and limits:** `analysis-basis.js` ported to TS and rewritten for the new response. It covers which inputs were used and which models ran, and states that confidences are not calibrated.
- **States:** empty (before the first run), loading, service down (a clear error with a retry; never a fake result), validation errors shown next to each field, and partial results (one expert failed).
- **History:** a drawer with the last 50 runs in `localStorage`, search (working), CSV export, clear, and a confirm dialog instead of `confirm()`.
- **Print report:** one button and one print stylesheet.

**Removed from the frontend:** particle canvas, orbs, hero banner, mode tabs (the backend decides from the inputs), language select (it covered only 3 strings), both voice buttons, OncoBot, MDT board, SHAP card, fake fusion card, 3D slices, compare studio, fake Grad-CAM, ROI tool, brightness/contrast/invert toolbar, webcam, DICOM SR, Sheets sync, the duplicate PDF button, gauge, radar, radiomics card, glossary dialog, the "Enterprise" and "100% Acc" claims, and the phone number in the footer.

**Code layout:**
- `frontend/src/{api.ts, types.ts, state.ts, render/*.ts, history.ts, examples.ts, analysis-basis.ts, styles/{tokens,base,app,print}.css}`.
- `VITE_API_URL` replaces the hardcoded `localhost:8000`.
- Root `package.json` gets `dev`, `build`, `preview`, `test` and `typecheck`.

**Visual system:**
- Light ground `#f7f8f9` with a white working sheet, ink `#14171a`, and one restrained clinical blue only on data and the primary action.
- A negative red is used only for a Malignant prediction.
- Dark theme via `[data-theme]`.
- One typeface, loaded for real (for example Inter Tight or IBM Plex Sans), with tabular figures.
- Flat surfaces with 1px rules, two corner radii, and no gradients, glass, emoji icons, or eyebrow labels.

**Design skills, used during the build:**
- `design-taste-frontend` (app run): `draw.mjs --app`, then `inspect.mjs --app` and `lint.mjs --app` with 0 FAIL at 1440, 768 and 390.
- `apple-design`: type scale, sheet and drawer behaviour, reduced motion.
- `emil-design-eng`: press scale 0.97, ease-out under 250 ms, drawer on `cubic-bezier(.32,.72,0,1)`, hover only on `(hover:hover)`, no entrance animations on the work screen.
- `find-animation-opportunities`: a read-only pass after the build. Apply only what passes Emil's "should it animate" test (likely: result arriving, drawer, bar fills).
- `canvas-design`: the Jvision mark (SVG/PNG favicon) and a social preview image.

### 4. Tests, CI, deploy, docs
- **pytest:** contract tests against a `FakePredictor` injected via a FastAPI dependency. They cover upload cap, bad type, enum validation, health shape and partial results, and need no weights. `probe_model.py` runs separately, by hand or on demand.
- **Vitest:** port `analysis-basis` tests. Add render tests for every state. Keep `claims.test.js` and widen it ("Acc", static numbers without an id).
- **CI:** Python 3.10 using `src/requirements-dev.txt` (no torch), Node 20 running `typecheck`, `test` and `build`. Fix the dependabot pip directory to `/src`.
- **Deploy:** an optional `.github/workflows/deploy-space.yml` that pushes `src/` to the Space on tag. It needs an `HF_TOKEN` secret, and **I'll ask before adding the secret or pushing to the Space**.
- **Docs:** rewrite the README to match reality (architecture, how to run each side, research-only notice, no unverified metrics). Fix the SECURITY.md email if you confirm which address is right.

## Critical files
- Rewritten: `src/main.py` → `src/app/*`, `src/schemas.py`, `src/requirements.txt`, `src/Dockerfile`, `frontend/*`, `package.json`, `.github/workflows/ci.yml`, `.github/dependabot.yml`, `README.md`, `tests/*`.
- Reused:
  - Space `inference.py`: predictor, maps and the `MedCLIPTypeClassifier` wrapper.
  - `frontend/analysis-basis.js` logic, ported to TS.
  - The polling and backoff logic in `script.js:1163-1211`.
  - The focus-visible and reduced-motion rules in `style.css:1308-1340`.

## Verification
1. `python scripts/probe_model.py` with real weights: reference cases print sensible probabilities, or the clinical expert is flagged unverified.
2. `python -m pytest` and `npm run typecheck && npm test && npm run build` pass. CI is green on the branch.
3. Run `uvicorn app.main:app` locally plus `npm run dev`. Then in the browser pane:
   - Run the 3 example cases with and without an image.
   - Check that `/health` drives the status chip.
   - Stop the API and confirm the error state shows (no fake result).
   - Check that history search and CSV export work.
4. `inspect.mjs --app` on the production build (`vite preview`): 0 FAIL at 1440, 768 and 390. Read every screenshot, then write the app-screen critique and fix the top three issues.
5. Open a PR from `rework/v3` to `main`, only on your go-ahead.

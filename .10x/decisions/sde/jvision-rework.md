# SDE — jvision-rework (what was built)

## Backend `src/app/`
- `config` (env settings), `schemas` (Pydantic v2), `models` (trust constants and encodings), `fusion` (pure response builder), `predictor` (the only torch import), `weights` (pinned Hub download), `main` (HTTP, limits, CORS, lifespan with background load).
- Architectures are rebuilt with torchvision and `strict=True`, so `medclip`, `transformers` and `tokenizers` are dropped.

## Frontend
Vite + TS: `api`, `types`, `clinical`, `form`, `history`, `format`, `render` (pure), `main` (wiring). CSS in `tokens`, `app` and `print`.

## Deviations from the spec
- After the council review, the clinical model is disabled rather than shown as "unverified", and there is no label-order setting.
- The mammogram model is off: the probe found it never loaded on the Space.
- `scripts/probe_model.py` is runnable and documents the checks.
- Removed: rule scorer, `/api/presets`, fake radiomics, recommendations, the old frontend (about 3,300 lines), placeholder joblibs, the broken notebook, `frontend/docs`.

## Tech debt
- No auth or rate limit.
- The mammogram probe needs labelled PNG mammograms.
- The clinical model needs retraining.

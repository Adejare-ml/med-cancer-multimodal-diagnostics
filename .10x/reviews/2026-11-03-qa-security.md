# QA and security review — 2026-11-03

## Automated
- pytest: 15 contract and fusion tests against a fake predictor. They cover health states, upload type, size and garbage, clinical enum, range and extra-field validation, CORS allow and deny, unverified mammogram, overconfidence warnings, and the trust constants.
- Vitest: 24 tests. They cover the result, error, empty and no-result panels, escaping of API text, the status chip, the model ledger, history limits and corrupt storage, CSV formula neutralising, form validation, frontend/backend enum agreement, and no unbacked claims or removed features in the page.
- design-taste inspector (`--app`, production build): 0 FAIL, 0 WARN at 1440, 768 and 390.

## Manual (browser pane, real weights)
- Malignant sample gives Malignant 98.4% and benign sample gives Benign 95.0%, matching the probe.
- The status chip follows `/health`. History saves, search filters, and CSV exports.
- With the API stopped, the error panel shows with a retry and no result.
- Phone width: one column in reading order, with no horizontal scroll.

## Security
- Threats: hostile uploads, cross-origin abuse, script injection via API text, spreadsheet formulas in CSV, and model swap upstream.
- Uploads: content-type allowlist, a 10 MB cap read with `limit + 1`, and PIL `verify()` before inference.
- CORS: an explicit allowlist from `ALLOWED_ORIGINS`, GET and POST only (the Space had `*`).
- Clinical JSON: Pydantic v2 with `extra="forbid"` and enums.
- Frontend: every dynamic value goes through `escape()`, and a test checks that injected markup does not render.
- CSV: every cell is quoted, and leading `= + - @` is neutralised.
- Weights: pinned revision; `torch.load(weights_only=True)`; strict state-dict loading.
- Privacy: history lives only in localStorage (max 50, the user can clear it); images are sent only to the API.
- Open: no auth or rate limit on `/predict`. Acceptable for a public research demo; add both before any wider use.

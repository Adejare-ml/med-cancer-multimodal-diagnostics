# Status — jvision-rework
- Phase: Delivered to staging (2026-11-03). Space runs API 3.0.0; Pages preview rework-v3 verified end to end. Production Pages follows the PR merge.
- Branch: rework/v3

## Tasks
- [x] Spec and ADR-001..003
- [x] llm-council on the cut list and model red flag
- [x] Model probe (.10x/reviews/2026-11-03-model-probe.md)
- [x] Backend src/app
- [x] Frontend Vite + TS
- [x] Tests, CI, README, deploy workflow
- [x] Inspector 0 FAIL / 0 WARN, motion pass, social image
- [ ] Open PR to main (owner)
- [x] Deploy API 3.0.0 to the Space (web upload; HF_TOKEN still needed for the tag workflow)
- [x] Cloudflare Pages build: npm run build -> dist
- [ ] Probe the mammogram model; retrain the clinical model (follow-ups)

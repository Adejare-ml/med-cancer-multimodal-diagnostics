# ADR-001: The repo owns the Hugging Face Space service; weights come from the Hub

**Status:** Accepted
**Date:** 2026-11-03
**Feature:** jvision-rework
**Author:** 10x-Team (Architect + Staff Engineer)

## Context
Two backends exist. `src/` in this repo cannot load a trained model (2-byte TabNet placeholder, wrong paths, Docker omits `models/`), so it answers every request with hand-written rules. The real models (MedCLIP modality classifier, per-modality EfficientNet-B0 specialists, 9-feature TabNet, late fusion) run on the Space `AdejareworkStudio/Breast_cancer_predictor`, whose code lives only on the Space.

## Decision
`src/app/` becomes the cleaned Space service and the single source of truth. Weights stay in the Space repo (LFS) and are fetched with `huggingface_hub` into `MODEL_DIR` at startup; local files win. The rule-based scorer is deleted.

## Alternatives Considered
| Alternative | Pros | Cons | Why Not |
|---|---|---|---|
| Keep repo rule scorer, proxy to Space | No ML deps in repo | Two backends, two answers, Space code unversioned | Duplication is the core problem |
| Fix the repo's MedCLIP+TabNet fusion path | Matches old notebooks | Weights missing, data not in repo, can't retrain | Not achievable |

## Consequences
### Positive
- One scorer, one response shape, versioned code. Tests run against a fake predictor with no weights.
### Negative
- Local full runs need torch + ~230 MB of weights.
### Risks
- The clinical model returns Benign 1.0 on high-risk inputs (probe 2026-11-03). Mitigation: probe script, "uncalibrated" flags, and leaving an unverified expert out of fusion.

## Dependencies
- Deploying code back to the Space needs an `HF_TOKEN` and the owner's go-ahead.

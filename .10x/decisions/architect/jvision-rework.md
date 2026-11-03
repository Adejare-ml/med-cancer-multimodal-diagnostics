# Architect — jvision-rework
- API: GET /health (always 200, per-model status), POST /predict (multipart image?, clinical_data? JSON).
- Response: final_diagnosis, vision_expert, clinical_expert, detected_modality, models, warnings.
- Units: config.py, schemas.py, predictor.py, weights.py, main.py. Predictor injected via dependency so tests use a fake.
- Failure modes: weights missing -> health reports degraded, predict 503; one expert fails -> partial result with warning; never fabricate.

# Handoff
- Built and verified on branch `rework/v3`. See `.10x/decisions/sde/jvision-rework.md` and `.10x/reviews/`.
- DevOps next: add the `HF_TOKEN` secret, set `ALLOWED_ORIGINS` on the Space, tag `v3.0.0` to deploy, then host `dist/`.
- The live Space still runs the old code (its `/health` returns 500, and mammogram images are routed to the ultrasound model) until this deploys.

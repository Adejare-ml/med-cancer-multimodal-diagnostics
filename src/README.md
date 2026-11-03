---
title: Jvision API
emoji: 🔬
colorFrom: gray
colorTo: blue
sdk: docker
app_port: 7860
pinned: false
license: mit
---

# Jvision API

Research prototype. Not for diagnosis. Source and documentation:
https://github.com/Adejare-ml/med-cancer-multimodal-diagnostics

- `GET /health`: which models are loaded and trusted to score
- `POST /predict`: multipart `image` (required) and optional `clinical_data` JSON

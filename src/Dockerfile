# Jvision API for a Hugging Face Space (Docker SDK, port 7860).
FROM python:3.10-slim

RUN apt-get update && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# torch wheels first: big and rarely changed, so they cache as their own layer.
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir --index-url https://download.pytorch.org/whl/cpu \
        torch==2.3.0 torchvision==0.18.0

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt \
        --extra-index-url https://download.pytorch.org/whl/cpu

COPY app ./app

# Weights download at startup from the Space repo, pinned to MODEL_REVISION (see app/config.py).
# Set ALLOWED_ORIGINS in the Space settings to the address the frontend is served from.
ENV MODEL_DIR=/app/models \
    HF_HOME=/app/.cache/huggingface \
    ALLOWED_ORIGINS="http://localhost:5173,http://localhost:4173"

RUN useradd -m -u 1000 appuser && mkdir -p /app/models /app/.cache && chown -R appuser /app
USER appuser

HEALTHCHECK --interval=30s --timeout=10s --start-period=180s --retries=3 \
    CMD curl -fs http://localhost:7860/health || exit 1

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "7860", "--workers", "1"]

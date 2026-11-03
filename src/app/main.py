"""HTTP layer: validation, limits and routing. No model logic lives here."""
from __future__ import annotations

import io
import json
import logging
import threading
from contextlib import asynccontextmanager
from typing import Callable, Optional

from fastapi import FastAPI, File, Form, HTTPException, Request, UploadFile
from fastapi.concurrency import run_in_threadpool
from fastapi.middleware.cors import CORSMiddleware
from pydantic import ValidationError

from . import __version__
from .config import Settings, get_settings
from .fusion import build_response
from .predictor import Predictor
from .schemas import ClinicalData, HealthResponse, PredictResponse

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
log = logging.getLogger("jvision.api")

IMAGE_TYPES = {"image/png", "image/jpeg", "image/bmp", "image/tiff", "image/webp"}
REQUIRED = ("modality_classifier", "ultrasound_model")


def _default_factory(settings: Settings) -> Predictor:
    from .predictor import TorchPredictor
    from .weights import ensure_weights

    ensure_weights(settings)
    return TorchPredictor(settings.model_dir)


def create_app(
    settings: Optional[Settings] = None,
    predictor_factory: Optional[Callable[[Settings], Predictor]] = None,
    load_in_background: bool = True,
) -> FastAPI:
    settings = settings or get_settings()
    factory = predictor_factory or _default_factory

    @asynccontextmanager
    async def lifespan(app: FastAPI):
        app.state.predictor = None
        app.state.load_error = None

        def load() -> None:
            try:
                app.state.predictor = factory(settings)
            except Exception as exc:  # noqa: BLE001 - reported through /health
                log.exception("model loading failed")
                app.state.load_error = str(exc)

        if load_in_background:
            threading.Thread(target=load, daemon=True).start()
        else:
            load()
        yield

    app = FastAPI(title="Jvision API", version=__version__, lifespan=lifespan)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.allowed_origins,
        allow_origin_regex=settings.allowed_origin_regex or None,
        allow_methods=["GET", "POST"],
        allow_headers=["*"],
    )

    @app.get("/")
    def root() -> dict:
        return {"service": "Jvision API", "version": __version__, "health": "/health", "docs": "/docs"}

    @app.get("/health", response_model=HealthResponse)
    def health(request: Request) -> HealthResponse:
        predictor: Optional[Predictor] = request.app.state.predictor
        if predictor is None:
            failed = request.app.state.load_error is not None
            return HealthResponse(
                status="degraded" if failed else "starting",
                version=__version__,
                model_revision=settings.model_revision,
                components={},
                detail=request.app.state.load_error,
            )
        components = predictor.components()
        ok = all(components.get(name) == "ready" for name in REQUIRED)
        return HealthResponse(
            status="ok" if ok else "degraded",
            version=__version__,
            model_revision=settings.model_revision,
            components=components,
        )

    @app.post("/predict", response_model=PredictResponse)
    async def predict(
        request: Request,
        image: Optional[UploadFile] = File(None),
        clinical_data: Optional[str] = Form(None),
    ) -> PredictResponse:
        predictor: Optional[Predictor] = request.app.state.predictor
        if predictor is None:
            raise HTTPException(503, "The models are still loading. Try again in a minute.")

        clinical = None
        if clinical_data:
            try:
                clinical = ClinicalData.model_validate(json.loads(clinical_data))
            except json.JSONDecodeError:
                raise HTTPException(400, "clinical_data is not valid JSON.")
            except ValidationError as exc:
                raise HTTPException(422, exc.errors(include_url=False, include_context=False))

        if image is None:
            raise HTTPException(400, "An image is required. The clinical model is disabled, so clinical data alone cannot be scored.")
        if image.content_type not in IMAGE_TYPES:
            raise HTTPException(415, f"Unsupported image type {image.content_type!r}. Use PNG, JPEG, BMP, TIFF or WebP.")
        limit = int(settings.max_upload_mb * 1024 * 1024)
        data = await image.read(limit + 1)
        if len(data) > limit:
            raise HTTPException(413, f"The image is larger than {settings.max_upload_mb:g} MB.")
        _check_image(data)

        raw = await run_in_threadpool(predictor.run, data, clinical)
        return build_response(raw, clinical_received=clinical is not None, model_revision=settings.model_revision)

    return app


def _check_image(data: bytes) -> None:
    from PIL import Image, UnidentifiedImageError

    try:
        with Image.open(io.BytesIO(data)) as img:
            img.verify()
    except (UnidentifiedImageError, OSError):
        raise HTTPException(400, "The file could not be read as an image.")


app = create_app()

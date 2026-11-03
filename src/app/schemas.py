"""Request and response models.

The clinical enums are the only values the form may send. The frontend mirrors
them in `frontend/src/clinical.ts`; `tests/test_schema_sync.py` keeps the two equal.
"""
from __future__ import annotations

from enum import Enum
from typing import Literal, Optional

from pydantic import BaseModel, ConfigDict, Field


class Shape(str, Enum):
    round = "round"
    oval = "oval"
    lobular = "lobular"
    irregular = "irregular"
    architectural_distortion = "architectural_distortion"
    unknown = "unknown"


class Margin(str, Enum):
    circumscribed = "circumscribed"
    microlobulated = "microlobulated"
    obscured = "obscured"
    indistinct = "indistinct"
    spiculated = "spiculated"
    unknown = "unknown"


class Density(str, Enum):
    # Mammogram breast density
    fatty = "fatty"
    scattered = "scattered"
    heterogeneous = "heterogeneous"
    dense = "dense"
    # Ultrasound echo pattern
    anechoic = "anechoic"
    hypoechoic = "hypoechoic"
    isoechoic = "isoechoic"
    hyperechoic = "hyperechoic"
    unknown = "unknown"


class ClinicalData(BaseModel):
    """The nine clinical features. Recorded with the case; see models.CLINICAL_MODEL."""

    model_config = ConfigDict(extra="forbid")

    age: float = Field(..., ge=18, le=110, description="Age in years")
    birads: int = Field(..., ge=0, le=6, description="BI-RADS category 0-6")
    shape: Shape = Shape.unknown
    margin: Margin = Margin.unknown
    density: Density = Density.unknown
    calcifications: bool = False
    lesion_size_mm: float = Field(0.0, ge=0, le=200, description="Largest diameter in mm")
    family_history: bool = False
    prior_biopsy: bool = False


ClassName = Literal["Benign", "Malignant", "Normal"]
Basis = Literal["ultrasound", "mammogram", "clinical"]


class ExpertResult(BaseModel):
    name: Basis
    prediction: ClassName
    confidence: float
    probabilities: dict[str, float]
    overconfident: bool = Field(description="A class probability is 0.99 or more")


class FinalResult(BaseModel):
    prediction: ClassName
    confidence: float
    probabilities: dict[str, float]
    basis: list[Basis] = Field(description="Which experts the result was built from")


class Modality(BaseModel):
    detected: Literal["ultrasound", "mammogram"]
    confidence: float
    specialist: Optional[Literal["ultrasound", "mammogram"]] = Field(
        description="The specialist that scored the image, or null when none is verified for this type"
    )


class PredictResponse(BaseModel):
    result: Optional[FinalResult]
    experts: list[ExpertResult]
    modality: Optional[Modality]
    clinical_received: bool
    clinical_used: bool
    warnings: list[str]
    version: str
    model_revision: str


ComponentState = Literal["ready", "disabled", "missing", "failed"]


class HealthResponse(BaseModel):
    status: Literal["ok", "degraded", "starting"]
    version: str
    model_revision: str
    components: dict[str, ComponentState]
    detail: Optional[str] = None

from typing import Dict, Literal, Optional

from pydantic import BaseModel, Field, validator


class ClinicalData(BaseModel):
    """The nine clinical fields the interface collects.

    This mirrors the form in frontend/index.html exactly. Only five of these
    reach the rule-based scoring path (age, birads, shape, margin, density);
    the rest are recorded and reported as unused. See ENGINE_STATUS in main.py.
    """

    age: int = Field(50, ge=0, le=120, description="Patient age in years")
    birads: int = Field(3, ge=0, le=6, description="BI-RADS assessment category")
    shape: str = Field("unknown", description="Mass shape descriptor")
    margin: str = Field("unknown", description="Mass margin descriptor")
    density: str = Field("unknown", description="Density / echogenicity descriptor")
    calcifications: str = Field("unknown", description="Calcification pattern")
    lesion_size_mm: float = Field(15.0, ge=0, le=500, description="Max diameter in mm")
    family_history: str = Field("unknown", description="Family history of breast cancer")
    prior_biopsy: str = Field("unknown", description="Prior breast biopsy")

    @validator("*", pre=True)
    def handle_empty_strings(cls, v):
        """Blank form fields arrive as "" and must fall back to the field default."""
        if isinstance(v, str) and v.strip() == "":
            return None
        return v

    class Config:
        # A blank string becomes None above; None then takes the declared default.
        validate_assignment = True


class EngineInfo(BaseModel):
    """How the result was actually produced.

    The interface states the basis of every result to the user, so this block
    must describe the code path that ran, never the one that was intended.
    """

    type: str
    trained_model_loaded: bool
    scoring_inputs_used: list[str]
    inputs_collected_but_unused: list[str]
    image_used_for_scoring: bool
    calibrated: bool


class Recommendations(BaseModel):
    birads_category: int
    action: str
    urgency: Literal["HIGH", "LOW"]


class Radiomics(BaseModel):
    area_px: int
    perimeter_px: int
    eccentricity: float
    solidity: float
    mean_intensity: float
    aspect_ratio: float


class DiagnosticResponse(BaseModel):
    """Standardised API response for diagnostics."""

    status: str = "success"
    prediction: str
    confidence: float
    detected_modality: str
    probabilities: Dict[str, float]
    engine: EngineInfo
    radiomics: Optional[Radiomics] = None
    recommendations: Optional[Recommendations] = None

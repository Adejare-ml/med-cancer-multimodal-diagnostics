from typing import Dict, Any, List, Optional
from pydantic import BaseModel, Field, validator

class ClinicalData(BaseModel):
    """
    Strict schema for breast cancer clinical features.
    Ensures data integrity before it reaches the ML model.
    """
    age: int = Field(..., ge=0, le=120, description="Patient age in years")
    mass_shape: int = Field(..., description="Categorical encoding of mass shape")
    density: int = Field(..., description="Categorical encoding of breast density")
    # Add other required features based on the TabNet training set
    
    @validator('*', pre=True)
    def handle_empty_strings(cls, v):
        if isinstance(v, str) and v.strip() == "":
            return None
        return v

class DiagnosticResponse(BaseModel):
    """Standardized API response for diagnostics."""
    prediction: str
    confidence: float
    probabilities: Dict[str, float]

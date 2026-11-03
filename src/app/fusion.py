"""Turns raw model outputs into the API response. Pure: no torch, no I/O."""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Optional, Sequence

from . import __version__
from .models import CLASS_ORDER, OVERCONFIDENT_AT, VERIFIED_SPECIALISTS
from .schemas import ExpertResult, FinalResult, Modality, PredictResponse


@dataclass
class RawOutputs:
    """What the predictor measured for one case."""

    modality: Optional[str] = None
    modality_confidence: float = 0.0
    specialist_probs: Optional[Sequence[float]] = None
    clinical_probs: Optional[Sequence[float]] = None
    errors: list[str] = field(default_factory=list)


def _named(probs: Sequence[float]) -> dict[str, float]:
    if len(probs) != len(CLASS_ORDER):
        raise ValueError(f"expected {len(CLASS_ORDER)} probabilities, got {len(probs)}")
    return {name: round(float(p), 4) for name, p in zip(CLASS_ORDER, probs)}


def _expert(name: str, probs: Sequence[float]) -> ExpertResult:
    named = _named(probs)
    top = max(named, key=named.get)
    return ExpertResult(
        name=name,
        prediction=top,
        confidence=named[top],
        probabilities=named,
        overconfident=named[top] >= OVERCONFIDENT_AT,
    )


def build_response(
    raw: RawOutputs,
    *,
    clinical_received: bool,
    model_revision: str,
) -> PredictResponse:
    warnings: list[str] = list(raw.errors)
    experts: list[ExpertResult] = []
    modality = None

    if raw.modality is not None:
        specialist = raw.modality if raw.modality in VERIFIED_SPECIALISTS else None
        modality = Modality(
            detected=raw.modality,
            confidence=round(raw.modality_confidence, 4),
            specialist=specialist,
        )
        if specialist is None:
            warnings.append(
                f"This looks like a {raw.modality}. The {raw.modality} model has not passed "
                "its checks yet, so no result is given for this image."
            )
        elif raw.specialist_probs is not None:
            experts.append(_expert(specialist, raw.specialist_probs))

    if raw.clinical_probs is not None:
        experts.append(_expert("clinical", raw.clinical_probs))

    for expert in experts:
        if expert.overconfident:
            warnings.append(
                f"The {expert.name} model is {expert.confidence:.0%} sure. Scores this high "
                "are not trustworthy on their own."
            )

    result = None
    if len(experts) == 1:
        e = experts[0]
        result = FinalResult(
            prediction=e.prediction, confidence=e.confidence, probabilities=e.probabilities, basis=[e.name]
        )
    elif len(experts) > 1:
        fused = {k: round(sum(e.probabilities[k] for e in experts) / len(experts), 4) for k in CLASS_ORDER}
        top = max(fused, key=fused.get)
        result = FinalResult(
            prediction=top, confidence=fused[top], probabilities=fused, basis=[e.name for e in experts]
        )

    return PredictResponse(
        result=result,
        experts=experts,
        modality=modality,
        clinical_received=clinical_received,
        clinical_used=raw.clinical_probs is not None,
        warnings=warnings,
        version=__version__,
        model_revision=model_revision,
    )

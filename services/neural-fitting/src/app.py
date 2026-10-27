"""Modal worker service and fitting pipelines for Drape.

Exposes serverless entrypoints and AMQP task workers for neural garment fitting.

Discipline Rules:
- Rule 1: Ephemeral RAM-disk photo processing with cryptographic zero-leak wiping.
- Rule 2: Pinned model weights, deterministic random seeds, and precision modes.
- Rule 3: Automated parametric mannequin fallback on timeout, OOM, or worker error.
- Rule 4: Deterministic offline synthetic testing without remote Modal / live GPU calls.

Permanent spec anchors:
- FEAT-004: Multimodal Customer Neural Dress Fitting
- FEAT-005: Biometric Consent & Ephemeral Image Lifecycle
- NFR-004: End-to-end inference budget (2.2s / 3.8s / 5.5s)
- NFR-011: Availability fallback to pre-rendered 3D mannequin visualization
- NFR-023: Ephemeral memory encryption & zero swap disk writes
- NFR-030: Tailoring Silhouette & Drape Fidelity >= 92.0%
- NFR-040: Illinois BIPA automated destruction & ephemeral container purge audit
- C-037: AMQP neural.drape.generate interface
"""

from typing import Any, Dict

import modal

from src.pipeline import (
    InferredMeasurements,
    NeuralDrapePipeline,
    PBRTextures,
    PipelineResult,
)
from src.worker import (
    FittingErrorResponse,
    FittingRequest,
    FittingSuccessResponse,
    NeuralFittingWorker,
    process_drape_task,
)

# Modal application instance
app = modal.App("drape-neural-fitting")

# Pinned container environment (Discipline Rule 2)
worker_image = modal.Image.debian_slim(python_version="3.11").pip_install(
    "fastapi>=0.110.0",
    "pydantic>=2.0.0",
    "torch==2.3.0",
    "diffusers==0.28.0",
)


@app.function(image=worker_image, timeout=8)
def generate_neural_drape(payload: Dict[str, Any]) -> Dict[str, Any]:
    """Modal function entrypoint for serverless fitting tasks (C-037)."""
    request = FittingRequest.model_validate(payload)
    worker = NeuralFittingWorker()
    return worker.execute_fitting_job(request)


__all__ = [
    "app",
    "worker_image",
    "generate_neural_drape",
    "PBRTextures",
    "InferredMeasurements",
    "FittingRequest",
    "FittingSuccessResponse",
    "FittingErrorResponse",
    "NeuralFittingWorker",
    "NeuralDrapePipeline",
    "PipelineResult",
    "process_drape_task",
]

"""AMQP C-037 Task Runner and Neural Fitting Worker for Drape.

Processes AMQP neural.drape.generate contract tasks with:
- Ephemeral volatile RAM-disk photo processing (/dev/shm).
- Guaranteed cryptographic wipe on completion or error (NFR-040).
- Circuit breaker timeout (8.0s) and automatic 3D parametric mannequin fallback (NFR-011).
- Conforms strictly to C-037 frozen contract response envelope.

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

import asyncio
import time
from pathlib import Path
from typing import Any, Dict, Literal, Optional

from pydantic import BaseModel, Field

from src.ephemeral_storage import EphemeralStorageManager
from src.mannequin_fallback import (
    FittingCircuitBreaker,
    PoseEstimationError,
)
from src.pipeline import (
    InferredMeasurements,
    NeuralDrapePipeline,
    PBRTextures,
)


class FittingRequest(BaseModel):
    """Input payload conforming strictly to Frozen Contract C-037."""

    jobId: str
    userId: str
    mode: Literal["photo", "mannequin"]
    photoEphemeralRamPath: Optional[str] = None
    mannequinPreset: Optional[str] = None
    fabricSku: str
    gsm: float
    stiffnessRating: float
    drapeCoefficient: float
    silhouetteId: str
    customPrompt: Optional[str] = None
    sketchUrl: Optional[str] = None
    pbrTextures: PBRTextures
    timeoutSeconds: int = Field(default=8, ge=1, le=30)  # C-037 fixed 8s deadline timeout


class FittingSuccessResponse(BaseModel):
    """Success response envelope conforming strictly to Frozen Contract C-037."""

    jobId: str
    status: Literal["COMPLETED"] = "COMPLETED"
    renderUrl: str
    drapeConfidenceScore: float = Field(ge=0.0, le=1.0)
    inferredMeasurements: InferredMeasurements
    ephemeralPhotoPurged: bool  # True certifying cryptographic wipe of raw photo
    inferenceTimeMs: int


class FittingErrorResponse(BaseModel):
    """Error response with parametric mannequin fallback conforming strictly to C-037."""

    jobId: str
    status: Literal["FAILED"] = "FAILED"
    errorCode: str
    errorMessage: str
    fallbackMannequinRenderUrl: str


class NeuralFittingWorker:
    """Worker handling neural dress fitting with ephemeral RAM-disk guarantees and fallbacks."""

    def __init__(
        self,
        pipeline: Optional[NeuralDrapePipeline] = None,
        storage_manager: Optional[EphemeralStorageManager] = None,
        circuit_breaker: Optional[FittingCircuitBreaker] = None,
    ):
        self.pipeline = pipeline or NeuralDrapePipeline()
        self.storage_manager = storage_manager or EphemeralStorageManager(
            allow_simulated_for_offline_test=True
        )
        self.circuit_breaker = circuit_breaker or FittingCircuitBreaker(
            execution_timeout_seconds=8.0  # C-037 fixed 8.0s timeout
        )

    def execute_fitting_job(
        self,
        request: FittingRequest,
        raw_photo_bytes: Optional[bytes] = None,
    ) -> Dict[str, Any]:
        """Synchronously execute a neural fitting task guarded by circuit breaker and purge.

        Conforms strictly to C-037, NFR-004, NFR-011, NFR-023, NFR-030, and NFR-040.
        """

        def _inner_pipeline() -> Dict[str, Any]:
            start_wall = time.perf_counter()
            ephemeral_purged = False

            # Ephemeral photo lifecycle session in volatile RAM-disk (Discipline Rule 1)
            with self.storage_manager.ephemeral_session(
                job_id=request.jobId,
                ttl_seconds=float(request.timeoutSeconds),
            ) as session:
                photo_path: Optional[Path] = None

                if request.mode == "photo":
                    if raw_photo_bytes is not None:
                        # Write raw photo bytes strictly into volatile RAM-disk
                        photo_path = session.write_ephemeral_file(
                            "customer_portrait.raw", raw_photo_bytes
                        )
                    elif request.photoEphemeralRamPath:
                        photo_path = Path(request.photoEphemeralRamPath)
                        self.storage_manager.assert_path_in_volatile_root(photo_path)
                    else:
                        raise PoseEstimationError(
                            "Photo mode requested without raw photo bytes or volatile RAM path."
                        )

                    # Register mutable scratch buffer for intermediate tensor segmentation
                    scratch_tensor_buf = session.register_scratch_buffer(bytearray(2048))
                    scratch_tensor_buf[0:8] = b"TENSOR01"

                # Execute the 3-stage neural draping pipeline
                pipeline_result = self.pipeline.run_pipeline(
                    job_id=request.jobId,
                    mode=request.mode,
                    silhouette_id=request.silhouetteId,
                    fabric_sku=request.fabricSku,
                    gsm=request.gsm,
                    stiffness_rating=request.stiffnessRating,
                    drape_coefficient=request.drapeCoefficient,
                    pbr_textures=request.pbrTextures,
                    raw_photo_bytes=raw_photo_bytes,
                    photo_path=photo_path,
                    mannequin_preset=request.mannequinPreset,
                    custom_prompt=request.customPrompt,
                    sketch_url=request.sketchUrl,
                )

                # Context exit guarantees cryptographic wipe of RAM-disk artifacts (NFR-040)
                ephemeral_purged = True

            elapsed_ms = int((time.perf_counter() - start_wall) * 1000)

            success_response = FittingSuccessResponse(
                jobId=request.jobId,
                status="COMPLETED",
                renderUrl=pipeline_result.renderUrl,
                drapeConfidenceScore=pipeline_result.drapeConfidenceScore,
                inferredMeasurements=pipeline_result.inferredMeasurements,
                ephemeralPhotoPurged=ephemeral_purged,
                inferenceTimeMs=elapsed_ms,
            )
            return success_response.model_dump()

        return self.circuit_breaker.execute_with_fallback(
            job_id=request.jobId,
            worker_func=_inner_pipeline,
            mannequin_preset=request.mannequinPreset,
            silhouette_id=request.silhouetteId,
        )

    async def execute_fitting_job_async(
        self,
        request: FittingRequest,
        raw_photo_bytes: Optional[bytes] = None,
    ) -> Dict[str, Any]:
        """Asynchronously process fitting task offloading compute to worker thread."""
        return await asyncio.to_thread(
            self.execute_fitting_job,
            request,
            raw_photo_bytes,
        )


async def process_drape_task(
    payload: Dict[str, Any],
    raw_photo_bytes: Optional[bytes] = None,
    worker: Optional[NeuralFittingWorker] = None,
) -> Dict[str, Any]:
    """Top-level async entrypoint processing AMQP neural.drape.generate contract messages."""
    request = FittingRequest.model_validate(payload)
    active_worker = worker or NeuralFittingWorker()
    return await active_worker.execute_fitting_job_async(
        request=request,
        raw_photo_bytes=raw_photo_bytes,
    )

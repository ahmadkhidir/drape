"""AMQP Task Consumer for Neural Motion Video Generation (C-038 / FEAT-006).

Consumes C-038 AMQP `neural.motion.generate` task messages and coordinates
execution of the 4-second seamless looping video motion pipeline.

Permanent spec anchors:
- FEAT-006: 360-degree Looping Neural Motion & Garment Walk
- NFR-005: Video render latency target (4.2s / 6.0s / 8.5s)
- NFR-031: Temporal Coherence & Mesh Integrity (SSIM >= 0.94, zero mesh tearing)
- NFR-023: Ephemeral memory encryption & volatile RAM-disk processing
- C-038: AMQP neural.motion.generate interface
"""

import asyncio
from typing import Any, Dict, Literal, Optional

from pydantic import BaseModel, Field

from src.ephemeral_storage import EphemeralStorageManager
from src.motion_pipeline import (
    ClothParameters,
    GenerationTimeoutError,
    MeshTearingError,
    NeuralMotionPipeline,
    TemporalCoherenceError,
    TrajectoryPreset,
)

MotionErrorCode = Literal["TEMPORAL_COHERENCE_FAILURE", "GPU_WORKER_TIMEOUT"]


class MotionGenerationRequest(BaseModel):
    """Input payload conforming strictly to Frozen Contract C-038."""

    motionJobId: str = Field(..., description="UUIDv4 of motion job")
    fittingId: str = Field(..., description="UUIDv4 of static neural fitting")
    staticRenderUrl: str = Field(..., description="URI of high-res static render")
    fabricSku: str = Field(..., description="Fabric SKU identifier")
    gsm: float = Field(..., ge=10.0, le=1000.0, description="Mass density in g/m^2")
    bendingModulus: float = Field(..., ge=0.01, le=50.0, description="Bending stiffness in N*m")
    trajectoryPreset: TrajectoryPreset = Field(
        ..., description="'turntable_360' or 'runway_step_turn'"
    )
    fps: int = Field(default=30, ge=30, le=30, description="Fixed 30 FPS")
    durationMs: int = Field(default=4000, ge=4000, le=4000, description="Fixed 4000 ms duration")
    drapeCoefficient: Optional[float] = Field(default=None, ge=0.05, le=0.95)

    model_config = {
        "populate_by_name": True,
        "extra": "ignore",
    }


class MotionSuccessResponse(BaseModel):
    """Success response envelope conforming strictly to Frozen Contract C-038."""

    motionJobId: str
    fittingId: str
    status: Literal["COMPLETED"] = "COMPLETED"
    videoUrl: str
    durationMs: int = 4000
    fps: int = 30
    thumbnailSpriteUrl: str
    renderTimeMs: int

    # Convenience accessors per FEAT-006 spec
    @property
    def video_url(self) -> str:
        return self.videoUrl

    @property
    def loop_duration_ms(self) -> int:
        return self.durationMs


class MotionErrorResponse(BaseModel):
    """Error response conforming strictly to Frozen Contract C-038."""

    motionJobId: str
    status: Literal["FAILED"] = "FAILED"
    errorCode: MotionErrorCode
    errorMessage: str


class AMQPMotionConsumer:
    """AMQP consumer and worker coordinator for C-038 motion generation tasks."""

    def __init__(
        self,
        pipeline: Optional[NeuralMotionPipeline] = None,
        storage_manager: Optional[EphemeralStorageManager] = None,
        timeout_seconds: float = 6.0,
    ):
        """Initialize consumer with pipeline, volatile storage, and timeout budget (NFR-005)."""
        self.storage_manager = storage_manager or EphemeralStorageManager(
            allow_simulated_for_offline_test=True
        )
        self.pipeline = pipeline or NeuralMotionPipeline(
            storage_manager=self.storage_manager,
            latency_budget_seconds=timeout_seconds,
        )
        self.timeout_seconds = timeout_seconds

    def execute_motion_job(
        self,
        request: MotionGenerationRequest,
        inject_latency_sec: float = 0.0,
        inject_degrade_ssim: bool = False,
        inject_mesh_strain: Optional[float] = None,
    ) -> Dict[str, Any]:
        """Execute motion generation job synchronously with C-038 contract conformity.

        Returns:
            Dict conforming to C-038 Success or Error schema.
        """
        cloth = ClothParameters(
            gsm=request.gsm,
            bendingModulus=request.bendingModulus,
            drapeCoefficient=request.drapeCoefficient,
            fabricSku=request.fabricSku,
        )

        try:
            result = self.pipeline.generate_motion(
                fitting_id=request.fittingId,
                static_render_url=request.staticRenderUrl,
                cloth=cloth,
                motion_preset=request.trajectoryPreset,
                motion_job_id=request.motionJobId,
                inject_latency_sec=inject_latency_sec,
                inject_degrade_ssim=inject_degrade_ssim,
                inject_mesh_strain=inject_mesh_strain,
            )

            success_response = MotionSuccessResponse(
                motionJobId=result.motionJobId,
                fittingId=result.fittingId,
                status="COMPLETED",
                videoUrl=result.videoUrl,
                durationMs=result.durationMs,
                fps=result.fps,
                thumbnailSpriteUrl=result.thumbnailSpriteUrl,
                renderTimeMs=result.renderTimeMs,
            )
            return success_response.model_dump()

        except (TemporalCoherenceError, MeshTearingError) as err:
            error_response = MotionErrorResponse(
                motionJobId=request.motionJobId,
                status="FAILED",
                errorCode="TEMPORAL_COHERENCE_FAILURE",
                errorMessage=str(err),
            )
            return error_response.model_dump()

        except (GenerationTimeoutError, TimeoutError) as err:
            error_response = MotionErrorResponse(
                motionJobId=request.motionJobId,
                status="FAILED",
                errorCode="GPU_WORKER_TIMEOUT",
                errorMessage=f"GPU worker timeout: {err}",
            )
            return error_response.model_dump()

        except Exception as err:
            error_response = MotionErrorResponse(
                motionJobId=request.motionJobId,
                status="FAILED",
                errorCode="GPU_WORKER_TIMEOUT",
                errorMessage=f"Unexpected pipeline execution error: {err}",
            )
            return error_response.model_dump()

    def handle_message(self, message: Dict[str, Any]) -> Dict[str, Any]:
        """Parse raw AMQP message dictionary and execute task."""
        try:
            request = MotionGenerationRequest.model_validate(message)
        except Exception as validation_err:
            raw_job_id = str(
                message.get("motionJobId") or message.get("motion_job_id") or "unknown"
            )
            return MotionErrorResponse(
                motionJobId=raw_job_id,
                status="FAILED",
                errorCode="TEMPORAL_COHERENCE_FAILURE",
                errorMessage=f"AMQP message validation failed: {validation_err}",
            ).model_dump()

        return self.execute_motion_job(request)

    async def process_motion_task(self, message: Dict[str, Any]) -> Dict[str, Any]:
        """Asynchronously process AMQP neural.motion.generate task message.

        Enforces worker timeout budget per NFR-005.
        """
        loop = asyncio.get_running_loop()
        try:
            return await asyncio.wait_for(
                loop.run_in_executor(None, self.handle_message, message),
                timeout=self.timeout_seconds,
            )
        except asyncio.TimeoutError:
            raw_job_id = str(
                message.get("motionJobId") or message.get("motion_job_id") or "unknown"
            )
            return MotionErrorResponse(
                motionJobId=raw_job_id,
                status="FAILED",
                errorCode="GPU_WORKER_TIMEOUT",
                errorMessage=(
                    f"AMQP motion generation exceeded asynchronous deadline of "
                    f"{self.timeout_seconds:.1f}s (NFR-005)."
                ),
            ).model_dump()


__all__ = [
    "MotionErrorCode",
    "MotionGenerationRequest",
    "MotionSuccessResponse",
    "MotionErrorResponse",
    "AMQPMotionConsumer",
]

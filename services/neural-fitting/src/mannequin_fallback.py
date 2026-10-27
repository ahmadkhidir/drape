"""Parametric mannequin fallback selector and circuit breaker for neural fitting.

Discipline Rule 3:
- Inference dispatch handlers must wrap Modal worker execution in explicit circuit
  breakers with strict deadline timeouts.
- If worker cold-starts, queue delays, GPU memory exhaustion, or network partitions
  exceed latency bounds or trigger unrecoverable worker errors, the orchestrator
  must immediately downgrade execution to the deterministic 3D parametric mannequin
  rendering pipeline, returning a structured fallback payload rather than dropping
  connections or bubbling unhandled exceptions.

Permanent spec anchors:
- NFR-011: Availability & Degradation: Fall back to pre-rendered 3D mannequin visualization
- C-037: AMQP neural.drape.generate error schema with fallbackMannequinRenderUrl
- FEAT-004: Multimodal Neural Dress Fitting
"""

import time
from enum import Enum
from typing import Any, Callable, Dict, Optional


class FittingErrorCode(str, Enum):
    """Declared error codes per C-037 AMQP neural.drape.generate contract."""

    SAFETY_FILTER_REJECTED = "SAFETY_FILTER_REJECTED"
    POSE_ESTIMATION_FAILED = "POSE_ESTIMATION_FAILED"
    TIMEOUT_EXCEEDED = "TIMEOUT_EXCEEDED"
    GPU_OUT_OF_MEMORY = "GPU_OUT_OF_MEMORY"


# Pre-rendered 3D parametric mannequin asset catalogue (NFR-011)
PARAMETRIC_MANNEQUIN_ASSETS: Dict[str, str] = {
    "standard": "https://assets.drape.style/mannequins/parametric/v1/standard-neutral.webp",
    "hourglass": "https://assets.drape.style/mannequins/parametric/v1/hourglass-neutral.webp",
    "athletic": "https://assets.drape.style/mannequins/parametric/v1/athletic-neutral.webp",
    "pear": "https://assets.drape.style/mannequins/parametric/v1/pear-neutral.webp",
    "rectangle": "https://assets.drape.style/mannequins/parametric/v1/rectangle-neutral.webp",
    "plus": "https://assets.drape.style/mannequins/parametric/v1/plus-neutral.webp",
}

DEFAULT_FALLBACK_URL = PARAMETRIC_MANNEQUIN_ASSETS["standard"]
DEFAULT_FALLBACK_MESSAGE = (
    "Custom photo fitting temporarily busy; viewing on parametric mannequin"  # NFR-011
)


class MannequinFallbackSelector:
    """Selects deterministic parametric mannequin renders and formats C-037 fallback payloads."""

    @classmethod
    def resolve_render_url(
        cls,
        mannequin_preset: Optional[str] = None,
        silhouette_id: Optional[str] = None,
    ) -> str:
        """Deterministically resolve a parametric mannequin render URL."""
        if mannequin_preset and mannequin_preset.lower() in PARAMETRIC_MANNEQUIN_ASSETS:
            return PARAMETRIC_MANNEQUIN_ASSETS[mannequin_preset.lower()]

        if silhouette_id:
            # Map known silhouette archetypes to mannequin presets
            normalized_silhouette = silhouette_id.lower()
            for key in PARAMETRIC_MANNEQUIN_ASSETS:
                if key in normalized_silhouette:
                    return PARAMETRIC_MANNEQUIN_ASSETS[key]

        return DEFAULT_FALLBACK_URL

    @classmethod
    def create_fallback_payload(
        cls,
        job_id: str,
        error_code: FittingErrorCode,
        error_message: Optional[str] = None,
        mannequin_preset: Optional[str] = None,
        silhouette_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Construct structured fallback payload conforming strictly to C-037."""
        render_url = cls.resolve_render_url(
            mannequin_preset=mannequin_preset,
            silhouette_id=silhouette_id,
        )
        return {
            "jobId": job_id,
            "status": "FAILED",
            "errorCode": error_code.value,
            "errorMessage": error_message or DEFAULT_FALLBACK_MESSAGE,
            "fallbackMannequinRenderUrl": render_url,
        }


class CircuitBreakerOpenError(Exception):
    """Raised when circuit breaker trips due to repeated downstream worker failures."""


class DrapePipelineError(Exception):
    """Base exception for neural draping pipeline errors."""


class SafetyFilterRejectedError(DrapePipelineError):
    """Raised when customer photo violates neural safety guidelines."""

    error_code = FittingErrorCode.SAFETY_FILTER_REJECTED


class PoseEstimationError(DrapePipelineError):
    """Raised when customer pose or anatomical landmarks cannot be extracted."""

    error_code = FittingErrorCode.POSE_ESTIMATION_FAILED


class WorkerTimeoutError(DrapePipelineError):
    """Raised when GPU or worker computation exceeds allotted deadline budget."""

    error_code = FittingErrorCode.TIMEOUT_EXCEEDED


class GpuOutOfMemoryError(DrapePipelineError):
    """Raised when GPU VRAM or host memory is exhausted during inference pass."""

    error_code = FittingErrorCode.GPU_OUT_OF_MEMORY


class FittingCircuitBreaker:
    """Circuit breaker guarding GPU worker calls with deadline timeouts and fallback routing."""

    def __init__(
        self,
        failure_threshold: int = 3,
        recovery_timeout_seconds: float = 30.0,
        execution_timeout_seconds: float = 8.0,  # C-037 fixed 8s timeout
    ):
        self.failure_threshold = failure_threshold
        self.recovery_timeout_seconds = recovery_timeout_seconds
        self.execution_timeout_seconds = execution_timeout_seconds

        self.consecutive_failures = 0
        self.last_failure_time: Optional[float] = None
        self.state = "CLOSED"  # "CLOSED", "OPEN", "HALF_OPEN"

    def _update_state(self) -> None:
        """Update circuit breaker state based on elapsed recovery timeout."""
        if self.state == "OPEN":
            if (
                self.last_failure_time
                and (time.time() - self.last_failure_time) > self.recovery_timeout_seconds
            ):
                self.state = "HALF_OPEN"

    def record_success(self) -> None:
        """Record successful worker execution."""
        self.consecutive_failures = 0
        self.state = "CLOSED"

    def record_failure(self) -> None:
        """Record worker failure and trip circuit if threshold reached."""
        self.consecutive_failures += 1
        self.last_failure_time = time.time()
        if self.consecutive_failures >= self.failure_threshold:
            self.state = "OPEN"

    def execute_with_fallback(
        self,
        job_id: str,
        worker_func: Callable[[], Dict[str, Any]],
        mannequin_preset: Optional[str] = None,
        silhouette_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Wrap worker invocation in circuit breaker and deadline timeout.

        Catches timeouts, OOMs, and circuit open conditions to return structured
        parametric mannequin fallbacks per Discipline Rule 3 and C-037.
        """
        self._update_state()

        if self.state == "OPEN":
            return MannequinFallbackSelector.create_fallback_payload(
                job_id=job_id,
                error_code=FittingErrorCode.TIMEOUT_EXCEEDED,
                error_message=(
                    "GPU worker circuit open due to excessive load; routed to parametric mannequin."
                ),
                mannequin_preset=mannequin_preset,
                silhouette_id=silhouette_id,
            )

        start_time = time.time()
        try:
            result = worker_func()
            elapsed = time.time() - start_time
            if elapsed > self.execution_timeout_seconds:
                self.record_failure()
                return MannequinFallbackSelector.create_fallback_payload(
                    job_id=job_id,
                    error_code=FittingErrorCode.TIMEOUT_EXCEEDED,
                    error_message=(
                        f"Fitting latency {elapsed:.2f}s exceeded "
                        f"{self.execution_timeout_seconds}s deadline budget."
                    ),
                    mannequin_preset=mannequin_preset,
                    silhouette_id=silhouette_id,
                )

            self.record_success()
            return result

        except TimeoutError as te:
            self.record_failure()
            return MannequinFallbackSelector.create_fallback_payload(
                job_id=job_id,
                error_code=FittingErrorCode.TIMEOUT_EXCEEDED,
                error_message=str(te) or "GPU worker timed out waiting for inference execution.",
                mannequin_preset=mannequin_preset,
                silhouette_id=silhouette_id,
            )
        except MemoryError:
            self.record_failure()
            return MannequinFallbackSelector.create_fallback_payload(
                job_id=job_id,
                error_code=FittingErrorCode.GPU_OUT_OF_MEMORY,
                error_message="GPU worker memory exhausted during neural fitting tensor pass.",
                mannequin_preset=mannequin_preset,
                silhouette_id=silhouette_id,
            )
        except Exception as exc:
            self.record_failure()
            err_code = getattr(exc, "error_code", None)
            if err_code is not None and isinstance(err_code, FittingErrorCode):
                resolved_code = err_code
            elif err_code is not None:
                try:
                    resolved_code = FittingErrorCode(str(err_code))
                except ValueError:
                    resolved_code = FittingErrorCode.POSE_ESTIMATION_FAILED
            else:
                resolved_code = FittingErrorCode.POSE_ESTIMATION_FAILED

            return MannequinFallbackSelector.create_fallback_payload(
                job_id=job_id,
                error_code=resolved_code,
                error_message=(
                    str(exc) or f"Neural fitting worker encountered unexpected condition: {exc}"
                ),
                mannequin_preset=mannequin_preset,
                silhouette_id=silhouette_id,
            )

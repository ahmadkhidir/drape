"""Deterministic offline unit test suite for Drape Neural Fitting worker service.

Discipline Rule 4:
- Deterministic Offline Synthetic Testing: Unit and integration test suites executed via
  pytest must run completely offline without dispatching remote Modal calls, accessing
  live GPU hardware, or contacting external model registries. All worker stubs, diffusion
  runners, and geometry estimators must be tested against deterministic synthetic tensor
  fixtures, mock memory buffers, and fixed fixture responses.

Cites permanent spec anchors:
- FEAT-004: Multimodal Neural Dress Fitting
- NFR-004: End-to-end inference budget
- NFR-011: Availability & Degradation: Parametric mannequin fallback
- NFR-023: Ephemeral memory encryption & zero swap disk writes
- NFR-030: Tailoring Silhouette & Drape Fidelity >= 92.0%
- NFR-040: Illinois BIPA automated destruction
- C-037: AMQP neural.drape.generate contract
"""

import time
import uuid
from pathlib import Path

import pytest
from src.app import FittingRequest, NeuralFittingWorker, PBRTextures
from src.ephemeral_storage import (
    EphemeralStorageManager,
    SessionTTLExpiredError,
    StorageSecurityError,
)
from src.mannequin_fallback import (
    PARAMETRIC_MANNEQUIN_ASSETS,
    FittingCircuitBreaker,
    FittingErrorCode,
    MannequinFallbackSelector,
)


@pytest.fixture
def temp_volatile_dir(tmp_path: Path) -> Path:
    """Fixture providing an isolated temporary directory simulating volatile RAM mount."""
    volatile_dir = tmp_path / "simulated_volatile_shm"
    volatile_dir.mkdir(parents=True, exist_ok=True)
    return volatile_dir


@pytest.fixture
def storage_mgr(temp_volatile_dir: Path) -> EphemeralStorageManager:
    """Ephemeral storage manager configured for offline synthetic testing."""
    return EphemeralStorageManager(
        volatile_root=temp_volatile_dir,
        allow_simulated_for_offline_test=True,
    )


@pytest.fixture
def synthetic_fitting_request() -> FittingRequest:
    """Deterministic synthetic fitting request payload conforming to C-037."""
    return FittingRequest(
        jobId=str(uuid.uuid4()),
        userId=str(uuid.uuid4()),
        mode="photo",
        fabricSku="FAB-SILK-001",
        gsm=85.0,
        stiffnessRating=3.2,
        drapeCoefficient=0.42,
        silhouetteId="SIL-EVENING-HOURGLASS-01",
        pbrTextures=PBRTextures(
            albedoUrl="https://assets.drape.style/fabrics/silk-albedo.webp",
            normalMapUrl="https://assets.drape.style/fabrics/silk-normal.webp",
            roughnessMapUrl="https://assets.drape.style/fabrics/silk-roughness.webp",
        ),
        timeoutSeconds=8,
    )


class TestEphemeralStorageLifecycle:
    """Validates Ephemeral RAM-Disk Photo Lifecycle & Zero-Disk-Leak (NFR-023, NFR-040)."""

    def test_ephemeral_write_and_cryptographic_wipe(
        self, storage_mgr: EphemeralStorageManager, temp_volatile_dir: Path
    ):
        job_id = "test-job-wipe-01"
        secret_biometric_data = b"UNMASKED_RAW_CUSTOMER_BIOMETRICS_AND_KEYPOINTS_12345"
        created_file_path: Path = None

        with storage_mgr.ephemeral_session(job_id=job_id, ttl_seconds=60.0) as session:
            # Write raw customer imagery into session volatile directory
            created_file_path = session.write_ephemeral_file("portrait.raw", secret_biometric_data)
            assert created_file_path.exists()
            assert created_file_path.read_bytes() == secret_biometric_data

            # Register mutable scratch buffer
            scratch_buf = session.register_scratch_buffer(bytearray(b"INTERMEDIATE_TENSOR_WEIGHTS"))
            assert len(scratch_buf) > 0
            assert any(b != 0 for b in scratch_buf)

        # Upon exit from context manager (guaranteed finally block):
        # 1. The ephemeral file must be cryptographically purged and unlinked
        assert not created_file_path.exists()

        # 2. In-memory scratch buffer must be zeroed
        assert all(b == 0 for b in scratch_buf)

        # 3. Session directory itself must be completely eradicated
        session_dir = temp_volatile_dir / f"session_{job_id}"
        assert not session_dir.exists()

    def test_disallow_persistent_disk_leaks(
        self, storage_mgr: EphemeralStorageManager, tmp_path: Path
    ):
        """Zero-disk-leak enforcement: writing outside volatile root must be blocked (NFR-023)."""
        persistent_outside_dir = tmp_path / "persistent_disk_volume"
        persistent_outside_dir.mkdir(parents=True, exist_ok=True)
        leaked_path = persistent_outside_dir / "unauthorized_leak.raw"

        with pytest.raises(StorageSecurityError, match="Disk leak detected"):
            storage_mgr.assert_path_in_volatile_root(leaked_path)

    def test_session_ttl_enforcement(self, storage_mgr: EphemeralStorageManager):
        """Absolute TTL expiration enforcement per Discipline Rule 1."""
        job_id = "test-job-ttl-01"
        # Configure tight TTL of 0.05 seconds
        with storage_mgr.ephemeral_session(job_id=job_id, ttl_seconds=0.05) as session:
            time.sleep(0.08)
            with pytest.raises(SessionTTLExpiredError, match="exceeded TTL"):
                session.write_ephemeral_file("late_file.raw", b"test")


class TestParametricMannequinFallback:
    """Validates Automated Parametric Mannequin Fallback (Discipline Rule 3, NFR-011, C-037)."""

    def test_resolve_render_url_by_preset(self):
        url = MannequinFallbackSelector.resolve_render_url(mannequin_preset="hourglass")
        assert url == PARAMETRIC_MANNEQUIN_ASSETS["hourglass"]

        url_pear = MannequinFallbackSelector.resolve_render_url(mannequin_preset="pear")
        assert url_pear == PARAMETRIC_MANNEQUIN_ASSETS["pear"]

    def test_resolve_render_url_by_silhouette_fallback(self):
        url = MannequinFallbackSelector.resolve_render_url(
            silhouette_id="SIL-COUTURE-ATHLETIC-DRESS"
        )
        assert url == PARAMETRIC_MANNEQUIN_ASSETS["athletic"]

    def test_fallback_payload_conforms_to_c037(self):
        job_id = str(uuid.uuid4())
        payload = MannequinFallbackSelector.create_fallback_payload(
            job_id=job_id,
            error_code=FittingErrorCode.TIMEOUT_EXCEEDED,
            silhouette_id="hourglass",
        )

        assert payload["jobId"] == job_id
        assert payload["status"] == "FAILED"
        assert payload["errorCode"] == "TIMEOUT_EXCEEDED"
        assert "parametric mannequin" in payload["errorMessage"].lower()
        assert payload["fallbackMannequinRenderUrl"] == PARAMETRIC_MANNEQUIN_ASSETS["hourglass"]


class TestFittingCircuitBreaker:
    """Validates deadline timeouts, OOM catches, and circuit transitions (NFR-011)."""

    def test_catches_timeout_and_returns_fallback(self):
        breaker = FittingCircuitBreaker(execution_timeout_seconds=0.05)

        def slow_worker():
            time.sleep(0.08)
            return {"status": "COMPLETED"}

        fallback = breaker.execute_with_fallback(
            job_id="job-slow",
            worker_func=slow_worker,
            mannequin_preset="standard",
        )
        assert fallback["status"] == "FAILED"
        assert fallback["errorCode"] == "TIMEOUT_EXCEEDED"

    def test_catches_memory_error_and_returns_fallback(self):
        breaker = FittingCircuitBreaker()

        def oom_worker():
            raise MemoryError("CUDA out of memory in PyTorch attention module.")

        fallback = breaker.execute_with_fallback(
            job_id="job-oom",
            worker_func=oom_worker,
        )
        assert fallback["status"] == "FAILED"
        assert fallback["errorCode"] == "GPU_OUT_OF_MEMORY"

    def test_trips_to_open_after_repeated_failures(self):
        breaker = FittingCircuitBreaker(failure_threshold=2, recovery_timeout_seconds=10.0)

        def failing_worker():
            raise RuntimeError("Underlying CUDA driver fault")

        # Failure 1
        res1 = breaker.execute_with_fallback("job-1", failing_worker)
        assert res1["status"] == "FAILED"
        assert breaker.state == "CLOSED"

        # Failure 2 -> Trips circuit
        res2 = breaker.execute_with_fallback("job-2", failing_worker)
        assert res2["status"] == "FAILED"
        assert breaker.state == "OPEN"

        # Call while circuit is open immediately routes to fallback without running worker
        called = False

        def should_not_run():
            nonlocal called
            called = True
            return {"status": "COMPLETED"}

        res3 = breaker.execute_with_fallback("job-3", should_not_run)
        assert not called
        assert res3["status"] == "FAILED"
        assert "circuit open" in res3["errorMessage"].lower()


class TestOfflineWorkerSyntheticRun:
    """Validates complete offline synthetic fitting pipeline with zero remote GPU calls."""

    def test_successful_fitting_synthetic_photo_run(
        self,
        storage_mgr: EphemeralStorageManager,
        synthetic_fitting_request: FittingRequest,
    ):
        worker = NeuralFittingWorker(storage_manager=storage_mgr)
        raw_portrait = b"\xff\xd8\xff\xe0\x00\x10JFIF" + b"\x00" * 256  # Synthetic JPEG bytes

        result = worker.execute_fitting_job(
            request=synthetic_fitting_request,
            raw_photo_bytes=raw_portrait,
        )

        assert result["jobId"] == synthetic_fitting_request.jobId
        assert result["status"] == "COMPLETED"
        assert result["drapeConfidenceScore"] >= 0.92  # NFR-030 threshold
        assert result["ephemeralPhotoPurged"] is True  # NFR-023, C-037 certification
        assert "renderUrl" in result
        assert result["inferredMeasurements"]["bustCm"] > 0
        assert result["inferredMeasurements"]["waistCm"] > 0
        assert result["inferredMeasurements"]["hipCm"] > 0

    def test_mannequin_mode_without_photo(
        self,
        storage_mgr: EphemeralStorageManager,
    ):
        request = FittingRequest(
            jobId=str(uuid.uuid4()),
            userId=str(uuid.uuid4()),
            mode="mannequin",
            mannequinPreset="plus",
            fabricSku="FAB-LINEN-002",
            gsm=180.0,
            stiffnessRating=4.0,
            drapeCoefficient=0.6,
            silhouetteId="SIL-PLUS-KAFTAN-01",
            pbrTextures=PBRTextures(
                albedoUrl="https://assets.drape.style/fabrics/linen-albedo.webp",
                normalMapUrl="https://assets.drape.style/fabrics/linen-normal.webp",
                roughnessMapUrl="https://assets.drape.style/fabrics/linen-roughness.webp",
            ),
            timeoutSeconds=8,
        )

        worker = NeuralFittingWorker(storage_manager=storage_mgr)
        result = worker.execute_fitting_job(request)

        assert result["status"] == "COMPLETED"
        assert result["drapeConfidenceScore"] >= 0.92
        assert result["ephemeralPhotoPurged"] is True

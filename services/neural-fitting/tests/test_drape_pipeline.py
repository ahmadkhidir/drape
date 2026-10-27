"""Unit and offline synthetic tests for the Multimodal Neural Draping Pipeline.

Discipline Rules:
- Rule 1: Ephemeral RAM-disk photo processing with zero persistent leaks.
- Rule 2: Pinned model weights, deterministic random seeds, and precision modes.
- Rule 3: Automated parametric mannequin fallback on timeout, OOM, or worker error.
- Rule 4: Deterministic offline synthetic testing without remote GPU / Modal calls.

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

import tempfile
import time
import uuid
from pathlib import Path

import pytest
from src.app import (
    FittingRequest,
    NeuralDrapePipeline,
    NeuralFittingWorker,
    PBRTextures,
    PipelineResult,
    process_drape_task,
)
from src.ephemeral_storage import EphemeralStorageManager
from src.mannequin_fallback import (
    PARAMETRIC_MANNEQUIN_ASSETS,
    FittingCircuitBreaker,
    FittingErrorCode,
    PoseEstimationError,
    SafetyFilterRejectedError,
)
from src.pipeline import (
    DEFAULT_PRECISION_MODE,
    DEFAULT_RANDOM_SEED,
    MIN_DRAPE_FIT_SCORE_THRESHOLD,
    PINNED_WEIGHTS_DIGEST,
    DrapeFitScorer,
    ParametricGarmentMeshDeformer,
    PoseAndLandmarkEstimator,
    TextureProjectionAndMaterialSynthesizer,
)


@pytest.fixture
def temp_volatile_dir():
    """Create isolated temporary volatile root simulating /dev/shm for offline testing."""
    with tempfile.TemporaryDirectory(prefix="drape_test_shm_") as tmp_dir:
        yield Path(tmp_dir)


@pytest.fixture
def storage_manager(temp_volatile_dir: Path) -> EphemeralStorageManager:
    """Return storage manager configured for simulated volatile testing."""
    return EphemeralStorageManager(
        volatile_root=temp_volatile_dir,
        allow_simulated_for_offline_test=True,
    )


@pytest.fixture
def sample_pbr_textures() -> PBRTextures:
    """Valid PBR textures for testing."""
    return PBRTextures(
        albedoUrl="https://assets.drape.style/fabrics/silk-albedo.webp",
        normalMapUrl="https://assets.drape.style/fabrics/silk-normal.webp",
        roughnessMapUrl="https://assets.drape.style/fabrics/silk-roughness.webp",
    )


@pytest.fixture
def sample_photo_bytes() -> bytes:
    """Synthetic JPEG image bytes."""
    return b"\xff\xd8\xff\xe0\x00\x10JFIF\x00\x01\x01\x01\x00`\x00`\x00\x00" + b"\x42" * 512


@pytest.fixture
def sample_photo_request(sample_pbr_textures: PBRTextures) -> FittingRequest:
    """Valid customer photo fitting request conforming to C-037."""
    return FittingRequest(
        jobId=str(uuid.uuid4()),
        userId=str(uuid.uuid4()),
        mode="photo",
        fabricSku="FAB-SILK-001",
        gsm=95.0,
        stiffnessRating=2.5,
        drapeCoefficient=0.32,
        silhouetteId="SIL-MERMAID-CORSET-01",
        customPrompt="strapless architectural corset gown with high slit",
        pbrTextures=sample_pbr_textures,
        timeoutSeconds=8,
    )


class TestStage1PoseAndLandmarkEstimator:
    """Validates Stage 1: Anatomical landmark detection and proportional measurement inference."""

    def test_photo_mode_extracts_anatomical_landmarks_and_measurements(
        self,
        sample_photo_bytes: bytes,
    ):
        estimator = PoseAndLandmarkEstimator()
        result = estimator.estimate_pose_and_landmarks(
            mode="photo",
            raw_photo_bytes=sample_photo_bytes,
            seed=DEFAULT_RANDOM_SEED,
        )

        assert result.overallConfidence >= 0.90
        assert result.stageLatencyMs > 0

        # Verify key anatomical landmarks are present
        assert "nose" in result.landmarks
        assert "left_shoulder" in result.landmarks
        assert "right_shoulder" in result.landmarks
        assert "bust_anchor" in result.landmarks
        assert "left_waist" in result.landmarks
        assert "right_waist" in result.landmarks
        assert "left_hip" in result.landmarks
        assert "right_hip" in result.landmarks

        # Verify inferred measurements are within reasonable adult ranges (cm)
        m = result.measurements
        assert 150.0 <= m.heightCm <= 200.0
        assert 70.0 <= m.bustCm <= 120.0
        assert 50.0 <= m.waistCm <= 100.0
        assert 75.0 <= m.hipCm <= 130.0

    def test_mannequin_mode_resolves_presets(self):
        estimator = PoseAndLandmarkEstimator()
        result_std = estimator.estimate_pose_and_landmarks(
            mode="mannequin",
            mannequin_preset="standard",
        )
        assert result_std.measurements.heightCm == 175.0
        assert result_std.measurements.bustCm == 88.0

        result_plus = estimator.estimate_pose_and_landmarks(
            mode="mannequin",
            mannequin_preset="plus",
        )
        assert result_plus.measurements.bustCm == 112.0
        assert result_plus.measurements.hipCm == 120.0

        result_hourglass = estimator.estimate_pose_and_landmarks(
            mode="mannequin",
            mannequin_preset="hourglass",
        )
        assert result_hourglass.measurements.bustCm == 94.0
        assert result_hourglass.measurements.waistCm == 64.0

    def test_safety_filter_rejection_raises_specific_error(self):
        estimator = PoseAndLandmarkEstimator()
        unsafe_photo = b"\xff\xd8\xff\xe0" + b"SAFETY_TRIGGER" + b"\x00" * 64

        with pytest.raises(SafetyFilterRejectedError) as exc_info:
            estimator.estimate_pose_and_landmarks(
                mode="photo",
                raw_photo_bytes=unsafe_photo,
            )
        assert exc_info.value.error_code == FittingErrorCode.SAFETY_FILTER_REJECTED

    def test_empty_or_corrupted_photo_raises_pose_estimation_error(self):
        estimator = PoseAndLandmarkEstimator()

        with pytest.raises(PoseEstimationError):
            estimator.estimate_pose_and_landmarks(mode="photo", raw_photo_bytes=b"")

        corrupt_bytes = b"CORRUPTED_IMAGE_HEADER_TRUNCATED"
        with pytest.raises(PoseEstimationError) as exc_info:
            estimator.estimate_pose_and_landmarks(mode="photo", raw_photo_bytes=corrupt_bytes)
        assert exc_info.value.error_code == FittingErrorCode.POSE_ESTIMATION_FAILED


class TestStage2ParametricGarmentDeformer:
    """Validates Stage 2: 3D parametric garment mesh deformation under fabric physics."""

    def test_deforms_mesh_with_physics_parameters(self, sample_photo_bytes: bytes):
        estimator = PoseAndLandmarkEstimator()
        pose = estimator.estimate_pose_and_landmarks("photo", raw_photo_bytes=sample_photo_bytes)

        deformer = ParametricGarmentMeshDeformer()

        # Test fluid fabric (low GSM, low stiffness, low drape coefficient: silk georgette)
        fluid_mesh = deformer.deform_garment_mesh(
            silhouette_id="SIL-GRECIAN-BIAS-02",
            landmarks=pose.landmarks,
            measurements=pose.measurements,
            gsm=85.0,
            stiffness_rating=1.8,
            drape_coefficient=0.25,
        )

        assert fluid_mesh.vertexCount == 2048
        assert fluid_mesh.faceCount == 4032
        assert fluid_mesh.foldAmplitude > 0.5
        assert fluid_mesh.meanStrain >= 0.0

        # Test stiff structural fabric (high GSM, high stiffness: heavy brocade/denim)
        stiff_mesh = deformer.deform_garment_mesh(
            silhouette_id="SIL-GRECIAN-BIAS-02",
            landmarks=pose.landmarks,
            measurements=pose.measurements,
            gsm=380.0,
            stiffness_rating=8.5,
            drape_coefficient=0.82,
        )

        # Stiffer fabric resists fold amplitude compared to fluid fabric
        assert stiff_mesh.foldAmplitude < fluid_mesh.foldAmplitude
        assert stiff_mesh.drapeEnergy > fluid_mesh.drapeEnergy


class TestStage3MaterialSynthesizer:
    """Validates Stage 3: Texture projection and PBR material synthesis."""

    def test_synthesizes_high_resolution_render(
        self,
        sample_photo_bytes: bytes,
        sample_pbr_textures: PBRTextures,
    ):
        estimator = PoseAndLandmarkEstimator()
        pose = estimator.estimate_pose_and_landmarks("photo", raw_photo_bytes=sample_photo_bytes)

        deformer = ParametricGarmentMeshDeformer()
        mesh = deformer.deform_garment_mesh(
            silhouette_id="SIL-CAPE-01",
            landmarks=pose.landmarks,
            measurements=pose.measurements,
            gsm=120.0,
            stiffness_rating=3.0,
            drape_coefficient=0.4,
        )

        synthesizer = TextureProjectionAndMaterialSynthesizer()
        job_id = "test-job-uuid-1234"
        result = synthesizer.synthesize_material_and_render(
            job_id=job_id,
            deformed_mesh=mesh,
            pbr_textures=sample_pbr_textures,
            fabric_sku="FAB-SILK-001",
            gsm=120.0,
            stiffness_rating=3.0,
            precision_mode=DEFAULT_PRECISION_MODE,
        )

        assert (
            result.renderUrl
            == f"https://assets.drape.style/fittings/renders/{job_id}/front-view.webp"
        )
        assert result.resolution == "1440x2560"  # FEAT-004 specification
        assert result.pbrApplied is True
        assert result.colorTemperatureK == 5400


class TestQuantitativeDrapeFitScorer:
    """Validates drape fit score calculation conforming to NFR-030 (threshold >= 0.92)."""

    def test_drape_fit_score_meets_nfr030_threshold(self, sample_photo_bytes: bytes):
        pipeline = NeuralDrapePipeline()
        estimator = pipeline.pose_estimator
        pose = estimator.estimate_pose_and_landmarks("photo", raw_photo_bytes=sample_photo_bytes)

        mesh = pipeline.mesh_deformer.deform_garment_mesh(
            silhouette_id="SIL-MERMAID-01",
            landmarks=pose.landmarks,
            measurements=pose.measurements,
            gsm=150.0,
            stiffness_rating=4.0,
            drape_coefficient=0.45,
        )

        score = DrapeFitScorer.calculate_drape_confidence_score(
            mesh_result=mesh,
            gsm=150.0,
            stiffness_rating=4.0,
            drape_coefficient=0.45,
        )

        assert score >= MIN_DRAPE_FIT_SCORE_THRESHOLD  # >= 0.92 (NFR-030)
        assert score <= 1.0


class TestPipelineDeterminismAndPinnedWeights:
    """Validates Discipline Rule 2: immutable weights, pinned precision, deterministic seed."""

    def test_pipeline_produces_deterministic_numerical_output(
        self,
        sample_photo_bytes: bytes,
        sample_pbr_textures: PBRTextures,
    ):
        pipeline = NeuralDrapePipeline(
            pinned_weights_digest=PINNED_WEIGHTS_DIGEST,
            random_seed=42,
            precision_mode="fp16",
        )

        job_id = "job-deterministic-eval"

        res1: PipelineResult = pipeline.run_pipeline(
            job_id=job_id,
            mode="photo",
            silhouette_id="SIL-TUXEDO-01",
            fabric_sku="FAB-WOOL-001",
            gsm=260.0,
            stiffness_rating=6.0,
            drape_coefficient=0.65,
            pbr_textures=sample_pbr_textures,
            raw_photo_bytes=sample_photo_bytes,
        )

        res2: PipelineResult = pipeline.run_pipeline(
            job_id=job_id,
            mode="photo",
            silhouette_id="SIL-TUXEDO-01",
            fabric_sku="FAB-WOOL-001",
            gsm=260.0,
            stiffness_rating=6.0,
            drape_coefficient=0.65,
            pbr_textures=sample_pbr_textures,
            raw_photo_bytes=sample_photo_bytes,
        )

        # Bit-for-bit identical outputs with pinned seed
        assert res1.drapeConfidenceScore == res2.drapeConfidenceScore
        assert res1.inferredMeasurements == res2.inferredMeasurements
        assert res1.meshSummary["meanStrain"] == res2.meshSummary["meanStrain"]
        assert res1.meshSummary["foldAmplitude"] == res2.meshSummary["foldAmplitude"]
        assert res1.meshSummary["pinnedWeightsDigest"] == PINNED_WEIGHTS_DIGEST
        assert res1.meshSummary["precisionMode"] == "fp16"


class TestWorkerEphemeralRAMDiskLifecycle:
    """Validates Discipline Rule 1 & NFR-023/NFR-040: zero persistent leaks, cryptographic wipe."""

    def test_ephemeral_photo_wiped_and_unlinked_after_fitting(
        self,
        storage_manager: EphemeralStorageManager,
        sample_photo_request: FittingRequest,
        sample_photo_bytes: bytes,
    ):
        worker = NeuralFittingWorker(storage_manager=storage_manager)

        # Confirm volatile root is initially empty
        assert len(list(storage_manager.volatile_root.glob("session_*"))) == 0

        result = worker.execute_fitting_job(
            request=sample_photo_request,
            raw_photo_bytes=sample_photo_bytes,
        )

        # Contract assertion: C-037 success payload
        assert result["status"] == "COMPLETED"
        assert result["jobId"] == sample_photo_request.jobId
        assert result["ephemeralPhotoPurged"] is True  # NFR-040 certification
        assert result["drapeConfidenceScore"] >= 0.92  # NFR-030
        assert "renderUrl" in result
        assert result["inferredMeasurements"]["bustCm"] > 0

        # Memory assertion: session directory and portrait file completely eradicated
        remaining_sessions = list(storage_manager.volatile_root.glob("session_*"))
        assert len(remaining_sessions) == 0

    def test_ephemeral_photo_wiped_even_when_worker_fails(
        self,
        storage_manager: EphemeralStorageManager,
        sample_photo_request: FittingRequest,
    ):
        worker = NeuralFittingWorker(storage_manager=storage_manager)
        unsafe_photo = b"\xff\xd8\xff\xe0" + b"SAFETY_TRIGGER" + b"\x00" * 64

        fallback_result = worker.execute_fitting_job(
            request=sample_photo_request,
            raw_photo_bytes=unsafe_photo,
        )

        # Fallback payload assertions conforming to C-037
        assert fallback_result["status"] == "FAILED"
        assert fallback_result["errorCode"] == FittingErrorCode.SAFETY_FILTER_REJECTED.value
        assert "fallbackMannequinRenderUrl" in fallback_result

        # Memory assertion: despite exception, volatile RAM files are wiped in finally block
        remaining_sessions = list(storage_manager.volatile_root.glob("session_*"))
        assert len(remaining_sessions) == 0


class TestCircuitBreakerAndParametricMannequinFallback:
    """Validates Discipline Rule 3 & NFR-011: deadline timeouts, OOM catches, mannequin fallback."""

    def test_timeout_downgrades_to_parametric_mannequin(
        self,
        storage_manager: EphemeralStorageManager,
        sample_photo_request: FittingRequest,
        sample_photo_bytes: bytes,
    ):
        # Configure strict 0.05s timeout
        strict_breaker = FittingCircuitBreaker(execution_timeout_seconds=0.02)
        worker = NeuralFittingWorker(
            storage_manager=storage_manager,
            circuit_breaker=strict_breaker,
        )

        # Monkey-patch pipeline step to simulate GPU worker delay
        orig_run = worker.pipeline.run_pipeline

        def slow_run(*args, **kwargs):
            time.sleep(0.04)
            return orig_run(*args, **kwargs)

        worker.pipeline.run_pipeline = slow_run  # type: ignore

        fallback_result = worker.execute_fitting_job(
            request=sample_photo_request,
            raw_photo_bytes=sample_photo_bytes,
        )

        assert fallback_result["status"] == "FAILED"
        assert fallback_result["errorCode"] == FittingErrorCode.TIMEOUT_EXCEEDED.value
        err_msg = fallback_result["errorMessage"].lower()
        assert "budget" in err_msg or "deadline" in err_msg
        assert "fallbackMannequinRenderUrl" in fallback_result

    def test_gpu_out_of_memory_downgrades_to_parametric_mannequin(
        self,
        storage_manager: EphemeralStorageManager,
        sample_photo_request: FittingRequest,
        sample_photo_bytes: bytes,
    ):
        worker = NeuralFittingWorker(storage_manager=storage_manager)

        def oom_run(*args, **kwargs):
            raise MemoryError("CUDA out of memory during neural drape tensor pass")

        worker.pipeline.run_pipeline = oom_run  # type: ignore

        fallback_result = worker.execute_fitting_job(
            request=sample_photo_request,
            raw_photo_bytes=sample_photo_bytes,
        )

        assert fallback_result["status"] == "FAILED"
        assert fallback_result["errorCode"] == FittingErrorCode.GPU_OUT_OF_MEMORY.value
        expected_url = PARAMETRIC_MANNEQUIN_ASSETS["standard"]
        assert fallback_result["fallbackMannequinRenderUrl"] == expected_url


class TestAsyncAMQPTaskRunner:
    """Validates async task runner entrypoint processing AMQP neural.drape.generate contract."""

    @pytest.mark.asyncio
    async def test_process_drape_task_async_conforms_to_c037(
        self,
        storage_manager: EphemeralStorageManager,
        sample_photo_request: FittingRequest,
        sample_photo_bytes: bytes,
    ):
        worker = NeuralFittingWorker(storage_manager=storage_manager)
        payload = sample_photo_request.model_dump()

        result = await process_drape_task(
            payload=payload,
            raw_photo_bytes=sample_photo_bytes,
            worker=worker,
        )

        assert result["status"] == "COMPLETED"
        assert result["jobId"] == sample_photo_request.jobId
        assert result["ephemeralPhotoPurged"] is True
        assert result["drapeConfidenceScore"] >= 0.92
        assert "renderUrl" in result
        assert isinstance(result["inferenceTimeMs"], int)

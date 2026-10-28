"""Unit and offline synthetic tests for Neural Motion Pipeline (FEAT-006 / C-038).

Discipline Rules:
- Rule 1: Ephemeral RAM-disk processing with guaranteed zero disk leaks (NFR-023).
- Rule 2: Deterministic pipelines with reproducible physics and trajectories.
- Rule 4: Deterministic offline synthetic testing without remote GPU / Modal calls.

Permanent spec anchors:
- FEAT-006: 360-degree Looping Neural Motion & Garment Walk
- NFR-005: Video render latency target (4.2s / 6.0s / 8.5s)
- NFR-031: Temporal Coherence & Mesh Integrity (SSIM >= 0.94, zero mesh tearing)
- NFR-023: Ephemeral memory encryption & volatile RAM-disk processing
- C-038: AMQP neural.motion.generate interface
"""

import tempfile
import uuid
from pathlib import Path

import pytest
from src.amqp_motion_consumer import (
    AMQPMotionConsumer,
    MotionGenerationRequest,
)
from src.ephemeral_storage import EphemeralStorageManager
from src.motion_pipeline import (
    MAX_MESH_STRAIN_LIMIT,
    MIN_TEMPORAL_COHERENCE_SSIM,
    TARGET_DURATION_MS,
    TARGET_FPS,
    TARGET_FRAME_COUNT,
    TARGET_HEIGHT,
    TARGET_WIDTH,
    ClothParameters,
    GenerationTimeoutError,
    MeshTearingError,
    NeuralMotionPipeline,
    TemporalCoherenceError,
    TemporalCoherenceValidator,
    TrajectoryPhysicsEngine,
)


@pytest.fixture
def temp_volatile_dir():
    """Create isolated temporary volatile root simulating /dev/shm for offline testing."""
    with tempfile.TemporaryDirectory(prefix="drape_motion_shm_") as tmp_dir:
        yield Path(tmp_dir)


@pytest.fixture
def storage_manager(temp_volatile_dir: Path) -> EphemeralStorageManager:
    """Return storage manager configured for simulated volatile testing."""
    return EphemeralStorageManager(
        volatile_root=temp_volatile_dir,
        allow_simulated_for_offline_test=True,
    )


@pytest.fixture
def silk_cloth() -> ClothParameters:
    """Light, flowing bias-cut silk fabric."""
    return ClothParameters(
        gsm=85.0,
        bendingModulus=0.08,
        drapeCoefficient=0.22,
        fabricSku="FAB-SILK-CHARMEUSE-001",
    )


@pytest.fixture
def wool_cloth() -> ClothParameters:
    """Heavy, tailored worsted wool fabric."""
    return ClothParameters(
        gsm=380.0,
        bendingModulus=3.20,
        drapeCoefficient=0.75,
        fabricSku="FAB-WOOL-WORSTED-002",
    )


@pytest.fixture
def sample_motion_request(silk_cloth: ClothParameters) -> MotionGenerationRequest:
    """Valid motion task request conforming strictly to C-038."""
    return MotionGenerationRequest(
        motionJobId=str(uuid.uuid4()),
        fittingId=str(uuid.uuid4()),
        staticRenderUrl="https://assets.drape.style/renders/fitting-1234.webp",
        fabricSku=silk_cloth.fabricSku,
        gsm=silk_cloth.gsm,
        bendingModulus=silk_cloth.bendingModulus,
        trajectoryPreset="turntable_360",
        fps=30,
        durationMs=4000,
    )


class TestTrajectoryPhysicsEngine:
    """Tests 360-degree turntable and catwalk walking trajectory physics."""

    def test_turntable_360_periodic_boundary_conditions(self, silk_cloth: ClothParameters):
        """Verify 360 turntable produces exactly 120 frames with seamless cyclic loop."""
        states = TrajectoryPhysicsEngine.compute_frame_states(
            preset="turntable_360",
            cloth=silk_cloth,
            frame_count=TARGET_FRAME_COUNT,
            duration_ms=TARGET_DURATION_MS,
        )

        assert len(states) == 120
        assert states[0].frameIndex == 0
        assert states[0].rotationAngleRad == 0.0

        # After 120 frames, angle approaches 2*pi
        last_state = states[-1]
        assert last_state.frameIndex == 119
        dt_sec = 4.0 / 120
        expected_last_angle = (2.0 * 3.141592653589793 / 4.0) * (119 * dt_sec)
        assert pytest.approx(last_state.rotationAngleRad, rel=1e-2) == expected_last_angle

        # Cyclic boundary: displacement is zero in turntable
        assert states[0].forwardDisplacementM == 0.0
        assert last_state.forwardDisplacementM == 0.0

    def test_centrifugal_flare_varies_with_fabric_properties(
        self,
        silk_cloth: ClothParameters,
        wool_cloth: ClothParameters,
    ):
        """Verify bias-cut silk flares significantly more than heavy worsted wool."""
        silk_states = TrajectoryPhysicsEngine.compute_frame_states("turntable_360", silk_cloth)
        wool_states = TrajectoryPhysicsEngine.compute_frame_states("turntable_360", wool_cloth)

        mean_silk_flare = sum(s.centrifugalFlareRad for s in silk_states) / len(silk_states)
        mean_wool_flare = sum(s.centrifugalFlareRad for s in wool_states) / len(wool_states)

        assert mean_silk_flare > mean_wool_flare
        # Silk billows with centrifugal motion
        assert mean_silk_flare > 0.08
        # Wool resists centrifugal flare
        assert mean_wool_flare < 0.06

    def test_runway_step_turn_cadence_and_inertia(self, silk_cloth: ClothParameters):
        """Verify catwalk walk cadence, pivot turn, and settling with cloth inertia."""
        states = TrajectoryPhysicsEngine.compute_frame_states(
            preset="runway_step_turn",
            cloth=silk_cloth,
            frame_count=TARGET_FRAME_COUNT,
            duration_ms=TARGET_DURATION_MS,
        )

        assert len(states) == 120
        # Subject steps forward and returns to starting point (periodic loop)
        assert states[0].forwardDisplacementM == pytest.approx(0.0, abs=1e-3)
        # Midway displacement is positive
        max_forward = max(s.forwardDisplacementM for s in states)
        assert max_forward > 0.15

        # Cloth inertia lag is simulated
        assert any(abs(s.clothInertiaLagM) > 0.005 for s in states)


class TestTemporalCoherenceValidator:
    """Tests NFR-031 temporal coherence bar (SSIM >= 0.94) and mesh tearing checks."""

    def test_nfr031_temporal_coherence_and_zero_mesh_tearing(self, silk_cloth: ClothParameters):
        """Verify motion sequence achieves SSIM >= 0.94 and zero mesh tearing."""
        states = TrajectoryPhysicsEngine.compute_frame_states("turntable_360", silk_cloth)

        mean_ssim, min_ssim, max_strain = TemporalCoherenceValidator.validate_motion_sequence(
            states=states,
            cloth=silk_cloth,
            min_ssim_threshold=MIN_TEMPORAL_COHERENCE_SSIM,
            max_strain_threshold=MAX_MESH_STRAIN_LIMIT,
        )

        assert mean_ssim >= MIN_TEMPORAL_COHERENCE_SSIM
        assert min_ssim >= MIN_TEMPORAL_COHERENCE_SSIM
        # Zero mesh tearing: strain must stay strictly below 5%
        assert max_strain < MAX_MESH_STRAIN_LIMIT
        assert max_strain < 0.04

    def test_coherence_failure_raises_temporal_coherence_error(self, silk_cloth: ClothParameters):
        """Verify validator raises TemporalCoherenceError when SSIM degrades."""
        states = TrajectoryPhysicsEngine.compute_frame_states("turntable_360", silk_cloth)

        with pytest.raises(TemporalCoherenceError, match="Temporal coherence failure"):
            TemporalCoherenceValidator.validate_motion_sequence(
                states=states,
                cloth=silk_cloth,
                min_ssim_threshold=0.9999,  # Unattainably high threshold triggers failure
            )

    def test_mesh_tearing_raises_mesh_tearing_error(self, silk_cloth: ClothParameters):
        """Verify validator raises MeshTearingError when strain exceeds limit."""
        states = TrajectoryPhysicsEngine.compute_frame_states("turntable_360", silk_cloth)
        # Inject artificial tearing
        states[45].meshStrain = 0.085

        with pytest.raises(MeshTearingError, match="mesh tearing detected"):
            TemporalCoherenceValidator.validate_motion_sequence(
                states=states,
                cloth=silk_cloth,
                max_strain_threshold=MAX_MESH_STRAIN_LIMIT,
            )


class TestNeuralMotionPipeline:
    """Tests end-to-end video synthesis and ephemeral storage lifecycle."""

    def test_pipeline_generates_4s_seamless_looping_video(
        self,
        storage_manager: EphemeralStorageManager,
        silk_cloth: ClothParameters,
    ):
        """Verify generation of 1080x1920 30FPS 4s looping video with sprite preview."""
        pipeline = NeuralMotionPipeline(storage_manager=storage_manager)

        result = pipeline.generate_motion(
            fitting_id=str(uuid.uuid4()),
            static_render_url="https://assets.drape.style/renders/sample.webp",
            cloth=silk_cloth,
            motion_preset="turntable_360",
        )

        assert result.status == "COMPLETED"
        assert result.durationMs == TARGET_DURATION_MS  # 4000
        assert result.fps == TARGET_FPS  # 30
        assert result.frameCount == TARGET_FRAME_COUNT  # 120
        assert result.resolution == (TARGET_WIDTH, TARGET_HEIGHT)  # (1080, 1920)
        assert result.meanSsim >= MIN_TEMPORAL_COHERENCE_SSIM  # >= 0.94
        assert result.maxMeshStrain < MAX_MESH_STRAIN_LIMIT  # < 0.05
        assert result.videoUrl.startswith("https://assets.drape.style/motion/")
        assert result.videoUrl.endswith("loop_1080x1920.mp4")
        assert result.thumbnailSpriteUrl.endswith("scrub_sprite.webp")
        assert result.ephemeralPurged is True

    def test_runway_step_turn_synthesis(
        self,
        storage_manager: EphemeralStorageManager,
        wool_cloth: ClothParameters,
    ):
        """Verify runway_step_turn trajectory preset generation."""
        pipeline = NeuralMotionPipeline(storage_manager=storage_manager)

        result = pipeline.generate_motion(
            fitting_id=str(uuid.uuid4()),
            static_render_url="https://assets.drape.style/renders/wool-trousers.webp",
            cloth=wool_cloth,
            motion_preset="runway_step_turn",
        )

        assert result.status == "COMPLETED"
        assert result.meanSsim >= MIN_TEMPORAL_COHERENCE_SSIM
        assert result.maxMeshStrain < MAX_MESH_STRAIN_LIMIT

    def test_nfr023_ephemeral_storage_lifecycle_and_wipe(
        self,
        temp_volatile_dir: Path,
        storage_manager: EphemeralStorageManager,
        silk_cloth: ClothParameters,
    ):
        """Verify scratch RAM-disk buffers are cryptographically wiped and unlinked."""
        pipeline = NeuralMotionPipeline(storage_manager=storage_manager)

        result = pipeline.generate_motion(
            fitting_id=str(uuid.uuid4()),
            static_render_url="https://assets.drape.style/renders/sample.webp",
            cloth=silk_cloth,
            motion_preset="turntable_360",
        )

        assert result.status == "COMPLETED"
        # Verify zero persistent or scratch files remain in volatile root
        remaining_files = list(temp_volatile_dir.glob("**/*"))
        assert len(remaining_files) == 0

    def test_ephemeral_storage_wiped_even_on_error(
        self,
        temp_volatile_dir: Path,
        storage_manager: EphemeralStorageManager,
        silk_cloth: ClothParameters,
    ):
        """Verify ephemeral memory is wiped even when simulation fails."""
        pipeline = NeuralMotionPipeline(storage_manager=storage_manager)

        with pytest.raises(TemporalCoherenceError):
            pipeline.generate_motion(
                fitting_id=str(uuid.uuid4()),
                static_render_url="https://assets.drape.style/renders/sample.webp",
                cloth=silk_cloth,
                inject_degrade_ssim=True,
            )

        # Zero scratch files leak into volatile storage
        remaining_files = list(temp_volatile_dir.glob("**/*"))
        assert len(remaining_files) == 0

    def test_nfr005_latency_timeout_enforcement(
        self,
        storage_manager: EphemeralStorageManager,
        silk_cloth: ClothParameters,
    ):
        """Verify pipeline raises GenerationTimeoutError when latency budget exceeded."""
        pipeline = NeuralMotionPipeline(
            storage_manager=storage_manager,
            latency_budget_seconds=0.05,  # Tight budget for test
        )

        with pytest.raises(GenerationTimeoutError, match="exceeded latency budget"):
            pipeline.generate_motion(
                fitting_id=str(uuid.uuid4()),
                static_render_url="https://assets.drape.style/renders/sample.webp",
                cloth=silk_cloth,
                inject_latency_sec=0.08,
            )


class TestAMQPMotionConsumer:
    """Tests AMQP C-038 contract conformity, error codes, and async consumer."""

    def test_consumer_handles_valid_request_conforming_to_c038(
        self,
        storage_manager: EphemeralStorageManager,
        sample_motion_request: MotionGenerationRequest,
    ):
        """Verify consumer returns structured JSON conforming strictly to C-038."""
        consumer = AMQPMotionConsumer(storage_manager=storage_manager)

        response = consumer.handle_message(sample_motion_request.model_dump())

        assert response["status"] == "COMPLETED"
        assert response["motionJobId"] == sample_motion_request.motionJobId
        assert response["fittingId"] == sample_motion_request.fittingId
        assert response["durationMs"] == 4000
        assert response["fps"] == 30
        assert response["videoUrl"].endswith(".mp4")
        assert response["thumbnailSpriteUrl"].endswith(".webp")
        assert "renderTimeMs" in response
        assert response["renderTimeMs"] >= 0

    def test_consumer_returns_temporal_coherence_failure_on_mesh_tearing(
        self,
        storage_manager: EphemeralStorageManager,
        sample_motion_request: MotionGenerationRequest,
    ):
        """Verify consumer returns TEMPORAL_COHERENCE_FAILURE error when mesh tears."""
        consumer = AMQPMotionConsumer(storage_manager=storage_manager)

        response = consumer.execute_motion_job(
            request=sample_motion_request,
            inject_mesh_strain=0.09,  # Triggers mesh tearing
        )

        assert response["status"] == "FAILED"
        assert response["motionJobId"] == sample_motion_request.motionJobId
        assert response["errorCode"] == "TEMPORAL_COHERENCE_FAILURE"
        assert "mesh tearing detected" in response["errorMessage"]

    def test_consumer_returns_temporal_coherence_failure_on_ssim_drop(
        self,
        storage_manager: EphemeralStorageManager,
        sample_motion_request: MotionGenerationRequest,
    ):
        """Verify consumer returns TEMPORAL_COHERENCE_FAILURE error when SSIM drops."""
        consumer = AMQPMotionConsumer(storage_manager=storage_manager)

        response = consumer.execute_motion_job(
            request=sample_motion_request,
            inject_degrade_ssim=True,
        )

        assert response["status"] == "FAILED"
        assert response["motionJobId"] == sample_motion_request.motionJobId
        assert response["errorCode"] == "TEMPORAL_COHERENCE_FAILURE"
        assert "temporal coherence failure" in response["errorMessage"].lower()

    def test_consumer_returns_gpu_worker_timeout(
        self,
        storage_manager: EphemeralStorageManager,
        sample_motion_request: MotionGenerationRequest,
    ):
        """Verify consumer returns GPU_WORKER_TIMEOUT error code on timeout."""
        pipeline = NeuralMotionPipeline(
            storage_manager=storage_manager,
            latency_budget_seconds=0.05,
        )
        consumer = AMQPMotionConsumer(
            pipeline=pipeline,
            storage_manager=storage_manager,
            timeout_seconds=0.05,
        )

        response = consumer.execute_motion_job(
            request=sample_motion_request,
            inject_latency_sec=0.10,
        )

        assert response["status"] == "FAILED"
        assert response["motionJobId"] == sample_motion_request.motionJobId
        assert response["errorCode"] == "GPU_WORKER_TIMEOUT"

    @pytest.mark.asyncio
    async def test_async_process_motion_task_success(
        self,
        storage_manager: EphemeralStorageManager,
        sample_motion_request: MotionGenerationRequest,
    ):
        """Verify asynchronous AMQP task execution via process_motion_task."""
        consumer = AMQPMotionConsumer(storage_manager=storage_manager)

        response = await consumer.process_motion_task(sample_motion_request.model_dump())

        assert response["status"] == "COMPLETED"
        assert response["motionJobId"] == sample_motion_request.motionJobId
        assert response["durationMs"] == 4000
        assert response["fps"] == 30

    @pytest.mark.asyncio
    async def test_async_process_motion_task_deadline_timeout(
        self,
        storage_manager: EphemeralStorageManager,
        sample_motion_request: MotionGenerationRequest,
    ):
        """Verify async deadline timeout returns GPU_WORKER_TIMEOUT."""
        consumer = AMQPMotionConsumer(
            storage_manager=storage_manager,
            timeout_seconds=0.05,  # Short timeout
        )

        # Patch pipeline to simulate long worker execution
        def slow_generate(*args, **kwargs):
            import time

            time.sleep(0.15)
            raise TimeoutError("worker timed out")

        consumer.pipeline.generate_motion = slow_generate  # type: ignore

        response = await consumer.process_motion_task(sample_motion_request.model_dump())

        assert response["status"] == "FAILED"
        assert response["errorCode"] == "GPU_WORKER_TIMEOUT"

    def test_consumer_handles_invalid_message_gracefully(
        self,
        storage_manager: EphemeralStorageManager,
    ):
        """Verify invalid payload returns structured failure with error details."""
        consumer = AMQPMotionConsumer(storage_manager=storage_manager)
        bad_message = {"motionJobId": "invalid-request"}

        response = consumer.handle_message(bad_message)

        assert response["status"] == "FAILED"
        assert response["errorCode"] == "TEMPORAL_COHERENCE_FAILURE"
        assert "validation failed" in response["errorMessage"].lower()

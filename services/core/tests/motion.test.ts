/**
 * 360° Looping Neural Motion Service & AMQP Dispatch Test Suite
 * Spec Anchor: docs/Drape/features/FEAT-006.md, CONTRACTS.md (C-014, C-015, C-038),
 * analytics.md (EVT-008), nfr.md (NFR-005)
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildServer } from '../src/server.js';
import { motionService, type AMQPMessageDispatcher, type AmqpMotionGeneratePayload } from '../src/services/motion.service.js';
import { store } from '../src/db/store.js';
import { signJwt } from '../src/utils/crypto.js';

describe('360° Neural Motion & AMQP Dispatch System (FEAT-006, C-014, C-015, C-038, EVT-008, NFR-005)', () => {
  let app: FastifyInstance;
  let atelierClientToken: string;
  let coutureProToken: string;
  let guestExplorerToken: string;

  const elenaUserId = '11111111-1111-4111-a111-111111111111'; // Atelier Client (has swatch credit)
  const julienUserId = '55555555-5555-5555-a555-555555555555'; // Couture Studio Pro designer
  const freeGuestUserId = '66666666-6666-6666-a666-666666666666'; // Free Guest Explorer (no orders)

  const readyFittingId = '33333333-3333-4333-a333-333333333333';
  const pendingFittingId = '44444444-4444-4444-a444-444444444444';

  beforeAll(async () => {
    app = await buildServer({
      fastifyOptions: { logger: false },
    });

    // Atelier Client Token (Elena Rostova - customer with prior swatch box credit)
    atelierClientToken = signJwt({
      sub: elenaUserId,
      email: 'elena@rostova-atelier.com',
      fullName: 'Elena Rostova',
      role: 'customer',
      tier: 'atelier_client',
    });

    // Couture Studio Pro Token (Julien Moreau - atelier_pro role)
    coutureProToken = signJwt({
      sub: julienUserId,
      email: 'julien@moreau-couture.fr',
      fullName: 'Julien Moreau',
      role: 'atelier_pro',
      tier: 'couture_studio_pro',
    });

    // Guest Explorer Token (unpaid visitor - no tier, no orders)
    guestExplorerToken = signJwt({
      sub: freeGuestUserId,
      email: 'guest@explorer.com',
      fullName: 'Guest Explorer',
      role: 'customer',
    });
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  beforeEach(() => {
    motionService.reset();
  });

  describe('C-014: POST /api/v1/fittings/:id/motion (Initiate Motion Generation)', () => {
    it('initiates 360° turntable motion generation, returns 202 Accepted with job metadata', async () => {
      const res = await app.inject({
        method: 'POST',
        url: `/api/v1/fittings/${readyFittingId}/motion`,
        headers: {
          authorization: `Bearer ${atelierClientToken}`,
        },
        payload: {
          trajectoryPreset: 'turntable_360',
          fps: 30,
          durationMs: 4000,
        },
      });

      expect(res.statusCode).toBe(202);
      const body = JSON.parse(res.body);

      expect(body.motionJobId).toBeTypeOf('string');
      expect(body.fittingId).toBe(readyFittingId);
      expect(body.status).toBe('queued');
      expect(body.estimatedWaitSeconds).toBeTypeOf('number');
      expect(body.estimatedWaitSeconds).toBeGreaterThan(0);
      expect(body.queuePosition).toBe(1);
    });

    it('enqueues AMQP neural.motion.generate message conforming strictly to C-038 contract', async () => {
      const res = await app.inject({
        method: 'POST',
        url: `/api/v1/fittings/${readyFittingId}/motion`,
        headers: {
          authorization: `Bearer ${coutureProToken}`,
        },
        payload: {
          trajectoryPreset: 'runway_step_turn',
          fps: 30,
          durationMs: 4000,
        },
      });

      expect(res.statusCode).toBe(202);
      const body = JSON.parse(res.body);

      // Verify C-038 AMQP message envelope in motionService
      const dispatched = motionService.getDispatchedMessages();
      expect(dispatched.length).toBe(1);

      const amqpMsg = dispatched[0];
      expect(amqpMsg.routingKey).toBe('neural.motion.generate');
      expect(amqpMsg.message.motionJobId).toBe(body.motionJobId);
      expect(amqpMsg.message.fittingId).toBe(readyFittingId);
      expect(amqpMsg.message.staticRenderUrl).toBe('https://cdn.drape.luxury/renders/fitting_33333333.webp');
      expect(amqpMsg.message.fabricSku).toBe('FAB-SLK-892');
      expect(amqpMsg.message.gsm).toBe(320);
      expect(amqpMsg.message.bendingModulus).toBe(4.5);
      expect(amqpMsg.message.trajectoryPreset).toBe('runway_step_turn');
      expect(amqpMsg.message.fps).toBe(30);
      expect(amqpMsg.message.durationMs).toBe(4000);
    });

    it('uses default trajectoryPreset turntable_360 when omitted in request body', async () => {
      const res = await app.inject({
        method: 'POST',
        url: `/api/v1/fittings/${readyFittingId}/motion`,
        headers: {
          authorization: `Bearer ${atelierClientToken}`,
        },
        payload: {},
      });

      expect(res.statusCode).toBe(202);
      const dispatched = motionService.getDispatchedMessages();
      expect(dispatched[0].message.trajectoryPreset).toBe('turntable_360');
      expect(dispatched[0].message.fps).toBe(30);
      expect(dispatched[0].message.durationMs).toBe(4000);
    });

    it('rejects unauthenticated request with 401 UNAUTHORIZED', async () => {
      const res = await app.inject({
        method: 'POST',
        url: `/api/v1/fittings/${readyFittingId}/motion`,
        payload: {
          trajectoryPreset: 'turntable_360',
        },
      });

      expect(res.statusCode).toBe(401);
      const body = JSON.parse(res.body);
      expect(body.code).toBe('UNAUTHORIZED');
      expect(body.message).toContain('Authentication required');
    });

    it('rejects Free Guest Explorer with 402 TIER_RESTRICTION per monetization rules', async () => {
      const res = await app.inject({
        method: 'POST',
        url: `/api/v1/fittings/${readyFittingId}/motion`,
        headers: {
          authorization: `Bearer ${guestExplorerToken}`,
        },
        payload: {
          trajectoryPreset: 'turntable_360',
        },
      });

      expect(res.statusCode).toBe(402);
      const body = JSON.parse(res.body);
      expect(body.code).toBe('TIER_RESTRICTION');
      expect(body.message).toContain('Atelier Client or Couture Studio Pro subscription');
    });

    it('rejects non-existent fitting with 404 FITTING_NOT_FOUND', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/fittings/99999999-9999-9999-9999-999999999999/motion',
        headers: {
          authorization: `Bearer ${atelierClientToken}`,
        },
        payload: {},
      });

      expect(res.statusCode).toBe(404);
      const body = JSON.parse(res.body);
      expect(body.code).toBe('FITTING_NOT_FOUND');
      expect(body.message).toContain('Base fitting render not found');
    });

    it('rejects incomplete static fitting with 409 FITTING_NOT_READY', async () => {
      const res = await app.inject({
        method: 'POST',
        url: `/api/v1/fittings/${pendingFittingId}/motion`,
        headers: {
          authorization: `Bearer ${atelierClientToken}`,
        },
        payload: {},
      });

      expect(res.statusCode).toBe(409);
      const body = JSON.parse(res.body);
      expect(body.code).toBe('FITTING_NOT_READY');
      expect(body.message).toContain('Cannot generate motion video while base static fitting is still processing');
    });

    it('rejects invalid parameters with 400 VALIDATION_FAILED', async () => {
      const res = await app.inject({
        method: 'POST',
        url: `/api/v1/fittings/${readyFittingId}/motion`,
        headers: {
          authorization: `Bearer ${atelierClientToken}`,
        },
        payload: {
          trajectoryPreset: 'invalid_orbit_preset',
          fps: 60, // must be 30
          durationMs: 8000, // must be 4000
        },
      });

      expect(res.statusCode).toBe(400);
      const body = JSON.parse(res.body);
      expect(body.code).toBe('VALIDATION_FAILED');
      expect(body.fields).toBeDefined();
    });

    it('rejects request with 503 VIDEO_QUEUE_FULL when queue reaches maximum capacity (NFR-005)', async () => {
      // Set queue capacity to 1 for this test
      motionService.maxQueueCapacity = 1;

      // First job fills the queue
      const res1 = await app.inject({
        method: 'POST',
        url: `/api/v1/fittings/${readyFittingId}/motion`,
        headers: {
          authorization: `Bearer ${atelierClientToken}`,
        },
        payload: {},
      });
      expect(res1.statusCode).toBe(202);

      // Second job exceeds capacity
      const res2 = await app.inject({
        method: 'POST',
        url: `/api/v1/fittings/${readyFittingId}/motion`,
        headers: {
          authorization: `Bearer ${atelierClientToken}`,
        },
        payload: {},
      });

      expect(res2.statusCode).toBe(503);
      const body = JSON.parse(res2.body);
      expect(body.code).toBe('VIDEO_QUEUE_FULL');
      expect(body.message).toContain('workers at maximum capacity');
    });
  });

  describe('C-015: GET /api/v1/fittings/:id/motion (Query Generation Status & Video URL)', () => {
    it('returns 404 MOTION_JOB_NOT_FOUND when no motion video request exists for fitting', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/api/v1/fittings/${readyFittingId}/motion`,
        headers: {
          authorization: `Bearer ${atelierClientToken}`,
        },
      });

      expect(res.statusCode).toBe(404);
      const body = JSON.parse(res.body);
      expect(body.code).toBe('MOTION_JOB_NOT_FOUND');
    });

    it('returns 401 UNAUTHORIZED when no Bearer or guest session token is provided', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/api/v1/fittings/${readyFittingId}/motion`,
      });

      expect(res.statusCode).toBe(401);
      const body = JSON.parse(res.body);
      expect(body.code).toBe('UNAUTHORIZED');
    });

    it('returns 200 with queued status immediately after initiation', async () => {
      // 1. Initiate job
      const postRes = await app.inject({
        method: 'POST',
        url: `/api/v1/fittings/${readyFittingId}/motion`,
        headers: {
          authorization: `Bearer ${atelierClientToken}`,
        },
        payload: {},
      });
      const postBody = JSON.parse(postRes.body);

      // 2. Query status
      const getRes = await app.inject({
        method: 'GET',
        url: `/api/v1/fittings/${readyFittingId}/motion`,
        headers: {
          authorization: `Bearer ${atelierClientToken}`,
        },
      });

      expect(getRes.statusCode).toBe(200);
      const getBody = JSON.parse(getRes.body);
      expect(getBody.motionJobId).toBe(postBody.motionJobId);
      expect(getBody.fittingId).toBe(readyFittingId);
      expect(getBody.status).toBe('queued');
      expect(getBody.videoUrl).toBeNull();
      expect(getBody.durationMs).toBe(4000);
      expect(getBody.fps).toBe(30);
      expect(getBody.thumbnailSpriteUrl).toBeNull();
      expect(getBody.createdAt).toBeTypeOf('string');
    });

    it('supports guest session token authorization via x-guest-session-token header', async () => {
      // Initiate job as atelier client
      await app.inject({
        method: 'POST',
        url: `/api/v1/fittings/${readyFittingId}/motion`,
        headers: {
          authorization: `Bearer ${atelierClientToken}`,
        },
        payload: {},
      });

      // Query status using guest session token
      const getRes = await app.inject({
        method: 'GET',
        url: `/api/v1/fittings/${readyFittingId}/motion`,
        headers: {
          'x-guest-session-token': 'guest-session-abc-123',
        },
      });

      expect(getRes.statusCode).toBe(200);
      const body = JSON.parse(getRes.body);
      expect(body.fittingId).toBe(readyFittingId);
    });

    it('returns completed status, streaming videoUrl, and thumbnail sprite when worker completes (C-015, C-038)', async () => {
      // 1. Initiate job
      const postRes = await app.inject({
        method: 'POST',
        url: `/api/v1/fittings/${readyFittingId}/motion`,
        headers: {
          authorization: `Bearer ${atelierClientToken}`,
        },
        payload: {},
      });
      const { motionJobId } = JSON.parse(postRes.body);

      // 2. Simulate AMQP worker completion
      await motionService.simulateWorkerCompletion(motionJobId, {
        videoUrl: 'https://cdn.drape.luxury/motion/fitting_33333333_360.mp4',
        thumbnailSpriteUrl: 'https://cdn.drape.luxury/motion/fitting_33333333_sprite.webp',
        renderTimeMs: 4650,
      });

      // 3. Query status via GET C-015
      const getRes = await app.inject({
        method: 'GET',
        url: `/api/v1/fittings/${readyFittingId}/motion`,
        headers: {
          authorization: `Bearer ${atelierClientToken}`,
        },
      });

      expect(getRes.statusCode).toBe(200);
      const getBody = JSON.parse(getRes.body);
      expect(getBody.status).toBe('completed');
      expect(getBody.videoUrl).toBe('https://cdn.drape.luxury/motion/fitting_33333333_360.mp4');
      expect(getBody.thumbnailSpriteUrl).toBe('https://cdn.drape.luxury/motion/fitting_33333333_sprite.webp');
      expect(getBody.durationMs).toBe(4000);
      expect(getBody.fps).toBe(30);
    });
  });

  describe('Service & AMQP Lifecycle: Persistence, EVT-008 Telemetry, and Failure Handling', () => {
    it('saves motionVideoUrl to fitting record upon completion', async () => {
      const enqueue = await motionService.enqueueMotionGeneration({
        fittingId: readyFittingId,
        userId: elenaUserId,
        userRole: 'customer',
        userTier: 'atelier_client',
      });

      // Base fitting initially has motionVideoUrl = null
      let fitting = await motionService.getFittingById(readyFittingId);
      expect(fitting?.motionVideoUrl).toBeNull();

      // Complete job
      const completedJob = await motionService.simulateWorkerCompletion(enqueue.motionJobId, {
        videoUrl: 'https://cdn.drape.luxury/motion/saved_motion_video.mp4',
      });
      expect(completedJob.status).toBe('completed');

      // Fitting record must now have motionVideoUrl persisted
      fitting = await motionService.getFittingById(readyFittingId);
      expect(fitting?.motionVideoUrl).toBe('https://cdn.drape.luxury/motion/saved_motion_video.mp4');
    });

    it('emits EVT-008 motion_video_generated telemetry event conforming to analytics.md taxonomy', async () => {
      const enqueue = await motionService.enqueueMotionGeneration({
        fittingId: readyFittingId,
        userId: elenaUserId,
        userRole: 'customer',
        userTier: 'atelier_client',
      });

      expect(motionService.getTelemetryEvents().length).toBe(0);

      // Complete job
      await motionService.simulateWorkerCompletion(enqueue.motionJobId, {
        videoUrl: 'https://cdn.drape.luxury/motion/evt008_video.mp4',
        durationMs: 4000,
        renderTimeMs: 4800,
      });

      const events = motionService.getTelemetryEvents();
      expect(events.length).toBe(1);

      const evt = events[0];
      expect(evt.event_id).toBeTypeOf('string');
      expect(evt.event).toBe('motion_video_generated');
      expect(evt.fitting_id).toBe(readyFittingId);
      expect(evt.duration_seconds).toBe(4);
      expect(evt.generation_latency_ms).toBe(4800);
      expect(evt.video_url).toBe('https://cdn.drape.luxury/motion/evt008_video.mp4');
      expect(evt.user_id).toBe(elenaUserId);
      expect(evt.platform).toBe('web');
      expect(evt.occurred_at).toBeTypeOf('string');
    });

    it('handles worker failure and updates job status to failed with error details', async () => {
      const enqueue = await motionService.enqueueMotionGeneration({
        fittingId: readyFittingId,
        userId: elenaUserId,
        userRole: 'customer',
        userTier: 'atelier_client',
      });

      const failedJob = await motionService.simulateWorkerFailure(
        enqueue.motionJobId,
        'TEMPORAL_COHERENCE_FAILURE',
        'Mesh tearing detected in 360 rotation frames 25-40.'
      );

      expect(failedJob.status).toBe('failed');
      expect(failedJob.errorCode).toBe('TEMPORAL_COHERENCE_FAILURE');
      expect(failedJob.errorMessage).toContain('Mesh tearing detected');

      // Check status via C-015 GET endpoint
      const res = await app.inject({
        method: 'GET',
        url: `/api/v1/fittings/${readyFittingId}/motion`,
        headers: {
          authorization: `Bearer ${atelierClientToken}`,
        },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.status).toBe('failed');
      expect(body.videoUrl).toBeNull();
    });

    it('dispatches through custom AMQP dispatcher when plugged in', async () => {
      const dispatchedPayloads: AmqpMotionGeneratePayload[] = [];
      const customDispatcher: AMQPMessageDispatcher = {
        async publish(_routingKey, message) {
          dispatchedPayloads.push(message);
          return true;
        },
      };

      motionService.setCustomDispatcher(customDispatcher);

      await motionService.enqueueMotionGeneration({
        fittingId: readyFittingId,
        userId: julienUserId,
        userRole: 'atelier_pro',
      });

      expect(dispatchedPayloads.length).toBe(1);
      expect(dispatchedPayloads[0].fittingId).toBe(readyFittingId);
      expect(dispatchedPayloads[0].fabricSku).toBe('FAB-SLK-892');
    });
  });
});

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildServer } from '../src/server.js';
import { signJwt } from '../src/utils/crypto.js';

describe('Neural Fitting & Motion Execution End-to-End (C-011, C-012, C-014, C-015)', () => {
  let app: FastifyInstance;
  const demoUserId = '11111111-1111-4111-a111-111111111111';
  let atelierToken: string;

  beforeAll(async () => {
    app = await buildServer({ checkDbLive: false });
    await app.ready();

    atelierToken = signJwt({
      sub: demoUserId,
      email: 'elena.rostova@couture.com',
      fullName: 'Elena Rostova',
      role: 'atelier_pro',
      tier: 'couture_studio_pro',
    });
  });

  afterAll(async () => {
    await app.close();
  });

  it('C-011: POST /api/v1/fittings queues fitting session and returns 202 with jobId', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/fittings',
      headers: {
        authorization: `Bearer ${atelierToken}`,
      },
      payload: {
        fabricId: 'FAB-SLK-892',
        silhouetteId: 'corseted_mermaid_gown',
        mode: 'mannequin',
        mannequinBodyType: 'standard',
        customPrompt: 'Dramatic fishtail flare with structured bodice',
      },
    });

    expect(res.statusCode).toBe(202);
    const body = JSON.parse(res.body);
    expect(body.jobId).toBeDefined();
    expect(body.status).toBe('queued');
    expect(body.websocketUrl).toContain(body.jobId);
  });

  it('C-012: GET /api/v1/fittings/:id retrieves fitting artifacts for created session', async () => {
    // 1. Create session
    const createRes = await app.inject({
      method: 'POST',
      url: '/api/v1/fittings',
      payload: {
        fabricId: 'FAB-SLK-401',
        silhouetteId: 'grecian_bias_gown',
        mode: 'mannequin',
      },
    });
    const { jobId } = JSON.parse(createRes.body);

    // 2. Fetch session
    const getRes = await app.inject({
      method: 'GET',
      url: `/api/v1/fittings/${jobId}`,
    });

    expect(getRes.statusCode).toBe(200);
    const fit = JSON.parse(getRes.body);
    expect(fit.id).toBe(jobId);
    expect(fit.status).toBe('completed');
    expect(fit.renderUrl).toBeDefined();
    expect(fit.drapeScore).toBeGreaterThanOrEqual(0.9);
  });

  it('C-014: POST /api/v1/fittings/:id/motion initiates motion generation on newly created fitting', async () => {
    const createRes = await app.inject({
      method: 'POST',
      url: '/api/v1/fittings',
      payload: {
        fabricId: 'FAB-SLK-892',
        silhouetteId: 'corseted_mermaid_gown',
        mode: 'mannequin',
      },
    });
    const { jobId } = JSON.parse(createRes.body);

    const motionRes = await app.inject({
      method: 'POST',
      url: `/api/v1/fittings/${jobId}/motion`,
      headers: {
        authorization: `Bearer ${atelierToken}`,
      },
      payload: {
        trajectoryPreset: 'turntable_360',
        fps: 30,
        durationMs: 4000,
      },
    });

    expect(motionRes.statusCode).toBe(202);
    const motionBody = JSON.parse(motionRes.body);
    expect(motionBody.motionJobId).toBeDefined();
    expect(motionBody.fittingId).toBe(jobId);
  });

  it('C-014: POST /api/v1/fittings/job-dev-*/motion accepts client dev sessions and returns 202', async () => {
    const devJobId = `job-dev-${Date.now()}`;

    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/fittings/${devJobId}/motion`,
      headers: {
        authorization: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.dummy',
      },
      payload: {
        trajectoryPreset: 'turntable_360',
        fps: 30,
        durationMs: 4000,
      },
    });

    expect(res.statusCode).toBe(202);
    const body = JSON.parse(res.body);
    expect(body.fittingId).toBe(devJobId);
    expect(body.status).toBe('queued');
  });

  it('C-012: GET /api/v1/fittings/unknown returns 404', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/fittings/00000000-0000-0000-0000-000000000000',
    });

    expect(res.statusCode).toBe(404);
  });
  it('C-011: POST /api/v1/fittings accepts multipart/form-data payload and returns 202 without 415', async () => {
    const boundary = '----WebKitFormBoundary7MA4YWxkTrZu0gW';
    const payload = [
      `--${boundary}`,
      'Content-Disposition: form-data; name="fabricId"',
      '',
      'FAB-SLK-892',
      `--${boundary}`,
      'Content-Disposition: form-data; name="silhouetteId"',
      '',
      'corseted_mermaid_gown',
      `--${boundary}`,
      'Content-Disposition: form-data; name="mode"',
      '',
      'mannequin',
      `--${boundary}--`,
    ].join('\r\n');

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/fittings',
      headers: {
        'content-type': `multipart/form-data; boundary=${boundary}`,
      },
      payload,
    });

    expect(res.statusCode).toBe(202);
    const body = JSON.parse(res.body);
    expect(body.jobId).toBeDefined();
    expect(body.status).toBe('queued');
  });
});

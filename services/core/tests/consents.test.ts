/**
 * Biometric Consent & Auth Verification Suite
 * Spec Anchor: C-001, C-003, C-004, C-005, C-006, FEAT-005, NFR-040, AGENTS.md#Discipline-3
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildServer } from '../src/server.js';
import { verifyBiometricConsentToken } from '../src/utils/crypto.js';

describe('Auth & Biometric Consent System', () => {
  let app: FastifyInstance;
  let authToken: string;
  let testUserId: string;

  beforeAll(async () => {
    app = await buildServer({
      fastifyOptions: { logger: false },
    });
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  describe('C-001: POST /api/v1/auth/login', () => {
    it('authenticates user and returns JWT bearer token with user profile', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: {
          email: 'elena@rostova-atelier.com',
          password: 'password123',
        },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.token).toBeTypeOf('string');
      expect(body.refreshToken).toBeTypeOf('string');
      expect(body.expiresIn).toBe(86400);
      expect(body.user.email).toBe('elena@rostova-atelier.com');
      expect(body.user.fullName).toBe('Elena Rostova');
      expect(body.user.role).toBe('customer');

      authToken = body.token;
      testUserId = body.user.id;
    });

    it('rejects suspended accounts with 403 ACCOUNT_SUSPENDED', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: {
          email: 'suspended@drape.com',
          password: 'password123',
        },
      });

      expect(res.statusCode).toBe(403);
      const body = JSON.parse(res.body);
      expect(body.code).toBe('ACCOUNT_SUSPENDED');
    });

    it('rejects invalid password with 401 INVALID_CREDENTIALS', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: {
          email: 'elena@rostova-atelier.com',
          password: 'wrong-password',
        },
      });

      expect(res.statusCode).toBe(401);
      const body = JSON.parse(res.body);
      expect(body.code).toBe('INVALID_CREDENTIALS');
    });

    it('returns 400 VALIDATION_FAILED on malformed email or short password', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: {
          email: 'not-an-email',
          password: 'short',
        },
      });

      expect(res.statusCode).toBe(400);
      const body = JSON.parse(res.body);
      expect(body.code).toBe('VALIDATION_FAILED');
      expect(body.fields).toBeDefined();
    });
  });

  describe('C-003: POST /api/v1/auth/logout', () => {
    it('terminates session with valid Bearer token', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/logout',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
        payload: {
          refreshToken: '11111111-2222-3333-4444-555555555555',
        },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
      expect(body.message).toContain('Session successfully terminated');
    });

    it('rejects unauthenticated logout request with 401 UNAUTHORIZED', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/logout',
        payload: {
          refreshToken: 'token-uuid',
        },
      });

      expect(res.statusCode).toBe(401);
      const body = JSON.parse(res.body);
      expect(body.code).toBe('UNAUTHORIZED');
    });
  });

  describe('C-004: POST /api/v1/consents/biometric', () => {
    let createdConsentId: string;

    it('records affirmative BIPA consent and returns HMAC-signed token', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/consents/biometric',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
        payload: {
          regulationStandard: 'BIPA_IL',
          consentGranted: true,
          noticeVersion: '2026.1-BIPA',
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) DrapeClient/1.0',
        },
      });

      expect(res.statusCode).toBe(201);
      const body = JSON.parse(res.body);
      expect(body.consentRecord).toBeDefined();
      expect(body.consentRecord.id).toBeTypeOf('string');
      expect(body.consentRecord.userId).toBe(testUserId);
      expect(body.consentRecord.regulationStandard).toBe('BIPA_IL');
      expect(body.consentRecord.consentGranted).toBe(true);
      expect(body.consentRecord.consentToken).toBeTypeOf('string');

      // Verify HMAC cryptographic signature
      const verification = verifyBiometricConsentToken(body.consentRecord.consentToken);
      expect(verification.valid).toBe(true);
      expect(verification.expired).toBe(false);
      expect(verification.payload?.userId).toBe(testUserId);

      // Verify 365-day expiration per Illinois BIPA / NFR-040
      const grantedMs = new Date(body.consentRecord.grantedAt).getTime();
      const expiresMs = new Date(body.consentRecord.expiresAt).getTime();
      const diffDays = Math.round((expiresMs - grantedMs) / (1000 * 60 * 60 * 24));
      expect(diffDays).toBe(365);

      createdConsentId = body.consentRecord.id;
    });

    it('supports guest session token recording', async () => {
      const guestSessionId = 'guest-session-uuid-777';
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/consents/biometric',
        headers: {
          'x-guest-session-token': guestSessionId,
        },
        payload: {
          regulationStandard: 'GDPR_ART_9',
          consentGranted: true,
          noticeVersion: '2026.1-GDPR',
          userAgent: 'DrapeMobileWeb/1.0',
        },
      });

      expect(res.statusCode).toBe(201);
      const body = JSON.parse(res.body);
      expect(body.consentRecord.userId).toBe(guestSessionId);
      expect(body.consentRecord.regulationStandard).toBe('GDPR_ART_9');
    });

    it('rejects non-affirmative consent with 400 AFFIRMATIVE_CONSENT_REQUIRED', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/consents/biometric',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
        payload: {
          regulationStandard: 'BIPA_IL',
          consentGranted: false,
          noticeVersion: '2026.1-BIPA',
          userAgent: 'Mozilla/5.0',
        },
      });

      expect(res.statusCode).toBe(400);
      const body = JSON.parse(res.body);
      expect(body.code).toBe('AFFIRMATIVE_CONSENT_REQUIRED');
    });

    it('rejects unauthenticated request with 401 UNAUTHORIZED', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/consents/biometric',
        payload: {
          regulationStandard: 'BIPA_IL',
          consentGranted: true,
          noticeVersion: '2026.1-BIPA',
          userAgent: 'Mozilla/5.0',
        },
      });

      expect(res.statusCode).toBe(401);
      const body = JSON.parse(res.body);
      expect(body.code).toBe('UNAUTHORIZED');
    });

    it('rejects unrecognized regulatory standard with 422 UNSUPPORTED_REGULATION', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/consents/biometric',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
        payload: {
          regulationStandard: 'UNSUPPORTED_FRAMEWORK',
          consentGranted: true,
          noticeVersion: '2026.1',
          userAgent: 'Mozilla/5.0',
        },
      });

      expect(res.statusCode).toBe(422);
      const body = JSON.parse(res.body);
      expect(body.code).toBe('UNSUPPORTED_REGULATION');
    });
  });

  describe('C-005: GET /api/v1/consents/biometric/active', () => {
    it('returns active consent record with remaining validity days', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/consents/biometric/active',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.hasActiveConsent).toBe(true);
      expect(body.consentRecord).toBeDefined();
      expect(body.consentRecord.regulationStandard).toBe('BIPA_IL');
      expect(body.consentRecord.remainingDays).toBeGreaterThanOrEqual(364);
      expect(body.consentRecord.consentToken).toBeTypeOf('string');
    });

    it('returns hasActiveConsent: false when session has no active consent', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/consents/biometric/active',
        headers: {
          'x-guest-session-token': 'unconsented-guest-user-999',
        },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.hasActiveConsent).toBe(false);
      expect(body.consentRecord).toBeNull();
    });

    it('rejects unauthenticated request with 401 UNAUTHORIZED', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/consents/biometric/active',
      });

      expect(res.statusCode).toBe(401);
      const body = JSON.parse(res.body);
      expect(body.code).toBe('UNAUTHORIZED');
    });
  });

  describe('C-006: DELETE /api/v1/consents/biometric/:id', () => {
    let consentToRevokeId: string;

    beforeAll(async () => {
      // Create a consent record specifically for revocation testing
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/consents/biometric',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
        payload: {
          regulationStandard: 'CCPA_CPRA',
          consentGranted: true,
          noticeVersion: '2026.1-CCPA',
          userAgent: 'Mozilla/5.0',
        },
      });
      const body = JSON.parse(res.body);
      consentToRevokeId = body.consentRecord.id;
    });

    it('executes cryptographic erasure and issues data destruction certificate', async () => {
      const res = await app.inject({
        method: 'DELETE',
        url: `/api/v1/consents/biometric/${consentToRevokeId}`,
        headers: {
          authorization: `Bearer ${authToken}`,
        },
        payload: {
          confirmErasure: true,
        },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.revoked).toBe(true);
      expect(body.erasureStatus).toBe('COMPLETED');
      expect(body.purgedRecords.biometricSignatures).toBe(1);
      expect(body.certificateUrl).toContain(`erasure-${consentToRevokeId}.pdf`);
    });

    it('rejects deletion without explicit confirmErasure boolean with 400 CONFIRMATION_REQUIRED', async () => {
      const res = await app.inject({
        method: 'DELETE',
        url: `/api/v1/consents/biometric/${consentToRevokeId}`,
        headers: {
          authorization: `Bearer ${authToken}`,
        },
        payload: {
          confirmErasure: false,
        },
      });

      expect(res.statusCode).toBe(400);
      const body = JSON.parse(res.body);
      expect(body.code).toBe('CONFIRMATION_REQUIRED');
    });

    it('returns 404 CONSENT_NOT_FOUND when record is absent or already erased', async () => {
      const res = await app.inject({
        method: 'DELETE',
        url: '/api/v1/consents/biometric/non-existent-uuid',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
        payload: {
          confirmErasure: true,
        },
      });

      expect(res.statusCode).toBe(404);
      const body = JSON.parse(res.body);
      expect(body.code).toBe('CONSENT_NOT_FOUND');
    });
  });
});

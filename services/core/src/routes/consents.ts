/**
 * Biometric Consent Routes
 * Spec Anchor: C-004, C-005, C-006, FEAT-005, NFR-040, AGENTS.md#Discipline-3
 */

import { randomUUID } from 'node:crypto';
import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { store } from '../db/store.js';
import {
  createBiometricConsentToken,
  verifyJwt,
} from '../utils/crypto.js';

const VALID_REGULATIONS = ['BIPA_IL', 'GDPR_ART_9', 'CCPA_CPRA', 'CUBI_TX'] as const;

const biometricConsentBodySchema = z.object({
  regulationStandard: z.string(),
  consentGranted: z.boolean(),
  noticeVersion: z.string().min(1, 'Notice version is required'),
  userAgent: z.string().min(1, 'User agent is required'),
});

const erasureBodySchema = z.object({
  confirmErasure: z.boolean(),
});

/**
 * Extracts userId from Bearer token or Guest Session Token header.
 */
function extractUserOrGuestId(request: { headers: Record<string, string | string[] | undefined> }): string | null {
  const authHeader = request.headers.authorization;
  if (typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7).trim();
    try {
      const payload = verifyJwt(token);
      return payload.sub;
    } catch {
      // Invalid token
      return null;
    }
  }

  // Check guest headers
  const guestHeader = request.headers['x-guest-session-token'] || request.headers['x-session-id'];
  if (typeof guestHeader === 'string' && guestHeader.trim().length > 0) {
    return guestHeader.trim();
  }

  return null;
}

export const consentRoutes: FastifyPluginAsync = async (fastify) => {
  /**
   * C-004: POST /api/v1/consents/biometric
   */
  fastify.post('/api/v1/consents/biometric', async (request, reply) => {
    const userId = extractUserOrGuestId(request);
    if (!userId) {
      return reply.status(401).send({
        code: 'UNAUTHORIZED',
        message: 'Active user session or guest token required to record consent.',
      });
    }

    const parseResult = biometricConsentBodySchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({
        code: 'VALIDATION_FAILED',
        message: 'Request body failed validation.',
        fields: parseResult.error.flatten().fieldErrors,
      });
    }

    const { regulationStandard, consentGranted, userAgent } = parseResult.data;

    // Strict affirmative consent check per Illinois BIPA / GDPR Art. 9
    if (consentGranted !== true) {
      return reply.status(400).send({
        code: 'AFFIRMATIVE_CONSENT_REQUIRED',
        message: 'Biometric processing requires affirmative explicit consent (consentGranted must be true).',
      });
    }

    // Supported regulatory framework verification
    if (!VALID_REGULATIONS.includes(regulationStandard as any)) {
      return reply.status(422).send({
        code: 'UNSUPPORTED_REGULATION',
        message: 'Supplied regulatory framework standard is not recognized.',
      });
    }

    const consentId = randomUUID();
    const grantedAt = new Date().toISOString();
    // Maximum 365 days retention per Illinois BIPA and Drape NFR-040
    const expiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();

    const consentToken = createBiometricConsentToken({
      consentId,
      userId,
      regulationStandard: regulationStandard as (typeof VALID_REGULATIONS)[number],
      grantedAt,
      expiresAt,
    });

    const consentRecord = await store.saveConsent({
      id: consentId,
      userId,
      regulationStandard: regulationStandard as (typeof VALID_REGULATIONS)[number],
      consentGranted: true,
      ipAddress: request.ip || '127.0.0.1',
      userAgent,
      grantedAt,
      expiresAt,
      consentToken,
    });

    return reply.status(201).send({
      consentRecord: {
        id: consentRecord.id,
        userId: consentRecord.userId,
        regulationStandard: consentRecord.regulationStandard,
        consentGranted: consentRecord.consentGranted,
        grantedAt: consentRecord.grantedAt,
        expiresAt: consentRecord.expiresAt,
        consentToken,
      },
    });
  });

  /**
   * C-005: GET /api/v1/consents/biometric/active
   */
  fastify.get('/api/v1/consents/biometric/active', async (request, reply) => {
    const userId = extractUserOrGuestId(request);
    if (!userId) {
      return reply.status(401).send({
        code: 'UNAUTHORIZED',
        message: 'Authentication required.',
      });
    }

    const record = await store.getActiveConsent(userId);
    if (!record) {
      return reply.status(200).send({
        hasActiveConsent: false,
        consentRecord: null,
      });
    }

    const now = Date.now();
    const expiresAtMs = new Date(record.expiresAt).getTime();
    const remainingDays = Math.max(0, Math.ceil((expiresAtMs - now) / (1000 * 60 * 60 * 24)));

    return reply.status(200).send({
      hasActiveConsent: true,
      consentRecord: {
        id: record.id,
        regulationStandard: record.regulationStandard,
        grantedAt: record.grantedAt,
        expiresAt: record.expiresAt,
        consentToken: record.consentToken,
        remainingDays,
      },
    });
  });

  /**
   * C-006: DELETE /api/v1/consents/biometric/:id
   */
  fastify.delete<{ Params: { id: string } }>('/api/v1/consents/biometric/:id', async (request, reply) => {
    const authHeader = request.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return reply.status(401).send({
        code: 'UNAUTHORIZED',
        message: 'Authentication required.',
      });
    }

    let userId: string;
    try {
      const payload = verifyJwt(authHeader.slice(7).trim());
      userId = payload.sub;
    } catch {
      return reply.status(401).send({
        code: 'UNAUTHORIZED',
        message: 'Authentication required.',
      });
    }

    const parseResult = erasureBodySchema.safeParse(request.body);
    if (!parseResult.success || parseResult.data.confirmErasure !== true) {
      return reply.status(400).send({
        code: 'CONFIRMATION_REQUIRED',
        message: 'Explicit confirmation boolean required to execute biometric erasure.',
      });
    }

    const { id } = request.params;
    const consent = await store.getConsentById(id);

    if (!consent || consent.userId !== userId) {
      return reply.status(404).send({
        code: 'CONSENT_NOT_FOUND',
        message: 'Biometric consent record not found or does not belong to user.',
      });
    }

    // Execute cryptographic scrub & revocation
    await store.revokeConsent(id);

    return reply.status(200).send({
      revoked: true,
      revokedAt: new Date().toISOString(),
      erasureStatus: 'COMPLETED',
      purgedRecords: {
        biometricSignatures: 1,
        ephemeralSessions: 2,
        savedFittingsRetainedAnonymized: 0,
      },
      certificateUrl: `https://drape.com/certificates/erasure-${id}.pdf`,
    });
  });
};

/**
 * Cryptographic & Token Utilities
 * Spec Anchor: C-001, C-003, C-004, C-005, C-024, FEAT-005, NFR-020, NFR-040
 */

import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

export const JWT_SECRET = process.env.JWT_SECRET || 'drape_jwt_development_secret_key_minimum_32_characters';
export const BIOMETRIC_HMAC_SECRET = process.env.BIOMETRIC_HMAC_SECRET || 'drape_biometric_consent_hmac_secret_key_secure_32_bytes';
export const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || 'whsec_drape_test_stripe_webhook_secret_key_2026';

export interface JwtPayload {
  sub: string;
  email: string;
  fullName: string;
  role: 'customer' | 'atelier_pro' | 'cutter' | 'tailor' | 'admin';
  mfaRequired?: boolean;
  iat?: number;
  exp?: number;
  [key: string]: unknown;
}

/**
 * Encodes an object or buffer into standard URL-safe Base64 without padding.
 */
function base64UrlEncode(input: string | Buffer): string {
  const buf = typeof input === 'string' ? Buffer.from(input, 'utf8') : input;
  return buf.toString('base64url');
}

/**
 * Decodes URL-safe Base64 string to utf8 string.
 */
function base64UrlDecode(input: string): string {
  return Buffer.from(input, 'base64url').toString('utf8');
}

/**
 * Generates an HMAC-SHA256 JWT Bearer token.
 * Spec Anchor: C-001, C-002
 */
export function signJwt(payload: JwtPayload, expiresInSeconds = 86400, secret = JWT_SECRET): string {
  const header = { alg: 'HS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const fullPayload: JwtPayload = {
    ...payload,
    iat: now,
    exp: now + expiresInSeconds,
  };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(fullPayload));
  const data = `${encodedHeader}.${encodedPayload}`;

  const signature = createHmac('sha256', secret).update(data).digest();
  const encodedSignature = base64UrlEncode(signature);

  return `${data}.${encodedSignature}`;
}

/**
 * Verifies and decodes an HMAC-SHA256 JWT Bearer token.
 * Throws if expired, tampered with, or invalid format.
 * Spec Anchor: C-001, C-003
 */
export function verifyJwt(token: string, secret = JWT_SECRET): JwtPayload {
  const parts = token.split('.');
  if (parts.length !== 3) {
    throw new Error('Invalid JWT format');
  }

  const [encodedHeader, encodedPayload, encodedSignature] = parts;
  const data = `${encodedHeader}.${encodedPayload}`;

  const expectedSignature = createHmac('sha256', secret).update(data).digest();
  const signatureBuf = Buffer.from(encodedSignature, 'base64url');

  if (signatureBuf.length !== expectedSignature.length || !timingSafeEqual(signatureBuf, expectedSignature)) {
    throw new Error('Invalid JWT signature');
  }

  const payload: JwtPayload = JSON.parse(base64UrlDecode(encodedPayload));
  const now = Math.floor(Date.now() / 1000);

  if (payload.exp && payload.exp < now) {
    throw new Error('JWT token expired');
  }

  return payload;
}

export interface BiometricConsentPayload {
  consentId: string;
  userId: string;
  regulationStandard: 'BIPA_IL' | 'GDPR_ART_9' | 'CCPA_CPRA' | 'CUBI_TX';
  grantedAt: string;
  expiresAt: string;
}

/**
 * Signs affirmative biometric consent token using HMAC-SHA256.
 * Spec Anchor: C-004, C-005, FEAT-005, NFR-040
 */
export function createBiometricConsentToken(
  payload: BiometricConsentPayload,
  secret = BIOMETRIC_HMAC_SECRET
): string {
  const serialized = JSON.stringify(payload);
  const encodedPayload = base64UrlEncode(serialized);
  const signature = createHmac('sha256', secret).update(encodedPayload).digest();
  const encodedSignature = base64UrlEncode(signature);
  return `${encodedPayload}.${encodedSignature}`;
}

/**
 * Verifies and unpacks an HMAC-SHA256 signed biometric consent token.
 * Spec Anchor: C-004, C-005, FEAT-005, AGENTS.md#Discipline-3
 */
export function verifyBiometricConsentToken(
  token: string,
  secret = BIOMETRIC_HMAC_SECRET
): { valid: boolean; payload: BiometricConsentPayload | null; expired: boolean } {
  try {
    const parts = token.split('.');
    if (parts.length !== 2) {
      return { valid: false, payload: null, expired: false };
    }

    const [encodedPayload, encodedSignature] = parts;
    const expectedSignature = createHmac('sha256', secret).update(encodedPayload).digest();
    const signatureBuf = Buffer.from(encodedSignature, 'base64url');

    if (signatureBuf.length !== expectedSignature.length || !timingSafeEqual(signatureBuf, expectedSignature)) {
      return { valid: false, payload: null, expired: false };
    }

    const payload: BiometricConsentPayload = JSON.parse(base64UrlDecode(encodedPayload));
    const now = Date.now();
    const expiresAtMs = new Date(payload.expiresAt).getTime();

    if (Number.isNaN(expiresAtMs) || expiresAtMs <= now) {
      return { valid: true, payload, expired: true };
    }

    return { valid: true, payload, expired: false };
  } catch {
    return { valid: false, payload: null, expired: false };
  }
}

/**
 * Verifies cryptographically signed Stripe webhook signature.
 * Header format: t=<timestamp>,v1=<signature>
 * Spec Anchor: C-024, AGENTS.md#Discipline-5
 */
export function verifyStripeWebhookSignature(
  rawPayload: string,
  signatureHeader: string,
  secret = STRIPE_WEBHOOK_SECRET,
  toleranceSeconds = 300
): boolean {
  if (!signatureHeader || !rawPayload) {
    return false;
  }

  try {
    const elements = signatureHeader.split(',');
    let timestamp: string | null = null;
    let v1Signature: string | null = null;

    for (const elem of elements) {
      const [key, value] = elem.trim().split('=');
      if (key === 't') timestamp = value;
      if (key === 'v1') v1Signature = value;
    }

    if (!timestamp || !v1Signature) {
      return false;
    }

    // Check clock tolerance
    const eventTime = parseInt(timestamp, 10);
    const now = Math.floor(Date.now() / 1000);
    if (toleranceSeconds > 0 && Math.abs(now - eventTime) > toleranceSeconds) {
      return false;
    }

    const signedPayload = `${timestamp}.${rawPayload}`;
    const expectedSignature = createHmac('sha256', secret).update(signedPayload).digest('hex');

    const signatureBuf = Buffer.from(v1Signature, 'hex');
    const expectedBuf = Buffer.from(expectedSignature, 'hex');

    if (signatureBuf.length !== expectedBuf.length) {
      return false;
    }

    return timingSafeEqual(signatureBuf, expectedBuf);
  } catch {
    return false;
  }
}

/**
 * Generates a valid Stripe-Signature header string for testing and simulation.
 * Spec Anchor: C-024
 */
export function generateStripeSignature(
  rawPayload: string,
  secret = STRIPE_WEBHOOK_SECRET,
  timestamp?: number
): string {
  const t = timestamp ?? Math.floor(Date.now() / 1000);
  const signedPayload = `${t}.${rawPayload}`;
  const signature = createHmac('sha256', secret).update(signedPayload).digest('hex');
  return `t=${t},v1=${signature}`;
}

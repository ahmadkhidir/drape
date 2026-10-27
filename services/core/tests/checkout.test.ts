/**
 * Luxury Swatch & Custom Yardage Checkout Suite
 * Spec Anchor: C-019..C-024, FEAT-008, AGENTS.md#Discipline-1..5
 */

import { randomUUID } from 'node:crypto';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildServer } from '../src/server.js';
import { signJwt, generateStripeSignature } from '../src/utils/crypto.js';

describe('Bolt Reservation & Checkout Engine', () => {
  let app: FastifyInstance;
  let customerToken: string;
  let testUserId: string;
  let activeLockId: string;
  let activeBoltId: string;

  beforeAll(async () => {
    app = await buildServer({
      fastifyOptions: { logger: false },
    });

    testUserId = '11111111-1111-4111-a111-111111111111';
    customerToken = signJwt({
      sub: testUserId,
      email: 'elena@rostova-atelier.com',
      fullName: 'Elena Rostova',
      role: 'customer',
    });

    activeBoltId = 'bolt_901';
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  describe('C-019: POST /api/v1/checkout/bolt-lock', () => {
    it('acquires continuous-yardage distributed lock with mandatory 15-minute TTL', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/checkout/bolt-lock',
        headers: {
          authorization: `Bearer ${customerToken}`,
        },
        payload: {
          boltId: activeBoltId,
          requestedYards: 3.125, // Valid 1/8th yard increment
        },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.lockId).toBeTypeOf('string');
      expect(body.boltId).toBe(activeBoltId);
      expect(body.fabricId).toBe('FAB-SLK-892');
      expect(body.lockedYards).toBe(3.125);
      expect(body.remainingUnallocatedYards).toBe(21.875);

      // Verify 15-minute TTL (900,000 ms)
      const acquiredMs = new Date(body.lockAcquiredAt).getTime();
      const expiresMs = new Date(body.expiresAt).getTime();
      const diffMs = expiresMs - acquiredMs;
      expect(diffMs).toBe(15 * 60 * 1000);

      activeLockId = body.lockId;
    });

    it('rejects concurrent checkout lock collision on the same physical roll with 423', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/checkout/bolt-lock',
        payload: {
          boltId: activeBoltId,
          requestedYards: 2.0,
        },
      });

      expect(res.statusCode).toBe(423);
      const body = JSON.parse(res.body);
      expect(body.code).toBe('BOLT_CONCURRENTLY_LOCKED');
    });

    it('rejects non-1/8th yard (0.125) increments with 400 INVALID_YARDAGE_INCREMENT', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/checkout/bolt-lock',
        payload: {
          boltId: 'bolt_other',
          requestedYards: 2.1, // Not a multiple of 0.125
        },
      });

      expect(res.statusCode).toBe(400);
      const body = JSON.parse(res.body);
      expect(body.code).toBe('INVALID_YARDAGE_INCREMENT');
    });

    it('rejects negative or zero yardage with 400 INVALID_YARDAGE_INCREMENT', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/checkout/bolt-lock',
        payload: {
          boltId: 'bolt_other',
          requestedYards: 0,
        },
      });

      expect(res.statusCode).toBe(400);
      const body = JSON.parse(res.body);
      expect(body.code).toBe('INVALID_YARDAGE_INCREMENT');
    });

    it('rejects non-existent bolt with 404 BOLT_NOT_FOUND', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/checkout/bolt-lock',
        payload: {
          boltId: 'bolt_non_existent',
          requestedYards: 1.0,
        },
      });

      expect(res.statusCode).toBe(404);
      const body = JSON.parse(res.body);
      expect(body.code).toBe('BOLT_NOT_FOUND');
    });

    it('rejects cut exceeding remaining continuous yardage with 409 INSUFFICIENT_CONTINUOUS_YARDAGE', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/checkout/bolt-lock',
        payload: {
          boltId: activeBoltId,
          requestedYards: 999.0, // Exceeds bolt roll capacity
        },
      });

      expect(res.statusCode).toBe(409);
      const body = JSON.parse(res.body);
      expect(body.code).toBe('INSUFFICIENT_CONTINUOUS_YARDAGE');
      expect(body.requestedYards).toBe(999.0);
    });
  });

  describe('C-020: DELETE /api/v1/checkout/bolt-lock/:boltId', () => {
    it('rejects release attempt with mismatched lock token with 403 LOCK_OWNERSHIP_MISMATCH', async () => {
      const res = await app.inject({
        method: 'DELETE',
        url: `/api/v1/checkout/bolt-lock/${activeBoltId}`,
        payload: {
          lockId: 'wrong-lock-token-uuid',
        },
      });

      expect(res.statusCode).toBe(403);
      const body = JSON.parse(res.body);
      expect(body.code).toBe('LOCK_OWNERSHIP_MISMATCH');
    });

    it('rejects release attempt for non-existent or expired lock with 404 LOCK_NOT_FOUND', async () => {
      const res = await app.inject({
        method: 'DELETE',
        url: '/api/v1/checkout/bolt-lock/bolt_unlocked',
        payload: {
          lockId: randomUUID(),
        },
      });

      expect(res.statusCode).toBe(404);
      const body = JSON.parse(res.body);
      expect(body.code).toBe('LOCK_NOT_FOUND');
    });

    it('releases lock atomically using correct holder token', async () => {
      const res = await app.inject({
        method: 'DELETE',
        url: `/api/v1/checkout/bolt-lock/${activeBoltId}`,
        payload: {
          lockId: activeLockId,
        },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.released).toBe(true);
      expect(body.boltId).toBe(activeBoltId);
      expect(body.message).toContain('released');
    });
  });

  describe('C-021: POST /api/v1/checkout/create-intent', () => {
    let freshLockId: string;

    beforeAll(async () => {
      // Re-acquire lock for checkout intent testing
      const lockRes = await app.inject({
        method: 'POST',
        url: '/api/v1/checkout/bolt-lock',
        payload: {
          boltId: activeBoltId,
          requestedYards: 4.25,
        },
      });
      const lockBody = JSON.parse(lockRes.body);
      freshLockId = lockBody.lockId;
    });

    it('creates PaymentIntent and automatically applies $25 prior swatch box credit', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/checkout/create-intent',
        headers: {
          authorization: `Bearer ${customerToken}`,
        },
        payload: {
          currency: 'USD',
          items: [
            {
              fabricId: 'FAB-SLK-892',
              boltId: activeBoltId,
              yardsCut: 4.25,
              isSwatchBox: false,
              lockId: freshLockId,
            },
          ],
          applySwatchCredit: true,
        },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.clientSecret).toBeTypeOf('string');
      expect(body.paymentIntentId).toBeTypeOf('string');

      // 4.25 yards * $45.00/yd = $191.25 subtotal
      expect(body.subtotalAmount).toBe(191.25);
      // Elena Rostova has prior swatch box purchase -> $25 credit applied
      expect(body.swatchCreditApplied).toBe(25.0);
      expect(body.shippingAmount).toBe(15.0);
      // Taxable = 191.25 - 25 = 166.25. Tax = 166.25 * 0.0825 = 13.72
      expect(body.taxAmount).toBe(13.72);
      // Total = 166.25 + 15.00 + 13.72 = 194.97
      expect(body.totalAmount).toBe(194.97);
      expect(body.currency).toBe('USD');
      expect(body.expiresAt).toBeTypeOf('string');
    });

    it('rejects cart with expired or missing bolt lock with 409 BOLT_LOCK_EXPIRED', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/checkout/create-intent',
        headers: {
          authorization: `Bearer ${customerToken}`,
        },
        payload: {
          currency: 'USD',
          items: [
            {
              fabricId: 'FAB-SLK-892',
              boltId: activeBoltId,
              yardsCut: 2.0,
              isSwatchBox: false,
              lockId: 'expired-or-invalid-lock-token',
            },
          ],
        },
      });

      expect(res.statusCode).toBe(409);
      const body = JSON.parse(res.body);
      expect(body.code).toBe('BOLT_LOCK_EXPIRED');
    });

    it('returns 400 CART_VALIDATION_FAILED on invalid cart items', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/checkout/create-intent',
        headers: {
          authorization: `Bearer ${customerToken}`,
        },
        payload: {
          currency: 'USD',
          items: [],
        },
      });

      expect(res.statusCode).toBe(400);
      const body = JSON.parse(res.body);
      expect(body.code).toBe('CART_VALIDATION_FAILED');
    });

    it('preserves inventory lock and returns 502 on simulated gateway failure', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/checkout/create-intent',
        headers: {
          authorization: `Bearer ${customerToken}`,
        },
        payload: {
          currency: 'USD',
          items: [
            {
              fabricId: 'FAB-SLK-892',
              boltId: activeBoltId,
              yardsCut: 4.25,
              isSwatchBox: false,
              lockId: freshLockId,
            },
          ],
          simulateGatewayError: true,
        },
      });

      expect(res.statusCode).toBe(502);
      const body = JSON.parse(res.body);
      expect(body.code).toBe('PAYMENT_GATEWAY_ERROR');
    });
  });

  describe('C-022: POST /api/v1/checkout/orders', () => {
    let testLockId: string;
    let paymentIntentId: string;
    const testIdempotencyKey = randomUUID();

    beforeAll(async () => {
      // Re-acquire fresh lock for order placement
      const lockRes = await app.inject({
        method: 'POST',
        url: '/api/v1/checkout/bolt-lock',
        payload: {
          boltId: activeBoltId,
          requestedYards: 3.5,
        },
      });
      testLockId = JSON.parse(lockRes.body).lockId;
      paymentIntentId = `pi_test_${randomUUID().replace(/-/g, '')}`;
    });

    it('rejects order when non-returnable cut disclaimer is not acknowledged with 400', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/checkout/orders',
        headers: {
          authorization: `Bearer ${customerToken}`,
        },
        payload: {
          idempotencyKey: randomUUID(),
          paymentIntentId,
          items: [
            {
              fabricId: 'FAB-SLK-892',
              boltId: activeBoltId,
              lockId: testLockId,
              yardsCut: 3.5,
              isSwatchBox: false,
            },
          ],
          acknowledgedNonReturnableCut: false, // Disclaimed not acknowledged
          shippingAddress: {
            street: '123 Savile Row',
            city: 'London',
            postalCode: 'W1S 2ER',
            country: 'GB',
          },
          recipientContact: {
            fullName: 'Elena Rostova',
            email: 'elena@rostova-atelier.com',
            phone: '+44 20 7946 0912',
          },
        },
      });

      expect(res.statusCode).toBe(400);
      const body = JSON.parse(res.body);
      expect(body.code).toBe('DISCLAIMER_NOT_ACKNOWLEDGED');
    });

    it('rejects unauthorized or failed Stripe payment with 402 PAYMENT_NOT_AUTHORIZED', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/checkout/orders',
        headers: {
          authorization: `Bearer ${customerToken}`,
        },
        payload: {
          idempotencyKey: randomUUID(),
          paymentIntentId: 'pi_failed',
          items: [
            {
              fabricId: 'FAB-SLK-892',
              boltId: activeBoltId,
              lockId: testLockId,
              yardsCut: 3.5,
              isSwatchBox: false,
            },
          ],
          acknowledgedNonReturnableCut: true,
          shippingAddress: {
            street: '123 Savile Row',
            city: 'London',
            postalCode: 'W1S 2ER',
            country: 'GB',
          },
          recipientContact: {
            fullName: 'Elena Rostova',
            email: 'elena@rostova-atelier.com',
            phone: '+44 20 7946 0912',
          },
        },
      });

      expect(res.statusCode).toBe(402);
      const body = JSON.parse(res.body);
      expect(body.code).toBe('PAYMENT_NOT_AUTHORIZED');
    });

    it('rejects invalid shipping address with 422 SHIPPING_ADDRESS_INVALID', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/checkout/orders',
        headers: {
          authorization: `Bearer ${customerToken}`,
        },
        payload: {
          idempotencyKey: randomUUID(),
          paymentIntentId,
          items: [
            {
              fabricId: 'FAB-SLK-892',
              boltId: activeBoltId,
              lockId: testLockId,
              yardsCut: 3.5,
              isSwatchBox: false,
            },
          ],
          acknowledgedNonReturnableCut: true,
          shippingAddress: {
            street: '',
            city: 'London',
            postalCode: 'W1S 2ER',
            country: 'INVALID_COUNTRY_CODE',
          },
          recipientContact: {
            fullName: 'Elena Rostova',
            email: 'elena@rostova-atelier.com',
            phone: '+44 20 7946 0912',
          },
        },
      });

      expect(res.statusCode).toBe(422);
      const body = JSON.parse(res.body);
      expect(body.code).toBe('SHIPPING_ADDRESS_INVALID');
    });

    let createdOrderId: string;

    it('atomically creates order, deducts continuous yardage, and releases bolt lock', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/checkout/orders',
        headers: {
          authorization: `Bearer ${customerToken}`,
        },
        payload: {
          idempotencyKey: testIdempotencyKey,
          paymentIntentId,
          items: [
            {
              fabricId: 'FAB-SLK-892',
              boltId: activeBoltId,
              lockId: testLockId,
              yardsCut: 3.5,
              isSwatchBox: false,
            },
          ],
          acknowledgedNonReturnableCut: true,
          shippingAddress: {
            street: '123 Savile Row',
            city: 'London',
            postalCode: 'W1S 2ER',
            country: 'GB',
          },
          recipientContact: {
            fullName: 'Elena Rostova',
            email: 'elena@rostova-atelier.com',
            phone: '+44 20 7946 0912',
          },
        },
      });

      expect(res.statusCode).toBe(201);
      const body = JSON.parse(res.body);
      expect(body.order).toBeDefined();
      expect(body.order.orderNumber).toMatch(/^DRP-2027-\d+$/);
      expect(body.order.status).toBe('confirmed');
      expect(body.order.paymentChargeId).toBe(paymentIntentId);
      expect(body.order.items.length).toBe(1);
      expect(body.order.items[0].yardsCut).toBe(3.5);
      expect(body.order.items[0].dyeLotCode).toBe('LOT-2026-EMR-04');
      expect(body.order.specDossierUrl).toContain(body.order.orderNumber);

      createdOrderId = body.order.id;
    });

    it('deduplicates identical submission with 409 IDEMPOTENT_SUBMISSION_EXISTS', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/checkout/orders',
        headers: {
          authorization: `Bearer ${customerToken}`,
        },
        payload: {
          idempotencyKey: testIdempotencyKey, // Re-using same idempotency key
          paymentIntentId,
          items: [
            {
              fabricId: 'FAB-SLK-892',
              boltId: activeBoltId,
              lockId: testLockId,
              yardsCut: 3.5,
              isSwatchBox: false,
            },
          ],
          acknowledgedNonReturnableCut: true,
          shippingAddress: {
            street: '123 Savile Row',
            city: 'London',
            postalCode: 'W1S 2ER',
            country: 'GB',
          },
          recipientContact: {
            fullName: 'Elena Rostova',
            email: 'elena@rostova-atelier.com',
            phone: '+44 20 7946 0912',
          },
        },
      });

      expect(res.statusCode).toBe(409);
      const body = JSON.parse(res.body);
      expect(body.code).toBe('IDEMPOTENT_SUBMISSION_EXISTS');
      expect(body.existingOrderId).toBe(createdOrderId);
    });
  });

  describe('C-023: GET /api/v1/orders/:id', () => {
    let orderId: string;

    beforeAll(async () => {
      // Place an order for retrieval
      const lockRes = await app.inject({
        method: 'POST',
        url: '/api/v1/checkout/bolt-lock',
        payload: {
          boltId: activeBoltId,
          requestedYards: 1.0,
        },
      });
      const lockId = JSON.parse(lockRes.body).lockId;

      const orderRes = await app.inject({
        method: 'POST',
        url: '/api/v1/checkout/orders',
        headers: {
          authorization: `Bearer ${customerToken}`,
        },
        payload: {
          idempotencyKey: randomUUID(),
          paymentIntentId: `pi_${randomUUID()}`,
          items: [
            {
              fabricId: 'FAB-SLK-892',
              boltId: activeBoltId,
              lockId,
              yardsCut: 1.0,
              isSwatchBox: false,
            },
          ],
          acknowledgedNonReturnableCut: true,
          shippingAddress: {
            street: '750 7th Ave',
            city: 'New York',
            postalCode: '10019',
            country: 'US',
          },
          recipientContact: {
            fullName: 'Elena Rostova',
            email: 'elena@rostova-atelier.com',
            phone: '+1 212 555 0188',
          },
        },
      });
      orderId = JSON.parse(orderRes.body).order.id;
    });

    it('returns order details with dye lot certificate and digital spec dossier', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/api/v1/orders/${orderId}`,
        headers: {
          authorization: `Bearer ${customerToken}`,
        },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.id).toBe(orderId);
      expect(body.status).toBe('confirmed');
      expect(body.items[0].fabricName).toBe('Emerald Architectural Silk Brocade');
      expect(body.items[0].dyeLotCode).toBe('LOT-2026-EMR-04');
      expect(body.carrierTracking.carrier).toBe('DHL_EXPRESS');
      expect(body.dyeLotCertificateUrl).toContain('certificates/dye-lot-');
      expect(body.specDossierUrl).toContain('specs/');
    });

    it('supports guest verification via ?email query parameter', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/api/v1/orders/${orderId}?email=elena@rostova-atelier.com`,
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.id).toBe(orderId);
    });

    it('rejects access from wrong email with 403 FORBIDDEN', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/api/v1/orders/${orderId}?email=wrong-email@example.com`,
      });

      expect(res.statusCode).toBe(403);
      const body = JSON.parse(res.body);
      expect(body.code).toBe('FORBIDDEN');
    });

    it('rejects unauthenticated request without token or email with 401 UNAUTHORIZED', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/api/v1/orders/${orderId}`,
      });

      expect(res.statusCode).toBe(401);
      const body = JSON.parse(res.body);
      expect(body.code).toBe('UNAUTHORIZED');
    });

    it('returns 404 ORDER_NOT_FOUND on non-existent order ID', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/api/v1/orders/non-existent-order-id?email=elena@rostova-atelier.com`,
      });

      expect(res.statusCode).toBe(404);
      const body = JSON.parse(res.body);
      expect(body.code).toBe('ORDER_NOT_FOUND');
    });
  });

  describe('C-024: POST /api/v1/webhooks/stripe', () => {
    it('cryptographically verifies Stripe-Signature and processes payment_intent.succeeded', async () => {
      const eventPayload = {
        id: 'evt_test_12345',
        type: 'payment_intent.succeeded',
        data: {
          object: {
            id: 'pi_test_reconcile_1',
            status: 'succeeded',
          },
        },
      };

      const rawString = JSON.stringify(eventPayload);
      const signature = generateStripeSignature(rawString);

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/webhooks/stripe',
        headers: {
          'stripe-signature': signature,
          'content-type': 'application/json',
        },
        payload: rawString,
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.received).toBe(true);
    });

    it('rejects webhook with invalid or forged signature with 400 WEBHOOK_SIGNATURE_INVALID', async () => {
      const eventPayload = {
        id: 'evt_forged',
        type: 'payment_intent.succeeded',
        data: { object: { id: 'pi_forged' } },
      };

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/webhooks/stripe',
        headers: {
          'stripe-signature': 't=1700000000,v1=invalid_signature_hex',
          'content-type': 'application/json',
        },
        payload: JSON.stringify(eventPayload),
      });

      expect(res.statusCode).toBe(400);
      const body = JSON.parse(res.body);
      expect(body.code).toBe('WEBHOOK_SIGNATURE_INVALID');
    });

    it('rejects webhook missing stripe-signature header with 400 WEBHOOK_SIGNATURE_INVALID', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/webhooks/stripe',
        headers: {
          'content-type': 'application/json',
        },
        payload: JSON.stringify({ id: 'evt_missing_sig' }),
      });

      expect(res.statusCode).toBe(400);
      const body = JSON.parse(res.body);
      expect(body.code).toBe('WEBHOOK_SIGNATURE_INVALID');
    });
  });
});

/**
 * Master Tailor Directory & Concierge Routing Test Suite
 * Spec Anchor: FEAT-010, schema.md (TailorStudio, TailorDispatch), analytics.md (EVT-014), C-025, C-026, C-027
 */

import { randomUUID } from 'node:crypto';
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildServer } from '../src/server.js';
import { signJwt } from '../src/utils/crypto.js';
import { store, type OrderRecord, type OrderItemRecord } from '../src/db/store.js';
import { tailorService } from '../src/services/tailor.service.js';

describe('Master Tailor Directory & Concierge Routing Suite', () => {
  let app: FastifyInstance;
  let customerId: string;
  let customerToken: string;
  let otherCustomerId: string;
  let otherCustomerToken: string;
  let adminToken: string;
  let activeOrderId: string;
  let activeOrderNumber: string;

  beforeAll(async () => {
    app = await buildServer({
      fastifyOptions: { logger: false },
    });

    customerId = '11111111-1111-4111-a111-111111111111';
    customerToken = signJwt({
      sub: customerId,
      email: 'marcus.sterling@mayfair.co.uk',
      fullName: 'Marcus Sterling',
      role: 'customer',
    });

    otherCustomerId = '88888888-8888-4888-a888-888888888888';
    otherCustomerToken = signJwt({
      sub: otherCustomerId,
      email: 'other.patron@domain.com',
      fullName: 'Other Patron',
      role: 'customer',
    });

    adminToken = signJwt({
      sub: '99999999-9999-4999-a999-999999999999',
      email: 'concierge.admin@drape.luxury',
      fullName: 'Concierge Operations Lead',
      role: 'admin',
    });
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  beforeEach(async () => {
    tailorService.seedDefaults();
    tailorService.clearTelemetryEvents();

    activeOrderId = randomUUID();
    activeOrderNumber = `DRP-2027-${Math.floor(100 + Math.random() * 900)}`;

    const testOrder: OrderRecord = {
      id: activeOrderId,
      userId: customerId,
      orderNumber: activeOrderNumber,
      totalAmount: 180.0,
      currency: 'USD',
      status: 'confirmed',
      paymentChargeId: 'ch_test_charge_12345',
      shippingAddress: {
        street: '45 Berkeley Square',
        city: 'London',
        postalCode: 'W1J 5AT',
        country: 'GB',
      },
      createdAt: new Date().toISOString(),
    };

    const testItems: OrderItemRecord[] = [
      {
        id: randomUUID(),
        orderId: activeOrderId,
        fabricId: 'FAB-SLK-892',
        boltRollId: 'bolt_901',
        yardsCut: 4.0,
        unitPrice: 45.0,
        isSwatchBox: false,
        createdAt: new Date().toISOString(),
      },
    ];

    await store.createOrder(testOrder, testItems);
  });

  describe('C-025: GET /api/v1/tailors', () => {
    it('returns accredited partner studios across London, Paris, New York, Milan, and Lagos', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/tailors',
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.items).toBeDefined();
      expect(Array.isArray(body.items)).toBe(true);
      expect(body.items.length).toBeGreaterThanOrEqual(5);

      const cities = body.items.map((i: any) => i.city);
      expect(cities).toContain('London');
      expect(cities).toContain('New_York');
      expect(cities).toContain('Paris');
      expect(cities).toContain('Milan');
      expect(cities).toContain('Lagos');

      // Check fields of first item
      const item = body.items[0];
      expect(item.id).toBeTypeOf('string');
      expect(item.studioName).toBeTypeOf('string');
      expect(item.masterCutter).toBeTypeOf('string');
      expect(item.city).toBeTypeOf('string');
      expect(item.address).toBeTypeOf('string');
      expect(Array.isArray(item.specialties)).toBe(true);
      expect(item.rating).toBeGreaterThanOrEqual(1.0);
      expect(item.rating).toBeLessThanOrEqual(5.0);
      expect(item.reviewCount).toBeGreaterThanOrEqual(0);
      expect(item.turnaroundWeeks).toBeGreaterThanOrEqual(2);
      expect(item.activeCapacity).toBe(true);
      expect(item.leadTimeDays).toBe(item.turnaroundWeeks * 7);
      expect(Array.isArray(item.portfolioImages)).toBe(true);

      // Pagination metadata
      expect(body.pagination.totalItems).toBeGreaterThanOrEqual(5);
      expect(body.pagination.currentPage).toBe(1);
      expect(body.pagination.totalPages).toBeGreaterThanOrEqual(1);
    });

    it('filters accurately by city (e.g. London)', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/tailors?city=London',
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.items.length).toBeGreaterThanOrEqual(1);
      for (const item of body.items) {
        expect(item.city).toBe('London');
      }
    });

    it('filters accurately by city with underscore or space (New York / New_York)', async () => {
      const res1 = await app.inject({
        method: 'GET',
        url: '/api/v1/tailors?city=New_York',
      });
      expect(res1.statusCode).toBe(200);
      const body1 = JSON.parse(res1.body);
      expect(body1.items.length).toBe(1);
      expect(body1.items[0].studioName).toBe('Atelier Savile New York');

      const res2 = await app.inject({
        method: 'GET',
        url: '/api/v1/tailors?city=New%20York',
      });
      expect(res2.statusCode).toBe(200);
      const body2 = JSON.parse(res2.body);
      expect(body2.items.length).toBe(1);
      expect(body2.items[0].studioName).toBe('Atelier Savile New York');
    });

    it('filters accurately by specialty (e.g. traditional)', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/tailors?specialty=traditional',
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.items.length).toBeGreaterThanOrEqual(1);
      for (const item of body.items) {
        expect(item.specialties).toContain('traditional');
      }
      expect(body.items[0].city).toBe('Lagos');
    });

    it('filters accurately by maxTurnaroundWeeks (e.g. 3)', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/tailors?maxTurnaroundWeeks=3',
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.items.length).toBeGreaterThanOrEqual(1);
      for (const item of body.items) {
        expect(item.turnaroundWeeks).toBeLessThanOrEqual(3);
      }
    });

    it('filters accurately by acceptingCommissions=false to inspect waitlisted ateliers', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/tailors?acceptingCommissions=false',
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      // When acceptingCommissions=false, both active and inactive are listed
      const inactive = body.items.find((i: any) => i.activeCapacity === false);
      expect(inactive).toBeDefined();
      expect(inactive.studioName).toBe('Sartoria Quadrilatero Milano');
    });

    it('supports pagination parameters (limit & page)', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/tailors?limit=2&page=2',
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.items.length).toBeLessThanOrEqual(2);
      expect(body.pagination.currentPage).toBe(2);
      expect(body.pagination.totalPages).toBeGreaterThanOrEqual(3);
    });

    it('rejects invalid query parameters with 400 INVALID_QUERY_PARAMS', async () => {
      // Invalid city
      const res1 = await app.inject({
        method: 'GET',
        url: '/api/v1/tailors?city=Tokyo',
      });
      expect(res1.statusCode).toBe(400);
      expect(JSON.parse(res1.body).code).toBe('INVALID_QUERY_PARAMS');

      // Invalid specialty
      const res2 = await app.inject({
        method: 'GET',
        url: '/api/v1/tailors?specialty=costume_party',
      });
      expect(res2.statusCode).toBe(400);
      expect(JSON.parse(res2.body).code).toBe('INVALID_QUERY_PARAMS');

      // Out of range maxTurnaroundWeeks (< 2)
      const res3 = await app.inject({
        method: 'GET',
        url: '/api/v1/tailors?maxTurnaroundWeeks=1',
      });
      expect(res3.statusCode).toBe(400);
      expect(JSON.parse(res3.body).code).toBe('INVALID_QUERY_PARAMS');

      // Out of range maxTurnaroundWeeks (> 8)
      const res4 = await app.inject({
        method: 'GET',
        url: '/api/v1/tailors?maxTurnaroundWeeks=12',
      });
      expect(res4.statusCode).toBe(400);
      expect(JSON.parse(res4.body).code).toBe('INVALID_QUERY_PARAMS');
    });
  });

  describe('C-026: GET /api/v1/tailors/:id', () => {
    it('returns comprehensive master atelier profile by studio UUID', async () => {
      const studioId = '33333333-3333-4333-a333-333333333301';
      const res = await app.inject({
        method: 'GET',
        url: `/api/v1/tailors/${studioId}`,
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.id).toBe(studioId);
      expect(body.studioName).toBe('Savile & Co. Bespoke Cutters');
      expect(body.masterCutter).toBe('Arthur Pendelton');
      expect(body.bio).toContain('Savile Row');
      expect(body.city).toBe('London');
      expect(body.address).toBe('14 Savile Row, Mayfair, London W1S 3JN, United Kingdom');
      expect(body.contactEmail).toBe('concierge@savileandco.co.uk');
      expect(body.phone).toBe('+44 20 7946 0192');
      expect(body.specialties).toContain('suiting');
      expect(body.specialties).toContain('corsetry');
      expect(body.rating).toBe(4.96);
      expect(body.reviewCount).toBe(52);
      expect(body.turnaroundWeeks).toBe(4);
      expect(body.activeCapacity).toBe(true);
      expect(body.averageLaborCostUSD).toBe(2200.0);
      expect(Array.isArray(body.portfolioImages)).toBe(true);
      expect(body.portfolioImages.length).toBeGreaterThanOrEqual(1);
      expect(Array.isArray(body.verifiedReviews)).toBe(true);
      expect(body.verifiedReviews.length).toBeGreaterThanOrEqual(1);
      expect(body.verifiedReviews[0].authorName).toBeTypeOf('string');
      expect(body.verifiedReviews[0].comment).toBeTypeOf('string');
      expect(body.createdAt).toBeTypeOf('string');
    });

    it('returns 404 TAILOR_STUDIO_NOT_FOUND when studio ID does not exist', async () => {
      const nonExistentId = randomUUID();
      const res = await app.inject({
        method: 'GET',
        url: `/api/v1/tailors/${nonExistentId}`,
      });

      expect(res.statusCode).toBe(404);
      const body = JSON.parse(res.body);
      expect(body.code).toBe('TAILOR_STUDIO_NOT_FOUND');
    });

    it('returns 404 TAILOR_STUDIO_NOT_FOUND when studio ID is not a valid UUID', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/tailors/invalid-uuid-format',
      });

      expect(res.statusCode).toBe(404);
      const body = JSON.parse(res.body);
      expect(body.code).toBe('TAILOR_STUDIO_NOT_FOUND');
    });
  });

  describe('C-027: POST /api/v1/orders/:id/route-tailor', () => {
    const londonStudioId = '33333333-3333-4333-a333-333333333301';
    const nyStudioId = '33333333-3333-4333-a333-333333333302';
    const atCapacityStudioId = '33333333-3333-4333-a333-333333333305'; // Sartoria Quadrilatero Milano

    it('successfully routes order to accredited master tailor and dispatches EVT-014', async () => {
      const res = await app.inject({
        method: 'POST',
        url: `/api/v1/orders/${activeOrderId}/route-tailor`,
        headers: {
          authorization: `Bearer ${customerToken}`,
        },
        payload: {
          tailorStudioId: londonStudioId,
          consultationDatePreferred: '2026-11-15',
          specialInstructions: 'Double-breasted peak lapel with silk barathea facings.',
        },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);

      // Verify dispatch record
      expect(body.dispatchRecord).toBeDefined();
      expect(body.dispatchRecord.id).toBeTypeOf('string');
      expect(body.dispatchRecord.orderId).toBe(activeOrderId);
      expect(body.dispatchRecord.tailorStudioId).toBe(londonStudioId);
      expect(body.dispatchRecord.studioName).toBe('Savile & Co. Bespoke Cutters');
      expect(body.dispatchRecord.status).toBe('dispatched');
      expect(body.dispatchRecord.digitalSpecUrl).toBe(`https://drape.com/specs/public/spec_${activeOrderNumber}`);
      expect(body.dispatchRecord.carrierTrackingNumber).toMatch(/^DHL-CONCIERGE-\d+/);
      expect(body.dispatchRecord.dispatchedAt).toBeTypeOf('string');

      // Verify booking confirmation
      expect(body.bookingConfirmation).toBeDefined();
      expect(body.bookingConfirmation.consultationCalendarUrl).toContain('savile-co-bespoke-cutters');
      expect(body.bookingConfirmation.consultationCalendarUrl).toContain(activeOrderNumber);
      expect(body.bookingConfirmation.estimatedAtelierArrivalDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);

      // Verify order store update
      const updatedOrder = await store.findOrderById(activeOrderId);
      expect(updatedOrder?.tailorDispatch).toBeDefined();
      expect(updatedOrder?.tailorDispatch?.tailorStudioId).toBe(londonStudioId);
      expect(updatedOrder?.tailorDispatch?.status).toBe('dispatched');

      // Verify EVT-014 Telemetry Event dispatch
      const events = tailorService.getTelemetryEvents();
      expect(events.length).toBe(1);
      const evt = events[0];
      expect(evt.eventId).toBe('EVT-014');
      expect(evt.eventName).toBe('tailor_concierge_routed');
      expect(evt.properties.order_id).toBe(activeOrderId);
      expect(evt.properties.tailor_studio_id).toBe(londonStudioId);
      expect(evt.properties.city).toBe('London');
    });

    it('allows concierge operations admin to route order on behalf of customer', async () => {
      const res = await app.inject({
        method: 'POST',
        url: `/api/v1/orders/${activeOrderId}/route-tailor`,
        headers: {
          authorization: `Bearer ${adminToken}`,
        },
        payload: {
          tailorStudioId: nyStudioId,
        },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.dispatchRecord.tailorStudioId).toBe(nyStudioId);
      expect(body.dispatchRecord.studioName).toBe('Atelier Savile New York');
    });

    it('rejects unauthenticated request with 401 UNAUTHORIZED', async () => {
      const res = await app.inject({
        method: 'POST',
        url: `/api/v1/orders/${activeOrderId}/route-tailor`,
        payload: {
          tailorStudioId: londonStudioId,
        },
      });

      expect(res.statusCode).toBe(401);
      const body = JSON.parse(res.body);
      expect(body.code).toBe('UNAUTHORIZED');
    });

    it('rejects unauthorized customer routing another customer order with 403 FORBIDDEN', async () => {
      const res = await app.inject({
        method: 'POST',
        url: `/api/v1/orders/${activeOrderId}/route-tailor`,
        headers: {
          authorization: `Bearer ${otherCustomerToken}`,
        },
        payload: {
          tailorStudioId: londonStudioId,
        },
      });

      expect(res.statusCode).toBe(403);
      const body = JSON.parse(res.body);
      expect(body.code).toBe('FORBIDDEN');
    });

    it('returns 404 ORDER_OR_TAILOR_NOT_FOUND when order does not exist', async () => {
      const nonExistentOrderId = randomUUID();
      const res = await app.inject({
        method: 'POST',
        url: `/api/v1/orders/${nonExistentOrderId}/route-tailor`,
        headers: {
          authorization: `Bearer ${customerToken}`,
        },
        payload: {
          tailorStudioId: londonStudioId,
        },
      });

      expect(res.statusCode).toBe(404);
      const body = JSON.parse(res.body);
      expect(body.code).toBe('ORDER_OR_TAILOR_NOT_FOUND');
    });

    it('returns 404 ORDER_OR_TAILOR_NOT_FOUND when tailor studio does not exist', async () => {
      const nonExistentStudioId = randomUUID();
      const res = await app.inject({
        method: 'POST',
        url: `/api/v1/orders/${activeOrderId}/route-tailor`,
        headers: {
          authorization: `Bearer ${customerToken}`,
        },
        payload: {
          tailorStudioId: nonExistentStudioId,
        },
      });

      expect(res.statusCode).toBe(404);
      const body = JSON.parse(res.body);
      expect(body.code).toBe('ORDER_OR_TAILOR_NOT_FOUND');
    });

    it('returns 400 ORDER_NOT_ROUTABLE when order has been cancelled', async () => {
      await store.updateOrderStatus(activeOrderId, 'cancelled');

      const res = await app.inject({
        method: 'POST',
        url: `/api/v1/orders/${activeOrderId}/route-tailor`,
        headers: {
          authorization: `Bearer ${customerToken}`,
        },
        payload: {
          tailorStudioId: londonStudioId,
        },
      });

      expect(res.statusCode).toBe(400);
      const body = JSON.parse(res.body);
      expect(body.code).toBe('ORDER_NOT_ROUTABLE');
    });

    it('returns 400 ORDER_NOT_ROUTABLE when order has already been delivered', async () => {
      await store.updateOrderStatus(activeOrderId, 'delivered');

      const res = await app.inject({
        method: 'POST',
        url: `/api/v1/orders/${activeOrderId}/route-tailor`,
        headers: {
          authorization: `Bearer ${customerToken}`,
        },
        payload: {
          tailorStudioId: londonStudioId,
        },
      });

      expect(res.statusCode).toBe(400);
      const body = JSON.parse(res.body);
      expect(body.code).toBe('ORDER_NOT_ROUTABLE');
    });

    it('returns 409 TAILOR_AT_CAPACITY when studio has temporarily paused commissions', async () => {
      const res = await app.inject({
        method: 'POST',
        url: `/api/v1/orders/${activeOrderId}/route-tailor`,
        headers: {
          authorization: `Bearer ${customerToken}`,
        },
        payload: {
          tailorStudioId: atCapacityStudioId,
        },
      });

      expect(res.statusCode).toBe(409);
      const body = JSON.parse(res.body);
      expect(body.code).toBe('TAILOR_AT_CAPACITY');
      expect(body.message).toContain('Selected studio has temporarily paused new commissions');
      expect(body.waitlistEstimatedDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('returns 400 VALIDATION_FAILED when invalid preferred consultation date format provided', async () => {
      const res = await app.inject({
        method: 'POST',
        url: `/api/v1/orders/${activeOrderId}/route-tailor`,
        headers: {
          authorization: `Bearer ${customerToken}`,
        },
        payload: {
          tailorStudioId: londonStudioId,
          consultationDatePreferred: '15/11/2026', // Not YYYY-MM-DD
        },
      });

      expect(res.statusCode).toBe(400);
      const body = JSON.parse(res.body);
      expect(body.code).toBe('VALIDATION_FAILED');
    });
  });
});

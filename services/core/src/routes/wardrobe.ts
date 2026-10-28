/**
 * Digital Wardrobe Routes
 * Spec Anchor: docs/Drape/features/FEAT-009.md, CONTRACTS.md (C-028, C-029), screens/09-digital-wardrobe.md
 */

import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { store } from '../db/store.js';
import { verifyJwt, signJwt } from '../utils/crypto.js';
import { pdfSpecService } from '../services/pdf-spec.service.js';

const wardrobeQuerySchema = z.object({
  tab: z.enum(['fittings', 'orders', 'all']).optional().default('all'),
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(12),
});

const guestLookupSchema = z.object({
  orderNumber: z.string().min(1, 'Order number is required'),
  billingEmail: z.string().email('Invalid email address format'),
});

export const wardrobeRoutes: FastifyPluginAsync = async (fastify) => {
  /**
   * C-028: GET /api/v1/wardrobe
   * Returns authenticated customer's saved fittings and purchased order history.
   */
  fastify.get('/api/v1/wardrobe', async (request, reply) => {
    const authHeader = request.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return reply.status(401).send({
        code: 'UNAUTHORIZED',
        message: 'Authentication required to access digital wardrobe.',
      });
    }

    let userId: string;
    try {
      const payload = verifyJwt(authHeader.slice(7).trim());
      userId = payload.sub;
    } catch {
      return reply.status(401).send({
        code: 'UNAUTHORIZED',
        message: 'Authentication required to access digital wardrobe.',
      });
    }

    const queryResult = wardrobeQuerySchema.safeParse(request.query);
    const { tab, page, limit } = queryResult.success
      ? queryResult.data
      : { tab: 'all' as const, page: 1, limit: 12 };

    // 1. Fetch User Saved Fittings
    let savedFittings: Array<{
      id: string;
      fabricId: string;
      fabricName: string;
      silhouetteId: string;
      silhouetteName: string;
      renderUrl: string;
      hasMotionVideo: boolean;
      motionVideoUrl: string | null;
      drapeScore: number;
      createdAt: string;
    }> = [];

    if (tab === 'all' || tab === 'fittings') {
      const userFittings = pdfSpecService.listFittingsByUserId(userId);
      savedFittings = userFittings.map((fit) => ({
        id: fit.id,
        fabricId: fit.fabricId,
        fabricName: fit.fabricName,
        silhouetteId: fit.silhouetteId,
        silhouetteName: fit.silhouetteName,
        renderUrl: fit.renderUrl,
        hasMotionVideo: Boolean(fit.motionVideoUrl),
        motionVideoUrl: fit.motionVideoUrl,
        drapeScore: fit.drapeScore,
        createdAt: fit.createdAt,
      }));
    }

    // 2. Fetch User Purchased Order History
    let orders: Array<{
      id: string;
      orderNumber: string;
      status: 'confirmed' | 'cutting' | 'dispatched' | 'delivered';
      fabricName: string;
      yardsCut: number;
      totalAmount: number;
      specPdfUrl: string;
      carrierTrackingUrl: string | null;
      createdAt: string;
    }> = [];

    if (tab === 'all' || tab === 'orders') {
      const userOrders: typeof orders = [];
      for (const order of store.orders.values()) {
        if (order.userId === userId && order.status !== 'cancelled') {
          const items = await store.getOrderItems(order.id);
          const firstFabricItem = items.find((i) => !i.isSwatchBox) || items[0];
          const totalYardsCut = items
            .filter((i) => !i.isSwatchBox)
            .reduce((acc, curr) => acc + (curr.yardsCut || 0), 0);

          userOrders.push({
            id: order.id,
            orderNumber: order.orderNumber,
            status: order.status as 'confirmed' | 'cutting' | 'dispatched' | 'delivered',
            fabricName: firstFabricItem?.fabricName || 'Emerald Architectural Silk Brocade',
            yardsCut: Number(totalYardsCut.toFixed(3)),
            totalAmount: order.totalAmount,
            specPdfUrl: `https://drape.luxury/api/v1/fittings/${order.id}/tailor-spec/pdf?orderId=${order.id}`,
            carrierTrackingUrl: 'https://dhl.com/track/DHL-98471293',
            createdAt: order.createdAt,
          });
        }
      }

      // Sort newest orders first
      orders = userOrders.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    }

    // Paginate responses
    const startIndex = (page - 1) * limit;
    const paginatedFittings = savedFittings.slice(startIndex, startIndex + limit);
    const paginatedOrders = orders.slice(startIndex, startIndex + limit);

    return reply.status(200).send({
      savedFittings: paginatedFittings,
      orders: paginatedOrders,
    });
  });

  /**
   * C-029: POST /api/v1/wardrobe/lookup-guest
   * Allows looking up past orders via orderNumber and billingEmail.
   * Returns a scoped oneTimeAccessToken valid for 2 hours for this order's assets.
   */
  fastify.post('/api/v1/wardrobe/lookup-guest', async (request, reply) => {
    const parseResult = guestLookupSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({
        code: 'VALIDATION_FAILED',
        message: 'Invalid order number or email format.',
      });
    }

    const { orderNumber, billingEmail } = parseResult.data;

    // Search for order matching orderNumber and recipient billing email
    let matchedOrder: (typeof store.orders extends Map<any, infer T> ? T : never) | null = null;
    for (const order of store.orders.values()) {
      if (order.orderNumber.toUpperCase() === orderNumber.trim().toUpperCase()) {
        const orderEmail = order.recipientContact?.email;
        if (orderEmail && orderEmail.toLowerCase() === billingEmail.trim().toLowerCase()) {
          matchedOrder = order;
          break;
        }
      }
    }

    if (!matchedOrder) {
      return reply.status(404).send({
        code: 'ORDER_LOOKUP_FAILED',
        message: 'No matching order found for provided order number and billing email combination.',
      });
    }

    // Generate a scoped 2-hour oneTimeAccessToken (C-029)
    const oneTimeAccessToken = signJwt(
      {
        sub: matchedOrder.userId,
        email: billingEmail.trim().toLowerCase(),
        fullName: matchedOrder.recipientContact?.fullName || 'Guest Patron',
        role: 'customer',
        orderId: matchedOrder.id,
        orderNumber: matchedOrder.orderNumber,
        scope: 'guest_order_access',
      },
      7200 // 2 hours
    );

    const items = await store.getOrderItems(matchedOrder.id);
    const firstFabricItem = items.find((i) => !i.isSwatchBox) || items[0];
    const totalYardsCut = items
      .filter((i) => !i.isSwatchBox)
      .reduce((acc, curr) => acc + (curr.yardsCut || 0), 0);

    return reply.status(200).send({
      oneTimeAccessToken,
      order: {
        id: matchedOrder.id,
        orderNumber: matchedOrder.orderNumber,
        status: matchedOrder.status,
        fabricName: firstFabricItem?.fabricName || 'Emerald Architectural Silk Brocade',
        yardsCut: Number(totalYardsCut.toFixed(3)),
        specPdfUrl: `https://drape.luxury/api/v1/fittings/${matchedOrder.id}/tailor-spec/pdf?orderId=${matchedOrder.id}`,
        carrierTrackingUrl: 'https://dhl.com/track/DHL-98471293',
      },
    });
  });
};

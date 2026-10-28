/**
 * Tailor Specification & PDF Dossier Routes
 * Spec Anchor: docs/Drape/features/FEAT-009.md, docs/Drape/analytics.md (EVT-013), CONTRACTS.md (C-017, C-018)
 */

import type { FastifyPluginAsync } from 'fastify';
import { store } from '../db/store.js';
import { verifyJwt } from '../utils/crypto.js';
import { pdfSpecService } from '../services/pdf-spec.service.js';

interface FittingSpecParams {
  id: string;
}

interface FittingSpecQuery {
  orderId?: string;
  token?: string;
}

interface PublicSpecParams {
  specToken: string;
}

export const specRoutes: FastifyPluginAsync = async (fastify) => {
  /**
   * C-017: GET /api/v1/fittings/:id/tailor-spec/pdf
   * Downloads high-resolution vector PDF tailor technical dossier and emits EVT-013.
   */
  fastify.get<{ Params: FittingSpecParams; Querystring: FittingSpecQuery }>(
    '/api/v1/fittings/:id/tailor-spec/pdf',
    async (request, reply) => {
      const { id } = request.params;
      const { orderId, token: queryToken } = request.query;

      // Authenticate via Bearer header, guest session header, or scoped query token
      const authHeader = request.headers.authorization;
      const guestHeader = request.headers['x-guest-session-token'] || request.headers['x-session-id'];
      const rawToken =
        (typeof authHeader === 'string' && authHeader.startsWith('Bearer ')
          ? authHeader.slice(7).trim()
          : null) ||
        (typeof queryToken === 'string' ? queryToken.trim() : null);

      let authenticatedUserId: string | null = null;
      let authenticatedRole: string | null = null;
      let scopedOrderId: string | null = null;

      if (rawToken) {
        try {
          const payload = verifyJwt(rawToken);
          authenticatedUserId = payload.sub;
          authenticatedRole = payload.role || 'customer';
          if (payload.orderId && typeof payload.orderId === 'string') {
            scopedOrderId = payload.orderId;
          }
        } catch {
          return reply.status(401).send({
            code: 'UNAUTHORIZED',
            message: 'Authentication required.',
          });
        }
      } else if (typeof guestHeader === 'string' && guestHeader.trim().length > 0) {
        authenticatedUserId = guestHeader.trim();
        authenticatedRole = 'guest';
      }

      if (!authenticatedUserId) {
        return reply.status(401).send({
          code: 'UNAUTHORIZED',
          message: 'Authentication required.',
        });
      }

      // Lookup fitting or order reference
      const fitting = pdfSpecService.getFittingById(id);
      let order = orderId ? await store.findOrderById(orderId) : await store.findOrderById(id);

      // If id is order number (e.g. DRP-2027-442)
      if (!order && !fitting) {
        for (const o of store.orders.values()) {
          if (o.orderNumber.toUpperCase() === id.toUpperCase() || (orderId && o.orderNumber.toUpperCase() === orderId.toUpperCase())) {
            order = o;
            break;
          }
        }
      }

      if (!fitting && !order) {
        return reply.status(404).send({
          code: 'SPEC_NOT_FOUND',
          message: 'Fitting or order specification not found.',
        });
      }

      // Authorization verification
      const targetUserId = fitting?.userId || order?.userId;
      const isOwner = targetUserId === authenticatedUserId;
      const isAdminOrCutter = authenticatedRole === 'admin' || authenticatedRole === 'cutter' || authenticatedRole === 'tailor';
      const isScopedOrder = Boolean(scopedOrderId && order && scopedOrderId === order.id);

      if (!isOwner && !isAdminOrCutter && !isScopedOrder) {
        return reply.status(403).send({
          code: 'FORBIDDEN',
          message: 'Access denied to requested tailor specification dossier.',
        });
      }

      try {
        // Resolve Fabric and Bolt details
        const fabricId = fitting?.fabricId || (order ? (await store.getOrderItems(order.id))[0]?.fabricId : null) || 'FAB-SLK-892';
        const fabric = (await store.getFabric(fabricId)) || {
          id: 'FAB-SLK-892',
          name: 'Emerald Architectural Silk Brocade',
          millName: 'Taroni Silk Mills',
          countryOfOrigin: 'IT',
          fiberBreakdown: '85% Mulberry Silk, 15% Metallic Lurex',
          gsm: 320,
          widthInches: 54.0,
          drapeCoefficient: 0.65,
          stiffnessRating: 4.5,
          pricePerYard: 45.0,
          pbrTexturesUrl: '',
          createdAt: '',
        };

        const orderItems = order ? await store.getOrderItems(order.id) : [];
        const boltId = orderItems[0]?.boltRollId || 'bolt_901';
        const bolt = await store.getBolt(boltId);
        const dyeLotCode = orderItems[0]?.dyeLotCode || bolt?.dyeLotCode || 'LOT-2026-EMR-04';

        const yardageOrdered = orderItems.reduce((acc, curr) => acc + (curr.isSwatchBox ? 0 : curr.yardsCut), 0) || 4.0;
        const silhouetteId = fitting?.silhouetteId || 'architectural_tuxedo';
        const silhouetteName = fitting?.silhouetteName || 'Architectural Double-Breasted Tuxedo';
        const customerName = order?.recipientContact?.fullName || (authenticatedUserId ? (await store.findUserById(authenticatedUserId))?.fullName : null) || 'Marcus Sterling';
        const orderNumber = order?.orderNumber || (fitting ? `DRP-${fitting.id.slice(0, 8).toUpperCase()}` : 'DRP-SPEC-2027');

        // Compile Vector PDF Dossier conforming to textile guild standards (FEAT-009)
        const pdfBuffer = pdfSpecService.generateTailorSpecPdf({
          orderNumber,
          customerName,
          fittingId: fitting?.id,
          silhouetteName,
          fabric: {
            sku: fabric.id,
            name: fabric.name,
            millName: fabric.millName,
            countryOfOrigin: fabric.countryOfOrigin,
            fiberBreakdown: fabric.fiberBreakdown,
            gsm: fabric.gsm,
            widthInches: fabric.widthInches,
            dyeLotCode,
            drapeCoefficient: fabric.drapeCoefficient,
            stiffnessRating: fabric.stiffnessRating,
          },
          yardageOrdered,
          technicalNotes: {
            pressingTemperatureC: 150,
            steamPermitted: true,
            interliningType: 'Medium-weight natural horsehair canvas and silk organza stay',
            needleSizeRecommendation: '70/10 Microtex Sharp Needle with #50 silk filament thread',
          },
          issuedAt: new Date().toISOString().split('T')[0],
        });

        // Emit Telemetry Event EVT-013: spec_dossier_exported
        pdfSpecService.recordTelemetryEvent({
          eventType: 'spec_dossier_exported',
          userId: authenticatedUserId,
          payload: {
            order_id: order?.id || orderNumber,
            silhouette_id: silhouetteId,
            export_format: 'pdf',
          },
        });

        return reply
          .status(200)
          .header('Content-Type', 'application/pdf')
          .header('Content-Disposition', 'attachment; filename="Drape-Tailor-Spec.pdf"')
          .send(pdfBuffer);
      } catch (err) {
        request.log.error(err, 'Vector PDF dossier generation failure');
        return reply.status(500).send({
          code: 'PDF_COMPILATION_ERROR',
          message: 'Vector PDF compilation failed; retry in progress.',
        });
      }
    }
  );

  /**
   * C-018: GET /api/v1/specs/public/:specToken
   * Public read-only endpoint for external tailors without requiring Drape login.
   */
  fastify.get<{ Params: PublicSpecParams }>('/api/v1/specs/public/:specToken', async (request, reply) => {
    const { specToken } = request.params;

    const publicSpec = pdfSpecService.getPublicSpecByToken(specToken);
    if (!publicSpec) {
      return reply.status(404).send({
        code: 'SPEC_TOKEN_NOT_FOUND',
        message: 'Technical spec link is invalid or has expired.',
      });
    }

    return reply.status(200).send({
      specId: publicSpec.specId,
      orderNumber: publicSpec.orderNumber,
      customerFirstName: publicSpec.customerFirstName,
      silhouetteName: publicSpec.silhouetteName,
      fabric: publicSpec.fabric,
      yardageOrdered: publicSpec.yardageOrdered,
      fittingRenderUrl: publicSpec.fittingRenderUrl,
      grainlineCuttingDiagramUrl: publicSpec.grainlineCuttingDiagramUrl,
      technicalNotes: publicSpec.technicalNotes,
      expiresAt: publicSpec.expiresAt,
    });
  });
};

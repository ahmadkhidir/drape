/**
 * Drape Core Master Tailor Directory & Concierge Routing Routes
 * Spec Anchor: docs/Drape/features/FEAT-010.md, C-025, C-026, C-027
 */

import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import {
  tailorService,
  OrderNotRoutableError,
  OrderOrTailorNotFoundError,
  TailorAtCapacityError,
  ForbiddenError,
} from '../services/tailor.service.js';
import { verifyJwt } from '../utils/crypto.js';

const VALID_CITIES = ['London', 'New_York', 'New York', 'Paris', 'Milan', 'Lagos'] as const;
const VALID_SPECIALTIES = ['bridal', 'suiting', 'corsetry', 'traditional'] as const;

const tailorQuerySchema = z.object({
  city: z.string().optional(),
  specialty: z.string().optional(),
  maxTurnaroundWeeks: z.coerce.number().int().optional(),
  acceptingCommissions: z
    .preprocess((val) => {
      if (typeof val === 'string') {
        if (val.toLowerCase() === 'true') return true;
        if (val.toLowerCase() === 'false') return false;
      }
      return val;
    }, z.boolean())
    .optional(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(50).optional(),
});

const routeTailorBodySchema = z.object({
  tailorStudioId: z.string().uuid(),
  consultationDatePreferred: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Preferred consultation date must be formatted YYYY-MM-DD')
    .optional(),
  specialInstructions: z.string().max(1000).optional(),
});

const uuidParamSchema = z.object({
  id: z.string().uuid(),
});

export const tailorRoutes: FastifyPluginAsync = async (server) => {
  /**
   * C-025: GET /api/v1/tailors
   * Public directory filtering by city, specialty, turnaround time, activeCapacity.
   */
  server.get('/api/v1/tailors', async (request, reply) => {
    const parseResult = tailorQuerySchema.safeParse(request.query);
    if (!parseResult.success) {
      return reply.status(400).send({
        code: 'INVALID_QUERY_PARAMS',
        message: 'Invalid filter parameters provided.',
      });
    }

    const { city, specialty, maxTurnaroundWeeks, acceptingCommissions, page, limit } =
      parseResult.data;

    // Validate city enum if present
    if (city !== undefined) {
      const normalizedCity = city.trim().toLowerCase().replace(/\s+/g, '_');
      const isCityValid = VALID_CITIES.some(
        (c) => c.toLowerCase().replace(/\s+/g, '_') === normalizedCity
      );
      if (!isCityValid) {
        return reply.status(400).send({
          code: 'INVALID_QUERY_PARAMS',
          message: 'Invalid filter parameters provided.',
        });
      }
    }

    // Validate specialty enum if present
    if (specialty !== undefined) {
      const normalizedSpecialty = specialty.trim().toLowerCase();
      const isSpecialtyValid = VALID_SPECIALTIES.some((s) => s.toLowerCase() === normalizedSpecialty);
      if (!isSpecialtyValid) {
        return reply.status(400).send({
          code: 'INVALID_QUERY_PARAMS',
          message: 'Invalid filter parameters provided.',
        });
      }
    }

    // Validate maxTurnaroundWeeks bounds (2 to 8) per C-025
    if (maxTurnaroundWeeks !== undefined) {
      if (maxTurnaroundWeeks < 2 || maxTurnaroundWeeks > 8) {
        return reply.status(400).send({
          code: 'INVALID_QUERY_PARAMS',
          message: 'Invalid filter parameters provided.',
        });
      }
    }

    const data = await tailorService.listTailors({
      city,
      specialty,
      maxTurnaroundWeeks,
      acceptingCommissions,
      page,
      limit,
    });

    return reply.status(200).send(data);
  });

  /**
   * C-026: GET /api/v1/tailors/:id
   * Public studio profile returning bio, rating, review count, portfolio images.
   */
  server.get('/api/v1/tailors/:id', async (request, reply) => {
    const paramResult = uuidParamSchema.safeParse(request.params);
    if (!paramResult.success) {
      return reply.status(404).send({
        code: 'TAILOR_STUDIO_NOT_FOUND',
        message: 'Atelier studio profile not found.',
      });
    }

    const studio = await tailorService.getTailorById(paramResult.data.id);
    if (!studio) {
      return reply.status(404).send({
        code: 'TAILOR_STUDIO_NOT_FOUND',
        message: 'Atelier studio profile not found.',
      });
    }

    return reply.status(200).send(studio);
  });

  /**
   * C-027: POST /api/v1/orders/:id/route-tailor
   * Creates TailorDispatch record with digitalSpecUrl, carrier tracking, and dispatches EVT-014.
   */
  server.post('/api/v1/orders/:id/route-tailor', async (request, reply) => {
    // 1. Authenticate via Bearer Token
    const authHeader = request.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return reply.status(401).send({
        code: 'UNAUTHORIZED',
        message: 'Authentication required.',
      });
    }

    let userPayload: { sub: string; role: string; email?: string };
    try {
      const token = authHeader.slice(7).trim();
      const payload = verifyJwt(token);
      userPayload = {
        sub: payload.sub,
        role: payload.role,
        email: payload.email,
      };
    } catch {
      return reply.status(401).send({
        code: 'UNAUTHORIZED',
        message: 'Invalid or expired authentication session.',
      });
    }

    // 2. Validate route parameter
    const paramResult = uuidParamSchema.safeParse(request.params);
    if (!paramResult.success) {
      return reply.status(404).send({
        code: 'ORDER_OR_TAILOR_NOT_FOUND',
        message: 'Order or Tailor Studio ID not found.',
      });
    }

    // 3. Validate body
    const bodyResult = routeTailorBodySchema.safeParse(request.body);
    if (!bodyResult.success) {
      return reply.status(400).send({
        code: 'VALIDATION_FAILED',
        message: 'Request body failed validation.',
        fields: bodyResult.error.flatten().fieldErrors,
      });
    }

    const { tailorStudioId, consultationDatePreferred, specialInstructions } = bodyResult.data;

    try {
      const result = await tailorService.routeOrderToTailor({
        orderId: paramResult.data.id,
        tailorStudioId,
        consultationDatePreferred,
        specialInstructions,
        user: {
          id: userPayload.sub,
          role: userPayload.role,
          email: userPayload.email,
        },
      });

      return reply.status(200).send(result);
    } catch (err: any) {
      if (err instanceof ForbiddenError) {
        return reply.status(403).send({
          code: 'FORBIDDEN',
          message: err.message,
        });
      }

      if (err instanceof OrderNotRoutableError) {
        return reply.status(400).send({
          code: 'ORDER_NOT_ROUTABLE',
          message: err.message,
        });
      }

      if (err instanceof OrderOrTailorNotFoundError) {
        return reply.status(404).send({
          code: 'ORDER_OR_TAILOR_NOT_FOUND',
          message: err.message,
        });
      }

      if (err instanceof TailorAtCapacityError) {
        return reply.status(409).send({
          code: 'TAILOR_AT_CAPACITY',
          message: err.message,
          waitlistEstimatedDate: err.waitlistEstimatedDate,
        });
      }

      request.log.error(err);
      return reply.status(500).send({
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred during concierge routing.',
      });
    }
  });
};

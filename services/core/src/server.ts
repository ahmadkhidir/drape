/**
 * Drape Core Fastify Server Factory
 * Spec Anchor: architecture.md, AGENTS.md, C-001..C-038
 */

import { fileURLToPath } from 'node:url';
import fastify, { type FastifyInstance, type FastifyServerOptions } from 'fastify';
import cors from '@fastify/cors';
import multipart from '@fastify/multipart';
import type { Redis } from 'ioredis';
import { healthRoutes } from './routes/health.js';
import { fabricRoutes } from './routes/fabrics.js';
import { authRoutes } from './routes/auth.js';
import { consentRoutes } from './routes/consents.js';
import { checkoutRoutes } from './routes/checkout.js';
import { yardageRoutes } from './routes/yardage.js';
import { tailorRoutes } from './routes/tailors.js';
import { wardrobeRoutes } from './routes/wardrobe.js';
import { specRoutes } from './routes/specs.js';
import { motionRoutes } from './routes/motion.js';
import { fittingsRoutes } from './routes/fittings.js';

export interface BuildServerOptions {
  fastifyOptions?: FastifyServerOptions;
  checkDbLive?: boolean;
  redisClient?: Redis;
  stripeClient?: any;
}

/**
 * Builds and configures the Fastify server instance with structured logging and middleware.
 */
export async function buildServer(options: BuildServerOptions = {}): Promise<FastifyInstance> {
  const server = fastify({
    logger: {
      level: process.env.LOG_LEVEL || 'info',
    },
    ...options.fastifyOptions,
  });

  // CORS configuration
  await server.register(cors, {
    origin: true,
    credentials: true,
  });

  // Multipart form-data parser for photo and sketch uploads (C-011)
  await server.register(multipart, {
    attachFieldsToBody: 'keyValues',
    limits: {
      fileSize: 15 * 1024 * 1024,
      files: 2,
    },
  });

  // Register baseline health and operational routes
  await server.register(healthRoutes, {
    checkDbLive: options.checkDbLive,
  });

  // Register fabric catalog and shader delivery routes (C-007..C-010)
  await server.register(fabricRoutes);

  // Register authentication routes (C-001, C-003)
  await server.register(authRoutes);

  // Register biometric consent routes (C-004, C-005, C-006)
  await server.register(consentRoutes);

  // Register checkout and order processing routes (C-019..C-024)
  await server.register(checkoutRoutes, {
    redisClient: options.redisClient,
    stripeClient: options.stripeClient,
  });

  // Register algorithmic yardage calculation and pattern layout routes (C-016)
  await server.register(yardageRoutes);

  // Register master tailor directory and concierge routing routes (C-025..C-027)
  await server.register(tailorRoutes);

  // Register digital wardrobe routes (C-028, C-029)
  await server.register(wardrobeRoutes);

  // Register tailor specification and dossier export routes (C-017, C-018)
  await server.register(specRoutes);

  // Register 360-degree neural motion video routes (C-014, C-015)
  await server.register(motionRoutes);

  // Register neural fitting routes (C-011, C-012)
  await server.register(fittingsRoutes);

  return server;
}

// Auto-start server when executed directly via node or tsx
const isDirectRun =
  Boolean(process.argv[1]) &&
  fileURLToPath(import.meta.url).replace(/\\/g, '/') === process.argv[1]?.replace(/\\/g, '/');

if (isDirectRun && process.env.NODE_ENV !== 'test') {
  const port = Number(process.env.PORT) || 4000;
  const host = process.env.HOST || '0.0.0.0';

  const app = await buildServer();
  try {
    await app.listen({ port, host });
    app.log.info(`Drape Core Backend listening on http://${host}:${port}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

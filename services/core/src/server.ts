/**
 * Drape Core Fastify Server Factory
 * Spec Anchor: architecture.md, AGENTS.md, C-001..C-024
 */

import { fileURLToPath } from 'node:url';
import fastify, { type FastifyInstance, type FastifyServerOptions } from 'fastify';
import cors from '@fastify/cors';
import type { Redis } from 'ioredis';
import { healthRoutes } from './routes/health.js';
import { authRoutes } from './routes/auth.js';
import { consentRoutes } from './routes/consents.js';
import { checkoutRoutes } from './routes/checkout.js';

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

  // Register baseline health and operational routes
  await server.register(healthRoutes, {
    checkDbLive: options.checkDbLive,
  });

  // Register authentication routes (C-001, C-003)
  await server.register(authRoutes);

  // Register biometric consent routes (C-004, C-005, C-006)
  await server.register(consentRoutes);

  // Register checkout and order processing routes (C-019..C-024)
  await server.register(checkoutRoutes, {
    redisClient: options.redisClient,
    stripeClient: options.stripeClient,
  });

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

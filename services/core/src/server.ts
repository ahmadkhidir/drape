/**
 * Drape Core Fastify Server Factory
 * Spec Anchor: architecture.md, AGENTS.md
 */

import { fileURLToPath } from 'node:url';
import fastify, { type FastifyInstance, type FastifyServerOptions } from 'fastify';
import cors from '@fastify/cors';
import { healthRoutes } from './routes/health.js';

export interface BuildServerOptions {
  fastifyOptions?: FastifyServerOptions;
  checkDbLive?: boolean;
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

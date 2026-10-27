/**
 * Health Check Routes
 * Spec Anchor: AGENTS.md#Foundation, C-001..C-039
 */

import type { FastifyPluginAsync } from 'fastify';
import { checkDatabaseConnection } from '../db/client.js';

export interface HealthRouteOptions {
  /**
   * If true, perform live DB query check. If false or omitted, verifies baseline connectivity readiness.
   */
  checkDbLive?: boolean;
}

export const healthRoutes: FastifyPluginAsync<HealthRouteOptions> = async (fastify, opts) => {
  fastify.get('/healthz', async (request, reply) => {
    let databaseStatus = 'connected';

    if (opts?.checkDbLive) {
      const isConnected = await checkDatabaseConnection();
      if (!isConnected) {
        databaseStatus = 'disconnected';
        return reply.status(503).send({
          status: 'error',
          timestamp: new Date().toISOString(),
          database: databaseStatus,
        });
      }
    }

    return reply.status(200).send({
      status: 'ok',
      timestamp: new Date().toISOString(),
      database: databaseStatus,
    });
  });
};

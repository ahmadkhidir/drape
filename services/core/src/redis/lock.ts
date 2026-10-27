/**
 * Distributed Bolt Reservation Lock Module
 * Spec Anchor: services/core/AGENTS.md#Discipline-2, C-019, C-020
 *
 * Implements continuous-yardage distributed locking keyed by bolt identifier
 * (lock:bolt:<boltId>) with a mandatory 15-minute (900,000 ms) TTL.
 */

import { randomUUID } from 'node:crypto';
import { Redis } from 'ioredis';

// Default mandatory TTL: 15 minutes (900 seconds = 900,000 ms)
export const DEFAULT_BOLT_LOCK_TTL_MS = 15 * 60 * 1000;

export interface BoltLockOptions {
  ttlMs?: number;
}

export interface BoltLockResult {
  acquired: boolean;
  boltId: string;
  lockToken: string | null;
  key: string;
  expiresAt: Date | null;
}

const RELEASE_LOCK_LUA = `
if redis.call("get", KEYS[1]) == ARGV[1] then
  return redis.call("del", KEYS[1])
else
  return 0
end
`;

const EXTEND_LOCK_LUA = `
if redis.call("get", KEYS[1]) == ARGV[1] then
  return redis.call("pexpire", KEYS[1], ARGV[2])
else
  return 0
end
`;

/**
 * Generates the standardized Redis key for a bolt lock.
 */
export function getBoltLockKey(boltId: string): string {
  return `lock:bolt:${boltId}`;
}

/**
 * Create a new configured Redis client.
 */
export function createRedisClient(url?: string): Redis {
  const redisUrl = url || process.env.REDIS_URL || 'redis://localhost:6379';
  return new Redis(redisUrl, {
    maxRetriesPerRequest: 3,
    lazyConnect: true,
  });
}

/**
 * Acquires a distributed lock on a physical fabric bolt roll.
 * Enforces atomic SET NX PX to prevent concurrent checkout races.
 */
export async function acquireBoltLock(
  redis: Redis,
  boltId: string,
  options: BoltLockOptions = {}
): Promise<BoltLockResult> {
  const ttlMs = options.ttlMs ?? DEFAULT_BOLT_LOCK_TTL_MS;
  const key = getBoltLockKey(boltId);
  const lockToken = randomUUID();

  // Atomically set lock key only if it does not already exist (NX) with millisecond expiration (PX)
  const result = await redis.set(key, lockToken, 'PX', ttlMs, 'NX');

  if (result === 'OK') {
    const expiresAt = new Date(Date.now() + ttlMs);
    return {
      acquired: true,
      boltId,
      lockToken,
      key,
      expiresAt,
    };
  }

  return {
    acquired: false,
    boltId,
    lockToken: null,
    key,
    expiresAt: null,
  };
}

/**
 * Atomically releases the bolt lock if and only if the lockToken matches the holder.
 */
export async function releaseBoltLock(
  redis: Redis,
  boltId: string,
  lockToken: string
): Promise<boolean> {
  const key = getBoltLockKey(boltId);
  const result = await redis.eval(RELEASE_LOCK_LUA, 1, key, lockToken);
  return result === 1;
}

/**
 * Extends the TTL of an actively held bolt lock.
 */
export async function extendBoltLock(
  redis: Redis,
  boltId: string,
  lockToken: string,
  ttlMs: number = DEFAULT_BOLT_LOCK_TTL_MS
): Promise<boolean> {
  const key = getBoltLockKey(boltId);
  const result = await redis.eval(EXTEND_LOCK_LUA, 1, key, ttlMs.toString());
  return result === 1;
}

/**
 * Executes a function within the safety of an acquired bolt lock, releasing the lock upon completion.
 */
export async function withBoltLock<T>(
  redis: Redis,
  boltId: string,
  fn: (lockToken: string) => Promise<T>,
  options: BoltLockOptions = {}
): Promise<T> {
  const lockResult = await acquireBoltLock(redis, boltId, options);
  if (!lockResult.acquired || !lockResult.lockToken) {
    throw new Error(`Failed to acquire lock for bolt '${boltId}': Roll is currently reserved.`);
  }

  try {
    return await fn(lockResult.lockToken);
  } finally {
    await releaseBoltLock(redis, boltId, lockResult.lockToken);
  }
}

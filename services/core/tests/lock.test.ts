/**
 * Distributed Bolt Reservation Lock Unit Tests
 * Spec Anchor: services/core/AGENTS.md#Discipline-2, C-019, C-020
 */

import { describe, it, expect, vi } from 'vitest';
import type { Redis } from 'ioredis';
import {
  acquireBoltLock,
  releaseBoltLock,
  extendBoltLock,
  withBoltLock,
  getBoltLockKey,
  DEFAULT_BOLT_LOCK_TTL_MS,
} from '../src/redis/lock.js';

describe('Bolt Reservation Distributed Lock', () => {
  it('formats redis key with bolt identifier', () => {
    expect(getBoltLockKey('bolt_901')).toBe('lock:bolt:bolt_901');
  });

  it('acquires lock with 15-minute default TTL using SET NX PX', async () => {
    const mockRedis = {
      set: vi.fn().mockResolvedValue('OK'),
    } as unknown as Redis;

    const result = await acquireBoltLock(mockRedis, 'bolt_901');

    expect(result.acquired).toBe(true);
    expect(result.boltId).toBe('bolt_901');
    expect(result.key).toBe('lock:bolt:bolt_901');
    expect(result.lockToken).toBeTypeOf('string');
    expect(result.expiresAt).toBeInstanceOf(Date);

    expect(mockRedis.set).toHaveBeenCalledWith(
      'lock:bolt:bolt_901',
      result.lockToken,
      'PX',
      DEFAULT_BOLT_LOCK_TTL_MS,
      'NX'
    );
  });

  it('returns acquired: false if lock already held by another session', async () => {
    const mockRedis = {
      set: vi.fn().mockResolvedValue(null),
    } as unknown as Redis;

    const result = await acquireBoltLock(mockRedis, 'bolt_901');

    expect(result.acquired).toBe(false);
    expect(result.lockToken).toBeNull();
    expect(result.expiresAt).toBeNull();
  });

  it('releases lock atomically via Lua evaluation', async () => {
    const mockRedis = {
      eval: vi.fn().mockResolvedValue(1),
    } as unknown as Redis;

    const released = await releaseBoltLock(mockRedis, 'bolt_901', 'mock-token-uuid');

    expect(released).toBe(true);
    expect(mockRedis.eval).toHaveBeenCalledWith(
      expect.stringContaining('redis.call("del", KEYS[1])'),
      1,
      'lock:bolt:bolt_901',
      'mock-token-uuid'
    );
  });

  it('fails release when token does not match holder', async () => {
    const mockRedis = {
      eval: vi.fn().mockResolvedValue(0),
    } as unknown as Redis;

    const released = await releaseBoltLock(mockRedis, 'bolt_901', 'wrong-token');
    expect(released).toBe(false);
  });

  it('extends lock TTL atomically', async () => {
    const mockRedis = {
      eval: vi.fn().mockResolvedValue(1),
    } as unknown as Redis;

    const extended = await extendBoltLock(mockRedis, 'bolt_901', 'token-123', 60000);
    expect(extended).toBe(true);
    expect(mockRedis.eval).toHaveBeenCalledWith(
      expect.stringContaining('redis.call("pexpire", KEYS[1], ARGV[2])'),
      1,
      'lock:bolt:bolt_901',
      '60000'
    );
  });

  it('executes callback with withBoltLock and automatically releases lock', async () => {
    const mockRedis = {
      set: vi.fn().mockResolvedValue('OK'),
      eval: vi.fn().mockResolvedValue(1),
    } as unknown as Redis;

    let executed = false;
    const result = await withBoltLock(mockRedis, 'bolt_901', async (token) => {
      expect(token).toBeTypeOf('string');
      executed = true;
      return 'work-complete';
    });

    expect(executed).toBe(true);
    expect(result).toBe('work-complete');
    expect(mockRedis.eval).toHaveBeenCalled();
  });

  it('throws error and does not run callback if lock acquisition fails', async () => {
    const mockRedis = {
      set: vi.fn().mockResolvedValue(null),
    } as unknown as Redis;

    await expect(
      withBoltLock(mockRedis, 'bolt_901', async () => 'should not run')
    ).rejects.toThrow(/Failed to acquire lock for bolt 'bolt_901'/);
  });
});

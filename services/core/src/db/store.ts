/**
 * Drape Core State & Domain Store
 * Spec Anchor: architecture.md, schema.md, FEAT-005, FEAT-008, C-001..C-024
 */

import { randomUUID } from 'node:crypto';
import { db, checkDatabaseConnection } from './client.js';
import * as schema from './schema.js';
import { eq } from 'drizzle-orm';

export interface UserRecord {
  id: string;
  email: string;
  fullName: string;
  phone: string | null;
  role: 'customer' | 'atelier_pro' | 'cutter' | 'tailor' | 'admin';
  isSuspended?: boolean;
  passwordHash?: string;
  mfaRequired?: boolean;
  createdAt: string;
}

export interface ConsentRecordItem {
  id: string;
  userId: string;
  regulationStandard: 'BIPA_IL' | 'GDPR_ART_9' | 'CCPA_CPRA' | 'CUBI_TX';
  consentGranted: boolean;
  ipAddress: string;
  userAgent: string | null;
  grantedAt: string;
  expiresAt: string;
  consentToken?: string;
  revoked?: boolean;
}

export interface BoltRollItem {
  id: string;
  fabricId: string;
  dyeLotCode: string;
  initialYards: number;
  remainingContinuousYards: number;
  status: 'active' | 'quarantined' | 'depleted';
  warehouseLocation: string;
  createdAt: string;
}

export interface FabricItem {
  id: string;
  name: string;
  millName: string;
  countryOfOrigin: string;
  fiberBreakdown: string;
  gsm: number;
  widthInches: number;
  drapeCoefficient: number;
  stiffnessRating: number;
  pricePerYard: number;
  pbrTexturesUrl: string;
  createdAt: string;
}

export interface OrderItemRecord {
  id: string;
  orderId: string;
  fabricId: string;
  boltRollId: string;
  yardsCut: number;
  unitPrice: number;
  isSwatchBox: boolean;
  dyeLotCode?: string;
  fabricName?: string;
  createdAt: string;
}

export interface OrderRecord {
  id: string;
  userId: string;
  orderNumber: string;
  totalAmount: number;
  currency: 'USD' | 'EUR' | 'GBP' | 'NGN';
  status: 'pending' | 'confirmed' | 'cutting' | 'dispatched' | 'delivered' | 'cancelled';
  paymentChargeId: string;
  shippingAddress: {
    street: string;
    city: string;
    postalCode: string;
    country: string;
  };
  recipientContact?: {
    fullName: string;
    email: string;
    phone: string;
  };
  tailorDispatch?: {
    dispatchId: string;
    tailorStudioId: string;
    status: 'dispatched' | 'received_at_atelier' | 'fitting_scheduled' | 'in_construction' | 'completed';
    studioName?: string;
    masterCutter?: string;
    city?: string;
  } | null;
  idempotencyKey?: string;
  createdAt: string;
}

class DrapeDomainStore {
  public users: Map<string, UserRecord> = new Map();
  public consents: Map<string, ConsentRecordItem> = new Map();
  public fabrics: Map<string, FabricItem> = new Map();
  public bolts: Map<string, BoltRollItem> = new Map();
  public orders: Map<string, OrderRecord> = new Map();
  public orderItems: Map<string, OrderItemRecord[]> = new Map();
  public priorSwatchBoxUsers: Set<string> = new Set();

  constructor() {
    this.seedDefaults();
  }

  public seedDefaults() {
    // Default test user: Elena Rostova (Spec Persona)
    const elenaId = '11111111-1111-4111-a111-111111111111';
    this.users.set(elenaId, {
      id: elenaId,
      email: 'elena@rostova-atelier.com',
      fullName: 'Elena Rostova',
      phone: '+1 (312) 555-0199',
      role: 'customer',
      mfaRequired: false,
      createdAt: '2026-01-15T10:00:00Z',
    });

    // Suspended test user
    const suspendedId = '22222222-2222-4222-a222-222222222222';
    this.users.set(suspendedId, {
      id: suspendedId,
      email: 'suspended@drape.com',
      fullName: 'Suspended Patron',
      phone: null,
      role: 'customer',
      isSuspended: true,
      mfaRequired: false,
      createdAt: '2026-02-01T12:00:00Z',
    });

    // Default fabrics
    const fabricEmerald: FabricItem = {
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
      pbrTexturesUrl: 'https://assets.drape.luxury/fabrics/fab-slk-892/pbr',
      createdAt: '2026-01-01T00:00:00Z',
    };
    this.fabrics.set(fabricEmerald.id, fabricEmerald);

    // Default bolts
    const bolt901: BoltRollItem = {
      id: 'bolt_901',
      fabricId: 'FAB-SLK-892',
      dyeLotCode: 'LOT-2026-EMR-04',
      initialYards: 50.0,
      remainingContinuousYards: 25.0,
      status: 'active',
      warehouseLocation: 'Cutting Bay A-04',
      createdAt: '2026-01-10T08:00:00Z',
    };
    this.bolts.set(bolt901.id, bolt901);

    // Prior swatch credit eligible user
    this.priorSwatchBoxUsers.add(elenaId);
  }

  // --- Users ---
  public async findUserByEmail(email: string): Promise<UserRecord | null> {
    const isLive = await checkDatabaseConnection();
    if (isLive) {
      try {
        const rows = await db.select().from(schema.users).where(eq(schema.users.email, email)).limit(1);
        if (rows.length > 0) {
          const r = rows[0];
          return {
            id: r.id,
            email: r.email,
            fullName: r.fullName,
            phone: r.phone,
            role: r.role as any,
            createdAt: r.createdAt.toISOString(),
          };
        }
      } catch {
        // Fallback to in-memory store
      }
    }

    for (const user of this.users.values()) {
      if (user.email.toLowerCase() === email.toLowerCase()) {
        return user;
      }
    }
    return null;
  }

  public async findUserById(id: string): Promise<UserRecord | null> {
    const isLive = await checkDatabaseConnection();
    if (isLive) {
      try {
        const rows = await db.select().from(schema.users).where(eq(schema.users.id, id)).limit(1);
        if (rows.length > 0) {
          const r = rows[0];
          return {
            id: r.id,
            email: r.email,
            fullName: r.fullName,
            phone: r.phone,
            role: r.role as any,
            createdAt: r.createdAt.toISOString(),
          };
        }
      } catch {
        // Fallback
      }
    }
    return this.users.get(id) || null;
  }

  // --- Consents ---
  public async saveConsent(item: ConsentRecordItem): Promise<ConsentRecordItem> {
    this.consents.set(item.id, item);
    const isLive = await checkDatabaseConnection();
    if (isLive) {
      try {
        await db.insert(schema.consentRecords).values({
          id: item.id,
          userId: item.userId,
          regulationStandard: item.regulationStandard,
          consentGranted: item.consentGranted,
          ipAddress: item.ipAddress,
          userAgent: item.userAgent,
          grantedAt: new Date(item.grantedAt),
          expiresAt: new Date(item.expiresAt),
        });
      } catch {
        // Fallback kept in memory
      }
    }
    return item;
  }

  public async getActiveConsent(userId: string): Promise<ConsentRecordItem | null> {
    const now = Date.now();
    for (const record of this.consents.values()) {
      if (
        record.userId === userId &&
        record.consentGranted &&
        !record.revoked &&
        new Date(record.expiresAt).getTime() > now
      ) {
        return record;
      }
    }
    return null;
  }

  public async getConsentById(id: string): Promise<ConsentRecordItem | null> {
    return this.consents.get(id) || null;
  }

  public async revokeConsent(id: string): Promise<boolean> {
    const record = this.consents.get(id);
    if (!record) return false;
    record.revoked = true;
    record.consentGranted = false;
    const isLive = await checkDatabaseConnection();
    if (isLive) {
      try {
        await db.delete(schema.consentRecords).where(eq(schema.consentRecords.id, id));
      } catch {
        // In-memory revocation maintained
      }
    }
    return true;
  }

  // --- Bolts & Inventory ---
  public async getBolt(id: string): Promise<BoltRollItem | null> {
    return this.bolts.get(id) || null;
  }

  public async getFabric(id: string): Promise<FabricItem | null> {
    return this.fabrics.get(id) || null;
  }

  public async deductContinuousYardage(boltId: string, yardsToDeduct: number): Promise<BoltRollItem> {
    const bolt = this.bolts.get(boltId);
    if (!bolt) {
      throw new Error(`Bolt '${boltId}' not found`);
    }

    // Precise fractional computation using integer milli-yards to prevent floating point drift
    const remainingMilli = Math.round(bolt.remainingContinuousYards * 1000);
    const deductMilli = Math.round(yardsToDeduct * 1000);

    if (remainingMilli < deductMilli) {
      throw new Error(`Insufficient continuous yardage on bolt '${boltId}'`);
    }

    const updatedMilli = remainingMilli - deductMilli;
    bolt.remainingContinuousYards = Number((updatedMilli / 1000).toFixed(3));
    if (bolt.remainingContinuousYards === 0) {
      bolt.status = 'depleted';
    }

    return bolt;
  }

  // --- Orders & Swatch Credit ---
  public hasPriorSwatchCredit(userId: string): boolean {
    return this.priorSwatchBoxUsers.has(userId);
  }

  public recordPriorSwatchPurchase(userId: string): void {
    this.priorSwatchBoxUsers.add(userId);
  }

  public async findOrderByIdempotencyKey(key: string): Promise<OrderRecord | null> {
    for (const order of this.orders.values()) {
      if (order.idempotencyKey === key) {
        return order;
      }
    }
    return null;
  }

  public async findOrderById(id: string): Promise<OrderRecord | null> {
    return this.orders.get(id) || null;
  }

  public async findOrderByPaymentChargeId(paymentChargeId: string): Promise<OrderRecord | null> {
    for (const order of this.orders.values()) {
      if (order.paymentChargeId === paymentChargeId) {
        return order;
      }
    }
    return null;
  }

  public async getOrderItems(orderId: string): Promise<OrderItemRecord[]> {
    return this.orderItems.get(orderId) || [];
  }

  public async createOrder(
    order: OrderRecord,
    items: OrderItemRecord[]
  ): Promise<{ order: OrderRecord; items: OrderItemRecord[] }> {
    this.orders.set(order.id, order);
    this.orderItems.set(order.id, items);

    // If order contains swatch box, record prior swatch credit for user
    const hasSwatch = items.some((i) => i.isSwatchBox);
    if (hasSwatch) {
      this.priorSwatchBoxUsers.add(order.userId);
    }

    return { order, items };
  }

  public async updateOrderStatus(
    orderId: string,
    status: OrderRecord['status']
  ): Promise<OrderRecord | null> {
    const order = this.orders.get(orderId);
    if (!order) return null;
    order.status = status;
    return order;
  }
}

export const store = new DrapeDomainStore();

/**
 * Drape Core Database Schema
 * Spec Anchor: docs/Drape/schema.md, FEAT-005, FEAT-008, FEAT-010, NFR-040
 */

import { pgTable, uuid, varchar, text, boolean, integer, numeric, timestamp, jsonb } from 'drizzle-orm/pg-core';

/**
 * User Entity
 * Represents customer patrons, boutique atelier designers, and operations staff.
 * Spec Anchor: docs/Drape/schema.md#User
 */
export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  fullName: varchar('full_name', { length: 100 }).notNull(),
  phone: varchar('phone', { length: 50 }),
  role: varchar('role', { length: 20 }).notNull().default('customer'), // 'customer' | 'atelier_pro' | 'cutter' | 'tailor' | 'admin'
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

/**
 * ConsentRecord Entity
 * Stores immutable, cryptographically verifiable biometric consent logs.
 * Spec Anchor: docs/Drape/schema.md#ConsentRecord, FEAT-005, NFR-040
 */
export const consentRecords = pgTable('consent_records', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  regulationStandard: varchar('regulation_standard', { length: 50 }).notNull(), // 'BIPA_IL' | 'GDPR_ART_9' | 'CCPA_CPRA' | 'CUBI_TX'
  consentGranted: boolean('consent_granted').notNull(),
  ipAddress: varchar('ip_address', { length: 45 }).notNull(),
  userAgent: text('user_agent'),
  grantedAt: timestamp('granted_at', { withTimezone: true }).defaultNow().notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
});

/**
 * Fabric Entity
 * Central catalog entity defining physical textile composition, weight, and properties.
 * Spec Anchor: docs/Drape/schema.md#Fabric, C-007, C-008
 */
export const fabrics = pgTable('fabrics', {
  id: varchar('id', { length: 50 }).primaryKey(), // e.g., 'FAB-SLK-892'
  name: varchar('name', { length: 120 }).notNull(),
  millName: varchar('mill_name', { length: 120 }).notNull(),
  countryOfOrigin: varchar('country_of_origin', { length: 2 }).notNull(),
  fiberBreakdown: text('fiber_breakdown').notNull(),
  gsm: integer('gsm').notNull(),
  widthInches: numeric('width_inches', { precision: 5, scale: 2 }).notNull(),
  drapeCoefficient: numeric('drape_coefficient', { precision: 4, scale: 3 }).notNull(),
  stiffnessRating: numeric('stiffness_rating', { precision: 4, scale: 2 }).notNull(),
  pricePerYard: numeric('price_per_yard', { precision: 10, scale: 2 }).notNull(),
  pbrTexturesUrl: text('pbr_textures_url').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

/**
 * BoltRoll Entity
 * Physical rolls in warehouse cutting room, tracking unbroken continuous yardage.
 * Spec Anchor: docs/Drape/schema.md#BoltRoll, C-019, C-020
 */
export const boltRolls = pgTable('bolt_rolls', {
  id: varchar('id', { length: 50 }).primaryKey(), // e.g., 'bolt_901'
  fabricId: varchar('fabric_id', { length: 50 }).notNull().references(() => fabrics.id),
  dyeLotCode: varchar('dye_lot_code', { length: 50 }).notNull(),
  initialYards: numeric('initial_yards', { precision: 8, scale: 3 }).notNull(),
  remainingContinuousYards: numeric('remaining_continuous_yards', { precision: 8, scale: 3 }).notNull(),
  status: varchar('status', { length: 20 }).notNull().default('active'), // 'active' | 'quarantined' | 'depleted'
  warehouseLocation: varchar('warehouse_location', { length: 50 }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

/**
 * Fitting Entity
 * Generative neural garment fitting session linking customer pose and textile physics.
 * Spec Anchor: docs/Drape/schema.md#Fitting, C-011, C-012
 */
export const fittings = pgTable('fittings', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id),
  fabricId: varchar('fabric_id', { length: 50 }).notNull().references(() => fabrics.id),
  silhouetteId: varchar('silhouette_id', { length: 100 }).notNull(),
  renderUrl: text('render_url'),
  motionVideoUrl: text('motion_video_url'),
  drapeScore: numeric('drape_score', { precision: 4, scale: 3 }),
  status: varchar('status', { length: 20 }).notNull().default('queued'), // 'queued' | 'processing' | 'completed' | 'failed'
  ephemeralExpiresAt: timestamp('ephemeral_expires_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

/**
 * Order Entity
 * Commercial transaction for custom-cut textiles or swatch presentation boxes.
 * Spec Anchor: docs/Drape/schema.md#Order, C-022, C-023
 */
export const orders = pgTable('orders', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id),
  orderNumber: varchar('order_number', { length: 50 }).notNull().unique(),
  totalAmount: numeric('total_amount', { precision: 10, scale: 2 }).notNull(),
  currency: varchar('currency', { length: 3 }).notNull().default('USD'), // 'USD' | 'EUR' | 'GBP' | 'NGN'
  status: varchar('status', { length: 20 }).notNull().default('pending'), // 'pending' | 'confirmed' | 'cutting' | 'dispatched' | 'delivered' | 'cancelled'
  paymentChargeId: varchar('payment_charge_id', { length: 100 }).notNull(),
  shippingAddress: jsonb('shipping_address').notNull(),
  idempotencyKey: varchar('idempotency_key', { length: 100 }).unique(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

/**
 * OrderItem Entity
 * Fractional cuts severed from active bolts in 1/8th yard increments.
 * Spec Anchor: docs/Drape/schema.md#OrderItem, C-022
 */
export const orderItems = pgTable('order_items', {
  id: uuid('id').defaultRandom().primaryKey(),
  orderId: uuid('order_id').notNull().references(() => orders.id, { onDelete: 'cascade' }),
  fabricId: varchar('fabric_id', { length: 50 }).notNull().references(() => fabrics.id),
  boltRollId: varchar('bolt_roll_id', { length: 50 }).notNull().references(() => boltRolls.id),
  yardsCut: numeric('yards_cut', { precision: 8, scale: 3 }).notNull(),
  unitPrice: numeric('unit_price', { precision: 10, scale: 2 }).notNull(),
  isSwatchBox: boolean('is_swatch_box').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

/**
 * TailorStudio Entity
 * Accredited master tailor studio partner in the Drape concierge network.
 * Spec Anchor: docs/Drape/schema.md#TailorStudio, FEAT-010, C-025
 */
export const tailorStudios = pgTable('tailor_studios', {
  id: uuid('id').defaultRandom().primaryKey(),
  studioName: varchar('studio_name', { length: 100 }).notNull(),
  masterCutter: varchar('master_cutter', { length: 100 }).notNull(),
  city: varchar('city', { length: 50 }).notNull(),
  address: text('address').notNull(),
  rating: numeric('rating', { precision: 3, scale: 2 }).notNull(),
  activeCapacity: boolean('active_capacity').notNull().default(true),
  contactEmail: varchar('contact_email', { length: 255 }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

/**
 * TailorDispatch Entity
 * Concierge dispatch connecting an Order with an accredited TailorStudio.
 * Spec Anchor: docs/Drape/schema.md#TailorDispatch, C-022, C-023
 */
export const tailorDispatches = pgTable('tailor_dispatches', {
  id: uuid('id').defaultRandom().primaryKey(),
  orderId: uuid('order_id').notNull().references(() => orders.id, { onDelete: 'cascade' }),
  tailorStudioId: uuid('tailor_studio_id').notNull().references(() => tailorStudios.id),
  status: varchar('status', { length: 50 }).notNull().default('dispatched'), // 'dispatched' | 'received_at_atelier' | 'fitting_scheduled' | 'in_construction' | 'completed'
  digitalSpecUrl: text('digital_spec_url').notNull(),
  carrierTrackingNumber: varchar('carrier_tracking_number', { length: 100 }),
  dispatchedAt: timestamp('dispatched_at', { withTimezone: true }).defaultNow().notNull(),
});

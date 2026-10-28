/**
 * Drape Core Master Tailor & Concierge Routing Database Schema
 * Spec Anchor: docs/Drape/schema.md (TailorStudio, TailorDispatch), FEAT-010, C-025, C-026, C-027
 */

import { pgTable, uuid, varchar, text, boolean, integer, numeric, timestamp, jsonb } from 'drizzle-orm/pg-core';
import { orders } from '../schema.js';

export interface VerifiedReview {
  authorName: string;
  rating: number;
  comment: string;
  createdAt: string;
}

/**
 * TailorStudio Entity
 * Directory profile of accredited bespoke master tailors and couture dressmakers
 * participating in the Drape concierge network.
 * Spec Anchor: docs/Drape/schema.md#TailorStudio, FEAT-010, C-025, C-026
 */
export const tailorStudios = pgTable('tailor_studios', {
  id: uuid('id').defaultRandom().primaryKey(),
  studioName: varchar('studio_name', { length: 100 }).notNull(),
  masterCutter: varchar('master_cutter', { length: 100 }).notNull(),
  bio: text('bio').notNull(),
  city: varchar('city', { length: 50 }).notNull(), // 'London' | 'New_York' | 'Paris' | 'Milan' | 'Lagos'
  address: text('address').notNull(),
  contactEmail: varchar('contact_email', { length: 255 }).notNull(),
  phone: varchar('phone', { length: 50 }).notNull(),
  specialties: jsonb('specialties').$type<string[]>().notNull(), // e.g., ["suiting", "bridal", "corsetry", "traditional"]
  rating: numeric('rating', { precision: 3, scale: 2 }).notNull(), // 1.0 to 5.0
  reviewCount: integer('review_count').notNull().default(0),
  turnaroundWeeks: integer('turnaround_weeks').notNull().default(4), // 2 to 8
  leadTimeDays: integer('lead_time_days').notNull().default(28),
  activeCapacity: boolean('active_capacity').notNull().default(true),
  averageLaborCostUSD: numeric('average_labor_cost_usd', { precision: 10, scale: 2 }),
  portfolioImages: jsonb('portfolio_images').$type<string[]>().notNull().default([]),
  guildBadge: varchar('guild_badge', { length: 150 }),
  verifiedReviews: jsonb('verified_reviews').$type<VerifiedReview[]>().notNull().default([]),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

/**
 * TailorDispatch Entity
 * Manages white-glove logistics routing fabric orders and digital technical dossiers
 * to partner tailors.
 * Spec Anchor: docs/Drape/schema.md#TailorDispatch, FEAT-010, C-022, C-023, C-027
 */
export const tailorDispatches = pgTable('tailor_dispatches', {
  id: uuid('id').defaultRandom().primaryKey(),
  orderId: uuid('order_id').notNull().references(() => orders.id, { onDelete: 'cascade' }),
  tailorStudioId: uuid('tailor_studio_id').notNull().references(() => tailorStudios.id),
  status: varchar('status', { length: 50 }).notNull().default('dispatched'), // 'dispatched' | 'received_at_atelier' | 'fitting_scheduled' | 'in_construction' | 'completed'
  digitalSpecUrl: text('digital_spec_url').notNull(),
  carrierTrackingNumber: varchar('carrier_tracking_number', { length: 100 }),
  consultationDatePreferred: varchar('consultation_date_preferred', { length: 20 }),
  specialInstructions: text('special_instructions'),
  consultationCalendarUrl: text('consultation_calendar_url'),
  estimatedAtelierArrivalDate: varchar('estimated_atelier_arrival_date', { length: 20 }),
  dispatchedAt: timestamp('dispatched_at', { withTimezone: true }).defaultNow().notNull(),
});

export type TailorStudio = typeof tailorStudios.$inferSelect;
export type NewTailorStudio = typeof tailorStudios.$inferInsert;
export type TailorDispatch = typeof tailorDispatches.$inferSelect;
export type NewTailorDispatch = typeof tailorDispatches.$inferInsert;

/**
 * Accredited Partner Studios Seed Data across London, Paris, New York, Milan, and Lagos.
 * Spec Anchor: FEAT-010, C-025, C-026
 */
export const initialTailorStudios = [
  {
    id: '33333333-3333-4333-a333-333333333301',
    studioName: 'Savile & Co. Bespoke Cutters',
    masterCutter: 'Arthur Pendelton',
    bio: 'Over four decades of heritage suiting and architectural tailoring on Savile Row, specializing in hand-padded chest canvassing and structured British drape silhouettes.',
    city: 'London',
    address: '14 Savile Row, Mayfair, London W1S 3JN, United Kingdom',
    contactEmail: 'concierge@savileandco.co.uk',
    phone: '+44 20 7946 0192',
    specialties: ['suiting', 'corsetry'],
    rating: 4.96,
    reviewCount: 52,
    turnaroundWeeks: 4,
    leadTimeDays: 28,
    activeCapacity: true,
    averageLaborCostUSD: 2200.0,
    portfolioImages: [
      'https://assets.drape.luxury/tailors/savile-london-01.webp',
      'https://assets.drape.luxury/tailors/savile-london-02.webp',
    ],
    guildBadge: 'Savile Row Bespoke Association',
    verifiedReviews: [
      {
        authorName: 'Lord Harrington',
        rating: 5.0,
        comment: 'Master Pendelton rendered the charcoal barathea suiting with absolute perfection.',
        createdAt: '2026-01-18T14:30:00Z',
      },
      {
        authorName: 'Lady Genevieve',
        rating: 4.9,
        comment: 'The corseted dinner jacket draped seamlessly from the 3D technical spec.',
        createdAt: '2026-02-04T09:15:00Z',
      },
    ],
    createdAt: '2026-01-01T00:00:00Z',
  },
  {
    id: '33333333-3333-4333-a333-333333333302',
    studioName: 'Atelier Savile New York',
    masterCutter: 'Percival Vance',
    bio: "Manhattan's premier bespoke house specializing in sharp modern suiting, architectural tuxedos, and intricate corseted evening wear for galas and red carpets.",
    city: 'New_York',
    address: '740 Madison Ave, New York, NY 10065, United States',
    contactEmail: 'concierge@ateliersavileny.com',
    phone: '+1 212 555 0148',
    specialties: ['suiting', 'corsetry', 'bridal'],
    rating: 4.95,
    reviewCount: 48,
    turnaroundWeeks: 3,
    leadTimeDays: 21,
    activeCapacity: true,
    averageLaborCostUSD: 2400.0,
    portfolioImages: [
      'https://assets.drape.luxury/tailors/atelier-ny-01.webp',
      'https://assets.drape.luxury/tailors/atelier-ny-02.webp',
    ],
    guildBadge: 'Council of Bespoke Tailors America',
    verifiedReviews: [
      {
        authorName: 'Marcus Sterling',
        rating: 5.0,
        comment: 'The bolt of emerald silk brocade arrived in archival packaging and the fit is peerless.',
        createdAt: '2026-02-14T11:00:00Z',
      },
      {
        authorName: 'Claire Dupont',
        rating: 4.9,
        comment: 'Flawless execution of the Grecian bias silhouette with zero fabric waste.',
        createdAt: '2026-02-22T16:45:00Z',
      },
    ],
    createdAt: '2026-01-05T00:00:00Z',
  },
  {
    id: '33333333-3333-4333-a333-333333333303',
    studioName: 'Maison de Couture Saint-Honoré',
    masterCutter: 'Geneviève Delacroix',
    bio: 'Historic Parisian haute couture bridal and corsetry atelier employing ancestral French bias draping and delicate hand-finished silk embroidery.',
    city: 'Paris',
    address: '28 Rue du Faubourg Saint-Honoré, 75008 Paris, France',
    contactEmail: 'contact@sainthonore-couture.fr',
    phone: '+33 1 42 68 55 00',
    specialties: ['bridal', 'corsetry'],
    rating: 4.98,
    reviewCount: 64,
    turnaroundWeeks: 5,
    leadTimeDays: 35,
    activeCapacity: true,
    averageLaborCostUSD: 3100.0,
    portfolioImages: [
      'https://assets.drape.luxury/tailors/maison-paris-01.webp',
      'https://assets.drape.luxury/tailors/maison-paris-02.webp',
    ],
    guildBadge: 'Fédération de la Haute Couture et de la Mode',
    verifiedReviews: [
      {
        authorName: 'Elena Rostova',
        rating: 5.0,
        comment: 'Delacroix shaped the silk crepe de chine bridal gown with transcendental grace.',
        createdAt: '2026-01-29T10:10:00Z',
      },
    ],
    createdAt: '2026-01-03T00:00:00Z',
  },
  {
    id: '33333333-3333-4333-a333-333333333304',
    studioName: 'Sartoria Brera Alta Moda',
    masterCutter: 'Giancarlo Rossi',
    bio: 'Milanese soft-shoulder tailoring and fluid silk evening silhouettes executed with superlative Italian craftsmanship and hand-stitched pick lapels.',
    city: 'Milan',
    address: 'Via Brera 8, 20121 Milano MI, Italy',
    contactEmail: 'info@sartoriabrera.it',
    phone: '+39 02 876 5432',
    specialties: ['suiting', 'bridal'],
    rating: 4.94,
    reviewCount: 42,
    turnaroundWeeks: 4,
    leadTimeDays: 28,
    activeCapacity: true,
    averageLaborCostUSD: 2600.0,
    portfolioImages: [
      'https://assets.drape.luxury/tailors/sartoria-milano-01.webp',
      'https://assets.drape.luxury/tailors/sartoria-milano-02.webp',
    ],
    guildBadge: 'Camera Nazionale della Moda Italiana',
    verifiedReviews: [
      {
        authorName: 'Alessandro Conti',
        rating: 4.9,
        comment: 'Effortless Milanese drape. The wool-silk blend fell exactly as the WebGPU simulation previewed.',
        createdAt: '2026-02-10T13:20:00Z',
      },
    ],
    createdAt: '2026-01-08T00:00:00Z',
  },
  {
    id: '33333333-3333-4333-a333-333333333305',
    studioName: 'Sartoria Quadrilatero Milano',
    masterCutter: 'Matteo Bellini',
    bio: 'Exclusive Montenapoleone bespoke workshop renowned for hand-canvassed double-breasted overcoats and structured wool tuxedos. Currently at capacity due to seasonal gala demand.',
    city: 'Milan',
    address: 'Via Monte Napoleone 12, 20121 Milano MI, Italy',
    contactEmail: 'concierge@quadrilaterobellini.it',
    phone: '+39 02 760 1928',
    specialties: ['suiting'],
    rating: 4.92,
    reviewCount: 39,
    turnaroundWeeks: 6,
    leadTimeDays: 42,
    activeCapacity: false, // Temporarily at capacity for commission pause testing per FEAT-010 & C-027
    averageLaborCostUSD: 2800.0,
    portfolioImages: [
      'https://assets.drape.luxury/tailors/quadrilatero-milano-01.webp',
    ],
    guildBadge: 'Camera Nazionale della Moda Italiana',
    verifiedReviews: [
      {
        authorName: 'Matteo Morandi',
        rating: 5.0,
        comment: 'Phenomenal precision, although waitlists can extend into the next season.',
        createdAt: '2026-01-12T15:40:00Z',
      },
    ],
    createdAt: '2026-01-04T00:00:00Z',
  },
  {
    id: '33333333-3333-4333-a333-333333333306',
    studioName: 'Alara Heritage Atelier',
    masterCutter: 'Folashade Adeleke',
    bio: 'Acclaimed West African luxury couture house fusing ancestral Aso-Oke hand weaving, traditional Agbada embroidery, and modern corseted evening gowns.',
    city: 'Lagos',
    address: '12A Temple Run Road, Ikoyi, Lagos 101233, Nigeria',
    contactEmail: 'bespoke@alaraheritage.ng',
    phone: '+234 1 271 0022',
    specialties: ['traditional', 'bridal', 'suiting'],
    rating: 4.97,
    reviewCount: 57,
    turnaroundWeeks: 4,
    leadTimeDays: 28,
    activeCapacity: true,
    averageLaborCostUSD: 1600.0,
    portfolioImages: [
      'https://assets.drape.luxury/tailors/alara-lagos-01.webp',
      'https://assets.drape.luxury/tailors/alara-lagos-02.webp',
    ],
    guildBadge: 'West African Bespoke Guild',
    verifiedReviews: [
      {
        authorName: 'Chidinma Okafor',
        rating: 5.0,
        comment: 'The bridal corset and traditional metallic brocade train took breath away at the reception.',
        createdAt: '2026-02-19T18:00:00Z',
      },
      {
        authorName: 'Babatunde Alabi',
        rating: 4.9,
        comment: 'Exceptional cutting precision and prompt white-glove delivery to Ikoyi.',
        createdAt: '2026-02-25T11:30:00Z',
      },
    ],
    createdAt: '2026-01-07T00:00:00Z',
  },
];

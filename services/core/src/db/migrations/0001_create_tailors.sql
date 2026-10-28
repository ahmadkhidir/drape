-- Migration: 0001_create_tailors.sql
-- Spec Anchor: docs/Drape/schema.md, FEAT-010, C-025, C-026, C-027

CREATE TABLE IF NOT EXISTS tailor_studios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  studio_name VARCHAR(100) NOT NULL,
  master_cutter VARCHAR(100) NOT NULL,
  bio TEXT NOT NULL,
  city VARCHAR(50) NOT NULL,
  address TEXT NOT NULL,
  contact_email VARCHAR(255) NOT NULL,
  phone VARCHAR(50) NOT NULL,
  specialties JSONB NOT NULL,
  rating NUMERIC(3, 2) NOT NULL,
  review_count INTEGER NOT NULL DEFAULT 0,
  turnaround_weeks INTEGER NOT NULL DEFAULT 4,
  lead_time_days INTEGER NOT NULL DEFAULT 28,
  active_capacity BOOLEAN NOT NULL DEFAULT true,
  average_labor_cost_usd NUMERIC(10, 2),
  portfolio_images JSONB NOT NULL DEFAULT '[]'::jsonb,
  guild_badge VARCHAR(150),
  verified_reviews JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tailor_dispatches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  tailor_studio_id UUID NOT NULL REFERENCES tailor_studios(id),
  status VARCHAR(50) NOT NULL DEFAULT 'dispatched',
  digital_spec_url TEXT NOT NULL,
  carrier_tracking_number VARCHAR(100),
  consultation_date_preferred VARCHAR(20),
  special_instructions TEXT,
  consultation_calendar_url TEXT,
  estimated_atelier_arrival_date VARCHAR(20),
  dispatched_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tailor_studios_city ON tailor_studios(city);
CREATE INDEX IF NOT EXISTS idx_tailor_studios_active_capacity ON tailor_studios(active_capacity);
CREATE INDEX IF NOT EXISTS idx_tailor_dispatches_order_id ON tailor_dispatches(order_id);
CREATE INDEX IF NOT EXISTS idx_tailor_dispatches_tailor_studio_id ON tailor_dispatches(tailor_studio_id);

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS business_metrics (
  id                UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id       UUID         NOT NULL,

  stock_level       NUMERIC(5,2) NOT NULL CHECK (stock_level >= 0 AND stock_level <= 100),
  warehouse_id      TEXT         NOT NULL DEFAULT 'WH-01',

  orders_per_hour   NUMERIC(6,1) NOT NULL CHECK (orders_per_hour >= 0),
  revenue_progress  NUMERIC(5,2) NOT NULL CHECK (revenue_progress >= 0 AND revenue_progress <= 100),

  delivery_time_min NUMERIC(5,1) NOT NULL CHECK (delivery_time_min >= 0),
  cancel_rate_pct   NUMERIC(5,2) NOT NULL CHECK (cancel_rate_pct >= 0 AND cancel_rate_pct <= 100),

  recorded_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bm_business_time
  ON business_metrics (business_id, recorded_at DESC);

ALTER TABLE business_metrics REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
    AND tablename = 'business_metrics'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE business_metrics;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS user_profiles (
  id           UUID  PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id      UUID  NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  business_id  UUID  NOT NULL DEFAULT uuid_generate_v4(),
  role         TEXT  NOT NULL CHECK (role IN ('owner', 'manager')),
  name         TEXT,
  avatar       TEXT,
  business     TEXT,
  city         TEXT,
  order_target INT   DEFAULT 200,
  warehouses   INT   DEFAULT 2,
  zones        INT   DEFAULT 3,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

ALTER TABLE user_profiles REPLICA IDENTITY FULL;

ALTER TABLE business_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles    ENABLE ROW LEVEL SECURITY;

CREATE POLICY "read_own_metrics" ON business_metrics
  FOR SELECT USING (
    business_id = (
      SELECT business_id FROM user_profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "service_insert" ON business_metrics
  FOR INSERT WITH CHECK (true);

CREATE POLICY "own_profile_all" ON user_profiles
  FOR ALL USING (user_id = auth.uid());

CREATE OR REPLACE VIEW latest_business_metrics AS
SELECT DISTINCT ON (business_id)
  business_id,
  warehouse_id,
  stock_level       AS stock,
  orders_per_hour   AS orders,
  revenue_progress  AS revenue,
  delivery_time_min AS delivery,
  cancel_rate_pct   AS cancel,
  recorded_at
FROM business_metrics
ORDER BY business_id, recorded_at DESC;


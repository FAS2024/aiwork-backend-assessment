-- Briefings main table
CREATE TABLE IF NOT EXISTS briefings (
  id SERIAL PRIMARY KEY,
  company_name VARCHAR(200) NOT NULL,
  ticker VARCHAR(20) NOT NULL,
  sector VARCHAR(120) NOT NULL,
  analyst_name VARCHAR(160) NOT NULL,
  summary TEXT NOT NULL,
  recommendation TEXT NOT NULL,
  generated_at TIMESTAMPTZ,
  generated_html TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_briefings_created_at ON briefings (created_at DESC);
CREATE INDEX idx_briefings_ticker ON briefings (ticker);

-- Key points and risks (both stored as "points" with a kind)
CREATE TABLE IF NOT EXISTS briefing_points (
  id SERIAL PRIMARY KEY,
  briefing_id INTEGER NOT NULL REFERENCES briefings(id) ON DELETE CASCADE,
  kind VARCHAR(20) NOT NULL CHECK (kind IN ('key_point', 'risk')),
  content TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_briefing_points_briefing_id ON briefing_points (briefing_id);

-- Optional metrics (unique name per briefing)
CREATE TABLE IF NOT EXISTS briefing_metrics (
  id SERIAL PRIMARY KEY,
  briefing_id INTEGER NOT NULL REFERENCES briefings(id) ON DELETE CASCADE,
  name VARCHAR(120) NOT NULL,
  value VARCHAR(80) NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (briefing_id, name)
);

CREATE INDEX idx_briefing_metrics_briefing_id ON briefing_metrics (briefing_id);

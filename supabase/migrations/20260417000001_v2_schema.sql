-- ─── Kinetia v2 Schema ────────────────────────────────────────────────────────
-- Pipeline: Video + Prompt → AI Physics → Sync → AE Plugin Expression Injection
-- Drops legacy project/studio tables, adds physics_presets + plugin_sessions

-- ─── Drop legacy tables ───────────────────────────────────────────────────────
DROP TABLE IF EXISTS project_layer_mappings CASCADE;
DROP TABLE IF EXISTS export_packages CASCADE;
DROP TABLE IF EXISTS projects CASCADE;
DROP TABLE IF EXISTS training_jobs CASCADE;
-- Keep: presets table if exists (will replace with physics_presets)
DROP TABLE IF EXISTS presets CASCADE;

-- ─── physics_presets ─────────────────────────────────────────────────────────
-- Core entity: one preset = one CV analysis ready to inject into AE
CREATE TABLE IF NOT EXISTS physics_presets (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID REFERENCES auth.users NOT NULL,

  -- Identity
  name                TEXT NOT NULL,
  description         TEXT,
  category            TEXT DEFAULT 'custom',
  -- 'entrance' | 'exit' | 'bounce' | 'inertia' | 'loop' | 'custom'

  -- Analysis source
  video_url           TEXT,
  isolation_prompt    TEXT NOT NULL DEFAULT '',
  -- e.g. "Analiza el rebote de la esfera roja en el primer segundo"

  -- Extracted physics (core data from CV pipeline)
  physics             JSONB NOT NULL DEFAULT '{}',
  -- { type, tension, friction, mass, amplitude, frequency, decay, easing }

  -- AE integration
  expression_template TEXT NOT NULL DEFAULT '',
  -- JavaScript string to inject as AE expression
  pseudo_effect_xml   TEXT,
  -- XML for Pseudo Effect (editable nodes in AE Effects panel)

  -- Metadata
  thumbnail_url       TEXT,
  duration_ms         INTEGER,
  fps                 INTEGER DEFAULT 30,
  confidence          REAL DEFAULT 0,
  status              TEXT DEFAULT 'processing',
  -- 'processing' | 'ready' | 'failed'
  error_message       TEXT,

  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE physics_presets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owner_all_physics_presets" ON physics_presets
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ─── plugin_sessions ─────────────────────────────────────────────────────────
-- Tracks active AE plugin instances for real-time sync
CREATE TABLE IF NOT EXISTS plugin_sessions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES auth.users NOT NULL,
  ae_version  TEXT,
  platform    TEXT, -- 'mac' | 'win'
  last_ping   TIMESTAMPTZ DEFAULT NOW(),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE plugin_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owner_all_plugin_sessions" ON plugin_sessions
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ─── Indexes ──────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_presets_user_created
  ON physics_presets(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_presets_user_status
  ON physics_presets(user_id, status);

CREATE INDEX IF NOT EXISTS idx_sessions_user_ping
  ON plugin_sessions(user_id, last_ping DESC);

-- ─── updated_at trigger ───────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_updated_at ON physics_presets;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON physics_presets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─── Storage: kinetia-uploads policies for videos/ ───────────────────────────
-- (Bucket must already exist — created in previous migrations)
INSERT INTO storage.buckets (id, name, public)
  VALUES ('kinetia-uploads', 'kinetia-uploads', true)
  ON CONFLICT (id) DO NOTHING;

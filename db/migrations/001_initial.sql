-- Seen v0.1.0 — Initial schema

-- Core entries
CREATE TABLE IF NOT EXISTS entries (
  id           TEXT PRIMARY KEY,
  content      TEXT NOT NULL,
  entry_type   TEXT NOT NULL CHECK(entry_type IN ('win','blocker','shoutout','learning','delivery')),
  bucket       TEXT NOT NULL,
  impact_level TEXT NOT NULL CHECK(impact_level IN ('team','org','cross-org')),
  created_at   TEXT NOT NULL,
  archived_at  TEXT,
  deleted_at   TEXT
);

-- User-editable goal buckets
CREATE TABLE IF NOT EXISTS buckets (
  id                  TEXT PRIMARY KEY,
  name                TEXT NOT NULL,
  promo_criteria_hint TEXT,
  sort_order          INTEGER DEFAULT 0
);

-- Seed default buckets
INSERT OR IGNORE INTO buckets (id, name, promo_criteria_hint, sort_order) VALUES
  ('technical-scope',   'Technical Scope & Influence', 'Breadth, architectural decisions, cross-team technical impact', 1),
  ('people-impact',     'People Impact',               'Mentorship, unblocking, career development of others',          2),
  ('leadership-org',    'Leadership & Org Health',     'Process improvements, culture, team health',                    3),
  ('innovation-bets',   'Innovation & Bets',           'Risk-taking, new approaches, forward-looking work',             4),
  ('external-presence', 'External Presence',           'Talks, writing, community, recruiting signal',                  5),
  ('execution',         'Execution & Delivery',        'Shipping, reliability, concrete outcomes',                      6);

-- AI-generated output archive
CREATE TABLE IF NOT EXISTS generations (
  id               TEXT PRIMARY KEY,
  type             TEXT NOT NULL CHECK(type IN ('one_on_one','brag_doc','quarterly')),
  date_range_start TEXT,
  date_range_end   TEXT,
  quarter          TEXT,
  year             INTEGER,
  output           TEXT NOT NULL,
  created_at       TEXT NOT NULL
);

-- App configuration (key-value)
CREATE TABLE IF NOT EXISTS settings (
  key   TEXT PRIMARY KEY,
  value TEXT
);

-- Feature flags (v2 hooks — no UI yet)
CREATE TABLE IF NOT EXISTS feature_flags (
  flag       TEXT PRIMARY KEY,
  enabled    INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT
);

INSERT OR IGNORE INTO feature_flags (flag, enabled) VALUES
  ('insights',         0),
  ('annual_summary',   0),
  ('saas_mode',        0);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_entries_created  ON entries(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_entries_bucket   ON entries(bucket);
CREATE INDEX IF NOT EXISTS idx_entries_archived ON entries(archived_at);
CREATE INDEX IF NOT EXISTS idx_gen_type         ON generations(type, created_at DESC);

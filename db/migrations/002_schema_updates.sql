-- Seen v0.2.0 — Schema updates

-- Add shoutout_person to entries (who is being recognised)
ALTER TABLE entries ADD COLUMN shoutout_person TEXT;

-- Recreate generations without the type CHECK so we can store 'brag_month'
-- and add month + content_hash columns for caching
CREATE TABLE IF NOT EXISTS generations_new (
  id               TEXT PRIMARY KEY,
  type             TEXT NOT NULL,
  date_range_start TEXT,
  date_range_end   TEXT,
  quarter          TEXT,
  year             INTEGER,
  month            INTEGER,
  content_hash     TEXT,
  output           TEXT NOT NULL,
  created_at       TEXT NOT NULL
);

INSERT INTO generations_new (id, type, date_range_start, date_range_end, quarter, year, output, created_at)
  SELECT id, type, date_range_start, date_range_end, quarter, year, output, created_at
  FROM generations;

DROP TABLE generations;
ALTER TABLE generations_new RENAME TO generations;

CREATE INDEX IF NOT EXISTS idx_gen_type ON generations(type, created_at DESC);

-- Promotion target (stored in settings, but seed sensible defaults)
INSERT OR IGNORE INTO settings (key, value) VALUES ('target_role', '');
INSERT OR IGNORE INTO settings (key, value) VALUES ('target_date', '');

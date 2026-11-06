CREATE TABLE profiles (
  requested_handle TEXT PRIMARY KEY,
  status TEXT NOT NULL CHECK (status IN ('found', 'not_found')),
  handle TEXT,
  rank TEXT,
  rating INTEGER,
  max_rank TEXT,
  max_rating INTEGER,
  fetched_at INTEGER NOT NULL,
  refresh_at INTEGER NOT NULL,
  failure_count INTEGER NOT NULL DEFAULT 0
) STRICT;

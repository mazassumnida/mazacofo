SELECT CONCAT(
  'INSERT OR IGNORE INTO profiles (requested_handle, status, handle, rank, rating, max_rank, max_rating, fetched_at, refresh_at, failure_count) VALUES (',
  QUOTE(LOWER(handle)), ', ''found'', ', QUOTE(handle), ', ',
  QUOTE(`rank`), ', ', COALESCE(rating, 'NULL'), ', ',
  QUOTE(max_rank), ', ', COALESCE(top_rating, 'NULL'), ', ',
  UNIX_TIMESTAMP(updated_at) * 1000, ', 0, 0);'
)
FROM clients
WHERE handle REGEXP '^[A-Za-z0-9_-]+$';

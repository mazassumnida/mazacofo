import type { CodeforcesProfile } from './codeforces';

export const REFRESH_INTERVAL_MS = 60 * 60 * 1000;
export const REFRESH_LEASE_MS = 60 * 1000;
export const FAILURE_BASE_DELAY_MS = 15 * 60 * 1000;
export const FAILURE_MAX_DELAY_MS = 6 * 60 * 60 * 1000;

interface StoredProfileBase {
  requestedHandle: string;
  fetchedAt: number;
  refreshAt: number;
  failureCount: number;
}

export type StoredProfile =
  | (StoredProfileBase & { status: 'found'; profile: CodeforcesProfile })
  | (StoredProfileBase & { status: 'not_found' });

interface ProfileRow {
  requested_handle: string;
  status: string;
  handle: string | null;
  rank: string | null;
  rating: number | null;
  max_rank: string | null;
  max_rating: number | null;
  fetched_at: number;
  refresh_at: number;
  failure_count: number;
}

export const toStoreKey = (handle: string) => handle.toLowerCase();

const toStoredProfile = (row: ProfileRow): StoredProfile | null => {
  const base: StoredProfileBase = {
    requestedHandle: row.requested_handle,
    fetchedAt: row.fetched_at,
    refreshAt: row.refresh_at,
    failureCount: row.failure_count,
  };

  if (row.status === 'not_found') {
    return { ...base, status: 'not_found' };
  }

  if (row.status === 'found' && row.handle !== null) {
    return {
      ...base,
      status: 'found',
      profile: {
        handle: row.handle,
        rank: row.rank,
        rating: row.rating,
        maxRank: row.max_rank,
        maxRating: row.max_rating,
      },
    };
  }

  return null;
};

export const getStoredProfile = async (
  db: D1Database,
  key: string,
): Promise<StoredProfile | null> => {
  const row = await db
    .prepare('SELECT * FROM profiles WHERE requested_handle = ?')
    .bind(key)
    .first<ProfileRow>();
  return row === null ? null : toStoredProfile(row);
};

export const saveFoundProfile = async (
  db: D1Database,
  key: string,
  profile: CodeforcesProfile,
  now: number,
): Promise<void> => {
  await db
    .prepare(
      `INSERT INTO profiles (requested_handle, status, handle, rank, rating, max_rank, max_rating, fetched_at, refresh_at, failure_count)
       VALUES (?1, 'found', ?2, ?3, ?4, ?5, ?6, ?7, ?8, 0)
       ON CONFLICT (requested_handle) DO UPDATE SET
         status = 'found',
         handle = excluded.handle,
         rank = excluded.rank,
         rating = excluded.rating,
         max_rank = excluded.max_rank,
         max_rating = excluded.max_rating,
         fetched_at = excluded.fetched_at,
         refresh_at = excluded.refresh_at,
         failure_count = 0`,
    )
    .bind(
      key,
      profile.handle,
      profile.rank,
      profile.rating,
      profile.maxRank,
      profile.maxRating,
      now,
      now + REFRESH_INTERVAL_MS,
    )
    .run();
};

export const saveNotFoundProfile = async (
  db: D1Database,
  key: string,
  now: number,
): Promise<void> => {
  await db
    .prepare(
      `INSERT INTO profiles (requested_handle, status, handle, rank, rating, max_rank, max_rating, fetched_at, refresh_at, failure_count)
       VALUES (?1, 'not_found', NULL, NULL, NULL, NULL, NULL, ?2, ?3, 0)
       ON CONFLICT (requested_handle) DO UPDATE SET
         status = 'not_found',
         handle = NULL,
         rank = NULL,
         rating = NULL,
         max_rank = NULL,
         max_rating = NULL,
         fetched_at = excluded.fetched_at,
         refresh_at = excluded.refresh_at,
         failure_count = 0`,
    )
    .bind(key, now, now + REFRESH_INTERVAL_MS)
    .run();
};

export const claimRefresh = async (
  db: D1Database,
  key: string,
  now: number,
): Promise<boolean> => {
  const result = await db
    .prepare(
      'UPDATE profiles SET refresh_at = ?1 WHERE requested_handle = ?2 AND refresh_at <= ?3',
    )
    .bind(now + REFRESH_LEASE_MS, key, now)
    .run();
  return result.meta.changes === 1;
};

export const recordRefreshFailure = async (
  db: D1Database,
  key: string,
  now: number,
): Promise<number | null> => {
  const row = await db
    .prepare(
      `UPDATE profiles SET
         failure_count = failure_count + 1,
         refresh_at = ?1 + MIN(?2 << MIN(failure_count, 16), ?3)
       WHERE requested_handle = ?4
       RETURNING failure_count`,
    )
    .bind(now, FAILURE_BASE_DELAY_MS, FAILURE_MAX_DELAY_MS, key)
    .first<{ failure_count: number }>();
  return row === null ? null : row.failure_count;
};

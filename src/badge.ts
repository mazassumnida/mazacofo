import {
  CodeforcesError,
  fetchCodeforcesProfile,
  type CodeforcesProfile,
  type Fetcher,
} from './codeforces';
import {
  claimRefresh,
  getStoredProfile,
  recordRefreshFailure,
  saveFoundProfile,
  saveNotFoundProfile,
  toStoreKey,
} from './profile-store';
import { renderBadge, toRatedProfile } from './svg';

export const UNAVAILABLE_ALERT_FAILURE_COUNT = 5;

const HANDLE_PATTERN = /^[A-Za-z0-9_-]+$/;
const CACHE_CONTROL = 'public, max-age=3600';
const UNAVAILABLE_CACHE_CONTROL = 'public, max-age=60';

export interface ErrorContext {
  handle: string;
  stage: 'fetch' | 'refresh';
  failureCount?: number;
}

export interface BadgeDeps {
  db: D1Database;
  fetcher: Fetcher;
  now: () => number;
  waitUntil: (promise: Promise<unknown>) => void;
  reportError: (error: unknown, context: ErrorContext) => void;
}

const svgResponse = (
  body: string,
  status: number,
  cacheControl = CACHE_CONTROL,
): Response =>
  new Response(body, {
    status,
    headers: {
      'Content-Type': 'image/svg+xml',
      'Cache-Control': cacheControl,
      'Access-Control-Allow-Origin': '*',
    },
  });

const notFoundResponse = () =>
  svgResponse('<svg>Codeforces profile not found</svg>', 404);

const unavailableResponse = () =>
  svgResponse(
    '<svg>Codeforces is temporarily unavailable</svg>',
    503,
    UNAVAILABLE_CACHE_CONTROL,
  );

const profileResponse = (profile: CodeforcesProfile, mini: boolean) => {
  const rated = toRatedProfile(profile);
  if (rated === null) {
    return svgResponse('<svg>rating not available</svg>', 404);
  }
  return svgResponse(renderBadge(rated, mini), 200);
};

const toCodeforcesError = (error: unknown): CodeforcesError =>
  error instanceof CodeforcesError
    ? error
    : new CodeforcesError(
        'UNKNOWN',
        error instanceof Error ? error.message : String(error),
      );

const refreshProfile = async (
  deps: BadgeDeps,
  key: string,
  handle: string,
): Promise<void> => {
  const now = deps.now();
  if (!(await claimRefresh(deps.db, key, now))) {
    return;
  }

  try {
    const profile = await fetchCodeforcesProfile(deps.fetcher, handle);
    await saveFoundProfile(deps.db, key, profile, deps.now());
  } catch (error) {
    const codeforcesError = toCodeforcesError(error);

    if (codeforcesError.type === 'NOT_FOUND') {
      await saveNotFoundProfile(deps.db, key, deps.now());
      return;
    }

    const failureCount = await recordRefreshFailure(deps.db, key, deps.now());
    console.warn(
      `Codeforces refresh failed for ${handle} (${codeforcesError.type}, failure ${failureCount}): ${codeforcesError.message}`,
    );

    if (
      codeforcesError.type === 'UNKNOWN' ||
      failureCount === UNAVAILABLE_ALERT_FAILURE_COUNT
    ) {
      deps.reportError(codeforcesError, {
        handle,
        stage: 'refresh',
        failureCount: failureCount ?? undefined,
      });
    }
  }
};

const fetchNewProfile = async (
  deps: BadgeDeps,
  key: string,
  handle: string,
  mini: boolean,
): Promise<Response> => {
  try {
    const profile = await fetchCodeforcesProfile(deps.fetcher, handle);
    await saveFoundProfile(deps.db, key, profile, deps.now());
    return profileResponse(profile, mini);
  } catch (error) {
    const codeforcesError = toCodeforcesError(error);

    if (codeforcesError.type === 'NOT_FOUND') {
      await saveNotFoundProfile(deps.db, key, deps.now());
      return notFoundResponse();
    }

    console.warn(
      `Codeforces fetch failed for ${handle} (${codeforcesError.type}): ${codeforcesError.message}`,
    );
    if (codeforcesError.type === 'UNKNOWN') {
      deps.reportError(codeforcesError, { handle, stage: 'fetch' });
    }
    return unavailableResponse();
  }
};

export const handleBadgeRequest = async (
  request: Request,
  deps: BadgeDeps,
): Promise<Response> => {
  const url = new URL(request.url);

  if (url.pathname !== '/') {
    return new Response('Not Found', { status: 404 });
  }
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    return new Response('Method Not Allowed', {
      status: 405,
      headers: { Allow: 'GET, HEAD' },
    });
  }

  const handle = url.searchParams.get('id');
  const mini = Boolean(url.searchParams.get('mini'));

  if (!handle) {
    return svgResponse('<svg>id query parameter is required</svg>', 400);
  }
  if (!HANDLE_PATTERN.test(handle)) {
    return svgResponse(
      '<svg>id should only contain Latin letters, digits, underscore or dash characters</svg>',
      400,
    );
  }

  const key = toStoreKey(handle);
  const stored = await getStoredProfile(deps.db, key);

  if (stored === null) {
    return fetchNewProfile(deps, key, handle, mini);
  }

  if (stored.refreshAt <= deps.now()) {
    deps.waitUntil(
      refreshProfile(deps, key, handle).catch((error: unknown) => {
        deps.reportError(error, { handle, stage: 'refresh' });
      }),
    );
  }

  return stored.status === 'found'
    ? profileResponse(stored.profile, mini)
    : notFoundResponse();
};

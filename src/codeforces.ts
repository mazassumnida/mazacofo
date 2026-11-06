export interface CodeforcesProfile {
  handle: string;
  rank: string | null;
  rating: number | null;
  maxRank: string | null;
  maxRating: number | null;
}

export type CodeforcesErrorType = 'NOT_FOUND' | 'UNAVAILABLE' | 'UNKNOWN';

export class CodeforcesError extends Error {
  readonly type: CodeforcesErrorType;

  constructor(type: CodeforcesErrorType, message: string) {
    super(message);
    this.name = 'CodeforcesError';
    this.type = type;
  }
}

export type Fetcher = (input: string, init?: RequestInit) => Promise<Response>;

export const CODEFORCES_REQUEST_TIMEOUT_MS = 10_000;

const API_BASE_URL = 'https://codeforces.com/api';
const PROFILE_BASE_URL = 'https://codeforces.com/profile';
const NOT_FOUND_PATTERN = /handles: User with handle (.+?) not found/;
const CALL_LIMIT_COMMENT = 'Call limit exceeded';
const PROFILE_LOCATION_PATTERN =
  /^(?:https:\/\/codeforces\.com)?\/profile\/([^/?#]+)$/;

type ApiResponse =
  { status: 'OK'; result: unknown[] } | { status: 'FAILED'; comment: string };

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const isApiResponse = (value: unknown): value is ApiResponse => {
  if (!isRecord(value)) {
    return false;
  }
  if (value.status === 'OK') {
    return Array.isArray(value.result);
  }
  return value.status === 'FAILED' && typeof value.comment === 'string';
};

const optionalString = (value: unknown): string | null =>
  typeof value === 'string' ? value : null;

const optionalNumber = (value: unknown): number | null =>
  typeof value === 'number' && Number.isFinite(value) ? value : null;

const toProfile = (value: unknown): CodeforcesProfile | null => {
  if (!isRecord(value) || typeof value.handle !== 'string') {
    return null;
  }
  return {
    handle: value.handle,
    rank: optionalString(value.rank),
    rating: optionalNumber(value.rating),
    maxRank: optionalString(value.maxRank),
    maxRating: optionalNumber(value.maxRating),
  };
};

const parseJson = (text: string): unknown => {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
};

const isRetryableStatus = (status: number) => status >= 500 || status === 429;

const fromFailedResponse = (
  status: number,
  comment: string | null,
): CodeforcesError => {
  if (comment === null) {
    return new CodeforcesError(
      'UNAVAILABLE',
      `Codeforces returned a non-API response (HTTP ${status})`,
    );
  }

  const missingHandle = comment.match(NOT_FOUND_PATTERN)?.[1];
  if (missingHandle !== undefined) {
    return new CodeforcesError(
      'NOT_FOUND',
      `Profile not found (${missingHandle})`,
    );
  }

  if (comment.includes(CALL_LIMIT_COMMENT) || isRetryableStatus(status)) {
    return new CodeforcesError(
      'UNAVAILABLE',
      `Codeforces API failed (HTTP ${status}): ${comment}`,
    );
  }

  return new CodeforcesError(
    'UNKNOWN',
    `Codeforces API failed (HTTP ${status}): ${comment}`,
  );
};

const toNetworkError = (error: unknown): CodeforcesError => {
  if (error instanceof CodeforcesError) {
    return error;
  }
  const detail = error instanceof Error ? error.message : String(error);
  return new CodeforcesError(
    'UNAVAILABLE',
    `No response from Codeforces (${detail})`,
  );
};

const request = async (
  fetcher: Fetcher,
  url: string,
  init: RequestInit,
): Promise<Response> => {
  try {
    return await fetcher(url, {
      ...init,
      signal: AbortSignal.timeout(CODEFORCES_REQUEST_TIMEOUT_MS),
    });
  } catch (error) {
    throw toNetworkError(error);
  }
};

const requestProfile = async (
  fetcher: Fetcher,
  handle: string,
): Promise<CodeforcesProfile> => {
  const response = await request(
    fetcher,
    `${API_BASE_URL}/user.info?handles=${encodeURIComponent(handle)}`,
    { headers: { Accept: 'application/json' } },
  );

  let text: string;
  try {
    text = await response.text();
  } catch (error) {
    throw toNetworkError(error);
  }

  const body = parseJson(text);
  if (!isApiResponse(body)) {
    throw fromFailedResponse(response.status, null);
  }

  if (body.status === 'FAILED') {
    throw fromFailedResponse(response.status, body.comment);
  }

  const profile = body.result.length === 1 ? toProfile(body.result[0]) : null;
  if (profile === null) {
    throw new CodeforcesError(
      'UNKNOWN',
      `Codeforces returned an unexpected user.info result for ${handle}`,
    );
  }
  return profile;
};

const findRenamedHandle = async (
  fetcher: Fetcher,
  handle: string,
): Promise<string | null> => {
  let response: Response;
  try {
    response = await request(
      fetcher,
      `${PROFILE_BASE_URL}/${encodeURIComponent(handle)}`,
      { method: 'HEAD', redirect: 'manual' },
    );
  } catch {
    return null;
  }

  if (response.status !== 302) {
    return null;
  }

  const renamedHandle = response.headers
    .get('location')
    ?.match(PROFILE_LOCATION_PATTERN)?.[1];
  if (
    renamedHandle === undefined ||
    renamedHandle.toLowerCase() === handle.toLowerCase()
  ) {
    return null;
  }
  return decodeURIComponent(renamedHandle);
};

export const fetchCodeforcesProfile = async (
  fetcher: Fetcher,
  handle: string,
): Promise<CodeforcesProfile> => {
  try {
    return await requestProfile(fetcher, handle);
  } catch (error) {
    if (!(error instanceof CodeforcesError) || error.type !== 'NOT_FOUND') {
      throw error;
    }

    const renamedHandle = await findRenamedHandle(fetcher, handle);
    if (renamedHandle === null) {
      throw error;
    }
    return requestProfile(fetcher, renamedHandle);
  }
};

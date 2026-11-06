import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';

export interface TCodeforcesProfile {
  handle: string;
  rank: string;
  rating: number;
  maxRank: string;
  maxRating: number;
}

export type TCodeforcesResponse =
  | {
      status: 'OK';
      result: TCodeforcesProfile[];
    }
  | {
      status: 'FAILED';
      comment: string;
    };

type TCodeforcesBody = TCodeforcesResponse | string;

export type TCodeforcesErrorType = 'NOT_FOUND' | 'UNAVAILABLE' | 'UNKNOWN';

export class CodeforcesError extends Error {
  readonly type: TCodeforcesErrorType;
  readonly handle: string | null;

  constructor(
    type: TCodeforcesErrorType,
    message: string,
    handle: string | null = null,
  ) {
    super(message);
    this.name = 'CodeforcesError';
    this.type = type;
    this.handle = handle;
  }
}

export interface TCodeforcesRenamedHandle {
  from: string;
  to: string;
}

export interface TCodeforcesBulkResult {
  profiles: TCodeforcesProfile[];
  renamedHandles: TCodeforcesRenamedHandle[];
  missingHandles: string[];
}

export const MAX_MISSING_HANDLES_PER_RUN = 5;

const CODEFORCES_REQUEST_TIMEOUT_MS = 15_000;
const CODEFORCES_BULK_RETRY_DELAYS_MS: readonly number[] = [2_000, 4_000];
const CODEFORCES_API_INTERVAL_MS = 2_000;

const NOT_FOUND_PATTERN = /handles: User with handle (.+?) not found/;
const CALL_LIMIT_COMMENT = 'Call limit exceeded';
const PROFILE_LOCATION_PATTERN =
  /^(?:https:\/\/codeforces\.com)?\/profile\/([^/?#]+)$/;

const sleep = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

const isSameHandle = (a: string, b: string) =>
  a.toLowerCase() === b.toLowerCase();

const findHandle = (handles: string[], handle: string): string | null =>
  handles.find((candidate) => isSameHandle(candidate, handle)) ?? null;

const readComment = (data: TCodeforcesBody | undefined): string | null => {
  if (typeof data !== 'object' || data === null || data.status !== 'FAILED') {
    return null;
  }
  return typeof data.comment === 'string' ? data.comment : null;
};

const isRetryableStatus = (status: number) => status >= 500 || status === 429;

const fromResponse = (
  status: number,
  data: TCodeforcesBody | undefined,
): CodeforcesError => {
  const comment = readComment(data);

  if (comment === null) {
    return new CodeforcesError(
      'UNAVAILABLE',
      `Codeforces returned a non-API response (HTTP ${status})`,
    );
  }

  const matched = comment.match(NOT_FOUND_PATTERN);
  if (matched) {
    return new CodeforcesError(
      'NOT_FOUND',
      `Profile not found (${matched[1]})`,
      matched[1],
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

const toCodeforcesError = (error: unknown): CodeforcesError => {
  if (error instanceof CodeforcesError) {
    return error;
  }

  if (!axios.isAxiosError<TCodeforcesBody>(error)) {
    const detail = error instanceof Error ? error.message : String(error);
    return new CodeforcesError('UNKNOWN', `Unexpected error: ${detail}`);
  }

  if (!error.response) {
    return new CodeforcesError(
      'UNAVAILABLE',
      `No response from Codeforces (${error.code ?? error.message})`,
    );
  }

  return fromResponse(error.response.status, error.response.data);
};

@Injectable()
export class CodeforcesService {
  private readonly logger = new Logger(CodeforcesService.name);

  async getCodeforcesProfile(handle: string): Promise<TCodeforcesProfile[]> {
    try {
      return await this.requestWithRetry(handle, []);
    } catch (error) {
      const codeforcesError = toCodeforcesError(error);

      if (codeforcesError.type === 'NOT_FOUND') {
        const changedHandle = await this.findRenamedHandle(handle);
        if (changedHandle) {
          return this.getCodeforcesProfile(changedHandle);
        }
      }

      this.logFailure(codeforcesError, handle);
      throw codeforcesError;
    }
  }

  async getBulkCodeforcesProfile(
    handles: string[],
  ): Promise<TCodeforcesBulkResult> {
    try {
      return await this.requestBulkSkippingMissing(handles);
    } catch (error) {
      const codeforcesError = toCodeforcesError(error);
      this.logFailure(codeforcesError, `${handles.length} handles`);
      throw codeforcesError;
    }
  }

  private async requestBulkSkippingMissing(
    handles: string[],
  ): Promise<TCodeforcesBulkResult> {
    let pending = [...handles];
    const renamedHandles: TCodeforcesRenamedHandle[] = [];
    const missingHandles: string[] = [];

    while (pending.length > 0) {
      try {
        const profiles = await this.requestWithRetry(
          pending.join(';'),
          CODEFORCES_BULK_RETRY_DELAYS_MS,
        );
        return { profiles, renamedHandles, missingHandles };
      } catch (error) {
        const codeforcesError = toCodeforcesError(error);
        if (codeforcesError.type !== 'NOT_FOUND') {
          throw codeforcesError;
        }

        const missingHandle =
          codeforcesError.handle === null
            ? null
            : findHandle(pending, codeforcesError.handle);
        if (missingHandle === null) {
          throw new CodeforcesError(
            'UNKNOWN',
            `Codeforces reported a handle that was not requested as missing: ${codeforcesError.message}`,
            codeforcesError.handle,
          );
        }

        const skippedHandles = [
          ...renamedHandles.map(({ from }) => from),
          ...missingHandles,
        ];
        if (skippedHandles.length >= MAX_MISSING_HANDLES_PER_RUN) {
          throw new CodeforcesError(
            'UNKNOWN',
            `Codeforces reported more than ${MAX_MISSING_HANDLES_PER_RUN} missing handles in one run (${[
              ...skippedHandles,
              missingHandle,
            ].join(', ')})`,
            missingHandle,
          );
        }

        pending = pending.filter(
          (handle) => !isSameHandle(handle, missingHandle),
        );

        const renamedHandle = await this.findRenamedHandle(missingHandle);
        if (renamedHandle) {
          renamedHandles.push({ from: missingHandle, to: renamedHandle });
          if (findHandle(pending, renamedHandle) === null) {
            pending.push(renamedHandle);
          }
          this.logger.warn(
            `Codeforces handle renamed, retrying without it: ${missingHandle} -> ${renamedHandle}`,
          );
        } else {
          missingHandles.push(missingHandle);
          this.logger.warn(
            `Codeforces handle not found, retrying without it: ${missingHandle}`,
          );
        }

        if (pending.length > 0) {
          await sleep(CODEFORCES_API_INTERVAL_MS);
        }
      }
    }

    return { profiles: [], renamedHandles, missingHandles };
  }

  private async requestWithRetry(
    handles: string,
    retryDelaysMs: readonly number[],
  ): Promise<TCodeforcesProfile[]> {
    for (let attempt = 0; ; attempt++) {
      try {
        return await this.requestProfiles(handles);
      } catch (error) {
        const codeforcesError = toCodeforcesError(error);
        const delayMs = retryDelaysMs[attempt];

        if (codeforcesError.type !== 'UNAVAILABLE' || delayMs === undefined) {
          throw codeforcesError;
        }

        this.logger.warn(
          `Codeforces API unavailable, retrying in ${delayMs}ms (attempt ${
            attempt + 1
          }/${retryDelaysMs.length + 1}): ${codeforcesError.message}`,
        );
        await sleep(delayMs);
      }
    }
  }

  private async requestProfiles(
    handles: string,
  ): Promise<TCodeforcesProfile[]> {
    const { data, status } = await axios.get<TCodeforcesBody>(
      `https://codeforces.com/api/user.info?handles=${handles}`,
      { timeout: CODEFORCES_REQUEST_TIMEOUT_MS },
    );

    if (
      typeof data === 'object' &&
      data !== null &&
      data.status === 'OK' &&
      Array.isArray(data.result)
    ) {
      return data.result;
    }

    throw fromResponse(status, data);
  }

  private async findRenamedHandle(handle: string): Promise<string | null> {
    try {
      await axios.head(`https://codeforces.com/profile/${handle}`, {
        maxRedirects: 0,
        timeout: CODEFORCES_REQUEST_TIMEOUT_MS,
      });
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 302) {
        const location = error.response.headers.location;
        const matched =
          typeof location === 'string'
            ? location.match(PROFILE_LOCATION_PATTERN)
            : null;

        if (matched && matched[1] !== handle) {
          return matched[1];
        }
      }
    }

    return null;
  }

  private logFailure(error: CodeforcesError, target: string) {
    const message = `Codeforces ${error.type}: ${error.message} (${target})`;

    if (error.type === 'UNKNOWN') {
      this.logger.error(message);
      return;
    }

    this.logger.warn(message);
  }
}

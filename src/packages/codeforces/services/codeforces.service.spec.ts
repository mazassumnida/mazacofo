import { Logger } from '@nestjs/common';
import axios, {
  AxiosError,
  AxiosHeaders,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from 'axios';

import {
  CodeforcesError,
  CodeforcesService,
  TCodeforcesProfile,
  TCodeforcesResponse,
} from '@/packages/codeforces/services/codeforces.service';

type TBody = TCodeforcesResponse | string;

type TSettled<T> =
  | { ok: true; value: T }
  | { ok: false; error: CodeforcesError };

const config: InternalAxiosRequestConfig = { headers: new AxiosHeaders() };

const response = (
  status: number,
  data: TBody,
  headers: Record<string, string> = {},
): AxiosResponse<TBody> => ({
  data,
  status,
  statusText: '',
  headers,
  config,
});

const httpError = (
  status: number,
  data: TBody,
  headers?: Record<string, string>,
) =>
  new AxiosError<TBody>(
    `Request failed with status code ${status}`,
    AxiosError.ERR_BAD_RESPONSE,
    config,
    {},
    response(status, data, headers),
  );

const networkError = (code: string) =>
  new AxiosError<TBody>(code, code, config, {});

const profile = (handle: string): TCodeforcesProfile => ({
  handle,
  rank: 'expert',
  rating: 1700,
  maxRank: 'expert',
  maxRating: 1750,
});

const okResponse = (handles: string[]) =>
  response(200, { status: 'OK', result: handles.map(profile) });

const notFound = (handle: string) =>
  httpError(400, {
    status: 'FAILED',
    comment: `handles: User with handle ${handle} not found`,
  });

const settle = async <T>(promise: Promise<T>): Promise<TSettled<T>> => {
  const settled = promise.then(
    (value): TSettled<T> => ({ ok: true, value }),
    (error: CodeforcesError): TSettled<T> => ({ ok: false, error }),
  );
  await jest.runAllTimersAsync();
  return settled;
};

const expectFailure = <T>(result: TSettled<T>): CodeforcesError => {
  if (!('error' in result)) {
    throw new Error('Expected the call to fail');
  }
  expect(result.error).toBeInstanceOf(CodeforcesError);
  return result.error;
};

describe('CodeforcesService', () => {
  let service: CodeforcesService;
  let getSpy: jest.SpiedFunction<typeof axios.get>;
  let headSpy: jest.SpiedFunction<typeof axios.head>;

  beforeAll(() => {
    Logger.overrideLogger(false);
  });

  beforeEach(() => {
    jest.useFakeTimers();
    service = new CodeforcesService();
    getSpy = jest.spyOn(axios, 'get');
    headSpy = jest.spyOn(axios, 'head');
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  describe('getBulkCodeforcesProfile', () => {
    it('fetches every handle in a single request with a timeout', async () => {
      getSpy.mockResolvedValueOnce(okResponse(['alice', 'bob']));

      const result = await settle(
        service.getBulkCodeforcesProfile(['alice', 'bob']),
      );

      expect(result).toEqual({
        ok: true,
        value: [profile('alice'), profile('bob')],
      });
      expect(getSpy).toHaveBeenCalledTimes(1);
      expect(getSpy).toHaveBeenCalledWith(
        'https://codeforces.com/api/user.info?handles=alice;bob',
        { timeout: 15000 },
      );
    });

    it.each([
      ['an HTTP 502 gateway page', httpError(502, '<html>Bad Gateway</html>')],
      [
        'a call limit rejection',
        httpError(503, { status: 'FAILED', comment: 'Call limit exceeded' }),
      ],
      ['an HTTP 429', httpError(429, '')],
      ['an HTTP 403 block page', httpError(403, '<html>blocked</html>')],
      ['a connection reset', networkError('ECONNRESET')],
      ['a DNS failure', networkError('EAI_AGAIN')],
      ['a request timeout', networkError('ECONNABORTED')],
    ])('retries after %s and recovers', async (_label, error) => {
      getSpy
        .mockRejectedValueOnce(error)
        .mockResolvedValueOnce(okResponse(['alice']));

      const result = await settle(service.getBulkCodeforcesProfile(['alice']));

      expect(result).toEqual({ ok: true, value: [profile('alice')] });
      expect(getSpy).toHaveBeenCalledTimes(2);
      expect(headSpy).not.toHaveBeenCalled();
    });

    it('treats an HTTP 200 HTML block page as unavailable', async () => {
      getSpy.mockResolvedValue(
        response(200, 'The page is temporarily blocked by administrator.'),
      );

      const error = expectFailure(
        await settle(service.getBulkCodeforcesProfile(['alice', 'bob'])),
      );

      expect(error.type).toBe('UNAVAILABLE');
      expect(error.message).toContain('HTTP 200');
      expect(getSpy).toHaveBeenCalledTimes(3);
      expect(headSpy).not.toHaveBeenCalled();
    });

    it('gives up as UNAVAILABLE after three attempts', async () => {
      getSpy.mockRejectedValue(httpError(504, '<html>Gateway Timeout</html>'));

      const error = expectFailure(
        await settle(service.getBulkCodeforcesProfile(['alice', 'bob'])),
      );

      expect(error.type).toBe('UNAVAILABLE');
      expect(error.message).toContain('HTTP 504');
      expect(getSpy).toHaveBeenCalledTimes(3);
      expect(headSpy).not.toHaveBeenCalled();
    });

    it('reports a missing handle without retrying', async () => {
      getSpy.mockRejectedValueOnce(notFound('ghost'));

      const error = expectFailure(
        await settle(service.getBulkCodeforcesProfile(['alice', 'ghost'])),
      );

      expect(error.type).toBe('NOT_FOUND');
      expect(error.handle).toBe('ghost');
      expect(getSpy).toHaveBeenCalledTimes(1);
      expect(headSpy).not.toHaveBeenCalled();
    });

    it('surfaces unexpected API failures as UNKNOWN with the API comment', async () => {
      getSpy.mockRejectedValueOnce(
        httpError(400, {
          status: 'FAILED',
          comment: 'handles: Field should contain between 1 and 10000 items',
        }),
      );

      const error = expectFailure(
        await settle(service.getBulkCodeforcesProfile(['alice'])),
      );

      expect(error.type).toBe('UNKNOWN');
      expect(error.message).toBe(
        'Codeforces API failed (HTTP 400): handles: Field should contain between 1 and 10000 items',
      );
      expect(getSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('getCodeforcesProfile', () => {
    it('follows a renamed handle', async () => {
      getSpy
        .mockRejectedValueOnce(notFound('oldname'))
        .mockResolvedValueOnce(okResponse(['newname']));
      headSpy.mockRejectedValueOnce(
        httpError(302, '', {
          location: 'https://codeforces.com/profile/newname',
        }),
      );

      const result = await settle(service.getCodeforcesProfile('oldname'));

      expect(result).toEqual({ ok: true, value: [profile('newname')] });
      expect(headSpy).toHaveBeenCalledWith(
        'https://codeforces.com/profile/oldname',
        { maxRedirects: 0, timeout: 15000 },
      );
      expect(getSpy).toHaveBeenLastCalledWith(
        'https://codeforces.com/api/user.info?handles=newname',
        { timeout: 15000 },
      );
    });

    it('ignores redirects that do not point at a profile', async () => {
      getSpy.mockRejectedValueOnce(notFound('ghost'));
      headSpy.mockRejectedValueOnce(
        httpError(302, '', { location: 'https://codeforces.com/' }),
      );

      const error = expectFailure(
        await settle(service.getCodeforcesProfile('ghost')),
      );

      expect(error.type).toBe('NOT_FOUND');
      expect(getSpy).toHaveBeenCalledTimes(1);
    });

    it('neither retries nor probes renames when Codeforces is unavailable', async () => {
      getSpy.mockRejectedValueOnce(httpError(503, '<html>down</html>'));

      const error = expectFailure(
        await settle(service.getCodeforcesProfile('alice')),
      );

      expect(error.type).toBe('UNAVAILABLE');
      expect(getSpy).toHaveBeenCalledTimes(1);
      expect(headSpy).not.toHaveBeenCalled();
    });
  });
});

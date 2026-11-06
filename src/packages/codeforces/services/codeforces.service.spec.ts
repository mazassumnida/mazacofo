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
  MAX_MISSING_HANDLES_PER_RUN,
  TCodeforcesBulkResult,
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

const bulkResult = (
  handles: string[],
  extra: Partial<Omit<TCodeforcesBulkResult, 'profiles'>> = {},
): TCodeforcesBulkResult => ({
  profiles: handles.map(profile),
  renamedHandles: [],
  missingHandles: [],
  ...extra,
});

const userInfoUrl = (handles: string[]) =>
  `https://codeforces.com/api/user.info?handles=${handles.join(';')}`;

const profileRedirect = (handle: string) =>
  httpError(302, '', { location: `https://codeforces.com/profile/${handle}` });

const forbidden = () => httpError(403, '<html>Forbidden</html>');

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
        value: bulkResult(['alice', 'bob']),
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

      expect(result).toEqual({ ok: true, value: bulkResult(['alice']) });
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

    it('drops a missing handle and refetches the rest instead of failing the batch', async () => {
      getSpy
        .mockRejectedValueOnce(notFound('ghost'))
        .mockResolvedValueOnce(okResponse(['alice', 'bob']));
      headSpy.mockRejectedValueOnce(forbidden());

      const result = await settle(
        service.getBulkCodeforcesProfile(['alice', 'ghost', 'bob']),
      );

      expect(result).toEqual({
        ok: true,
        value: bulkResult(['alice', 'bob'], { missingHandles: ['ghost'] }),
      });
      expect(headSpy).toHaveBeenCalledTimes(1);
      expect(headSpy).toHaveBeenCalledWith(
        'https://codeforces.com/profile/ghost',
        { maxRedirects: 0, timeout: 15000 },
      );
      expect(getSpy).toHaveBeenNthCalledWith(2, userInfoUrl(['alice', 'bob']), {
        timeout: 15000,
      });
    });

    it('waits two seconds before refetching after a missing handle', async () => {
      getSpy
        .mockRejectedValueOnce(notFound('ghost'))
        .mockResolvedValueOnce(okResponse(['alice']));
      headSpy.mockRejectedValueOnce(forbidden());

      const pending = service.getBulkCodeforcesProfile(['alice', 'ghost']);

      await jest.advanceTimersByTimeAsync(1999);
      expect(getSpy).toHaveBeenCalledTimes(1);

      await jest.advanceTimersByTimeAsync(1);
      expect(getSpy).toHaveBeenCalledTimes(2);

      await expect(pending).resolves.toEqual(
        bulkResult(['alice'], { missingHandles: ['ghost'] }),
      );
    });

    it('matches the reported missing handle case-insensitively', async () => {
      getSpy
        .mockRejectedValueOnce(notFound('ghost'))
        .mockResolvedValueOnce(okResponse(['alice']));
      headSpy.mockRejectedValueOnce(forbidden());

      const result = await settle(
        service.getBulkCodeforcesProfile(['alice', 'Ghost']),
      );

      expect(result).toEqual({
        ok: true,
        value: bulkResult(['alice'], { missingHandles: ['Ghost'] }),
      });
      expect(getSpy).toHaveBeenNthCalledWith(2, userInfoUrl(['alice']), {
        timeout: 15000,
      });
    });

    it('skips missing handles one at a time as Codeforces reports them', async () => {
      getSpy
        .mockRejectedValueOnce(notFound('ghost1'))
        .mockRejectedValueOnce(notFound('ghost2'))
        .mockResolvedValueOnce(okResponse(['alice']));
      headSpy.mockRejectedValue(forbidden());

      const result = await settle(
        service.getBulkCodeforcesProfile(['ghost1', 'alice', 'ghost2']),
      );

      expect(result).toEqual({
        ok: true,
        value: bulkResult(['alice'], { missingHandles: ['ghost1', 'ghost2'] }),
      });
      expect(getSpy.mock.calls.map(([url]) => url)).toEqual([
        userInfoUrl(['ghost1', 'alice', 'ghost2']),
        userInfoUrl(['alice', 'ghost2']),
        userInfoUrl(['alice']),
      ]);
    });

    it('swaps a renamed handle for its new name in the refetch', async () => {
      getSpy
        .mockRejectedValueOnce(notFound('oldname'))
        .mockResolvedValueOnce(okResponse(['alice', 'newname']));
      headSpy.mockRejectedValueOnce(profileRedirect('newname'));

      const result = await settle(
        service.getBulkCodeforcesProfile(['alice', 'oldname']),
      );

      expect(result).toEqual({
        ok: true,
        value: bulkResult(['alice', 'newname'], {
          renamedHandles: [{ from: 'oldname', to: 'newname' }],
        }),
      });
      expect(getSpy).toHaveBeenNthCalledWith(
        2,
        userInfoUrl(['alice', 'newname']),
        { timeout: 15000 },
      );
    });

    it('does not request a renamed handle twice when it is already in the batch', async () => {
      getSpy
        .mockRejectedValueOnce(notFound('oldname'))
        .mockResolvedValueOnce(okResponse(['newname']));
      headSpy.mockRejectedValueOnce(profileRedirect('newname'));

      const result = await settle(
        service.getBulkCodeforcesProfile(['newname', 'oldname']),
      );

      expect(result).toEqual({
        ok: true,
        value: bulkResult(['newname'], {
          renamedHandles: [{ from: 'oldname', to: 'newname' }],
        }),
      });
      expect(getSpy).toHaveBeenNthCalledWith(2, userInfoUrl(['newname']), {
        timeout: 15000,
      });
    });

    it('returns no profiles without another request when every handle is missing', async () => {
      getSpy.mockRejectedValueOnce(notFound('ghost'));
      headSpy.mockRejectedValueOnce(forbidden());

      const result = await settle(service.getBulkCodeforcesProfile(['ghost']));

      expect(result).toEqual({
        ok: true,
        value: bulkResult([], { missingHandles: ['ghost'] }),
      });
      expect(getSpy).toHaveBeenCalledTimes(1);
    });

    it('still retries an unavailable refetch after skipping a missing handle', async () => {
      getSpy
        .mockRejectedValueOnce(notFound('ghost'))
        .mockRejectedValueOnce(httpError(502, '<html>Bad Gateway</html>'))
        .mockResolvedValueOnce(okResponse(['alice']));
      headSpy.mockRejectedValueOnce(forbidden());

      const result = await settle(
        service.getBulkCodeforcesProfile(['alice', 'ghost']),
      );

      expect(result).toEqual({
        ok: true,
        value: bulkResult(['alice'], { missingHandles: ['ghost'] }),
      });
      expect(getSpy).toHaveBeenCalledTimes(3);
    });

    it('fails as UNKNOWN when more handles go missing than one run allows', async () => {
      const ghosts = Array.from(
        { length: MAX_MISSING_HANDLES_PER_RUN + 1 },
        (_, index) => `ghost${index}`,
      );
      ghosts.forEach((ghost) => getSpy.mockRejectedValueOnce(notFound(ghost)));
      headSpy.mockRejectedValue(forbidden());

      const error = expectFailure(
        await settle(service.getBulkCodeforcesProfile(['alice', ...ghosts])),
      );

      expect(error.type).toBe('UNKNOWN');
      expect(error.message).toBe(
        `Codeforces reported more than ${MAX_MISSING_HANDLES_PER_RUN} missing handles in one run (${ghosts.join(
          ', ',
        )})`,
      );
      expect(getSpy).toHaveBeenCalledTimes(MAX_MISSING_HANDLES_PER_RUN + 1);
      expect(headSpy).toHaveBeenCalledTimes(MAX_MISSING_HANDLES_PER_RUN);
    });

    it('fails as UNKNOWN when Codeforces reports a handle that was not requested', async () => {
      getSpy.mockRejectedValueOnce(notFound('stranger'));

      const error = expectFailure(
        await settle(service.getBulkCodeforcesProfile(['alice', 'bob'])),
      );

      expect(error.type).toBe('UNKNOWN');
      expect(error.message).toBe(
        'Codeforces reported a handle that was not requested as missing: Profile not found (stranger)',
      );
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

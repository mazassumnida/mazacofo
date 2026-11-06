import { describe, expect, it } from 'vitest';

import { CodeforcesError, fetchCodeforcesProfile } from '../src/codeforces';
import {
  createFakeFetcher,
  expert,
  jsonResponse,
  notFoundResponse,
  okResponse,
} from './helpers';

const expectCodeforcesError = async (
  promise: Promise<unknown>,
  type: CodeforcesError['type'],
) => {
  const error: unknown = await promise.catch((caught: unknown) => caught);
  expect(error).toBeInstanceOf(CodeforcesError);
  expect(error instanceof CodeforcesError ? error.type : null).toBe(type);
};

describe('fetchCodeforcesProfile', () => {
  it('returns the profile from user.info', async () => {
    const { fetcher, calls } = createFakeFetcher(() => okResponse(expert));

    await expect(fetchCodeforcesProfile(fetcher, 'expert_1')).resolves.toEqual({
      handle: 'Expert_1',
      rank: 'expert',
      rating: 1700,
      maxRank: 'candidate master',
      maxRating: 1950,
    });
    expect(calls).toEqual([
      'GET https://codeforces.com/api/user.info?handles=expert_1',
    ]);
  });

  it('keeps unrated users with null rating fields', async () => {
    const { fetcher } = createFakeFetcher(() =>
      okResponse({ handle: 'fresh' }),
    );

    await expect(fetchCodeforcesProfile(fetcher, 'fresh')).resolves.toEqual({
      handle: 'fresh',
      rank: null,
      rating: null,
      maxRank: null,
      maxRating: null,
    });
  });

  it('throws NOT_FOUND when the handle does not exist and is not renamed', async () => {
    const { fetcher, calls } = createFakeFetcher((url) =>
      url.pathname.startsWith('/profile/')
        ? new Response(null, { status: 403 })
        : notFoundResponse('ghost'),
    );

    await expectCodeforcesError(
      fetchCodeforcesProfile(fetcher, 'ghost'),
      'NOT_FOUND',
    );
    expect(calls).toEqual([
      'GET https://codeforces.com/api/user.info?handles=ghost',
      'HEAD https://codeforces.com/profile/ghost',
    ]);
  });

  it('follows a profile redirect to the renamed handle', async () => {
    const { fetcher, calls } = createFakeFetcher((url) => {
      if (url.pathname === '/profile/old_name') {
        return new Response(null, {
          status: 302,
          headers: { Location: 'https://codeforces.com/profile/Expert_1' },
        });
      }
      return url.searchParams.get('handles') === 'Expert_1'
        ? okResponse(expert)
        : notFoundResponse('old_name');
    });

    await expect(
      fetchCodeforcesProfile(fetcher, 'old_name'),
    ).resolves.toMatchObject({ handle: 'Expert_1' });
    expect(calls).toEqual([
      'GET https://codeforces.com/api/user.info?handles=old_name',
      'HEAD https://codeforces.com/profile/old_name',
      'GET https://codeforces.com/api/user.info?handles=Expert_1',
    ]);
  });

  it('ignores a redirect back to the same handle', async () => {
    const { fetcher, calls } = createFakeFetcher((url) =>
      url.pathname.startsWith('/profile/')
        ? new Response(null, {
            status: 302,
            headers: { Location: '/profile/GHOST' },
          })
        : notFoundResponse('ghost'),
    );

    await expectCodeforcesError(
      fetchCodeforcesProfile(fetcher, 'ghost'),
      'NOT_FOUND',
    );
    expect(calls).toHaveLength(2);
  });

  it('treats an HTML block page with HTTP 200 as UNAVAILABLE', async () => {
    const { fetcher } = createFakeFetcher(
      () =>
        new Response('The page is temporarily blocked by administrator.', {
          status: 200,
          headers: { 'Content-Type': 'text/html' },
        }),
    );

    await expectCodeforcesError(
      fetchCodeforcesProfile(fetcher, 'tourist'),
      'UNAVAILABLE',
    );
  });

  it.each([
    [
      'HTTP 503 with API comment',
      jsonResponse({ status: 'FAILED', comment: 'Server error' }, 503),
    ],
    [
      'HTTP 429 with API comment',
      jsonResponse({ status: 'FAILED', comment: 'Too many' }, 429),
    ],
    [
      'call limit comment',
      jsonResponse({ status: 'FAILED', comment: 'Call limit exceeded' }, 400),
    ],
    ['HTTP 502 without body', new Response('', { status: 502 })],
  ])('treats %s as UNAVAILABLE', async (_name, response) => {
    const { fetcher } = createFakeFetcher(() => response);

    await expectCodeforcesError(
      fetchCodeforcesProfile(fetcher, 'tourist'),
      'UNAVAILABLE',
    );
  });

  it('treats a network failure as UNAVAILABLE', async () => {
    const fetcher = () =>
      Promise.reject(new TypeError('Network connection lost'));

    await expectCodeforcesError(
      fetchCodeforcesProfile(fetcher, 'tourist'),
      'UNAVAILABLE',
    );
  });

  it('treats other API failures as UNKNOWN', async () => {
    const { fetcher } = createFakeFetcher(() =>
      jsonResponse(
        { status: 'FAILED', comment: 'handles: Field should not be empty' },
        400,
      ),
    );

    await expectCodeforcesError(
      fetchCodeforcesProfile(fetcher, 'tourist'),
      'UNKNOWN',
    );
  });

  it('treats an unexpected result shape as UNKNOWN', async () => {
    const { fetcher } = createFakeFetcher(() =>
      jsonResponse({ status: 'OK', result: [] }),
    );

    await expectCodeforcesError(
      fetchCodeforcesProfile(fetcher, 'tourist'),
      'UNKNOWN',
    );
  });
});

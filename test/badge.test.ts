import { env } from 'cloudflare:workers';
import { beforeEach, describe, expect, it } from 'vitest';

import {
  handleBadgeRequest,
  UNAVAILABLE_ALERT_FAILURE_COUNT,
  type BadgeDeps,
  type ErrorContext,
} from '../src/badge';
import {
  FAILURE_BASE_DELAY_MS,
  FAILURE_MAX_DELAY_MS,
  REFRESH_INTERVAL_MS,
} from '../src/profile-store';
import {
  createFakeFetcher,
  expert,
  jsonResponse,
  notFoundResponse,
  okResponse,
  tourist,
  type Route,
} from './helpers';

const START = Date.UTC(2026, 10, 6);

const blockedPage = () =>
  new Response('The page is temporarily blocked by administrator.', {
    status: 200,
    headers: { 'Content-Type': 'text/html' },
  });

const forbiddenProfile = () => new Response(null, { status: 403 });

const createHarness = (initialRoute: Route) => {
  let route = initialRoute;
  let now = START;
  const pending: Promise<unknown>[] = [];
  const reported: { error: unknown; context: ErrorContext }[] = [];
  const fake = createFakeFetcher((url, init) => route(url, init));

  const deps: BadgeDeps = {
    db: env.DB,
    fetcher: fake.fetcher,
    now: () => now,
    waitUntil: (promise) => {
      pending.push(promise);
    },
    reportError: (error, context) => {
      reported.push({ error, context });
    },
  };

  return {
    calls: fake.calls,
    reported,
    setRoute: (next: Route) => {
      route = next;
    },
    advance: (ms: number) => {
      now += ms;
    },
    now: () => now,
    settle: async () => {
      await Promise.all(pending.splice(0));
    },
    request: (query: string, init?: RequestInit) =>
      handleBadgeRequest(
        new Request(`https://cf.leed.at/${query}`, init),
        deps,
      ),
  };
};

interface StoredRow {
  requested_handle: string;
  status: string;
  handle: string | null;
  rating: number | null;
  refresh_at: number;
  failure_count: number;
}

const readRow = (key: string) =>
  env.DB.prepare('SELECT * FROM profiles WHERE requested_handle = ?')
    .bind(key)
    .first<StoredRow>();

describe('handleBadgeRequest', () => {
  beforeEach(async () => {
    await env.DB.prepare('DELETE FROM profiles').run();
  });

  describe('request validation', () => {
    it('requires the id query parameter', async () => {
      const harness = createHarness(() => okResponse(expert));
      const response = await harness.request('');

      expect(response.status).toBe(400);
      expect(await response.text()).toBe(
        '<svg>id query parameter is required</svg>',
      );
      expect(harness.calls).toHaveLength(0);
    });

    it('rejects handles with unsupported characters', async () => {
      const harness = createHarness(() => okResponse(expert));
      const response = await harness.request('?id=bad%3Chandle');

      expect(response.status).toBe(400);
      expect(response.headers.get('Content-Type')).toBe('image/svg+xml');
      expect(harness.calls).toHaveLength(0);
    });

    it('returns 404 for other paths and 405 for other methods', async () => {
      const harness = createHarness(() => okResponse(expert));

      expect((await harness.request('favicon.ico')).status).toBe(404);
      expect(
        (await harness.request('?id=tourist', { method: 'POST' })).status,
      ).toBe(405);
    });
  });

  describe('first request for a handle', () => {
    it('fetches, stores, and renders the badge', async () => {
      const harness = createHarness(() => okResponse(expert));
      const response = await harness.request('?id=Expert_1');

      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toBe('image/svg+xml');
      expect(response.headers.get('Cache-Control')).toBe(
        'public, max-age=3600',
      );
      const body = await response.text();
      expect(body).toContain('Expert_1');
      expect(body).toContain('>Expert</tspan>');
      expect(body).toContain('Candidate Master');
      expect(body).toContain('1950');

      expect(await readRow('expert_1')).toMatchObject({
        status: 'found',
        handle: 'Expert_1',
        rating: 1700,
        refresh_at: START + REFRESH_INTERVAL_MS,
        failure_count: 0,
      });
    });

    it('serves later requests from storage regardless of handle case', async () => {
      const harness = createHarness(() => okResponse(expert));
      await harness.request('?id=Expert_1');
      const response = await harness.request('?id=EXPERT_1');
      await harness.settle();

      expect(response.status).toBe(200);
      expect(harness.calls).toHaveLength(1);
    });

    it('caches a missing profile as 404', async () => {
      const harness = createHarness((url) =>
        url.pathname.startsWith('/profile/')
          ? forbiddenProfile()
          : notFoundResponse('ghost'),
      );

      const first = await harness.request('?id=ghost');
      expect(first.status).toBe(404);
      expect(await first.text()).toBe(
        '<svg>Codeforces profile not found</svg>',
      );

      const second = await harness.request('?id=ghost');
      await harness.settle();
      expect(second.status).toBe(404);
      expect(harness.calls).toHaveLength(2);
      expect(await readRow('ghost')).toMatchObject({ status: 'not_found' });
    });

    it('returns a short-lived 503 without storing when Codeforces is unavailable', async () => {
      const harness = createHarness(blockedPage);
      const response = await harness.request('?id=tourist');

      expect(response.status).toBe(503);
      expect(response.headers.get('Cache-Control')).toBe('public, max-age=60');
      expect(await readRow('tourist')).toBeNull();
      expect(harness.reported).toHaveLength(0);
    });

    it('reports UNKNOWN failures', async () => {
      const harness = createHarness(() =>
        jsonResponse({ status: 'FAILED', comment: 'Unexpected' }, 400),
      );
      const response = await harness.request('?id=tourist');

      expect(response.status).toBe(503);
      expect(harness.reported).toHaveLength(1);
      expect(harness.reported[0]?.context).toEqual({
        handle: 'tourist',
        stage: 'fetch',
      });
    });

    it('returns rating not available for unrated users', async () => {
      const harness = createHarness(() => okResponse({ handle: 'fresh' }));
      const response = await harness.request('?id=fresh');

      expect(response.status).toBe(404);
      expect(await response.text()).toBe('<svg>rating not available</svg>');
    });

    it('stores a renamed handle under the requested handle', async () => {
      const harness = createHarness((url) => {
        if (url.pathname === '/profile/old_name') {
          return new Response(null, {
            status: 302,
            headers: { Location: '/profile/Expert_1' },
          });
        }
        return url.searchParams.get('handles') === 'Expert_1'
          ? okResponse(expert)
          : notFoundResponse('old_name');
      });

      const response = await harness.request('?id=old_name');

      expect(response.status).toBe(200);
      expect(await response.text()).toContain('Expert_1');
      expect(await readRow('old_name')).toMatchObject({
        status: 'found',
        handle: 'Expert_1',
      });
    });
  });

  describe('stale profiles', () => {
    it('serves the cached badge and refreshes in the background', async () => {
      const harness = createHarness(() => okResponse(expert));
      await harness.request('?id=Expert_1');

      harness.advance(REFRESH_INTERVAL_MS);
      harness.setRoute(() => okResponse({ ...expert, rating: 1850 }));
      const response = await harness.request('?id=Expert_1');

      expect(await response.text()).toContain('>1700</tspan>');
      await harness.settle();
      expect(await readRow('expert_1')).toMatchObject({
        rating: 1850,
        refresh_at: harness.now() + REFRESH_INTERVAL_MS,
      });

      const refreshed = await harness.request('?id=Expert_1');
      expect(await refreshed.text()).toContain('>1850</tspan>');
    });

    it('does not refresh before the refresh time', async () => {
      const harness = createHarness(() => okResponse(expert));
      await harness.request('?id=Expert_1');

      harness.advance(REFRESH_INTERVAL_MS - 1);
      await harness.request('?id=Expert_1');
      await harness.settle();

      expect(harness.calls).toHaveLength(1);
    });

    it('lets only one concurrent request refresh a stale profile', async () => {
      const harness = createHarness(() => okResponse(expert));
      await harness.request('?id=Expert_1');

      harness.advance(REFRESH_INTERVAL_MS);
      await Promise.all([
        harness.request('?id=Expert_1'),
        harness.request('?id=Expert_1'),
        harness.request('?id=Expert_1'),
      ]);
      await harness.settle();

      expect(harness.calls).toHaveLength(2);
    });

    it('keeps serving cached data and backs off while Codeforces is unavailable', async () => {
      const harness = createHarness(() => okResponse(expert));
      await harness.request('?id=Expert_1');
      harness.setRoute(blockedPage);

      const expectedDelays = [1, 2, 4, 8, 16, 24, 24].map((factor) =>
        Math.min(FAILURE_BASE_DELAY_MS * factor, FAILURE_MAX_DELAY_MS),
      );
      harness.advance(REFRESH_INTERVAL_MS);

      for (const [index, delay] of expectedDelays.entries()) {
        const response = await harness.request('?id=Expert_1');
        expect(response.status).toBe(200);
        expect(await response.text()).toContain('>1700</tspan>');
        await harness.settle();

        expect(await readRow('expert_1')).toMatchObject({
          status: 'found',
          rating: 1700,
          failure_count: index + 1,
          refresh_at: harness.now() + delay,
        });
        harness.advance(delay);
      }

      expect(harness.reported).toHaveLength(1);
      expect(harness.reported[0]?.context).toEqual({
        handle: 'Expert_1',
        stage: 'refresh',
        failureCount: UNAVAILABLE_ALERT_FAILURE_COUNT,
      });
    });

    it('resets the failure count after a successful refresh', async () => {
      const harness = createHarness(() => okResponse(expert));
      await harness.request('?id=Expert_1');

      harness.setRoute(blockedPage);
      harness.advance(REFRESH_INTERVAL_MS);
      await harness.request('?id=Expert_1');
      await harness.settle();

      harness.setRoute(() => okResponse(expert));
      harness.advance(FAILURE_BASE_DELAY_MS);
      await harness.request('?id=Expert_1');
      await harness.settle();

      expect(await readRow('expert_1')).toMatchObject({ failure_count: 0 });
    });

    it('marks a deleted account as not found', async () => {
      const harness = createHarness(() => okResponse(expert));
      await harness.request('?id=Expert_1');

      harness.setRoute((url) =>
        url.pathname.startsWith('/profile/')
          ? forbiddenProfile()
          : notFoundResponse('Expert_1'),
      );
      harness.advance(REFRESH_INTERVAL_MS);
      await harness.request('?id=Expert_1');
      await harness.settle();

      expect(await readRow('expert_1')).toMatchObject({ status: 'not_found' });
      expect((await harness.request('?id=Expert_1')).status).toBe(404);
    });

    it('rechecks a missing profile after the refresh interval', async () => {
      const harness = createHarness((url) =>
        url.pathname.startsWith('/profile/')
          ? forbiddenProfile()
          : notFoundResponse('ghost'),
      );
      await harness.request('?id=ghost');

      harness.setRoute(() => okResponse({ ...expert, handle: 'ghost' }));
      harness.advance(REFRESH_INTERVAL_MS);
      expect((await harness.request('?id=ghost')).status).toBe(404);
      await harness.settle();

      expect((await harness.request('?id=ghost')).status).toBe(200);
    });

    it('reports UNKNOWN refresh failures immediately', async () => {
      const harness = createHarness(() => okResponse(expert));
      await harness.request('?id=Expert_1');

      harness.setRoute(() =>
        jsonResponse({ status: 'FAILED', comment: 'Unexpected' }, 400),
      );
      harness.advance(REFRESH_INTERVAL_MS);
      await harness.request('?id=Expert_1');
      await harness.settle();

      expect(harness.reported).toHaveLength(1);
      expect(harness.reported[0]?.context).toEqual({
        handle: 'Expert_1',
        stage: 'refresh',
        failureCount: 1,
      });
    });
  });

  describe('badge variants', () => {
    it('renders the mini badge', async () => {
      const harness = createHarness(() => okResponse(expert));
      const body = await (
        await harness.request('?id=Expert_1&mini=true')
      ).text();

      expect(body).toContain('height="20" width="110"');
      expect(body).toContain('stop-color:#480CE8');
      expect(body).toContain('1700');
    });

    it('renders the legendary grandmaster badge', async () => {
      const harness = createHarness(() => okResponse(tourist));
      const body = await (await harness.request('?id=tourist')).text();

      expect(body).toContain(
        '<tspan fill="#000000">t</tspan><tspan fill="#FC1212">ourist</tspan>',
      );
      expect(body).toContain('egendary Grandmaster');
      expect(body).toContain('4009');
    });
  });
});

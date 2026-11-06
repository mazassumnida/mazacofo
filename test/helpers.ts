import type { Fetcher } from '../src/codeforces';

export interface RawProfile {
  handle: string;
  rank?: string;
  rating?: number;
  maxRank?: string;
  maxRating?: number;
}

export const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

export const okResponse = (profile: RawProfile) =>
  jsonResponse({ status: 'OK', result: [profile] });

export const notFoundResponse = (handle: string) =>
  jsonResponse(
    {
      status: 'FAILED',
      comment: `handles: User with handle ${handle} not found`,
    },
    400,
  );

export type Route = (url: URL, init: RequestInit | undefined) => Response;

export interface FakeFetcher {
  fetcher: Fetcher;
  calls: string[];
}

export const createFakeFetcher = (route: Route): FakeFetcher => {
  const calls: string[] = [];
  return {
    calls,
    fetcher: (input, init) => {
      const method = init?.method ?? 'GET';
      calls.push(`${method} ${input}`);
      return Promise.resolve(route(new URL(input), init));
    },
  };
};

export const tourist: RawProfile = {
  handle: 'tourist',
  rank: 'legendary grandmaster',
  rating: 3800,
  maxRank: 'legendary grandmaster',
  maxRating: 4009,
};

export const expert: RawProfile = {
  handle: 'Expert_1',
  rank: 'expert',
  rating: 1700,
  maxRank: 'candidate master',
  maxRating: 1950,
};

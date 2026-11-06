import * as Sentry from '@sentry/cloudflare';

import { handleBadgeRequest, type ErrorContext } from './badge';
import { CodeforcesError } from './codeforces';

const reportError = (error: unknown, context: ErrorContext) => {
  console.error(
    `Badge ${context.stage} error for ${context.handle}`,
    error instanceof Error ? error.stack : error,
  );
  Sentry.withScope((scope) => {
    scope.setTag('stage', context.stage);
    if (error instanceof CodeforcesError) {
      scope.setTag('errorType', error.type);
      if (error.type === 'UNAVAILABLE') {
        scope.setFingerprint(['codeforces-unavailable']);
      }
    }
    scope.setContext('badge', { ...context });
    Sentry.captureException(error);
  });
};

export default Sentry.withSentry<Env>(
  (env) => ({
    dsn: env.SENTRY_DSN,
    environment: env.MAZA_ENV,
    enabled: env.MAZA_ENV === 'production',
    tracesSampleRate: 0.1,
  }),
  {
    fetch(request, env, ctx) {
      return handleBadgeRequest(request, {
        db: env.DB,
        fetcher: (input, init) => fetch(input, init),
        now: () => Date.now(),
        waitUntil: (promise) => {
          ctx.waitUntil(promise);
        },
        reportError,
      });
    },
  } satisfies ExportedHandler<Env>,
);

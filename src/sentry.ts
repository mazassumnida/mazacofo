import * as Sentry from '@sentry/nestjs';
import type { NodeOptions } from '@sentry/nestjs';
import { nodeProfilingIntegration } from '@sentry/profiling-node';
import { config } from 'dotenv';
config({ path: './.env' });

const getOptions = (integrations: any[]): NodeOptions => ({
  environment: process.env.MAZA_ENV,
  dsn: 'https://3c1748b137f2d0ce8a22f9589c0d9477@o4507556578852864.ingest.us.sentry.io/4509700977852416',
  integrations,
  // Tracing
  tracesSampleRate: 1.0, //  Capture 100% of the transactions

  // Set sampling rate for profiling - this is relative to tracesSampleRate
  profilesSampleRate: 1.0,
});

if (process.env.MAZA_ENV === 'production') {
  Sentry.init(getOptions([nodeProfilingIntegration()]));
}

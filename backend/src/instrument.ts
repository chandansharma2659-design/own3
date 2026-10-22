
import "dotenv/config";
import * as Sentry from "@sentry/node"
import { nodeProfilingIntegration } from"@sentry/profiling-node";

const dsn = process.env.SENTRY_DSN;


if(dsn){
  Sentry.init({
    dsn,
  integrations: [
    // Add our Profiling integration
    nodeProfilingIntegration(),
  ],
  environment: process.env.NODE_ENV ??  "development",
  enabled:true,
  tracesSampleRate: 1.0,
  profileSessionSampleRate: 1.0,
  profileLifecycle: "trace",
  
});
}
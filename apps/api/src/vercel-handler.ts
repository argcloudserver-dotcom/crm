/**
 * Serverless entry point for Vercel.
 *
 * Unlike `index.ts` (which calls `app.listen` for a long-running Node server),
 * the Vercel Node runtime invokes the default export as the request handler.
 * An Express app IS a `(req, res)` handler, so we simply re-export it.
 *
 * `./app` validates the environment at import time (see lib/env.ts); all
 * required variables are provided by the Vercel project configuration.
 */
import app from "./app";

export default app;

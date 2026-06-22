/**
 * Vercel serverless function for the CRM API.
 *
 * This optional catch-all (`[[...path]]`) matches `/api` and every `/api/*`
 * subpath and forwards the full, original request URL to the Express app, so
 * the app's own `/api/...` routing works unchanged.
 *
 * The handler itself is the fully bundled Express app produced by
 * `apps/api/build.serverless.mjs` during the build step.
 */
export { default } from "../apps/api/dist-vercel/vercel-handler.mjs";

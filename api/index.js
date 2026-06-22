// Vercel serverless function that wraps the bundled Express app.
// The esbuild bundler outputs to ../../api (this directory) and names the
// main bundle vercel-handler.mjs. This function re-exports it so Vercel
// auto-detects it as a serverless function and routes /api/* requests to it.

import app from './vercel-handler.mjs';

export default app;

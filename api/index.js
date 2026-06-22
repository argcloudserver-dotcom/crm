// Vercel serverless function that wraps the bundled Express app.
// The bundled handler is exported as ESM and loaded dynamically at startup.

let handlerPromise = null;

function initializeHandler() {
  if (!handlerPromise) {
    handlerPromise = import('./vercel-handler.mjs').then(m => m.default);
  }
  return handlerPromise;
}

module.exports = async (req, res) => {
  try {
    const handler = await initializeHandler();
    handler(req, res);
  } catch (error) {
    console.error('[API] Handler error:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Internal Server Error' });
    }
  }
};

// Vercel serverless handler that wraps the bundled Express app.
// Dynamically imports the ESM bundle and delegates all requests to it.

let appCache = null;

module.exports = async (req, res) => {
  try {
    if (!appCache) {
      const { default: app } = await import('./vercel-handler.mjs');
      appCache = app;
    }
    
    // Pass the request/response to the Express app
    appCache(req, res);
  } catch (error) {
    console.error('[API] Error:', error);
    res.status(500).json({ error: 'Internal Server Error', message: error.message });
  }
};

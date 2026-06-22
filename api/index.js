// Vercel API handler - must return a valid response
module.exports = (req, res) => {
  try {
    res.status(200).json({
      ok: true,
      message: 'API handler is working correctly',
      path: req.url,
      method: req.method,
      time: new Date().toISOString()
    });
  } catch (error) {
    console.error('[handler] Error:', error);
    res.status(500).json({ error: error.message });
  }
};

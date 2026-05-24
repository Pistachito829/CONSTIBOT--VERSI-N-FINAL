let handler;
let loadError = null;
let serverExports = null;

try {
  serverExports = require('../dist/server.cjs');
  handler = serverExports.default || serverExports.handler || (typeof serverExports === 'function' ? serverExports : null);
} catch (err) {
  loadError = err;
}

module.exports = async function(req, res) {
  if (loadError) {
    return res.status(500).json({ 
      error: "Server initialization crashed during require.", 
      details: loadError.message,
      stack: loadError.stack
    });
  }

  if (typeof handler === 'function') {
    return handler(req, res);
  } else if (handler && typeof handler.default === 'function') {
    return handler.default(req, res);
  } else {
    return res.status(500).json({ 
      error: "Server initialization failed: handler not found.", 
      keys: serverExports ? Object.keys(serverExports) : [],
      typeofExports: typeof serverExports
    });
  }
};

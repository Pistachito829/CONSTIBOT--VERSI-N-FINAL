const handler = require('../dist/server.cjs').default;

module.exports = async function(req, res) {
  if (typeof handler === 'function') {
    return handler(req, res);
  } else {
    res.status(500).send("Server initialization failed.");
  }
};

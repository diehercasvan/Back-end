// src/middlewares/notFound.js
const { fail } = require('../utils/response');

function notFound(req, res) {
  return fail(res, `Ruta no encontrada: ${req.method} ${req.originalUrl}`, 404);
}

module.exports = notFound;
// src/middlewares/auth.middleware.js
const { verifyToken } = require('../utils/jwt');
const { fail } = require('../utils/response');

function authRequired(req, res, next) {
  const header = req.headers.authorization || '';
  if (!header.startsWith('Bearer ')) {
    return fail(res, 'Token no proporcionado', 401);
  }
  const token = header.slice(7).trim();
  if (!token) return fail(res, 'Token vacío', 401);

  try {
    const payload = verifyToken(token);
    req.auth = { user_id: payload.user_id, user_role_id: payload.user_role_id };
    return next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') return fail(res, 'Token expirado', 401);
    return fail(res, 'Token inválido', 401);
  }
}

module.exports = { authRequired };
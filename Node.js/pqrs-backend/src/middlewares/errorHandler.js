// src/middlewares/errorHandler.js
const { ZodError } = require('zod');
const { fail } = require('../utils/response');
const env = require('../config/env');

function errorHandler(err, req, res, _next) {
  // Zod
  if (err instanceof ZodError) {
    return fail(res, 'Error de validación', 422, err.flatten().fieldErrors);
  }
  // Sequelize
  if (err.name === 'SequelizeValidationError') {
    return fail(res, 'Error de validación en base de datos', 422,
      err.errors.map((e) => ({ field: e.path, message: e.message })));
  }
  if (err.name === 'SequelizeUniqueConstraintError') {
    return fail(res, 'Valor duplicado', 409,
      err.errors.map((e) => ({ field: e.path, message: e.message })));
  }
  if (err.name === 'SequelizeForeignKeyConstraintError') {
    return fail(res, 'Referencia inválida (FK)', 409);
  }
  // JWT
  if (err.name === 'JsonWebTokenError') return fail(res, 'Token inválido', 401);
  if (err.name === 'TokenExpiredError') return fail(res, 'Token expirado', 401);

  // Errores que lanzamos con status explícito
  const status = err.status || err.statusCode || 500;
  const message =
    env.NODE_ENV === 'production' && status === 500
      ? 'Error interno del servidor'
      : err.message || 'Error interno del servidor';

  if (status === 500) console.error('❌ [500]', err);

  return fail(res, message, status, err.errors || null);
}

module.exports = errorHandler;
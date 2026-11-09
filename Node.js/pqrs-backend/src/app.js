// src/app.js
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const env = require('./config/env');
const sequelize = require('./config/database');

const app = express();

// ===== Middlewares globales =====
app.use(helmet());
app.use(cors());
app.use(morgan(env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

// ===== Ruta raíz informativa =====
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'PQRS API',
    version: '1.0.0',
    endpoints: {
      health: `${env.API_PREFIX}/health`,
    },
  });
});

// ===== Health check (incluye estado de la BD) =====
app.get(`${env.API_PREFIX}/health`, async (req, res) => {
  let dbStatus = 'desconectada';
  try {
    await sequelize.authenticate();
    dbStatus = 'conectada';
  } catch (e) {
    dbStatus = `error: ${e.message}`;
  }
  res.json({
    success: true,
    message: 'API operativa',
    data: {
      uptime: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
      environment: env.NODE_ENV,
      database: dbStatus,
    },
  });
});

// ===== 404 (inline por ahora; se extrae en 1.6) =====
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Ruta no encontrada: ${req.method} ${req.originalUrl}`,
  });
});

// ===== Error handler (inline por ahora; se extrae en 1.6) =====
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  const status = err.status || err.statusCode || 500;
  const message =
    env.NODE_ENV === 'production' && status === 500
      ? 'Error interno del servidor'
      : err.message || 'Error interno del servidor';
  if (status === 500) console.error('❌ [500]', err);
  res.status(status).json({ success: false, message });
});

module.exports = app;
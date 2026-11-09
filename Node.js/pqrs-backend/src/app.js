// src/app.js
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const swaggerUi = require('swagger-ui-express'); 
const env = require('./config/env');
const sequelize = require('./config/database');
const swaggerSpec = require('./config/swagger');
const apiRoutes = require('./routes');
const notFound = require('./middlewares/notFound');
const errorHandler = require('./middlewares/errorHandler');

const app = express();

// Middlewares globales
app.use(helmet());
app.use(cors());
app.use(morgan(env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

// Swagger UI
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.get('/api-docs.json', (req, res) => res.json(swaggerSpec));

// Raíz
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'PQRS API',
    version: '1.0.0',
    endpoints: {
      health: `${env.API_PREFIX}/health`,
      auth: `${env.API_PREFIX}/auth`,
      docs: '/api-docs',
    },
  });
});

// Health global
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

// Rutas API
app.use(env.API_PREFIX, apiRoutes);

// 404 y errores
app.use(notFound);
app.use(errorHandler);

module.exports = app;
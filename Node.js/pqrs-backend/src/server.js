// src/server.js
const app = require('./app');
const sequelize = require('./config/database');
const env = require('./config/env');

async function start() {
  try {
    await sequelize.authenticate();
    console.log('✅ Conexión MySQL establecida');

    const server = app.listen(env.PORT, () => {
      console.log(`🚀 Servidor en http://localhost:${env.PORT}`);
      console.log(`🔗 Health:  http://localhost:${env.PORT}${env.API_PREFIX}/health`);
      console.log(`🌎 Entorno: ${env.NODE_ENV}`);
    });

    const shutdown = async (signal) => {
      console.log(`\n⚠️  ${signal} recibido, cerrando...`);
      // Fuerza cerrar conexiones keep-alive (navegador/Postman)
      if (typeof server.closeAllConnections === 'function') {
        server.closeAllConnections();
      }
      server.close(async () => {
        await sequelize.close();
        console.log('✅ Servidor y BD cerrados');
        process.exit(0);
      });
      setTimeout(() => process.exit(1), 10000).unref();
    };
    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
  } catch (err) {
    console.error('❌ Error al iniciar:', err.message);
    process.exit(1);
  }
}

start();
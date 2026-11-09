// src/server.js
const app = require('./app');
const sequelize = require('./config/database');
const env = require('./config/env');

async function start() {
  try {
    // 1. Probar conexión a la BD
    await sequelize.authenticate();
    console.log('✅ Conexión MySQL establecida');

    // 2. Levantar servidor HTTP
    const server = app.listen(env.PORT, () => {
      console.log(`🚀 Servidor en http://localhost:${env.PORT}`);
      console.log(`🔗 Health:  http://localhost:${env.PORT}${env.API_PREFIX}/health`);
      console.log(`🌎 Entorno: ${env.NODE_ENV}`);
    });

    // 3. Cierre limpio
    const shutdown = async (signal) => {
      console.log(`\n⚠️  ${signal} recibido, cerrando...`);
      server.close(async () => {
        await sequelize.close();
        console.log('✅ Servidor y BD cerrados');
        process.exit(0);
      });
      // Fuerza cierre si algo se cuelga
      setTimeout(() => process.exit(1), 10000);
    };
    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
  } catch (err) {
    console.error('❌ Error al iniciar:', err.message);
    process.exit(1);
  }
}

start();
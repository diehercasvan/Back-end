const app = require('./src/app');
// Importar la inicialización correspondiente según el momento:
 const { inicializarDB } = require('./src/config/jsonDb');
 const db = require('./src/config/sqliteDb'); // Solo con require ya crea la tabla
const { initDB } = require('./src/config/mysqlDb');

const PORT = process.env.PORT || 3000;

const start = async () => {
  try {
    await inicializarDB(); // Crea data/productos.json si no existe
    app.listen(PORT, () => console.log(`🚀 Servidor en http://localhost:${PORT}`));
  } catch (error) {
    console.error('❌ Error al iniciar:', error.message);
    process.exit(1);
  }
};

start();
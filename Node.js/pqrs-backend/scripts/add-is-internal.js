// scripts/add-is-internal.js
// Agrega la columna is_internal a pqrs_response (idempotente)
require('dotenv').config();
const sequelize = require('../src/config/database');

async function run() {
  const qi = sequelize.getQueryInterface();
  try {
    await sequelize.authenticate();
    console.log('✅ Conectado a MySQL');

    const desc = await qi.describeTable('pqrs_response');
    if (desc.is_internal) {
      console.log('ℹ️  La columna is_internal ya existe. Nada que hacer.');
      return;
    }

    await qi.addColumn('pqrs_response', 'is_internal', {
      type: sequelize.Sequelize.TINYINT(1),
      allowNull: false,
      defaultValue: 0,
      after: 'message',
      comment: '0 = respuesta visible al ciudadano, 1 = nota interna',
    });

    console.log('✅ Columna is_internal agregada a pqrs_response');
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exitCode = 1;
  } finally {
    await sequelize.close();
  }
}

run();
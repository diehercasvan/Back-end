// scripts/fix-seed.js
// Regenera hashes de contraseña de usuarios de desarrollo.
// Idempotente: se puede ejecutar varias veces.
require('dotenv').config();
const bcrypt = require('bcryptjs');
const sequelize = require('../src/config/database');

const DEV_PASSWORD = 'admin123';
const TARGETS = [
  { id: 1, username: 'admin' },
  { id: 2, username: 'juan' },
];

async function run() {
  try {
    await sequelize.authenticate();
    console.log('✅ Conectado a MySQL');

    const hash = await bcrypt.hash(DEV_PASSWORD, 10);
    console.log(`🔑 Hash generado para "${DEV_PASSWORD}" (bcrypt, 10 rondas)`);

    for (const t of TARGETS) {
      const [result] = await sequelize.query(
        'UPDATE user SET password_hash = ? WHERE id = ? AND username = ?',
        { replacements: [hash, t.id, t.username] }
      );
      const affected = result.affectedRows ?? result;
      if (affected > 0) {
        console.log(`✅ ${t.username} (id=${t.id}) actualizado`);
      } else {
        console.log(`⚠️  ${t.username} (id=${t.id}) no encontrado, saltado`);
      }
    }

    console.log(`\n🎉 Seed corregido. Contraseña de desarrollo: "${DEV_PASSWORD}"`);
    console.log('   (cambiar en producción)');
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exitCode = 1;
  } finally {
    await sequelize.close();
  }
}

run();
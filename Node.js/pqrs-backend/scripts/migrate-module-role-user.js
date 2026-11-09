// scripts/migrate-module-role-user.js
// Migra module_role_user: (user_id, role_id) → user_role_id
// Idempotente + transacción con rollback
require('dotenv').config();
const sequelize = require('../src/config/database');

async function run() {
  const qi = sequelize.getQueryInterface();
  const t = await sequelize.transaction();

  try {
    await sequelize.authenticate();
    console.log('✅ Conectado a MySQL');

    const desc = await qi.describeTable('module_role_user');

    // --- Caso 1: ya migrada ---
    if (desc.user_role_id && !desc.user_id && !desc.role_id) {
      console.log('ℹ️  module_role_user ya está migrada. Nada que hacer.');
      await t.rollback();
      return;
    }

    // --- Caso 2: migración parcial (user_role_id existe pero quedan user_id/role_id) ---
    // Se repara poblando lo que falte
    if (!desc.user_role_id) {
      console.log('▶️  Agregando columna user_role_id...');
      await qi.addColumn(
        'module_role_user',
        'user_role_id',
        { type: sequelize.Sequelize.INTEGER, allowNull: true },
        { transaction: t }
      );
    }

    console.log('▶️  Poblando user_role_id desde user_role (user_id, role_id)...');
    const [updateResult] = await sequelize.query(
      `UPDATE module_role_user mru
         JOIN user_role ur
           ON ur.user_id = mru.user_id AND ur.role_id = mru.role_id
         SET mru.user_role_id = ur.id
       WHERE mru.user_role_id IS NULL`,
      { transaction: t }
    );
    console.log(`   Filas actualizadas: ${updateResult}`);

    // Verificar que no quede ninguna sin mapear
    const [nullRows] = await sequelize.query(
      `SELECT COUNT(*) AS c FROM module_role_user WHERE user_role_id IS NULL`,
      { transaction: t }
    );
    if (Number(nullRows[0].c) > 0) {
      throw new Error(
        `Hay ${nullRows[0].c} filas sin user_role_id. Migración abortada para no perder datos.`
      );
    }
    console.log('✅ Todas las filas tienen user_role_id');

    // --- Eliminar FKs y columnas viejas ---
    console.log('▶️  Eliminando FKs y columnas role_id / user_id...');

    // Obtener FKs existentes para borrarlas correctamente
    const [fks] = await sequelize.query(
      `SELECT CONSTRAINT_NAME
         FROM information_schema.KEY_COLUMN_USAGE
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'module_role_user'
          AND COLUMN_NAME IN ('role_id','user_id')
          AND REFERENCED_TABLE_NAME IS NOT NULL`,
      { transaction: t }
    );
    for (const row of fks) {
      await sequelize.query(
        `ALTER TABLE module_role_user DROP FOREIGN KEY \`${row.CONSTRAINT_NAME}\``,
        { transaction: t }
      );
    }

    // Índice UNIQUE antiguo (uk que incluía role_id/user_id)
    const [indexes] = await sequelize.query(
      `SHOW INDEX FROM module_role_user WHERE Column_name IN ('role_id','user_id')`,
      { transaction: t }
    );
    const seenIndexes = new Set();
    for (const row of indexes) {
      const name = row.Key_name;
      if (name === 'PRIMARY' || seenIndexes.has(name)) continue;
      seenIndexes.add(name);
      await sequelize.query(
        `ALTER TABLE module_role_user DROP INDEX \`${name}\``,
        { transaction: t }
      );
    }

    await qi.removeColumn('module_role_user', 'role_id', { transaction: t });
    await qi.removeColumn('module_role_user', 'user_id', { transaction: t });

    // --- Hacer user_role_id NOT NULL + FK + UNIQUE ---
    await sequelize.query(
      `ALTER TABLE module_role_user
         MODIFY user_role_id INT NOT NULL,
         ADD CONSTRAINT fk_mru_user_role FOREIGN KEY (user_role_id)
            REFERENCES user_role(id) ON DELETE CASCADE ON UPDATE CASCADE,
         ADD UNIQUE KEY uk_mru (user_role_id, module_id, permission_id)`,
      { transaction: t }
    );

    await t.commit();
    console.log('🎉 Migración completada correctamente');
  } catch (err) {
    console.error('❌ Error:', err.message);
    await t.rollback();
    console.error('↩️  Rollback aplicado (la BD quedó como estaba)');
    process.exitCode = 1;
  } finally {
    await sequelize.close();
  }
}

run();
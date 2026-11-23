// scripts/seed-manager-role.js
// Crea el rol "manager" con permisos básicos y un usuario "carlos" asignado a él.
// Idempotente.
require('dotenv').config();
const {
  sequelize, Role, User, UserRole, UserStatus, Profile, DocumentType,
  Module, Permission, RoleModulePermission,
} = require('../src/models');
const { hashPassword } = require('../src/utils/password');

async function run() {
  try {
    // 1. Crear rol manager
    const [managerRole] = await Role.findOrCreate({
      where: { name: 'manager' },
      defaults: { description: 'Gestor de PQRS', is_active: 1 },
    });
    console.log(`✅ Rol manager (id=${managerRole.id})`);

    // 2. Asignar permisos al manager: Dashboard+view, PQRS+view, PQRS+edit
    const pairs = [
      ['Dashboard', 'view'],
      ['PQRS', 'view'],
      ['PQRS', 'edit'],
    ];
    for (const [mName, pName] of pairs) {
      const mod = await Module.findOne({ where: { name: mName } });
      const perm = await Permission.findOne({ where: { name: pName } });
      if (mod && perm) {
        await RoleModulePermission.findOrCreate({
          where: { role_id: managerRole.id, module_id: mod.id, permission_id: perm.id },
          defaults: {},
        });
        console.log(`   + ${mName} / ${pName}`);
      }
    }

    // 3. Crear usuario carlos (si no existe)
    const [carlos] = await User.findOrCreate({
      where: { username: 'carlos' },
      defaults: {
        email: 'carlos@pqrs.com',
        password_hash: await hashPassword('carlos123'),
        status_id: 1,
      },
    });
    console.log(`✅ Usuario carlos (id=${carlos.id})`);

    // 4. Crear perfil de carlos
    const docCC = await DocumentType.findOne({ where: { name: 'CC' } });
    await Profile.findOrCreate({
      where: { user_id: carlos.id },
      defaults: {
        first_name: 'Carlos', last_name: 'Gestor',
        document_type_id: docCC.id, document_number: '11111111',
        phone: '3001112233', address: 'Oficina de gestión',
      },
    });

    // 5. Asignar rol manager a carlos
    const [ur, created] = await UserRole.findOrCreate({
      where: { user_id: carlos.id, role_id: managerRole.id },
      defaults: { status_id: 1 },
    });
    if (!created && ur.status_id !== 1) {
      await ur.update({ status_id: 1 });
    }
    console.log(`✅ Rol manager asignado a carlos (user_role_id=${ur.id})`);

    console.log('\n🎉 Manager listo. Credenciales: carlos / carlos123');
  } catch (err) {
    console.error('❌', err.message);
    process.exitCode = 1;
  } finally {
    await sequelize.close();
  }
}
run();
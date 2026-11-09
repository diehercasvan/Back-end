// scripts/_check-1.5.js
const {
  sequelize,
  UserStatus, DocumentType, Role, Permission, Module,
  PqrsType, PqrsStatus, User, UserRole, ModuleRoleUser,
  Profile, Pqrs, PqrsResponse,
} = require('../src/models');

async function run() {
  try {
    await sequelize.authenticate();
    console.log('✅ Conectado\n');

    const checks = [
      ['user_status',    UserStatus],
      ['document_type',  DocumentType],
      ['role',           Role],
      ['permission',     Permission],
      ['module',         Module],
      ['pqrs_type',      PqrsType],
      ['pqrs_status',    PqrsStatus],
      ['user',           User],
      ['user_role',      UserRole],
      ['module_role_user', ModuleRoleUser],
      ['profile',        Profile],
      ['pqrs',           Pqrs],
      ['pqrs_response',  PqrsResponse],
    ];

    console.log('===== Conteo por tabla (modelos leyendo tablas reales) =====');
    for (const [name, Model] of checks) {
      const count = await Model.count();
      console.log(`  ${name.padEnd(20)} ${count} filas`);
    }

    console.log('\n===== Prueba de asociaciones (1 fila de admin con su user_role) =====');
    const admin = await User.findOne({
      where: { username: 'admin' },
      include: [{
        model: UserRole,
        as: 'user_roles',
        include: [
          { model: Role, as: 'role', attributes: ['id', 'name'] },
          { model: UserStatus, as: 'status', attributes: ['id', 'name'] },
        ],
      }],
      attributes: ['id', 'username', 'email'],
    });
    console.log(JSON.stringify(admin, null, 2));

    console.log('\n===== Prueba de ModuleRoleUser (con user_role_id) =====');
    const permisos = await ModuleRoleUser.findAll({
      include: [
        { model: UserRole, as: 'user_role', attributes: ['id', 'user_id', 'role_id'] },
        { model: Module, as: 'module', attributes: ['id', 'name'] },
        { model: Permission, as: 'permission', attributes: ['id', 'name'] },
      ],
      limit: 3,
    });
    console.log(JSON.stringify(permisos, null, 2));

    console.log('\n🎉 Todos los modelos leen las tablas reales sin errores');
  } catch (e) {
    console.error('❌', e.message);
    if (e.original) console.error('   SQL:', e.original.sql);
    process.exitCode = 1;
  } finally {
    await sequelize.close();
  }
}
run();
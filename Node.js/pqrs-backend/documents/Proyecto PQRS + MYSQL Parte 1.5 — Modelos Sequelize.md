# **3 formas** de verificar la BD:

---

## Opción A — Usar la ruta completa de `mysql.exe` (más rápida)

XAMPP trae `mysql.exe` en `C:\xampp\mysql\bin\`. Ejecuta:

```powershell
C:\xampp\mysql\bin\mysql.exe -u root pqrs_system -e "DESCRIBE pqrs_response;"
C:\xampp\mysql\bin\mysql.exe -u root pqrs_system -e "DESCRIBE module_role_user;"
C:\xampp\mysql\bin\mysql.exe -u root pqrs_system -e "SELECT COUNT(*) AS total FROM module_role_user;"
C:\xampp\mysql\bin\mysql.exe -u root pqrs_system -e "SELECT DISTINCT user_role_id FROM module_role_user;"
C:\xampp\mysql\bin\mysql.exe -u root pqrs_system -e "SHOW CREATE TABLE module_role_user\G"
```

> Si tienes contraseña para `root`, agrega `-p` y te la pedirá:
> `C:\xampp\mysql\bin\mysql.exe -u root -p pqrs_system -e "..."`

---

## Opción B — Verificar con Node (usa la conexión que ya funciona) ⭐ Recomendada

Esta es la más confiable porque usa **el mismo Sequelize que usará el proyecto**. Crea un archivo temporal `scripts/_check-1.5.js`:

```javascript
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
      ['user_status',      UserStatus],
      ['document_type',    DocumentType],
      ['role',             Role],
      ['permission',       Permission],
      ['module',           Module],
      ['pqrs_type',        PqrsType],
      ['pqrs_status',      PqrsStatus],
      ['user',             User],
      ['user_role',        UserRole],
      ['module_role_user', ModuleRoleUser],
      ['profile',          Profile],
      ['pqrs',             Pqrs],
      ['pqrs_response',    PqrsResponse],
    ];

    console.log('===== Conteo por tabla =====');
    for (const [name, Model] of checks) {
      const count = await Model.count();
      console.log(`  ${name.padEnd(20)} ${count} filas`);
    }

    console.log('\n===== Admin con user_roles → role → status =====');
    const admin = await User.findOne({
      where: { username: 'admin' },
      include: [{
        model: UserRole, as: 'user_roles',
        include: [
          { model: Role, as: 'role', attributes: ['id', 'name'] },
          { model: UserStatus, as: 'status', attributes: ['id', 'name'] },
        ],
      }],
      attributes: ['id', 'username', 'email'],
    });
    console.log(JSON.stringify(admin, null, 2));

    console.log('\n===== ModuleRoleUser (con user_role_id) =====');
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
```

Ejecuta:

```powershell
node scripts/_check-1.5.js
```

> Cuando termines, puedes borrar `scripts/_check-1.5.js`.

---

## Opción C — phpMyAdmin (visual)

1. Abre `http://localhost/phpmyadmin`
2. Selecciona base `pqrs_system`
3. Pestaña **SQL** → ejecuta:

```sql
DESCRIBE pqrs_response;
DESCRIBE module_role_user;
SELECT COUNT(*) AS total FROM module_role_user;
SELECT DISTINCT user_role_id FROM module_role_user;
SHOW CREATE TABLE module_role_user;
```

---

## 🚦 Qué busco en las salidas

| # | Consulta                      | Esperado                                                                                                                    |
| - | ----------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| 1 | `DESCRIBE pqrs_response`    | fila `is_internal \| tinyint(1) \| NO \| \| 0 \| ...`                                                                          |
| 2 | `DESCRIBE module_role_user` | columnas `id, user_role_id, module_id, permission_id, created_at, updated_at` — **sin** `user_id` ni `role_id` |
| 3 | `COUNT(*)`                  | `21`                                                                                                                      |
| 4 | `DISTINCT user_role_id`     | `1`                                                                                                                       |
| 5 | FKs/UNIQUE                    | `fk_mru_user_role` → `user_role(id)`, y `uk_mru (user_role_id, module_id, permission_id)`                            |

# ✅ Paso 1.4 verificado al 100%

Revisé las 5 salidas y todo está correcto:

| Verificación                       | Resultado                                                                                                                      |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| **`pqrs_response`**         | ✅ `is_internal \| tinyint(1) \| NO \| \| 0 \|` — columna creada, default `0`, `NOT NULL`                                    |
| **`module_role_user`**      | ✅ columnas `id, module_id, permission_id, created_at, updated_at, user_role_id` — **sin** `user_id` ni `role_id` |
| **Conteo**                    | ✅ `total = 21` — no se perdió ninguna fila                                                                                |
| **DISTINCT `user_role_id`** | ✅ solo `1` — todos apuntan al `user_role` del admin                                                                      |
| **FK + UNIQUE**               | ✅ `fk_mru_user_role → user_role(id)` con `CASCADE`, y `uk_mru (user_role_id, module_id, permission_id)`                |

**La migración quedó perfecta. 1.4 cerrado.**

---

## 📦 Paso 1.5 — Modelos Sequelize

Ahora reflejamos las tablas en código. **No vamos a modificar la BD** — solo definimos los modelos y verificamos que **leen** las tablas reales.

### 1.5.1 — Estructura a crear en `src/models/`

Vamos a crear **13 archivos de modelos + 1 índice**:

```
src/models/
├── index.js              ← asociaciones + export
├── User.js
├── UserStatus.js
├── Role.js
├── UserRole.js
├── Permission.js
├── Module.js
├── ModuleRoleUser.js    ← con user_role_id
├── Profile.js
├── DocumentType.js
├── Pqrs.js
├── PqrsType.js
├── PqrsStatus.js
└── PqrsResponse.js      ← con is_internal
```

---

### 1.5.2 — Convenciones que seguimos

| Convención               | Valor                                                                         | Por qué                                                                          |
| ------------------------- | ----------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| `tableName`             | Exacto al SQL (`'user'`, `'pqrs_response'`, etc.)                         | Ya tienes `freezeTableName: true` en `database.js`                            |
| `timestamps`            | `true` (excepto `pqrs_response` que solo tiene `created_at`)            | Mapea `created_at`/`updated_at`                                               |
| `underscored`           | Heredado de `database.js`                                                   | `user_id`, `module_id`, etc.                                                  |
| PKs                       | `id` autoincrement                                                          | Ya es así en tu BD                                                               |
| FK                        | Columna + `references` en el modelo, **asociaciones** en `index.js` | Separación limpia: el modelo define el campo, `index.js` define las relaciones |
| `onDelete`/`onUpdate` | Réplica exacta de tu `SHOW CREATE TABLE`                                   | Ej. `user_role` → `CASCADE`; `pqrs.assigned_to` → `SET NULL`            |

---

### 1.5.3 — Crear los 13 modelos

Crea **cada archivo** en `src/models/` con el contenido indicado. Los pongo en orden de dependencia (primero los catálogos sin FKs, luego los que dependen de otros).

#### `src/models/UserStatus.js`

```javascript
module.exports = (sequelize, DataTypes) => {
  const UserStatus = sequelize.define('UserStatus', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    name: { type: DataTypes.STRING(50), allowNull: false, unique: true },
    description: { type: DataTypes.STRING(255) },
  }, {
    tableName: 'user_status',
  });
  return UserStatus;
};
```

#### `src/models/DocumentType.js`

```javascript
module.exports = (sequelize, DataTypes) => {
  const DocumentType = sequelize.define('DocumentType', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    name: { type: DataTypes.STRING(50), allowNull: false, unique: true },
    description: { type: DataTypes.STRING(255) },
  }, {
    tableName: 'document_type',
  });
  return DocumentType;
};
```

#### `src/models/Role.js`

```javascript
module.exports = (sequelize, DataTypes) => {
  const Role = sequelize.define('Role', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    name: { type: DataTypes.STRING(50), allowNull: false, unique: true },
    description: { type: DataTypes.STRING(255) },
    is_active: { type: DataTypes.TINYINT(1), defaultValue: 1 },
  }, {
    tableName: 'role',
  });
  return Role;
};
```

#### `src/models/Permission.js`

```javascript
module.exports = (sequelize, DataTypes) => {
  const Permission = sequelize.define('Permission', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    name: { type: DataTypes.STRING(50), allowNull: false, unique: true },
    description: { type: DataTypes.STRING(255) },
  }, {
    tableName: 'permission',
  });
  return Permission;
};
```

#### `src/models/Module.js`

```javascript
module.exports = (sequelize, DataTypes) => {
  const Module = sequelize.define('Module', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    name: { type: DataTypes.STRING(50), allowNull: false, unique: true },
    route: { type: DataTypes.STRING(100), allowNull: false, unique: true },
    icon: { type: DataTypes.STRING(50) },
    description: { type: DataTypes.STRING(255) },
    is_active: { type: DataTypes.TINYINT(1), defaultValue: 1 },
  }, {
    tableName: 'module',
  });
  return Module;
};
```

#### `src/models/PqrsType.js`

```javascript
module.exports = (sequelize, DataTypes) => {
  const PqrsType = sequelize.define('PqrsType', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    name: { type: DataTypes.STRING(50), allowNull: false, unique: true },
    description: { type: DataTypes.STRING(255) },
  }, {
    tableName: 'pqrs_type',
  });
  return PqrsType;
};
```

#### `src/models/PqrsStatus.js`

```javascript
module.exports = (sequelize, DataTypes) => {
  const PqrsStatus = sequelize.define('PqrsStatus', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    name: { type: DataTypes.STRING(50), allowNull: false, unique: true },
    description: { type: DataTypes.STRING(255) },
    color: { type: DataTypes.STRING(20) },
  }, {
    tableName: 'pqrs_status',
  });
  return PqrsStatus;
};
```

#### `src/models/User.js`

```javascript
module.exports = (sequelize, DataTypes) => {
  const User = sequelize.define('User', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    username: { type: DataTypes.STRING(50), allowNull: false, unique: true },
    email: { type: DataTypes.STRING(100), unique: true },
    password_hash: { type: DataTypes.STRING(255), allowNull: false },
    status_id: { type: DataTypes.INTEGER, allowNull: false },
    last_login: { type: DataTypes.DATE, allowNull: true },
  }, {
    tableName: 'user',
  });
  return User;
};
```

#### `src/models/UserRole.js`

```javascript
module.exports = (sequelize, DataTypes) => {
  const UserRole = sequelize.define('UserRole', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    user_id: { type: DataTypes.INTEGER, allowNull: false },
    role_id: { type: DataTypes.INTEGER, allowNull: false },
    status_id: { type: DataTypes.INTEGER, allowNull: false },
  }, {
    tableName: 'user_role',
    indexes: [{ unique: true, fields: ['user_id', 'role_id'] }],
  });
  return UserRole;
};
```

#### `src/models/ModuleRoleUser.js`

```javascript
module.exports = (sequelize, DataTypes) => {
  const ModuleRoleUser = sequelize.define('ModuleRoleUser', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    user_role_id: { type: DataTypes.INTEGER, allowNull: false },
    module_id: { type: DataTypes.INTEGER, allowNull: false },
    permission_id: { type: DataTypes.INTEGER, allowNull: false },
  }, {
    tableName: 'module_role_user',
    indexes: [{ unique: true, fields: ['user_role_id', 'module_id', 'permission_id'] }],
  });
  return ModuleRoleUser;
};
```

#### `src/models/Profile.js`

```javascript
module.exports = (sequelize, DataTypes) => {
  const Profile = sequelize.define('Profile', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    user_id: { type: DataTypes.INTEGER, allowNull: false, unique: true },
    first_name: { type: DataTypes.STRING(50), allowNull: false },
    last_name: { type: DataTypes.STRING(50), allowNull: false },
    address: { type: DataTypes.STRING(255) },
    phone: { type: DataTypes.STRING(20) },
    document_type_id: { type: DataTypes.INTEGER, allowNull: false },
    document_number: { type: DataTypes.STRING(50), allowNull: false, unique: true },
    photo_url: { type: DataTypes.STRING(255) },
    birth_date: { type: DataTypes.DATEONLY },
  }, {
    tableName: 'profile',
  });
  return Profile;
};
```

#### `src/models/Pqrs.js`

```javascript
module.exports = (sequelize, DataTypes) => {
  const Pqrs = sequelize.define('Pqrs', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    tracking_number: { type: DataTypes.STRING(30), allowNull: false, unique: true },
    user_id: { type: DataTypes.INTEGER, allowNull: false },
    pqrs_type_id: { type: DataTypes.INTEGER, allowNull: false },
    pqrs_status_id: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
    assigned_to: { type: DataTypes.INTEGER, allowNull: true },
    subject: { type: DataTypes.STRING(150), allowNull: false },
    description: { type: DataTypes.TEXT, allowNull: false },
  }, {
    tableName: 'pqrs',
  });
  return Pqrs;
};
```

#### `src/models/PqrsResponse.js`

```javascript
module.exports = (sequelize, DataTypes) => {
  const PqrsResponse = sequelize.define('PqrsResponse', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    pqrs_id: { type: DataTypes.INTEGER, allowNull: false },
    user_id: { type: DataTypes.INTEGER, allowNull: false },
    message: { type: DataTypes.TEXT, allowNull: false },
    is_internal: { type: DataTypes.TINYINT(1), allowNull: false, defaultValue: 0 },
  }, {
    tableName: 'pqrs_response',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false, // tu tabla solo tiene created_at
  });
  return PqrsResponse;
};
```

---

### 1.5.4 — `src/models/index.js`

Este archivo **carga los 13 modelos** y define **todas las asociaciones** (relaciones). Es el único que se importa desde el resto del proyecto.

```javascript
// src/models/index.js
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

// 1. Cargar modelos
const UserStatus     = require('./UserStatus')(sequelize, DataTypes);
const DocumentType   = require('./DocumentType')(sequelize, DataTypes);
const Role           = require('./Role')(sequelize, DataTypes);
const Permission     = require('./Permission')(sequelize, DataTypes);
const Module         = require('./Module')(sequelize, DataTypes);
const PqrsType       = require('./PqrsType')(sequelize, DataTypes);
const PqrsStatus     = require('./PqrsStatus')(sequelize, DataTypes);
const User           = require('./User')(sequelize, DataTypes);
const UserRole       = require('./UserRole')(sequelize, DataTypes);
const ModuleRoleUser = require('./ModuleRoleUser')(sequelize, DataTypes);
const Profile        = require('./Profile')(sequelize, DataTypes);
const Pqrs           = require('./Pqrs')(sequelize, DataTypes);
const PqrsResponse   = require('./PqrsResponse')(sequelize, DataTypes);

// 2. Asociaciones

// user ↔ user_status
User.belongsTo(UserStatus, { foreignKey: 'status_id', as: 'status' });
UserStatus.hasMany(User, { foreignKey: 'status_id', as: 'users' });

// user ↔ user_role
User.hasMany(UserRole, { foreignKey: 'user_id', as: 'user_roles' });
UserRole.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

UserRole.belongsTo(Role, { foreignKey: 'role_id', as: 'role' });
Role.hasMany(UserRole, { foreignKey: 'role_id', as: 'user_roles' });

UserRole.belongsTo(UserStatus, { foreignKey: 'status_id', as: 'status' });
UserStatus.hasMany(UserRole, { foreignKey: 'status_id', as: 'user_roles' });

// module_role_user ↔ user_role / module / permission
ModuleRoleUser.belongsTo(UserRole, { foreignKey: 'user_role_id', as: 'user_role' });
UserRole.hasMany(ModuleRoleUser, { foreignKey: 'user_role_id', as: 'module_permissions' });

ModuleRoleUser.belongsTo(Module, { foreignKey: 'module_id', as: 'module' });
Module.hasMany(ModuleRoleUser, { foreignKey: 'module_id', as: 'module_permissions' });

ModuleRoleUser.belongsTo(Permission, { foreignKey: 'permission_id', as: 'permission' });
Permission.hasMany(ModuleRoleUser, { foreignKey: 'permission_id', as: 'module_permissions' });

// profile ↔ user / document_type
User.hasOne(Profile, { foreignKey: 'user_id', as: 'profile' });
Profile.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

Profile.belongsTo(DocumentType, { foreignKey: 'document_type_id', as: 'document_type' });
DocumentType.hasMany(Profile, { foreignKey: 'document_type_id', as: 'profiles' });

// pqrs ↔ user (creador) / user (asignado) / pqrs_type / pqrs_status
Pqrs.belongsTo(User, { foreignKey: 'user_id', as: 'creator' });
User.hasMany(Pqrs, { foreignKey: 'user_id', as: 'created_pqrs' });

Pqrs.belongsTo(User, { foreignKey: 'assigned_to', as: 'assignee' });
User.hasMany(Pqrs, { foreignKey: 'assigned_to', as: 'assigned_pqrs' });

Pqrs.belongsTo(PqrsType, { foreignKey: 'pqrs_type_id', as: 'type' });
PqrsType.hasMany(Pqrs, { foreignKey: 'pqrs_type_id', as: 'pqrs' });

Pqrs.belongsTo(PqrsStatus, { foreignKey: 'pqrs_status_id', as: 'status' });
PqrsStatus.hasMany(Pqrs, { foreignKey: 'pqrs_status_id', as: 'pqrs' });

// pqrs_response ↔ pqrs / user
Pqrs.hasMany(PqrsResponse, { foreignKey: 'pqrs_id', as: 'responses' });
PqrsResponse.belongsTo(Pqrs, { foreignKey: 'pqrs_id', as: 'pqrs' });

PqrsResponse.belongsTo(User, { foreignKey: 'user_id', as: 'author' });
User.hasMany(PqrsResponse, { foreignKey: 'user_id', as: 'pqrs_responses' });

// 3. Export
module.exports = {
  sequelize,
  UserStatus,
  DocumentType,
  Role,
  Permission,
  Module,
  PqrsType,
  PqrsStatus,
  User,
  UserRole,
  ModuleRoleUser,
  Profile,
  Pqrs,
  PqrsResponse,
};
```

**Puntos clave de las asociaciones:**

- **`Pqrs` tiene DOS relaciones con `User`**: `creator` (quien la radicó) y `assignee` (a quién está asignada). Se resuelve con los alias `as:`.
- **`ModuleRoleUser` cuelga de `UserRole`** (con `user_role_id`), no del `User` directo — respeta el nuevo diseño.
- Todos los `as:` están en `snake_case` para que los `include` sean predecibles: `include: [{ model: UserRole, as: 'user_roles' }]`.

---

## ✅ Verificación del Paso 1.5

Crea un script temporal para probar que los modelos **leen las tablas reales** sin modificarlas. Guarda como **`scripts/_check-1.5.js`**:

```javascript
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
```

Ejecuta:

```powershell
node scripts/_check-1.5.js
```

**Salida esperada (aproximada):**

```
✅ Conectado

===== Conteo por tabla (modelos leyendo tablas reales) =====
  user_status          3 filas
  document_type        3 filas
  role                 4 filas
  permission           6 filas
  module               5 filas
  pqrs_type            4 filas
  pqrs_status          5 filas
  user                 2 filas
  user_role            2 filas
  module_role_user     21 filas
  profile              1 filas
  pqrs                 0 filas
  pqrs_response        0 filas

===== Prueba de asociaciones (1 fila de admin con su user_role) =====
{
  "id": 1,
  "username": "admin",
  "email": "admin@pqrs.com",
  "user_roles": [
    {
      "id": 1,
      "user_id": 1,
      "role_id": 1,
      "role": { "id": 1, "name": "admin" },
      "status": { "id": 1, "name": "active" }
    }
  ]
}

===== Prueba de ModuleRoleUser (con user_role_id) =====
[ ...3 filas con module/permission... ]

🎉 Todos los modelos leen las tablas reales sin errores
```

## 🚦 Criterios de aceptación del 1.5

1. ✅ Los 13 modelos existen en `src/models/` + `index.js`.
2. ✅ `node scripts/_check-1.5.js` termina con **`🎉 Todos los modelos leen las tablas reales sin errores`**.
3. ✅ Los conteos coinciden con tu BD (user=2, module_role_user=21, etc.).
4. ✅ El `admin` se trae con `user_roles → role → status` correctamente.
5. ✅ `ModuleRoleUser` trae `user_role_id` y resuelve `user_role / module / permission`.

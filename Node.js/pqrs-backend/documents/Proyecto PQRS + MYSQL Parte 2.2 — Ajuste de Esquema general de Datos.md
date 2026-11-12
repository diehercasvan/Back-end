# 📦 Reset del esquema — Definiciones finales

Con tus respuestas claras:

| Decisión            | Valor                                                                            |
| -------------------- | -------------------------------------------------------------------------------- |
| Script SQL           | `db/pqrs_system_2.sql`                                                         |
| `module_role_user` | **DROP definitivo**                                                        |
| Seed inicial         | **Datos base insertados en el propio script SQL** (sin script Node aparte) |

Vamos paso a paso, **sin codificar el CRUD de Roles todavía**. Solo dejamos el esquema de datos listo, verificado y con datos semilla para operar.

---

## 🗺️ Plan del reset (paso a paso)

| #             | Acción                                                            | Verificación                                                  |
| ------------- | ------------------------------------------------------------------ | -------------------------------------------------------------- |
| **R1**  | Respaldo BD                                                        | `backup_pre-reset.sql` > 0 KB                                |
| **R2**  | Crear `db/pqrs_system_2.sql`                                     | Archivo existe                                                 |
| **R3**  | Ejecutar el script                                                 | Salida con `role_id=1 → 21`, `role_id=2 → 3`             |
| **R4**  | Verificar tablas                                                   | `module_role_user` no existe, `role_module_permission` sí |
| **R5**  | Eliminar archivos obsoletos                                        | 3 `Test-Path` → False                                       |
| **R6**  | Crear `RoleModulePermission.js` + actualizar `models/index.js` | `require('./src/models')` sin errores                        |
| **R7**  | Reescribir `permission.middleware.js`                            | —                                                             |
| **R8**  | Actualizar `package.json`                                        | Sin `migrate:mru` ni `seed:user-perms`; con `db:migrate` |
| **R9**  | Servidor arriba                                                    | 4 mensajes ✅🚀🔗🌎                                            |
| **R10** | Admin 6×200 / juan 6×403 (regresión 2.1)                        | Comportamiento idéntico                                       |
| **R11** | juan: 2×200 (PQRS) + 2×403 (permissions/user-status)             | Por el seed                                                    |
| **R12** | README actualizado                                                 | —                                                             |

---

## 🔒 R1 — Respaldo obligatorio

```powershell
cd C:\xampp\htdocs\SENA\Back-end\node.js\pqrs-backend
C:\xampp\mysql\bin\mysqldump.exe -u root pqrs_system > backup_pre-reset.sql
Get-Item backup_pre-reset.sql | Select-Object Name, Length
```

Debe existir con tamaño > 0.

---

## 📝 R2 — Script `db/pqrs_system_2.sql`

Crea el archivo **`db/pqrs_system_2.sql`**:

```sql
-- ============================================================
-- db/pqrs_system_2.sql
-- Reset del esquema de permisos: role_module_permission
-- ============================================================
-- Reemplaza a module_role_user (se elimina).
-- Idempotente: se puede ejecutar varias veces sin romper nada.
--
-- Ejecución:
--   C:\xampp\mysql\bin\mysql.exe -u root pqrs_system < db\pqrs_system_2.sql
-- ============================================================

SET FOREIGN_KEY_CHECKS = 0;
START TRANSACTION;

-- ------------------------------------------------------------
-- 1) Crear role_module_permission
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS role_module_permission (
  id INT NOT NULL AUTO_INCREMENT,
  role_id INT NOT NULL,
  module_id INT NOT NULL,
  permission_id INT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_rmp (role_id, module_id, permission_id),
  KEY idx_rmp_role (role_id),
  KEY idx_rmp_module (module_id),
  KEY idx_rmp_permission (permission_id),
  CONSTRAINT fk_rmp_role FOREIGN KEY (role_id)
    REFERENCES role(id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_rmp_module FOREIGN KEY (module_id)
    REFERENCES module(id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_rmp_perm FOREIGN KEY (permission_id)
    REFERENCES permission(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ------------------------------------------------------------
-- 2) Migrar datos existentes (solo si module_role_user existe)
-- ------------------------------------------------------------
SET @has_mru := (
  SELECT COUNT(*) FROM information_schema.TABLES
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'module_role_user'
);

SET @sql := IF(@has_mru > 0,
  'INSERT IGNORE INTO role_module_permission (role_id, module_id, permission_id)
   SELECT DISTINCT ur.role_id, mru.module_id, mru.permission_id
   FROM module_role_user mru
   JOIN user_role ur ON ur.id = mru.user_role_id',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ------------------------------------------------------------
-- 3) DROP de module_role_user (si existe)
-- ------------------------------------------------------------
SET @sql := IF(@has_mru > 0,
  'DROP TABLE module_role_user',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ------------------------------------------------------------
-- 4) Datos base: permisos del rol "user" (role_id = 2)
--    Solo se insertan si NO existen (idempotente por UNIQUE)
--    Dashboard/view, PQRS/view, PQRS/create
-- ------------------------------------------------------------
INSERT IGNORE INTO role_module_permission (role_id, module_id, permission_id)
SELECT 2, m.id, p.id
FROM module m, permission p
WHERE (m.name = 'Dashboard' AND p.name = 'view')
   OR (m.name = 'PQRS'      AND p.name = 'view')
   OR (m.name = 'PQRS'      AND p.name = 'create');

COMMIT;
SET FOREIGN_KEY_CHECKS = 1;

-- ------------------------------------------------------------
-- 5) Verificación
-- ------------------------------------------------------------
SELECT '=== role_module_permission: resumen por rol ===' AS info;
SELECT r.id AS role_id, r.name AS role_name, COUNT(rmp.id) AS permisos
FROM role r
LEFT JOIN role_module_permission rmp ON rmp.role_id = r.id
GROUP BY r.id, r.name
ORDER BY r.id;

SELECT '=== module_role_user (debe fallar si se eliminó) ===' AS info;
SHOW TABLES LIKE 'module_role_user';

DROP TABLE module_role_user;
SHOW TABLES;
```

### Respuesta

| document_type          |
| ---------------------- |
| module                 |
| permission             |
| pqrs                   |
| pqrs_response          |
| pqrs_status            |
| pqrs_type              |
| profile                |
| role                   |
| role_module_permission |
| user                   |
| user_role              |
| user_status            |

### Ejecutar

```MySQL
SELECT RO.id AS role_id,RO.name AS role_name, COUNT(PER.id) AS permisos FROM `role_module_permission`AS RMP
INNER JOIN role AS RO ON RMP.role_id=RO.id
INNER JOIN permission AS PER ON RMP.permission_id=PER.id
GROUP By RO.name;
```

**Salida esperada:**

```

role_id  role_name  permisos
1        admin      21
2        user       3
3        manager    0
5        auditor    0
```

---

## 🔍 R3/R4 — Verificar el esquema resultante

```powershell
# 1. La tabla vieja NO debe existir
C:\xampp\mysql\bin\mysql.exe -u root pqrs_system -e "SHOW TABLES LIKE 'module_role_user';"

# 2. La tabla nueva debe existir con 6 columnas
C:\xampp\mysql\bin\mysql.exe -u root pqrs_system -e "DESCRIBE role_module_permission;"

# 3. Estructura completa con FKs y UNIQUE
C:\xampp\mysql\bin\mysql.exe -u root pqrs_system -e "SHOW CREATE TABLE role_module_permission\G"

# 4. Conteo
C:\xampp\mysql\bin\mysql.exe -u root pqrs_system -e "SELECT role_id, COUNT(*) AS permisos FROM role_module_permission GROUP BY role_id ORDER BY role_id;"
```

**Esperado:**

- **(1)** vacío.
- **(2)** `id, role_id, module_id, permission_id, created_at, updated_at`.
- **(3)** `UNIQUE KEY uk_rmp`, 3 FKs con `CASCADE`, 3 índices.
- **(4)** `role_id=1 → 21`, `role_id=2 → 3`.

---

## 🧹 R5 — Eliminar archivos obsoletos del proyecto

Desde `pqrs-backend/`:

```powershell
Remove-Item src\models\ModuleRoleUser.js                    -Force
Remove-Item scripts\migrate-module-role-user.js             -Force
Remove-Item scripts\seed-role-user-perms.js                 -Force
Remove-Item scripts\_check-1.5.js                           -Force
```

Verifica:

```powershell
Test-Path src\models\ModuleRoleUser.js          # False
Test-Path scripts\migrate-module-role-user.js   # False
Test-Path scripts\seed-role-user-perms.js       # False
Test-Path scripts\_check-1.5.js                 # False
```

> ⚠️ Si `scripts\seed-role-user-perms.js` nunca lo creaste (nunca lo ejecutaste), `Remove-Item` dará "no existe". Está bien, ignóralo.

> ⚠️ Si usas **VS Code**, borra también el archivo desde el explorador para que no quede abierto en el editor. Después cierra y reabre VS Code si es necesario.

---

## 📄 R6 — Crear `RoleModulePermission.js` + actualizar `models/index.js`

### 6.1 — Crear `src/models/RoleModulePermission.js`

```powershell
@'
module.exports = (sequelize, DataTypes) => {
  const RoleModulePermission = sequelize.define('RoleModulePermission', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    role_id: { type: DataTypes.INTEGER, allowNull: false },
    module_id: { type: DataTypes.INTEGER, allowNull: false },
    permission_id: { type: DataTypes.INTEGER, allowNull: false },
  }, {
    tableName: 'role_module_permission',
    indexes: [{ unique: true, fields: ['role_id', 'module_id', 'permission_id'] }],
  });
  return RoleModulePermission;
};
'@ | Set-Content -Path "src\models\RoleModulePermission.js" -Encoding UTF8
```

### 6.2 — Reemplazar `src/models/index.js`

```powershell
@'
// src/models/index.js
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const UserStatus     = require('./UserStatus')(sequelize, DataTypes);
const DocumentType   = require('./DocumentType')(sequelize, DataTypes);
const Role           = require('./Role')(sequelize, DataTypes);
const Permission     = require('./Permission')(sequelize, DataTypes);
const Module         = require('./Module')(sequelize, DataTypes);
const PqrsType       = require('./PqrsType')(sequelize, DataTypes);
const PqrsStatus     = require('./PqrsStatus')(sequelize, DataTypes);
const User           = require('./User')(sequelize, DataTypes);
const UserRole       = require('./UserRole')(sequelize, DataTypes);
const RoleModulePermission = require('./RoleModulePermission')(sequelize, DataTypes);
const Profile        = require('./Profile')(sequelize, DataTypes);
const Pqrs           = require('./Pqrs')(sequelize, DataTypes);
const PqrsResponse   = require('./PqrsResponse')(sequelize, DataTypes);

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

// role ↔ role_module_permission ↔ module / permission
RoleModulePermission.belongsTo(Role, { foreignKey: 'role_id', as: 'role' });
Role.hasMany(RoleModulePermission, { foreignKey: 'role_id', as: 'permissions' });

RoleModulePermission.belongsTo(Module, { foreignKey: 'module_id', as: 'module' });
Module.hasMany(RoleModulePermission, { foreignKey: 'module_id', as: 'role_permissions' });

RoleModulePermission.belongsTo(Permission, { foreignKey: 'permission_id', as: 'permission' });
Permission.hasMany(RoleModulePermission, { foreignKey: 'permission_id', as: 'role_permissions' });

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

module.exports = {
  sequelize,
  UserStatus, DocumentType, Role, Permission, Module,
  PqrsType, PqrsStatus, User, UserRole,
  RoleModulePermission,
  Profile, Pqrs, PqrsResponse,
};
'@ | Set-Content -Path "src\models\index.js" -Encoding UTF8
```

**Verifica:**

```powershell
node -e "const m = require('./src/models'); console.log('✅ modelos OK. RoleModulePermission:', !!m.RoleModulePermission, '| ModuleRoleUser:', !!m.ModuleRoleUser);"
```

**Esperado:** `✅ modelos OK. RoleModulePermission: true | ModuleRoleUser: false`.

---

## 🔐 R7 — Reescribir `src/middlewares/permission.middleware.js`

```powershell
@'
// src/middlewares/permission.middleware.js
const { Module, Permission, RoleModulePermission, UserRole } = require('../models');
const { fail } = require('../utils/response');

const cache = { modules: new Map(), permissions: new Map() };

async function resolveIds(moduleName, permissionName) {
  let moduleId = cache.modules.get(moduleName);
  let permissionId = cache.permissions.get(permissionName);

  if (!moduleId) {
    const mod = await Module.findOne({
      where: { name: moduleName, is_active: 1 },
      attributes: ['id'],
    });
    if (mod) { moduleId = mod.id; cache.modules.set(moduleName, moduleId); }
  }
  if (!permissionId) {
    const perm = await Permission.findOne({
      where: { name: permissionName }, attributes: ['id'],
    });
    if (perm) { permissionId = perm.id; cache.permissions.set(permissionName, permissionId); }
  }
  return { moduleId, permissionId };
}

function permissionRequired(moduleName, permissionName) {
  return async (req, res, next) => {
    try {
      const { user_role_id } = req.auth || {};
      if (!user_role_id) return fail(res, 'No hay rol activo en el token', 401);

      const { moduleId, permissionId } = await resolveIds(moduleName, permissionName);
      if (!moduleId) return fail(res, `Módulo "${moduleName}" no existe o está inactivo`, 500);
      if (!permissionId) return fail(res, `Permiso "${permissionName}" no existe`, 500);

      const ur = await UserRole.findOne({
        where: { id: user_role_id, status_id: 1 },
        attributes: ['id', 'role_id'],
      });
      if (!ur) return fail(res, 'El rol activo del token ya no es válido', 401);

      const grant = await RoleModulePermission.findOne({
        where: { role_id: ur.role_id, module_id: moduleId, permission_id: permissionId },
        attributes: ['id'],
      });

      if (!grant) {
        return fail(res,
          `Acceso denegado. Tu rol activo no tiene el permiso "${permissionName}" sobre "${moduleName}".`,
          403);
      }

      req.permissionContext = {
        role_id: ur.role_id, module_id: moduleId, module_name: moduleName,
        permission_id: permissionId, permission_name: permissionName,
      };
      return next();
    } catch (err) { return next(err); }
  };
}

module.exports = { permissionRequired };
'@ | Set-Content -Path "src\middlewares\permission.middleware.js" -Encoding UTF8
```

---

## ⚙️ R8 — Actualizar `package.json`

Reemplaza la sección `"scripts"`:

```json
"scripts": {
  "dev": "nodemon src/server.js",
  "start": "node src/server.js",
  "db:migrate": "C:\\xampp\\mysql\\bin\\mysql.exe -u root pqrs_system < db\\pqrs_system_2.sql",
  "add:is-internal": "node scripts/add-is-internal.js",
  "fix:seed": "node scripts/fix-seed.js"
},
```

> **Ojo Windows:** `db:migrate` usa la ruta absoluta de `mysql.exe`. Si en algún momento mueves XAMPP, ajusta la ruta. En otro SO, cambia el comando.

---

## 🚀 R9 — Levantar servidor

```powershell
npm run dev
```

Deben salir los 4 mensajes (`✅ 🚀 🔗 🌎`). Sin errores.


```
> pqrs-backend@1.0.0 dev
> nodemon src/server.js

[nodemon] 3.1.14
[nodemon] to restart at any time, enter `rs`
[nodemon] watching path(s): *.*
[nodemon] watching extensions: js,mjs,cjs,json
[nodemon] starting `node src/server.js`
✅ Conexión MySQL establecida
🚀 Servidor en http://localhost:3000
🔗 Health:  http://localhost:3000/api/v1/health
🌎 Entorno: development
```


---

## 🧪 R10 — Regresión 2.1 (admin 200 / juan 403)

En otra terminal:

```powershell
# Login admin
$body = @{ username = 'admin'; password = 'admin123' } | ConvertTo-Json
$resp = Invoke-RestMethod -Method POST -Uri http://localhost:3000/api/v1/auth/login -Body $body -ContentType 'application/json'
$token = $resp.data.token
$h = @{ Authorization = "Bearer $token" }

# Admin: 6×200
Invoke-RestMethod -Uri http://localhost:3000/api/v1/catalogs/permissions    -Headers $h | Select-Object success, message
Invoke-RestMethod -Uri http://localhost:3000/api/v1/catalogs/modules        -Headers $h | Select-Object success, message
Invoke-RestMethod -Uri http://localhost:3000/api/v1/catalogs/user-status    -Headers $h | Select-Object success, message
Invoke-RestMethod -Uri http://localhost:3000/api/v1/catalogs/document-types -Headers $h | Select-Object success, message
Invoke-RestMethod -Uri http://localhost:3000/api/v1/catalogs/pqrs-types     -Headers $h | Select-Object success, message
Invoke-RestMethod -Uri http://localhost:3000/api/v1/catalogs/pqrs-status    -Headers $h | Select-Object success, message

# Login juan
$body = @{ username = 'juan'; password = 'admin123' } | ConvertTo-Json
$respJ = Invoke-RestMethod -Method POST -Uri http://localhost:3000/api/v1/auth/login -Body $body -ContentType 'application/json'
$hj = @{ Authorization = "Bearer $($respJ.data.token)" }

# juan: 6×403
try { Invoke-RestMethod -Uri http://localhost:3000/api/v1/catalogs/permissions    -Headers $hj } catch { $_.ErrorDetails.Message }
try { Invoke-RestMethod -Uri http://localhost:3000/api/v1/catalogs/modules        -Headers $hj } catch { $_.ErrorDetails.Message }
try { Invoke-RestMethod -Uri http://localhost:3000/api/v1/catalogs/user-status    -Headers $hj } catch { $_.ErrorDetails.Message }
try { Invoke-RestMethod -Uri http://localhost:3000/api/v1/catalogs/document-types -Headers $hj } catch { $_.ErrorDetails.Message }
try { Invoke-RestMethod -Uri http://localhost:3000/api/v1/catalogs/pqrs-types     -Headers $hj } catch { $_.ErrorDetails.Message }
try { Invoke-RestMethod -Uri http://localhost:3000/api/v1/catalogs/pqrs-status    -Headers $hj } catch { $_.ErrorDetails.Message }
```

**Esperado:**

- Admin → `success: true` en los 6.
- **juan** (con los datos semilla nuevos): `document-types` → 403 (`Perfiles`); `permissions` y `user-status` → 403 (`Roles` / `Usuarios`); **`pqrs-types` y `pqrs-status` → 200** (`PQRS+view` que sembramos); `modules` → 403 (`Roles`).

> **Diferencia con 2.1:** ahora juan **pasa** en `pqrs-types` y `pqrs-status` por el seed que agregamos. Es el comportamiento esperado con el nuevo esquema.

---

## ✅ R11 — Verificación del seed de juan

```powershell
# Debe dar 200
Invoke-RestMethod -Uri http://localhost:3000/api/v1/catalogs/pqrs-types  -Headers $hj | Select-Object success, message
Invoke-RestMethod -Uri http://localhost:3000/api/v1/catalogs/pqrs-status -Headers $hj | Select-Object success, message

# Debe seguir 403
try { Invoke-RestMethod -Uri http://localhost:3000/api/v1/catalogs/permissions -Headers $hj } catch { $_.ErrorDetails.Message }
try { Invoke-RestMethod -Uri http://localhost:3000/api/v1/catalogs/user-status -Headers $hj } catch { $_.ErrorDetails.Message }
```

**Esperado:**

- `pqrs-types` → `success: true`
- `pqrs-status` → `success: true`
- `permissions` → `403 Acceso denegado... "view" sobre "Roles"`
- `user-status` → `403 Acceso denegado... "view" sobre "Usuarios"`

**Y en la BD:**

```powershell
C:\xampp\mysql\bin\mysql.exe -u root pqrs_system -e "SELECT role_id, COUNT(*) AS permisos FROM role_module_permission GROUP BY role_id ORDER BY role_id;"
```

`role_id=1 → 21`, `role_id=2 → 3`.

---

## 📝 R12 — README

Agrega al final del `README.md`:

```markdown
## Esquema de permisos

Los permisos se otorgan **al rol**, no al usuario. Fuente de verdad: `role_module_permission`.

- `role_module_permission(role_id, module_id, permission_id)` — permisos del rol.
- Un usuario hereda todos los permisos de su rol activo.
- Si un usuario necesita permisos distintos, se le asigna otro rol.
- `module_role_user` fue eliminada (obsoleta).

### Reset del esquema

```bash
npm run db:migrate   # ejecuta db/pqrs_system_2.sql (idempotente)

---

## 🚦 Criterios para cerrar el reset

Pégame:

| Etapa | Salida esperada |
|---|---|
| **R1** | Confirmación de `backup_pre-reset.sql` |
| **R3** | Salida del SQL (resumen por rol) |
| **R4** | 4 comandos de verificación (tabla vieja vacía, `DESCRIBE`, `SHOW CREATE`, `COUNT`) |
| **R6** | `node -e ...` con `✅ modelos OK. RoleModulePermission: true | ModuleRoleUser: false` |
| **R9** | Arranque del servidor (4 mensajes) |
| **R10** | Admin 6×200. juan: `pqrs-types`/`pqrs-status` 200, el resto 403 |
| **R11** | `SELECT role_id, COUNT(*)` → `1→21, 2→3` |

Con esas salidas verdes, **el esquema queda finalizado** y pasamos a **2.2 — CRUD Roles completo** con la nueva tabla. **No codificamos el CRUD hasta que el reset esté verificado en tu entorno.**
```

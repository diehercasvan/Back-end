
# 🎉 PASO 1 — CERRADO OFICIALMENTE

Todas las verificaciones en verde:

| Verif                                                 | Resultado                                                                                                                                                                                                                                                   |
| ----------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **A** — `fix:seed`                           | ✅ admin y juan actualizados con `admin123`                                                                                                                                                                                                               |
| **C** — `/api-docs.json` (con `-Depth 10`) | ✅ Swagger completo: `openapi:3.0.3`, los 5 paths (`/auth/login`, `/auth/me`, `/auth/select-role`, `/auth/roles`, `/auth/health`), schemas (`LoginResponse`, `UserBasic`, `RoleBasic`, `ErrorResponse`), `securitySchemes.bearerAuth` |
| **D** — Login admin                            | ✅ (ya validado antes)                                                                                                                                                                                                                                      |
| **E** — Postman                                | (implícito, importaste la colección)                                                                                                                                                                                                                      |
| **F** — Estructura                             | ✅ completa (con carpetas extras `db/` y `documents/` que agregaste tú — no afectan)                                                                                                                                                                  |

**El Paso 1 está oficialmente cerrado.** Tienes una API funcional con:

- ✅ Auth completo (JWT + rol activo)
- ✅ Modelos Sequelize mapeados a tu BD migrada
- ✅ Swagger en `/api-docs`
- ✅ Postman importable
- ✅ Scripts de migración idempotentes
- ✅ `fix:seed` formal

---

## 🚀 PASO 2 — Módulo Seguridad (arranque)

Ahora vamos al corazón del sistema de permisos. **Este paso es el más crítico** porque define quién puede hacer qué.

---

## 📋 Plan del Paso 2 — Módulo Seguridad

| Sub-paso      | Contenido                                                                                | Endpoints                                                                                      |
| ------------- | ---------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| **2.1** | Middleware `permission` + catálogos lectura (status, doc types, permissions, modules) | `GET /permissions`, `GET /modules`, `GET /user-status`, `GET /document-types`          |
| **2.2** | CRUD **Roles** + asignar módulos/permisos a rol (`module_role_user`)            | `GET/POST/PUT/DELETE /roles`, `GET/POST/DELETE /roles/:id/modules`                         |
| **2.3** | CRUD **Users** (solo admin) + asignación de roles                                 | `GET/POST/PUT/DELETE /users`, `POST /users/:id/roles`, `DELETE /users/:id/roles/:roleId` |
| **2.4** | CRUD **Profiles** (1:1 con user)                                                   | `GET/PUT /users/:id/profile`, `GET /profiles`                                              |
| **2.5** | CRUD **Modules** (solo admin)                                                      | `GET/POST/PUT/DELETE /modules`                                                               |
| **2.6** | Ampliación Postman + Swagger + verificación 403 con juan                               | —                                                                                             |

> **Diferencia con el Paso 1:** aquí **cada endpoint** queda protegido con `authRequired` + `permissionRequired(module, permission)`. 
> Ejemplo:
>
> - `POST /users` requiere `module='Usuarios'` + `permission='create'`.
> - `GET /users` requiere `module='Usuarios'` + `permission='view'`.
> - `DELETE /users/:id` requiere `module='Usuarios'` + `permission='delete'`.

---

## 🔍 Punto importante: `juan` no tiene permisos

En `module_role_user`, **los 21 registros son de `user_role_id=1`** (admin). `juan` tiene `user_role_id=2` (rol user) pero **sin filas en `module_role_user`**.

**Consecuencia:** cuando `juan` haga `POST /users`, debe recibir **403 Forbidden**. Eso será la prueba de que el middleware funciona.

**Decisión que necesito de ti:** ¿sembramos algunos permisos básicos para el rol `user`? Por ejemplo:

- Módulo `PQRS` + permiso `view` (para que juan pueda ver sus PQRS).
- Módulo `PQRS` + permiso `create` (para que juan pueda radicar).
- Módulo `Dashboard` + permiso `view`.

Lo hago con un script `scripts/seed-role-user-perms.js`. ¿Lo prefieres así o `juan` se queda sin permisos hasta que tú los asignes desde el CRUD de Roles (que construiremos en 2.2)?

Mi recomendación: **sembrar los 3 permisos básicos** para que las pruebas de 2.2–2.6 sean ricas (tener un usuario con permisos parciales, no solo "todo" o "nada").

---

## 📦 Sub-paso 2.1 — Middleware `permission` + catálogos lectura

Empecemos con lo más importante: el middleware que verifica los permisos.

### 2.1.1 — `src/middlewares/permission.middleware.js`

```javascript
// src/middlewares/permission.middleware.js
const { Module, Permission, ModuleRoleUser } = require('../models');
const { fail } = require('../utils/response');

/**
 * Middleware factory.
 * Uso: router.post('/', authRequired, permissionRequired('Usuarios', 'create'), handler)
 *
 * Requiere que `authRequired` haya corrido antes para tener req.auth.user_role_id.
 * Verifica que el user_role activo tenga el (module, permission) en module_role_user.
 */
function permissionRequired(moduleName, permissionName) {
  return async (req, res, next) => {
    try {
      const { user_role_id } = req.auth || {};
      if (!user_role_id) {
        return fail(res, 'No hay rol activo en el token', 401);
      }

      // 1. Resolver module y permission por nombre
      const [mod, perm] = await Promise.all([
        Module.findOne({ where: { name: moduleName, is_active: 1 }, attributes: ['id', 'name'] }),
        Permission.findOne({ where: { name: permissionName }, attributes: ['id', 'name'] }),
      ]);

      if (!mod) return fail(res, `Módulo "${moduleName}" no existe o está inactivo`, 500);
      if (!perm) return fail(res, `Permiso "${permissionName}" no existe`, 500);

      // 2. Verificar asignación
      const grant = await ModuleRoleUser.findOne({
        where: {
          user_role_id,
          module_id: mod.id,
          permission_id: perm.id,
        },
        attributes: ['id'],
      });

      if (!grant) {
        return fail(
          res,
          `Acceso denegado. Tu rol activo no tiene el permiso "${permissionName}" sobre "${moduleName}".`,
          403
        );
      }

      // Adjuntar para inspección si algún controlador lo necesita
      req.permissionContext = {
        module_id: mod.id,
        module_name: mod.name,
        permission_id: perm.id,
        permission_name: perm.name,
      };
      return next();
    } catch (err) {
      return next(err);
    }
  };
}

module.exports = { permissionRequired };
```

**Cómo funciona:**

1. Toma `user_role_id` del JWT (que ya puso `authRequired`).
2. Busca `Module` por nombre (`Usuarios`) y `Permission` por nombre (`create`).
3. Busca en `module_role_user` si el `user_role_id` tiene ese par `(module_id, permission_id)`.
4. Si **no** existe → **403 con mensaje claro**.
5. Si existe → `next()` y adjunta `req.permissionContext` (por si el controlador lo necesita para auditoría futura).

**Ventaja de usar nombres (`'Usuarios'`, `'create'`) en lugar de IDs:** el código es legible y sobrevive a reordenamientos de la BD. Los IDs se resuelven en runtime.

---

### 2.1.2 — `src/controllers/security/catalog.controller.js`

Catálogos de solo lectura (permissions, modules, user-status, document-types, pqrs-types, pqrs-status). Los CRUD completos de modules/roles vienen en 2.2 y 2.5.

```javascript
// src/controllers/security/catalog.controller.js
const {
  Permission, Module, UserStatus, DocumentType, PqrsType, PqrsStatus,
} = require('../../models');
const { ok } = require('../../utils/response');

async function listPermissions(req, res, next) {
  try {
    const rows = await Permission.findAll({ order: [['id', 'ASC']] });
    return ok(res, { permissions: rows }, 'Permisos');
  } catch (err) { return next(err); }
}

async function listModules(req, res, next) {
  try {
    const rows = await Module.findAll({ order: [['id', 'ASC']] });
    return ok(res, { modules: rows }, 'Módulos');
  } catch (err) { return next(err); }
}

async function listUserStatus(req, res, next) {
  try {
    const rows = await UserStatus.findAll({ order: [['id', 'ASC']] });
    return ok(res, { statuses: rows }, 'Estados de usuario');
  } catch (err) { return next(err); }
}

async function listDocumentTypes(req, res, next) {
  try {
    const rows = await DocumentType.findAll({ order: [['id', 'ASC']] });
    return ok(res, { document_types: rows }, 'Tipos de documento');
  } catch (err) { return next(err); }
}

async function listPqrsTypes(req, res, next) {
  try {
    const rows = await PqrsType.findAll({ order: [['id', 'ASC']] });
    return ok(res, { pqrs_types: rows }, 'Tipos de PQRS');
  } catch (err) { return next(err); }
}

async function listPqrsStatus(req, res, next) {
  try {
    const rows = await PqrsStatus.findAll({ order: [['id', 'ASC']] });
    return ok(res, { pqrs_status: rows }, 'Estados de PQRS');
  } catch (err) { return next(err); }
}

module.exports = {
  listPermissions, listModules, listUserStatus, listDocumentTypes,
  listPqrsTypes, listPqrsStatus,
};
```

---

### 2.1.3 — `src/routes/catalog.routes.js`

```javascript
// src/routes/catalog.routes.js
const { Router } = require('express');
const { authRequired } = require('../middlewares/auth.middleware');
const { permissionRequired } = require('../middlewares/permission.middleware');
const catalog = require('../controllers/security/catalog.controller');

const router = Router();

// Todos requieren auth. Permisos: view sobre el módulo correspondiente.
router.get('/permissions',
  authRequired,
  permissionRequired('Roles', 'view'),
  catalog.listPermissions);

router.get('/modules',
  authRequired,
  permissionRequired('Roles', 'view'),
  catalog.listModules);

router.get('/user-status',
  authRequired,
  permissionRequired('Usuarios', 'view'),
  catalog.listUserStatus);

router.get('/document-types',
  authRequired,
  permissionRequired('Perfiles', 'view'),
  catalog.listDocumentTypes);

router.get('/pqrs-types',
  authRequired,
  permissionRequired('PQRS', 'view'),
  catalog.listPqrsTypes);

router.get('/pqrs-status',
  authRequired,
  permissionRequired('PQRS', 'view'),
  catalog.listPqrsStatus);

module.exports = router;
```

> **Nota de permisos:** los catálogos de `permissions` y `modules` los pido con `Roles + view` porque conceptualmente pertenecen a la gestión de roles. `document-types` con `Perfiles + view` (pertenece a perfiles). Los de PQRS con `PQRS + view`.

---

### 2.1.4 — Actualizar `src/routes/index.js`

```javascript
// src/routes/index.js
const { Router } = require('express');
const authRoutes = require('./auth.routes');
const catalogRoutes = require('./catalog.routes');

const router = Router();

router.get('/health', (req, res) => {
  res.json({ success: true, message: 'Router /api/v1 operativo' });
});

router.use('/auth', authRoutes);
router.use('/catalogs', catalogRoutes);   // ← NUEVO

module.exports = router;
```

---

### 2.1.5 — Script opcional `scripts/seed-role-user-perms.js` (solo si decides sembrar)

Crea este archivo **solo si me dices que sí**:

```javascript
// scripts/seed-role-user-perms.js
// Siembra permisos básicos al rol "user" (user_role_id=2).
// Idempotente.
require('dotenv').config();
const { Module, Permission, ModuleRoleUser, UserRole, Role } = require('../src/models');

// (module_name, permission_name)
const GRANTS = [
  ['Dashboard', 'view'],
  ['PQRS', 'view'],
  ['PQRS', 'create'],
];

async function run() {
  try {
    const userRole = await UserRole.findOne({
      where: { role_id: 2, status_id: 1 }, // rol "user" activo
      include: [{ model: Role, as: 'role', attributes: ['name'] }],
    });
    if (!userRole) {
      console.error('❌ No existe user_role activo con role_id=2 (user)');
      process.exitCode = 1;
      return;
    }
    console.log(`✅ user_role encontrado: id=${userRole.id} (rol "${userRole.role.name}")`);

    for (const [moduleName, permissionName] of GRANTS) {
      const mod = await Module.findOne({ where: { name: moduleName } });
      const perm = await Permission.findOne({ where: { name: permissionName } });
      if (!mod || !perm) {
        console.log(`⚠️  Saltado (no encontrado): ${moduleName} + ${permissionName}`);
        continue;
      }
      const [, created] = await ModuleRoleUser.findOrCreate({
        where: {
          user_role_id: userRole.id,
          module_id: mod.id,
          permission_id: perm.id,
        },
        defaults: {},
      });
      console.log(`${created ? '➕' : 'ℹ️ '} ${moduleName} + ${permissionName} ${created ? 'agregado' : 'ya existe'}`);
    }
    console.log('\n🎉 Seed de permisos para rol "user" completo');
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exitCode = 1;
  } finally {
    await require('../src/models').sequelize.close();
  }
}

run();
```

Agrega a `package.json`:

```json
"seed:user-perms": "node scripts/seed-role-user-perms.js"
```

---

## ✅ Verificación del sub-paso 2.1

### Verificación A — Servidor arranca

```powershell
npm run dev
```

Debe imprimir los 4 mensajes. Sin errores de carga.

### Verificación B — Catálogos con admin (debe funcionar)

En otra terminal:

```powershell
# 1. Login admin
$body = @{ username = 'admin'; password = 'admin123' } | ConvertTo-Json
$resp = Invoke-RestMethod -Method POST -Uri http://localhost:3000/api/v1/auth/login -Body $body -ContentType 'application/json'
$token = $resp.data.token
$h = @{ Authorization = "Bearer $token" }

# 2. Probar los 6 catálogos
Invoke-RestMethod -Uri http://localhost:3000/api/v1/catalogs/permissions -Headers $h | ConvertTo-Json -Depth 4
Invoke-RestMethod -Uri http://localhost:3000/api/v1/catalogs/modules -Headers $h | ConvertTo-Json -Depth 4
Invoke-RestMethod -Uri http://localhost:3000/api/v1/catalogs/user-status -Headers $h | ConvertTo-Json -Depth 4
Invoke-RestMethod -Uri http://localhost:3000/api/v1/catalogs/document-types -Headers $h | ConvertTo-Json -Depth 4
Invoke-RestMethod -Uri http://localhost:3000/api/v1/catalogs/pqrs-types -Headers $h | ConvertTo-Json -Depth 4
Invoke-RestMethod -Uri http://localhost:3000/api/v1/catalogs/pqrs-status -Headers $h | ConvertTo-Json -Depth 4
```

**Esperado:** todos `success:true` con `data.permissions` (6), `data.modules` (5), `data.statuses` (3), `data.document_types` (3), `data.pqrs_types` (4), `data.pqrs_status` (5).

### Verificación C — `juan` sin permisos → 403

```powershell
# Login juan
$body = @{ username = 'juan'; password = 'admin123' } | ConvertTo-Json
$respJ = Invoke-RestMethod -Method POST -Uri http://localhost:3000/api/v1/auth/login -Body $body -ContentType 'application/json'
$hj = @{ Authorization = "Bearer $($respJ.data.token)" }

# Debe dar 403 en todos los catálogos
try {
  Invoke-RestMethod -Uri http://localhost:3000/api/v1/catalogs/permissions -Headers $hj
} catch { $_.ErrorDetails.Message }
```

**Esperado:** `{"success":false,"message":"Acceso denegado. Tu rol activo no tiene el permiso \"view\" sobre \"Roles\"."}` (403).

Repite con `modules` (403), `user-status` (403 sobre "Usuarios"), `document-types` (403 sobre "Perfiles"), `pqrs-types` y `pqrs-status` (403 sobre "PQRS"). **Todos deben dar 403.**

> ⚠️ **Nota:** si siembras `seed:user-perms`, juan tendrá `PQRS+view`, así que `pqrs-types` y `pqrs-status` **sí pasarán** (200). Los demás seguirán en 403. Eso también es una prueba válida: **el mismo juan pasa en PQRS pero no en Roles**.

---

## 🚦 Decisión que necesito antes de seguir

**¿Sembramos los 3 permisos básicos para juan (`Dashboard+view`, `PQRS+view`, `PQRS+create`)?**

- **Sí** → aplicas `seed:user-perms`, verificas que juan pasa en PQRS pero falla en Roles/Usuarios/Perfiles.
- **No** → juan queda 403 en todo hasta que tú le asignes permisos desde el CRUD de Roles (2.2). Es más realista pero hace las pruebas menos ricas.

**Pégame:**

1. Salida de **A** (arranque).
2. Salida de **B** (admin, los 6 catálogos → 200).
3. Salida de **C** (juan → 403 en al menos 2 catálogos).
4. Tu decisión sobre sembrar permisos para juan.

Con eso cerramos **2.1** y arrancamos **2.2 — CRUD de Roles + asignación de módulos/permisos**, que es donde el middleware de permisos se pone a prueba de verdad.

# 📦 CRUD Roles completo (2.2)

Con el reset del esquema verificado (asumo que R1–R12 pasaron), veremos el nuevo **CRUD de Roles** con la nueva tabla `role_module_permission`.

La disposició del **código** estará en un solo bloque. Al final, las verificaciones se podrán realizar con `Invoke-RestMethod` (que es PowerShell, no un comando de sistema — no hay alternativa práctica en Windows sin curl).

> Probar con **Postman**, al final se entrega la colección actualizada. Puedes saltarte los `Invoke-RestMethod` y usar Postman directamente.

---

## 📁 Archivos a crear/modificar (7)

| Archivo                                         | Acción                                      |
| ----------------------------------------------- | -------------------------------------------- |
| `src/validators/role.validator.js`            | **CREAR**                              |
| `src/services/role.service.js`                | **CREAR**                              |
| `src/controllers/security/role.controller.js` | **CREAR**                              |
| `src/controllers/security/index.js`           | **CREAR**                                   |
| `src/routes/role.routes.js`                   | **CREAR**                              |
| `src/routes/index.js`                         | **MODIFICAR** (montar `/roles`)      |
| `postman/PQRS.postman_collection.json`        | **REEMPLAZAR** (agregar carpeta Roles) |

---

## 1. `src/validators/role.validator.js`

```javascript
// src/validators/role.validator.js
const { z } = require('zod');

const createRoleSchema = z.object({
  name: z
    .string()
    .min(3, 'name debe tener al menos 3 caracteres')
    .max(50, 'name no puede exceder 50 caracteres')
    .regex(/^[a-zA-Z0-9_-]+$/, 'name solo admite letras, números, _ y -'),
  description: z.string().max(255).optional().nullable(),
  is_active: z
    .union([z.boolean(), z.coerce.number().int().min(0).max(1)])
    .optional(),
});

const updateRoleSchema = z
  .object({
    name: z
      .string()
      .min(3, 'name debe tener al menos 3 caracteres')
      .max(50, 'name no puede exceder 50 caracteres')
      .regex(/^[a-zA-Z0-9_-]+$/, 'name solo admite letras, números, _ y -')
      .optional(),
    description: z.string().max(255).optional().nullable(),
    is_active: z
      .union([z.boolean(), z.coerce.number().int().min(0).max(1)])
      .optional(),
  })
  .refine((v) => Object.keys(v).length > 0, {
    message: 'Debes enviar al menos un campo',
  });

const assignPermissionSchema = z.object({
  module_id: z.coerce.number().int().positive(),
  permission_id: z.coerce.number().int().positive(),
});

module.exports = {
  createRoleSchema,
  updateRoleSchema,
  assignPermissionSchema,
};
```

---

## 2. `src/services/role.service.js`

Helpers reutilizables: matriz de permisos, verificación de existencia y construcción de respuestas.

```javascript
// src/services/role.service.js
const { Module, Permission, RoleModulePermission } = require('../models');

/**
 * Devuelve modules y permissions ordenados para construir la matriz.
 */
async function getCatalogsForMatrix() {
  const [modules, permissions] = await Promise.all([
    Module.findAll({ order: [['id', 'ASC']] }),
    Permission.findAll({ order: [['id', 'ASC']] }),
  ]);
  return { modules, permissions };
}

/**
 * Devuelve los role_module_permission del rol como Set de "module_id-permission_id"
 * y un Map para recuperar el id de cada fila.
 */
async function getRoleGrantsSet(role_id) {
  const rows = await RoleModulePermission.findAll({
    where: { role_id },
    attributes: ['id', 'module_id', 'permission_id'],
    order: [['module_id', 'ASC'], ['permission_id', 'ASC']],
  });
  const granted = new Set();
  const byPair = new Map();
  for (const r of rows) {
    const key = `${r.module_id}-${r.permission_id}`;
    granted.add(key);
    byPair.set(key, r.id);
  }
  return { granted, byPair, rows };
}

/**
 * Construye la matriz modules × permissions con estado granted/denied.
 */
async function buildPermissionMatrix(role_id) {
  const [{ modules, permissions }, { granted, byPair }] = await Promise.all([
    getCatalogsForMatrix(),
    getRoleGrantsSet(role_id),
  ]);

  const matrix = modules.map((m) => ({
    module: { id: m.id, name: m.name, route: m.route, icon: m.icon },
    permissions: permissions.map((p) => {
      const key = `${m.id}-${p.id}`;
      return {
        permission: { id: p.id, name: p.name },
        granted: granted.has(key),
        rmp_id: byPair.get(key) || null,
      };
    }),
  }));

  return { modules, permissions, matrix };
}

module.exports = {
  getCatalogsForMatrix,
  getRoleGrantsSet,
  buildPermissionMatrix,
};
```

---

## 3. `src/controllers/security/role.controller.js`

CRUD completo + gestión de permisos sobre `role_module_permission`. **Sin propagación** — un cambio en el rol afecta a todos sus usuarios automáticamente.

```javascript
// src/controllers/security/role.controller.js
const { Op } = require('sequelize');
const {sequelize, Role, UserRole, Module, Permission, RoleModulePermission,} = require('../../models');
const { ok, fail } = require('../../utils/response');
const { buildPermissionMatrix } = require('../../services/role.service');

/* ============================================================
 * CRUD Roles
 * ============================================================ */

/** GET /roles */
async function list(req, res, next) {
  try {
    const roles = await Role.findAll({
      order: [['id', 'ASC']],
      include: [{
        model: UserRole, as: 'user_roles',
        attributes: ['id', 'status_id'],
      }],
    });

    const roleIds = roles.map((r) => r.id);
    const counts = await RoleModulePermission.findAll({
      where: { role_id: { [Op.in]: roleIds } },
      attributes: ['role_id', [sequelize.fn('COUNT', sequelize.col('id')), 'total']],
      group: ['role_id'],
      raw: true,
    });
    const permCountByRole = Object.fromEntries(
      counts.map((c) => [c.role_id, Number(c.total)])
    );

    const data = roles.map((r) => ({
      id: r.id,
      name: r.name,
      description: r.description,
      is_active: r.is_active,
      created_at: r.created_at,
      updated_at: r.updated_at,
      user_role_count: r.user_roles.length,
      user_role_active_count: r.user_roles.filter((ur) => ur.status_id === 1).length,
      permission_count: permCountByRole[r.id] || 0,
    }));

    return ok(res, { roles: data }, 'Roles');
  } catch (err) { return next(err); }
}

/** GET /roles/:id */
async function getOne(req, res, next) {
  try {
    const id = Number(req.params.id);
    const role = await Role.findByPk(id);
    if (!role) return fail(res, 'Rol no encontrado', 404);

    const grants = await RoleModulePermission.findAll({
      where: { role_id: id },
      include: [
        { model: Module, as: 'module', attributes: ['id', 'name'] },
        { model: Permission, as: 'permission', attributes: ['id', 'name'] },
      ],
      order: [['module_id', 'ASC'], ['permission_id', 'ASC']],
    });

    const permissions = grants.map((g) => ({
      rmp_id: g.id,
      module: g.module,
      permission: g.permission,
      created_at: g.created_at,
    }));

    return ok(res, { role, permissions }, 'Rol');
  } catch (err) { return next(err); }
}

/** POST /roles */
async function create(req, res, next) {
  try {
    const { name, description, is_active } = req.body;

    const exists = await Role.findOne({ where: { name } });
    if (exists) return fail(res, `Ya existe un rol con name="${name}"`, 409);

    const role = await Role.create({
      name,
      description: description ?? null,
      is_active: is_active ?? 1,
    });
    return ok(res, { role }, 'Rol creado', 201);
  } catch (err) { return next(err); }
}

/** PUT /roles/:id */
async function update(req, res, next) {
  try {
    const id = Number(req.params.id);
    const role = await Role.findByPk(id);
    if (!role) return fail(res, 'Rol no encontrado', 404);

    if (req.body.name && req.body.name !== role.name) {
      const dup = await Role.findOne({ where: { name: req.body.name } });
      if (dup) return fail(res, `Ya existe un rol con name="${req.body.name}"`, 409);
    }

    await role.update(req.body);
    return ok(res, { role }, 'Rol actualizado');
  } catch (err) { return next(err); }
}

/** DELETE /roles/:id */
async function remove(req, res, next) {
  try {
    const id = Number(req.params.id);
    const role = await Role.findByPk(id);
    if (!role) return fail(res, 'Rol no encontrado', 404);

    const activeCount = await UserRole.count({
      where: { role_id: id, status_id: 1 },
    });
    if (activeCount > 0) {
      return fail(
        res,
        `No se puede eliminar: el rol tiene ${activeCount} asignación(es) activa(s). Desactívalas primero.`,
        409
      );
    }

    await role.destroy();
    return ok(res, null, 'Rol eliminado');
  } catch (err) { return next(err); }
}

/* ============================================================
 * Permisos del rol (role_module_permission)
 * ============================================================ */

/** GET /roles/:id/permissions */
async function listPermissions(req, res, next) {
  try {
    const id = Number(req.params.id);
    const role = await Role.findByPk(id);
    if (!role) return fail(res, 'Rol no encontrado', 404);

    const { modules, permissions, matrix } = await buildPermissionMatrix(id);
    const grants = await RoleModulePermission.findAll({
      where: { role_id: id },
      include: [
        { model: Module, as: 'module', attributes: ['id', 'name'] },
        { model: Permission, as: 'permission', attributes: ['id', 'name'] },
      ],
      order: [['module_id', 'ASC'], ['permission_id', 'ASC']],
    });

    return ok(res, {
      role,
      modules,
      permissions,
      matrix,
      grants: grants.map((g) => ({
        rmp_id: g.id,
        module: g.module,
        permission: g.permission,
      })),
    }, 'Permisos del rol');
  } catch (err) { return next(err); }
}

/** POST /roles/:id/permissions */
async function assignPermission(req, res, next) {
  try {
    const id = Number(req.params.id);
    const { module_id, permission_id } = req.body;

    const role = await Role.findByPk(id);
    if (!role) return fail(res, 'Rol no encontrado', 404);

    const [mod, perm] = await Promise.all([
      Module.findByPk(module_id),
      Permission.findByPk(permission_id),
    ]);
    if (!mod) return fail(res, 'Módulo no existe', 400);
    if (!perm) return fail(res, 'Permiso no existe', 400);

    const [row, created] = await RoleModulePermission.findOrCreate({
      where: { role_id: id, module_id, permission_id },
      defaults: {},
    });

    return ok(res, {
      rmp_id: row.id,
      module: { id: mod.id, name: mod.name },
      permission: { id: perm.id, name: perm.name },
      created,
    }, created ? 'Permiso asignado al rol' : 'El rol ya tenía ese permiso', created ? 201 : 200);
  } catch (err) { return next(err); }
}

/** DELETE /roles/:id/permissions/:rmpId */
async function revokePermission(req, res, next) {
  try {
    const roleId = Number(req.params.id);
    const rmpId = Number(req.params.rmpId);

    const role = await Role.findByPk(roleId);
    if (!role) return fail(res, 'Rol no encontrado', 404);

    const row = await RoleModulePermission.findByPk(rmpId);
    if (!row) return fail(res, 'Permiso no encontrado', 404);
    if (row.role_id !== roleId) {
      return fail(res, 'Ese permiso no pertenece al rol indicado', 400);
    }

    await row.destroy();
    return ok(res, null, 'Permiso revocado del rol');
  } catch (err) { return next(err); }
}

module.exports = {
  list, getOne, create, update, remove,
  listPermissions, assignPermission, revokePermission,
};
```

---

## 4. `src/controllers/security/index.js` 

```javascript
// src/controllers/security/index.js
module.exports = {
  catalog: require('./catalog.controller'),
  role: require('./role.controller'),
};
```

---

## 5. `src/routes/role.routes.js`

```javascript
// src/routes/role.routes.js
const { Router } = require('express');
const { authRequired } = require('../middlewares/auth.middleware');
const { permissionRequired } = require('../middlewares/permission.middleware');
const { validate } = require('../middlewares/validate.middleware');
const {
  createRoleSchema, updateRoleSchema, assignPermissionSchema,
} = require('../validators/role.validator');
const roleCtl = require('../controllers/security/role.controller');

const router = Router();

/* ===== CRUD Roles ===== */
router.get('/',    authRequired, permissionRequired('Roles', 'view'),   roleCtl.list);
router.post('/',   authRequired, permissionRequired('Roles', 'create'), validate(createRoleSchema), roleCtl.create);
router.get('/:id', authRequired, permissionRequired('Roles', 'view'),   roleCtl.getOne);
router.put('/:id', authRequired, permissionRequired('Roles', 'edit'),   validate(updateRoleSchema), roleCtl.update);
router.delete('/:id', authRequired, permissionRequired('Roles', 'delete'), roleCtl.remove);

/* ===== Permisos del rol ===== */
router.get('/:id/permissions',
  authRequired, permissionRequired('Roles', 'view'), roleCtl.listPermissions);

router.post('/:id/permissions',
  authRequired, permissionRequired('Roles', 'edit'),
  validate(assignPermissionSchema), roleCtl.assignPermission);

router.delete('/:id/permissions/:rmpId',
  authRequired, permissionRequired('Roles', 'edit'), roleCtl.revokePermission);

module.exports = router;
```

---

## 6. `src/routes/index.js` (modificar)

```javascript
// src/routes/index.js
const { Router } = require('express');
const authRoutes = require('./auth.routes');
const catalogRoutes = require('./catalog.routes');
const roleRoutes = require('./role.routes'); //Agregar las nuevas rutas

const router = Router();

router.get('/health', (req, res) => {
  res.json({ success: true, message: 'Router /api/v1 operativo' });
});

router.use('/auth', authRoutes);
router.use('/catalogs', catalogRoutes);
router.use('/roles', roleRoutes);// Cargar las rutas

module.exports = router;
```

---

## 7. Colección Postman actualizada

Reemplaza **`postman/PQRS.postman_collection.json`** con esto (agrega la carpeta **Roles** completa):

```json
{
  "info": {
    "name": "PQRS API",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "variable": [
    { "key": "baseUrl", "value": "http://localhost:3000/api/v1" },
    { "key": "token", "value": "" },
    { "key": "roleId", "value": "6" },
    { "key": "rmpId", "value": "" }
  ],
  "item": [
    {
      "name": "Auth",
      "item": [
        {
          "name": "Login admin",
          "request": {
            "method": "POST",
            "header": [{ "key": "Content-Type", "value": "application/json" }],
            "body": { "mode": "raw", "raw": "{\"username\":\"admin\",\"password\":\"admin123\"}" },
            "url": "{{baseUrl}}/auth/login"
          },
          "event": [{ "listen": "test", "script": { "exec": [
            "const b = pm.response.json();",
            "if (b.data && b.data.token) pm.collectionVariables.set('token', b.data.token);"
          ]}}]
        },
        {
          "name": "Login juan",
          "request": {
            "method": "POST",
            "header": [{ "key": "Content-Type", "value": "application/json" }],
            "body": { "mode": "raw", "raw": "{\"username\":\"juan\",\"password\":\"admin123\"}" },
            "url": "{{baseUrl}}/auth/login"
          }
        },
        {
          "name": "Me",
          "request": {
            "method": "GET",
            "header": [{ "key": "Authorization", "value": "Bearer {{token}}" }],
            "url": "{{baseUrl}}/auth/me"
          }
        }
      ]
    },
    {
      "name": "Roles",
      "item": [
        {
          "name": "Listar roles",
          "request": {
            "method": "GET",
            "header": [{ "key": "Authorization", "value": "Bearer {{token}}" }],
            "url": "{{baseUrl}}/roles"
          }
        },
        {
          "name": "Detalle rol",
          "request": {
            "method": "GET",
            "header": [{ "key": "Authorization", "value": "Bearer {{token}}" }],
            "url": "{{baseUrl}}/roles/{{roleId}}"
          }
        },
        {
          "name": "Crear rol",
          "request": {
            "method": "POST",
            "header": [
              { "key": "Content-Type", "value": "application/json" },
              { "key": "Authorization", "value": "Bearer {{token}}" }
            ],
            "body": { "mode": "raw", "raw": "{\"name\":\"tester\",\"description\":\"Rol de prueba\",\"is_active\":1}" },
            "url": "{{baseUrl}}/roles"
          },
          "event": [{ "listen": "test", "script": { "exec": [
            "const b = pm.response.json();",
            "if (b.data && b.data.role && b.data.role.id) pm.collectionVariables.set('roleId', String(b.data.role.id));"
          ]}}]
        },
        {
          "name": "Editar rol",
          "request": {
            "method": "PUT",
            "header": [
              { "key": "Content-Type", "value": "application/json" },
              { "key": "Authorization", "value": "Bearer {{token}}" }
            ],
            "body": { "mode": "raw", "raw": "{\"description\":\"Rol de prueba (editado)\"}" },
            "url": "{{baseUrl}}/roles/{{roleId}}"
          }
        },
        {
          "name": "Eliminar rol",
          "request": {
            "method": "DELETE",
            "header": [{ "key": "Authorization", "value": "Bearer {{token}}" }],
            "url": "{{baseUrl}}/roles/{{roleId}}"
          }
        },
        {
          "name": "Matriz de permisos del rol",
          "request": {
            "method": "GET",
            "header": [{ "key": "Authorization", "value": "Bearer {{token}}" }],
            "url": "{{baseUrl}}/roles/{{roleId}}/permissions"
          }
        },
        {
          "name": "Asignar permiso (Dashboard/view)",
          "request": {
            "method": "POST",
            "header": [
              { "key": "Content-Type", "value": "application/json" },
              { "key": "Authorization", "value": "Bearer {{token}}" }
            ],
            "body": { "mode": "raw", "raw": "{\"module_id\":1,\"permission_id\":1}" },
            "url": "{{baseUrl}}/roles/{{roleId}}/permissions"
          },
          "event": [{ "listen": "test", "script": { "exec": [
            "const b = pm.response.json();",
            "if (b.data && b.data.rmp_id) pm.collectionVariables.set('rmpId', String(b.data.rmp_id));"
          ]}}]
        },
        {
          "name": "Revocar permiso",
          "request": {
            "method": "DELETE",
            "header": [{ "key": "Authorization", "value": "Bearer {{token}}" }],
            "url": "{{baseUrl}}/roles/{{roleId}}/permissions/{{rmpId}}"
          }
        },
        {
          "name": "juan intenta listar roles (403)",
          "request": {
            "method": "GET",
            "header": [{ "key": "Authorization", "value": "Bearer {{token}}" }],
            "url": "{{baseUrl}}/roles"
          }
        }
      ]
    }
  ]
}
```

---

## 🧪 Verificación del CRUD (10 pruebas)

> **Recordatorio:** Importa la colección Postman y ejecuta en orden. Los resultados son los mismos. Otra opción es la versión `Invoke-RestMethod`

Asumo servidor corriendo (`npm run dev`) y terminal con `$token` / `$h` ya cargados del login admin.

### V1 — Listar roles

```powershell
Invoke-RestMethod -Uri http://localhost:3000/api/v1/roles -Headers $h | ConvertTo-Json -Depth 5
```

**Esperado:** `admin` con `permission_count:21`, `user` con `permission_count:3`, `manager` y `auditor` con `0`.

### V2 — Detalle del rol admin (con 21 permisos)

```powershell
Invoke-RestMethod -Uri http://localhost:3000/api/v1/roles/1 -Headers $h | ConvertTo-Json -Depth 6
```

**Esperado:** `role.name: "admin"` + `permissions` (21 filas con `rmp_id`, `module`, `permission`).

### V3 — Matriz del rol admin

```powershell
Invoke-RestMethod -Uri http://localhost:3000/api/v1/roles/1/permissions -Headers $h | ConvertTo-Json -Depth 6
```

**Esperado:** `matrix` de 5 módulos × 6 permisos (30 celdas). En admin, **21 con `granted:true`**, 9 con `granted:false`.

### V4 — Crear rol `tester`

```powershell
$body = @{ name = 'tester'; description = 'Rol de prueba'; is_active = 1 } | ConvertTo-Json
Invoke-RestMethod -Method POST -Uri http://localhost:3000/api/v1/roles -Headers $h -Body $body -ContentType 'application/json' | ConvertTo-Json -Depth 5
```

**Esperado:** `success:true`, `role.id: 6`, `role.name: "tester"`.

### V5 — Crear rol duplicado → 409

```powershell
$body = @{ name = 'tester'; description = 'Duplicado' } | ConvertTo-Json
try {
  Invoke-RestMethod -Method POST -Uri http://localhost:3000/api/v1/roles -Headers $h -Body $body -ContentType 'application/json'
} catch { $_.ErrorDetails.Message }
```

**Esperado:** `409 {"success":false,"message":"Ya existe un rol con name=\"tester\""}`.

### V6 — Asignar `Dashboard+view` (module_id=1, permission_id=1) al rol 6

```powershell
$body = @{ module_id = 1; permission_id = 1 } | ConvertTo-Json
Invoke-RestMethod -Method POST -Uri http://localhost:3000/api/v1/roles/6/permissions -Headers $h -Body $body -ContentType 'application/json' | ConvertTo-Json -Depth 5
```

**Esperado:** `success:true`, `created:true`, `rmp_id` nuevo.

### V7 — Asignar el mismo permiso otra vez → 200 sin duplicar

```powershell
$body = @{ module_id = 1; permission_id = 1 } | ConvertTo-Json
Invoke-RestMethod -Method POST -Uri http://localhost:3000/api/v1/roles/6/permissions -Headers $h -Body $body -ContentType 'application/json' | ConvertTo-Json -Depth 5
```

**Esperado:** `created:false`, mismo `rmp_id`. Y en BD el rol 6 tiene 1 sola fila (no duplica por el `UNIQUE`).

### V8 — Matriz del rol 6 (1 granted, 29 denied)

```powershell
Invoke-RestMethod -Uri http://localhost:3000/api/v1/roles/6/permissions -Headers $h | ConvertTo-Json -Depth 6
```

**Esperado:** `matrix` con exactamente **1 `granted:true`** (`Dashboard/view`) y el resto `false`.

### V9 — Revocar el permiso

```powershell
$rmp = (Invoke-RestMethod -Uri http://localhost:3000/api/v1/roles/6/permissions -Headers $h).data.grants[0].rmp_id
Invoke-RestMethod -Method DELETE -Uri "http://localhost:3000/api/v1/roles/6/permissions/$rmp" -Headers $h | ConvertTo-Json
```

**Esperado:** `success:true`, `"Permiso revocado del rol"`. Y la matriz vuelve a 0 granted.

### V10 — Eliminar rol `tester`

```powershell
Invoke-RestMethod -Method DELETE -Uri http://localhost:3000/api/v1/roles/6 -Headers $h | ConvertTo-Json
```

**Esperado:** `success:true`, `"Rol eliminado"`.

### V11 — Eliminar rol `admin` → 409

```powershell
try {
  Invoke-RestMethod -Method DELETE -Uri http://localhost:3000/api/v1/roles/1 -Headers $h
} catch { $_.ErrorDetails.Message }
```

**Esperado:** `409 {"success":false,"message":"No se puede eliminar: el rol tiene 1 asignación(es) activa(s). Desactívalas primero."}`.

### V12 — juan no puede listar roles (403)

```powershell
$body = @{ username = 'juan'; password = 'admin123' } | ConvertTo-Json
$respJ = Invoke-RestMethod -Method POST -Uri http://localhost:3000/api/v1/auth/login -Body $body -ContentType 'application/json'
$hj = @{ Authorization = "Bearer $($respJ.data.token)" }

try {
  Invoke-RestMethod -Uri http://localhost:3000/api/v1/roles -Headers $hj
} catch { $_.ErrorDetails.Message }
```

**Esperado:** `403 {"success":false,"message":"Acceso denegado. Tu rol activo no tiene el permiso \"view\" sobre \"Roles\"."}`.

---

## 🚦 Criterios para cerrar 2.2

Crud funcional de roles + consultas de permisos.

**Regla que aplicamos sin excepción:** cada endpoint protegido por `authRequired` + `permissionRequired(module, permission)`. `admin` pasa todo; `juan` solo PQRS y Dashboard.

# 📦 Sub-paso 2.6 — CRUD Modules

Último CRUD del Paso 2 (seguridad). Gestiona los módulos del sistema (`Dashboard`, `Usuarios`, `Roles`, `Perfiles`, `PQRS`).

---

## 📋 Plan de endpoints (2.5)

| Método | Ruta             | Permiso            | Descripción                                     |
| ------- | ---------------- | ------------------ | ------------------------------------------------ |
| GET     | `/modules`     | `Roles + view`   | Listar módulos con conteo de permisos asignados |
| GET     | `/modules/:id` | `Roles + view`   | Detalle de un módulo                            |
| POST    | `/modules`     | `Roles + create` | Crear módulo                                    |
| PUT     | `/modules/:id` | `Roles + edit`   | Editar módulo                                   |
| DELETE  | `/modules/:id` | `Roles + delete` | Eliminar módulo (con protección)               |

> **¿Por qué `Roles` y no un módulo nuevo "Modules"?** Los módulos son infraestructura del sistema de permisos. Quien administra roles (asignar `module_role_permission`) es quien debe poder crear/editar módulos. No tiene sentido un módulo "Modules" recursivo. **Decisión de diseño: módulos = `Roles` con `view/create/edit/delete`.**

> **Conflicto con `/catalogs/modules`:** ya existe un `GET /catalogs/modules` que también lista módulos. Es **intencional**: `/catalogs/modules` es un catálogo de solo lectura para que el frontend alimente combos (asignación de permisos a roles). `/modules` es el CRUD administrativo completo con conteos y operaciones de escritura. Ambos coexisten; no hay colisión.

---

## 📁 Archivos (4 nuevos/modificados)

| Archivo                                           | Acción                         |
| ------------------------------------------------- | ------------------------------- |
| `src/validators/module.validator.js`            | CREAR                           |
| `src/controllers/security/module.controller.js` | CREAR                           |
| `src/controllers/security/index.js`             | MODIFICAR (agregar `module`)  |
| `src/routes/module.routes.js`                   | CREAR                           |
| `src/routes/index.js`                           | MODIFICAR (montar `/modules`) |
| `postman/PQRS.postman_collection.json`          | MODIFICAR (carpeta Modules)     |

---

## 1. `src/validators/module.validator.js`

```javascript
// src/validators/module.validator.js
const { z } = require('zod');

const createModuleSchema = z.object({
  name: z
    .string()
    .min(3, 'name debe tener al menos 3 caracteres')
    .max(50, 'name no puede exceder 50 caracteres')
    .regex(/^[a-zA-Z0-9_-]+$/, 'name solo admite letras, números, _ y -'),
  route: z
    .string()
    .min(1, 'route es obligatorio')
    .max(100)
    .startsWith('#/', 'route debe iniciar con "#/" (ej. #/dashboard)'),
  icon: z.string().max(50).optional().nullable(),
  description: z.string().max(255).optional().nullable(),
  is_active: z
    .union([z.boolean(), z.coerce.number().int().min(0).max(1)])
    .optional(),
});

const updateModuleSchema = z
  .object({
    name: z
      .string()
      .min(3).max(50)
      .regex(/^[a-zA-Z0-9_-]+$/, 'name solo admite letras, números, _ y -')
      .optional(),
    route: z
      .string()
      .min(1).max(100)
      .startsWith('#/', 'route debe iniciar con "#/"')
      .optional(),
    icon: z.string().max(50).optional().nullable(),
    description: z.string().max(255).optional().nullable(),
    is_active: z
      .union([z.boolean(), z.coerce.number().int().min(0).max(1)])
      .optional(),
  })
  .refine((v) => Object.keys(v).length > 0, {
    message: 'Debes enviar al menos un campo',
  });

module.exports = { createModuleSchema, updateModuleSchema };
```

---

## 2. `src/controllers/security/module.controller.js`

```javascript
// src/controllers/security/module.controller.js
const { Op } = require('sequelize');
const {
  Module, RoleModulePermission, Role,
} = require('../../models');
const { ok, fail } = require('../../utils/response');

/**
 * Formato de respuesta con conteos por rol.
 */
function formatModule(mod, counts) {
  return {
    id: mod.id,
    name: mod.name,
    route: mod.route,
    icon: mod.icon,
    description: mod.description,
    is_active: mod.is_active,
    created_at: mod.created_at,
    updated_at: mod.updated_at,
    permission_count: counts?.permission_count ?? 0,
    role_count: counts?.role_count ?? 0,
  };
}

/** GET /modules */
async function list(req, res, next) {
  try {
    const { q, is_active } = req.query;
    const where = {};
    if (q) {
      where[Op.or] = [
        { name: { [Op.like]: `%${q}%` } },
        { description: { [Op.like]: `%${q}%` } },
      ];
    }
    if (is_active !== undefined) where.is_active = Number(is_active);

    const modules = await Module.findAll({
      where, order: [['id', 'ASC']],
    });

    // Conteos por módulo: filas en role_module_permission y roles distintos
    const counts = await RoleModulePermission.findAll({
      attributes: [
        'module_id',
        'permission_id',
        'role_id',
      ],
      raw: true,
    });

    const byModule = new Map();
    const rolesByModule = new Map();
    for (const c of counts) {
      byModule.set(c.module_id, (byModule.get(c.module_id) || 0) + 1);
      if (!rolesByModule.has(c.module_id)) rolesByModule.set(c.module_id, new Set());
      rolesByModule.get(c.module_id).add(c.role_id);
    }

    const data = modules.map((m) => formatModule(m, {
      permission_count: byModule.get(m.id) || 0,
      role_count: rolesByModule.get(m.id)?.size || 0,
    }));

    return ok(res, { modules: data }, 'Módulos');
  } catch (err) { return next(err); }
}

/** GET /modules/:id */
async function getOne(req, res, next) {
  try {
    const id = Number(req.params.id);
    const mod = await Module.findByPk(id);
    if (!mod) return fail(res, 'Módulo no encontrado', 404);

    // Permisos asignados agrupados por rol
    const grants = await RoleModulePermission.findAll({
      where: { module_id: id },
      include: [
        { model: Role, as: 'role', attributes: ['id', 'name'] },
      ],
    });

    const byRole = new Map();
    for (const g of grants) {
      if (!byRole.has(g.role_id)) {
        byRole.set(g.role_id, {
          role: g.role,
          permission_ids: [],
          rmp_ids: [],
        });
      }
      byRole.get(g.role_id).permission_ids.push(g.permission_id);
      byRole.get(g.role_id).rmp_ids.push(g.id);
    }

    return ok(res, {
      module: formatModule(mod, {
        permission_count: grants.length,
        role_count: byRole.size,
      }),
      assignments_by_role: Array.from(byRole.values()),
    }, 'Módulo');
  } catch (err) { return next(err); }
}

/** POST /modules */
async function create(req, res, next) {
  try {
    const { name, route, icon, description, is_active } = req.body;

    const dupName = await Module.findOne({ where: { name } });
    if (dupName) return fail(res, `Ya existe un módulo con name="${name}"`, 409);

    const dupRoute = await Module.findOne({ where: { route } });
    if (dupRoute) return fail(res, `Ya existe un módulo con route="${route}"`, 409);

    const mod = await Module.create({
      name,
      route,
      icon: icon ?? null,
      description: description ?? null,
      is_active: is_active ?? 1,
    });
    return ok(res, { module: formatModule(mod) }, 'Módulo creado', 201);
  } catch (err) { return next(err); }
}

/** PUT /modules/:id */
async function update(req, res, next) {
  try {
    const id = Number(req.params.id);
    const mod = await Module.findByPk(id);
    if (!mod) return fail(res, 'Módulo no encontrado', 404);

    if (req.body.name && req.body.name !== mod.name) {
      const dup = await Module.findOne({ where: { name: req.body.name } });
      if (dup) return fail(res, `Ya existe un módulo con name="${req.body.name}"`, 409);
    }
    if (req.body.route && req.body.route !== mod.route) {
      const dup = await Module.findOne({ where: { route: req.body.route } });
      if (dup) return fail(res, `Ya existe un módulo con route="${req.body.route}"`, 409);
    }

    await mod.update(req.body);
    return ok(res, { module: formatModule(mod) }, 'Módulo actualizado');
  } catch (err) { return next(err); }
}

/** DELETE /modules/:id */
async function remove(req, res, next) {
  try {
    const id = Number(req.params.id);
    const mod = await Module.findByPk(id);
    if (!mod) return fail(res, 'Módulo no encontrado', 404);

    // Protección: no eliminar si tiene permisos asignados a roles
    const grants = await RoleModulePermission.count({ where: { module_id: id } });
    if (grants > 0) {
      return fail(
        res,
        `No se puede eliminar: el módulo tiene ${grants} permiso(s) asignado(s) a roles. Revócalos primero.`,
        409
      );
    }

    await mod.destroy();
    return ok(res, null, 'Módulo eliminado');
  } catch (err) { return next(err); }
}

module.exports = { list, getOne, create, update, remove };
```

---

## 3. `src/controllers/security/index.js` (modificar)

```javascript
// src/controllers/security/index.js
module.exports = {
  catalog: require('./catalog.controller'),
  role: require('./role.controller'),
  user: require('./user.controller'),
  profile: require('./profile.controller'),
  module: require('./module.controller'),   // ← NUEVO
};
```

---

## 4. `src/routes/module.routes.js`

```javascript
// src/routes/module.routes.js
const { Router } = require('express');
const { authRequired } = require('../middlewares/auth.middleware');
const { permissionRequired } = require('../middlewares/permission.middleware');
const { validate } = require('../middlewares/validate.middleware');
const {
  createModuleSchema, updateModuleSchema,
} = require('../validators/module.validator');
const ctl = require('../controllers/security/module.controller');

const router = Router();

router.get('/',    authRequired, permissionRequired('Roles', 'view'),   ctl.list);
router.get('/:id', authRequired, permissionRequired('Roles', 'view'),   ctl.getOne);
router.post('/',   authRequired, permissionRequired('Roles', 'create'),
  validate(createModuleSchema), ctl.create);
router.put('/:id', authRequired, permissionRequired('Roles', 'edit'),
  validate(updateModuleSchema), ctl.update);
router.delete('/:id', authRequired, permissionRequired('Roles', 'delete'), ctl.remove);

module.exports = router;
```

---

## 5. `src/routes/index.js` (modificar)

```javascript
// src/routes/index.js
const { Router } = require('express');
const authRoutes = require('./auth.routes');
const catalogRoutes = require('./catalog.routes');
const roleRoutes = require('./role.routes');
const userRoutes = require('./user.routes');
const profileRoutes = require('./profile.routes');
const moduleRoutes = require('./module.routes');

const router = Router();

router.get('/health', (req, res) => {
  res.json({ success: true, message: 'Router /api/v1 operativo' });
});

router.use('/auth', authRoutes);
router.use('/catalogs', catalogRoutes);
router.use('/roles', roleRoutes);
router.use('/users', userRoutes);
router.use('/profiles', profileRoutes);
router.use('/modules', moduleRoutes);

module.exports = router;
```

---

## 6. Postman — carpeta `Modules`

Añade al array `item` (después de `Profiles`):

```json
{
  "name": "Modules",
  "item": [
    {
      "name": "Listar módulos",
      "request": {
        "method": "GET",
        "header": [{ "key": "Authorization", "value": "Bearer {{token}}" }],
        "url": "{{baseUrl}}/modules"
      }
    },
    {
      "name": "Listar solo activos",
      "request": {
        "method": "GET",
        "header": [{ "key": "Authorization", "value": "Bearer {{token}}" }],
        "url": "{{baseUrl}}/modules?is_active=1"
      }
    },
    {
      "name": "Detalle módulo 5 (PQRS)",
      "request": {
        "method": "GET",
        "header": [{ "key": "Authorization", "value": "Bearer {{token}}" }],
        "url": "{{baseUrl}}/modules/5"
      }
    },
    {
      "name": "Crear módulo Reportes",
      "request": {
        "method": "POST",
        "header": [
          { "key": "Content-Type", "value": "application/json" },
          { "key": "Authorization", "value": "Bearer {{token}}" }
        ],
        "body": { "mode": "raw", "raw": "{\n  \"name\": \"Reportes\",\n  \"route\": \"#/reports\",\n  \"icon\": \"bi-graph-up\",\n  \"description\": \"Reportes del sistema\"\n}" },
        "url": "{{baseUrl}}/modules"
      },
      "event": [{ "listen": "test", "script": { "exec": [
        "const b = pm.response.json();",
        "if (b.data && b.data.module && b.data.module.id) pm.collectionVariables.set('moduleId', String(b.data.module.id));"
      ]}}]
    },
    {
      "name": "Crear duplicado name → 409",
      "request": {
        "method": "POST",
        "header": [
          { "key": "Content-Type", "value": "application/json" },
          { "key": "Authorization", "value": "Bearer {{token}}" }
        ],
        "body": { "mode": "raw", "raw": "{\"name\":\"Reportes\",\"route\":\"#/reports2\"}" },
        "url": "{{baseUrl}}/modules"
      }
    },
    {
      "name": "Crear duplicado route → 409",
      "request": {
        "method": "POST",
        "header": [
          { "key": "Content-Type", "value": "application/json" },
          { "key": "Authorization", "value": "Bearer {{token}}" }
        ],
        "body": { "mode": "raw", "raw": "{\"name\":\"Reportes2\",\"route\":\"#/reports\"}" },
        "url": "{{baseUrl}}/modules"
      }
    },
    {
      "name": "Editar módulo Reportes",
      "request": {
        "method": "PUT",
        "header": [
          { "key": "Content-Type", "value": "application/json" },
          { "key": "Authorization", "value": "Bearer {{token}}" }
        ],
        "body": { "mode": "raw", "raw": "{\"description\":\"Reportes v2\"}" },
        "url": "{{baseUrl}}/modules/{{moduleId}}"
      }
    },
    {
      "name": "Eliminar módulo Reportes",
      "request": {
        "method": "DELETE",
        "header": [{ "key": "Authorization", "value": "Bearer {{token}}" }],
        "url": "{{baseUrl}}/modules/{{moduleId}}"
      }
    },
    {
      "name": "Eliminar módulo PQRS (con permisos) → 409",
      "request": {
        "method": "DELETE",
        "header": [{ "key": "Authorization", "value": "Bearer {{token}}" }],
        "url": "{{baseUrl}}/modules/5"
      }
    },
    {
      "name": "juan intenta listar módulos → 403",
      "request": {
        "method": "GET",
        "header": [{ "key": "Authorization", "value": "Bearer {{token}}" }],
        "url": "{{baseUrl}}/modules"
      }
    }
  ]
}
```

Añade en `variable`:

```json
{ "key": "moduleId", "value": "" }
```

---

## 🧪 Verificación del sub-paso 2.6 (10 pruebas)

Asumo servidor corriendo, `$token`/`$h` cargados del admin y `$hj` de juan.

### M1 — Listar módulos (admin)

```powershell
Invoke-RestMethod -Uri http://localhost:3000/api/v1/modules -Headers $h | ConvertTo-Json -Depth 5
```

**Esperado:** 5 módulos, cada uno con `permission_count` (admin tiene 21 en total distribuidos: Dashboard 2, Usuarios 6, Roles 5, Perfiles 4, PQRS 6) y `role_count` (1 en admin + 1 en user para PQRS y Dashboard según el seed).

> **Nota:** los conteos exactos dependen del estado actual. Solo verifica que `permission_count` no sea 0 en módulos que el admin usa.

### M2 — Solo activos

```powershell
Invoke-RestMethod -Uri "http://localhost:3000/api/v1/modules?is_active=1" -Headers $h | ConvertTo-Json -Depth 3
```

**Esperado:** los 5 módulos (todos activos hoy).

### M3 — Detalle módulo 5 (PQRS)

```powershell
Invoke-RestMethod -Uri http://localhost:3000/api/v1/modules/5 -Headers $h | ConvertTo-Json -Depth 6
```

**Esperado:** `module.name: "PQRS"`, `permission_count: 6`, `role_count: 2` (admin y user tienen PQRS+view, admin también create/edit/delete/print/download). `assignments_by_role` con 2 entradas (role admin y role user).

### M4 — Crear módulo `Reportes`

```powershell
$body = @{
  name = 'Reportes'
  route = '#/reports'
  icon = 'bi-graph-up'
  description = 'Reportes del sistema'
} | ConvertTo-Json
Invoke-RestMethod -Method POST -Uri http://localhost:3000/api/v1/modules -Headers $h -Body $body -ContentType 'application/json' | ConvertTo-Json -Depth 5
```

**Esperado:** `success:true`, `module.id: 6`. **Guarda `$moduleId = 6`**.

### M5 — Duplicado de name → 409

```powershell
$body = @{ name = 'Reportes'; route = '#/reports2' } | ConvertTo-Json
try {
  Invoke-RestMethod -Method POST -Uri http://localhost:3000/api/v1/modules -Headers $h -Body $body -ContentType 'application/json'
} catch { $_.ErrorDetails.Message }
```

**Esperado:** `409 Ya existe un módulo con name="Reportes"`.

### M6 — Duplicado de route → 409

```powershell
$body = @{ name = 'Reportes2'; route = '#/reports' } | ConvertTo-Json
try {
  Invoke-RestMethod -Method POST -Uri http://localhost:3000/api/v1/modules -Headers $h -Body $body -ContentType 'application/json'
} catch { $_.ErrorDetails.Message }
```

**Esperado:** `409 Ya existe un módulo con route="#/reports"`.

### M7 — Editar módulo Reportes

```powershell
$body = @{ description = 'Reportes v2' } | ConvertTo-Json
Invoke-RestMethod -Method PUT -Uri http://localhost:3000/api/v1/modules/6 -Headers $h -Body $body -ContentType 'application/json' | ConvertTo-Json -Depth 5
```

**Esperado:** `description: "Reportes v2"`.

### M8 — Eliminar módulo Reportes

```powershell
Invoke-RestMethod -Method DELETE -Uri http://localhost:3000/api/v1/modules/6 -Headers $h | ConvertTo-Json
```

**Esperado:** `success:true`, `"Módulo eliminado"`.

### M9 — Eliminar módulo PQRS (con permisos) → 409

```powershell
try {
  Invoke-RestMethod -Method DELETE -Uri http://localhost:3000/api/v1/modules/5 -Headers $h
} catch { $_.ErrorDetails.Message }
```

**Esperado:** `409 No se puede eliminar: el módulo tiene N permiso(s) asignado(s) a roles. Revócalos primero.`

### M10 — juan no puede listar módulos → 403

```powershell
try {
  Invoke-RestMethod -Uri http://localhost:3000/api/v1/modules -Headers $hj
} catch { $_.ErrorDetails.Message }
```

**Esperado:** `403 Acceso denegado. Tu rol activo no tiene el permiso "view" sobre "Roles".`

---

## 🚦 Criterios para cerrar 2.6

- **2.5 cerrado**
- **Paso 2 (Módulo Seguridad) completo** 🎉
- Pasamos a **2.6 — Cierre del Paso 2**:
  - Swagger final con todos los endpoints de seguridad documentados.
  - Postman final consolidado.
  - README actualizado con la tabla de endpoints y permisos.
  - Resumen ejecutivo del estado del backend.
- Después, **Paso 3 — Módulo PQRS** (el corazón funcional del sistema: crear PQRS con tracking, asignar, responder, cerrar, notas internas).

# ✅ Definiciones cerradas — Ajustes previos en el Backend

Ajuste de **2 endpoints nuevos** y **1 normalización** en el backend antes de arrancar el front.

---

## 🛠️ Ajustes Backend antes del Front

### Ajuste 1 — `GET /auth/permissions` (permisos del rol activo)

**Nuevo endpoint** que devuelve todos los permisos del rol activo. Formato:

```json
{
  "success": true,
  "message": "Permisos del rol activo",
  "data": {
    "role_id": 1,
    "role_name": "admin",
    "permissions": [
      { "module": "Dashboard", "permissions": ["view", "print"] },
      { "module": "Usuarios", "permissions": ["view","create","edit","delete","print","download"] }
    ],
    "flat": ["Dashboard.view","Dashboard.print","Usuarios.view", ...]
  }
}
```

**`flat`** es lo que el front usa para `hasPermission("Usuarios","create")`.

---

### Ajuste 2 — `GET /pqrs/stats`

**Nuevo endpoint** que devuelve las estadísticas del dashboard:

```json
{
  "success": true,
  "data": {
    "total": 12,
    "by_status": [
      { "status": "Radicada",   "color": "secondary", "count": 5 },
      { "status": "En Proceso", "color": "warning",   "count": 3 },
      { "status": "Resuelta",   "color": "success",   "count": 2 },
      { "status": "Cerrada",    "color": "dark",      "count": 2 },
      { "status": "Rechazada",  "color": "danger",    "count": 0 }
    ],
    "assigned_to_me": 2,
    "recent": [ /* últimos 5 PQRS del usuario */ ]
  }
}
```

Los datos dependen del rol activo:

- **admin/manager:** todos los PQRS.
- **user:** solo sus propios PQRS.

---

### Ajuste 3 — Normalizar `status` en `User` a string

Actualmente:

- `/users` devuelve `status: { id: 1, name: "active" }` (objeto).
- `/auth/me` devuelve `status: "active"` (string).

**Unificamos a string** en todos los endpoints. Para quien necesite el `status_id`, agregamos `status_id` al lado.

---

## 📦 Implementación de los 3 ajustes

### 1. Nuevo `src/controllers/auth/permissions.controller.js`

```javascript
// src/controllers/auth/permissions.controller.js
const {
  UserRole, Role, RoleModulePermission, Module, Permission,
} = require('../../models');
const { ok, fail } = require('../../utils/response');

/**
 * GET /auth/permissions
 * Devuelve los permisos del rol activo del usuario autenticado.
 */
async function myPermissions(req, res, next) {
  try {
    const { user_role_id } = req.auth;
    const ur = await UserRole.findOne({
      where: { id: user_role_id, status_id: 1 },
      include: [{ model: Role, as: 'role', attributes: ['id', 'name'] }],
    });
    if (!ur) return fail(res, 'El rol activo del token ya no es válido', 401);

    const rows = await RoleModulePermission.findAll({
      where: { role_id: ur.role_id },
      include: [
        { model: Module, as: 'module', attributes: ['id', 'name', 'route', 'icon'] },
        { model: Permission, as: 'permission', attributes: ['id', 'name'] },
      ],
      order: [
        [{ model: Module, as: 'module' }, 'id', 'ASC'],
        [{ model: Permission, as: 'permission' }, 'id', 'ASC'],
      ],
    });

    // Agrupar por módulo
    const byModule = new Map();
    const flat = [];
    for (const r of rows) {
      const mName = r.module.name;
      const pName = r.permission.name;
      if (!byModule.has(mName)) {
        byModule.set(mName, {
          module: { id: r.module.id, name: mName, route: r.module.route, icon: r.module.icon },
          permissions: [],
        });
      }
      byModule.get(mName).permissions.push(pName);
      flat.push(`${mName}.${pName}`);
    }

    return ok(res, {
      role_id: ur.role_id,
      role_name: ur.role?.name,
      user_role_id: ur.id,
      modules: Array.from(byModule.values()),
      flat,
    }, 'Permisos del rol activo');
  } catch (err) { return next(err); }
}

module.exports = { myPermissions };
```

### 2. Actualizar `src/controllers/auth/index.js`

```javascript
// src/controllers/auth/index.js
module.exports = {
  ...require('./auth.controller'),
  ...require('./permissions.controller'),   // ← NUEVO
};
```

### 3. Actualizar `src/routes/auth.routes.js`

Añade arriba:

```javascript
const { myPermissions } = require('../controllers/auth/permissions.controller');
```

Y antes de `module.exports = router;`:

```javascript
router.get('/permissions', authRequired, myPermissions);
```

---

### 4. Nuevo `src/controllers/pqrs/pqrsStats.controller.js`

```javascript
// src/controllers/pqrs/pqrsStats.controller.js
const { Op } = require('sequelize');
const {
  Pqrs, PqrsStatus, PqrsType, User,
} = require('../../models');
const { ok } = require('../../utils/response');

/**
 * GET /pqrs/stats
 * Estadísticas para el dashboard (filtradas según rol activo).
 */
async function stats(req, res, next) {
  try {
    const isAdmin = req.permissionContext?.role_id === 1;
    const isManager = req.permissionContext?.role_id === 3;
    const userId = req.auth.user_id;

    // Filtro base según rol
    const baseWhere = {};
    if (!isAdmin && !isManager) {
      // Usuario regular: solo ve sus propios PQRS (creados o asignados)
      baseWhere[Op.or] = [{ user_id: userId }, { assigned_to: userId }];
    }

    // Total
    const total = await Pqrs.count({ where: baseWhere });

    // Por estado
    const statuses = await PqrsStatus.findAll({ order: [['id', 'ASC']] });
    const by_status = await Promise.all(statuses.map(async (s) => ({
      status: s.name,
      color: s.color,
      count: await Pqrs.count({
        where: { ...baseWhere, pqrs_status_id: s.id },
      }),
    })));

    // Asignados a mí (solo staff)
    const assigned_to_me = isAdmin || isManager
      ? await Pqrs.count({ where: { assigned_to: userId } })
      : 0;

    // Últimos 5
    const recent = await Pqrs.findAll({
      where: baseWhere,
      include: [
        { model: PqrsStatus, as: 'status', attributes: ['id', 'name', 'color'] },
        { model: PqrsType, as: 'type', attributes: ['id', 'name'] },
        { model: User, as: 'creator', attributes: ['id', 'username'] },
      ],
      order: [['created_at', 'DESC']],
      limit: 5,
    });

    return ok(res, {
      total,
      by_status,
      assigned_to_me,
      recent: recent.map((p) => ({
        id: p.id,
        tracking_number: p.tracking_number,
        subject: p.subject,
        created_at: p.created_at,
        status: p.status,
        type: p.type,
        creator: p.creator,
      })),
    }, 'Estadísticas PQRS');
  } catch (err) { return next(err); }
}

module.exports = { stats };
```

### 5. Actualizar `src/controllers/pqrs/index.js`

```javascript
module.exports = {
  pqrs: require('./pqrs.controller'),
  response: require('./response.controller'),
  stats: require('./pqrsStats.controller'),   // ← NUEVO
};
```

### 6. Actualizar `src/routes/pqrs/pqrs.routes.js`

Añade arriba:

```javascript
const statsCtl = require('../../controllers/pqrs/pqrsStats.controller');
```

Y **antes de `router.get('/:id', ...)`** (importante, porque `/:id` capturaría `/stats`):

```javascript
router.get('/stats',
  authRequired, permissionRequired('PQRS', 'view'), statsCtl.stats);
```

> ⚠️ **Orden crítico:** `/stats` debe registrarse **antes** que `/:id`. Si `/:id` viene primero, `/stats` cae en `Number("stats") = NaN` y da 500. Verifica el orden en el archivo.

---

### 7. Normalización de `status` en `User`

Actualiza **`src/services/user.service.js`** (el `formatUser`):

```javascript
function formatUser(user) {
  const json = user.toJSON();
  return {
    id: json.id,
    username: json.username,
    email: json.email,
    last_login: json.last_login,
    created_at: json.created_at,
    updated_at: json.updated_at,
    status: json.status?.name || null,          // string
    status_id: json.status_id,                  // ← también el id
    profile: json.profile || null,
    roles: (json.user_roles || []).map((ur) => ({
      user_role_id: ur.id,
      role_id: ur.role_id,
      name: ur.role?.name || null,
      description: ur.role?.description || null,
      status: ur.status?.name || null,          // string
      status_id: ur.status_id,
      is_active: ur.status_id === 1,
    })),
  };
}
```

Y en **`src/controllers/security/user.controller.js`**, todas las respuestas que devuelven `formatUser` quedan unificadas. **No hay que cambiar más**.

### 8. Postman Actualizado

```JSON
{
  "info": {
    "name": "PQRS API",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "variable": [
    { "key": "baseUrl", "value": "http://localhost:3000/api/v1" },
    { "key": "token", "value": "" },
    { "key": "roleId", "value": "" },
    { "key": "rmpId", "value": "" },
    { "key": "newUserId", "value": "" },
    { "key": "urId", "value": "" },
    { "key": "moduleId", "value": "" },
    { "key": "pqrsId", "value": "" }
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
          "name": "Login carlos (manager)",
          "request": {
            "method": "POST",
            "header": [{ "key": "Content-Type", "value": "application/json" }],
            "body": { "mode": "raw", "raw": "{\"username\":\"carlos\",\"password\":\"carlos123\"}" },
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
        },
        {
          "name": "Select role",
          "request": {
            "method": "POST",
            "header": [
              { "key": "Content-Type", "value": "application/json" },
              { "key": "Authorization", "value": "Bearer {{token}}" }
            ],
            "body": { "mode": "raw", "raw": "{\"user_role_id\": 1}" },
            "url": "{{baseUrl}}/auth/select-role"
          }
        },
        {
          "name": "Mis permisos (rol activo)",
          "request": {
            "method": "GET",
            "header": [{ "key": "Authorization", "value": "Bearer {{token}}" }],
            "url": "{{baseUrl}}/auth/permissions"
          }
        }
      ]
    },
    {
      "name": "Catálogos",
      "item": [
        { "name": "Permissions", "request": { "method": "GET", "header": [{ "key": "Authorization", "value": "Bearer {{token}}" }], "url": "{{baseUrl}}/catalogs/permissions" } },
        { "name": "Modules",     "request": { "method": "GET", "header": [{ "key": "Authorization", "value": "Bearer {{token}}" }], "url": "{{baseUrl}}/catalogs/modules" } },
        { "name": "User status", "request": { "method": "GET", "header": [{ "key": "Authorization", "value": "Bearer {{token}}" }], "url": "{{baseUrl}}/catalogs/user-status" } },
        { "name": "Document types", "request": { "method": "GET", "header": [{ "key": "Authorization", "value": "Bearer {{token}}" }], "url": "{{baseUrl}}/catalogs/document-types" } },
        { "name": "PQRS types",  "request": { "method": "GET", "header": [{ "key": "Authorization", "value": "Bearer {{token}}" }], "url": "{{baseUrl}}/catalogs/pqrs-types" } },
        { "name": "PQRS status", "request": { "method": "GET", "header": [{ "key": "Authorization", "value": "Bearer {{token}}" }], "url": "{{baseUrl}}/catalogs/pqrs-status" } }
      ]
    },
    {
      "name": "Roles",
      "item": [
        { "name": "Listar roles", "request": { "method": "GET", "header": [{ "key": "Authorization", "value": "Bearer {{token}}" }], "url": "{{baseUrl}}/roles" } },
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
        { "name": "Detalle rol", "request": { "method": "GET", "header": [{ "key": "Authorization", "value": "Bearer {{token}}" }], "url": "{{baseUrl}}/roles/{{roleId}}" } },
        { "name": "Editar rol", "request": { "method": "PUT", "header": [{ "key": "Content-Type", "value": "application/json" },{ "key": "Authorization", "value": "Bearer {{token}}" }], "body": { "mode": "raw", "raw": "{\"description\":\"Editado\"}" }, "url": "{{baseUrl}}/roles/{{roleId}}" } },
        { "name": "Eliminar rol", "request": { "method": "DELETE", "header": [{ "key": "Authorization", "value": "Bearer {{token}}" }], "url": "{{baseUrl}}/roles/{{roleId}}" } },
        { "name": "Matriz permisos", "request": { "method": "GET", "header": [{ "key": "Authorization", "value": "Bearer {{token}}" }], "url": "{{baseUrl}}/roles/{{roleId}}/permissions" } },
        {
          "name": "Asignar permiso",
          "request": {
            "method": "POST",
            "header": [{ "key": "Content-Type", "value": "application/json" },{ "key": "Authorization", "value": "Bearer {{token}}" }],
            "body": { "mode": "raw", "raw": "{\"module_id\":1,\"permission_id\":1}" },
            "url": "{{baseUrl}}/roles/{{roleId}}/permissions"
          },
          "event": [{ "listen": "test", "script": { "exec": [
            "const b = pm.response.json();",
            "if (b.data && b.data.rmp_id) pm.collectionVariables.set('rmpId', String(b.data.rmp_id));"
          ]}}]
        },
        { "name": "Revocar permiso", "request": { "method": "DELETE", "header": [{ "key": "Authorization", "value": "Bearer {{token}}" }], "url": "{{baseUrl}}/roles/{{roleId}}/permissions/{{rmpId}}" } }
      ]
    },
    {
      "name": "Users",
      "item": [
        { "name": "Listar usuarios", "request": { "method": "GET", "header": [{ "key": "Authorization", "value": "Bearer {{token}}" }], "url": "{{baseUrl}}/users" } },
        {
          "name": "Verificar status string (normalización)",
          "request": { "method": "GET", "header": [{ "key": "Authorization", "value": "Bearer {{token}}" }], "url": "{{baseUrl}}/users/1" },
          "event": [{ "listen": "test", "script": { "exec": [
            "const b = pm.response.json();",
            "const s = b?.data?.user?.status;",
            "pm.test('status es string', () => pm.expect(typeof s).to.eql('string'));",
            "pm.test('status_id existe', () => pm.expect(b?.data?.user?.status_id).to.be.a('number'));"
          ]}}]
        },
        {
          "name": "Crear usuario",
          "request": {
            "method": "POST",
            "header": [{ "key": "Content-Type", "value": "application/json" },{ "key": "Authorization", "value": "Bearer {{token}}" }],
            "body": { "mode": "raw", "raw": "{\n  \"username\": \"maria\",\n  \"email\": \"maria@pqrs.com\",\n  \"password\": \"maria123\",\n  \"role_id\": 2,\n  \"profile\": {\n    \"first_name\": \"María\", \"last_name\": \"Gómez\",\n    \"document_type_id\": 1, \"document_number\": \"87654321\"\n  }\n}" },
            "url": "{{baseUrl}}/users"
          },
          "event": [{ "listen": "test", "script": { "exec": [
            "const b = pm.response.json();",
            "if (b.data && b.data.user && b.data.user.id) pm.collectionVariables.set('newUserId', String(b.data.user.id));"
          ]}}]
        },
        { "name": "Detalle usuario", "request": { "method": "GET", "header": [{ "key": "Authorization", "value": "Bearer {{token}}" }], "url": "{{baseUrl}}/users/{{newUserId}}" } },
        { "name": "Editar usuario", "request": { "method": "PUT", "header": [{ "key": "Content-Type", "value": "application/json" },{ "key": "Authorization", "value": "Bearer {{token}}" }], "body": { "mode": "raw", "raw": "{\"email\":\"maria.editada@pqrs.com\"}" }, "url": "{{baseUrl}}/users/{{newUserId}}" } },
        { "name": "Cambiar estado", "request": { "method": "PATCH", "header": [{ "key": "Content-Type", "value": "application/json" },{ "key": "Authorization", "value": "Bearer {{token}}" }], "body": { "mode": "raw", "raw": "{\"status_id\":3}" }, "url": "{{baseUrl}}/users/{{newUserId}}/status" } },
        { "name": "Cambiar password", "request": { "method": "PATCH", "header": [{ "key": "Content-Type", "value": "application/json" },{ "key": "Authorization", "value": "Bearer {{token}}" }], "body": { "mode": "raw", "raw": "{\"new_password\":\"maria456\"}" }, "url": "{{baseUrl}}/users/{{newUserId}}/password" } },
        { "name": "Roles del usuario", "request": { "method": "GET", "header": [{ "key": "Authorization", "value": "Bearer {{token}}" }], "url": "{{baseUrl}}/users/{{newUserId}}/roles" } },
        {
          "name": "Asignar rol",
          "request": {
            "method": "POST",
            "header": [{ "key": "Content-Type", "value": "application/json" },{ "key": "Authorization", "value": "Bearer {{token}}" }],
            "body": { "mode": "raw", "raw": "{\"role_id\":3}" },
            "url": "{{baseUrl}}/users/{{newUserId}}/roles"
          },
          "event": [{ "listen": "test", "script": { "exec": [
            "const b = pm.response.json();",
            "if (b.data && b.data.user_role_id) pm.collectionVariables.set('urId', String(b.data.user_role_id));"
          ]}}]
        },
        { "name": "Revocar rol", "request": { "method": "DELETE", "header": [{ "key": "Authorization", "value": "Bearer {{token}}" }], "url": "{{baseUrl}}/users/{{newUserId}}/roles/{{urId}}" } },
        { "name": "Eliminar usuario", "request": { "method": "DELETE", "header": [{ "key": "Authorization", "value": "Bearer {{token}}" }], "url": "{{baseUrl}}/users/{{newUserId}}" } }
      ]
    },
    {
      "name": "Profiles",
      "item": [
        { "name": "Listar perfiles", "request": { "method": "GET", "header": [{ "key": "Authorization", "value": "Bearer {{token}}" }], "url": "{{baseUrl}}/profiles" } },
        { "name": "Detalle profile", "request": { "method": "GET", "header": [{ "key": "Authorization", "value": "Bearer {{token}}" }], "url": "{{baseUrl}}/profiles/1" } },
        { "name": "Mi perfil", "request": { "method": "GET", "header": [{ "key": "Authorization", "value": "Bearer {{token}}" }], "url": "{{baseUrl}}/profiles/me" } },
        { "name": "Editar mi perfil", "request": { "method": "PUT", "header": [{ "key": "Content-Type", "value": "application/json" },{ "key": "Authorization", "value": "Bearer {{token}}" }], "body": { "mode": "raw", "raw": "{\"phone\":\"3111111111\"}" }, "url": "{{baseUrl}}/profiles/me" } },
        { "name": "Perfil del usuario", "request": { "method": "GET", "header": [{ "key": "Authorization", "value": "Bearer {{token}}" }], "url": "{{baseUrl}}/users/2/profile" } },
        { "name": "Editar perfil del usuario", "request": { "method": "PUT", "header": [{ "key": "Content-Type", "value": "application/json" },{ "key": "Authorization", "value": "Bearer {{token}}" }], "body": { "mode": "raw", "raw": "{\"address\":\"Nueva dir 123\"}" }, "url": "{{baseUrl}}/users/2/profile" } }
      ]
    },
    {
      "name": "Modules",
      "item": [
        { "name": "Listar módulos", "request": { "method": "GET", "header": [{ "key": "Authorization", "value": "Bearer {{token}}" }], "url": "{{baseUrl}}/modules" } },
        {
          "name": "Crear módulo",
          "request": {
            "method": "POST",
            "header": [{ "key": "Content-Type", "value": "application/json" },{ "key": "Authorization", "value": "Bearer {{token}}" }],
            "body": { "mode": "raw", "raw": "{\"name\":\"Reportes\",\"route\":\"#/reports#/reports\",\"icon\":\"bi-graph-up\",\"description\":\"Reportes del sistema\"}" },
            "url": "{{baseUrl}}/modules"
          },
          "event": [{ "listen": "test", "script": { "exec": [
            "const b = pm.response.json();",
            "if (b.data && b.data.module && b.data.module.id) pm.collectionVariables.set('moduleId', String(b.data.module.id));"
          ]}}]
        },
        { "name": "Detalle módulo", "request": { "method": "GET", "header": [{ "key": "Authorization", "value": "Bearer {{token}}" }], "url": "{{baseUrl}}/modules/{{moduleId}}" } },
        { "name": "Editar módulo", "request": { "method": "PUT", "header": [{ "key": "Content-Type", "value": "application/json" },{ "key": "Authorization", "value": "Bearer {{token}}" }], "body": { "mode": "raw", "raw": "{\"description\":\"Reportes v2\"}" }, "url": "{{baseUrl}}/modules/{{moduleId}}" } },
        { "name": "Eliminar módulo", "request": { "method": "DELETE", "header": [{ "key": "Authorization", "value": "Bearer {{token}}" }], "url": "{{baseUrl}}/modules/{{moduleId}}" } }
      ]
    },
    {
      "name": "PQRS",
      "item": [
        { "name": "Stats del dashboard", "request": { "method": "GET", "header": [{ "key": "Authorization", "value": "Bearer {{token}}" }], "url": "{{baseUrl}}/pqrs/stats" } },
        { "name": "Listar PQRS", "request": { "method": "GET", "header": [{ "key": "Authorization", "value": "Bearer {{token}}" }], "url": "{{baseUrl}}/pqrs?page=1&limit=10" } },
        {
          "name": "Crear PQRS (juan)",
          "request": {
            "method": "POST",
            "header": [{ "key": "Content-Type", "value": "application/json" },{ "key": "Authorization", "value": "Bearer {{token}}" }],
            "body": { "mode": "raw", "raw": "{\n  \"pqrs_type_id\": 2,\n  \"subject\": \"Falla en el sistema de facturación\",\n  \"description\": \"Al intentar descargar la factura del mes de octubre, el sistema arroja un error 500.\"\n}" },
            "url": "{{baseUrl}}/pqrs"
          },
          "event": [{ "listen": "test", "script": { "exec": [
            "const b = pm.response.json();",
            "if (b.data && b.data.pqrs && b.data.pqrs.id) pm.collectionVariables.set('pqrsId', String(b.data.pqrs.id));"
          ]}}]
        },
        { "name": "Detalle PQRS", "request": { "method": "GET", "header": [{ "key": "Authorization", "value": "Bearer {{token}}" }], "url": "{{baseUrl}}/pqrs/{{pqrsId}}" } },
        { "name": "Cambiar estado", "request": { "method": "PATCH", "header": [{ "key": "Content-Type", "value": "application/json" },{ "key": "Authorization", "value": "Bearer {{token}}" }], "body": { "mode": "raw", "raw": "{\"pqrs_status_id\": 2}" }, "url": "{{baseUrl}}/pqrs/{{pqrsId}}/status" } },
        { "name": "Asignar", "request": { "method": "PATCH", "header": [{ "key": "Content-Type", "value": "application/json" },{ "key": "Authorization", "value": "Bearer {{token}}" }], "body": { "mode": "raw", "raw": "{\"assigned_to\": 1}" }, "url": "{{baseUrl}}/pqrs/{{pqrsId}}/assign" } },
        { "name": "Eliminar PQRS", "request": { "method": "DELETE", "header": [{ "key": "Authorization", "value": "Bearer {{token}}" }], "url": "{{baseUrl}}/pqrs/{{pqrsId}}" } },
        {
          "name": "Responses",
          "item": [
            { "name": "Listar respuestas", "request": { "method": "GET", "header": [{ "key": "Authorization", "value": "Bearer {{token}}" }], "url": "{{baseUrl}}/pqrs/{{pqrsId}}/responses" } },
            { "name": "Crear respuesta pública", "request": { "method": "POST", "header": [{ "key": "Content-Type", "value": "application/json" },{ "key": "Authorization", "value": "Bearer {{token}}" }], "body": { "mode": "raw", "raw": "{\"message\":\"Aquí va mi respuesta\"}" }, "url": "{{baseUrl}}/pqrs/{{pqrsId}}/responses" } },
            { "name": "Crear nota interna", "request": { "method": "POST", "header": [{ "key": "Content-Type", "value": "application/json" },{ "key": "Authorization", "value": "Bearer {{token}}" }], "body": { "mode": "raw", "raw": "{\"message\":\"Nota solo para staff\",\"is_internal\":1}" }, "url": "{{baseUrl}}/pqrs/{{pqrsId}}/responses" } }
          ]
        }
      ]
    }
  ]
}
```

## ✅ Verificación de los 3 ajustes (5 pruebas)

### V1 — `GET /auth/permissions` con admin

```powershell
Invoke-RestMethod -Uri http://localhost:3000/api/v1/auth/permissions -Headers $h | ConvertTo-Json -Depth 6
```

**Esperado:**

- `role_name: "admin"`
- `modules`: 5 (Dashboard, Usuarios, Roles, Perfiles, PQRS).
- `flat`: 21 strings como `"Dashboard.view"`, `"Usuarios.create"`, etc.

### V2 — `GET /auth/permissions` con juan

```powershell
Invoke-RestMethod -Uri http://localhost:3000/api/v1/auth/permissions -Headers $hj | ConvertTo-Json -Depth 6
```

**Esperado:**

- `role_name: "user"`
- `modules`: Dashboard, PQRS.
- `flat`: `["Dashboard.view","PQRS.view","PQRS.create"]`.

### V3 — `GET /pqrs/stats` con admin

```powershell
Invoke-RestMethod -Uri http://localhost:3000/api/v1/pqrs/stats -Headers $h | ConvertTo-Json -Depth 6
```

**Esperado:** `total`, `by_status` (5 estados), `assigned_to_me`, `recent` (últimos 5).

### V4 — `GET /pqrs/stats` con juan

```powershell
Invoke-RestMethod -Uri http://localhost:3000/api/v1/pqrs/stats -Headers $hj | ConvertTo-Json -Depth 6
```

**Esperado:** `total` solo de los PQRS de juan; `assigned_to_me: 0`.

### V5 — `status` string en `/users`

```powershell
Invoke-RestMethod -Uri http://localhost:3000/api/v1/users -Headers $h | ConvertTo-Json -Depth 4
```

**Esperado:** `"status": "active"` (string, no objeto) + `"status_id": 1`. Y en cada rol, `"status": "active"`.

---

## 🎯 Lo que viene después de validar

Con V1–V5 en verde, el backend queda **100% listo para el front**, con:

- Endpoint de permisos (`/auth/permissions`) → `usePermission(module, perm)` en React.
- Endpoint de stats (`/pqrs/stats`) → dashboard en 1 sola request.
- `status` como string en todas las respuestas de usuario → UI consistente.

**Pégame las 5 verificaciones** y en el siguiente mensaje arrancamos **oficialmente el Frontend React**:

- `npm create vite@latest pqrs-frontend -- --template react`
- Instalación de deps.
- `axiosClient.js` con interceptors (Bearer + 401).
- `AuthContext` (login, me, selectRole, permissions).
- `PrivateRoute` + `PermissionRoute`.
- `LoginPage` con React-Bootstrap.
- `Layout` con `Navbar` + `Sidebar` dinámicos por permisos.
- `DashboardPage` con las stats.
- `SelectRoleModal` (dropdown en Navbar).

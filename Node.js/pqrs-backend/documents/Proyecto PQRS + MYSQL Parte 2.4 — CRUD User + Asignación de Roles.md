# ✅ Sub-paso 2.3 cerrado — CRUD Roles funcionando

12/12 verificaciones en verde. El esquema de permisos por rol funciona al 100%:

- **Admin** ve su matriz 21/30, `permission_count: 21`.
- **`tester`** creado, permiso asignado, matriz 1/30, revocado, rol eliminado.
- **Duplicados** bloqueados (409).
- **Rol con asignaciones activas** no se puede eliminar (409).
- **juan** sin `Roles+view` → 403 con mensaje claro.

**2.3 cerrado.** ✅

---

## 📦 Sub-paso 2.4 — CRUD Users + asignación de roles

Es el módulo más completo del Paso 2. Une todo: `User` + `Profile` + `UserRole` + herencia de permisos por rol.

---

## 📋 Plan de endpoints (2.4)

| Método | Ruta                       | Permiso               | Descripción                                    |
| ------- | -------------------------- | --------------------- | ----------------------------------------------- |
| GET     | `/users`                 | `Usuarios + view`   | Listar con perfil, roles, estado                |
| GET     | `/users/:id`             | `Usuarios + view`   | Detalle completo                                |
| POST    | `/users`                 | `Usuarios + create` | Crear usuario + perfil + rol inicial (atómico) |
| PUT     | `/users/:id`             | `Usuarios + edit`   | Editar datos básicos (username, email)         |
| PATCH   | `/users/:id/status`      | `Usuarios + edit`   | Activar/desactivar/suspender                    |
| PATCH   | `/users/:id/password`    | `Usuarios + edit`   | Reset de contraseña (por admin)                |
| DELETE  | `/users/:id`             | `Usuarios + delete` | Eliminar usuario (cascade)                      |
| GET     | `/users/:id/roles`       | `Usuarios + view`   | Roles del usuario (`user_role`)               |
| POST    | `/users/:id/roles`       | `Usuarios + edit`   | Asignar rol → crea `user_role` activo        |
| DELETE  | `/users/:id/roles/:urId` | `Usuarios + edit`   | Desactivar asignación de rol                   |

> **Decisión de diseño:** al **eliminar un `user_role`** no borramos la fila (perdemos histórico). En su lugar, cambiamos `status_id` a `2` (inactive). En el `POST /users/:id/roles` si ya existe un `user_role` inactive para ese par, **lo reactivamos** en lugar de crear otro. Esto respeta el `UNIQUE (user_id, role_id)` de tu tabla.

---

## 📁 Archivos a crear (6)

| Archivo                                         | Acción                       |
| ----------------------------------------------- | ----------------------------- |
| `src/validators/user.validator.js`            | CREAR                         |
| `src/services/user.service.js`                | CREAR                         |
| `src/controllers/security/user.controller.js` | CREAR                         |
| `src/controllers/security/index.js`           | MODIFICAR (agregar `user`)  |
| `src/routes/user.routes.js`                   | CREAR                         |
| `src/routes/index.js`                         | MODIFICAR (montar `/users`) |
| `postman/PQRS.postman_collection.json`        | MODIFICAR (carpeta Users)     |

---

## 1. `src/validators/user.validator.js`

```javascript
// src/validators/user.validator.js
const { z } = require('zod');

// --- Esquema anidado de perfil ---
const profileSchema = z.object({
  first_name: z.string().min(1).max(50),
  last_name: z.string().min(1).max(50),
  address: z.string().max(255).optional().nullable(),
  phone: z.string().max(20).optional().nullable(),
  document_type_id: z.coerce.number().int().positive(),
  document_number: z.string().min(3).max(50),
  photo_url: z.string().max(255).url().optional().nullable(),
  birth_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato YYYY-MM-DD').optional().nullable(),
});

// --- Crear usuario: user + profile + rol inicial ---
const createUserSchema = z.object({
  username: z
    .string()
    .min(3).max(50)
    .regex(/^[a-zA-Z0-9._-]+$/, 'Solo letras, números, . _ -'),
  email: z.string().email().max(100).optional().nullable(),
  password: z.string().min(6, 'password mínimo 6').max(100),
  status_id: z.coerce.number().int().positive().optional(),
  role_id: z.coerce.number().int().positive(),   // rol inicial (obligatorio)
  profile: profileSchema,
});

// --- Editar datos básicos (username, email, status_id) ---
const updateUserSchema = z
  .object({
    username: z
      .string()
      .min(3).max(50)
      .regex(/^[a-zA-Z0-9._-]+$/, 'Solo letras, números, . _ -')
      .optional(),
    email: z.string().email().max(100).optional().nullable(),
    status_id: z.coerce.number().int().positive().optional(),
  })
  .refine((v) => Object.keys(v).length > 0, {
    message: 'Debes enviar al menos un campo',
  });

const changeStatusSchema = z.object({
  status_id: z.coerce.number().int().positive(),
});

const changePasswordSchema = z.object({
  new_password: z.string().min(6, 'new_password mínimo 6').max(100),
});

const assignRoleSchema = z.object({
  role_id: z.coerce.number().int().positive(),
});

module.exports = {
  createUserSchema,
  updateUserSchema,
  changeStatusSchema,
  changePasswordSchema,
  assignRoleSchema,
};
```

---

## 2. `src/services/user.service.js`

```javascript
// src/services/user.service.js
const {
  User, UserRole, Role, UserStatus, Profile, DocumentType,
} = require('../models');

/** Include estándar para "detalle de usuario". */
function userDetailInclude() {
  return [
    { model: UserStatus, as: 'status', attributes: ['id', 'name'] },
    {
      model: Profile, as: 'profile',
      include: [{ model: DocumentType, as: 'document_type', attributes: ['id', 'name'] }],
    },
    {
      model: UserRole, as: 'user_roles',
      include: [
        { model: Role, as: 'role', attributes: ['id', 'name', 'description'] },
        { model: UserStatus, as: 'status', attributes: ['id', 'name'] },
      ],
    },
  ];
}

/** Formato de respuesta compacto. */
function formatUser(user) {
  const json = user.toJSON();
  return {
    id: json.id,
    username: json.username,
    email: json.email,
    last_login: json.last_login,
    created_at: json.created_at,
    updated_at: json.updated_at,
    status: json.status,
    profile: json.profile || null,
    roles: (json.user_roles || []).map((ur) => ({
      user_role_id: ur.id,
      role_id: ur.role_id,
      name: ur.role?.name || null,
      description: ur.role?.description || null,
      status: ur.status?.name || null,
      is_active: ur.status_id === 1,
    })),
  };
}

module.exports = { userDetailInclude, formatUser };
```

---

## 3. `src/controllers/security/user.controller.js`

```javascript
// src/controllers/security/user.controller.js
const { Op } = require('sequelize');
const {
  sequelize, User, UserRole, Role, UserStatus, Profile, DocumentType,
} = require('../../models');
const { hashPassword } = require('../../utils/password');
const { ok, fail } = require('../../utils/response');
const { userDetailInclude, formatUser } = require('../../services/user.service');

/* ============================================================
 * Helpers internos
 * ============================================================ */

async function findUserOr404(id, res) {
  const user = await User.findByPk(id, { include: userDetailInclude() });
  if (!user) {
    fail(res, 'Usuario no encontrado', 404);
    return null;
  }
  return user;
}

/**
 * Asegura que exista un user_role activo para (user_id, role_id).
 * Si existe inactivo, lo reactiva.
 */
async function ensureUserRoleActive(user_id, role_id, { transaction } = {}) {
  const existing = await UserRole.findOne({
    where: { user_id, role_id },
    transaction,
  });
  if (existing) {
    if (existing.status_id !== 1) {
      await existing.update({ status_id: 1 }, { transaction });
    }
    return { user_role: existing, created: false };
  }
  const created = await UserRole.create(
    { user_id, role_id, status_id: 1 },
    { transaction }
  );
  return { user_role: created, created: true };
}

/* ============================================================
 * Endpoints
 * ============================================================ */

/** GET /users */
async function list(req, res, next) {
  try {
    const { q, status_id, role_id } = req.query;
    const where = {};
    if (q) {
      where[Op.or] = [
        { username: { [Op.like]: `%${q}%` } },
        { email: { [Op.like]: `%${q}%` } },
      ];
    }
    if (status_id) where.status_id = Number(status_id);

    const include = userDetailInclude();
    if (role_id) {
      // filtra usuarios que tengan ese rol (activo o no)
      include[2] = {
        ...include[2],
        where: { role_id: Number(role_id) },
        required: true,
      };
    }

    const users = await User.findAll({
      where, include,
      order: [['id', 'ASC']],
    });

    return ok(res, { users: users.map(formatUser) }, 'Usuarios');
  } catch (err) { return next(err); }
}

/** GET /users/:id */
async function getOne(req, res, next) {
  try {
    const user = await findUserOr404(Number(req.params.id), res);
    if (!user) return;
    return ok(res, { user: formatUser(user) }, 'Usuario');
  } catch (err) { return next(err); }
}

/** POST /users */
async function create(req, res, next) {
  const t = await sequelize.transaction();
  try {
    const { username, email, password, status_id, role_id, profile } = req.body;

    // Duplicados de username / email / documento
    const dup = await User.findOne({
      where: {
        [Op.or]: [
          { username },
          ...(email ? [{ email }] : []),
        ],
      },
      transaction: t,
    });
    if (dup) {
      await t.rollback();
      return fail(res, `Ya existe un usuario con username o email igual`, 409);
    }
    const dupDoc = await Profile.findOne({
      where: { document_number: profile.document_number },
      transaction: t,
    });
    if (dupDoc) {
      await t.rollback();
      return fail(res, 'Ya existe un perfil con ese document_number', 409);
    }

    // Rol debe existir
    const role = await Role.findByPk(role_id, { transaction: t });
    if (!role) { await t.rollback(); return fail(res, 'role_id no existe', 400); }

    // Estado por defecto = 1 (active)
    const finalStatusId = status_id ?? 1;
    const status = await UserStatus.findByPk(finalStatusId, { transaction: t });
    if (!status) { await t.rollback(); return fail(res, 'status_id no existe', 400); }

    // Crear User
    const password_hash = await hashPassword(password);
    const user = await User.create({
      username, email: email ?? null, password_hash, status_id: finalStatusId,
    }, { transaction: t });

    // Crear Profile
    await Profile.create({
      user_id: user.id,
      first_name: profile.first_name,
      last_name: profile.last_name,
      address: profile.address ?? null,
      phone: profile.phone ?? null,
      document_type_id: profile.document_type_id,
      document_number: profile.document_number,
      photo_url: profile.photo_url ?? null,
      birth_date: profile.birth_date ?? null,
    }, { transaction: t });

    // Crear UserRole activo
    await UserRole.create(
      { user_id: user.id, role_id, status_id: 1 },
      { transaction: t }
    );

    await t.commit();

    // Recargar con includes
    const full = await User.findByPk(user.id, { include: userDetailInclude() });
    return ok(res, { user: formatUser(full) }, 'Usuario creado', 201);
  } catch (err) {
    await t.rollback();
    return next(err);
  }
}

/** PUT /users/:id */
async function update(req, res, next) {
  const t = await sequelize.transaction();
  try {
    const id = Number(req.params.id);
    const user = await User.findByPk(id, { transaction: t });
    if (!user) { await t.rollback(); return fail(res, 'Usuario no encontrado', 404); }

    const { username, email, status_id } = req.body;

    if (username && username !== user.username) {
      const dup = await User.findOne({ where: { username }, transaction: t });
      if (dup) { await t.rollback(); return fail(res, 'username ya en uso', 409); }
    }
    if (email && email !== user.email) {
      const dup = await User.findOne({ where: { email }, transaction: t });
      if (dup) { await t.rollback(); return fail(res, 'email ya en uso', 409); }
    }
    if (status_id) {
      const s = await UserStatus.findByPk(status_id, { transaction: t });
      if (!s) { await t.rollback(); return fail(res, 'status_id no existe', 400); }
    }

    await user.update(
      {
        ...(username !== undefined && { username }),
        ...(email !== undefined && { email }),
        ...(status_id !== undefined && { status_id }),
      },
      { transaction: t }
    );

    await t.commit();
    const full = await User.findByPk(id, { include: userDetailInclude() });
    return ok(res, { user: formatUser(full) }, 'Usuario actualizado');
  } catch (err) {
    await t.rollback();
    return next(err);
  }
}

/** PATCH /users/:id/status */
async function changeStatus(req, res, next) {
  try {
    const id = Number(req.params.id);
    const { status_id } = req.body;
    const user = await User.findByPk(id);
    if (!user) return fail(res, 'Usuario no encontrado', 404);

    const s = await UserStatus.findByPk(status_id);
    if (!s) return fail(res, 'status_id no existe', 400);

    await user.update({ status_id });
    const full = await User.findByPk(id, { include: userDetailInclude() });
    return ok(res, { user: formatUser(full) }, `Estado cambiado a "${s.name}"`);
  } catch (err) { return next(err); }
}

/** PATCH /users/:id/password */
async function changePassword(req, res, next) {
  try {
    const id = Number(req.params.id);
    const { new_password } = req.body;
    const user = await User.findByPk(id);
    if (!user) return fail(res, 'Usuario no encontrado', 404);

    const password_hash = await hashPassword(new_password);
    await user.update({ password_hash });
    return ok(res, null, 'Contraseña actualizada');
  } catch (err) { return next(err); }
}

/** DELETE /users/:id */
async function remove(req, res, next) {
  try {
    const id = Number(req.params.id);
    if (id === req.auth.user_id) {
      return fail(res, 'No puedes eliminar tu propio usuario', 400);
    }
    const user = await User.findByPk(id);
    if (!user) return fail(res, 'Usuario no encontrado', 404);

    // Al borrar el User, ON DELETE CASCADE limpia profile, user_role, pqrs, responses
    await user.destroy();
    return ok(res, null, 'Usuario eliminado');
  } catch (err) { return next(err); }
}

/* ============================================================
 * Roles del usuario
 * ============================================================ */

/** GET /users/:id/roles */
async function listRoles(req, res, next) {
  try {
    const id = Number(req.params.id);
    const user = await User.findByPk(id);
    if (!user) return fail(res, 'Usuario no encontrado', 404);

    const rows = await UserRole.findAll({
      where: { user_id: id },
      include: [
        { model: Role, as: 'role', attributes: ['id', 'name', 'description'] },
        { model: UserStatus, as: 'status', attributes: ['id', 'name'] },
      ],
      order: [['id', 'ASC']],
    });
    return ok(res, {
      roles: rows.map((ur) => ({
        user_role_id: ur.id,
        role_id: ur.role_id,
        name: ur.role?.name,
        description: ur.role?.description,
        status: ur.status?.name,
        is_active: ur.status_id === 1,
      })),
    }, 'Roles del usuario');
  } catch (err) { return next(err); }
}

/** POST /users/:id/roles */
async function assignRole(req, res, next) {
  const t = await sequelize.transaction();
  try {
    const id = Number(req.params.id);
    const { role_id } = req.body;

    const user = await User.findByPk(id, { transaction: t });
    if (!user) { await t.rollback(); return fail(res, 'Usuario no encontrado', 404); }

    const role = await Role.findByPk(role_id, { transaction: t });
    if (!role) { await t.rollback(); return fail(res, 'role_id no existe', 400); }

    const { user_role, created } = await ensureUserRoleActive(id, role_id, { transaction: t });
    await t.commit();

    return ok(res, {
      user_role_id: user_role.id,
      role_id: user_role.role_id,
      created,
    }, created ? 'Rol asignado' : 'Rol reactivado', created ? 201 : 200);
  } catch (err) {
    await t.rollback();
    return next(err);
  }
}

/** DELETE /users/:id/roles/:urId (desactiva, no borra) */
async function revokeRole(req, res, next) {
  try {
    const userId = Number(req.params.id);
    const urId = Number(req.params.urId);

    const ur = await UserRole.findByPk(urId);
    if (!ur) return fail(res, 'Asignación no encontrada', 404);
    if (ur.user_id !== userId) {
      return fail(res, 'Esa asignación no pertenece al usuario', 400);
    }
    if (ur.status_id !== 1) {
      return ok(res, null, 'La asignación ya estaba inactiva');
    }

    // No permitir quedarse sin ningún rol activo (protege al usuario de quedar huérfano)
    const activeCount = await UserRole.count({
      where: { user_id: userId, status_id: 1 },
    });
    if (activeCount <= 1) {
      return fail(res, 'No puedes desactivar el último rol activo del usuario', 409);
    }

    await ur.update({ status_id: 2 });
    return ok(res, null, 'Asignación de rol desactivada');
  } catch (err) { return next(err); }
}

module.exports = {
  list, getOne, create, update, changeStatus, changePassword, remove,
  listRoles, assignRole, revokeRole,
};
```

---

## 4. `src/controllers/security/index.js` (modificar)

```javascript
// src/controllers/security/index.js
module.exports = {
  catalog: require('./catalog.controller'),
  role: require('./role.controller'),
  user: require('./user.controller'),   // ← NUEVO
};
```

---

## 5. `src/routes/user.routes.js`

```javascript
// src/routes/user.routes.js
const { Router } = require('express');
const { authRequired } = require('../middlewares/auth.middleware');
const { permissionRequired } = require('../middlewares/permission.middleware');
const { validate } = require('../middlewares/validate.middleware');
const {
  createUserSchema, updateUserSchema, changeStatusSchema,
  changePasswordSchema, assignRoleSchema,
} = require('../validators/user.validator');
const ctl = require('../controllers/security/user.controller');

const router = Router();

/* ===== CRUD Users ===== */
router.get('/',    authRequired, permissionRequired('Usuarios', 'view'),   ctl.list);
router.post('/',   authRequired, permissionRequired('Usuarios', 'create'),
  validate(createUserSchema), ctl.create);

router.get('/:id', authRequired, permissionRequired('Usuarios', 'view'),   ctl.getOne);
router.put('/:id', authRequired, permissionRequired('Usuarios', 'edit'),
  validate(updateUserSchema), ctl.update);
router.delete('/:id', authRequired, permissionRequired('Usuarios', 'delete'), ctl.remove);

/* ===== Acciones específicas ===== */
router.patch('/:id/status',
  authRequired, permissionRequired('Usuarios', 'edit'),
  validate(changeStatusSchema), ctl.changeStatus);

router.patch('/:id/password',
  authRequired, permissionRequired('Usuarios', 'edit'),
  validate(changePasswordSchema), ctl.changePassword);

/* ===== Roles del usuario ===== */
router.get('/:id/roles',
  authRequired, permissionRequired('Usuarios', 'view'), ctl.listRoles);

router.post('/:id/roles',
  authRequired, permissionRequired('Usuarios', 'edit'),
  validate(assignRoleSchema), ctl.assignRole);

router.delete('/:id/roles/:urId',
  authRequired, permissionRequired('Usuarios', 'edit'), ctl.revokeRole);

module.exports = router;
```

---

## 6. `src/routes/index.js` (modificar)

```javascript
// src/routes/index.js
const { Router } = require('express');
const authRoutes = require('./auth.routes');
const catalogRoutes = require('./catalog.routes');
const roleRoutes = require('./role.routes');
const userRoutes = require('./user.routes');

const router = Router();

router.get('/health', (req, res) => {
  res.json({ success: true, message: 'Router /api/v1 operativo' });
});

router.use('/auth', authRoutes);
router.use('/catalogs', catalogRoutes);
router.use('/roles', roleRoutes);
router.use('/users', userRoutes);

module.exports = router;
```

---

## 7. Postman — carpeta `Users` (añadir al JSON)

Abre `postman/PQRS.postman_collection.json` y añade este bloque **dentro** del array `item`, después de la carpeta `Roles`:

```json
{
  "name": "Users",
  "item": [
    {
      "name": "Listar usuarios",
      "request": {
        "method": "GET",
        "header": [{ "key": "Authorization", "value": "Bearer {{token}}" }],
        "url": "{{baseUrl}}/users"
      }
    },
    {
      "name": "Listar con filtro q=juan",
      "request": {
        "method": "GET",
        "header": [{ "key": "Authorization", "value": "Bearer {{token}}" }],
        "url": "{{baseUrl}}/users?q=juan"
      }
    },
    {
      "name": "Detalle usuario 2",
      "request": {
        "method": "GET",
        "header": [{ "key": "Authorization", "value": "Bearer {{token}}" }],
        "url": "{{baseUrl}}/users/2"
      }
    },
    {
      "name": "Crear usuario (con perfil + rol)",
      "request": {
        "method": "POST",
        "header": [
          { "key": "Content-Type", "value": "application/json" },
          { "key": "Authorization", "value": "Bearer {{token}}" }
        ],
        "body": { "mode": "raw", "raw": "{\n  \"username\": \"maria\",\n  \"email\": \"maria@pqrs.com\",\n  \"password\": \"maria123\",\n  \"role_id\": 2,\n  \"profile\": {\n    \"first_name\": \"María\",\n    \"last_name\": \"Gómez\",\n    \"document_type_id\": 1,\n    \"document_number\": \"87654321\",\n    \"phone\": \"3009876543\",\n    \"address\": \"Carrera 45 #12-34\"\n  }\n}" },
        "url": "{{baseUrl}}/users"
      },
      "event": [{ "listen": "test", "script": { "exec": [
        "const b = pm.response.json();",
        "if (b.data && b.data.user && b.data.user.id) pm.collectionVariables.set('newUserId', String(b.data.user.id));"
      ]}}]
    },
    {
      "name": "Editar usuario",
      "request": {
        "method": "PUT",
        "header": [
          { "key": "Content-Type", "value": "application/json" },
          { "key": "Authorization", "value": "Bearer {{token}}" }
        ],
        "body": { "mode": "raw", "raw": "{\"email\":\"maria.editada@pqrs.com\"}" },
        "url": "{{baseUrl}}/users/{{newUserId}}"
      }
    },
    {
      "name": "Cambiar estado a suspended",
      "request": {
        "method": "PATCH",
        "header": [
          { "key": "Content-Type", "value": "application/json" },
          { "key": "Authorization", "value": "Bearer {{token}}" }
        ],
        "body": { "mode": "raw", "raw": "{\"status_id\":3}" },
        "url": "{{baseUrl}}/users/{{newUserId}}/status"
      }
    },
    {
      "name": "Cambiar estado a active",
      "request": {
        "method": "PATCH",
        "header": [
          { "key": "Content-Type", "value": "application/json" },
          { "key": "Authorization", "value": "Bearer {{token}}" }
        ],
        "body": { "mode": "raw", "raw": "{\"status_id\":1}" },
        "url": "{{baseUrl}}/users/{{newUserId}}/status"
      }
    },
    {
      "name": "Cambiar password",
      "request": {
        "method": "PATCH",
        "header": [
          { "key": "Content-Type", "value": "application/json" },
          { "key": "Authorization", "value": "Bearer {{token}}" }
        ],
        "body": { "mode": "raw", "raw": "{\"new_password\":\"maria456\"}" },
        "url": "{{baseUrl}}/users/{{newUserId}}/password"
      }
    },
    {
      "name": "Listar roles del usuario",
      "request": {
        "method": "GET",
        "header": [{ "key": "Authorization", "value": "Bearer {{token}}" }],
        "url": "{{baseUrl}}/users/{{newUserId}}/roles"
      }
    },
    {
      "name": "Asignar rol manager (role_id=3)",
      "request": {
        "method": "POST",
        "header": [
          { "key": "Content-Type", "value": "application/json" },
          { "key": "Authorization", "value": "Bearer {{token}}" }
        ],
        "body": { "mode": "raw", "raw": "{\"role_id\":3}" },
        "url": "{{baseUrl}}/users/{{newUserId}}/roles"
      }
    },
    {
      "name": "Revocar rol (desactivar)",
      "request": {
        "method": "DELETE",
        "header": [{ "key": "Authorization", "value": "Bearer {{token}}" }],
        "url": "{{baseUrl}}/users/{{newUserId}}/roles/{{urId}}"
      }
    },
    {
      "name": "Eliminar usuario",
      "request": {
        "method": "DELETE",
        "header": [{ "key": "Authorization", "value": "Bearer {{token}}" }],
        "url": "{{baseUrl}}/users/{{newUserId}}"
      }
    },
    {
      "name": "juan intenta listar usuarios (403)",
      "request": {
        "method": "GET",
        "header": [{ "key": "Authorization", "value": "Bearer {{token}}" }],
        "url": "{{baseUrl}}/users"
      }
    }
  ]
}
```

También añade en `variable`:

```json
{ "key": "newUserId", "value": "" },
{ "key": "urId", "value": "" }
```

---

## 🧪 Verificación del sub-paso 2.3 (13 pruebas)

Asumo servidor corriendo y `$token` / `$h` ya cargados del login admin.

### U1 — Listar usuarios

```powershell
Invoke-RestMethod -Uri http://localhost:3000/api/v1/users -Headers $h | ConvertTo-Json -Depth 5
```

**Esperado:** 2 usuarios (`admin`, `juan`) con `profile` y `roles`. `admin` tiene `profile: null`; `juan` tiene profile completo.

### U2 — Filtro `q=juan`

```powershell
Invoke-RestMethod -Uri "http://localhost:3000/api/v1/users?q=juan" -Headers $h | ConvertTo-Json -Depth 5
```

**Esperado:** solo `juan`.

### U3 — Detalle usuario 2

```powershell
Invoke-RestMethod -Uri http://localhost:3000/api/v1/users/2 -Headers $h | ConvertTo-Json -Depth 6
```

**Esperado:** `user` con `profile` (CC, doc 12345678) y `roles: [{ role_id:2, name:"user", is_active:true }]`.

### U4 — Crear usuario `maria`

```powershell
$body = @{
  username = 'maria'
  email = 'maria@pqrs.com'
  password = 'maria123'
  role_id = 2
  profile = @{
    first_name = 'María'
    last_name = 'Gómez'
    document_type_id = 1
    document_number = '87654321'
    phone = '3009876543'
    address = 'Carrera 45 #12-34'
  }
} | ConvertTo-Json -Depth 5
Invoke-RestMethod -Method POST -Uri http://localhost:3000/api/v1/users -Headers $h -Body $body -ContentType 'application/json' | ConvertTo-Json -Depth 6
```

**Esperado:** `success:true`, `user.id: 3`, `profile.document_number: "87654321"`, `roles: [{ role_id:2, is_active:true }]`. **Guarda el `id`** (`$newUserId = 3`).

### U5 — Duplicado de username → 409

```powershell
$body = @{
  username = 'maria'; password = 'x12345'; role_id = 2
  profile = @{ first_name = 'X'; last_name = 'Y'; document_type_id = 1; document_number = '99999999' }
} | ConvertTo-Json -Depth 5
try {
  Invoke-RestMethod -Method POST -Uri http://localhost:3000/api/v1/users -Headers $h -Body $body -ContentType 'application/json'
} catch { $_.ErrorDetails.Message }
```

**Esperado:** `409 Ya existe un usuario con username o email igual`.

### U6 — Editar email de maria

```powershell
$body = @{ email = 'maria.editada@pqrs.com' } | ConvertTo-Json
Invoke-RestMethod -Method PUT -Uri http://localhost:3000/api/v1/users/3 -Headers $h -Body $body -ContentType 'application/json' | ConvertTo-Json -Depth 5
```

**Esperado:** `email` actualizado.

### U7 — Cambiar estado a `suspended`

```powershell
$body = @{ status_id = 3 } | ConvertTo-Json
Invoke-RestMethod -Method PATCH -Uri http://localhost:3000/api/v1/users/3/status -Headers $h -Body $body -ContentType 'application/json' | ConvertTo-Json -Depth 4
```

**Esperado:** `status.name: "suspended"`.

### U8 — Cambiar estado a `active`

```powershell
$body = @{ status_id = 1 } | ConvertTo-Json
Invoke-RestMethod -Method PATCH -Uri http://localhost:3000/api/v1/users/3/status -Headers $h -Body $body -ContentType 'application/json' | ConvertTo-Json -Depth 4
```

**Esperado:** `status.name: "active"`.

### U9 — Cambiar contraseña

```powershell
$body = @{ new_password = 'maria456' } | ConvertTo-Json
Invoke-RestMethod -Method PATCH -Uri http://localhost:3000/api/v1/users/3/password -Headers $h -Body $body -ContentType 'application/json' | ConvertTo-Json
```

**Esperado:** `success:true`. (Opcional: probar `login maria/maria456` → debe funcionar.)

### U10 — Listar roles de maria

```powershell
Invoke-RestMethod -Uri http://localhost:3000/api/v1/users/3/roles -Headers $h | ConvertTo-Json -Depth 5
```

**Esperado:** `roles: [{ user_role_id: <n>, role_id: 2, name: "user", is_active: true }]`.

### U11 — Asignar rol `manager` (role_id=3)

```powershell
$body = @{ role_id = 3 } | ConvertTo-Json
Invoke-RestMethod -Method POST -Uri http://localhost:3000/api/v1/users/3/roles -Headers $h -Body $body -ContentType 'application/json' | ConvertTo-Json -Depth 5
```

**Esperado:** `created: true`, `user_role_id` nuevo. Ahora maria tiene 2 roles activos.

### U12 — Revocar uno (desactivar) → 200

```powershell
# Primero obtén el user_role_id del rol manager
$roles = (Invoke-RestMethod -Uri http://localhost:3000/api/v1/users/3/roles -Headers $h).data.roles
$urManagerId = ($roles | Where-Object { $_.role_id -eq 3 }).user_role_id

Invoke-RestMethod -Method DELETE -Uri "http://localhost:3000/api/v1/users/3/roles/$urManagerId" -Headers $h | ConvertTo-Json
```

**Esperado:** `success:true`, `"Asignación de rol desactivada"`. Verifica con U10 que ahora `manager` tiene `is_active:false` y `user` sigue activo.

### U13 — Intentar desactivar el último rol activo → 409

```powershell
$urUser = ($roles | Where-Object { $_.role_id -eq 2 }).user_role_id
try {
  Invoke-RestMethod -Method DELETE -Uri "http://localhost:3000/api/v1/users/3/roles/$urUser" -Headers $h
} catch { $_.ErrorDetails.Message }
```

**Esperado:** `409 No puedes desactivar el último rol activo del usuario`.

### U14 — Eliminar maria

```powershell
Invoke-RestMethod -Method DELETE -Uri http://localhost:3000/api/v1/users/3 -Headers $h | ConvertTo-Json
```

**Esperado:** `success:true`, `"Usuario eliminado"`. Verifica con U1 que ya no aparece.

### U15 — Intentar eliminarse a sí mismo (admin) → 400

```powershell
try {
  Invoke-RestMethod -Method DELETE -Uri http://localhost:3000/api/v1/users/1 -Headers $h
} catch { $_.ErrorDetails.Message }
```

**Esperado:** `400 No puedes eliminar tu propio usuario`.

### U16 — juan no puede listar usuarios → 403

```powershell
try {
  Invoke-RestMethod -Uri http://localhost:3000/api/v1/users -Headers $hj
} catch { $_.ErrorDetails.Message }
```

**Esperado:** `403 Acceso denegado. Tu rol activo no tiene el permiso "view" sobre "Usuarios".`

---

## 🚦 Criterios para cerrar 2.3

Pégame las salidas de **U1–U16** (o **"Postman: U1–U16 OK"**). Con eso verde:

- **2.3 cerrado**
- Pasamos a **2.4 — CRUD Profiles** (editar el perfil 1:1 del usuario, subir foto, datos personales).
- Después **2.5 — CRUD Modules** (últimos 10 min del Paso 2 de seguridad).
- Y **2.6 — Cierre del Paso 2** (Swagger + Postman final + documentación).

**No damos por cerrado 2.3 sin las 16 pruebas.**

# ✅ Sub-paso 2.4 cerrado — CRUD Users funcionando

Postman 16/16 OK. El módulo de usuarios está completo:

- **Crear usuario atómico** (user + profile + user_role en una transacción).
- **Duplicados** bloqueados (username, email, document_number).
- **Edición** de datos básicos.
- **Estado** (active/inactive/suspended).
- **Password reset** por admin.
- **Asignar/revocar roles** con reactivación de `user_role` inactivos.
- **Protección** del último rol activo y de eliminarse a sí mismo.
- **juan** sin `Usuarios+view` → 403.

**2.3 cerrado.** ✅

---

## 📦 Sub-paso 2.5 — CRUD Profiles

Perfil 1:1 con `User`. Los endpoints **no crean perfiles huérfanos** (para eso está `POST /users` en 2.3). Aquí solo **leer y editar** el perfil existente.

---

## 📋 Plan de endpoints (2.5)

| Método | Ruta                   | Permiso             | Descripción                         |
| ------- | ---------------------- | ------------------- | ------------------------------------ |
| GET     | `/profiles`          | `Perfiles + view` | Listar perfiles con user + documento |
| GET     | `/profiles/:id`      | `Perfiles + view` | Detalle por `profile.id`           |
| GET     | `/users/:id/profile` | `Perfiles + view` | Obtener perfil de un usuario         |
| PUT     | `/users/:id/profile` | `Perfiles + edit` | Actualizar perfil del usuario        |
| GET     | `/profiles/me`       | (solo auth)         | Mi propio perfil (para el frontend)  |
| PUT     | `/profiles/me`       | (solo auth)         | Editar mi propio perfil              |

> **Regla:** `GET/PUT /profiles/me` **no requieren permiso de módulo** (solo `authRequired`). Cualquier usuario autenticado debe poder ver/editar **su propio** perfil, sin importar su rol. Es una excepción intencional y común en todos los sistemas.

---

## 📁 Archivos (4 nuevos/modificados)

| Archivo                                            | Acción                                                   |
| -------------------------------------------------- | --------------------------------------------------------- |
| `src/validators/profile.validator.js`            | CREAR                                                     |
| `src/controllers/security/profile.controller.js` | CREAR                                                     |
| `src/controllers/security/index.js`              | MODIFICAR (agregar `profile`)                           |
| `src/routes/profile.routes.js`                   | CREAR                                                     |
| `src/routes/index.js`                            | MODIFICAR (montar `/profiles` y `/users/:id/profile`) |
| `postman/PQRS.postman_collection.json`           | MODIFICAR (carpeta Profiles)                              |

---

## 1. `src/validators/profile.validator.js`

```javascript
// src/validators/profile.validator.js
const { z } = require('zod');

// Editar perfil completo (admin o el propio usuario)
const updateProfileSchema = z
  .object({
    first_name: z.string().min(1).max(50).optional(),
    last_name: z.string().min(1).max(50).optional(),
    address: z.string().max(255).optional().nullable(),
    phone: z.string().max(20).optional().nullable(),
    document_type_id: z.coerce.number().int().positive().optional(),
    document_number: z.string().min(3).max(50).optional(),
    photo_url: z.string().max(255).url().optional().nullable(),
    birth_date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato YYYY-MM-DD')
      .optional()
      .nullable(),
  })
  .refine((v) => Object.keys(v).length > 0, {
    message: 'Debes enviar al menos un campo para actualizar',
  });

module.exports = { updateProfileSchema };
```

---

## 2. `src/controllers/security/profile.controller.js`

```javascript
// src/controllers/security/profile.controller.js
const { Op } = require('sequelize');
const {
  Profile, User, UserStatus, DocumentType,
} = require('../../models');
const { ok, fail } = require('../../utils/response');

function profileInclude() {
  return [
    { model: User, as: 'user', attributes: ['id', 'username', 'email', 'status_id', 'last_login'] },
    { model: DocumentType, as: 'document_type', attributes: ['id', 'name', 'description'] },
  ];
}

function formatProfile(p) {
  const json = p.toJSON();
  return {
    id: json.id,
    user_id: json.user_id,
    first_name: json.first_name,
    last_name: json.last_name,
    full_name: `${json.first_name} ${json.last_name}`.trim(),
    address: json.address,
    phone: json.phone,
    document_type: json.document_type,
    document_number: json.document_number,
    photo_url: json.photo_url,
    birth_date: json.birth_date,
    created_at: json.created_at,
    updated_at: json.updated_at,
    user: json.user || null,
  };
}

/* ============================================================
 * Listado y detalle (requieren Perfiles+view)
 * ============================================================ */

/** GET /profiles */
async function list(req, res, next) {
  try {
    const { q, document_type_id } = req.query;
    const where = {};
    if (document_type_id) where.document_type_id = Number(document_type_id);

    let userWhere;
    if (q) {
      userWhere = {
        [Op.or]: [
          { username: { [Op.like]: `%${q}%` } },
          { email: { [Op.like]: `%${q}%` } },
        ],
      };
    }

    const profiles = await Profile.findAll({
      where,
      include: [
        {
          model: User, as: 'user',
          attributes: ['id', 'username', 'email', 'status_id', 'last_login'],
          where: userWhere,
          required: !!userWhere,
        },
        { model: DocumentType, as: 'document_type', attributes: ['id', 'name'] },
      ],
      order: [['id', 'ASC']],
    });

    return ok(res, { profiles: profiles.map(formatProfile) }, 'Perfiles');
  } catch (err) { return next(err); }
}

/** GET /profiles/:id */
async function getOne(req, res, next) {
  try {
    const id = Number(req.params.id);
    const profile = await Profile.findByPk(id, { include: profileInclude() });
    if (!profile) return fail(res, 'Perfil no encontrado', 404);
    return ok(res, { profile: formatProfile(profile) }, 'Perfil');
  } catch (err) { return next(err); }
}

/** GET /users/:id/profile */
async function getByUser(req, res, next) {
  try {
    const userId = Number(req.params.id);
    const profile = await Profile.findOne({
      where: { user_id: userId },
      include: profileInclude(),
    });
    if (!profile) return fail(res, 'El usuario no tiene perfil', 404);
    return ok(res, { profile: formatProfile(profile) }, 'Perfil del usuario');
  } catch (err) { return next(err); }
}

/* ============================================================
 * "me" — perfil del usuario autenticado (sin permiso de módulo)
 * ============================================================ */

/** GET /profiles/me */
async function getMine(req, res, next) {
  try {
    const userId = req.auth.user_id;
    const profile = await Profile.findOne({
      where: { user_id: userId },
      include: profileInclude(),
    });
    if (!profile) return fail(res, 'Tu usuario no tiene perfil configurado', 404);
    return ok(res, { profile: formatProfile(profile) }, 'Mi perfil');
  } catch (err) { return next(err); }
}

/** PUT /profiles/me */
async function updateMine(req, res, next) {
  try {
    const userId = req.auth.user_id;
    const profile = await Profile.findOne({ where: { user_id: userId } });
    if (!profile) return fail(res, 'Tu usuario no tiene perfil configurado', 404);

    const updates = req.body;

    // Un usuario común no puede cambiar su propio documento (regla de negocio)
    if (updates.document_number && updates.document_number !== profile.document_number) {
      return fail(res, 'No puedes cambiar tu número de documento por esta vía', 403);
    }
    if (updates.document_type_id && updates.document_type_id !== profile.document_type_id) {
      return fail(res, 'No puedes cambiar tu tipo de documento por esta vía', 403);
    }

    await profile.update(updates);
    const full = await Profile.findByPk(profile.id, { include: profileInclude() });
    return ok(res, { profile: formatProfile(full) }, 'Mi perfil actualizado');
  } catch (err) { return next(err); }
}

/* ============================================================
 * Edición por admin (requiere Perfiles+edit)
 * ============================================================ */

/** PUT /users/:id/profile */
async function updateByUser(req, res, next) {
  try {
    const userId = Number(req.params.id);
    const profile = await Profile.findOne({ where: { user_id: userId } });
    if (!profile) return fail(res, 'El usuario no tiene perfil', 404);

    const { document_number, document_type_id, ...rest } = req.body;

    // Si cambia el documento, validar duplicado
    if (document_number && document_number !== profile.document_number) {
      const dup = await Profile.findOne({ where: { document_number } });
      if (dup) return fail(res, 'document_number ya está en uso', 409);
    }
    if (document_type_id) {
      const dt = await DocumentType.findByPk(document_type_id);
      if (!dt) return fail(res, 'document_type_id no existe', 400);
    }

    await profile.update({
      ...rest,
      ...(document_number !== undefined && { document_number }),
      ...(document_type_id !== undefined && { document_type_id }),
    });

    const full = await Profile.findByPk(profile.id, { include: profileInclude() });
    return ok(res, { profile: formatProfile(full) }, 'Perfil actualizado');
  } catch (err) { return next(err); }
}

module.exports = {
  list, getOne, getByUser, getMine, updateMine, updateByUser,
};
```

---

## 3. `src/controllers/security/index.js` (modificar)

```javascript
// src/controllers/security/index.js
module.exports = {
  catalog: require('./catalog.controller'),
  role: require('./role.controller'),
  user: require('./user.controller'),
  profile: require('./profile.controller'),   // ← NUEVO
};
```

---

## 4. `src/routes/profile.routes.js`

```javascript
// src/routes/profile.routes.js
const { Router } = require('express');
const { authRequired } = require('../middlewares/auth.middleware');
const { permissionRequired } = require('../middlewares/permission.middleware');
const { validate } = require('../middlewares/validate.middleware');
const { updateProfileSchema } = require('../validators/profile.validator');
const ctl = require('../controllers/security/profile.controller');

const router = Router();

/* ===== "me" (solo auth, sin permiso de módulo) ===== */
router.get('/me',  authRequired, ctl.getMine);
router.put('/me',  authRequired, validate(updateProfileSchema), ctl.updateMine);

/* ===== Listado y detalle (con Perfiles+view) ===== */
router.get('/',     authRequired, permissionRequired('Perfiles', 'view'), ctl.list);
router.get('/:id',  authRequired, permissionRequired('Perfiles', 'view'), ctl.getOne);

module.exports = router;
```

> **Nota:** `getByUser` y `updateByUser` (`/users/:id/profile`) los montamos en `user.routes.js` o en un router aparte para mantener los paths limpios. Aquí los dejamos en `profile.controller.js` pero se montan desde `user.routes.js`. Lo hago abajo.

---

## 5. `src/routes/user.routes.js` (modificar — añadir profile)

Añade al final, **antes** de `module.exports = router;`:

```javascript
const profileCtl = require('../controllers/security/profile.controller');
const { updateProfileSchema: updateProfileSchema2 } = require('../validators/profile.validator');

router.get('/:id/profile',
  authRequired, permissionRequired('Perfiles', 'view'), profileCtl.getByUser);

router.put('/:id/profile',
  authRequired, permissionRequired('Perfiles', 'edit'),
  validate(updateProfileSchema2), profileCtl.updateByUser);
```

> Ojo: la ruta `/:id/profile` se registra **después** de `/:id` para que Express no confunda `/:id` con `/:id/profile`. Como `/:id/profile` tiene un segmento más, no hay colisión real, pero mantén el orden por claridad.

---

## 6. `src/routes/index.js` (modificar)

```javascript
// src/routes/index.js
const { Router } = require('express');
const authRoutes = require('./auth.routes');
const catalogRoutes = require('./catalog.routes');
const roleRoutes = require('./role.routes');
const userRoutes = require('./user.routes');
const profileRoutes = require('./profile.routes');

const router = Router();

router.get('/health', (req, res) => {
  res.json({ success: true, message: 'Router /api/v1 operativo' });
});

router.use('/auth', authRoutes);
router.use('/catalogs', catalogRoutes);
router.use('/roles', roleRoutes);
router.use('/users', userRoutes);
router.use('/profiles', profileRoutes);

module.exports = router;
```

---

## 7. Postman — carpeta `Profiles`

Añade al array `item` (después de `Users`):

```json
{
  "name": "Profiles",
  "item": [
    {
      "name": "Listar perfiles",
      "request": {
        "method": "GET",
        "header": [{ "key": "Authorization", "value": "Bearer {{token}}" }],
        "url": "{{baseUrl}}/profiles"
      }
    },
    {
      "name": "Filtro q=juan",
      "request": {
        "method": "GET",
        "header": [{ "key": "Authorization", "value": "Bearer {{token}}" }],
        "url": "{{baseUrl}}/profiles?q=juan"
      }
    },
    {
      "name": "Detalle profile 1",
      "request": {
        "method": "GET",
        "header": [{ "key": "Authorization", "value": "Bearer {{token}}" }],
        "url": "{{baseUrl}}/profiles/1"
      }
    },
    {
      "name": "Perfil del usuario 2",
      "request": {
        "method": "GET",
        "header": [{ "key": "Authorization", "value": "Bearer {{token}}" }],
        "url": "{{baseUrl}}/users/2/profile"
      }
    },
    {
      "name": "Mi perfil (admin)",
      "request": {
        "method": "GET",
        "header": [{ "key": "Authorization", "value": "Bearer {{token}}" }],
        "url": "{{baseUrl}}/profiles/me"
      }
    },
    {
      "name": "Editar mi perfil (admin)",
      "request": {
        "method": "PUT",
        "header": [
          { "key": "Content-Type", "value": "application/json" },
          { "key": "Authorization", "value": "Bearer {{token}}" }
        ],
        "body": { "mode": "raw", "raw": "{\"phone\":\"3111111111\"}" },
        "url": "{{baseUrl}}/profiles/me"
      }
    },
    {
      "name": "Editar perfil del usuario 2 (admin)",
      "request": {
        "method": "PUT",
        "header": [
          { "key": "Content-Type", "value": "application/json" },
          { "key": "Authorization", "value": "Bearer {{token}}" }
        ],
        "body": { "mode": "raw", "raw": "{\"address\":\"Nueva dirección 123\"}" },
        "url": "{{baseUrl}}/users/2/profile"
      }
    },
    {
      "name": "juan no puede listar perfiles (403)",
      "request": {
        "method": "GET",
        "header": [{ "key": "Authorization", "value": "Bearer {{token}}" }],
        "url": "{{baseUrl}}/profiles"
      }
    }
  ]
}
```

---

## 🧪 Verificación del sub-paso 2.5 (10 pruebas)

Asumo servidor corriendo, `$token`/`$h` cargados del admin y `$hj` del login de juan.

### P1 — Listar perfiles (admin)

```powershell
Invoke-RestMethod -Uri http://localhost:3000/api/v1/profiles -Headers $h | ConvertTo-Json -Depth 5
```

**Esperado:** `profiles` con `juan` (`document_number: "12345678"`) y (si existe) `maria`.

### P2 — Filtro `q=juan`

```powershell
Invoke-RestMethod -Uri "http://localhost:3000/api/v1/profiles?q=juan" -Headers $h | ConvertTo-Json -Depth 5
```

**Esperado:** solo `juan`.

### P3 — Detalle por `profile.id=1`

```powershell
Invoke-RestMethod -Uri http://localhost:3000/api/v1/profiles/1 -Headers $h | ConvertTo-Json -Depth 6
```

**Esperado:** `profile.full_name: "Juan Andres Pérez"`, `document_type.name: "CC"`, `user.username: "juan"`.

### P4 — Perfil del usuario 2

```powershell
Invoke-RestMethod -Uri http://localhost:3000/api/v1/users/2/profile -Headers $h | ConvertTo-Json -Depth 6
```

**Esperado:** mismo perfil que P3, con `user` embebido.

### P5 — `GET /profiles/me` con admin

```powershell
Invoke-RestMethod -Uri http://localhost:3000/api/v1/profiles/me -Headers $h | ConvertTo-Json -Depth 5
```

**Esperado:** `404 Tu usuario no tiene perfil configurado` (admin no tiene `profile`). **Esto es correcto** — el admin se creó sin perfil en el seed original.

### P6 — `GET /profiles/me` con juan

```powershell
Invoke-RestMethod -Uri http://localhost:3000/api/v1/profiles/me -Headers $hj | ConvertTo-Json -Depth 6
```

**Esperado:** `200` con el perfil de juan. **Este endpoint no requiere permiso de módulo — cualquier autenticado puede ver el suyo.**

### P7 — `PUT /profiles/me` con juan (cambia su teléfono)

```powershell
$body = @{ phone = '3000000000' } | ConvertTo-Json
Invoke-RestMethod -Method PUT -Uri http://localhost:3000/api/v1/profiles/me -Headers $hj -Body $body -ContentType 'application/json' | ConvertTo-Json -Depth 5
```

**Esperado:** `success:true`, `profile.phone: "3000000000"`.

### P8 — `PUT /profiles/me` con juan intentando cambiar `document_number` → 403

```powershell
$body = @{ document_number = '99999999' } | ConvertTo-Json
try {
  Invoke-RestMethod -Method PUT -Uri http://localhost:3000/api/v1/profiles/me -Headers $hj -Body $body -ContentType 'application/json'
} catch { $_.ErrorDetails.Message }
```

**Esperado:** `403 No puedes cambiar tu número de documento por esta vía`.

### P9 — `PUT /users/2/profile` con admin (cambia dirección)

```powershell
$body = @{ address = 'Calle 99 #11-22' } | ConvertTo-Json
Invoke-RestMethod -Method PUT -Uri http://localhost:3000/api/v1/users/2/profile -Headers $h -Body $body -ContentType 'application/json' | ConvertTo-Json -Depth 5
```

**Esperado:** `success:true`, `profile.address: "Calle 99 #11-22"`.

### P10 — juan no puede listar perfiles → 403

```powershell
try {
  Invoke-RestMethod -Uri http://localhost:3000/api/v1/profiles -Headers $hj
} catch { $_.ErrorDetails.Message }
```

**Esperado:** `403 Acceso denegado. Tu rol activo no tiene el permiso "view" sobre "Perfiles".`

> **Ojo:** `PUT /profiles/me` con juan **sí funciona** (es su propio perfil), pero `GET /profiles` (listado de todos) **no**. Es exactamente la distinción que queremos.

---

## 🚦 Criterios para cerrar 2.5

- **2.4 cerrado**
- Pasamos a **2.5 — CRUD Modules** (último CRUD del Paso 2: gestionar los módulos del sistema).
- Después **2.6 — Cierre del Paso 2** (Swagger final, Postman completo, README, resumen de todo el módulo de seguridad).

**Mismo criterio de siempre: no cerramos 2.4 sin las 10 pruebas.**

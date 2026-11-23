# 🎉 ¡Paso 2 cerrado oficialmente! — Arrancamos el Paso 3 (PQRS)

## 📋 Plan del Paso 3 — Módulo PQRS

Este paso se divide en 3 sub-pasos. Al igual que en seguridad, **cerramos y probamos cada uno antes de avanzar**.

| Sub-paso      | Contenido                                                                                                 |
| ------------- | --------------------------------------------------------------------------------------------------------- |
| **3.1** | CRUD PQRS (radicar, listar con filtros y paginación, ver detalle, actualizar estado, asignar, eliminar). |
| **3.2** | Responses (responder al ciudadano, notas internas con `is_internal`, hilo de conversación).            |
| **3.3** | Cierre del Paso 3 (Swagger, Postman, permisos del rol user).                                              |

---

## 📦 Sub-paso 3.1 — CRUD PQRS (Núcleo)

### 🔑 Reglas de negocio clave (que implementaremos)

1. **Radicado autogenerado:** `PQRS-YYYY-NNNNN` (ej. `PQRS-2026-00001`). No lo envía el usuario. Se genera con transacción para evitar colisiones.
2. **Creación:** cualquier usuario con `PQRS+create` radica. Se auto-asigna a sí mismo como `user_id`.
3. **Visibilidad:**
   - Un usuario con `PQRS+view` **solo ve sus propios PQRS**, a menos que sea `admin` o tenga asignado el PQRS (`assigned_to`).
   - *(Si prefieres que los funcionarios vean todos, me avisas y ajusto el filtro).*
4. **Asignación:** un administrador (o manager) puede asignar el PQRS a un funcionario (`assigned_to`). Al asignarlo, pasa a estado `En Proceso` (id 2) automáticamente.
5. **Cambio de estado:** se valida que el estado destino exista. Si se marca como `Resuelta` o `Cerrada`, no se puede volver a `Radicada`.
6. **Eliminación:** solo el creador del PQRS (si está en estado `Radicada`) o un admin (`PQRS+delete`) pueden eliminar.

---

## 📁 Archivos a crear (5)

| Archivo                                     | Acción                      |
| ------------------------------------------- | ---------------------------- |
| `src/validators/pqrs.validator.js`        | CREAR                        |
| `src/controllers/pqrs/pqrs.controller.js` | CREAR                        |
| `src/controllers/pqrs/index.js`           | CREAR                        |
| `src/routes/pqrs/pqrs.routes.js`          | CREAR                        |
| `src/routes/index.js`                     | MODIFICAR (montar `/pqrs`) |
| `postman/PQRS.postman_collection.json`    | MODIFICAR (carpeta PQRS)     |

---

## 1. `src/validators/pqrs.validator.js`

```javascript
// src/validators/pqrs.validator.js
const { z } = require('zod');

// --- Crear PQRS ---
const createPqrsSchema = z.object({
  pqrs_type_id: z.coerce.number().int().positive(),
  subject: z.string().min(5, 'El asunto debe tener al menos 5 caracteres').max(150),
  description: z.string().min(10, 'La descripción debe tener al menos 10 caracteres'),
});

// --- Actualizar estado ---
const changeStatusSchema = z.object({
  pqrs_status_id: z.coerce.number().int().positive(),
  comment: z.string().max(500).optional().nullable(), // opcional, para auditoría futura
});

// --- Asignar funcionario ---
const assignPqrsSchema = z.object({
  assigned_to: z.coerce.number().int().positive(),
});

// --- Filtros de listado ---
const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(10),
  pqrs_status_id: z.coerce.number().int().positive().optional(),
  pqrs_type_id: z.coerce.number().int().positive().optional(),
  assigned_to: z.coerce.number().int().positive().optional(),
  q: z.string().max(150).optional(),
  sort: z.enum(['created_at', 'updated_at', 'tracking_number']).optional().default('created_at'),
  order: z.enum(['ASC', 'DESC']).optional().default('DESC'),
});

module.exports = {
  createPqrsSchema,
  changeStatusSchema,
  assignPqrsSchema,
  listQuerySchema,
};
```

---

## 2. `src/controllers/pqrs/pqrs.controller.js`

Este controlador tiene la lógica más compleja (generación de tracking, reglas de visibilidad, transacciones).

```javascript
// src/controllers/pqrs/pqrs.controller.js
const { Op, Sequelize } = require('sequelize');
const {
  sequelize, Pqrs, PqrsType, PqrsStatus, User, UserRole, Role,
} = require('../../models');
const { ok, fail } = require('../../utils/response');

/* ============================================================
 * Helpers
 * ============================================================ */

/** Genera el siguiente tracking_number de forma atómica (PQRS-YYYY-NNNNN). */
async function generateTrackingNumber(transaction) {
  const year = new Date().getFullYear();
  const prefix = `PQRS-${year}-`;

  // Bloquear tabla para evitar colisiones concurrentes (FOR UPDATE sobre el último).
  // En MySQL, usamos un COUNT() con lock para obtener el correlativo del año actual.
  const [rows] = await sequelize.query(
    `SELECT COUNT(*) AS total FROM pqrs WHERE tracking_number LIKE :prefix`,
    { replacements: { prefix: `${prefix}%` }, transaction }
  );
  const next = Number(rows[0].total) + 1;
  return `${prefix}${String(next).padStart(5, '0')}`;
}

/** Include estándar para respuestas. */
function pqrsInclude() {
  return [
    { model: PqrsType, as: 'type', attributes: ['id', 'name'] },
    { model: PqrsStatus, as: 'status', attributes: ['id', 'name', 'color'] },
    { model: User, as: 'creator', attributes: ['id', 'username', 'email'] },
    { model: User, as: 'assignee', attributes: ['id', 'username', 'email'], required: false },
  ];
}

/** Formato de respuesta. */
function formatPqrs(p) {
  const json = p.toJSON();
  return {
    id: json.id,
    tracking_number: json.tracking_number,
    subject: json.subject,
    description: json.description,
    created_at: json.created_at,
    updated_at: json.updated_at,
    type: json.type,
    status: json.status,
    creator: json.creator,
    assignee: json.assignee || null,
  };
}

/* ============================================================
 * GET /pqrs (Listar)
 * ============================================================ */
async function list(req, res, next) {
  try {
    const { page, limit, pqrs_status_id, pqrs_type_id, assigned_to, q, sort, order } = req.query;
    const offset = (page - 1) * limit;

    const where = {};
    if (pqrs_status_id) where.pqrs_status_id = pqrs_status_id;
    if (pqrs_type_id) where.pqrs_type_id = pqrs_type_id;
    if (assigned_to) where.assigned_to = assigned_to;
    if (q) {
      where[Op.or] = [
        { tracking_number: { [Op.like]: `%${q}%` } },
        { subject: { [Op.like]: `%${q}%` } },
        { description: { [Op.like]: `%${q}%` } },
      ];
    }

    // Regla de visibilidad (a menos que tenga módulo de admin completo)
    // Si no es admin, solo ve los suyos o los asignados a él.
    const isAdmin = req.permissionContext?.role_id === 1; // Asumimos role_id=1 admin
    if (!isAdmin) {
      where[Op.or] = [
        ...(where[Op.or] || []),
        { user_id: req.auth.user_id },
        { assigned_to: req.auth.user_id },
      ];
    }

    const { count, rows } = await Pqrs.findAndCountAll({
      where,
      include: pqrsInclude(),
      order: [[sort, order]],
      limit,
      offset,
      distinct: true, // Necesario por los JOINs
    });

    return ok(res, {
      pqrs: rows.map(formatPqrs),
      pagination: {
        total: count,
        page,
        limit,
        pages: Math.ceil(count / limit),
      },
    }, 'Listado de PQRS');
  } catch (err) { return next(err); }
}

/* ============================================================
 * GET /pqrs/:id
 * ============================================================ */
async function getOne(req, res, next) {
  try {
    const id = Number(req.params.id);
    const pqrs = await Pqrs.findByPk(id, { include: pqrsInclude() });
    if (!pqrs) return fail(res, 'PQRS no encontrado', 404);

    // Validación de visibilidad
    const isAdmin = req.permissionContext?.role_id === 1;
    if (!isAdmin && pqrs.user_id !== req.auth.user_id && pqrs.assigned_to !== req.auth.user_id) {
      return fail(res, 'No tienes permiso para ver este PQRS', 403);
    }

    return ok(res, { pqrs: formatPqrs(pqrs) }, 'Detalle PQRS');
  } catch (err) { return next(err); }
}

/* ============================================================
 * POST /pqrs (Crear/Radicar)
 * ============================================================ */
async function create(req, res, next) {
  const t = await sequelize.transaction();
  try {
    const { pqrs_type_id, subject, description } = req.body;
    const user_id = req.auth.user_id;

    // Validar tipo
    const type = await PqrsType.findByPk(pqrs_type_id, { transaction: t });
    if (!type) { await t.rollback(); return fail(res, 'Tipo de PQRS no válido', 400); }

    // Generar tracking
    const tracking_number = await generateTrackingNumber(t);

    const pqrs = await Pqrs.create({
      tracking_number,
      user_id,
      pqrs_type_id,
      pqrs_status_id: 1, // Radicada por defecto
      subject,
      description,
    }, { transaction: t });

    await t.commit();

    const full = await Pqrs.findByPk(pqrs.id, { include: pqrsInclude() });
    return ok(res, { pqrs: formatPqrs(full) }, 'PQRS radicada correctamente', 201);
  } catch (err) {
    await t.rollback();
    return next(err);
  }
}

/* ============================================================
 * PATCH /pqrs/:id/status
 * ============================================================ */
async function changeStatus(req, res, next) {
  try {
    const id = Number(req.params.id);
    const { pqrs_status_id } = req.body;
    const pqrs = await Pqrs.findByPk(id);
    if (!pqrs) return fail(res, 'PQRS no encontrado', 404);

    const newStatus = await PqrsStatus.findByPk(pqrs_status_id);
    if (!newStatus) return fail(res, 'Estado no válido', 400);

    // Regla: si ya está resuelta/cerrada, no puede volver a radicada
    if ([3, 4].includes(pqrs.pqrs_status_id) && pqrs_status_id === 1) {
      return fail(res, 'No se puede volver al estado "Radicada"', 409);
    }

    await pqrs.update({ pqrs_status_id });
  
    const full = await Pqrs.findByPk(id, { include: pqrsInclude() });
    return ok(res, { pqrs: formatPqrs(full) }, `Estado actualizado a "${newStatus.name}"`);
  } catch (err) { return next(err); }
}

/* ============================================================
 * PATCH /pqrs/:id/assign
 * ============================================================ */
async function assign(req, res, next) {
  try {
    const id = Number(req.params.id);
    const { assigned_to } = req.body;
  
    // Validar que el usuario destino exista
    const assignee = await User.findByPk(assigned_to);
    if (!assignee) return fail(res, 'El usuario a asignar no existe', 400);

    const pqrs = await Pqrs.findByPk(id);
    if (!pqrs) return fail(res, 'PQRS no encontrado', 404);

    // Al asignar, pasa a "En Proceso" (2) automáticamente, si no está resuelta/cerrada
    const updateData = { assigned_to };
    if (![3, 4, 5].includes(pqrs.pqrs_status_id)) {
      updateData.pqrs_status_id = 2;
    }

    await pqrs.update(updateData);
    const full = await Pqrs.findByPk(id, { include: pqrsInclude() });
    return ok(res, { pqrs: formatPqrs(full) }, 'PQRS asignado correctamente');
  } catch (err) { return next(err); }
}

/* ============================================================
 * DELETE /pqrs/:id
 * ============================================================ */
async function remove(req, res, next) {
  try {
    const id = Number(req.params.id);
    const pqrs = await Pqrs.findByPk(id);
    if (!pqrs) return fail(res, 'PQRS no encontrado', 404);

    const isAdmin = req.permissionContext?.role_id === 1;
    const isCreator = pqrs.user_id === req.auth.user_id;

    if (!isAdmin && !isCreator) {
      return fail(res, 'No tienes permiso para eliminar este PQRS', 403);
    }
    // Un usuario solo puede borrar si está "Radicada"
    if (!isAdmin && isCreator && pqrs.pqrs_status_id !== 1) {
      return fail(res, 'Solo puedes eliminar PQRS en estado "Radicada"', 409);
    }

    await pqrs.destroy(); // Cascade borrará responses
    return ok(res, null, 'PQRS eliminado');
  } catch (err) { return next(err); }
}

module.exports = { list, getOne, create, changeStatus, assign, remove };
```

---

## 3. `src/controllers/pqrs/index.js`

```javascript
// src/controllers/pqrs/index.js
module.exports = {
  pqrs: require('./pqrs.controller'),
  // En 3.2 agregaremos: response: require('./response.controller')
};
```

---

## 4. `src/routes/pqrs/pqrs.routes.js`

```javascript
// src/routes/pqrs/pqrs.routes.js
const { Router } = require('express');
const { authRequired } = require('../../middlewares/auth.middleware');
const { permissionRequired } = require('../../middlewares/permission.middleware');
const { validate } = require('../../middlewares/validate.middleware');
const {
  createPqrsSchema, changeStatusSchema, assignPqrsSchema, listQuerySchema,
} = require('../../validators/pqrs.validator');
const ctl = require('../../controllers/pqrs/pqrs.controller');

const router = Router();

// Listar (con filtros)
router.get('/',
  authRequired, permissionRequired('PQRS', 'view'),
  validate(listQuerySchema, 'query'), ctl.list);

// Detalle
router.get('/:id',
  authRequired, permissionRequired('PQRS', 'view'), ctl.getOne);

// Crear
router.post('/',
  authRequired, permissionRequired('PQRS', 'create'),
  validate(createPqrsSchema), ctl.create);

// Cambiar estado
router.patch('/:id/status',
  authRequired, permissionRequired('PQRS', 'edit'),
  validate(changeStatusSchema), ctl.changeStatus);

// Asignar
router.patch('/:id/assign',
  authRequired, permissionRequired('PQRS', 'edit'),
  validate(assignPqrsSchema), ctl.assign);

// Eliminar
router.delete('/:id',
  authRequired, permissionRequired('PQRS', 'delete'), ctl.remove);

module.exports = router;
```

---

## 5. `src/routes/index.js` (modificar)

Añadimos `pqrsRoutes`.

```javascript
// src/routes/index.js
const { Router } = require('express');
const authRoutes = require('./auth.routes');
const security = require('./security');
const pqrsRoutes = require('./pqrs/pqrs.routes');   // ← NUEVO

const router = Router();

router.get('/health', (req, res) => {
  res.json({ success: true, message: 'Router /api/v1 operativo' });
});

router.use('/auth', authRoutes);
router.use('/catalogs', security.catalog);
router.use('/roles', security.role);
router.use('/users', security.user);
router.use('/profiles', security.profile);
router.use('/modules', security.module);
router.use('/pqrs', pqrsRoutes);                    // ← NUEVO

module.exports = router;
```

---

## 6. Postman — Carpeta `PQRS`

Añade al array `item` de tu colección (después de `Modules`):

```json
{
  "name": "PQRS",
  "item": [
    {
      "name": "Listar PQRS (Admin)",
      "request": {
        "method": "GET",
        "header": [{ "key": "Authorization", "value": "Bearer {{token}}" }],
        "url": "{{baseUrl}}/pqrs?page=1&limit=10"
      }
    },
    {
      "name": "Listar PQRS (juan)",
      "request": {
        "method": "GET",
        "header": [{ "key": "Authorization", "value": "Bearer {{token}}" }],
        "url": "{{baseUrl}}/pqrs"
      }
    },
    {
      "name": "Crear PQRS (juan)",
      "request": {
        "method": "POST",
        "header": [
          { "key": "Content-Type", "value": "application/json" },
          { "key": "Authorization", "value": "Bearer {{token}}" }
        ],
        "body": { "mode": "raw", "raw": "{\n  \"pqrs_type_id\": 2,\n  \"subject\": \"Falla en el sistema de facturación\",\n  \"description\": \"Al intentar descargar la factura del mes de octubre, el sistema arroja un error 500.\"\n}" },
        "url": "{{baseUrl}}/pqrs"
      },
      "event": [{ "listen": "test", "script": { "exec": [
        "const b = pm.response.json();",
        "if (b.data && b.data.pqrs && b.data.pqrs.id) pm.collectionVariables.set('pqrsId', String(b.data.pqrs.id));"
      ]}}]
    },
    {
      "name": "Detalle PQRS",
      "request": {
        "method": "GET",
        "header": [{ "key": "Authorization", "value": "Bearer {{token}}" }],
        "url": "{{baseUrl}}/pqrs/{{pqrsId}}"
      }
    },
    {
      "name": "Cambiar estado a En Proceso",
      "request": {
        "method": "PATCH",
        "header": [
          { "key": "Content-Type", "value": "application/json" },
          { "key": "Authorization", "value": "Bearer {{token}}" }
        ],
        "body": { "mode": "raw", "raw": "{\"pqrs_status_id\": 2}" },
        "url": "{{baseUrl}}/pqrs/{{pqrsId}}/status"
      }
    },
    {
      "name": "Asignar PQRS a admin",
      "request": {
        "method": "PATCH",
        "header": [
          { "key": "Content-Type", "value": "application/json" },
          { "key": "Authorization", "value": "Bearer {{token}}" }
        ],
        "body": { "mode": "raw", "raw": "{\"assigned_to\": 1}" },
        "url": "{{baseUrl}}/pqrs/{{pqrsId}}/assign"
      }
    },
    {
      "name": "Eliminar PQRS",
      "request": {
        "method": "DELETE",
        "header": [{ "key": "Authorization", "value": "Bearer {{token}}" }],
        "url": "{{baseUrl}}/pqrs/{{pqrsId}}"
      }
    },
    {
      "name": "juan intenta eliminar PQRS ajeno (403)",
      "request": {
        "method": "DELETE",
        "header": [{ "key": "Authorization", "value": "Bearer {{token}}" }],
        "url": "{{baseUrl}}/pqrs/1"
      }
    }
  ]
}
```

Añade en `variable`:

```json
{ "key": "pqrsId", "value": "" }
```

---

## 🧪 Verificación del sub-paso 3.1 (10 pruebas)

Asumo servidor corriendo y autenticados admin y juan.

### Q1 — juan crea su primer PQRS

```powershell
$body = @{
  pqrs_type_id = 2
  subject = 'Falla en el sistema de facturación'
  description = 'Al intentar descargar la factura del mes de octubre, el sistema arroja un error 500.'
} | ConvertTo-Json
$resp = Invoke-RestMethod -Method POST -Uri http://localhost:3000/api/v1/pqrs -Headers $hj -Body $body -ContentType 'application/json'
$resp | ConvertTo-Json -Depth 6
$newPqrsId = $resp.data.pqrs.id
$newTracking = $resp.data.pqrs.tracking_number
```

**Esperado:** `tracking_number: "PQRS-2026-00001"` (el primer PQRS del año), `status.name: "Radicada"`, `creator.username: "juan"`.

### Q2 — juan lista sus PQRS

```powershell
Invoke-RestMethod -Uri http://localhost:3000/api/v1/pqrs -Headers $hj | ConvertTo-Json -Depth 5
```

**Esperado:** 1 PQRS en el array `data.pqrs`, `pagination.total: 1`. Si admin crea uno, juan no lo ve.

### Q3 — admin lista todos

```powershell
Invoke-RestMethod -Uri http://localhost:3000/api/v1/pqrs -Headers $h | ConvertTo-Json -Depth 5
```

**Esperado:** admin ve el PQRS de juan (porque admin tiene `PQRS+view` y `role_id=1`).

### Q4 — admin lo asigna a sí mismo (cambia a En Proceso)

```powershell
$body = @{ assigned_to = 1 } | ConvertTo-Json
Invoke-RestMethod -Method PATCH -Uri http://localhost:3000/api/v1/pqrs/$newPqrsId/assign -Headers $h -Body $body -ContentType 'application/json' | ConvertTo-Json -Depth 5
```

**Esperado:** `assignee.username: "admin"`, `status.name: "En Proceso"`.

### Q5 — admin cambia a "Resuelta"

```powershell
$body = @{ pqrs_status_id = 3 } | ConvertTo-Json
Invoke-RestMethod -Method PATCH -Uri http://localhost:3000/api/v1/pqrs/$newPqrsId/status -Headers $h -Body $body -ContentType 'application/json' | ConvertTo-Json -Depth 5
```

**Esperado:** `status.name: "Resuelta"`.

### Q6 — intentar volver a "Radicada" → 409

```powershell
$body = @{ pqrs_status_id = 1 } | ConvertTo-Json
try {
  Invoke-RestMethod -Method PATCH -Uri http://localhost:3000/api/v1/pqrs/$newPqrsId/status -Headers $h -Body $body -ContentType 'application/json'
} catch { $_.ErrorDetails.Message }
```

**Esperado:** `409 No se puede volver al estado "Radicada"`.

### Q7 — juan intenta ver un PQRS de otro usuario (simulamos creando uno como admin)

```powershell
# Admin crea un PQRS
$body = @{ pqrs_type_id = 1; subject = 'Solicitud de admin'; description = 'Requiero información sobre mis permisos de sistema.' } | ConvertTo-Json
$respAdmin = Invoke-RestMethod -Method POST -Uri http://localhost:3000/api/v1/pqrs -Headers $h -Body $body -ContentType 'application/json'
$adminPqrsId = $respAdmin.data.pqrs.id

# juan intenta verlo
try {
  Invoke-RestMethod -Uri "http://localhost:3000/api/v1/pqrs/$adminPqrsId" -Headers $hj
} catch { $_.ErrorDetails.Message }
```

**Esperado:** `403 No tienes permiso para ver este PQRS`.

### Q8 — juan intenta eliminar un PQRS ajeno → 403

```powershell
try {
  Invoke-RestMethod -Method DELETE -Uri "http://localhost:3000/api/v1/pqrs/$adminPqrsId" -Headers $hj
} catch { $_.ErrorDetails.Message }
```

**Esperado:** `403 No tienes permiso para eliminar este PQRS`.

### Q9 — juan elimina su propio PQRS (ahora está "Resuelta") → 409

```powershell
try {
  Invoke-RestMethod -Method DELETE -Uri "http://localhost:3000/api/v1/pqrs/$newPqrsId" -Headers $hj
} catch { $_.ErrorDetails.Message }
```

**Esperado:** `409 Solo puedes eliminar PQRS en estado "Radicada"`.

### Q10 — admin elimina el PQRS de juan (permiso de admin)

```powershell
Invoke-RestMethod -Method DELETE -Uri "http://localhost:3000/api/v1/pqrs/$newPqrsId" -Headers $h | ConvertTo-Json
```

**Esperado:** `success: true`, `"PQRS eliminado"`.

---

## 🚦 Criterios para cerrar 3.1

- **3.1 cerrado** ✅
- Pasamos a **3.2 — Responses** (responder al ciudadano, notas internas con `is_internal`, y el hilo de conversación en el detalle del PQRS).
- Después **3.3 — Cierre del Paso 3** (Swagger, Postman, permisos finales).

```json
{
  "name": "PQRS",
  "item": [
    {
      "name": "Listar PQRS (Admin)",
      "request": {
        "method": "GET",
        "header": [{ "key": "Authorization", "value": "Bearer {{token}}" }],
        "url": "{{baseUrl}}/pqrs?page=1&limit=10"
      }
    },
    {
      "name": "Listar PQRS (juan)",
      "request": {
        "method": "GET",
        "header": [{ "key": "Authorization", "value": "Bearer {{token}}" }],
        "url": "{{baseUrl}}/pqrs"
      }
    },
    {
      "name": "Crear PQRS (juan)",
      "request": {
        "method": "POST",
        "header": [
          { "key": "Content-Type", "value": "application/json" },
          { "key": "Authorization", "value": "Bearer {{token}}" }
        ],
        "body": { "mode": "raw", "raw": "{\n  \"pqrs_type_id\": 2,\n  \"subject\": \"Falla en el sistema de facturación\",\n  \"description\": \"Al intentar descargar la factura del mes de octubre, el sistema arroja un error 500.\"\n}" },
        "url": "{{baseUrl}}/pqrs"
      },
      "event": [{ "listen": "test", "script": { "exec": [
        "const b = pm.response.json();",
        "if (b.data && b.data.pqrs && b.data.pqrs.id) pm.collectionVariables.set('pqrsId', String(b.data.pqrs.id));"
      ]}}]
    },
    {

      "request": {
        "method": "GET",
        "header": [{ "key": "Authorization", "value": "Bearer {{token}}" }],
        "url": "{{baseUrl}}/pqrs/{{pqrsId}}"
      }
    },
    {
      "name": "Cambiar estado a En Proceso",
      "request": {
        "method": "PATCH",
        "header": [
          { "key": "Content-Type", "value": "application/json" },
          { "key": "Authorization", "value": "Bearer {{token}}" }
        ],
        "body": { "mode": "raw", "raw": "{\"pqrs_status_id\": 2}" },
        "url": "{{baseUrl}}/pqrs/{{pqrsId}}/status"
      }
    },
    {
      "name": "Asignar PQRS a admin",
      "request": {
        "method": "PATCH",
        "header": [
          { "key": "Content-Type", "value": "application/json" },
          { "key": "Authorization", "value": "Bearer {{token}}" }
        ],
        "body": { "mode": "raw", "raw": "{\"assigned_to\": 1}" },
        "url": "{{baseUrl}}/pqrs/{{pqrsId}}/assign"
      }
    },
    {
      "name": "Eliminar PQRS",
      "request": {
        "method": "DELETE",
        "header": [{ "key": "Authorization", "value": "Bearer {{token}}" }],
        "url": "{{baseUrl}}/pqrs/{{pqrsId}}"
      }
    },
    {
      "name": "juan intenta eliminar PQRS ajeno (403)",
      "request": {
        "method": "DELETE",
        "header": [{ "key": "Authorization", "value": "Bearer {{token}}" }],
        "url": "{{baseUrl}}/pqrs/1"
      }
    }
  ]
}
```

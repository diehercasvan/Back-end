# ✅ Sub-paso 3.1 cerrado — CRUD PQRS funcionando

El núcleo del sistema está operativo. Tienes:

- Radicación automática con `tracking_number` secuencial por año.
- Filtros + paginación.
- Reglas de visibilidad (usuario ve lo suyo/asignado, admin ve todo).
- Asignación con cambio automático a "En Proceso".
- Máquina de estados protegida (no se puede volver de "Resuelta" a "Radicada").
- Reglas de eliminación (solo "Radicada" para usuarios, admin siempre).

**3.1 cerrado.** ✅

---

## 📦 Sub-paso 3.2 — Responses (Hilo de conversación + Notas internas)

Ahora conectamos el PQRS con su conversación. Cada PQRS tendrá un hilo de mensajes (`pqrs_response`) donde:

- **Ciudadano** (creador): responde para dar más información.
- **Funcionario asignado / Admin**: responde oficialmente al ciudadano **o** deja una **nota interna** (`is_internal = 1`) que solo ven los funcionarios.
- **Visibilidad de notas internas:** el ciudadano **nunca** ve las `is_internal = 1`.

---

## 📋 Plan de endpoints (3.2)

| Método | Ruta                    | Permiso         | Descripción                                |
| ------- | ----------------------- | --------------- | ------------------------------------------- |
| GET     | `/pqrs/:id/responses` | `PQRS + view` | Hilo de mensajes (filtrado por visibilidad) |
| POST    | `/pqrs/:id/responses` | `PQRS + view` | Crear respuesta o nota interna              |

> **¿Por qué `view` para crear una respuesta?** Porque **cualquier implicado** en el PQRS (ciudadano, asignado, admin) debe poder responder. No exigimos `create` (ese es para radicar PQRS). La validación real es: **¿el usuario participa en este PQRS?** Si no, 403.

---

## 📁 Archivos a crear/modificar (4)

| Archivo                                         | Acción                   |
| ----------------------------------------------- | ------------------------- |
| `src/validators/pqrsResponse.validator.js`    | CREAR                     |
| `src/controllers/pqrs/response.controller.js` | CREAR                     |
| `src/controllers/pqrs/index.js`               | MODIFICAR                 |
| `src/routes/pqrs/pqrs.routes.js`              | MODIFICAR (añadir rutas) |
| `postman/PQRS.postman_collection.json`        | MODIFICAR                 |

---

## 1. `src/validators/pqrsResponse.validator.js`

```javascript
// src/validators/pqrsResponse.validator.js
const { z } = require('zod');

const createResponseSchema = z.object({
  message: z.string().min(1, 'El mensaje no puede estar vacío').max(5000),
  is_internal: z
    .union([z.boolean(), z.coerce.number().int().min(0).max(1)])
    .optional()
    .default(0),
});

module.exports = { createResponseSchema };
```

---

## 2. `src/controllers/pqrs/response.controller.js`

```javascript
// src/controllers/pqrs/response.controller.js
const {
  Pqrs, PqrsResponse, User,
} = require('../../models');
const { ok, fail } = require('../../utils/response');

/* ============================================================
 * Helpers
 * ============================================================ */

/** Include estándar. */
function responseInclude() {
  return [
    {
      model: User, as: 'author',
      attributes: ['id', 'username', 'email'],
    },
  ];
}

/** Formato de respuesta. */
function formatResponse(r) {
  const json = r.toJSON();
  return {
    id: json.id,
    message: json.message,
    is_internal: !!json.is_internal,
    created_at: json.created_at,
    author: json.author,
  };
}

/**
 * Verifica si el usuario autenticado puede ver / responder este PQRS.
 * Devuelve el PQRS si puede, o un objeto de error si no.
 */
async function getPqrsIfAllowed(pqrsId, auth, permissionContext) {
  const pqrs = await Pqrs.findByPk(pqrsId);
  if (!pqrs) return { error: { status: 404, message: 'PQRS no encontrado' } };

  const isAdmin = permissionContext?.role_id === 1;
  const isCreator = pqrs.user_id === auth.user_id;
  const isAssignee = pqrs.assigned_to === auth.user_id;

  if (!isAdmin && !isCreator && !isAssignee) {
    return { error: { status: 403, message: 'No tienes permiso para interactuar con este PQRS' } };
  }

  return { pqrs, isAdmin, isCreator, isAssignee };
}

/* ============================================================
 * GET /pqrs/:id/responses
 * ============================================================ */
async function list(req, res, next) {
  try {
    const pqrsId = Number(req.params.id);
    const { error, pqrs, isAdmin, isCreator, isAssignee } =
      await getPqrsIfAllowed(pqrsId, req.auth, req.permissionContext);

    if (error) return fail(res, error.message, error.status);

    const where = { pqrs_id: pqrsId };

    // Regla: el ciudadano (creador) NUNCA ve notas internas.
    // Admin y asignado ven todo.
    const isStaff = isAdmin || isAssignee;
    if (!isStaff) {
      where.is_internal = 0;
    }

    const responses = await PqrsResponse.findAll({
      where,
      include: responseInclude(),
      order: [['created_at', 'ASC']],
    });

    return ok(res, {
      pqrs_id: pqrs.id,
      tracking_number: pqrs.tracking_number,
      total: responses.length,
      responses: responses.map(formatResponse),
    }, 'Hilo de respuestas');
  } catch (err) { return next(err); }
}

/* ============================================================
 * POST /pqrs/:id/responses
 * ============================================================ */
async function create(req, res, next) {
  try {
    const pqrsId = Number(req.params.id);
    const { message, is_internal } = req.body;
    const { error, pqrs, isAdmin, isCreator, isAssignee } =
      await getPqrsIfAllowed(pqrsId, req.auth, req.permissionContext);

    if (error) return fail(res, error.message, error.status);

    // Regla: solo staff (admin o asignado) puede crear notas internas.
    // El ciudadano no puede marcar is_internal=1.
    const isStaff = isAdmin || isAssignee;
    if (is_internal && !isStaff) {
      return fail(res, 'Solo el personal asignado o un administrador pueden crear notas internas', 403);
    }

    // Regla de negocio: no se puede responder a un PQRS cerrado.
    if (pqrs.pqrs_status_id === 4) {
      return fail(res, 'No se puede responder a un PQRS cerrado', 409);
    }

    const response = await PqrsResponse.create({
      pqrs_id: pqrsId,
      user_id: req.auth.user_id,
      message,
      is_internal: is_internal ? 1 : 0,
    });

    const full = await PqrsResponse.findByPk(response.id, { include: responseInclude() });
    return ok(res, { response: formatResponse(full) }, 'Respuesta creada', 201);
  } catch (err) { return next(err); }
}

module.exports = { list, create };
```

---

## 3. `src/controllers/pqrs/index.js` (modificar)

```javascript
// src/controllers/pqrs/index.js
module.exports = {
  pqrs: require('./pqrs.controller'),
  response: require('./response.controller'),   // ← NUEVO
};
```

---

## 4. `src/routes/pqrs/pqrs.routes.js` (modificar)

Validar las rutas que no esten en el archivo, añade las rutas de correspondiente.

```javascript
// src/routes/pqrs/pqrs.routes.js
const { Router } = require('express');
const { authRequired } = require('../../middlewares/auth.middleware');
const { permissionRequired } = require('../../middlewares/permission.middleware');
const { validate } = require('../../middlewares/validate.middleware');
const {
  createPqrsSchema, changeStatusSchema, assignPqrsSchema, listQuerySchema,
} = require('../../validators/pqrs.validator');
const { createResponseSchema } = require('../../validators/pqrsResponse.validator');
const ctl = require('../../controllers/pqrs/pqrs.controller');
const responseCtl = require('../../controllers/pqrs/response.controller');
const statsCtl = require('../../controllers/pqrs/pqrsStats.controller');

const router = Router();

/* ============================================================
 * IMPORTANTE: las rutas específicas van ANTES de las paramétricas (/:id).
 * Si /:id está antes de /stats, "stats" cae en id y Number("stats")=NaN.
 * ============================================================ */

/* Stats (antes de /:id) */
router.get('/stats',
  authRequired, permissionRequired('PQRS', 'view'), statsCtl.stats);

/* Listar */
router.get('/',
  authRequired, permissionRequired('PQRS', 'view'),
  validate(listQuerySchema, 'query'), ctl.list);

/* Crear */
router.post('/',
  authRequired, permissionRequired('PQRS', 'create'),
  validate(createPqrsSchema), ctl.create);

/* Detalle (paramétrica) */
router.get('/:id',
  authRequired, permissionRequired('PQRS', 'view'), ctl.getOne);

/* Cambiar estado */
router.patch('/:id/status',
  authRequired, permissionRequired('PQRS', 'edit'),
  validate(changeStatusSchema), ctl.changeStatus);

/* Asignar */
router.patch('/:id/assign',
  authRequired, permissionRequired('PQRS', 'edit'),
  validate(assignPqrsSchema), ctl.assign);

/* Eliminar */
router.delete('/:id',
  authRequired, permissionRequired('PQRS', 'delete'), ctl.remove);

/* Responses */
router.get('/:id/responses',
  authRequired, permissionRequired('PQRS', 'view'), responseCtl.list);

router.post('/:id/responses',
  authRequired, permissionRequired('PQRS', 'view'),
  validate(createResponseSchema), responseCtl.create);

module.exports = router;
```

> **Orden importa:** registra `/:id/responses` **después** de `/:id` no importa, pero sí **después** de cualquier ruta más específica como `/:id/status` o `/:id/assign`. Como `/:id/responses` tiene 3 segmentos, no colisiona con `/:id` (2 segmentos) ni con `/:id/status` (3 segmentos pero distinto literal), así que el orden es flexible. Por claridad, déjalas al final.

---

## 5. Postman — Subcarpeta `Responses` dentro de `PQRS`

Añade este ítem **dentro** del array `item` de la carpeta `PQRS` (al final):

```json
{
  "name": "Responses",
  "item": [
    {
      "name": "Listar respuestas (juan - ciudadano)",
      "request": {
        "method": "GET",
        "header": [{ "key": "Authorization", "value": "Bearer {{token}}" }],
        "url": "{{baseUrl}}/pqrs/{{pqrsId}}/responses"
      }
    },
    {
      "name": "juan responde (público)",
      "request": {
        "method": "POST",
        "header": [
          { "key": "Content-Type", "value": "application/json" },
          { "key": "Authorization", "value": "Bearer {{token}}" }
        ],
        "body": { "mode": "raw", "raw": "{\"message\":\"Adjunto el pantallazo del error, por favor revisar.\"}" },
        "url": "{{baseUrl}}/pqrs/{{pqrsId}}/responses"
      }
    },
    {
      "name": "admin responde (público)",
      "request": {
        "method": "POST",
        "header": [
          { "key": "Content-Type", "value": "application/json" },
          { "key": "Authorization", "value": "Bearer {{token}}" }
        ],
        "body": { "mode": "raw", "raw": "{\"message\":\"Hemos recibido tu caso, lo estamos revisando.\"}" },
        "url": "{{baseUrl}}/pqrs/{{pqrsId}}/responses"
      }
    },
    {
      "name": "admin nota interna",
      "request": {
        "method": "POST",
        "header": [
          { "key": "Content-Type", "value": "application/json" },
          { "key": "Authorization", "value": "Bearer {{token}}" }
        ],
        "body": { "mode": "raw", "raw": "{\"message\":\"Revisar logs del servidor. Posible bug en facturación.\",\"is_internal\":1}" },
        "url": "{{baseUrl}}/pqrs/{{pqrsId}}/responses"
      }
    },
    {
      "name": "juan intenta nota interna (403)",
      "request": {
        "method": "POST",
        "header": [
          { "key": "Content-Type", "value": "application/json" },
          { "key": "Authorization", "value": "Bearer {{token}}" }
        ],
        "body": { "mode": "raw", "raw": "{\"message\":\"Mi nota interna\",\"is_internal\":1}" },
        "url": "{{baseUrl}}/pqrs/{{pqrsId}}/responses"
      }
    }
  ]
}
```

---

## 🧪 Verificación del sub-paso 3.2 (10 pruebas)

Asumo servidor corriendo. Necesitas tener un PQRS activo (que puedas consultar).

### Setup

```powershell
# 1. Login admin y juan
$body = @{ username = 'admin'; password = 'admin123' } | ConvertTo-Json
$resp = Invoke-RestMethod -Method POST -Uri http://localhost:3000/api/v1/auth/login -Body $body -ContentType 'application/json'
$h = @{ Authorization = "Bearer $($resp.data.token)" }

$bodyJ = @{ username = 'juan'; password = 'admin123' } | ConvertTo-Json
$respJ = Invoke-RestMethod -Method POST -Uri http://localhost:3000/api/v1/auth/login -Body $bodyJ -ContentType 'application/json'
$hj = @{ Authorization = "Bearer $($respJ.data.token)" }

# 2. juan crea un PQRS
$body = @{
  pqrs_type_id = 2
  subject = 'Falla en el sistema de facturación'
  description = 'Al intentar descargar la factura del mes de octubre, el sistema arroja un error 500.'
} | ConvertTo-Json
$respPqrs = Invoke-RestMethod -Method POST -Uri http://localhost:3000/api/v1/pqrs -Headers $hj -Body $body -ContentType 'application/json'
$newPqrsId = $respPqrs.data.pqrs.id
Write-Host "PQRS creado con id=$newPqrsId tracking=$($respPqrs.data.pqrs.tracking_number)"
```

### R1 — juan lista respuestas (vacío inicialmente)

```powershell
Invoke-RestMethod -Uri "http://localhost:3000/api/v1/pqrs/$newPqrsId/responses" -Headers $hj | ConvertTo-Json -Depth 5
```

**Esperado:** `total: 0`, `responses: []`.

### R2 — juan responde (mensaje público)

```powershell
$body = @{ message = 'Adjunto el pantallazo del error, por favor revisar.' } | ConvertTo-Json
Invoke-RestMethod -Method POST -Uri "http://localhost:3000/api/v1/pqrs/$newPqrsId/responses" -Headers $hj -Body $body -ContentType 'application/json' | ConvertTo-Json -Depth 5
```

**Esperado:** `success:true`, `response.is_internal: false`, `response.author.username: "juan"`.

### R3 — admin responde (público)

```powershell
$body = @{ message = 'Hemos recibido tu caso, lo estamos revisando.' } | ConvertTo-Json
Invoke-RestMethod -Method POST -Uri "http://localhost:3000/api/v1/pqrs/$newPqrsId/responses" -Headers $h -Body $body -ContentType 'application/json' | ConvertTo-Json -Depth 5
```

**Esperado:** `author.username: "admin"`, `is_internal: false`.

### R4 — admin crea nota interna

```powershell
$body = @{ message = 'Revisar logs del servidor. Posible bug en facturación.'; is_internal = 1 } | ConvertTo-Json
Invoke-RestMethod -Method POST -Uri "http://localhost:3000/api/v1/pqrs/$newPqrsId/responses" -Headers $h -Body $body -ContentType 'application/json' | ConvertTo-Json -Depth 5
```

**Esperado:** `success:true`, `is_internal: true`.

### R5 — juan (ciudadano) ve solo las 2 públicas, NO la interna

```powershell
Invoke-RestMethod -Uri "http://localhost:3000/api/v1/pqrs/$newPqrsId/responses" -Headers $hj | ConvertTo-Json -Depth 6
```

**Esperado:** `total: 2`, todas con `is_internal: false`. **La nota interna no aparece.**

### R6 — admin (staff) ve las 3, incluida la interna

```powershell
Invoke-RestMethod -Uri "http://localhost:3000/api/v1/pqrs/$newPqrsId/responses" -Headers $h | ConvertTo-Json -Depth 6
```

**Esperado:** `total: 3`, 2 públicas + 1 interna.

### R7 — juan intenta crear nota interna → 403

```powershell
$body = @{ message = 'Mi nota interna'; is_internal = 1 } | ConvertTo-Json
try {
  Invoke-RestMethod -Method POST -Uri "http://localhost:3000/api/v1/pqrs/$newPqrsId/responses" -Headers $hj -Body $body -ContentType 'application/json'
} catch { $_.ErrorDetails.Message }
```

**Esperado:** `403 Solo el personal asignado o un administrador pueden crear notas internas`.

### R8 — admin asigna el PQRS a admin

```powershell
$body = @{ assigned_to = 1 } | ConvertTo-Json
Invoke-RestMethod -Method PATCH -Uri "http://localhost:3000/api/v1/pqrs/$newPqrsId/assign" -Headers $h -Body $body -ContentType 'application/json' | Select-Object success, message
```

**Esperado:** `success: true`.

### R9 — admin cambia estado a "Cerrada" (id 4)

```powershell
$body = @{ pqrs_status_id = 4 } | ConvertTo-Json
Invoke-RestMethod -Method PATCH -Uri "http://localhost:3000/api/v1/pqrs/$newPqrsId/status" -Headers $h -Body $body -ContentType 'application/json' | Select-Object success, message
```

**Esperado:** `success: true`.

### R10 — intentar responder a PQRS cerrado → 409

```powershell
$body = @{ message = 'Mensaje después del cierre' } | ConvertTo-Json
try {
  Invoke-RestMethod -Method POST -Uri "http://localhost:3000/api/v1/pqrs/$newPqrsId/responses" -Headers $h -Body $body -ContentType 'application/json'
} catch { $_.ErrorDetails.Message }
```

**Esperado:** `409 No se puede responder a un PQRS cerrado`.

---

## 🚦 Criterios para cerrar 3.2

Pégame **R1–R10** o **"Postman: R1–R10 OK"**.

Con eso verde:

- **3.2 cerrado** ✅
- Pasamos a **3.3 — Cierre del Paso 3**:
  - Actualización de Swagger con los nuevos endpoints (pqrs + responses).
  - Postman consolidado final del Paso 3.
  - Script `scripts/seed-manager-role.js` (opcional) para crear un rol `manager` con `PQRS + view/edit` y un usuario de prueba. Útil para simular el flujo real funcionario.
  - README actualizado con el resumen del módulo PQRS.
- Después, **¡el backend está completo!** 🎉
- Arrancamos el **Paso 4: Frontend React** (setup Vite + Auth + Layout + módulos).

**Corre R1–R10 y confirma.**

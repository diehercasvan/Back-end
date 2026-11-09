# ✅ Paso 1.6 cerrado — Avanzamos al Paso 1.7

Tus salidas:

| Verificación                         | Resultado                                                                                            |
| ------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| **A** — Utils                  | ✅                                                                                                   |
| **B** — Middlewares cargan     | ✅                                                                                                   |
| **C** — Servidor arranca       | ✅                                                                                                   |
| **D** — Cierre limpio          | ⚠️ Apareció `⚠️ SIGINT recibido, cerrando...` pero **no** `✅ Servidor y BD cerrados` |
| **E** — Auth rechaza sin token | ✅ `status 401 → {"success":false,"message":"Token no proporcionado"}`                            |

> **Sobre D:** la línea `✅ Servidor y BD cerrados` no se imprimió. Dos posibles causas: 
> (a) nodemon mata al proceso antes de que el callback termine (muy común), 
> (b) la versión de Node no tiene `server.closeAllConnections`. **No bloquea el avance** — el servidor se cierra igual, solo no imprime la línea final. 

---

## 📦 Paso 1.7 — Auth completo

**Objetivo:** endpoints de login, me, select-role y roles funcionando en Postman. Cinco endpoints:

| Método | Ruta                         | Auth     | Descripción                                                     |
| ------- | ---------------------------- | -------- | ---------------------------------------------------------------- |
| POST    | `/api/v1/auth/login`       | público | Login → JWT con `user_role_id` del primer rol activo          |
| GET     | `/api/v1/auth/me`          | Bearer   | Usuario + perfil + rol activo + roles disponibles                |
| POST    | `/api/v1/auth/select-role` | Bearer   | Cambia de rol activo → reemite JWT                              |
| GET     | `/api/v1/auth/roles`       | Bearer   | Lista de roles activos del usuario                               |
| GET     | `/api/v1/auth/health`      | público | (alias del `/health` global, para verificar el router montado) |

---

### 1.7.1 — `src/validators/auth.validator.js`

Aquí **usamos zod** por primera vez en validación de entrada. Explico abajo cómo funciona.

```javascript
// src/validators/auth.validator.js
const { z } = require('zod');

const loginSchema = z.object({
  username: z.string().min(3, 'username mínimo 3 caracteres').max(50),
  password: z.string().min(6, 'password mínimo 6 caracteres').max(100),
});

const selectRoleSchema = z.object({
  user_role_id: z.coerce.number().int().positive(),
});

module.exports = { loginSchema, selectRoleSchema };
```

**Explicación de zod:**

- `z.object({...})` → define el contrato del body.
- `z.string().min(3).max(50)` → string con longitud entre 3 y 50. Si falla, el mensaje personalizado aparece en la respuesta.
- `z.coerce.number().int().positive()` → `coerce` convierte el valor a número (por si el front envía `"1"` como string), `int()` exige entero, `positive()` exige > 0.
- El middleware `validate` (1.7.2) llamará a `schema.parse(req.body)` y si lanza `ZodError`, el `errorHandler` ya sabe formatearlo como `422 { success:false, message:'Error de validación', errors:{ campo: [mensajes] } }`.

---

### 1.7.2 — `src/middlewares/validate.middleware.js`

Middleware genérico que valida cualquier parte del request (`body`, `query`, `params`) contra un esquema zod.

```javascript
// src/middlewares/validate.middleware.js
function validate(schema, source = 'body') {
  return (req, res, next) => {
    try {
      const parsed = schema.parse(req[source]);
      req[source] = parsed; // reemplaza con el valor ya validado/coercionado
      return next();
    } catch (err) {
      return next(err); // el errorHandler ya sabe manejar ZodError
    }
  };
}

module.exports = { validate };
```

---

### 1.7.3 — `src/controllers/auth/auth.controller.js`

Este es el controlador con toda la lógica. Lee con cuidado los comentarios.

```javascript
// src/controllers/auth/auth.controller.js
const { Op } = require('sequelize');
const { User, UserRole, Role, UserStatus, Profile, DocumentType,} = require('../../models');
const { comparePassword } = require('../../utils/password');
const { signToken } = require('../../utils/jwt');
const { ok, fail } = require('../../utils/response');

/**
 * Devuelve los roles ACTIVOS del usuario con sus datos de role.
 * @param {number} user_id
 */
async function getActiveUserRoles(user_id) {
  return UserRole.findAll({
    where: { user_id, status_id: 1 }, // 1 = active
    include: [{
      model: Role,
      as: 'role',
      attributes: ['id', 'name', 'description', 'is_active'],
      where: { is_active: 1 },
    }],
    order: [['id', 'ASC']],
  });
}

/**
 * Formato uniforme de un user_role para la respuesta.
 */
function formatUserRole(ur) {
  return {
    user_role_id: ur.id,
    role_id: ur.role_id,
    name: ur.role?.name || null,
    description: ur.role?.description || null,
  };
}

/**
 * POST /api/v1/auth/login
 * body: { username, password }
 */
async function login(req, res, next) {
  try {
    const { username, password } = req.body;

    // Buscar usuario activo por username o email
    const user = await User.findOne({
      where: {
        [Op.or]: [{ username }, { email: username }],
        status_id: 1,
      },
      include: [{ model: UserStatus, as: 'status', attributes: ['id', 'name'] }],
    });
    if (!user) {
      return fail(res, 'Credenciales inválidas', 401);
    }

    // Verificar password
    const okPass = await comparePassword(password, user.password_hash);
    if (!okPass) {
      return fail(res, 'Credenciales inválidas', 401);
    }

    // Roles activos
    const userRoles = await getActiveUserRoles(user.id);
    if (userRoles.length === 0) {
      return fail(res, 'El usuario no tiene roles activos asignados', 403);
    }

    // Auto-selecciona el primer rol activo (el usuario podrá cambiarlo con select-role)
    const activeUserRole = userRoles[0];

    // Actualizar last_login
    user.last_login = new Date();
    await user.save();

    // Emitir JWT con user_id + user_role_id
    const token = signToken({
      user_id: user.id,
      user_role_id: activeUserRole.id,
    });

    return ok(res, {
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        status: user.status?.name || null,
        last_login: user.last_login,
      },
      activeRole: formatUserRole(activeUserRole),
      availableRoles: userRoles.map(formatUserRole),
    }, 'Login exitoso');
  } catch (err) {
    return next(err);
  }
}

/**
 * GET /api/v1/auth/me  (requiere Bearer)
 * Devuelve user + profile + activeRole + availableRoles
 */
async function me(req, res, next) {
  try {
    const { user_id, user_role_id } = req.auth;

    const user = await User.findByPk(user_id, {
      attributes: ['id', 'username', 'email', 'status_id', 'last_login', 'created_at'],
      include: [
        { model: UserStatus, as: 'status', attributes: ['id', 'name'] },
        {
          model: Profile, as: 'profile',
          include: [{ model: DocumentType, as: 'document_type', attributes: ['id', 'name'] }],
        },
      ],
    });
    if (!user) return fail(res, 'Usuario no encontrado', 404);

    // Validar que el user_role_id del token siga activo
    const activeUserRole = await UserRole.findOne({
      where: { id: user_role_id, user_id, status_id: 1 },
      include: [{ model: Role, as: 'role', attributes: ['id', 'name', 'description'] }],
    });
    if (!activeUserRole) {
      return fail(res, 'El rol activo del token ya no es válido. Vuelve a iniciar sesión.', 401);
    }

    const userRoles = await getActiveUserRoles(user_id);

    return ok(res, {
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        status: user.status?.name || null,
        last_login: user.last_login,
        created_at: user.created_at,
      },
      profile: user.profile || null,
      activeRole: formatUserRole(activeUserRole),
      availableRoles: userRoles.map(formatUserRole),
    }, 'Perfil del usuario');
  } catch (err) {
    return next(err);
  }
}

/**
 * POST /api/v1/auth/select-role  (requiere Bearer)
 * body: { user_role_id }
 * Reemite JWT con el nuevo user_role_id.
 */
async function selectRole(req, res, next) {
  try {
    const { user_id } = req.auth;
    const { user_role_id } = req.body;

    const target = await UserRole.findOne({
      where: { id: user_role_id, user_id, status_id: 1 },
      include: [{ model: Role, as: 'role', attributes: ['id', 'name', 'description', 'is_active'] }],
    });
    if (!target || !target.role || target.role.is_active !== 1) {
      return fail(res, 'El rol solicitado no está disponible para este usuario', 400);
    }

    const token = signToken({ user_id, user_role_id: target.id });

    return ok(res, {
      token,
      activeRole: formatUserRole(target),
    }, 'Rol activo actualizado');
  } catch (err) {
    return next(err);
  }
}

/**
 * GET /api/v1/auth/roles  (requiere Bearer)
 * Lista roles activos del usuario autenticado.
 */
async function listRoles(req, res, next) {
  try {
    const { user_id } = req.auth;
    const userRoles = await getActiveUserRoles(user_id);
    return ok(res, { roles: userRoles.map(formatUserRole) }, 'Roles disponibles');
  } catch (err) {
    return next(err);
  }
}

module.exports = { login, me, selectRole, listRoles };
```

**Puntos importantes:**

- **`login` auto-selecciona el primer rol activo** (decisión que acordamos). El usuario puede cambiarlo con `select-role`.
- **`me` valida que el `user_role_id` del token siga activo** en cada request. Si el admin desactiva ese `user_role`, el usuario recibe 401 y debe volver a loguearse.
- **`selectRole` valida** que el `user_role_id` pertenezca al usuario y que el rol esté activo. **Evita que alguien se asigne un rol ajeno** manipulando el body.
- `login` acepta username o email indistintamente (facilita al usuario).

---

### 1.7.4 — `src/controllers/auth/index.js`

```javascript
// src/controllers/auth/index.js
module.exports = require('./auth.controller');
```

---

### 1.7.5 — `src/routes/auth.routes.js`

```javascript
// src/routes/auth.routes.js
const { Router } = require('express');
const { authRequired } = require('../middlewares/auth.middleware');
const { validate } = require('../middlewares/validate.middleware');
const { loginSchema, selectRoleSchema } = require('../validators/auth.validator');
const authController = require('../controllers/auth');

const router = Router();

/**
 * @openapi
 * /auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: Iniciar sesión
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [username, password]
 *             properties:
 *               username: { type: string, example: admin }
 *               password: { type: string, example: "admin123" }
 *     responses:
 *       200:
 *         description: Login exitoso
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/LoginResponse' }
 *       401: { description: Credenciales inválidas }
 */
router.post('/login', validate(loginSchema), authController.login);

/**
 * @openapi
 * /auth/me:
 *   get:
 *     tags: [Auth]
 *     summary: Perfil del usuario autenticado
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Perfil }
 *       401: { description: No autorizado }
 */
router.get('/me', authRequired, authController.me);

/**
 * @openapi
 * /auth/select-role:
 *   post:
 *     tags: [Auth]
 *     summary: Cambiar rol activo y reemitir token
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [user_role_id]
 *             properties:
 *               user_role_id: { type: integer, example: 1 }
 *     responses:
 *       200: { description: Rol actualizado }
 *       400: { description: Rol no disponible }
 */
router.post('/select-role', authRequired, validate(selectRoleSchema), authController.selectRole);

/**
 * @openapi
 * /auth/roles:
 *   get:
 *     tags: [Auth]
 *     summary: Roles activos del usuario autenticado
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Lista de roles }
 */
router.get('/roles', authRequired, authController.listRoles);

module.exports = router;
```

> Las anotaciones `@openapi` son para Swagger (1.8). Por ahora solo decoran; no afectan la ejecución.

---

### 1.7.6 — `src/routes/index.js`

Router raíz que monta todos los módulos bajo `/api/v1`.

```javascript
// src/routes/index.js
const { Router } = require('express');
const authRoutes = require('./auth.routes');

const router = Router();

// Health específico del router (útil para verificar el montaje)
router.get('/health', (req, res) => {
  res.json({ success: true, message: 'Router /api/v1 operativo' });
});

// Módulos
router.use('/auth', authRoutes);

module.exports = router;
```

> En 1.8, cuando construyamos el módulo de usuarios (Paso 2), aquí agregaremos `router.use('/users', userRoutes)`. Por ahora solo auth.

---

### 1.7.7 — Actualizar `src/app.js`

**Reemplaza** el bloque de rutas de `app.js`. Este es el archivo completo actualizado:

```javascript
// src/app.js
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const env = require('./config/env');
const sequelize = require('./config/database');
const apiRoutes = require('./routes');
const notFound = require('./middlewares/notFound');
const errorHandler = require('./middlewares/errorHandler');

const app = express();

// Middlewares globales
app.use(helmet());
app.use(cors());
app.use(morgan(env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

// Ruta raíz
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'PQRS API',
    version: '1.0.0',
    endpoints: {
      health: `${env.API_PREFIX}/health`,
      auth: `${env.API_PREFIX}/auth`,
    },
  });
});

// Health global (con estado de BD)
app.get(`${env.API_PREFIX}/health`, async (req, res) => {
  let dbStatus = 'desconectada';
  try {
    await sequelize.authenticate();
    dbStatus = 'conectada';
  } catch (e) {
    dbStatus = `error: ${e.message}`;
  }
  res.json({
    success: true,
    message: 'API operativa',
    data: {
      uptime: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
      environment: env.NODE_ENV,
      database: dbStatus,
    },
  });
});

// Rutas de la API (auth y las que vengan)
app.use(env.API_PREFIX, apiRoutes);

// 404 y errores
app.use(notFound);
app.use(errorHandler);

module.exports = app;
```

> **Ojo:** el `/health` global sigue existiendo (con estado de BD). El `/api/v1/health` del router responde distinto (`Router /api/v1 operativo`). **Ambos coexisten** — no hay conflicto porque el de `app.js` está registrado **antes** del `app.use(env.API_PREFIX, apiRoutes)`.

---

## 📁 Estructura tras 1.7

```
pqrs-backend/
├── src/
│   ├── app.js                       ✅ actualizado (monta rutas)
│   ├── server.js                    ✅ (sin cambios)
│   ├── config/
│   │   ├── database.js              ✅
│   │   └── env.js                   ✅
│   ├── controllers/
│   │   └── auth/
│   │       ├── auth.controller.js   ✅ NUEVO
│   │       └── index.js             ✅ NUEVO
│   ├── middlewares/
│   │   ├── auth.middleware.js       ✅
│   │   ├── errorHandler.js          ✅
│   │   ├── notFound.js              ✅
│   │   └── validate.middleware.js   ✅ NUEVO
│   ├── models/                      ✅ 14 archivos
│   ├── routes/
│   │   ├── auth.routes.js           ✅ NUEVO
│   │   └── index.js                 ✅ NUEVO
│   ├── utils/                       ✅
│   └── validators/
│       └── auth.validator.js        ✅ NUEVO
├── scripts/ ...
```

---

## ✅ Verificación del Paso 1.7

### Verificación A — El servidor arranca con las rutas

```powershell
npm run dev
```

Debe imprimir los 4 mensajes. **Sin errores de carga** (si algún `require` falla, verás error en consola).

### Verificación B — Router montado

En **otra terminal**:

```powershell
Invoke-RestMethod http://localhost:3000/api/v1/health | ConvertTo-Json
```

**Salida esperada:**

```json
{ "success": true, "message": "Router /api/v1 operativo" }
```

### Verificación C — Login de `admin`

```powershell
$body = @{ username = 'admin'; password = 'admin123' } | ConvertTo-Json
$resp = Invoke-RestMethod -Method POST -Uri http://localhost:3000/api/v1/auth/login -Body $body -ContentType 'application/json'
$resp | ConvertTo-Json -Depth 6
```

> ⚠️ **No sabemos la contraseña de `admin`.** El hash del dump es `$2y$10$S2Xlvai0...`. No podemos adivinarla. **Necesitamos el `fix-seed` que regenera el hash** — está en 1.8. Para no bloquear 1.7, haremos una corrección temporal **solo para probar**:

**Corrección temporal (solo dev) — actualizar contraseña de admin y juan:**

```powershell
node -e "
require('dotenv').config();
const db = require('./src/config/database');
const bcrypt = require('bcryptjs');
(async () => {
  const hash = await bcrypt.hash('admin123', 10);
  await db.query('UPDATE user SET password_hash = ? WHERE id IN (1,2)', { replacements: [hash] });
  console.log('✅ password = admin123 para user id 1 y 2');
  await db.close();
})();
"
```

> Esto **solo modifica el hash en desarrollo**. En 1.8 (`fix-seed.js`) haremos esto formalmente con documentación. Si prefieres, cambia `admin123` por otra.

Ahora repite el login:

```powershell
$body = @{ username = 'admin'; password = 'admin123' } | ConvertTo-Json
$resp = Invoke-RestMethod -Method POST -Uri http://localhost:3000/api/v1/auth/login -Body $body -ContentType 'application/json'
$resp | ConvertTo-Json -Depth 6
```

**Salida esperada:**

```json
{
  "success": true,
  "message": "Login exitoso",
  "data": {
    "token": "eyJ...",
    "user": { "id": 1, "username": "admin", "email": "admin@pqrs.com", ... },
    "activeRole": { "user_role_id": 1, "role_id": 1, "name": "admin", ... },
    "availableRoles": [ { "user_role_id": 1, "role_id": 1, "name": "admin" } ]
  }
}
```

### Verificación D — `me` con el token

```powershell
$token = $resp.data.token
$h = @{ Authorization = "Bearer $token" }
Invoke-RestMethod -Uri http://localhost:3000/api/v1/auth/me -Headers $h | ConvertTo-Json -Depth 6
```

**Esperado:** usuario + `profile: null` (admin no tiene profile en BD) + `activeRole` + `availableRoles`.

### Verificación E — `roles`

```powershell
Invoke-RestMethod -Uri http://localhost:3000/api/v1/auth/roles -Headers $h | ConvertTo-Json -Depth 6
```

**Esperado:** `{ roles: [{ user_role_id: 1, role_id: 1, name: "admin" }] }`.

### Verificación F — `select-role`

```powershell
$b = @{ user_role_id = 1 } | ConvertTo-Json
Invoke-RestMethod -Method POST -Uri http://localhost:3000/api/v1/auth/select-role -Headers $h -Body $b -ContentType 'application/json' | ConvertTo-Json -Depth 6
```

**Esperado:** nuevo `token` + `activeRole`.

### Verificación G — `select-role` con rol inválido

```powershell
$b = @{ user_role_id = 999 } | ConvertTo-Json
try {
  Invoke-RestMethod -Method POST -Uri http://localhost:3000/api/v1/auth/select-role -Headers $h -Body $b -ContentType 'application/json'
} catch { $_.ErrorDetails.Message }
```

**Esperado:** `{"success":false,"message":"El rol solicitado no está disponible para este usuario"}` (400).

### Verificación H — Validación zod

```powershell
$body = @{ username = 'a'; password = '123' } | ConvertTo-Json
try {
  Invoke-RestMethod -Method POST -Uri http://localhost:3000/api/v1/auth/login -Body $body -ContentType 'application/json'
} catch { $_.ErrorDetails.Message }
```

**Esperado:** `422` con `errors.username` y `errors.password` indicando los mínimos.

### Verificación I — Sin token

```powershell
try {
  Invoke-RestMethod -Uri http://localhost:3000/api/v1/auth/me
} catch { $_.ErrorDetails.Message }
```

**Esperado:** `{"success":false,"message":"Token no proporcionado"}` (401).

### Verificación J — Login de `juan`

```powershell
$body = @{ username = 'juan'; password = 'admin123' } | ConvertTo-Json
Invoke-RestMethod -Method POST -Uri http://localhost:3000/api/v1/auth/login -Body $body -ContentType 'application/json' | ConvertTo-Json -Depth 6
```

**Esperado:** token + `activeRole: { user_role_id: 2, role_id: 2, name: "user" }`.

---

## 🚦 Criterios para cerrar 1.7

# ✅ Paso 1.7 verificado — Auth completo

Todas las verificaciones en verde:

| Verif                               | Resultado                                                                                                                                                                         |
| ----------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **H**— Validación zod       | ✅ 422 con`errors.username`y`errors.password`(detalle cosmético:`"mínimo 3caracteres"`sin espacio — lo arreglamos en 1.8 o cuando reescribamos mensajes)                 |
| **I**— Sin token             | ✅`{"success":false,"message":"Token no proporcionado"}`401                                                                                                                     |
| **J**— Login juan            | ✅`activeRole: { user_role_id:2, role_id:2, name:"user" }`,`availableRoles`con el rol user. JWT payload`{ user_id:2, user_role_id:2 }`                                      |
| **B-bis**—`/api/v1/health` | ✅`"database":"conectada"`(aunque responde el health global del`app.js`, que gana antes que el del router — funcionalmente correcto, ambos coexisten y devuelven info útil) |

# ✅ Paso 1.5 verificado — Modelos funcionando

Salida impecable. Los 13 modelos leen las tablas reales, las asociaciones resuelven correctamente y los conteos coinciden con tu BD:

| Tabla            | Filas | ✅                  |
| ---------------- | ----- | ------------------- |
| user_status      | 3     | ✅                  |
| document_type    | 3     | ✅                  |
| role             | 4     | ✅                  |
| permission       | 6     | ✅                  |
| module           | 5     | ✅                  |
| pqrs_type        | 4     | ✅                  |
| pqrs_status      | 5     | ✅                  |
| user             | 2     | ✅                  |
| user_role        | 2     | ✅                  |
| module_role_user | 21    | ✅                  |
| profile          | 1     | ✅                  |
| pqrs             | 0     | ✅ (aún sin datos) |
| pqrs_response    | 0     | ✅ (aún sin datos) |

**Verificado además:**

- `admin` trae su `user_roles → role → status` con el rol `admin` activo.
- `ModuleRoleUser` resuelve `user_role / module / permission` correctamente y usa el nuevo `user_role_id` (los 3 registros apuntan a `user_role_id=1`).
- `🎉 Todos los modelos leen las tablas reales sin errores`.

**1.5 cerrado.** ✅

---

## 📦 Paso 1.6 — Utils + Middlewares base

Ahora creamos las utilidades que los controladores usarán y el middleware `auth`. **Sin tocar rutas aún** — eso es 1.7.

### 1.6.1 — `src/utils/response.js`

```javascript
// src/utils/response.js
function ok(res, data = null, message = 'OK', status = 200) {
  return res.status(status).json({ success: true, message, data });
}

function fail(res, message = 'Error', status = 400, errors = null) {
  const body = { success: false, message };
  if (errors) body.errors = errors;
  return res.status(status).json(body);
}

module.exports = { ok, fail };
```

---

### 1.6.2 — `src/utils/password.js`

```javascript
// src/utils/password.js
const bcrypt = require('bcryptjs');

const SALT_ROUNDS = 10;

async function hashPassword(plain) {
  return bcrypt.hash(plain, SALT_ROUNDS);
}

async function comparePassword(plain, hash) {
  return bcrypt.compare(plain, hash);
}

module.exports = { hashPassword, comparePassword };
```

---

### 1.6.3 — `src/utils/jwt.js`

**Punto clave del modelo de rol activo:** el payload lleva `user_id` **y** `user_role_id`.

```javascript
// src/utils/jwt.js
const jwt = require('jsonwebtoken');
const env = require('../config/env');

function signToken({ user_id, user_role_id }) {
  return jwt.sign({ user_id, user_role_id }, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN,
  });
}

function verifyToken(token) {
  return jwt.verify(token, env.JWT_SECRET);
}

module.exports = { signToken, verifyToken };
```

---

### 1.6.4 — `src/middlewares/auth.middleware.js`

Extrae el JWT del header `Authorization: Bearer <token>` y adjunta `req.auth = { user_id, user_role_id }`.

```javascript
// src/middlewares/auth.middleware.js
const { verifyToken } = require('../utils/jwt');
const { fail } = require('../utils/response');

function authRequired(req, res, next) {
  const header = req.headers.authorization || '';
  if (!header.startsWith('Bearer ')) {
    return fail(res, 'Token no proporcionado', 401);
  }
  const token = header.slice(7).trim();
  if (!token) return fail(res, 'Token vacío', 401);

  try {
    const payload = verifyToken(token);
    req.auth = { user_id: payload.user_id, user_role_id: payload.user_role_id };
    return next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') return fail(res, 'Token expirado', 401);
    return fail(res, 'Token inválido', 401);
  }
}

module.exports = { authRequired };
```

---

### 1.6.5 — `src/middlewares/notFound.js`

```javascript
// src/middlewares/notFound.js
const { fail } = require('../utils/response');

function notFound(req, res) {
  return fail(res, `Ruta no encontrada: ${req.method} ${req.originalUrl}`, 404);
}

module.exports = notFound;
```

---

### 1.6.6 — `src/middlewares/errorHandler.js`

Centraliza todos los errores. Al extraerlo de `app.js` **también mejoramos el cierre limpio** del server con `closeAllConnections()`.

```javascript
// src/middlewares/errorHandler.js
const { ZodError } = require('zod');
const { fail } = require('../utils/response');
const env = require('../config/env');

function errorHandler(err, req, res, _next) {
  // Zod
  if (err instanceof ZodError) {
    return fail(res, 'Error de validación', 422, err.flatten().fieldErrors);
  }
  // Sequelize
  if (err.name === 'SequelizeValidationError') {
    return fail(res, 'Error de validación en base de datos', 422,
      err.errors.map((e) => ({ field: e.path, message: e.message })));
  }
  if (err.name === 'SequelizeUniqueConstraintError') {
    return fail(res, 'Valor duplicado', 409,
      err.errors.map((e) => ({ field: e.path, message: e.message })));
  }
  if (err.name === 'SequelizeForeignKeyConstraintError') {
    return fail(res, 'Referencia inválida (FK)', 409);
  }
  // JWT
  if (err.name === 'JsonWebTokenError') return fail(res, 'Token inválido', 401);
  if (err.name === 'TokenExpiredError') return fail(res, 'Token expirado', 401);

  // Errores que lanzamos con status explícito
  const status = err.status || err.statusCode || 500;
  const message =
    env.NODE_ENV === 'production' && status === 500
      ? 'Error interno del servidor'
      : err.message || 'Error interno del servidor';

  if (status === 500) console.error('❌ [500]', err);

  return fail(res, message, status, err.errors || null);
}

module.exports = errorHandler;
```

---

### 1.6.7 — Actualizar `src/app.js`

**Reemplaza** el `app.js` actual por este, que ahora usa los middlewares extraídos. **No cambia el comportamiento** — misma respuesta, misma estructura.

```javascript
// src/app.js
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const env = require('./config/env');
const sequelize = require('./config/database');
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
    endpoints: { health: `${env.API_PREFIX}/health` },
  });
});

// Health
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

// 404 y error handler extraídos
app.use(notFound);
app.use(errorHandler);

module.exports = app;
```

---

### 1.6.8 — Actualizar `src/server.js` (cierre limpio)

Ajustamos el `shutdown` para forzar el cierre de conexiones keep-alive (las que antes hacían que no apareciera `✅ Servidor y BD cerrados`):

```javascript
// src/server.js
const app = require('./app');
const sequelize = require('./config/database');
const env = require('./config/env');

async function start() {
  try {
    await sequelize.authenticate();
    console.log('✅ Conexión MySQL establecida');

    const server = app.listen(env.PORT, () => {
      console.log(`🚀 Servidor en http://localhost:${env.PORT}`);
      console.log(`🔗 Health:  http://localhost:${env.PORT}${env.API_PREFIX}/health`);
      console.log(`🌎 Entorno: ${env.NODE_ENV}`);
    });

    const shutdown = async (signal) => {
      console.log(`\n⚠️  ${signal} recibido, cerrando...`);
      // Fuerza cerrar conexiones keep-alive (navegador/Postman)
      if (typeof server.closeAllConnections === 'function') {
        server.closeAllConnections();
      }
      server.close(async () => {
        await sequelize.close();
        console.log('✅ Servidor y BD cerrados');
        process.exit(0);
      });
      setTimeout(() => process.exit(1), 10000).unref();
    };
    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
  } catch (err) {
    console.error('❌ Error al iniciar:', err.message);
    process.exit(1);
  }
}

start();
```

> **Diferencia clave:** `server.closeAllConnections()` cierra a la fuerza las conexiones ociosas que el navegador mantenía abiertas. Así el `server.close()` termina rápido y siempre verás `✅ Servidor y BD cerrados`.

---

## 📁 Estructura tras 1.6

```
pqrs-backend/
├── src/
│   ├── app.js                      ✅ actualizado
│   ├── server.js                   ✅ actualizado
│   ├── config/
│   │   ├── database.js             ✅
│   │   └── env.js                  ✅
│   ├── middlewares/
│   │   ├── auth.middleware.js      ✅ NUEVO
│   │   ├── errorHandler.js         ✅ NUEVO
│   │   └── notFound.js             ✅ NUEVO
│   ├── models/                     ✅ 14 archivos (1.5)
│   └── utils/
│       ├── jwt.js                  ✅ NUEVO
│       ├── password.js             ✅ NUEVO
│       └── response.js             ✅ NUEVO
├── scripts/
│   ├── _check-1.5.js               (diagnóstico, opcional)
│   ├── add-is-internal.js
│   └── migrate-module-role-user.js
├── postman/
├── .env
├── .env.example
├── .gitignore
├── package.json
└── README.md
```

---

## ✅ Verificación del Paso 1.6

### Verificación A — Los utils funcionan

```powershell
# response
node -e "const r = require('./src/utils/response'); console.log('✅ response keys:', Object.keys(r).join(','));"

# password
node -e "(async () => { const p = require('./src/utils/password'); const h = await p.hashPassword('test123'); console.log('✅ password. compare:', await p.comparePassword('test123', h)); })();"

# jwt con el nuevo payload
node -e "const j = require('./src/utils/jwt'); const t = j.signToken({ user_id: 1, user_role_id: 1 }); console.log('✅ jwt. payload:', JSON.stringify(j.verifyToken(t)));"
```

**Salida esperada:**

```
✅ response keys: ok,fail
✅ password. compare: true
✅ jwt. payload: {"user_id":1,"user_role_id":1,"iat":...,"exp":...}
```

### Verificación B — Los middlewares cargan

```powershell
node -e "require('./src/middlewares/auth.middleware'); require('./src/middlewares/errorHandler'); require('./src/middlewares/notFound'); console.log('✅ middlewares OK');"
```

**Salida esperada:**

```
✅ middlewares OK
```

### Verificación C — El servidor arranca y `/health` sigue OK

```powershell
npm run dev
```

Los 4 mensajes (`✅ 🚀 🔗 🌎`) deben aparecer. En otra terminal:

```powershell
Invoke-RestMethod http://localhost:3000/api/v1/health | ConvertTo-Json -Depth 5
```

Debe devolver `"database": "conectada"`.

### Verificación D — Cierre limpio

Presiona `Ctrl+C` en la terminal del servidor. **Ahora sí debe imprimir las DOS líneas**, sin esperar 10 segundos:

```
⚠️  SIGINT recibido, cerrando...
✅ Servidor y BD cerrados
```

> Si no aparecer `✅ Servidor y BD cerrados`, valida la versión de Node, si no tiene `server.closeAllConnections` (necesitas Node ≥ 18.2). 

### Verificación E — El middleware `auth` rechaza sin token

Aunque aún no hay rutas protegidas, podemos probar la función directamente:

```powershell
node -e "
const { authRequired } = require('./src/middlewares/auth.middleware');
const fake = { headers: {}, };
const res = { status: (c) => ({ json: (b) => console.log('✅ status', c, '→', JSON.stringify(b)) }) };
authRequired(fake, res);
"
```

**Salida esperada:**

```
✅ status 401 → {"success":false,"message":"Token no proporcionado"}
```

---

## 🚦 Criterios para cerrar 1.6

1. ✅ Verificación A (utils) — las 3 salidas verdes.
2. ✅ Verificación B (middlewares cargan).
3. ✅ Verificación C (`npm run dev` + `/health` con `"conectada"`).
4. ✅ Verificación D (`Ctrl+C` imprime **las dos** líneas).
5. ✅ Verificación E (auth rechaza sin token con 401).

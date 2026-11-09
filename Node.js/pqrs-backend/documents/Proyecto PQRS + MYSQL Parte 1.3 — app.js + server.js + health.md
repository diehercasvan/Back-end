# ✅ Paso 1.2 validado — Avanzamos al Paso 1.3

Ahora creamos el **servidor mínimo funcional**: `app.js` + `server.js` con un endpoint `/health` que confirma que Express y MySQL están operativos. **Sin auth, sin modelos, sin migraciones aún.**

---

## 📦 Paso 1.3 — `app.js` + `server.js` + `/health`

### 1.3.1 — `src/app.js`

Crea **`src/app.js`** con este contenido exacto:

```javascript
// src/app.js
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const env = require('./config/env');
const sequelize = require('./config/database');

const app = express();

// ===== Middlewares globales =====
app.use(helmet());
app.use(cors());
app.use(morgan(env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

// ===== Ruta raíz informativa =====
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'PQRS API',
    version: '1.0.0',
    endpoints: {
      health: `${env.API_PREFIX}/health`,
    },
  });
});

// ===== Health check (incluye estado de la BD) =====
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

// ===== 404 (inline por ahora; se extrae en 1.6) =====
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Ruta no encontrada: ${req.method} ${req.originalUrl}`,
  });
});

// ===== Error handler (inline por ahora; se extrae en 1.6) =====
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  const status = err.status || err.statusCode || 500;
  const message =
    env.NODE_ENV === 'production' && status === 500
      ? 'Error interno del servidor'
      : err.message || 'Error interno del servidor';
  if (status === 500) console.error('❌ [500]', err);
  res.status(status).json({ success: false, message });
});

module.exports = app;
```

**Qué hace cada pieza:**

- `helmet()` → cabeceras de seguridad HTTP (protección básica).
- `cors()` → permite peticiones desde el frontend React en otro puerto.
- `morgan` → log de cada request en consola (`dev` en desarrollo, `combined` en producción).
- `express.json()` / `urlencoded()` → parseo de body.
- `GET /` → info básica de la API.
- `GET /api/v1/health` → verifica `sequelize.authenticate()` en tiempo real y devuelve estado de la BD.
- 404 y error handler **inline** por ahora. En 1.6 los extraemos a `middlewares/notFound.js` y `middlewares/errorHandler.js`.

---

### 1.3.2 — `src/server.js`

Crea **`src/server.js`** con este contenido exacto:

```javascript
// src/server.js
const app = require('./app');
const sequelize = require('./config/database');
const env = require('./config/env');

async function start() {
  try {
    // 1. Probar conexión a la BD
    await sequelize.authenticate();
    console.log('✅ Conexión MySQL establecida');

    // 2. Levantar servidor HTTP
    const server = app.listen(env.PORT, () => {
      console.log(`🚀 Servidor en http://localhost:${env.PORT}`);
      console.log(`🔗 Health:  http://localhost:${env.PORT}${env.API_PREFIX}/health`);
      console.log(`🌎 Entorno: ${env.NODE_ENV}`);
    });

    // 3. Cierre limpio
    const shutdown = async (signal) => {
      console.log(`\n⚠️  ${signal} recibido, cerrando...`);
      server.close(async () => {
        await sequelize.close();
        console.log('✅ Servidor y BD cerrados');
        process.exit(0);
      });
      // Fuerza cierre si algo se cuelga
      setTimeout(() => process.exit(1), 10000);
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

**Qué hace:**

1. Valida env (ya lo hace `config/env.js` al importarse) y prueba conexión a MySQL **antes** de aceptar peticiones.
2. Levanta el servidor solo si la BD responde.
3. Captura `Ctrl+C` (`SIGINT`) y `SIGTERM` para cerrar conexiones ordenadamente.
4. Si falla algo al arrancar, sale con código 1 (útil para pipelines).

---

## 📁 Estructura tras 1.3

```
pqrs-backend/
├── src/
│   ├── app.js              ✅ NUEVO
│   ├── server.js           ✅ NUEVO
│   ├── config/
│   │   ├── env.js          ✅ (1.2)
│   │   └── database.js     ✅ (1.2)
│   ├── controllers/        (vacío)
│   ├── middlewares/        (vacío)
│   ├── models/             (vacío)
│   ├── routes/             (vacío)
│   ├── utils/              (vacío)
│   └── validators/         (vacío)
├── scripts/
├── postman/
├── .env
├── .env.example
├── .gitignore
├── package.json
└── README.md
```

---

## ✅ Verificación del Paso 1.3

### Verificación A — El servidor arranca

Desde `pqrs-backend/`:

```powershell
npm run dev
```

**Salida esperada en consola:**

```
[nodemon] 3.x.x
[nodemon] to restart at any time, enter `rs`
[nodemon] watching path(s): *.*
[nodemon] starting `node src/server.js`
✅ Conexión MySQL establecida
🚀 Servidor en http://localhost:3000
🔗 Health:  http://localhost:3000/api/v1/health
🌎 Entorno: development
```

Si ves esos 4 mensajes ✅🚀🔗🌎, el servidor está arriba. **Deja esa terminal abierta.**

---

### Verificación B — Probar los endpoints (en otra terminal)

**Opción 1 — PowerShell `Invoke-RestMethod`:**

```powershell
# Raíz
Invoke-RestMethod http://localhost:3000/ | ConvertTo-Json

# Health
Invoke-RestMethod http://localhost:3000/api/v1/health | ConvertTo-Json

# 404 (ruta inexistente)
try { Invoke-RestMethod http://localhost:3000/no-existe } catch { $_.ErrorDetails.Message }
```

**Opción 2 — Navegador / Postman / curl:**

- `http://localhost:3000/` → JSON con `message: "PQRS API"`
- `http://localhost:3000/api/v1/health` → JSON con `database: "conectada"`
- `http://localhost:3000/no-existe` → `{ success:false, message:"Ruta no encontrada..." }`

**Salida esperada de `/api/v1/health`:**

```json
{
  "success": true,
  "message": "API operativa",
  "data": {
    "uptime": 5,
    "timestamp": "2026-11-09T...",
    "environment": "development",
    "database": "conectada"
  }
}
```

> ⚠️ El campo **`database` debe ser `"conectada"`**, no `"error: ..."`. Si dice `"error: ..."`, revisa `.env`.

---

### Verificación C — Cierre limpio

En la terminal del servidor, presiona `Ctrl+C`. Debe imprimir:

```
⚠️  SIGINT recibido, cerrando...
✅ Servidor y BD cerrados
```

Y volver al prompt sin colgarse.

---

## 🚦 No avanzamos hasta que:

1. ✅ `npm run dev` imprime los 4 mensajes (`✅ Conexión MySQL`, `🚀 Servidor`, `🔗 Health`, `🌎 Entorno`).
2. ✅ `GET http://localhost:3000/api/v1/health` devuelve `"database": "conectada"`.
3. ✅ `GET http://localhost:3000/no-existe` devuelve 404 con `success:false`.
4. ✅ `Ctrl+C` cierra limpiamente.

---

## 🔜 Siguiente: Paso 1.4 — Ajustes de BD

Cuando 1.3 esté verde, te entrego **1.4**:

- `scripts/add-is-internal.js` (agrega columna `is_internal` a `pqrs_response`, idempotente)
- `scripts/migrate-module-role-user.js` (migra `module_role_user` a `user_role_id` en transacción con rollback)
- Actualización de `package.json` con los scripts `add:is-internal` y `migrate:mru`
- Instrucciones de verificación con `DESCRIBE pqrs_response` y `DESCRIBE module_role_user`

**Pega las salidas de A, B y C (o un "✅ 1.3 OK") y sigo con 1.4.**

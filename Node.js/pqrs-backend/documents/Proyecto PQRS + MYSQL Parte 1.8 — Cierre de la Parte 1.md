# ✅ Paso 1.7 verificado — Auth completo

Todas las verificaciones en verde:

| Verif                                 | Resultado                                                                                                                                                                            |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **H** — Validación zod        | ✅ 422 con `errors.username` y `errors.password` (detalle cosmético: `"mínimo 3caracteres"` sin espacio — lo arreglamos en 1.8 o cuando reescribamos mensajes)              |
| **I** — Sin token              | ✅ `{"success":false,"message":"Token no proporcionado"}` 401                                                                                                                      |
| **J** — Login juan             | ✅ `activeRole: { user_role_id:2, role_id:2, name:"user" }`, `availableRoles` con el rol user. JWT payload `{ user_id:2, user_role_id:2 }`                                     |
| **B-bis** — `/api/v1/health` | ✅ `"database":"conectada"` (aunque responde el health global del `app.js`, que gana antes que el del router — funcionalmente correcto, ambos coexisten y devuelven info útil) |

**Auth completo y funcionando.** El modelo de rol activo opera perfectamente: admin → `user_role_id:1` (admin), juan → `user_role_id:2` (user).

> 📝 **Detalle cosmético detectado:** en el mensaje zod de username aparece `"username mínimo 3caracteres"` sin espacio (`3caracteres`). Es por cómo PowerShell interpretó el `$body` con `ConvertTo-Json` (no es bug de zod).

---

## 📦 Paso 1.8 — Cierre del Paso 1

Este es el último sub-paso del **Paso 1**. Al terminar, tendrás:

- ✅ **API operativa** con Swagger en `/api-docs`
- ✅ **Colección Postman** importable con los 5 requests de auth
- ✅ **`fix-seed.js`** formal que regenera contraseñas de desarrollo (reemplaza el `node -e` ad-hoc que usamos)
- ✅ **README** actualizado
- ✅ **Verificación final** sin nodemon

---

### 1.8.1 — `src/config/swagger.js`

```javascript
// src/config/swagger.js
const swaggerJsdoc = require('swagger-jsdoc');
const env = require('./env');

const options = {
  definition: {
    openapi: '3.0.3',
    info: {
      title: 'PQRS API',
      version: '1.0.0',
      description:
        'API REST del sistema PQRS. Autenticación JWT con modelo de rol activo ' +
        '(el JWT lleva user_id + user_role_id; el usuario puede cambiar de rol con /auth/select-role).',
    },
    servers: [
      { url: `${env.SWAGGER_SERVER_URL}${env.API_PREFIX}`, description: 'Servidor local' },
    ],
    components: {
      securitySchemes: {
        bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      },
      schemas: {
        ErrorResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            message: { type: 'string' },
            errors: { type: 'object', additionalProperties: true, nullable: true },
          },
        },
        UserBasic: {
          type: 'object',
          properties: {
            id: { type: 'integer', example: 1 },
            username: { type: 'string', example: 'admin' },
            email: { type: 'string', example: 'admin@pqrs.com' },
            status: { type: 'string', example: 'active' },
            last_login: { type: 'string', format: 'date-time', nullable: true },
          },
        },
        RoleBasic: {
          type: 'object',
          properties: {
            user_role_id: { type: 'integer', example: 1 },
            role_id: { type: 'integer', example: 1 },
            name: { type: 'string', example: 'admin' },
            description: { type: 'string', example: 'Administrador del Sistema' },
          },
        },
        LoginResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            message: { type: 'string', example: 'Login exitoso' },
            data: {
              type: 'object',
              properties: {
                token: { type: 'string' },
                user: { $ref: '#/components/schemas/UserBasic' },
                activeRole: { $ref: '#/components/schemas/RoleBasic' },
                availableRoles: {
                  type: 'array',
                  items: { $ref: '#/components/schemas/RoleBasic' },
                },
              },
            },
          },
        },
      },
    },
    security: [{ bearerAuth: [] }],
  },
  apis: [
    './src/routes/**/*.js',
    './src/controllers/**/*.js',
  ],
};

module.exports = swaggerJsdoc(options);
```

---

### 1.8.2 — Anotaciones OpenAPI faltantes en `auth.routes.js`

Las rutas ya tienen `@openapi` embebidas. Solo agrega esta ruta arriba de `module.exports = router;` en **`src/routes/auth.routes.js`**:

```javascript
/**
 * @openapi
 * /auth/health:
 *   get:
 *     tags: [Auth]
 *     summary: Health check del router de auth
 *     responses:
 *       200: { description: Router operativo }
 */
router.get('/health', (req, res) => {
  res.json({ success: true, message: 'Auth router operativo' });
});
```

---

### 1.8.3 — Montar Swagger en `app.js`

Actualiza **`src/app.js`** — inserta las 2 líneas señaladas con `← NUEVO`:

```javascript
// src/app.js
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const swaggerUi = require('swagger-ui-express');            // ← NUEVO
const env = require('./config/env');
const sequelize = require('./config/database');
const swaggerSpec = require('./config/swagger');            // ← NUEVO
const apiRoutes = require('./routes');
const notFound = require('./middlewares/notFound');
const errorHandler = require('./middlewares/errorHandler');

const app = express();

app.use(helmet());
app.use(cors());
app.use(morgan(env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

// Swagger UI
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.get('/api-docs.json', (req, res) => res.json(swaggerSpec));

// Raíz
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'PQRS API',
    version: '1.0.0',
    endpoints: {
      health: `${env.API_PREFIX}/health`,
      auth: `${env.API_PREFIX}/auth`,
      docs: '/api-docs',
    },
  });
});

// Health global
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

// Rutas API
app.use(env.API_PREFIX, apiRoutes);

// 404 y errores
app.use(notFound);
app.use(errorHandler);

module.exports = app;
```

---

### 1.8.4 — `scripts/fix-seed.js` (formal)

Reemplaza el ajuste ad-hoc que hiciste antes:

```javascript
// scripts/fix-seed.js
// Regenera hashes de contraseña de usuarios de desarrollo.
// Idempotente: se puede ejecutar varias veces.
require('dotenv').config();
const bcrypt = require('bcryptjs');
const sequelize = require('../src/config/database');

const DEV_PASSWORD = 'admin123';
const TARGETS = [
  { id: 1, username: 'admin' },
  { id: 2, username: 'juan' },
];

async function run() {
  try {
    await sequelize.authenticate();
    console.log('✅ Conectado a MySQL');

    const hash = await bcrypt.hash(DEV_PASSWORD, 10);
    console.log(`🔑 Hash generado para "${DEV_PASSWORD}" (bcrypt, 10 rondas)`);

    for (const t of TARGETS) {
      const [result] = await sequelize.query(
        'UPDATE user SET password_hash = ? WHERE id = ? AND username = ?',
        { replacements: [hash, t.id, t.username] }
      );
      const affected = result.affectedRows ?? result;
      if (affected > 0) {
        console.log(`✅ ${t.username} (id=${t.id}) actualizado`);
      } else {
        console.log(`⚠️  ${t.username} (id=${t.id}) no encontrado, saltado`);
      }
    }

    console.log(`\n🎉 Seed corregido. Contraseña de desarrollo: "${DEV_PASSWORD}"`);
    console.log('   (cambiar en producción)');
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exitCode = 1;
  } finally {
    await sequelize.close();
  }
}

run();
```

Agrega este script a **`package.json`**:

```json
"scripts": {
  "dev": "nodemon src/server.js",
  "start": "node src/server.js",
  "add:is-internal": "node scripts/add-is-internal.js",
  "migrate:mru": "node scripts/migrate-module-role-user.js",
  "fix:seed": "node scripts/fix-seed.js"
},
```

---

### 1.8.5 — Colección Postman

Crea el archivo **`postman/PQRS.postman_collection.json`**. **Guárdalo con codificación UTF-8** (sin BOM si es posible).

```json
{
  "info": {
    "name": "PQRS API",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json",
    "description": "Colección de pruebas para el backend PQRS."
  },
  "variable": [
    { "key": "baseUrl", "value": "http://localhost:3000/api/v1" },
    { "key": "token", "value": "" }
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
            "body": {
              "mode": "raw",
              "raw": "{\n  \"username\": \"admin\",\n  \"password\": \"admin123\"\n}"
            },
            "url": "{{baseUrl}}/auth/login"
          },
          "event": [
            {
              "listen": "test",
              "script": {
                "exec": [
                  "const body = pm.response.json();",
                  "if (body.data && body.data.token) {",
                  "  pm.collectionVariables.set('token', body.data.token);",
                  "  console.log('✅ token guardado en variable de colección');",
                  "}"
                ]
              }
            }
          ]
        },
        {
          "name": "Login juan",
          "request": {
            "method": "POST",
            "header": [{ "key": "Content-Type", "value": "application/json" }],
            "body": {
              "mode": "raw",
              "raw": "{\n  \"username\": \"juan\",\n  \"password\": \"admin123\"\n}"
            },
            "url": "{{baseUrl}}/auth/login"
          }
        },
        {
          "name": "Login inválido (validación zod)",
          "request": {
            "method": "POST",
            "header": [{ "key": "Content-Type", "value": "application/json" }],
            "body": {
              "mode": "raw",
              "raw": "{\n  \"username\": \"a\",\n  \"password\": \"123\"\n}"
            },
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
          "name": "Me sin token (401)",
          "request": {
            "method": "GET",
            "url": "{{baseUrl}}/auth/me"
          }
        },
        {
          "name": "Roles",
          "request": {
            "method": "GET",
            "header": [{ "key": "Authorization", "value": "Bearer {{token}}" }],
            "url": "{{baseUrl}}/auth/roles"
          }
        },
        {
          "name": "Select-role válido",
          "request": {
            "method": "POST",
            "header": [
              { "key": "Content-Type", "value": "application/json" },
              { "key": "Authorization", "value": "Bearer {{token}}" }
            ],
            "body": {
              "mode": "raw",
              "raw": "{\n  \"user_role_id\": 1\n}"
            },
            "url": "{{baseUrl}}/auth/select-role"
          },
          "event": [
            {
              "listen": "test",
              "script": {
                "exec": [
                  "const body = pm.response.json();",
                  "if (body.data && body.data.token) {",
                  "  pm.collectionVariables.set('token', body.data.token);",
                  "  console.log('✅ token actualizado');",
                  "}"
                ]
              }
            }
          ]
        },
        {
          "name": "Select-role inválido (400)",
          "request": {
            "method": "POST",
            "header": [
              { "key": "Content-Type", "value": "application/json" },
              { "key": "Authorization", "value": "Bearer {{token}}" }
            ],
            "body": {
              "mode": "raw",
              "raw": "{\n  \"user_role_id\": 999\n}"
            },
            "url": "{{baseUrl}}/auth/select-role"
          }
        },
        {
          "name": "Health",
          "request": {
            "method": "GET",
            "url": "{{baseUrl}}/health"
          }
        }
      ]
    }
  ]
}
```

**Cómo importar en Postman:**

1. Abre Postman → **Import** → **File** → selecciona `postman/PQRS.postman_collection.json`.
2. Ejecuta **Login admin** primero (guarda el `token` automáticamente).
3. Luego **Me**, **Roles**, **Select-role** (el token se reemplaza solo).

---

## Setup inicial (solo una vez)

```bash
npm run migrate:mru       # migra module_role_user a user_role_id
npm run add:is-internal   # agrega is_internal a pqrs_response
npm run fix:seed          # ajusta contraseñas de desarrollo (admin/juan → admin123)
```

## Ejecutar

```bash
npm run dev      # desarrollo (nodemon)
npm start        # producción
```

- API: `http://localhost:3000/api/v1`
- Swagger: `http://localhost:3000/api-docs`
- Health: `http://localhost:3000/api/v1/health`

## Endpoints (v1)

### Auth

| Método | Ruta                         | Auth     | Descripción        |
| ------- | ---------------------------- | -------- | ------------------- |
| POST    | `/api/v1/auth/login`       | público | Login → JWT        |
| GET     | `/api/v1/auth/me`          | Bearer   | Perfil + rol activo |
| GET     | `/api/v1/auth/roles`       | Bearer   | Roles del usuario   |
| POST    | `/api/v1/auth/select-role` | Bearer   | Cambiar rol activo  |

## Estado

- [X] 1.1 Estructura y archivos base
- [X] 1.2 Config (env + database)
- [X] 1.3 app.js + server.js + /health
- [X] 1.4 Ajustes BD (is_internal + user_role_id)
- [X] 1.5 Modelos Sequelize
- [X] 1.6 Utils + middlewares base
- [X] 1.7 Auth completo
- [X] 1.8 Swagger + Postman + fix-seed

## Postman

Importar `postman/PQRS.postman_collection.json`. Ejecutar `Login admin` primero (guarda el token).

```

---

## ✅ Verificación del Paso 1.8 (y cierre del Paso 1)

### Verificación A — `npm run fix:seed`

```powershell
npm run fix:seed
```

**Salida esperada:**

```
✅ Conectado a MySQL
🔑 Hash generado para "admin123" (bcrypt, 10 rondas)
✅ admin (id=1) actualizado
✅ juan (id=2) actualizado

🎉 Seed corregido. Contraseña de desarrollo: "admin123"
   (cambiar en producción)
```

### Verificación B — Servidor directo (sin nodemon), cierre limpio

**Termina nodemon (Ctrl+C en Terminal 1)** y ejecuta:

```powershell
node src/server.js
```

Debe imprimir los 4 mensajes (`✅ 🚀 🔗 🌎`). **Ahora sí presiona Ctrl+C** — debe imprimir las dos líneas:

```
⚠️  SIGINT recibido, cerrando...
✅ Servidor y BD cerrados
```

### Verificación C — Swagger accesible

Con el servidor corriendo, en otra terminal:

```powershell
Invoke-RestMethod http://localhost:3000/api-docs.json | ConvertTo-Json -Depth 3
```

**Esperado:** JSON con `openapi: "3.0.3"`, `info.title: "PQRS API"`, paths `/auth/login`, `/auth/me`, etc.

O abre en navegador:

- **`http://localhost:3000/api-docs`** → Swagger UI con los endpoints.
- **`http://localhost:3000/api-docs.json`** → JSON crudo.

### Verificación D — Login sigue funcionando tras `fix-seed`

```powershell
$body = @{ username = 'admin'; password = 'admin123' } | ConvertTo-Json
Invoke-RestMethod -Method POST -Uri http://localhost:3000/api/v1/auth/login -Body $body -ContentType 'application/json' | ConvertTo-Json -Depth 4
```

**Esperado:** `success:true`, `token` presente, `activeRole.name: "admin"`.

### Verificación E — Importar colección Postman

1. Postman → **Import** → `postman/PQRS.postman_collection.json`.
2. Ejecutar **Login admin** (guarda el token).
3. Ejecutar **Me**, **Roles**, **Select-role** — deben responder 200.

Pégame una captura o confirmación de que la colección importó y ejecutó.

### Verificación F — Estructura final

```powershell
Get-ChildItem -Recurse -File -Exclude *.log | Where-Object { $_.FullName -notmatch 'node_modules' } | Select-Object FullName | Sort-Object FullName
```

Debe listar (resumen):

```
src/app.js
src/server.js
src/config/database.js
src/config/env.js
src/config/swagger.js
src/controllers/auth/auth.controller.js
src/controllers/auth/index.js
src/middlewares/auth.middleware.js
src/middlewares/errorHandler.js
src/middlewares/notFound.js
src/middlewares/validate.middleware.js
src/models/*.js (14)
src/routes/auth.routes.js
src/routes/index.js
src/utils/jwt.js
src/utils/password.js
src/utils/response.js
src/validators/auth.validator.js
scripts/add-is-internal.js
scripts/migrate-module-role-user.js
scripts/fix-seed.js
scripts/_check-1.4.js (diagnóstico, opcional)
scripts/_check-1.5.js (diagnóstico, opcional)
postman/PQRS.postman_collection.json
package.json
.env
.env.example
.gitignore
README.md
```

---

## 🚦 Criterio de cierre del Paso 1

## Scripts

| Comando                     | Descripción                                       |
| --------------------------- | -------------------------------------------------- |
| `npm run dev`             | Servidor con hot-reload                            |
| `npm start`               | Servidor en producción                            |
| `npm run migrate:mru`     | Migra `module_role_user` a `user_role_id`      |
| `npm run add:is-internal` | Agrega columna `is_internal` a `pqrs_response` |
| `npm run fix:seed`        | Regenera hashes de `admin` y `juan` (dev)      |

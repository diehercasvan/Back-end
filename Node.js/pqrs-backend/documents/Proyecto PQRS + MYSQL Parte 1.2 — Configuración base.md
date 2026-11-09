## 📋 Recordatorio del orden

| Sub-paso      | Contenido                                          | Estado                                    |
| ------------- | -------------------------------------------------- | ----------------------------------------- |
| 1.1           | Estructura + package.json + .env + npm install     | ✅ entregado (pendiente tu verificación) |
| **1.2** | `src/config/env.js` + `src/config/database.js` | ← ahora                                  |
| 1.3           | `app.js` + `server.js` + `/health`           | después                                  |
| 1.4           | Ajustes BD (`is_internal`, `user_role_id`)     | después                                  |
| 1.5           | Modelos Sequelize                                  | después                                  |
| 1.6           | Utils + middlewares base                           | después                                  |
| 1.7           | Auth (login, me, select-role)                      | después                                  |
| 1.8           | Swagger + Postman + fix-seed                       | después                                  |

---

## 🔎 Antes de dar 1.2, confírmar que 1.1 quedó completo

Ejecuta y dime el resultado de **solo estos 3 comandos** (rápido):

```powershell
# 1. Ubicación correcta
Get-Location

# 2. Archivos raíz existen
Get-ChildItem -Force | Select-Object Name

# 3. Dependencias instaladas
Test-Path node_modules
```

**Debe salir:**

1. Ruta terminada en `...\pqrs-backend`
2. Lista con: `README.md`, `.env`, `.env.example`, `.gitignore`, `package.json`, `package-lock.json`, `node_modules`, `src`, `scripts`, `postman`
3. `True`

Si esos 3 están bien, **puedes pasar directo al 1.2.**

---

## 📦 Paso 1.2 — Configuración base

### 1.2.1 — `src/config/env.js`

Crea el archivo **`src/config/env.js`** con este contenido exacto:

```javascript
// src/config/env.js
const dotenv = require('dotenv');
const { z } = require('zod');

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  API_PREFIX: z.string().startsWith('/').default('/api/v1'),

  DB_HOST: z.string().min(1),
  DB_PORT: z.coerce.number().int().positive().default(3306),
  DB_NAME: z.string().min(1),
  DB_USER: z.string().min(1),
  DB_PASSWORD: z.string().optional().default(''),
  DB_DIALECT: z.enum(['mysql', 'mariadb']).default('mysql'),
  DB_LOGGING: z
    .string()
    .optional()
    .default('false')
    .transform((v) => v === 'true'),

  JWT_SECRET: z.string().min(32, 'JWT_SECRET debe tener al menos 32 caracteres'),
  JWT_EXPIRES_IN: z.string().default('8h'),

  SWAGGER_SERVER_URL: z.string().url().default('http://localhost:3000'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Variables de entorno inválidas:');
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

module.exports = parsed.data;
```

**Explicación breve de zod :**

- `z.object({...})` → define el "contrato" de las variables de entorno.
- `z.string()`, `z.coerce.number()`, `z.enum()` → tipo esperado. `coerce` convierte strings a número (porque `.env` siempre entrega strings).
- `.min()`, `.startsWith()` → validaciones encadenadas.
- `.default(...)` → valor por defecto si la variable no existe.
- `.transform(...)` → convierte `"true"`/`"false"` en boolean.
- `safeParse()` → no lanza excepción; devuelve `{ success, data | error }`. Si algo falla, imprimimos qué variable y salimos con código 1.
- `module.exports = parsed.data` → exporta el objeto ya validado. Ningún otro archivo leerá `process.env` directamente.

---

### 1.2.2 — `src/config/database.js`

Crea el archivo **`src/config/database.js`** con este contenido exacto:

```javascript
// src/config/database.js
const { Sequelize } = require('sequelize');
const env = require('./env');

const sequelize = new Sequelize(
  env.DB_NAME,
  env.DB_USER,
  env.DB_PASSWORD,
  {
    host: env.DB_HOST,
    port: env.DB_PORT,
    dialect: env.DB_DIALECT,
    logging: env.DB_LOGGING ? console.log : false,
    timezone: '+00:00',
    define: {
      timestamps: true,
      underscored: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
      freezeTableName: true,
    },
    pool: { max: 10, min: 0, acquire: 30000, idle: 10000 },
  }
);

module.exports = sequelize;
```

**Decisiones clave:**

- `underscored: true` + `createdAt/updatedAt` → mapea automáticamente `created_at` / `updated_at` de tu BD.
- `freezeTableName: true` → evita que Sequelize pluralice; usará los nombres exactos (`user`, `pqrs`, `pqrs_response`, etc.).
- `timezone: '+00:00'` → coherente con tu `SET time_zone = "+00:00"`.
- `logging` controlado por `.env` (`DB_LOGGING=true` si quieres ver SQL en consola).

---

## ✅ Verificación del Paso 1.2

Desde `pqrs-backend/`, ejecuta:

```powershell
# 1. env.js carga y valida
node -e "const env = require('./src/config/env'); console.log('✅ env OK. PORT=' + env.PORT + ', DB=' + env.DB_NAME + ', PREFIX=' + env.API_PREFIX);"

# 2. database.js instancia Sequelize (sin conectar aún)
node -e "const db = require('./src/config/database'); console.log('✅ database OK. dialect=' + db.getDialect() + ', db=' + db.getDatabaseName());"

# 3. Conexión real a MySQL a través de Sequelize
node -e "const db = require('./src/config/database'); db.authenticate().then(() => { console.log('✅ Conexión MySQL OK (via Sequelize)'); return db.close(); }).catch(e => { console.error('❌', e.message); process.exit(1); });"
```

**Salida esperada:**

```
✅ env OK. PORT=3000, DB=pqrs_system, PREFIX=/api/v1
✅ database OK. dialect=mysql, db=pqrs_system
✅ Conexión MySQL OK (via Sequelize)
```

---

## 🚦 Si las 3 salidas son verdes

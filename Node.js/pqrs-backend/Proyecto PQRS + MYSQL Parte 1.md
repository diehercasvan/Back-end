# PROYECTO PQRS + MYSQL

## PASO 1 — Cimientos + Auth (parte 1 de 3)

Desarrollo **paso a paso, sin adelantar módulos**. Este documento cubre **solo la creación del proyecto, instrucciones de instalación y archivos de configuración base**.

## 📋 Orden de este Paso 1

| Bloque       | Contenido                                                                                                      | Mensaje         |
| ------------ | -------------------------------------------------------------------------------------------------------------- | --------------- |
| **1A** | Creación del proyecto, `package.json`, `.env.example`, `.gitignore`, `README`, estructura de carpetas | ← estás aquí |
| **1B** | `config/` + `utils/` + middlewares base                                                                    | siguiente       |
| **1C** | 13 modelos Sequelize + asociaciones                                                                            | siguiente       |
| **1D** | Auth completo + scripts SQL + Postman + OpenAPI                                                                | siguiente       |

---

## 1A.1 — Estructura de carpetas a crear

Crea manualmente esta estructura vacía (los archivos van en los siguientes mensajes):

```
pqrs-backend/
├── src/
│   ├── config/
│   ├── models/
│   ├── controllers/
│   │   ├── auth/
│   │   ├── security/
│   │   └── pqrs/
│   ├── routes/
│   │   ├── security/
│   │   └── pqrs/
│   ├── middlewares/
│   ├── validators/
│   ├── services/
│   ├── utils/
│   └── docs/
├── scripts/
├── postman/
├── .env.example
├── .gitignore
├── package.json
└── README.md
```

Comando rápido en terminal (Linux/Mac/Git Bash):

```bash
mkdir -p pqrs-backend/src/{config,models,controllers/{auth,security,pqrs},routes/{security,pqrs},middlewares,validators,services,utils,docs} pqrs-backend/{scripts,postman}
cd pqrs-backend
```

En Windows CMD/PowerShell crea las carpetas con el explorador o con `New-Item`.

---

## 1A.2 — `package.json`

```json
{
  "name": "pqrs-backend",
  "version": "1.0.0",
  "description": "Backend del sistema PQRS - Node.js + Express + Sequelize + MySQL",
  "main": "src/server.js",
  "scripts": {
    "dev": "nodemon src/server.js",
    "start": "node src/server.js",
    "migrate:mru": "node scripts/migrate-module-role-user.js",
    "add:is-internal": "node scripts/add-is-internal.js",
    "fix:seed": "node scripts/fix-seed.js"
  },
  "keywords": ["pqrs", "express", "sequelize", "mysql", "jwt"],
  "author": "",
  "license": "ISC",
  "dependencies": {
    "bcryptjs": "^2.4.3",
    "cors": "^2.8.5",
    "dotenv": "^16.4.5",
    "express": "^4.19.2",
    "helmet": "^7.1.0",
    "jsonwebtoken": "^9.0.2",
    "morgan": "^1.10.0",
    "mysql2": "^3.11.0",
    "sequelize": "^6.37.3",
    "swagger-jsdoc": "^6.2.8",
    "swagger-ui-express": "^5.0.1",
    "zod": "^3.23.8"
  },
  "devDependencies": {
    "nodemon": "^3.1.4"
  }
}
```

**Por qué cada dependencia:**

| Paquete                                    | Uso                                                                               |
| ------------------------------------------ | --------------------------------------------------------------------------------- |
| `express`                                | Framework HTTP                                                                    |
| `sequelize` + `mysql2`                 | ORM + driver MySQL                                                                |
| `jsonwebtoken`                           | Firmar/verificar JWT                                                              |
| `bcryptjs`                               | Hash de contraseñas (versión JS pura, sin compilación nativa → más portable) |
| `zod`                                    | Validación de entrada y de variables de entorno                                  |
| `dotenv`                                 | Cargar `.env`                                                                   |
| `helmet`                                 | Cabeceras de seguridad HTTP                                                       |
| `cors`                                   | Permitir el frontend React en otro puerto                                         |
| `morgan`                                 | Log de peticiones HTTP                                                            |
| `swagger-jsdoc` + `swagger-ui-express` | Documentación OpenAPI en `/api-docs`                                           |
| `nodemon` (dev)                          | Reinicio automático en desarrollo                                                |

**Instalación:**

```bash
cd pqrs-backend
npm install
```

---

## 1A.3 — `.env.example`

Copia este archivo a `.env` y **ajusta los valores a tu entorno real** (tu MySQL/MariaDB ya tiene `pqrs_system` volcada):

```env
# ===== Servidor =====
NODE_ENV=development
PORT=3000
API_PREFIX=/api/v1

# ===== Base de datos (MySQL/MariaDB existente) =====
DB_HOST=127.0.0.1
DB_PORT=3306
DB_NAME=pqrs_system
DB_USER=root
DB_PASSWORD=
DB_DIALECT=mysql
DB_LOGGING=false

# ===== JWT =====
JWT_SECRET=cambia_esto_por_un_secreto_largo_y_aleatorio_min_32_chars
JWT_EXPIRES_IN=8h

# ===== Swagger =====
SWAGGER_SERVER_URL=http://localhost:3000
```

**Cómo generar un `JWT_SECRET` seguro:**

```bash
# Linux/Mac/Git Bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Copia el resultado en `JWT_SECRET=`. **Nunca lo subas al repositorio.**

---

## 1A.4 — `.gitignore`

```
# Dependencias
node_modules/

# Entorno
.env
.env.local
.env.*.local

# Logs
*.log
npm-debug.log*
logs/

# Editor
.vscode/
.idea/
*.swp
.DS_Store

# Build
dist/
build/
```

---

## 1A.5 — `README.md`

```markdown
# PQRS Backend

API REST del sistema PQRS — Node.js + Express + Sequelize + MySQL.

## Requisitos

- Node.js >= 18
- MySQL / MariaDB con la base `pqrs_system` ya volcada

## Instalación

1. Clonar/crear la estructura y entrar a la carpeta:
   ```bash
   cd pqrs-backend
```

2. Instalar dependencias:

   ```bash
   npm install
   ```
3. Copiar variables de entorno y ajustar credenciales:

   ```bash
   cp .env.example .env
   ```

   Editar `.env` con los datos reales de MySQL y un `JWT_SECRET` seguro.
4. (Paso 1, bloque 1D) Ejecutar scripts de migración:

   ```bash
   npm run migrate:mru
   npm run add:is-internal
   npm run fix:seed
   ```
5. Levantar en desarrollo:

   ```bash
   npm run dev
   ```
6. Verificar:

   - API: `http://localhost:3000/api/v1`
   - Swagger: `http://localhost:3000/api-docs`
   - Health (cuando esté): `http://localhost:3000/api/v1/health`

## Scripts

| Comando                     | Descripción                                       |
| --------------------------- | -------------------------------------------------- |
| `npm run dev`             | Servidor con hot-reload                            |
| `npm start`               | Servidor en modo producción                       |
| `npm run migrate:mru`     | Migra `module_role_user` a `user_role_id`      |
| `npm run add:is-internal` | Agrega columna `is_internal` a `pqrs_response` |
| `npm run fix:seed`        | Regenera hash del usuario `juan`                 |

## Estructura

Ver sección de arquitectura en el README extendido (se completa al final del Paso 1).

```

---

## 1A.6 — Verificación antes de continuar

Antes de pasar al bloque **1B**, confirma que:

1. ✅ Creaste la estructura de carpetas.
2. ✅ `package.json` está en `pqrs-backend/`.
3. ✅ Ejecutaste `npm install` sin errores (debe crear `node_modules/`).
4. ✅ `.env` existe (copiado de `.env.example`) con credenciales reales de tu MySQL.
5. ✅ `JWT_SECRET` tiene al menos 32 caracteres.
6. ✅ Puedes conectarte a `pqrs_system` desde tu cliente MySQL habitual.

**Comando de verificación opcional** (desde `pqrs-backend/`) para probar que `sequelize` y `mysql2` ven la base:

```bash
node -e "
const { Sequelize } = require('sequelize');
require('dotenv').config();
const s = new Sequelize(process.env.DB_NAME, process.env.DB_USER, process.env.DB_PASSWORD, {
  host: process.env.DB_HOST, port: process.env.DB_PORT, dialect: 'mysql', logging: false
});
s.authenticate()
 .then(() => { console.log('✅ Conexión MySQL OK'); return s.close(); })
 .catch(e => { console.error('❌ Error:', e.message); process.exit(1); });
"
```

Si te imprime `✅ Conexión MySQL OK`, estamos listos para el **bloque 1B** (config + utils + middlewares base).

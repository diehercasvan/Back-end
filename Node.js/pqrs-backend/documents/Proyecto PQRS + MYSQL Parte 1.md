# PROYECTO PQRS + MYSQL

## 📁 Paso 1.1 — Estructura + archivos base

## 📋 Orden de este Paso

| Bloque       | Contenido                                                                                                      | Mensaje         |
| ------------ | -------------------------------------------------------------------------------------------------------------- | --------------- |
| **1A** | Creación del proyecto, `package.json`, `.env.example`, `.gitignore`, `README`, estructura de carpetas | ← estás aquí |
| **1B** | `config/` + `utils/` + middlewares base                                                                    | siguiente       |
| **1C** | 13 modelos Sequelize + asociaciones                                                                            | siguiente       |
| **1D** | Auth completo + scripts SQL + Postman + OpenAPI                                                                | siguiente       |

## 1.1.2 Estructura de carpetas a crear

Crea manualmente esta estructura vacía :

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

O en PowerShell

```PowerShell
$dirs = @(
  "src\config",
  "src\models",
  "src\controllers\auth",
  "src\controllers\security",
  "src\controllers\pqrs",
  "src\routes\security",
  "src\routes\pqrs",
  "src\middlewares",
  "src\validators",
  "src\services",
  "src\utils",
  "src\docs",
  "scripts",
  "postman"
)
foreach ($d in $dirs) { New-Item -ItemType Directory -Path $d -Force | Out-Null }
Write-Host "✅ Carpetas creadas"
```

**Verifica la estructura:**

```PowerShell
...\pqrs-backend> dir
```

```PowerShell
Get-ChildItem -Recurse -Directory | Select-Object FullName
```

Debe mostrar todas las carpetas listadas (y ninguna más).

> 💡 **Nota:** las carpetas `controllers/security/` y `controllers/pqrs/` por ahora están vacías. Se poblarán en los módulos correspondientes.

En Windows CMD/PowerShell crea las carpetas con el explorador o con `New-Item`.

---

## 1.1.3 — Crear `package.json`

```json
{
  "name": "pqrs-backend",
  "version": "1.0.0",
  "description": "Backend del sistema PQRS - Node.js + Express + Sequelize + MySQL",
  "main": "src/server.js",
  "scripts": {
    "dev": "nodemon src/server.js",
    "start": "node src/server.js"
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

⚠️ **Fíjate:** este `package.json`**solo tiene `dev` y `start`** en scripts. 

Los scripts de migración (`migrate:mru`, `add:is-internal`, `fix:seed`) se agregan  **en el sub-paso 1.4** , cuando los archivos existan.

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

## 1.1.5 — `.env`

Copia este archivo a `.env` y **ajusta los valores a tu entorno real** ( MySQL/MariaDB ya tiene `pqrs_system` volcada):

```env
# ===== Servidor =====
NODE_ENV=development
PORT=3000
API_PREFIX=/api/v1

# ===== Base de datos =====
DB_HOST=127.0.0.1
DB_PORT=3306
DB_NAME=pqrs_system
DB_USER=root
DB_PASSWORD=
DB_DIALECT=mysql
DB_LOGGING=false

# ===== JWT =====
JWT_SECRET=cambia_esto_por_un_secreto_de_al_menos_32_caracteres
JWT_EXPIRES_IN=8h

# ===== Swagger =====
SWAGGER_SERVER_URL=http://localhost:3000
```

**Cómo generar un `JWT_SECRET` seguro:**

```bash
# Linux/Mac/Git Bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Copia el resultado y pégalo en `JWT_SECRET=`.

> 🔒 **`.env` nunca se sube al repositorio** (está en `.gitignore`). Contiene credenciales.

---

### 1.1.6 — Crear `.gitignore`

Crea `.gitignore` en la raíz:

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

### 1.1.7 — Crear `README.md`

Crea `README.md` en la raíz:

```markdown
# PQRS Backend

API REST del sistema PQRS — Node.js + Express + Sequelize + MySQL.

## Requisitos

- Node.js >= 18
- MySQL / MariaDB con la base `pqrs_system` volcada

## Instalación

1. `npm install`
2. Copiar `.env.example` a `.env` y ajustar credenciales reales + `JWT_SECRET` (32+ chars)
3. `npm run dev`
4. Verificar: `http://localhost:3000/api/v1/health`

## Scripts

| Comando | Descripción |
|---|---|
| `npm run dev` | Servidor en modo desarrollo (nodemon) |
| `npm start` | Servidor en modo producción |

## Estado

- [x] 1.1 Estructura y archivos base
- [ ] 1.2 Config (env + database)
- [ ] 1.3 app.js + server.js (health check)
- [ ] 1.4 Ajustes BD (is_internal + user_role_id)
- [ ] 1.5 Modelos Sequelize
- [ ] 1.6 Utils + middlewares base
- [ ] 1.7 Auth (login, me, select-role)
- [ ] 1.8 Swagger + Postman + fix-seed
```

### 1.1.8 — Instalar dependencias

Dentro de `pqrs-backend/`:

```PowerShell
npm install
```

Espera a que termine. Debe crear `node_modules/` y `package-lock.json`.

## ✅ Verificación del Paso 1.1

Ejecuta estos comandos desde `pqrs-backend/` y confírmame las salidas:

```PowerShell
# 1. Ubicación
Get-Location

# 2. Archivos raíz (deben existir: package.json, package-lock.json, .env, .env.example, .gitignore, README.md)
Get-ChildItem -Force | Select-Object Name

# 3. Estructura de carpetas
Get-ChildItem -Recurse -Directory | Select-Object FullName

# 4. Dependencias instaladas (debe listar ~13 paquetes principales)
Get-ChildItem node_modules -Directory | Where-Object { 
  $_.Name -in @('express','sequelize','mysql2','jsonwebtoken','bcryptjs','zod','dotenv','cors','helmet','morgan','swagger-jsdoc','swagger-ui-express','nodemon')
} | Select-Object Name

# 5. Node y npm operativos
node -v
npm -v
```

## 🚦 No avanzar hasta que 1.1 esté en verde

## Scripts

| Comando                     | Descripción                                       |
| --------------------------- | -------------------------------------------------- |
| `npm run dev`             | Servidor con hot-reload                            |
| `npm start`               | Servidor en modo producción                       |
| `npm run migrate:mru`     | Migra `module_role_user` a `user_role_id`      |
| `npm run add:is-internal` | Agrega columna `is_internal` a `pqrs_response` |
| `npm run fix:seed`        | Regenera hash del usuario `juan`                 |

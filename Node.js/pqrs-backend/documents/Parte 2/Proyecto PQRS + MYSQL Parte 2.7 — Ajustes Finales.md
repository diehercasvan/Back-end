# 🛠️ Ajustes finales Parte 2 — Reestructuración de carpetas en `routes/`

Vamos paso a paso. Este ajuste no toca la lógica ni los endpoints — solo mueve archivos y actualiza `require`. Al final del proceso, todo debe seguir funcionando exactamente igual que antes.

> **Nombre del bloque:** "Ajustes finales Parte 2" (antes de cerrar 2.5 y pasar a 2.6).

---

## 📋 Plan (5 pasos)

| Paso         | Acción                                                                  |
| ------------ | ------------------------------------------------------------------------ |
| **A1** | Mover los 5 archivos a `src/routes/security/`                          |
| **A2** | Reemplazar el contenido de cada archivo con los `require` actualizados |
| **A3** | Crear `src/routes/security/index.js`                                   |
| **A4** | Actualizar `src/routes/index.js`                                       |
| **A5** | Verificar que el servidor arranca y todos los routers responden          |

---

## 📁 A1 — Mover los 5 archivos

### En VS Code (recomendado)

En el explorador de archivos:

1. Clic derecho sobre `catalog.routes.js` → **Move** → selecciona la carpeta `security/`.
2. Repite para `role.routes.js`, `user.routes.js`, `profile.routes.js`, `module.routes.js`.

Quedan:

```
src/routes/
├── auth.routes.js        ← se queda
├── index.js              ← se queda
└── security/
    ├── catalog.routes.js   ← movido
    ├── role.routes.js      ← movido
    ├── user.routes.js      ← movido
    ├── profile.routes.js   ← movido
    └── module.routes.js    ← movido
```

### En PowerShell (alternativa)

Desde `pqrs-backend/`:

```powershell
Move-Item src\routes\catalog.routes.js  src\routes\security\
Move-Item src\routes\role.routes.js     src\routes\security\
Move-Item src\routes\user.routes.js     src\routes\security\
Move-Item src\routes\profile.routes.js  src\routes\security\
Move-Item src\routes\module.routes.js   src\routes\security\
```

**Verifica:**

```powershell
Get-ChildItem src\routes -File | Select-Object Name
Get-ChildItem src\routes\security -File | Select-Object Name
```

Debe mostrar:

- En `routes/`: `auth.routes.js`, `index.js`.
- En `routes/security/`: los 5 archivos `.routes.js`.

---

## 📄 A2 — Reemplazar el contenido de los 5 archivos movidos

Los `require` cambian de `../` a `../../` porque ahora estamos un nivel más profundo. **Reemplaza el contenido completo de cada archivo** con lo que sigue.

### 2.1 — `src/routes/security/catalog.routes.js`

```javascript
// src/routes/security/catalog.routes.js
const { Router } = require('express');
const { authRequired } = require('../../middlewares/auth.middleware');
const { permissionRequired } = require('../../middlewares/permission.middleware');
const catalog = require('../../controllers/security/catalog.controller');

const router = Router();

router.get('/permissions',
  authRequired, permissionRequired('Roles', 'view'), catalog.listPermissions);

router.get('/modules',
  authRequired, permissionRequired('Roles', 'view'), catalog.listModules);

router.get('/user-status',
  authRequired, permissionRequired('Usuarios', 'view'), catalog.listUserStatus);

router.get('/document-types',
  authRequired, permissionRequired('Perfiles', 'view'), catalog.listDocumentTypes);

router.get('/pqrs-types',
  authRequired, permissionRequired('PQRS', 'view'), catalog.listPqrsTypes);

router.get('/pqrs-status',
  authRequired, permissionRequired('PQRS', 'view'), catalog.listPqrsStatus);

module.exports = router;
```

### 2.2 — `src/routes/security/role.routes.js`

```javascript
// src/routes/security/role.routes.js
const { Router } = require('express');
const { authRequired } = require('../../middlewares/auth.middleware');
const { permissionRequired } = require('../../middlewares/permission.middleware');
const { validate } = require('../../middlewares/validate.middleware');
const {
  createRoleSchema, updateRoleSchema, assignPermissionSchema,
} = require('../../validators/role.validator');
const roleCtl = require('../../controllers/security/role.controller');

const router = Router();

/* ===== CRUD Roles ===== */
router.get('/',    authRequired, permissionRequired('Roles', 'view'),   roleCtl.list);
router.post('/',   authRequired, permissionRequired('Roles', 'create'),
  validate(createRoleSchema), roleCtl.create);
router.get('/:id', authRequired, permissionRequired('Roles', 'view'),   roleCtl.getOne);
router.put('/:id', authRequired, permissionRequired('Roles', 'edit'),
  validate(updateRoleSchema), roleCtl.update);
router.delete('/:id', authRequired, permissionRequired('Roles', 'delete'), roleCtl.remove);

/* ===== Permisos del rol ===== */
router.get('/:id/permissions',
  authRequired, permissionRequired('Roles', 'view'), roleCtl.listPermissions);

router.post('/:id/permissions',
  authRequired, permissionRequired('Roles', 'edit'),
  validate(assignPermissionSchema), roleCtl.assignPermission);

router.delete('/:id/permissions/:rmpId',
  authRequired, permissionRequired('Roles', 'edit'), roleCtl.revokePermission);

module.exports = router;
```

### 2.3 — `src/routes/security/user.routes.js`

```javascript
// src/routes/security/user.routes.js
const { Router } = require('express');
const { authRequired } = require('../../middlewares/auth.middleware');
const { permissionRequired } = require('../../middlewares/permission.middleware');
const { validate } = require('../../middlewares/validate.middleware');
const {
  createUserSchema, updateUserSchema, changeStatusSchema,
  changePasswordSchema, assignRoleSchema,
} = require('../../validators/user.validator');
const { updateProfileSchema } = require('../../validators/profile.validator');
const ctl = require('../../controllers/security/user.controller');
const profileCtl = require('../../controllers/security/profile.controller');

const router = Router();

/* ===== CRUD Users ===== */
router.get('/',    authRequired, permissionRequired('Usuarios', 'view'),   ctl.list);
router.post('/',   authRequired, permissionRequired('Usuarios', 'create'),
  validate(createUserSchema), ctl.create);

router.get('/:id', authRequired, permissionRequired('Usuarios', 'view'),   ctl.getOne);
router.put('/:id', authRequired, permissionRequired('Usuarios', 'edit'),
  validate(updateUserSchema), ctl.update);
router.delete('/:id', authRequired, permissionRequired('Usuarios', 'delete'), ctl.remove);

/* ===== Acciones específicas ===== */
router.patch('/:id/status',
  authRequired, permissionRequired('Usuarios', 'edit'),
  validate(changeStatusSchema), ctl.changeStatus);

router.patch('/:id/password',
  authRequired, permissionRequired('Usuarios', 'edit'),
  validate(changePasswordSchema), ctl.changePassword);

/* ===== Roles del usuario ===== */
router.get('/:id/roles',
  authRequired, permissionRequired('Usuarios', 'view'), ctl.listRoles);

router.post('/:id/roles',
  authRequired, permissionRequired('Usuarios', 'edit'),
  validate(assignRoleSchema), ctl.assignRole);

router.delete('/:id/roles/:urId',
  authRequired, permissionRequired('Usuarios', 'edit'), ctl.revokeRole);

/* ===== Perfil del usuario (rutas anidadas) ===== */
router.get('/:id/profile',
  authRequired, permissionRequired('Perfiles', 'view'), profileCtl.getByUser);

router.put('/:id/profile',
  authRequired, permissionRequired('Perfiles', 'edit'),
  validate(updateProfileSchema), profileCtl.updateByUser);

module.exports = router;
```

> **Ojo:** los `require` de `profile.validator` y `profile.controller` ahora vienen con `../../`. Y la ruta `/:id/profile` se registra **al final** para que Express no confunda `/:id` con `/:id/profile`. Como tienen distinto número de segmentos, no hay colisión, pero dejarlo al final es más seguro.

### 2.4 — `src/routes/security/profile.routes.js`

```javascript
// src/routes/security/profile.routes.js
const { Router } = require('express');
const { authRequired } = require('../../middlewares/auth.middleware');
const { permissionRequired } = require('../../middlewares/permission.middleware');
const { validate } = require('../../middlewares/validate.middleware');
const { updateProfileSchema } = require('../../validators/profile.validator');
const ctl = require('../../controllers/security/profile.controller');

const router = Router();

/* ===== "me" (solo auth, sin permiso de módulo) ===== */
router.get('/me',  authRequired, ctl.getMine);
router.put('/me',  authRequired, validate(updateProfileSchema), ctl.updateMine);

/* ===== Listado y detalle (con Perfiles+view) ===== */
router.get('/',     authRequired, permissionRequired('Perfiles', 'view'), ctl.list);
router.get('/:id',  authRequired, permissionRequired('Perfiles', 'view'), ctl.getOne);

module.exports = router;
```

> ⚠️ **Importante:** `/me` debe estar registrado **antes** de `/:id`. Si `/:id` se registra primero, Express interpretará `me` como `id` y fallará (porque `Number("me")` es `NaN`). Por eso `/me` va primero.

### 2.5 — `src/routes/security/module.routes.js`

```javascript
// src/routes/security/module.routes.js
const { Router } = require('express');
const { authRequired } = require('../../middlewares/auth.middleware');
const { permissionRequired } = require('../../middlewares/permission.middleware');
const { validate } = require('../../middlewares/validate.middleware');
const {
  createModuleSchema, updateModuleSchema,
} = require('../../validators/module.validator');
const ctl = require('../../controllers/security/module.controller');

const router = Router();

router.get('/',    authRequired, permissionRequired('Roles', 'view'),   ctl.list);
router.get('/:id', authRequired, permissionRequired('Roles', 'view'),   ctl.getOne);
router.post('/',   authRequired, permissionRequired('Roles', 'create'),
  validate(createModuleSchema), ctl.create);
router.put('/:id', authRequired, permissionRequired('Roles', 'edit'),
  validate(updateModuleSchema), ctl.update);
router.delete('/:id', authRequired, permissionRequired('Roles', 'delete'), ctl.remove);

module.exports = router;
```

---

## 📄 A3 — Crear `src/routes/security/index.js`

```javascript
// src/routes/security/index.js
module.exports = {
  catalog: require('./catalog.routes'),
  role: require('./role.routes'),
  user: require('./user.routes'),
  profile: require('./profile.routes'),
  module: require('./module.routes'),
};
```

---

## 📄 A4 — Actualizar `src/routes/index.js`

```javascript
// src/routes/index.js
const { Router } = require('express');
const authRoutes = require('./auth.routes');
const security = require('./security');

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

module.exports = router;
```

---

## ✅ A5 — Verificar que todo sigue funcionando

### 1. Arranque del servidor

```powershell
npm run dev
```

Debe mostrar los 4 mensajes (`✅ 🚀 🔗 🌎`) **sin errores de `Cannot find module`**. Si aparece algún error de `require`, revisa que:

- Los 5 archivos se movieron a `src/routes/security/`.
- Los `require` usan `../../` (dos niveles arriba).
- `src/routes/security/index.js` existe.

### 2. Smoke test: 1 endpoint por cada router

En otra terminal, con el servidor corriendo:

```powershell
# Login admin
$body = @{ username = 'admin'; password = 'admin123' } | ConvertTo-Json
$resp = Invoke-RestMethod -Method POST -Uri http://localhost:3000/api/v1/auth/login -Body $body -ContentType 'application/json'
$h = @{ Authorization = "Bearer $($resp.data.token)" }

# Un endpoint por router
Invoke-RestMethod -Uri http://localhost:3000/api/v1/catalogs/permissions    -Headers $h | Select-Object success, message
Invoke-RestMethod -Uri http://localhost:3000/api/v1/roles                   -Headers $h | Select-Object success, message
Invoke-RestMethod -Uri http://localhost:3000/api/v1/users                   -Headers $h | Select-Object success, message
Invoke-RestMethod -Uri http://localhost:3000/api/v1/profiles                -Headers $h | Select-Object success, message
Invoke-RestMethod -Uri http://localhost:3000/api/v1/modules                 -Headers $h | Select-Object success, message
```

**Esperado:** los 5 devuelven `success: true` con sus mensajes (`Permisos`, `Roles`, `Usuarios`, `Perfiles`, `Módulos`).

### 3. Regresión rápida: `/profiles/me` (juan)

```powershell
$bodyJ = @{ username = 'juan'; password = 'admin123' } | ConvertTo-Json
$respJ = Invoke-RestMethod -Method POST -Uri http://localhost:3000/api/v1/auth/login -Body $bodyJ -ContentType 'application/json'
$hj = @{ Authorization = "Bearer $($respJ.data.token)" }

Invoke-RestMethod -Uri http://localhost:3000/api/v1/profiles/me -Headers $hj | Select-Object success, message
```

**Esperado:** `success: true` con `"Mi perfil"`.

> El orden de `/me` vs `/:id` en `profile.routes.js` debe respetarse (ya lo hicimos en 2.4). Si aquí `/profiles/me` devuelve `404 Perfil no encontrado`, significa que el orden quedó al revés.

### 4. Regresión: permisos siguen funcionando (juan 403)

```powershell
try {
  Invoke-RestMethod -Uri http://localhost:3000/api/v1/roles -Headers $hj
} catch { $_.ErrorDetails.Message }
```

**Esperado:** `403 Acceso denegado. Tu rol activo no tiene el permiso "view" sobre "Roles".`

---

## 📊 Estructura final tras el ajuste

```
src/routes/
├── index.js
├── auth.routes.js
└── security/
    ├── index.js
    ├── catalog.routes.js
    ├── role.routes.js
    ├── user.routes.js
    ├── profile.routes.js
    └── module.routes.js
```

**Simetría con `controllers/`:**

```
src/controllers/
├── auth/
│   └── auth.controller.js
├── security/
│   ├── index.js
│   ├── catalog.controller.js
│   ├── role.controller.js
│   ├── user.controller.js
│   ├── profile.controller.js
│   └── module.controller.js
└── pqrs/     ← vacía (Paso 3)
```

**La carpeta `src/routes/pqrs/` queda vacía por ahora** — se llenará en el Paso 3. Si quieres, puedes dejarla (será útil) o borrarla (se crea de nuevo en el Paso 3). **Recomiendo dejarla.**

---

## 🚦 Criterios para cerrar los ajustes


1. **Salida de `Get-ChildItem`** en `src/routes/` y `src/routes/security/` (confirmando la estructura).
2. **Arranque del servidor** (4 mensajes).
3. **Los 5 smoke tests** (todos `success: true`).
4. **`/profiles/me` de juan** (`200` con su perfil).
5. **juan en `/roles`** (`403`).

Con eso confirmado, **cerramos los ajustes finales de la Parte 2** y **Cierre del Paso 2** (Swagger + Postman final + README), que es el último mensaje antes de arrancar el **Paso 3 (PQRS)**.

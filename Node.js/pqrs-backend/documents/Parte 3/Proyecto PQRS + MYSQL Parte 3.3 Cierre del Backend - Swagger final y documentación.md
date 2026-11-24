# 🎉 Cierre del Backend — Swagger final y documentación

1. **Swagger** completo y estructurado con etiquetas (tags) y respuestas documentadas.
2. **Script de prueba** (`seed-manager-role.js`) para tener un usuario "funcionario" y probar los flujos completos en Postman.
3. **README final** con el resumen del sistema.

---

## 📦 1. Actualización masiva de Swagger

Para no llenar el código de rutas con comentarios gigantes, vamos a centralizar la documentación en un solo archivo `src/config/swagger.js` (que reemplazará al que ya tienes). Este archivo definirá **todos los endpoints**, esquemas y etiquetas.

### 1.1 Reemplaza `src/config/swagger.js` por completo:

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
        'API REST del sistema PQRS. Autenticación JWT con modelo de rol activo. ' +
        'Permisos otorgados a nivel de Rol (RoleModulePermission). ' +
        'Flujo completo de PQRS con respuestas públicas y notas internas.',
    },
    servers: [
      { url: `${env.SWAGGER_SERVER_URL}${env.API_PREFIX}`, description: 'Servidor local' },
    ],
    tags: [
      { name: 'Auth', description: 'Autenticación y selección de rol' },
      { name: 'Catálogos', description: 'Datos maestros y de solo lectura' },
      { name: 'Roles', description: 'Gestión de roles y permisos del sistema' },
      { name: 'Usuarios', description: 'Gestión de cuentas y perfiles' },
      { name: 'Perfiles', description: 'Datos personales de los usuarios' },
      { name: 'Módulos', description: 'CRUD de módulos del sistema' },
      { name: 'PQRS', description: 'Radicación y gestión de solicitudes' },
      { name: 'Respuestas', description: 'Hilo de conversación y notas internas' },
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
            message: { type: 'string', example: 'Acceso denegado...' },
            errors: { type: 'object', nullable: true },
          },
        },
        // --- Auth ---
        LoginRequest: {
          type: 'object',
          required: ['username', 'password'],
          properties: {
            username: { type: 'string', example: 'admin' },
            password: { type: 'string', example: 'admin123' },
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
                user: { type: 'object', properties: { id: { type: 'integer' }, username: { type: 'string' }, email: { type: 'string' } } },
                activeRole: { type: 'object', properties: { user_role_id: { type: 'integer' }, role_id: { type: 'integer' }, name: { type: 'string' } } },
                availableRoles: { type: 'array', items: { type: 'object' } },
              },
            },
          },
        },
        // --- PQRS ---
        PqrsCreateRequest: {
          type: 'object',
          required: ['pqrs_type_id', 'subject', 'description'],
          properties: {
            pqrs_type_id: { type: 'integer', example: 1 },
            subject: { type: 'string', example: 'Falla en el sistema' },
            description: { type: 'string', example: 'Detalle del problema...' },
          },
        },
        ResponseCreateRequest: {
          type: 'object',
          required: ['message'],
          properties: {
            message: { type: 'string', example: 'Aquí está mi respuesta' },
            is_internal: { type: 'boolean', example: false },
          },
        },
      },
    },
    security: [{ bearerAuth: [] }],
    paths: {
      // ================= AUTH =================
      '/auth/login': {
        post: {
          tags: ['Auth'],
          summary: 'Iniciar sesión',
          requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/LoginRequest' } } } },
          responses: { 200: { description: 'Login exitoso', content: { 'application/json': { schema: { $ref: '#/components/schemas/LoginResponse' } } } }, 401: { description: 'Credenciales inválidas' } },
        },
      },
      '/auth/me': {
        get: { tags: ['Auth'], summary: 'Perfil del usuario autenticado', responses: { 200: { description: 'OK' } } },
      },
      '/auth/select-role': {
        post: { tags: ['Auth'], summary: 'Cambiar rol activo', requestBody: { content: { 'application/json': { schema: { type: 'object', properties: { user_role_id: { type: 'integer' } } } } } }, responses: { 200: { description: 'OK' } } },
      },
  
      // ================= CATÁLOGOS =================
      '/catalogs/permissions': { get: { tags: ['Catálogos'], summary: 'Listar permisos', responses: { 200: { description: 'OK' } } } },
      '/catalogs/modules': { get: { tags: ['Catálogos'], summary: 'Listar módulos', responses: { 200: { description: 'OK' } } } },
      '/catalogs/user-status': { get: { tags: ['Catálogos'], summary: 'Estados de usuario', responses: { 200: { description: 'OK' } } } },
      '/catalogs/document-types': { get: { tags: ['Catálogos'], summary: 'Tipos de documento', responses: { 200: { description: 'OK' } } } },
      '/catalogs/pqrs-types': { get: { tags: ['Catálogos'], summary: 'Tipos de PQRS', responses: { 200: { description: 'OK' } } } },
      '/catalogs/pqrs-status': { get: { tags: ['Catálogos'], summary: 'Estados de PQRS', responses: { 200: { description: 'OK' } } } },

      // ================= ROLES =================
      '/roles': {
        get: { tags: ['Roles'], summary: 'Listar roles', responses: { 200: { description: 'OK' } } },
        post: { tags: ['Roles'], summary: 'Crear rol', requestBody: { content: { 'application/json': { schema: { type: 'object', properties: { name: { type: 'string' }, description: { type: 'string' } } } } } }, responses: { 201: { description: 'Creado' } } },
      },
      '/roles/{id}': {
        get: { tags: ['Roles'], summary: 'Detalle de rol', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }], responses: { 200: { description: 'OK' } } },
        put: { tags: ['Roles'], summary: 'Editar rol', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }], responses: { 200: { description: 'OK' } } },
        delete: { tags: ['Roles'], summary: 'Eliminar rol', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }], responses: { 200: { description: 'OK' } } },
      },
      '/roles/{id}/permissions': {
        get: { tags: ['Roles'], summary: 'Matriz de permisos del rol', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }], responses: { 200: { description: 'OK' } } },
        post: { tags: ['Roles'], summary: 'Asignar permiso', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }], responses: { 201: { description: 'Creado' } } },
      },
      '/roles/{id}/permissions/{rmpId}': {
        delete: { tags: ['Roles'], summary: 'Revocar permiso', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }, { name: 'rmpId', in: 'path', required: true, schema: { type: 'integer' } }], responses: { 200: { description: 'OK' } } },
      },

      // ================= USUARIOS =================
      '/users': {
        get: { tags: ['Usuarios'], summary: 'Listar usuarios', responses: { 200: { description: 'OK' } } },
        post: { tags: ['Usuarios'], summary: 'Crear usuario', responses: { 201: { description: 'Creado' } } },
      },
      '/users/{id}': {
        get: { tags: ['Usuarios'], summary: 'Detalle de usuario', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }], responses: { 200: { description: 'OK' } } },
        put: { tags: ['Usuarios'], summary: 'Editar usuario', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }], responses: { 200: { description: 'OK' } } },
        delete: { tags: ['Usuarios'], summary: 'Eliminar usuario', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }], responses: { 200: { description: 'OK' } } },
      },
      '/users/{id}/status': { patch: { tags: ['Usuarios'], summary: 'Cambiar estado', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }], responses: { 200: { description: 'OK' } } } },
      '/users/{id}/password': { patch: { tags: ['Usuarios'], summary: 'Cambiar contraseña', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }], responses: { 200: { description: 'OK' } } } },
      '/users/{id}/roles': {
        get: { tags: ['Usuarios'], summary: 'Roles del usuario', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }], responses: { 200: { description: 'OK' } } },
        post: { tags: ['Usuarios'], summary: 'Asignar rol', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }], responses: { 201: { description: 'Creado' } } },
      },
      '/users/{id}/roles/{urId}': { delete: { tags: ['Usuarios'], summary: 'Revocar rol', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }, { name: 'urId', in: 'path', required: true, schema: { type: 'integer' } }], responses: { 200: { description: 'OK' } } } },
      '/users/{id}/profile': {
        get: { tags: ['Perfiles'], summary: 'Perfil del usuario', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }], responses: { 200: { description: 'OK' } } },
        put: { tags: ['Perfiles'], summary: 'Editar perfil del usuario', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }], responses: { 200: { description: 'OK' } } },
      },

      // ================= PERFILES =================
      '/profiles': { get: { tags: ['Perfiles'], summary: 'Listar perfiles', responses: { 200: { description: 'OK' } } } },
      '/profiles/me': {
        get: { tags: ['Perfiles'], summary: 'Mi perfil', responses: { 200: { description: 'OK' } } },
        put: { tags: ['Perfiles'], summary: 'Editar mi perfil', responses: { 200: { description: 'OK' } } },
      },
      '/profiles/{id}': { get: { tags: ['Perfiles'], summary: 'Detalle de perfil', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }], responses: { 200: { description: 'OK' } } } },

      // ================= MÓDULOS =================
      '/modules': {
        get: { tags: ['Módulos'], summary: 'Listar módulos', responses: { 200: { description: 'OK' } } },
        post: { tags: ['Módulos'], summary: 'Crear módulo', responses: { 201: { description: 'Creado' } } },
      },
      '/modules/{id}': {
        get: { tags: ['Módulos'], summary: 'Detalle de módulo', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }], responses: { 200: { description: 'OK' } } },
        put: { tags: ['Módulos'], summary: 'Editar módulo', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }], responses: { 200: { description: 'OK' } } },
        delete: { tags: ['Módulos'], summary: 'Eliminar módulo', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }], responses: { 200: { description: 'OK' } } },
      },

      // ================= PQRS =================
      '/pqrs': {
        get: { tags: ['PQRS'], summary: 'Listar PQRS', parameters: [{ name: 'page', in: 'query', schema: { type: 'integer', default: 1 } }, { name: 'limit', in: 'query', schema: { type: 'integer', default: 10 } }, { name: 'q', in: 'query', schema: { type: 'string' } }], responses: { 200: { description: 'OK' } } },
        post: { tags: ['PQRS'], summary: 'Radicar PQRS', requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/PqrsCreateRequest' } } } }, responses: { 201: { description: 'Creado' } } },
      },
      '/pqrs/{id}': {
        get: { tags: ['PQRS'], summary: 'Detalle de PQRS', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }], responses: { 200: { description: 'OK' } } },
        delete: { tags: ['PQRS'], summary: 'Eliminar PQRS', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }], responses: { 200: { description: 'OK' } } },
      },
      '/pqrs/{id}/status': { patch: { tags: ['PQRS'], summary: 'Cambiar estado', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }], responses: { 200: { description: 'OK' } } } },
      '/pqrs/{id}/assign': { patch: { tags: ['PQRS'], summary: 'Asignar funcionario', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }], responses: { 200: { description: 'OK' } } } },
  
      // ================= RESPUESTAS =================
      '/pqrs/{id}/responses': {
        get: { tags: ['Respuestas'], summary: 'Hilo de respuestas', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }], responses: { 200: { description: 'OK' } } },
        post: { tags: ['Respuestas'], summary: 'Crear respuesta/nota interna', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }], requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/ResponseCreateRequest' } } } }, responses: { 201: { description: 'Creado' } } },
      },
    },
  },
  apis: [], // Al definir paths manualmente, no necesitamos leer comentarios
};

module.exports = swaggerJsdoc(options);
```

---

## 📦 2. Script de datos de prueba (`manager`)

Para que tengas un usuario con rol **manager** (`PQRS + view/edit`) y puedas probar el flujo de funcionario (que ve todos los PQRS y puede responder notas internas), crea `scripts/seed-manager-role.js`.

```javascript
// scripts/seed-manager-role.js
// Crea el rol "manager" con permisos básicos y un usuario "carlos" asignado a él.
// Idempotente.
require('dotenv').config();
const {
  sequelize, Role, User, UserRole, UserStatus, Profile, DocumentType,
  Module, Permission, RoleModulePermission,
} = require('../src/models');
const { hashPassword } = require('../src/utils/password');

async function run() {
  try {
    // 1. Crear rol manager
    const [managerRole] = await Role.findOrCreate({
      where: { name: 'manager' },
      defaults: { description: 'Gestor de PQRS', is_active: 1 },
    });
    console.log(`✅ Rol manager (id=${managerRole.id})`);

    // 2. Asignar permisos al manager: Dashboard+view, PQRS+view, PQRS+edit
    const pairs = [
      ['Dashboard', 'view'],
      ['PQRS', 'view'],
      ['PQRS', 'edit'],
    ];
    for (const [mName, pName] of pairs) {
      const mod = await Module.findOne({ where: { name: mName } });
      const perm = await Permission.findOne({ where: { name: pName } });
      if (mod && perm) {
        await RoleModulePermission.findOrCreate({
          where: { role_id: managerRole.id, module_id: mod.id, permission_id: perm.id },
          defaults: {},
        });
        console.log(`   + ${mName} / ${pName}`);
      }
    }

    // 3. Crear usuario carlos (si no existe)
    const [carlos] = await User.findOrCreate({
      where: { username: 'carlos' },
      defaults: {
        email: 'carlos@pqrs.com',
        password_hash: await hashPassword('carlos123'),
        status_id: 1,
      },
    });
    console.log(`✅ Usuario carlos (id=${carlos.id})`);

    // 4. Crear perfil de carlos
    const docCC = await DocumentType.findOne({ where: { name: 'CC' } });
    await Profile.findOrCreate({
      where: { user_id: carlos.id },
      defaults: {
        first_name: 'Carlos', last_name: 'Gestor',
        document_type_id: docCC.id, document_number: '11111111',
        phone: '3001112233', address: 'Oficina de gestión',
      },
    });

    // 5. Asignar rol manager a carlos
    const [ur, created] = await UserRole.findOrCreate({
      where: { user_id: carlos.id, role_id: managerRole.id },
      defaults: { status_id: 1 },
    });
    if (!created && ur.status_id !== 1) {
      await ur.update({ status_id: 1 });
    }
    console.log(`✅ Rol manager asignado a carlos (user_role_id=${ur.id})`);

    console.log('\n🎉 Manager listo. Credenciales: carlos / carlos123');
  } catch (err) {
    console.error('❌', err.message);
    process.exitCode = 1;
  } finally {
    await sequelize.close();
  }
}
run();
```

Añade a en los  `scripts`del`package.json`:

```json
"seed:manager": "node scripts/seed-manager-role.js"
```

Ejecuta:

```powershell
npm run seed:manager
```

---

## 📦 3. README Final

Reemplaza tu `README.md` con esto:

```markdown
# PQRS Backend API

API REST del sistema PQRS (Peticiones, Quejas, Reclamos y Sugerencias) construida con Node.js, Express, Sequelize y MySQL.

## 🚀 Tecnologías

- **Node.js** v18+ / **Express** 4
- **Sequelize** (ORM) + **MySQL** / MariaDB
- **JWT** para autenticación
- **Zod** para validación de datos
- **Swagger** para documentación

## 🛠️ Instalación

1. `npm install`
2. Copiar `.env.example` a `.env` y configurar credenciales.
3. Ejecutar migraciones y seeds:
   ```bash
   npm run db:migrate      # Ajustes de tablas base (role_module_permission)
   npm run fix:seed        # Resetea contraseñas de admin/juan a 'admin123'
   npm run seed:manager    # Crea rol manager y usuario 'carlos' (carlos123)
```

4. Iniciar el servidor: `npm run dev`
5. Documentación Swagger: `http://localhost:3000/api-docs`

## 📚 Módulos y Permisos

La seguridad se basa en **Roles**. Un usuario hereda los permisos del rol activo que selecciona al iniciar sesión.

| Módulo              | Permisos disponibles       | Notas                                                          |
| -------------------- | -------------------------- | -------------------------------------------------------------- |
| **Dashboard**  | view, print                |                                                                |
| **Usuarios**   | view, create, edit, delete | Solo admin.                                                    |
| **Roles**      | view, create, edit, delete | Controla permisos.                                             |
| **Perfiles**   | view, edit                 | `/profiles/me` es público para el propio usuario.           |
| **PQRS**       | view, create, edit, delete | `view` permite ver propios o asignados; admin ve todos.      |
| **Respuestas** | (usan permiso PQRS)        | Solo staff (admin/asignado) puede crear `is_internal: true`. |

## 🧪 Usuarios de Prueba (después de seeds)

| Usuario    | Contraseña   | Rol     | Permisos                                    |
| ---------- | ------------- | ------- | ------------------------------------------- |
| `admin`  | `admin123`  | admin   | Todo el sistema                             |
| `juan`   | `admin123`  | user    | Dashboard, PQRS (crear, ver propios)        |
| `carlos` | `carlos123` | manager | Dashboard, PQRS (ver todos, editar/asignar) |

## 📌 Endpoints Principales

- **Auth**: `/api/v1/auth/login`, `/api/v1/auth/me`
- **PQRS**: `/api/v1/pqrs` (CRUD), `/api/v1/pqrs/:id/status`, `/api/v1/pqrs/:id/assign`
- **Respuestas**: `/api/v1/pqrs/:id/responses`
- **Gestión**: `/api/v1/users`, `/api/v1/roles`, `/api/v1/modules`

## 🏁 Estado del Proyecto

- [X] Paso 1: Cimientos (Config, Auth, Modelos)
- [X] Paso 2: Seguridad (Usuarios, Roles, Permisos, Módulos, Perfiles)
- [X] Paso 3: Módulo PQRS (CRUD, Asignación, Respuestas, Notas internas)
- [X] **Paso 4:** Frontend (React + Vite)

> **¡Backend finalizado!** Listo para consumir desde React.

---

## ✅ 4. Verificación de Swagger

1. Asegúrate de que el servidor esté corriendo (`npm run dev`).
2. Abre en tu navegador: **`http://localhost:3000/api-docs`**
3. Deberías ver:
   - El título **PQRS API**.
   - Las etiquetas ordenadas: `Auth`, `Catálogos`, `Roles`, `Usuarios`, `Perfiles`, `Módulos`, `PQRS`, `Respuestas`.
   - Todos los endpoints agrupados bajo su etiqueta correspondiente.
   - El botón **Authorize** (candado) arriba a la derecha para pegar el JWT y probar desde Swagger.

---

## 🚦 Cierre Oficial del Backend

- 3 sub-pasos de PQRS completados y probados en Postman.
- Un manager (`carlos`) para probar flujos cruzados (él verá todos los PQRS y podrá responder).
- Swagger profesional con todas las rutas documentadas.
- Scripts de seed y README completo.

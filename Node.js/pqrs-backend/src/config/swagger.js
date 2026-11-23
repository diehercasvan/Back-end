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
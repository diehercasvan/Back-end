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
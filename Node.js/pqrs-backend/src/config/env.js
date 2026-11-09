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
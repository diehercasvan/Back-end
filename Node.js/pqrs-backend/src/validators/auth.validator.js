// src/validators/auth.validator.js
const { z } = require('zod');

const loginSchema = z.object({
  username: z.string().min(3, 'username mínimo 3 caracteres').max(50),
  password: z.string().min(6, 'password mínimo 6 caracteres').max(100),
});

const selectRoleSchema = z.object({
  user_role_id: z.coerce.number().int().positive(),
});

module.exports = { loginSchema, selectRoleSchema };
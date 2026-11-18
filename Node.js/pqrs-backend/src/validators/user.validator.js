// src/validators/user.validator.js
const { z } = require('zod');

// --- Esquema anidado de perfil ---
const profileSchema = z.object({
  first_name: z.string().min(1).max(50),
  last_name: z.string().min(1).max(50),
  address: z.string().max(255).optional().nullable(),
  phone: z.string().max(20).optional().nullable(),
  document_type_id: z.coerce.number().int().positive(),
  document_number: z.string().min(3).max(50),
  photo_url: z.string().max(255).url().optional().nullable(),
  birth_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato YYYY-MM-DD').optional().nullable(),
});

// --- Crear usuario: user + profile + rol inicial ---
const createUserSchema = z.object({
  username: z
    .string()
    .min(3).max(50)
    .regex(/^[a-zA-Z0-9._-]+$/, 'Solo letras, números, . _ -'),
  email: z.string().email().max(100).optional().nullable(),
  password: z.string().min(6, 'password mínimo 6').max(100),
  status_id: z.coerce.number().int().positive().optional(),
  role_id: z.coerce.number().int().positive(),   // rol inicial (obligatorio)
  profile: profileSchema,
});

// --- Editar datos básicos (username, email, status_id) ---
const updateUserSchema = z
  .object({
    username: z
      .string()
      .min(3).max(50)
      .regex(/^[a-zA-Z0-9._-]+$/, 'Solo letras, números, . _ -')
      .optional(),
    email: z.string().email().max(100).optional().nullable(),
    status_id: z.coerce.number().int().positive().optional(),
  })
  .refine((v) => Object.keys(v).length > 0, {
    message: 'Debes enviar al menos un campo',
  });

const changeStatusSchema = z.object({
  status_id: z.coerce.number().int().positive(),
});

const changePasswordSchema = z.object({
  new_password: z.string().min(6, 'new_password mínimo 6').max(100),
});

const assignRoleSchema = z.object({
  role_id: z.coerce.number().int().positive(),
});

module.exports = {
  createUserSchema,
  updateUserSchema,
  changeStatusSchema,
  changePasswordSchema,
  assignRoleSchema,
};
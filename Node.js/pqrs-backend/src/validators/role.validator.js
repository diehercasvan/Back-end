// src/validators/role.validator.js
const { z } = require('zod');

const createRoleSchema = z.object({
  name: z
    .string()
    .min(3, 'name debe tener al menos 3 caracteres')
    .max(50, 'name no puede exceder 50 caracteres')
    .regex(/^[a-zA-Z0-9_-]+$/, 'name solo admite letras, números, _ y -'),
  description: z.string().max(255).optional().nullable(),
  is_active: z
    .union([z.boolean(), z.coerce.number().int().min(0).max(1)])
    .optional(),
});

const updateRoleSchema = z
  .object({
    name: z
      .string()
      .min(3, 'name debe tener al menos 3 caracteres')
      .max(50, 'name no puede exceder 50 caracteres')
      .regex(/^[a-zA-Z0-9_-]+$/, 'name solo admite letras, números, _ y -')
      .optional(),
    description: z.string().max(255).optional().nullable(),
    is_active: z
      .union([z.boolean(), z.coerce.number().int().min(0).max(1)])
      .optional(),
  })
  .refine((v) => Object.keys(v).length > 0, {
    message: 'Debes enviar al menos un campo',
  });

const assignPermissionSchema = z.object({
  module_id: z.coerce.number().int().positive(),
  permission_id: z.coerce.number().int().positive(),
});

module.exports = {
  createRoleSchema,
  updateRoleSchema,
  assignPermissionSchema,
};
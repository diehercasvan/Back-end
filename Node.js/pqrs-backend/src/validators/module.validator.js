// src/validators/module.validator.js
const { z } = require('zod');

const createModuleSchema = z.object({
  name: z
    .string()
    .min(3, 'name debe tener al menos 3 caracteres')
    .max(50, 'name no puede exceder 50 caracteres')
    .regex(/^[a-zA-Z0-9_-]+$/, 'name solo admite letras, números, _ y -'),
  route: z
    .string()
    .min(1, 'route es obligatorio')
    .max(100)
    .startsWith('#/', 'route debe iniciar con "#/" (ej. #/dashboard)'),
  icon: z.string().max(50).optional().nullable(),
  description: z.string().max(255).optional().nullable(),
  is_active: z
    .union([z.boolean(), z.coerce.number().int().min(0).max(1)])
    .optional(),
});

const updateModuleSchema = z
  .object({
    name: z
      .string()
      .min(3).max(50)
      .regex(/^[a-zA-Z0-9_-]+$/, 'name solo admite letras, números, _ y -')
      .optional(),
    route: z
      .string()
      .min(1).max(100)
      .startsWith('#/', 'route debe iniciar con "#/"')
      .optional(),
    icon: z.string().max(50).optional().nullable(),
    description: z.string().max(255).optional().nullable(),
    is_active: z
      .union([z.boolean(), z.coerce.number().int().min(0).max(1)])
      .optional(),
  })
  .refine((v) => Object.keys(v).length > 0, {
    message: 'Debes enviar al menos un campo',
  });

module.exports = { createModuleSchema, updateModuleSchema };
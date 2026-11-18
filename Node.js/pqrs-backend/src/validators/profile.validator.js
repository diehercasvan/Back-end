// src/validators/profile.validator.js
const { z } = require('zod');

// Editar perfil completo (admin o el propio usuario)
const updateProfileSchema = z
  .object({
    first_name: z.string().min(1).max(50).optional(),
    last_name: z.string().min(1).max(50).optional(),
    address: z.string().max(255).optional().nullable(),
    phone: z.string().max(20).optional().nullable(),
    document_type_id: z.coerce.number().int().positive().optional(),
    document_number: z.string().min(3).max(50).optional(),
    photo_url: z.string().max(255).url().optional().nullable(),
    birth_date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato YYYY-MM-DD')
      .optional()
      .nullable(),
  })
  .refine((v) => Object.keys(v).length > 0, {
    message: 'Debes enviar al menos un campo para actualizar',
  });

module.exports = { updateProfileSchema };
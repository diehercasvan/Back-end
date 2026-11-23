// src/validators/pqrsResponse.validator.js
const { z } = require('zod');

const createResponseSchema = z.object({
  message: z.string().min(1, 'El mensaje no puede estar vacío').max(5000),
  is_internal: z
    .union([z.boolean(), z.coerce.number().int().min(0).max(1)])
    .optional()
    .default(0),
});

module.exports = { createResponseSchema };
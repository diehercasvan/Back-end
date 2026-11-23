// src/validators/pqrs.validator.js
const { z } = require('zod');

// --- Crear PQRS ---
const createPqrsSchema = z.object({
  pqrs_type_id: z.coerce.number().int().positive(),
  subject: z.string().min(5, 'El asunto debe tener al menos 5 caracteres').max(150),
  description: z.string().min(10, 'La descripción debe tener al menos 10 caracteres'),
});

// --- Actualizar estado ---
const changeStatusSchema = z.object({
  pqrs_status_id: z.coerce.number().int().positive(),
  comment: z.string().max(500).optional().nullable(), // opcional, para auditoría futura
});

// --- Asignar funcionario ---
const assignPqrsSchema = z.object({
  assigned_to: z.coerce.number().int().positive(),
});

// --- Filtros de listado ---
const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(10),
  pqrs_status_id: z.coerce.number().int().positive().optional(),
  pqrs_type_id: z.coerce.number().int().positive().optional(),
  assigned_to: z.coerce.number().int().positive().optional(),
  q: z.string().max(150).optional(),
  sort: z.enum(['created_at', 'updated_at', 'tracking_number']).optional().default('created_at'),
  order: z.enum(['ASC', 'DESC']).optional().default('DESC'),
});

module.exports = {
  createPqrsSchema,
  changeStatusSchema,
  assignPqrsSchema,
  listQuerySchema,
};
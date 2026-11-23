// src/routes/pqrs/pqrs.routes.js
const { Router } = require('express');
const { authRequired } = require('../../middlewares/auth.middleware');
const { permissionRequired } = require('../../middlewares/permission.middleware');
const { validate } = require('../../middlewares/validate.middleware');
const {
  createPqrsSchema, changeStatusSchema, assignPqrsSchema, listQuerySchema,
} = require('../../validators/pqrs.validator');
const { createResponseSchema } = require('../../validators/pqrsResponse.validator');
const responseCtl = require('../../controllers/pqrs/response.controller');
const ctl = require('../../controllers/pqrs/pqrs.controller');

const router = Router();


// Listar (con filtros)
router.get('/',
  authRequired, permissionRequired('PQRS', 'view'),
  validate(listQuerySchema, 'query'), ctl.list);

// Detalle
router.get('/:id',
  authRequired, permissionRequired('PQRS', 'view'), ctl.getOne);

// Crear
router.post('/',
  authRequired, permissionRequired('PQRS', 'create'),
  validate(createPqrsSchema), ctl.create);

// Cambiar estado
router.patch('/:id/status',
  authRequired, permissionRequired('PQRS', 'edit'),
  validate(changeStatusSchema), ctl.changeStatus);

// Asignar
router.patch('/:id/assign',
  authRequired, permissionRequired('PQRS', 'edit'),
  validate(assignPqrsSchema), ctl.assign);

// Eliminar
router.delete('/:id',
  authRequired, permissionRequired('PQRS', 'delete'), ctl.remove);

/* ===== Responses (hilo de conversación) ===== */
router.get('/:id/responses',
  authRequired, permissionRequired('PQRS', 'view'), responseCtl.list);

router.post('/:id/responses',
  authRequired, permissionRequired('PQRS', 'view'),
  validate(createResponseSchema), responseCtl.create);

module.exports = router;
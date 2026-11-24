// src/routes/pqrs/pqrs.routes.js
const { Router } = require('express');
const { authRequired } = require('../../middlewares/auth.middleware');
const { permissionRequired } = require('../../middlewares/permission.middleware');
const { validate } = require('../../middlewares/validate.middleware');
const {
  createPqrsSchema, changeStatusSchema, assignPqrsSchema, listQuerySchema,
} = require('../../validators/pqrs.validator');
const { createResponseSchema } = require('../../validators/pqrsResponse.validator');
const ctl = require('../../controllers/pqrs/pqrs.controller');
const responseCtl = require('../../controllers/pqrs/response.controller');
const statsCtl = require('../../controllers/pqrs/pqrsStats.controller');

const router = Router();

/* ============================================================
 * IMPORTANTE: las rutas específicas van ANTES de las paramétricas (/:id).
 * Si /:id está antes de /stats, "stats" cae en id y Number("stats")=NaN.
 * ============================================================ */

/* Stats (antes de /:id) */
router.get('/stats',
  authRequired, permissionRequired('PQRS', 'view'), statsCtl.stats);

/* Listar */
router.get('/',
  authRequired, permissionRequired('PQRS', 'view'),
  validate(listQuerySchema, 'query'), ctl.list);

/* Crear */
router.post('/',
  authRequired, permissionRequired('PQRS', 'create'),
  validate(createPqrsSchema), ctl.create);

/* Detalle (paramétrica) */
router.get('/:id',
  authRequired, permissionRequired('PQRS', 'view'), ctl.getOne);

/* Cambiar estado */
router.patch('/:id/status',
  authRequired, permissionRequired('PQRS', 'edit'),
  validate(changeStatusSchema), ctl.changeStatus);

/* Asignar */
router.patch('/:id/assign',
  authRequired, permissionRequired('PQRS', 'edit'),
  validate(assignPqrsSchema), ctl.assign);

/* Eliminar */
router.delete('/:id',
  authRequired, permissionRequired('PQRS', 'delete'), ctl.remove);

/* Responses */
router.get('/:id/responses',
  authRequired, permissionRequired('PQRS', 'view'), responseCtl.list);

router.post('/:id/responses',
  authRequired, permissionRequired('PQRS', 'view'),
  validate(createResponseSchema), responseCtl.create);

module.exports = router;
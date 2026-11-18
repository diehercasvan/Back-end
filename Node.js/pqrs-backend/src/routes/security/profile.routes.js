// src/routes/profile.routes.js
const { Router } = require('express');
const { authRequired } = require('../../middlewares/auth.middleware');
const { permissionRequired } = require('../../middlewares/permission.middleware');
const { validate } = require('../../middlewares/validate.middleware');
const { updateProfileSchema } = require('../../validators/profile.validator');
const ctl = require('../../controllers/security/profile.controller');

const router = Router();

/* ===== "me" (solo auth, sin permiso de módulo) ===== */
router.get('/me',  authRequired, ctl.getMine);
router.put('/me',  authRequired, validate(updateProfileSchema), ctl.updateMine);

/* ===== Listado y detalle (con Perfiles+view) ===== */
router.get('/',     authRequired, permissionRequired('Perfiles', 'view'), ctl.list);
router.get('/:id',  authRequired, permissionRequired('Perfiles', 'view'), ctl.getOne);

module.exports = router;
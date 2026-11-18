// src/routes/module.routes.js
const { Router } = require('express');
const { authRequired } = require('../../middlewares/auth.middleware');
const { permissionRequired } = require('../../middlewares/permission.middleware');
const { validate } = require('../../middlewares/validate.middleware');
const {
  createModuleSchema, updateModuleSchema,
} = require('../../validators/module.validator');
const ctl = require('../../controllers/security/module.controller');

const router = Router();

router.get('/',    authRequired, permissionRequired('Roles', 'view'),   ctl.list);
router.get('/:id', authRequired, permissionRequired('Roles', 'view'),   ctl.getOne);
router.post('/',   authRequired, permissionRequired('Roles', 'create'),
  validate(createModuleSchema), ctl.create);
router.put('/:id', authRequired, permissionRequired('Roles', 'edit'),
  validate(updateModuleSchema), ctl.update);
router.delete('/:id', authRequired, permissionRequired('Roles', 'delete'), ctl.remove);

module.exports = router;
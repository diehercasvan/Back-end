// src/routes/user.routes.js
const { Router } = require('express');
const { authRequired } = require('../../middlewares/auth.middleware');
const { permissionRequired } = require('../../middlewares/permission.middleware');
const { validate } = require('../../middlewares/validate.middleware');
const {
  createUserSchema, updateUserSchema, changeStatusSchema,
  changePasswordSchema, assignRoleSchema,
} = require('../../validators/user.validator');
const ctl = require('../../controllers/security/user.controller');

const profileCtl = require('../../controllers/security/profile.controller');
const { updateProfileSchema: updateProfileSchema2 } = require('../../validators/profile.validator');

const router = Router();

/* ===== CRUD Users ===== */
router.get('/',    authRequired, permissionRequired('Usuarios', 'view'),   ctl.list);
router.post('/',   authRequired, permissionRequired('Usuarios', 'create'),
  validate(createUserSchema), ctl.create);

router.get('/:id', authRequired, permissionRequired('Usuarios', 'view'),   ctl.getOne);
router.put('/:id', authRequired, permissionRequired('Usuarios', 'edit'),
  validate(updateUserSchema), ctl.update);
router.delete('/:id', authRequired, permissionRequired('Usuarios', 'delete'), ctl.remove);

/* ===== Acciones específicas ===== */
router.patch('/:id/status',
  authRequired, permissionRequired('Usuarios', 'edit'),
  validate(changeStatusSchema), ctl.changeStatus);

router.patch('/:id/password',
  authRequired, permissionRequired('Usuarios', 'edit'),
  validate(changePasswordSchema), ctl.changePassword);

/* ===== Roles del usuario ===== */
router.get('/:id/roles',
  authRequired, permissionRequired('Usuarios', 'view'), ctl.listRoles);

router.post('/:id/roles',
  authRequired, permissionRequired('Usuarios', 'edit'),
  validate(assignRoleSchema), ctl.assignRole);

router.delete('/:id/roles/:urId',
  authRequired, permissionRequired('Usuarios', 'edit'), ctl.revokeRole);

  router.get('/:id/profile',
  authRequired, permissionRequired('Perfiles', 'view'), profileCtl.getByUser);

router.put('/:id/profile',
  authRequired, permissionRequired('Perfiles', 'edit'),
  validate(updateProfileSchema2), profileCtl.updateByUser);
  
module.exports = router;
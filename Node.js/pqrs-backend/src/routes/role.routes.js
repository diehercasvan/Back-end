// src/routes/role.routes.js
const { Router } = require('express');
const { authRequired } = require('../middlewares/auth.middleware');
const { permissionRequired } = require('../middlewares/permission.middleware');
const { validate } = require('../middlewares/validate.middleware');
const {
  createRoleSchema, updateRoleSchema, assignPermissionSchema,
} = require('../validators/role.validator');
const roleCtl = require('../controllers/security/role.controller');

const router = Router();

/* ===== CRUD Roles ===== */
router.get('/',    authRequired, permissionRequired('Roles', 'view'),   roleCtl.list);
router.post('/',   authRequired, permissionRequired('Roles', 'create'), validate(createRoleSchema), roleCtl.create);
router.get('/:id', authRequired, permissionRequired('Roles', 'view'),   roleCtl.getOne);
router.put('/:id', authRequired, permissionRequired('Roles', 'edit'),   validate(updateRoleSchema), roleCtl.update);
router.delete('/:id', authRequired, permissionRequired('Roles', 'delete'), roleCtl.remove);

/* ===== Permisos del rol ===== */
router.get('/:id/permissions',
  authRequired, permissionRequired('Roles', 'view'), roleCtl.listPermissions);

router.post('/:id/permissions',
  authRequired, permissionRequired('Roles', 'edit'),
  validate(assignPermissionSchema), roleCtl.assignPermission);

router.delete('/:id/permissions/:rmpId',
  authRequired, permissionRequired('Roles', 'edit'), roleCtl.revokePermission);

module.exports = router;
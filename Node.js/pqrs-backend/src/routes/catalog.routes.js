// src/routes/catalog.routes.js
const { Router } = require('express');
const { authRequired } = require('../middlewares/auth.middleware');
const { permissionRequired } = require('../middlewares/permission.middleware');
const catalog = require('../controllers/security/catalog.controller');

const router = Router();

// Todos requieren auth. Permisos: view sobre el módulo correspondiente.
router.get('/permissions',
  authRequired,
  permissionRequired('Roles', 'view'),
  catalog.listPermissions);

router.get('/modules',
  authRequired,
  permissionRequired('Roles', 'view'),
  catalog.listModules);

router.get('/user-status',
  authRequired,
  permissionRequired('Usuarios', 'view'),
  catalog.listUserStatus);

router.get('/document-types',
  authRequired,
  permissionRequired('Perfiles', 'view'),
  catalog.listDocumentTypes);

router.get('/pqrs-types',
  authRequired,
  permissionRequired('PQRS', 'view'),
  catalog.listPqrsTypes);

router.get('/pqrs-status',
  authRequired,
  permissionRequired('PQRS', 'view'),
  catalog.listPqrsStatus);

module.exports = router;
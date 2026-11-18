// src/routes/index.js
const { Router } = require('express');
const authRoutes = require('./auth.routes');
const security = require('./security');

const router = Router();

router.get('/health', (req, res) => {
  res.json({ success: true, message: 'Router /api/v1 operativo' });
});

router.use('/auth', authRoutes);
router.use('/catalogs', security.catalog);
router.use('/roles', security.role);
router.use('/users', security.user);
router.use('/profiles', security.profile);
router.use('/modules', security.module);

module.exports = router;
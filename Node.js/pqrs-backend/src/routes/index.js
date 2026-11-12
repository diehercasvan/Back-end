// src/routes/index.js
const { Router } = require('express');
const authRoutes = require('./auth.routes');
const catalogRoutes = require('./catalog.routes');

const router = Router();

// Health específico del router (útil para verificar el montaje)
router.get('/health', (req, res) => {
  res.json({ success: true, message: 'Router /api/v1 operativo' });
});

// Módulos
router.use('/auth', authRoutes);
router.use('/catalogs', catalogRoutes); 

module.exports = router;
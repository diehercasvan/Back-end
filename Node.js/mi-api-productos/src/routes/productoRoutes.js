const { Router } = require('express');
const controller = require('../controllers/productoController');
const router = Router();

router.get('/', controller.listar);
router.post('/', controller.crear);

module.exports = router;
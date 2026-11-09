// src/routes/auth.routes.js
const { Router } = require('express');
const { authRequired } = require('../middlewares/auth.middleware');
const { validate } = require('../middlewares/validate.middleware');
const { loginSchema, selectRoleSchema } = require('../validators/auth.validator');
const authController = require('../controllers/auth');

const router = Router();

/**
 * @openapi
 * /auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: Iniciar sesión
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [username, password]
 *             properties:
 *               username: { type: string, example: admin }
 *               password: { type: string, example: "admin123" }
 *     responses:
 *       200:
 *         description: Login exitoso
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/LoginResponse' }
 *       401: { description: Credenciales inválidas }
 */
router.post('/login', validate(loginSchema), authController.login);

/**
 * @openapi
 * /auth/me:
 *   get:
 *     tags: [Auth]
 *     summary: Perfil del usuario autenticado
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Perfil }
 *       401: { description: No autorizado }
 */
router.get('/me', authRequired, authController.me);

/**
 * @openapi
 * /auth/select-role:
 *   post:
 *     tags: [Auth]
 *     summary: Cambiar rol activo y reemitir token
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [user_role_id]
 *             properties:
 *               user_role_id: { type: integer, example: 1 }
 *     responses:
 *       200: { description: Rol actualizado }
 *       400: { description: Rol no disponible }
 */
router.post('/select-role', authRequired, validate(selectRoleSchema), authController.selectRole);

/**
 * @openapi
 * /auth/roles:
 *   get:
 *     tags: [Auth]
 *     summary: Roles activos del usuario autenticado
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Lista de roles }
 */
router.get('/roles', authRequired, authController.listRoles);

/**
 * @openapi
 * /auth/health:
 *   get:
 *     tags: [Auth]
 *     summary: Health check del router de auth
 *     responses:
 *       200: { description: Router operativo }
 */
router.get('/health', (req, res) => {
  res.json({ success: true, message: 'Auth router operativo' });
});
module.exports = router;
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Acceso - Taller CodeIgniter 4</title>
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.1/font/bootstrap-icons.css">
</head>
<body class="bg-light d-flex align-items-center vh-100">
    <div class="container" style="max-width: 420px;">
        <div class="card shadow-lg border-0 rounded-3">
            <div class="card-body p-4">
                <div class="text-center mb-4">
                    <i class="bi bi-shield-lock-fill text-primary display-4"></i>
                    <h3 class="fw-bold mt-2">Iniciar Sesión</h3>
                    <p class="text-muted small">Ingrese sus credenciales de acceso</p>
                </div>

                <?php if (session()->getFlashdata('error')): ?>
                    <div class="alert alert-danger alert-dismissible fade show" role="alert">
                        <i class="bi bi-exclamation-triangle-fill me-2"></i>
                        <?= session()->getFlashdata('error') ?>
                        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
                    </div>
                <?php endif; ?>

                <?php if (session()->getFlashdata('success')): ?>
                    <div class="alert alert-success alert-dismissible fade show" role="alert">
                        <i class="bi bi-check-circle-fill me-2"></i>
                        <?= session()->getFlashdata('success') ?>
                        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
                    </div>
                <?php endif; ?>

                <form action="<?= base_url('login/process') ?>" method="POST" autocomplete="off">
                    <?= csrf_field() ?>
                    <div class="mb-3">
                        <label class="form-label font-weight-bold">Usuario o Email</label>
                        <div class="input-group">
                            <span class="input-group-text"><i class="bi bi-person"></i></span>
                            <input type="text" name="credential" class="form-control" placeholder="admin o correo@ejemplo.com" required autofocus>
                        </div>
                    </div>

                    <div class="mb-4">
                        <label class="form-label">Contraseña</label>
                        <div class="input-group">
                            <span class="input-group-text"><i class="bi bi-key"></i></span>
                            <input type="password" name="password" class="form-control" required>
                        </div>
                    </div>

                    <button type="submit" class="btn btn-primary w-100 py-2 fw-bold">
                        <i class="bi bi-box-arrow-in-right me-1"></i> Ingresar
                    </button>
                </form>
            </div>
            <div class="card-footer bg-white text-center py-3 border-0">
                <a href="<?= base_url('register') ?>" class="text-decoration-none small">¿No tienes cuenta? Regístrate aquí</a>
            </div>
        </div>
    </div>
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js"></script>
</body>
</html>
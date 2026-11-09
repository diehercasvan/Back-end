<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Dashboard - Sistema CodeIgniter 4</title>
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.1/font/bootstrap-icons.css">
</head>
<body class="bg-light">

    <!-- Navbar Dinámica basada en Permisos -->
    <nav class="navbar navbar-expand-lg navbar-dark bg-dark shadow-sm">
        <div class="container-fluid px-4">
            <a class="navbar-brand fw-bold" href="<?= base_url('home') ?>">
                <i class="bi bi-code-slash text-warning me-2"></i>Sistema CI4
            </a>
            <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarMain">
                <span class="navbar-toggler-icon"></span>
            </button>

            <div class="collapse navbar-collapse" id="navbarMain">
                <ul class="navbar-nav me-auto mb-2 mb-lg-0">
                    <?php foreach ($modules as $mod): ?>
                        <li class="nav-item">
                            <a class="nav-link" href="<?= base_url($mod['route']) ?>">
                                <i class="bi <?= $mod['icon'] ?> me-1"></i> <?= esc($mod['name']) ?>
                            </a>
                        </li>
                    <?php endforeach; ?>
                </ul>

                <div class="d-flex align-items-center text-white">
                    <img src="<?= base_url('uploads/avatars/' . ($profile['photo_url'] ?? 'default_avatar.png')) ?>" 
                         class="rounded-circle me-2 border border-2 border-warning" 
                         width="38" height="38" style="object-fit: cover;" alt="Avatar">
                    <div class="me-3">
                        <div class="fw-bold leading-none"><?= esc($profile['first_name'] ?? $username) ?> <?= esc($profile['last_name'] ?? '') ?></div>
                        <small class="text-muted" style="font-size: 0.75rem;">
                            <?= esc(implode(', ', array_column($roles, 'role_name'))) ?>
                        </small>
                    </div>
                    <a href="<?= base_url('logout') ?>" class="btn btn-outline-danger btn-sm rounded-pill px-3">
                        <i class="bi bi-box-arrow-right me-1"></i> Salir
                    </a>
                </div>
            </div>
        </div>
    </nav>

    <!-- Contenido Principal -->
    <div class="container mt-4">
        <div class="p-4 bg-white rounded-3 shadow-sm border mb-4">
            <h2 class="fw-bold text-primary">¡Bienvenido, <?= esc($profile['first_name'] ?? $username) ?>!</h2>
            <p class="text-muted">Has ingresado correctamente. A continuación se muestran los módulos a los que tienes acceso según tu rol actual.</p>
        </div>

        <div class="row g-3">
            <?php foreach ($modules as $mod): ?>
                <div class="col-md-4">
                    <div class="card h-100 shadow-sm border-0">
                        <div class="card-body">
                            <h5 class="card-title fw-bold text-dark">
                                <i class="bi <?= $mod['icon'] ?> text-primary me-2"></i> <?= esc($mod['name']) ?>
                            </h5>
                            <p class="card-text text-muted small">Ruta: <code>/<?= esc($mod['route']) ?></code></p>
                            
                            <div class="d-flex gap-1 mt-3">
                                <span class="badge bg-<?= $mod['can_create'] ? 'success' : 'secondary' ?>">Crear</span>
                                <span class="badge bg-<?= $mod['can_edit'] ? 'warning text-dark' : 'secondary' ?>">Editar</span>
                                <span class="badge bg-<?= $mod['can_delete'] ? 'danger' : 'secondary' ?>">Eliminar</span>
                            </div>
                        </div>
                        <div class="card-footer bg-white border-0 text-end pb-3">
                            <a href="<?= base_url($mod['route']) ?>" class="btn btn-sm btn-outline-primary fw-bold">Ingresar al Módulo »</a>
                        </div>
                    </div>
                </div>
            <?php endforeach; ?>
        </div>
    </div>

    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js"></script>
</body>
</html>

<?php
$content = '
<div class="d-flex justify-content-between align-items-center mb-3">
    <h2>
        <i class="bi bi-people"></i> Gestión de Usuarios
    </h2>
    <a href="index.php?controller=user&action=create" class="btn btn-primary">
        <i class="bi bi-plus-circle"></i> Nuevo Usuario
    </a>
</div>

' . (isset($_GET['success']) ? 
    '<div class="alert alert-success alert-dismissible fade show">
        <i class="bi bi-check-circle"></i> Operación realizada con éxito
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    </div>' : '') . '

' . (isset($_GET['error']) ? 
    '<div class="alert alert-danger alert-dismissible fade show">
        <i class="bi bi-exclamation-triangle"></i> Error al realizar la operación
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    </div>' : '') . '

<div class="table-responsive">
    <table class="table table-striped table-hover">
        <thead>
            <tr>
                <th>ID</th>
                <th>Usuario</th>
                <th>Email</th>
                <th>Estado</th>
                <th>Último Login</th>
                <th>Acciones</th>
            </tr>
        </thead>
        <tbody>
';

if (empty($users)) {
    $content .= '
        <tr>
            <td colspan="6" class="text-center text-muted">
                <i class="bi bi-info-circle"></i> No hay usuarios registrados
            </td>
        </tr>
    ';
} else {
    foreach ($users as $user) {
        $badgeColor = $user['status_id'] == 1 ? 'success' : 'danger';
        $lastLogin = $user['last_login'] ? 
            date('d/m/Y H:i', strtotime($user['last_login'])) : 
            'Nunca';
        
        $content .= '
        <tr>
            <td>' . $user['id'] . '</td>
            <td><strong>' . htmlspecialchars($user['username']) . '</strong></td>
            <td>' . htmlspecialchars($user['email']) . '</td>
            <td>
                <span class="badge bg-' . $badgeColor . '">
                    ' . htmlspecialchars($user['status_name']) . '
                </span>
            </td>
            <td>' . $lastLogin . '</td>
            <td>
                <div class="btn-group" role="group">
                    <a href="index.php?controller=user&action=edit&id=' . $user['id'] . '" 
                       class="btn btn-sm btn-warning" title="Editar">
                        <i class="bi bi-pencil"></i>
                    </a>
                    <a href="index.php?controller=user&action=delete&id=' . $user['id'] . '" 
                       class="btn btn-sm btn-danger" 
                       onclick="return confirm(\'¿Está seguro de eliminar este usuario?\')"
                       title="Eliminar">
                        <i class="bi bi-trash"></i>
                    </a>
                </div>
            </td>
        </tr>
        ';
    }
}

$content .= '
        </tbody>
    </table>
</div>
';

require_once __DIR__ . '/../layout/main.php';
?>
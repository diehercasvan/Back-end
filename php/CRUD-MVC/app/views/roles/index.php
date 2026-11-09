<?php
$content = '
<div class="d-flex justify-content-between align-items-center mb-3">
    <h2>
        <i class="bi bi-people-fill"></i> Gestión de Roles
    </h2>
    <a href="index.php?controller=role&action=create" class="btn btn-primary">
        <i class="bi bi-plus-circle"></i> Nuevo Rol
    </a>
</div>

' . (isset($_GET['success']) ? 
    '<div class="alert alert-success alert-dismissible fade show">
        <i class="bi bi-check-circle"></i> Operación realizada con éxito
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    </div>' : '') . '

' . (isset($_GET['error']) ? 
    '<div class="alert alert-danger alert-dismissible fade show">
        <i class="bi bi-exclamation-triangle"></i> ' . htmlspecialchars($_GET['error']) . '
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    </div>' : '') . '

<div class="table-responsive">
    <table class="table table-striped table-hover">
        <thead>
            <tr>
                <th>ID</th>
                <th>Nombre</th>
                <th>Descripción</th>
                <th>Estado</th>
                <th>Fecha Creación</th>
                <th>Acciones</th>
            </tr>
        </thead>
        <tbody>
';

if (empty($roles)) {
    $content .= '
        <tr>
            <td colspan="6" class="text-center text-muted">
                <i class="bi bi-info-circle"></i> No hay roles registrados
            </td>
        </tr>
    ';
} else {
    foreach ($roles as $role) {
        $badgeColor = $role['is_active'] ? 'success' : 'danger';
        $badgeText = $role['is_active'] ? 'Activo' : 'Inactivo';
        
        $content .= '
        <tr>
            <td>' . $role['id'] . '</td>
            <td><strong>' . htmlspecialchars($role['name']) . '</strong></td>
            <td>' . htmlspecialchars($role['description']) . '</td>
            <td>
                <span class="badge bg-' . $badgeColor . '">
                    ' . $badgeText . '
                </span>
            </td>
            <td>' . date('d/m/Y H:i', strtotime($role['created_at'])) . '</td>
            <td>
                <div class="btn-group" role="group">
                    <a href="index.php?controller=role&action=edit&id=' . $role['id'] . '" 
                       class="btn btn-sm btn-warning" title="Editar">
                        <i class="bi bi-pencil"></i>
                    </a>
                    <a href="index.php?controller=role&action=delete&id=' . $role['id'] . '" 
                       class="btn btn-sm btn-danger" 
                       onclick="return confirm(\'¿Está seguro de eliminar este rol?\')"
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
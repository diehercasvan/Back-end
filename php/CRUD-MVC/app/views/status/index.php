<?php
$content = '
<div class="d-flex justify-content-between align-items-center mb-3">
    <h2>
        <i class="bi bi-back"></i> Gestión de Estados de Usuario
    </h2>
    <a href="index.php?controller=status&action=create" class="btn btn-primary">
        <i class="bi bi-plus-circle"></i> Nuevo Estado
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
                <th>Fecha Creación</th>
                <th>Acciones</th>
            </tr>
        </thead>
        <tbody>
';

if (empty($statuses)) {
    $content .= '
        <tr>
            <td colspan="5" class="text-center text-muted">
                <i class="bi bi-info-circle"></i> No hay estados registrados
            </td>
        </tr>
    ';
} else {
    foreach ($statuses as $status) {
        $content .= '
        <tr>
            <td>' . $status['id'] . '</td>
            <td><strong>' . htmlspecialchars($status['name']) . '</strong></td>
            <td>' . htmlspecialchars($status['description']) . '</td>
            <td>' . date('d/m/Y H:i', strtotime($status['created_at'])) . '</td>
            <td>
                <div class="btn-group" role="group">
                    <a href="index.php?controller=status&action=edit&id=' . $status['id'] . '" 
                       class="btn btn-sm btn-warning" title="Editar">
                        <i class="bi bi-pencil"></i>
                    </a>
                    <a href="index.php?controller=status&action=delete&id=' . $status['id'] . '" 
                       class="btn btn-sm btn-danger" 
                       onclick="return confirm(\'¿Está seguro de eliminar este estado?\')"
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
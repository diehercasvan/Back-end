<?php
$content = '
<div class="d-flex justify-content-between align-items-center mb-3">
    <h2>
        <i class="bi bi-chat-left-quote-fill"></i> Gestión de Tipos de Documentos
    </h2>
    <a href="index.php?controller=documentType&action=create" class="btn btn-primary">
        <i class="bi bi-plus-circle"></i> Nuevo Tipo de Documento
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

if (empty($documentTypes)) {
    $content .= '
        <tr>
            <td colspan="5" class="text-center text-muted">
                <i class="bi bi-info-circle"></i> No hay estados registrados
            </td>
        </tr>
    ';
} else {
    foreach ($documentTypes as $documentType) {
        $content .= '
        <tr>
            <td>' . $documentType['id'] . '</td>
            <td><strong>' . htmlspecialchars($documentType['name']) . '</strong></td>
            <td>' . htmlspecialchars($documentType['description']) . '</td>
            <td>' . date('d/m/Y H:i', strtotime($documentType['created_at'])) . '</td>
            <td>
                <div class="btn-group" role="group">
                    <a href="index.php?controller=documentType&action=edit&id=' . $documentType['id'] . '" 
                       class="btn btn-sm btn-warning" title="Editar">
                        <i class="bi bi-pencil"></i>
                    </a>
                    <a href="index.php?controller=documentType&action=delete&id=' . $documentType['id'] . '" 
                       class="btn btn-sm btn-danger" 
                       onclick="return confirm(\'¿Está seguro de eliminar este tipo de documento?\')"
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
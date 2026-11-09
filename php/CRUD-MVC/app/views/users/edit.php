<?php
// Verificar que exista el usuario
if (!isset($user) || !$user) {
    echo '<div class="alert alert-danger">Usuario no encontrado</div>';
    require_once __DIR__ . '/../layout/main.php';
    return;
}

$content = '
<div class="row justify-content-center">
    <div class="col-md-8 col-lg-6">
        <div class="card shadow">
            <div class="card-header bg-warning text-dark">
                <h4 class="mb-0">
                    <i class="bi bi-pencil-square"></i> Editar Usuario
                </h4>
            </div>
            <div class="card-body">
                <form action="index.php?controller=user&action=update" 
                      method="POST" 
                      id="userForm" 
                      novalidate>
                    
                    <input type="hidden" name="id" value="' . $user['id'] . '">
                    
                    <div class="mb-3">
                        <label for="username" class="form-label">
                            <i class="bi bi-person"></i> Usuario 
                            <span class="text-danger">*</span>
                        </label>
                        <input type="text" 
                               class="form-control" 
                               id="username" 
                               name="username" 
                               value="' . htmlspecialchars($user['username']) . '" 
                               required 
                               minlength="3" 
                               maxlength="50">
                        <div class="invalid-feedback">
                            El usuario debe tener al menos 3 caracteres
                        </div>
                    </div>
                    
                    <div class="mb-3">
                        <label for="email" class="form-label">
                            <i class="bi bi-envelope"></i> Email 
                            <span class="text-danger">*</span>
                        </label>
                        <input type="email" 
                               class="form-control" 
                               id="email" 
                               name="email" 
                               value="' . htmlspecialchars($user['email']) . '" 
                               required>
                        <div class="invalid-feedback">
                            Ingrese un email válido
                        </div>
                    </div>
                    
                    <div class="mb-3">
                        <label for="status_id" class="form-label">
                            <i class="bi bi-toggle-on"></i> Estado 
                            <span class="text-danger">*</span>
                        </label>
                        <select class="form-control" 
                                id="status_id" 
                                name="status_id" 
                                required>
                            <option value="">Seleccione un estado</option>
';

foreach ($statuses as $status) {
    $selected = ($status['id'] == $user['status_id']) ? 'selected' : '';
    $content .= '<option value="' . $status['id'] . '" ' . $selected . '>' . 
                htmlspecialchars($status['name']) . 
                '</option>';
}

$content .= '
                        </select>
                    </div>
                    
                    <div class="alert alert-info">
                        <i class="bi bi-info-circle"></i> 
                        <small>Para cambiar la contraseña, use la opción de recuperación.</small>
                    </div>
                    
                    <div class="d-grid gap-2 d-md-flex justify-content-md-end">
                        <a href="index.php?controller=user&action=index" 
                           class="btn btn-secondary">
                            <i class="bi bi-arrow-left"></i> Cancelar
                        </a>
                        <button type="submit" class="btn btn-warning">
                            <i class="bi bi-save"></i> Actualizar
                        </button>
                    </div>
                </form>
            </div>
        </div>
    </div>
</div>
';

require_once __DIR__ . '/../layout/main.php';
?>
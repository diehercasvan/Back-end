<?php
// Verificar que exista el rol
if (!isset($role) || !$role) {
    echo '<div class="alert alert-danger">Rol no encontrado</div>';
    require_once __DIR__ . '/../layout/main.php';
    return;
}

$content = '
<div class="row justify-content-center">
    <div class="col-md-8 col-lg-6">
        <div class="card shadow">
            <div class="card-header bg-warning text-dark">
                <h4 class="mb-0">
                    <i class="bi bi-pencil-square"></i> Editar Rol
                </h4>
            </div>
            <div class="card-body">
                <form action="index.php?controller=role&action=update" 
                      method="POST" 
                      novalidate>
                    
                    <input type="hidden" name="id" value="' . $role['id'] . '">
                    
                    <div class="mb-3">
                        <label for="name" class="form-label">
                            <i class="bi bi-tag"></i> Nombre 
                            <span class="text-danger">*</span>
                        </label>
                        <input type="text" 
                               class="form-control" 
                               id="name" 
                               name="name" 
                               value="' . htmlspecialchars($role['name']) . '" 
                               required 
                               minlength="3" 
                               maxlength="50">
                        <div class="invalid-feedback">
                            El nombre debe tener al menos 3 caracteres
                        </div>
                    </div>
                    
                    <div class="mb-3">
                        <label for="description" class="form-label">
                            <i class="bi bi-file-text"></i> Descripción
                        </label>
                        <textarea class="form-control" 
                                  id="description" 
                                  name="description" 
                                  rows="3">' . htmlspecialchars($role['description']) . '</textarea>
                    </div>
                    
                    <div class="mb-3 form-check">
                        <input type="checkbox" 
                               class="form-check-input" 
                               id="is_active" 
                               name="is_active" 
                               ' . ($role['is_active'] ? 'checked' : '') . '>
                        <label class="form-check-label" for="is_active">
                            <i class="bi bi-toggle-on"></i> Activo
                        </label>
                    </div>
                    
                    <div class="d-grid gap-2 d-md-flex justify-content-md-end">
                        <a href="index.php?controller=role&action=index" 
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
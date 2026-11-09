<?php
$content = '
<div class="row justify-content-center">
    <div class="col-md-8 col-lg-6">
        <div class="card shadow">
            <div class="card-header bg-primary text-white">
                <h4 class="mb-0">
                    <i class="bi bi-plus-circle"></i> Crear Nuevo Rol
                </h4>
            </div>
            <div class="card-body">
                <form action="index.php?controller=role&action=store" 
                      method="POST" 
                      novalidate>
                    
                    <div class="mb-3">
                        <label for="name" class="form-label">
                            <i class="bi bi-tag"></i> Nombre 
                            <span class="text-danger">*</span>
                        </label>
                        <input type="text" 
                               class="form-control" 
                               id="name" 
                               name="name" 
                               required 
                               minlength="3" 
                               maxlength="50"
                               placeholder="Ej: Administrador, Usuario, etc.">
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
                                  rows="3"
                                  placeholder="Descripción del rol"></textarea>
                    </div>
                    
                    <div class="mb-3 form-check">
                        <input type="checkbox" 
                               class="form-check-input" 
                               id="is_active" 
                               name="is_active" 
                               checked>
                        <label class="form-check-label" for="is_active">
                            <i class="bi bi-toggle-on"></i> Activo
                        </label>
                    </div>
                    
                    <div class="d-grid gap-2 d-md-flex justify-content-md-end">
                        <a href="index.php?controller=role&action=index" 
                           class="btn btn-secondary">
                            <i class="bi bi-arrow-left"></i> Cancelar
                        </a>
                        <button type="submit" class="btn btn-primary">
                            <i class="bi bi-save"></i> Guardar
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
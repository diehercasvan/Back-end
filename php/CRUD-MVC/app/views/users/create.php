<?php
$content = '
<div class="row justify-content-center">
    <div class="col-md-8 col-lg-6">
        <div class="card shadow">
            <div class="card-header bg-primary text-white">
                <h4 class="mb-0">
                    <i class="bi bi-person-plus"></i> Crear Nuevo Usuario
                </h4>
            </div>
            <div class="card-body">
                <form action="index.php?controller=user&action=store" 
                      method="POST" 
                      id="userForm" 
                      novalidate>
                    
                    <div class="mb-3">
                        <label for="username" class="form-label">
                            <i class="bi bi-person"></i> Usuario 
                            <span class="text-danger">*</span>
                        </label>
                        <input type="text" 
                               class="form-control" 
                               id="username" 
                               name="username" 
                               required 
                               minlength="3" 
                               maxlength="50"
                               placeholder="Ingrese el nombre de usuario">
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
                               required
                               placeholder="ejemplo@correo.com">
                        <div class="invalid-feedback">
                            Ingrese un email válido
                        </div>
                    </div>
                    
                    <div class="mb-3">
                        <label for="password" class="form-label">
                            <i class="bi bi-lock"></i> Contraseña 
                            <span class="text-danger">*</span>
                        </label>
                        <input type="password" 
                               class="form-control" 
                               id="password" 
                               name="password" 
                               required 
                               minlength="6"
                               placeholder="Mínimo 6 caracteres">
                        <div class="invalid-feedback">
                            La contraseña debe tener al menos 6 caracteres
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
    $content .= '<option value="' . $status['id'] . '">' . 
                htmlspecialchars($status['name']) . 
                '</option>';
}

$content .= '
                        </select>
                    </div>
                    
                    <div class="d-grid gap-2 d-md-flex justify-content-md-end">
                        <a href="index.php?controller=user&action=index" 
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
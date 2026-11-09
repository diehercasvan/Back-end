// Esperar a que el DOM esté completamente cargado
document.addEventListener('DOMContentLoaded', function() {
    
    // ==========================
    // 1. VALIDACIÓN DE FORMULARIOS
    // ==========================
    
    // Obtener todos los formularios
    const forms = document.querySelectorAll('form');
    
    forms.forEach(form => {
        form.addEventListener('submit', function(e) {
            // Validar el formulario
            if (!this.checkValidity()) {
                e.preventDefault();
                e.stopPropagation();
                this.classList.add('was-validated');
                return false;
            }
            
            // Validación específica para usuarios
            if (this.id === 'userForm') {
                // Validar contraseña en creación
                const password = document.getElementById('password');
                if (password && password.value.length < 6) {
                    e.preventDefault();
                    password.classList.add('is-invalid');
                    return false;
                }
            }
            
            return true;
        }, false);
    });

    // ==========================
    // 2. VALIDACIÓN EN TIEMPO REAL
    // ==========================
    
    // Validar campo de usuario
    const usernameFields = document.querySelectorAll('#username');
    usernameFields.forEach(field => {
        field.addEventListener('input', function() {
            const minLength = 3;
            if (this.value.length < minLength) {
                this.classList.add('is-invalid');
                this.setCustomValidity('El usuario debe tener al menos ' + minLength + ' caracteres');
            } else {
                this.classList.remove('is-invalid');
                this.setCustomValidity('');
            }
        });
    });

    // Validar campo de email
    const emailFields = document.querySelectorAll('#email');
    emailFields.forEach(field => {
        field.addEventListener('input', function() {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(this.value)) {
                this.classList.add('is-invalid');
                this.setCustomValidity('Ingrese un email válido');
            } else {
                this.classList.remove('is-invalid');
                this.setCustomValidity('');
            }
        });
    });

    // Validar campo de contraseña
    const passwordFields = document.querySelectorAll('#password');
    passwordFields.forEach(field => {
        field.addEventListener('input', function() {
            const minLength = 6;
            if (this.value.length < minLength) {
                this.classList.add('is-invalid');
                this.setCustomValidity('La contraseña debe tener al menos ' + minLength + ' caracteres');
            } else {
                this.classList.remove('is-invalid');
                this.setCustomValidity('');
            }
        });
    });

    // ==========================
    // 3. CONFIRMACIÓN DE ELIMINACIÓN
    // ==========================
    
    // Los botones de eliminación ya tienen confirm en onclick
    // Pero podemos mejorar la confirmación
    const deleteButtons = document.querySelectorAll('.btn-danger');
    deleteButtons.forEach(button => {
        // Si no tiene onclick, agregamos uno
        if (!button.getAttribute('onclick')) {
            button.addEventListener('click', function(e) {
                if (!confirm('¿Está seguro de eliminar este registro?')) {
                    e.preventDefault();
                }
            });
        }
    });

    // ==========================
    // 4. FUNCIONES UTILITARIAS
    // ==========================
    
    // Función para mostrar mensajes temporales
    window.showMessage = function(message, type = 'success', duration = 3000) {
        // Determinar clase de alerta
        const alertClass = type === 'success' ? 'alert-success' : 'alert-danger';
        
        // Crear elemento alerta
        const alert = document.createElement('div');
        alert.className = `alert ${alertClass} alert-dismissible fade show`;
        alert.role = 'alert';
        alert.innerHTML = `
            <i class="bi ${type === 'success' ? 'bi-check-circle' : 'bi-exclamation-triangle'}"></i>
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
        `;
        
        // Insertar al inicio del contenedor
        const container = document.querySelector('.container');
        if (container) {
            container.insertBefore(alert, container.firstChild);
        }
        
        // Auto cerrar después del tiempo especificado
        setTimeout(() => {
            alert.classList.remove('show');
            setTimeout(() => alert.remove(), 150);
        }, duration);
    };

    // Función para mostrar mensajes de carga
    window.showLoading = function(elementId, show = true) {
        const element = document.getElementById(elementId);
        if (!element) return;
        
        if (show) {
            const originalText = element.innerHTML;
            element.dataset.originalText = originalText;
            element.disabled = true;
            element.innerHTML = `
                <span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                Cargando...
            `;
        } else {
            element.disabled = false;
            element.innerHTML = element.dataset.originalText || 'Guardar';
        }
    };

    // ==========================
    // 5. MEJORAS DE UX
    // ==========================
    
    // Tabla con hover effect
    const tables = document.querySelectorAll('.table');
    tables.forEach(table => {
        table.addEventListener('mouseover', function(e) {
            const row = e.target.closest('tr');
            if (row) {
                row.style.backgroundColor = '#f8f9fa';
                row.style.transition = 'background-color 0.3s ease';
            }
        });
        
        table.addEventListener('mouseout', function(e) {
            const row = e.target.closest('tr');
            if (row) {
                row.style.backgroundColor = '';
            }
        });
    });
    
    // Filtro rápido en tablas (opcional)
    // Se puede implementar un filtro en el futuro
    
    console.log('Sistema CRUD MVC inicializado correctamente');
});
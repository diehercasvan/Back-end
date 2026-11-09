<?php
require_once __DIR__ . '/../models/Role.php';

class RoleController {
    private $roleModel;

    public function __construct() {
        $this->roleModel = new Role();
    }

    // LISTAR ROLES
    public function index() {
        $roles = $this->roleModel->getAll();
        require_once __DIR__ . '/../views/roles/index.php';
    }

    // MOSTRAR FORMULARIO DE CREACIÓN
    public function create() {
        require_once __DIR__ . '/../views/roles/create.php';
    }

    // GUARDAR ROL
    public function store() {
        if ($_SERVER['REQUEST_METHOD'] === 'POST') {
            // Validar datos
            if (empty($_POST['name']) || strlen($_POST['name']) < 3) {
                header('Location: index.php?controller=role&action=create&error=El nombre debe tener al menos 3 caracteres');
                exit;
            }
            
            $data = [
                'name' => $_POST['name'],
                'description' => $_POST['description'] ?? '',
                'is_active' => isset($_POST['is_active']) ? 1 : 0
            ];
            
            if ($this->roleModel->create($data)) {
                header('Location: index.php?controller=role&action=index&success=1');
            } else {
                header('Location: index.php?controller=role&action=create&error=1');
            }
        }
    }

    // MOSTRAR FORMULARIO DE EDICIÓN
    public function edit() {
        $id = isset($_GET['id']) ? (int)$_GET['id'] : 0;
        
        if ($id <= 0) {
            header('Location: index.php?controller=role&action=index&error=1');
            exit;
        }
        
        $role = $this->roleModel->getById($id);
        
        if (!$role) {
            header('Location: index.php?controller=role&action=index&error=1');
            exit;
        }
        
        require_once __DIR__ . '/../views/roles/edit.php';
    }

    // ACTUALIZAR ROL
    public function update() {
        if ($_SERVER['REQUEST_METHOD'] === 'POST') {
            $id = isset($_POST['id']) ? (int)$_POST['id'] : 0;
            
            if ($id <= 0) {
                header('Location: index.php?controller=role&action=index&error=1');
                exit;
            }
            
            // Validar datos
            if (empty($_POST['name']) || strlen($_POST['name']) < 3) {
                header('Location: index.php?controller=role&action=edit&id=' . $id . '&error=El nombre debe tener al menos 3 caracteres');
                exit;
            }
            
            $data = [
                'name' => $_POST['name'],
                'description' => $_POST['description'] ?? '',
                'is_active' => isset($_POST['is_active']) ? 1 : 0
            ];
            
            if ($this->roleModel->update($id, $data)) {
                header('Location: index.php?controller=role&action=index&success=1');
            } else {
                header('Location: index.php?controller=role&action=edit&id=' . $id . '&error=1');
            }
        }
    }

    // ELIMINAR ROL
    public function delete() {
        $id = isset($_GET['id']) ? (int)$_GET['id'] : 0;
        
        if ($id <= 0) {
            header('Location: index.php?controller=role&action=index&error=1');
            exit;
        }
        
        if ($this->roleModel->delete($id)) {
            header('Location: index.php?controller=role&action=index&success=1');
        } else {
            header('Location: index.php?controller=role&action=index&error=1');
        }
    }
}
?>
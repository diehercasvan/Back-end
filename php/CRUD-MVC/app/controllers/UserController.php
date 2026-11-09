<?php
require_once __DIR__ . '/../models/User.php';

class UserController {
    private $userModel;

    public function __construct() {
        $this->userModel = new User();
    }

    // LISTAR USUARIOS
    public function index() {
        $users = $this->userModel->getAll();
        require_once __DIR__ . '/../views/users/index.php';
    }

    // MOSTRAR FORMULARIO DE CREACIÓN
    public function create() {
        $statuses = $this->userModel->getStatuses();
        require_once __DIR__ . '/../views/users/create.php';
    }

    // GUARDAR NUEVO USUARIO
    public function store() {
        if ($_SERVER['REQUEST_METHOD'] === 'POST') {
            // Validar datos
            $errors = [];
            
            if (empty($_POST['username']) || strlen($_POST['username']) < 3) {
                $errors[] = 'El usuario debe tener al menos 3 caracteres';
            }
            
            if (empty($_POST['email']) || !filter_var($_POST['email'], FILTER_VALIDATE_EMAIL)) {
                $errors[] = 'Email inválido';
            }
            
            if (empty($_POST['password']) || strlen($_POST['password']) < 6) {
                $errors[] = 'La contraseña debe tener al menos 6 caracteres';
            }
            
            if (empty($_POST['status_id'])) {
                $errors[] = 'Debe seleccionar un estado';
            }
            
            if (!empty($errors)) {
                // Guardar errores en sesión o enviar por URL
                $errorMsg = implode('; ', $errors);
                header('Location: index.php?controller=user&action=create&error=' . urlencode($errorMsg));
                exit;
            }

            // Preparar datos
            $data = [
                'username' => $_POST['username'],
                'email' => $_POST['email'],
                'password_hash' => password_hash($_POST['password'], PASSWORD_DEFAULT),
                'status_id' => $_POST['status_id']
            ];
            
            // Guardar
            if ($this->userModel->create($data)) {
                header('Location: index.php?controller=user&action=index&success=1');
            } else {
                header('Location: index.php?controller=user&action=create&error=1');
            }
        }
    }

    // MOSTRAR FORMULARIO DE EDICIÓN
    public function edit() {
        $id = isset($_GET['id']) ? (int)$_GET['id'] : 0;
        
        if ($id <= 0) {
            header('Location: index.php?controller=user&action=index&error=1');
            exit;
        }
        
        $user = $this->userModel->getById($id);
        
        if (!$user) {
            header('Location: index.php?controller=user&action=index&error=1');
            exit;
        }
        
        $statuses = $this->userModel->getStatuses();
        require_once __DIR__ . '/../views/users/edit.php';
    }

    // ACTUALIZAR USUARIO
    public function update() {
        if ($_SERVER['REQUEST_METHOD'] === 'POST') {
            $id = isset($_POST['id']) ? (int)$_POST['id'] : 0;
            
            if ($id <= 0) {
                header('Location: index.php?controller=user&action=index&error=1');
                exit;
            }
            
            // Validar datos
            $errors = [];
            
            if (empty($_POST['username']) || strlen($_POST['username']) < 3) {
                $errors[] = 'El usuario debe tener al menos 3 caracteres';
            }
            
            if (empty($_POST['email']) || !filter_var($_POST['email'], FILTER_VALIDATE_EMAIL)) {
                $errors[] = 'Email inválido';
            }
            
            if (empty($_POST['status_id'])) {
                $errors[] = 'Debe seleccionar un estado';
            }
            
            if (!empty($errors)) {
                $errorMsg = implode('; ', $errors);
                header('Location: index.php?controller=user&action=edit&id=' . $id . '&error=' . urlencode($errorMsg));
                exit;
            }

            // Preparar datos
            $data = [
                'username' => $_POST['username'],
                'email' => $_POST['email'],
                'status_id' => $_POST['status_id']
            ];
            
            // Actualizar
            if ($this->userModel->update($id, $data)) {
                header('Location: index.php?controller=user&action=index&success=1');
            } else {
                header('Location: index.php?controller=user&action=edit&id=' . $id . '&error=1');
            }
        }
    }

    // ELIMINAR USUARIO
    public function delete() {
        $id = isset($_GET['id']) ? (int)$_GET['id'] : 0;
        
        if ($id <= 0) {
            header('Location: index.php?controller=user&action=index&error=1');
            exit;
        }
        
        if ($this->userModel->delete($id)) {
            header('Location: index.php?controller=user&action=index&success=1');
        } else {
            header('Location: index.php?controller=user&action=index&error=1');
        }
    }
}
?>
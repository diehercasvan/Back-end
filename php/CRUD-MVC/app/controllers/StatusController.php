<?php
require_once __DIR__ . '/../models/Status.php';

class StatusController {
    private $statusModel;

    public function __construct() {
        $this->statusModel = new Status();
    }

    // LISTAR ESTADOS
    public function index() {
        $statuses = $this->statusModel->getAll();
        require_once __DIR__ . '/../views/status/index.php';
    }

    // MOSTRAR FORMULARIO DE CREACIÓN
    public function create() {
        require_once __DIR__ . '/../views/status/create.php';
    }

    // GUARDAR ESTADO
    public function store() {
        if ($_SERVER['REQUEST_METHOD'] === 'POST') {
            // Validar datos
            if (empty($_POST['name']) || strlen($_POST['name']) < 3) {
                header('Location: index.php?controller=status&action=create&error=El nombre debe tener al menos 3 caracteres');
                exit;
            }
            
            $data = [
                'name' => $_POST['name'],
                'description' => $_POST['description'] ?? ''
            ];
            
            if ($this->statusModel->create($data)) {
                header('Location: index.php?controller=status&action=index&success=1');
            } else {
                header('Location: index.php?controller=status&action=create&error=1');
            }
        }
    }

    // MOSTRAR FORMULARIO DE EDICIÓN
    public function edit() {
        $id = isset($_GET['id']) ? (int)$_GET['id'] : 0;
        
        if ($id <= 0) {
            header('Location: index.php?controller=status&action=index&error=1');
            exit;
        }
        
        $status = $this->statusModel->getById($id);
        
        if (!$status) {
            header('Location: index.php?controller=status&action=index&error=1');
            exit;
        }
        
        require_once __DIR__ . '/../views/status/edit.php';
    }

    // ACTUALIZAR ESTADO
    public function update() {
        if ($_SERVER['REQUEST_METHOD'] === 'POST') {
            $id = isset($_POST['id']) ? (int)$_POST['id'] : 0;
            
            if ($id <= 0) {
                header('Location: index.php?controller=status&action=index&error=1');
                exit;
            }
            
            // Validar datos
            if (empty($_POST['name']) || strlen($_POST['name']) < 3) {
                header('Location: index.php?controller=status&action=edit&id=' . $id . '&error=El nombre debe tener al menos 3 caracteres');
                exit;
            }
            
            $data = [
                'name' => $_POST['name'],
                'description' => $_POST['description'] ?? ''
            ];
            
            if ($this->statusModel->update($id, $data)) {
                header('Location: index.php?controller=status&action=index&success=1');
            } else {
                header('Location: index.php?controller=status&action=edit&id=' . $id . '&error=1');
            }
        }
    }

    // ELIMINAR ESTADO
    public function delete() {
        $id = isset($_GET['id']) ? (int)$_GET['id'] : 0;
        
        if ($id <= 0) {
            header('Location: index.php?controller=status&action=index&error=1');
            exit;
        }
        
        if ($this->statusModel->delete($id)) {
            header('Location: index.php?controller=status&action=index&success=1');
        } else {
            header('Location: index.php?controller=status&action=index&error=1');
        }
    }
}
?>
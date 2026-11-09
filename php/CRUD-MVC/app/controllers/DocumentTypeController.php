<?php
require_once __DIR__ . '/../models/DocumentType.php';

class DocumentTypeController {
    private $documentTypeModel;

    public function __construct() {
        $this->documentTypeModel = new DocumentType();
    }

    // LISTAR ESTADOS
    public function index() {
        $documentTypes = $this->documentTypeModel->getAll();
        require_once __DIR__ . '/../views/documentType/index.php';
    }

    // MOSTRAR FORMULARIO DE CREACIÓN
    public function create() {
        require_once __DIR__ . '/../views/documentType/create.php';
    }

    // GUARDAR TIPO DE DOCUMENTO
    public function store() {
        if ($_SERVER['REQUEST_METHOD'] === 'POST') {
            // Validar datos
            if (empty($_POST['name']) || strlen($_POST['name']) < 2) {
                header('Location: index.php?controller=documentType&action=create&error=El nombre debe tener al menos 2 caracteres');
                exit;
            }
            
            $data = [
                'name' => $_POST['name'],
                'description' => $_POST['description'] ?? ''
            ];
            
            if ($this->documentTypeModel->create($data)) {
                header('Location: index.php?controller=documentType&action=index&success=1');
            } else {
                header('Location: index.php?controller=documentType&action=create&error=1');
            }
        }
    }

    // MOSTRAR FORMULARIO DE EDICIÓN
    public function edit() {
        $id = isset($_GET['id']) ? (int)$_GET['id'] : 0;
        
        if ($id <= 0) {
            header('Location: index.php?controller=documentType&action=index&error=1');
            exit;
        }
        
        $documentType = $this->documentTypeModel->getById($id);
        
        if (!$documentType) {
            header('Location: index.php?controller=documentType&action=index&error=1');
            exit;
        }
        
        require_once __DIR__ . '/../views/documentType/edit.php';
    }

    // ACTUALIZAR TIPO DE DOCUMENTO
    public function update() {
        if ($_SERVER['REQUEST_METHOD'] === 'POST') {
            $id = isset($_POST['id']) ? (int)$_POST['id'] : 0;
            
            if ($id <= 0) {
                header('Location: index.php?controller=documentType&action=index&error=1');
                exit;
            }
            
            // Validar datos
            if (empty($_POST['name']) || strlen($_POST['name']) < 2) {
                header('Location: index.php?controller=documentType&action=edit&id=' . $id . '&error=El nombre debe tener al menos 2 caracteres');
                exit;
            }
            
            $data = [
                'name' => $_POST['name'],
                'description' => $_POST['description'] ?? ''
            ];
            
            if ($this->documentTypeModel->update($id, $data)) {
                header('Location: index.php?controller=documentType&action=index&success=1');
            } else {
                header('Location: index.php?controller=documentType&action=edit&id=' . $id . '&error=1');
            }
        }
    }

    // ELIMINAR TIPO DE DOCUMENTO
    public function delete() {
        $id = isset($_GET['id']) ? (int)$_GET['id'] : 0;
        
        if ($id <= 0) {
            header('Location: index.php?controller=documentType&action=index&error=1');
            exit;
        }
        
        if ($this->documentTypeModel->delete($id)) {
            header('Location: index.php?controller=documentType&action=index&success=1');
        } else {
            header('Location: index.php?controller=documentType&action=index&error=1');
        }
    }
}
?>
<?php
require_once __DIR__ . '/../config/database.php';

class Role {
    private $conn;
    private $table = "role";

    public function __construct() {
        $database = new Database();
        $this->conn = $database->getConnection();
    }

    // OBTENER TODOS LOS ROLES
    public function getAll() {
        $query = "SELECT * FROM " . $this->table . " ORDER BY id DESC";
        $stmt = $this->conn->prepare($query);
        $stmt->execute();
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    // OBTENER ROL POR ID
    public function getById($id) {
        $query = "SELECT * FROM " . $this->table . " WHERE id = :id";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':id', $id);
        $stmt->execute();
        return $stmt->fetch(PDO::FETCH_ASSOC);
    }

    // CREAR ROL
    public function create($data) {
        $query = "INSERT INTO " . $this->table . " 
                  (name, description, is_active) 
                  VALUES (:name, :description, :is_active)";
        $stmt = $this->conn->prepare($query);
        return $stmt->execute($data);
    }

    // ACTUALIZAR ROL
    public function update($id, $data) {
        $query = "UPDATE " . $this->table . " 
                  SET name = :name, description = :description, is_active = :is_active 
                  WHERE id = :id";
        $data['id'] = $id;
        $stmt = $this->conn->prepare($query);
        return $stmt->execute($data);
    }

    // ELIMINAR ROL
    public function delete($id) {
        $query = "DELETE FROM " . $this->table . " WHERE id = :id";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':id', $id);
        return $stmt->execute();
    }
}
?>
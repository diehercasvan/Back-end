<?php
require_once __DIR__ . '/../config/database.php';

class User {
    private $conn;
    private $table = "user";

    // Propiedades del modelo
    public $id;
    public $username;
    public $email;
    public $password_hash;
    public $status_id;
    public $last_login;
    public $created_at;
    public $updated_at;

    // Constructor: Inicializa la conexión
    public function __construct() {
        $database = new Database();
        $this->conn = $database->getConnection();
    }

    // Obtener todos los usuarios
    public function getAll() {
        $query = "SELECT u.*, us.name as status_name 
                  FROM " . $this->table . " u 
                  INNER JOIN user_status us ON u.status_id = us.id 
                  ORDER BY u.id DESC";
        $stmt = $this->conn->prepare($query);
        $stmt->execute();
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    // Obtener usuario por ID
    public function getById($id) {
        $query = "SELECT u.*, us.name as status_name 
                  FROM " . $this->table . " u 
                  INNER JOIN user_status us ON u.status_id = us.id 
                  WHERE u.id = :id";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':id', $id);
        $stmt->execute();
        return $stmt->fetch(PDO::FETCH_ASSOC);
    }

    // Crear nuevo usuario
    public function create($data) {
        $query = "INSERT INTO " . $this->table . " 
                  (username, email, password_hash, status_id) 
                  VALUES (:username, :email, :password_hash, :status_id)";
        $stmt = $this->conn->prepare($query);
        return $stmt->execute($data);
    }

    // Actualizar usuario
    public function update($id, $data) {
        $query = "UPDATE " . $this->table . " 
                  SET username = :username, email = :email, status_id = :status_id 
                  WHERE id = :id";
        $data['id'] = $id;
        $stmt = $this->conn->prepare($query);
        return $stmt->execute($data);
    }

    // Eliminar usuario
    public function delete($id) {
        $query = "DELETE FROM " . $this->table . " WHERE id = :id";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':id', $id);
        return $stmt->execute();
    }

    // Obtener todos los estados
    public function getStatuses() {
        $query = "SELECT * FROM user_status ORDER BY id";
        $stmt = $this->conn->prepare($query);
        $stmt->execute();
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }
}
?>
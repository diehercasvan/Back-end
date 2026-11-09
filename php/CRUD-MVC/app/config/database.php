<?php
class Database {
    private $host = "localhost";
    private $db_name = "crud_node";
    private $username = "root";
    private $password = "";
    public $conn;

    public function getConnection() {
        $this->conn = null;
        try {
            // Intentar conexión
            $this->conn = new PDO(
                "mysql:host=" . $this->host . ";dbname=" . $this->db_name . ";charset=utf8",
                $this->username,
                $this->password
            );
            
            // Configurar modo de errores
            $this->conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
            
            // Configurar charset
            $this->conn->exec("SET NAMES utf8");
            
            return $this->conn;
            
        } catch(PDOException $exception) {
            // Mostrar error detallado para depuración
            echo "❌ Error de conexión a la base de datos:<br>";
            echo "Mensaje: " . $exception->getMessage() . "<br>";
            echo "Código: " . $exception->getCode() . "<br>";
            
            // Pistas para solucionar
            echo "<hr>";
            echo "<h4>📝 Posibles soluciones:</h4>";
            echo "<ul>";
            echo "<li>Verifica que MySQL esté corriendo</li>";
            echo "<li>Revisa las credenciales en database.php</li>";
            echo "<li>Asegúrate de que la base de datos 'crud_node' exista</li>";
            echo "<li>Comprueba que el usuario tenga permisos</li>";
            echo "</ul>";
            
            die();
        }
    }
}
?>
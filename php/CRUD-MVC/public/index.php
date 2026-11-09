<?php
// Autoloader básico
spl_autoload_register(function ($class) {
    $base_dir = __DIR__ . '/../app/';
    $file = $base_dir . str_replace('\\', '/', $class) . '.php';
    if (file_exists($file)) {
        require $file;
    }
});

// Router básico
$controller = isset($_GET['controller']) ? $_GET['controller'] : 'user';
$action = isset($_GET['action']) ? $_GET['action'] : 'index';

// Mapeo de controladores
$controllerMap = [
    'user' => 'UserController',
    'role' => 'RoleController',
    'status' => 'StatusController',
    'documentType' => 'DocumentTypeController',

];

// Verificar y cargar controlador
if (!isset($controllerMap[$controller])) {
    die('Controlador no encontrado');
}

$controllerName = $controllerMap[$controller];
$controllerFile = __DIR__ . '/../app/controllers/' . $controllerName . '.php';

if (!file_exists($controllerFile)) {
    die('Controlador no encontrado: ' . $controllerName);
}

require_once $controllerFile;

// Instanciar y ejecutar
if (!class_exists($controllerName)) {
    die('Clase controlador no encontrada: ' . $controllerName);
}

$controllerInstance = new $controllerName();

if (!method_exists($controllerInstance, $action)) {
    die('Acción no encontrada: ' . $action);
}

$controllerInstance->$action();

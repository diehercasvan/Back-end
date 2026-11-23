<?php

namespace App\Controllers;

use CodeIgniter\Controller;
use App\Models\ModuleRoleUserModel;

class TestPermisos extends Controller
{
    public function index()
    {
        $model = new ModuleRoleUserModel();
        
        // Simulamos consultar los permisos del usuario ID 1 (Admin)
        // En el futuro esto vendrá del token JWT
        $userId = 1; 

        // Hacemos un JOIN para traer el nombre del módulo y el nombre del permiso
        $permisos = $model->select('module.name as modulo, permission.name as permiso')
                          ->join('module', 'module.id = module_role_user.module_id')
                          ->join('permission', 'permission.id = module_role_user.permission_id')
                          ->where('module_role_user.user_id', $userId)
                          ->findAll();

        return $this->response->setJSON($permisos);
    }
}
<?php

namespace App\Controllers;

use App\Models\ModuleModel;
use App\Models\ProfileModel;
use App\Models\UserRoleModel;

class Home extends BaseController
{
    public function index()
    {
        $userId = (int)session()->get('user_id');

        $moduleModel   = new ModuleModel();
        $profileModel  = new ProfileModel();
        $userRoleModel = new UserRoleModel();

        // Cargar módulos autorizados
        $modules = $moduleModel->getModulesByUser($userId);
        
        // Cargar datos del perfil
        $profile = $profileModel->getProfileByUserId($userId);

        // Cargar roles activos
        $roles = $userRoleModel->getUserActiveRoles($userId);

        $data = [
            'username' => session()->get('username'),
            'profile'  => $profile,
            'roles'    => $roles,
            'modules'  => $modules
        ];

        return view('dashboard/home', $data);
    }
}

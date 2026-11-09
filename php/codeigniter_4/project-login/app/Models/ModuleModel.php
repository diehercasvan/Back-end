<?php

namespace App\Models;

use CodeIgniter\Model;

class ModuleModel extends Model
{
    protected $table = 'module';

    /**
     * Devuelve la lista de módulos permitidos para el usuario según sus roles activos.
     */
    public function getModulesByUser(int $userId): array
    {
        return $this->select('module.id, module.name, module.route, module.icon, MAX(module_role.can_create) as can_create, MAX(module_role.can_edit) as can_edit, MAX(module_role.can_delete) as can_delete')
                    ->join('module_role', 'module_role.module_fk = module.id')
                    ->join('user_role', 'user_role.role_id = module_role.role_user_fk')
                    ->where('user_role.user_id', $userId)
                    ->where('user_role.status_id', 1)
                    ->where('module.is_active', 1)
                    ->where('module_role.can_view', 1)
                    ->groupBy('module.id')
                    ->orderBy('module.id', 'ASC')
                    ->findAll();
    }
}
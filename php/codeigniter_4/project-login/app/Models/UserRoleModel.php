<?php

namespace App\Models;

use CodeIgniter\Model;

class UserRoleModel extends Model
{
  protected $table         = 'user_role';
  protected $primaryKey    = 'id';
  protected $allowedFields = ['user_id', 'role_id', 'status_id'];
  protected $useTimestamps = true;

  public function getUserActiveRoles(int $userId): array
  {
    return $this->select('role.id as role_id, role.name as role_name')
      ->join('role', 'role.id = user_role.role_id')
      ->where('user_role.user_id', $userId)
      ->where('user_role.status_id', 1)
      ->where('role.is_active', 1)
      ->findAll();
  }
}

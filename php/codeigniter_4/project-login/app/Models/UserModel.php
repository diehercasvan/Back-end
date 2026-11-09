<?php

namespace App\Models;

use CodeIgniter\Model;

class UserModel extends Model
{
    protected $table            = 'user';
    protected $primaryKey       = 'id';
    protected $useAutoIncrement = true;
    protected $returnType       = 'array';
    protected $useSoftDeletes   = false;
    protected $protectFields    = true;
    protected $allowedFields    = ['username', 'email', 'password_hash', 'status_id', 'last_login'];

    // Timestamps automáticos gestionados por CodeIgniter
    protected $useTimestamps = true;
    protected $dateFormat    = 'datetime';
    protected $createdField  = 'created_at';
    protected $updatedField  = 'updated_at';

    /**
     * Busca un usuario por nombre de usuario o por email incluyendo el nombre de su estado.
     */
    public function getUserByCredential(string $credential): ?array
    {
        return $this->select('user.*, user_status.name as status_name')
                    ->join('user_status', 'user_status.id = user.status_id')
                    ->groupStart()
                        ->where('user.username', $credential)
                        ->orWhere('user.email', $credential)
                    ->groupEnd()
                    ->first();
    }
}
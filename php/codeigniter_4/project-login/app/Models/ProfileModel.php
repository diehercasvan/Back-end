<?php

namespace App\Models;

use CodeIgniter\Model;

class ProfileModel extends Model
{
    protected $table            = 'profile';
    protected $primaryKey       = 'id';
    protected $allowedFields    = [
        'user_id', 'first_name', 'last_name', 'address', 
        'phone', 'document_type_id', 'document_number', 
        'photo_url', 'birth_date'
    ];
    protected $useTimestamps    = true;

    public function getProfileByUserId(int $userId): ?array
    {
        return $this->select('profile.*, document_type.name as doc_type_name')
                    ->join('document_type', 'document_type.id = profile.document_type_id')
                    ->where('profile.user_id', $userId)
                    ->first();
    }
}

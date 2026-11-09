<?php

namespace App\Controllers;

use App\Models\UserModel;

class Auth extends BaseController
{
  public function index()
  {
    if (session()->get('logged_in')) {
      return redirect()->to('/home');
    }
    return view('auth/login');
  }

  public function processLogin()
  {
    $session    = session();
    $userModel  = new UserModel();

    $credential = trim($this->request->getPost('credential'));
    $password   = trim($this->request->getPost('password'));

    if (empty($credential) || empty($password)) {
      return redirect()->back()->with('error', 'Debe ingresar ambos campos.')->withInput();
    }

    // Consultar el usuario en la base de datos
    $user = $userModel->getUserByCredential($credential);

    if ($user) {
      // Verificar hash almacenado en password_hash
      if (password_verify($password, $user['password_hash'])) {

        // Verificar que el usuario esté en estado Activo (id = 1)
        if ((int)$user['status_id'] !== 1) {
          return redirect()->back()->with('error', 'Su cuenta se encuentra: ' . $user['status_name']);
        }

        // Registrar timestamp de último ingreso
        $userModel->update($user['id'], [
          'last_login' => date('Y-m-d H:i:s')
        ]);

        // Guardar información relevante en la sesión
        $sessionData = [
          'user_id'   => (int)$user['id'],
          'username'  => $user['username'],
          'email'     => $user['email'],
          'logged_in' => true
        ];

        $session->set($sessionData);

        return redirect()->to('/home')->with('success', 'Bienvenido al sistema.');
      }
    }

    return redirect()->back()->with('error', 'Credenciales inválidas. Intente nuevamente.');
  }

  public function logout()
  {
    session()->destroy();
    return redirect()->to('/login')->with('success', 'Sesión cerrada correctamente.');
  }
  public function register()
  {
    $docTypeModel = new \App\Models\DocumentTypeModel();
    $data['doc_types'] = $docTypeModel->findAll();

    return view('auth/register', $data);
  }

  public function processRegister()
  {
    $rules = [
      'username'        => 'required|alpha_numeric_space|min_length[3]|is_unique[user.username]',
      'email'           => 'required|valid_email|is_unique[user.email]',
      'password'        => 'required|min_length[6]',
      'first_name'      => 'required|string',
      'last_name'       => 'required|string',
      'document_type'   => 'required|integer|is_not_unique[document_type.id]',
      'document_number' => 'required|alphanumeric',
      'avatar'          => 'is_image[avatar]|max_size[avatar,2048]|mime_in[avatar,image/jpg,image/jpeg,image/png]'
    ];

    if (!$this->validate($rules)) {
      return redirect()->back()->withInput()->with('errors', $this->validator->getErrors());
    }

    $avatarFile = $this->request->getFile('avatar');
    $avatarName = 'default_avatar.png';

    if ($avatarFile && $avatarFile->isValid() && !$avatarFile->hasMoved()) {
      $avatarName = $avatarFile->getRandomName();
      $avatarFile->move(FCPATH . 'uploads/avatars', $avatarName);
    }

    $db = \Config\Database::connect();
    $db->transStart(); // Iniciar Transacción SQL

    $userModel    = new \App\Models\UserModel();
    $profileModel = new \App\Models\ProfileModel();
    $userRoleModel = new \App\Models\UserRoleModel();

    // 1. Insertar en tabla user
    $userId = $userModel->insert([
      'username'      => $this->request->getPost('username'),
      'email'         => $this->request->getPost('email'),
      'password_hash' => password_hash($this->request->getPost('password'), PASSWORD_BCRYPT),
      'status_id'     => 1
    ], true);

    // 2. Insertar en tabla profile
    $profileModel->insert([
      'user_id'          => $userId,
      'first_name'       => $this->request->getPost('first_name'),
      'last_name'        => $this->request->getPost('last_name'),
      'phone'            => $this->request->getPost('phone'),
      'document_type_id' => $this->request->getPost('document_type'),
      'document_number' => $this->request->getPost('document_number'),
      'photo_url'        => $avatarName
    ]);

    // 3. Asignar rol por defecto 'Usuario' (id = 3) en user_role
    $userRoleModel->insert([
      'user_id'   => $userId,
      'role_id'   => 3,
      'status_id' => 1
    ]);

    $db->transComplete(); // Confirmar o revertir según resultado

    if ($db->transStatus() === false) {
      return redirect()->back()->withInput()->with('error', 'No se pudo completar el registro.');
    }

    return redirect()->to('/login')->with('success', 'Cuenta creada con éxito. Inicie sesión.');
  }
}

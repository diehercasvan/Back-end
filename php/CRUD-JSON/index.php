<!DOCTYPE html>
<html lang="en">

<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Lista de Usuario</title>
</head>

<body>
  <h1>Lista de Usuarios</h1>

  <form method="POST" id="form_user" onsubmit="sendDataForm(this,event)" >
    <label for="user_user">Usuario</label>
    <input type="text" id="user_user" name="user_user" >
    <label for="user_email">Correo</label>
    <input type="email" id="user_email" name="user_email" >
    <label for="user_password">Contraseña</label>
    <input type="password" id="user_password" name="user_password" required>

    <label for="user_status">Seleccionar estado</label>
    <select id="user_status" name="user_status" required>
      <option>Activo</option>
      <option>Inactivo</option>
    </select>
    <label for="role">Seleccionar Rol</label>

    <select id="role" name="role" required>
      <option>Admin</option>
      <option>User</option>

    </select>

    <button  >Enviar</button>
  </form>
  <script src="assets/js/main.js"></script>
</body>

</html>
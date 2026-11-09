

function sendDataForm(objForm, e) {

  e.preventDefault();

  if (validateForm(objForm)) {
    alert("Datos Ok");
  } else {
    alert("Valide Datos");
  }

}


function validateForm(objForm) {

  const objFormUser = objForm;
  const alertsValidate=['Valide la información del usuario', 'Valide la información del correo', 'Tiene una longitud mínima de 8 caracteres. Ajústelo modificando {8,} Al menos una letra mayúscula en inglés. Puedes liminar esta condición eliminando (?=.*?[AZ]) Al menos una letra minúscula en inglés. Puedes eliminar esta condición eliminando (?=.*?[az]) Al menos un dígito. Puedes eliminar esta condición eliminando (?=.*?[0-9]) Al menos un carácter especial. Puedes eliminar esta condición eliminando (?=.*?[#?!@$%^&*-])'];
  const getInput = objFormUser.querySelectorAll("input");
  const getSelect = objFormUser.querySelectorAll("select");
  var emailRegex = /^(?=.*?[A-Z])(?=.*?[a-z])(?=.*?[0-9])(?=.*?[#?!@$%^&*-]).{8,}$/;

  let result = true;

  for (let i = 0; i < getInput.length; i++) {

    if (getInput[i].value == " " || getInput[i].value == null || getInput[i].value.length == 0) {
      getInput[i].focus();

      result = false;
      break;

    }
    if (getInput[i].type = "email") {
      
      if (!emailRegex.test(getInput[i].value)) {
        alert(alertsValidate[1]);
      } 

    }
     if (getInput[i].type = "password") {
      
      if (!emailRegex.test(getInput[i].value)) {
        alert(alertsValidate[2]);
      } 

    }
  }

  return result;

}
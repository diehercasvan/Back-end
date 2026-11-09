<?php
// ==========================================
// TALLER PRÁCTICO: CALCULADORA BÁSICA EN PHP
// ==========================================

// 1. Inicialización de variables para almacenar datos y resultados
$num1 = '';
$num2 = '';
$operacion = 'suma';
$resultado = null;
$error = null;

// 2. Verificamos si los datos fueron enviados mediante el método POST
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    
    // Capturamos y limpiamos los valores recibidos
    $num1 = filter_input(INPUT_POST, 'num1', FILTER_VALIDATE_FLOAT);
    $num2 = filter_input(INPUT_POST, 'num2', FILTER_VALIDATE_FLOAT);
    $operacion = $_POST['operacion'] ?? 'suma';

    // 3. Validamos que ambos números sean válidos
    if ($num1 === false || $num1 === null || $num2 === false || $num2 === null) {
        $error = "Por favor, ingresa números válidos en ambos campos.";
    } else {
        // 4. Ejecutamos la operación seleccionada usando la estructura match (PHP 8+)
        switch ($operacion) {
            case 'suma':
                $resultado = $num1 + $num2;
                $simbolo = '+';
                break;
            case 'resta':
                $resultado = $num1 - $num2;
                $simbolo = '-';
                break;
            case 'multiplicacion':
                $resultado = $num1 * $num2;
                $simbolo = '×';
                break;
            case 'division':
                if ($num2 == 0) {
                    $error = "Error: No es posible dividir entre cero.";
                } else {
                    $resultado = $num1 / $num2;
                    $simbolo = '÷';
                }
                break;
            case 'potencia':
                $resultado = pow($num1, $num2);
                $simbolo = '^';
                break;
            default:
                $error = "Operación no válida seleccionada.";
        }
    }
}
?>

<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Calculadora Básica en PHP</title>
    <!-- Fuentes de Google -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">

    <style>
        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
        }

        body {
            font-family: 'Plus Jakarta Sans', sans-serif;
            background: linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%);
            min-height: 100vh;
            display: flex;
            justify-content: center;
            align-items: center;
            padding: 20px;
            color: #f8fafc;
        }

        .calculator-card {
            background: #ffffff;
            color: #0f172a;
            width: 100%;
            max-width: 440px;
            border-radius: 24px;
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
            padding: 32px;
        }

        .header {
            text-align: center;
            margin-bottom: 28px;
        }

        .header h1 {
            font-size: 24px;
            font-weight: 700;
            color: #0f172a;
            margin-bottom: 6px;
        }

        .header p {
            font-size: 14px;
            color: #64748b;
        }

        .form-group {
            margin-bottom: 20px;
        }

        .form-group label {
            display: block;
            font-size: 14px;
            font-weight: 600;
            color: #334155;
            margin-bottom: 8px;
        }

        .input-control {
            width: 100%;
            padding: 14px 16px;
            border: 2px solid #e2e8f0;
            border-radius: 12px;
            font-size: 16px;
            font-family: inherit;
            color: #0f172a;
            transition: all 0.2s ease;
            outline: none;
            background-color: #f8fafc;
        }

        .input-control:focus {
            border-color: #6366f1;
            background-color: #ffffff;
            box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.15);
        }

        select.input-control {
            cursor: pointer;
            appearance: none;
            background-image: url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%3c64748b' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e");
            background-repeat: no-repeat;
            background-position: right 16px center;
            background-size: 16px;
        }

        .btn-submit {
            width: 100%;
            background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
            color: #ffffff;
            border: none;
            padding: 16px;
            border-radius: 12px;
            font-size: 16px;
            font-weight: 700;
            cursor: pointer;
            transition: transform 0.1s ease, box-shadow 0.2s ease;
            margin-top: 8px;
            display: flex;
            justify-content: center;
            align-items: center;
            gap: 10px;
        }

        .btn-submit:hover {
            box-shadow: 0 10px 20px -5px rgba(79, 70, 229, 0.4);
            transform: translateY(-1px);
        }

        .btn-submit:active {
            transform: translateY(0);
        }

        .alert {
            padding: 14px 16px;
            border-radius: 12px;
            font-size: 14px;
            font-weight: 500;
            margin-top: 24px;
            display: flex;
            align-items: center;
            gap: 10px;
        }

        .alert-error {
            background-color: #fef2f2;
            color: #991b1b;
            border: 1px solid #fecaca;
        }

        .alert-success {
            background-color: #f0fdf4;
            color: #166534;
            border: 1px solid #bbf7d0;
        }

        .result-box {
            margin-top: 24px;
            padding: 20px;
            background-color: #f1f5f9;
            border-radius: 16px;
            text-align: center;
            border: 1px dashed #cbd5e1;
        }

        .result-box .label {
            font-size: 13px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            color: #64748b;
            margin-bottom: 6px;
        }

        .result-box .value {
            font-size: 32px;
            font-weight: 800;
            color: #4f46e5;
            word-break: break-all;
        }

        .expression {
            font-size: 14px;
            color: #475569;
            margin-bottom: 4px;
        }
    </style>
</head>
<body>

    <div class="calculator-card">
        <div class="header">
            <h1><i class="fa-solid fa-calculator" style="color: #6366f1;"></i> Calculadora PHP</h1>
            <p>Taller Práctico de Desarrollo Backend</p>
        </div>

        <!-- Formulario HTML procesado en el mismo archivo mediante POST -->
        <form action="" method="POST">
            <div class="form-group">
                <label for="num1">Primer Número:</label>
                <input 
                    type="number" 
                    step="any" 
                    name="num1" 
                    id="num1" 
                    class="input-control" 
                    placeholder="Ej. 15" 
                    value="<?= htmlspecialchars($num1) ?>" 
                    required
                >
            </div>

            <div class="form-group">
                <label for="operacion">Operación Matemática:</label>
                <select name="operacion" id="operacion" class="input-control">
                    <option value="suma" <?= $operacion === 'suma' ? 'selected' : '' ?>>Suma (+)</option>
                    <option value="resta" <?= $operacion === 'resta' ? 'selected' : '' ?>>Resta (-)</option>
                    <option value="multiplicacion" <?= $operacion === 'multiplicacion' ? 'selected' : '' ?>>Multiplicación (×)</option>
                    <option value="division" <?= $operacion === 'division' ? 'selected' : '' ?>>División (÷)</option>
                    <option value="potencia" <?= $operacion === 'potencia' ? 'selected' : '' ?>>Potencia (^)</option>
                </select>
            </div>

            <div class="form-group">
                <label for="num2">Segundo Número:</label>
                <input 
                    type="number" 
                    step="any" 
                    name="num2" 
                    id="num2" 
                    class="input-control" 
                    placeholder="Ej. 5" 
                    value="<?= htmlspecialchars($num2) ?>" 
                    required
                >
            </div>

            <button type="submit" class="btn-submit">
                <i class="fa-solid fa-equals"></i> Calcular Resultado
            </button>
        </form>

        <!-- Mensaje de Error (si existe) -->
        <?php if ($error !== null): ?>
            <div class="alert alert-error">
                <i class="fa-solid fa-triangle-exclamation"></i>
                <span><?= htmlspecialchars($error) ?></span>
            </div>
        <?php endif; ?>

        <!-- Resultado del Cálculo (si es válido) -->
        <?php if ($resultado !== null && $error === null): ?>
            <div class="result-box">
                <div class="label">Resultado</div>
                <div class="expression"><?= htmlspecialchars("$num1 $simbolo $num2") ?></div>
                <div class="value"><?= is_float($resultado) ? round($resultado, 4) : $resultado ?></div>
            </div>
        <?php endif; ?>
    </div>

</body>
</html>
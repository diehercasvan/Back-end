<?php
// Este archivo sirve como plantilla base para todas las vistas
require_once __DIR__ . '/../components/header.php';
require_once __DIR__ . '/../components/navbar.php';
?>

<div class="container mt-4">
    <?php echo $content ?? '<p>Contenido no disponible</p>'; ?>
</div>

<?php
require_once __DIR__ . '/../components/footer.php';
?>
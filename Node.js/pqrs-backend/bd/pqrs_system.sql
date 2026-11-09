-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Servidor: 127.0.0.1
-- Tiempo de generación: 08-11-2026 a las 07:08:25
-- Versión del servidor: 10.4.32-MariaDB
-- Versión de PHP: 8.0.30

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Base de datos: `pqrs_system`
--

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `document_type`
--

CREATE TABLE `document_type` (
  `id` int(11) NOT NULL,
  `name` varchar(50) NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `document_type`
--

INSERT INTO `document_type` (`id`, `name`, `description`, `created_at`, `updated_at`) VALUES
(1, 'CC', 'Cédula de ciudadanía', '2026-10-19 16:44:52', '2026-10-19 16:44:52'),
(2, 'TI', 'Tarjeta de identidad', '2026-10-19 16:44:52', '2026-10-19 16:44:52'),
(3, 'CE', 'Cédula de Extranjería', '2026-10-19 16:44:52', '2026-10-19 16:44:52');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `module`
--

CREATE TABLE `module` (
  `id` int(11) NOT NULL,
  `name` varchar(50) NOT NULL,
  `route` varchar(100) NOT NULL,
  `icon` varchar(50) DEFAULT NULL,
  `description` varchar(255) DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `module`
--

INSERT INTO `module` (`id`, `name`, `route`, `icon`, `description`, `is_active`, `created_at`, `updated_at`) VALUES
(1, 'Dashboard', '#/dashboard', 'bi-speedometer2', 'Panel principal', 1, '2026-10-19 16:44:53', '2026-11-06 23:50:57'),
(2, 'Usuarios', '#/users', 'bi-people', 'Gestión de usuarios', 1, '2026-10-19 16:44:53', '2026-11-06 23:50:57'),
(3, 'Roles', '#/roles', 'bi-people-fill', 'Gestión de roles', 1, '2026-10-19 16:44:53', '2026-11-06 23:50:57'),
(4, 'Perfiles', '#/profiles', 'bi-person-bounding-box', 'Gestión de perfiles', 1, '2026-10-19 16:44:53', '2026-11-06 23:50:57'),
(5, 'PQRS', '#/pqrs', 'bi-envelope-paper', 'Gestión de PQRS', 1, '2026-10-19 16:44:53', '2026-11-06 23:50:57');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `module_role_user`
--

CREATE TABLE `module_role_user` (
  `id` int(11) NOT NULL,
  `module_id` int(11) NOT NULL,
  `role_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `permission_id` int(11) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `module_role_user`
--

INSERT INTO `module_role_user` (`id`, `module_id`, `role_id`, `user_id`, `permission_id`, `created_at`, `updated_at`) VALUES
(1, 1, 1, 1, 1, '2026-10-19 16:44:53', '2026-10-19 16:44:53'),
(2, 1, 1, 1, 5, '2026-10-19 16:44:53', '2026-10-19 16:44:53'),
(3, 2, 1, 1, 1, '2026-10-19 16:44:53', '2026-10-19 16:44:53'),
(4, 2, 1, 1, 2, '2026-10-19 16:44:53', '2026-10-19 16:44:53'),
(5, 2, 1, 1, 3, '2026-10-19 16:44:53', '2026-10-19 16:44:53'),
(6, 2, 1, 1, 4, '2026-10-19 16:44:53', '2026-10-19 16:44:53'),
(7, 2, 1, 1, 6, '2026-10-19 16:44:53', '2026-10-19 16:44:53'),
(8, 3, 1, 1, 1, '2026-10-19 16:44:53', '2026-10-19 16:44:53'),
(9, 3, 1, 1, 2, '2026-10-19 16:44:53', '2026-10-19 16:44:53'),
(10, 3, 1, 1, 3, '2026-10-19 16:44:53', '2026-10-19 16:44:53'),
(11, 3, 1, 1, 4, '2026-10-19 16:44:53', '2026-10-19 16:44:53'),
(12, 4, 1, 1, 1, '2026-10-19 16:44:53', '2026-10-19 16:44:53'),
(13, 4, 1, 1, 2, '2026-10-19 16:44:53', '2026-10-19 16:44:53'),
(14, 4, 1, 1, 3, '2026-10-19 16:44:53', '2026-10-19 16:44:53'),
(15, 4, 1, 1, 4, '2026-10-19 16:44:53', '2026-10-19 16:44:53'),
(16, 5, 1, 1, 1, '2026-10-19 16:44:53', '2026-10-19 16:44:53'),
(17, 5, 1, 1, 2, '2026-10-19 16:44:53', '2026-10-19 16:44:53'),
(18, 5, 1, 1, 3, '2026-10-19 16:44:53', '2026-10-19 16:44:53'),
(19, 5, 1, 1, 4, '2026-10-19 16:44:53', '2026-10-19 16:44:53'),
(20, 5, 1, 1, 5, '2026-10-19 16:44:53', '2026-10-19 16:44:53'),
(21, 5, 1, 1, 6, '2026-10-19 16:44:53', '2026-10-19 16:44:53');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `permission`
--

CREATE TABLE `permission` (
  `id` int(11) NOT NULL,
  `name` varchar(50) NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `permission`
--

INSERT INTO `permission` (`id`, `name`, `description`, `created_at`, `updated_at`) VALUES
(1, 'view', 'Ver el módulo', '2026-10-19 16:44:53', '2026-10-19 16:44:53'),
(2, 'create', 'Crear registros', '2026-10-19 16:44:53', '2026-10-19 16:44:53'),
(3, 'edit', 'Editar registros', '2026-10-19 16:44:53', '2026-10-19 16:44:53'),
(4, 'delete', 'Eliminar registros', '2026-10-19 16:44:53', '2026-10-19 16:44:53'),
(5, 'print', 'Imprimir', '2026-10-19 16:44:53', '2026-10-19 16:44:53'),
(6, 'download', 'Descargar/Exportar', '2026-10-19 16:44:53', '2026-10-19 16:44:53');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `pqrs`
--

CREATE TABLE `pqrs` (
  `id` int(11) NOT NULL,
  `tracking_number` varchar(30) NOT NULL,
  `user_id` int(11) NOT NULL,
  `pqrs_type_id` int(11) NOT NULL,
  `pqrs_status_id` int(11) NOT NULL DEFAULT 1,
  `assigned_to` int(11) DEFAULT NULL,
  `subject` varchar(150) NOT NULL,
  `description` text NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `pqrs_response`
--

CREATE TABLE `pqrs_response` (
  `id` int(11) NOT NULL,
  `pqrs_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `message` text NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `pqrs_status`
--

CREATE TABLE `pqrs_status` (
  `id` int(11) NOT NULL,
  `name` varchar(50) NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  `color` varchar(20) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `pqrs_status`
--

INSERT INTO `pqrs_status` (`id`, `name`, `description`, `color`, `created_at`, `updated_at`) VALUES
(1, 'Radicada', NULL, 'secondary', '2026-10-25 11:15:29', '2026-10-25 11:15:29'),
(2, 'En Proceso', NULL, 'warning', '2026-10-25 11:15:29', '2026-10-25 11:15:29'),
(3, 'Resuelta', NULL, 'success', '2026-10-25 11:15:29', '2026-10-25 11:15:29'),
(4, 'Cerrada', NULL, 'dark', '2026-10-25 11:15:29', '2026-10-25 11:15:29'),
(5, 'Rechazada', NULL, 'danger', '2026-10-25 11:15:29', '2026-10-25 11:15:29');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `pqrs_type`
--

CREATE TABLE `pqrs_type` (
  `id` int(11) NOT NULL,
  `name` varchar(50) NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `pqrs_type`
--

INSERT INTO `pqrs_type` (`id`, `name`, `description`, `created_at`, `updated_at`) VALUES
(1, 'Petición', 'Solicitud de información o acción', '2026-10-25 11:14:55', '2026-10-25 11:14:55'),
(2, 'Queja', 'Manifestación de inconformidad', '2026-10-25 11:14:55', '2026-10-25 11:14:55'),
(3, 'Reclamo', 'Exigencia de un derecho o corrección', '2026-10-25 11:14:55', '2026-10-25 11:14:55'),
(4, 'Sugerencia', 'Propuesta para mejorar el servicio', '2026-10-25 11:14:55', '2026-10-25 11:14:55');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `profile`
--

CREATE TABLE `profile` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `first_name` varchar(50) NOT NULL,
  `last_name` varchar(50) NOT NULL,
  `address` varchar(255) DEFAULT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `document_type_id` int(11) NOT NULL,
  `document_number` varchar(50) NOT NULL,
  `photo_url` varchar(255) DEFAULT NULL,
  `birth_date` date DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `profile`
--

INSERT INTO `profile` (`id`, `user_id`, `first_name`, `last_name`, `address`, `phone`, `document_type_id`, `document_number`, `photo_url`, `birth_date`, `created_at`, `updated_at`) VALUES
(1, 2, 'Juan Andres', 'Pérez', 'Calle 123 #45-67', '3001234567', 1, '12345678', NULL, NULL, '2026-10-29 04:52:15', '2026-10-29 04:54:56');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `role`
--

CREATE TABLE `role` (
  `id` int(11) NOT NULL,
  `name` varchar(50) NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `role`
--

INSERT INTO `role` (`id`, `name`, `description`, `is_active`, `created_at`, `updated_at`) VALUES
(1, 'admin', 'Administrador del Sistema', 1, '2026-10-19 16:44:52', '2026-10-19 16:44:52'),
(2, 'user', 'Usuario Regular', 1, '2026-10-19 16:44:52', '2026-10-19 16:44:52'),
(3, 'manager', 'Gerente de Departamento', 1, '2026-10-19 16:44:52', '2026-10-19 16:44:52'),
(5, 'auditor', 'Rol de auditoría del 2026', 0, '2026-10-30 05:25:03', '2026-10-30 05:30:09');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `user`
--

CREATE TABLE `user` (
  `id` int(11) NOT NULL,
  `username` varchar(50) NOT NULL,
  `email` varchar(100) DEFAULT NULL,
  `password_hash` varchar(255) NOT NULL,
  `status_id` int(11) NOT NULL,
  `last_login` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `user`
--

INSERT INTO `user` (`id`, `username`, `email`, `password_hash`, `status_id`, `last_login`, `created_at`, `updated_at`) VALUES
(1, 'admin', 'admin@pqrs.com', '$2y$10$S2Xlvai0Ut8WzsglJZBqceDCtLw6B7QlTJcDR6qSJk6qA2l/7jb7C', 1, '2026-11-07 05:44:58', '2026-10-19 16:44:52', '2026-11-07 05:44:58'),
(2, 'juan', 'juan@pqrs.com', '$2y$10$e.wXq.f2Q.3Pz2Q.3Pz2Qe.wXq.f2Q.3Pz2Q.3Pz2Q.3Pz2Q$2y$10$S2Xlvai0Ut8WzsglJZBqceDCtLw6B7QlTJcDR6qSJk6qA2l/7jb7C', 1, NULL, '2026-10-29 04:52:15', '2026-11-04 16:43:13');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `user_role`
--

CREATE TABLE `user_role` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `role_id` int(11) NOT NULL,
  `status_id` int(11) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `user_role`
--

INSERT INTO `user_role` (`id`, `user_id`, `role_id`, `status_id`, `created_at`, `updated_at`) VALUES
(1, 1, 1, 1, '2026-10-19 16:44:52', '2026-10-19 16:44:52'),
(2, 2, 2, 1, '2026-10-29 04:52:15', '2026-10-29 04:52:15');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `user_status`
--

CREATE TABLE `user_status` (
  `id` int(11) NOT NULL,
  `name` varchar(50) NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `user_status`
--

INSERT INTO `user_status` (`id`, `name`, `description`, `created_at`, `updated_at`) VALUES
(1, 'active', 'Usuario activo', '2026-10-19 16:44:52', '2026-10-19 16:44:52'),
(2, 'inactive', 'Usuario inactivo', '2026-10-19 16:44:52', '2026-10-19 16:44:52'),
(3, 'suspended', 'Usuario suspendido', '2026-10-19 16:44:52', '2026-10-19 16:44:52');

--
-- Índices para tablas volcadas
--

--
-- Indices de la tabla `document_type`
--
ALTER TABLE `document_type`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `name` (`name`);

--
-- Indices de la tabla `module`
--
ALTER TABLE `module`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `name` (`name`),
  ADD UNIQUE KEY `route` (`route`);

--
-- Indices de la tabla `module_role_user`
--
ALTER TABLE `module_role_user`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_permission_assignment` (`module_id`,`role_id`,`user_id`,`permission_id`),
  ADD KEY `module_id` (`module_id`),
  ADD KEY `role_id` (`role_id`),
  ADD KEY `user_id` (`user_id`),
  ADD KEY `permission_id` (`permission_id`);

--
-- Indices de la tabla `permission`
--
ALTER TABLE `permission`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `name` (`name`);

--
-- Indices de la tabla `pqrs`
--
ALTER TABLE `pqrs`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `radicado` (`tracking_number`),
  ADD KEY `pqrs_ibfk_1` (`user_id`),
  ADD KEY `pqrs_ibfk_2` (`pqrs_type_id`),
  ADD KEY `pqrs_ibfk_3` (`pqrs_status_id`),
  ADD KEY `pqrs_ibfk_4` (`assigned_to`);

--
-- Indices de la tabla `pqrs_response`
--
ALTER TABLE `pqrs_response`
  ADD PRIMARY KEY (`id`),
  ADD KEY `pqrs_response_ibfk_1` (`pqrs_id`),
  ADD KEY `pqrs_response_ibfk_2` (`user_id`);

--
-- Indices de la tabla `pqrs_status`
--
ALTER TABLE `pqrs_status`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `name` (`name`);

--
-- Indices de la tabla `pqrs_type`
--
ALTER TABLE `pqrs_type`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `name` (`name`);

--
-- Indices de la tabla `profile`
--
ALTER TABLE `profile`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `user_id` (`user_id`),
  ADD UNIQUE KEY `document_number` (`document_number`),
  ADD KEY `document_type_id` (`document_type_id`);

--
-- Indices de la tabla `role`
--
ALTER TABLE `role`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `name` (`name`);

--
-- Indices de la tabla `user`
--
ALTER TABLE `user`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `username` (`username`),
  ADD UNIQUE KEY `email` (`email`),
  ADD KEY `status_id` (`status_id`);

--
-- Indices de la tabla `user_role`
--
ALTER TABLE `user_role`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uk_user_role` (`user_id`,`role_id`),
  ADD KEY `status_id` (`status_id`),
  ADD KEY `role_id` (`role_id`);

--
-- Indices de la tabla `user_status`
--
ALTER TABLE `user_status`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `name` (`name`);

--
-- AUTO_INCREMENT de las tablas volcadas
--

--
-- AUTO_INCREMENT de la tabla `document_type`
--
ALTER TABLE `document_type`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT de la tabla `module`
--
ALTER TABLE `module`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT de la tabla `module_role_user`
--
ALTER TABLE `module_role_user`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=22;

--
-- AUTO_INCREMENT de la tabla `permission`
--
ALTER TABLE `permission`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT de la tabla `pqrs`
--
ALTER TABLE `pqrs`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `pqrs_response`
--
ALTER TABLE `pqrs_response`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `pqrs_status`
--
ALTER TABLE `pqrs_status`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT de la tabla `pqrs_type`
--
ALTER TABLE `pqrs_type`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT de la tabla `profile`
--
ALTER TABLE `profile`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT de la tabla `role`
--
ALTER TABLE `role`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT de la tabla `user`
--
ALTER TABLE `user`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT de la tabla `user_role`
--
ALTER TABLE `user_role`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT de la tabla `user_status`
--
ALTER TABLE `user_status`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- Restricciones para tablas volcadas
--

--
-- Filtros para la tabla `module_role_user`
--
ALTER TABLE `module_role_user`
  ADD CONSTRAINT `mru_ibfk_1` FOREIGN KEY (`module_id`) REFERENCES `module` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `mru_ibfk_2` FOREIGN KEY (`role_id`) REFERENCES `role` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `mru_ibfk_3` FOREIGN KEY (`user_id`) REFERENCES `user` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `mru_ibfk_4` FOREIGN KEY (`permission_id`) REFERENCES `permission` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Filtros para la tabla `pqrs`
--
ALTER TABLE `pqrs`
  ADD CONSTRAINT `pqrs_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `user` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `pqrs_ibfk_2` FOREIGN KEY (`pqrs_type_id`) REFERENCES `pqrs_type` (`id`) ON UPDATE CASCADE,
  ADD CONSTRAINT `pqrs_ibfk_3` FOREIGN KEY (`pqrs_status_id`) REFERENCES `pqrs_status` (`id`) ON UPDATE CASCADE,
  ADD CONSTRAINT `pqrs_ibfk_4` FOREIGN KEY (`assigned_to`) REFERENCES `user` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Filtros para la tabla `pqrs_response`
--
ALTER TABLE `pqrs_response`
  ADD CONSTRAINT `pqrs_response_ibfk_1` FOREIGN KEY (`pqrs_id`) REFERENCES `pqrs` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `pqrs_response_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `user` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Filtros para la tabla `profile`
--
ALTER TABLE `profile`
  ADD CONSTRAINT `profile_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `user` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `profile_ibfk_2` FOREIGN KEY (`document_type_id`) REFERENCES `document_type` (`id`) ON UPDATE CASCADE;

--
-- Filtros para la tabla `user`
--
ALTER TABLE `user`
  ADD CONSTRAINT `user_ibfk_1` FOREIGN KEY (`status_id`) REFERENCES `user_status` (`id`) ON UPDATE CASCADE;

--
-- Filtros para la tabla `user_role`
--
ALTER TABLE `user_role`
  ADD CONSTRAINT `user_role_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `user` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `user_role_ibfk_2` FOREIGN KEY (`role_id`) REFERENCES `role` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `user_role_ibfk_3` FOREIGN KEY (`status_id`) REFERENCES `user_status` (`id`) ON UPDATE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;

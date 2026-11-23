-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Servidor: 127.0.0.1
-- Tiempo de generación: 19-11-2026 a las 00:17:08
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
CREATE DATABASE IF NOT EXISTS `pqrs_system` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;
USE `pqrs_system`;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `document_type`
--

DROP TABLE IF EXISTS `document_type`;
CREATE TABLE IF NOT EXISTS `document_type` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(50) NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Truncar tablas antes de insertar `document_type`
--

TRUNCATE TABLE `document_type`;
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

DROP TABLE IF EXISTS `module`;
CREATE TABLE IF NOT EXISTS `module` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(50) NOT NULL,
  `route` varchar(100) NOT NULL,
  `icon` varchar(50) DEFAULT NULL,
  `description` varchar(255) DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`),
  UNIQUE KEY `route` (`route`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Truncar tablas antes de insertar `module`
--

TRUNCATE TABLE `module`;
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
-- Estructura de tabla para la tabla `permission`
--

DROP TABLE IF EXISTS `permission`;
CREATE TABLE IF NOT EXISTS `permission` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(50) NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Truncar tablas antes de insertar `permission`
--

TRUNCATE TABLE `permission`;
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

DROP TABLE IF EXISTS `pqrs`;
CREATE TABLE IF NOT EXISTS `pqrs` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `tracking_number` varchar(30) NOT NULL,
  `user_id` int(11) NOT NULL,
  `pqrs_type_id` int(11) NOT NULL,
  `pqrs_status_id` int(11) NOT NULL DEFAULT 1,
  `assigned_to` int(11) DEFAULT NULL,
  `subject` varchar(150) NOT NULL,
  `description` text NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `radicado` (`tracking_number`),
  KEY `pqrs_ibfk_1` (`user_id`),
  KEY `pqrs_ibfk_2` (`pqrs_type_id`),
  KEY `pqrs_ibfk_3` (`pqrs_status_id`),
  KEY `pqrs_ibfk_4` (`assigned_to`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Truncar tablas antes de insertar `pqrs`
--

TRUNCATE TABLE `pqrs`;
-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `pqrs_response`
--

DROP TABLE IF EXISTS `pqrs_response`;
CREATE TABLE IF NOT EXISTS `pqrs_response` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `pqrs_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `message` text NOT NULL,
  `is_internal` tinyint(1) NOT NULL DEFAULT 0 COMMENT '0 = respuesta visible al ciudadano, 1 = nota interna',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `pqrs_response_ibfk_1` (`pqrs_id`),
  KEY `pqrs_response_ibfk_2` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Truncar tablas antes de insertar `pqrs_response`
--

TRUNCATE TABLE `pqrs_response`;
-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `pqrs_status`
--

DROP TABLE IF EXISTS `pqrs_status`;
CREATE TABLE IF NOT EXISTS `pqrs_status` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(50) NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  `color` varchar(20) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Truncar tablas antes de insertar `pqrs_status`
--

TRUNCATE TABLE `pqrs_status`;
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

DROP TABLE IF EXISTS `pqrs_type`;
CREATE TABLE IF NOT EXISTS `pqrs_type` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(50) NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Truncar tablas antes de insertar `pqrs_type`
--

TRUNCATE TABLE `pqrs_type`;
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

DROP TABLE IF EXISTS `profile`;
CREATE TABLE IF NOT EXISTS `profile` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
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
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `user_id` (`user_id`),
  UNIQUE KEY `document_number` (`document_number`),
  KEY `document_type_id` (`document_type_id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Truncar tablas antes de insertar `profile`
--

TRUNCATE TABLE `profile`;
--
-- Volcado de datos para la tabla `profile`
--

INSERT INTO `profile` (`id`, `user_id`, `first_name`, `last_name`, `address`, `phone`, `document_type_id`, `document_number`, `photo_url`, `birth_date`, `created_at`, `updated_at`) VALUES
(1, 2, 'Juan Andres', 'Pérez', 'Calle 123 #45-67', '3001234567', 1, '12345678', NULL, NULL, '2026-10-29 04:52:15', '2026-10-29 04:54:56');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `role`
--

DROP TABLE IF EXISTS `role`;
CREATE TABLE IF NOT EXISTS `role` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(50) NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`)
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Truncar tablas antes de insertar `role`
--

TRUNCATE TABLE `role`;
--
-- Volcado de datos para la tabla `role`
--

INSERT INTO `role` (`id`, `name`, `description`, `is_active`, `created_at`, `updated_at`) VALUES
(1, 'admin', 'Administrador del Sistema', 1, '2026-10-19 16:44:52', '2026-10-19 16:44:52'),
(2, 'user', 'Usuario Regular', 1, '2026-10-19 16:44:52', '2026-10-19 16:44:52'),
(3, 'manager', 'Gerente de Departamento', 1, '2026-10-19 16:44:52', '2026-10-19 16:44:52'),
(5, 'auditor', 'Rol de auditoría del 2026', 0, '2026-10-30 05:25:03', '2026-10-30 05:30:09'),
(6, 'tester', 'Rol de prueba (editado)', 1, '2026-11-13 09:05:55', '2026-11-13 09:06:12'),
(7, 'empleado', 'Rol de prueba', 1, '2026-11-14 00:13:41', '2026-11-14 00:13:41');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `role_module_permission`
--

DROP TABLE IF EXISTS `role_module_permission`;
CREATE TABLE IF NOT EXISTS `role_module_permission` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `role_id` int(11) NOT NULL,
  `module_id` int(11) NOT NULL,
  `permission_id` int(11) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_rmp` (`role_id`,`module_id`,`permission_id`),
  KEY `idx_rmp_role` (`role_id`),
  KEY `idx_rmp_module` (`module_id`),
  KEY `idx_rmp_permission` (`permission_id`)
) ENGINE=InnoDB AUTO_INCREMENT=36 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Truncar tablas antes de insertar `role_module_permission`
--

TRUNCATE TABLE `role_module_permission`;
--
-- Volcado de datos para la tabla `role_module_permission`
--

INSERT INTO `role_module_permission` (`id`, `role_id`, `module_id`, `permission_id`, `created_at`, `updated_at`) VALUES
(1, 1, 1, 1, '2026-11-12 20:33:53', '2026-11-12 20:33:53'),
(2, 1, 1, 5, '2026-11-12 20:33:53', '2026-11-12 20:33:53'),
(3, 1, 2, 1, '2026-11-12 20:33:53', '2026-11-12 20:33:53'),
(4, 1, 2, 2, '2026-11-12 20:33:53', '2026-11-12 20:33:53'),
(5, 1, 2, 3, '2026-11-12 20:33:53', '2026-11-12 20:33:53'),
(6, 1, 2, 4, '2026-11-12 20:33:53', '2026-11-12 20:33:53'),
(7, 1, 2, 6, '2026-11-12 20:33:53', '2026-11-12 20:33:53'),
(8, 1, 3, 1, '2026-11-12 20:33:53', '2026-11-12 20:33:53'),
(9, 1, 3, 2, '2026-11-12 20:33:53', '2026-11-12 20:33:53'),
(10, 1, 3, 3, '2026-11-12 20:33:53', '2026-11-12 20:33:53'),
(11, 1, 3, 4, '2026-11-12 20:33:53', '2026-11-12 20:33:53'),
(12, 1, 4, 1, '2026-11-12 20:33:53', '2026-11-12 20:33:53'),
(13, 1, 4, 2, '2026-11-12 20:33:53', '2026-11-12 20:33:53'),
(14, 1, 4, 3, '2026-11-12 20:33:53', '2026-11-12 20:33:53'),
(15, 1, 4, 4, '2026-11-12 20:33:53', '2026-11-12 20:33:53'),
(16, 1, 5, 1, '2026-11-12 20:33:53', '2026-11-12 20:33:53'),
(17, 1, 5, 2, '2026-11-12 20:33:53', '2026-11-12 20:33:53'),
(18, 1, 5, 3, '2026-11-12 20:33:53', '2026-11-12 20:33:53'),
(19, 1, 5, 4, '2026-11-12 20:33:53', '2026-11-12 20:33:53'),
(20, 1, 5, 5, '2026-11-12 20:33:53', '2026-11-12 20:33:53'),
(21, 1, 5, 6, '2026-11-12 20:33:53', '2026-11-12 20:33:53'),
(32, 2, 5, 2, '2026-11-12 20:35:02', '2026-11-12 20:35:02'),
(33, 2, 1, 1, '2026-11-12 20:35:02', '2026-11-12 20:35:02'),
(34, 2, 5, 1, '2026-11-12 20:35:02', '2026-11-12 20:35:02');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `user`
--

DROP TABLE IF EXISTS `user`;
CREATE TABLE IF NOT EXISTS `user` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `username` varchar(50) NOT NULL,
  `email` varchar(100) DEFAULT NULL,
  `password_hash` varchar(255) NOT NULL,
  `status_id` int(11) NOT NULL,
  `last_login` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `username` (`username`),
  UNIQUE KEY `email` (`email`),
  KEY `status_id` (`status_id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Truncar tablas antes de insertar `user`
--

TRUNCATE TABLE `user`;
--
-- Volcado de datos para la tabla `user`
--

INSERT INTO `user` (`id`, `username`, `email`, `password_hash`, `status_id`, `last_login`, `created_at`, `updated_at`) VALUES
(1, 'admin', 'admin@pqrs.com', '$2a$10$6r4ywdWv8fN8.uef1Tktc.kJXO8ZGeQfzcdCamnLbaUf4W9FcGbNe', 1, '2026-11-18 21:29:45', '2026-10-19 16:44:52', '2026-11-18 21:29:45'),
(2, 'juan', 'juan@pqrs.com', '$2a$10$6r4ywdWv8fN8.uef1Tktc.kJXO8ZGeQfzcdCamnLbaUf4W9FcGbNe', 1, '2026-11-18 15:56:48', '2026-10-29 04:52:15', '2026-11-18 15:56:48');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `user_role`
--

DROP TABLE IF EXISTS `user_role`;
CREATE TABLE IF NOT EXISTS `user_role` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `role_id` int(11) NOT NULL,
  `status_id` int(11) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_user_role` (`user_id`,`role_id`),
  KEY `status_id` (`status_id`),
  KEY `role_id` (`role_id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Truncar tablas antes de insertar `user_role`
--

TRUNCATE TABLE `user_role`;
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

DROP TABLE IF EXISTS `user_status`;
CREATE TABLE IF NOT EXISTS `user_status` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(50) NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Truncar tablas antes de insertar `user_status`
--

TRUNCATE TABLE `user_status`;
--
-- Volcado de datos para la tabla `user_status`
--

INSERT INTO `user_status` (`id`, `name`, `description`, `created_at`, `updated_at`) VALUES
(1, 'active', 'Usuario activo', '2026-10-19 16:44:52', '2026-10-19 16:44:52'),
(2, 'inactive', 'Usuario inactivo', '2026-10-19 16:44:52', '2026-10-19 16:44:52'),
(3, 'suspended', 'Usuario suspendido', '2026-10-19 16:44:52', '2026-10-19 16:44:52');

--
-- Restricciones para tablas volcadas
--

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
-- Filtros para la tabla `role_module_permission`
--
ALTER TABLE `role_module_permission`
  ADD CONSTRAINT `fk_rmp_module` FOREIGN KEY (`module_id`) REFERENCES `module` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_rmp_perm` FOREIGN KEY (`permission_id`) REFERENCES `permission` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_rmp_role` FOREIGN KEY (`role_id`) REFERENCES `role` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

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

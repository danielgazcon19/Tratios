-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Servidor: 127.0.0.1
-- Tiempo de generación: 19-12-2025 a las 02:09:26
-- Versión del servidor: 10.4.32-MariaDB
-- Versión de PHP: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Base de datos: `web_compraventa`
--

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `alembic_version`
--

CREATE TABLE `alembic_version` (
  `version_num` varchar(32) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `alembic_version`
--

INSERT INTO `alembic_version` (`version_num`) VALUES
('0ac5ff6f8ee7');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `api_keys`
--

CREATE TABLE `api_keys` (
  `id` int(11) NOT NULL,
  `empresa_id` int(11) NOT NULL,
  `api_key_hash` varchar(255) NOT NULL,
  `nombre` varchar(100) NOT NULL,
  `activo` tinyint(1) NOT NULL DEFAULT 1,
  `fecha_creacion` datetime NOT NULL DEFAULT current_timestamp(),
  `ultimo_uso` datetime DEFAULT NULL,
  `fecha_expiracion` datetime DEFAULT NULL,
  `codigo` varchar(50) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `api_keys`
--

INSERT INTO `api_keys` (`id`, `empresa_id`, `api_key_hash`, `nombre`, `activo`, `fecha_creacion`, `ultimo_uso`, `fecha_expiracion`, `codigo`) VALUES
(2, 1, '$2b$12$NfBfBbtErh1f1Hy3VFgAce7WwvBEk0DrHlHU5DXjQHGRtBi1pLxBK', 'API-Key Consumo de Suscripciones Activas', 1, '2025-12-17 20:38:25', '2025-12-17 22:03:10', '2026-12-17 20:38:25', 'LICENCIA'),
(3, 1, '$2b$12$HRM/k.QqtvCz1s821YNGteAlIKR94/UHEysNwEJwxA4ZHM6RYr1pS', 'API-Key Consumo Tickets de Soporte', 1, '2025-12-17 20:40:49', '2025-12-18 01:07:17', '2026-12-17 20:40:49', 'SOPORTE'),
(5, 1, '$2b$12$LpUEhtr7kP6MTqzrWo28IOW2O/4Xqm.Rb.GRL5.NA.DMn8s2Ar2MO', 'Test Soporte/Tickets', 1, '2025-12-17 22:46:13', NULL, '2026-12-18 01:11:46', 'soporte'),
(6, 1, '$2b$12$lAjez09ZGVVLyZz.Eds7uO5sRwHvmbLow2KWOGs1A/Aet8i3fQANy', 'Test Facturación', 1, '2025-12-17 22:46:13', NULL, '2026-03-17 22:46:13', 'facturacion'),
(7, 1, '$2b$12$paizaMIFm5rJorSwuT8WoOPjaen5AwPTPRXwoczXHw2d6lI90B7S6', 'Test General', 1, '2025-12-17 22:46:13', NULL, '2026-03-17 22:46:13', 'general'),
(8, 7, '$2b$12$LHJP9TjccUYHmj5q2VWGYOFYLsnuOD6Vw3go8MXzhTnup3e6rNRre', 'API-Key Consumo de Suscripciones Activas', 1, '2025-12-18 01:19:42', NULL, '2026-12-18 01:19:42', 'LICENCIA');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `empresas`
--

CREATE TABLE `empresas` (
  `id` int(11) NOT NULL,
  `nombre` varchar(150) NOT NULL,
  `contacto` varchar(120) NOT NULL,
  `nit` varchar(50) NOT NULL,
  `plan` varchar(50) NOT NULL,
  `creado_en` datetime DEFAULT NULL,
  `estado` tinyint(1) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `empresas`
--

INSERT INTO `empresas` (`id`, `nombre`, `contacto`, `nit`, `plan`, `creado_en`, `estado`) VALUES
(1, 'La Casona', '3132865421', '80020548521-vxT20.Wd', 'pro', NULL, 1),
(6, 'tratios Admin', 'admin@tratios.com', '000000000-0', 'empresarial', '2025-10-19 19:20:43', 1),
(7, 'La Reina', 'pruebas@gmail.com', '80030148752-vxT21.Ad', 'pro', '2025-10-20 00:35:53', 1),
(8, 'Compraventa y joyería Oroexpress', 'oroexpress@gmail.com', '80098548002-typx.4W', 'empresarial', '2025-12-16 23:15:54', 1),
(9, 'Compraventa Prestabank', 'compraventaprestabank@gmail.com', '80093318874Ljbc.q5', 'basico', '2025-12-16 23:18:33', 1);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `logs_acceso`
--

CREATE TABLE `logs_acceso` (
  `id` int(11) NOT NULL,
  `fecha` datetime DEFAULT NULL,
  `empresa_id` int(11) DEFAULT NULL,
  `tipo_evento` varchar(100) NOT NULL,
  `ip` varchar(50) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `planes`
--

CREATE TABLE `planes` (
  `id` int(11) NOT NULL,
  `nombre` varchar(100) NOT NULL,
  `precio_mensual` float NOT NULL,
  `seleccionado` tinyint(1) NOT NULL,
  `precio_anual` float NOT NULL,
  `descripcion` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `planes`
--

INSERT INTO `planes` (`id`, `nombre`, `precio_mensual`, `seleccionado`, `precio_anual`, `descripcion`) VALUES
(1, 'Básico', 249900, 0, 2698920, 'Plan Basico - Cloud vCPU = 4, RAM = 8 GB, Almacenamiento = 75 GB NVMe o 150 GB SSD, # Usuarios = 4'),
(2, 'Pro', 750000, 1, 8100000, 'Plan Pro - Cloud: vCPU = 6, RAM = 12 GB, Almacenamiento = 100 GB NVMe o 200 GB SSD, # Usuarios = 18'),
(3, 'Premium', 1400000, 0, 15120000, 'Plan Premium - Cloud: vCPU = 8, RAM = 24 GB, Almacenamiento = 200 GB NVMe o 400 GB SSD, # Usuarios = 50 ');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `planes_servicios`
--

CREATE TABLE `planes_servicios` (
  `plan_id` int(11) NOT NULL,
  `servicio_id` int(11) NOT NULL,
  `cantidad` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `planes_servicios`
--

INSERT INTO `planes_servicios` (`plan_id`, `servicio_id`, `cantidad`) VALUES
(1, 1, NULL),
(1, 2, NULL),
(1, 3, NULL),
(1, 4, NULL),
(1, 5, NULL),
(1, 6, NULL),
(1, 8, NULL),
(1, 9, NULL),
(1, 14, NULL),
(1, 15, NULL),
(1, 16, NULL),
(1, 17, NULL),
(1, 19, NULL),
(1, 21, NULL),
(1, 23, 1),
(1, 24, NULL),
(1, 25, NULL),
(1, 26, NULL),
(1, 28, NULL),
(1, 29, NULL),
(1, 32, NULL),
(2, 1, NULL),
(2, 2, NULL),
(2, 3, NULL),
(2, 4, NULL),
(2, 5, NULL),
(2, 6, NULL),
(2, 7, NULL),
(2, 8, NULL),
(2, 9, NULL),
(2, 13, NULL),
(2, 14, NULL),
(2, 15, NULL),
(2, 16, NULL),
(2, 17, NULL),
(2, 19, NULL),
(2, 20, NULL),
(2, 21, NULL),
(2, 23, 4),
(2, 24, NULL),
(2, 25, NULL),
(2, 26, NULL),
(2, 27, NULL),
(2, 28, NULL),
(2, 29, NULL),
(2, 30, NULL),
(2, 31, NULL),
(2, 32, NULL),
(3, 1, NULL),
(3, 2, NULL),
(3, 3, NULL),
(3, 4, NULL),
(3, 5, NULL),
(3, 6, NULL),
(3, 7, NULL),
(3, 8, NULL),
(3, 9, NULL),
(3, 10, NULL),
(3, 12, NULL),
(3, 13, NULL),
(3, 14, NULL),
(3, 15, NULL),
(3, 16, NULL),
(3, 17, NULL),
(3, 18, NULL),
(3, 19, NULL),
(3, 20, NULL),
(3, 21, NULL),
(3, 23, 7),
(3, 24, NULL),
(3, 25, NULL),
(3, 26, NULL),
(3, 27, NULL),
(3, 28, NULL),
(3, 29, NULL),
(3, 30, NULL),
(3, 31, NULL),
(3, 32, NULL);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `servicios`
--

CREATE TABLE `servicios` (
  `id` int(11) NOT NULL,
  `nombre` varchar(120) NOT NULL,
  `descripcion` text DEFAULT NULL,
  `activo` tinyint(1) DEFAULT NULL,
  `url_api` varchar(255) DEFAULT NULL,
  `creado_en` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `servicios`
--

INSERT INTO `servicios` (`id`, `nombre`, `descripcion`, `activo`, `url_api`, `creado_en`) VALUES
(1, 'Gestión de contratos', 'Gestion de Contratos', 1, 'contratos', '2025-08-20 16:03:16'),
(2, 'Gestion Entregas', 'Gestion para control de entregas de los productos de contratos', 1, 'gestion-entregas', '2025-08-20 16:03:16'),
(3, 'Gestion de Devoluciones', 'Gestion para hacer devoluciones de la ventas realizadas.', 1, 'devoluciones', '2025-08-20 16:03:16'),
(4, 'Gestión de inventario', 'Gestión de Inventiarios', 1, 'inventarios', '2025-08-20 16:03:16'),
(5, 'Gestión de remates', 'Parametros para administrar los remates en los productos. ', 1, 'configuracion/parametros-remate', '2025-08-20 16:03:16'),
(6, 'Reportes básicos', 'Gestion de reportes de contratos', 1, 'reportes/saved-report', '2025-08-20 16:03:16'),
(7, 'Notificaciones', 'Gestion de Notificaciones del Sistema.', 1, 'configuracion/notificaciones', '2025-08-20 16:03:16'),
(8, 'Administracion de Usuarios', 'Gestión de usuarios del sistema', 1, 'configuracion/usuarios', '2025-08-20 16:03:16'),
(9, 'Gestion de Caja', 'Gestion de Caja - Movimiento Dierio', 1, 'caja', '2025-08-20 16:03:16'),
(10, 'Reportes avanzados y Constructor de Reportes', 'Gestion de reportes de contratos Basicos mas Constructor de reportes', 1, 'reportes/report-builder', '2025-08-20 16:03:16'),
(12, 'Gestion de Infracciones(Black List)', NULL, 1, NULL, '2025-08-20 16:03:16'),
(13, 'Pasarela de Pagos', 'Servicio de Pasarela de pagos Wompi', 1, 'pasarela-de-pagos', '2025-08-20 16:03:16'),
(14, 'Gestion de Productos y Catalogo', 'Cree y gestione y categorice su catalogo de productos ', 1, 'productos', '2025-10-24 21:12:53'),
(15, 'Facturacion', 'Registre automaticamentes facturas, genere manualmente facturas, imprime y envia email.', 1, 'facturacion', '2025-10-24 21:16:19'),
(16, 'Pagos y Compras', 'Registro de pagos y registro de compras - Generacion de CXP y CXC', 1, 'pagos-compras', '2025-10-24 21:19:31'),
(17, 'Gestion de Ventas', 'Registre sus ventas de productos nuevos o provenientes de Contratos', 1, 'ventas', '2025-10-24 21:24:37'),
(18, 'CMR - Campañas', 'Cree sus tipos de Campañas, segmente a sus clientes y cree suys propias plantillas.', 1, 'campanas', '2025-10-24 21:27:08'),
(19, 'Migracion de Datos', 'Migre sus datos de otras aplicaciones de manera facil y segura.', 1, 'configuracion/migration', '2025-10-24 21:29:51'),
(20, 'Calificacion de Clientes', 'Obtenga una calificacion de sus clientes de acuerdo a su comportamiento financiero.', 1, 'configuracion/rangos-calificacion', '2025-10-24 21:31:04'),
(21, 'Dashboard', 'Panel de control principal', 1, 'dashboard', '2025-11-19 20:20:21'),
(23, 'Administracion de Sedes', 'Lista de las sedes disponibles', 1, 'configuracion/sedes', '2025-11-19 20:22:23'),
(24, 'Gestion de Planes de pagos', 'Gestion de Planes de pagos de cada contrato', 1, 'configuracion/plan-pagos', '2025-11-19 20:22:57'),
(25, 'Gestion de Ciclos de Corte', 'Administracion y Generacion guiada de Ciclos de Corte', 1, 'configuracion/ciclos-corte', '2025-11-19 20:23:43'),
(26, 'Gestión de Roles y Permisos para los usuarios', 'Gestión de Roles y Permisos para los usuarios', 1, 'configuracion/roles-permisos', '2025-11-19 20:25:39'),
(27, 'Gestion de Rutas y Accesos a paginas', 'Gestion de Rutas y Accesos a paginas', 1, 'configuracion/permisos-pagina', '2025-11-19 20:26:00'),
(28, 'Gestion para Clientes', 'Gestion para Clientes', 1, 'clientes', '2025-11-19 20:26:59'),
(29, 'Session para Soporte', 'Session para Soporte', 1, 'soporte', '2025-11-19 20:27:20'),
(30, 'Gestionar y listar las Infracciones a los Clientes', 'Gestionar y listar las Infracciones a los Clientes', 1, 'infracciones', '2025-11-19 20:27:46'),
(31, 'Administrar informacion de las empresas', 'CRUD para administrar informacion de las empresas', 1, 'configuracion/empresa', '2025-11-19 20:30:10'),
(32, 'Administracion del Perfil de Usuario', 'Administracion del Perfil de Usuario', 1, 'perfil', '2025-11-19 20:31:48');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `soporte_pagos`
--

CREATE TABLE `soporte_pagos` (
  `id` int(11) NOT NULL,
  `soporte_suscripcion_id` int(11) NOT NULL,
  `fecha_pago` datetime NOT NULL,
  `monto` decimal(15,2) NOT NULL,
  `metodo_pago` varchar(100) DEFAULT NULL,
  `referencia_pago` varchar(255) DEFAULT NULL,
  `estado` enum('exitoso','fallido','pendiente'),
  `detalle` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`detalle`)),
  `registrado_por` int(11) DEFAULT NULL,
  `fecha_creacion` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `soporte_pagos`
--

INSERT INTO `soporte_pagos` (`id`, `soporte_suscripcion_id`, `fecha_pago`, `monto`, `metodo_pago`, `referencia_pago`, `estado`, `detalle`, `registrado_por`, `fecha_creacion`) VALUES
(2, 2, '2025-12-09 00:00:00', 2800000.00, 'Transferencia a Nequi', '3204309610', 'exitoso', 'null', 18, '2025-12-10 00:50:11'),
(3, 3, '2025-12-09 20:17:31', 1500000.00, 'Transferencia a llave Bre-b', '@tratios.app', 'exitoso', '\"Se confirma pago \"', 18, '2025-12-09 20:17:31');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `soporte_suscripcion`
--

CREATE TABLE `soporte_suscripcion` (
  `id` int(11) NOT NULL,
  `suscripcion_id` int(11) NOT NULL,
  `empresa_id` int(11) NOT NULL,
  `soporte_tipo_id` int(11) NOT NULL,
  `fecha_inicio` date NOT NULL,
  `fecha_fin` date DEFAULT NULL,
  `estado` enum('activo','vencido','cancelado','pendiente_pago'),
  `precio_actual` decimal(15,2) NOT NULL,
  `tickets_consumidos` int(11),
  `horas_consumidas` decimal(10,2),
  `notas` text DEFAULT NULL,
  `creado_por` int(11) DEFAULT NULL,
  `fecha_creacion` datetime DEFAULT current_timestamp(),
  `fecha_actualizacion` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `renovacion_automatica` tinyint(1) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `soporte_suscripcion`
--

INSERT INTO `soporte_suscripcion` (`id`, `suscripcion_id`, `empresa_id`, `soporte_tipo_id`, `fecha_inicio`, `fecha_fin`, `estado`, `precio_actual`, `tickets_consumidos`, `horas_consumidas`, `notas`, `creado_por`, `fecha_creacion`, `fecha_actualizacion`, `renovacion_automatica`) VALUES
(2, 2, 1, 2, '2025-12-05', '2026-12-05', 'cancelado', 2800000.00, 0, 0.00, 'Se aplica suscripcion de soporte 24/7 Anual\n[2025-12-10 00:33] Estado: activo → pendiente_pago - Motivo: Se cambia estado a pendiente de pago ya qeu no se ha recibido el pago para renovar la suscripcion de soporte.\n[2025-12-10 00:39] Estado: pendiente_pago → activo - Motivo: Se verifica el pago del cliente.\n[2025-12-10 19:50] Estado: activo → cancelado - Motivo: Se cancela para crear otro tipo de suscripcion.', 18, '2025-12-05 21:01:42', '2025-12-10 19:50:54', 0),
(3, 6, 7, 3, '2025-12-06', '2026-01-06', 'activo', 150000.00, 1, 0.00, 'Se activa suscripcion soporte para compraventa la Reina ', 18, '2025-12-06 01:26:47', '2025-12-10 17:21:44', 1),
(4, 2, 1, 4, '2025-12-01', '2025-12-31', 'pendiente_pago', 38000.00, 0, 14.99, 'Esta asesoria tiene especial que se factura al final de cada periodo por la cantidad de horas consumidas y se reunueva en automatico\n[2025-12-16 16:31] Estado: activo → pendiente_pago - Motivo: No se refleja pago ', 18, '2025-12-10 19:52:16', '2025-12-16 19:34:16', 1);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `soporte_tickets`
--

CREATE TABLE `soporte_tickets` (
  `id` int(11) NOT NULL,
  `soporte_suscripcion_id` int(11) NOT NULL,
  `empresa_id` int(11) NOT NULL,
  `usuario_creador_id` int(11) DEFAULT NULL,
  `titulo` varchar(255) NOT NULL,
  `descripcion` text DEFAULT NULL,
  `estado` enum('abierto','en_proceso','pendiente_respuesta','cerrado','cancelado'),
  `prioridad` enum('baja','media','alta','critica'),
  `asignado_a` int(11) DEFAULT NULL,
  `fecha_creacion` datetime DEFAULT current_timestamp(),
  `fecha_actualizacion` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `fecha_cierre` datetime DEFAULT NULL,
  `extra_data` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`extra_data`))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `soporte_tickets`
--

INSERT INTO `soporte_tickets` (`id`, `soporte_suscripcion_id`, `empresa_id`, `usuario_creador_id`, `titulo`, `descripcion`, `estado`, `prioridad`, `asignado_a`, `fecha_creacion`, `fecha_actualizacion`, `fecha_cierre`, `extra_data`) VALUES
(8, 3, 7, 18, 'Prueba 1 ticket', 'Prueba 1 ticket', 'cerrado', 'media', 18, '2025-12-10 17:20:49', '2025-12-10 17:21:44', '2025-12-10 12:21:44', '{\"archivos\": [{\"nombre\": \"Cred_CHIP_1125_20251210_122049_7925e350.pdf\", \"nombre_original\": \"Cred_CHIP_1125.pdf\", \"ruta_relativa\": \"tickets\\\\8\\\\Cred_CHIP_1125_20251210_122049_7925e350.pdf\", \"tipo\": \"documents\", \"extension\": \"pdf\", \"tamano\": 179373, \"tamano_mb\": 0.17, \"fecha_subida\": \"2025-12-10T12:20:49.383557\"}]}'),
(9, 2, 1, 18, 'Prueba 2 Soporte 24/7', 'Prueba 2 Soporte 24/7 para la casona', 'cancelado', 'media', NULL, '2025-12-10 17:23:36', '2025-12-10 15:11:10', NULL, '{\"archivos\": [{\"nombre\": \"738528756132485_20251210_122336_47a9f888.png\", \"nombre_original\": \"738528756132485.png\", \"ruta_relativa\": \"tickets\\\\9\\\\738528756132485_20251210_122336_47a9f888.png\", \"tipo\": \"images\", \"extension\": \"png\", \"tamano\": 89720, \"tamano_mb\": 0.09, \"fecha_subida\": \"2025-12-10T12:23:36.893535\"}]}'),
(10, 3, 7, 18, 'Prueba 3 ', 'Prueba 3 consumo ticker la reina', 'pendiente_respuesta', 'media', 18, '2025-12-10 17:24:40', '2025-12-11 08:48:33', NULL, '{\"archivos\": [{\"nombre\": \"141213894811_20251210_122441_60529469.pdf\", \"nombre_original\": \"141213894811.pdf\", \"ruta_relativa\": \"tickets\\\\10\\\\141213894811_20251210_122441_60529469.pdf\", \"tipo\": \"documents\", \"extension\": \"pdf\", \"tamano\": 122180, \"tamano_mb\": 0.12, \"fecha_subida\": \"2025-12-10T12:24:41.057773\"}]}'),
(11, 3, 7, 18, 'Prueba 4 cuando ya ha', 'Prueba 4 cuando ya ha consumido los tickets  pero hay uno activo aun.', 'cancelado', 'media', NULL, '2025-12-10 17:26:51', '2025-12-10 14:33:44', NULL, '{\"archivos\": [{\"nombre\": \"141213894811_20251210_122651_4201b82b.pdf\", \"nombre_original\": \"141213894811.pdf\", \"ruta_relativa\": \"tickets\\\\11\\\\141213894811_20251210_122651_4201b82b.pdf\", \"tipo\": \"documents\", \"extension\": \"pdf\", \"tamano\": 122180, \"tamano_mb\": 0.12, \"fecha_subida\": \"2025-12-10T12:26:51.596302\"}]}'),
(12, 4, 1, 18, 'Prueba 1 por horas', 'Prueba ticker por horas', 'cerrado', 'media', 18, '2025-12-10 10:10:54', '2025-12-10 15:43:19', '2025-12-10 15:43:19', '{\"archivos\": [{\"nombre\": \"Comprobante_Transferencia_Boton-Octubre-pipe_20251210_151355_15949b71.pdf\", \"nombre_original\": \"Comprobante_Transferencia_Boton-Octubre-pipe.pdf\", \"ruta_relativa\": \"tickets\\\\12\\\\Comprobante_Transferencia_Boton-Octubre-pipe_20251210_151355_15949b71.pdf\", \"tipo\": \"documents\", \"extension\": \"pdf\", \"tamano\": 858506, \"tamano_mb\": 0.82, \"fecha_subida\": \"2025-12-10T15:13:55.150990\"}]}'),
(13, 4, 1, 18, 'Ticket de prueba ', 'Se crea ticket de prueba', 'pendiente_respuesta', 'media', 18, '2025-12-11 08:58:50', '2025-12-15 16:36:54', NULL, '{\"archivos\": [{\"nombre\": \"ChatGPT_Image_3_abr_2025_22_03_55_20251211_085851_235c00bd.png\", \"nombre_original\": \"ChatGPT Image 3 abr 2025, 22_03_55.png\", \"ruta_relativa\": \"tickets\\\\13\\\\ChatGPT_Image_3_abr_2025_22_03_55_20251211_085851_235c00bd.png\", \"tipo\": \"images\", \"extension\": \"png\", \"tamano\": 2450612, \"tamano_mb\": 2.34, \"fecha_subida\": \"2025-12-11T08:58:51.091159-05:00\"}]}'),
(14, 4, 1, 1118120825, 'Falla en creacion de contrato de solo interes cliente 111111', 'Describa el problema de forma clara y detallada\nAdjunte capturas de pantalla o logs\nIndique qué esperaba que sucediera\nMencione el navegador&#x2F;sistema operativo', 'cerrado', 'critica', 21, '2025-12-16 10:06:59', '2025-12-16 19:34:16', '2025-12-16 19:34:16', 'null'),
(15, 4, 1, 1118120825, 'Falla en creacion de contrato de solo interes cliente 111111', 'Describa el problema de forma clara y detallada\nAdjunte capturas de pantalla o logs\nIndique qué esperaba que sucediera\nMencione el navegador&#x2F;sistema operativo', 'en_proceso', 'critica', 21, '2025-12-16 10:27:06', '2025-12-16 19:31:32', NULL, 'null'),
(16, 4, 1, 1118120825, 'Falla en creacion de contrato de solo interes cliente 222222222', 'Describa el problema de forma clara y detallada\nAdjunte capturas de pantalla o logs\nIndique qué esperaba que sucediera\nMencione el navegador&#x2F;sistema operativo', 'abierto', 'alta', NULL, '2025-12-16 10:44:29', '2025-12-16 10:44:31', NULL, '{\"archivos\": [{\"nombre\": \"Reporte_2025-08-12_20251216_104431_dd72f0d3.xlsx\", \"nombre_original\": \"Reporte_2025-08-12.xlsx\", \"ruta_relativa\": \"tickets\\\\16\\\\Reporte_2025-08-12_20251216_104431_dd72f0d3.xlsx\", \"tipo\": \"documents\", \"extension\": \"xlsx\", \"tamano\": 16046, \"tamano_mb\": 0.02, \"fecha_subida\": \"2025-12-16T10:44:31.603262-05:00\"}]}'),
(17, 4, 1, 1118120825, 'Error al registrar usuario en la plataforma', 'Se presenta falla al momento de registrar el ususairo 444444 al momento de crear el contrato', 'pendiente_respuesta', 'media', NULL, '2025-12-16 11:20:22', '2025-12-16 11:33:54', NULL, '{\"archivos\": [{\"nombre\": \"Gemini_Generated_Image_rsk2nlrsk2nlrsk2_20251216_112024_8939257f.png\", \"nombre_original\": \"Gemini_Generated_Image_rsk2nlrsk2nlrsk2.png\", \"ruta_relativa\": \"tickets\\\\17\\\\Gemini_Generated_Image_rsk2nlrsk2nlrsk2_20251216_112024_8939257f.png\", \"tipo\": \"images\", \"extension\": \"png\", \"tamano\": 1101690, \"tamano_mb\": 1.05, \"fecha_subida\": \"2025-12-16T11:20:24.698598-05:00\"}]}');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `soporte_tickets_comentarios`
--

CREATE TABLE `soporte_tickets_comentarios` (
  `id` int(11) NOT NULL,
  `ticket_id` int(11) NOT NULL,
  `usuario_id` int(11) DEFAULT NULL,
  `es_admin` tinyint(1),
  `admin_id` int(11) DEFAULT NULL,
  `comentario` text NOT NULL,
  `archivos` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`archivos`)),
  `fecha_creacion` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `soporte_tickets_comentarios`
--

INSERT INTO `soporte_tickets_comentarios` (`id`, `ticket_id`, `usuario_id`, `es_admin`, `admin_id`, `comentario`, `archivos`, `fecha_creacion`) VALUES
(19, 8, 18, 1, 18, '[Sistema] Cambios realizados:\nEstado: abierto → en_proceso\nAsignado a: Administrador', NULL, '2025-12-10 12:21:12'),
(20, 8, 18, 1, 18, 'Comentario prueba 1 ticket', 'null', '2025-12-10 12:21:31'),
(21, 8, 18, 1, 18, '[Cierre] Ticket cerrado por administrador', NULL, '2025-12-10 12:21:44'),
(22, 10, 18, 1, 18, '[Sistema] Cambios realizados:\nEstado: abierto → en_proceso\nAsignado a: Administrador', NULL, '2025-12-10 12:31:20'),
(23, 11, 18, 1, 18, '[Cancelación] Se cancela, se creo por error', NULL, '2025-12-10 14:33:44'),
(24, 9, 18, 1, 18, '[Cancelación] Se cancela por la suscripcion anterior', NULL, '2025-12-10 15:11:10'),
(25, 12, 18, 1, 18, '[Sistema] Cambios realizados:\nEstado: abierto → en_proceso\nAsignado a: Administrador', NULL, '2025-12-10 15:14:07'),
(26, 12, 18, 1, 18, 'Se agrega comentario de prueba horas', '[{\"nombre\": \"evidencia_20251210_151846_ee463fca.pdf\", \"nombre_original\": \"evidencia.pdf\", \"ruta_relativa\": \"tickets\\\\12\\\\evidencia_20251210_151846_ee463fca.pdf\", \"tipo\": \"documents\", \"extension\": \"pdf\", \"tamano\": 398021, \"tamano_mb\": 0.38, \"fecha_subida\": \"2025-12-10T15:18:46.993070\"}]', '2025-12-10 15:18:46'),
(28, 12, 18, 1, 18, '[Sistema] Cambios realizados:\nEstado: pendiente_respuesta → cerrado', NULL, '2025-12-10 15:43:19'),
(29, 10, 18, 1, 18, 'Nuevo comnetario de prueba....', 'null', '2025-12-11 08:48:33'),
(30, 13, 18, 1, 18, '[Sistema] Cambios realizados:\nEstado: abierto → en_proceso\nAsignado a: Administrador', NULL, '2025-12-15 11:28:20'),
(39, 13, 1118120825, 0, NULL, 'Se agrega comentario desde empresa Saas', '[{\"nombre\": \"pngwing.com4_20251215_174407_f32aeb7d.png\", \"nombre_original\": \"pngwing.com(4).png\", \"ruta_relativa\": \"tickets\\\\13\\\\pngwing.com4_20251215_174407_f32aeb7d.png\", \"tipo\": \"images\", \"extension\": \"png\", \"tamano\": 890459, \"tamano_mb\": 0.85, \"fecha_subida\": \"2025-12-15T17:44:07.702186-05:00\"}]', '2025-12-15 17:44:05'),
(40, 13, 1118120825, 0, NULL, 'Se agrega otro comentario desde Saas', '[{\"nombre\": \"pngwing.com2_20251215_175959_b99ef722.png\", \"nombre_original\": \"pngwing.com(2).png\", \"ruta_relativa\": \"tickets\\\\13\\\\pngwing.com2_20251215_175959_b99ef722.png\", \"tipo\": \"images\", \"extension\": \"png\", \"tamano\": 465691, \"tamano_mb\": 0.44, \"fecha_subida\": \"2025-12-15T17:59:59.846369-05:00\"}]', '2025-12-15 17:59:57'),
(41, 13, 18, 1, 18, 'Comentario desde admin', '[{\"nombre\": \"carta_solicitud_tratsteo_20251215_180217_e314774c.docx\", \"nombre_original\": \"carta solicitud tratsteo.docx\", \"ruta_relativa\": \"tickets\\\\13\\\\carta_solicitud_tratsteo_20251215_180217_e314774c.docx\", \"tipo\": \"documents\", \"extension\": \"docx\", \"tamano\": 32954, \"tamano_mb\": 0.03, \"fecha_subida\": \"2025-12-15T18:02:17.269074-05:00\"}]', '2025-12-15 18:02:17'),
(42, 17, 1118120825, 0, NULL, 'Se vuelve a verificar y el problema sigue', 'null', '2025-12-16 11:33:54'),
(43, 15, 21, 1, 21, '[Sistema] Cambios realizados:\nEstado: abierto → en_proceso\nAsignado a: Pedro Francisco Arbelaez R', NULL, '2025-12-16 19:31:32'),
(44, 14, 21, 1, 21, '[Sistema] Cambios realizados:\nEstado: abierto → en_proceso\nAsignado a: Pedro Francisco Arbelaez R', NULL, '2025-12-16 19:31:50'),
(45, 14, 21, 1, 21, '[Cierre] Ticket cerrado por administrador', NULL, '2025-12-16 19:34:16');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `soporte_tipo`
--

CREATE TABLE `soporte_tipo` (
  `id` int(11) NOT NULL,
  `nombre` varchar(100) NOT NULL,
  `descripcion` text DEFAULT NULL,
  `modalidad` enum('mensual','anual','por_tickets','por_horas') NOT NULL,
  `precio` decimal(15,2) NOT NULL,
  `max_tickets` int(11) DEFAULT NULL,
  `max_horas` int(11) DEFAULT NULL,
  `activo` tinyint(1),
  `fecha_creacion` datetime DEFAULT current_timestamp(),
  `fecha_actualizacion` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `soporte_tipo`
--

INSERT INTO `soporte_tipo` (`id`, `nombre`, `descripcion`, `modalidad`, `precio`, `max_tickets`, `max_horas`, `activo`, `fecha_creacion`, `fecha_actualizacion`) VALUES
(1, 'Soporte Básico', 'Atención por correo y chat, en horario laboral. Respuesta en máximo 24 horas.', 'mensual', 800000.00, NULL, NULL, 1, '2025-12-05 00:59:47', '2025-12-05 00:59:47'),
(2, 'Soporte 24/7', 'Atención inmediata todos los días del año. Línea prioritaria.', 'anual', 2800000.00, NULL, NULL, 1, '2025-12-05 01:05:07', '2025-12-05 01:05:07'),
(3, 'Soporte por Evento', 'No incluye mensualidad. Se cobra por cada caso atendido.', 'por_tickets', 150000.00, 2, NULL, 1, '2025-12-05 01:06:27', '2025-12-10 13:32:44'),
(4, 'Asesoría Técnica Avanzada', 'Consultoría técnica para configuración avanzada y optimización. Se realiza cobro al finalizar el periodo totalizando cantidad de horas consumidas y se renueva automaticamente.', 'por_horas', 38000.00, NULL, 100, 1, '2025-12-05 01:07:25', '2025-12-10 20:10:44');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `suscripciones`
--

CREATE TABLE `suscripciones` (
  `id` int(11) NOT NULL,
  `empresa_id` int(11) NOT NULL,
  `fecha_inicio` date DEFAULT NULL,
  `fecha_fin` date DEFAULT NULL,
  `estado` varchar(20) DEFAULT NULL,
  `forma_pago` varchar(50) DEFAULT NULL,
  `plan_id` int(11) NOT NULL,
  `periodo` varchar(20) DEFAULT NULL,
  `precio_pagado` float DEFAULT NULL,
  `creado_en` datetime NOT NULL,
  `actualizado_en` datetime DEFAULT NULL,
  `creado_por` int(11) DEFAULT NULL,
  `motivo_cancelacion` text DEFAULT NULL,
  `notas` text DEFAULT NULL,
  `porcentaje_descuento` float NOT NULL,
  `renovacion_automatica` tinyint(1) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `suscripciones`
--

INSERT INTO `suscripciones` (`id`, `empresa_id`, `fecha_inicio`, `fecha_fin`, `estado`, `forma_pago`, `plan_id`, `periodo`, `precio_pagado`, `creado_en`, `actualizado_en`, `creado_por`, `motivo_cancelacion`, `notas`, `porcentaje_descuento`, `renovacion_automatica`) VALUES
(1, 7, '2025-10-20', '2025-11-19', 'cancelada', NULL, 1, 'mensual', 249900, '2025-10-20 00:54:23', '2025-10-20 01:11:08', 0, 'Pruebas ', '[Cancelación] Se cancela para pruebas', 0, 0),
(2, 1, '2025-10-20', '2026-10-20', 'activa', 'transferencia', 2, 'anual', 4200000, '2025-10-20 01:13:14', '2025-11-20 00:31:34', 18, NULL, 'Se paga por Bre-v a cuenta Bancolombia', 0, 0),
(3, 7, '2025-11-24', '2026-11-24', 'inactiva', 'nequi', 2, 'anual', 4200000, '2025-11-24 17:10:09', '2025-12-04 02:43:52', 18, NULL, NULL, 0, 0),
(6, 7, '2026-11-24', '2029-11-23', 'activa', 'nequi', 2, 'anual', 23814000, '2025-12-04 17:28:37', '2025-12-04 17:28:37', 0, NULL, 'Renovación de suscripción #3\n[Renovación multi-año: 3 años con 2% de descuento adicional]', 2, 0);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `usuarios`
--

CREATE TABLE `usuarios` (
  `id` int(11) NOT NULL,
  `nombre` varchar(120) NOT NULL,
  `email` varchar(120) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `rol` varchar(20) DEFAULT NULL,
  `creado_en` datetime DEFAULT NULL,
  `empresa_id` int(11) DEFAULT NULL,
  `otp_secret` varchar(32) DEFAULT NULL,
  `otp_enabled` tinyint(1) NOT NULL,
  `otp_backup_codes` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`otp_backup_codes`)),
  `otp_backup_codes_used` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`otp_backup_codes_used`)),
  `otp_last_verified_at` datetime DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL,
  `telefono` varchar(30) DEFAULT NULL,
  `direccion` varchar(255) DEFAULT NULL,
  `ciudad` varchar(120) DEFAULT NULL,
  `pais` varchar(120) DEFAULT NULL,
  `fecha_nacimiento` date DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `usuarios`
--

INSERT INTO `usuarios` (`id`, `nombre`, `email`, `password_hash`, `rol`, `creado_en`, `empresa_id`, `otp_secret`, `otp_enabled`, `otp_backup_codes`, `otp_backup_codes_used`, `otp_last_verified_at`, `is_active`, `telefono`, `direccion`, `ciudad`, `pais`, `fecha_nacimiento`) VALUES
(14, 'Alex Daniel Gazcon Rojas', 'alexfoxx19@gmail.com', 'scrypt:32768:8:1$HxSU9uenTAte59gP$98c31050d15ee633e3eaedc0d5cb928760ed252acfacc18db970afffbfffb00810b0ea83598e0611ef60ca6cca74b0ca6caefc97d8c12ca3e0ec31610089b134', 'cliente', '2025-10-17 15:19:07', 1, 'LP4UH4WFSJM5G7URLZSPEKTTPQ7AF5ZY', 1, '[\"scrypt:32768:8:1$yENC1XDRZwVLJROF$b9bc7acfab862193c644124347aeaa8c6555ad49214fe3ff5a42dcf9f0ee0f18d41e44b84f1262df79129b3659395570ce018096732fc894b4305b6cf1c95f8c\", \"scrypt:32768:8:1$bHOIPsHftoJi4y1Q$0298aabb84be712abb382e1fecc1bea4620e1f990057bbaf07ad1c24968adcc3607f38d2490118f1916eb956af5efca5ff79f26af12e9074443ce2df0fad745f\", \"scrypt:32768:8:1$8DdddUQTjJANkUCP$40558ab127135dad8c2822be830ea4b2fd81a373a2ab54cc0ff21705dfa98012f1f50bdaca3bb30c7604ee93874feb436301cf8d0162052141f50342831d1389\", \"scrypt:32768:8:1$i91nx1uaAZoEoTG7$5db5fd70735135eff4e10a71e6550533b31bb5196d59502fa345854a91d5ce09d5352079200cbf6f73a41606030d10ddc92585473185f328c80e1fb602628da3\", \"scrypt:32768:8:1$vESzbLvSvi7uTowg$985a17e800306b46096e6114d51cf57631e0be0fe51feb73689442fa6578efb7cb73ecbaa84b27322e0f786fcc0a287c40f8797eddbfa1c9aeefcb2e1d3e02c6\"]', '[]', '2025-12-04 00:13:39', 1, '3132865421', 'Calle 10 # 5a -68 Conjunto Terrazas de San Angel apto 301 B', 'Aguachica', 'Colombia', '1998-07-18'),
(18, 'Administrador', 'admin@tratios.com', 'scrypt:32768:8:1$NxLbxAIi8ppxKL9w$fb6db38f05be49a819b69bc7ce5e8d7b155e63d9d8e1ce6c8a79b6a65e2c9ecc4da57757af44355028d24159802af5366690a7cad732fea49ecf46aec3beace2', 'admin', '2025-10-19 19:20:43', 6, NULL, 0, '[]', '[]', NULL, 1, '3132865421', NULL, 'Yopal', 'Colombia', NULL),
(19, 'Fabian Alberto Suerez', 'fabian_suarez@gmail.com', 'scrypt:32768:8:1$l0SJ2VDiAN7AJJW2$0141eea5bcd042932f91325993f3b1f1fcdc6d92fe80d59f3679085dc58db3469c9e345149f54ab2248a54c717aacc2daee4a23f45088a8238ee55b899a1562d', 'cliente', '2025-12-04 00:28:44', 7, NULL, 0, '[]', '[]', NULL, 1, NULL, NULL, NULL, NULL, NULL),
(21, 'Pedro Francisco Arbelaez R', 'pedrofarbelaez@tratios.com', 'scrypt:32768:8:1$l0GW5knW9FMjgTN6$cfbe17ea90ada7d9faafef46795ab621cb498169f5486c0a9371f0cef1d9cc5205ab43b77a6759e9864f581a34211df301942f879722b985ea60525573efb392', 'admin', '2025-12-17 00:20:08', 6, NULL, 0, '[]', '[]', NULL, 1, '3201238574', 'Calle 74#102-8', 'Bogota', 'Colombia', NULL),
(22, 'Marcelo Gamboa', 'marceloganboa@gmail.com', 'scrypt:32768:8:1$ajokqbAADOnr9LvC$bdfb1b78e9f0acf283b4a9dd46f37faf1efeeb7be05f0002759bd8be728c11afa41fc0f1f893cbb308af7262acb00fd769afa38a9427e92f7c7538b2aab4aa2f', 'cliente', '2025-12-17 00:36:30', 9, NULL, 0, '[]', '[]', NULL, 0, '3132568574', 'Carrera 45# 52-8', 'Cali', 'Colombia', NULL);

--
-- Índices para tablas volcadas
--

--
-- Indices de la tabla `api_keys`
--
ALTER TABLE `api_keys`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_api_keys_hash` (`api_key_hash`),
  ADD KEY `ix_api_keys_empresa_id` (`empresa_id`),
  ADD KEY `ix_api_keys_activo` (`activo`),
  ADD KEY `ix_api_keys_hash` (`api_key_hash`),
  ADD KEY `ix_api_keys_codigo` (`codigo`);

--
-- Indices de la tabla `empresas`
--
ALTER TABLE `empresas`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `nit` (`nit`),
  ADD KEY `ix_empresas_creado_en` (`creado_en`),
  ADD KEY `ix_empresas_plan` (`plan`),
  ADD KEY `ix_empresas_estado` (`estado`);

--
-- Indices de la tabla `logs_acceso`
--
ALTER TABLE `logs_acceso`
  ADD PRIMARY KEY (`id`),
  ADD KEY `empresa_id` (`empresa_id`);

--
-- Indices de la tabla `planes`
--
ALTER TABLE `planes`
  ADD PRIMARY KEY (`id`);

--
-- Indices de la tabla `planes_servicios`
--
ALTER TABLE `planes_servicios`
  ADD PRIMARY KEY (`plan_id`,`servicio_id`),
  ADD KEY `servicio_id` (`servicio_id`);

--
-- Indices de la tabla `servicios`
--
ALTER TABLE `servicios`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `ix_servicios_nombre` (`nombre`),
  ADD KEY `ix_servicios_activo` (`activo`),
  ADD KEY `ix_servicios_creado_en` (`creado_en`);

--
-- Indices de la tabla `soporte_pagos`
--
ALTER TABLE `soporte_pagos`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_soporte_pagos_suscripcion` (`soporte_suscripcion_id`),
  ADD KEY `idx_soporte_pagos_estado` (`estado`),
  ADD KEY `idx_soporte_pagos_fecha` (`fecha_pago`),
  ADD KEY `registrado_por` (`registrado_por`);

--
-- Indices de la tabla `soporte_suscripcion`
--
ALTER TABLE `soporte_suscripcion`
  ADD PRIMARY KEY (`id`),
  ADD KEY `soporte_tipo_id` (`soporte_tipo_id`),
  ADD KEY `idx_soporte_suscripcion_empresa` (`empresa_id`),
  ADD KEY `idx_soporte_suscripcion_estado` (`estado`),
  ADD KEY `idx_soporte_suscripcion_fechas` (`fecha_inicio`,`fecha_fin`),
  ADD KEY `suscripcion_id` (`suscripcion_id`),
  ADD KEY `creado_por` (`creado_por`);

--
-- Indices de la tabla `soporte_tickets`
--
ALTER TABLE `soporte_tickets`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_soporte_tickets_suscripcion` (`soporte_suscripcion_id`),
  ADD KEY `idx_soporte_tickets_empresa` (`empresa_id`),
  ADD KEY `idx_soporte_tickets_estado` (`estado`),
  ADD KEY `idx_soporte_tickets_prioridad` (`prioridad`),
  ADD KEY `idx_soporte_tickets_asignado` (`asignado_a`);

--
-- Indices de la tabla `soporte_tickets_comentarios`
--
ALTER TABLE `soporte_tickets_comentarios`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_soporte_comentarios_ticket` (`ticket_id`),
  ADD KEY `admin_id` (`admin_id`);

--
-- Indices de la tabla `soporte_tipo`
--
ALTER TABLE `soporte_tipo`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_soporte_tipo_activo` (`activo`),
  ADD KEY `idx_soporte_tipo_modalidad` (`modalidad`);

--
-- Indices de la tabla `suscripciones`
--
ALTER TABLE `suscripciones`
  ADD PRIMARY KEY (`id`),
  ADD KEY `ix_suscripciones_empresa_id` (`empresa_id`),
  ADD KEY `ix_suscripciones_estado` (`estado`),
  ADD KEY `idx_suscripcion_plan` (`plan_id`),
  ADD KEY `idx_suscripcion_empresa_estado` (`empresa_id`,`estado`),
  ADD KEY `idx_suscripcion_fecha_fin` (`fecha_fin`);

--
-- Indices de la tabla `usuarios`
--
ALTER TABLE `usuarios`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `email` (`email`),
  ADD KEY `ix_usuarios_creado_en` (`creado_en`),
  ADD KEY `ix_usuarios_empresa_id` (`empresa_id`),
  ADD KEY `ix_usuarios_rol` (`rol`);

--
-- AUTO_INCREMENT de las tablas volcadas
--

--
-- AUTO_INCREMENT de la tabla `api_keys`
--
ALTER TABLE `api_keys`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- AUTO_INCREMENT de la tabla `empresas`
--
ALTER TABLE `empresas`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=10;

--
-- AUTO_INCREMENT de la tabla `logs_acceso`
--
ALTER TABLE `logs_acceso`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `planes`
--
ALTER TABLE `planes`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT de la tabla `servicios`
--
ALTER TABLE `servicios`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=33;

--
-- AUTO_INCREMENT de la tabla `soporte_pagos`
--
ALTER TABLE `soporte_pagos`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT de la tabla `soporte_suscripcion`
--
ALTER TABLE `soporte_suscripcion`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT de la tabla `soporte_tickets`
--
ALTER TABLE `soporte_tickets`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=18;

--
-- AUTO_INCREMENT de la tabla `soporte_tickets_comentarios`
--
ALTER TABLE `soporte_tickets_comentarios`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=46;

--
-- AUTO_INCREMENT de la tabla `soporte_tipo`
--
ALTER TABLE `soporte_tipo`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT de la tabla `suscripciones`
--
ALTER TABLE `suscripciones`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT de la tabla `usuarios`
--
ALTER TABLE `usuarios`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=23;

--
-- Restricciones para tablas volcadas
--

--
-- Filtros para la tabla `api_keys`
--
ALTER TABLE `api_keys`
  ADD CONSTRAINT `api_keys_ibfk_1` FOREIGN KEY (`empresa_id`) REFERENCES `empresas` (`id`) ON DELETE CASCADE;

--
-- Filtros para la tabla `logs_acceso`
--
ALTER TABLE `logs_acceso`
  ADD CONSTRAINT `logs_acceso_ibfk_1` FOREIGN KEY (`empresa_id`) REFERENCES `empresas` (`id`);

--
-- Filtros para la tabla `planes_servicios`
--
ALTER TABLE `planes_servicios`
  ADD CONSTRAINT `planes_servicios_ibfk_1` FOREIGN KEY (`plan_id`) REFERENCES `planes` (`id`),
  ADD CONSTRAINT `planes_servicios_ibfk_2` FOREIGN KEY (`servicio_id`) REFERENCES `servicios` (`id`);

--
-- Filtros para la tabla `soporte_pagos`
--
ALTER TABLE `soporte_pagos`
  ADD CONSTRAINT `soporte_pagos_ibfk_1` FOREIGN KEY (`soporte_suscripcion_id`) REFERENCES `soporte_suscripcion` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `soporte_pagos_ibfk_2` FOREIGN KEY (`registrado_por`) REFERENCES `usuarios` (`id`);

--
-- Filtros para la tabla `soporte_suscripcion`
--
ALTER TABLE `soporte_suscripcion`
  ADD CONSTRAINT `soporte_suscripcion_ibfk_3` FOREIGN KEY (`soporte_tipo_id`) REFERENCES `soporte_tipo` (`id`),
  ADD CONSTRAINT `soporte_suscripcion_ibfk_4` FOREIGN KEY (`empresa_id`) REFERENCES `empresas` (`id`),
  ADD CONSTRAINT `soporte_suscripcion_ibfk_5` FOREIGN KEY (`suscripcion_id`) REFERENCES `suscripciones` (`id`),
  ADD CONSTRAINT `soporte_suscripcion_ibfk_6` FOREIGN KEY (`creado_por`) REFERENCES `usuarios` (`id`);

--
-- Filtros para la tabla `soporte_tickets`
--
ALTER TABLE `soporte_tickets`
  ADD CONSTRAINT `soporte_tickets_ibfk_1` FOREIGN KEY (`soporte_suscripcion_id`) REFERENCES `soporte_suscripcion` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `soporte_tickets_ibfk_2` FOREIGN KEY (`empresa_id`) REFERENCES `empresas` (`id`),
  ADD CONSTRAINT `soporte_tickets_ibfk_3` FOREIGN KEY (`asignado_a`) REFERENCES `usuarios` (`id`);

--
-- Filtros para la tabla `soporte_tickets_comentarios`
--
ALTER TABLE `soporte_tickets_comentarios`
  ADD CONSTRAINT `soporte_tickets_comentarios_ibfk_1` FOREIGN KEY (`ticket_id`) REFERENCES `soporte_tickets` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `soporte_tickets_comentarios_ibfk_2` FOREIGN KEY (`admin_id`) REFERENCES `usuarios` (`id`);

--
-- Filtros para la tabla `suscripciones`
--
ALTER TABLE `suscripciones`
  ADD CONSTRAINT `fk_suscripcion_plan` FOREIGN KEY (`plan_id`) REFERENCES `planes` (`id`),
  ADD CONSTRAINT `suscripciones_ibfk_1` FOREIGN KEY (`empresa_id`) REFERENCES `empresas` (`id`);

--
-- Filtros para la tabla `usuarios`
--
ALTER TABLE `usuarios`
  ADD CONSTRAINT `usuarios_ibfk_1` FOREIGN KEY (`empresa_id`) REFERENCES `empresas` (`id`);
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;

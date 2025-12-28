-- Datos iniciales para Tratios
-- Este archivo se ejecuta automáticamente al crear el contenedor MySQL

USE web_compraventa;

-- Limpiar datos existentes (en orden correcto respetando foreign keys)
-- Primero eliminar registros que dependen de otros
DELETE FROM usuarios WHERE empresa_id IS NOT NULL;
DELETE FROM empresas;
DELETE FROM planes_servicios;
DELETE FROM servicios;
DELETE FROM planes;
DELETE FROM soporte_tipo;

-- Insertar planes base (seleccionado es JSON debido a migración incorrecta de Alembic)
INSERT INTO `planes` (`id`, `nombre`, `precio_mensual`, `seleccionado`, `precio_anual`, `descripcion`) VALUES
(1, 'Básico', 249900, 0, 2698920, 'Plan Basico - Cloud vCPU = 4, RAM = 8 GB, Almacenamiento = 75 GB NVMe o 150 GB SSD, # Usuarios = 4'),
(2, 'Pro', 750000, 1, 8100000, 'Plan Pro - Cloud: vCPU = 6, RAM = 12 GB, Almacenamiento = 100 GB NVMe o 200 GB SSD, # Usuarios = 18'),
(3, 'Premium', 1400000, 0, 15120000, 'Plan Premium - Cloud: vCPU = 8, RAM = 24 GB, Almacenamiento = 200 GB NVMe o 400 GB SSD, # Usuarios = 50 ');

-- Insertar servicios
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
(10, 'Cotizaciones (Prepedidos)', 'Cotizaciones - Prepedidos', 1, 'cotizaciones', '2025-08-20 16:03:16'),
(11, 'Busqueda Avanzada de clientes, Productos y Contratos', 'Busqueda Avanzada Multientidad', 1, 'busqueda-multientidad', '2025-08-20 16:03:16'),
(12, 'Comprobante de ventas a credito', 'Gestion de comprobantes de ventas a creditos.', 1, 'documentos-pagos', '2025-08-20 16:03:16'),
(13, 'Gestión de pagos', 'Gestión de Pagos - Recaudo de Cartera', 1, 'configuracion/formas-pago', '2025-08-20 16:03:16'),
(14, 'Gestión de productos', 'Módulo para administrar los productos', 1, 'configuracion/productos', '2025-08-20 16:03:16'),
(15, 'Roles y Permisos', 'Gestión de Roles y Permisos', 1, 'configuracion/roles', '2025-08-20 16:03:16'),
(16, 'Impresoras', 'Modulo configuracion de Impresoras (Impresoras Termicas, Impresoras A4, Navegador para Impresion)', 1, 'configuracion/impresoras', '2025-08-20 16:03:16'),
(17, 'Configuración de Tasas', 'Configuración de Tasas de Intereses', 1, 'configuracion/tasa-interes', '2025-08-20 16:03:16'),
(18, 'Gestion Facturas Electronicas', 'Administracion de Facturacion Electronica', 1, 'configuracion/facturacion-electronica', '2025-08-20 16:03:16'),
(19, 'Gestión de empresa y sucursales', 'Módulo para administrar la información de la empresa y sus sucursales.', 1, 'configuracion/empresa-sucursales', '2025-08-20 16:03:16'),
(20, 'Gestión de departamentos y ciudades', 'Configuración de departamentos y ciudades para gestión de clientes y sucursales.', 1, 'ciudades-colombia', '2025-08-20 16:03:16'),
(21, 'Gestión de clientes', 'Gestión de Clientes - Vinculaciones, Modificaciones, Visualizacion', 1, 'clientes', '2025-08-20 16:03:16'),
(22, 'Panel de métricas básico', 'Visor de metricas', 1, 'dashboard', '2025-08-20 16:03:16'),
(23, 'Panel de métricas Graficos avanzados', 'Panel avanzado con gráficos en tiempo real', 1, 'dashboard/graficos-avanzados', '2025-08-20 16:03:16'),
(24, 'Información de la empresa', 'Informacion de Contacto y datos de la compañia', 1, 'configuracion/informacion-empresa', '2025-08-20 16:03:16'),
(25, 'Gestión de proveedores', 'Gestión de Proveedores Insumos (Módulo para gestión de proveedores de productos)', 1, 'configuracion/proveedores', '2025-08-20 16:03:16'),
(26, 'Backups base de datos', 'Backups - Respaldos de Base de Datos', 1, 'configuracion/backups', '2025-08-20 16:03:16');

-- Insertar relaciones planes-servicios
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
(2, 1, NULL),
(2, 2, NULL),
(2, 3, NULL),
(2, 4, NULL),
(2, 5, NULL),
(2, 6, NULL),
(2, 7, NULL),
(2, 8, NULL),
(2, 9, NULL),
(2, 10, NULL),
(2, 11, NULL),
(2, 12, NULL),
(2, 13, NULL),
(2, 14, NULL),
(2, 15, NULL),
(2, 16, NULL),
(2, 17, NULL),
(2, 19, NULL),
(2, 21, NULL),
(2, 22, NULL),
(2, 23, 3),
(2, 24, NULL),
(2, 25, NULL),
(2, 26, NULL),
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
(3, 11, NULL),
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
(3, 22, NULL),
(3, 23, 5),
(3, 24, NULL),
(3, 25, NULL),
(3, 26, NULL);

-- Insertar tipos de soporte
INSERT INTO `soporte_tipo` (`id`, `nombre`, `descripcion`, `modalidad`, `precio`, `max_tickets`, `max_horas`, `activo`, `fecha_creacion`, `fecha_actualizacion`) VALUES
(1, 'Soporte Básico', 'Atención por correo y chat, en horario laboral. Respuesta en máximo 24 horas.', 'mensual', 800000.00, NULL, NULL, 1, NOW(), NOW()),
(2, 'Soporte 24/7', 'Atención inmediata todos los días del año. Línea prioritaria.', 'anual', 2800000.00, NULL, NULL, 1, NOW(), NOW()),
(3, 'Soporte por Evento', 'No incluye mensualidad. Se cobra por cada caso atendido.', 'por_tickets', 150000.00, 2, NULL, 1, NOW(), NOW()),
(4, 'Asesoría Técnica Avanzada', 'Consultoría técnica para configuración avanzada y optimización. Se realiza cobro al finalizar el periodo totalizando cantidad de horas consumidas y se renueva automaticamente.', 'por_horas', 38000.00, NULL, 100, 1, NOW(), NOW());

-- Insertar empresa base (debe ir ANTES de usuarios por foreign key)
INSERT INTO `empresas` (`id`, `nombre`, `contacto`, `nit`, `plan`, `creado_en`, `estado`) VALUES
(1, 'tratios Admin', 'admin@tratios.com', '000000000-0', 'empresarial', '2025-10-19 19:20:43', 1);

-- Insertar usuario administrador
INSERT INTO `usuarios` (`id`, `nombre`, `email`, `password_hash`, `rol`, `creado_en`, `empresa_id`, `otp_secret`, `otp_enabled`, `otp_backup_codes`, `otp_backup_codes_used`, `otp_last_verified_at`, `is_active`, `telefono`, `direccion`, `ciudad`, `pais`, `fecha_nacimiento`) VALUES
(1, 'Administrador', 'admin@tratios.com', 'scrypt:32768:8:1$NxLbxAIi8ppxKL9w$fb6db38f05be49a819b69bc7ce5e8d7b155e63d9d8e1ce6c8a79b6a65e2c9ecc4da57757af44355028d24159802af5366690a7cad732fea49ecf46aec3beace2', 'admin', '2025-10-19 19:20:43', 1, NULL, 0, '[]', '[]', NULL, 1, '3132865421', NULL, 'Yopal', 'Colombia', NULL);


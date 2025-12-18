"""
Rutas de administración para tickets de soporte
"""
import os
from datetime import datetime, timezone, timedelta
from flask import Blueprint, request, jsonify, send_file, current_app
from flask_jwt_extended import get_jwt_identity, verify_jwt_in_request
from flask_jwt_extended.exceptions import NoAuthorizationError
from werkzeug.utils import secure_filename
from functools import wraps
from database.db import db
#Models
from models.api_key import get_colombia_now
from models.soporte_ticket import SoporteTicket, SoporteTicketComentario
from models.soporte_suscripcion import SoporteSuscripcion
from models.usuario import Usuario
from models.api_key import ApiKey
from models.empresa import Empresa
#Utils
from utils.security import admin_required
from utils.log import AppLogger, LogCategory
from utils.api_key_crypto import verificar_api_key
from utils.file_handler import (
    allowed_file, validate_file_size, get_upload_path,
    generate_unique_filename, get_file_info, delete_ticket_files,
    MAX_FILE_SIZE, get_file_size_mb
)

admin_soporte_tickets_bp = Blueprint('admin_soporte_tickets', __name__, url_prefix='/admin/soporte-tickets')


def admin_or_api_key_required(f):
    """
    Decorador que permite acceso mediante:
    1. JWT de administrador (para el panel admin)
    2. API Key desde base de datos (para consumo externo via API privada)
    
    Requiere headers (cuando se usa API Key):
    - X-API-Key: API key en texto plano
    - X-Empresa-Id: ID de la empresa
    - X-Code-API: Código del scope (recomendado: 'soporte')
    """
    @wraps(f)
    def decorated_function(*args, **kwargs):
        # Verificar si viene con API Key
        api_key = request.headers.get('X-API-Key')
        
        if api_key:
            # Validar API Key desde base de datos
            empresa_id_header = request.headers.get('X-Empresa-Id')
            codigo_requerido = request.headers.get('X-Code-API')
            
            if not empresa_id_header:
                AppLogger.warning(
                    LogCategory.SOPORTE,
                    'Intento de acceso sin X-Empresa-Id',
                    ip=request.remote_addr,
                    endpoint=request.endpoint
                )
                return jsonify({'message': 'X-Empresa-Id header requerido', 'error': 'missing_empresa_id'}), 401
            
            if not codigo_requerido:
                AppLogger.warning(
                    LogCategory.SOPORTE,
                    'Intento de acceso sin X-Code-API',
                    ip=request.remote_addr,
                    endpoint=request.endpoint
                )
                return jsonify({'message': 'X-Code-API header requerido', 'error': 'missing_codigo_key'}), 401
            
            # Validar formato de empresa_id
            try:
                empresa_id = int(empresa_id_header)
            except ValueError:
                AppLogger.warning(
                    LogCategory.SOPORTE,
                    'X-Empresa-Id inválido (no numérico)',
                    empresa_id_header=empresa_id_header,
                    ip=request.remote_addr
                )
                return jsonify({'message': 'X-Empresa-Id debe ser numérico', 'error': 'invalid_empresa_id'}), 400
            
            # Validar que la empresa existe
            empresa = Empresa.query.get(empresa_id)
            if not empresa:
                AppLogger.warning(
                    LogCategory.SOPORTE,
                    'Intento de acceso con empresa_id inexistente',
                    empresa_id=empresa_id,
                    ip=request.remote_addr,
                    endpoint=request.endpoint
                )
                return jsonify({'message': 'Empresa no encontrada', 'error': 'empresa_not_found'}), 404
            
            # Buscar API keys activas de la empresa con el código específico
            api_keys = ApiKey.query.filter_by(
                empresa_id=empresa_id,
                codigo=codigo_requerido,
                activo=True
            ).all()
            
            if not api_keys:
                AppLogger.warning(
                    LogCategory.SOPORTE,
                    f'Empresa sin API keys activas para código {codigo_requerido}',
                    empresa_id=empresa_id,
                    codigo_requerido=codigo_requerido,
                    ip=request.remote_addr
                )
                return jsonify({'message': f'No hay API keys activas para el scope "{codigo_requerido}"', 'error': 'no_active_keys'}), 403
            
            # Verificar si alguna API key coincide
            api_key_valida = None
            for key_record in api_keys:
                # Verificar expiración
                if key_record.esta_expirada():
                    continue
                
                # Verificar hash con bcrypt
                if verificar_api_key(api_key, key_record.api_key_hash):
                    api_key_valida = key_record
                    break
            
            if not api_key_valida:
                AppLogger.warning(
                    LogCategory.SOPORTE,
                    'API Key inválida o expirada',
                    empresa_id=empresa_id,
                    codigo_requerido=codigo_requerido,
                    ip=request.remote_addr,
                    endpoint=request.endpoint,
                    api_key_prefix=api_key[:8] if len(api_key) >= 8 else 'corta'
                )
                return jsonify({'message': 'API Key inválida o expirada', 'error': 'invalid_api_key'}), 403
            
            # Actualizar último uso con hora de Colombia
            try:
                api_key_valida.ultimo_uso = get_colombia_now()
                db.session.commit()
            except Exception as e:
                AppLogger.error(
                    LogCategory.SOPORTE,
                    'Error al actualizar ultimo_uso de API key',
                    api_key_id=api_key_valida.id,
                    exc=e
                )
                # No bloqueamos el request por esto
            
            # Guardar contexto para uso posterior
            request.api_key_id = api_key_valida.id
            request.empresa_id = empresa_id
            request.api_key_codigo = api_key_valida.codigo
            
            AppLogger.info(
                LogCategory.SOPORTE,
                'Acceso autorizado con API Key desde BD',
                empresa_id=empresa_id,
                api_key_id=api_key_valida.id,
                api_key_nombre=api_key_valida.nombre,
                api_key_codigo=api_key_valida.codigo,
                endpoint=request.endpoint,
                ip=request.remote_addr
            )
            
            # API Key válida, permitir acceso
            return f(*args, **kwargs)
        
        # Si no hay API Key, verificar JWT de admin
        try:
            verify_jwt_in_request()
            current_user_email = get_jwt_identity()
            
            # Verificar que sea admin
            current_user = Usuario.query.filter_by(email=current_user_email).first()
            if not current_user:
                AppLogger.warning(LogCategory.SOPORTE, f'Usuario no encontrado: {current_user_email}')
                return jsonify({'message': 'Usuario no encontrado'}), 404
            
            if current_user.rol != 'admin':
                AppLogger.warning(LogCategory.SOPORTE, f'Intento de acceso sin permisos de admin: {current_user_email} (rol: {current_user.rol})')
                return jsonify({'message': 'Se requieren permisos de administrador'}), 403
            
            # Usuario admin válido
            return f(*args, **kwargs)
            
        except NoAuthorizationError:
            AppLogger.warning(LogCategory.SOPORTE, 'Intento de acceso sin autenticación')
            return jsonify({'message': 'Se requiere autenticación (JWT o API Key)', 'error': 'unauthorized'}), 401
        except Exception as e:
            AppLogger.error(LogCategory.SOPORTE, f'Error en autenticación: {str(e)}')
            return jsonify({'message': 'Error en la autenticación', 'error': 'auth_error'}), 500
    
    return decorated_function

# Zona horaria de Colombia (UTC-5)
COLOMBIA_TZ = timezone(timedelta(hours=-5))

def get_local_now():
    """Obtiene la fecha/hora actual en zona horaria de Colombia"""
    return datetime.now(COLOMBIA_TZ)

def normalize_datetime(dt):
    """
    Convierte un datetime naive a aware con timezone de Colombia.
    Si ya tiene timezone, lo retorna sin cambios.
    """
    if dt is None:
        return None
    if dt.tzinfo is None:
        # Es naive, asumir que está en hora de Colombia
        return dt.replace(tzinfo=COLOMBIA_TZ)
    return dt


def calcular_disponibilidad_soporte(suscripcion):
    """
    Calcula la disponibilidad de tickets/horas según la modalidad del tipo de soporte.
    
    Args:
        suscripcion: SoporteSuscripcion instance
    
    Returns:
        dict con información de disponibilidad:
        {
            'tiene_disponible': bool,
            'mensaje': str,
            'consumido': int/float,
            'maximo': int/float,
            'disponible': int/float,
            'modalidad': str,
            'periodo_inicio': date,
            'periodo_fin': date,
            'requiere_horario_laboral': bool,
            'respuesta_esperada': str
        }
    """
    tipo_soporte = suscripcion.tipo_soporte
    modalidad = tipo_soporte.modalidad
    
    resultado = {
        'tiene_disponible': True,
        'mensaje': '',
        'consumido': 0,
        'maximo': 0,
        'disponible': 0,
        'modalidad': modalidad,
        'periodo_inicio': suscripcion.fecha_inicio,
        'periodo_fin': suscripcion.fecha_fin,
        'requiere_horario_laboral': False,
        'respuesta_esperada': ''
    }
    
    # Determinar periodo de evaluación basado en modalidad
    fecha_inicio = suscripcion.fecha_inicio
    fecha_fin = suscripcion.fecha_fin
    
    # Si es mensual o anual, usar el rango de fechas de la suscripción
    # Ya está definido en fecha_inicio y fecha_fin
    
    # Validar si está dentro del periodo
    ahora = get_local_now().date()
    if ahora < fecha_inicio or (fecha_fin and ahora > fecha_fin):
        resultado['tiene_disponible'] = False
        resultado['mensaje'] = 'La suscripción de soporte no está vigente en este momento'
        return resultado
    
    # Modalidad: por_horas
    if modalidad == 'por_horas':
        max_horas = tipo_soporte.max_horas or 0
        horas_consumidas = float(suscripcion.horas_consumidas or 0)
        horas_disponibles = max_horas - horas_consumidas
        
        resultado['consumido'] = horas_consumidas
        resultado['maximo'] = max_horas
        resultado['disponible'] = horas_disponibles
        
        if horas_disponibles <= 0:
            resultado['tiene_disponible'] = False
            resultado['mensaje'] = f'Ha consumido todas las horas disponibles ({max_horas} horas) para este periodo'
        else:
            resultado['mensaje'] = f'Tiene {horas_disponibles:.2f} horas disponibles de {max_horas}'
    
    # Modalidad: por_tickets
    elif modalidad == 'por_tickets':
        max_tickets = tipo_soporte.max_tickets or 0
        
        # Contar tickets NO cancelados en el periodo (incluye abiertos, en_proceso, pendiente_respuesta, cerrados)
        # Solo excluimos 'cancelado' porque esos no consumen el cupo
        fecha_inicio_dt = datetime.combine(fecha_inicio, datetime.min.time(), tzinfo=COLOMBIA_TZ)
        fecha_fin_dt = datetime.combine(fecha_fin or ahora, datetime.max.time(), tzinfo=COLOMBIA_TZ)
        
        tickets_activos = SoporteTicket.query.filter(
            SoporteTicket.soporte_suscripcion_id == suscripcion.id,
            SoporteTicket.fecha_creacion >= fecha_inicio_dt,
            SoporteTicket.fecha_creacion <= fecha_fin_dt,
            SoporteTicket.estado != 'cancelado'  # Solo excluir cancelados
        ).count()
        
        tickets_disponibles = max_tickets - tickets_activos
        
        resultado['consumido'] = tickets_activos
        resultado['maximo'] = max_tickets
        resultado['disponible'] = tickets_disponibles
        
        if tickets_disponibles <= 0:
            resultado['tiene_disponible'] = False
            resultado['mensaje'] = f'Ha consumido todos los tickets disponibles ({max_tickets} tickets) para este periodo'
        else:
            resultado['mensaje'] = f'Tiene {tickets_disponibles} tickets disponibles de {max_tickets}'
    
    # Modalidad: mensual o anual (soporte básico)
    elif modalidad in ['mensual', 'anual']:
        # Verificar si es tipo "básico" - requiere horario laboral
        if 'basico' in tipo_soporte.nombre.lower() or 'básico' in tipo_soporte.nombre.lower():
            resultado['requiere_horario_laboral'] = True
            resultado['respuesta_esperada'] = 'Atención por correo y chat, en horario laboral. Respuesta en máximo 24 horas.'
            
            # Verificar si estamos en horario laboral (lunes a viernes, 8am-6pm Colombia)
            ahora = get_local_now()
            es_dia_laboral = ahora.weekday() < 5  # 0-4 es lunes a viernes
            hora_actual = ahora.hour
            es_horario_laboral = 8 <= hora_actual < 18
            
            if not es_dia_laboral or not es_horario_laboral:
                resultado['mensaje'] = '⚠️ Horario laboral: Lunes a Viernes, 8:00 AM - 6:00 PM. Su ticket será atendido en el siguiente horario hábil.'
            else:
                resultado['mensaje'] = 'Soporte básico activo. Respuesta en máximo 24 horas hábiles.'
        
        # Verificar si es tipo "24/7" o "premium"
        elif '24' in tipo_soporte.nombre or 'premium' in tipo_soporte.nombre.lower():
            resultado['respuesta_esperada'] = 'Atención inmediata todos los días del año. Línea prioritaria.'
            resultado['mensaje'] = '🚀 Soporte prioritario 24/7 activo. Atención inmediata.'
        else:
            resultado['mensaje'] = f'Soporte {tipo_soporte.nombre} activo - Sin límite de tickets'
    
    return resultado


def actualizar_consumo_ticket_cerrado(ticket):
    """
    Actualiza el consumo de tickets/horas cuando se cierra un ticket.
    
    Args:
        ticket: SoporteTicket instance que se está cerrando
    """
    suscripcion = ticket.soporte_suscripcion
    tipo_soporte = suscripcion.tipo_soporte
    modalidad = tipo_soporte.modalidad
    
    AppLogger.info(
        LogCategory.SOPORTE,
        "actualizar_consumo_ticket_cerrado LLAMADA",
        ticket_id=ticket.id,
        modalidad=modalidad,
        suscripcion_id=suscripcion.id
    )
    
    if modalidad == 'por_tickets':
        # Incrementar contador de tickets consumidos
        tickets_antes = suscripcion.tickets_consumidos or 0
        suscripcion.tickets_consumidos = tickets_antes + 1
        
        AppLogger.info(
            LogCategory.SOPORTE,
            "Ticket consumido actualizado",
            ticket_id=ticket.id,
            suscripcion_id=suscripcion.id,
            tickets_antes=tickets_antes,
            tickets_despues=suscripcion.tickets_consumidos,
            max_tickets=tipo_soporte.max_tickets
        )
    
    elif modalidad == 'por_horas':
        # Calcular horas desde creación hasta cierre
        # Normalizar fechas para evitar error de naive vs aware
        fecha_cierre_norm = normalize_datetime(ticket.fecha_cierre)
        fecha_creacion_norm = normalize_datetime(ticket.fecha_creacion)
        tiempo_transcurrido = fecha_cierre_norm - fecha_creacion_norm
        horas_consumidas = tiempo_transcurrido.total_seconds() / 3600  # Convertir a horas
        
        # Actualizar total de horas consumidas
        suscripcion.horas_consumidas = float(suscripcion.horas_consumidas or 0) + horas_consumidas
        
        AppLogger.info(
            LogCategory.SOPORTE,
            "Horas consumidas actualizadas",
            ticket_id=ticket.id,
            suscripcion_id=suscripcion.id,
            horas_ticket=round(horas_consumidas, 2),
            horas_consumidas_total=round(float(suscripcion.horas_consumidas), 2),
            max_horas=tipo_soporte.max_horas
        )
    
    # NO hacer commit aquí - se hará en la función que llama


@admin_soporte_tickets_bp.route('', methods=['POST'])
@admin_or_api_key_required
def crear_ticket():
    """
    POST /admin/soporte-tickets
    Crea un nuevo ticket de soporte
    
    Autenticación: JWT Admin o API Key
    
    Body: {
        soporte_suscripcion_id: int,
        empresa_id: int,
        usuario_id: int,
        titulo: string,
        descripcion?: string,
        prioridad?: string (baja|media|alta|critica)
    }
    """
    try:
        data = request.get_json()
        
        # Detectar si es petición externa (API) o interna (Admin)
        # Si tiene empresa_id en request, es petición externa de API
        es_peticion_api_externa = hasattr(request, 'empresa_id')
        
        # Determinar usuario: puede venir en data (API) o de JWT (admin panel)
        usuario_id = data.get('usuario_id')
        
        if not usuario_id:
            # Intentar obtener de JWT (solo para peticiones internas del admin)
            try:
                current_user_email = get_jwt_identity()
                current_user = Usuario.query.filter_by(email=current_user_email).first()
                if not current_user:
                    AppLogger.error(LogCategory.SOPORTE, "Usuario no encontrado", email=current_user_email)
                    return jsonify({'message': 'Usuario no encontrado'}), 404
                usuario_id = current_user.id
            except:
                return jsonify({'message': 'usuario_id es obligatorio cuando se usa API Key'}), 400
        else:
            # Solo validar existencia del usuario si es petición INTERNA (Admin)
            # Para peticiones API externas, el usuario_id es de la BD de la instancia SaaS
            if not es_peticion_api_externa:
                current_user = Usuario.query.get(usuario_id)
                if not current_user:
                    AppLogger.warning(
                        LogCategory.SOPORTE,
                        'Usuario no encontrado en BD web (petición admin)',
                        usuario_id=usuario_id
                    )
                    return jsonify({'message': 'Usuario no encontrado'}), 404
            else:
                AppLogger.info(
                    LogCategory.SOPORTE,
                    'Petición API externa: usuario_id no validado (pertenece a BD SaaS)',
                    usuario_id=usuario_id,
                    empresa_id=request.empresa_id
                )
        
        AppLogger.info(
            LogCategory.SOPORTE,
            "Crear ticket - Inicio",
            usuario_id=usuario_id,
            es_api_externa=es_peticion_api_externa,
            empresa_id=data.get('empresa_id'),
            suscripcion_id=data.get('soporte_suscripcion_id')
        )
        
        # Validaciones
        if not data.get('soporte_suscripcion_id'):
            return jsonify({'message': 'soporte_suscripcion_id es obligatorio'}), 400
        if not data.get('empresa_id'):
            return jsonify({'message': 'empresa_id es obligatorio'}), 400
        if not data.get('titulo'):
            return jsonify({'message': 'titulo es obligatorio'}), 400
        
        # Validar prioridad
        prioridad = data.get('prioridad', 'media')
        if prioridad not in ['baja', 'media', 'alta', 'critica']:
            return jsonify({'message': 'Prioridad inválida'}), 400
        
        # Verificar que existe la suscripción de soporte
        suscripcion = SoporteSuscripcion.query.get(data['soporte_suscripcion_id'])
        if not suscripcion:
            AppLogger.warning(
                LogCategory.SOPORTE, 
                "Suscripción de soporte no encontrada", 
                suscripcion_id=data['soporte_suscripcion_id']
            )
            return jsonify({'message': 'Suscripción de soporte no encontrada'}), 404
        
        # Verificar que la suscripción esté activa
        if suscripcion.estado != 'activo':
            AppLogger.warning(
                LogCategory.SOPORTE,
                "Suscripción de soporte no activa",
                suscripcion_id=suscripcion.id,
                estado=suscripcion.estado
            )
            return jsonify({'message': 'La suscripción de soporte no está activa'}), 400
        
        # Verificar que la empresa coincida
        if suscripcion.empresa_id != int(data['empresa_id']):
            AppLogger.warning(
                LogCategory.SOPORTE,
                "Suscripción no pertenece a la empresa",
                suscripcion_empresa_id=suscripcion.empresa_id,
                empresa_id=data['empresa_id']
            )
            return jsonify({'message': 'La suscripción no pertenece a la empresa seleccionada'}), 400
        
        # VALIDAR DISPONIBILIDAD DE SOPORTE
        disponibilidad = calcular_disponibilidad_soporte(suscripcion)
        
        if not disponibilidad['tiene_disponible']:
            AppLogger.warning(
                LogCategory.SOPORTE,
                "Sin disponibilidad de soporte",
                suscripcion_id=suscripcion.id,
                modalidad=disponibilidad['modalidad'],
                consumido=disponibilidad['consumido'],
                maximo=disponibilidad['maximo']
            )
            return jsonify({
                'message': disponibilidad['mensaje'],
                'disponibilidad': disponibilidad
            }), 400
        
        # Crear el ticket
        nuevo_ticket = SoporteTicket(
            soporte_suscripcion_id=data['soporte_suscripcion_id'],
            empresa_id=int(data['empresa_id']),
            titulo=data['titulo'],
            descripcion=data.get('descripcion'),
            prioridad=prioridad,
            estado='abierto',
            usuario_creador_id=usuario_id,  # ID del usuario (BD web si es admin, BD SaaS si es API externa)
            extra_data=None  # Los archivos se asocian a comentarios, no al ticket directamente
        )
        
        db.session.add(nuevo_ticket)
        db.session.commit()
        
        AppLogger.info(
            LogCategory.SOPORTE,
            "Ticket creado exitosamente",
            ticket_id=nuevo_ticket.id,
            empresa_id=nuevo_ticket.empresa_id,
            suscripcion_id=nuevo_ticket.soporte_suscripcion_id,
            titulo=nuevo_ticket.titulo,
            prioridad=nuevo_ticket.prioridad,
            creado_por=usuario_id,
            es_api_externa=es_peticion_api_externa
        )
        
        return jsonify({
            'message': 'Ticket creado exitosamente',
            'ticket': nuevo_ticket.to_dict()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        AppLogger.error(
            LogCategory.SOPORTE, 
            "Error al crear ticket", 
            exc=e,
            data=data if 'data' in locals() else None
        )
        return jsonify({'message': f'Error al crear ticket: {str(e)}'}), 500


@admin_soporte_tickets_bp.route('', methods=['GET'])
@admin_or_api_key_required
def listar_tickets():
    """
    GET /admin/soporte-tickets
    Lista todos los tickets con filtros y paginación
    
    Autenticación: JWT Admin o API Key
    
    Query params: 
        - empresa_id, estado, prioridad, asignado_a, sin_asignar
        - busqueda (busca en título y descripción)
        - page (default: 1), per_page (default: 20)
    """
    try:
        query = SoporteTicket.query
        
        empresa_id = request.args.get('empresa_id', type=int)
        if empresa_id:
            query = query.filter(SoporteTicket.empresa_id == empresa_id)
        
        estado = request.args.get('estado')
        if estado:
            query = query.filter(SoporteTicket.estado == estado)
        
        prioridad = request.args.get('prioridad')
        if prioridad:
            query = query.filter(SoporteTicket.prioridad == prioridad)
        
        asignado_a = request.args.get('asignado_a', type=int)
        if asignado_a:
            query = query.filter(SoporteTicket.asignado_a == asignado_a)
        
        sin_asignar = request.args.get('sin_asignar')
        if sin_asignar and sin_asignar.lower() == 'true':
            query = query.filter(SoporteTicket.asignado_a.is_(None))
        
        # Búsqueda general en título y descripción
        busqueda = request.args.get('busqueda')
        if busqueda:
            query = query.filter(
                db.or_(
                    SoporteTicket.titulo.ilike(f'%{busqueda}%'),
                    SoporteTicket.descripcion.ilike(f'%{busqueda}%')
                )
            )
        
        # Paginación
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        
        # Limitar per_page a un máximo razonable
        per_page = min(per_page, 100)
        
        # Obtener total antes de paginar
        total = query.count()
        
        # Ordenar por prioridad y fecha
        prioridad_orden = {
            'critica': 1, 'alta': 2, 'media': 3, 'baja': 4
        }
        
        # Obtener todos para ordenar por prioridad (la paginación se hará después)
        all_tickets = query.order_by(SoporteTicket.fecha_creacion.desc()).all()
        
        # Ordenar por prioridad en Python (más flexible)
        all_tickets.sort(key=lambda t: (
            0 if t.estado in ['abierto', 'en_proceso', 'pendiente_respuesta'] else 1,
            prioridad_orden.get(t.prioridad, 5)
        ))
        
        # Paginar manualmente
        start = (page - 1) * per_page
        end = start + per_page
        tickets_paginados = all_tickets[start:end]
        total_pages = (total + per_page - 1) // per_page
        
        return jsonify({
            'tickets': [t.to_dict() for t in tickets_paginados],
            'total': total,
            'page': page,
            'per_page': per_page,
            'pages': total_pages,
            'estadisticas': {
                'total': total,
                'abiertos': sum(1 for t in all_tickets if t.estado == 'abierto'),
                'en_proceso': sum(1 for t in all_tickets if t.estado == 'en_proceso'),
                'pendiente_respuesta': sum(1 for t in all_tickets if t.estado == 'pendiente_respuesta'),
                'cerrados': sum(1 for t in all_tickets if t.estado == 'cerrado'),
                'criticos': sum(1 for t in all_tickets if t.prioridad == 'critica' and t.estado not in ['cerrado', 'cancelado']),
                'sin_asignar': sum(1 for t in all_tickets if t.asignado_a is None),
                'activos': sum(1 for t in all_tickets if t.estado in ['abierto', 'en_proceso', 'pendiente_respuesta'])
            }
        }), 200
    except Exception as e:
        return jsonify({'message': f'Error al listar tickets: {str(e)}'}), 500


@admin_soporte_tickets_bp.route('/<int:ticket_id>', methods=['GET'])
@admin_or_api_key_required
def obtener_ticket(ticket_id):
    """
    GET /admin/soporte-tickets/:id
    Obtiene un ticket con todos sus comentarios
    
    Autenticación: JWT Admin o API Key
    """
    try:
        ticket = SoporteTicket.query.get(ticket_id)
        if not ticket:
            return jsonify({'message': 'Ticket no encontrado'}), 404
        
        return jsonify(ticket.to_dict(include_comentarios=True)), 200
    except Exception as e:
        return jsonify({'message': f'Error al obtener ticket: {str(e)}'}), 500


@admin_soporte_tickets_bp.route('/<int:ticket_id>', methods=['PATCH'])
@admin_required
def actualizar_ticket(ticket_id):
    """
    PATCH /admin/soporte-tickets/:id
    Actualiza estado, prioridad o asignación de un ticket
    Body: { estado?, prioridad?, asignado_a? }
    """
    try:
        ticket = SoporteTicket.query.get(ticket_id)
        if not ticket:
            return jsonify({'message': 'Ticket no encontrado'}), 404
        
        data = request.get_json()
        current_user_email = get_jwt_identity()
        
        # Obtener el ID del usuario actual
        current_user = Usuario.query.filter_by(email=current_user_email).first()
        if not current_user:
            return jsonify({'message': 'Usuario no encontrado'}), 404
        
        cambios = []
        
        if 'estado' in data:
            if data['estado'] not in ['abierto', 'en_proceso', 'pendiente_respuesta', 'cerrado', 'cancelado']:
                return jsonify({'message': 'Estado inválido'}), 400
            estado_anterior = ticket.estado
            ticket.estado = data['estado']
            cambios.append(f'Estado: {estado_anterior} → {data["estado"]}')
            
            # Si se está cerrando el ticket, actualizar fecha de cierre
            if data['estado'] == 'cerrado' and estado_anterior != 'cerrado':
                ticket.fecha_cierre = get_local_now()
                AppLogger.info(
                    LogCategory.SOPORTE,
                    "Cerrando ticket - Actualizará consumo",
                    ticket_id=ticket.id,
                    estado_anterior=estado_anterior,
                    fecha_cierre=ticket.fecha_cierre.isoformat() if ticket.fecha_cierre else None
                )
        
        if 'prioridad' in data:
            if data['prioridad'] not in ['baja', 'media', 'alta', 'critica']:
                return jsonify({'message': 'Prioridad inválida'}), 400
            prioridad_anterior = ticket.prioridad
            ticket.prioridad = data['prioridad']
            cambios.append(f'Prioridad: {prioridad_anterior} → {data["prioridad"]}')
        
        if 'asignado_a' in data:
            admin_nombre = "Sin asignar"
            if data['asignado_a'] is not None:
                admin = Usuario.query.get(data['asignado_a'])
                if not admin or admin.rol != 'admin':
                    return jsonify({'message': 'El usuario asignado debe ser un administrador'}), 400
                admin_nombre = admin.nombre
            ticket.asignado_a = data['asignado_a']
            cambios.append(f'Asignado a: {admin_nombre}')
        
        # Registrar cambios como comentario del sistema
        if cambios:
            comentario_sistema = SoporteTicketComentario(
                ticket_id=ticket_id,
                es_admin=True,
                admin_id=current_user.id,
                usuario_id=current_user.id,
                comentario=f'[Sistema] Cambios realizados:\n' + '\n'.join(cambios),
                fecha_creacion=get_local_now()
            )
            db.session.add(comentario_sistema)
        
        # Si se cerró el ticket, actualizar consumo ANTES del commit
        if 'estado' in data and data['estado'] == 'cerrado' and ticket.estado == 'cerrado':
            AppLogger.info(
                LogCategory.SOPORTE,
                "ANTES DE LLAMAR actualizar_consumo_ticket_cerrado",
                ticket_id=ticket.id,
                data_estado=data.get('estado'),
                ticket_estado=ticket.estado
            )
            actualizar_consumo_ticket_cerrado(ticket)
            AppLogger.info(
                LogCategory.SOPORTE,
                "DESPUÉS DE LLAMAR actualizar_consumo_ticket_cerrado",
                ticket_id=ticket.id
            )
        
        db.session.commit()
        
        return jsonify({
            'message': 'Ticket actualizado exitosamente',
            'ticket': ticket.to_dict()
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': f'Error al actualizar ticket: {str(e)}'}), 500


@admin_soporte_tickets_bp.route('/<int:ticket_id>/comentarios', methods=['GET'])
@admin_required
def listar_comentarios_ticket(ticket_id):
    """
    GET /admin/soporte-tickets/:id/comentarios
    Lista los comentarios de un ticket
    """
    try:
        ticket = SoporteTicket.query.get(ticket_id)
        if not ticket:
            return jsonify({'message': 'Ticket no encontrado'}), 404
        
        comentarios = ticket.comentarios.order_by(SoporteTicketComentario.fecha_creacion.asc()).all()
        
        return jsonify({
            'comentarios': [c.to_dict() for c in comentarios],
            'total': len(comentarios)
        }), 200
    except Exception as e:
        return jsonify({'message': f'Error al listar comentarios: {str(e)}'}), 500


@admin_soporte_tickets_bp.route('/<int:ticket_id>/comentarios', methods=['POST'])
@admin_or_api_key_required
def agregar_comentario_admin(ticket_id):
    """
    POST /admin/soporte-tickets/:id/comentarios
    Agrega un comentario al ticket con archivos opcionales
    
    Autenticación: JWT Admin o API Key
    
    Acepta dos formatos:
    1. JSON: { comentario: string, usuario_id?: int, es_interno?: bool, archivos?: array }
    2. FormData: comentario (text) + usuario_id (optional) + es_interno (optional) + files (multiple files)
    """
    try:
        # Logging para diagnóstico
        AppLogger.info(
            LogCategory.SOPORTE,
            'admin_agregar_comentario invocado',
            ticket_id=ticket_id,
            content_type=request.content_type,
            has_json=request.is_json,
            has_form=bool(request.form) if hasattr(request, 'form') else False,
            has_files=bool(request.files) if hasattr(request, 'files') else False
        )
        
        ticket = SoporteTicket.query.get(ticket_id)
        if not ticket:
            AppLogger.warning(
                LogCategory.SOPORTE,
                'Ticket no encontrado en admin_agregar_comentario',
                ticket_id=ticket_id
            )
            return jsonify({'message': 'Ticket no encontrado'}), 404
        
        # Detectar si es petición externa (API) o interna (Admin)
        # Si tiene empresa_id en request, es petición externa de API
        es_peticion_api_externa = hasattr(request, 'empresa_id')
        
        # Determinar usuario: puede venir en data/form (API) o de JWT (admin panel)
        usuario_id = None
        
        if request.content_type and 'multipart/form-data' in request.content_type:
            usuario_id = request.form.get('usuario_id')
        elif request.is_json:
            json_data = request.get_json()
            usuario_id = json_data.get('usuario_id') if json_data else None
        
        AppLogger.info(
            LogCategory.SOPORTE,
            'Procesando comentario',
            usuario_id=usuario_id,
            es_api_externa=es_peticion_api_externa
        )
        
        if not usuario_id:
            # Intentar obtener de JWT (solo para peticiones internas del admin)
            try:
                current_user_email = get_jwt_identity()
                current_user = Usuario.query.filter_by(email=current_user_email).first()
                if not current_user:
                    AppLogger.warning(
                        LogCategory.SOPORTE,
                        'Usuario JWT no encontrado',
                        email=current_user_email
                    )
                    return jsonify({'message': 'Usuario no encontrado'}), 404
                usuario_id = current_user.id
            except Exception as jwt_error:
                AppLogger.warning(
                    LogCategory.SOPORTE,
                    'Error al obtener JWT o usuario_id faltante',
                    error=str(jwt_error)
                )
                return jsonify({'message': 'usuario_id es obligatorio cuando se usa API Key'}), 400
        else:
            # Solo validar existencia del usuario si es petición INTERNA (Admin)
            # Para peticiones API externas, el usuario_id es de la BD de la instancia SaaS
            if not es_peticion_api_externa:
                current_user = Usuario.query.get(usuario_id)
                if not current_user:
                    AppLogger.warning(
                        LogCategory.SOPORTE,
                        'Usuario no encontrado en BD web (petición admin)',
                        usuario_id=usuario_id
                    )
                    return jsonify({'message': 'Usuario no encontrado'}), 404
            else:
                AppLogger.info(
                    LogCategory.SOPORTE,
                    'Petición API externa: usuario_id no validado (pertenece a BD SaaS)',
                    usuario_id=usuario_id,
                    empresa_id=request.empresa_id
                )
        
        # Detectar si es JSON o FormData
        if request.content_type and 'multipart/form-data' in request.content_type:
            # FormData con archivos
            comentario_texto = request.form.get('comentario')
            if not comentario_texto:
                return jsonify({'message': 'El comentario es obligatorio'}), 400
            
            archivos_metadata = []
            
            # Procesar archivos si existen
            if 'files' in request.files:
                files = request.files.getlist('files')
                
                for file in files:
                    if file.filename == '':
                        continue
                    
                    # Validar extensión
                    if not allowed_file(file.filename):
                        return jsonify({'message': f'Tipo de archivo no permitido: {file.filename}'}), 400
                    
                    # Leer contenido para validar tamaño
                    file.seek(0, os.SEEK_END)
                    file_size = file.tell()
                    file.seek(0)
                    
                    # Validar tamaño
                    is_valid, error_msg = validate_file_size(file_size)
                    if not is_valid:
                        return jsonify({'message': f'{file.filename}: {error_msg}'}), 400
                    
                    try:
                        # Generar nombre único y guardar
                        upload_path = get_upload_path(ticket_id)
                        unique_filename = generate_unique_filename(file.filename)
                        filepath = os.path.join(upload_path, unique_filename)
                        
                        file.save(filepath)
                        
                        # Obtener información del archivo
                        file_info = get_file_info(unique_filename, filepath)
                        file_info['nombre_original'] = file.filename
                        
                        archivos_metadata.append(file_info)
                        
                        AppLogger.info(
                            LogCategory.SOPORTE,
                            f"Archivo subido para comentario en ticket {ticket_id}",
                            filename=file.filename,
                            size_mb=file_info['tamano_mb']
                        )
                    except Exception as e:
                        AppLogger.error(LogCategory.SOPORTE, f"Error al guardar archivo {file.filename}", exc=e)
                        return jsonify({'message': f'Error al guardar archivo: {str(e)}'}), 500
            
            # Para API externa: no es admin, es usuario de la instancia SaaS
            # Para Admin interno: es admin
            nuevo_comentario = SoporteTicketComentario(
                ticket_id=ticket_id,
                es_admin=not es_peticion_api_externa,
                admin_id=usuario_id if not es_peticion_api_externa else None,
                usuario_id=usuario_id,
                comentario=comentario_texto,
                archivos=archivos_metadata if archivos_metadata else None,
                fecha_creacion=get_local_now()  # Usar zona horaria local
            )
        else:
            # JSON tradicional
            data = request.get_json()
            
            if not data.get('comentario'):
                return jsonify({'message': 'El comentario es obligatorio'}), 400
            
            # Para API externa: no es admin, es usuario de la instancia SaaS
            # Para Admin interno: es admin
            nuevo_comentario = SoporteTicketComentario(
                ticket_id=ticket_id,
                es_admin=not es_peticion_api_externa,
                admin_id=usuario_id if not es_peticion_api_externa else None,
                usuario_id=usuario_id,
                comentario=data['comentario'],
                archivos=data.get('archivos'),
                fecha_creacion=get_local_now()  # Usar zona horaria local
            )
        
        db.session.add(nuevo_comentario)
        
        # Cambiar estado a pendiente_respuesta si estaba abierto o en_proceso
        if ticket.estado in ['abierto', 'en_proceso']:
            ticket.estado = 'pendiente_respuesta'
        
        db.session.commit()
        
        return jsonify({
            'message': 'Comentario agregado exitosamente',
            'comentario': nuevo_comentario.to_dict()
        }), 201
    except Exception as e:
        db.session.rollback()
        AppLogger.error(LogCategory.SOPORTE, f"Error al agregar comentario ticket {ticket_id}", exc=e)
        return jsonify({'message': f'Error al agregar comentario: {str(e)}'}), 500


@admin_soporte_tickets_bp.route('/<int:ticket_id>/cerrar', methods=['POST'])
@admin_required
def cerrar_ticket(ticket_id):
    """
    POST /admin/soporte-tickets/:id/cerrar
    Cierra un ticket
    Body: { motivo?: string }
    """
    try:
        ticket = SoporteTicket.query.get(ticket_id)
        if not ticket:
            return jsonify({'message': 'Ticket no encontrado'}), 404
        
        if ticket.estado == 'cerrado':
            return jsonify({'message': 'El ticket ya está cerrado'}), 400
        
        # Validar que el ticket tenga un analista asignado
        if not ticket.asignado_a:
            return jsonify({'message': 'No se puede cerrar un ticket sin analista asignado'}), 400
        
        data = request.get_json() or {}
        current_user_email = get_jwt_identity()
        
        # Obtener el ID del usuario actual
        current_user = Usuario.query.filter_by(email=current_user_email).first()
        if not current_user:
            return jsonify({'message': 'Usuario no encontrado'}), 404
        
        ticket.estado = 'cerrado'
        ticket.fecha_cierre = get_local_now()
        
        # Agregar comentario de cierre
        motivo = data.get('motivo', 'Ticket cerrado por administrador')
        comentario_cierre = SoporteTicketComentario(
            ticket_id=ticket_id,
            es_admin=True,
            admin_id=current_user.id,
            usuario_id=current_user.id,
            comentario=f'[Cierre] {motivo}',
            fecha_creacion=get_local_now()
        )
        db.session.add(comentario_cierre)
        
        # Actualizar consumo de tickets/horas en la suscripción
        AppLogger.info(
            LogCategory.SOPORTE,
            "Cerrando ticket - Actualizará consumo",
            ticket_id=ticket.id,
            endpoint="cerrar_ticket"
        )
        actualizar_consumo_ticket_cerrado(ticket)
        
        db.session.commit()
        
        return jsonify({
            'message': 'Ticket cerrado exitosamente',
            'ticket': ticket.to_dict()
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': f'Error al cerrar ticket: {str(e)}'}), 500


@admin_soporte_tickets_bp.route('/<int:ticket_id>/reabrir', methods=['POST'])
@admin_required
def reabrir_ticket(ticket_id):
    """
    POST /admin/soporte-tickets/:id/reabrir
    Reabre un ticket cerrado
    Body: { motivo?: string }
    """
    try:
        ticket = SoporteTicket.query.get(ticket_id)
        if not ticket:
            return jsonify({'message': 'Ticket no encontrado'}), 404
        
        if ticket.estado != 'cerrado':
            return jsonify({'message': 'Solo se pueden reabrir tickets cerrados'}), 400
        
        data = request.get_json() or {}
        current_user_email = get_jwt_identity()
        
        # Obtener el ID del usuario actual
        current_user = Usuario.query.filter_by(email=current_user_email).first()
        if not current_user:
            return jsonify({'message': 'Usuario no encontrado'}), 404
        
        ticket.estado = 'abierto'
        ticket.fecha_cierre = None
        ticket.fecha_actualizacion = get_local_now()
        
        motivo = data.get('motivo', 'Ticket reabierto por administrador')
        comentario_reapertura = SoporteTicketComentario(
            ticket_id=ticket_id,
            es_admin=True,
            admin_id=current_user.id,
            usuario_id=current_user.id,
            comentario=f'[Reapertura] {motivo}',
            fecha_creacion=get_local_now()
        )
        db.session.add(comentario_reapertura)
        
        db.session.commit()
        
        return jsonify({
            'message': 'Ticket reabierto exitosamente',
            'ticket': ticket.to_dict()
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': f'Error al reabrir ticket: {str(e)}'}), 500


@admin_soporte_tickets_bp.route('/<int:ticket_id>/cancelar', methods=['POST'])
@admin_required
def cancelar_ticket(ticket_id):
    """
    POST /admin/soporte-tickets/:id/cancelar
    Cancela un ticket (no cuenta para el límite)
    Body: { motivo?: string }
    """
    try:
        ticket = SoporteTicket.query.get(ticket_id)
        if not ticket:
            return jsonify({'message': 'Ticket no encontrado'}), 404
        
        if ticket.estado == 'cancelado':
            return jsonify({'message': 'El ticket ya está cancelado'}), 400
        
        if ticket.estado == 'cerrado':
            return jsonify({'message': 'No se puede cancelar un ticket cerrado'}), 400
        
        data = request.get_json() or {}
        current_user_email = get_jwt_identity()
        
        # Obtener el ID del usuario actual
        current_user = Usuario.query.filter_by(email=current_user_email).first()
        if not current_user:
            return jsonify({'message': 'Usuario no encontrado'}), 404
        
        estado_anterior = ticket.estado
        ticket.estado = 'cancelado'
        ticket.fecha_actualizacion = get_local_now()
        
        motivo = data.get('motivo', 'Ticket cancelado')
        comentario_cancelacion = SoporteTicketComentario(
            ticket_id=ticket_id,
            es_admin=True,
            admin_id=current_user.id,
            usuario_id=current_user.id,
            comentario=f'[Cancelación] {motivo}',
            fecha_creacion=get_local_now()
        )
        db.session.add(comentario_cancelacion)
        
        AppLogger.info(
            LogCategory.SOPORTE,
            "Ticket cancelado",
            ticket_id=ticket.id,
            estado_anterior=estado_anterior,
            motivo=motivo,
            cancelado_por=current_user.id
        )
        
        db.session.commit()
        
        return jsonify({
            'message': 'Ticket cancelado exitosamente',
            'ticket': ticket.to_dict()
        }), 200
    except Exception as e:
        db.session.rollback()
        AppLogger.error(
            LogCategory.SOPORTE,
            "Error al cancelar ticket",
            ticket_id=ticket_id,
            error=str(e)
        )
        return jsonify({'message': f'Error al cancelar ticket: {str(e)}'}), 500


@admin_soporte_tickets_bp.route('/disponibilidad/<int:suscripcion_id>', methods=['GET'])
@admin_required
def consultar_disponibilidad(suscripcion_id):
    """
    GET /admin/soporte-tickets/disponibilidad/:suscripcion_id
    Consulta la disponibilidad de tickets/horas para una suscripción de soporte
    
    Returns:
        {
            tiene_disponible: bool,
            mensaje: string,
            consumido: number,
            maximo: number,
            disponible: number,
            modalidad: string,
            periodo_inicio: date,
            periodo_fin: date,
            requiere_horario_laboral: bool,
            respuesta_esperada: string,
            tipo_soporte: {nombre, descripcion}
        }
    """
    try:
        suscripcion = SoporteSuscripcion.query.get(suscripcion_id)
        if not suscripcion:
            return jsonify({'message': 'Suscripción de soporte no encontrada'}), 404
        
        disponibilidad = calcular_disponibilidad_soporte(suscripcion)
        
        # Agregar información del tipo de soporte
        disponibilidad['tipo_soporte'] = {
            'id': suscripcion.tipo_soporte.id,
            'nombre': suscripcion.tipo_soporte.nombre,
            'descripcion': suscripcion.tipo_soporte.descripcion,
            'modalidad': suscripcion.tipo_soporte.modalidad,
            'precio': float(suscripcion.tipo_soporte.precio)
        }
        
        # Agregar información de la empresa
        disponibilidad['empresa'] = {
            'id': suscripcion.empresa.id,
            'nombre': suscripcion.empresa.nombre
        }
        
        # Convertir fechas a string para JSON
        if disponibilidad['periodo_inicio']:
            disponibilidad['periodo_inicio'] = disponibilidad['periodo_inicio'].isoformat()
        if disponibilidad['periodo_fin']:
            disponibilidad['periodo_fin'] = disponibilidad['periodo_fin'].isoformat()
        
        return jsonify(disponibilidad), 200
    
    except Exception as e:
        AppLogger.error(
            LogCategory.SOPORTE,
            "Error al consultar disponibilidad",
            exc=e,
            suscripcion_id=suscripcion_id
        )
        return jsonify({'message': f'Error al consultar disponibilidad: {str(e)}'}), 500


@admin_soporte_tickets_bp.route('/estadisticas', methods=['GET'])
@admin_required
def estadisticas_tickets():
    """
    GET /admin/soporte-tickets/estadisticas
    Obtiene estadísticas generales de tickets
    """
    try:
        total = SoporteTicket.query.count()
        abiertos = SoporteTicket.query.filter_by(estado='abierto').count()
        en_proceso = SoporteTicket.query.filter_by(estado='en_proceso').count()
        pendiente_respuesta = SoporteTicket.query.filter_by(estado='pendiente_respuesta').count()
        cerrados = SoporteTicket.query.filter_by(estado='cerrado').count()
        cancelados = SoporteTicket.query.filter_by(estado='cancelado').count()
        
        criticos = SoporteTicket.query.filter(
            SoporteTicket.prioridad == 'critica',
            SoporteTicket.estado.notin_(['cerrado', 'cancelado'])
        ).count()
        
        sin_asignar = SoporteTicket.query.filter(
            SoporteTicket.asignado_a.is_(None),
            SoporteTicket.estado.notin_(['cerrado', 'cancelado'])
        ).count()
        
        return jsonify({
            'total': total,
            'abiertos': abiertos,
            'en_proceso': en_proceso,
            'pendiente_respuesta': pendiente_respuesta,
            'cerrados': cerrados,
            'cancelados': cancelados,
            'criticos': criticos,
            'sin_asignar': sin_asignar,
            'activos': abiertos + en_proceso + pendiente_respuesta
        }), 200
    except Exception as e:
        return jsonify({'message': f'Error al obtener estadísticas: {str(e)}'}), 500


@admin_soporte_tickets_bp.route('/<int:ticket_id>/upload', methods=['POST'])
@admin_or_api_key_required
def subir_archivo(ticket_id):
    """
    POST /admin/soporte-tickets/:id/upload
    Sube archivos adjuntos para un ticket o comentario específico
    
    Autenticación: JWT Admin o API Key
    
    Form-data: 
    - files (multiple files)
    - comentario_id (opcional): Si se proporciona, asocia archivos al comentario en lugar del ticket
    """
    try:
        ticket = SoporteTicket.query.get(ticket_id)
        if not ticket:
            return jsonify({'message': 'Ticket no encontrado'}), 404
        
        # Verificar si se debe asociar a un comentario específico
        comentario_id = request.form.get('comentario_id')
        comentario = None
        
        if comentario_id:
            comentario = SoporteTicketComentario.query.filter_by(
                id=int(comentario_id),
                ticket_id=ticket_id
            ).first()
            if not comentario:
                return jsonify({'message': 'Comentario no encontrado'}), 404
            
            AppLogger.info(
                LogCategory.SOPORTE,
                'Subiendo archivos para comentario específico',
                ticket_id=ticket_id,
                comentario_id=comentario_id
            )
        
        # Verificar que se envíen archivos
        if 'files' not in request.files:
            return jsonify({'message': 'No se enviaron archivos'}), 400
        
        files = request.files.getlist('files')
        if not files or all(f.filename == '' for f in files):
            return jsonify({'message': 'No se seleccionaron archivos'}), 400
        
        # Validar número de archivos (máximo 10 por carga)
        if len(files) > 10:
            return jsonify({'message': 'Máximo 10 archivos por carga'}), 400
        
        # Determinar dónde guardar los archivos
        if comentario:
            # Guardar en el comentario
            if not comentario.archivos:
                comentario.archivos = []
        else:
            # Guardar en el ticket
            if not ticket.extra_data:
                ticket.extra_data = {'archivos': []}
            elif 'archivos' not in ticket.extra_data:
                ticket.extra_data['archivos'] = []
        
        archivos_subidos = []
        errores = []
        
        for file in files:
            if file.filename == '':
                continue
            
            # Validar extensión
            if not allowed_file(file.filename):
                errores.append(f'{file.filename}: Tipo de archivo no permitido')
                continue
            
            # Leer contenido para validar tamaño
            file.seek(0, os.SEEK_END)
            file_size = file.tell()
            file.seek(0)
            
            # Validar tamaño
            is_valid, error_msg = validate_file_size(file_size)
            if not is_valid:
                errores.append(f'{file.filename}: {error_msg}')
                continue
            
            try:
                # Generar nombre único y guardar
                upload_path = get_upload_path(ticket_id)
                unique_filename = generate_unique_filename(file.filename)
                filepath = os.path.join(upload_path, unique_filename)
                
                file.save(filepath)
                
                # Obtener información del archivo
                file_info = get_file_info(unique_filename, filepath)
                file_info['nombre_original'] = file.filename
                
                # Guardar en comentario o ticket según corresponda
                if comentario:
                    comentario.archivos.append(file_info)
                    AppLogger.info(
                        LogCategory.SOPORTE,
                        f"Archivo subido para comentario {comentario_id} en ticket {ticket_id}",
                        filename=file.filename,
                        size_mb=file_info['tamano_mb']
                    )
                else:
                    ticket.extra_data['archivos'].append(file_info)
                    AppLogger.info(
                        LogCategory.SOPORTE,
                        f"Archivo subido para ticket {ticket_id}",
                        filename=file.filename,
                        size_mb=file_info['tamano_mb']
                    )
                
                archivos_subidos.append(file_info)
            except Exception as e:
                errores.append(f'{file.filename}: Error al guardar - {str(e)}')
        
        if archivos_subidos:
            db.session.commit()
        
        response = {
            'message': f'{len(archivos_subidos)} archivo(s) subido(s) exitosamente',
            'archivos': archivos_subidos
        }
        
        if errores:
            response['errores'] = errores
            response['message'] += f', {len(errores)} error(es)'
        
        return jsonify(response), 200 if archivos_subidos else 400
    except Exception as e:
        db.session.rollback()
        AppLogger.error(LogCategory.SOPORTE, f"Error al subir archivos ticket {ticket_id}", exc=e)
        return jsonify({'message': f'Error al subir archivos: {str(e)}'}), 500


@admin_soporte_tickets_bp.route('/<int:ticket_id>/archivo/<filename>', methods=['GET'])
@admin_or_api_key_required
def descargar_archivo(ticket_id, filename):
    """
    GET /admin/soporte-tickets/:id/archivo/:filename
    Descarga un archivo adjunto del ticket o de sus comentarios
    
    Autenticación: JWT Admin o API Key
    """
    try:
        ticket = SoporteTicket.query.get(ticket_id)
        if not ticket:
            return jsonify({'message': 'Ticket no encontrado'}), 404
        
        archivo_encontrado = None
        
        # Buscar primero en archivos del ticket (extra_data)
        if ticket.extra_data and 'archivos' in ticket.extra_data:
            for archivo in ticket.extra_data['archivos']:
                if archivo.get('nombre') == filename:
                    archivo_encontrado = archivo
                    break
        
        # Si no se encontró, buscar en archivos de comentarios
        if not archivo_encontrado:
            for comentario in ticket.comentarios:
                if comentario.archivos:
                    for archivo in comentario.archivos:
                        if archivo.get('nombre') == filename:
                            archivo_encontrado = archivo
                            break
                if archivo_encontrado:
                    break
        
        if not archivo_encontrado:
            return jsonify({'message': 'Archivo no encontrado'}), 404
        
        # Construir ruta completa
        upload_path = get_upload_path(ticket_id)
        filepath = os.path.join(upload_path, filename)
        
        if not os.path.exists(filepath):
            return jsonify({'message': 'El archivo físico no existe en el servidor'}), 404
        
        # Enviar archivo
        nombre_original = archivo_encontrado.get('nombre_original', filename)
        return send_file(
            filepath,
            as_attachment=True,
            download_name=nombre_original
        )
    except Exception as e:
        AppLogger.error(LogCategory.SOPORTE, f"Error al descargar archivo ticket {ticket_id}", exc=e)
        return jsonify({'message': f'Error al descargar archivo: {str(e)}'}), 500


@admin_soporte_tickets_bp.route('/<int:ticket_id>/archivo/<filename>', methods=['DELETE'])
@admin_required
def eliminar_archivo(ticket_id, filename):
    """
    DELETE /admin/soporte-tickets/:id/archivo/:filename
    Elimina un archivo adjunto del ticket
    """
    try:
        ticket = SoporteTicket.query.get(ticket_id)
        if not ticket:
            return jsonify({'message': 'Ticket no encontrado'}), 404
        
        if not ticket.extra_data or 'archivos' not in ticket.extra_data:
            return jsonify({'message': 'El ticket no tiene archivos adjuntos'}), 404
        
        # Buscar y eliminar del extra_data
        archivo_eliminado = None
        archivos_actualizados = []
        for archivo in ticket.extra_data['archivos']:
            if archivo.get('nombre') == filename:
                archivo_eliminado = archivo
            else:
                archivos_actualizados.append(archivo)
        
        if not archivo_eliminado:
            return jsonify({'message': 'Archivo no encontrado'}), 404
        
        # Eliminar archivo físico
        upload_path = get_upload_path(ticket_id)
        filepath = os.path.join(upload_path, filename)
        if os.path.exists(filepath):
            os.remove(filepath)
        
        # Actualizar base de datos
        ticket.extra_data['archivos'] = archivos_actualizados
        db.session.commit()
        
        AppLogger.info(
            LogCategory.SOPORTE,
            f"Archivo eliminado del ticket {ticket_id}",
            filename=filename
        )
        
        return jsonify({'message': 'Archivo eliminado exitosamente'}), 200
    except Exception as e:
        db.session.rollback()
        AppLogger.error(LogCategory.SOPORTE, f"Error al eliminar archivo ticket {ticket_id}", exc=e)
        return jsonify({'message': f'Error al eliminar archivo: {str(e)}'}), 500

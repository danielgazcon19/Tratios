"""
API Interna de Soporte - Endpoints para instancias SaaS
Permite crear tickets, agregar comentarios y consultar estado

Este módulo actúa como un proxy que:
1. Valida la API Key de la instancia SaaS
2. Invoca los endpoints de admin_soporte_tickets.py que contienen la lógica de negocio
3. Transforma las respuestas a un formato consistente para las instancias

NO duplica lógica de negocio - reutiliza admin_soporte_tickets.py
"""
#Utils
from datetime import datetime
from functools import wraps
from flask import Blueprint, request, jsonify, current_app
import hashlib
from utils.log import AppLogger, LogCategory
from werkzeug.datastructures import ImmutableMultiDict
from flask import make_response
#Models
from models.soporte_suscripcion import SoporteSuscripcion
from models.empresa import Empresa
from models.soporte_ticket import SoporteTicket
# Routes

from routes.admin_soporte_tickets import (
    crear_ticket as admin_crear_ticket,
    listar_tickets as admin_listar_tickets,
    obtener_ticket as admin_obtener_ticket,
    agregar_comentario_admin,
    subir_archivo as admin_subir_archivo,
    descargar_archivo as admin_descargar_archivo
)

api_soporte_bp = Blueprint('api_soporte', __name__, url_prefix='/api/internal/support')


def validar_api_key(fn):
    """
    Decorador para validar API Key de instancias SaaS
    
    Seguridad de Producción:
    - La API Key identifica unívocamente la instancia/empresa
    - No requiere headers adicionales redundantes
    - Validación contra variable de entorno (SAAS_API_KEY)
    - En producción: implementar tabla de API keys en BD con empresa_id asociado
    
    Requiere headers:
    - X-API-Key: <API_KEY> - Clave única de la instancia
    - X-Empresa-Id: <empresa_id> - ID de la empresa (validado contra la API Key)
    """
    @wraps(fn)
    def wrapper(*args, **kwargs):
        api_key = request.headers.get('X-API-Key')
        empresa_id = request.headers.get('X-Empresa-Id')
        
        if not api_key:
            AppLogger.warning(
                LogCategory.SOPORTE,
                'Intento de acceso sin X-API-Key',
                ip=request.remote_addr,
                endpoint=request.endpoint
            )
            return jsonify({'success': False, 'message': 'X-API-Key header requerido'}), 401
        
        if not empresa_id:
            AppLogger.warning(
                LogCategory.SOPORTE,
                'Intento de acceso sin X-Empresa-Id',
                ip=request.remote_addr,
                endpoint=request.endpoint
            )
            return jsonify({'success': False, 'message': 'X-Empresa-Id header requerido'}), 401
        
        # Validar API Key
        # TODO Producción: Implementar tabla api_keys con columnas:
        # - id, api_key (único, indexado), empresa_id, activo, fecha_creacion, ultimo_uso
        # Consultar: SELECT empresa_id FROM api_keys WHERE api_key = ? AND activo = true
        
        # Por ahora: validación contra variable de entorno
        expected_key = current_app.config.get('SAAS_API_KEY')
        
        if not expected_key:
            AppLogger.error(
                LogCategory.SOPORTE,
                'SAAS_API_KEY no configurada en el servidor',
                endpoint=request.endpoint
            )
            return jsonify({'success': False, 'message': 'Configuración de API Key no encontrada'}), 500
        
        if api_key != expected_key:
            AppLogger.warning(
                LogCategory.SOPORTE,
                'Intento de acceso con API Key inválida',
                ip=request.remote_addr,
                endpoint=request.endpoint,
                api_key_prefix=api_key[:8] if len(api_key) >= 8 else 'corta'
            )
            return jsonify({'success': False, 'message': 'API Key inválida'}), 401
        
        # Validar que la empresa existe
        try:
            empresa_id_int = int(empresa_id)
        except ValueError:
            return jsonify({'success': False, 'message': 'X-Empresa-Id debe ser un número'}), 400
        
        empresa = Empresa.query.get(empresa_id_int)
        if not empresa:
            AppLogger.warning(
                LogCategory.SOPORTE,
                'Intento de acceso con empresa_id inexistente',
                empresa_id=empresa_id_int,
                ip=request.remote_addr,
                endpoint=request.endpoint
            )
            return jsonify({'success': False, 'message': 'Empresa no encontrada'}), 404
        
        # TODO Producción: Validar que la API Key pertenece a esta empresa
        # if api_key_record.empresa_id != empresa_id_int:
        #     return jsonify({'success': False, 'message': 'API Key no autorizada para esta empresa'}), 403
        
        # Guardar información en request para uso posterior
        request.empresa_id = empresa_id_int
        
        AppLogger.info(
            LogCategory.SOPORTE,
            'Acceso autorizado a API de soporte',
            empresa_id=empresa_id_int,
            empresa_nombre=empresa.nombre,
            endpoint=request.endpoint,
            ip=request.remote_addr
        )
        
        return fn(*args, **kwargs)
    return wrapper

def obtener_soporte_activo(empresa_id):
    """Obtiene la suscripción de soporte activa de una empresa"""
    hoy = datetime.utcnow().date()
    return SoporteSuscripcion.query.filter(
        SoporteSuscripcion.empresa_id == empresa_id,
        SoporteSuscripcion.estado == 'activo',
        SoporteSuscripcion.fecha_inicio <= hoy
    ).filter(
        (SoporteSuscripcion.fecha_fin.is_(None)) | (SoporteSuscripcion.fecha_fin >= hoy)
    ).first()

@api_soporte_bp.route('/create_tickets', methods=['POST'])
@validar_api_key
def crear_ticket():
    """
    POST /api/internal/support/tickets
    Crea un nuevo ticket de soporte desde una instancia SaaS
    
    Headers requeridos:
    - X-API-Key: <API_KEY>
    - X-Empresa-Id: <empresa_id>
    
    Body:
    {
        "soporte_suscripcion_id": 4,
        "titulo": "Título del ticket",
        "descripcion": "Descripción detallada del problema",
        "usuario_id": 123,  // ID del usuario en la BD principal
        "prioridad": "media",  // baja, media, alta, critica
        "metadata": {
            "origen": "web",
            "version": "1.0.0",
            "url": "https://..."
        }
    }
    """
    try:
        empresa_id = request.empresa_id
        body = request.get_json()
        
        AppLogger.info(
            LogCategory.SOPORTE,
            'Creando ticket desde API externa',
            empresa_id=empresa_id,
            usuario_id=body.get('usuario_id'),
            prioridad=body.get('prioridad', 'media')
        )
        
        # Validar empresa
        empresa = Empresa.query.get(empresa_id)
        if not empresa:
            AppLogger.error(
                LogCategory.SOPORTE,
                'Empresa no encontrada al crear ticket',
                empresa_id=empresa_id
            )
            return jsonify({
                'success': False,
                'message': 'Empresa no encontrada'
            }), 404
        
        # Preparar datos para el endpoint de admin
        # Agregar metadata
        if 'metadata' in body:
            body['metadata']['ip_origen'] = request.remote_addr
        
        # Agregar empresa_id al body
        body['empresa_id'] = empresa_id
        
        # Modificar request.json temporalmente para pasar al endpoint de admin
        original_json = request.get_json(silent=True)
        request._cached_json = (body, body)
        
        # Invocar el endpoint de admin que tiene toda la lógica
        result = admin_crear_ticket()
        
        # Restaurar JSON original
        if original_json is not None:
            request._cached_json = (original_json, original_json)
        
        # Flask retorna tupla (response, status_code), convertir a Response
        if isinstance(result, tuple):
            response = make_response(result[0], result[1])
        else:
            response = result
        
        # Transformar respuesta al formato de la API interna
        if response.status_code == 201:
            data = response.get_json()
            AppLogger.info(
                LogCategory.SOPORTE,
                'Ticket creado exitosamente desde API externa',
                empresa_id=empresa_id,
                ticket_id=data['ticket']['id'],
                titulo=data['ticket'].get('titulo')
            )
            return jsonify({
                'success': True,
                'message': data.get('message', 'Ticket creado exitosamente'),
                'ticket_id': data['ticket']['id'],
                'ticket': data['ticket']
            }), 201
        else:
            data = response.get_json()
            AppLogger.warning(
                LogCategory.SOPORTE,
                'Error al crear ticket desde API externa',
                empresa_id=empresa_id,
                status_code=response.status_code,
                error_message=data.get('message')
            )
            return jsonify({
                'success': False,
                'message': data.get('message', 'Error al crear ticket'),
                'code': data.get('error')
            }), response.status_code
        
    except Exception as e:
        AppLogger.error(
            LogCategory.SOPORTE,
            'Excepción al crear ticket desde API externa',
            empresa_id=request.empresa_id if hasattr(request, 'empresa_id') else None,
            exc=e
        )
        return jsonify({
            'success': False,
            'message': f'Error al crear ticket: {str(e)}'
        }), 500

@api_soporte_bp.route('/tickets', methods=['GET'])
@validar_api_key
def listar_tickets_empresa():
    """
    GET /api/internal/support/tickets
    Lista los tickets de la empresa autenticada
    
    El empresa_id se obtiene automáticamente del header X-Empresa-Id validado.
    Los tickets de otras empresas NO serán accesibles.
    
    Query params opcionales:
    - estado: filtrar por estado (abierto, en_proceso, resuelto, cerrado)
    - prioridad: filtrar por prioridad (baja, media, alta, urgente)
    - usuario_id: filtrar por usuario creador
    - page: página de resultados (default 1)
    - per_page: resultados por página (default 20, max 100)
    """
    try:
        empresa_id = request.empresa_id
        
        # Agregar empresa_id a los query params para FORZAR el filtro
        new_args = dict(request.args)
        new_args['empresa_id'] = str(empresa_id)
        
        # Mapear 'limite' y 'pagina' a 'per_page' y 'page' si vienen
        if 'limite' in new_args:
            new_args['per_page'] = new_args.pop('limite')
        if 'pagina' in new_args:
            new_args['page'] = new_args.pop('pagina')
        
        original_args = request.args
        request.args = ImmutableMultiDict(new_args)
        
        AppLogger.info(
            LogCategory.SOPORTE,
            "Listando tickets para empresa",
            empresa_id=empresa_id,
            args=new_args
        )
        
        # Invocar endpoint de admin (ahora tiene @admin_or_api_key_required)
        result = admin_listar_tickets()
        
        # Restaurar args originales
        request.args = original_args
        
        # Flask retorna tupla (response, status_code), convertir a Response
        if isinstance(result, tuple):
            response = make_response(result[0], result[1])
        else:
            response = result
        
        # Transformar respuesta al formato de la API interna
        if response.status_code == 200:
            data = response.get_json()
            return jsonify({
                'success': True,
                'tickets': data['tickets'],
                'total': data.get('total'),
                'page': data.get('page'),
                'per_page': data.get('per_page'),
                'pages': data.get('pages'),
                'estadisticas': data.get('estadisticas')
            }), 200
        else:
            data = response.get_json()
            return jsonify({
                'success': False,
                'message': data.get('message', 'Error al listar tickets')
            }), response.status_code
        
    except Exception as e:
        AppLogger.error(
            LogCategory.SOPORTE,
            f"Error al listar tickets: {str(e)}",
            empresa_id=request.empresa_id,
            error=str(e)
        )
        return jsonify({
            'success': False,
            'message': f'Error al listar tickets: {str(e)}'
        }), 500


@api_soporte_bp.route('/ticket_id/<int:ticket_id>', methods=['GET'])
@validar_api_key
def obtener_ticket_detalle(ticket_id):
    """
    GET /api/internal/support/ticket_id/:id
    Obtiene un ticket con sus comentarios
    """
    try:
        empresa_id = request.empresa_id
        
        AppLogger.info(
            LogCategory.SOPORTE,
            'Consultando detalle de ticket desde API externa',
            empresa_id=empresa_id,
            ticket_id=ticket_id
        )
        
        # Validar que el ticket pertenece a la empresa antes de invocar
        ticket = SoporteTicket.query.get(ticket_id)
        if not ticket:
            AppLogger.warning(
                LogCategory.SOPORTE,
                'Ticket no encontrado en consulta de detalle',
                ticket_id=ticket_id,
                empresa_id=empresa_id
            )
            return jsonify({
                'success': False,
                'message': 'Ticket no encontrado'
            }), 404
        
        if ticket.empresa_id != empresa_id:
            AppLogger.warning(
                LogCategory.SOPORTE,
                'Intento de acceso a ticket de otra empresa',
                ticket_id=ticket_id,
                empresa_id_solicitante=empresa_id,
                empresa_id_ticket=ticket.empresa_id
            )
            return jsonify({
                'success': False,
                'message': 'No tiene permisos para acceder a este ticket'
            }), 403
        
        # Invocar endpoint de admin
        result = admin_obtener_ticket(ticket_id)
        
        # Flask retorna tupla (response, status_code), convertir a Response
        if isinstance(result, tuple):
            response = make_response(result[0], result[1])
        else:
            response = result
        
        # Transformar respuesta al formato de la API interna
        if response.status_code == 200:
            data = response.get_json()
            return jsonify({
                'success': True,
                'ticket': data
            }), 200
        else:
            data = response.get_json()
            return jsonify({
                'success': False,
                'message': data.get('message', 'Error al obtener ticket')
            }), response.status_code
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Error al obtener ticket: {str(e)}'
        }), 500


@api_soporte_bp.route('/tickets/<int:ticket_id>/comentarios', methods=['POST'])
@validar_api_key
def agregar_comentario(ticket_id):
    """
    POST /api/internal/support/tickets/:id/comentarios
    Agrega un comentario al ticket desde la instancia SaaS
    
    Body (JSON):
    {
        "usuario_id": 123,
        "comentario": "Texto del comentario",
        "es_interno": false
    }
    
    O FormData con archivos:
    - comentario: texto
    - usuario_id: id del usuario
    - es_interno: true/false
    - files: archivos adjuntos
    """
    try:
        empresa_id = request.empresa_id
        
        AppLogger.info(
            LogCategory.SOPORTE,
            'Agregando comentario a ticket desde API externa',
            empresa_id=empresa_id,
            ticket_id=ticket_id
        )
        
        # Validar que el ticket pertenece a la empresa
        ticket = SoporteTicket.query.get(ticket_id)
        if not ticket:
            AppLogger.warning(
                LogCategory.SOPORTE,
                'Ticket no encontrado al agregar comentario',
                ticket_id=ticket_id,
                empresa_id=empresa_id
            )
            return jsonify({
                'success': False,
                'message': 'Ticket no encontrado'
            }), 404
        
        if ticket.empresa_id != empresa_id:
            AppLogger.warning(
                LogCategory.SOPORTE,
                'Intento de comentar en ticket de otra empresa',
                ticket_id=ticket_id,
                empresa_id_solicitante=empresa_id,
                empresa_id_ticket=ticket.empresa_id
            )
            return jsonify({
                'success': False,
                'message': 'No tiene permisos para comentar en este ticket'
            }), 403
        
        # Invocar endpoint de admin
        result = agregar_comentario_admin(ticket_id)
        
        # Flask retorna tupla (response, status_code), convertir a Response
        if isinstance(result, tuple):
            response = make_response(result[0], result[1])
        else:
            response = result
        
        # Transformar respuesta al formato de la API interna
        if response.status_code == 201:
            data = response.get_json()
            return jsonify({
                'success': True,
                'message': data.get('message', 'Comentario agregado exitosamente'),
                'comentario': data.get('comentario')
            }), 201
        else:
            data = response.get_json()
            return jsonify({
                'success': False,
                'message': data.get('message', 'Error al agregar comentario')
            }), response.status_code
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Error al agregar comentario: {str(e)}'
        }), 500


@api_soporte_bp.route('/tickets/<int:ticket_id>/upload', methods=['POST'])
@validar_api_key
def subir_archivos(ticket_id):
    """
    POST /api/internal/support/tickets/:id/upload
    Sube archivos adjuntos a un ticket
    
    FormData:
    - files: archivos a subir (máx 10, 10MB c/u)
    """
    try:
        empresa_id = request.empresa_id
        
        AppLogger.info(
            LogCategory.SOPORTE,
            'Subiendo archivos a ticket desde API externa',
            empresa_id=empresa_id,
            ticket_id=ticket_id
        )
        
        # Validar que el ticket pertenece a la empresa
        ticket = SoporteTicket.query.get(ticket_id)
        if not ticket:
            AppLogger.warning(
                LogCategory.SOPORTE,
                'Ticket no encontrado al subir archivos',
                ticket_id=ticket_id,
                empresa_id=empresa_id
            )
            return jsonify({
                'success': False,
                'message': 'Ticket no encontrado'
            }), 404
        
        if ticket.empresa_id != empresa_id:
            AppLogger.warning(
                LogCategory.SOPORTE,
                'Intento de subir archivos a ticket de otra empresa',
                ticket_id=ticket_id,
                empresa_id_solicitante=empresa_id,
                empresa_id_ticket=ticket.empresa_id
            )
            return jsonify({
                'success': False,
                'message': 'No tiene permisos para subir archivos a este ticket'
            }), 403
        
        # Invocar endpoint de admin
        result = admin_subir_archivo(ticket_id)
        
        # Flask retorna tupla (response, status_code), convertir a Response
        if isinstance(result, tuple):
            response = make_response(result[0], result[1])
        else:
            response = result
        
        # Transformar respuesta al formato de la API interna
        if response.status_code == 200:
            data = response.get_json()
            return jsonify({
                'success': True,
                'message': data.get('message', 'Archivos subidos exitosamente'),
                'archivos_subidos': data.get('archivos_subidos', []),
                'total': data.get('total', 0),
                'errores': data.get('errores', [])
            }), 200
        else:
            data = response.get_json()
            return jsonify({
                'success': False,
                'message': data.get('message', 'Error al subir archivos')
            }), response.status_code
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Error al subir archivos: {str(e)}'
        }), 500


@api_soporte_bp.route('/tickets/<int:ticket_id>/archivos/<filename>', methods=['GET'])
@validar_api_key
def descargar_archivo(ticket_id, filename):
    """
    GET /api/internal/support/tickets/:id/archivos/:filename
    Descarga un archivo adjunto de un ticket
    """
    try:
        empresa_id = request.empresa_id
        
        AppLogger.info(
            LogCategory.SOPORTE,
            'Descargando archivo de ticket desde API externa',
            empresa_id=empresa_id,
            ticket_id=ticket_id,
            filename=filename
        )
        
        # Validar que el ticket pertenece a la empresa
        ticket = SoporteTicket.query.get(ticket_id)
        if not ticket:
            AppLogger.warning(
                LogCategory.SOPORTE,
                'Ticket no encontrado al descargar archivo',
                ticket_id=ticket_id,
                empresa_id=empresa_id,
                filename=filename
            )
            return jsonify({
                'success': False,
                'message': 'Ticket no encontrado'
            }), 404
        
        if ticket.empresa_id != empresa_id:
            AppLogger.warning(
                LogCategory.SOPORTE,
                'Intento de descargar archivo de ticket de otra empresa',
                ticket_id=ticket_id,
                empresa_id_solicitante=empresa_id,
                empresa_id_ticket=ticket.empresa_id,
                filename=filename
            )
            return jsonify({
                'success': False,
                'message': 'No tiene permisos para acceder a los archivos de este ticket'
            }), 403
        
        # Invocar endpoint de admin (este retorna el archivo directamente)
        return admin_descargar_archivo(ticket_id, filename)
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Error al descargar archivo: {str(e)}'
        }), 500


@api_soporte_bp.route('/status', methods=['GET'])
@validar_api_key
def verificar_soporte():
    """
    GET /api/internal/support/status
    Verifica el estado del soporte de la empresa
    """
    try:
        empresa_id = request.empresa_id
        
        AppLogger.info(
            LogCategory.SOPORTE,
            'Verificando estado de soporte desde API externa',
            empresa_id=empresa_id
        )
        
        soporte = obtener_soporte_activo(empresa_id)
        
        if not soporte:
            AppLogger.info(
                LogCategory.SOPORTE,
                'Empresa sin suscripción de soporte activa',
                empresa_id=empresa_id
            )
            return jsonify({
                'success': True,
                'tiene_soporte': False,
                'message': 'No hay suscripción de soporte activa'
            }), 200
        
        # Verificar si puede crear tickets
        puede_crear, mensaje = soporte.puede_crear_ticket()
        
        AppLogger.info(
            LogCategory.SOPORTE,
            'Verificación de soporte exitosa',
            empresa_id=empresa_id,
            tiene_soporte=True,
            tipo_soporte=soporte.tipo_soporte.nombre,
            modalidad=soporte.tipo_soporte.modalidad,
            puede_crear_ticket=puede_crear
        )
        
        return jsonify({
            'success': True,
            'tiene_soporte': True,
            'soporte': {
                'tipo': soporte.tipo_soporte.nombre,
                'modalidad': soporte.tipo_soporte.modalidad,
                'fecha_inicio': soporte.fecha_inicio.isoformat(),
                'fecha_fin': soporte.fecha_fin.isoformat() if soporte.fecha_fin else None,
                'tickets_consumidos': soporte.tickets_consumidos,
                'max_tickets': soporte.tipo_soporte.max_tickets,
                'horas_consumidas': float(soporte.horas_consumidas) if soporte.horas_consumidas else 0,
                'max_horas': soporte.tipo_soporte.max_horas,
                'puede_crear_ticket': puede_crear
            }
        }), 200
        
    except Exception as e:
        AppLogger.error(
            LogCategory.SOPORTE,
            'Error al verificar estado de soporte',
            empresa_id=request.empresa_id if hasattr(request, 'empresa_id') else None,
            exc=e
        )
        return jsonify({
            'success': False,
            'message': f'Error al verificar soporte: {str(e)}'
        }), 500


@api_soporte_bp.route('/health', methods=['GET'])
def health_check():
    """
    GET /api/internal/support/health
    Endpoint de salud para verificar que la API está funcionando
    """
    return jsonify({
        'success': True,
        'message': 'API de soporte funcionando',
        'timestamp': datetime.utcnow().isoformat()
    }), 200

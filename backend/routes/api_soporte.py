"""
API Interna de Soporte - Endpoints para instancias SaaS
Permite crear tickets, agregar comentarios y consultar estado
"""
from datetime import datetime
from functools import wraps
from flask import Blueprint, request, jsonify, current_app
from database.db import db
from models.soporte_ticket import SoporteTicket, SoporteTicketComentario
from models.soporte_suscripcion import SoporteSuscripcion
from models.empresa import Empresa
import hashlib
import hmac

api_soporte_bp = Blueprint('api_soporte', __name__, url_prefix='/api/internal/support')


def validar_api_key(fn):
    """
    Decorador para validar API Key de instancias SaaS
    Requiere headers:
    - Authorization: Bearer <API_KEY>
    - X-Instance-Id: <instance_id>
    - X-Empresa-Id: <empresa_id>
    """
    @wraps(fn)
    def wrapper(*args, **kwargs):
        auth_header = request.headers.get('Authorization', '')
        instance_id = request.headers.get('X-Instance-Id')
        empresa_id = request.headers.get('X-Empresa-Id')
        
        if not auth_header.startswith('Bearer '):
            return jsonify({'success': False, 'message': 'Authorization header requerido'}), 401
        
        api_key = auth_header.replace('Bearer ', '')
        
        if not instance_id:
            return jsonify({'success': False, 'message': 'X-Instance-Id header requerido'}), 401
        
        if not empresa_id:
            return jsonify({'success': False, 'message': 'X-Empresa-Id header requerido'}), 401
        
        # Validar API Key
        # En producción, esto debería verificar contra una tabla de API keys por instancia
        # Por ahora, usamos una validación simple basada en un secret
        secret_key = current_app.config.get('SUPPORT_API_SECRET', 'soporte-secret-key-2025')
        expected_key = hashlib.sha256(f"{instance_id}:{secret_key}".encode()).hexdigest()[:32]
        
        # Para desarrollo, también aceptamos una key fija
        dev_key = current_app.config.get('SUPPORT_API_DEV_KEY', 'dev-support-key-2025')
        
        if api_key != expected_key and api_key != dev_key:
            return jsonify({'success': False, 'message': 'API Key inválida'}), 401
        
        # Guardar información en request para uso posterior
        request.instance_id = instance_id
        request.empresa_id = int(empresa_id)
        
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


@api_soporte_bp.route('/tickets', methods=['POST'])
@validar_api_key
def crear_ticket():
    """
    POST /api/internal/support/tickets
    Crea un nuevo ticket de soporte desde una instancia SaaS
    
    Headers requeridos:
    - Authorization: Bearer <API_KEY>
    - X-Instance-Id: <instance_id>
    - X-Empresa-Id: <empresa_id>
    
    Body:
    {
        "titulo": "Título del ticket",
        "descripcion": "Descripción detallada del problema",
        "usuario_creador_id": 123,  // ID del usuario en la instancia
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
        instance_id = request.instance_id
        body = request.get_json()
        
        # Validar que existe la empresa
        empresa = Empresa.query.get(empresa_id)
        if not empresa:
            return jsonify({
                'success': False,
                'message': 'Empresa no encontrada'
            }), 404
        
        # Verificar suscripción de soporte activa
        soporte_suscripcion = obtener_soporte_activo(empresa_id)
        if not soporte_suscripcion:
            return jsonify({
                'success': False,
                'message': 'No hay suscripción de soporte activa para esta empresa',
                'code': 'NO_ACTIVE_SUPPORT'
            }), 403
        
        # Verificar límites según modalidad
        puede_crear, mensaje = soporte_suscripcion.puede_crear_ticket()
        if not puede_crear:
            return jsonify({
                'success': False,
                'message': mensaje,
                'code': 'TICKET_LIMIT_EXCEEDED',
                'tickets_consumidos': soporte_suscripcion.tickets_consumidos,
                'max_tickets': soporte_suscripcion.tipo_soporte.max_tickets
            }), 403
        
        # Validar datos del ticket
        if not body.get('titulo'):
            return jsonify({'success': False, 'message': 'El título es obligatorio'}), 400
        
        prioridad = body.get('prioridad', 'media')
        if prioridad not in ['baja', 'media', 'alta', 'critica']:
            prioridad = 'media'
        
        # Crear ticket
        extra_data = body.get('metadata', {})
        extra_data['instance_id'] = instance_id
        extra_data['ip_origen'] = request.remote_addr
        extra_data['user_agent'] = request.headers.get('User-Agent', '')
        
        nuevo_ticket = SoporteTicket(
            soporte_suscripcion_id=soporte_suscripcion.id,
            empresa_id=empresa_id,
            usuario_creador_id=body.get('usuario_creador_id'),
            titulo=body['titulo'],
            descripcion=body.get('descripcion'),
            prioridad=prioridad,
            estado='abierto',
            extra_data=extra_data
        )
        
        db.session.add(nuevo_ticket)
        
        # Incrementar contador de tickets si aplica
        if soporte_suscripcion.tipo_soporte.modalidad == 'por_tickets':
            soporte_suscripcion.tickets_consumidos += 1
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Ticket creado exitosamente',
            'ticket_id': nuevo_ticket.id,
            'ticket': {
                'id': nuevo_ticket.id,
                'titulo': nuevo_ticket.titulo,
                'estado': nuevo_ticket.estado,
                'prioridad': nuevo_ticket.prioridad,
                'fecha_creacion': nuevo_ticket.fecha_creacion.isoformat()
            }
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'message': f'Error al crear ticket: {str(e)}'
        }), 500


@api_soporte_bp.route('/tickets', methods=['GET'])
@validar_api_key
def listar_tickets_empresa():
    """
    GET /api/internal/support/tickets
    Lista los tickets de la empresa
    
    Query params:
    - estado: filtrar por estado
    - limite: número máximo de resultados (default 50)
    - pagina: página de resultados (default 1)
    """
    try:
        empresa_id = request.empresa_id
        
        query = SoporteTicket.query.filter_by(empresa_id=empresa_id)
        
        estado = request.args.get('estado')
        if estado:
            query = query.filter_by(estado=estado)
        
        limite = request.args.get('limite', 50, type=int)
        pagina = request.args.get('pagina', 1, type=int)
        
        total = query.count()
        tickets = query.order_by(SoporteTicket.fecha_creacion.desc()) \
                      .offset((pagina - 1) * limite) \
                      .limit(limite) \
                      .all()
        
        return jsonify({
            'success': True,
            'tickets': [{
                'id': t.id,
                'titulo': t.titulo,
                'descripcion': t.descripcion,
                'estado': t.estado,
                'prioridad': t.prioridad,
                'fecha_creacion': t.fecha_creacion.isoformat(),
                'fecha_actualizacion': t.fecha_actualizacion.isoformat() if t.fecha_actualizacion else None,
                'fecha_cierre': t.fecha_cierre.isoformat() if t.fecha_cierre else None,
                'total_comentarios': t.comentarios.count()
            } for t in tickets],
            'total': total,
            'pagina': pagina,
            'limite': limite,
            'paginas': (total + limite - 1) // limite
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Error al listar tickets: {str(e)}'
        }), 500


@api_soporte_bp.route('/tickets/<int:ticket_id>', methods=['GET'])
@validar_api_key
def obtener_ticket(ticket_id):
    """
    GET /api/internal/support/tickets/:id
    Obtiene un ticket con sus comentarios
    """
    try:
        empresa_id = request.empresa_id
        
        ticket = SoporteTicket.query.filter_by(id=ticket_id, empresa_id=empresa_id).first()
        if not ticket:
            return jsonify({
                'success': False,
                'message': 'Ticket no encontrado'
            }), 404
        
        comentarios = ticket.comentarios.order_by(SoporteTicketComentario.fecha_creacion.asc()).all()
        
        return jsonify({
            'success': True,
            'ticket': {
                'id': ticket.id,
                'titulo': ticket.titulo,
                'descripcion': ticket.descripcion,
                'estado': ticket.estado,
                'prioridad': ticket.prioridad,
                'fecha_creacion': ticket.fecha_creacion.isoformat(),
                'fecha_actualizacion': ticket.fecha_actualizacion.isoformat() if ticket.fecha_actualizacion else None,
                'fecha_cierre': ticket.fecha_cierre.isoformat() if ticket.fecha_cierre else None,
                'extra_data': ticket.extra_data,
                'comentarios': [{
                    'id': c.id,
                    'comentario': c.comentario,
                    'es_admin': c.es_admin,
                    'archivos': c.archivos,
                    'fecha_creacion': c.fecha_creacion.isoformat()
                } for c in comentarios]
            }
        }), 200
        
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
    
    Body:
    {
        "usuario_id": 123,
        "comentario": "Texto del comentario",
        "archivos": ["url1", "url2"]  // opcional
    }
    """
    try:
        empresa_id = request.empresa_id
        body = request.get_json()
        
        ticket = SoporteTicket.query.filter_by(id=ticket_id, empresa_id=empresa_id).first()
        if not ticket:
            return jsonify({
                'success': False,
                'message': 'Ticket no encontrado'
            }), 404
        
        if ticket.estado in ['cerrado', 'cancelado']:
            return jsonify({
                'success': False,
                'message': 'No se pueden agregar comentarios a tickets cerrados'
            }), 400
        
        if not body.get('comentario'):
            return jsonify({
                'success': False,
                'message': 'El comentario es obligatorio'
            }), 400
        
        nuevo_comentario = SoporteTicketComentario(
            ticket_id=ticket_id,
            usuario_id=body.get('usuario_id'),
            es_admin=False,
            comentario=body['comentario'],
            archivos=body.get('archivos')
        )
        
        db.session.add(nuevo_comentario)
        
        # Si el ticket estaba pendiente de respuesta, cambiar a en_proceso
        if ticket.estado == 'pendiente_respuesta':
            ticket.estado = 'en_proceso'
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Comentario agregado exitosamente',
            'comentario': {
                'id': nuevo_comentario.id,
                'comentario': nuevo_comentario.comentario,
                'fecha_creacion': nuevo_comentario.fecha_creacion.isoformat()
            }
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'message': f'Error al agregar comentario: {str(e)}'
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
        
        soporte = obtener_soporte_activo(empresa_id)
        
        if not soporte:
            return jsonify({
                'success': True,
                'tiene_soporte': False,
                'message': 'No hay suscripción de soporte activa'
            }), 200
        
        # Verificar si puede crear tickets
        puede_crear, mensaje = soporte.puede_crear_ticket()
        
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

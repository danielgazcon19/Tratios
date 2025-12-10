"""
Rutas de administración para suscripciones de soporte
"""
from datetime import datetime
from flask import Blueprint, request, jsonify
from flask_jwt_extended import get_jwt_identity
from database.db import db
from models.soporte_suscripcion import SoporteSuscripcion
from models.soporte_tipo import SoporteTipo
from models.suscripcion import Suscripcion
from models.empresa import Empresa
from models.usuario import Usuario
from utils.security import admin_required
from utils.log import AppLogger, LogCategory

admin_soporte_suscripciones_bp = Blueprint('admin_soporte_suscripciones', __name__, url_prefix='/admin/soporte-suscripciones')


@admin_soporte_suscripciones_bp.route('', methods=['GET'])
@admin_required
def listar_suscripciones_soporte():
    """
    GET /admin/soporte-suscripciones
    Lista todas las suscripciones de soporte con filtros y paginación
    Query params: 
        - empresa_id, estado, soporte_tipo_id
        - busqueda (busca en empresa y tipo de soporte)
        - page (default: 1), per_page (default: 20)
    """
    try:
        query = SoporteSuscripcion.query
        
        empresa_id = request.args.get('empresa_id', type=int)
        estado = request.args.get('estado')
        soporte_tipo_id = request.args.get('soporte_tipo_id', type=int)
        busqueda = request.args.get('busqueda')
        
        AppLogger.info(
            LogCategory.SOPORTE,
            "Listar suscripciones soporte",
            empresa_id=empresa_id,
            estado=estado,
            soporte_tipo_id=soporte_tipo_id,
            busqueda=busqueda
        )
        
        if empresa_id:
            query = query.filter(SoporteSuscripcion.empresa_id == empresa_id)
        
        if estado:
            query = query.filter(SoporteSuscripcion.estado == estado)
        
        if soporte_tipo_id:
            query = query.filter(SoporteSuscripcion.soporte_tipo_id == soporte_tipo_id)
        
        # Búsqueda general (requiere join con empresa)
        if busqueda:
            from models.empresa import Empresa
            from models.soporte_tipo import SoporteTipo
            query = query.join(Empresa).join(SoporteTipo).filter(
                db.or_(
                    Empresa.nombre.ilike(f'%{busqueda}%'),
                    SoporteTipo.nombre.ilike(f'%{busqueda}%')
                )
            )
        
        # Paginación
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        
        # Limitar per_page a un máximo razonable
        per_page = min(per_page, 100)
        
        # Obtener total antes de paginar
        total = query.count()
        
        # Ordenar y paginar
        suscripciones = query.order_by(SoporteSuscripcion.fecha_creacion.desc()).paginate(
            page=page,
            per_page=per_page,
            error_out=False
        )
        
        AppLogger.info(LogCategory.SOPORTE, "Consulta finalizada", total=total, page=page)
        
        return jsonify({
            'suscripciones': [s.to_dict() for s in suscripciones.items],
            'total': total,
            'page': page,
            'per_page': per_page,
            'pages': suscripciones.pages
        }), 200
    except Exception as e:
        AppLogger.error(LogCategory.SOPORTE, "Error al listar suscripciones soporte", exc=e)
        return jsonify({'message': f'Error al listar suscripciones de soporte: {str(e)}'}), 500


@admin_soporte_suscripciones_bp.route('/<int:id>', methods=['GET'])
@admin_required
def obtener_suscripcion_soporte(id):
    """
    GET /admin/soporte-suscripciones/:id
    Obtiene una suscripción de soporte con todos sus detalles
    """
    try:
        suscripcion = SoporteSuscripcion.query.get(id)
        if not suscripcion:
            return jsonify({'message': 'Suscripción de soporte no encontrada'}), 404
        
        data = suscripcion.to_dict()
        # Incluir estadísticas
        data['total_tickets'] = suscripcion.tickets.count()
        data['tickets_abiertos'] = suscripcion.tickets.filter_by(estado='abierto').count()
        data['total_pagos'] = suscripcion.pagos.count()
        data['monto_pagado'] = float(sum(p.monto for p in suscripcion.pagos.filter_by(estado='exitoso').all()) or 0)
        
        return jsonify(data), 200
    except Exception as e:
        return jsonify({'message': f'Error al obtener suscripción de soporte: {str(e)}'}), 500


@admin_soporte_suscripciones_bp.route('', methods=['POST'])
@admin_required
def crear_suscripcion_soporte():
    """
    POST /admin/soporte-suscripciones
    Crea una nueva suscripción de soporte para una empresa
    Body: {
        suscripcion_id: int,
        empresa_id: int,
        soporte_tipo_id: int,
        fecha_inicio: date,
        fecha_fin?: date,
        notas?: string
    }
    """
    try:
        data = request.get_json()
        current_user_email = get_jwt_identity()
        
        # Obtener el ID del usuario actual
        current_user = Usuario.query.filter_by(email=current_user_email).first()
        if not current_user:
            AppLogger.error(LogCategory.SOPORTE, "Usuario no encontrado", email=current_user_email)
            return jsonify({'message': 'Usuario no encontrado'}), 404
        
        AppLogger.info(
            LogCategory.SOPORTE,
            "Crear suscripción soporte - Inicio",
            usuario_id=current_user.id,
            data=data
        )
        
        # Validaciones
        if not data.get('suscripcion_id'):
            return jsonify({'message': 'suscripcion_id es obligatorio'}), 400
        if not data.get('empresa_id'):
            return jsonify({'message': 'empresa_id es obligatorio'}), 400
        if not data.get('soporte_tipo_id'):
            return jsonify({'message': 'soporte_tipo_id es obligatorio'}), 400
        if not data.get('fecha_inicio'):
            return jsonify({'message': 'fecha_inicio es obligatoria'}), 400
        
        # Verificar que existe la suscripción
        suscripcion = Suscripcion.query.get(data['suscripcion_id'])
        if not suscripcion:
            AppLogger.warning(LogCategory.SOPORTE, "Suscripción no encontrada", suscripcion_id=data['suscripcion_id'])
            return jsonify({'message': 'Suscripción no encontrada'}), 404
        
        # Verificar que existe la empresa
        empresa = Empresa.query.get(data['empresa_id'])
        if not empresa:
            AppLogger.warning(LogCategory.SOPORTE, "Empresa no encontrada", empresa_id=data['empresa_id'])
            return jsonify({'message': 'Empresa no encontrada'}), 404
        
        # Verificar que existe el tipo de soporte
        tipo_soporte = SoporteTipo.query.get(data['soporte_tipo_id'])
        if not tipo_soporte:
            AppLogger.warning(LogCategory.SOPORTE, "Tipo soporte no encontrado", soporte_tipo_id=data['soporte_tipo_id'])
            return jsonify({'message': 'Tipo de soporte no encontrado'}), 404
        if not tipo_soporte.activo:
            AppLogger.warning(LogCategory.SOPORTE, "Tipo soporte inactivo", soporte_tipo_id=data['soporte_tipo_id'])
            return jsonify({'message': 'El tipo de soporte no está activo'}), 400
        
        # Verificar si ya tiene soporte activo
        soporte_existente = SoporteSuscripcion.query.filter_by(
            empresa_id=data['empresa_id'],
            estado='activo'
        ).first()
        if soporte_existente:
            AppLogger.warning(
                LogCategory.SOPORTE, 
                "Empresa ya tiene soporte activo",
                empresa_id=data['empresa_id'],
                soporte_existente_id=soporte_existente.id
            )
            return jsonify({
                'message': 'La empresa ya tiene una suscripción de soporte activa',
                'soporte_existente_id': soporte_existente.id
            }), 400
        
        # Crear suscripción de soporte
        nueva_suscripcion = SoporteSuscripcion(
            suscripcion_id=data['suscripcion_id'],
            empresa_id=data['empresa_id'],
            soporte_tipo_id=data['soporte_tipo_id'],
            fecha_inicio=datetime.fromisoformat(data['fecha_inicio']).date(),
            fecha_fin=datetime.fromisoformat(data['fecha_fin']).date() if data.get('fecha_fin') else None,
            estado='activo',
            precio_actual=tipo_soporte.precio,
            renovacion_automatica=data.get('renovacion_automatica', False),
            notas=data.get('notas'),
            creado_por=current_user.id
        )
        
        db.session.add(nueva_suscripcion)
        db.session.commit()
        
        AppLogger.info(
            LogCategory.SOPORTE,
            "Suscripción soporte creada",
            suscripcion_soporte_id=nueva_suscripcion.id,
            empresa_id=empresa.id,
            tipo_soporte=tipo_soporte.nombre,
            precio=float(tipo_soporte.precio),
            creado_por=current_user.id
        )
        
        return jsonify({
            'message': 'Suscripción de soporte creada exitosamente',
            'suscripcion': nueva_suscripcion.to_dict()
        }), 201
    except Exception as e:
        db.session.rollback()
        AppLogger.error(LogCategory.SOPORTE, "Error al crear suscripción soporte", exc=e, data=data)
        return jsonify({'message': f'Error al crear suscripción de soporte: {str(e)}'}), 500


@admin_soporte_suscripciones_bp.route('/<int:id>', methods=['PUT'])
@admin_required
def actualizar_suscripcion_soporte(id):
    """
    PUT /admin/soporte-suscripciones/:id
    Actualiza una suscripción de soporte
    """
    try:
        suscripcion = SoporteSuscripcion.query.get(id)
        if not suscripcion:
            AppLogger.warning(LogCategory.SOPORTE, "Suscripción soporte no encontrada para actualizar", id=id)
            return jsonify({'message': 'Suscripción de soporte no encontrada'}), 404
        
        data = request.get_json()
        cambios = {}
        
        if 'fecha_inicio' in data:
            suscripcion.fecha_inicio = datetime.fromisoformat(data['fecha_inicio']).date()
            cambios['fecha_inicio'] = data['fecha_inicio']
        if 'fecha_fin' in data:
            suscripcion.fecha_fin = datetime.fromisoformat(data['fecha_fin']).date() if data['fecha_fin'] else None
            cambios['fecha_fin'] = data['fecha_fin']
        if 'estado' in data:
            if data['estado'] not in ['activo', 'vencido', 'cancelado', 'pendiente_pago']:
                return jsonify({'message': 'Estado inválido'}), 400
            cambios['estado_anterior'] = suscripcion.estado
            cambios['estado_nuevo'] = data['estado']
            suscripcion.estado = data['estado']
        if 'renovacion_automatica' in data:
            suscripcion.renovacion_automatica = bool(data['renovacion_automatica'])
            cambios['renovacion_automatica'] = data['renovacion_automatica']
        if 'notas' in data:
            suscripcion.notas = data['notas']
            cambios['notas_actualizada'] = True
        
        db.session.commit()
        
        AppLogger.info(
            LogCategory.SOPORTE,
            "Suscripción soporte actualizada",
            suscripcion_soporte_id=id,
            cambios=cambios
        )
        
        return jsonify({
            'message': 'Suscripción de soporte actualizada exitosamente',
            'suscripcion': suscripcion.to_dict()
        }), 200
    except Exception as e:
        db.session.rollback()
        AppLogger.error(LogCategory.SOPORTE, "Error al actualizar suscripción soporte", exc=e, suscripcion_id=id)
        return jsonify({'message': f'Error al actualizar suscripción de soporte: {str(e)}'}), 500


@admin_soporte_suscripciones_bp.route('/<int:id>/cambiar-estado', methods=['POST'])
@admin_required
def cambiar_estado_suscripcion(id):
    """
    POST /admin/soporte-suscripciones/:id/cambiar-estado
    Cambia el estado de una suscripción de soporte
    Body: { 
        estado: 'activo' | 'vencido' | 'cancelado' | 'pendiente_pago',
        motivo?: string 
    }
    """
    try:
        suscripcion = SoporteSuscripcion.query.get(id)
        if not suscripcion:
            AppLogger.warning(LogCategory.SOPORTE, "Suscripción soporte no encontrada para cambiar estado", id=id)
            return jsonify({'message': 'Suscripción de soporte no encontrada'}), 404
        
        data = request.get_json()
        if not data or 'estado' not in data:
            return jsonify({'message': 'El campo estado es obligatorio'}), 400
        
        nuevo_estado = data['estado']
        estados_validos = ['activo', 'vencido', 'cancelado', 'pendiente_pago']
        
        if nuevo_estado not in estados_validos:
            return jsonify({'message': f'Estado inválido. Estados permitidos: {", ".join(estados_validos)}'}), 400
        
        if suscripcion.estado == nuevo_estado:
            return jsonify({'message': f'La suscripción ya está en estado {nuevo_estado}'}), 400
        
        motivo = data.get('motivo', '')
        estado_anterior = suscripcion.estado
        
        # Mapeo de etiquetas para el log
        etiquetas_estado = {
            'activo': 'Activado',
            'vencido': 'Vencido',
            'cancelado': 'Cancelado',
            'pendiente_pago': 'Pendiente de pago'
        }
        
        suscripcion.estado = nuevo_estado
        
        # Agregar nota con el cambio de estado
        timestamp = datetime.utcnow().strftime("%Y-%m-%d %H:%M")
        nota_cambio = f'\n[{timestamp}] Estado: {estado_anterior} → {nuevo_estado}'
        if motivo:
            nota_cambio += f' - Motivo: {motivo}'
        
        suscripcion.notas = (suscripcion.notas or '') + nota_cambio
        
        db.session.commit()
        
        AppLogger.info(
            LogCategory.SOPORTE,
            f"Suscripción soporte cambió a {nuevo_estado}",
            suscripcion_soporte_id=id,
            estado_anterior=estado_anterior,
            estado_nuevo=nuevo_estado,
            motivo=motivo
        )
        
        return jsonify({
            'message': f'Suscripción de soporte {etiquetas_estado[nuevo_estado].lower()} exitosamente',
            'suscripcion': suscripcion.to_dict()
        }), 200
    except Exception as e:
        db.session.rollback()
        AppLogger.error(LogCategory.SOPORTE, "Error al cambiar estado suscripción soporte", exc=e, suscripcion_id=id)
        return jsonify({'message': f'Error al cambiar estado de suscripción: {str(e)}'}), 500


@admin_soporte_suscripciones_bp.route('/<int:id>/cancelar', methods=['POST'])
@admin_required
def cancelar_suscripcion_soporte(id):
    """
    POST /admin/soporte-suscripciones/:id/cancelar
    Cancela una suscripción de soporte (método legacy, usar /cambiar-estado)
    Body: { motivo?: string }
    """
    try:
        data = request.get_json() or {}
        # Redirigir al nuevo endpoint
        return cambiar_estado_suscripcion(id)
    except Exception as e:
        return jsonify({'message': f'Error al cancelar suscripción de soporte: {str(e)}'}), 500


@admin_soporte_suscripciones_bp.route('/<int:id>/renovar', methods=['POST'])
@admin_required
def renovar_suscripcion_soporte(id):
    """
    POST /admin/soporte-suscripciones/:id/renovar
    Renueva una suscripción de soporte
    Body: { fecha_fin: date, resetear_contadores?: bool }
    """
    try:
        suscripcion = SoporteSuscripcion.query.get(id)
        if not suscripcion:
            return jsonify({'message': 'Suscripción de soporte no encontrada'}), 404
        
        data = request.get_json()
        
        if not data.get('fecha_fin'):
            return jsonify({'message': 'fecha_fin es obligatoria para renovar'}), 400
        
        suscripcion.fecha_fin = datetime.fromisoformat(data['fecha_fin']).date()
        suscripcion.estado = 'activo'
        
        # Opcionalmente resetear contadores
        if data.get('resetear_contadores', False):
            suscripcion.tickets_consumidos = 0
            suscripcion.horas_consumidas = 0
        
        suscripcion.notas = (suscripcion.notas or '') + f'\n[Renovado el {datetime.utcnow().strftime("%Y-%m-%d %H:%M")}]'
        
        db.session.commit()
        
        return jsonify({
            'message': 'Suscripción de soporte renovada exitosamente',
            'suscripcion': suscripcion.to_dict()
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': f'Error al renovar suscripción de soporte: {str(e)}'}), 500


@admin_soporte_suscripciones_bp.route('/por-empresa/<int:empresa_id>', methods=['GET'])
@admin_required
def obtener_soporte_activo_empresa(empresa_id):
    """
    GET /admin/soporte-suscripciones/por-empresa/:empresa_id
    Obtiene la suscripción de soporte activa de una empresa
    """
    try:
        hoy = datetime.utcnow().date()
        print(f"Consultando soporte para empresa {empresa_id} con fecha {hoy}")
        suscripcion = SoporteSuscripcion.query.filter(
            SoporteSuscripcion.empresa_id == empresa_id,
            SoporteSuscripcion.estado == 'activo',
            SoporteSuscripcion.fecha_inicio <= hoy
        ).filter(
            (SoporteSuscripcion.fecha_fin.is_(None)) | (SoporteSuscripcion.fecha_fin >= hoy)
        ).first()
        
        if not suscripcion:
            return jsonify({'message': 'La empresa no tiene soporte activo', 'tiene_soporte': False}), 200
        
        # Incluir información adicional útil para crear tickets
        data = suscripcion.to_dict()
        data['tickets_disponibles'] = None
        data['horas_disponibles'] = None
        
        if suscripcion.tipo_soporte:
            tipo = suscripcion.tipo_soporte
            if tipo.modalidad == 'por_tickets' and tipo.max_tickets:
                data['tickets_disponibles'] = tipo.max_tickets - (suscripcion.tickets_consumidos or 0)
            elif tipo.modalidad == 'por_horas' and tipo.max_horas:
                data['horas_disponibles'] = float(tipo.max_horas) - float(suscripcion.horas_consumidas or 0)
        
        return jsonify({
            'tiene_soporte': True,
            'suscripcion': data
        }), 200
    except Exception as e:
        return jsonify({'message': f'Error al consultar soporte: {str(e)}'}), 500

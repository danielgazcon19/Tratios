"""
Rutas administrativas para gestión de suscripciones
Solo accesibles por usuarios con rol 'admin'
"""
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from sqlalchemy.orm import joinedload
from models.usuario import Usuario
from models.empresa import Empresa
from models.plan import Plan
from models.suscripcion import Suscripcion
from database.db import db
from datetime import datetime, timedelta
from functools import wraps
from utils.log import AppLogger, LogCategory

admin_suscripciones_bp = Blueprint('admin_suscripciones', __name__)

def admin_required(fn):
    """Decorador para verificar que el usuario sea admin"""
    @wraps(fn)
    @jwt_required()
    def wrapper(*args, **kwargs):
        current_user_email = get_jwt_identity()
        usuario = Usuario.query.filter_by(email=current_user_email).first()
        
        if not usuario or usuario.rol != 'admin':
            return jsonify({'message': 'Acceso denegado. Se requieren permisos de administrador.'}), 403
        
        return fn(*args, **kwargs)
    return wrapper


@admin_suscripciones_bp.route('/suscripciones', methods=['GET'])
@admin_required
def listar_suscripciones():
    """
    GET /admin/suscripciones
    Lista todas las suscripciones con filtros opcionales
    Query params: ?estado=activa&empresa_id=1&nit=123456789
    """
    try:
        # Usar joinedload para cargar las relaciones
        query = Suscripcion.query.options(
            joinedload(Suscripcion.empresa),
            joinedload(Suscripcion.plan)
        )
        
        # Filtros opcionales
        estado = request.args.get('estado')
        empresa_id = request.args.get('empresa_id', type=int)
        nit = request.args.get('nit')
        
        # Log de solicitud
        AppLogger.info(
            LogCategory.SUSCRIPCIONES, 
            "Listar suscripciones",
            estado=estado,
            empresa_id=empresa_id,
            nit=nit
        )
        
        # Aplicar filtros
        if estado:
            query = query.filter(Suscripcion.estado == estado)
            
        if empresa_id:
            query = query.filter(Suscripcion.empresa_id == empresa_id)
            
        if nit:
            # Buscar empresa por NIT y filtrar por su ID
            empresa = Empresa.query.filter_by(nit=nit).first()
            if empresa:
                query = query.filter(Suscripcion.empresa_id == empresa.id)
            else:
                AppLogger.warning(LogCategory.SUSCRIPCIONES, "Empresa no encontrada por NIT", nit=nit)
                return jsonify([]), 200
        
        suscripciones = query.order_by(Suscripcion.creado_en.desc()).all()
        
        AppLogger.info(
            LogCategory.SUSCRIPCIONES, 
            "Consulta finalizada",
            total_resultados=len(suscripciones)
        )
        
        resultado = []
        for suscripcion in suscripciones:
            resultado.append(suscripcion.to_dict())
        
        return jsonify(resultado), 200
    
    except Exception as e:
        AppLogger.error(LogCategory.SUSCRIPCIONES, f"Error al listar suscripciones", exc=e)
        return jsonify({'message': f'Error al listar suscripciones: {str(e)}'}), 500


@admin_suscripciones_bp.route('/suscripciones', methods=['POST'])
@admin_required
def crear_suscripcion():
    """
    POST /admin/suscripciones
    Asigna un plan a una empresa (crea una nueva suscripción)
    
    Body: {
        empresa_id: int,
        plan_id: int,
        periodo: 'mensual' | 'anual',
        fecha_inicio?: date (opcional, default: hoy),
        forma_pago?: string,
        notas?: string,
        porcentaje_descuento?: float (0-100, opcional, default: 0)
    }
    """
    try:
        data = request.get_json()
        current_user_email = get_jwt_identity()
        
        # Obtener el usuario actual para conseguir su ID
        current_user = Usuario.query.filter_by(email=current_user_email).first()
        if not current_user:
            return jsonify({'message': 'Usuario no encontrado'}), 404
        
        # Validaciones
        if not data.get('empresa_id') or not data.get('plan_id'):
            return jsonify({'message': 'empresa_id y plan_id son obligatorios'}), 400
        
        if data.get('periodo') not in ['mensual', 'anual']:
            return jsonify({'message': 'periodo debe ser "mensual" o "anual"'}), 400
        
        # Verificar que exista la empresa
        empresa = Empresa.query.get(data['empresa_id'])
        if not empresa:
            return jsonify({'message': 'Empresa no encontrada'}), 404
        
        # Verificar que exista el plan
        plan = Plan.query.get(data['plan_id'])
        if not plan:
            return jsonify({'message': 'Plan no encontrado'}), 404
        
        # Verificar si ya tiene una suscripción activa con el mismo plan
        suscripcion_existente = Suscripcion.query.filter_by(
            empresa_id=data['empresa_id'],
            plan_id=data['plan_id'],
            estado='activa'
        ).first()
        
        if suscripcion_existente:
            return jsonify({
                'message': 'La empresa ya tiene una suscripción activa con este plan'
            }), 409
        
        # Calcular fechas
        fecha_inicio = data.get('fecha_inicio')
        if fecha_inicio:
            fecha_inicio = datetime.fromisoformat(fecha_inicio)
        else:
            fecha_inicio = datetime.utcnow()
        
        # Calcular fecha fin según periodo
        if data['periodo'] == 'mensual':
            fecha_fin = fecha_inicio + timedelta(days=30)
            precio_pagado = plan.precio_mensual
        else:  # anual
            fecha_fin = fecha_inicio + timedelta(days=365)
            precio_pagado = plan.precio_anual
        
        # Validar y obtener porcentaje de descuento
        porcentaje_descuento = data.get('porcentaje_descuento', 0)
        try:
            porcentaje_descuento = float(porcentaje_descuento)
            if porcentaje_descuento < 0 or porcentaje_descuento > 100:
                return jsonify({'message': 'El porcentaje de descuento debe estar entre 0 y 100'}), 400
        except (TypeError, ValueError):
            porcentaje_descuento = 0
        
        # Crear nueva suscripción
        nueva_suscripcion = Suscripcion(
            empresa_id=data['empresa_id'],
            plan_id=data['plan_id'],
            fecha_inicio=fecha_inicio,
            fecha_fin=fecha_fin,
            estado='activa',
            periodo=data['periodo'],
            precio_pagado=precio_pagado,
            porcentaje_descuento=porcentaje_descuento,
            renovacion_automatica=data.get('renovacion_automatica', False),
            forma_pago=data.get('forma_pago'),
            creado_por=current_user.id,
            notas=data.get('notas')
        )
        
        db.session.add(nueva_suscripcion)
        db.session.commit()
        
        AppLogger.info(
            LogCategory.SUSCRIPCIONES, 
            "Suscripción creada",
            suscripcion_id=nueva_suscripcion.id,
            empresa_id=data['empresa_id'],
            plan_id=data['plan_id'],
            periodo=data['periodo'],
            precio=precio_pagado,
            descuento=porcentaje_descuento,
            creado_por=current_user.id
        )
        
        # El to_dict() ahora incluye empresa y plan automáticamente
        return jsonify({
            'message': 'Suscripción creada exitosamente',
            'suscripcion': nueva_suscripcion.to_dict()
        }), 201
    
    except Exception as e:
        db.session.rollback()
        AppLogger.error(LogCategory.SUSCRIPCIONES, "Error al crear suscripción", exc=e)
        return jsonify({'message': f'Error al crear suscripción: {str(e)}'}), 500


@admin_suscripciones_bp.route('/suscripciones/<int:suscripcion_id>/renovar', methods=['POST'])
@admin_required
def renovar_suscripcion(suscripcion_id):
    """
    POST /admin/suscripciones/:id/renovar
    Renueva una suscripción (crea un nuevo registro con mismos datos)
    
    Body: {
        periodo?: 'mensual' | 'anual' (opcional, usa el periodo anterior),
        fecha_inicio?: date (opcional, default: fecha_fin anterior o hoy),
        notas?: string,
        años?: int (1-5, solo para anual, default: 1),
        porcentaje_descuento?: float (0-100, descuento por multi-año)
    }
    """
    try:
        suscripcion_anterior = Suscripcion.query.get(suscripcion_id)
        if not suscripcion_anterior:
            return jsonify({'message': 'Suscripción no encontrada'}), 404
        
        data = request.get_json() or {}
        current_user_id = get_jwt_identity()
        
        # Verificar si la empresa ya tiene una suscripción activa diferente
        empresa_id = suscripcion_anterior.empresa_id
        suscripcion_activa_existente = Suscripcion.query.filter(
            Suscripcion.empresa_id == empresa_id,
            Suscripcion.estado == 'activa',
            Suscripcion.id != suscripcion_id
        ).first()
        
        # Si hay una suscripción activa y estamos renovando una inactiva, desactivar la activa
        if suscripcion_activa_existente and suscripcion_anterior.estado != 'activa':
            suscripcion_activa_existente.estado = 'inactiva'
            suscripcion_activa_existente.notas = (suscripcion_activa_existente.notas or '') + \
                f'\n[Desactivada automáticamente al renovar suscripción #{suscripcion_id}]'
        
        # Usar periodo de la suscripción anterior si no se especifica
        periodo = data.get('periodo', suscripcion_anterior.periodo)
        if periodo not in ['mensual', 'anual']:
            return jsonify({'message': 'periodo debe ser "mensual" o "anual"'}), 400
        
        # Obtener años para renovación anual (default: 1)
        anos = data.get('años', 1)
        if periodo == 'anual':
            if not isinstance(anos, int) or anos < 1 or anos > 5:
                return jsonify({'message': 'años debe ser un entero entre 1 y 5'}), 400
        else:
            anos = 1  # Mensual siempre es 1
        
        # Calcular fechas
        fecha_inicio = data.get('fecha_inicio')
        if fecha_inicio:
            fecha_inicio = datetime.fromisoformat(fecha_inicio)
        elif suscripcion_anterior.fecha_fin:
            # Empezar desde donde terminó la anterior
            fecha_inicio = suscripcion_anterior.fecha_fin
        else:
            fecha_inicio = datetime.utcnow()
        
        # Calcular fecha fin según periodo y años
        plan = suscripcion_anterior.plan
        if periodo == 'mensual':
            fecha_fin = fecha_inicio + timedelta(days=30)
            precio_base = plan.precio_mensual
            porcentaje_descuento = 0
        else:  # anual
            fecha_fin = fecha_inicio + timedelta(days=365 * anos)
            precio_base = plan.precio_anual * anos
            # Descuento progresivo: (años - 1) * 1%
            porcentaje_descuento = data.get('porcentaje_descuento', (anos - 1) if anos > 1 else 0)
            porcentaje_descuento = max(0, min(porcentaje_descuento, 100))  # Limitar entre 0 y 100
        
        # Calcular precio con descuento
        precio_pagado = precio_base * (1 - porcentaje_descuento / 100) if porcentaje_descuento > 0 else precio_base
        
        # Marcar la anterior como inactiva si estaba activa
        if suscripcion_anterior.estado == 'activa':
            suscripcion_anterior.estado = 'inactiva'
        
        # Generar notas con información del descuento
        notas_base = data.get('notas', f'Renovación de suscripción #{suscripcion_id}')
        if periodo == 'anual' and anos > 1:
            notas_base += f'\n[Renovación multi-año: {anos} años con {porcentaje_descuento}% de descuento adicional]'
        
        # Crear nueva suscripción (renovación)
        nueva_suscripcion = Suscripcion(
            empresa_id=suscripcion_anterior.empresa_id,
            plan_id=suscripcion_anterior.plan_id,
            fecha_inicio=fecha_inicio,
            fecha_fin=fecha_fin,
            estado='activa',
            periodo=periodo,
            precio_pagado=precio_pagado,
            porcentaje_descuento=porcentaje_descuento,
            renovacion_automatica=data.get('renovacion_automatica', suscripcion_anterior.renovacion_automatica),
            forma_pago=suscripcion_anterior.forma_pago,
            creado_por=current_user_id,
            notas=notas_base
        )
        
        db.session.add(nueva_suscripcion)
        db.session.commit()
        
        AppLogger.info(
            LogCategory.SUSCRIPCIONES, 
            "Suscripción renovada",
            nueva_suscripcion_id=nueva_suscripcion.id,
            suscripcion_anterior_id=suscripcion_id,
            empresa_id=suscripcion_anterior.empresa_id,
            periodo=periodo,
            anos=anos,
            descuento=porcentaje_descuento
        )
        
        return jsonify({
            'message': 'Suscripción renovada exitosamente',
            'suscripcion': nueva_suscripcion.to_dict()
        }), 201
    
    except Exception as e:
        db.session.rollback()
        AppLogger.error(LogCategory.SUSCRIPCIONES, "Error al renovar suscripción", exc=e, suscripcion_id=suscripcion_id)
        return jsonify({'message': f'Error al renovar suscripción: {str(e)}'}), 500


@admin_suscripciones_bp.route('/suscripciones/<int:suscripcion_id>/cancelar', methods=['POST'])
@admin_required
def cancelar_suscripcion(suscripcion_id):
    """
    POST /admin/suscripciones/:id/cancelar
    Cancela una suscripción activa
    
    Body: {
        motivo: string (obligatorio),
        notas?: string
    }
    """
    try:
        suscripcion = Suscripcion.query.get(suscripcion_id)
        if not suscripcion:
            return jsonify({'message': 'Suscripción no encontrada'}), 404
        
        if suscripcion.estado == 'cancelada':
            return jsonify({'message': 'La suscripción ya está cancelada'}), 400
        
        data = request.get_json()
        if not data.get('motivo'):
            return jsonify({'message': 'El motivo de cancelación es obligatorio'}), 400
        
        # Cancelar suscripción
        suscripcion.estado = 'cancelada'
        suscripcion.motivo_cancelacion = data['motivo']
        
        if data.get('notas'):
            # Agregar notas a las existentes
            if suscripcion.notas:
                suscripcion.notas += f"\n\n[Cancelación] {data['notas']}"
            else:
                suscripcion.notas = f"[Cancelación] {data['notas']}"
        
        db.session.commit()
        
        AppLogger.info(
            LogCategory.SUSCRIPCIONES, 
            "Suscripción cancelada",
            suscripcion_id=suscripcion_id,
            empresa_id=suscripcion.empresa_id,
            motivo=data['motivo']
        )
        
        return jsonify({
            'message': 'Suscripción cancelada exitosamente',
            'suscripcion': suscripcion.to_dict()
        }), 200
    
    except Exception as e:
        db.session.rollback()
        AppLogger.error(LogCategory.SUSCRIPCIONES, "Error al cancelar suscripción", exc=e, suscripcion_id=suscripcion_id)
        return jsonify({'message': f'Error al cancelar suscripción: {str(e)}'}), 500


@admin_suscripciones_bp.route('/suscripciones/<int:suscripcion_id>/suspender', methods=['POST'])
@admin_required
def suspender_suscripcion(suscripcion_id):
    """
    POST /admin/suscripciones/:id/suspender
    Suspende temporalmente una suscripción
    
    Body: {
        motivo: string (obligatorio),
        notas?: string
    }
    """
    try:
        suscripcion = Suscripcion.query.get(suscripcion_id)
        if not suscripcion:
            return jsonify({'message': 'Suscripción no encontrada'}), 404
        
        if suscripcion.estado != 'activa':
            return jsonify({'message': 'Solo se pueden suspender suscripciones activas'}), 400
        
        data = request.get_json()
        if not data.get('motivo'):
            return jsonify({'message': 'El motivo de suspensión es obligatorio'}), 400
        
        # Suspender suscripción
        suscripcion.estado = 'suspendida'
        
        if data.get('notas'):
            # Agregar notas a las existentes
            if suscripcion.notas:
                suscripcion.notas += f"\n\n[Suspensión] {data['motivo']}: {data['notas']}"
            else:
                suscripcion.notas = f"[Suspensión] {data['motivo']}: {data['notas']}"
        
        db.session.commit()
        
        return jsonify({
            'message': 'Suscripción suspendida exitosamente',
            'suscripcion': suscripcion.to_dict()
        }), 200
    
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': f'Error al suspender suscripción: {str(e)}'}), 500


@admin_suscripciones_bp.route('/suscripciones/<int:suscripcion_id>/reactivar', methods=['POST'])
@admin_required
def reactivar_suscripcion(suscripcion_id):
    """
    POST /admin/suscripciones/:id/reactivar
    Reactiva una suscripción suspendida
    
    Body: {
        notas?: string
    }
    """
    try:
        suscripcion = Suscripcion.query.get(suscripcion_id)
        if not suscripcion:
            return jsonify({'message': 'Suscripción no encontrada'}), 404
        
        if suscripcion.estado != 'suspendida':
            return jsonify({'message': 'Solo se pueden reactivar suscripciones suspendidas'}), 400
        
        data = request.get_json() or {}
        
        # Reactivar suscripción
        suscripcion.estado = 'activa'
        
        if data.get('notas'):
            # Agregar notas a las existentes
            if suscripcion.notas:
                suscripcion.notas += f"\n\n[Reactivación] {data['notas']}"
            else:
                suscripcion.notas = f"[Reactivación] {data['notas']}"
        
        db.session.commit()
        
        return jsonify({
            'message': 'Suscripción reactivada exitosamente',
            'suscripcion': suscripcion.to_dict()
        }), 200
    
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': f'Error al reactivar suscripción: {str(e)}'}), 500


@admin_suscripciones_bp.route('/suscripciones/<int:suscripcion_id>/descuento', methods=['POST'])
@admin_required
def aplicar_descuento(suscripcion_id):
    """
    POST /admin/suscripciones/:id/descuento
    Aplica o modifica el descuento de una suscripción (retención de clientes)
    
    Body: {
        porcentaje: float (0-100),
        motivo?: string (razón del descuento)
    }
    """
    try:
        suscripcion = Suscripcion.query.get(suscripcion_id)
        if not suscripcion:
            return jsonify({'message': 'Suscripción no encontrada'}), 404
        
        if suscripcion.estado not in ['activa', 'suspendida']:
            return jsonify({'message': 'Solo se puede aplicar descuento a suscripciones activas o suspendidas'}), 400
        
        data = request.get_json()
        if data.get('porcentaje') is None:
            return jsonify({'message': 'El porcentaje de descuento es obligatorio'}), 400
        
        try:
            porcentaje = float(data['porcentaje'])
            if porcentaje < 0 or porcentaje > 100:
                return jsonify({'message': 'El porcentaje debe estar entre 0 y 100'}), 400
        except (TypeError, ValueError):
            return jsonify({'message': 'El porcentaje debe ser un número válido'}), 400
        
        # Aplicar descuento
        porcentaje_anterior = suscripcion.porcentaje_descuento or 0
        suscripcion.porcentaje_descuento = porcentaje
        
        # Obtener usuario que aplica el descuento
        current_user_email = get_jwt_identity()
        admin_usuario = Usuario.query.filter_by(email=current_user_email).first()
        admin_nombre = admin_usuario.nombre if admin_usuario else current_user_email
        
        # Registrar en notas con fecha, hora y usuario
        motivo = data.get('motivo', 'Retención de cliente')
        fecha_hora = datetime.utcnow().strftime('%d/%m/%Y %H:%M')
        precio_original = suscripcion.precio_pagado or 0
        precio_con_dto = round(precio_original * (1 - porcentaje / 100), 2)
        
        nota_descuento = f"""[Descuento aplicado]
📅 Fecha: {fecha_hora}
👤 Aplicado por: {admin_nombre}
📊 Porcentaje: {porcentaje}% (anterior: {porcentaje_anterior}%)
💰 Precio: ${precio_original:,.0f} → ${precio_con_dto:,.0f}
📝 Motivo: {motivo}"""
        
        if suscripcion.notas:
            suscripcion.notas += f"\n\n{'='*40}\n{nota_descuento}"
        else:
            suscripcion.notas = nota_descuento
        
        db.session.commit()
        
        return jsonify({
            'message': f'Descuento del {porcentaje}% aplicado exitosamente',
            'suscripcion': suscripcion.to_dict(),
            'precio_original': suscripcion.precio_pagado,
            'precio_con_descuento': suscripcion.calcular_precio_con_descuento()
        }), 200
    
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': f'Error al aplicar descuento: {str(e)}'}), 500


@admin_suscripciones_bp.route('/suscripciones/estadisticas', methods=['GET'])
@admin_required
def estadisticas_suscripciones():
    """
    GET /admin/suscripciones/estadisticas
    Devuelve estadísticas de suscripciones
    """
    try:
        total = Suscripcion.query.count()
        activas = Suscripcion.query.filter_by(estado='activa').count()
        suspendidas = Suscripcion.query.filter_by(estado='suspendida').count()
        canceladas = Suscripcion.query.filter_by(estado='cancelada').count()
        inactivas = Suscripcion.query.filter_by(estado='inactiva').count()
        
        # Suscripciones por plan
        from sqlalchemy import func
        por_plan = db.session.query(
            Plan.nombre,
            func.count(Suscripcion.id).label('cantidad')
        ).join(Suscripcion).group_by(Plan.nombre).all()
        
        return jsonify({
            'total': total,
            'activas': activas,
            'suspendidas': suspendidas,
            'canceladas': canceladas,
            'inactivas': inactivas,
            'por_plan': [{'plan': nombre, 'cantidad': cantidad} for nombre, cantidad in por_plan]
        }), 200
    
    except Exception as e:
        return jsonify({'message': f'Error al obtener estadísticas: {str(e)}'}), 500

"""
Rutas de administración para tickets de soporte
"""
import os
from datetime import datetime
from flask import Blueprint, request, jsonify, send_file, current_app
from flask_jwt_extended import get_jwt_identity
from werkzeug.utils import secure_filename
from database.db import db
from models.soporte_ticket import SoporteTicket, SoporteTicketComentario
from models.soporte_suscripcion import SoporteSuscripcion
from models.usuario import Usuario
from utils.security import admin_required
from utils.log import AppLogger, LogCategory
from utils.file_handler import (
    allowed_file, validate_file_size, get_upload_path,
    generate_unique_filename, get_file_info, delete_ticket_files,
    MAX_FILE_SIZE, get_file_size_mb
)

admin_soporte_tickets_bp = Blueprint('admin_soporte_tickets', __name__, url_prefix='/admin/soporte-tickets')


@admin_soporte_tickets_bp.route('', methods=['GET'])
@admin_required
def listar_tickets():
    """
    GET /admin/soporte-tickets
    Lista todos los tickets con filtros
    Query params: empresa_id, estado, prioridad, asignado_a
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
        
        # Ordenar por prioridad y fecha
        prioridad_orden = {
            'critica': 1, 'alta': 2, 'media': 3, 'baja': 4
        }
        tickets = query.order_by(SoporteTicket.fecha_creacion.desc()).all()
        
        # Ordenar por prioridad en Python (más flexible)
        tickets.sort(key=lambda t: (
            0 if t.estado in ['abierto', 'en_proceso'] else 1,
            prioridad_orden.get(t.prioridad, 5)
        ))
        
        return jsonify({
            'tickets': [t.to_dict() for t in tickets],
            'total': len(tickets),
            'estadisticas': {
                'abiertos': sum(1 for t in tickets if t.estado == 'abierto'),
                'en_proceso': sum(1 for t in tickets if t.estado == 'en_proceso'),
                'pendiente_respuesta': sum(1 for t in tickets if t.estado == 'pendiente_respuesta'),
                'cerrados': sum(1 for t in tickets if t.estado == 'cerrado'),
                'criticos': sum(1 for t in tickets if t.prioridad == 'critica' and t.estado not in ['cerrado', 'cancelado'])
            }
        }), 200
    except Exception as e:
        return jsonify({'message': f'Error al listar tickets: {str(e)}'}), 500


@admin_soporte_tickets_bp.route('/<int:ticket_id>', methods=['GET'])
@admin_required
def obtener_ticket(ticket_id):
    """
    GET /admin/soporte-tickets/:id
    Obtiene un ticket con todos sus comentarios
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
        current_user_id = get_jwt_identity()
        cambios = []
        
        if 'estado' in data:
            if data['estado'] not in ['abierto', 'en_proceso', 'pendiente_respuesta', 'cerrado', 'cancelado']:
                return jsonify({'message': 'Estado inválido'}), 400
            estado_anterior = ticket.estado
            ticket.estado = data['estado']
            cambios.append(f'Estado: {estado_anterior} → {data["estado"]}')
            
            if data['estado'] == 'cerrado':
                ticket.fecha_cierre = datetime.utcnow()
        
        if 'prioridad' in data:
            if data['prioridad'] not in ['baja', 'media', 'alta', 'critica']:
                return jsonify({'message': 'Prioridad inválida'}), 400
            prioridad_anterior = ticket.prioridad
            ticket.prioridad = data['prioridad']
            cambios.append(f'Prioridad: {prioridad_anterior} → {data["prioridad"]}')
        
        if 'asignado_a' in data:
            if data['asignado_a'] is not None:
                admin = Usuario.query.get(data['asignado_a'])
                if not admin or admin.rol != 'admin':
                    return jsonify({'message': 'El usuario asignado debe ser un administrador'}), 400
            ticket.asignado_a = data['asignado_a']
            cambios.append(f'Asignado a: {admin.nombre if data["asignado_a"] else "Sin asignar"}')
        
        # Registrar cambios como comentario del sistema
        if cambios:
            comentario_sistema = SoporteTicketComentario(
                ticket_id=ticket_id,
                es_admin=True,
                admin_id=current_user_id,
                comentario=f'[Sistema] Cambios realizados:\n' + '\n'.join(cambios)
            )
            db.session.add(comentario_sistema)
        
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
@admin_required
def agregar_comentario_admin(ticket_id):
    """
    POST /admin/soporte-tickets/:id/comentarios
    Agrega un comentario de administrador al ticket
    Body: { comentario: string, archivos?: array }
    """
    try:
        ticket = SoporteTicket.query.get(ticket_id)
        if not ticket:
            return jsonify({'message': 'Ticket no encontrado'}), 404
        
        data = request.get_json()
        current_user_id = get_jwt_identity()
        
        if not data.get('comentario'):
            return jsonify({'message': 'El comentario es obligatorio'}), 400
        
        nuevo_comentario = SoporteTicketComentario(
            ticket_id=ticket_id,
            es_admin=True,
            admin_id=current_user_id,
            comentario=data['comentario'],
            archivos=data.get('archivos')
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
        
        data = request.get_json() or {}
        current_user_id = get_jwt_identity()
        
        ticket.estado = 'cerrado'
        ticket.fecha_cierre = datetime.utcnow()
        
        # Agregar comentario de cierre
        motivo = data.get('motivo', 'Ticket cerrado por administrador')
        comentario_cierre = SoporteTicketComentario(
            ticket_id=ticket_id,
            es_admin=True,
            admin_id=current_user_id,
            comentario=f'[Cierre] {motivo}'
        )
        db.session.add(comentario_cierre)
        
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
        current_user_id = get_jwt_identity()
        
        ticket.estado = 'abierto'
        ticket.fecha_cierre = None
        
        motivo = data.get('motivo', 'Ticket reabierto por administrador')
        comentario_reapertura = SoporteTicketComentario(
            ticket_id=ticket_id,
            es_admin=True,
            admin_id=current_user_id,
            comentario=f'[Reapertura] {motivo}'
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
            'criticos': criticos,
            'sin_asignar': sin_asignar,
            'activos': abiertos + en_proceso + pendiente_respuesta
        }), 200
    except Exception as e:
        return jsonify({'message': f'Error al obtener estadísticas: {str(e)}'}), 500


@admin_soporte_tickets_bp.route('/<int:ticket_id>/upload', methods=['POST'])
@admin_required
def subir_archivo(ticket_id):
    """
    POST /admin/soporte-tickets/:id/upload
    Sube archivos adjuntos para un ticket
    Form-data: files (multiple files)
    """
    try:
        ticket = SoporteTicket.query.get(ticket_id)
        if not ticket:
            return jsonify({'message': 'Ticket no encontrado'}), 404
        
        # Verificar que se envíen archivos
        if 'files' not in request.files:
            return jsonify({'message': 'No se enviaron archivos'}), 400
        
        files = request.files.getlist('files')
        if not files or all(f.filename == '' for f in files):
            return jsonify({'message': 'No se seleccionaron archivos'}), 400
        
        # Validar número de archivos (máximo 10 por carga)
        if len(files) > 10:
            return jsonify({'message': 'Máximo 10 archivos por carga'}), 400
        
        # Inicializar extra_data si no existe
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
                
                ticket.extra_data['archivos'].append(file_info)
                archivos_subidos.append(file_info)
                
                AppLogger.info(
                    LogCategory.SOPORTE,
                    f"Archivo subido para ticket {ticket_id}",
                    filename=file.filename,
                    size_mb=file_info['tamano_mb']
                )
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
@admin_required
def descargar_archivo(ticket_id, filename):
    """
    GET /admin/soporte-tickets/:id/archivo/:filename
    Descarga un archivo adjunto del ticket
    """
    try:
        ticket = SoporteTicket.query.get(ticket_id)
        if not ticket:
            return jsonify({'message': 'Ticket no encontrado'}), 404
        
        # Verificar que el archivo existe en extra_data
        if not ticket.extra_data or 'archivos' not in ticket.extra_data:
            return jsonify({'message': 'El ticket no tiene archivos adjuntos'}), 404
        
        archivo_encontrado = None
        for archivo in ticket.extra_data['archivos']:
            if archivo.get('nombre') == filename:
                archivo_encontrado = archivo
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

"""
Utilidad para manejo de archivos de tickets
"""
import os
import uuid
from datetime import datetime
from werkzeug.utils import secure_filename
from flask import current_app

# Tipos de archivo permitidos (extensiones)
ALLOWED_EXTENSIONS = {
    'images': {'png', 'jpg', 'jpeg', 'gif', 'webp'},
    'documents': {'pdf', 'doc', 'docx', 'xls', 'xlsx', 'txt', 'csv'},
    'compressed': {'zip', 'rar', '7z'},
    'logs': {'log', 'txt', 'json'}
}

# Tamaño máximo por archivo (10 MB)
MAX_FILE_SIZE = 10 * 1024 * 1024

# Tamaño máximo total por ticket (50 MB)
MAX_TOTAL_SIZE_PER_TICKET = 50 * 1024 * 1024


def get_all_allowed_extensions():
    """Retorna todas las extensiones permitidas"""
    extensions = set()
    for category in ALLOWED_EXTENSIONS.values():
        extensions.update(category)
    return extensions


def allowed_file(filename):
    """Verifica si la extensión del archivo está permitida"""
    if '.' not in filename:
        return False
    extension = filename.rsplit('.', 1)[1].lower()
    return extension in get_all_allowed_extensions()


def get_file_category(filename):
    """Determina la categoría del archivo basado en su extensión"""
    if '.' not in filename:
        return 'other'
    extension = filename.rsplit('.', 1)[1].lower()
    
    for category, extensions in ALLOWED_EXTENSIONS.items():
        if extension in extensions:
            return category
    return 'other'


def get_upload_path(ticket_id):
    """Genera la ruta de almacenamiento para archivos de un ticket"""
    base_path = current_app.config.get('UPLOAD_FOLDER', 'uploads')
    ticket_path = os.path.join(base_path, 'tickets', str(ticket_id))
    
    # Crear directorio si no existe
    os.makedirs(ticket_path, exist_ok=True)
    
    return ticket_path


def generate_unique_filename(original_filename):
    """Genera un nombre de archivo único manteniendo la extensión original"""
    filename = secure_filename(original_filename)
    name, ext = os.path.splitext(filename)
    unique_id = uuid.uuid4().hex[:8]
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    return f"{name}_{timestamp}_{unique_id}{ext}"


def get_file_size_mb(size_bytes):
    """Convierte bytes a MB con 2 decimales"""
    return round(size_bytes / (1024 * 1024), 2)


def validate_file_size(file_size):
    """Valida que el tamaño del archivo no exceda el límite"""
    if file_size > MAX_FILE_SIZE:
        return False, f'El archivo excede el tamaño máximo permitido de {get_file_size_mb(MAX_FILE_SIZE)} MB'
    return True, None


def get_file_info(filename, filepath):
    """Obtiene información del archivo guardado"""
    file_stat = os.stat(filepath)
    return {
        'nombre': filename,
        'nombre_original': filename,
        'ruta_relativa': filepath.replace(current_app.config.get('UPLOAD_FOLDER', 'uploads'), '').lstrip('/\\'),
        'tipo': get_file_category(filename),
        'extension': filename.rsplit('.', 1)[1].lower() if '.' in filename else '',
        'tamano': file_stat.st_size,
        'tamano_mb': get_file_size_mb(file_stat.st_size),
        'fecha_subida': datetime.now().isoformat()
    }


def delete_ticket_files(ticket_id):
    """Elimina todos los archivos asociados a un ticket"""
    try:
        ticket_path = get_upload_path(ticket_id)
        if os.path.exists(ticket_path):
            import shutil
            shutil.rmtree(ticket_path)
            return True
    except Exception as e:
        print(f"Error al eliminar archivos del ticket {ticket_id}: {e}")
        return False

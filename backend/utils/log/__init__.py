"""
Sistema de Logs por Funcionalidad
Cada módulo tiene su propio archivo de log separado
"""
import logging
import os
from datetime import datetime
from enum import Enum
from typing import Optional


class LogCategory(Enum):
    """Categorías de logs disponibles"""
    AUTH = "auth"                    # Login, logout, 2FA, tokens
    SUSCRIPCIONES = "suscripciones"  # Suscripciones y planes
    EMPRESAS = "empresas"            # Gestión de empresas
    SOPORTE = "soporte"              # Tickets y soporte técnico
    PAGOS = "pagos"                  # Transacciones y pagos
    USUARIOS = "usuarios"            # Gestión de usuarios
    SISTEMA = "sistema"              # Eventos del sistema general
    API = "api"                      # Llamadas API externas/internas
    SEGURIDAD = "seguridad"          # Eventos de seguridad


class AppLogger:
    """
    Logger centralizado con archivos separados por funcionalidad.
    
    Uso:
        from utils.log import AppLogger, LogCategory
        
        # Log simple
        AppLogger.info(LogCategory.AUTH, "Usuario logueado exitosamente", user_id=123)
        
        # Log de error con excepción
        AppLogger.error(LogCategory.SOPORTE, "Error al crear ticket", exc=exception, ticket_data={...})
    """
    
    _loggers: dict = {}
    _log_directory: Optional[str] = None
    
    @classmethod
    def _get_log_directory(cls) -> str:
        """Obtiene o crea el directorio de logs"""
        if cls._log_directory is None:
            cls._log_directory = os.path.join(os.path.dirname(__file__), 'logs')
            if not os.path.exists(cls._log_directory):
                os.makedirs(cls._log_directory)
        return cls._log_directory
    
    @classmethod
    def _get_logger(cls, category: LogCategory) -> logging.Logger:
        """Obtiene o crea un logger para la categoría especificada"""
        category_name = category.value
        
        if category_name not in cls._loggers:
            logger = logging.getLogger(f"app.{category_name}")
            logger.setLevel(logging.DEBUG)
            
            # Evitar duplicación de handlers
            if logger.hasHandlers():
                logger.handlers.clear()
            
            # Archivo de log específico para esta categoría
            log_path = os.path.join(cls._get_log_directory(), f"{category_name}.log")
            file_handler = logging.FileHandler(log_path, encoding='utf-8')
            file_handler.setLevel(logging.DEBUG)
            
            # Formato del log
            formatter = logging.Formatter(
                '%(asctime)s | %(levelname)-8s | %(message)s',
                datefmt="%Y-%m-%d %H:%M:%S"
            )
            file_handler.setFormatter(formatter)
            logger.addHandler(file_handler)
            
            # No propagar al logger root
            logger.propagate = False
            
            cls._loggers[category_name] = logger
        
        return cls._loggers[category_name]
    
    @classmethod
    def _format_message(cls, message: str, **kwargs) -> str:
        """Formatea el mensaje con datos adicionales"""
        if not kwargs:
            return message
        
        # Formatear datos extra como key=value
        extra_parts = []
        for key, value in kwargs.items():
            if key == 'exc':
                continue  # La excepción se maneja aparte
            if isinstance(value, dict):
                extra_parts.append(f"{key}={{{', '.join(f'{k}:{v}' for k, v in value.items())}}}")
            else:
                extra_parts.append(f"{key}={value}")
        
        if extra_parts:
            return f"{message} | {' | '.join(extra_parts)}"
        return message
    
    @classmethod
    def debug(cls, category: LogCategory, message: str, **kwargs):
        """Log nivel DEBUG"""
        logger = cls._get_logger(category)
        formatted = cls._format_message(message, **kwargs)
        logger.debug(formatted)
    
    @classmethod
    def info(cls, category: LogCategory, message: str, **kwargs):
        """Log nivel INFO"""
        logger = cls._get_logger(category)
        formatted = cls._format_message(message, **kwargs)
        logger.info(formatted)
    
    @classmethod
    def warning(cls, category: LogCategory, message: str, **kwargs):
        """Log nivel WARNING"""
        logger = cls._get_logger(category)
        formatted = cls._format_message(message, **kwargs)
        logger.warning(formatted)
    
    @classmethod
    def error(cls, category: LogCategory, message: str, exc: Optional[Exception] = None, **kwargs):
        """Log nivel ERROR, opcionalmente con excepción"""
        logger = cls._get_logger(category)
        formatted = cls._format_message(message, **kwargs)
        if exc:
            logger.error(f"{formatted} | exception={type(exc).__name__}: {str(exc)}")
        else:
            logger.error(formatted)
    
    @classmethod
    def critical(cls, category: LogCategory, message: str, exc: Optional[Exception] = None, **kwargs):
        """Log nivel CRITICAL"""
        logger = cls._get_logger(category)
        formatted = cls._format_message(message, **kwargs)
        if exc:
            logger.critical(f"{formatted} | exception={type(exc).__name__}: {str(exc)}")
        else:
            logger.critical(formatted)
    
    # ============ Métodos de conveniencia por categoría ============
    
    @classmethod
    def auth(cls, level: str, message: str, **kwargs):
        """Log para autenticación"""
        getattr(cls, level)(LogCategory.AUTH, message, **kwargs)
    
    @classmethod
    def soporte(cls, level: str, message: str, **kwargs):
        """Log para soporte"""
        getattr(cls, level)(LogCategory.SOPORTE, message, **kwargs)
    
    @classmethod
    def suscripciones(cls, level: str, message: str, **kwargs):
        """Log para suscripciones"""
        getattr(cls, level)(LogCategory.SUSCRIPCIONES, message, **kwargs)
    
    @classmethod
    def empresas(cls, level: str, message: str, **kwargs):
        """Log para empresas"""
        getattr(cls, level)(LogCategory.EMPRESAS, message, **kwargs)
    
    @classmethod
    def seguridad(cls, level: str, message: str, **kwargs):
        """Log para seguridad"""
        getattr(cls, level)(LogCategory.SEGURIDAD, message, **kwargs)


# Alias para importación más simple
log = AppLogger

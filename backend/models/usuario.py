from datetime import datetime
from werkzeug.security import generate_password_hash, check_password_hash
from database.db import db
import secrets
from typing import List

import pyotp

class Usuario(db.Model):
    __tablename__ = 'usuarios'

    id = db.Column(db.Integer, primary_key=True)
    nombre = db.Column(db.String(120), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    rol = db.Column(db.String(20), default='cliente', index=True)  # 'admin' o 'cliente'
    creado_en = db.Column(db.DateTime, default=datetime.utcnow, index=True)

    empresa_id = db.Column(db.Integer, db.ForeignKey('empresas.id'), nullable=True, index=True)
    is_active = db.Column(db.Boolean, default=True, nullable=False)
    otp_secret = db.Column(db.String(32), nullable=True)
    otp_enabled = db.Column(db.Boolean, default=False, nullable=False)
    otp_backup_codes = db.Column(db.JSON, default=list)
    otp_backup_codes_used = db.Column(db.JSON, default=list)
    otp_last_verified_at = db.Column(db.DateTime, nullable=True)
    telefono = db.Column(db.String(30), nullable=True)
    direccion = db.Column(db.String(255), nullable=True)
    ciudad = db.Column(db.String(120), nullable=True)
    pais = db.Column(db.String(120), nullable=True)
    fecha_nacimiento = db.Column(db.Date, nullable=True)

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

    def to_dict(self):
        return {
            'id': self.id,
            'nombre': self.nombre,
            'email': self.email,
            'rol': self.rol,
            'empresa_id': self.empresa_id,
            'creado_en': self.creado_en.isoformat(),
            'otp_enabled': bool(self.otp_enabled),
            'is_active': bool(self.is_active),
            'telefono': self.telefono,
            'direccion': self.direccion,
            'ciudad': self.ciudad,
            'pais': self.pais,
            'fecha_nacimiento': self.fecha_nacimiento.isoformat() if self.fecha_nacimiento else None
        }

    def ensure_otp_secret(self, regenerate: bool = False) -> str:
        if regenerate or not self.otp_secret:
            self.otp_secret = pyotp.random_base32()
        return self.otp_secret

    def verify_otp(self, code: str, valid_window: int = 1) -> bool:
        if not code or not self.otp_secret:
            return False
        totp = pyotp.TOTP(self.otp_secret)
        is_valid = totp.verify(code, valid_window=valid_window)
        if is_valid:
            self.otp_last_verified_at = datetime.utcnow()
        return is_valid

    def generate_backup_codes(self, count: int = 5) -> List[str]:
        codes = [secrets.token_hex(4) for _ in range(count)]
        hashed = [generate_password_hash(code) for code in codes]
        self.otp_backup_codes = hashed
        self.otp_backup_codes_used = []
        return codes

    def consume_backup_code(self, code: str) -> bool:
        if not code or not self.otp_backup_codes:
            return False
        remaining = []
        used = self.otp_backup_codes_used or []
        consumed = False
        for hashed in self.otp_backup_codes:
            if not consumed and check_password_hash(hashed, code):
                used.append(hashed)
                consumed = True
            else:
                remaining.append(hashed)
        if consumed:
            self.otp_backup_codes = remaining
            self.otp_backup_codes_used = used
        return consumed

    def disable_otp(self):
        self.otp_enabled = False
        self.otp_secret = None
        self.otp_backup_codes = []
        self.otp_backup_codes_used = []
        self.otp_last_verified_at = None
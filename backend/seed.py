from app import create_app, db
from models.plan import Plan
from models.servicio import Servicio
from sqlalchemy import text

app = create_app()

def seed_data():
    with app.app_context():
        # Eliminar datos existentes para evitar duplicados
        db.session.execute(text('DELETE FROM suscripciones'))
        db.session.execute(text('DELETE FROM planes_servicios'))
        db.session.execute(text('DELETE FROM servicios'))
        db.session.execute(text('DELETE FROM planes'))
        db.session.commit()

        # Crear servicios
        servicios_nombres_basico = [
            'Gestión de contratos',
            'Gestion Entregas',
            'Gestion de Devoluciones',
            'Gestión de inventario',
            'Gestión de remates',
            'Reportes básicos',
            'Notificaciones',
            'Conexiones Multiusuario'
        ]
        
        servicios_nombres_pro_adicionales = [
            'Gestion de Caja',
            'Reportes avanzados y Constructor de Reportes',
            'CRM avanzado',
            'Gestion de Infracciones(Black List)',
            'Pasarela de Pagos'
        ]

        todos_servicios_nombres = servicios_nombres_basico + servicios_nombres_pro_adicionales
        
        servicios_objects = [Servicio(nombre=nombre) for nombre in todos_servicios_nombres]
        db.session.bulk_save_objects(servicios_objects)
        db.session.commit()

        # Obtener los servicios de la base de datos
        servicios_basico_db = Servicio.query.filter(Servicio.nombre.in_(servicios_nombres_basico)).all()
        servicios_pro_db = Servicio.query.filter(Servicio.nombre.in_(todos_servicios_nombres)).all()


        # Crear planes
        plan_basico = Plan(
            id='basico',
            nombre='Básico',
            precio_mensual=249900,
            precio_anual=2700000,
            caracteristicas=[]
        )
        
        plan_pro = Plan(
            id='pro',
            nombre='Pro',
            precio_mensual=390000,
            precio_anual=4200000,
            caracteristicas=[]
        )

        db.session.add_all([plan_basico, plan_pro])
        db.session.commit()

        # Asignar servicios a planes
        plan_basico.servicios.extend(servicios_basico_db)
        plan_pro.servicios.extend(servicios_pro_db)

        db.session.commit()

        print("Base de datos populada exitosamente.")

if __name__ == '__main__':
    seed_data()
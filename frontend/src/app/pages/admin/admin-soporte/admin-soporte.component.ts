import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { 
  AdminSoporteService, 
  SoporteTipo, 
  SoporteSuscripcion, 
  SoporteTicket, 
  SoportePago,
  SoporteComentario,
  CrearSoporteTipoDto,
  CrearSoporteSuscripcionDto,
  CrearSoporteTicketDto,
  CrearSoportePagoDto
} from '../../../services/admin-soporte.service';
import { AdminEmpresasService, Empresa } from '../../../services/admin-empresas.service';
import { AdminSuscripcionesService, Suscripcion } from '../../../services/admin-suscripciones.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-admin-soporte',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, RouterLinkActive],
  templateUrl: './admin-soporte.component.html',
  styleUrl: './admin-soporte.component.css'
})
export class AdminSoporteComponent implements OnInit {
  // Pestaña activa
  tabActiva: 'tipos' | 'suscripciones' | 'tickets' | 'pagos' = 'tickets';
  
  // Estados de carga
  cargando = false;
  cargandoDetalle = false;

  // ============ TIPOS DE SOPORTE ============
  tiposSoporte: SoporteTipo[] = [];
  mostrarFormularioTipo = false;
  editandoTipo: SoporteTipo | null = null;
  nuevoTipo: CrearSoporteTipoDto = {
    nombre: '',
    descripcion: '',
    modalidad: 'mensual',
    precio: 0,
    activo: true
  };

  // ============ SUSCRIPCIONES DE SOPORTE ============
  soporteSuscripciones: SoporteSuscripcion[] = [];
  empresas: Empresa[] = [];
  suscripciones: Suscripcion[] = [];
  suscripcionesEmpresaSeleccionada: Suscripcion[] = []; // Suscripciones activas de la empresa seleccionada
  cargandoSuscripcionesEmpresa = false;
  filtroEstadoSuscripcion = '';
  filtroEmpresaSuscripcion: number | null = null;
  mostrarFormularioSuscripcion = false;
  editandoSuscripcion: SoporteSuscripcion | null = null;
  nuevaSuscripcion: CrearSoporteSuscripcionDto = {
    suscripcion_id: 0,
    empresa_id: 0,
    soporte_tipo_id: 0,
    fecha_inicio: new Date().toISOString().split('T')[0]
  };

  // ============ TICKETS ============
  tickets: SoporteTicket[] = [];
  ticketSeleccionado: SoporteTicket | null = null;
  comentariosTicket: SoporteComentario[] = [];
  filtroEstadoTicket = '';
  filtroPrioridadTicket = '';
  filtroEmpresaTicket: number | null = null;
  mostrarFormularioTicket = false;
  nuevoTicket: CrearSoporteTicketDto = {
    soporte_suscripcion_id: 0,
    empresa_id: 0,
    titulo: '',
    descripcion: '',
    prioridad: 'media'
  };
  nuevoComentario = '';
  
  // Manejo de archivos
  archivosSeleccionados: File[] = [];
  subiendoArchivos = false;
  
  // Información de suscripción de soporte
  suscripcionSoporteActiva: any = null;
  cargandoSuscripcionSoporte = false;

  // ============ PAGOS ============
  pagos: SoportePago[] = [];
  mostrarFormularioPago = false;
  nuevoPago: CrearSoportePagoDto = {
    soporte_suscripcion_id: 0,
    fecha_pago: new Date().toISOString().split('T')[0],
    monto: 0,
    estado: 'exitoso'
  };

  // Admins para asignación
  admins: any[] = [];

  constructor(
    private soporteService: AdminSoporteService,
    private empresasService: AdminEmpresasService,
    private suscripcionesService: AdminSuscripcionesService
  ) {}

  ngOnInit(): void {
    this.cargarTiposSoporte();
    this.cargarEmpresas();
    this.cargarSuscripciones();
    this.cargarTickets();
  }

  cambiarTab(tab: 'tipos' | 'suscripciones' | 'tickets' | 'pagos'): void {
    this.tabActiva = tab;
    this.cerrarTodosLosFormularios();
    
    switch(tab) {
      case 'tipos':
        this.cargarTiposSoporte();
        break;
      case 'suscripciones':
        this.cargarSoporteSuscripciones();
        break;
      case 'tickets':
        this.cargarTickets();
        break;
      case 'pagos':
        this.cargarPagos();
        break;
    }
  }

  cerrarTodosLosFormularios(): void {
    this.mostrarFormularioTipo = false;
    this.mostrarFormularioSuscripcion = false;
    this.mostrarFormularioTicket = false;
    this.mostrarFormularioPago = false;
    this.ticketSeleccionado = null;
    this.editandoTipo = null;
    this.editandoSuscripcion = null;
  }

  // ============ TIPOS DE SOPORTE ============
  
  cargarTiposSoporte(): void {
    this.cargando = true;
    this.soporteService.listarTiposSoporte().subscribe({
      next: (tipos) => {
        this.tiposSoporte = tipos;
        this.cargando = false;
      },
      error: (error) => {
        console.error('Error al cargar tipos de soporte:', error);
        Swal.fire('Error', 'No se pudieron cargar los tipos de soporte', 'error');
        this.cargando = false;
      }
    });
  }

  toggleFormularioTipo(): void {
    this.mostrarFormularioTipo = !this.mostrarFormularioTipo;
    if (!this.mostrarFormularioTipo) {
      this.limpiarFormularioTipo();
    }
  }

  limpiarFormularioTipo(): void {
    this.editandoTipo = null;
    this.nuevoTipo = {
      nombre: '',
      descripcion: '',
      modalidad: 'mensual',
      precio: 0,
      activo: true
    };
  }

  editarTipo(tipo: SoporteTipo): void {
    this.editandoTipo = tipo;
    this.nuevoTipo = {
      nombre: tipo.nombre,
      descripcion: tipo.descripcion || '',
      modalidad: tipo.modalidad,
      precio: tipo.precio,
      max_tickets: tipo.max_tickets,
      max_horas: tipo.max_horas,
      activo: tipo.activo
    };
    this.mostrarFormularioTipo = true;
  }

  guardarTipo(): void {
    if (!this.nuevoTipo.nombre || !this.nuevoTipo.modalidad) {
      Swal.fire('Error', 'Nombre y Modalidad son obligatorios', 'error');
      return;
    }

    if (this.editandoTipo) {
      this.soporteService.actualizarTipoSoporte(this.editandoTipo.id, this.nuevoTipo).subscribe({
        next: (response) => {
          Swal.fire('Éxito', 'Tipo de soporte actualizado', 'success');
          this.cargarTiposSoporte();
          this.toggleFormularioTipo();
        },
        error: (error) => {
          Swal.fire('Error', error.error?.message || 'No se pudo actualizar', 'error');
        }
      });
    } else {
      this.soporteService.crearTipoSoporte(this.nuevoTipo).subscribe({
        next: (response) => {
          Swal.fire('Éxito', 'Tipo de soporte creado', 'success');
          this.cargarTiposSoporte();
          this.toggleFormularioTipo();
        },
        error: (error) => {
          Swal.fire('Error', error.error?.message || 'No se pudo crear', 'error');
        }
      });
    }
  }

  eliminarTipo(tipo: SoporteTipo): void {
    Swal.fire({
      title: '¿Eliminar tipo de soporte?',
      text: `¿Está seguro de eliminar "${tipo.nombre}"?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        this.soporteService.eliminarTipoSoporte(tipo.id).subscribe({
          next: () => {
            Swal.fire('Eliminado', 'El tipo de soporte ha sido eliminado', 'success');
            this.cargarTiposSoporte();
          },
          error: (error) => {
            Swal.fire('Error', error.error?.message || 'No se pudo eliminar', 'error');
          }
        });
      }
    });
  }

  verDetalleTipo(tipo: SoporteTipo): void {
    const estadoStyle = tipo.activo 
      ? { bg: '#dcfce7', text: '#16a34a', icon: '✓', label: 'Activo' }
      : { bg: '#fee2e2', text: '#dc2626', icon: '✕', label: 'Inactivo' };
    
    const modalidadLabels: { [key: string]: { icon: string; nombre: string } } = {
      'mensual': { icon: '📅', nombre: 'Mensual' },
      'anual': { icon: '🗓️', nombre: 'Anual' },
      'por_tickets': { icon: '🎫', nombre: 'Por Tickets' },
      'por_horas': { icon: '⏱️', nombre: 'Por Horas' }
    };
    const modalidadInfo = modalidadLabels[tipo.modalidad] || { icon: '📋', nombre: tipo.modalidad };

    Swal.fire({
      title: '',
      html: `
        <div class="detalle-modal">
          <div class="modal-header-custom">
            <div class="icon-circle detalle">
              <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"></circle>
                <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
                <line x1="12" y1="17" x2="12.01" y2="17"></line>
              </svg>
            </div>
            <h2>Detalle del Tipo de Soporte</h2>
            <p class="id-badge">#${tipo.id}</p>
          </div>
          
          <div class="estado-banner" style="background: ${estadoStyle.bg}; color: ${estadoStyle.text};">
            <span class="estado-icon">${estadoStyle.icon}</span>
            <span class="estado-text">${estadoStyle.label}</span>
          </div>
          
          <div class="seccion">
            <h3 class="seccion-titulo"><span class="icon">📋</span> Información General</h3>
            <div class="info-grid">
              <div class="info-item">
                <span class="label">Nombre</span>
                <span class="value">${tipo.nombre}</span>
              </div>
              <div class="info-item">
                <span class="label">Modalidad</span>
                <span class="value">${modalidadInfo.icon} ${modalidadInfo.nombre}</span>
              </div>
            </div>
          </div>
          
          ${tipo.descripcion ? `
          <div class="seccion">
            <h3 class="seccion-titulo"><span class="icon">📝</span> Descripción</h3>
            <div class="descripcion-contenido">${tipo.descripcion}</div>
          </div>
          ` : ''}
          
          <div class="seccion">
            <h3 class="seccion-titulo"><span class="icon">💰</span> Precio</h3>
            <div class="precio-card">
              <div class="precio-row final">
                <span class="precio-label">Valor</span>
                <span class="precio-valor">$${parseFloat(tipo.precio?.toString() || '0').toLocaleString('es-CO')}</span>
              </div>
            </div>
          </div>
          
          <div class="seccion">
            <h3 class="seccion-titulo"><span class="icon">📊</span> Límites y Restricciones</h3>
            <div class="info-grid">
              ${tipo.modalidad === 'por_tickets' ? `
              <div class="info-item">
                <span class="label">Máximo de tickets</span>
                <span class="value">${tipo.max_tickets || 'Ilimitado'}</span>
              </div>
              ` : ''}
              ${tipo.modalidad === 'por_horas' ? `
              <div class="info-item">
                <span class="label">Máximo de horas</span>
                <span class="value">${tipo.max_horas || 'Ilimitado'}</span>
              </div>
              ` : ''}
              ${!tipo.max_tickets && !tipo.max_horas ? `
              <div class="info-item">
                <span class="label">Límites</span>
                <span class="value">Sin restricciones</span>
              </div>
              ` : ''}
            </div>
          </div>
        </div>
        
        ${this.getModalDetailStyles()}
      `,
      confirmButtonText: 'Cerrar',
      confirmButtonColor: '#6b7280',
      width: '600px'
    });
  }

  getModalidadLabel(modalidad: string): string {
    const labels: { [key: string]: string } = {
      'mensual': 'Mensual',
      'anual': 'Anual',
      'por_tickets': 'Por Tickets',
      'por_horas': 'Por Horas'
    };
    return labels[modalidad] || modalidad;
  }

  // ============ SUSCRIPCIONES DE SOPORTE ============

  cargarSoporteSuscripciones(): void {
    this.cargando = true;
    const filtros: any = {};
    if (this.filtroEstadoSuscripcion) filtros.estado = this.filtroEstadoSuscripcion;
    if (this.filtroEmpresaSuscripcion) filtros.empresa_id = this.filtroEmpresaSuscripcion;

    this.soporteService.listarSoporteSuscripciones(filtros).subscribe({
      next: (suscripciones) => {
        this.soporteSuscripciones = suscripciones;
        this.cargando = false;
      },
      error: (error) => {
        console.error('Error al cargar suscripciones de soporte:', error);
        Swal.fire('Error', 'No se pudieron cargar las suscripciones de soporte', 'error');
        this.cargando = false;
      }
    });
  }

  cargarEmpresas(): void {
    this.empresasService.listarEmpresas().subscribe({
      next: (empresas) => {
        this.empresas = empresas.filter(e => e.estado);
      },
      error: (error) => console.error('Error al cargar empresas:', error)
    });
  }

  cargarSuscripciones(): void {
    this.suscripcionesService.listarSuscripciones({ estado: 'activa' }).subscribe({
      next: (suscripciones) => {
        this.suscripciones = suscripciones;
      },
      error: (error) => console.error('Error al cargar suscripciones:', error)
    });
  }

  filtrarSuscripciones(): void {
    this.cargarSoporteSuscripciones();
  }

  toggleFormularioSuscripcion(): void {
    this.mostrarFormularioSuscripcion = !this.mostrarFormularioSuscripcion;
    if (!this.mostrarFormularioSuscripcion) {
      this.limpiarFormularioSuscripcion();
    }
  }

  limpiarFormularioSuscripcion(): void {
    this.editandoSuscripcion = null;
    this.suscripcionesEmpresaSeleccionada = [];
    this.nuevaSuscripcion = {
      suscripcion_id: 0,
      empresa_id: 0,
      soporte_tipo_id: 0,
      fecha_inicio: new Date().toISOString().split('T')[0]
    };
  }

  onEmpresaChangeSuscripcion(): void {
    // Limpiar suscripción seleccionada y lista
    this.nuevaSuscripcion.suscripcion_id = 0;
    this.suscripcionesEmpresaSeleccionada = [];
    
    // Convertir a número (el select devuelve string)
    const empresaId = Number(this.nuevaSuscripcion.empresa_id);
    
    if (empresaId && empresaId > 0) {
      this.cargandoSuscripcionesEmpresa = true;
      console.log('Cargando suscripciones para empresa_id:', empresaId);
      
      // Cargar suscripciones activas de la empresa seleccionada desde el backend
      this.suscripcionesService.listarSuscripciones({ 
        empresa_id: empresaId, 
        estado: 'activa' 
      }).subscribe({
        next: (suscripciones) => {
          console.log('Suscripciones recibidas:', suscripciones);
          this.suscripcionesEmpresaSeleccionada = suscripciones;
          this.cargandoSuscripcionesEmpresa = false;
          // Si solo hay una suscripción, seleccionarla automáticamente
          if (suscripciones.length === 1) {
            this.nuevaSuscripcion.suscripcion_id = suscripciones[0].id;
          }
        },
        error: (error) => {
          console.error('Error al cargar suscripciones de la empresa:', error);
          this.cargandoSuscripcionesEmpresa = false;
        }
      });
    }
  }

  guardarSuscripcionSoporte(): void {
    if (!this.nuevaSuscripcion.empresa_id || !this.nuevaSuscripcion.suscripcion_id || !this.nuevaSuscripcion.soporte_tipo_id) {
      Swal.fire('Error', 'Empresa, Suscripción y Tipo de Soporte son obligatorios', 'error');
      return;
    }

    // Obtener precio del tipo de soporte seleccionado
    const tipoSeleccionado = this.tiposSoporte.find(t => t.id === this.nuevaSuscripcion.soporte_tipo_id);
    if (tipoSeleccionado) {
      this.nuevaSuscripcion.precio_actual = tipoSeleccionado.precio;
    }

    if (this.editandoSuscripcion) {
      this.soporteService.actualizarSoporteSuscripcion(this.editandoSuscripcion.id, this.nuevaSuscripcion).subscribe({
        next: () => {
          Swal.fire('Éxito', 'Suscripción de soporte actualizada', 'success');
          this.cargarSoporteSuscripciones();
          this.toggleFormularioSuscripcion();
        },
        error: (error) => {
          Swal.fire('Error', error.error?.message || 'No se pudo actualizar', 'error');
        }
      });
    } else {
      this.soporteService.crearSoporteSuscripcion(this.nuevaSuscripcion).subscribe({
        next: () => {
          Swal.fire('Éxito', 'Suscripción de soporte creada', 'success');
          this.cargarSoporteSuscripciones();
          this.toggleFormularioSuscripcion();
        },
        error: (error) => {
          Swal.fire('Error', error.error?.message || 'No se pudo crear', 'error');
        }
      });
    }
  }

  verDetalleSuscripcion(suscripcion: SoporteSuscripcion): void {
    const estadoColors: { [key: string]: { bg: string; text: string; icon: string } } = {
      'activo': { bg: '#dcfce7', text: '#16a34a', icon: '✓' },
      'vencido': { bg: '#fef3c7', text: '#d97706', icon: '⏱' },
      'cancelado': { bg: '#fee2e2', text: '#dc2626', icon: '✕' },
      'pendiente_pago': { bg: '#dbeafe', text: '#2563eb', icon: '💳' }
    };
    const estadoStyle = estadoColors[suscripcion.estado] || estadoColors['vencido'];
    
    const fechaInicio = this.formatDate(suscripcion.fecha_inicio);
    const fechaFin = suscripcion.fecha_fin ? this.formatDate(suscripcion.fecha_fin) : 'Sin definir';
    const fechaCreacion = suscripcion.fecha_creacion ? this.formatDateTime(suscripcion.fecha_creacion) : 'N/A';
    
    // Calcular días restantes si es activo
    let diasRestantes = 0;
    if (suscripcion.estado === 'activo' && suscripcion.fecha_fin) {
      const hoy = new Date();
      const vencimiento = new Date(suscripcion.fecha_fin);
      diasRestantes = Math.ceil((vencimiento.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
    }

    Swal.fire({
      title: '',
      html: `
        <div class="detalle-modal">
          <div class="modal-header-custom">
            <div class="icon-circle detalle">
              <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"></circle>
                <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
                <line x1="12" y1="17" x2="12.01" y2="17"></line>
              </svg>
            </div>
            <h2>Detalle de Suscripción de Soporte</h2>
            <p class="id-badge">#${suscripcion.id}</p>
          </div>
          
          <div class="estado-banner" style="background: ${estadoStyle.bg}; color: ${estadoStyle.text};">
            <span class="estado-icon">${estadoStyle.icon}</span>
            <span class="estado-text">${suscripcion.estado.charAt(0).toUpperCase() + suscripcion.estado.slice(1).replace('_', ' ')}</span>
            ${suscripcion.estado === 'activo' && diasRestantes > 0 ? `<span class="dias-restantes">${diasRestantes} días restantes</span>` : ''}
            ${suscripcion.estado === 'activo' && diasRestantes <= 0 ? `<span class="dias-restantes vencido">Vencido</span>` : ''}
          </div>
          
          <div class="seccion">
            <h3 class="seccion-titulo"><span class="icon">🏢</span> Información de la empresa</h3>
            <div class="info-grid">
              <div class="info-item">
                <span class="label">Empresa</span>
                <span class="value">${suscripcion.empresa?.nombre || 'N/A'}</span>
              </div>
              <div class="info-item">
                <span class="label">ID Suscripción</span>
                <span class="value">#${suscripcion.suscripcion_id}</span>
              </div>
            </div>
          </div>
          
          <div class="seccion">
            <h3 class="seccion-titulo"><span class="icon">❓</span> Tipo de soporte</h3>
            <div class="info-grid">
              <div class="info-item">
                <span class="label">Nombre</span>
                <span class="value">${suscripcion.tipo_soporte?.nombre || 'N/A'}</span>
              </div>
              <div class="info-item">
                <span class="label">Modalidad</span>
                <span class="value">${this.getModalidadLabel(suscripcion.tipo_soporte?.modalidad || '')}</span>
              </div>
            </div>
          </div>
          
          <div class="seccion">
            <h3 class="seccion-titulo"><span class="icon">💰</span> Facturación</h3>
            <div class="precio-card">
              <div class="precio-row final">
                <span class="precio-label">Precio actual</span>
                <span class="precio-valor">$${parseFloat(suscripcion.precio_actual?.toString() || '0').toLocaleString('es-CO')}</span>
              </div>
            </div>
          </div>
          
          <div class="seccion">
            <h3 class="seccion-titulo"><span class="icon">📊</span> Consumo</h3>
            <div class="info-grid">
              <div class="info-item">
                <span class="label">Tickets consumidos</span>
                <span class="value">${suscripcion.tickets_consumidos || 0}</span>
              </div>
              <div class="info-item">
                <span class="label">Horas consumidas</span>
                <span class="value">${parseFloat(suscripcion.horas_consumidas?.toString() || '0').toFixed(2)} hrs</span>
              </div>
            </div>
          </div>
          
          <div class="seccion">
            <h3 class="seccion-titulo"><span class="icon">📆</span> Fechas</h3>
            <div class="fechas-timeline">
              <div class="fecha-item inicio">
                <div class="fecha-dot"></div>
                <div class="fecha-content">
                  <span class="fecha-label">Inicio</span>
                  <span class="fecha-valor">${fechaInicio}</span>
                </div>
              </div>
              <div class="fecha-linea"></div>
              <div class="fecha-item fin">
                <div class="fecha-dot ${diasRestantes <= 30 && diasRestantes > 0 ? 'warning' : ''} ${diasRestantes <= 0 && suscripcion.estado === 'activo' ? 'danger' : ''}"></div>
                <div class="fecha-content">
                  <span class="fecha-label">Vencimiento</span>
                  <span class="fecha-valor">${fechaFin}</span>
                </div>
              </div>
            </div>
          </div>
          
          <div class="seccion">
            <h3 class="seccion-titulo"><span class="icon">🔄</span> Configuración</h3>
            <div class="info-grid">
              <div class="info-item renovacion ${suscripcion.renovacion_automatica ? 'activa' : 'inactiva'}">
                <span class="label">Renovación automática</span>
                <span class="value">
                  <span class="renovacion-badge">
                    <i class="fas fa-${suscripcion.renovacion_automatica ? 'check-circle' : 'times-circle'}"></i>
                    ${suscripcion.renovacion_automatica ? 'Activada' : 'Desactivada'}
                  </span>
                </span>
              </div>
            </div>
            ${suscripcion.renovacion_automatica ? `
            <div class="renovacion-info">
              <i class="fas fa-info-circle"></i>
              <span>Esta suscripción de soporte se renovará automáticamente al vencer</span>
            </div>
            ` : ''}
          </div>
          
          ${suscripcion.notas ? `
          <div class="seccion notas">
            <h3 class="seccion-titulo"><span class="icon">📝</span> Notas</h3>
            <div class="notas-contenido">${suscripcion.notas.replace(/\n/g, '<br>')}</div>
          </div>
          ` : ''}
          
          <div class="footer-info" style="text-align: center; padding-top: 12px; border-top: 1px solid #e2e8f0; color: #9ca3af; font-size: 0.8rem;">
            <span>Creada el ${fechaCreacion}</span>
          </div>
        </div>
        
        ${this.getModalDetailStyles()}
        <style>
          .dias-restantes {
            margin-left: 8px;
            padding: 3px 8px;
            background: rgba(255,255,255,0.3);
            border-radius: 12px;
            font-size: 0.8rem;
          }
          .dias-restantes.vencido {
            background: rgba(239, 68, 68, 0.2);
          }
        </style>
      `,
      confirmButtonText: 'Cerrar',
      confirmButtonColor: '#6b7280',
      width: '600px'
    });
  }

  cancelarSoporteSuscripcion(suscripcion: SoporteSuscripcion): void {
    Swal.fire({
      title: '¿Cancelar suscripción de soporte?',
      text: 'Esta acción cancelará la suscripción de soporte para esta empresa.',
      icon: 'warning',
      input: 'textarea',
      inputLabel: 'Motivo de cancelación',
      inputPlaceholder: 'Ingrese el motivo...',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Sí, cancelar',
      cancelButtonText: 'No'
    }).then((result) => {
      if (result.isConfirmed) {
        this.soporteService.cancelarSoporteSuscripcion(suscripcion.id, result.value).subscribe({
          next: () => {
            Swal.fire('Cancelada', 'La suscripción de soporte ha sido cancelada', 'success');
            this.cargarSoporteSuscripciones();
          },
          error: (error) => {
            Swal.fire('Error', error.error?.message || 'No se pudo cancelar', 'error');
          }
        });
      }
    });
  }

  renovarSoporteSuscripcion(suscripcion: SoporteSuscripcion): void {
    Swal.fire({
      title: 'Renovar Suscripción de Soporte',
      html: `
        <p>Empresa: <strong>${suscripcion.empresa?.nombre || 'N/A'}</strong></p>
        <p>Tipo: <strong>${suscripcion.tipo_soporte?.nombre || 'N/A'}</strong></p>
      `,
      input: 'number',
      inputLabel: 'Meses de renovación',
      inputValue: 1,
      inputAttributes: {
        min: '1',
        max: '12'
      },
      showCancelButton: true,
      confirmButtonText: 'Renovar',
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        this.soporteService.renovarSoporteSuscripcion(suscripcion.id, { meses: parseInt(result.value) }).subscribe({
          next: () => {
            Swal.fire('Renovada', 'La suscripción de soporte ha sido renovada', 'success');
            this.cargarSoporteSuscripciones();
          },
          error: (error) => {
            Swal.fire('Error', error.error?.message || 'No se pudo renovar', 'error');
          }
        });
      }
    });
  }

  // ============ TICKETS ============

  verDetalleTicket(ticket: SoporteTicket): void {
    const estadoColors: { [key: string]: { bg: string; text: string; icon: string } } = {
      'abierto': { bg: '#dbeafe', text: '#2563eb', icon: '📂' },
      'en_progreso': { bg: '#fef3c7', text: '#d97706', icon: '⚙️' },
      'resuelto': { bg: '#dcfce7', text: '#16a34a', icon: '✓' },
      'cerrado': { bg: '#f3f4f6', text: '#6b7280', icon: '🔒' }
    };
    const estadoStyle = estadoColors[ticket.estado] || estadoColors['abierto'];
    
    const prioridadColors: { [key: string]: { bg: string; text: string; icon: string } } = {
      'baja': { bg: '#dbeafe', text: '#2563eb', icon: '⬇️' },
      'media': { bg: '#fef3c7', text: '#d97706', icon: '➡️' },
      'alta': { bg: '#fed7aa', text: '#ea580c', icon: '⬆️' },
      'urgente': { bg: '#fee2e2', text: '#dc2626', icon: '🔥' }
    };
    const prioridadStyle = prioridadColors[ticket.prioridad] || prioridadColors['media'];
    
    const fechaCreacion = ticket.fecha_creacion ? this.formatDateTime(ticket.fecha_creacion) : 'N/A';
    const fechaCierre = ticket.fecha_cierre ? this.formatDateTime(ticket.fecha_cierre) : 'No cerrado';

    Swal.fire({
      title: '',
      html: `
        <div class="detalle-modal">
          <div class="modal-header-custom">
            <div class="icon-circle detalle">
              <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
                <line x1="16" y1="13" x2="8" y2="13"></line>
                <line x1="16" y1="17" x2="8" y2="17"></line>
                <polyline points="10 9 9 9 8 9"></polyline>
              </svg>
            </div>
            <h2>Detalle de Ticket</h2>
            <p class="id-badge">#${ticket.id}</p>
          </div>
          
          <div class="estado-banner" style="background: ${estadoStyle.bg}; color: ${estadoStyle.text};">
            <span class="estado-icon">${estadoStyle.icon}</span>
            <span class="estado-text">${ticket.estado.charAt(0).toUpperCase() + ticket.estado.slice(1).replace('_', ' ')}</span>
          </div>
          
          <div class="seccion">
            <h3 class="seccion-titulo"><span class="icon">🎫</span> Información del ticket</h3>
            <div class="info-grid">
              <div class="info-item">
                <span class="label">Título</span>
                <span class="value"><strong>${ticket.titulo}</strong></span>
              </div>
              <div class="info-item">
                <span class="label">Prioridad</span>
                <span class="value">
                  <span class="badge-custom" style="background: ${prioridadStyle.bg}; color: ${prioridadStyle.text}; padding: 4px 10px; border-radius: 12px; font-size: 0.85rem;">
                    ${prioridadStyle.icon} ${ticket.prioridad.charAt(0).toUpperCase() + ticket.prioridad.slice(1)}
                  </span>
                </span>
              </div>
            </div>
          </div>
          
          <div class="seccion">
            <h3 class="seccion-titulo"><span class="icon">🏢</span> Empresa</h3>
            <div class="info-grid">
              <div class="info-item">
                <span class="label">Nombre</span>
                <span class="value">${ticket.empresa?.nombre || 'N/A'}</span>
              </div>
              ${ticket.soporte_suscripcion_id ? `
              <div class="info-item">
                <span class="label">ID Suscripción</span>
                <span class="value">#${ticket.soporte_suscripcion_id}</span>
              </div>
              ` : ''}
            </div>
          </div>
          
          ${ticket.descripcion ? `
          <div class="seccion">
            <h3 class="seccion-titulo"><span class="icon">📄</span> Descripción</h3>
            <div class="notas-contenido">${ticket.descripcion.replace(/\n/g, '<br>')}</div>
          </div>
          ` : ''}
          
          <div class="seccion">
            <h3 class="seccion-titulo"><span class="icon">📆</span> Fechas</h3>
            <div class="fechas-timeline">
              <div class="fecha-item inicio">
                <div class="fecha-dot"></div>
                <div class="fecha-content">
                  <span class="fecha-label">Creación</span>
                  <span class="fecha-valor">${fechaCreacion}</span>
                </div>
              </div>
              ${ticket.fecha_cierre ? `
              <div class="fecha-linea"></div>
              <div class="fecha-item fin">
                <div class="fecha-dot success"></div>
                <div class="fecha-content">
                  <span class="fecha-label">Cierre</span>
                  <span class="fecha-valor">${fechaCierre}</span>
                </div>
              </div>
              ` : ''}
            </div>
          </div>
        </div>
        
        ${this.getModalDetailStyles()}
        <style>
          .badge-custom {
            display: inline-flex;
            align-items: center;
            gap: 4px;
          }
          .fecha-dot.success {
            background: #22c55e;
            box-shadow: 0 0 0 4px rgba(34, 197, 94, 0.1);
          }
        </style>
      `,
      confirmButtonText: 'Cerrar',
      confirmButtonColor: '#6b7280',
      width: '600px'
    });
  }

  cargarTickets(): void {
    this.cargando = true;
    const filtros: any = {};
    if (this.filtroEstadoTicket) filtros.estado = this.filtroEstadoTicket;
    if (this.filtroPrioridadTicket) filtros.prioridad = this.filtroPrioridadTicket;
    if (this.filtroEmpresaTicket) filtros.empresa_id = this.filtroEmpresaTicket;

    this.soporteService.listarSoporteTickets(filtros).subscribe({
      next: (tickets) => {
        this.tickets = tickets;
        this.cargando = false;
      },
      error: (error) => {
        console.error('Error al cargar tickets:', error);
        Swal.fire('Error', 'No se pudieron cargar los tickets', 'error');
        this.cargando = false;
      }
    });
  }

  filtrarTickets(): void {
    this.cargarTickets();
  }

  cerrarDetalleTicket(): void {
    this.ticketSeleccionado = null;
    this.comentariosTicket = [];
    this.nuevoComentario = '';
  }

  toggleFormularioTicket(): void {
    this.mostrarFormularioTicket = !this.mostrarFormularioTicket;
    if (!this.mostrarFormularioTicket) {
      this.limpiarFormularioTicket();
    }
  }

  limpiarFormularioTicket(): void {
    this.nuevoTicket = {
      soporte_suscripcion_id: 0,
      empresa_id: 0,
      titulo: '',
      descripcion: '',
      prioridad: 'media'
    };
  }

  onEmpresaChangeTicket(): void {
    if (!this.nuevoTicket.empresa_id) {
      this.suscripcionSoporteActiva = null;
      this.nuevoTicket.soporte_suscripcion_id = 0;
      return;
    }

    // Consultar suscripción de soporte activa desde el backend
    this.cargandoSuscripcionSoporte = true;
    this.soporteService.obtenerSuscripcionActivaEmpresa(this.nuevoTicket.empresa_id).subscribe({
      next: (response) => {
        this.cargandoSuscripcionSoporte = false;
        if (response.tiene_soporte && response.suscripcion) {
          this.suscripcionSoporteActiva = response.suscripcion;
          this.nuevoTicket.soporte_suscripcion_id = response.suscripcion.id;
        } else {
          this.suscripcionSoporteActiva = null;
          this.nuevoTicket.soporte_suscripcion_id = 0;
          Swal.fire({
            icon: 'warning',
            title: 'Sin Soporte Activo',
            text: 'Esta empresa no tiene una suscripción de soporte activa. Debe contratar soporte antes de crear tickets.',
            confirmButtonText: 'Entendido'
          });
        }
      },
      error: (error) => {
        this.cargandoSuscripcionSoporte = false;
        console.error('Error al consultar suscripción de soporte:', error);
        Swal.fire('Error', 'No se pudo verificar el soporte de la empresa', 'error');
      }
    });
  }

  guardarTicket(): void {
    if (!this.nuevoTicket.titulo || !this.nuevoTicket.empresa_id || !this.nuevoTicket.soporte_suscripcion_id) {
      Swal.fire('Error', 'Título, Empresa y Suscripción de Soporte son obligatorios', 'error');
      return;
    }

    this.soporteService.crearSoporteTicket(this.nuevoTicket).subscribe({
      next: (response) => {
        const ticketId = response.ticket?.id;
        
        // Si hay archivos, subirlos
        if (this.archivosSeleccionados.length > 0 && ticketId) {
          this.subirArchivosTicket(ticketId);
        } else {
          Swal.fire('Éxito', 'Ticket creado correctamente', 'success');
          this.cargarTickets();
          this.toggleFormularioTicket();
        }
      },
      error: (error) => {
        Swal.fire('Error', error.error?.message || 'No se pudo crear el ticket', 'error');
      }
    });
  }

  agregarComentarioTicket(): void {
    if (!this.ticketSeleccionado || !this.nuevoComentario.trim()) {
      return;
    }

    this.soporteService.agregarComentario(this.ticketSeleccionado.id, { 
      comentario: this.nuevoComentario 
    }).subscribe({
      next: () => {
        this.nuevoComentario = '';
        this.verDetalleTicket(this.ticketSeleccionado!);
        Swal.fire('Éxito', 'Comentario agregado', 'success');
      },
      error: (error) => {
        Swal.fire('Error', error.error?.message || 'No se pudo agregar el comentario', 'error');
      }
    });
  }

  cambiarEstadoTicket(ticket: SoporteTicket, nuevoEstado: string): void {
    this.soporteService.cambiarEstadoTicket(ticket.id, nuevoEstado).subscribe({
      next: () => {
        Swal.fire('Éxito', `Estado cambiado a ${this.getEstadoTicketLabel(nuevoEstado)}`, 'success');
        this.cargarTickets();
        if (this.ticketSeleccionado?.id === ticket.id) {
          this.verDetalleTicket(ticket);
        }
      },
      error: (error) => {
        Swal.fire('Error', error.error?.message || 'No se pudo cambiar el estado', 'error');
      }
    });
  }

  cerrarTicket(ticket: SoporteTicket): void {
    Swal.fire({
      title: 'Cerrar Ticket',
      input: 'textarea',
      inputLabel: 'Comentario final (opcional)',
      inputPlaceholder: 'Ingrese un comentario de cierre...',
      showCancelButton: true,
      confirmButtonText: 'Cerrar ticket',
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        this.soporteService.cerrarTicket(ticket.id, result.value).subscribe({
          next: () => {
            Swal.fire('Cerrado', 'El ticket ha sido cerrado', 'success');
            this.cargarTickets();
            if (this.ticketSeleccionado?.id === ticket.id) {
              this.cerrarDetalleTicket();
            }
          },
          error: (error) => {
            Swal.fire('Error', error.error?.message || 'No se pudo cerrar el ticket', 'error');
          }
        });
      }
    });
  }

  // ============ MANEJO DE ARCHIVOS ============

  onArchivosSeleccionados(event: any): void {
    const files: FileList = event.target.files;
    if (!files || files.length === 0) {
      return;
    }

    // Validar número máximo de archivos (10 por carga)
    if (files.length > 10) {
      Swal.fire('Error', 'Máximo 10 archivos por carga', 'warning');
      event.target.value = '';
      return;
    }

    // Extensiones permitidas
    const allowedExtensions = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'pdf', 'doc', 'docx', 
                               'xls', 'xlsx', 'txt', 'csv', 'zip', 'rar', '7z', 'log', 'json'];
    const maxFileSize = 10 * 1024 * 1024; // 10 MB
    const archivosValidos: File[] = [];
    const errores: string[] = [];

    Array.from(files).forEach(file => {
      const extension = file.name.split('.').pop()?.toLowerCase();
      
      // Validar extensión
      if (!extension || !allowedExtensions.includes(extension)) {
        errores.push(`${file.name}: Tipo de archivo no permitido`);
        return;
      }

      // Validar tamaño
      if (file.size > maxFileSize) {
        errores.push(`${file.name}: Archivo muy grande (máx. 10 MB)`);
        return;
      }

      archivosValidos.push(file);
    });

    if (errores.length > 0) {
      Swal.fire({
        icon: 'warning',
        title: 'Algunos archivos no son válidos',
        html: errores.join('<br>'),
        confirmButtonText: 'Entendido'
      });
    }

    this.archivosSeleccionados = [...this.archivosSeleccionados, ...archivosValidos];
    event.target.value = ''; // Limpiar input
  }

  eliminarArchivoSeleccionado(index: number): void {
    this.archivosSeleccionados.splice(index, 1);
  }

  getFileIcon(filename: string): string {
    const extension = filename.split('.').pop()?.toLowerCase();
    const iconMap: {[key: string]: string} = {
      'pdf': 'fa-file-pdf',
      'doc': 'fa-file-word',
      'docx': 'fa-file-word',
      'xls': 'fa-file-excel',
      'xlsx': 'fa-file-excel',
      'txt': 'fa-file-lines',
      'csv': 'fa-file-csv',
      'zip': 'fa-file-zipper',
      'rar': 'fa-file-zipper',
      '7z': 'fa-file-zipper',
      'png': 'fa-file-image',
      'jpg': 'fa-file-image',
      'jpeg': 'fa-file-image',
      'gif': 'fa-file-image',
      'webp': 'fa-file-image',
      'log': 'fa-file-lines',
      'json': 'fa-file-code'
    };
    return iconMap[extension || ''] || 'fa-file';
  }

  getFileSizeMB(bytes: number): string {
    return (bytes / (1024 * 1024)).toFixed(2);
  }

  subirArchivosTicket(ticketId: number): void {
    if (this.archivosSeleccionados.length === 0) {
      return;
    }

    this.subiendoArchivos = true;
    this.soporteService.subirArchivosTicket(ticketId, this.archivosSeleccionados).subscribe({
      next: (response) => {
        this.subiendoArchivos = false;
        
        let mensaje = response.message || 'Archivos subidos exitosamente';
        if (response.errores && response.errores.length > 0) {
          mensaje += '\n\nErrores:\n' + response.errores.join('\n');
        }

        Swal.fire({
          icon: response.errores && response.errores.length > 0 ? 'warning' : 'success',
          title: 'Ticket Creado',
          text: mensaje,
          confirmButtonText: 'Aceptar'
        });

        this.cargarTickets();
        this.toggleFormularioTicket();
      },
      error: (error) => {
        this.subiendoArchivos = false;
        Swal.fire('Error', error.error?.message || 'Error al subir archivos', 'error');
        // Aún así cerrar el formulario ya que el ticket fue creado
        this.toggleFormularioTicket();
      }
    });
  }

  descargarArchivo(ticketId: number, filename: string, nombreOriginal: string): void {
    this.soporteService.descargarArchivoTicket(ticketId, filename).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = nombreOriginal || filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      },
      error: (error) => {
        Swal.fire('Error', 'No se pudo descargar el archivo', 'error');
      }
    });
  }

  eliminarArchivoTicket(ticketId: number, filename: string): void {
    Swal.fire({
      title: '¿Eliminar archivo?',
      text: 'Esta acción no se puede deshacer',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        this.soporteService.eliminarArchivoTicket(ticketId, filename).subscribe({
          next: () => {
            Swal.fire('Eliminado', 'El archivo ha sido eliminado', 'success');
            // Recargar ticket seleccionado si existe
            if (this.ticketSeleccionado?.id === ticketId) {
              this.verDetalleTicket(this.ticketSeleccionado);
            }
          },
          error: (error) => {
            Swal.fire('Error', error.error?.message || 'No se pudo eliminar el archivo', 'error');
          }
        });
      }
    });
  }

  reabrirTicket(ticket: SoporteTicket): void {
    Swal.fire({
      title: '¿Reabrir ticket?',
      text: 'El ticket se reabrirá para continuar con el soporte.',
      input: 'textarea',
      inputLabel: 'Motivo (opcional)',
      showCancelButton: true,
      confirmButtonText: 'Reabrir',
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        this.soporteService.reabrirTicket(ticket.id, result.value).subscribe({
          next: () => {
            Swal.fire('Reabierto', 'El ticket ha sido reabierto', 'success');
            this.cargarTickets();
            if (this.ticketSeleccionado?.id === ticket.id) {
              this.verDetalleTicket(ticket);
            }
          },
          error: (error) => {
            Swal.fire('Error', error.error?.message || 'No se pudo reabrir el ticket', 'error');
          }
        });
      }
    });
  }

  getEstadoTicketLabel(estado: string): string {
    const labels: { [key: string]: string } = {
      'abierto': 'Abierto',
      'en_proceso': 'En Proceso',
      'pendiente_respuesta': 'Pendiente Respuesta',
      'cerrado': 'Cerrado',
      'cancelado': 'Cancelado'
    };
    return labels[estado] || estado;
  }

  getEstadoTicketClass(estado: string): string {
    const clases: { [key: string]: string } = {
      'abierto': 'badge-warning',
      'en_proceso': 'badge-info',
      'pendiente_respuesta': 'badge-secondary',
      'cerrado': 'badge-success',
      'cancelado': 'badge-danger'
    };
    return clases[estado] || 'badge-secondary';
  }

  getPrioridadLabel(prioridad: string): string {
    const labels: { [key: string]: string } = {
      'baja': 'Baja',
      'media': 'Media',
      'alta': 'Alta',
      'critica': 'Crítica'
    };
    return labels[prioridad] || prioridad;
  }

  getPrioridadClass(prioridad: string): string {
    const clases: { [key: string]: string } = {
      'baja': 'badge-success',
      'media': 'badge-warning',
      'alta': 'badge-orange',
      'critica': 'badge-danger'
    };
    return clases[prioridad] || 'badge-secondary';
  }

  // ============ PAGOS ============

  verDetallePago(pago: SoportePago): void {
    const estadoColors: { [key: string]: { bg: string; text: string; icon: string } } = {
      'completado': { bg: '#dcfce7', text: '#16a34a', icon: '✓' },
      'pendiente': { bg: '#fef3c7', text: '#d97706', icon: '⏱' },
      'rechazado': { bg: '#fee2e2', text: '#dc2626', icon: '✕' }
    };
    const estadoStyle = estadoColors[pago.estado] || estadoColors['pendiente'];
    
    const fechaPago = this.formatDate(pago.fecha_pago);
    const fechaCreacion = pago.fecha_creacion ? this.formatDateTime(pago.fecha_creacion) : 'N/A';
    
    const metodoPagoIcons: { [key: string]: string } = {
      'tarjeta_credito': '💳',
      'tarjeta_debito': '💳',
      'transferencia': '🏦',
      'efectivo': '💵',
      'otro': '💰'
    };
    const metodoPagoIcon = pago.metodo_pago ? (metodoPagoIcons[pago.metodo_pago] || '💰') : '💰';
    const empresaNombre = typeof pago.soporte_suscripcion?.empresa === 'string' 
      ? pago.soporte_suscripcion.empresa 
      : 'N/A';

    Swal.fire({
      title: '',
      html: `
        <div class="detalle-modal">
          <div class="modal-header-custom">
            <div class="icon-circle detalle">
              <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="2" y="5" width="20" height="14" rx="2"></rect>
                <line x1="2" y1="10" x2="22" y2="10"></line>
              </svg>
            </div>
            <h2>Detalle de Pago de Soporte</h2>
            <p class="id-badge">#${pago.id}</p>
          </div>
          
          <div class="estado-banner" style="background: ${estadoStyle.bg}; color: ${estadoStyle.text};">
            <span class="estado-icon">${estadoStyle.icon}</span>
            <span class="estado-text">${pago.estado.charAt(0).toUpperCase() + pago.estado.slice(1)}</span>
          </div>
          
          <div class="seccion">
            <h3 class="seccion-titulo"><span class="icon">🏢</span> Información de la suscripción</h3>
            <div class="info-grid">
              <div class="info-item">
                <span class="label">ID Suscripción</span>
                <span class="value">#${pago.soporte_suscripcion_id}</span>
              </div>
              ${empresaNombre !== 'N/A' ? `
              <div class="info-item">
                <span class="label">Empresa</span>
                <span class="value">${empresaNombre}</span>
              </div>
              ` : ''}
            </div>
          </div>
          
          <div class="seccion">
            <h3 class="seccion-titulo"><span class="icon">💰</span> Información del pago</h3>
            <div class="precio-card">
              <div class="precio-row final">
                <span class="precio-label">Monto pagado</span>
                <span class="precio-valor">$${parseFloat(pago.monto?.toString() || '0').toLocaleString('es-CO')}</span>
              </div>
            </div>
          </div>
          
          <div class="seccion">
            <h3 class="seccion-titulo"><span class="icon">${metodoPagoIcon}</span> Método de pago</h3>
            <div class="info-grid">
              <div class="info-item">
                <span class="label">Método</span>
                <span class="value">${pago.metodo_pago ? this.getMetodoPagoLabel(pago.metodo_pago) : 'No especificado'}</span>
              </div>
              ${pago.referencia_pago ? `
              <div class="info-item">
                <span class="label">Referencia</span>
                <span class="value"><strong>${pago.referencia_pago}</strong></span>
              </div>
              ` : ''}
            </div>
          </div>
          
          <div class="seccion">
            <h3 class="seccion-titulo"><span class="icon">📆</span> Fecha</h3>
            <div class="info-grid">
              <div class="info-item">
                <span class="label">Fecha de pago</span>
                <span class="value">${fechaPago}</span>
              </div>
            </div>
          </div>
          
          <div class="footer-info" style="text-align: center; padding-top: 12px; border-top: 1px solid #e2e8f0; color: #9ca3af; font-size: 0.8rem;">
            <span>Registrado el ${fechaCreacion}</span>
          </div>
        </div>
        
        ${this.getModalDetailStyles()}
      `,
      confirmButtonText: 'Cerrar',
      confirmButtonColor: '#6b7280',
      width: '600px'
    });
  }

  cargarPagos(): void {
    this.cargando = true;
    this.soporteService.listarSoportePagos().subscribe({
      next: (pagos) => {
        this.pagos = pagos;
        this.cargando = false;
      },
      error: (error) => {
        console.error('Error al cargar pagos:', error);
        Swal.fire('Error', 'No se pudieron cargar los pagos', 'error');
        this.cargando = false;
      }
    });
  }

  toggleFormularioPago(): void {
    this.mostrarFormularioPago = !this.mostrarFormularioPago;
    if (!this.mostrarFormularioPago) {
      this.limpiarFormularioPago();
    }
  }

  limpiarFormularioPago(): void {
    this.nuevoPago = {
      soporte_suscripcion_id: 0,
      fecha_pago: new Date().toISOString().split('T')[0],
      monto: 0,
      estado: 'exitoso'
    };
  }

  guardarPago(): void {
    if (!this.nuevoPago.soporte_suscripcion_id || !this.nuevoPago.monto || !this.nuevoPago.fecha_pago) {
      Swal.fire('Error', 'Suscripción de Soporte, Monto y Fecha son obligatorios', 'error');
      return;
    }

    this.soporteService.crearSoportePago(this.nuevoPago).subscribe({
      next: () => {
        Swal.fire('Éxito', 'Pago registrado correctamente', 'success');
        this.cargarPagos();
        this.toggleFormularioPago();
      },
      error: (error) => {
        Swal.fire('Error', error.error?.message || 'No se pudo registrar el pago', 'error');
      }
    });
  }

  getEstadoPagoLabel(estado: string): string {
    const labels: { [key: string]: string } = {
      'exitoso': 'Exitoso',
      'completado': 'Completado',
      'fallido': 'Fallido',
      'rechazado': 'Rechazado',
      'pendiente': 'Pendiente'
    };
    return labels[estado] || estado;
  }

  getEstadoPagoClass(estado: string): string {
    const clases: { [key: string]: string } = {
      'exitoso': 'badge-success',
      'completado': 'badge-success',
      'fallido': 'badge-danger',
      'rechazado': 'badge-danger',
      'pendiente': 'badge-warning'
    };
    return clases[estado] || 'badge-secondary';
  }

  getMetodoPagoLabel(metodo: string): string {
    const labels: { [key: string]: string } = {
      'tarjeta_credito': 'Tarjeta de Crédito',
      'tarjeta_debito': 'Tarjeta de Débito',
      'transferencia': 'Transferencia Bancaria',
      'efectivo': 'Efectivo',
      'otro': 'Otro'
    };
    return labels[metodo] || metodo;
  }

  getEstadoSuscripcionLabel(estado: string): string {
    const labels: { [key: string]: string } = {
      'activo': 'Activo',
      'vencido': 'Vencido',
      'cancelado': 'Cancelado',
      'pendiente_pago': 'Pendiente Pago'
    };
    return labels[estado] || estado;
  }

  getEstadoSuscripcionClass(estado: string): string {
    const clases: { [key: string]: string } = {
      'activo': 'badge-success',
      'vencido': 'badge-danger',
      'cancelado': 'badge-secondary',
      'pendiente_pago': 'badge-warning'
    };
    return clases[estado] || 'badge-secondary';
  }

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('es-CO', { 
      style: 'currency', 
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  }

  formatDate(dateString: string | null | undefined): string {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('es-CO', { 
      day: '2-digit', 
      month: 'short', 
      year: 'numeric' 
    });
  }

  formatDateTime(dateString: string | null | undefined): string {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleString('es-CO', { 
      day: '2-digit', 
      month: 'short', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  // Estilos compartidos para modales de detalle
  getModalDetailStyles(): string {
    return `
      <style>
        .detalle-modal { text-align: left; max-height: 70vh; overflow-y: auto; }
        .modal-header-custom { text-align: center; margin-bottom: 16px; position: sticky; top: 0; background: white; padding-bottom: 12px; z-index: 10; }
        .icon-circle.detalle { 
          width: 56px; height: 56px; 
          background: linear-gradient(135deg, #8b5cf6, #7c3aed); 
          border-radius: 50%; 
          display: flex; align-items: center; justify-content: center; 
          margin: 0 auto 12px; 
          color: white;
          box-shadow: 0 4px 12px rgba(139, 92, 246, 0.3);
        }
        .modal-header-custom h2 { margin: 0; font-size: 1.4rem; color: #1f2937; }
        .id-badge { 
          display: inline-block;
          margin-top: 6px;
          background: #f3f4f6; 
          color: #6b7280; 
          padding: 4px 12px; 
          border-radius: 12px; 
          font-size: 0.85rem;
          font-family: monospace;
        }
        
        .estado-banner {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 10px 16px;
          border-radius: 10px;
          font-weight: 600;
          font-size: 0.9rem;
          margin-bottom: 20px;
        }
        .estado-icon { font-size: 1.1rem; }
        
        .seccion {
          margin-bottom: 20px;
          padding: 16px;
          background: #f9fafb;
          border-radius: 10px;
        }
        .seccion-titulo {
          margin: 0 0 12px 0;
          font-size: 1rem;
          font-weight: 600;
          color: #1f2937;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .seccion-titulo .icon { font-size: 1.2rem; }
        
        .info-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }
        .info-item {
          background: white;
          padding: 12px;
          border-radius: 8px;
          border: 1px solid #e5e7eb;
        }
        .info-item .label {
          display: block;
          font-size: 0.75rem;
          color: #6b7280;
          margin-bottom: 4px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .info-item .value {
          display: block;
          font-size: 0.95rem;
          font-weight: 600;
          color: #1f2937;
        }
        
        .precio-card {
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          padding: 14px;
        }
        .precio-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 6px 0;
        }
        .precio-label {
          color: #6b7280;
          font-size: 0.9rem;
        }
        .precio-valor {
          font-weight: 700;
          font-size: 1.1rem;
          color: #1f2937;
        }
        
        .descripcion-contenido, .notas-contenido {
          background: white;
          padding: 12px;
          border-radius: 8px;
          border: 1px solid #e5e7eb;
          color: #4b5563;
          line-height: 1.6;
        }
        
        .renovacion-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 12px;
          border-radius: 16px;
          font-weight: 500;
          font-size: 0.9rem;
        }
        .info-item.renovacion.activa .renovacion-badge {
          background: #dcfce7;
          color: #16a34a;
        }
        .info-item.renovacion.inactiva .renovacion-badge {
          background: #fee2e2;
          color: #dc2626;
        }
        .renovacion-info {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-top: 12px;
          padding: 10px 14px;
          background: #eff6ff;
          border-left: 3px solid #3b82f6;
          border-radius: 6px;
          color: #1e40af;
          font-size: 0.9rem;
        }
        .renovacion-info i {
          color: #3b82f6;
        }
        
        .fechas-timeline {
          background: white;
          padding: 16px;
          border-radius: 8px;
          border: 1px solid #e5e7eb;
        }
        .fecha-item {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .fecha-dot {
          width: 12px;
          height: 12px;
          background: #10b981;
          border-radius: 50%;
          border: 3px solid #d1fae5;
          flex-shrink: 0;
        }
        .fecha-dot.warning { background: #f59e0b; border-color: #fef3c7; }
        .fecha-dot.danger { background: #ef4444; border-color: #fee2e2; }
        .fecha-content {
          flex: 1;
        }
        .fecha-label {
          display: block;
          font-size: 0.75rem;
          color: #6b7280;
          text-transform: uppercase;
        }
        .fecha-valor {
          display: block;
          font-weight: 600;
          color: #1f2937;
        }
        .fecha-linea {
          width: 2px;
          height: 20px;
          background: #e5e7eb;
          margin-left: 5px;
          margin-top: 4px;
          margin-bottom: 4px;
        }
      </style>
    `;
  }
}

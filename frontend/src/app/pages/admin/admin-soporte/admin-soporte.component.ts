import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
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
import { AdminUsuariosService, Usuario } from '../../../services/admin-usuarios.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-admin-soporte',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, RouterLinkActive],
  templateUrl: './admin-soporte.component.html',
  styleUrl: './admin-soporte.component.css'
})
export class AdminSoporteComponent implements OnInit {
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;
  
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
  
  // Paginación de tickets
  paginaActual = 1;
  itemsPorPagina = 20;
  totalItems = 0;
  totalPaginas = 0;
  Math = Math;
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
  disponibilidadSoporte: any = null;
  cargandoDisponibilidad = false;

  // Estadísticas de tickets
  estadisticasTickets: any = {
    total: 0,
    abiertos: 0,
    en_proceso: 0,
    pendiente_respuesta: 0,
    cerrados: 0,
    cancelados: 0,
    criticos: 0,
    sin_asignar: 0,
    activos: 0
  };

  // ============ PAGOS ============
  pagos: SoportePago[] = [];
  mostrarFormularioPago = false;
  nuevoPago: CrearSoportePagoDto = {
    soporte_suscripcion_id: 0,
    fecha_pago: new Date().toISOString().split('T')[0],
    monto: 0,
    estado: 'exitoso'
  };

  // Monto formateado para UI
  montoFormateado: string = '';

  // Admins para asignación
  admins: any[] = [];

  constructor(
    private soporteService: AdminSoporteService,
    private empresasService: AdminEmpresasService,
    private suscripcionesService: AdminSuscripcionesService,
    private usuariosService: AdminUsuariosService
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
        this.cargarTodasSuscripciones(); // Cargar todas las suscripciones para el formulario de pagos
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
      next: (response) => {
        // Manejar tanto el formato antiguo (array) como el nuevo (objeto con paginación)
        this.soporteSuscripciones = response.suscripciones || response || [];
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
      next: (response) => {
        this.suscripciones = response.suscripciones;
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

      
      // Cargar suscripciones activas de la empresa seleccionada desde el backend
      this.suscripcionesService.listarSuscripciones({ 
        empresa_id: empresaId, 
        estado: 'activa' 
      }).subscribe({
        next: (response) => {

          this.suscripcionesEmpresaSeleccionada = response.suscripciones;
          this.cargandoSuscripcionesEmpresa = false;
          // Si solo hay una suscripción, seleccionarla automáticamente
          if (response.suscripciones.length === 1) {
            this.nuevaSuscripcion.suscripcion_id = response.suscripciones[0].id;
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

  cambiarEstadoSuscripcion(suscripcion: SoporteSuscripcion): void {
    const estadoActual = suscripcion.estado;
    const estadoLabels: { [key: string]: string } = {
      'activo': 'Activo',
      'vencido': 'Vencido',
      'cancelado': 'Cancelado',
      'pendiente_pago': 'Pendiente de Pago'
    };

    Swal.fire({
      title: '',
      html: `
        <div class="estado-modal">
          <div class="modal-header-custom">
            <div class="icon-circle estado">
              <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                <path d="M9 12l2 2 4-4"></path>
              </svg>
            </div>
            <h2>Cambiar Estado de Suscripción</h2>
            <p class="subtitle">Modifica el estado de la suscripción de soporte</p>
          </div>

          <div class="info-card">
            <div class="info-row">
              <span class="info-label">Empresa</span>
              <span class="info-value">${suscripcion.empresa?.nombre || 'N/A'}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Tipo de Soporte</span>
              <span class="info-value">${suscripcion.tipo_soporte?.nombre || 'N/A'}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Estado Actual</span>
              <span class="info-value estado-badge-current">${estadoLabels[estadoActual]}</span>
            </div>
          </div>

          <div class="form-section">
            <label class="form-label">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"></path>
              </svg>
              Nuevo Estado
            </label>
            <select id="nuevo-estado" class="form-select">
              <option value="">-- Seleccionar Estado --</option>
              ${estadoActual !== 'activo' ? '<option value="activo">✅ Activo</option>' : ''}
              ${estadoActual !== 'vencido' ? '<option value="vencido">⏰ Vencido</option>' : ''}
              ${estadoActual !== 'pendiente_pago' ? '<option value="pendiente_pago">💳 Pendiente de Pago</option>' : ''}
              ${estadoActual !== 'cancelado' ? '<option value="cancelado">❌ Cancelado</option>' : ''}
            </select>
          </div>

          <div class="form-section">
            <label class="form-label">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"></path>
                <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"></path>
              </svg>
              Motivo del Cambio (opcional)
            </label>
            <textarea id="motivo-cambio" class="form-textarea" placeholder="Describe el motivo del cambio de estado..." rows="3"></textarea>
          </div>
        </div>

        <style>
          .estado-modal { text-align: left; }
          .modal-header-custom { text-align: center; margin-bottom: 20px; }
          .icon-circle.estado { 
            width: 56px; height: 56px; 
            background: linear-gradient(135deg, #06b6d4, #0891b2); 
            border-radius: 50%; 
            display: flex; align-items: center; justify-content: center; 
            margin: 0 auto 12px; 
            color: white;
            box-shadow: 0 4px 12px rgba(6, 182, 212, 0.3);
          }
          .modal-header-custom h2 { margin: 0; font-size: 1.5rem; color: #1f2937; }
          .modal-header-custom .subtitle { margin: 4px 0 0; color: #6b7280; font-size: 0.9rem; }
          
          .info-card {
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 12px;
            padding: 16px;
            margin-bottom: 20px;
          }
          .info-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 8px 0;
            border-bottom: 1px dashed #e2e8f0;
          }
          .info-row:last-child { border-bottom: none; }
          .info-label { color: #64748b; font-size: 0.9rem; }
          .info-value { font-weight: 600; color: #1f2937; }
          .estado-badge-current {
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 0.85rem;
            background: linear-gradient(135deg, #3b82f6, #2563eb);
            color: white;
          }
          
          .form-section { margin-bottom: 16px; }
          .form-label {
            display: flex;
            align-items: center;
            gap: 8px;
            font-weight: 600;
            color: #374151;
            margin-bottom: 8px;
            font-size: 0.9rem;
          }
          .form-label svg { color: #6b7280; }
          
          .form-select {
            width: 100%;
            padding: 10px 12px;
            border: 2px solid #e2e8f0;
            border-radius: 8px;
            font-size: 0.95rem;
            color: #1f2937;
            background: white;
            transition: all 0.2s;
          }
          .form-select:focus {
            outline: none;
            border-color: #06b6d4;
            box-shadow: 0 0 0 3px rgba(6, 182, 212, 0.1);
          }
          
          .form-textarea {
            width: 100%;
            padding: 10px 12px;
            border: 2px solid #e2e8f0;
            border-radius: 8px;
            font-size: 0.95rem;
            color: #1f2937;
            font-family: inherit;
            resize: vertical;
            transition: all 0.2s;
          }
          .form-textarea:focus {
            outline: none;
            border-color: #06b6d4;
            box-shadow: 0 0 0 3px rgba(6, 182, 212, 0.1);
          }
          .form-textarea::placeholder { color: #9ca3af; }
        </style>
      `,
      showCancelButton: true,
      confirmButtonText: 'Cambiar Estado',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#06b6d4',
      cancelButtonColor: '#6b7280',
      width: '550px',
      preConfirm: () => {
        const nuevoEstado = (document.getElementById('nuevo-estado') as HTMLSelectElement).value;
        const motivo = (document.getElementById('motivo-cambio') as HTMLTextAreaElement).value;

        if (!nuevoEstado) {
          Swal.showValidationMessage('Debes seleccionar un estado');
          return false;
        }

        return { estado: nuevoEstado, motivo };
      }
    }).then((result) => {
      if (result.isConfirmed && result.value) {
        this.soporteService.cambiarEstadoSuscripcion(suscripcion.id, result.value).subscribe({
          next: () => {
            Swal.fire({
              icon: 'success',
              title: 'Estado Actualizado',
              text: `La suscripción ahora está en estado: ${estadoLabels[result.value.estado]}`,
              confirmButtonColor: '#06b6d4'
            });
            this.cargarSoporteSuscripciones();
          },
          error: (error) => {
            Swal.fire('Error', error.error?.message || 'No se pudo cambiar el estado', 'error');
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
    // Primero cargar el ticket con todos los detalles incluyendo comentarios
    this.soporteService.obtenerTicketDetalle(ticket.id).subscribe({
      next: (ticketDetalle) => {
        this.mostrarModalDetalle(ticketDetalle);
      },
      error: (error) => {
        console.error('Error al cargar detalle:', error);
        Swal.fire('Error', 'No se pudo cargar el detalle del ticket', 'error');
      }
    });
  }

  private mostrarModalDetalle(ticket: SoporteTicket): void {
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
          
          ${ticket.extra_data?.archivos?.length > 0 ? `
          <div class="seccion">
            <h3 class="seccion-titulo"><span class="icon">📎</span> Archivos Adjuntos</h3>
            <div class="archivos-lista">
              ${ticket.extra_data.archivos.map((archivo: any) => `
                <div class="archivo-item" data-ticket-id="${ticket.id}" data-filename="${archivo.nombre}">
                  <div class="archivo-icono">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M13 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V9z"></path>
                      <polyline points="13 2 13 9 20 9"></polyline>
                    </svg>
                  </div>
                  <div class="archivo-info">
                    <span class="archivo-nombre">${archivo.nombre_original || archivo.nombre}</span>
                    <span class="archivo-size">${archivo.tamano_mb ? archivo.tamano_mb.toFixed(2) + ' MB' : 'Tamaño desconocido'}</span>
                  </div>
                  <button class="btn-descargar-archivo" title="Descargar">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"></path>
                    </svg>
                  </button>
                </div>
              `).join('')}
            </div>
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

          ${(ticket as any).comentarios && (ticket as any).comentarios.length > 0 ? `
          <div class="seccion">
            <h3 class="seccion-titulo"><span class="icon">💬</span> Historial de Comentarios</h3>
            <div class="comentarios-timeline">
              ${(ticket as any).comentarios.map((comentario: any, index: number) => `
                <div class="comentario-item">
                  <div class="comentario-header">
                    <div class="user-badge">
                      <div class="user-avatar ${comentario.es_admin ? 'admin' : 'cliente'}">
                        ${comentario.es_admin ? '👨‍💼' : '👤'}
                      </div>
                      <div class="user-info">
                        <span class="user-name">${comentario.admin_nombre || 'Usuario'}</span>
                        <span class="user-role">${comentario.es_admin ? 'Equipo de Soporte' : 'Cliente'}</span>
                      </div>
                    </div>
                    <span class="comentario-fecha">${this.formatDateTime(comentario.fecha_creacion)}</span>
                  </div>
                  <div class="comentario-body">
                    <p>${comentario.comentario.replace(/\n/g, '<br>')}</p>
                    ${comentario.archivos && comentario.archivos.length > 0 ? `
                      <div class="comentario-archivos">
                        <div class="archivos-header">📎 Archivos adjuntos (${comentario.archivos.length})</div>
                        <div class="archivos-grid">
                          ${comentario.archivos.map((archivo: any) => `
                            <div class="archivo-card" data-ticket-id="${ticket.id}" data-filename="${archivo.nombre}">
                              <div class="archivo-preview">
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                  <path d="M13 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V9z"></path>
                                  <polyline points="13 2 13 9 20 9"></polyline>
                                </svg>
                              </div>
                              <div class="archivo-details">
                                <span class="archivo-name">${archivo.nombre_original || archivo.nombre}</span>
                                <span class="archivo-meta">${archivo.tamano_mb ? archivo.tamano_mb.toFixed(2) + ' MB' : ''}</span>
                              </div>
                              <button class="btn-descargar-comentario" title="Descargar">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"></path>
                                </svg>
                              </button>
                            </div>
                          `).join('')}
                        </div>
                      </div>
                    ` : ''}
                  </div>
                  ${index < (ticket as any).comentarios.length - 1 ? '<div class="timeline-connector"></div>' : ''}
                </div>
              `).join('')}
            </div>
          </div>
          ` : ''}
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
          .archivos-lista {
            display: flex;
            flex-direction: column;
            gap: 10px;
            margin-top: 12px;
          }
          .archivo-item {
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 12px;
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            transition: all 0.2s;
          }
          .archivo-item:hover {
            background: #f1f5f9;
            border-color: #cbd5e1;
            box-shadow: 0 2px 4px rgba(0,0,0,0.05);
          }
          .archivo-icono {
            flex-shrink: 0;
            color: #64748b;
          }
          .archivo-info {
            flex: 1;
            display: flex;
            flex-direction: column;
            gap: 4px;
            min-width: 0;
          }
          .archivo-nombre {
            font-weight: 600;
            color: #1e293b;
            font-size: 0.9rem;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }
          .archivo-size {
            font-size: 0.8rem;
            color: #64748b;
          }
          .btn-descargar-archivo {
            flex-shrink: 0;
            width: 36px;
            height: 36px;
            border: none;
            background: #3b82f6;
            color: white;
            border-radius: 8px;
            cursor: pointer;
            transition: all 0.2s;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .btn-descargar-archivo:hover {
            background: #2563eb;
            transform: translateY(-2px);
            box-shadow: 0 4px 8px rgba(59, 130, 246, 0.3);
          }
          
          /* Estilos para comentarios timeline */
          .comentarios-timeline {
            margin-top: 16px;
            display: flex;
            flex-direction: column;
            gap: 16px;
          }
          .comentario-item {
            position: relative;
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 12px;
            padding: 16px;
            transition: all 0.2s;
          }
          .comentario-item:hover {
            background: #f1f5f9;
            box-shadow: 0 2px 8px rgba(0,0,0,0.05);
          }
          .comentario-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 12px;
            padding-bottom: 12px;
            border-bottom: 1px dashed #cbd5e1;
          }
          .user-badge {
            display: flex;
            align-items: center;
            gap: 10px;
          }
          .user-avatar {
            width: 40px;
            height: 40px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 1.2rem;
            background: linear-gradient(135deg, #e0e7ff, #c7d2fe);
          }
          .user-avatar.admin {
            background: linear-gradient(135deg, #ddd6fe, #c4b5fd);
          }
          .user-info {
            display: flex;
            flex-direction: column;
            gap: 2px;
          }
          .user-name {
            font-weight: 600;
            color: #1e293b;
            font-size: 0.95rem;
          }
          .user-role {
            font-size: 0.8rem;
            color: #64748b;
          }
          .comentario-fecha {
            font-size: 0.85rem;
            color: #64748b;
          }
          .comentario-body {
            color: #334155;
            line-height: 1.6;
          }
          .comentario-body p {
            margin: 0;
          }
          .comentario-archivos {
            margin-top: 12px;
            padding-top: 12px;
            border-top: 1px dashed #cbd5e1;
          }
          .archivos-header {
            font-weight: 600;
            color: #475569;
            font-size: 0.9rem;
            margin-bottom: 10px;
          }
          .archivos-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
            gap: 8px;
          }
          .archivo-card {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 8px;
            background: white;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            transition: all 0.2s;
          }
          .archivo-card:hover {
            border-color: #3b82f6;
            box-shadow: 0 2px 4px rgba(59, 130, 246, 0.1);
          }
          .archivo-preview {
            flex-shrink: 0;
            color: #64748b;
          }
          .archivo-details {
            flex: 1;
            display: flex;
            flex-direction: column;
            gap: 2px;
            min-width: 0;
          }
          .archivo-name {
            font-size: 0.85rem;
            color: #1e293b;
            font-weight: 500;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }
          .archivo-meta {
            font-size: 0.75rem;
            color: #94a3b8;
          }
          .btn-descargar-comentario {
            flex-shrink: 0;
            width: 28px;
            height: 28px;
            border: none;
            background: #3b82f6;
            color: white;
            border-radius: 6px;
            cursor: pointer;
            transition: all 0.2s;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .btn-descargar-comentario:hover {
            background: #2563eb;
            transform: scale(1.05);
          }
          .timeline-connector {
            height: 12px;
            width: 2px;
            background: linear-gradient(to bottom, #e2e8f0, transparent);
            margin: -8px auto 0;
          }
        </style>
      `,
      confirmButtonText: 'Cerrar',
      confirmButtonColor: '#6b7280',
      width: '600px',
      didOpen: () => {
        // Event listeners para archivos del ticket principal
        document.querySelectorAll('.btn-descargar-archivo').forEach(btn => {
          btn.addEventListener('click', (e) => {
            const archivoItem = (e.target as HTMLElement).closest('.archivo-item');
            if (archivoItem) {
              const ticketId = archivoItem.getAttribute('data-ticket-id');
              const filename = archivoItem.getAttribute('data-filename');
              if (ticketId && filename) {
                this.descargarArchivoTicket(parseInt(ticketId), filename);
              }
            }
          });
        });
        
        // Event listeners para archivos de comentarios
        document.querySelectorAll('.btn-descargar-comentario').forEach(btn => {
          btn.addEventListener('click', (e) => {
            const archivoCard = (e.target as HTMLElement).closest('.archivo-card');
            if (archivoCard) {
              const ticketId = archivoCard.getAttribute('data-ticket-id');
              const filename = archivoCard.getAttribute('data-filename');
              if (ticketId && filename) {
                this.descargarArchivoTicket(parseInt(ticketId), filename);
              }
            }
          });
        });
      }
    });
  }

  cargarTickets(): void {
    this.cargando = true;
    const filtros: any = {
      page: this.paginaActual,
      per_page: this.itemsPorPagina
    };
    if (this.filtroEstadoTicket) filtros.estado = this.filtroEstadoTicket;
    if (this.filtroPrioridadTicket) filtros.prioridad = this.filtroPrioridadTicket;
    if (this.filtroEmpresaTicket) filtros.empresa_id = this.filtroEmpresaTicket;

    this.soporteService.listarSoporteTickets(filtros).subscribe({
      next: (response) => {
        this.tickets = response.tickets || [];
        this.totalItems = response.total;
        this.totalPaginas = response.pages;
        this.cargando = false;
        
        // Actualizar estadísticas si vienen en la respuesta
        if (response.estadisticas) {
          this.estadisticasTickets = response.estadisticas;
        }
      },
      error: (error) => {
        console.error('Error al cargar tickets:', error);
        Swal.fire('Error', 'No se pudieron cargar los tickets', 'error');
        this.cargando = false;
      }
    });
    
    // Cargar estadísticas solo si no vienen en la respuesta de tickets
    this.cargarEstadisticasTickets();
  }

  cargarEstadisticasTickets(): void {
    this.soporteService.obtenerEstadisticasTickets().subscribe({
      next: (stats) => {
        this.estadisticasTickets = stats;
      },
      error: (error) => {
        console.error('Error al cargar estadísticas de tickets:', error);
      }
    });
  }

  filtrarTickets(): void {
    this.paginaActual = 1;
    this.cargarTickets();
  }

  cambiarPagina(pagina: number): void {
    if (pagina >= 1 && pagina <= this.totalPaginas) {
      this.paginaActual = pagina;
      this.cargarTickets();
    }
  }

  getPaginaArray(): number[] {
    const paginas: number[] = [];
    const maxPaginas = 5;
    let inicio = Math.max(1, this.paginaActual - Math.floor(maxPaginas / 2));
    let fin = Math.min(this.totalPaginas, inicio + maxPaginas - 1);
    
    if (fin - inicio + 1 < maxPaginas) {
      inicio = Math.max(1, fin - maxPaginas + 1);
    }
    
    for (let i = inicio; i <= fin; i++) {
      paginas.push(i);
    }
    
    return paginas;
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
    // Limpiar archivos seleccionados
    this.archivosSeleccionados = [];
    this.disponibilidadSoporte = null;
    this.suscripcionSoporteActiva = null;
  }

  onEmpresaChangeTicket(): void {
    if (!this.nuevoTicket.empresa_id) {
      this.suscripcionSoporteActiva = null;
      this.nuevoTicket.soporte_suscripcion_id = 0;
      return;
    }

    // Consultar suscripción de soporte activa desde el backend
    this.cargandoSuscripcionSoporte = true;
    this.disponibilidadSoporte = null;
    
    this.soporteService.obtenerSuscripcionActivaEmpresa(this.nuevoTicket.empresa_id).subscribe({
      next: (response) => {
        this.cargandoSuscripcionSoporte = false;
        if (response.tiene_soporte && response.suscripcion) {
          this.suscripcionSoporteActiva = response.suscripcion;
          this.nuevoTicket.soporte_suscripcion_id = response.suscripcion.id;
          
          // Consultar disponibilidad de soporte
          this.consultarDisponibilidadSoporte(response.suscripcion.id);
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

  consultarDisponibilidadSoporte(suscripcionId: number): void {
    this.cargandoDisponibilidad = true;
    this.soporteService.consultarDisponibilidadSoporte(suscripcionId).subscribe({
      next: (disponibilidad) => {
        this.cargandoDisponibilidad = false;
        this.disponibilidadSoporte = disponibilidad;
        
        // Si no tiene disponible, mostrar alerta
        if (!disponibilidad.tiene_disponible) {
          Swal.fire({
            icon: 'warning',
            title: 'Sin Disponibilidad',
            html: `
              <p>${disponibilidad.mensaje}</p>
              <div style="margin-top: 15px; padding: 10px; background: #f3f4f6; border-radius: 8px;">
                <strong>Modalidad:</strong> ${this.getModalidadLabel(disponibilidad.modalidad)}<br>
                <strong>Consumido:</strong> ${disponibilidad.consumido}<br>
                <strong>Máximo:</strong> ${disponibilidad.maximo}
              </div>
            `,
            confirmButtonText: 'Entendido',
            confirmButtonColor: '#d33'
          });
        }
      },
      error: (error) => {
        this.cargandoDisponibilidad = false;
        console.error('Error al consultar disponibilidad:', error);
      }
    });
  }

  guardarTicket(): void {
    // Procesar archivos del input si los hay
    if (this.fileInput?.nativeElement?.files && this.fileInput.nativeElement.files.length > 0) {
      const event = { target: { files: this.fileInput.nativeElement.files } };
      this.onArchivosSeleccionados(event);
    }
    
    if (!this.nuevoTicket.titulo || !this.nuevoTicket.empresa_id || !this.nuevoTicket.soporte_suscripcion_id) {
      Swal.fire('Error', 'Título, Empresa y Suscripción de Soporte son obligatorios', 'error');
      return;
    }

    // Verificar disponibilidad antes de crear
    if (this.disponibilidadSoporte && !this.disponibilidadSoporte.tiene_disponible) {
      Swal.fire({
        icon: 'error',
        title: 'Sin Disponibilidad',
        text: this.disponibilidadSoporte.mensaje,
        confirmButtonText: 'Entendido'
      });
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
          this.archivosSeleccionados = []; // Limpiar archivos
          this.toggleFormularioTicket();
        }
      },
      error: (error) => {
        // Manejar error de disponibilidad del backend
        if (error.error?.disponibilidad) {
          const disp = error.error.disponibilidad;
          Swal.fire({
            icon: 'warning',
            title: 'Sin Disponibilidad',
            html: `
              <p>${error.error.message}</p>
              <div style="margin-top: 15px; padding: 10px; background: #f3f4f6; border-radius: 8px;">
                <strong>Modalidad:</strong> ${this.getModalidadLabel(disp.modalidad)}<br>
                <strong>Consumido:</strong> ${disp.consumido} / ${disp.maximo}
              </div>
            `,
            confirmButtonText: 'Entendido'
          });
        } else {
          Swal.fire('Error', error.error?.message || 'No se pudo crear el ticket', 'error');
        }
        // NO limpiar archivos aquí - el usuario puede corregir y reintentar
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

  gestionarTicket(ticket: SoporteTicket): void {
    const esTicketCerrado = ticket.estado === 'cerrado' || ticket.estado === 'cancelado';
    const tieneAsignado = !!ticket.asignado_a;
    
    const opcionesHTML = `
      <div class="gestionar-modal">
        <div class="modal-header-custom">
          <div class="icon-circle gestionar">
            <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 15a3 3 0 100-6 3 3 0 000 6z"></path>
              <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z"></path>
            </svg>
          </div>
          <h2>Gestionar Ticket #${ticket.id}</h2>
          <p class="subtitle">Administrar acciones del ticket</p>
        </div>
        
        <div class="info-card">
          <div class="info-row">
            <span class="info-label">Título</span>
            <span class="info-value">${ticket.titulo}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Estado</span>
            <span class="info-value estado-badge estado-${ticket.estado}">${this.getEstadoTicketLabel(ticket.estado)}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Prioridad</span>
            <span class="info-value prioridad-badge prioridad-${ticket.prioridad}">${this.getPrioridadLabel(ticket.prioridad)}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Empresa</span>
            <span class="info-value">${ticket.empresa?.nombre || 'N/A'}</span>
          </div>
        </div>

        ${!tieneAsignado ? `
        <div class="warning-banner">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"></path>
            <line x1="12" y1="9" x2="12" y2="13"></line>
            <line x1="12" y1="17" x2="12.01" y2="17"></line>
          </svg>
          <span>Este ticket no tiene analista asignado. Debes asignarlo antes de agregar comentarios o cerrarlo.</span>
        </div>
        ` : ''}
        
        <div class="form-section">
          <label class="form-label">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"></path>
              <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"></path>
            </svg>
            Acciones disponibles
          </label>
          
          <div class="action-grid">
            <div class="action-item" id="btn-ver-detalle">
              <div class="action-icon primary">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                  <circle cx="12" cy="12" r="3"></circle>
                </svg>
              </div>
              <span class="action-text">Ver Detalle</span>
            </div>
            
            <div class="action-item ${!tieneAsignado ? 'disabled' : ''}" id="btn-agregar-comentario" ${!tieneAsignado ? 'data-disabled="true"' : ''}>
              <div class="action-icon info">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"></path>
                </svg>
              </div>
              <span class="action-text">Comentario</span>
            </div>
            
            ${!esTicketCerrado ? `
              <div class="action-item" id="btn-cambiar-estado">
                <div class="action-icon warning">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="16 3 21 3 21 8"></polyline>
                    <line x1="4" y1="20" x2="21" y2="3"></line>
                    <polyline points="21 16 21 21 16 21"></polyline>
                    <line x1="15" y1="15" x2="21" y2="21"></line>
                  </svg>
                </div>
                <span class="action-text">Cambiar Estado</span>
              </div>
              
              <div class="action-item ${!tieneAsignado ? 'disabled' : ''}" id="btn-cerrar" ${!tieneAsignado ? 'data-disabled="true"' : ''}>
                <div class="action-icon success">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                </div>
                <span class="action-text">Cerrar Ticket</span>
              </div>
            ` : `
              <div class="action-item" id="btn-reabrir">
                <div class="action-icon info">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0118.8-4.3M22 12.5a10 10 0 01-18.8 4.2"/>
                  </svg>
                </div>
                <span class="action-text">Reabrir</span>
              </div>
            `}
          </div>
        </div>
      </div>
      
      <style>
        .gestionar-modal { text-align: left; }
        .modal-header-custom { text-align: center; margin-bottom: 20px; }
        .icon-circle.gestionar { 
          width: 56px; height: 56px; 
          background: linear-gradient(135deg, #8b5cf6, #7c3aed); 
          border-radius: 50%; 
          display: flex; align-items: center; justify-content: center; 
          margin: 0 auto 12px; 
          color: white;
          box-shadow: 0 4px 12px rgba(139, 92, 246, 0.3);
        }
        .modal-header-custom h2 { margin: 0; font-size: 1.5rem; color: #1f2937; }
        .modal-header-custom .subtitle { margin: 4px 0 0; color: #6b7280; font-size: 0.9rem; }
        
        .info-card {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 16px;
          margin-bottom: 20px;
        }
        .info-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 8px 0;
          border-bottom: 1px dashed #e2e8f0;
        }
        .info-row:last-child { border-bottom: none; }
        .info-label { color: #64748b; font-size: 0.9rem; }
        .info-value { font-weight: 600; color: #1f2937; }
        
        .estado-badge, .prioridad-badge {
          padding: 4px 12px;
          border-radius: 20px;
          font-size: 0.85rem;
          font-weight: 600;
        }
        .estado-abierto { background: linear-gradient(135deg, #3b82f6, #2563eb); color: white; }
        .estado-en_proceso { background: linear-gradient(135deg, #f59e0b, #d97706); color: white; }
        .estado-cerrado { background: linear-gradient(135deg, #10b981, #059669); color: white; }
        .prioridad-baja { background: #e2e8f0; color: #64748b; }
        .prioridad-media { background: #fef3c7; color: #d97706; }
        .prioridad-alta { background: #fee2e2; color: #dc2626; }
        .prioridad-critica { background: linear-gradient(135deg, #dc2626, #991b1b); color: white; }
        
        .form-section { margin-bottom: 16px; }
        .form-label {
          display: flex;
          align-items: center;
          gap: 8px;
          font-weight: 600;
          color: #374151;
          margin-bottom: 12px;
          font-size: 0.9rem;
        }
        .form-label svg { color: #6b7280; }
        
        .action-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 12px;
        }
        
        .action-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          padding: 16px;
          border: 2px solid #e2e8f0;
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.2s;
          background: white;
        }
        .action-item:hover {
          border-color: #c4b5fd;
          background: #faf5ff;
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(139, 92, 246, 0.15);
        }
        .action-item.disabled {
          opacity: 0.5;
          cursor: not-allowed;
          pointer-events: none;
        }
        
        .warning-banner {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 16px;
          background: #fef3c7;
          border: 1px solid #fbbf24;
          border-radius: 12px;
          margin-bottom: 20px;
          color: #92400e;
        }
        .warning-banner svg {
          flex-shrink: 0;
          color: #f59e0b;
        }
        .warning-banner span {
          font-size: 0.9rem;
          line-height: 1.4;
        }
        
        .action-icon {
          width: 48px;
          height: 48px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
        }
        .action-icon.primary { background: linear-gradient(135deg, #3b82f6, #2563eb); }
        .action-icon.info { background: linear-gradient(135deg, #06b6d4, #0891b2); }
        .action-icon.warning { background: linear-gradient(135deg, #f59e0b, #d97706); }
        .action-icon.success { background: linear-gradient(135deg, #10b981, #059669); }
        
        .action-text {
          font-size: 0.85rem;
          font-weight: 600;
          color: #374151;
          text-align: center;
        }
      </style>
    `;
    
    Swal.fire({
      html: opcionesHTML,
      showConfirmButton: false,
      showCancelButton: true,
      cancelButtonText: 'Cerrar',
      width: '550px',
      didOpen: () => {
        document.getElementById('btn-ver-detalle')?.addEventListener('click', () => {
          Swal.close();
          this.verDetalleTicket(ticket);
        });
        
        document.getElementById('btn-agregar-comentario')?.addEventListener('click', (e) => {
          const element = e.currentTarget as HTMLElement;
          if (element.getAttribute('data-disabled') === 'true') {
            Swal.fire({
              icon: 'warning',
              title: 'Acción no disponible',
              text: 'Debes asignar un analista al ticket antes de agregar comentarios',
              confirmButtonText: 'Entendido'
            });
            return;
          }
          Swal.close();
          this.mostrarModalComentario(ticket);
        });
        
        document.getElementById('btn-cambiar-estado')?.addEventListener('click', () => {
          Swal.close();
          this.mostrarModalCambiarEstado(ticket);
        });
        
        document.getElementById('btn-cerrar')?.addEventListener('click', (e) => {
          const element = e.currentTarget as HTMLElement;
          if (element.getAttribute('data-disabled') === 'true') {
            Swal.fire({
              icon: 'warning',
              title: 'Acción no disponible',
              text: 'Debes asignar un analista al ticket antes de cerrarlo',
              confirmButtonText: 'Entendido'
            });
            return;
          }
          Swal.close();
          this.cerrarTicket(ticket);
        });
        
        document.getElementById('btn-reabrir')?.addEventListener('click', () => {
          Swal.close();
          this.reabrirTicket(ticket);
        });
      }
    });
  }

  mostrarModalComentario(ticket: SoporteTicket): void {
    let archivosComentario: File[] = [];
    
    const comentarioHTML = `
      <div class="comentario-modal">
        <div class="modal-header-custom">
          <div class="icon-circle comentario">
            <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"></path>
              <path d="M9 10h.01M15 10h.01M9 14h6"></path>
            </svg>
          </div>
          <h2>Agregar Comentario</h2>
          <p class="subtitle">Ticket #${ticket.id} - ${ticket.titulo}</p>
        </div>
        
        <div class="info-card">
          <div class="info-row">
            <span class="info-label">Estado Actual</span>
            <span class="info-value estado-badge estado-${ticket.estado}">${this.getEstadoTicketLabel(ticket.estado)}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Empresa</span>
            <span class="info-value">${ticket.empresa?.nombre || 'N/A'}</span>
          </div>
        </div>
        
        <div class="form-section">
          <label class="form-label">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"></path>
              <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"></path>
            </svg>
            Mensaje
          </label>
          <textarea id="comentario-texto" class="form-textarea" placeholder="Escribe tu comentario aquí..." rows="4"></textarea>
        </div>
        
        <div class="form-section">
          <label class="form-label">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48"></path>
            </svg>
            Archivos adjuntos <span class="optional-text">(opcional)</span>
          </label>
          <div class="file-upload-area">
            <input type="file" id="archivos-comentario" class="file-input-hidden" multiple accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png,.gif">
            <label for="archivos-comentario" class="file-upload-label">
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"></path>
              </svg>
              <span class="upload-text">Click para seleccionar archivos</span>
              <span class="upload-hint">Múltiples archivos (max 5MB c/u)</span>
            </label>
          </div>
          <div id="archivos-preview" class="files-preview"></div>
        </div>
      </div>
      
      <style>
        .comentario-modal { text-align: left; }
        .modal-header-custom { text-align: center; margin-bottom: 20px; }
        .icon-circle.comentario { 
          width: 56px; height: 56px; 
          background: linear-gradient(135deg, #06b6d4, #0891b2); 
          border-radius: 50%; 
          display: flex; align-items: center; justify-content: center; 
          margin: 0 auto 12px; 
          color: white;
          box-shadow: 0 4px 12px rgba(6, 182, 212, 0.3);
        }
        .modal-header-custom h2 { margin: 0; font-size: 1.5rem; color: #1f2937; }
        .modal-header-custom .subtitle { margin: 4px 0 0; color: #6b7280; font-size: 0.9rem; }
        
        .info-card {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 16px;
          margin-bottom: 20px;
        }
        .info-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 8px 0;
          border-bottom: 1px dashed #e2e8f0;
        }
        .info-row:last-child { border-bottom: none; }
        .info-label { color: #64748b; font-size: 0.9rem; }
        .info-value { font-weight: 600; color: #1f2937; }
        
        .estado-badge {
          padding: 4px 12px;
          border-radius: 20px;
          font-size: 0.85rem;
          font-weight: 600;
        }
        .estado-abierto { background: linear-gradient(135deg, #3b82f6, #2563eb); color: white; }
        .estado-en_proceso { background: linear-gradient(135deg, #f59e0b, #d97706); color: white; }
        .estado-cerrado { background: linear-gradient(135deg, #10b981, #059669); color: white; }
        
        .form-section { margin-bottom: 20px; }
        .form-label {
          display: flex;
          align-items: center;
          gap: 8px;
          font-weight: 600;
          color: #374151;
          margin-bottom: 8px;
          font-size: 0.9rem;
        }
        .form-label svg { color: #6b7280; }
        .optional-text { font-weight: 400; color: #9ca3af; font-size: 0.85rem; }
        
        .form-textarea {
          width: 100%;
          padding: 12px;
          border: 1px solid #d1d5db;
          border-radius: 8px;
          font-size: 0.95rem;
          font-family: inherit;
          resize: vertical;
          transition: border-color 0.2s;
        }
        .form-textarea:focus {
          outline: none;
          border-color: #06b6d4;
          box-shadow: 0 0 0 3px rgba(6, 182, 212, 0.1);
        }
        
        .file-upload-area {
          border: 2px dashed #d1d5db;
          border-radius: 12px;
          padding: 24px;
          text-align: center;
          transition: all 0.2s;
          background: #fafafa;
        }
        .file-upload-area:hover {
          border-color: #06b6d4;
          background: #f0fdff;
        }
        
        .file-input-hidden { display: none; }
        
        .file-upload-label {
          cursor: pointer;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
        }
        .file-upload-label svg { color: #6b7280; }
        .upload-text {
          font-weight: 600;
          color: #374151;
          font-size: 0.95rem;
        }
        .upload-hint {
          color: #9ca3af;
          font-size: 0.85rem;
        }
        
        .files-preview {
          margin-top: 16px;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        
        .file-card {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px;
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          transition: all 0.2s;
        }
        .file-card:hover {
          border-color: #06b6d4;
          box-shadow: 0 2px 8px rgba(6, 182, 212, 0.1);
        }
        
        .file-card svg { color: #6b7280; flex-shrink: 0; }
        
        .file-info {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 4px;
          min-width: 0;
        }
        .file-name {
          font-weight: 600;
          color: #374151;
          font-size: 0.9rem;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .file-size {
          color: #9ca3af;
          font-size: 0.85rem;
        }
        
        .file-remove {
          width: 32px;
          height: 32px;
          border-radius: 8px;
          border: none;
          background: #fee2e2;
          color: #dc2626;
          font-size: 1.5rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s;
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          line-height: 1;
        }
        .file-remove:hover {
          background: #dc2626;
          color: white;
        }
      </style>
    `;
    
    Swal.fire({
      html: comentarioHTML,
      showCancelButton: true,
      confirmButtonText: 'Enviar Comentario',
      cancelButtonText: 'Cancelar',
      width: '600px',
      customClass: {
        confirmButton: 'swal2-confirm swal2-styled',
        cancelButton: 'swal2-cancel swal2-styled'
      },
      didOpen: () => {
        const fileInput = document.getElementById('archivos-comentario') as HTMLInputElement;
        const previewDiv = document.getElementById('archivos-preview');
        
        fileInput?.addEventListener('change', (e: any) => {
          const files = Array.from(e.target.files || []) as File[];
          archivosComentario = files.slice(0, 5); // Máximo 5 archivos
          
          if (previewDiv) {
            previewDiv.innerHTML = archivosComentario.map((file, i) => `
              <div class="file-card">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M13 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V9z"></path>
                  <polyline points="13 2 13 9 20 9"></polyline>
                </svg>
                <div class="file-info">
                  <span class="file-name">${file.name}</span>
                  <span class="file-size">${(file.size / 1024).toFixed(2)} KB</span>
                </div>
                <button class="file-remove" data-index="${i}" type="button">×</button>
              </div>
            `).join('');
            
            // Event listeners para eliminar archivos
            previewDiv.querySelectorAll('.file-remove').forEach(btn => {
              btn.addEventListener('click', (e) => {
                const index = parseInt((e.target as HTMLElement).getAttribute('data-index') || '0');
                archivosComentario.splice(index, 1);
                
                const dt = new DataTransfer();
                archivosComentario.forEach(file => dt.items.add(file));
                fileInput.files = dt.files;
                
                fileInput.dispatchEvent(new Event('change'));
              });
            });
          }
        });
      },
      preConfirm: () => {
        const comentarioTexto = (document.getElementById('comentario-texto') as HTMLTextAreaElement)?.value;
        
        if (!comentarioTexto || comentarioTexto.trim().length === 0) {
          Swal.showValidationMessage('El comentario no puede estar vacío');
          return false;
        }
        
        return { comentario: comentarioTexto, archivos: archivosComentario };
      }
    }).then((result) => {
      if (result.isConfirmed && result.value) {
        // Si hay archivos, usar el método con FormData, sino el método tradicional
        if (result.value.archivos && result.value.archivos.length > 0) {
          this.soporteService.agregarComentarioConArchivos(ticket.id, result.value.comentario, result.value.archivos).subscribe({
            next: (response) => {
              Swal.fire('Éxito', 'Comentario agregado con archivos adjuntos', 'success');
              this.cargarTickets();
              if (this.ticketSeleccionado?.id === ticket.id) {
                this.verDetalleTicket(ticket);
              }
            },
            error: (error) => {
              Swal.fire('Error', error.error?.message || 'No se pudo agregar el comentario con archivos', 'error');
            }
          });
        } else {
          this.soporteService.agregarComentarioTicket(ticket.id, result.value.comentario, true).subscribe({
            next: (response) => {
              Swal.fire('Éxito', 'Comentario agregado exitosamente', 'success');
              this.cargarTickets();
              if (this.ticketSeleccionado?.id === ticket.id) {
                this.verDetalleTicket(ticket);
              }
            },
            error: (error) => {
              Swal.fire('Error', error.error?.message || 'No se pudo agregar el comentario', 'error');
            }
          });
        }
      }
    });
  }

  mostrarModalCambiarEstado(ticket: SoporteTicket): void {
    // Cargar lista de administradores para asignación
    this.usuariosService.listarUsuarios({ rol: 'admin' }).subscribe({
      next: (response) => {
        const admins = response.usuarios.filter((u: Usuario) => u.rol === 'admin');
        
        Swal.fire({
          title: `Cambiar Estado/Prioridad - Ticket #${ticket.id}`,
          html: `
            <div style="text-align: left;">
              ${!ticket.asignado_a && ticket.estado === 'abierto' ? `
                <div class="alert-warning" style="background: #fef3c7; border: 1px solid #fde047; padding: 12px; border-radius: 8px; margin-bottom: 15px; color: #854d0e;">
                  <strong>⚠️ Atención:</strong> Para cambiar el estado del ticket, primero debes asignarlo a un analista.
                </div>
              ` : ''}
              
              ${!ticket.asignado_a || ticket.estado === 'abierto' ? `
                <div class="form-group" style="margin-bottom: 15px;">
                  <label style="display: block; margin-bottom: 5px; font-weight: bold;">Asignar a</label>
                  <select id="asignar-a" class="swal2-input" style="width: 100%; padding: 10px;">
                    <option value="">Seleccionar analista...</option>
                    ${admins.map((admin: any) => `
                      <option value="${admin.id}" ${ticket.asignado_a === admin.id ? 'selected' : ''}>
                        ${admin.nombre} ${admin.apellido || ''} (${admin.email})
                      </option>
                    `).join('')}
                  </select>
                </div>
              ` : ''}
              
              <div class="form-group" style="margin-bottom: 15px;">
                <label style="display: block; margin-bottom: 5px; font-weight: bold;">Estado</label>
                <select id="nuevo-estado" class="swal2-input" style="width: 100%; padding: 10px;" ${!ticket.asignado_a && ticket.estado === 'abierto' ? 'disabled' : ''}>
                  <option value="abierto" ${ticket.estado === 'abierto' ? 'selected' : ''}>Abierto</option>
                  <option value="en_proceso" ${ticket.estado === 'en_proceso' ? 'selected' : ''}>En Proceso</option>
                  <option value="pendiente_respuesta" ${ticket.estado === 'pendiente_respuesta' ? 'selected' : ''}>Pendiente Respuesta</option>
                  <option value="cerrado" ${ticket.estado === 'cerrado' ? 'selected' : ''}>Cerrado</option>
                  <option value="cancelado" ${ticket.estado === 'cancelado' ? 'selected' : ''}>Cancelado</option>
                </select>
              </div>
              <div class="form-group">
                <label style="display: block; margin-bottom: 5px; font-weight: bold;">Prioridad</label>
                <select id="nueva-prioridad" class="swal2-input" style="width: 100%; padding: 10px;">
                  <option value="baja" ${ticket.prioridad === 'baja' ? 'selected' : ''}>Baja</option>
                  <option value="media" ${ticket.prioridad === 'media' ? 'selected' : ''}>Media</option>
                  <option value="alta" ${ticket.prioridad === 'alta' ? 'selected' : ''}>Alta</option>
                  <option value="critica" ${ticket.prioridad === 'critica' ? 'selected' : ''}>Crítica</option>
                </select>
              </div>
            </div>
          `,
          showCancelButton: true,
          confirmButtonText: 'Guardar Cambios',
          cancelButtonText: 'Cancelar',
          confirmButtonColor: '#28a745',
          didOpen: () => {
            // Habilitar/deshabilitar estado según asignación
            const asignarSelect = document.getElementById('asignar-a') as HTMLSelectElement;
            const estadoSelect = document.getElementById('nuevo-estado') as HTMLSelectElement;
            
            if (asignarSelect && estadoSelect) {
              asignarSelect.addEventListener('change', () => {
                if (asignarSelect.value) {
                  estadoSelect.disabled = false;
                } else if (!ticket.asignado_a && ticket.estado === 'abierto') {
                  estadoSelect.disabled = true;
                }
              });
            }
          },
          preConfirm: () => {
            const asignarSelect = document.getElementById('asignar-a') as HTMLSelectElement;
            const nuevoEstado = (document.getElementById('nuevo-estado') as HTMLSelectElement).value;
            const nuevaPrioridad = (document.getElementById('nueva-prioridad') as HTMLSelectElement).value;
            
            // Validar que si el ticket está abierto y sin asignar, se debe asignar primero
            if (!ticket.asignado_a && ticket.estado === 'abierto' && nuevoEstado !== 'abierto') {
              if (!asignarSelect || !asignarSelect.value) {
                Swal.showValidationMessage('Debes asignar el ticket a un analista antes de cambiar su estado');
                return false;
              }
            }
            
            return { 
              estado: nuevoEstado, 
              prioridad: nuevaPrioridad,
              asignado_a: asignarSelect?.value ? parseInt(asignarSelect.value) : undefined
            };
          }
        }).then((result) => {
      if (result.isConfirmed && result.value) {
        const cambios: any = {};
        
        // Agregar asignación si se seleccionó
        if (result.value.asignado_a !== undefined && result.value.asignado_a !== ticket.asignado_a) {
          cambios.asignado_a = result.value.asignado_a || null;
        }
        
        if (result.value.estado !== ticket.estado) {
          cambios.estado = result.value.estado;
        }
        
        if (result.value.prioridad !== ticket.prioridad) {
          cambios.prioridad = result.value.prioridad;
        }
        
        if (Object.keys(cambios).length === 0) {
          Swal.fire('Info', 'No se realizaron cambios', 'info');
          return;
        }
        
        this.soporteService.actualizarTicket(ticket.id, cambios).subscribe({
          next: () => {
            Swal.fire('Éxito', 'Ticket actualizado exitosamente', 'success');
            this.cargarTickets();
            if (this.ticketSeleccionado?.id === ticket.id) {
              this.verDetalleTicket(ticket);
            }
          },
          error: (error) => {
            Swal.fire('Error', error.error?.message || 'No se pudo actualizar el ticket', 'error');
          }
        });
      }
        });
      },
      error: (error) => {
        Swal.fire('Error', 'No se pudieron cargar los analistas', 'error');
      }
    });
  }

  cerrarTicket(ticket: SoporteTicket): void {
    // Validar que el ticket tenga analista asignado
    if (!ticket.asignado_a) {
      Swal.fire({
        icon: 'warning',
        title: 'Acción no disponible',
        text: 'No se puede cerrar un ticket sin analista asignado. Por favor, asigna un analista primero.',
        confirmButtonText: 'Entendido'
      });
      return;
    }

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

  cancelarTicket(ticket: SoporteTicket): void {
    Swal.fire({
      title: '¿Cancelar Ticket?',
      html: `
        <p>El ticket cancelado <strong>NO consumirá cupo</strong> de la suscripción.</p>
        <p>Esta acción no se puede deshacer.</p>
      `,
      input: 'textarea',
      inputLabel: 'Motivo de cancelación (opcional)',
      inputPlaceholder: 'Ingrese el motivo de la cancelación...',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, cancelar',
      cancelButtonText: 'No, mantener',
      confirmButtonColor: '#d33'
    }).then((result) => {
      if (result.isConfirmed) {
        this.soporteService.cancelarTicket(ticket.id, result.value).subscribe({
          next: () => {
            Swal.fire('Cancelado', 'El ticket ha sido cancelado y no consumirá cupo', 'success');
            this.cargarTickets();
            if (this.ticketSeleccionado?.id === ticket.id) {
              this.cerrarDetalleTicket();
            }
          },
          error: (error) => {
            Swal.fire('Error', error.error?.message || 'No se pudo cancelar el ticket', 'error');
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

        this.archivosSeleccionados = []; // Limpiar archivos después de subir
        this.cargarTickets();
        this.toggleFormularioTicket();
      },
      error: (error) => {
        this.subiendoArchivos = false;
        Swal.fire('Error', error.error?.message || 'Error al subir archivos', 'error');
        // Aún así cerrar el formulario ya que el ticket fue creado
        this.archivosSeleccionados = []; // Limpiar archivos incluso con error
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

  descargarArchivoTicket(ticketId: number, filename: string): void {
    this.soporteService.descargarArchivoTicket(ticketId, filename).subscribe({
      next: (blob) => {
        // Crear URL temporal para el blob
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      },
      error: (error) => {
        Swal.fire('Error', 'No se pudo descargar el archivo', 'error');
      }
    });
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
          
          ${pago.detalle ? `
          <div class="seccion">
            <h3 class="seccion-titulo"><span class="icon">📝</span> Detalle</h3>
            <div class="info-card" style="background: #f8fafc; padding: 12px; border-radius: 8px; border-left: 3px solid #06b6d4;">
              <p style="margin: 0; color: #475569; white-space: pre-wrap;">${pago.detalle}</p>
            </div>
          </div>
          ` : ''}
          
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
      next: (response) => {
        // Manejar tanto el formato antiguo (array) como el nuevo (objeto con paginación)
        this.pagos = response.pagos || response || [];
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
    } else {
      // Cargar todas las suscripciones (incluyendo inactivas) para el formulario de pago
      this.cargarTodasSuscripciones();
    }
  }

  cargarTodasSuscripciones(): void {
    // Cargar todas las suscripciones sin filtros para el formulario de pago
    this.soporteService.listarSoporteSuscripciones({}).subscribe({
      next: (response) => {
        // Manejar tanto el formato antiguo (array) como el nuevo (objeto con paginación)
        this.soporteSuscripciones = response.suscripciones || response || [];
      },
      error: (error) => {
        console.error('Error al cargar suscripciones:', error);
      }
    });
  }

  limpiarFormularioPago(): void {
    this.nuevoPago = {
      soporte_suscripcion_id: 0,
      fecha_pago: new Date().toISOString().split('T')[0],
      monto: 0,
      estado: 'exitoso'
    };
    this.montoFormateado = '';
  }

  formatearMonto(): void {
    // Eliminar caracteres no numéricos
    const valorLimpio = this.montoFormateado.replace(/[^\d]/g, '');
    
    if (valorLimpio) {
      const numero = parseInt(valorLimpio, 10);
      this.nuevoPago.monto = numero;
      
      // Formatear con separador de miles
      this.montoFormateado = '$ ' + numero.toLocaleString('es-CO');
    } else {
      this.nuevoPago.monto = 0;
      this.montoFormateado = '';
    }
  }

  desformatearMonto(): void {
    // Al hacer focus, mostrar solo el número sin formato
    if (this.nuevoPago.monto > 0) {
      this.montoFormateado = this.nuevoPago.monto.toString();
    }
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

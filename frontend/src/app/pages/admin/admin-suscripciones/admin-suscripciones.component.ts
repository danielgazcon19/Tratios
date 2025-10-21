import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AdminSuscripcionesService, Suscripcion, CrearSuscripcionDto } from '../../../services/admin-suscripciones.service';
import { AdminEmpresasService, Empresa } from '../../../services/admin-empresas.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-admin-suscripciones',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, RouterLinkActive],
  templateUrl: './admin-suscripciones.component.html',
  styleUrl: './admin-suscripciones.component.css'
})
export class AdminSuscripcionesComponent implements OnInit {
  suscripciones: Suscripcion[] = [];
  empresas: Empresa[] = [];
  cargando = false;
  filtroEstado = '';
  
  // Formulario de nueva suscripción
  mostrarFormulario = false;
  nuevaSuscripcion: CrearSuscripcionDto = {
    empresa_id: 0,
    plan_id: 0,
    periodo: 'mensual'
  };

  constructor(
    private adminSuscripcionesService: AdminSuscripcionesService,
    private adminEmpresasService: AdminEmpresasService
  ) {}

  ngOnInit(): void {
    this.cargarSuscripciones();
    this.cargarEmpresas();
  }

  cargarSuscripciones(): void {
    this.cargando = true;
    const filtros = this.filtroEstado ? { estado: this.filtroEstado } : undefined;
    
    this.adminSuscripcionesService.listarSuscripciones(filtros).subscribe({
      next: (suscripciones) => {
        this.suscripciones = suscripciones;
        this.cargando = false;
      },
      error: (error) => {
        console.error('Error al cargar suscripciones:', error);
        Swal.fire('Error', 'No se pudieron cargar las suscripciones', 'error');
        this.cargando = false;
      }
    });
  }

  cargarEmpresas(): void {
    this.adminEmpresasService.listarEmpresas().subscribe({
      next: (empresas) => {
        this.empresas = empresas.filter(e => e.estado); // Solo empresas activas
      },
      error: (error) => {
        console.error('Error al cargar empresas:', error);
      }
    });
  }

  filtrarPorEstado(): void {
    this.cargarSuscripciones();
  }

  toggleFormulario(): void {
    this.mostrarFormulario = !this.mostrarFormulario;
    if (!this.mostrarFormulario) {
      this.limpiarFormulario();
    }
  }

  limpiarFormulario(): void {
    this.nuevaSuscripcion = {
      empresa_id: 0,
      plan_id: 0,
      periodo: 'mensual',
      forma_pago: ''
    };
  }

  crearSuscripcion(): void {
    if (!this.nuevaSuscripcion.empresa_id || !this.nuevaSuscripcion.plan_id || !this.nuevaSuscripcion.forma_pago) {
      Swal.fire('Error', 'Empresa, Plan y Forma de Pago son obligatorios', 'error');
      return;
    }

    this.adminSuscripcionesService.crearSuscripcion(this.nuevaSuscripcion).subscribe({
      next: (response) => {
        Swal.fire('Éxito', response.message, 'success');
        this.cargarSuscripciones();
        this.toggleFormulario();
      },
      error: (error) => {
        console.error('Error al crear suscripción:', error);
        Swal.fire('Error', error.error.message || 'No se pudo crear la suscripción', 'error');
      }
    });
  }

  renovarSuscripcion(suscripcion: Suscripcion): void {
    Swal.fire({
      title: 'Renovar Suscripción',
      html: `
        <div style="text-align: left;">
          <p>¿Deseas renovar la suscripción de <strong>${suscripcion.empresa?.nombre || 'esta empresa'}</strong>?</p>
          <label style="display: block; margin-top: 10px;">Periodo:</label>
          <select id="periodo" class="swal2-input">
            <option value="mensual">Mensual</option>
            <option value="anual">Anual</option>
          </select>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: 'Renovar',
      cancelButtonText: 'Cancelar',
      preConfirm: () => {
        const periodo = (document.getElementById('periodo') as HTMLSelectElement).value;
        return { periodo };
      }
    }).then((result) => {
      if (result.isConfirmed && result.value) {
        this.adminSuscripcionesService.renovarSuscripcion(suscripcion.id, result.value).subscribe({
          next: (response) => {
            Swal.fire('Éxito', response.message, 'success');
            this.cargarSuscripciones();
          },
          error: (error) => {
            console.error('Error al renovar suscripción:', error);
            Swal.fire('Error', error.error.message || 'No se pudo renovar la suscripción', 'error');
          }
        });
      }
    });
  }

  cancelarSuscripcion(suscripcion: Suscripcion): void {
    Swal.fire({
      title: 'Cancelar Suscripción',
      html: `
        <div style="text-align: left;">
          <p>¿Deseas cancelar la suscripción de <strong>${suscripcion.empresa?.nombre || 'esta empresa'}</strong>?</p>
          <label style="display: block; margin-top: 10px;">Motivo de cancelación:</label>
          <input id="motivo" class="swal2-input" placeholder="Motivo...">
          <label style="display: block; margin-top: 10px;">Notas (opcional):</label>
          <textarea id="notas" class="swal2-textarea" placeholder="Notas adicionales..."></textarea>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: 'Cancelar suscripción',
      cancelButtonText: 'Volver',
      confirmButtonColor: '#dc3545',
      preConfirm: () => {
        const motivo = (document.getElementById('motivo') as HTMLInputElement).value;
        const notas = (document.getElementById('notas') as HTMLTextAreaElement).value;
        
        if (!motivo) {
          Swal.showValidationMessage('El motivo es obligatorio');
          return false;
        }
        
        return { motivo, notas };
      }
    }).then((result) => {
      if (result.isConfirmed && result.value) {
        this.adminSuscripcionesService.cancelarSuscripcion(suscripcion.id, result.value).subscribe({
          next: (response) => {
            Swal.fire('Cancelada', response.message, 'success');
            this.cargarSuscripciones();
          },
          error: (error) => {
            console.error('Error al cancelar suscripción:', error);
            Swal.fire('Error', error.error.message || 'No se pudo cancelar la suscripción', 'error');
          }
        });
      }
    });
  }

  suspenderSuscripcion(suscripcion: Suscripcion): void {
    Swal.fire({
      title: 'Suspender Suscripción',
      input: 'text',
      inputLabel: 'Motivo de suspensión',
      inputPlaceholder: 'Ingresa el motivo...',
      showCancelButton: true,
      confirmButtonText: 'Suspender',
      cancelButtonText: 'Cancelar',
      inputValidator: (value) => {
        if (!value) {
          return 'El motivo es obligatorio';
        }
        return null;
      }
    }).then((result) => {
      if (result.isConfirmed && result.value) {
        this.adminSuscripcionesService.suspenderSuscripcion(suscripcion.id, result.value).subscribe({
          next: (response) => {
            Swal.fire('Suspendida', response.message, 'success');
            this.cargarSuscripciones();
          },
          error: (error) => {
            console.error('Error al suspender suscripción:', error);
            Swal.fire('Error', error.error.message || 'No se pudo suspender la suscripción', 'error');
          }
        });
      }
    });
  }

  reactivarSuscripcion(suscripcion: Suscripcion): void {
    Swal.fire({
      title: '¿Reactivar suscripción?',
      text: `¿Deseas reactivar la suscripción de ${suscripcion.empresa?.nombre || 'esta empresa'}?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sí, reactivar',
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        this.adminSuscripcionesService.reactivarSuscripcion(suscripcion.id).subscribe({
          next: (response) => {
            Swal.fire('Reactivada', response.message, 'success');
            this.cargarSuscripciones();
          },
          error: (error) => {
            console.error('Error al reactivar suscripción:', error);
            Swal.fire('Error', error.error.message || 'No se pudo reactivar la suscripción', 'error');
          }
        });
      }
    });
  }

  verDetalle(suscripcion: Suscripcion): void {
    const empresa = suscripcion.empresa?.nombre || 'N/A';
    const plan = suscripcion.plan?.nombre || 'N/A';
    const periodo = suscripcion.periodo;
    const estado = suscripcion.estado;
    const fechaInicio = new Date(suscripcion.fecha_inicio).toLocaleDateString();
    const fechaFin = new Date(suscripcion.fecha_fin).toLocaleDateString();
    const precio = suscripcion.precio_pagado;
    const formaPago = this.formatearFormaPago(suscripcion.forma_pago);

    Swal.fire({
      title: 'Detalle de Suscripción',
      html: `
        <div style="text-align: left; padding: 10px;">
          <p><strong>Empresa:</strong> ${empresa}</p>
          <p><strong>Plan:</strong> ${plan}</p>
          <p><strong>Periodo:</strong> ${periodo}</p>
          <p><strong>Estado:</strong> ${estado}</p>
          <p><strong>Fecha inicio:</strong> ${fechaInicio}</p>
          <p><strong>Fecha fin:</strong> ${fechaFin}</p>
          <p><strong>Precio:</strong> $${precio?.toLocaleString('es-CO')}</p>
          <p><strong>Forma de pago:</strong> ${formaPago}</p>
          ${suscripcion.motivo_cancelacion ? `<p><strong>Motivo cancelación:</strong> ${suscripcion.motivo_cancelacion}</p>` : ''}
          ${suscripcion.notas ? `<p><strong>Notas:</strong> ${suscripcion.notas}</p>` : ''}
        </div>
      `,
      confirmButtonText: 'Cerrar'
    });
  }

  formatearFormaPago(formaPago?: string): string {
    if (!formaPago) return 'N/A';
    
    const traducciones: { [key: string]: string } = {
      'efectivo': 'Efectivo',
      'transferencia': 'Transferencia Bancaria',
      'tarjeta_credito': 'Tarjeta de Crédito',
      'tarjeta_debito': 'Tarjeta de Débito',
      'pse': 'PSE',
      'nequi': 'Nequi',
      'daviplata': 'Daviplata'
    };
    
    return traducciones[formaPago] || formaPago;
  }
}

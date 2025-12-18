import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AdminEmpresasService, Empresa, CrearEmpresaDto } from '../../../services/admin-empresas.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-admin-empresas',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, RouterLinkActive],
  templateUrl: './admin-empresas.component.html',
  styleUrl: './admin-empresas.component.css'
})
export class AdminEmpresasComponent implements OnInit {
  empresas: Empresa[] = [];
  cargando = false;
  
  // Formulario de nueva empresa
  mostrarFormulario = false;
  nuevaEmpresa: CrearEmpresaDto = {
    nombre: '',
    nit: '',
    contacto: '',
    plan: 'basico'
  };

  constructor(private adminEmpresasService: AdminEmpresasService) {}

  ngOnInit(): void {
    this.cargarEmpresas();
  }

  cargarEmpresas(): void {
    this.cargando = true;
    this.adminEmpresasService.listarEmpresas().subscribe({
      next: (empresas) => {
        this.empresas = empresas;
        this.cargando = false;
      },
      error: (error) => {
        console.error('Error al cargar empresas:', error);
        Swal.fire('Error', 'No se pudieron cargar las empresas', 'error');
        this.cargando = false;
      }
    });
  }

  toggleFormulario(): void {
    this.mostrarFormulario = !this.mostrarFormulario;
    if (!this.mostrarFormulario) {
      this.limpiarFormulario();
    }
  }

  limpiarFormulario(): void {
    this.nuevaEmpresa = {
      nombre: '',
      nit: '',
      contacto: '',
      plan: 'basico'
    };
  }

  crearEmpresa(): void {
    if (!this.nuevaEmpresa.nombre || !this.nuevaEmpresa.nit) {
      Swal.fire('Error', 'Nombre y NIT son obligatorios', 'error');
      return;
    }

    this.adminEmpresasService.crearEmpresa(this.nuevaEmpresa).subscribe({
      next: (response) => {
        Swal.fire('Éxito', response.message, 'success');
        this.cargarEmpresas();
        this.toggleFormulario();
      },
      error: (error) => {
        console.error('Error al crear empresa:', error);
        Swal.fire('Error', error.error.message || 'No se pudo crear la empresa', 'error');
      }
    });
  }

  editarEmpresa(empresa: Empresa): void {
    Swal.fire({
      title: 'Editar Empresa',
      html: `
        <div style="text-align: left;">
          <label style="display: block; margin-bottom: 5px;">Nombre:</label>
          <input id="swal-nombre" class="swal2-input" placeholder="Nombre" value="${empresa.nombre}" style="margin-top: 0;">
          
          <label style="display: block; margin-bottom: 5px; margin-top: 10px;">NIT:</label>
          <input id="swal-nit" class="swal2-input" placeholder="NIT" value="${empresa.nit}" style="margin-top: 0;">
          
          <label style="display: block; margin-bottom: 5px; margin-top: 10px;">Contacto:</label>
          <input id="swal-contacto" class="swal2-input" placeholder="Contacto" value="${empresa.contacto || ''}" style="margin-top: 0;">
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: 'Guardar',
      cancelButtonText: 'Cancelar',
      focusConfirm: false,
      preConfirm: () => {
        const nombre = (document.getElementById('swal-nombre') as HTMLInputElement)?.value;
        const nit = (document.getElementById('swal-nit') as HTMLInputElement)?.value;
        const contacto = (document.getElementById('swal-contacto') as HTMLInputElement)?.value;
        
        if (!nombre || !nit) {
          Swal.showValidationMessage('Nombre y NIT son obligatorios');
          return false;
        }
        
        return {
          nombre: nombre,
          nit: nit,
          contacto: contacto
        };
      }
    }).then((result) => {
      if (result.isConfirmed && result.value) {

        this.adminEmpresasService.actualizarEmpresa(empresa.id, result.value).subscribe({
          next: (response) => {
            Swal.fire('Éxito', response.message, 'success');
            this.cargarEmpresas();
          },
          error: (error) => {
            console.error('Error al actualizar empresa:', error);
            Swal.fire('Error', error.error.message || 'No se pudo actualizar la empresa', 'error');
          }
        });
      }
    });
  }

  eliminarEmpresa(empresa: Empresa): void {
    Swal.fire({
      title: '¿Desactivar empresa?',
      text: `¿Estás seguro de desactivar "${empresa.nombre}"? Esta acción cancelará todas sus suscripciones activas.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Sí, desactivar',
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        this.adminEmpresasService.eliminarEmpresa(empresa.id).subscribe({
          next: (response) => {
            Swal.fire('Desactivada', response.message, 'success');
            this.cargarEmpresas();
          },
          error: (error) => {
            console.error('Error al eliminar empresa:', error);
            Swal.fire('Error', error.error.message || 'No se pudo desactivar la empresa', 'error');
          }
        });
      }
    });
  }

  activarEmpresa(empresa: Empresa): void {
    Swal.fire({
      title: '¿Activar empresa?',
      text: `¿Estás seguro de activar "${empresa.nombre}"?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#28a745',
      cancelButtonColor: '#6c757d',
      confirmButtonText: 'Sí, activar',
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        this.adminEmpresasService.activarEmpresa(empresa.id).subscribe({
          next: (response) => {
            Swal.fire('Activada', response.message, 'success');
            this.cargarEmpresas();
          },
          error: (error) => {
            console.error('Error al activar empresa:', error);
            Swal.fire('Error', error.error.message || 'No se pudo activar la empresa', 'error');
          }
        });
      }
    });
  }

  verDetalle(empresa: Empresa): void {
    this.adminEmpresasService.obtenerEmpresa(empresa.id).subscribe({
      next: (empresaDetalle) => {
        let html = `
          <div style="text-align: left;">
            <p><strong>NIT:</strong> ${empresaDetalle.nit}</p>
            <p><strong>Contacto:</strong> ${empresaDetalle.contacto || 'N/A'}</p>
            <p><strong>Plan:</strong> ${empresaDetalle.plan}</p>
            <p><strong>Estado:</strong> ${empresaDetalle.estado ? 'Activa' : 'Inactiva'}</p>
            <h4>Suscripciones:</h4>
        `;
        
        if (empresaDetalle.suscripcion_activa) {
          html += `<p>✅ Suscripción activa: ${empresaDetalle.suscripcion_activa.plan?.nombre || 'N/A'}</p>`;
        } else {
          html += `<p>❌ Sin suscripción activa</p>`;
        }
        
        html += `</div>`;
        
        Swal.fire({
          title: empresaDetalle.nombre,
          html: html,
          width: 600
        });
      },
      error: (error) => {
        console.error('Error al obtener detalle:', error);
        Swal.fire('Error', 'No se pudo cargar el detalle de la empresa', 'error');
      }
    });
  }
}

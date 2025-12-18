import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AdminServiciosService, Servicio, CrearServicioDto } from '../../../services/admin-servicios.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-admin-servicios',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, RouterLinkActive],
  templateUrl: './admin-servicios.component.html',
  styleUrl: './admin-servicios.component.css'
})
export class AdminServiciosComponent implements OnInit {
  servicios: Servicio[] = [];
  cargando = false;
  mostrarFormulario = false;
  modoEdicion = false;
  servicioEditandoId: number | null = null;
  filtroActivo: string = 'todos'; // 'todos', 'activos', 'inactivos'

  nuevoServicio: CrearServicioDto = {
    nombre: '',
    descripcion: '',
    activo: true
  };

  constructor(private adminServiciosService: AdminServiciosService) {}

  ngOnInit(): void {
    this.cargarServicios();
  }

  cargarServicios(): void {
    this.cargando = true;
    const filtro = this.filtroActivo === 'todos' ? undefined : this.filtroActivo === 'activos';
    
    this.adminServiciosService.listarServicios(filtro).subscribe({
      next: (servicios) => {
        this.servicios = servicios;
        this.cargando = false;
      },
      error: (error) => {
        console.error('Error al cargar servicios:', error);
        Swal.fire('Error', 'No se pudieron cargar los servicios', 'error');
        this.cargando = false;
      }
    });
  }

  filtrar(): void {
    this.cargarServicios();
  }

  toggleFormulario(): void {
    this.mostrarFormulario = !this.mostrarFormulario;
    // Solo limpiar cuando se cierra el formulario
    if (!this.mostrarFormulario) {
      this.limpiarFormulario();
    }
  }

  limpiarFormulario(): void {
    this.nuevoServicio = {
      nombre: '',
      descripcion: '',
      activo: true,
      url_api: ''
    };
    this.modoEdicion = false;
    this.servicioEditandoId = null;
  }

  crearServicio(): void {
    if (!this.nuevoServicio.nombre) {
      Swal.fire('Error', 'El nombre es obligatorio', 'error');
      return;
    }

    this.adminServiciosService.crearServicio(this.nuevoServicio).subscribe({
      next: (response) => {
        Swal.fire('Éxito', response.message, 'success');
        this.cargarServicios();
        this.toggleFormulario();
      },
      error: (error) => {
        console.error('Error al crear servicio:', error);
        Swal.fire('Error', error.error.message || 'No se pudo crear el servicio', 'error');
      }
    });
  }

  editarServicio(servicio: Servicio): void {
    this.modoEdicion = true;
    this.servicioEditandoId = servicio.id;
    this.nuevoServicio = {
      nombre: servicio.nombre,
      descripcion: servicio.descripcion || '',
      activo: servicio.activo,
      url_api: servicio.url_api || ''
    };
    this.mostrarFormulario = true;
  }

  actualizarServicio(): void {
    if (!this.servicioEditandoId) return;

    if (!this.nuevoServicio.nombre) {
      Swal.fire('Error', 'El nombre es obligatorio', 'error');
      return;
    }

    this.adminServiciosService.actualizarServicio(this.servicioEditandoId, this.nuevoServicio).subscribe({
      next: (response) => {
        Swal.fire('Éxito', response.message, 'success');
        this.cargarServicios();
        this.toggleFormulario();
      },
      error: (error) => {
        console.error('Error al actualizar servicio:', error);
        Swal.fire('Error', error.error.message || 'No se pudo actualizar el servicio', 'error');
      }
    });
  }

  toggleEstado(servicio: Servicio): void {
    const accion = servicio.activo ? 'desactivar' : 'activar';
    
    Swal.fire({
      title: `¿${accion.charAt(0).toUpperCase() + accion.slice(1)} Servicio?`,
      html: `¿Estás seguro de ${accion} el servicio <strong>"${servicio.nombre}"</strong>?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: servicio.activo ? '#dc3545' : '#28a745',
      cancelButtonColor: '#6c757d',
      confirmButtonText: `Sí, ${accion}`,
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        this.adminServiciosService.toggleServicio(servicio.id).subscribe({
          next: (response) => {
            Swal.fire('Éxito', response.message, 'success');
            this.cargarServicios();
          },
          error: (error) => {
            console.error('Error al cambiar estado:', error);
            Swal.fire('Error', error.error.message || 'No se pudo cambiar el estado', 'error');
          }
        });
      }
    });
  }

  eliminarServicio(servicio: Servicio): void {
    Swal.fire({
      title: '¿Eliminar Servicio?',
      html: `¿Estás seguro de eliminar el servicio <strong>"${servicio.nombre}"</strong>?<br><small>Esta acción no se puede deshacer.</small>`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        this.adminServiciosService.eliminarServicio(servicio.id).subscribe({
          next: (response) => {
            Swal.fire('Eliminado', response.message, 'success');
            this.cargarServicios();
          },
          error: (error) => {
            console.error('Error al eliminar servicio:', error);
            Swal.fire('Error', error.error.message || 'No se pudo eliminar el servicio', 'error');
          }
        });
      }
    });
  }

  guardarServicio(): void {
    if (this.modoEdicion) {
      this.actualizarServicio();
    } else {
      this.crearServicio();
    }
  }
}

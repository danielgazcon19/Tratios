import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AdminPlanesService, Plan, CrearPlanDto } from '../../../services/admin-planes.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-admin-planes',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, RouterLinkActive],
  templateUrl: './admin-planes.component.html',
  styleUrl: './admin-planes.component.css'
})
export class AdminPlanesComponent implements OnInit {
  planes: Plan[] = [];
  cargando = false;
  mostrarFormulario = false;
  modoEdicion = false;
  planEditandoId: number | null = null;

  nuevoPlan: CrearPlanDto = {
    nombre: '',
    precio_mensual: 0,
    precio_anual: 0,
    descripcion: ''
  };

  constructor(private adminPlanesService: AdminPlanesService) {}

  ngOnInit(): void {
    this.cargarPlanes();
  }

  cargarPlanes(): void {
    this.cargando = true;
    this.adminPlanesService.listarPlanes().subscribe({
      next: (planes) => {
        this.planes = planes;
        this.cargando = false;
      },
      error: (error) => {
        console.error('Error al cargar planes:', error);
        Swal.fire('Error', 'No se pudieron cargar los planes', 'error');
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
    this.nuevoPlan = {
      nombre: '',
      precio_mensual: 0,
      precio_anual: 0,
      descripcion: '',
      seleccionado: false
    };
    this.modoEdicion = false;
    this.planEditandoId = null;
  }

  crearPlan(): void {
    if (!this.nuevoPlan.nombre || !this.nuevoPlan.precio_mensual || !this.nuevoPlan.precio_anual) {
      Swal.fire('Error', 'Nombre y precios son obligatorios', 'error');
      return;
    }

    this.adminPlanesService.crearPlan(this.nuevoPlan).subscribe({
      next: (response) => {
        Swal.fire('Éxito', response.message, 'success');
        this.cargarPlanes();
        this.toggleFormulario();
      },
      error: (error) => {
        console.error('Error al crear plan:', error);
        Swal.fire('Error', error.error.message || 'No se pudo crear el plan', 'error');
      }
    });
  }

  editarPlan(plan: Plan): void {
    this.modoEdicion = true;
    this.planEditandoId = plan.id;
    this.nuevoPlan = {
      nombre: plan.nombre,
      precio_mensual: plan.precio_mensual,
      precio_anual: plan.precio_anual,
      descripcion: plan.descripcion || '',
      seleccionado: plan.seleccionado || false
    };
    this.mostrarFormulario = true;
  }

  actualizarPlan(): void {
    if (!this.planEditandoId) return;

    if (!this.nuevoPlan.nombre || !this.nuevoPlan.precio_mensual || !this.nuevoPlan.precio_anual) {
      Swal.fire('Error', 'Nombre y precios son obligatorios', 'error');
      return;
    }

    this.adminPlanesService.actualizarPlan(this.planEditandoId, this.nuevoPlan).subscribe({
      next: (response) => {
        Swal.fire('Éxito', response.message, 'success');
        this.cargarPlanes();
        this.toggleFormulario();
      },
      error: (error) => {
        console.error('Error al actualizar plan:', error);
        Swal.fire('Error', error.error.message || 'No se pudo actualizar el plan', 'error');
      }
    });
  }

  eliminarPlan(plan: Plan): void {
    Swal.fire({
      title: '¿Eliminar Plan?',
      html: `¿Estás seguro de eliminar el plan <strong>"${plan.nombre}"</strong>?<br><small>Esta acción no se puede deshacer.</small>`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        this.adminPlanesService.eliminarPlan(plan.id).subscribe({
          next: (response) => {
            Swal.fire('Eliminado', response.message, 'success');
            this.cargarPlanes();
          },
          error: (error) => {
            console.error('Error al eliminar plan:', error);
            Swal.fire('Error', error.error.message || 'No se pudo eliminar el plan', 'error');
          }
        });
      }
    });
  }

  guardarPlan(): void {
    if (this.modoEdicion) {
      this.actualizarPlan();
    } else {
      this.crearPlan();
    }
  }
}

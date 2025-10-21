import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CdkDragDrop, DragDropModule, moveItemInArray, transferArrayItem } from '@angular/cdk/drag-drop';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AdminPlanServiciosService, PlanConServicios } from '../../../services/admin-plan-servicios.service';
import { AdminServiciosService, Servicio } from '../../../services/admin-servicios.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-admin-plan-servicios',
  standalone: true,
  imports: [CommonModule, DragDropModule, RouterLink, RouterLinkActive],
  templateUrl: './admin-plan-servicios.component.html',
  styleUrl: './admin-plan-servicios.component.css'
})
export class AdminPlanServiciosComponent implements OnInit {
  planes: PlanConServicios[] = [];
  serviciosDisponibles: Servicio[] = [];
  cargando = false;
  planSeleccionado: PlanConServicios | null = null;

  // IDs para conectar las listas de drop
  get planesListIds(): string[] {
    return this.planes.map(p => `plan-${p.id}`);
  }

  constructor(
    private adminPlanServiciosService: AdminPlanServiciosService,
    private adminServiciosService: AdminServiciosService
  ) {}

  ngOnInit(): void {
    this.cargarDatos();
  }

  cargarDatos(): void {
    this.cargando = true;
    
    // Cargar planes con servicios
    this.adminPlanServiciosService.obtenerResumen().subscribe({
      next: (planes) => {
        this.planes = planes;
        this.cargarServiciosDisponibles();
      },
      error: (error) => {
        console.error('Error al cargar planes:', error);
        Swal.fire('Error', 'No se pudieron cargar los planes', 'error');
        this.cargando = false;
      }
    });
  }

  cargarServiciosDisponibles(): void {
    // Cargar solo servicios activos
    this.adminServiciosService.listarServicios(true).subscribe({
      next: (servicios) => {
        this.serviciosDisponibles = servicios;
        this.cargando = false;
      },
      error: (error) => {
        console.error('Error al cargar servicios:', error);
        this.cargando = false;
      }
    });
  }

  seleccionarPlan(plan: PlanConServicios): void {
    this.planSeleccionado = plan;
  }

  drop(event: CdkDragDrop<Servicio[]>, planId: number): void {
    if (event.previousContainer === event.container) {
      // Reordenar dentro del mismo contenedor
      moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
    } else {
      // Transferir entre contenedores
      const servicio = event.previousContainer.data[event.previousIndex];
      
      // Agregar el servicio al plan
      this.adminPlanServiciosService.agregarServicio(planId, servicio.id).subscribe({
        next: (response) => {
          transferArrayItem(
            event.previousContainer.data,
            event.container.data,
            event.previousIndex,
            event.currentIndex
          );
          
          Swal.fire({
            icon: 'success',
            title: 'Servicio agregado',
            text: response.message,
            toast: true,
            position: 'top-end',
            showConfirmButton: false,
            timer: 3000
          });
        },
        error: (error) => {
          console.error('Error al agregar servicio:', error);
          Swal.fire('Error', error.error.message || 'No se pudo agregar el servicio', 'error');
        }
      });
    }
  }

  eliminarServicioDePlan(plan: PlanConServicios, servicio: Servicio): void {
    Swal.fire({
      title: '¿Eliminar Servicio?',
      html: `¿Deseas eliminar <strong>"${servicio.nombre}"</strong> del plan <strong>"${plan.nombre}"</strong>?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#6c757d',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        this.adminPlanServiciosService.eliminarServicio(plan.id, servicio.id).subscribe({
          next: (response) => {
            // Eliminar del plan y agregarlo de nuevo a disponibles
            const index = plan.servicios.findIndex(s => s.id === servicio.id);
            if (index > -1) {
              plan.servicios.splice(index, 1);
              plan.total_servicios = plan.servicios.length;
              
              // Agregar a servicios disponibles si no está ya
              if (!this.serviciosDisponibles.find(s => s.id === servicio.id)) {
                this.serviciosDisponibles.push(servicio);
              }
            }
            
            Swal.fire({
              icon: 'success',
              title: 'Eliminado',
              text: response.message,
              toast: true,
              position: 'top-end',
              showConfirmButton: false,
              timer: 3000
            });
          },
          error: (error) => {
            console.error('Error al eliminar servicio:', error);
            Swal.fire('Error', error.error.message || 'No se pudo eliminar el servicio', 'error');
          }
        });
      }
    });
  }

  guardarAsociaciones(plan: PlanConServicios): void {
    const servicioIds = plan.servicios.map(s => s.id);
    
    this.adminPlanServiciosService.asociarServicios(plan.id, servicioIds).subscribe({
      next: (response) => {
        Swal.fire('Éxito', response.message, 'success');
      },
      error: (error) => {
        console.error('Error al guardar asociaciones:', error);
        Swal.fire('Error', error.error.message || 'No se pudieron guardar las asociaciones', 'error');
      }
    });
  }

  recargar(): void {
    this.cargarDatos();
  }
}

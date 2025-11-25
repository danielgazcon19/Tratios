import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { trigger, state, style, transition, animate } from '@angular/animations';
import { CdkDragDrop, DragDropModule, moveItemInArray, transferArrayItem } from '@angular/cdk/drag-drop';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AdminPlanServiciosService, PlanConServicios, ServicioConCantidad } from '../../../services/admin-plan-servicios.service';
import { AdminServiciosService, Servicio } from '../../../services/admin-servicios.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-admin-plan-servicios',
  standalone: true,
  imports: [CommonModule, DragDropModule, RouterLink, RouterLinkActive, FormsModule],
  templateUrl: './admin-plan-servicios.component.html',
  styleUrl: './admin-plan-servicios.component.css',
  animations: [
    trigger('slideIn', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateX(-10px)' }),
        animate('300ms ease-out', style({ opacity: 1, transform: 'translateX(0)' }))
      ]),
      transition(':leave', [
        animate('200ms ease-in', style({ opacity: 0, transform: 'translateX(-10px)' }))
      ])
    ])
  ]
})
export class AdminPlanServiciosComponent implements OnInit {
  planes: PlanConServicios[] = [];
  serviciosDisponibles: Servicio[] = [];
  cargando = false;
  planSeleccionado: PlanConServicios | null = null;
  editandoCantidad: { planId: number, servicioId: number } | null = null;
  cantidadTemp: number | null = null;

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

  drop(event: CdkDragDrop<ServicioConCantidad[]>, planId: number): void {
    if (event.previousContainer === event.container) {
      // Reordenar dentro del mismo contenedor
      moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
    } else {
      // Copiar servicio de disponibles al plan
      const servicio = event.previousContainer.data[event.previousIndex];
      
      // Verificar si el servicio ya existe en el plan
      const plan = this.planes.find(p => p.id === planId);
      if (plan && plan.servicios.some(s => s.id === servicio.id)) {
        Swal.fire({
          icon: 'warning',
          title: 'Servicio duplicado',
          text: 'Este servicio ya está asociado al plan',
          toast: true,
          position: 'top-end',
          showConfirmButton: false,
          timer: 3000
        });
        return;
      }
      
      // Agregar el servicio al plan (COPIAR, no mover)
      this.adminPlanServiciosService.agregarServicio(planId, servicio.id).subscribe({
        next: (response) => {
          // Copiar el servicio al plan en lugar de moverlo
          if (plan) {
            const nuevoServicio: ServicioConCantidad = {...servicio, cantidad: null};
            plan.servicios.push(nuevoServicio);
            plan.total_servicios = plan.servicios.length;
            
            // Mostrar prompt para agregar cantidad
            this.mostrarPromptCantidad(plan.id, servicio.id, servicio.nombre);
          }
          
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

  mostrarPromptCantidad(planId: number, servicioId: number, servicioNombre: string): void {
    Swal.fire({
      title: '¿Definir cantidad?',
      html: `
        <p>¿Deseas establecer una cantidad límite para <strong>${servicioNombre}</strong>?</p>
        <p class="text-muted" style="font-size: 13px; margin-top: 10px;">
          (Ej: máximo de usuarios, sedes, productos, etc. Dejar vacío = sin límite)
        </p>
      `,
      input: 'number',
      inputPlaceholder: 'Cantidad (opcional)',
      showCancelButton: true,
      confirmButtonText: 'Guardar',
      cancelButtonText: 'Omitir',
      inputValidator: (value) => {
        if (value && parseInt(value) < 0) {
          return 'La cantidad debe ser un número positivo';
        }
        return null;
      }
    }).then((result) => {
      if (result.isConfirmed) {
        const cantidad = result.value ? parseInt(result.value) : null;
        this.actualizarCantidad(planId, servicioId, cantidad);
      }
    });
  }

  editarCantidad(plan: PlanConServicios, servicio: ServicioConCantidad): void {
    this.editandoCantidad = { planId: plan.id, servicioId: servicio.id };
    this.cantidadTemp = servicio.cantidad || null;
  }

  cancelarEdicionCantidad(): void {
    this.editandoCantidad = null;
    this.cantidadTemp = null;
  }

  guardarCantidad(plan: PlanConServicios, servicio: ServicioConCantidad): void {
    if (this.editandoCantidad?.planId === plan.id && this.editandoCantidad?.servicioId === servicio.id) {
      this.actualizarCantidad(plan.id, servicio.id, this.cantidadTemp);
    }
  }

  actualizarCantidad(planId: number, servicioId: number, cantidad: number | null): void {
    // Validar que la cantidad sea positiva si se proporciona
    if (cantidad !== null && cantidad < 0) {
      Swal.fire({
        icon: 'error',
        title: 'Cantidad inválida',
        text: 'La cantidad debe ser un número positivo',
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 3000
      });
      return;
    }

    this.adminPlanServiciosService.actualizarCantidad(planId, servicioId, cantidad).subscribe({
      next: (response) => {
        // Actualizar la cantidad en el plan local
        const plan = this.planes.find(p => p.id === planId);
        if (plan) {
          const servicio = plan.servicios.find(s => s.id === servicioId);
          if (servicio) {
            servicio.cantidad = cantidad;
          }
        }
        
        this.editandoCantidad = null;
        this.cantidadTemp = null;
        
        Swal.fire({
          icon: 'success',
          title: 'Cantidad actualizada',
          text: response.message || 'La cantidad se actualizó correctamente',
          toast: true,
          position: 'top-end',
          showConfirmButton: false,
          timer: 3000
        });
      },
      error: (error) => {
        console.error('Error al actualizar cantidad:', error);
        Swal.fire('Error', error.error.message || 'No se pudo actualizar la cantidad', 'error');
      }
    });
  }

  eliminarServicioDePlan(plan: PlanConServicios, servicio: ServicioConCantidad): void {
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

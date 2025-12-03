import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ApiService, Plan } from '../../../services/api.service';

interface PlanConServicios extends Plan {
  serviciosNombres: string[];
}

@Component({
  selector: 'app-terminos-condiciones',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './terminos-condiciones.component.html',
  styleUrls: ['./terminos-condiciones.component.css']
})
export class TerminosCondicionesComponent implements OnInit {
  lastUpdate = '3 de diciembre de 2025';
  planes: PlanConServicios[] = [];
  loading = true;

  // Infraestructura por plan (datos estáticos)
  infraestructura: { [key: string]: { sedes: string; storage: string; backup: string; vcpu: string; ram: string } } = {
    'básico': { sedes: '1', storage: '75 GB NVMe o 150 GB SSD', backup: 'Automático', vcpu: '4', ram: '8 GB' },
    'basico': { sedes: '1', storage: '75 GB NVMe o 150 GB SSD', backup: 'Automático', vcpu: '4', ram: '8 GB' },
    'pro': { sedes: '4', storage: '100 GB NVMe o 200 GB SSD', backup: 'Automático', vcpu: '6', ram: '12 GB' },
    'premium': { sedes: '7', storage: '200 GB NVMe o 400 GB SSD', backup: 'Automático', vcpu: '8', ram: '24 GB' }
  };

  constructor(private apiService: ApiService) {}

  ngOnInit(): void {
    this.cargarPlanes();
  }

  cargarPlanes(): void {
    this.apiService.getPlanes().subscribe({
      next: (planes) => {
        this.planes = planes.map(plan => ({
          ...plan,
          serviciosNombres: plan.servicios?.map((s: any) => s.nombre || s) || []
        }));
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  getInfraestructura(planNombre: string): { sedes: string; storage: string; backup: string; vcpu: string; ram: string } | null {
    const key = planNombre.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    return this.infraestructura[key] || null;
  }

  getLetra(index: number): string {
    return String.fromCharCode(97 + index); // a, b, c, d...
  }
}

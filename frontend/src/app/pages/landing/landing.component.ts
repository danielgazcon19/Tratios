import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { PlanesComponent } from '../planes/planes.component';
import { FuncionalidadesComponent } from '../funcionalidades/funcionalidades.component';
import { AcercaComponent } from '../acerca/acerca.component';
import { PreguntasComponent } from '../preguntas/preguntas.component';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [RouterLink, CommonModule, PlanesComponent, FuncionalidadesComponent, AcercaComponent, PreguntasComponent],
  templateUrl: './landing.component.html',
  styleUrls: ['./landing.component.css']
})
export class LandingComponent {
  benefits = [
    {
      icon: 'fas fa-chart-line',
      title: 'Control total',
      description: 'Gestiona tu inventario y contratos desde un solo lugar'
    },
    {
      icon: 'fas fa-file-invoice-dollar',
      title: 'Facturación automática',
      description: 'Genera reportes y facturas en segundos'
    },
    {
      icon: 'fas fa-bell',
      title: 'Alertas inteligentes',
      description: 'Recordatorios de vencimientos y pagos pendientes'
    },
    {
      icon: 'fas fa-cloud',
      title: 'Acceso en la nube',
      description: 'Disponible desde cualquier dispositivo, donde estés'
    },
    {
      icon: 'fas fa-chart-bar',
      title: 'Aumenta tus ventas',
      description: 'Toma decisiones con datos en tiempo real'
    }
  ];

  currentBenefitIndex = 0;

  nextBenefit() {
    this.currentBenefitIndex = (this.currentBenefitIndex + 1) % this.benefits.length;
  }

  prevBenefit() {
    this.currentBenefitIndex = this.currentBenefitIndex === 0 
      ? this.benefits.length - 1 
      : this.currentBenefitIndex - 1;
  }

  goToBenefit(index: number) {
    this.currentBenefitIndex = index;
  }

  scrollToSection(sectionId: string) {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }
}
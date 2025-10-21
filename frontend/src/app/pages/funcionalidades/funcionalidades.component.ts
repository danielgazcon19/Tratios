import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

interface Feature {
  title: string;
  description: string;
}

@Component({
  selector: 'app-funcionalidades',
  standalone: true,
  imports: [CommonModule],
  styleUrls: ['./funcionalidades.component.css'],
  template: `
    <section id="funcionalidades" class="funcionalidades-section">
      <div class="funcionalidades-container">
        <header class="funcionalidades-header">
          <span class="section-kicker">Tratios Compraventa</span>
          <h2 class="section-title">Funcionalidades</h2>
          <p class="section-description">
            Descubre todo lo que puedes hacer con <span class="section-highlight">Tratios Compraventa</span>.
          </p>
        </header>

        <div class="features-grid">
          <article
            class="feature-card"
            *ngFor="let feature of features"
          >
            <div class="feature-icon">
              {{ feature.title.charAt(0) }}
            </div>
            <h3 class="feature-title">{{ feature.title }}</h3>
            <p class="feature-description">{{ feature.description }}</p>
            <button class="feature-button" type="button" (click)="onLearnMore(feature)">Más detalles</button>
          </article>
        </div>
      </div>
    </section>
  `
})
export class FuncionalidadesComponent {
  features: Feature[] = [
    {
      title: 'Contratos',
      description: 'Gestión completa de contratos, desde la creación hasta la finalización.'
    },
    {
      title: 'Inventario',
      description: 'Control total sobre su inventario, con seguimiento en tiempo real.'
    },
    {
      title: 'Remates',
      description: 'Organice y gestione remates de manera eficiente.'
    },
    {
      title: 'Caja',
      description: 'Gestione su caja y transacciones de manera eficiente.'
    },
    {
      title: 'Ventas',
      description: 'Registre y administre todas las ventas de forma sencilla.'
    },
    {
      title: 'Reportes',
      description: 'Genere reportes detallados para análisis y toma de decisiones.'
    },
    {
      title: 'Usuarios',
      description: 'Administre usuarios y permisos de manera segura.'
    },
    {
      title: 'Configuración',
      description: 'Configure el sistema según sus necesidades específicas.'
    }
  ];

  onLearnMore(feature: Feature): void {
    // Implementar la lógica para mostrar más detalles de la funcionalidad
    console.log(`Más detalles sobre ${feature.title}`);
  }
}
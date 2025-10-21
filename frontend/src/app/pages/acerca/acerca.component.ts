import { Component } from '@angular/core';

@Component({
  selector: 'app-acerca',
  standalone: true,
  template: `
    <section class="page-section page-section--neutral">
      <div class="section-container">
        <div class="section-header">
          <span class="section-kicker">Nuestra historia</span>
          <h2 class="section-title">Construimos tecnología para potenciar a las casas de compraventa</h2>
          <p class="section-description">
            Nacimos para digitalizar procesos críticos y dar visibilidad total a cada préstamo, prenda y cliente. Así,
            tus decisiones se respaldan con datos confiables en tiempo real.
          </p>
        </div>

        <div class="about-grid">
          <article class="card-surface">
            <h3>Equipo experto en el sector</h3>
            <p>
              Combinamos experiencia en casas de empeño con talento tecnológico para ofrecer una plataforma que entiende tus
              desafíos reales: regulación, seguridad y control del inventario.
            </p>
          </article>
          <article class="card-surface">
            <h3>Soporte cercano y constante</h3>
            <p>
              Te acompañamos desde la implementación hasta la operación diaria. Capacitación, soporte prioritario y
              actualizaciones continuas incluidas en cada plan.
            </p>
          </article>
          <article class="card-surface">
            <h3>Innovación enfocada en resultados</h3>
            <p>
              Iteramos junto a nuestros clientes para entregar mejoras medibles: más eficiencia, menos riesgos y una
              experiencia confiable para tu equipo y tus clientes.
            </p>
          </article>
        </div>
      </div>
    </section>
  `,
  styles: [`
    :host { display: block; }

    .about-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
      gap: 1.8rem;
    }

    .about-grid h3 {
      margin: 0 0 0.8rem 0;
      font-size: 1.35rem;
      color: var(--color-text-primary);
    }

    .about-grid p {
      margin: 0;
      color: var(--color-text-secondary);
    }

    @media (max-width: 640px) {
      .about-grid {
        gap: 1.25rem;
      }
    }
  `]
})
export class AcercaComponent {}
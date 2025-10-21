import { Component } from '@angular/core';

@Component({
  selector: 'app-preguntas',
  standalone: true,
  template: `
    <section class="page-section">
      <div class="section-container faq-wrapper">
        <div class="section-header">
          <span class="section-kicker">Preguntas frecuentes</span>
          <h2 class="section-title">Todo lo que necesitas saber antes de comenzar</h2>
          <p class="section-description">
            Si aún tienes dudas, nuestro equipo está listo para ayudarte a implementar Tratios en tu compraventa.
          </p>
        </div>

        <div class="faq-list">
          <details class="faq-item" open>
            <summary>¿Cómo me suscribo a Tratios?</summary>
            <p>Selecciona el plan que prefieras, completa tus datos y nuestro sistema activará tu cuenta de inmediato.</p>
          </details>
          <details class="faq-item">
            <summary>¿Puedo cambiar de plan después?</summary>
            <p>Sí. Puedes actualizar o degradar tu plan en cualquier momento desde tu panel de administración.</p>
          </details>
          <details class="faq-item">
            <summary>¿El soporte está incluido?</summary>
            <p>Todos los planes incluyen soporte prioritario y sesiones de acompañamiento para tu equipo.</p>
          </details>
          <details class="faq-item">
            <summary>¿Cómo protegen mi información?</summary>
            <p>Implementamos cifrado, auditorías y respaldos automáticos para mantener tus datos seguros y disponibles.</p>
          </details>
        </div>
      </div>
    </section>
  `,
  styles: [`
    :host { display: block; }

    .faq-wrapper {
      display: flex;
      flex-direction: column;
      gap: 2rem;
    }

    .faq-list {
      display: grid;
      gap: 1rem;
    }

    details summary {
      display: block;
      font-weight: 600;
      color: var(--color-text-primary);
      cursor: pointer;
    }

    details summary {
      outline: none;
    }

    details summary::-webkit-details-marker {
      display: none;
    }

    details summary::after {
      content: '+';
      float: right;
      font-weight: 700;
      color: var(--color-accent-dark);
      transition: transform var(--transition-base);
    }

    details[open] summary::after {
      transform: rotate(45deg);
    }

    @media (max-width: 640px) {
      .faq-wrapper {
        gap: 1.5rem;
      }
    }
  `]
})
export class PreguntasComponent {}
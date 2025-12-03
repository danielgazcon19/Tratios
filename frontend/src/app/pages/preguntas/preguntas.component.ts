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
            <p>
              Es muy sencillo: selecciona el plan que mejor se adapte a tu negocio y serás redirigido a WhatsApp 
              donde nuestro equipo comercial te atenderá personalmente. Durante esta conversación podrás resolver 
              dudas, negociar condiciones y proporcionar los datos necesarios para generar tu <strong>código de empresa</strong>, 
              el cual te permitirá crear tu cuenta en la plataforma.
            </p>
          </details>
          <details class="faq-item">
            <summary>¿Cuánto tiempo toma la activación de los servicios?</summary>
            <p>
              Una vez completado el proceso de suscripción, la activación de tus servicios se realiza en un plazo 
              de <strong>3 a 5 días hábiles</strong>. Durante este tiempo configuramos tu entorno y preparamos todo 
              para la etapa de implementación.
            </p>
          </details>
          <details class="faq-item">
            <summary>¿Cómo es el proceso de implementación?</summary>
            <p>
              Después de la activación, trabajamos de manera <strong>colaborativa</strong> contigo para migrar tus datos, 
              parametrizar el software según las necesidades específicas de tu compraventa y capacitar a tu equipo. 
              Este acompañamiento garantiza que Tratios se adapte perfectamente a tu operación.
            </p>
          </details>
          <details class="faq-item">
            <summary>¿Puedo cambiar de plan después?</summary>
            <p>
              Sí. Puedes solicitar una actualización o cambio de plan en cualquier momento contactando a nuestro 
              equipo a través de WhatsApp o los canales de soporte. Evaluaremos tu caso y ajustaremos tu suscripción 
              según tus nuevas necesidades.
            </p>
          </details>
          <details class="faq-item">
            <summary>¿El soporte técnico está incluido en la suscripción?</summary>
            <p>
              <strong>No</strong>, el soporte técnico no está incluido dentro de la mensualidad o anualidad pagada, pero si Está
              incluido el primer mes de estabilizacion del aplicativo, luego de este mes se cotiza por separado. 
              El soporte se cotiza y contrata de manera independiente según las necesidades específicas de cada cliente. 
              También ofrecemos un <strong>servicio de Standby</strong> para atención fuera del horario hábil con costo adicional.
            </p>
          </details>
          <details class="faq-item">
            <summary>¿Cuál es el horario de atención?</summary>
            <p>
              Nuestro horario de atención es de <strong>lunes a viernes de 8:00 AM a 8:00 PM</strong>. 
              Para clientes que requieren soporte fuera de este horario, ofrecemos el servicio de Standby 
              que cubre noches, fines de semana y días festivos.
            </p>
          </details>
          <details class="faq-item">
            <summary>¿Cómo protegen mi información?</summary>
            <p>
              Implementamos cifrado de datos, backups automáticos y medidas de seguridad avanzadas para mantener 
              tu información protegida. La plataforma está disponible <strong>24/7 los 365 días del año</strong> 
              con infraestructura en la nube de alto rendimiento.
            </p>
          </details>
          <details class="faq-item">
            <summary>¿Qué necesito para comenzar?</summary>
            <p>
              Solo necesitas seleccionar un plan y contactarnos por WhatsApp. Nuestro equipo te guiará en todo 
              el proceso: desde la negociación inicial hasta la migración completa de tu compraventa a Tratios. 
              No requieres conocimientos técnicos previos.
            </p>
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
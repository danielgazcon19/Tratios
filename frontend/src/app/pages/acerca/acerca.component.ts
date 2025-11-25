import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';

interface Testimonial {
  name: string;
  role: string;
  company: string;
  message: string;
  photo: string;
  rating: number;
}

@Component({
  selector: 'app-acerca',
  standalone: true,
  imports: [CommonModule],
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

    <!-- Sección de Testimonios -->
    <section class="testimonials-section">
      <div class="section-container">
        <div class="section-header">
          <span class="section-kicker">Testimonios</span>
          <h2 class="section-title">Lo que dicen nuestros clientes</h2>
          <p class="section-description">
            Historias reales de empresas que han transformado sus operaciones con Tratios Compraventa
          </p>
        </div>

        <div class="testimonials-wrapper">
          <div class="testimonials-carousel">
            <div class="testimonial-track" [style.transform]="'translateX(-' + (currentTestimonial * 100) + '%)'">
              <article 
                class="testimonial-card" 
                *ngFor="let testimonial of testimonials; let i = index"
                [class.active]="i === currentTestimonial"
              >
                <div class="testimonial-content">
                  <div class="quote-icon">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z"/>
                    </svg>
                  </div>
                  
                  <div class="testimonial-text">
                    <p class="testimonial-message">{{ testimonial.message }}</p>
                    
                    <div class="testimonial-rating">
                      <span class="star" *ngFor="let star of [1,2,3,4,5]" [class.filled]="star <= testimonial.rating">★</span>
                    </div>
                  </div>

                  <div class="testimonial-author">
                    <div class="author-photo">
                      <img [src]="testimonial.photo" [alt]="testimonial.name" />
                      <div class="photo-overlay"></div>
                    </div>
                    <div class="author-info">
                      <h4 class="author-name">{{ testimonial.name }}</h4>
                      <p class="author-role">{{ testimonial.role }}</p>
                      <p class="author-company">{{ testimonial.company }}</p>
                    </div>
                  </div>
                </div>
              </article>
            </div>
          </div>

          <!-- Controles de navegación -->
          <div class="testimonial-controls">
            <button 
              class="control-btn control-prev" 
              (click)="previousTestimonial()"
              [disabled]="currentTestimonial === 0"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
              </svg>
            </button>

            <div class="testimonial-indicators">
              <button
                *ngFor="let testimonial of testimonials; let i = index"
                class="indicator"
                [class.active]="i === currentTestimonial"
                (click)="goToTestimonial(i)"
                [attr.aria-label]="'Ir al testimonio ' + (i + 1)"
              ></button>
            </div>

            <button 
              class="control-btn control-next" 
              (click)="nextTestimonial()"
              [disabled]="currentTestimonial === testimonials.length - 1"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
              </svg>
            </button>
          </div>
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

    /* Testimonios */
    .testimonials-section {
      background: linear-gradient(180deg, #ffffff 0%, #faf5ec 100%);
      padding: 5rem 1.5rem;
      overflow: hidden;
    }

    .testimonials-wrapper {
      position: relative;
      max-width: 900px;
      margin: 0 auto;
    }

    .testimonials-carousel {
      position: relative;
      overflow: hidden;
      border-radius: 24px;
      background: #ffffff;
      box-shadow: 
        0 20px 60px -20px rgba(15, 23, 42, 0.15),
        0 0 0 1px rgba(226, 232, 240, 0.5);
    }

    .testimonial-track {
      display: flex;
      transition: transform 0.6s cubic-bezier(0.4, 0, 0.2, 1);
    }

    .testimonial-card {
      min-width: 100%;
      padding: 3.5rem 3rem 3rem;
      opacity: 0.4;
      transition: opacity 0.6s ease;
    }

    .testimonial-card.active {
      opacity: 1;
    }

    .testimonial-content {
      display: flex;
      flex-direction: column;
      gap: 2rem;
    }

    .quote-icon {
      width: 48px;
      height: 48px;
      color: rgba(198, 146, 37, 0.2);
    }

    .quote-icon svg {
      width: 100%;
      height: 100%;
    }

    .testimonial-text {
      flex: 1;
    }

    .testimonial-message {
      font-size: 1.25rem;
      line-height: 1.7;
      color: #1e293b;
      font-weight: 500;
      margin: 0 0 1.5rem 0;
      font-style: italic;
    }

    .testimonial-rating {
      display: flex;
      gap: 0.25rem;
      font-size: 1.5rem;
    }

    .star {
      color: #e5e7eb;
      transition: color 0.3s ease;
    }

    .star.filled {
      color: #fbbf24;
    }

    .testimonial-author {
      display: flex;
      align-items: center;
      gap: 1.5rem;
      padding-top: 2rem;
      border-top: 1px solid rgba(226, 232, 240, 0.8);
    }

    .author-photo {
      position: relative;
      width: 80px;
      height: 80px;
      flex-shrink: 0;
    }

    .author-photo img {
      width: 100%;
      height: 100%;
      border-radius: 50%;
      object-fit: cover;
      border: 3px solid #fff;
      box-shadow: 
        0 10px 25px -10px rgba(15, 23, 42, 0.3),
        0 0 0 1px rgba(226, 232, 240, 0.5);
    }

    .photo-overlay {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      border-radius: 50%;
      background: linear-gradient(135deg, rgba(244, 185, 66, 0.2), transparent);
      pointer-events: none;
    }

    .author-info {
      flex: 1;
    }

    .author-name {
      margin: 0 0 0.25rem 0;
      font-size: 1.25rem;
      font-weight: 700;
      color: #0f172a;
    }

    .author-role {
      margin: 0 0 0.15rem 0;
      font-size: 1rem;
      font-weight: 600;
      color: #c69225;
    }

    .author-company {
      margin: 0;
      font-size: 0.95rem;
      color: #64748b;
    }

    .testimonial-controls {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 2rem;
      margin-top: 2.5rem;
    }

    .control-btn {
      width: 48px;
      height: 48px;
      border-radius: 50%;
      border: 2px solid rgba(198, 146, 37, 0.3);
      background: #ffffff;
      color: #c69225;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all 0.3s ease;
      box-shadow: 0 4px 12px -4px rgba(15, 23, 42, 0.1);
    }

    .control-btn:hover:not(:disabled) {
      background: linear-gradient(135deg, #f4b942, #d89b20);
      color: #ffffff;
      border-color: transparent;
      transform: scale(1.1);
      box-shadow: 0 8px 20px -6px rgba(198, 146, 37, 0.4);
    }

    .control-btn:disabled {
      opacity: 0.3;
      cursor: not-allowed;
    }

    .control-btn svg {
      width: 24px;
      height: 24px;
    }

    .testimonial-indicators {
      display: flex;
      gap: 0.75rem;
      align-items: center;
    }

    .indicator {
      width: 12px;
      height: 12px;
      border-radius: 50%;
      border: none;
      background: rgba(198, 146, 37, 0.2);
      cursor: pointer;
      transition: all 0.3s ease;
      padding: 0;
    }

    .indicator:hover {
      background: rgba(198, 146, 37, 0.4);
      transform: scale(1.2);
    }

    .indicator.active {
      background: linear-gradient(135deg, #f4b942, #d89b20);
      width: 32px;
      border-radius: 6px;
    }

    /* Animación de entrada */
    @keyframes fadeInUp {
      from {
        opacity: 0;
        transform: translateY(30px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .testimonials-wrapper {
      animation: fadeInUp 0.8s ease-out;
    }

    /* Responsive */
    @media (max-width: 768px) {
      .testimonials-section {
        padding: 4rem 1.25rem;
      }

      .testimonial-card {
        padding: 2.5rem 2rem;
      }

      .testimonial-message {
        font-size: 1.1rem;
      }

      .author-photo {
        width: 64px;
        height: 64px;
      }

      .author-name {
        font-size: 1.1rem;
      }

      .author-role {
        font-size: 0.9rem;
      }

      .testimonial-controls {
        gap: 1.5rem;
      }

      .control-btn {
        width: 42px;
        height: 42px;
      }

      .control-btn svg {
        width: 20px;
        height: 20px;
      }
    }

    @media (max-width: 640px) {
      .about-grid {
        gap: 1.25rem;
      }

      .testimonial-card {
        padding: 2rem 1.5rem;
      }

      .testimonial-message {
        font-size: 1rem;
      }

      .testimonial-author {
        flex-direction: column;
        text-align: center;
        gap: 1rem;
      }

      .quote-icon {
        width: 36px;
        height: 36px;
      }
    }
  `]
})
export class AcercaComponent implements OnInit, OnDestroy {
  currentTestimonial = 0;
  private intervalId: any;

  testimonials: Testimonial[] = [
    {
      name: 'María González',
      role: 'Gerente General',
      company: 'Casa de Empeño La Confianza',
      message: 'Tratios ha revolucionado completamente nuestra forma de trabajar. Antes pasábamos horas haciendo inventarios manuales, ahora todo está automatizado y podemos acceder a la información en tiempo real desde cualquier lugar.',
      photo: 'https://i.pravatar.cc/150?img=47',
      rating: 5
    },
    {
      name: 'Carlos Ramírez',
      role: 'Director de Operaciones',
      company: 'Préstamos Rápidos del Norte',
      message: 'La integración con el sistema de facturación electrónica nos ahorró meses de trabajo. El equipo de soporte siempre está disponible y las actualizaciones constantes demuestran que se preocupan por mejorar continuamente.',
      photo: 'https://i.pravatar.cc/150?img=12',
      rating: 5
    },
    {
      name: 'Ana Patricia Méndez',
      role: 'Propietaria',
      company: 'Oro y Plata Express',
      message: 'Como propietaria de una casa de empeño pequeña, necesitaba una solución accesible pero profesional. Tratios me dio exactamente eso. Es fácil de usar y el control que tengo ahora sobre mi negocio es increíble.',
      photo: 'https://i.pravatar.cc/150?img=32',
      rating: 5
    },
    {
      name: 'Roberto Sánchez',
      role: 'Contador',
      company: 'Empeños y Préstamos del Centro',
      message: 'Los reportes financieros son muy completos y precisos. Me facilita enormemente el trabajo contable y la generación de declaraciones. La exportación a Excel es perfecta para nuestros análisis adicionales.',
      photo: 'https://i.pravatar.cc/150?img=33',
      rating: 5
    },
    {
      name: 'Laura Jiménez',
      role: 'Jefa de Sucursal',
      company: 'Red de Casas de Empeño Premium',
      message: 'Gestiono 3 sucursales y antes era un caos coordinar todo. Con Tratios puedo ver en tiempo real qué está pasando en cada ubicación, controlar el inventario y asegurarme de que todo funcione correctamente.',
      photo: 'https://i.pravatar.cc/150?img=44',
      rating: 5
    }
  ];

  ngOnInit() {
    this.startAutoPlay();
  }

  ngOnDestroy() {
    this.stopAutoPlay();
  }

  startAutoPlay() {
    this.intervalId = setInterval(() => {
      this.nextTestimonial();
    }, 6000); // Cambia cada 6 segundos
  }

  stopAutoPlay() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
  }

  nextTestimonial() {
    if (this.currentTestimonial < this.testimonials.length - 1) {
      this.currentTestimonial++;
    } else {
      this.currentTestimonial = 0; // Vuelve al inicio
    }
    this.resetAutoPlay();
  }

  previousTestimonial() {
    if (this.currentTestimonial > 0) {
      this.currentTestimonial--;
    }
    this.resetAutoPlay();
  }

  goToTestimonial(index: number) {
    this.currentTestimonial = index;
    this.resetAutoPlay();
  }

  private resetAutoPlay() {
    this.stopAutoPlay();
    this.startAutoPlay();
  }
}
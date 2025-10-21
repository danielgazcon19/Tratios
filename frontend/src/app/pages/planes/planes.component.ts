import { Component, OnInit, inject } from '@angular/core';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ApiService, Plan } from '../../services/api.service';

@Component({
  selector: 'app-planes',
  standalone: true,
  imports: [FormsModule, ReactiveFormsModule, CommonModule],
  template: `
    <section class="page-section">
      <div class="section-container">
        <header class="section-header">
          <span class="section-kicker">Planes de suscripción</span>
          <h2 class="section-title">Escoge el plan que crece con tu compraventa</h2>
          <p class="section-description">
            Combina herramientas de control, reportes y automatización según la etapa en la que te encuentras. Cambia de
            plan cuando quieras.
          </p>
        </header>

        <!-- <div class="billing-toggle card-surface">
          <div class="toggle-copy">
            <h3>Configura tu facturación</h3>
            <p>Alterna entre precios mensuales o anuales cuando te convenga.</p>
          </div>
          <div class="toggle-control">
            <span [class.active]="!mostrarPrecioAnual">Mensual</span>
            <label class="switch">
              <input type="checkbox" (change)="mostrarPrecioAnual = !mostrarPrecioAnual">
              <span class="slider round"></span>
            </label>
            <span [class.active]="mostrarPrecioAnual">Anual</span>
          </div>
        </div> -->

        <div class="planes-grid">
          <article class="plan-card card-surface"
            *ngFor="let plan of planes"
            [class.plan-card--popular]="plan.seleccionado"
            [class.plan-card--active]="planSeleccionado === plan.id"
            (click)="seleccionarPlan(plan.id)"
            (keyup.enter)="seleccionarPlan(plan.id)"
            tabindex="0">
            <div *ngIf="plan.seleccionado" class="plan-badge">Más popular</div>
            <div class="plan-head">
              <span class="plan-name">{{ plan.nombre }}</span>
              <span class="plan-discount" *ngIf="plan.seleccionado">Plan recomendado</span>
            </div>
            <div class="plan-price">
              <span class="plan-price__amount">
                {{ mostrarPrecioAnual ? (plan.precio_anual | currency:'USD':'symbol':'1.0-0') : (plan.precio_mensual | currency:'USD':'symbol':'1.0-0') }}
              </span>
              <span class="plan-price__period">/{{ mostrarPrecioAnual ? 'año' : 'mes' }}</span>
            </div>
            <p class="plan-note">Incluye acceso a funcionalidades premium y soporte dedicado.</p>
            <ul class="plan-benefits">
              <li><span>✔</span>Acceso a todos los módulos</li>
              <li><span>✔</span>Seguimiento automático de contratos</li>
              <li><span>✔</span>Reportes descargables en un clic</li>
            </ul>
            <div class="plan-actions">
              <button type="button" class="plan-action whatsapp-btn whatsapp-btn--mensual" (click)="contactarWhatsApp(plan, 'mensual')">
                <i class="fab fa-whatsapp"></i>
                Plan Mensual ({{ plan.precio_mensual | currency:'USD':'symbol':'1.0-0' }})
              </button>
              
              <button type="button" class="plan-action whatsapp-btn whatsapp-btn--anual" (click)="contactarWhatsApp(plan, 'anual')">
                <i class="fab fa-whatsapp"></i>
                Plan Anual ({{ plan.precio_anual | currency:'USD':'symbol':'1.0-0' }})
              </button>
            </div>
            <p class="texto-contacto">
              <i class="fas fa-info-circle"></i>
              Un asesor te contactará para completar tu suscripción
            </p>
          </article>
        </div>

        <form [formGroup]="form" (ngSubmit)="suscribirse()" class="form-card subscription-form" style="display: none;">
          <div class="plan-summary card-surface">
            <h4>Resumen de suscripción</h4>
            
            <div *ngIf="!planSeleccionado" class="no-plan-selected">
              <p>Selecciona un plan para ver los detalles de tu suscripción</p>
            </div>

            <div *ngIf="planSeleccionado" class="plan-details">
              <div class="plan-info">
                <h5>{{ obtenerPlanSeleccionadoInfo()?.nombre }}</h5>
                <p class="plan-price-summary">{{ obtenerPrecio() }}</p>
              </div>

              <div class="services-section">
                <h6>Servicios incluidos:</h6>
                <div class="services-table">
                  <div class="table-header">
                    <span>Servicio</span>
                    <span>Incluido</span>
                  </div>
                  <div class="table-row" *ngFor="let caracteristica of todasLasCaracteristicas">
                    <span class="service-name">{{ caracteristica }}</span>
                    <span class="service-status" [class.included]="planTieneCaracteristica(obtenerPlanSeleccionadoInfo()!, caracteristica)">
                      {{ planTieneCaracteristica(obtenerPlanSeleccionadoInfo()!, caracteristica) ? '✓' : '✗' }}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <button type="submit" class="primary-btn submit-btn" [disabled]="!planSeleccionado || cargando || form.invalid">
            {{ cargando ? 'Procesando...' : 'Suscribirme ahora' }}
          </button>
          <p *ngIf="mensaje" [style.color]="error ? '#dc2626' : '#15803d'" class="form-message">{{ mensaje }}</p>
        </form>
      </div>
    </section>
  `,
  styles: [`
    :host {
      display: block;
    }

    .billing-toggle {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
      margin-bottom: 3rem;
    }

    .billing-toggle h3 {
      margin: 0;
      font-size: 1.5rem;
      color: var(--color-text-primary);
    }

    .billing-toggle p {
      margin: 0;
      color: var(--color-text-secondary);
    }

    .toggle-copy {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .toggle-control {
      display: inline-flex;
      align-items: center;
      gap: 1rem;
      padding: 0.5rem 0;
    }

    .toggle-control span {
      font-weight: 600;
      color: var(--color-text-secondary);
      transition: color var(--transition-base);
    }

    .toggle-control span.active {
      color: var(--color-accent-dark);
    }

    .switch {
      position: relative;
      display: inline-block;
      width: 58px;
      height: 32px;
    }

    .switch input {
      opacity: 0;
      width: 0;
      height: 0;
    }

    .slider {
      position: absolute;
      cursor: pointer;
      inset: 0;
      background: rgba(216, 155, 32, 0.35);
      transition: var(--transition-base);
      border-radius: 9999px;
    }

    .slider::before {
      position: absolute;
      content: '';
      height: 24px;
      width: 24px;
      left: 4px;
      bottom: 4px;
      background-color: #fff;
      border-radius: 50%;
      transition: var(--transition-base);
      box-shadow: 0 4px 12px rgba(15, 23, 42, 0.2);
    }

    input:checked + .slider {
      background: linear-gradient(135deg, #f4b942, #d89b20);
    }

    input:checked + .slider::before {
      transform: translateX(26px);
    }

    .planes-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 2rem;
      margin-bottom: 3.5rem;
    }

    .plan-card {
      position: relative;
      padding: 2.25rem 2rem;
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
      cursor: pointer;
      transition: transform var(--transition-base), box-shadow var(--transition-base), border-color var(--transition-base);
    }

    .plan-card:hover,
    .plan-card:focus {
      transform: translateY(-8px);
      box-shadow: var(--shadow-strong);
      border-color: rgba(214, 175, 56, 0.65);
    }

    .plan-card--popular {
      border: 3px solid #3b82f6;
      box-shadow: 0 0 0 1px #3b82f6, var(--shadow-strong);
      transform: translateY(-8px);
      z-index: 2;
    }

    .plan-card--active {
      border-color: rgba(216, 155, 32, 0.85);
      box-shadow: var(--shadow-strong);
    }

    .plan-badge {
      position: absolute;
      top: -14px;
      left: 50%;
      transform: translateX(-50%);
      background: linear-gradient(135deg, #3b82f6, #60a5fa);
      color: #fff;
      padding: 0.35rem 1.1rem;
      border-radius: 9999px;
      font-weight: 700;
      font-size: 0.9rem;
      letter-spacing: 0.05em;
      box-shadow: 0 12px 24px -18px rgba(59, 130, 246, 0.55);
      z-index: 3;
    }

    .plan-head {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      gap: 1rem;
    }

    .plan-name {
      font-size: 1.35rem;
      font-weight: 700;
      color: var(--color-text-primary);
    }

    .plan-discount {
      font-size: 0.85rem;
      font-weight: 600;
      color: var(--color-accent-dark);
      background: rgba(248, 205, 94, 0.25);
      padding: 0.3rem 0.75rem;
      border-radius: 9999px;
      letter-spacing: 0.05em;
      text-transform: uppercase;
    }

    .plan-price {
      display: flex;
      align-items: flex-end;
      gap: 0.35rem;
    }

    .plan-price__amount {
      font-size: 2.55rem;
      font-weight: 800;
      color: var(--color-accent-dark);
      letter-spacing: -0.02em;
    }

    .plan-price__period {
      font-size: 1rem;
      color: var(--color-text-secondary);
      margin-bottom: 0.3rem;
    }

    .plan-note {
      margin: 0;
      color: var(--color-muted);
      font-size: 0.98rem;
    }

    .plan-benefits {
      list-style: none;
      margin: 0;
      padding: 0;
      display: flex;
      flex-direction: column;
      gap: 0.65rem;
      color: var(--color-text-primary);
    }

    .plan-benefits li {
      display: flex;
      align-items: center;
      gap: 0.65rem;
      font-weight: 500;
    }

    .plan-benefits li span {
      color: var(--color-accent-dark);
      font-weight: 700;
    }

    .plan-action {
      align-self: stretch;
      justify-content: center;
      margin-top: auto;
    }

    .plan-action.primary-btn {
      border: none;
      color: #fff;
    }

    /* Contenedor de botones de WhatsApp */
    .plan-actions {
      display: flex;
      flex-direction: column;
      gap: 10px;
      margin-top: auto;
    }

    /* Botón base de WhatsApp */
    .whatsapp-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      padding: 12px 24px;
      border: none;
      border-radius: 8px;
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s ease;
      color: white;
      text-decoration: none;
    }

    .whatsapp-btn i {
      font-size: 20px;
    }

    /* Botón mensual (verde claro) */
    .whatsapp-btn--mensual {
      background: linear-gradient(135deg, #25D366 0%, #128C7E 100%);
    }

    .whatsapp-btn--mensual:hover {
      background: linear-gradient(135deg, #20BA5A 0%, #0E7A6D 100%);
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(37, 211, 102, 0.4);
    }

    /* Botón anual (verde oscuro) */
    .whatsapp-btn--anual {
      background: linear-gradient(135deg, #128C7E 0%, #075E54 100%);
    }

    .whatsapp-btn--anual:hover {
      background: linear-gradient(135deg, #0E7A6D 0%, #054C44 100%);
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(18, 140, 126, 0.4);
    }

    /* Texto informativo */
    .texto-contacto {
      text-align: center;
      font-size: 14px;
      color: #666;
      margin-top: 10px;
      margin-bottom: 0;
    }

    .texto-contacto i {
      color: #128C7E;
      margin-right: 5px;
    }

    .subscription-form {
      margin-top: 4rem;
      display: flex;
      flex-direction: column;
      gap: 2rem;
    }

    .subscription-form h3 {
      margin: 0;
      font-size: 1.35rem;
      color: var(--color-text-primary);
    }

    .form-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 1.4rem 1.6rem;
    }

    label {
      display: flex;
      flex-direction: column;
      gap: 0.55rem;
      font-weight: 600;
      color: var(--color-text-primary);
    }

    label input {
      margin-top: 0.15rem;
    }

    .plan-summary {
      display: flex;
      flex-direction: column;
      gap: 1rem;
      padding: 1.5rem;
    }

    .plan-summary h4 {
      margin: 0 0 0.5rem 0;
      font-size: 1.1rem;
      color: var(--color-text-primary);
    }

    .plan-summary p {
      margin: 0;
      color: var(--color-text-secondary);
    }

    .no-plan-selected {
      text-align: center;
      padding: 2rem 1rem;
      color: var(--color-muted);
      font-style: italic;
    }

    .plan-details {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }

    .plan-info {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .plan-info h5 {
      margin: 0;
      font-size: 1.25rem;
      font-weight: 700;
      color: var(--color-text-primary);
    }

    .plan-price-summary {
      margin: 0;
      font-size: 1.1rem;
      font-weight: 600;
      color: var(--color-accent-dark);
    }

    .services-section {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .services-section h6 {
      margin: 0;
      font-size: 1rem;
      font-weight: 600;
      color: var(--color-text-primary);
    }

    .services-table {
      border: 1px solid rgba(216, 155, 32, 0.2);
      border-radius: 8px;
      overflow: hidden;
      background: var(--color-surface);
    }

    .table-header {
      display: grid;
      grid-template-columns: 1fr auto;
      gap: 1rem;
      padding: 0.75rem 1rem;
      background: linear-gradient(135deg, rgba(248, 205, 94, 0.15), rgba(216, 155, 32, 0.1));
      font-weight: 600;
      color: var(--color-text-primary);
      border-bottom: 1px solid rgba(216, 155, 32, 0.2);
    }

    .table-row {
      display: grid;
      grid-template-columns: 1fr auto;
      gap: 1rem;
      padding: 0.65rem 1rem;
      border-bottom: 1px solid rgba(216, 155, 32, 0.1);
      transition: background-color var(--transition-base);
    }

    .table-row:last-child {
      border-bottom: none;
    }

    .table-row:hover {
      background: rgba(248, 205, 94, 0.05);
    }

    .service-name {
      color: var(--color-text-primary);
      font-weight: 500;
    }

    .service-status {
      font-weight: 700;
      font-size: 1.1rem;
      color: var(--color-muted);
      text-align: center;
      min-width: 24px;
    }

    .service-status.included {
      color: #15803d;
    }

    .submit-btn {
      align-self: flex-start;
    }

    .form-message {
      margin: 0;
      font-weight: 600;
    }

    @media (max-width: 768px) {
      .billing-toggle {
        gap: 1rem;
        align-items: flex-start;
      }

      .plan-card {
        padding: 2rem 1.75rem;
      }

      .submit-btn {
        width: 100%;
      }

      .table-header,
      .table-row {
        padding: 0.5rem 0.75rem;
        font-size: 0.9rem;
      }

      .service-status {
        font-size: 1rem;
      }
    }

    @media (max-width: 540px) {
      .toggle-control {
        gap: 0.75rem;
      }

      .plan-card {
        padding: 1.8rem 1.5rem;
      }

      .plan-summary {
        padding: 1.25rem;
      }

      .table-header,
      .table-row {
        grid-template-columns: 2fr 1fr;
        gap: 0.5rem;
        padding: 0.5rem;
        font-size: 0.85rem;
      }
    }
  `]
})
export class PlanesComponent implements OnInit {
  private api = inject(ApiService);
  form: FormGroup;
  planSeleccionado = '';
  planes: Plan[] = [];
  cargando = false;
  mensaje = '';
  error = false;
  mostrarPrecioAnual = false;
  todasLasCaracteristicas: string[] = [];
  private readonly whatsappNumber = '573132865421';

  constructor(private fb: FormBuilder) {
    this.form = this.fb.group({});
  }
  ngOnInit(): void {
    // Cargar planes desde el backend
    this.api.getPlanes().subscribe({
      next: (planes) => {
        this.planes = planes;
        this.actualizarCaracteristicas();
        // Precargar el plan seleccionado por defecto
        this.precargarPlanSeleccionado();
      },
      error: () => {}
    });
  }
  seleccionarPlan(plan: string) {
    this.planSeleccionado = plan;
  }

  actualizarCaracteristicas() {
    const caracteristicas = new Set<string>();
    this.planes.forEach(plan => {
      plan.servicios.forEach(servicio => {
        caracteristicas.add(servicio.nombre);
      });
    });
    this.todasLasCaracteristicas = [...caracteristicas];
  }

  planTieneCaracteristica(plan: Plan, caracteristica: string): boolean {
    return plan.servicios.some(s => s.nombre === caracteristica);
  }
  obtenerPrecio() {
    const p = this.planes.find(x => x.id === this.planSeleccionado);
    if (!p) return '';
    return this.mostrarPrecioAnual ? `$${p.precio_anual}/año` : `$${p.precio_mensual}/mes`;
  }

  obtenerPlanSeleccionadoInfo(): Plan | null {
    return this.planes.find(x => x.id === this.planSeleccionado) || null;
  }

  precargarPlanSeleccionado(): void {
    // Buscar el plan que tiene seleccionado = true
    const planPorDefecto = this.planes.find(plan => plan.seleccionado);
    if (planPorDefecto) {
      this.planSeleccionado = planPorDefecto.id;
    }
  }

  /**
   * Genera un enlace de WhatsApp con mensaje pre-llenado
   * @param plan Plan seleccionado
   * @param periodo 'mensual' o 'anual'
   */
  generarEnlaceWhatsApp(plan: Plan, periodo: 'mensual' | 'anual'): string {
    const precio = periodo === 'mensual' ? plan.precio_mensual : plan.precio_anual;
    
    const precioFormateado = new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(precio);
    
    const mensaje = `Hola, estoy interesado en el plan *${plan.nombre}* que cuesta ${precioFormateado} ${periodo}. Me gustaría recibir más información sobre la suscripción.`;
    
    // Codificar el mensaje para URL
    const mensajeCodificado = encodeURIComponent(mensaje);
    const phone = (this.whatsappNumber || '').replace(/[^0-9]/g, '');
    
    return `https://wa.me/${phone}?text=${mensajeCodificado}`;
  }

  /**
   * Abre WhatsApp en una nueva ventana
   */
  contactarWhatsApp(plan: Plan, periodo: 'mensual' | 'anual'): void {
    const enlace = this.generarEnlaceWhatsApp(plan, periodo);
    window.open(enlace, '_blank');
  }
  
  suscribirse() {
    if (!this.planSeleccionado) {
      alert('Por favor selecciona un plan');
      return;
    }
    const selectedPlan = this.planes.find(p => p.id === this.planSeleccionado);
    if (!selectedPlan) {
      alert('El plan seleccionado no es válido.');
      return;
    }

    this.cargando = true;
    this.mensaje = '';
    this.error = false;

    const message = `Hola, me interesa contratar el plan ${selectedPlan.nombre} (${selectedPlan.id}).`;
    const encoded = encodeURIComponent(message);
    const phone = (this.whatsappNumber || '').replace(/[^0-9]/g, '');

    if (!phone) {
      this.cargando = false;
      this.error = true;
      this.mensaje = 'No se pudo iniciar el chat de WhatsApp. Contacta a soporte.';
      return;
    }

    window.open(`https://wa.me/${phone}?text=${encoded}`, '_blank');
    this.cargando = false;
    this.mensaje = 'Te redirigimos a WhatsApp para finalizar tu contratación. Nuestro equipo continuará el proceso contigo.';
  }
}
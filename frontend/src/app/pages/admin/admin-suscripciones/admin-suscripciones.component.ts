import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AdminSuscripcionesService, Suscripcion, CrearSuscripcionDto } from '../../../services/admin-suscripciones.service';
import { AdminEmpresasService, Empresa } from '../../../services/admin-empresas.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-admin-suscripciones',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, RouterLinkActive],
  templateUrl: './admin-suscripciones.component.html',
  styleUrl: './admin-suscripciones.component.css'
})
export class AdminSuscripcionesComponent implements OnInit {
  suscripciones: Suscripcion[] = [];
  empresas: Empresa[] = [];
  cargando = false;
  filtroEstado = '';
  
  // Formulario de nueva suscripción
  mostrarFormulario = false;
  nuevaSuscripcion: CrearSuscripcionDto = {
    empresa_id: 0,
    plan_id: 0,
    periodo: 'mensual'
  };

  constructor(
    private adminSuscripcionesService: AdminSuscripcionesService,
    private adminEmpresasService: AdminEmpresasService
  ) {}

  ngOnInit(): void {
    this.cargarSuscripciones();
    this.cargarEmpresas();
  }

  cargarSuscripciones(): void {
    this.cargando = true;
    const filtros = this.filtroEstado ? { estado: this.filtroEstado } : undefined;
    
    this.adminSuscripcionesService.listarSuscripciones(filtros).subscribe({
      next: (suscripciones) => {
        this.suscripciones = suscripciones;
        this.cargando = false;
      },
      error: (error) => {
        console.error('Error al cargar suscripciones:', error);
        Swal.fire('Error', 'No se pudieron cargar las suscripciones', 'error');
        this.cargando = false;
      }
    });
  }

  cargarEmpresas(): void {
    this.adminEmpresasService.listarEmpresas().subscribe({
      next: (empresas) => {
        this.empresas = empresas.filter(e => e.estado); // Solo empresas activas
      },
      error: (error) => {
        console.error('Error al cargar empresas:', error);
      }
    });
  }

  filtrarPorEstado(): void {
    this.cargarSuscripciones();
  }

  toggleFormulario(): void {
    this.mostrarFormulario = !this.mostrarFormulario;
    if (!this.mostrarFormulario) {
      this.limpiarFormulario();
    }
  }

  limpiarFormulario(): void {
    this.nuevaSuscripcion = {
      empresa_id: 0,
      plan_id: 0,
      periodo: 'mensual',
      forma_pago: ''
    };
  }

  crearSuscripcion(): void {
    if (!this.nuevaSuscripcion.empresa_id || !this.nuevaSuscripcion.plan_id || !this.nuevaSuscripcion.forma_pago) {
      Swal.fire('Error', 'Empresa, Plan y Forma de Pago son obligatorios', 'error');
      return;
    }

    this.adminSuscripcionesService.crearSuscripcion(this.nuevaSuscripcion).subscribe({
      next: (response) => {
        Swal.fire('Éxito', response.message, 'success');
        this.cargarSuscripciones();
        this.toggleFormulario();
      },
      error: (error) => {
        console.error('Error al crear suscripción:', error);
        Swal.fire('Error', error.error.message || 'No se pudo crear la suscripción', 'error');
      }
    });
  }

  renovarSuscripcion(suscripcion: Suscripcion): void {
    const planNombre = suscripcion.plan?.nombre || 'N/A';
    const precioMensual = suscripcion.plan?.precio_mensual || 0;
    const precioAnual = suscripcion.plan?.precio_anual || 0;
    const periodoActual = suscripcion.periodo || 'mensual';
    const fechaFin = new Date(suscripcion.fecha_fin);
    const fechaFinStr = fechaFin.toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
    
    // Calcular el ahorro base del plan anual vs mensual
    const ahorroAnualBase = Math.round((1 - precioAnual / (precioMensual * 12)) * 100);
    
    Swal.fire({
      title: '',
      html: `
        <div class="renovar-modal">
          <div class="modal-header-custom">
            <div class="icon-circle renovar">
              <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/>
              </svg>
            </div>
            <h2>Renovar Suscripción</h2>
            <p class="subtitle">Extender el servicio del cliente</p>
          </div>
          
          <div class="info-card">
            <div class="info-row">
              <span class="info-label">Empresa</span>
              <span class="info-value">${suscripcion.empresa?.nombre || 'N/A'}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Plan actual</span>
              <span class="info-value plan-badge">${planNombre}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Vence el</span>
              <span class="info-value fecha">${fechaFinStr}</span>
            </div>
          </div>
          
          <div class="form-section">
            <label class="form-label">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                <line x1="16" y1="2" x2="16" y2="6"></line>
                <line x1="8" y1="2" x2="8" y2="6"></line>
                <line x1="3" y1="10" x2="21" y2="10"></line>
              </svg>
              Selecciona el tipo de periodo
            </label>
            
            <div class="periodo-options">
              <label class="periodo-card ${periodoActual === 'mensual' ? 'selected' : ''}" id="cardMensual">
                <input type="radio" name="periodo" value="mensual" ${periodoActual === 'mensual' ? 'checked' : ''}>
                <div class="periodo-content">
                  <div class="periodo-icon">📅</div>
                  <div class="periodo-info">
                    <span class="periodo-title">Mensual</span>
                    <span class="periodo-price">$${precioMensual.toLocaleString('es-CO')}/mes</span>
                  </div>
                  <div class="periodo-duration">+30 días</div>
                </div>
              </label>
              
              <label class="periodo-card ${periodoActual === 'anual' ? 'selected' : ''}" id="cardAnual">
                <input type="radio" name="periodo" value="anual" ${periodoActual === 'anual' ? 'checked' : ''}>
                <div class="periodo-content">
                  <div class="periodo-icon">🗓️</div>
                  <div class="periodo-info">
                    <span class="periodo-title">Anual</span>
                    <span class="periodo-price">$${precioAnual.toLocaleString('es-CO')}/año</span>
                  </div>
                  <div class="periodo-duration">Elige duración</div>
                  <div class="ahorro-badge">Ahorra ${Math.round((1 - precioAnual / (precioMensual * 12)) * 100)}%</div>
                </div>
              </label>
            </div>
          </div>
          
          <!-- Selector de años para anual -->
          <div class="anos-section" id="anosSection" style="display: ${periodoActual === 'anual' ? 'block' : 'none'};">
            <label class="form-label">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"></circle>
                <polyline points="12 6 12 12 16 14"></polyline>
              </svg>
              Duración de la renovación anual
            </label>
            <div class="anos-grid">
              <label class="ano-card selected" id="ano1">
                <input type="radio" name="anos" value="1" checked>
                <div class="ano-content">
                  <span class="ano-num">1</span>
                  <span class="ano-label">año</span>
                  <span class="ano-precio">$${precioAnual.toLocaleString('es-CO')}</span>
                </div>
              </label>
              <label class="ano-card" id="ano2">
                <input type="radio" name="anos" value="2">
                <div class="ano-content">
                  <span class="ano-num">2</span>
                  <span class="ano-label">años</span>
                  <span class="ano-precio">$${(precioAnual * 2 * 0.99).toLocaleString('es-CO', {maximumFractionDigits: 0})}</span>
                  <span class="descuento-badge">+1% extra</span>
                </div>
              </label>
              <label class="ano-card" id="ano3">
                <input type="radio" name="anos" value="3">
                <div class="ano-content">
                  <span class="ano-num">3</span>
                  <span class="ano-label">años</span>
                  <span class="ano-precio">$${(precioAnual * 3 * 0.98).toLocaleString('es-CO', {maximumFractionDigits: 0})}</span>
                  <span class="descuento-badge">+2% extra</span>
                </div>
              </label>
              <label class="ano-card" id="ano4">
                <input type="radio" name="anos" value="4">
                <div class="ano-content">
                  <span class="ano-num">4</span>
                  <span class="ano-label">años</span>
                  <span class="ano-precio">$${(precioAnual * 4 * 0.97).toLocaleString('es-CO', {maximumFractionDigits: 0})}</span>
                  <span class="descuento-badge">+3% extra</span>
                </div>
              </label>
              <label class="ano-card" id="ano5">
                <input type="radio" name="anos" value="5">
                <div class="ano-content">
                  <span class="ano-num">5</span>
                  <span class="ano-label">años</span>
                  <span class="ano-precio">$${(precioAnual * 5 * 0.96).toLocaleString('es-CO', {maximumFractionDigits: 0})}</span>
                  <span class="descuento-badge">+4% extra</span>
                </div>
              </label>
            </div>
          </div>
          
          <div class="nueva-fecha-card" id="nuevaFechaCard">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"></circle>
              <polyline points="12 6 12 12 16 14"></polyline>
            </svg>
            <div class="fecha-info">
              <span class="label">Nueva fecha de vencimiento</span>
              <span class="fecha" id="nuevaFecha"></span>
            </div>
            <div class="precio-total" id="precioTotal">
              <span class="label">Total a pagar</span>
              <span class="precio" id="precioValor">$${periodoActual === 'anual' ? precioAnual.toLocaleString('es-CO') : precioMensual.toLocaleString('es-CO')}</span>
            </div>
          </div>
          
          <div class="renovacion-auto-section">
            <label class="renovacion-checkbox">
              <input type="checkbox" id="renovacionAutomaticaRenovar" ${suscripcion.renovacion_automatica ? 'checked' : ''}>
              <span class="checkbox-custom"></span>
              <div class="renovacion-label">
                <i class="fas fa-sync-alt"></i>
                <span>Mantener renovación automática</span>
                <small>Se renovará automáticamente al vencer</small>
              </div>
            </label>
          </div>
        </div>
        
        <style>
          .renovar-modal { text-align: left; }
          .modal-header-custom { text-align: center; margin-bottom: 20px; }
          .icon-circle.renovar { 
            width: 56px; height: 56px; 
            background: linear-gradient(135deg, #3b82f6, #2563eb); 
            border-radius: 50%; 
            display: flex; align-items: center; justify-content: center; 
            margin: 0 auto 12px; 
            color: white;
            box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
          }
          .modal-header-custom h2 { margin: 0; font-size: 1.5rem; color: #1f2937; }
          .modal-header-custom .subtitle { margin: 4px 0 0; color: #6b7280; font-size: 0.9rem; }
          
          .info-card {
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 12px;
            padding: 16px;
            margin-bottom: 20px;
          }
          .info-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 8px 0;
            border-bottom: 1px dashed #e2e8f0;
          }
          .info-row:last-child { border-bottom: none; }
          .info-label { color: #64748b; font-size: 0.9rem; }
          .info-value { font-weight: 600; color: #1f2937; }
          .info-value.plan-badge {
            background: linear-gradient(135deg, #3b82f6, #2563eb);
            color: white;
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 0.85rem;
          }
          .info-value.fecha { color: #f59e0b; }
          
          .form-section { margin-bottom: 16px; }
          .form-label {
            display: flex;
            align-items: center;
            gap: 8px;
            font-weight: 600;
            color: #374151;
            margin-bottom: 12px;
            font-size: 0.9rem;
          }
          .form-label svg { color: #6b7280; }
          
          .periodo-options {
            display: flex;
            flex-direction: column;
            gap: 12px;
          }
          
          .periodo-card {
            position: relative;
            border: 2px solid #e2e8f0;
            border-radius: 12px;
            padding: 16px;
            cursor: pointer;
            transition: all 0.2s;
            background: white;
          }
          .periodo-card:hover { border-color: #93c5fd; background: #f0f9ff; }
          .periodo-card.selected { 
            border-color: #3b82f6; 
            background: linear-gradient(135deg, #eff6ff, #dbeafe);
            box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
          }
          .periodo-card input { display: none; }
          
          .periodo-content {
            display: flex;
            align-items: center;
            gap: 12px;
          }
          .periodo-icon { font-size: 1.5rem; }
          .periodo-info { flex: 1; }
          .periodo-title { display: block; font-weight: 600; color: #1f2937; }
          .periodo-price { display: block; font-size: 0.85rem; color: #6b7280; }
          .periodo-duration {
            background: #dbeafe;
            color: #2563eb;
            padding: 4px 10px;
            border-radius: 6px;
            font-size: 0.8rem;
            font-weight: 600;
          }
          .ahorro-badge {
            position: absolute;
            top: -8px;
            right: 12px;
            background: linear-gradient(135deg, #10b981, #059669);
            color: white;
            padding: 4px 10px;
            border-radius: 12px;
            font-size: 0.75rem;
            font-weight: 600;
          }
          
          /* Estilos para selector de años */
          .anos-section {
            margin-bottom: 16px;
            animation: fadeIn 0.3s ease;
          }
          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(-10px); }
            to { opacity: 1; transform: translateY(0); }
          }
          .anos-grid {
            display: grid;
            grid-template-columns: repeat(5, 1fr);
            gap: 8px;
          }
          .ano-card {
            position: relative;
            border: 2px solid #e2e8f0;
            border-radius: 10px;
            padding: 10px 6px;
            cursor: pointer;
            transition: all 0.2s;
            background: white;
            text-align: center;
          }
          .ano-card:hover { border-color: #a78bfa; background: #faf5ff; }
          .ano-card.selected { 
            border-color: #8b5cf6; 
            background: linear-gradient(135deg, #f5f3ff, #ede9fe);
            box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.15);
          }
          .ano-card input { display: none; }
          .ano-content { display: flex; flex-direction: column; align-items: center; gap: 2px; }
          .ano-num { font-size: 1.4rem; font-weight: 700; color: #1f2937; }
          .ano-label { font-size: 0.7rem; color: #6b7280; }
          .ano-precio { font-size: 0.65rem; color: #8b5cf6; font-weight: 600; margin-top: 4px; }
          .descuento-badge {
            background: linear-gradient(135deg, #f59e0b, #d97706);
            color: white;
            padding: 2px 6px;
            border-radius: 8px;
            font-size: 0.6rem;
            font-weight: 600;
            margin-top: 4px;
          }
          
          .nueva-fecha-card {
            display: flex;
            align-items: center;
            gap: 12px;
            background: linear-gradient(135deg, #ecfdf5, #d1fae5);
            border: 1px solid #86efac;
            border-radius: 10px;
            padding: 14px 16px;
            color: #059669;
          }
          .nueva-fecha-card .fecha-info { flex: 1; }
          .nueva-fecha-card .label { display: block; font-size: 0.75rem; color: #6b7280; }
          .nueva-fecha-card .fecha { display: block; font-weight: 700; font-size: 0.95rem; color: #059669; }
          .precio-total {
            text-align: right;
            border-left: 1px solid #86efac;
            padding-left: 12px;
          }
          .precio-total .precio { display: block; font-weight: 700; font-size: 1.1rem; color: #059669; }
          
          .renovacion-auto-section {
            margin-top: 20px;
            padding-top: 16px;
            border-top: 1px dashed #e2e8f0;
          }
          .renovacion-checkbox {
            display: flex;
            align-items: flex-start;
            gap: 12px;
            cursor: pointer;
            padding: 12px;
            border-radius: 10px;
            transition: background 0.2s;
          }
          .renovacion-checkbox:hover {
            background: #f9fafb;
          }
          .renovacion-checkbox input[type="checkbox"] {
            display: none;
          }
          .checkbox-custom {
            width: 20px;
            height: 20px;
            border: 2px solid #d1d5db;
            border-radius: 6px;
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
            transition: all 0.2s;
            margin-top: 2px;
          }
          .renovacion-checkbox input[type="checkbox"]:checked + .checkbox-custom {
            background: #3b82f6;
            border-color: #3b82f6;
          }
          .renovacion-checkbox input[type="checkbox"]:checked + .checkbox-custom::after {
            content: "✓";
            color: white;
            font-size: 14px;
            font-weight: bold;
          }
          .renovacion-label {
            flex: 1;
          }
          .renovacion-label i {
            color: #3b82f6;
            margin-right: 6px;
          }
          .renovacion-label span {
            font-weight: 600;
            color: #1f2937;
          }
          .renovacion-label small {
            display: block;
            color: #6b7280;
            font-size: 0.8rem;
            margin-top: 4px;
          }
        </style>
      `,
      showCancelButton: true,
      confirmButtonText: '<span style="display:flex;align-items:center;gap:6px;"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/></svg>Renovar ahora</span>',
      confirmButtonColor: '#3b82f6',
      cancelButtonText: 'Cancelar',
      width: '500px',
      didOpen: () => {
        const cardMensual = document.getElementById('cardMensual');
        const cardAnual = document.getElementById('cardAnual');
        const anosSection = document.getElementById('anosSection');
        const nuevaFechaSpan = document.getElementById('nuevaFecha');
        const precioValorSpan = document.getElementById('precioValor');
        const anoCards = [1, 2, 3, 4, 5].map(n => document.getElementById(`ano${n}`));
        
        let periodoSeleccionado = periodoActual;
        let anosSeleccionados = 1;
        
        const calcularDescuento = (anos: number): number => {
          return anos > 1 ? (anos - 1) : 0;
        };
        
        const calcularPrecio = (periodo: string, anos: number): number => {
          if (periodo === 'mensual') {
            return precioMensual;
          } else {
            const descuento = calcularDescuento(anos);
            const precioBase = precioAnual * anos;
            return precioBase * (1 - descuento / 100);
          }
        };
        
        const calcularNuevaFecha = (periodo: string, anos: number) => {
          const nuevaFecha = new Date(fechaFin);
          if (periodo === 'mensual') {
            nuevaFecha.setDate(nuevaFecha.getDate() + 30);
          } else {
            nuevaFecha.setDate(nuevaFecha.getDate() + (365 * anos));
          }
          return nuevaFecha.toLocaleDateString('es-CO', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' });
        };
        
        const actualizarUI = () => {
          cardMensual?.classList.toggle('selected', periodoSeleccionado === 'mensual');
          cardAnual?.classList.toggle('selected', periodoSeleccionado === 'anual');
          
          if (anosSection) {
            anosSection.style.display = periodoSeleccionado === 'anual' ? 'block' : 'none';
          }
          
          // Actualizar selección de años
          anoCards.forEach((card, index) => {
            card?.classList.toggle('selected', index + 1 === anosSeleccionados);
          });
          
          if (nuevaFechaSpan) {
            nuevaFechaSpan.textContent = calcularNuevaFecha(periodoSeleccionado, anosSeleccionados);
          }
          
          if (precioValorSpan) {
            const precio = calcularPrecio(periodoSeleccionado, anosSeleccionados);
            precioValorSpan.textContent = '$' + precio.toLocaleString('es-CO', { maximumFractionDigits: 0 });
          }
        };
        
        // Mostrar valores iniciales
        actualizarUI();
        
        cardMensual?.addEventListener('click', () => {
          periodoSeleccionado = 'mensual';
          anosSeleccionados = 1;
          actualizarUI();
        });
        
        cardAnual?.addEventListener('click', () => {
          periodoSeleccionado = 'anual';
          actualizarUI();
        });
        
        // Event listeners para años
        anoCards.forEach((card, index) => {
          card?.addEventListener('click', () => {
            anosSeleccionados = index + 1;
            actualizarUI();
          });
        });
      },
      preConfirm: () => {
        const periodoSeleccionado = (document.querySelector('input[name="periodo"]:checked') as HTMLInputElement)?.value || 'mensual';
        const anosSeleccionados = parseInt((document.querySelector('input[name="anos"]:checked') as HTMLInputElement)?.value || '1');
        const descuento = periodoSeleccionado === 'anual' && anosSeleccionados > 1 ? (anosSeleccionados - 1) : 0;
        const renovacionAutomatica = (document.getElementById('renovacionAutomaticaRenovar') as HTMLInputElement)?.checked;
        
        return { 
          periodo: periodoSeleccionado,
          años: periodoSeleccionado === 'anual' ? anosSeleccionados : undefined,
          porcentaje_descuento: descuento > 0 ? descuento : undefined,
          renovacion_automatica: renovacionAutomatica
        };
      }
    }).then((result) => {
      if (result.isConfirmed && result.value) {
        this.adminSuscripcionesService.renovarSuscripcion(suscripcion.id, result.value).subscribe({
          next: (response) => {
            // Calcular descuento total: ahorro base anual + descuento multi-año
            let descuentoMsg = '';
            if (result.value.periodo === 'anual') {
              const descuentoExtra = result.value.porcentaje_descuento || 0;
              const descuentoTotal = ahorroAnualBase + descuentoExtra;
              if (descuentoExtra > 0) {
                descuentoMsg = `<p style="color:#059669;font-size:0.9rem;">✨ Descuento total: ${descuentoTotal}% (${ahorroAnualBase}% anual + ${descuentoExtra}% multi-año)</p>`;
              } else {
                descuentoMsg = `<p style="color:#059669;font-size:0.9rem;">✨ Ahorro anual aplicado: ${ahorroAnualBase}%</p>`;
              }
            }
            Swal.fire({
              icon: 'success',
              title: '¡Suscripción renovada!',
              html: `<p>${response.message}</p>${descuentoMsg}`,
              confirmButtonColor: '#3b82f6'
            });
            this.cargarSuscripciones();
          },
          error: (error) => {
            console.error('Error al renovar suscripción:', error);
            Swal.fire('Error', error.error.message || 'No se pudo renovar la suscripción', 'error');
          }
        });
      }
    });
  }

  cancelarSuscripcion(suscripcion: Suscripcion): void {
    Swal.fire({
      title: 'Cancelar Suscripción',
      html: `
        <div style="text-align: left;">
          <p>¿Deseas cancelar la suscripción de <strong>${suscripcion.empresa?.nombre || 'esta empresa'}</strong>?</p>
          <label style="display: block; margin-top: 10px;">Motivo de cancelación:</label>
          <input id="motivo" class="swal2-input" placeholder="Motivo...">
          <label style="display: block; margin-top: 10px;">Notas (opcional):</label>
          <textarea id="notas" class="swal2-textarea" placeholder="Notas adicionales..."></textarea>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: 'Cancelar suscripción',
      cancelButtonText: 'Volver',
      confirmButtonColor: '#dc3545',
      preConfirm: () => {
        const motivo = (document.getElementById('motivo') as HTMLInputElement).value;
        const notas = (document.getElementById('notas') as HTMLTextAreaElement).value;
        
        if (!motivo) {
          Swal.showValidationMessage('El motivo es obligatorio');
          return false;
        }
        
        return { motivo, notas };
      }
    }).then((result) => {
      if (result.isConfirmed && result.value) {
        this.adminSuscripcionesService.cancelarSuscripcion(suscripcion.id, result.value).subscribe({
          next: (response) => {
            Swal.fire('Cancelada', response.message, 'success');
            this.cargarSuscripciones();
          },
          error: (error) => {
            console.error('Error al cancelar suscripción:', error);
            Swal.fire('Error', error.error.message || 'No se pudo cancelar la suscripción', 'error');
          }
        });
      }
    });
  }

  suspenderSuscripcion(suscripcion: Suscripcion): void {
    Swal.fire({
      title: 'Suspender Suscripción',
      input: 'text',
      inputLabel: 'Motivo de suspensión',
      inputPlaceholder: 'Ingresa el motivo...',
      showCancelButton: true,
      confirmButtonText: 'Suspender',
      cancelButtonText: 'Cancelar',
      inputValidator: (value) => {
        if (!value) {
          return 'El motivo es obligatorio';
        }
        return null;
      }
    }).then((result) => {
      if (result.isConfirmed && result.value) {
        this.adminSuscripcionesService.suspenderSuscripcion(suscripcion.id, result.value).subscribe({
          next: (response) => {
            Swal.fire('Suspendida', response.message, 'success');
            this.cargarSuscripciones();
          },
          error: (error) => {
            console.error('Error al suspender suscripción:', error);
            Swal.fire('Error', error.error.message || 'No se pudo suspender la suscripción', 'error');
          }
        });
      }
    });
  }

  reactivarSuscripcion(suscripcion: Suscripcion): void {
    Swal.fire({
      title: '¿Reactivar suscripción?',
      text: `¿Deseas reactivar la suscripción de ${suscripcion.empresa?.nombre || 'esta empresa'}?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sí, reactivar',
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        this.adminSuscripcionesService.reactivarSuscripcion(suscripcion.id).subscribe({
          next: (response) => {
            Swal.fire('Reactivada', response.message, 'success');
            this.cargarSuscripciones();
          },
          error: (error) => {
            console.error('Error al reactivar suscripción:', error);
            Swal.fire('Error', error.error.message || 'No se pudo reactivar la suscripción', 'error');
          }
        });
      }
    });
  }

  aplicarDescuento(suscripcion: Suscripcion): void {
    const precioBase = suscripcion.precio_pagado || 0;
    const descuentoActual = suscripcion.porcentaje_descuento || 0;
    const planNombre = suscripcion.plan?.nombre || 'N/A';
    const periodo = suscripcion.periodo === 'anual' ? 'año' : 'mes';
    
    Swal.fire({
      title: '',
      html: `
        <div class="descuento-modal">
          <div class="modal-header-custom">
            <div class="icon-circle">
              <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="19" y1="5" x2="5" y2="19"></line>
                <circle cx="6.5" cy="6.5" r="2.5"></circle>
                <circle cx="17.5" cy="17.5" r="2.5"></circle>
              </svg>
            </div>
            <h2>Aplicar Descuento</h2>
            <p class="subtitle">Retención de cliente</p>
          </div>
          
          <div class="info-card">
            <div class="info-row">
              <span class="info-label">Empresa</span>
              <span class="info-value">${suscripcion.empresa?.nombre || 'N/A'}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Plan</span>
              <span class="info-value plan-badge">${planNombre}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Precio base</span>
              <span class="info-value precio">$${precioBase.toLocaleString('es-CO')}/${periodo}</span>
            </div>
            ${descuentoActual > 0 ? `
            <div class="info-row descuento-actual">
              <span class="info-label">Descuento actual</span>
              <span class="info-value descuento">${descuentoActual}%</span>
            </div>
            ` : ''}
          </div>
          
          <div class="form-section">
            <label class="form-label">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="19" y1="5" x2="5" y2="19"></line>
                <circle cx="6.5" cy="6.5" r="2.5"></circle>
                <circle cx="17.5" cy="17.5" r="2.5"></circle>
              </svg>
              Porcentaje de descuento
            </label>
            <div class="input-with-suffix">
              <input type="number" id="porcentaje" min="0" max="100" step="1" value="${descuentoActual}" placeholder="0">
              <span class="suffix">%</span>
            </div>
            <div class="slider-container">
              <input type="range" id="porcentajeSlider" min="0" max="50" step="5" value="${descuentoActual}">
              <div class="slider-labels">
                <span>0%</span>
                <span>10%</span>
                <span>20%</span>
                <span>30%</span>
                <span>40%</span>
                <span>50%</span>
              </div>
            </div>
            
            <label class="form-label" style="margin-top: 16px;">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
                <line x1="16" y1="13" x2="8" y2="13"></line>
                <line x1="16" y1="17" x2="8" y2="17"></line>
              </svg>
              Motivo del descuento
            </label>
            <select id="motivo" class="custom-select">
              <option value="Retención de cliente">🤝 Retención de cliente</option>
              <option value="Promoción especial">🎉 Promoción especial</option>
              <option value="Cliente frecuente">⭐ Cliente frecuente</option>
              <option value="Compensación por inconvenientes">🔧 Compensación por inconvenientes</option>
              <option value="Negociación comercial">💼 Negociación comercial</option>
              <option value="Referido">👥 Referido</option>
              <option value="Otro">📝 Otro</option>
            </select>
          </div>
          
          <div id="precioFinal" class="precio-final-card">
            <div class="precio-comparacion">
              <div class="precio-original">
                <span class="label">Precio original</span>
                <span class="valor">$${precioBase.toLocaleString('es-CO')}</span>
              </div>
              <div class="arrow">→</div>
              <div class="precio-nuevo">
                <span class="label">Nuevo precio</span>
                <span class="valor" id="nuevoPrecio">$${(precioBase * (1 - descuentoActual / 100)).toLocaleString('es-CO')}</span>
              </div>
            </div>
            <div class="ahorro" id="ahorroInfo" ${descuentoActual === 0 ? 'style="display:none;"' : ''}>
              <span>💰 Ahorro: <strong id="montoAhorro">$${(precioBase * descuentoActual / 100).toLocaleString('es-CO')}</strong>/${periodo}</span>
            </div>
          </div>
        </div>
        
        <style>
          .descuento-modal { text-align: left; }
          .modal-header-custom { text-align: center; margin-bottom: 20px; }
          .icon-circle { 
            width: 56px; height: 56px; 
            background: linear-gradient(135deg, #10b981, #059669); 
            border-radius: 50%; 
            display: flex; align-items: center; justify-content: center; 
            margin: 0 auto 12px; 
            color: white;
            box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
          }
          .modal-header-custom h2 { margin: 0; font-size: 1.5rem; color: #1f2937; }
          .modal-header-custom .subtitle { margin: 4px 0 0; color: #6b7280; font-size: 0.9rem; }
          
          .info-card {
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 12px;
            padding: 16px;
            margin-bottom: 20px;
          }
          .info-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 8px 0;
            border-bottom: 1px dashed #e2e8f0;
          }
          .info-row:last-child { border-bottom: none; }
          .info-label { color: #64748b; font-size: 0.9rem; }
          .info-value { font-weight: 600; color: #1f2937; }
          .info-value.precio { color: #0f766e; font-size: 1.1rem; }
          .info-value.plan-badge {
            background: linear-gradient(135deg, #3b82f6, #2563eb);
            color: white;
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 0.85rem;
          }
          .info-value.descuento {
            background: #dcfce7;
            color: #16a34a;
            padding: 4px 10px;
            border-radius: 6px;
          }
          
          .form-section { margin-bottom: 20px; }
          .form-label {
            display: flex;
            align-items: center;
            gap: 8px;
            font-weight: 600;
            color: #374151;
            margin-bottom: 8px;
            font-size: 0.9rem;
          }
          .form-label svg { color: #6b7280; }
          
          .input-with-suffix {
            position: relative;
            display: flex;
            align-items: center;
          }
          .input-with-suffix input {
            width: 100%;
            padding: 12px 40px 12px 16px;
            border: 2px solid #e2e8f0;
            border-radius: 10px;
            font-size: 1.1rem;
            font-weight: 600;
            transition: border-color 0.2s;
          }
          .input-with-suffix input:focus {
            outline: none;
            border-color: #10b981;
          }
          .input-with-suffix .suffix {
            position: absolute;
            right: 16px;
            color: #6b7280;
            font-weight: 600;
            font-size: 1.1rem;
          }
          
          .slider-container { margin-top: 12px; }
          .slider-container input[type="range"] {
            width: 100%;
            height: 8px;
            border-radius: 4px;
            background: #e2e8f0;
            outline: none;
            -webkit-appearance: none;
          }
          .slider-container input[type="range"]::-webkit-slider-thumb {
            -webkit-appearance: none;
            width: 22px;
            height: 22px;
            border-radius: 50%;
            background: linear-gradient(135deg, #10b981, #059669);
            cursor: pointer;
            box-shadow: 0 2px 6px rgba(16, 185, 129, 0.4);
            transition: transform 0.2s;
          }
          .slider-container input[type="range"]::-webkit-slider-thumb:hover {
            transform: scale(1.1);
          }
          .slider-labels {
            display: flex;
            justify-content: space-between;
            margin-top: 6px;
            font-size: 0.75rem;
            color: #9ca3af;
          }
          
          .custom-select {
            width: 100%;
            padding: 12px 16px;
            border: 2px solid #e2e8f0;
            border-radius: 10px;
            font-size: 0.95rem;
            background: white;
            cursor: pointer;
            transition: border-color 0.2s;
          }
          .custom-select:focus {
            outline: none;
            border-color: #10b981;
          }
          
          .precio-final-card {
            background: linear-gradient(135deg, #f0fdf4, #dcfce7);
            border: 2px solid #86efac;
            border-radius: 12px;
            padding: 16px;
            text-align: center;
          }
          .precio-comparacion {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 16px;
            margin-bottom: 12px;
          }
          .precio-original .label, .precio-nuevo .label {
            display: block;
            font-size: 0.8rem;
            color: #6b7280;
            margin-bottom: 4px;
          }
          .precio-original .valor {
            font-size: 1rem;
            color: #9ca3af;
            text-decoration: line-through;
          }
          .precio-nuevo .valor {
            font-size: 1.4rem;
            font-weight: 700;
            color: #16a34a;
          }
          .arrow { color: #10b981; font-size: 1.2rem; }
          .ahorro {
            background: white;
            padding: 8px 16px;
            border-radius: 8px;
            color: #16a34a;
            font-size: 0.9rem;
          }
        </style>
      `,
      showCancelButton: true,
      confirmButtonText: '<span style="display:flex;align-items:center;gap:6px;"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>Aplicar descuento</span>',
      confirmButtonColor: '#16a34a',
      cancelButtonText: 'Cancelar',
      width: '480px',
      didOpen: () => {
        const porcentajeInput = document.getElementById('porcentaje') as HTMLInputElement;
        const porcentajeSlider = document.getElementById('porcentajeSlider') as HTMLInputElement;
        const nuevoPrecioSpan = document.getElementById('nuevoPrecio');
        const montoAhorroSpan = document.getElementById('montoAhorro');
        const ahorroInfo = document.getElementById('ahorroInfo');
        
        const actualizarPrecio = (porcentaje: number) => {
          const precioFinal = precioBase * (1 - Math.min(100, Math.max(0, porcentaje)) / 100);
          const ahorro = precioBase - precioFinal;
          
          if (nuevoPrecioSpan) {
            nuevoPrecioSpan.textContent = '$' + precioFinal.toLocaleString('es-CO');
          }
          if (montoAhorroSpan) {
            montoAhorroSpan.textContent = '$' + ahorro.toLocaleString('es-CO');
          }
          if (ahorroInfo) {
            ahorroInfo.style.display = porcentaje > 0 ? 'block' : 'none';
          }
        };
        
        porcentajeInput?.addEventListener('input', () => {
          const porcentaje = parseFloat(porcentajeInput.value) || 0;
          if (porcentajeSlider && porcentaje <= 50) {
            porcentajeSlider.value = String(porcentaje);
          }
          actualizarPrecio(porcentaje);
        });
        
        porcentajeSlider?.addEventListener('input', () => {
          const porcentaje = parseFloat(porcentajeSlider.value) || 0;
          if (porcentajeInput) {
            porcentajeInput.value = String(porcentaje);
          }
          actualizarPrecio(porcentaje);
        });
      },
      preConfirm: () => {
        const porcentaje = parseFloat((document.getElementById('porcentaje') as HTMLInputElement).value);
        const motivo = (document.getElementById('motivo') as HTMLSelectElement).value;
        
        if (isNaN(porcentaje) || porcentaje < 0 || porcentaje > 100) {
          Swal.showValidationMessage('El porcentaje debe ser un número entre 0 y 100');
          return false;
        }
        
        return { porcentaje, motivo };
      }
    }).then((result) => {
      if (result.isConfirmed && result.value) {
        this.adminSuscripcionesService.aplicarDescuento(suscripcion.id, result.value).subscribe({
          next: (response) => {
            Swal.fire({
              icon: 'success',
              title: '¡Descuento aplicado!',
              html: `
                <div style="text-align: center;">
                  <p style="margin-bottom: 16px;">${response.message}</p>
                  <div style="display: flex; justify-content: center; gap: 24px; padding: 16px; background: #f0fdf4; border-radius: 12px;">
                    <div>
                      <div style="color: #6b7280; font-size: 0.85rem;">Precio original</div>
                      <div style="font-size: 1.1rem; text-decoration: line-through; color: #9ca3af;">$${response.precio_original?.toLocaleString('es-CO')}</div>
                    </div>
                    <div style="color: #10b981; font-size: 1.5rem;">→</div>
                    <div>
                      <div style="color: #6b7280; font-size: 0.85rem;">Nuevo precio</div>
                      <div style="font-size: 1.3rem; font-weight: 700; color: #16a34a;">$${response.precio_con_descuento?.toLocaleString('es-CO')}</div>
                    </div>
                  </div>
                </div>
              `
            });
            this.cargarSuscripciones();
          },
          error: (error) => {
            console.error('Error al aplicar descuento:', error);
            Swal.fire('Error', error.error.message || 'No se pudo aplicar el descuento', 'error');
          }
        });
      }
    });
  }

  verDetalle(suscripcion: Suscripcion): void {
    const empresa = suscripcion.empresa?.nombre || 'N/A';
    const empresaNit = suscripcion.empresa?.nit || '';
    const plan = suscripcion.plan?.nombre || 'N/A';
    const periodo = suscripcion.periodo;
    const estado = suscripcion.estado;
    const fechaInicio = new Date(suscripcion.fecha_inicio).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
    const fechaFin = new Date(suscripcion.fecha_fin).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
    const precio = suscripcion.precio_pagado || 0;
    const descuento = suscripcion.porcentaje_descuento || 0;
    const precioFinal = suscripcion.precio_con_descuento || precio;
    const formaPago = this.formatearFormaPago(suscripcion.forma_pago);
    const creadoEn = suscripcion.creado_en ? new Date(suscripcion.creado_en).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'N/A';
    
    // Calcular días restantes
    const hoy = new Date();
    const vencimiento = new Date(suscripcion.fecha_fin);
    const diasRestantes = Math.ceil((vencimiento.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
    
    // Estado badge color
    const estadoColors: { [key: string]: { bg: string; text: string; icon: string } } = {
      'activa': { bg: '#dcfce7', text: '#16a34a', icon: '✓' },
      'suspendida': { bg: '#fef3c7', text: '#d97706', icon: '⏸' },
      'cancelada': { bg: '#fee2e2', text: '#dc2626', icon: '✕' },
      'inactiva': { bg: '#f3f4f6', text: '#6b7280', icon: '○' }
    };
    const estadoStyle = estadoColors[estado] || estadoColors['inactiva'];

    Swal.fire({
      title: '',
      html: `
        <div class="detalle-modal">
          <div class="modal-header-custom">
            <div class="icon-circle detalle">
              <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
                <line x1="16" y1="13" x2="8" y2="13"></line>
                <line x1="16" y1="17" x2="8" y2="17"></line>
                <polyline points="10 9 9 9 8 9"></polyline>
              </svg>
            </div>
            <h2>Detalle de Suscripción</h2>
            <p class="id-badge">#${suscripcion.id}</p>
          </div>
          
          <div class="estado-banner" style="background: ${estadoStyle.bg}; color: ${estadoStyle.text};">
            <span class="estado-icon">${estadoStyle.icon}</span>
            <span class="estado-text">${estado.charAt(0).toUpperCase() + estado.slice(1)}</span>
            ${estado === 'activa' && diasRestantes > 0 ? `<span class="dias-restantes">${diasRestantes} días restantes</span>` : ''}
            ${estado === 'activa' && diasRestantes <= 0 ? `<span class="dias-restantes vencido">Vencida</span>` : ''}
          </div>
          
          <div class="seccion">
            <h3 class="seccion-titulo"><span class="icon">🏢</span> Información de la empresa</h3>
            <div class="info-grid">
              <div class="info-item">
                <span class="label">Empresa</span>
                <span class="value">${empresa}</span>
              </div>
              ${empresaNit ? `
              <div class="info-item">
                <span class="label">NIT</span>
                <span class="value">${empresaNit}</span>
              </div>
              ` : ''}
            </div>
          </div>
          
          <div class="seccion">
            <h3 class="seccion-titulo"><span class="icon">📋</span> Detalles del plan</h3>
            <div class="info-grid">
              <div class="info-item">
                <span class="label">Plan</span>
                <span class="value plan-badge">${plan}</span>
              </div>
              <div class="info-item">
                <span class="label">Periodo</span>
                <span class="value">${periodo === 'anual' ? '🗓️ Anual' : '📅 Mensual'}</span>
              </div>
              <div class="info-item">
                <span class="label">Forma de pago</span>
                <span class="value">${formaPago}</span>
              </div>
            </div>
          </div>
          
          <div class="seccion">
            <h3 class="seccion-titulo"><span class="icon">💰</span> Facturación</h3>
            <div class="precio-card ${descuento > 0 ? 'con-descuento' : ''}">
              ${descuento > 0 ? `
                <div class="precio-row">
                  <span class="precio-label">Precio base</span>
                  <span class="precio-valor tachado">$${precio.toLocaleString('es-CO')}</span>
                </div>
                <div class="precio-row descuento">
                  <span class="precio-label">Descuento aplicado</span>
                  <span class="precio-valor descuento-badge">-${descuento}%</span>
                </div>
                <div class="precio-row final">
                  <span class="precio-label">Precio final</span>
                  <span class="precio-valor final">$${precioFinal.toLocaleString('es-CO')}</span>
                </div>
              ` : `
                <div class="precio-row final">
                  <span class="precio-label">Precio</span>
                  <span class="precio-valor">$${precio.toLocaleString('es-CO')}</span>
                </div>
              `}
            </div>
          </div>
          
          <div class="seccion">
            <h3 class="seccion-titulo"><span class="icon">📆</span> Fechas</h3>
            <div class="fechas-timeline">
              <div class="fecha-item inicio">
                <div class="fecha-dot"></div>
                <div class="fecha-content">
                  <span class="fecha-label">Inicio</span>
                  <span class="fecha-valor">${fechaInicio}</span>
                </div>
              </div>
              <div class="fecha-linea"></div>
              <div class="fecha-item fin">
                <div class="fecha-dot ${diasRestantes <= 30 && diasRestantes > 0 ? 'warning' : ''} ${diasRestantes <= 0 ? 'danger' : ''}"></div>
                <div class="fecha-content">
                  <span class="fecha-label">Vencimiento</span>
                  <span class="fecha-valor">${fechaFin}</span>
                </div>
              </div>
            </div>
          </div>
          
          <div class="seccion">
            <h3 class="seccion-titulo"><span class="icon">🔄</span> Configuración</h3>
            <div class="info-grid">
              <div class="info-item renovacion ${suscripcion.renovacion_automatica ? 'activa' : 'inactiva'}">
                <span class="label">Renovación automática</span>
                <span class="value">
                  <span class="renovacion-badge">
                    <i class="fas fa-${suscripcion.renovacion_automatica ? 'check-circle' : 'times-circle'}"></i>
                    ${suscripcion.renovacion_automatica ? 'Activada' : 'Desactivada'}
                  </span>
                </span>
              </div>
            </div>
            ${suscripcion.renovacion_automatica ? `
            <div class="renovacion-info">
              <i class="fas fa-info-circle"></i>
              <span>Esta suscripción se renovará automáticamente al vencer</span>
            </div>
            ` : ''}
          </div>
          
          ${suscripcion.motivo_cancelacion ? `
          <div class="seccion cancelacion">
            <h3 class="seccion-titulo"><span class="icon">⚠️</span> Motivo de cancelación</h3>
            <p class="cancelacion-texto">${suscripcion.motivo_cancelacion}</p>
          </div>
          ` : ''}
          
          ${suscripcion.notas ? `
          <div class="seccion notas">
            <h3 class="seccion-titulo"><span class="icon">📝</span> Notas e historial</h3>
            <div class="notas-contenido">${suscripcion.notas.replace(/\n/g, '<br>')}</div>
          </div>
          ` : ''}
          
          <div class="footer-info">
            <span>Creada el ${creadoEn}</span>
          </div>
        </div>
        
        <style>
          .detalle-modal { text-align: left; max-height: 70vh; overflow-y: auto; }
          .modal-header-custom { text-align: center; margin-bottom: 16px; position: sticky; top: 0; background: white; padding-bottom: 12px; }
          .icon-circle.detalle { 
            width: 56px; height: 56px; 
            background: linear-gradient(135deg, #8b5cf6, #7c3aed); 
            border-radius: 50%; 
            display: flex; align-items: center; justify-content: center; 
            margin: 0 auto 12px; 
            color: white;
            box-shadow: 0 4px 12px rgba(139, 92, 246, 0.3);
          }
          .modal-header-custom h2 { margin: 0; font-size: 1.4rem; color: #1f2937; }
          .id-badge { 
            display: inline-block;
            margin-top: 6px;
            background: #f3f4f6; 
            color: #6b7280; 
            padding: 4px 12px; 
            border-radius: 12px; 
            font-size: 0.85rem;
            font-family: monospace;
          }
          
          .estado-banner {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            padding: 12px 16px;
            border-radius: 10px;
            margin-bottom: 20px;
            font-weight: 600;
          }
          .estado-icon { font-size: 1.1rem; }
          .dias-restantes {
            margin-left: auto;
            font-size: 0.85rem;
            font-weight: 500;
            opacity: 0.8;
          }
          .dias-restantes.vencido { color: #dc2626; }
          
          .seccion {
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 12px;
            padding: 16px;
            margin-bottom: 12px;
          }
          .seccion-titulo {
            display: flex;
            align-items: center;
            gap: 8px;
            margin: 0 0 12px 0;
            font-size: 0.95rem;
            color: #374151;
            font-weight: 600;
          }
          .seccion-titulo .icon { font-size: 1rem; }
          
          .info-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
            gap: 12px;
          }
          .info-item {
            display: flex;
            flex-direction: column;
            gap: 4px;
          }
          .info-item .label { font-size: 0.8rem; color: #6b7280; }
          .info-item .value { font-weight: 600; color: #1f2937; }
          .info-item .value.plan-badge {
            display: inline-block;
            background: linear-gradient(135deg, #3b82f6, #2563eb);
            color: white;
            padding: 4px 12px;
            border-radius: 16px;
            font-size: 0.85rem;
            width: fit-content;
          }
          
          .precio-card {
            background: white;
            border-radius: 10px;
            padding: 12px;
          }
          .precio-card.con-descuento { background: linear-gradient(135deg, #f0fdf4, #dcfce7); }
          .precio-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 6px 0;
          }
          .precio-row:not(:last-child) { border-bottom: 1px dashed #e2e8f0; }
          .precio-label { color: #6b7280; font-size: 0.9rem; }
          .precio-valor { font-weight: 600; color: #1f2937; }
          .precio-valor.tachado { text-decoration: line-through; color: #9ca3af; }
          .precio-valor.final { color: #16a34a; font-size: 1.2rem; }
          .descuento-badge {
            background: #dcfce7;
            color: #16a34a;
            padding: 4px 10px;
            border-radius: 6px;
          }
          
          .fechas-timeline {
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 8px 0;
          }
          .fecha-item {
            display: flex;
            align-items: center;
            gap: 10px;
          }
          .fecha-dot {
            width: 12px;
            height: 12px;
            border-radius: 50%;
            background: #10b981;
            box-shadow: 0 0 0 4px rgba(16, 185, 129, 0.2);
          }
          .fecha-dot.warning { background: #f59e0b; box-shadow: 0 0 0 4px rgba(245, 158, 11, 0.2); }
          .fecha-dot.danger { background: #ef4444; box-shadow: 0 0 0 4px rgba(239, 68, 68, 0.2); }
          .fecha-linea { flex: 1; height: 2px; background: #e2e8f0; }
          .fecha-content { display: flex; flex-direction: column; gap: 2px; }
          .fecha-label { font-size: 0.75rem; color: #6b7280; }
          .fecha-valor { font-weight: 600; color: #1f2937; font-size: 0.9rem; }
          
          .seccion.cancelacion { background: #fef2f2; border-color: #fecaca; }
          .cancelacion-texto { margin: 0; color: #dc2626; }
          
          .seccion.notas { background: #fffbeb; border-color: #fde68a; }
          .notas-contenido {
            font-size: 0.85rem;
            color: #4b5563;
            white-space: pre-wrap;
            word-break: break-word;
            max-height: 150px;
            overflow-y: auto;
            background: white;
            padding: 12px;
            border-radius: 8px;
            border: 1px solid #fde68a;
          }
          
          .footer-info {
            text-align: center;
            padding-top: 12px;
            border-top: 1px solid #e2e8f0;
            color: #9ca3af;
            font-size: 0.8rem;
          }
          
          .renovacion-badge {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            padding: 6px 12px;
            border-radius: 16px;
            font-weight: 500;
            font-size: 0.9rem;
          }
          .info-item.renovacion.activa .renovacion-badge {
            background: #dcfce7;
            color: #16a34a;
          }
          .info-item.renovacion.inactiva .renovacion-badge {
            background: #fee2e2;
            color: #dc2626;
          }
          .renovacion-info {
            display: flex;
            align-items: center;
            gap: 8px;
            margin-top: 12px;
            padding: 10px 14px;
            background: #eff6ff;
            border-left: 3px solid #3b82f6;
            border-radius: 6px;
            color: #1e40af;
            font-size: 0.9rem;
          }
          .renovacion-info i {
            color: #3b82f6;
          }
        </style>
      `,
      confirmButtonText: 'Cerrar',
      confirmButtonColor: '#6b7280',
      width: '520px'
    });
  }

  formatearFormaPago(formaPago?: string): string {
    if (!formaPago) return 'N/A';
    
    const traducciones: { [key: string]: string } = {
      'efectivo': 'Efectivo',
      'transferencia': 'Transferencia Bancaria',
      'tarjeta_credito': 'Tarjeta de Crédito',
      'tarjeta_debito': 'Tarjeta de Débito',
      'pse': 'PSE',
      'nequi': 'Nequi',
      'daviplata': 'Daviplata'
    };
    
    return traducciones[formaPago] || formaPago;
  }
}

import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AdminApiKeysService, ApiKey, CrearApiKeyDto } from '../../../services/admin-api-keys.service';
import { AdminEmpresasService, Empresa } from '../../../services/admin-empresas.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-admin-api-keys',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, RouterLinkActive],
  templateUrl: './admin-api-keys.component.html',
  styleUrl: './admin-api-keys.component.css'
})
export class AdminApiKeysComponent implements OnInit {
  apiKeys: ApiKey[] = [];
  empresas: Empresa[] = [];
  cargando = false;
  
  // Filtros
  filtroEmpresaId?: number;
  filtroActivo?: boolean;
  filtroBusqueda = '';

  // Paginación
  paginaActual = 1;
  itemsPorPagina = 20;
  totalItems = 0;
  totalPaginas = 0;
  Math = Math;

  // Formulario de nueva API key
  mostrarFormulario = false;
  nuevaApiKey: CrearApiKeyDto = {
    empresa_id: 0,
    nombre: '',
    codigo: 'licencias',
    dias_expiracion: 365
  };

  // Formulario de edición
  apiKeyEditando?: ApiKey;
  mostrarFormularioEdicion = false;

  constructor(
    private adminApiKeysService: AdminApiKeysService,
    private adminEmpresasService: AdminEmpresasService
  ) {}

  ngOnInit(): void {
    this.cargarEmpresas();
    this.cargarApiKeys();
  }

  cargarEmpresas(): void {
    this.adminEmpresasService.listarEmpresas().subscribe({
      next: (empresas) => {
        this.empresas = empresas.filter(e => e.estado);
      },
      error: (error) => {
        console.error('Error al cargar empresas:', error);
      }
    });
  }

  cargarApiKeys(): void {
    this.cargando = true;
    const filtros = {
      empresa_id: this.filtroEmpresaId,
      activo: this.filtroActivo,
      search: this.filtroBusqueda || undefined,
      page: this.paginaActual,
      per_page: this.itemsPorPagina
    };

    this.adminApiKeysService.listarApiKeys(filtros).subscribe({
      next: (response) => {
        this.apiKeys = response.api_keys;
        this.totalItems = response.total;
        this.totalPaginas = response.pages || Math.ceil(this.totalItems / this.itemsPorPagina);
        this.cargando = false;
      },
      error: (error) => {
        console.error('Error al cargar API keys:', error);
        Swal.fire('Error', 'No se pudieron cargar las API keys', 'error');
        this.cargando = false;
      }
    });
  }

  aplicarFiltros(): void {
    this.paginaActual = 1; // Resetear a primera página al aplicar filtros
    this.cargarApiKeys();
  }

  cambiarPagina(pagina: number): void {
    if (pagina >= 1 && pagina <= this.totalPaginas) {
      this.paginaActual = pagina;
      this.cargarApiKeys();
    }
  }

  getPaginaArray(): number[] {
    const paginas: number[] = [];
    const maxPaginas = 5;
    let inicio = Math.max(1, this.paginaActual - Math.floor(maxPaginas / 2));
    let fin = Math.min(this.totalPaginas, inicio + maxPaginas - 1);
    
    if (fin - inicio < maxPaginas - 1) {
      inicio = Math.max(1, fin - maxPaginas + 1);
    }
    
    for (let i = inicio; i <= fin; i++) {
      paginas.push(i);
    }
    
    return paginas;
  }

  limpiarFiltros(): void {
    this.filtroEmpresaId = undefined;
    this.filtroActivo = undefined;
    this.filtroBusqueda = '';
    this.paginaActual = 1;
    this.cargarApiKeys();
  }

  toggleFormulario(): void {
    this.mostrarFormulario = !this.mostrarFormulario;
    if (!this.mostrarFormulario) {
      this.limpiarFormulario();
    }
  }

  limpiarFormulario(): void {
    this.nuevaApiKey = {
      empresa_id: 0,
      codigo: 'licencias',
      nombre: '',
      dias_expiracion: 365
    };
  }

  crearApiKey(): void {
    if (!this.nuevaApiKey.empresa_id || !this.nuevaApiKey.nombre) {
      Swal.fire('Error', 'Empresa y nombre son obligatorios', 'error');
      return;
    }

    this.adminApiKeysService.crearApiKey(this.nuevaApiKey).subscribe({
      next: (response) => {
        // Mostrar la API key generada (SOLO UNA VEZ)
        Swal.fire({
          title: '',
          html: `
            <style>
              .api-key-success-modal {
                text-align: center;
                padding: 8px;
              }
              .api-key-success-icon {
                width: 64px;
                height: 64px;
                background: linear-gradient(135deg, #10b981 0%, #059669 100%);
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                margin: 0 auto 16px;
                font-size: 28px;
                color: white;
              }
              .api-key-success-title {
                font-size: 22px;
                font-weight: 600;
                color: #1f2937;
                margin: 0 0 8px 0;
              }
              .api-key-success-subtitle {
                font-size: 14px;
                color: #6b7280;
                margin: 0 0 20px 0;
              }
              .api-key-warning-box {
                background: #fef3c7;
                border: 2px solid #fbbf24;
                border-radius: 10px;
                padding: 14px;
                margin: 16px 0;
              }
              .api-key-warning-content {
                display: flex;
                align-items: center;
                gap: 10px;
                color: #d97706;
                font-size: 13px;
                font-weight: 600;
              }
              .api-key-display-box {
                background: #1f2937;
                border: 2px solid #374151;
                border-radius: 10px;
                padding: 16px;
                margin: 20px 0;
                position: relative;
              }
              .api-key-label {
                font-size: 11px;
                color: #9ca3af;
                text-transform: uppercase;
                letter-spacing: 1px;
                margin-bottom: 8px;
                text-align: left;
              }
              .api-key-code {
                font-family: 'Courier New', monospace;
                font-size: 13px;
                color: #10b981;
                word-break: break-all;
                line-height: 1.6;
                text-align: left;
              }
              .copy-button {
                width: 100%;
                padding: 12px 20px;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                border: none;
                border-radius: 8px;
                font-size: 14px;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.3s;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 8px;
                margin-top: 20px;
              }
              .copy-button:hover {
                transform: translateY(-2px);
                box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
              }
              .copy-button.copied {
                background: linear-gradient(135deg, #10b981 0%, #059669 100%);
              }
            </style>
            <div class="api-key-success-modal">
              <div class="api-key-success-icon">
                <i class="fas fa-check"></i>
              </div>
              <h3 class="api-key-success-title">¡API Key creada exitosamente!</h3>
              <p class="api-key-success-subtitle">Copia y guarda esta clave de forma segura</p>
              
              <div class="api-key-warning-box">
                <div class="api-key-warning-content">
                  <span style="font-size: 20px;">⚠️</span>
                  <span>Esta clave solo se mostrará una vez. No podrás recuperarla.</span>
                </div>
              </div>

              <div class="api-key-display-box">
                <div class="api-key-label">Tu API Key:</div>
                <div class="api-key-code">${response.api_key_plana}</div>
              </div>

              <button id="copyApiKeyBtn" class="copy-button">
                <i class="fas fa-copy"></i>
                <span id="copyBtnText">Copiar al portapapeles</span>
              </button>
            </div>
          `,
          showConfirmButton: true,
          confirmButtonText: '<i class="fas fa-check"></i> Entendido',
          confirmButtonColor: '#10b981',
          allowOutsideClick: false,
          allowEscapeKey: false,
          width: '550px',
          didOpen: () => {
            const copyBtn = document.getElementById('copyApiKeyBtn');
            const copyBtnText = document.getElementById('copyBtnText');
            if (copyBtn && copyBtnText) {
              copyBtn.addEventListener('click', () => {
                navigator.clipboard.writeText(response.api_key_plana || '').then(() => {
                  copyBtn.classList.add('copied');
                  copyBtnText.textContent = '¡Copiado al portapapeles!';
                  (copyBtn.querySelector('i') as HTMLElement).className = 'fas fa-check';
                  setTimeout(() => {
                    copyBtn.classList.remove('copied');
                    copyBtnText.textContent = 'Copiar al portapapeles';
                    (copyBtn.querySelector('i') as HTMLElement).className = 'fas fa-copy';
                  }, 2000);
                });
              });
            }
          }
        }).then(() => {
          this.cargarApiKeys();
          this.toggleFormulario();
        });
      },
      error: (error) => {
        console.error('Error al crear API key:', error);
        Swal.fire('Error', error.error?.message || 'No se pudo crear la API key', 'error');
      }
    });
  }

  editarApiKey(apiKey: ApiKey): void {
    this.apiKeyEditando = { ...apiKey };
    this.mostrarFormularioEdicion = true;
  }

  cancelarEdicion(): void {
    this.apiKeyEditando = undefined;
    this.mostrarFormularioEdicion = false;
  }

  guardarEdicion(): void {
    if (!this.apiKeyEditando) return;

    const cambios = {
      nombre: this.apiKeyEditando.nombre,
      activo: this.apiKeyEditando.activo
    };

    this.adminApiKeysService.actualizarApiKey(this.apiKeyEditando.id, cambios).subscribe({
      next: (response) => {
        Swal.fire('Éxito', response.message, 'success');
        this.cargarApiKeys();
        this.cancelarEdicion();
      },
      error: (error) => {
        console.error('Error al actualizar API key:', error);
        Swal.fire('Error', error.error?.message || 'No se pudo actualizar la API key', 'error');
      }
    });
  }

  toggleEstado(apiKey: ApiKey): void {
    const accion = apiKey.activo ? 'desactivar' : 'activar';
    
    Swal.fire({
      title: `¿${accion.charAt(0).toUpperCase() + accion.slice(1)} API Key?`,
      text: `Esta acción ${accion === 'desactivar' ? 'bloqueará' : 'permitirá'} el acceso con esta clave.`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: `Sí, ${accion}`,
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        this.adminApiKeysService.toggleApiKey(apiKey.id).subscribe({
          next: (response) => {
            Swal.fire('Éxito', response.message, 'success');
            this.cargarApiKeys();
          },
          error: (error) => {
            console.error('Error al cambiar estado:', error);
            Swal.fire('Error', error.error?.message || 'No se pudo cambiar el estado', 'error');
          }
        });
      }
    });
  }

  renovarApiKey(apiKey: ApiKey): void {
    Swal.fire({
      title: '',
      html: `
        <style>
          .renovar-modal {
            text-align: center;
            padding: 8px;
          }
          .renovar-icon {
            width: 64px;
            height: 64px;
            background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 16px;
            font-size: 28px;
            color: white;
          }
          .renovar-title {
            font-size: 22px;
            font-weight: 600;
            color: #1f2937;
            margin: 0 0 8px 0;
          }
          .renovar-subtitle {
            font-size: 14px;
            color: #6b7280;
            margin: 0 0 20px 0;
          }
          .apikey-card {
            background: #f9fafb;
            padding: 16px;
            border-radius: 10px;
            border: 1px solid #e5e7eb;
            margin: 16px 0;
          }
          .apikey-card-name {
            font-size: 16px;
            font-weight: 600;
            color: #1f2937;
            margin: 0 0 4px 0;
          }
          .apikey-card-empresa {
            font-size: 14px;
            color: #6b7280;
            margin: 0;
          }
          .warning-box-renovar {
            background: #fef3c7;
            border: 2px solid #fbbf24;
            border-radius: 10px;
            padding: 14px;
            margin: 16px 0;
          }
          .warning-box-content-renovar {
            display: flex;
            align-items: center;
            gap: 10px;
            color: #d97706;
            font-size: 13px;
            font-weight: 600;
          }
          .expiracion-input-group {
            margin: 20px 0;
            text-align: left;
          }
          .expiracion-input-group label {
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 13px;
            font-weight: 500;
            color: #4b5563;
            margin-bottom: 8px;
          }
          .expiracion-input-wrapper {
            position: relative;
          }
          .expiracion-input-wrapper i {
            position: absolute;
            left: 14px;
            top: 50%;
            transform: translateY(-50%);
            color: #9ca3af;
          }
          .expiracion-input {
            width: 100%;
            padding: 12px 12px 12px 40px;
            border: 2px solid #e5e7eb;
            border-radius: 8px;
            font-size: 14px;
            transition: all 0.2s;
            box-sizing: border-box;
          }
          .expiracion-input:focus {
            outline: none;
            border-color: #f59e0b;
            box-shadow: 0 0 0 3px rgba(245, 158, 11, 0.1);
          }
        </style>
        <div class="renovar-modal">
          <div class="renovar-icon">
            <i class="fas fa-rotate"></i>
          </div>
          <h3 class="renovar-title">Renovar API Key</h3>
          <p class="renovar-subtitle">Se generará una nueva clave de acceso</p>
          
          <div class="apikey-card">
            <p class="apikey-card-name">${apiKey.nombre}</p>
            <p class="apikey-card-empresa">${this.getNombreEmpresa(apiKey.empresa_id)}</p>
          </div>

          <div class="warning-box-renovar">
            <div class="warning-box-content-renovar">
              <span style="font-size: 20px;">⚠️</span>
              <span>La clave anterior quedará invalidada inmediatamente</span>
            </div>
          </div>

          <div class="expiracion-input-group">
            <label>
              <i class="fas fa-calendar-alt"></i>
              Días de expiración (opcional)
            </label>
            <div class="expiracion-input-wrapper">
              <i class="fas fa-clock"></i>
              <input type="number" id="diasExpiracion" class="expiracion-input" placeholder="365" value="365" min="1">
            </div>
          </div>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: '<i class="fas fa-rotate"></i> Renovar clave',
      cancelButtonText: '<i class="fas fa-times"></i> Cancelar',
      confirmButtonColor: '#f59e0b',
      cancelButtonColor: '#6b7280',
      width: '500px',
      preConfirm: () => {
        const input = document.getElementById('diasExpiracion') as HTMLInputElement;
        const dias = input?.value ? parseInt(input.value) : undefined;
        return { dias_expiracion: dias };
      }
    }).then((result) => {
      if (result.isConfirmed) {
        this.adminApiKeysService.renovarApiKey(apiKey.id, result.value).subscribe({
          next: (response) => {
            // Mostrar la nueva API key
            Swal.fire({
              title: '',
              html: `
                <style>
                  .api-key-renovada-modal {
                    text-align: center;
                    padding: 8px;
                  }
                  .api-key-renovada-icon {
                    width: 64px;
                    height: 64px;
                    background: linear-gradient(135deg, #10b981 0%, #059669 100%);
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    margin: 0 auto 16px;
                    font-size: 28px;
                    color: white;
                  }
                  .api-key-renovada-title {
                    font-size: 22px;
                    font-weight: 600;
                    color: #1f2937;
                    margin: 0 0 8px 0;
                  }
                  .api-key-renovada-subtitle {
                    font-size: 14px;
                    color: #6b7280;
                    margin: 0 0 20px 0;
                  }
                  .api-key-renovada-warning {
                    background: #fef2f2;
                    border: 2px solid #fecaca;
                    border-radius: 10px;
                    padding: 14px;
                    margin: 16px 0;
                  }
                  .api-key-renovada-warning-content {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    color: #dc2626;
                    font-size: 13px;
                    font-weight: 600;
                  }
                  .api-key-renovada-display {
                    background: #1f2937;
                    border: 2px solid #374151;
                    border-radius: 10px;
                    padding: 16px;
                    margin: 20px 0;
                  }
                  .api-key-renovada-label {
                    font-size: 11px;
                    color: #9ca3af;
                    text-transform: uppercase;
                    letter-spacing: 1px;
                    margin-bottom: 8px;
                    text-align: left;
                  }
                  .api-key-renovada-code {
                    font-family: 'Courier New', monospace;
                    font-size: 13px;
                    color: #10b981;
                    word-break: break-all;
                    line-height: 1.6;
                    text-align: left;
                  }
                  .copy-renovada-button {
                    width: 100%;
                    padding: 12px 20px;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                    border: none;
                    border-radius: 8px;
                    font-size: 14px;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.3s;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 8px;
                    margin-top: 20px;
                  }
                  .copy-renovada-button:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
                  }
                  .copy-renovada-button.copied {
                    background: linear-gradient(135deg, #10b981 0%, #059669 100%);
                  }
                </style>
                <div class="api-key-renovada-modal">
                  <div class="api-key-renovada-icon">
                    <i class="fas fa-check"></i>
                  </div>
                  <h3 class="api-key-renovada-title">¡API Key renovada exitosamente!</h3>
                  <p class="api-key-renovada-subtitle">Copia y guarda esta nueva clave de forma segura</p>
                  
                  <div class="api-key-renovada-warning">
                    <div class="api-key-renovada-warning-content">
                      <span style="font-size: 20px;">⚠️</span>
                      <span>La clave anterior ya no funciona. Actualízala en tus sistemas.</span>
                    </div>
                  </div>

                  <div class="api-key-renovada-display">
                    <div class="api-key-renovada-label">Tu nueva API Key:</div>
                    <div class="api-key-renovada-code">${response.api_key_plana}</div>
                  </div>

                  <button id="copyRenovadaBtn" class="copy-renovada-button">
                    <i class="fas fa-copy"></i>
                    <span id="copyRenovadaBtnText">Copiar al portapapeles</span>
                  </button>
                </div>
              `,
              showConfirmButton: true,
              confirmButtonText: '<i class="fas fa-check"></i> Entendido',
              confirmButtonColor: '#10b981',
              allowOutsideClick: false,
              allowEscapeKey: false,
              width: '550px',
              didOpen: () => {
                const copyBtn = document.getElementById('copyRenovadaBtn');
                const copyBtnText = document.getElementById('copyRenovadaBtnText');
                if (copyBtn && copyBtnText) {
                  copyBtn.addEventListener('click', () => {
                    navigator.clipboard.writeText(response.api_key_plana || '').then(() => {
                      copyBtn.classList.add('copied');
                      copyBtnText.textContent = '¡Copiado al portapapeles!';
                      (copyBtn.querySelector('i') as HTMLElement).className = 'fas fa-check';
                      setTimeout(() => {
                        copyBtn.classList.remove('copied');
                        copyBtnText.textContent = 'Copiar al portapapeles';
                        (copyBtn.querySelector('i') as HTMLElement).className = 'fas fa-copy';
                      }, 2000);
                    });
                  });
                }
              }
            }).then(() => {
              this.cargarApiKeys();
            });
          },
          error: (error) => {
            console.error('Error al renovar API key:', error);
            Swal.fire('Error', error.error?.message || 'No se pudo renovar la API key', 'error');
          }
        });
      }
    });
  }

  eliminarApiKey(apiKey: ApiKey): void {
    Swal.fire({
      title: '',
      html: `
        <style>
          .eliminar-apikey-modal {
            text-align: center;
            padding: 8px;
          }
          .eliminar-apikey-icon {
            width: 64px;
            height: 64px;
            background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 16px;
            font-size: 28px;
            color: white;
          }
          .eliminar-apikey-title {
            font-size: 22px;
            font-weight: 600;
            color: #1f2937;
            margin: 0 0 12px 0;
          }
          .eliminar-apikey-message {
            font-size: 15px;
            color: #6b7280;
            margin: 0 0 20px 0;
          }
          .apikey-card-delete {
            background: #f9fafb;
            padding: 16px;
            border-radius: 10px;
            border: 2px solid #fecaca;
            margin: 20px 0;
          }
          .apikey-card-delete-name {
            font-size: 16px;
            font-weight: 600;
            color: #1f2937;
            margin: 0 0 4px 0;
          }
          .apikey-card-delete-empresa {
            font-size: 14px;
            color: #6b7280;
            margin: 0;
          }
          .warning-box-delete {
            background: #fef2f2;
            border: 2px solid #fecaca;
            border-radius: 10px;
            padding: 14px;
            margin-top: 20px;
          }
          .warning-box-delete-content {
            display: flex;
            align-items: center;
            gap: 10px;
            color: #dc2626;
            font-size: 13px;
            font-weight: 600;
          }
          .warning-delete-icon {
            font-size: 20px;
          }
        </style>
        <div class="eliminar-apikey-modal">
          <div class="eliminar-apikey-icon">
            <i class="fas fa-trash-alt"></i>
          </div>
          <h3 class="eliminar-apikey-title">¿Eliminar API Key?</h3>
          <p class="eliminar-apikey-message">¿Estás seguro que deseas eliminar permanentemente esta API key?</p>
          <div class="apikey-card-delete">
            <p class="apikey-card-delete-name">${apiKey.nombre}</p>
            <p class="apikey-card-delete-empresa">${this.getNombreEmpresa(apiKey.empresa_id)}</p>
          </div>
          <div class="warning-box-delete">
            <div class="warning-box-delete-content">
              <span class="warning-delete-icon">⚠️</span>
              <span>Esta acción es permanente y no se puede deshacer</span>
            </div>
          </div>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: '<i class="fas fa-trash-alt"></i> Sí, eliminar',
      cancelButtonText: '<i class="fas fa-times"></i> Cancelar',
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#6b7280',
      width: '500px'
    }).then((result) => {
      if (result.isConfirmed) {
        this.adminApiKeysService.eliminarApiKey(apiKey.id).subscribe({
          next: (response) => {
            Swal.fire('Eliminada', response.message, 'success');
            this.cargarApiKeys();
          },
          error: (error) => {
            console.error('Error al eliminar API key:', error);
            Swal.fire('Error', error.error?.message || 'No se pudo eliminar la API key', 'error');
          }
        });
      }
    });
  }

  estaExpirada(apiKey: ApiKey): boolean {
    if (!apiKey.fecha_expiracion) return false;
    return new Date(apiKey.fecha_expiracion) < new Date();
  }

  getNombreEmpresa(empresaId: number): string {
    const empresa = this.empresas.find(e => e.id === empresaId);
    return empresa?.nombre || `ID: ${empresaId}`;
  }

  formatearFecha(fecha?: string): string {
    if (!fecha) return 'Nunca';
    return new Date(fecha).toLocaleString('es-CO', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  getDiasRestantes(fecha?: string): number | null {
    if (!fecha) return null;
    const ahora = new Date();
    const expiracion = new Date(fecha);
    const diff = expiracion.getTime() - ahora.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  }

  getEstadoClass(apiKey: ApiKey): string {
    if (!apiKey.activo) return 'badge bg-secondary';
    if (this.estaExpirada(apiKey)) return 'badge bg-danger';
    const dias = this.getDiasRestantes(apiKey.fecha_expiracion);
    if (dias !== null && dias <= 30) return 'badge bg-warning';
    return 'badge bg-success';
  }

  getEstadoTexto(apiKey: ApiKey): string {
    if (!apiKey.activo) return 'Inactiva';
    if (this.estaExpirada(apiKey)) return 'Expirada';
    const dias = this.getDiasRestantes(apiKey.fecha_expiracion);
    if (dias !== null) {
      if (dias <= 0) return 'Expirada';
      if (dias <= 30) return `Expira en ${dias}d`;
    }
    return 'Activa';
  }

  getCodigoLabel(codigo: string): string {
    const labels: { [key: string]: string } = {
      'licencias': 'Licencias',
      'soporte': 'Soporte',
      'facturacion': 'Facturación',
      'general': 'General'
    };
    return labels[codigo] || codigo;
  }

  getCodigoClass(codigo: string): string {
    const classes: { [key: string]: string } = {
      'licencias': 'badge bg-primary',
      'soporte': 'badge bg-info',
      'facturacion': 'badge bg-warning',
      'general': 'badge bg-secondary'
    };
    return classes[codigo] || 'badge bg-secondary';
  }
}

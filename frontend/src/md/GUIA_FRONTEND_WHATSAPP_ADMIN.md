# Guía de Implementación Frontend: WhatsApp + Panel Admin

## Parte 1: Integración de WhatsApp en Landing Page

### 1.1 Actualizar el componente de planes

**Archivo**: `frontend/src/app/pages/landing/landing.component.ts`

#### Agregar método para generar enlace de WhatsApp:

```typescript
export class LandingComponent {
  // Número de WhatsApp de la empresa (agregar a .env también)
  private readonly whatsappNumber = '573001234567'; // Cambiar por número real
  
  /**
   * Genera un enlace de WhatsApp con mensaje pre-llenado
   * @param plan Plan seleccionado
   * @param periodo 'mensual' o 'anual'
   */
  generarEnlaceWhatsApp(plan: any, periodo: 'mensual' | 'anual'): string {
    const precio = periodo === 'mensual' 
      ? plan.precio_mensual 
      : plan.precio_anual;
    
    const precioFormateado = new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(precio);
    
    const mensaje = `Hola, estoy interesado en el plan *${plan.nombre}* que cuesta ${precioFormateado} ${periodo}. Me gustaría recibir más información sobre la suscripción.`;
    
    // Codificar el mensaje para URL
    const mensajeCodificado = encodeURIComponent(mensaje);
    
    return `https://wa.me/${this.whatsappNumber}?text=${mensajeCodificado}`;
  }
  
  /**
   * Abre WhatsApp en una nueva ventana
   */
  contactarWhatsApp(plan: any, periodo: 'mensual' | 'anual'): void {
    const enlace = this.generarEnlaceWhatsApp(plan, periodo);
    window.open(enlace, '_blank');
  }
}
```

### 1.2 Actualizar el template HTML

**Archivo**: `frontend/src/app/pages/landing/landing.component.html`

Reemplazar los botones de "Suscribirse" por botones de WhatsApp:

```html
<!-- ANTES: -->
<button class="btn-suscribir" (click)="suscribirse(plan)">
  Suscribirse Ahora
</button>

<!-- DESPUÉS: -->
<div class="botones-plan">
  <button class="btn-whatsapp btn-whatsapp-mensual" 
          (click)="contactarWhatsApp(plan, 'mensual')">
    <i class="fab fa-whatsapp"></i>
    Plan Mensual ({{ plan.precio_mensual | currency:'COP':'symbol-narrow':'1.0-0' }})
  </button>
  
  <button class="btn-whatsapp btn-whatsapp-anual" 
          (click)="contactarWhatsApp(plan, 'anual')">
    <i class="fab fa-whatsapp"></i>
    Plan Anual ({{ plan.precio_anual | currency:'COP':'symbol-narrow':'1.0-0' }})
  </button>
</div>

<p class="texto-contacto">
  <i class="fas fa-info-circle"></i>
  Un asesor te contactará para completar tu suscripción
</p>
```

### 1.3 Agregar estilos para los botones de WhatsApp

**Archivo**: `frontend/src/app/pages/landing/landing.component.css`

```css
/* Contenedor de botones */
.botones-plan {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 15px;
}

/* Botón base de WhatsApp */
.btn-whatsapp {
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

.btn-whatsapp i {
  font-size: 20px;
}

/* Botón mensual (verde claro) */
.btn-whatsapp-mensual {
  background: linear-gradient(135deg, #25D366 0%, #128C7E 100%);
}

.btn-whatsapp-mensual:hover {
  background: linear-gradient(135deg, #20BA5A 0%, #0E7A6D 100%);
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(37, 211, 102, 0.4);
}

/* Botón anual (verde oscuro) */
.btn-whatsapp-anual {
  background: linear-gradient(135deg, #128C7E 0%, #075E54 100%);
}

.btn-whatsapp-anual:hover {
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
}

.texto-contacto i {
  color: #128C7E;
  margin-right: 5px;
}

/* Responsive */
@media (max-width: 768px) {
  .botones-plan {
    width: 100%;
  }
  
  .btn-whatsapp {
    width: 100%;
    font-size: 14px;
    padding: 10px 20px;
  }
}
```

### 1.4 Agregar Font Awesome (si no está)

**Archivo**: `frontend/src/index.html`

```html
<head>
  <!-- ... otros links ... -->
  
  <!-- Font Awesome para iconos -->
  <link rel="stylesheet" 
        href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
</head>
```

---

## Parte 2: Panel de Administración

### 2.1 Crear Guard de Administrador

**Archivo**: `frontend/src/app/guards/admin.guard.ts`

```typescript
import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthSessionService } from '../services/auth-session.service';

export const adminGuard: CanActivateFn = (route, state) => {
  const authSession = inject(AuthSessionService);
  const router = inject(Router);
  
  const user = authSession.getCurrentUser();
  
  if (!user) {
    router.navigate(['/login']);
    return false;
  }
  
  if (user.rol !== 'admin') {
    // Usuario no es admin
    router.navigate(['/']);
    return false;
  }
  
  return true;
};
```

### 2.2 Crear Servicio para Empresas

**Archivo**: `frontend/src/app/services/admin-empresas.service.ts`

```typescript
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Empresa {
  id: number;
  nombre: string;
  nit: string;
  contacto: string;
  estado: boolean;
  plan?: string;
  suscripcion_activa?: any;
}

export interface CrearEmpresaDto {
  nombre: string;
  nit: string;
  contacto?: string;
  plan_id?: number;
  periodo?: 'mensual' | 'anual';
  notas?: string;
}

export interface ActualizarEmpresaDto {
  nombre?: string;
  nit?: string;
  contacto?: string;
  estado?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class AdminEmpresasService {
  private apiUrl = `${environment.apiUrl}/admin/empresas`;

  constructor(private http: HttpClient) {}

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    });
  }

  listarEmpresas(): Observable<Empresa[]> {
    return this.http.get<Empresa[]>(this.apiUrl, { 
      headers: this.getHeaders() 
    });
  }

  obtenerEmpresa(id: number): Observable<Empresa> {
    return this.http.get<Empresa>(`${this.apiUrl}/${id}`, { 
      headers: this.getHeaders() 
    });
  }

  crearEmpresa(data: CrearEmpresaDto): Observable<any> {
    return this.http.post(this.apiUrl, data, { 
      headers: this.getHeaders() 
    });
  }

  actualizarEmpresa(id: number, data: ActualizarEmpresaDto): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}`, data, { 
      headers: this.getHeaders() 
    });
  }

  eliminarEmpresa(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`, { 
      headers: this.getHeaders() 
    });
  }
}
```

### 2.3 Crear Servicio para Suscripciones

**Archivo**: `frontend/src/app/services/admin-suscripciones.service.ts`

```typescript
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Suscripcion {
  id: number;
  empresa_id: number;
  plan_id: number;
  plan?: any;
  empresa?: any;
  fecha_inicio: string;
  fecha_fin: string;
  estado: 'activa' | 'inactiva' | 'suspendida' | 'cancelada';
  periodo: 'mensual' | 'anual';
  precio_pagado: number;
  forma_pago?: string;
  creado_en: string;
  actualizado_en?: string;
  creado_por: number;
  motivo_cancelacion?: string;
  notas?: string;
}

export interface CrearSuscripcionDto {
  empresa_id: number;
  plan_id: number;
  periodo: 'mensual' | 'anual';
  fecha_inicio?: string;
  forma_pago?: string;
  notas?: string;
}

export interface RenovarDto {
  periodo?: 'mensual' | 'anual';
  fecha_inicio?: string;
  notas?: string;
}

export interface CancelarDto {
  motivo: string;
  notas?: string;
}

export interface Estadisticas {
  total: number;
  activas: number;
  suspendidas: number;
  canceladas: number;
  inactivas: number;
  por_plan: { plan: string; cantidad: number }[];
}

@Injectable({
  providedIn: 'root'
})
export class AdminSuscripcionesService {
  private apiUrl = `${environment.apiUrl}/admin/suscripciones`;

  constructor(private http: HttpClient) {}

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    });
  }

  listarSuscripciones(filtros?: { estado?: string; empresa_id?: number }): Observable<Suscripcion[]> {
    let params = new HttpParams();
    if (filtros?.estado) {
      params = params.set('estado', filtros.estado);
    }
    if (filtros?.empresa_id) {
      params = params.set('empresa_id', filtros.empresa_id.toString());
    }
    
    return this.http.get<Suscripcion[]>(this.apiUrl, { 
      headers: this.getHeaders(),
      params 
    });
  }

  crearSuscripcion(data: CrearSuscripcionDto): Observable<any> {
    return this.http.post(this.apiUrl, data, { 
      headers: this.getHeaders() 
    });
  }

  renovarSuscripcion(id: number, data?: RenovarDto): Observable<any> {
    return this.http.post(`${this.apiUrl}/${id}/renovar`, data || {}, { 
      headers: this.getHeaders() 
    });
  }

  cancelarSuscripcion(id: number, data: CancelarDto): Observable<any> {
    return this.http.post(`${this.apiUrl}/${id}/cancelar`, data, { 
      headers: this.getHeaders() 
    });
  }

  suspenderSuscripcion(id: number, motivo: string, notas?: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/${id}/suspender`, { motivo, notas }, { 
      headers: this.getHeaders() 
    });
  }

  reactivarSuscripcion(id: number, notas?: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/${id}/reactivar`, { notas }, { 
      headers: this.getHeaders() 
    });
  }

  obtenerEstadisticas(): Observable<Estadisticas> {
    return this.http.get<Estadisticas>(`${this.apiUrl}/estadisticas`, { 
      headers: this.getHeaders() 
    });
  }
}
```

### 2.4 Crear Componente de Gestión de Empresas

**Archivo**: `frontend/src/app/pages/admin/admin-empresas/admin-empresas.component.ts`

```typescript
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminEmpresasService, Empresa, CrearEmpresaDto } from '../../../services/admin-empresas.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-admin-empresas',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-empresas.component.html',
  styleUrl: './admin-empresas.component.css'
})
export class AdminEmpresasComponent implements OnInit {
  empresas: Empresa[] = [];
  cargando = false;
  
  // Formulario de nueva empresa
  mostrarFormulario = false;
  nuevaEmpresa: CrearEmpresaDto = {
    nombre: '',
    nit: '',
    contacto: ''
  };

  constructor(private adminEmpresasService: AdminEmpresasService) {}

  ngOnInit(): void {
    this.cargarEmpresas();
  }

  cargarEmpresas(): void {
    this.cargando = true;
    this.adminEmpresasService.listarEmpresas().subscribe({
      next: (empresas) => {
        this.empresas = empresas;
        this.cargando = false;
      },
      error: (error) => {
        console.error('Error al cargar empresas:', error);
        Swal.fire('Error', 'No se pudieron cargar las empresas', 'error');
        this.cargando = false;
      }
    });
  }

  toggleFormulario(): void {
    this.mostrarFormulario = !this.mostrarFormulario;
    if (!this.mostrarFormulario) {
      this.limpiarFormulario();
    }
  }

  limpiarFormulario(): void {
    this.nuevaEmpresa = {
      nombre: '',
      nit: '',
      contacto: ''
    };
  }

  crearEmpresa(): void {
    if (!this.nuevaEmpresa.nombre || !this.nuevaEmpresa.nit) {
      Swal.fire('Error', 'Nombre y NIT son obligatorios', 'error');
      return;
    }

    this.adminEmpresasService.crearEmpresa(this.nuevaEmpresa).subscribe({
      next: (response) => {
        Swal.fire('Éxito', response.message, 'success');
        this.cargarEmpresas();
        this.toggleFormulario();
      },
      error: (error) => {
        console.error('Error al crear empresa:', error);
        Swal.fire('Error', error.error.message || 'No se pudo crear la empresa', 'error');
      }
    });
  }

  editarEmpresa(empresa: Empresa): void {
    Swal.fire({
      title: 'Editar Empresa',
      html: `
        <input id="nombre" class="swal2-input" placeholder="Nombre" value="${empresa.nombre}">
        <input id="nit" class="swal2-input" placeholder="NIT" value="${empresa.nit}">
        <input id="contacto" class="swal2-input" placeholder="Contacto" value="${empresa.contacto || ''}">
      `,
      showCancelButton: true,
      confirmButtonText: 'Guardar',
      cancelButtonText: 'Cancelar',
      preConfirm: () => {
        return {
          nombre: (document.getElementById('nombre') as HTMLInputElement).value,
          nit: (document.getElementById('nit') as HTMLInputElement).value,
          contacto: (document.getElementById('contacto') as HTMLInputElement).value
        };
      }
    }).then((result) => {
      if (result.isConfirmed && result.value) {
        this.adminEmpresasService.actualizarEmpresa(empresa.id, result.value).subscribe({
          next: (response) => {
            Swal.fire('Éxito', response.message, 'success');
            this.cargarEmpresas();
          },
          error: (error) => {
            console.error('Error al actualizar empresa:', error);
            Swal.fire('Error', error.error.message || 'No se pudo actualizar la empresa', 'error');
          }
        });
      }
    });
  }

  eliminarEmpresa(empresa: Empresa): void {
    Swal.fire({
      title: '¿Desactivar empresa?',
      text: `¿Estás seguro de desactivar "${empresa.nombre}"? Esta acción cancelará todas sus suscripciones activas.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Sí, desactivar',
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        this.adminEmpresasService.eliminarEmpresa(empresa.id).subscribe({
          next: (response) => {
            Swal.fire('Desactivada', response.message, 'success');
            this.cargarEmpresas();
          },
          error: (error) => {
            console.error('Error al eliminar empresa:', error);
            Swal.fire('Error', error.error.message || 'No se pudo desactivar la empresa', 'error');
          }
        });
      }
    });
  }

  verDetalle(empresa: Empresa): void {
    this.adminEmpresasService.obtenerEmpresa(empresa.id).subscribe({
      next: (empresaDetalle) => {
        let html = `
          <div style="text-align: left;">
            <p><strong>NIT:</strong> ${empresaDetalle.nit}</p>
            <p><strong>Contacto:</strong> ${empresaDetalle.contacto || 'N/A'}</p>
            <p><strong>Estado:</strong> ${empresaDetalle.estado ? 'Activa' : 'Inactiva'}</p>
            <h4>Suscripciones:</h4>
        `;
        
        if (empresaDetalle.suscripcion_activa) {
          html += `<p>✅ Suscripción activa: ${empresaDetalle.suscripcion_activa.plan?.nombre || 'N/A'}</p>`;
        } else {
          html += `<p>❌ Sin suscripción activa</p>`;
        }
        
        html += `</div>`;
        
        Swal.fire({
          title: empresaDetalle.nombre,
          html: html,
          width: 600
        });
      },
      error: (error) => {
        console.error('Error al obtener detalle:', error);
        Swal.fire('Error', 'No se pudo cargar el detalle de la empresa', 'error');
      }
    });
  }
}
```

**Archivo**: `frontend/src/app/pages/admin/admin-empresas/admin-empresas.component.html`

```html
<div class="admin-container">
  <div class="header">
    <h1>Gestión de Empresas</h1>
    <button class="btn-primary" (click)="toggleFormulario()">
      <i class="fas fa-plus"></i>
      {{ mostrarFormulario ? 'Cancelar' : 'Nueva Empresa' }}
    </button>
  </div>

  <!-- Formulario de nueva empresa -->
  <div class="formulario-container" *ngIf="mostrarFormulario">
    <h3>Nueva Empresa</h3>
    <form (ngSubmit)="crearEmpresa()">
      <div class="form-group">
        <label for="nombre">Nombre *</label>
        <input 
          type="text" 
          id="nombre" 
          [(ngModel)]="nuevaEmpresa.nombre" 
          name="nombre" 
          required
          placeholder="Nombre de la empresa">
      </div>

      <div class="form-group">
        <label for="nit">NIT *</label>
        <input 
          type="text" 
          id="nit" 
          [(ngModel)]="nuevaEmpresa.nit" 
          name="nit" 
          required
          placeholder="123456789-0">
      </div>

      <div class="form-group">
        <label for="contacto">Contacto</label>
        <input 
          type="text" 
          id="contacto" 
          [(ngModel)]="nuevaEmpresa.contacto" 
          name="contacto"
          placeholder="email@empresa.com">
      </div>

      <div class="form-actions">
        <button type="submit" class="btn-success">Crear Empresa</button>
        <button type="button" class="btn-secondary" (click)="toggleFormulario()">Cancelar</button>
      </div>
    </form>
  </div>

  <!-- Tabla de empresas -->
  <div class="tabla-container">
    <div *ngIf="cargando" class="loading">Cargando empresas...</div>

    <table *ngIf="!cargando && empresas.length > 0" class="tabla-empresas">
      <thead>
        <tr>
          <th>ID</th>
          <th>Nombre</th>
          <th>NIT</th>
          <th>Contacto</th>
          <th>Estado</th>
          <th>Suscripción</th>
          <th>Acciones</th>
        </tr>
      </thead>
      <tbody>
        <tr *ngFor="let empresa of empresas">
          <td>{{ empresa.id }}</td>
          <td>{{ empresa.nombre }}</td>
          <td>{{ empresa.nit }}</td>
          <td>{{ empresa.contacto || 'N/A' }}</td>
          <td>
            <span class="badge" [class.badge-success]="empresa.estado" [class.badge-danger]="!empresa.estado">
              {{ empresa.estado ? 'Activa' : 'Inactiva' }}
            </span>
          </td>
          <td>
            <span *ngIf="empresa.suscripcion_activa" class="badge badge-info">
              {{ empresa.suscripcion_activa.plan?.nombre || 'Activa' }}
            </span>
            <span *ngIf="!empresa.suscripcion_activa" class="badge badge-secondary">
              Sin suscripción
            </span>
          </td>
          <td class="acciones">
            <button class="btn-icon" (click)="verDetalle(empresa)" title="Ver detalle">
              <i class="fas fa-eye"></i>
            </button>
            <button class="btn-icon" (click)="editarEmpresa(empresa)" title="Editar">
              <i class="fas fa-edit"></i>
            </button>
            <button class="btn-icon btn-danger" (click)="eliminarEmpresa(empresa)" title="Desactivar">
              <i class="fas fa-trash"></i>
            </button>
          </td>
        </tr>
      </tbody>
    </table>

    <div *ngIf="!cargando && empresas.length === 0" class="sin-datos">
      No hay empresas registradas
    </div>
  </div>
</div>
```

**Archivo**: `frontend/src/app/pages/admin/admin-empresas/admin-empresas.component.css`

```css
.admin-container {
  padding: 20px;
  max-width: 1400px;
  margin: 0 auto;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30px;
}

.header h1 {
  font-size: 28px;
  color: #333;
  margin: 0;
}

/* Botones */
.btn-primary, .btn-success, .btn-secondary, .btn-icon {
  padding: 10px 20px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 600;
  transition: all 0.3s ease;
}

.btn-primary {
  background: #007bff;
  color: white;
}

.btn-primary:hover {
  background: #0056b3;
}

.btn-success {
  background: #28a745;
  color: white;
}

.btn-success:hover {
  background: #1e7e34;
}

.btn-secondary {
  background: #6c757d;
  color: white;
}

.btn-secondary:hover {
  background: #545b62;
}

.btn-icon {
  padding: 6px 12px;
  background: #f8f9fa;
  color: #333;
  margin-right: 5px;
}

.btn-icon:hover {
  background: #e2e6ea;
}

.btn-icon.btn-danger {
  color: #dc3545;
}

.btn-icon.btn-danger:hover {
  background: #f8d7da;
}

/* Formulario */
.formulario-container {
  background: white;
  padding: 25px;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  margin-bottom: 30px;
}

.formulario-container h3 {
  margin-top: 0;
  color: #333;
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  margin-bottom: 5px;
  font-weight: 600;
  color: #555;
}

.form-group input {
  width: 100%;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
}

.form-group input:focus {
  outline: none;
  border-color: #007bff;
}

.form-actions {
  display: flex;
  gap: 10px;
  margin-top: 20px;
}

/* Tabla */
.tabla-container {
  background: white;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.tabla-empresas {
  width: 100%;
  border-collapse: collapse;
}

.tabla-empresas thead {
  background: #f8f9fa;
}

.tabla-empresas th {
  padding: 12px;
  text-align: left;
  font-weight: 600;
  color: #333;
  border-bottom: 2px solid #dee2e6;
}

.tabla-empresas td {
  padding: 12px;
  border-bottom: 1px solid #dee2e6;
}

.tabla-empresas tbody tr:hover {
  background: #f8f9fa;
}

.acciones {
  white-space: nowrap;
}

/* Badges */
.badge {
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 600;
}

.badge-success {
  background: #d4edda;
  color: #155724;
}

.badge-danger {
  background: #f8d7da;
  color: #721c24;
}

.badge-info {
  background: #d1ecf1;
  color: #0c5460;
}

.badge-secondary {
  background: #e2e3e5;
  color: #383d41;
}

/* Estados */
.loading, .sin-datos {
  text-align: center;
  padding: 40px;
  color: #666;
}
```

### 2.5 Actualizar las rutas

**Archivo**: `frontend/src/app/app.routes.ts`

```typescript
import { Routes } from '@angular/router';
import { adminGuard } from './guards/admin.guard';
import { AdminEmpresasComponent } from './pages/admin/admin-empresas/admin-empresas.component';
// Importar otros componentes admin cuando se creen

export const routes: Routes = [
  // ... rutas existentes ...
  
  // Rutas de administración
  {
    path: 'admin',
    canActivate: [adminGuard],
    children: [
      {
        path: '',
        redirectTo: 'empresas',
        pathMatch: 'full'
      },
      {
        path: 'empresas',
        component: AdminEmpresasComponent
      }
      // Agregar más rutas admin aquí:
      // { path: 'suscripciones', component: AdminSuscripcionesComponent },
      // { path: 'dashboard', component: AdminDashboardComponent }
    ]
  }
];
```

### 2.6 Agregar enlace al panel de admin en el menú

**Archivo**: `frontend/src/app/app.component.ts` y `.html`

En el menú de usuario, agregar opción "Panel Admin" solo si el usuario es admin:

```html
<!-- En el dropdown del usuario -->
<div class="user-menu-dropdown" *ngIf="mostrarMenu">
  <div class="user-info">
    <!-- ... info del usuario ... -->
  </div>
  <div class="user-menu-options">
    <a routerLink="/account" class="menu-option" (click)="toggleUserMenu()">
      <i class="fas fa-user-circle"></i>
      Administrar cuenta
    </a>
    
    <!-- Mostrar solo si es admin -->
    <a *ngIf="currentUser?.rol === 'admin'" 
       routerLink="/admin/empresas" 
       class="menu-option" 
       (click)="toggleUserMenu()">
      <i class="fas fa-shield-alt"></i>
      Panel Admin
    </a>
    
    <button class="menu-option logout-option" (click)="logout()">
      <i class="fas fa-sign-out-alt"></i>
      Cerrar sesión
    </button>
  </div>
</div>
```

---

## Configuración Final

### Agregar número de WhatsApp al environment

**Archivo**: `frontend/src/environments/environment.ts`

```typescript
export const environment = {
  production: false,
  apiUrl: 'http://localhost:5000',
  whatsappNumber: '573001234567' // Número real de la empresa
};
```

**Archivo**: `frontend/src/environments/environment.prod.ts`

```typescript
export const environment = {
  production: true,
  apiUrl: 'https://api.tudominio.com',
  whatsappNumber: '573001234567' // Número real de la empresa
};
```

Luego actualizar el componente de landing para usar esta variable:

```typescript
import { environment } from '../../../environments/environment';

export class LandingComponent {
  private readonly whatsappNumber = environment.whatsappNumber;
  // ...
}
```

---

## Checklist de Implementación

### Frontend - WhatsApp:
- [ ] Agregar método `generarEnlaceWhatsApp()` en landing.component.ts
- [ ] Actualizar template HTML con botones de WhatsApp
- [ ] Agregar estilos CSS para botones
- [ ] Incluir Font Awesome en index.html (si no está)
- [ ] Configurar número de WhatsApp en environment
- [ ] Probar en móvil y desktop

### Frontend - Panel Admin:
- [ ] Crear guard `admin.guard.ts`
- [ ] Crear servicio `admin-empresas.service.ts`
- [ ] Crear servicio `admin-suscripciones.service.ts`
- [ ] Crear componente `admin-empresas`
- [ ] Crear componente `admin-suscripciones` (similar a empresas)
- [ ] Actualizar rutas en `app.routes.ts`
- [ ] Agregar enlace "Panel Admin" en menú de usuario
- [ ] Probar con usuario admin y no-admin

---

Esto completa la guía de implementación del frontend. Sigue estos pasos en orden para una implementación exitosa.

import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { toDataURL } from 'qrcode';
import Swal from 'sweetalert2';
import {
  ApiService,
  UsuarioPerfil,
  SuscripcionDetalle,
  TransferEmpresaPayload,
  TransferEmpresaResponse
} from '../../services/api.service';
import { AuthSessionService } from '../../services/auth-session.service';
import { Subject, Subscription, of } from 'rxjs';
import { catchError, debounceTime, distinctUntilChanged, switchMap, tap } from 'rxjs/operators';

interface OtpSetupState {
  secret: string;
  provisioning_uri: string;
  qr?: string | null;
  backup_codes?: string[];
}

type SectionKey = 'personal' | 'seguridad' | 'suscripciones' | 'futuro';

@Component({
  selector: 'app-account',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <section class="account-page" *ngIf="!initializing; else loadingTemplate">
      <header class="page-header">
        <div>
          <h1>Tu centro de cuenta</h1>
          <p>Hola {{ usuario?.nombre || usuario?.email }}. Elige una opción para gestionar tu información.</p>
        </div>
        <div class="status-chip" [class.active]="usuario?.otp_enabled">
          2FA {{ usuario?.otp_enabled ? 'activado' : 'desactivado' }}
        </div>
      </header>

      <div class="cards-grid">
        <button type="button" class="menu-card" (click)="openSection('personal')">
          <span class="card-icon personal">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 12c2.761 0 5-2.462 5-5.5S14.761 1 12 1 7 3.462 7 6.5 9.239 12 12 12zm0 2c-3.315 0-10 1.662-10 5v2h20v-2c0-3.338-6.685-5-10-5z" />
            </svg>
          </span>
          <div>
            <h2>Información personal</h2>
            <p>Actualiza tus datos de contacto y dirección cuando lo necesites.</p>
          </div>
        </button>

        <button type="button" class="menu-card" (click)="openSection('seguridad')">
          <span class="card-icon seguridad">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 1 3 5v6c0 5.25 3.438 10.118 9 11 5.563-.882 9-5.75 9-11V5l-9-4zM8 11.5a4 4 0 118 0V14h1a1 1 0 011 1v6H6v-6a1 1 0 011-1h1v-2.5zM10 14h4v-2.5a2 2 0 10-4 0V14z" />
            </svg>
          </span>
          <div>
            <h2>Seguridad</h2>
            <p>Configura la autenticación en dos pasos y mantén tu contraseña protegida.</p>
          </div>
        </button>

        <button type="button" class="menu-card" (click)="openSection('suscripciones')">
          <span class="card-icon suscripciones">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
              <path d="M3 4h18v4H3V4zm0 6h18v10H3V10zm4 2v6h2v-6H7zm4 0v6h2v-6h-2zm4 0v6h2v-6h-2z" />
            </svg>
          </span>
          <div>
            <h2>Administrar suscripción</h2>
            <p>Revisa los servicios activos y gestiona el estado de tu empresa.</p>
          </div>
        </button>

        <button type="button" class="menu-card" (click)="openSection('futuro')">
          <span class="card-icon futuro">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2l1.902 5.854L20 9l-4.5 3.273L16.854 18 12 14.772 7.146 18 8.5 12.273 4 9l6.098-1.146z" />
            </svg>
          </span>
          <div>
            <h2>Próximamente</h2>
            <p>Reserva este espacio para futuras funcionalidades de Tratios.</p>
          </div>
        </button>
      </div>

      <section class="section-panel" *ngIf="activeSection as section">
        <header class="panel-header">
          <button type="button" class="back-btn" (click)="closeSection()">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            <span>Menú principal</span>
          </button>
          <div>
            <h2>{{ sectionMeta[section].title }}</h2>
            <p>{{ sectionMeta[section].description }}</p>
          </div>
        </header>

        <div class="panel-body" [ngSwitch]="section">
          <ng-container *ngSwitchCase="'personal'">
            <div *ngIf="profileSectionLoading" class="inline-loading">
              <span class="spinner"></span>
              <p>Cargando información personal…</p>
            </div>
            <article class="form-card" *ngIf="!profileSectionLoading">
              <header>
                <div>
                  <h2>Información personal</h2>
                  <p>Actualiza tu información de contacto y dirección.</p>
                </div>
              </header>

              <form [formGroup]="profileForm" (ngSubmit)="guardarPerfil()" novalidate>
                <div class="form-grid">
                  <label>
                    <span>Nombre completo</span>
                    <input type="text" formControlName="nombre" placeholder="Tu nombre completo" />
                  </label>
                  <label>
                    <span>Teléfono celular</span>
                    <input type="text" formControlName="telefono" placeholder="Ej. +57 300 000 0000" />
                  </label>
                  <label class="country-field">
                    <span>País</span>
                    <div class="input-with-icon">
                      <input
                        type="text"
                        formControlName="pais"
                        placeholder="Escribe para buscar un país"
                        autocomplete="off"
                        (input)="onCountrySearchInputEvent($event)"
                        (focus)="onCountryInputFocus()"
                        (focus)="onCountryInputFocus()"
                      />
                      <button
                        type="button"
                        class="clear-icon-btn"
                        *ngIf="profileForm.value.pais && !countriesLoading"
                        (click)="clearCountrySelection()"
                        aria-label="Limpiar país"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
                          <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
                        </svg>
                      </button>
                      <span class="loading-spinner" *ngIf="countriesLoading"></span>
                    </div>
                    <ul class="suggestions-list" *ngIf="countries.length && countrySearchTerm">
                      <li
                        *ngFor="let country of countries; trackBy: trackCountry"
                        (click)="onCountrySuggestionSelected(country)"
                      >
                        <strong>{{ country.name }}</strong>
                        <span class="country-code">{{ country.code }}</span>
                      </li>
                    </ul>
                  </label>
                  <label class="city-field">
                    <span>Ciudad</span>
                    <ng-container *ngIf="selectedCountryCode && cities.length; else manualCityInput">
                      <select formControlName="ciudad" [attr.disabled]="citiesLoading ? '' : null">
                        <option value="">Selecciona una ciudad</option>
                        <option *ngFor="let city of cities" [value]="city.name">{{ city.name }}</option>
                      </select>
                    </ng-container>
                    <ng-template #manualCityInput>
                      <input type="text" formControlName="ciudad" placeholder="Ciudad de residencia" />
                    </ng-template>
                    <small class="helper-text" *ngIf="citiesLoading">Cargando ciudades…</small>
                    <small class="field-error" *ngIf="!citiesLoading && locationError && selectedCountryCode && !cities.length">{{ locationError }}</small>
                  </label>
                  <label class="full-row">
                    <span>Dirección</span>
                    <input type="text" formControlName="direccion" placeholder="Dirección principal" />
                  </label>
                  <label>
                    <span>Fecha de nacimiento</span>
                    <input type="date" formControlName="fecha_nacimiento" />
                  </label>
                </div>

                <div class="actions">
                  <button type="submit" class="primary-btn" [disabled]="profileForm.invalid || savingProfile">
                    {{ savingProfile ? 'Guardando…' : 'Guardar cambios' }}
                  </button>
                </div>
              </form>
            </article>
          </ng-container>

          <ng-container *ngSwitchCase="'seguridad'">
            <div *ngIf="profileSectionLoading" class="inline-loading">
              <span class="spinner"></span>
              <p>Cargando configuración de seguridad…</p>
            </div>
            <div class="security-columns" *ngIf="!profileSectionLoading">
              <article class="form-card security-card">
                <header>
                  <div>
                    <h2>Autenticación en dos pasos</h2>
                    <p>Protege tu cuenta con códigos temporales desde una app autenticadora.</p>
                  </div>
                </header>

                <div class="two-factor" *ngIf="!otpSetup; else otpSetupTemplate">
                  <p class="status" [class.active]="usuario?.otp_enabled">
                    {{ usuario?.otp_enabled ? 'La autenticación en dos pasos está activa. Usa tu app autenticadora o códigos de respaldo para ingresar.' : 'Aún no tienes activada la autenticación en dos pasos.' }}
                  </p>

                  <div class="button-row">
                    <button type="button" class="primary-btn" (click)="iniciarOtp()" [disabled]="usuario?.otp_enabled || otpLoading">
                      {{ otpLoading ? 'Generando…' : 'Activar 2FA' }}
                    </button>
                    <button
                      type="button"
                      class="outline-btn"
                      *ngIf="usuario?.otp_enabled"
                      (click)="mostrarDesactivar = !mostrarDesactivar"
                    >
                      {{ mostrarDesactivar ? 'Cancelar' : 'Desactivar 2FA' }}
                    </button>
                  </div>

                  <form class="disable-form" *ngIf="mostrarDesactivar" [formGroup]="disableOtpForm" (ngSubmit)="desactivarOtp()">
                    <label>
                      <span>Contraseña</span>
                      <input type="password" formControlName="password" placeholder="Ingresa tu contraseña" />
                    </label>
                    <button type="submit" class="danger-btn" [disabled]="disableOtpForm.invalid || otpLoading">
                      {{ otpLoading ? 'Procesando…' : 'Confirmar desactivación' }}
                    </button>
                  </form>
                </div>

                <ng-template #otpSetupTemplate>
                  <div class="otp-setup">
                    <h3>Configura tu app autenticadora</h3>
                    <p>Escanea el código QR o ingresa el código manual en tu app para generar códigos temporales.</p>

                    <div class="otp-grid">
                      <div class="qr" *ngIf="otpSetup?.qr; else manualCode">
                        <img [src]="otpSetup?.qr" alt="Código QR OTP" />
                      </div>
                      <ng-template #manualCode>
                        <div class="manual">
                          <p>No se pudo generar el QR automáticamente. Utiliza el código manual.</p>
                        </div>
                      </ng-template>

                      <div class="details">
                        <div class="manual-code" *ngIf="otpSetup?.secret">
                          <span>Código manual</span>
                          <strong>{{ otpSetup?.secret }}</strong>
                        </div>
                        <form [formGroup]="otpForm" (ngSubmit)="confirmarOtp()" class="otp-form">
                          <label>
                            <span>Introduce el primer código de 6 dígitos</span>
                            <input type="text" formControlName="otpCode" maxlength="6" inputmode="numeric" placeholder="000000" />
                          </label>
                          <div class="button-row">
                            <button type="button" class="outline-btn" (click)="cancelarOtpSetup()" [disabled]="otpLoading">Cancelar</button>
                            <button type="submit" class="primary-btn" [disabled]="otpForm.invalid || otpLoading">
                              {{ otpLoading ? 'Verificando…' : 'Confirmar y activar' }}
                            </button>
                          </div>
                        </form>
                      </div>
                    </div>

                    <div *ngIf="otpSetup?.backup_codes?.length" class="backup-codes">
                      <h4>Códigos de respaldo</h4>
                      <p>Guárdalos en un lugar seguro. Cada código se usa una sola vez.</p>
                      <ul>
                        <li *ngFor="let code of otpSetup?.backup_codes">{{ code }}</li>
                      </ul>
                    </div>
                  </div>
                </ng-template>
              </article>

              <article class="form-card" id="security">
                <header>
                  <div>
                    <h2>Contraseña</h2>
                    <p>Actualiza tu clave de acceso periódicamente para mantener tu cuenta segura.</p>
                  </div>
                </header>

                <form [formGroup]="passwordForm" (ngSubmit)="cambiarPassword()" novalidate>
                  <div class="form-grid">
                    <!-- Con 2FA: pedir código del authenticator -->
                    <label *ngIf="usuario?.otp_enabled">
                      <span>Código del authenticator (6 dígitos)</span>
                      <input 
                        type="text" 
                        formControlName="otpCode" 
                        placeholder="123456" 
                        maxlength="6"
                        pattern="[0-9]{6}"
                      />
                      <small>Abre tu app authenticator y obtén el código actual</small>
                    </label>

                    <!-- Sin 2FA: pedir código de verificación por email -->
                    <div *ngIf="!usuario?.otp_enabled" style="grid-column: 1 / -1;">
                      <label>
                        <span>Código de verificación por email</span>
                        <div style="display: flex; gap: 0.5rem;">
                          <input 
                            type="text" 
                            formControlName="verificationCode" 
                            placeholder="Código de 6 dígitos" 
                            maxlength="6"
                            style="flex: 1;"
                          />
                          <button 
                            type="button" 
                            class="secondary-btn" 
                            (click)="solicitarCodigoEmail()"
                            [disabled]="savingPassword"
                          >
                            {{ savingPassword ? 'Enviando…' : 'Solicitar código' }}
                          </button>
                        </div>
                        <small>Enviaremos un código de verificación a tu email registrado</small>
                      </label>
                    </div>

                    <label>
                      <span>Nueva contraseña</span>
                      <input type="password" formControlName="newPassword" placeholder="Mínimo 8 caracteres" />
                      <small>Debe incluir mayúsculas, minúsculas, números y caracteres especiales</small>
                    </label>
                    <label>
                      <span>Confirmar nueva contraseña</span>
                      <input type="password" formControlName="confirmPassword" placeholder="Repite la contraseña" />
                    </label>
                  </div>
                  <div class="actions">
                    <button type="submit" class="primary-btn" [disabled]="savingPassword">
                      {{ savingPassword ? 'Actualizando…' : 'Actualizar contraseña' }}
                    </button>
                  </div>
                </form>
              </article>

              <article class="form-card admin-card" id="transfer" *ngIf="isAdmin">
                <header>
                  <div>
                    <h2>Transferir titularidad de empresa</h2>
                    <p>Asigna otra cuenta como responsable de una empresa registrada.</p>
                  </div>
                </header>

                <form [formGroup]="transferForm" (ngSubmit)="transferirEmpresa()" novalidate>
                  <div class="form-grid">
                    <label>
                      <span>NIT / Identificador de la empresa</span>
                      <input type="text" formControlName="empresaCodigo" placeholder="Ej. 80020548521-vxT20.Wd" />
                    </label>
                    <label>
                      <span>Correo del nuevo titular</span>
                      <input type="email" formControlName="nuevoEmail" placeholder="nuevo@empresa.com" />
                    </label>
                    <label>
                      <span>Nombre del nuevo titular (opcional)</span>
                      <input type="text" formControlName="nuevoNombre" placeholder="Nombre completo" />
                    </label>
                    <label>
                      <span>Contraseña temporal (opcional)</span>
                      <input type="text" formControlName="nuevoPassword" placeholder="Generaremos una si lo dejas vacío" />
                    </label>
                  </div>

                  <label class="checkbox-field">
                    <input type="checkbox" formControlName="desactivarAnterior" />
                    <span>Desactivar la cuenta anterior y revocar su 2FA</span>
                  </label>

                  <p class="helper-text">
                    Si el correo indicado no existe, crearemos un usuario activo automáticamente.
                  </p>

                  <div class="actions">
                    <button type="submit" class="primary-btn" [disabled]="transferForm.invalid || transferLoading">
                      {{ transferLoading ? 'Transfiriendo…' : 'Transferir titularidad' }}
                    </button>
                  </div>
                </form>

                <div class="temp-password" *ngIf="generatedTempPassword">
                  <strong>Contraseña temporal generada:</strong>
                  <code>{{ generatedTempPassword }}</code>
                  <p class="helper-text">Compártela con el nuevo titular y recomiéndale cambiarla después del primer ingreso.</p>
                </div>
              </article>
            </div>
          </ng-container>

          <ng-container *ngSwitchCase="'suscripciones'">
            <div *ngIf="suscripcionesLoading" class="inline-loading">
              <span class="spinner"></span>
              <p>Cargando suscripciones…</p>
            </div>
            <article class="form-card" *ngIf="!suscripcionesLoading">
              <header>
                <div>
                  <h2>Suscripciones activas</h2>
                  <p>Consulta y actualiza los servicios asociados a tu empresa.</p>
                </div>
              </header>
              <div class="subscriptions">
                <div class="empty-state" *ngIf="!suscripciones.length">
                  <p>Tu empresa aún no tiene suscripciones activas. Selecciona un plan desde la página de planes.</p>
                </div>

                <div class="subscription-list" *ngIf="suscripciones.length">
                  <div class="subscription-card" *ngFor="let sus of suscripciones">
                    <div class="subscription-info">
                      <h3>{{ sus.servicio?.nombre || ('Servicio #' + sus.servicio_id) }}</h3>
                      <p class="service-id">ID suscripción: {{ sus.id }}</p>
                      <p class="status" [class.active]="sus.estado === 'activa'" [class.suspended]="sus.estado === 'suspendida'">
                        Estado: {{ sus.estado | titlecase }}
                      </p>
                      <p class="dates">
                        Inicio: {{ sus.fecha_inicio || '—' }}
                        <span *ngIf="sus.fecha_fin">· Fin: {{ sus.fecha_fin }}</span>
                      </p>
                    </div>
                    <div class="subscription-actions">
                      <button
                        type="button"
                        class="outline-btn"
                        (click)="actualizarEstadoSuscripcion(sus, 'activa')"
                        [disabled]="sus.estado === 'activa' || suscripcionEnProgreso === sus.id"
                      >
                        Reactivar
                      </button>
                      <button
                        type="button"
                        class="outline-btn"
                        (click)="actualizarEstadoSuscripcion(sus, 'suspendida')"
                        [disabled]="sus.estado === 'suspendida' || suscripcionEnProgreso === sus.id"
                      >
                        Suspender
                      </button>
                      <button
                        type="button"
                        class="danger-btn"
                        (click)="actualizarEstadoSuscripcion(sus, 'inactiva')"
                        [disabled]="sus.estado === 'inactiva' || suscripcionEnProgreso === sus.id"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </article>
          </ng-container>

          <ng-container *ngSwitchCase="'futuro'">
            <article class="placeholder-card">
              <h3>Nuevas funcionalidades en camino</h3>
              <p>Estamos trabajando en herramientas adicionales para tu negocio. Muy pronto tendrás más opciones disponibles en este panel.</p>
            </article>
          </ng-container>
        </div>
      </section>
    </section>

    <ng-template #loadingTemplate>
      <div class="loading-state">
        <span class="spinner"></span>
        <p>Preparando tu panel de cuenta…</p>
      </div>
    </ng-template>
  `,
  styles: [`
    :host {
      display: block;
      min-height: 100vh;
      background: linear-gradient(135deg, #faf7f1, #fdf8eb);
      padding: 2rem 1rem 4rem;
    }

    .account-page {
      max-width: 1150px;
      margin: 0 auto;
      display: flex;
      flex-direction: column;
      gap: 2.5rem;
    }

    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: #fff;
      padding: 1.75rem 2rem;
  border-radius: 20px;
      flex-wrap: wrap;
      gap: 1rem;
    }

    .page-header h1 {
      margin: 0;
      font-size: 2rem;
      letter-spacing: -0.015em;
      color: #1f2937;
    }

    .page-header p {
      margin: 0.35rem 0 0;
      color: #4b5563;
      font-size: 0.96rem;
    }

    .status-chip {
      padding: 0.6rem 1.1rem;
      border-radius: 999px;
      font-weight: 600;
      font-size: 0.85rem;
      background: rgba(79, 70, 229, 0.12);
      color: #4338ca;
      transition: background 0.2s ease, color 0.2s ease;
    }

    .status-chip.active {
      background: rgba(22, 163, 74, 0.16);
      color: #15803d;
    }

    .cards-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
      gap: 1.4rem;
    }

    .menu-card {
      background: #fff;
      border-radius: 18px;
      padding: 1.5rem;
      display: flex;
      gap: 1rem;
      align-items: flex-start;
      text-align: left;
      border: 1px solid transparent;
  cursor: pointer;
  transition: transform 0.2s ease, border-color 0.2s ease;
      position: relative;
    }

    .menu-card:hover {
  transform: translateY(-4px);
  border-color: rgba(216, 155, 32, 0.35);
    }

    .menu-card h2 {
      margin: 0 0 0.35rem;
      font-size: 1.18rem;
      color: #1f2937;
    }

    .menu-card p {
      margin: 0;
      color: #4b5563;
      font-size: 0.92rem;
    }

    .card-icon {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 3.25rem;
      height: 3.25rem;
      border-radius: 14px;
      color: #fff;
      flex-shrink: 0;
    }

    .card-icon svg {
      width: 1.6rem;
      height: 1.6rem;
    }

    .card-icon.personal {
      background: linear-gradient(135deg, #fcd34d, #f59e0b);
    }

    .card-icon.seguridad {
      background: linear-gradient(135deg, #6366f1, #4338ca);
    }

    .card-icon.suscripciones {
      background: linear-gradient(135deg, #34d399, #059669);
    }

    .card-icon.futuro {
      background: linear-gradient(135deg, #fb7185, #ec4899);
    }

    .section-panel {
      background: #fff;
  border-radius: 22px;
  padding: 2.2rem;
      display: flex;
      flex-direction: column;
      gap: 2rem;
    }

    .panel-header {
      display: flex;
      align-items: center;
      gap: 1.5rem;
      flex-wrap: wrap;
    }

    .panel-header h2 {
      margin: 0;
      font-size: 1.6rem;
      color: #0f172a;
    }

    .panel-header p {
      margin: 0.3rem 0 0;
      color: #4b5563;
      font-size: 0.95rem;
    }

    .back-btn {
      display: inline-flex;
      align-items: center;
      gap: 0.6rem;
      border: none;
      background: rgba(15, 23, 42, 0.05);
      color: #1f2937;
      padding: 0.65rem 1.1rem;
      border-radius: 12px;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.2s ease, transform 0.2s ease;
    }

    .back-btn:hover {
      background: rgba(15, 23, 42, 0.1);
      transform: translateX(-2px);
    }

    .back-btn svg {
      width: 1.1rem;
      height: 1.1rem;
    }

    .panel-body {
      display: flex;
      flex-direction: column;
      gap: 1.75rem;
    }

    .inline-loading {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 0.85rem;
      padding: 3rem 1rem;
      color: #6b7280;
    }

    .security-columns {
      display: grid;
      gap: 1.5rem;
      grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
    }

    .placeholder-card {
      background: linear-gradient(135deg, #e0f2fe, #ede9fe);
      border-radius: 20px;
      padding: 3rem 2rem;
      text-align: center;
      color: #1e293b;
      box-shadow: inset 0 0 0 1px rgba(59, 130, 246, 0.15);
    }

    .placeholder-card h3 {
      margin: 0 0 0.75rem;
      font-size: 1.5rem;
    }

    .placeholder-card p {
      margin: 0;
      font-size: 0.95rem;
      color: #334155;
    }

    .form-card {
      background: #fff;
  border-radius: 18px;
  padding: 2rem;
      display: flex;
      flex-direction: column;
      gap: 1.75rem;
      border: 1px solid rgba(203, 213, 225, 0.5);
    }

    .form-card header h2 {
      margin: 0;
      font-size: 1.45rem;
      color: #1f2937;
    }

    .form-card header p {
      margin: 0.35rem 0 0;
      color: #4b5563;
      font-size: 0.95rem;
    }

    .admin-card {
      border-color: rgba(79, 70, 229, 0.25);
    }

    .form-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 1.25rem;
    }

    .form-grid label {
      display: flex;
      flex-direction: column;
      gap: 0.4rem;
      font-size: 0.9rem;
      color: #1f2937;
    }

    .form-grid label span {
      font-weight: 600;
      letter-spacing: 0.03em;
    }

    .form-grid input,
    .form-grid select {
      border: 1.5px solid rgba(216, 155, 32, 0.18);
      border-radius: 10px;
      padding: 0.65rem 0.85rem;
      font-size: 0.95rem;
      background: #fdfcf9;
      transition: border-color 0.2s ease, box-shadow 0.2s ease;
    }

    .form-grid input:focus,
    .form-grid select:focus {
      outline: none;
      border-color: rgba(216, 155, 32, 0.55);
      box-shadow: 0 0 0 3px rgba(216, 155, 32, 0.18);
    }

    .full-row {
      grid-column: 1 / -1;
    }

    .actions {
      display: flex;
      justify-content: flex-end;
    }

    .primary-btn {
      background: linear-gradient(135deg, #d69c1c, #fbbf24);
      color: #1f2937;
      border: none;
      font-weight: 600;
      padding: 0.9rem 1.6rem;
  border-radius: 999px;
  cursor: pointer;
  transition: transform 0.2s ease;
    }

    .primary-btn:hover {
  transform: translateY(-1px);
    }

    .primary-btn:disabled {
      opacity: 0.6;
      cursor: not-allowed;
      box-shadow: none;
    }

    .outline-btn {
      border: 1.5px solid rgba(217, 119, 6, 0.55);
      color: #92400e;
      background: transparent;
      border-radius: 999px;
      padding: 0.75rem 1.5rem;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.2s ease, color 0.2s ease;
    }

    .outline-btn:hover {
      background: rgba(217, 119, 6, 0.08);
    }

    .outline-btn:disabled {
      opacity: 0.45;
      cursor: not-allowed;
    }

    .danger-btn {
      background: linear-gradient(135deg, #ef4444, #f97316);
      border: none;
      color: #fff;
      border-radius: 999px;
      padding: 0.75rem 1.4rem;
      font-weight: 600;
      cursor: pointer;
      transition: transform 0.2s ease;
    }

    .danger-btn:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .checkbox-field {
      display: flex;
      align-items: center;
      gap: 0.65rem;
      font-size: 0.9rem;
      color: #1f2937;
    }

    .checkbox-field input {
      width: 1.1rem;
      height: 1.1rem;
      accent-color: #d69c1c;
    }

    .helper-text {
      margin: 0;
      color: #6b7280;
      font-size: 0.85rem;
    }

    .two-factor {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }

    .two-factor .status {
      margin: 0;
      font-weight: 600;
      color: #4b5563;
    }

    .two-factor .status.active {
      color: #15803d;
    }

    .button-row {
      display: flex;
      flex-wrap: wrap;
      gap: 0.75rem;
    }

    .disable-form {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .disable-form input {
      border: 1.5px solid rgba(217, 119, 6, 0.35);
      border-radius: 10px;
      padding: 0.7rem 1rem;
    }

    .otp-setup {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }

    .otp-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 1.5rem;
      align-items: center;
    }

    .otp-grid .qr,
    .otp-grid .manual {
      background: #f8fafc;
      border-radius: 16px;
      padding: 1.5rem;
      display: flex;
      justify-content: center;
      align-items: center;
      border: 1px solid rgba(203, 213, 225, 0.6);
    }

    .otp-grid .qr img {
      width: 220px;
      height: 220px;
    }

    .otp-grid .details {
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
    }

    .manual-code {
      background: rgba(217, 119, 6, 0.08);
      padding: 1rem;
      border-radius: 12px;
      border: 1px dashed rgba(217, 119, 6, 0.35);
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
    }

    .manual-code span {
      font-size: 0.8rem;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: #92400e;
    }

    .manual-code strong {
      font-size: 1.1rem;
      color: #1f2937;
    }

    .otp-form {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .otp-form input {
      border: 1.5px solid rgba(79, 70, 229, 0.25);
      border-radius: 10px;
      padding: 0.8rem 1rem;
      font-size: 1.1rem;
      letter-spacing: 0.2em;
      text-align: center;
    }

    .backup-codes ul {
      list-style: none;
      padding: 0;
      margin: 0;
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
      gap: 0.75rem;
    }

    .backup-codes li {
      background: #1f2937;
      color: #f8fafc;
      padding: 0.65rem;
      border-radius: 10px;
      text-align: center;
      font-family: 'Fira Mono', monospace;
      letter-spacing: 0.04em;
    }

    .subscriptions {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }

    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 0.75rem;
      padding: 2rem 1rem;
      color: #6b7280;
      text-align: center;
    }

    .subscription-list {
      display: grid;
      gap: 1.25rem;
    }

    .subscription-card {
      border: 1px solid rgba(203, 213, 225, 0.8);
      border-radius: 16px;
      padding: 1.5rem;
      background: #f8fafc;
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
    }

    .subscription-info h3 {
      margin: 0;
      font-size: 1.2rem;
      color: #1f2937;
    }

    .subscription-info .service-id {
      margin: 0.3rem 0 0;
      font-size: 0.85rem;
      color: #64748b;
    }

    .subscription-info .status {
      margin: 0.35rem 0 0;
      font-weight: 600;
    }

    .subscription-info .status.active {
      color: #15803d;
    }

    .subscription-info .status.suspended {
      color: #b45309;
    }

    .subscription-info .dates {
      margin: 0.35rem 0 0;
      color: #475569;
      font-size: 0.88rem;
    }

    .subscription-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 0.75rem;
      align-items: center;
    }

    .temp-password {
      background: rgba(59, 130, 246, 0.1);
      border-radius: 12px;
      padding: 1rem;
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
      border: 1px dashed rgba(59, 130, 246, 0.25);
    }

    .temp-password code {
      font-family: 'Fira Mono', monospace;
      font-size: 0.95rem;
      background: rgba(30, 64, 175, 0.1);
      padding: 0.35rem 0.5rem;
      border-radius: 8px;
    }

    .spinner {
      width: 2.2rem;
      height: 2.2rem;
      border-radius: 50%;
      border: 3px solid rgba(217, 119, 6, 0.25);
      border-top-color: #d97706;
      animation: spin 0.9s linear infinite;
    }

    .loading-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 1rem;
      padding: 5rem 1rem;
      color: #6b7280;
    }

    /* Estilos para búsqueda de países y ciudades */
    .country-field,
    .city-field {
      position: relative;
    }

    .input-with-icon {
      position: relative;
      display: flex;
      align-items: center;
    }

    .input-with-icon input {
      width: 100%;
      padding-right: 2.8rem;
    }

    .clear-icon-btn {
      position: absolute;
      right: 0.6rem;
      top: 50%;
      transform: translateY(-50%);
      background: transparent;
      border: none;
      color: #9ca3af;
      cursor: pointer;
      padding: 0.3rem;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 6px;
      transition: background 0.2s ease, color 0.2s ease;
    }

    .clear-icon-btn:hover {
      background: rgba(156, 163, 175, 0.15);
      color: #6b7280;
    }

    .loading-spinner {
      position: absolute;
      right: 0.7rem;
      top: 50%;
      transform: translateY(-50%);
      width: 1.1rem;
      height: 1.1rem;
      border: 2px solid rgba(217, 119, 6, 0.25);
      border-top-color: #d97706;
      border-radius: 50%;
      animation: spin 0.7s linear infinite;
    }

    .suggestions-list {
      position: absolute;
      z-index: 20;
      left: 0;
      right: 0;
      top: calc(100% + 0.5rem);
      margin: 0;
      padding: 0.5rem;
      background: #fff;
      border: 1px solid rgba(203, 213, 225, 0.9);
      border-radius: 14px;
      box-shadow: 0 20px 40px rgba(15, 23, 42, 0.1);
      list-style: none;
      max-height: 280px;
      overflow-y: auto;
    }

    .suggestions-list li {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.7rem 0.9rem;
      border-radius: 10px;
      cursor: pointer;
      transition: background 0.18s ease;
      color: #1f2937;
    }

    .suggestions-list li:hover {
      background: rgba(217, 119, 6, 0.08);
    }

    .suggestions-list li strong {
      font-weight: 600;
    }

    .suggestions-list li .country-code {
      color: #9ca3af;
      font-size: 0.82rem;
      font-weight: 500;
      margin-left: 0.8rem;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    @media (max-width: 768px) {
      .page-header {
        flex-direction: column;
        align-items: flex-start;
      }

      .section-panel {
        padding: 1.5rem;
      }
    }
  `]
})
export class AccountComponent implements OnInit, OnDestroy {
  profileForm: FormGroup;
  passwordForm: FormGroup;
  otpForm: FormGroup;
  disableOtpForm: FormGroup;
  transferForm: FormGroup;

  usuario: UsuarioPerfil | null = null;
  suscripciones: SuscripcionDetalle[] = [];

  initializing = true;
  activeSection: SectionKey | null = null;
  profileSectionLoading = false;
  profileLoaded = false;
  suscripcionesLoading = false;
  suscripcionesLoaded = false;
  savingProfile = false;
  savingPassword = false;
  otpLoading = false;
  otpSetup: OtpSetupState | null = null;
  mostrarDesactivar = false;
  suscripcionEnProgreso: number | null = null;
  transferLoading = false;
  generatedTempPassword: string | null = null;
  countries: { code: string; name: string }[] = [];
  cities: Array<{ name: string; state?: string }> = [];
  selectedCountryCode: string | null = null;
  countriesLoading = false;
  citiesLoading = false;
  locationError: string | null = null;
  countrySearchTerm = '';
  countrySearchError: string | null = null;

  private pendingCountryName: string | null = null;
  private pendingCityName: string | null = null;
  private pendingCountrySearched = false;
  private countrySearchInitialized = false;
  private countrySearch$ = new Subject<string>();
  private countrySearchSubscription: Subscription | null = null;
  private initialCountrySearchTerm: string | null = null;

  readonly sectionMeta: Record<SectionKey, { title: string; description: string }> = {
    personal: {
      title: 'Información personal',
      description: 'Consulta y actualiza tus datos básicos de contacto.'
    },
    seguridad: {
      title: 'Seguridad',
      description: 'Configura métodos de acceso seguro y cambia tu contraseña.'
    },
    suscripciones: {
      title: 'Administrar suscripción',
      description: 'Consulta y gestiona los servicios asociados a tu empresa.'
    },
    futuro: {
      title: 'Próximamente',
      description: 'Reserva este espacio para nuevas herramientas de negocio.'
    }
  };

  private profileCallbacks: Array<() => void> = [];

  constructor(private fb: FormBuilder, private api: ApiService, private authSession: AuthSessionService) {
    this.profileForm = this.fb.group({
      nombre: ['', Validators.required],
      telefono: [''],
      direccion: [''],
      ciudad: [''],
      pais: [''],
      fecha_nacimiento: ['']
    });

    this.passwordForm = this.fb.group({
      newPassword: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', Validators.required],
      otpCode: [''],  // Solo si tiene 2FA activo
      verificationCode: ['']  // Solo si NO tiene 2FA
    });

    this.otpForm = this.fb.group({
      otpCode: ['', [Validators.required, Validators.pattern(/^[0-9]{6}$/)]]
    });

    this.disableOtpForm = this.fb.group({
      password: ['', Validators.required]
    });

    this.transferForm = this.fb.group({
      empresaCodigo: ['', [Validators.required, Validators.maxLength(50), Validators.pattern(/^[A-Za-z0-9._-]+$/)]],
      nuevoEmail: ['', [Validators.required, Validators.email]],
      nuevoNombre: [''],
      nuevoPassword: [''],
      desactivarAnterior: [false]
    });
  }

  ngOnInit(): void {
    // Suscribirse a cambios en el usuario
    this.authSession.currentUser$.subscribe(user => {
      if (user) {
        this.usuario = user;
        this.patchProfileForm(user);
      }
    });

    this.bootstrapFromSession();
  }

  ngOnDestroy(): void {
    this.countrySearchSubscription?.unsubscribe();
    this.countrySearchSubscription = null;
    this.countrySearch$.complete();
  }

  get isAdmin(): boolean {
    return (this.usuario?.rol || '').toLowerCase() === 'admin';
  }

  openSection(section: SectionKey): void {
    this.activeSection = section;

    if (section === 'personal' || section === 'seguridad') {
      this.ensurePerfilLoaded();
      this.ensureCountriesLoaded();
    }

    if (section === 'suscripciones') {
      this.ensurePerfilLoaded(false, () => this.ensureSuscripcionesLoaded());
      this.ensureSuscripcionesLoaded();
    }
  }

  closeSection(): void {
    this.activeSection = null;
  }

  private bootstrapFromSession(): void {
    const session = this.authSession.getSession();
    if (session?.usuario) {
      this.usuario = session.usuario;
      this.patchProfileForm(session.usuario);
    }
    this.initializing = false;
  }

  private ensurePerfilLoaded(force = false, after?: () => void): void {
    if (after) {
      this.profileCallbacks.push(after);
    }

    if (!force && this.profileLoaded) {
      this.flushProfileCallbacks();
      return;
    }

    if (this.profileSectionLoading) {
      return;
    }

    if (force) {
      this.profileLoaded = false;
    }

    this.profileSectionLoading = true;
    this.api.obtenerPerfil().subscribe({
      next: ({ usuario }) => {
        this.usuario = usuario;
        this.patchProfileForm(usuario);
        this.profileSectionLoading = false;
        this.profileLoaded = true;
        this.flushProfileCallbacks();
      },
      error: (error) => {
        this.profileSectionLoading = false;
        this.profileCallbacks = [];
        Swal.fire('Error', error?.error?.message || 'No pudimos cargar tu perfil. Intenta nuevamente.', 'error');
      }
    });
  }

  private flushProfileCallbacks(): void {
    if (!this.profileCallbacks.length) {
      return;
    }
    const callbacks = [...this.profileCallbacks];
    this.profileCallbacks = [];
    callbacks.forEach(cb => {
      try {
        cb();
      } catch (error) {
        console.error('callback error', error);
      }
    });
  }

  private ensureCountriesLoaded(): void {
    if (!this.countrySearchInitialized) {
      this.initializeCountrySearch();
    }

    if (this.countries.length) {
      this.applyPendingLocation();
      return;
    }

    const desired = this.pendingCountryName || (this.profileForm.value.pais || '').trim();
    if (desired) {
      this.triggerCountrySearch(desired);
    }
  }

  private initializeCountrySearch(): void {
    if (this.countrySearchInitialized) {
      return;
    }

    this.countrySearchInitialized = true;
    this.countrySearchSubscription = this.countrySearch$
      .pipe(
        debounceTime(250),
        distinctUntilChanged(),
        switchMap(rawTerm => {
          const term = (rawTerm || '').trim();
          this.countrySearchTerm = term;

          if (!term) {
            this.countriesLoading = false;
            this.countrySearchError = null;
            this.countries = [];
            return of({ countries: [] });
          }

          this.countriesLoading = true;
          this.countrySearchError = null;
          return this.api.buscarPaises(term).pipe(
            catchError((error) => {
              this.countriesLoading = false;
              this.countrySearchError = error?.error?.message || 'No pudimos buscar países. Escríbelo manualmente si prefieres.';
              return of({ countries: [] });
            })
          );
        })
      )
      .subscribe(({ countries }) => {
        this.countriesLoading = false;
        const listado = (countries || [])
          .filter((country): country is { code: string; name: string } => Boolean(country?.code && country?.name))
          .map(country => ({ code: country.code, name: country.name }));
        listado.sort((a, b) => a.name.localeCompare(b.name, 'es', { sensitivity: 'base' }));
        this.countries = listado;

        if (!listado.length && this.countrySearchTerm) {
          this.countrySearchError = this.countrySearchError || 'No encontramos países que coincidan con tu búsqueda. Puedes ingresarlo manualmente.';
        }

        this.applyPendingLocation();
      });

    const initialTerm = this.initialCountrySearchTerm || (this.profileForm.value.pais || '').trim();
    if (initialTerm) {
      this.countrySearch$.next(initialTerm);
      this.initialCountrySearchTerm = null;
    }
  }

  private triggerCountrySearch(term: string): void {
    const normalized = term ?? '';
    if (!this.countrySearchInitialized) {
      this.initialCountrySearchTerm = normalized;
      return;
    }
    this.countrySearch$.next(normalized);
  }

  onCountrySearchInputEvent(event: Event): void {
    const target = event.target as HTMLInputElement | null;
    const value = target?.value ?? '';
    this.onCountrySearchInput(value);
  }

  onCountryInputFocus(): void {
    // Mostrar sugerencias si hay un término de búsqueda activo
    const currentValue = this.profileForm.value.pais?.trim();
    if (currentValue && currentValue.length >= 2 && !this.countries.length) {
      this.countrySearch$.next(currentValue);
    }
  }

  onCountrySearchInput(value: string): void {
    const rawValue = value ?? '';
    this.pendingCountryName = rawValue.trim() || null;
    this.pendingCityName = null;
    this.countrySearchError = null;
    this.countrySearch$.next(rawValue);

    if (!rawValue.trim()) {
      this.selectedCountryCode = null;
      this.cities = [];
    }
  }

  onCountrySuggestionSelected(country: { code: string; name: string }): void {
    if (!country?.code || !country?.name) {
      return;
    }

    this.pendingCountrySearched = false;
    this.selectedCountryCode = country.code;
    this.pendingCountryName = country.name;
    this.pendingCityName = null;
    this.countrySearchTerm = country.name;
    this.countrySearchError = null;
    this.countries = [];
    this.profileForm.patchValue({ pais: country.name, ciudad: '' });
    this.locationError = null;
    this.loadCitiesFor(country.code);
  }

  clearCountrySelection(): void {
    this.pendingCountrySearched = false;
    this.profileForm.patchValue({ pais: '', ciudad: '' });
    this.countrySearchTerm = '';
    this.selectedCountryCode = null;
    this.pendingCountryName = null;
    this.pendingCityName = null;
    this.countries = [];
    this.countrySearchError = null;
    this.cities = [];
    this.countrySearch$.next('');
  }

  trackCountry(index: number, country: { code: string; name: string }): string {
    return country.code || `${index}`;
  }

  private loadCitiesFor(countryCode: string, preselect?: string): void {
    const normalizedCode = (countryCode || '').trim().toUpperCase();
    if (!normalizedCode) {
      this.cities = [];
      this.selectedCountryCode = null;
      return;
    }

    this.selectedCountryCode = normalizedCode;
    this.citiesLoading = true;
    this.api.obtenerCiudades(normalizedCode).subscribe({
      next: ({ cities }) => {
        this.citiesLoading = false;
        this.cities = (cities || [])
          .filter(city => city && city.name && city.name.trim())
          .map(city => ({ name: city.name.trim(), state: city.state || undefined }));
        this.locationError = null;

        if (preselect) {
          this.ensureCityInList(preselect);
        } else if (!this.profileForm.value.ciudad || !this.cities.some(city => city.name === this.profileForm.value.ciudad)) {
          this.profileForm.patchValue({ ciudad: '' });
          this.pendingCityName = null;
        }
      },
      error: (error) => {
        this.citiesLoading = false;
        this.locationError = error?.error?.message || 'No pudimos cargar ciudades. Puedes ingresarla manualmente.';
        this.cities = [];
      }
    });
  }

  private applyPendingLocation(): void {
    const desiredCountry = this.pendingCountryName || (this.profileForm.value.pais || '').trim();
    if (!desiredCountry) {
      this.selectedCountryCode = null;
      this.cities = [];
      return;
    }

    if (!this.countries.length) {
      if (!this.pendingCountrySearched) {
        this.pendingCountrySearched = true;
        this.triggerCountrySearch(desiredCountry);
      }
      return;
    }

    const match = this.findCountryByName(desiredCountry);
    if (!match) {
      if (!this.pendingCountrySearched) {
        this.pendingCountrySearched = true;
        this.triggerCountrySearch(desiredCountry);
      }
      return;
    }

    this.pendingCountrySearched = false;
    const changedCountry = this.selectedCountryCode !== match.code;
    this.selectedCountryCode = match.code;

    const desiredCity = this.pendingCityName || (this.profileForm.value.ciudad || '').trim();

    if (changedCountry || !this.cities.length) {
      this.loadCitiesFor(match.code, desiredCity || undefined);
    } else if (desiredCity) {
      this.ensureCityInList(desiredCity);
    }

    this.pendingCountryName = null;
  }

  private findCountryByName(name: string): { code: string; name: string } | undefined {
    const normalized = name.toLowerCase();
    return this.countries.find(country => country.name.toLowerCase() === normalized || country.code.toLowerCase() === normalized);
  }

  private ensureCityInList(cityName: string | null | undefined): void {
    if (!cityName) {
      return;
    }
    const normalized = cityName.toLowerCase();
    const exists = this.cities.some(city => city.name.toLowerCase() === normalized);
    if (!exists) {
      this.cities = [{ name: cityName }, ...this.cities];
    }
    this.profileForm.patchValue({ ciudad: cityName });
    this.pendingCityName = null;
  }

  private patchProfileForm(usuario: UsuarioPerfil): void {
    this.profileForm.patchValue({
      nombre: usuario.nombre || '',
      telefono: usuario.telefono || '',
      direccion: usuario.direccion || '',
      ciudad: usuario.ciudad || '',
      pais: usuario.pais || '',
      fecha_nacimiento: usuario.fecha_nacimiento ? usuario.fecha_nacimiento.substring(0, 10) : ''
    });
    this.pendingCountryName = usuario.pais ? usuario.pais.trim() : null;
    this.pendingCityName = usuario.ciudad ? usuario.ciudad.trim() : null;
    this.pendingCountrySearched = false;
    if (this.pendingCountryName) {
      this.triggerCountrySearch(this.pendingCountryName);
    }
    this.applyPendingLocation();
  }

  guardarPerfil(): void {
    if (this.profileForm.invalid) {
      this.profileForm.markAllAsTouched();
      return;
    }

    this.savingProfile = true;
    this.api.actualizarPerfil(this.profileForm.value).subscribe({
      next: ({ usuario }) => {
        this.usuario = usuario;
        this.patchProfileForm(usuario);
        this.savingProfile = false;
        this.profileLoaded = true;
        Swal.fire('Perfil actualizado', 'Guardamos los cambios en tu cuenta.', 'success');
      },
      error: (error) => {
        this.savingProfile = false;
        Swal.fire('Error', error?.error?.message || 'No pudimos guardar los cambios.', 'error');
      }
    });
  }

  cambiarPassword(): void {
    const { newPassword, confirmPassword, otpCode, verificationCode } = this.passwordForm.value;
    
    // Validar que las contraseñas coincidan
    if (newPassword !== confirmPassword) {
      Swal.fire('Las contraseñas no coinciden', 'Verifica la nueva contraseña y vuelve a intentarlo.', 'warning');
      return;
    }

    // Validar método de verificación según si tiene 2FA o no
    if (this.usuario?.otp_enabled) {
      // Con 2FA: requiere código OTP
      if (!otpCode || otpCode.trim() === '') {
        Swal.fire('Código requerido', 'Debes ingresar el código de tu authenticator (6 dígitos).', 'warning');
        return;
      }
    } else {
      // Sin 2FA: requiere código de verificación por email
      if (!verificationCode || verificationCode.trim() === '') {
        Swal.fire(
          'Código requerido', 
          'Debes solicitar un código de verificación primero. Haz clic en "Solicitar código por email".', 
          'warning'
        );
        return;
      }
    }

    this.savingPassword = true;
    
    const payload: { new_password: string; otp_code?: string; verification_code?: string } = {
      new_password: newPassword
    };
    
    if (this.usuario?.otp_enabled) {
      payload.otp_code = otpCode;
    } else {
      payload.verification_code = verificationCode;
    }

    this.api.cambiarPassword(payload).subscribe({
      next: () => {
        this.savingPassword = false;
        this.passwordForm.reset();
        Swal.fire('Contraseña actualizada', 'Tu contraseña fue cambiada correctamente.', 'success');
      },
      error: (error) => {
        this.savingPassword = false;
        Swal.fire('Error', error?.error?.message || 'No pudimos actualizar la contraseña.', 'error');
      }
    });
  }

  solicitarCodigoEmail(): void {
    if (this.usuario?.otp_enabled) {
      Swal.fire(
        'No disponible',
        'Tienes 2FA activo. Usa el código de tu authenticator para cambiar tu contraseña.',
        'info'
      );
      return;
    }

    this.savingPassword = true;
    this.api.solicitarCodigoPassword().subscribe({
      next: (response) => {
        this.savingPassword = false;
        let mensaje = 'Revisa tu correo electrónico. El código expira en 10 minutos.';
        
        // En desarrollo, mostrar el código
        if (response.code) {
          mensaje += `\n\n🔑 DESARROLLO: Tu código es ${response.code}`;
        }
        
        Swal.fire('Código enviado', mensaje, 'success');
      },
      error: (error) => {
        this.savingPassword = false;
        Swal.fire('Error', error?.error?.message || 'No pudimos enviar el código.', 'error');
      }
    });
  }

  transferirEmpresa(): void {
    if (!this.isAdmin) {
      return;
    }

    if (this.transferForm.invalid) {
      this.transferForm.markAllAsTouched();
      return;
    }

    const {
      empresaCodigo,
      nuevoEmail,
      nuevoNombre,
      nuevoPassword,
      desactivarAnterior
    } = this.transferForm.value;

    const payload: TransferEmpresaPayload = {
      empresa_codigo: (empresaCodigo || '').trim(),
      nuevo_email: (nuevoEmail || '').trim().toLowerCase(),
      desactivar_anterior: !!desactivarAnterior
    };

    const nombreLimpio = (nuevoNombre || '').trim();
    if (nombreLimpio) {
      payload.nuevo_nombre = nombreLimpio;
    }

    const passwordLimpia = (nuevoPassword || '').trim();
    if (passwordLimpia) {
      payload.nuevo_password = passwordLimpia;
    }

    this.transferLoading = true;
    this.generatedTempPassword = null;

    this.api.transferirEmpresa(payload).subscribe({
      next: async (response: TransferEmpresaResponse) => {
        this.transferLoading = false;
        this.generatedTempPassword = response.temp_password || null;
        let html = `<p>${response.message || 'Transferencia realizada correctamente.'}</p>`;
        if (response.nuevo_usuario?.email) {
          html += `<p><strong>Nuevo titular:</strong> ${response.nuevo_usuario.email}</p>`;
        }
        if (response.anterior_usuario?.email) {
          html += `<p><strong>Usuario anterior:</strong> ${response.anterior_usuario.email}</p>`;
        }
        if (this.generatedTempPassword) {
          html += `<p><strong>Contraseña temporal:</strong> <code>${this.generatedTempPassword}</code></p>`;
        }

        await Swal.fire({
          icon: 'success',
          title: 'Titularidad actualizada',
          html,
          confirmButtonText: 'Entendido'
        });

        this.transferForm.reset({
          empresaCodigo: '',
          nuevoEmail: '',
          nuevoNombre: '',
          nuevoPassword: '',
          desactivarAnterior: false
        });

        if (response.nuevo_usuario?.email === (this.usuario?.email || '')) {
          this.ensurePerfilLoaded(true, () => {
            if (this.activeSection === 'suscripciones') {
              this.ensureSuscripcionesLoaded(true);
            }
          });
        }
      },
      error: (error: unknown) => {
        this.transferLoading = false;
        let message = 'No pudimos transferir la empresa. Intenta nuevamente.';

        if (typeof error === 'object' && error && 'error' in error) {
          const errObj = (error as { error?: { message?: string } }).error;
          if (errObj?.message) {
            message = errObj.message;
          }
        }

        Swal.fire('Error al transferir', message, 'error');
      }
    });
  }

  iniciarOtp(): void {
    this.otpLoading = true;
    this.api.requestOtpSetup(true).subscribe({
      next: async ({ secret, provisioning_uri }) => {
        this.otpSetup = { secret, provisioning_uri };
        this.otpForm.reset();
        this.disableOtpForm.reset();
        this.mostrarDesactivar = false;
        try {
          this.otpSetup.qr = await toDataURL(provisioning_uri, { width: 280, margin: 1 });
        } catch {
          this.otpSetup.qr = null;
        }
        this.otpLoading = false;
      },
      error: (error) => {
        this.otpLoading = false;
        Swal.fire('Error', error?.error?.message || 'No pudimos generar la configuración OTP.', 'error');
      }
    });
  }

  cancelarOtpSetup(): void {
    this.otpSetup = null;
    this.otpForm.reset();
    this.otpLoading = false;
  }

  confirmarOtp(): void {
    if (!this.otpSetup || this.otpForm.invalid) {
      this.otpForm.markAllAsTouched();
      return;
    }

    const code = this.otpForm.value.otpCode;
    this.otpLoading = true;
    this.api.activateOtp(code).subscribe({
      next: ({ backup_codes }) => {
        this.otpLoading = false;
        
        // Mostrar códigos de respaldo antes de cerrar
        const codesHtml = backup_codes.map(code => `<code style="display:block;padding:4px;background:#f0f0f0;margin:2px 0;">${code}</code>`).join('');
        
        Swal.fire({
          title: '✅ Autenticación activada',
          html: `
            <p>La autenticación en dos pasos está lista.</p>
            <p><strong>⚠️ Guarda estos códigos de respaldo en un lugar seguro:</strong></p>
            <div style="max-height:200px;overflow-y:auto;text-align:left;padding:10px;border:1px solid #ddd;border-radius:4px;">
              ${codesHtml}
            </div>
            <p style="margin-top:10px;font-size:14px;color:#666;">Los necesitarás si pierdes acceso a tu authenticator.</p>
          `,
          icon: 'success',
          confirmButtonText: 'Entendido'
        });
        
        // Limpiar el estado de setup para cerrar el formulario
        this.otpSetup = null;
        this.otpForm.reset();
        
        // Recargar perfil para actualizar otp_enabled
        this.ensurePerfilLoaded(true);
      },
      error: (error) => {
        this.otpLoading = false;
        Swal.fire('Código inválido', error?.error?.message || 'Revisa el código generado por tu app.', 'error');
      }
    });
  }

  desactivarOtp(): void {
    if (this.disableOtpForm.invalid) {
      this.disableOtpForm.markAllAsTouched();
      return;
    }

    const password = this.disableOtpForm.value.password;
    this.otpLoading = true;
    this.api.disableOtp(password).subscribe({
      next: () => {
        this.otpLoading = false;
        this.disableOtpForm.reset();
        this.otpSetup = null;
        this.mostrarDesactivar = false;
        Swal.fire('2FA desactivado', 'Ya no se pedirá código adicional al ingresar.', 'success');
        this.ensurePerfilLoaded(true);
      },
      error: (error) => {
        this.otpLoading = false;
        Swal.fire('Error', error?.error?.message || 'No pudimos desactivar la autenticación en dos pasos.', 'error');
      }
    });
  }

  private ensureSuscripcionesLoaded(force = false): void {
    if (!this.usuario?.empresa_id) {
      this.suscripciones = [];
      this.suscripcionesLoaded = true;
      return;
    }

    if (this.suscripcionesLoading) {
      return;
    }

    if (this.suscripcionesLoaded && !force) {
      return;
    }

    if (force) {
      this.suscripcionesLoaded = false;
    }

    this.suscripcionesLoading = true;
    this.api.obtenerSuscripciones().subscribe({
      next: ({ suscripciones }) => {
        this.suscripciones = suscripciones;
        this.suscripcionesLoading = false;
        this.suscripcionesLoaded = true;
      },
      error: () => {
        this.suscripciones = [];
        this.suscripcionesLoading = false;
        this.suscripcionesLoaded = false;
      }
    });
  }

  actualizarEstadoSuscripcion(suscripcion: SuscripcionDetalle, estado: 'activa' | 'suspendida' | 'inactiva'): void {
    if (this.suscripcionEnProgreso) {
      return;
    }

    const mensajes = {
      activa: {
        titulo: 'Reactivar suscripción',
        texto: 'La suscripción volverá a estar activa de inmediato.'
      },
      suspendida: {
        titulo: 'Suspender suscripción',
        texto: 'Podrás reactivarla más adelante.'
      },
      inactiva: {
        titulo: 'Cancelar suscripción',
        texto: 'Se marcará como inactiva y registraremos la fecha de fin.'
      }
    } as const;

    Swal.fire({
      title: mensajes[estado].titulo,
      text: mensajes[estado].texto,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Confirmar',
      cancelButtonText: 'Cancelar'
    }).then(result => {
      if (!result.isConfirmed) {
        return;
      }

      this.suscripcionEnProgreso = suscripcion.id;
      this.api.actualizarSuscripcion(suscripcion.id, estado).subscribe({
        next: ({ suscripcion: actualizada }) => {
          this.suscripciones = this.suscripciones.map(item => item.id === actualizada.id ? actualizada : item);
          this.suscripcionEnProgreso = null;
          Swal.fire('Cambios guardados', 'Actualizamos el estado de la suscripción.', 'success');
        },
        error: (error) => {
          this.suscripcionEnProgreso = null;
          Swal.fire('Error', error?.error?.message || 'No pudimos actualizar la suscripción.', 'error');
        }
      });
    });
  }

}

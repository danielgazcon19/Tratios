import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { toDataURL } from 'qrcode';
import Swal from 'sweetalert2';
import {
  ApiService,
  UsuarioPerfil,
  SuscripcionPlan,
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
              <p>Cargando información de suscripción…</p>
            </div>
            <div class="suscripcion-wrapper" *ngIf="!suscripcionesLoading">
              <!-- Sin suscripción -->
              <article class="form-card empty-suscripcion" *ngIf="!suscripcionActual">
                <div class="empty-state-large">
                  <div class="empty-icon">📋</div>
                  <h3>Sin suscripción activa</h3>
                  <p>Tu empresa aún no cuenta con una suscripción. Contacta con nuestro equipo comercial para activar tu plan.</p>
                  <a href="https://wa.me/573132865421?text=Hola,%20quiero%20información%20sobre%20los%20planes%20de%20Tratios" 
                     target="_blank" 
                     class="primary-btn whatsapp-btn">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                    </svg>
                    Contactar por WhatsApp
                  </a>
                </div>
              </article>

              <!-- Con suscripción -->
              <article class="form-card suscripcion-card" *ngIf="suscripcionActual">
                <header class="suscripcion-header">
                  <div class="plan-badge" [class.basico]="suscripcionActual.plan?.nombre?.toLowerCase()?.includes('básico') || suscripcionActual.plan?.nombre?.toLowerCase()?.includes('basico')" 
                       [class.pro]="suscripcionActual.plan?.nombre?.toLowerCase()?.includes('pro')"
                       [class.premium]="suscripcionActual.plan?.nombre?.toLowerCase()?.includes('premium')">
                    {{ suscripcionActual.plan?.nombre || 'Plan' }}
                  </div>
                  <div class="suscripcion-estado" 
                       [class.activa]="suscripcionActual.estado === 'activa'"
                       [class.suspendida]="suscripcionActual.estado === 'suspendida'"
                       [class.cancelada]="suscripcionActual.estado === 'cancelada'"
                       [class.inactiva]="suscripcionActual.estado === 'inactiva'">
                    {{ suscripcionActual.estado | titlecase }}
                  </div>
                </header>

                <div class="suscripcion-details">
                  <div class="detail-row">
                    <span class="detail-label">Empresa</span>
                    <span class="detail-value">{{ suscripcionActual.empresa?.nombre || 'N/A' }}</span>
                  </div>
                  <div class="detail-row">
                    <span class="detail-label">Periodo</span>
                    <span class="detail-value">{{ suscripcionActual.periodo | titlecase }}</span>
                  </div>
                  <div class="detail-row">
                    <span class="detail-label">Precio</span>
                    <span class="detail-value precio" *ngIf="!suscripcionActual.porcentaje_descuento">
                      {{ suscripcionActual.precio_pagado | currency:'USD':'symbol':'1.0-0' }}/{{ suscripcionActual.periodo === 'anual' ? 'año' : 'mes' }}
                    </span>
                    <span class="detail-value" *ngIf="suscripcionActual.porcentaje_descuento">
                      <span class="precio-tachado">{{ suscripcionActual.precio_pagado | currency:'USD':'symbol':'1.0-0' }}</span>
                      <span class="precio-con-descuento">{{ suscripcionActual.precio_con_descuento | currency:'USD':'symbol':'1.0-0' }}/{{ suscripcionActual.periodo === 'anual' ? 'año' : 'mes' }}</span>
                      <span class="descuento-badge">-{{ suscripcionActual.porcentaje_descuento }}%</span>
                    </span>
                  </div>
                  <div class="detail-row">
                    <span class="detail-label">Fecha de inicio</span>
                    <span class="detail-value">{{ suscripcionActual.fecha_inicio | date:'longDate' }}</span>
                  </div>
                  <div class="detail-row">
                    <span class="detail-label">Fecha de vencimiento</span>
                    <span class="detail-value" [class.vencida]="isVencida(suscripcionActual.fecha_fin)">
                      {{ suscripcionActual.fecha_fin | date:'longDate' }}
                      <span class="dias-restantes" *ngIf="!isVencida(suscripcionActual.fecha_fin) && diasRestantes(suscripcionActual.fecha_fin) <= 30">
                        ({{ diasRestantes(suscripcionActual.fecha_fin) }} días restantes)
                      </span>
                    </span>
                  </div>
                  <div class="detail-row" *ngIf="suscripcionActual.forma_pago">
                    <span class="detail-label">Forma de pago</span>
                    <span class="detail-value">{{ suscripcionActual.forma_pago }}</span>
                  </div>
                  <div class="detail-row" *ngIf="suscripcionActual.notas">
                    <span class="detail-label">Notas</span>
                    <span class="detail-value notas">{{ suscripcionActual.notas }}</span>
                  </div>
                </div>

                <!-- Acciones según estado -->
                <div class="suscripcion-actions" *ngIf="suscripcionActual.estado !== 'cancelada'">
                  <button type="button" 
                          class="outline-btn renovar-btn" 
                          *ngIf="suscripcionActual.estado === 'activa' && diasRestantes(suscripcionActual.fecha_fin) <= 30"
                          (click)="solicitarRenovacion()"
                          [disabled]="suscripcionEnProgreso">
                    🔄 Solicitar renovación
                  </button>
                  <button type="button" 
                          class="outline-btn" 
                          *ngIf="suscripcionActual.estado === 'suspendida'"
                          (click)="solicitarReactivacion()"
                          [disabled]="suscripcionEnProgreso">
                    ✅ Solicitar reactivación
                  </button>
                  <button type="button" 
                          class="outline-btn contact-btn" 
                          *ngIf="suscripcionActual.estado === 'activa'"
                          (click)="contactarSoporte()">
                    💬 ¿Necesitas ayuda con tu plan?
                  </button>
                </div>

                <!-- Mensaje para suscripción cancelada -->
                <div class="cancelada-info" *ngIf="suscripcionActual.estado === 'cancelada'">
                  <p><strong>Esta suscripción ha sido cancelada.</strong></p>
                  <p *ngIf="suscripcionActual.motivo_cancelacion">Motivo: {{ suscripcionActual.motivo_cancelacion }}</p>
                  <p>Para reactivar tu servicio, contacta con nuestro equipo comercial.</p>
                  <a href="https://wa.me/573132865421?text=Hola,%20quiero%20reactivar%20mi%20suscripción%20de%20Tratios" 
                     target="_blank" 
                     class="primary-btn whatsapp-btn small">
                    Contactar soporte
                  </a>
                </div>
              </article>

              <!-- Historial de suscripciones -->
              <article class="form-card historial-card" *ngIf="historialSuscripciones.length > 1">
                <header>
                  <div>
                    <h2>Historial de suscripciones</h2>
                    <p>Registro de tus suscripciones anteriores.</p>
                  </div>
                </header>
                <div class="historial-list">
                  <div class="historial-item" *ngFor="let sus of historialSuscripciones">
                    <div class="historial-info">
                      <span class="historial-plan">{{ sus.plan?.nombre || 'Plan' }}</span>
                      <span class="historial-periodo">{{ sus.periodo | titlecase }}</span>
                      <span class="historial-estado" 
                            [class.activa]="sus.estado === 'activa'"
                            [class.suspendida]="sus.estado === 'suspendida'"
                            [class.cancelada]="sus.estado === 'cancelada'">
                        {{ sus.estado | titlecase }}
                      </span>
                    </div>
                    <div class="historial-fechas">
                      {{ sus.fecha_inicio | date:'shortDate' }} - {{ sus.fecha_fin | date:'shortDate' }}
                    </div>
                  </div>
                </div>
              </article>
            </div>
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
      border-radius: 14px;
      padding: 1.5rem;
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
      border: 1px solid rgba(203, 213, 225, 0.5);
    }

    .form-card.suscripcion-card {
      padding: 1rem;
      gap: 0.6rem;
    }

    .form-card.historial-card {
      padding: 1rem;
      gap: 0.6rem;
    }

    .form-card.historial-card header p {
      font-size: 0.8rem;
      margin-top: 0.15rem;
    }

    .form-card header h2 {
      margin: 0;
      font-size: 1.3rem;
      color: #1f2937;
    }

    .form-card header p {
      margin: 0.25rem 0 0;
      color: #4b5563;
      font-size: 0.9rem;
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

    /* Estilos de Suscripción mejorados - Compacto */
    .suscripcion-wrapper {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .empty-suscripcion {
      text-align: center;
    }

    .empty-state-large {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.5rem;
      padding: 1rem 0.75rem;
    }

    .empty-icon {
      font-size: 2rem;
      opacity: 0.8;
    }

    .empty-state-large h3 {
      margin: 0;
      font-size: 1.1rem;
      color: #1f2937;
    }

    .empty-state-large p {
      margin: 0;
      color: #6b7280;
      max-width: 400px;
      font-size: 0.9rem;
    }

    .whatsapp-btn {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      background: #25d366;
      color: white;
      margin-top: 0.35rem;
    }

    .whatsapp-btn:hover {
      background: #20bd5a;
    }

    .whatsapp-btn.small {
      padding: 0.5rem 1rem;
      font-size: 0.85rem;
    }

    .suscripcion-card {
      border-color: rgba(216, 155, 32, 0.3);
    }

    .suscripcion-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 0.5rem;
      padding-bottom: 0.6rem;
      border-bottom: 1px solid rgba(203, 213, 225, 0.5);
    }

    .plan-badge {
      background: linear-gradient(135deg, #6b7280, #4b5563);
      color: white;
      padding: 0.3rem 0.8rem;
      border-radius: 999px;
      font-weight: 700;
      font-size: 0.85rem;
      text-transform: uppercase;
      letter-spacing: 0.03em;
    }

    .plan-badge.basico {
      background: linear-gradient(135deg, #6b7280, #4b5563);
    }

    .plan-badge.pro {
      background: linear-gradient(135deg, #3b82f6, #2563eb);
    }

    .plan-badge.premium {
      background: linear-gradient(135deg, #d89b20, #b8860b);
    }

    .suscripcion-estado {
      padding: 0.25rem 0.6rem;
      border-radius: 999px;
      font-weight: 600;
      font-size: 0.75rem;
      text-transform: uppercase;
    }

    .suscripcion-estado.activa {
      background: rgba(22, 163, 74, 0.12);
      color: #15803d;
    }

    .suscripcion-estado.suspendida {
      background: rgba(245, 158, 11, 0.12);
      color: #b45309;
    }

    .suscripcion-estado.cancelada,
    .suscripcion-estado.inactiva {
      background: rgba(239, 68, 68, 0.12);
      color: #dc2626;
    }

    .suscripcion-details {
      display: grid;
      gap: 0.4rem;
      padding: 0.5rem 0;
    }

    .detail-row {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      padding: 0.25rem 0;
      border-bottom: 1px dashed rgba(203, 213, 225, 0.5);
    }

    .detail-row:last-child {
      border-bottom: none;
    }

    .detail-label {
      color: #6b7280;
      font-size: 0.8rem;
      font-weight: 500;
    }

    .detail-value {
      color: #1f2937;
      font-weight: 600;
      text-align: right;
      font-size: 0.85rem;
    }

    .detail-value.precio {
      color: #15803d;
      font-size: 0.95rem;
    }

    .precio-tachado {
      text-decoration: line-through;
      color: #9ca3af;
      font-size: 0.75rem;
      margin-right: 0.35rem;
    }

    .precio-con-descuento {
      color: #15803d;
      font-weight: 700;
    }

    .descuento-badge {
      display: inline-block;
      margin-left: 0.35rem;
      padding: 0.1rem 0.35rem;
      background: rgba(22, 163, 74, 0.15);
      color: #15803d;
      border-radius: 4px;
      font-size: 0.7rem;
      font-weight: 600;
    }

    .detail-value.vencida {
      color: #dc2626;
    }

    .detail-value.notas {
      font-weight: 400;
      font-style: italic;
      color: #4b5563;
    }

    .dias-restantes {
      display: inline-block;
      margin-left: 0.35rem;
      padding: 0.1rem 0.4rem;
      background: rgba(245, 158, 11, 0.15);
      color: #b45309;
      border-radius: 4px;
      font-size: 0.7rem;
      font-weight: 500;
    }

    .suscripcion-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
      padding-top: 0.6rem;
      border-top: 1px solid rgba(203, 213, 225, 0.5);
    }

    .renovar-btn {
      background: rgba(22, 163, 74, 0.08);
      border-color: #22c55e;
      color: #15803d;
      padding: 0.4rem 0.8rem;
      font-size: 0.85rem;
    }

    .renovar-btn:hover {
      background: rgba(22, 163, 74, 0.15);
    }

    .text-btn {
      background: transparent;
      border: none;
      padding: 0.35rem 0.75rem;
      font-weight: 600;
      font-size: 0.8rem;
      cursor: pointer;
      border-radius: 6px;
      transition: background 0.2s ease;
    }

    .text-btn.danger {
      color: #dc2626;
    }

    .text-btn.danger:hover {
      background: rgba(239, 68, 68, 0.08);
    }

    /* Botón de contacto/ayuda */
    .contact-btn {
      color: #64748b !important;
      border-color: #e2e8f0 !important;
      background: #f8fafc !important;
    }

    .contact-btn:hover {
      color: #25d366 !important;
      border-color: #25d366 !important;
      background: #f0fdf4 !important;
    }

    .text-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .cancelada-info {
      background: rgba(239, 68, 68, 0.06);
      border: 1px solid rgba(239, 68, 68, 0.2);
      border-radius: 8px;
      padding: 0.75rem;
      text-align: center;
    }

    .cancelada-info p {
      margin: 0 0 0.35rem;
      color: #6b7280;
      font-size: 0.85rem;
    }

    .cancelada-info p:first-child {
      color: #dc2626;
    }

    .historial-card header h2 {
      font-size: 1rem;
    }

    .historial-list {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .historial-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.5rem 0.75rem;
      background: #f8fafc;
      border-radius: 8px;
      border: 1px solid rgba(203, 213, 225, 0.5);
    }

    .historial-info {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      flex-wrap: wrap;
    }

    .historial-plan {
      font-weight: 600;
      color: #1f2937;
      font-size: 0.85rem;
    }

    .historial-periodo {
      color: #6b7280;
      font-size: 0.75rem;
    }

    .historial-estado {
      padding: 0.15rem 0.45rem;
      border-radius: 4px;
      font-size: 0.65rem;
      font-weight: 600;
      text-transform: uppercase;
    }

    .historial-estado.activa {
      background: rgba(22, 163, 74, 0.12);
      color: #15803d;
    }

    .historial-estado.suspendida {
      background: rgba(245, 158, 11, 0.12);
      color: #b45309;
    }

    .historial-estado.cancelada {
      background: rgba(239, 68, 68, 0.12);
      color: #dc2626;
    }

    .historial-fechas {
      color: #6b7280;
      font-size: 0.75rem;
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
  // Suscripciones de la empresa del usuario
  suscripcionActual: SuscripcionPlan | null = null;
  historialSuscripciones: SuscripcionPlan[] = [];

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

  constructor(
    private fb: FormBuilder, 
    private api: ApiService, 
    private authSession: AuthSessionService
  ) {
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
      this.suscripcionActual = null;
      this.historialSuscripciones = [];
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
    // Usar el nuevo endpoint que solo retorna las suscripciones de la empresa del usuario
    this.api.obtenerSuscripcionesPlan().subscribe({
      next: (suscripciones) => {
        // Ordenar por fecha de creación descendente
        const ordenadas = suscripciones.sort((a, b) => 
          new Date(b.creado_en).getTime() - new Date(a.creado_en).getTime()
        );
        
        // La suscripción actual es la más reciente activa o suspendida, o la más reciente en general
        this.suscripcionActual = ordenadas.find(s => s.estado === 'activa' || s.estado === 'suspendida') 
          || ordenadas[0] 
          || null;
        
        // Historial incluye todas las suscripciones
        this.historialSuscripciones = ordenadas;
        
        this.suscripcionesLoading = false;
        this.suscripcionesLoaded = true;
      },
      error: () => {
        this.suscripcionActual = null;
        this.historialSuscripciones = [];
        this.suscripcionesLoading = false;
        this.suscripcionesLoaded = false;
      }
    });
  }

  // Métodos auxiliares para suscripciones
  isVencida(fechaFin: string | null | undefined): boolean {
    if (!fechaFin) return false;
    return new Date(fechaFin) < new Date();
  }

  diasRestantes(fechaFin: string | null | undefined): number {
    if (!fechaFin) return 0;
    const hoy = new Date();
    const fin = new Date(fechaFin);
    const diff = fin.getTime() - hoy.getTime();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  }

  solicitarRenovacion(): void {
    if (!this.suscripcionActual) return;
    
    Swal.fire({
      title: 'Solicitar renovación',
      html: `
        <p>Para renovar tu suscripción del plan <strong>${this.suscripcionActual.plan?.nombre || 'actual'}</strong>, 
        contacta con nuestro equipo comercial a través de WhatsApp.</p>
        <p>Ellos te guiarán en el proceso de renovación y opciones de pago.</p>
      `,
      icon: 'info',
      showCancelButton: true,
      confirmButtonText: 'Contactar por WhatsApp',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#25d366'
    }).then(result => {
      if (result.isConfirmed) {
        const mensaje = encodeURIComponent(`Hola, quiero renovar mi suscripción del plan ${this.suscripcionActual?.plan?.nombre || ''} de Tratios. Mi empresa es ${this.suscripcionActual?.empresa?.nombre || ''}.`);
        window.open(`https://wa.me/573132865421?text=${mensaje}`, '_blank');
      }
    });
  }

  solicitarReactivacion(): void {
    if (!this.suscripcionActual) return;
    
    Swal.fire({
      title: 'Solicitar reactivación',
      html: `
        <p>Tu suscripción está actualmente <strong>suspendida</strong>.</p>
        <p>Para reactivarla, contacta con nuestro equipo comercial y ellos te ayudarán a resolver cualquier inconveniente.</p>
      `,
      icon: 'info',
      showCancelButton: true,
      confirmButtonText: 'Contactar por WhatsApp',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#25d366'
    }).then(result => {
      if (result.isConfirmed) {
        const mensaje = encodeURIComponent(`Hola, quiero reactivar mi suscripción suspendida de Tratios. Mi empresa es ${this.suscripcionActual?.empresa?.nombre || ''}.`);
        window.open(`https://wa.me/573132865421?text=${mensaje}`, '_blank');
      }
    });
  }

  contactarSoporte(): void {
    if (!this.suscripcionActual) return;
    
    const planNombre = this.suscripcionActual.plan?.nombre || 'N/A';
    const empresaNombre = this.suscripcionActual.empresa?.nombre || 'N/A';
    const userEmail = this.usuario?.email || 'N/A';
    
    const mensaje = `Hola, soy cliente de TRATIOS y me gustaría hablar sobre mi suscripción.

📋 *Detalles de mi cuenta:*
• Empresa: ${empresaNombre}
• Plan actual: ${planNombre}
• Email: ${userEmail}

Quisiera información sobre opciones disponibles para mi plan.`;
    
    const url = `https://wa.me/573132865421?text=${encodeURIComponent(mensaje)}`;
    window.open(url, '_blank');
  }

}

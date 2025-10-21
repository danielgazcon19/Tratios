import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AbstractControl, FormBuilder, FormGroup, ReactiveFormsModule, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs/operators';
import Swal from 'sweetalert2';
import { ApiService, OtpMethod, OtpSetupPayload } from '../../services/api.service';
import { toDataURL } from 'qrcode';

@Component({
  selector: 'app-registro',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  template: `
    <section class="page-section">
      <div class="auth-container">
        <ng-container *ngIf="!pendingOtpSetup; else otpSetupTemplate">
          <div class="auth-card card-surface">
            <header class="auth-header">
              <h2 class="auth-title">Crear cuenta</h2>
              <p class="auth-subtitle">Únete a nuestra plataforma de compraventa</p>
            </header>

            <form [formGroup]="form" (ngSubmit)="registrar()" class="auth-form" novalidate>
              <div class="form-field">
                <label for="nombre">Nombre completo</label>
                <input
                  id="nombre"
                  type="text"
                  formControlName="nombre"
                  placeholder="Tu nombre completo"
                  class="form-input"
                  [class.invalid]="isInvalid('nombre')"
                />
                <span class="field-error" *ngIf="isInvalid('nombre')">
                  El nombre es obligatorio.
                </span>
              </div>

              <div class="form-field">
                <label for="email">Correo electrónico</label>
                <input
                  id="email"
                  type="email"
                  autocomplete="email"
                  formControlName="email"
                  placeholder="nombre@ejemplo.com"
                  class="form-input"
                  [class.invalid]="isInvalid('email')"
                />
                <span class="field-error" *ngIf="isInvalid('email')">
                  Ingresa un correo electrónico válido.
                </span>
              </div>

              <div class="form-field">
                <label for="empresaId">ID o NIT de empresa asignada</label>
                <input
                  id="empresaId"
                  type="text"
                  autocomplete="off"
                  autocapitalize="off"
                  spellcheck="false"
                  maxlength="50"
                  formControlName="empresaId"
                  placeholder="Ingresa el código proporcionado por soporte"
                  class="form-input"
                  [class.invalid]="isInvalid('empresaId')"
                />
                <span class="field-error" *ngIf="isInvalid('empresaId')">
                  Usa el código alfanumérico de hasta 50 caracteres que recibiste para tu empresa.
                </span>
              </div>

              <div class="form-field password-field">
                <label for="password">Contraseña</label>
                <div class="password-wrapper">
                  <input
                    id="password"
                    [type]="showPassword ? 'text' : 'password'"
                    autocomplete="new-password"
                    formControlName="password"
                    placeholder="Mínimo 8 caracteres"
                    class="form-input"
                    [class.invalid]="isInvalid('password')"
                  />
                  <button type="button" class="toggle-btn" (click)="togglePasswordVisibility('password')">
                    {{ showPassword ? 'Ocultar' : 'Ver' }}
                  </button>
                </div>
                <span class="field-error" *ngIf="isInvalid('password')">
                  La contraseña debe tener al menos 8 caracteres, incluir mayúsculas, minúsculas, números y un carácter especial.
                </span>
              </div>

              <div class="form-field password-field">
                <label for="confirmPassword">Confirmar contraseña</label>
                <div class="password-wrapper">
                  <input
                    id="confirmPassword"
                    [type]="showConfirmPassword ? 'text' : 'password'"
                    autocomplete="new-password"
                    formControlName="confirmPassword"
                    placeholder="Repite tu contraseña"
                    class="form-input"
                    [class.invalid]="isInvalid('confirmPassword')"
                  />
                  <button type="button" class="toggle-btn" (click)="togglePasswordVisibility('confirmPassword')">
                    {{ showConfirmPassword ? 'Ocultar' : 'Ver' }}
                  </button>
                </div>
                <span class="field-error" *ngIf="isInvalid('confirmPassword')">
                  Debe coincidir con la contraseña y cumplir los requisitos de seguridad.
                </span>
              </div>

              <div class="form-field full-width">
                <label>Autenticación en dos pasos</label>
                <div class="auth-choice" role="radiogroup">
                  <label class="choice-option">
                    <input type="radio" formControlName="otpMethod" value="totp" />
                    <div>
                      <span class="choice-title">App autenticadora</span>
                      <span class="choice-badge">Recomendado</span>
                      <p class="choice-description">
                        Usa Google Authenticator, Microsoft Authenticator u otra app compatible para generar códigos temporales.
                      </p>
                    </div>
                  </label>

                  <label class="choice-option">
                    <input type="radio" formControlName="otpMethod" value="none" />
                    <div>
                      <span class="choice-title">Sin segundo factor</span>
                      <p class="choice-description">
                        Podrás habilitar autenticación en dos pasos más adelante desde tu cuenta.
                      </p>
                    </div>
                  </label>
                </div>
              </div>

              <div class="helper-box full-width" *ngIf="isTotpSelected">
                <h4>¿Cómo configurar tu app autenticadora?</h4>
                <ol>
                  <li>Instala una app autenticadora en tu celular si aún no la tienes.</li>
                  <li>Tras crear la cuenta te mostraremos el código secreto y un enlace para escanear.</li>
                  <li>Ingresa el código generado cada vez que inicies sesión.</li>
                </ol>
              </div>

              <button type="submit" class="primary-btn auth-submit full-width" [disabled]="loading">
                {{ loading ? 'Creando cuenta…' : 'Crear mi cuenta' }}
              </button>
            </form>

            <div class="auth-footer">
              <p>¿Ya tienes cuenta? <a routerLink="/login" class="auth-link">Inicia sesión aquí</a></p>
            </div>
          </div>
        </ng-container>

        <ng-template #otpSetupTemplate>
          <div class="auth-card card-surface otp-card">
            <header class="auth-header">
              <h2 class="auth-title">Protege tu cuenta</h2>
              <p class="auth-subtitle">
                Escanea el QR o usa el código manual en tu app autenticadora y confirma el primer código para activar la cuenta.
              </p>
            </header>

            <div class="otp-grid">
              <div class="otp-visual">
                <img *ngIf="qrDataUrl; else manualFallback" [src]="qrDataUrl" alt="Código QR para autenticación" />
                <ng-template #manualFallback>
                  <div class="manual-fallback">
                    <p>No pudimos generar el código QR automáticamente.</p>
                    <p>Introduce el código manual en tu app autenticadora.</p>
                  </div>
                </ng-template>
                <a
                  *ngIf="pendingOtpSetup?.provisioning_uri"
                  [href]="pendingOtpSetup?.provisioning_uri"
                  target="_blank"
                  rel="noreferrer"
                  class="qr-link"
                >
                  Abrir enlace en este dispositivo
                </a>
              </div>

              <div class="otp-details">
                <div class="manual-code" *ngIf="pendingOtpSetup?.secret">
                  <span class="manual-label">Código manual</span>
                  <p class="manual-value">{{ formattedSecret }}</p>
                  <button type="button" class="link-btn" (click)="copiarCodigoManual()">Copiar código</button>
                </div>

                <div class="backup-codes" *ngIf="pendingOtpSetup?.backup_codes?.length">
                  <span class="manual-label">Códigos de respaldo</span>
                  <ul>
                    <li *ngFor="let code of pendingOtpSetup?.backup_codes">{{ code }}</li>
                  </ul>
                  <p class="backup-helper">Guárdalos en un lugar seguro. Cada código se usa solo una vez si pierdes tu app.</p>
                </div>
              </div>
            </div>

            <form [formGroup]="otpForm" (ngSubmit)="confirmarOtp()" class="otp-form" novalidate>
              <label for="otpCode">Introduce el código de 6 dígitos generado por tu app</label>
              <input
                id="otpCode"
                type="text"
                inputmode="numeric"
                maxlength="6"
                formControlName="otpCode"
                placeholder="000000"
                class="form-input"
                [class.invalid]="isOtpInvalid"
              />
              <span class="field-error" *ngIf="isOtpInvalid">
                Introduce un código válido de 6 dígitos.
              </span>

              <button type="submit" class="primary-btn otp-submit" [disabled]="confirmingOtp">
                {{ confirmingOtp ? 'Verificando…' : 'Activar cuenta' }}
              </button>
            </form>

            <p class="otp-footer">
              Después de activarla, tu app autenticadora será necesaria en cada inicio de sesión.
            </p>
          </div>
        </ng-template>
      </div>
    </section>
  `,
  styles: [`
    :host {
      display: block;
    }

    .auth-container {
      display: flex;
      justify-content: center;
      align-items: flex-start;
      min-height: calc(100vh - 140px);
      padding: 4rem 1.5rem 3rem;
    }

    .auth-card {
      width: 100%;
      max-width: 720px;
      padding: 2.75rem 3rem;
      display: flex;
      flex-direction: column;
      gap: 1.75rem;
    }

    .auth-header {
      text-align: center;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .auth-title {
      margin: 0;
      font-size: 1.75rem;
      font-weight: 700;
      color: var(--color-text-primary);
      letter-spacing: -0.025em;
    }

    .auth-subtitle {
      margin: 0;
      color: var(--color-text-secondary);
      font-size: 0.95rem;
    }

    .auth-form {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
      gap: 1.25rem 1.5rem;
    }

    .auth-form > .full-width {
      grid-column: 1 / -1;
    }

    .form-field {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .form-field label {
      font-weight: 600;
      color: var(--color-text-primary);
      font-size: 0.9rem;
      letter-spacing: 0.025em;
    }

    .form-input {
      padding: 0.75rem 1rem;
      border: 1.5px solid rgba(216, 155, 32, 0.2);
      border-radius: 8px;
      font-size: 1rem;
      background: var(--color-surface);
      color: var(--color-text-primary);
      transition: all var(--transition-base);
    }

    .form-input:focus {
      outline: none;
      border-color: var(--color-accent-dark);
      box-shadow: 0 0 0 3px rgba(216, 155, 32, 0.1);
    }

    .form-input.invalid {
      border-color: #dc2626;
      box-shadow: 0 0 0 3px rgba(220, 38, 38, 0.12);
    }

    .field-error {
      margin: 0;
      color: #dc2626;
      font-size: 0.85rem;
    }

    .password-field {
      position: relative;
    }

    .password-wrapper {
      position: relative;
      display: flex;
      align-items: center;
    }

    .toggle-btn {
      position: absolute;
      right: 0.75rem;
      background: none;
      border: none;
      color: var(--color-accent-dark);
      font-weight: 600;
      cursor: pointer;
      padding: 0;
    }

    .toggle-btn:hover {
      color: var(--color-accent);
    }

    .auth-choice {
      display: flex;
      flex-direction: column;
      gap: 1rem;
      margin-top: 0.5rem;
    }

    .choice-option {
      display: flex;
      gap: 0.75rem;
      padding: 1rem;
      border: 1.5px solid rgba(216, 155, 32, 0.2);
      border-radius: 10px;
      cursor: pointer;
      transition: border-color var(--transition-base), box-shadow var(--transition-base);
    }

    .choice-option input[type="radio"] {
      margin-top: 0.25rem;
    }

    .choice-option:hover {
      border-color: var(--color-accent-dark);
      box-shadow: 0 0 0 3px rgba(216, 155, 32, 0.08);
    }

    .choice-title {
      display: inline-flex;
      font-weight: 600;
      color: var(--color-text-primary);
    }

    .choice-badge {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-size: 0.7rem;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      background: rgba(216, 155, 32, 0.15);
      color: var(--color-accent-dark);
      border-radius: 999px;
      padding: 0 0.4rem;
      margin-left: 0.5rem;
    }

    .choice-description {
      margin: 0.25rem 0 0;
      color: var(--color-text-secondary);
      font-size: 0.85rem;
    }

    .helper-box {
      background: rgba(216, 155, 32, 0.08);
      border: 1px solid rgba(216, 155, 32, 0.35);
      border-radius: 12px;
      padding: 1.1rem 1.25rem;
      color: var(--color-text-secondary);
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .helper-box h4 {
      margin: 0;
      font-size: 1rem;
      font-weight: 600;
      color: var(--color-text-primary);
    }

    .helper-box ol {
      margin: 0;
      padding-left: 1.25rem;
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
      font-size: 0.9rem;
    }

    .helper-box li {
      line-height: 1.4;
    }

    .form-input::placeholder {
      color: var(--color-muted);
    }

    .auth-submit {
      margin-top: 0.5rem;
      justify-self: stretch;
      font-weight: 600;
      letter-spacing: 0.025em;
    }

    .otp-card {
      max-width: 680px;
      gap: 2rem;
    }

    .otp-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
      gap: 1.5rem;
      align-items: start;
    }

    .otp-visual {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 1rem;
      text-align: center;
    }

    .otp-visual img {
      width: 220px;
      height: 220px;
      border-radius: 12px;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.12);
    }

    .manual-fallback {
      padding: 1rem;
      border: 1px dashed rgba(216, 155, 32, 0.45);
      border-radius: 12px;
      background: rgba(216, 155, 32, 0.08);
      color: var(--color-text-secondary);
    }

    .qr-link {
      font-weight: 600;
      color: var(--color-accent-dark);
      text-decoration: none;
    }

    .qr-link:hover {
      text-decoration: underline;
    }

    .otp-details {
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
    }

    .manual-code,
    .backup-codes {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      border: 1px solid rgba(216, 155, 32, 0.3);
      border-radius: 10px;
      padding: 1rem;
      background: rgba(216, 155, 32, 0.05);
    }

    .manual-label {
      font-size: 0.75rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: var(--color-text-secondary);
    }

    .manual-value {
      margin: 0;
      font-size: 1.2rem;
      font-weight: 600;
      letter-spacing: 0.18em;
      color: var(--color-text-primary);
    }

    .link-btn {
      align-self: flex-start;
      background: none;
      border: none;
      padding: 0;
      color: var(--color-accent-dark);
      font-weight: 600;
      cursor: pointer;
    }

    .link-btn:hover {
      text-decoration: underline;
      color: var(--color-accent);
    }

    .backup-codes ul {
      margin: 0;
      padding-left: 1.2rem;
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
      font-weight: 600;
      letter-spacing: 0.08em;
    }

    .backup-helper {
      margin: 0;
      font-size: 0.85rem;
      color: var(--color-text-secondary);
    }

    .otp-form {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .otp-submit {
      margin-top: 0.5rem;
      font-weight: 600;
    }

    .otp-footer {
      margin: 0;
      text-align: center;
      color: var(--color-text-secondary);
      font-size: 0.9rem;
    }

    .auth-footer {
      text-align: center;
      padding-top: 1rem;
      border-top: 1px solid rgba(216, 155, 32, 0.15);
    }

    .auth-footer p {
      margin: 0;
      color: var(--color-text-secondary);
      font-size: 0.9rem;
    }

    .auth-link {
      color: var(--color-accent-dark);
      text-decoration: none;
      font-weight: 600;
      transition: color var(--transition-base);
    }

    .auth-link:hover {
      color: var(--color-accent);
      text-decoration: underline;
    }

    @media (max-width: 720px) {
      .otp-card {
        max-width: 100%;
      }

      .otp-visual img {
        width: 200px;
        height: 200px;
      }

      .manual-value {
        font-size: 1.05rem;
      }
    }

    @media (max-width: 960px) {
      .auth-card {
        max-width: 640px;
        padding: 2.5rem;
      }
    }

    @media (max-width: 768px) {
      .auth-container {
        padding: 2.5rem 1rem;
        min-height: auto;
      }

      .auth-card {
        max-width: 100%;
        padding: 2.25rem;
      }

      .auth-form {
        grid-template-columns: 1fr;
        gap: 1.25rem;
      }
    }

    @media (max-width: 480px) {
      .auth-container {
        padding: 1.5rem 1rem;
      }

      .auth-card {
        padding: 2rem 1.25rem;
      }

      .auth-title {
        font-size: 1.5rem;
      }
    }
  `]
})
export class RegistroComponent {
  form: FormGroup;
  otpForm: FormGroup;
  submitted = false;
  otpSubmitted = false;
  showPassword = false;
  showConfirmPassword = false;
  loading = false;
  confirmingOtp = false;
  pendingOtpSetup: OtpSetupPayload | null = null;
  qrDataUrl: string | null = null;
  private readonly strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;
  private readonly empresaIdRegex = /^[A-Za-z0-9._-]{1,50}$/;

  constructor(private fb: FormBuilder, private api: ApiService, private router: Router) {
    this.form = this.fb.group({
    nombre: ['', [Validators.required]],
    email: ['', [Validators.required, Validators.email]],
    empresaId: ['', [Validators.required, Validators.maxLength(50), Validators.pattern(this.empresaIdRegex)]],
      password: ['', [Validators.required, Validators.pattern(this.strongPasswordRegex)]],
      confirmPassword: ['', [Validators.required, Validators.pattern(this.strongPasswordRegex), this.matchOtherValidator('password')]],
      otpMethod: ['totp', [Validators.required]]
    });

    this.form.get('password')?.valueChanges.subscribe(() => {
      this.form.get('confirmPassword')?.updateValueAndValidity({ emitEvent: false });
    });

    this.otpForm = this.fb.group({
      otpCode: ['', [Validators.required, Validators.pattern(/^[0-9]{6}$/)]]
    });
  }

  registrar() {
    this.submitted = true;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { nombre, email, password, empresaId, otpMethod } = this.form.value;
  const sanitizedNombre = (nombre || '').trim();
  const sanitizedEmail = (email || '').trim().toLowerCase();
    const rawEmpresaId = typeof empresaId === 'string' ? empresaId : String(empresaId ?? '');
    const empresaCodigo = rawEmpresaId.trim();

    if (!this.empresaIdRegex.test(empresaCodigo)) {
      this.form.get('empresaId')?.setErrors({ invalid: true });
      this.form.get('empresaId')?.markAsTouched();
      this.loading = false;
      return;
    }
    const selectedMethod = (otpMethod || 'totp') as OtpMethod;
    this.loading = true;

    this.api.registrar(sanitizedNombre, { email: sanitizedEmail, password }, empresaCodigo, selectedMethod).pipe(
      finalize(() => {
        this.loading = false;
      })
    ).subscribe({
      next: async (response) => {
        if (response?.otp_setup && selectedMethod === 'totp') {
          await this.prepareOtpSetup(response.otp_setup);
          await Swal.fire({
            icon: 'success',
            title: 'Cuenta creada',
            text: 'Ahora vincula tu app autenticadora y confirma el primer código para activar la cuenta.',
            confirmButtonText: 'Entendido'
          });
          return;
        }

        await Swal.fire({
          icon: 'success',
          title: 'Cuenta creada',
          text: 'Tu cuenta está lista. Inicia sesión para comenzar a usar la plataforma.',
          confirmButtonText: 'Ir a iniciar sesión'
        });

        this.resetAll();
        await this.router.navigate(['/login']);
      },
      error: async (error) => {
        let message = error?.error?.message || 'No se pudo completar el registro. Intenta nuevamente.';
        if (error?.status === 409) {
          message = 'La empresa ya tiene un usuario registrado. Contacta a soporte para habilitar el acceso.';
        }
        await Swal.fire({
          icon: 'error',
          title: 'Error al registrar',
          text: message,
          confirmButtonText: 'Entendido'
        });
      }
    });
  }

  isInvalid(field: string): boolean {
    const control = this.form.get(field);
    return !!control && control.invalid && (control.touched || this.submitted);
  }

  togglePasswordVisibility(field: 'password' | 'confirmPassword'): void {
    if (field === 'password') {
      this.showPassword = !this.showPassword;
    } else {
      this.showConfirmPassword = !this.showConfirmPassword;
    }
  }

  get isTotpSelected(): boolean {
    return (this.form.get('otpMethod')?.value || 'totp') !== 'none';
  }

  get isOtpInvalid(): boolean {
    const control = this.otpForm.get('otpCode');
    return !!control && control.invalid && (control.touched || this.otpSubmitted);
  }

  get formattedSecret(): string {
    const secret = this.pendingOtpSetup?.secret || '';
    return secret.replace(/(.{4})/g, '$1 ').trim();
  }

  confirmarOtp(): void {
    this.otpSubmitted = true;
    const control = this.otpForm.get('otpCode');
    if (!control || control.invalid || !this.pendingOtpSetup) {
      this.otpForm.markAllAsTouched();
      return;
    }

    const code = control.value as string;
    this.confirmingOtp = true;

    this.api.confirmarRegistroOtp(this.pendingOtpSetup.activation_token, code).pipe(
      finalize(() => {
        this.confirmingOtp = false;
      })
    ).subscribe({
      next: async () => {
        await Swal.fire({
          icon: 'success',
          title: 'Cuenta activada',
          text: 'La autenticación en dos pasos está lista. Inicia sesión para comenzar.',
          confirmButtonText: 'Ir a iniciar sesión'
        });

        this.resetAll();
        await this.router.navigate(['/login']);
      },
      error: async (error) => {
        const message = error?.error?.message || 'No pudimos validar el código. Revisa la app autenticadora e inténtalo de nuevo.';
        await Swal.fire({
          icon: 'error',
          title: 'Código inválido',
          text: message,
          confirmButtonText: 'Intentar otra vez'
        });
      }
    });
  }

  async copiarCodigoManual(): Promise<void> {
    const secret = this.pendingOtpSetup?.secret;
    if (!secret) {
      return;
    }

    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(secret);
        await Swal.fire({
          icon: 'success',
          title: 'Código copiado',
          text: 'Pégalo en tu app autenticadora para completar la configuración.',
          timer: 2200,
          showConfirmButton: false
        });
        return;
      }
      throw new Error('clipboard unavailable');
    } catch {
      await Swal.fire({
        icon: 'info',
        title: 'Copia manual',
        text: `Copia este código en tu app: ${secret}`,
        confirmButtonText: 'Entendido'
      });
    }
  }

  private async prepareOtpSetup(otpSetup: OtpSetupPayload): Promise<void> {
    this.pendingOtpSetup = otpSetup;
    this.otpSubmitted = false;
    this.confirmingOtp = false;
    this.qrDataUrl = null;

    this.otpForm.reset();
    this.otpForm.markAsPristine();
    this.otpForm.markAsUntouched();

    const uri = otpSetup.provisioning_uri;
    if (!uri) {
      return;
    }

    try {
      this.qrDataUrl = await toDataURL(uri, { width: 280, margin: 1 });
    } catch {
      this.qrDataUrl = null;
    }
  }

  private resetPrimaryForm(): void {
    this.form.reset({
      nombre: '',
      email: '',
      empresaId: '',
      password: '',
      confirmPassword: '',
      otpMethod: 'totp'
    });
    this.submitted = false;
    this.showPassword = false;
    this.showConfirmPassword = false;
    this.form.markAsPristine();
    this.form.markAsUntouched();
  }

  private resetAll(): void {
    this.resetPrimaryForm();
    this.pendingOtpSetup = null;
    this.qrDataUrl = null;
    this.otpSubmitted = false;
    this.confirmingOtp = false;
    this.otpForm.reset();
    this.otpForm.markAsPristine();
    this.otpForm.markAsUntouched();
  }

  private matchOtherValidator(otherControlName: string): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.parent) {
        return null;
      }

      const otherControl = control.parent.get(otherControlName);
      if (!otherControl) {
        return null;
      }

      if (!control.value || !otherControl.value) {
        return null;
      }

      const isMatch = control.value === otherControl.value;
      if (!isMatch) {
        const parentErrors = control.parent.errors || {};
        control.parent.setErrors({ ...parentErrors, mismatch: true });
        return { mismatch: true };
      }

      if (control.parent.hasError('mismatch')) {
        const { mismatch, ...rest } = control.parent.errors ?? {};
        control.parent.setErrors(Object.keys(rest).length ? rest : null);
      }

      return null;
    };
  }
}
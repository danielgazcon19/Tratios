import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ApiService, LoginPayload, LoginResponse, LoginSuccessResponse, OtpChallengeResponse } from '../../services/api.service';
import { AuthSessionService } from '../../services/auth-session.service';

type LoginVariant = 'page' | 'modal';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  template: `
    <ng-template #authContent>
      <header class="auth-header">
        <h2 class="auth-title">
          {{ requiresOtp ? 'Verificación en dos pasos' : 'Inicia sesión' }}
        </h2>
        <p class="auth-subtitle">
          {{ requiresOtp
            ? 'Introduce el código de tu app autenticadora o un código de respaldo.'
            : 'Accede con tu correo y contraseña para gestionar tu compraventa.'
          }}
        </p>
      </header>

      <form [formGroup]="form" (ngSubmit)="onSubmit()" class="auth-form" novalidate>
        <div class="form-field" *ngIf="!requiresOtp">
          <label for="email">Correo electrónico</label>
          <input
            id="email"
            type="email"
            autocomplete="email"
            formControlName="email"
            placeholder="nombre@ejemplo.com"
            class="form-input"
            [class.invalid]="submitted && form.controls['email'].invalid"
          />
          <span class="field-error" *ngIf="submitted && form.controls['email'].errors">
            Ingresa un correo válido.
          </span>
        </div>

        <div class="form-field" *ngIf="!requiresOtp">
          <label for="password">Contraseña</label>
          <input
            id="password"
            type="password"
            autocomplete="current-password"
            formControlName="password"
            placeholder="••••••••"
            class="form-input"
            [class.invalid]="submitted && form.controls['password'].invalid"
          />
          <span class="field-error" *ngIf="submitted && form.controls['password'].errors">
            La contraseña es obligatoria.
          </span>
        </div>

        <div class="form-field" *ngIf="requiresOtp">
          <label for="otpCode">Código de verificación</label>
          <input
            id="otpCode"
            type="text"
            inputmode="numeric"
            autocomplete="one-time-code"
            formControlName="otpCode"
            placeholder="000 000"
            class="form-input"
            [class.invalid]="submitted && form.controls['otpCode'].invalid"
          />
          <span class="field-error" *ngIf="submitted && form.controls['otpCode'].errors">
            Introduce el código de 6 dígitos.
          </span>
          <p class="helper-text" *ngIf="otpMethods?.length">
            Métodos disponibles: {{ otpMethods?.join(', ') }}
          </p>
        </div>

        <button type="submit" class="primary-btn auth-submit" [disabled]="loading">
          {{ loading ? 'Procesando…' : requiresOtp ? 'Confirmar código' : 'Iniciar sesión' }}
        </button>

        <button
          type="button"
          class="outline-btn auth-secondary"
          *ngIf="requiresOtp"
          (click)="resetOtpStep()"
          [disabled]="loading"
        >
          Volver a ingresar credenciales
        </button>
      </form>

      <div class="auth-messages">
        <p class="error-message" *ngIf="errorMessage">{{ errorMessage }}</p>
        <p class="success-message" *ngIf="successMessage">{{ successMessage }}</p>
      </div>

      <div class="auth-footer" *ngIf="!requiresOtp">
        <p>¿No tienes cuenta? <a routerLink="/registro" class="auth-link" (click)="onRegisterClick($event)">Regístrate aquí</a></p>
      </div>
      <div class="auth-footer" *ngIf="requiresOtp">
        <p>¿Sin acceso a tu app autenticadora? Usa uno de tus códigos de respaldo.</p>
      </div>
    </ng-template>

    <section *ngIf="variant === 'page'" class="page-section">
      <div class="auth-container">
        <div class="auth-card card-surface">
          <ng-container *ngTemplateOutlet="authContent"></ng-container>
        </div>
      </div>
    </section>

    <div *ngIf="variant === 'modal'" class="auth-modal-content">
      <ng-container *ngTemplateOutlet="authContent"></ng-container>
    </div>
  `,
  styles: [`
    :host {
      display: block;
    }

    .auth-container {
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 80vh;
      padding: 2rem 1rem;
    }

    .auth-card,
    .auth-modal-content {
      width: 100%;
      max-width: 420px;
      padding: 2.5rem;
      display: flex;
      flex-direction: column;
      gap: 2rem;
    }

    .auth-modal-content {
      padding: 0;
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
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
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
      border-radius: 10px;
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
      box-shadow: 0 0 0 3px rgba(220, 38, 38, 0.1);
    }

    .form-input::placeholder {
      color: var(--color-muted);
    }

    .field-error {
      color: #dc2626;
      font-size: 0.85rem;
      margin: 0;
    }

    .helper-text {
      margin: 0;
      color: var(--color-text-secondary);
      font-size: 0.85rem;
    }

    .auth-submit {
      margin-top: 0.5rem;
      justify-self: stretch;
      font-weight: 600;
      letter-spacing: 0.025em;
    }

    .auth-secondary {
      justify-content: center;
    }

    .auth-messages {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .error-message {
      margin: 0;
      color: #dc2626;
      font-weight: 600;
      font-size: 0.95rem;
    }

    .success-message {
      margin: 0;
      color: #15803d;
      font-weight: 600;
      font-size: 0.95rem;
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

    @media (max-width: 480px) {
      .auth-container {
        padding: 1rem;
        min-height: 70vh;
      }

      .auth-card {
        padding: 2rem 1.5rem;
      }

      .auth-title {
        font-size: 1.5rem;
      }
    }
  `]
})

export class LoginComponent implements OnInit {
  @Input() variant: LoginVariant = 'page';
  @Output() loginSuccess = new EventEmitter<LoginSuccessResponse>();
  @Output() cancel = new EventEmitter<void>();

  form: FormGroup;
  loading = false;
  submitted = false;
  requiresOtp = false;
  challengeToken = '';
  otpMethods: string[] | null = null;
  errorMessage = '';
  successMessage = '';

  constructor(
    private fb: FormBuilder,
    private api: ApiService,
    private router: Router,
    private route: ActivatedRoute,
    private authSession: AuthSessionService
  ) {
    this.form = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      otpCode: ['']
    });
  }

  ngOnInit(): void {
    this.route.queryParamMap.subscribe((params) => {
      if (params.get('sessionExpired') === '1') {
        this.successMessage = '';
        this.errorMessage = 'Tu sesión ha expirado por inactividad. Por favor, inicia sesión nuevamente.';
      }
    });
  }

  onSubmit(): void {
    this.submitted = true;
    this.errorMessage = '';
    this.successMessage = '';

    if (this.requiresOtp) {
      this.verifyOtp();
      return;
    }

    this.clearOtpValidators();

    if (this.form.invalid) {
      return;
    }

    const payload: LoginPayload = {
      email: this.form.value.email,
      password: this.form.value.password
    };

    this.loading = true;
    this.api.login(payload).subscribe({
      next: (response: LoginResponse) => {
        if ('requires_otp' in response && response.requires_otp) {
          this.setupOtpStep(response as OtpChallengeResponse);
        } else {
          this.handleSuccessfulLogin(response as LoginSuccessResponse);
        }
      },
      error: (err) => {
        this.loading = false;
        this.errorMessage = err?.error?.message || 'No se pudo iniciar sesión. Intenta nuevamente.';
      }
    });
  }

  resetOtpStep(): void {
    this.requiresOtp = false;
    this.challengeToken = '';
    this.otpMethods = null;
    this.submitted = false;
    this.form.get('otpCode')?.reset();
    this.clearOtpValidators();
    this.errorMessage = '';
    this.successMessage = '';
  }

  onCancel(): void {
    this.cancel.emit();
  }

  onRegisterClick(event: Event): void {
    if (this.variant === 'modal') {
      // Permite cerrar el modal cuando se navega desde la versión modal al registro.
      setTimeout(() => this.cancel.emit());
    }
  }

  private setupOtpStep(response: OtpChallengeResponse): void {
    this.requiresOtp = true;
    this.challengeToken = response.challenge_token;
    this.otpMethods = response.otp_methods;
    this.loading = false;
    this.successMessage = 'Introduce tu código de verificación para continuar.';

    const otpControl = this.form.get('otpCode');
    otpControl?.reset();
    otpControl?.setValidators([Validators.required, Validators.pattern(/^[0-9]{6}$/)]);
    otpControl?.updateValueAndValidity({ emitEvent: false });
  }

  private verifyOtp(): void {
    const otpControl = this.form.get('otpCode');
    otpControl?.setValidators([Validators.required, Validators.pattern(/^[0-9]{6}$/)]);
    otpControl?.updateValueAndValidity({ emitEvent: false });

    if (!otpControl || otpControl.invalid) {
      return;
    }

    const otpSanitized = this.sanitizeOtp(otpControl.value);
    this.loading = true;

    this.api.completeLoginWithOtp(this.challengeToken, otpSanitized).subscribe({
      next: (response) => this.handleSuccessfulLogin(response),
      error: (err) => {
        this.loading = false;
        this.errorMessage = err?.error?.message || 'Código inválido, intenta nuevamente.';
      }
    });
  }

  private handleSuccessfulLogin(response: LoginSuccessResponse): void {
    this.loading = false;
    this.requiresOtp = false;
    this.challengeToken = '';
    this.otpMethods = null;
    this.submitted = false;
    this.form.reset();
    this.clearOtpValidators();
    const session = this.authSession.storeSession(response);
    this.successMessage = '¡Inicio de sesión exitoso!';
    this.loginSuccess.emit(response);

    if (this.variant === 'page') {
      const redirectParam = this.route.snapshot.queryParamMap.get('redirectTo');
      const target = redirectParam && redirectParam.startsWith('/') ? redirectParam : '/cuenta';
      this.router.navigateByUrl(target);
    }
  }

  private sanitizeOtp(value: string | null | undefined): string {
    return (value || '').toString().replace(/\s+/g, '');
  }

  private clearOtpValidators(): void {
    const otpControl = this.form.get('otpCode');
    otpControl?.clearValidators();
    otpControl?.updateValueAndValidity({ emitEvent: false });
  }
}
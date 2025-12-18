import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AdminUsuariosService, Usuario, CrearUsuarioDto, ActualizarUsuarioDto } from '../../../services/admin-usuarios.service';
import { AdminEmpresasService, Empresa } from '../../../services/admin-empresas.service';
import { ApiService } from '../../../services/api.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-admin-usuarios',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, RouterLinkActive],
  templateUrl: './admin-usuarios.component.html',
  styleUrl: './admin-usuarios.component.css'
})
export class AdminUsuariosComponent implements OnInit {
  usuarios: Usuario[] = [];
  empresas: Empresa[] = [];
  cargando = false;
  
  // Paginación
  paginaActual = 1;
  itemsPorPagina = 10;
  totalPaginas = 0;
  totalItems = 0;
  
  // Exponer Math para el template
  Math = Math;
  
  // Filtros
  filtroSearch = '';
  filtroRol = '';
  filtroEstado = '';
  filtroEmpresa = '';
  
  // Modal de creación/edición
  mostrarModal = false;
  modoEdicion = false;
  usuarioSeleccionado: Usuario | null = null;
  
  formularioUsuario: any = {
    nombre: '',
    email: '',
    password: '',
    rol: 'cliente'
  };
  
  // Control de contraseña
  mostrarCambioPassword = false;
  nuevaPassword = '';
  confirmarPassword = '';

  // Control de validación de contraseña
  passwordValidation = {
    minLength: false,
    hasUppercase: false,
    hasLowercase: false,
    hasNumber: false,
    hasSpecialChar: false,
    passwordsMatch: false
  };

  // Localización
  paises: { code: string; name: string }[] = [];
  ciudades: { name: string; state?: string }[] = [];
  paisSeleccionado: string = '';
  cargandoPaises = false;
  cargandoCiudades = false;
  busquedaPais = '';

  constructor(
    private adminUsuariosService: AdminUsuariosService,
    private adminEmpresasService: AdminEmpresasService,
    private apiService: ApiService
  ) {}

  ngOnInit(): void {
    this.cargarUsuarios();
    this.cargarEmpresas();
    this.cargarPaises();
  }

  validatePassword(password: string, confirmPassword?: string) {
    this.passwordValidation.minLength = password.length >= 6;
    this.passwordValidation.hasUppercase = /[A-Z]/.test(password);
    this.passwordValidation.hasLowercase = /[a-z]/.test(password);
    this.passwordValidation.hasNumber = /\d/.test(password);
    this.passwordValidation.hasSpecialChar = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);
    
    if (confirmPassword !== undefined) {
      this.passwordValidation.passwordsMatch = password === confirmPassword && password.length > 0;
    }
  }

  isPasswordValid(): boolean {
    return this.passwordValidation.minLength &&
           this.passwordValidation.hasUppercase &&
           this.passwordValidation.hasLowercase &&
           this.passwordValidation.hasNumber &&
           this.passwordValidation.hasSpecialChar &&
           this.passwordValidation.passwordsMatch;
  }

  updateRequirementUI(elementId: string, isValid: boolean) {
    const element = document.getElementById(elementId);
    if (element) {
      const icon = element.querySelector('.requirement-icon');
      if (icon) {
        icon.textContent = isValid ? '✓' : '✗';
      }
      element.classList.remove('valid', 'invalid');
      element.classList.add(isValid ? 'valid' : 'invalid');
    }
  }

  cargarUsuarios(): void {
    this.cargando = true;
    
    const filtros: any = {
      page: this.paginaActual,
      per_page: this.itemsPorPagina
    };
    
    if (this.filtroSearch) filtros.search = this.filtroSearch;
    if (this.filtroRol) filtros.rol = this.filtroRol;
    if (this.filtroEstado) filtros.estado = this.filtroEstado;
    if (this.filtroEmpresa) filtros.empresa_id = parseInt(this.filtroEmpresa);
    
    this.adminUsuariosService.listarUsuarios(filtros).subscribe({
      next: (response) => {
        this.usuarios = response.usuarios;
        this.totalItems = response.pagination.total;
        this.totalPaginas = response.pagination.pages;
        this.paginaActual = response.pagination.page;
        this.cargando = false;
      },
      error: (error) => {
        console.error('Error al cargar usuarios:', error);
        Swal.fire('Error', 'No se pudieron cargar los usuarios', 'error');
        this.cargando = false;
      }
    });
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

  aplicarFiltros(): void {
    this.paginaActual = 1;
    this.cargarUsuarios();
  }

  limpiarFiltros(): void {
    this.filtroSearch = '';
    this.filtroRol = '';
    this.filtroEstado = '';
    this.filtroEmpresa = '';
    this.paginaActual = 1;
    this.cargarUsuarios();
  }

  cambiarPagina(pagina: number): void {
    if (pagina >= 1 && pagina <= this.totalPaginas) {
      this.paginaActual = pagina;
      this.cargarUsuarios();
    }
  }

  abrirModalCrear(): void {
    this.modoEdicion = false;
    this.usuarioSeleccionado = null;
    this.formularioUsuario = {
      nombre: '',
      email: '',
      password: '',
      rol: 'cliente'
    };
    this.confirmarPassword = '';
    // Resetear validaciones
    this.passwordValidation = {
      minLength: false,
      hasUppercase: false,
      hasLowercase: false,
      hasNumber: false,
      hasSpecialChar: false,
      passwordsMatch: false
    };
    // Resetear localización
    this.paisSeleccionado = '';
    this.ciudades = [];
    this.mostrarModal = true;
  }

  abrirModalEditar(usuario: Usuario): void {
    this.modoEdicion = true;
    this.usuarioSeleccionado = usuario;
    this.formularioUsuario = {
      nombre: usuario.nombre,
      email: usuario.email,
      rol: usuario.rol,
      empresa_id: usuario.empresa_id,
      telefono: usuario.telefono,
      direccion: usuario.direccion,
      ciudad: usuario.ciudad,
      pais: usuario.pais
    };
    
    // Si el usuario tiene un país, buscar su código y cargar ciudades
    if (usuario.pais) {
      const paisEncontrado = this.paises.find(p => p.name === usuario.pais);
      if (paisEncontrado) {
        this.paisSeleccionado = paisEncontrado.code;
        this.cargarCiudades(paisEncontrado.code);
      }
    }
    
    this.mostrarModal = true;
  }

  cerrarModal(): void {
    this.mostrarModal = false;
    this.modoEdicion = false;
    this.usuarioSeleccionado = null;
    this.mostrarCambioPassword = false;
    this.nuevaPassword = '';
  }

  guardarUsuario() {
    // Validar contraseña para nuevo usuario
    if (!this.modoEdicion && !this.isPasswordValid()) {
      Swal.fire({
        icon: 'error',
        title: 'Contraseña inválida',
        text: 'Por favor, asegúrate de que la contraseña cumpla con todos los requisitos.',
        confirmButtonText: 'Entendido'
      });
      return;
    }

    if (this.modoEdicion && this.usuarioSeleccionado) {
      this.actualizarUsuario();
    } else {
      this.crearUsuario();
    }
  }

  crearUsuario(): void {
    const datos = this.formularioUsuario as CrearUsuarioDto;
    
    if (!datos.nombre || !datos.email || !datos.password) {
      Swal.fire('Error', 'Nombre, email y contraseña son obligatorios', 'error');
      return;
    }

    this.adminUsuariosService.crearUsuario(datos).subscribe({
      next: (response) => {
        Swal.fire('Éxito', response.message, 'success');
        this.cargarUsuarios();
        this.cerrarModal();
      },
      error: (error) => {
        console.error('Error al crear usuario:', error);
        Swal.fire('Error', error.error.message || 'No se pudo crear el usuario', 'error');
      }
    });
  }

  actualizarUsuario(): void {
    if (!this.usuarioSeleccionado) return;
    
    const datos = this.formularioUsuario as ActualizarUsuarioDto;
    
    if (!datos.nombre || !datos.email) {
      Swal.fire('Error', 'Nombre y email son obligatorios', 'error');
      return;
    }

    this.adminUsuariosService.actualizarUsuario(this.usuarioSeleccionado.id, datos).subscribe({
      next: (response) => {
        Swal.fire('Éxito', response.message, 'success');
        this.cargarUsuarios();
        this.cerrarModal();
      },
      error: (error) => {
        console.error('Error al actualizar usuario:', error);
        Swal.fire('Error', error.error.message || 'No se pudo actualizar el usuario', 'error');
      }
    });
  }

  cambiarPasswordUsuario(usuario: Usuario): void {
    Swal.fire({
      title: '',
      html: `
        <style>
          .cambiar-password-modal {
            text-align: center;
            padding: 8px;
          }
          .password-header {
            margin-bottom: 24px;
          }
          .password-icon {
            width: 64px;
            height: 64px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 16px;
            font-size: 28px;
            color: white;
          }
          .password-title {
            font-size: 22px;
            font-weight: 600;
            color: #1f2937;
            margin: 0 0 8px 0;
          }
          .password-subtitle {
            font-size: 14px;
            color: #6b7280;
            margin: 0;
          }
          .usuario-info {
            background: #f9fafb;
            padding: 12px 16px;
            border-radius: 8px;
            margin: 20px 0;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            border: 1px solid #e5e7eb;
          }
          .usuario-info strong {
            color: #667eea;
          }
          .password-input-group {
            margin: 16px 0;
            text-align: left;
          }
          .password-input-group label {
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 13px;
            font-weight: 500;
            color: #4b5563;
            margin-bottom: 8px;
          }
          .password-input-wrapper {
            position: relative;
          }
          .password-input-wrapper i {
            position: absolute;
            left: 14px;
            top: 50%;
            transform: translateY(-50%);
            color: #9ca3af;
          }
          .password-input {
            width: 100%;
            padding: 12px 12px 12px 40px;
            border: 2px solid #e5e7eb;
            border-radius: 8px;
            font-size: 14px;
            transition: all 0.2s;
            box-sizing: border-box;
          }
          .password-input:focus {
            outline: none;
            border-color: #667eea;
            box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
          }
          .password-requirements-swal {
            background: #f8fafc;
            border: 1px solid #e5e7eb;
            border-radius: 8px;
            padding: 12px;
            margin: 16px 0;
            text-align: left;
            display: none;
          }
          .requirement-title-swal {
            font-size: 12px;
            font-weight: 600;
            color: #4b5563;
            margin: 0 0 8px 0;
          }
          .requirement-item-swal {
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 12px;
            padding: 4px 0;
            transition: all 0.2s;
          }
          .requirement-item-swal.valid {
            color: #16a34a;
          }
          .requirement-item-swal.invalid {
            color: #dc2626;
          }
          .requirement-item-swal i {
            font-size: 14px;
          }
          .swal2-validation-message {
            background: #fee2e2;
            color: #dc2626;
            border: 1px solid #fecaca;
            border-radius: 8px;
            padding: 10px;
            margin: 10px 0 0 0;
          }
        </style>
        <div class="cambiar-password-modal">
          <div class="password-header">
            <div class="password-icon">
              <i class="fas fa-key"></i>
            </div>
            <h3 class="password-title">Cambiar contraseña</h3>
            <p class="password-subtitle">Establece una nueva contraseña segura</p>
          </div>

          <div class="usuario-info">
            <i class="fas fa-user" style="color: #667eea;"></i>
            <span>Usuario: <strong>${usuario.nombre}</strong></span>
          </div>

          <div class="password-input-group">
            <label>
              <i class="fas fa-lock"></i>
              Nueva contraseña
            </label>
            <div class="password-input-wrapper">
              <i class="fas fa-key"></i>
              <input id="nueva-password" type="password" class="password-input" placeholder="••••••••">
            </div>
          </div>

          <div class="password-input-group">
            <label>
              <i class="fas fa-lock"></i>
              Confirmar contraseña
            </label>
            <div class="password-input-wrapper">
              <i class="fas fa-check"></i>
              <input id="confirmar-password" type="password" class="password-input" placeholder="••••••••">
            </div>
          </div>

          <div class="password-requirements-swal" id="password-requirements-swal">
            <div class="requirement-title-swal">La contraseña debe contener:</div>
            <div class="requirement-item-swal invalid" id="req-length">
              <i class="fas fa-times-circle"></i>
              <span>Al menos 6 caracteres</span>
            </div>
            <div class="requirement-item-swal invalid" id="req-upper">
              <i class="fas fa-times-circle"></i>
              <span>Una letra mayúscula (A-Z)</span>
            </div>
            <div class="requirement-item-swal invalid" id="req-lower">
              <i class="fas fa-times-circle"></i>
              <span>Una letra minúscula (a-z)</span>
            </div>
            <div class="requirement-item-swal invalid" id="req-num">
              <i class="fas fa-times-circle"></i>
              <span>Un número (0-9)</span>
            </div>
            <div class="requirement-item-swal invalid" id="req-special">
              <i class="fas fa-times-circle"></i>
              <span>Un carácter especial (!@#$%^&*)</span>
            </div>
            <div class="requirement-item-swal invalid" id="req-match">
              <i class="fas fa-times-circle"></i>
              <span>Las contraseñas coinciden</span>
            </div>
          </div>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: '<i class="fas fa-check"></i> Cambiar',
      cancelButtonText: '<i class="fas fa-times"></i> Cancelar',
      confirmButtonColor: '#667eea',
      cancelButtonColor: '#6b7280',
      width: '520px',
      didOpen: () => {
        const passwordInput = document.getElementById('nueva-password') as HTMLInputElement;
        const confirmInput = document.getElementById('confirmar-password') as HTMLInputElement;
        const requirementsBox = document.getElementById('password-requirements-swal');
        
        const updateRequirement = (id: string, isValid: boolean) => {
          const element = document.getElementById(id);
          if (element) {
            const icon = element.querySelector('i');
            if (icon) {
              icon.className = isValid ? 'fas fa-check-circle' : 'fas fa-times-circle';
            }
            element.className = isValid ? 'requirement-item-swal valid' : 'requirement-item-swal invalid';
          }
        };
        
        const validatePasswords = () => {
          const password = passwordInput?.value || '';
          const confirmPassword = confirmInput?.value || '';
          
          if (requirementsBox && password.length > 0) {
            requirementsBox.style.display = 'block';
          }
          
          const minLength = password.length >= 6;
          const hasUppercase = /[A-Z]/.test(password);
          const hasLowercase = /[a-z]/.test(password);
          const hasNumber = /\d/.test(password);
          const specialCharRegex = new RegExp('[!@#$%^&*()_+\\-=\\[\\]{};\':"\\\\|,.<>\\/?]');
          const hasSpecialChar = specialCharRegex.test(password);
          const passwordsMatch = password === confirmPassword && password.length > 0;
          
          updateRequirement('req-length', minLength);
          updateRequirement('req-upper', hasUppercase);
          updateRequirement('req-lower', hasLowercase);
          updateRequirement('req-num', hasNumber);
          updateRequirement('req-special', hasSpecialChar);
          updateRequirement('req-match', passwordsMatch);
        };
        
        if (passwordInput) {
          passwordInput.focus();
          passwordInput.addEventListener('input', validatePasswords);
        }
        
        if (confirmInput) {
          confirmInput.addEventListener('input', validatePasswords);
        }
      },
      preConfirm: () => {
        const password = (document.getElementById('nueva-password') as HTMLInputElement).value;
        const confirmPassword = (document.getElementById('confirmar-password') as HTMLInputElement).value;
        
        if (!password) {
          Swal.showValidationMessage('⚠️ La contraseña es obligatoria');
          return false;
        }
        
        if (password.length < 6) {
          Swal.showValidationMessage('⚠️ La contraseña debe tener al menos 6 caracteres');
          return false;
        }

        if (!/[A-Z]/.test(password)) {
          Swal.showValidationMessage('⚠️ Debe contener al menos una letra mayúscula');
          return false;
        }

        if (!/[a-z]/.test(password)) {
          Swal.showValidationMessage('⚠️ Debe contener al menos una letra minúscula');
          return false;
        }

        if (!/\d/.test(password)) {
          Swal.showValidationMessage('⚠️ Debe contener al menos un número');
          return false;
        }

        const specialCharRegex = new RegExp('[!@#$%^&*()_+\\-=\\[\\]{};\':"\\\\|,.<>\\/?]');
        if (!specialCharRegex.test(password)) {
          Swal.showValidationMessage('⚠️ Debe contener al menos un carácter especial');
          return false;
        }
        
        if (password !== confirmPassword) {
          Swal.showValidationMessage('⚠️ Las contraseñas no coinciden');
          return false;
        }
        
        return password;
      }
    }).then((result) => {
      if (result.isConfirmed && result.value) {
        this.adminUsuariosService.cambiarPassword(usuario.id, result.value).subscribe({
          next: (response) => {
            Swal.fire({
              icon: 'success',
              title: '¡Contraseña actualizada!',
              text: response.message,
              confirmButtonColor: '#667eea'
            });
          },
          error: (error) => {
            console.error('Error al cambiar contraseña:', error);
            Swal.fire({
              icon: 'error',
              title: 'Error',
              text: error.error.message || 'No se pudo cambiar la contraseña',
              confirmButtonColor: '#dc2626'
            });
          }
        });
      }
    });
  }

  toggleEstadoUsuario(usuario: Usuario): void {
    const accion = usuario.is_active ? 'inactivar' : 'activar';
    const iconColor = usuario.is_active ? '#dc2626' : '#16a34a';
    const icon = usuario.is_active ? 'fa-ban' : 'fa-check-circle';
    
    Swal.fire({
      title: '',
      html: `
        <style>
          .toggle-estado-modal {
            text-align: center;
            padding: 8px;
          }
          .toggle-icon {
            width: 64px;
            height: 64px;
            background: ${usuario.is_active ? '#fee2e2' : '#dcfce7'};
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 16px;
            font-size: 28px;
            color: ${iconColor};
          }
          .toggle-title {
            font-size: 22px;
            font-weight: 600;
            color: #1f2937;
            margin: 0 0 12px 0;
          }
          .toggle-message {
            font-size: 15px;
            color: #6b7280;
            margin: 0 0 20px 0;
          }
          .usuario-card {
            background: #f9fafb;
            padding: 16px;
            border-radius: 10px;
            border: 1px solid #e5e7eb;
            margin: 20px 0;
          }
          .usuario-card-nombre {
            font-size: 16px;
            font-weight: 600;
            color: #1f2937;
            margin: 0 0 4px 0;
          }
          .usuario-card-email {
            font-size: 14px;
            color: #6b7280;
            margin: 0;
          }
        </style>
        <div class="toggle-estado-modal">
          <div class="toggle-icon">
            <i class="fas ${icon}"></i>
          </div>
          <h3 class="toggle-title">¿${accion.charAt(0).toUpperCase() + accion.slice(1)} usuario?</h3>
          <p class="toggle-message">¿Estás seguro que deseas ${accion} al siguiente usuario?</p>
          <div class="usuario-card">
            <p class="usuario-card-nombre">${usuario.nombre}</p>
            <p class="usuario-card-email">${usuario.email}</p>
          </div>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: `<i class="fas ${icon}"></i> Sí, ${accion}`,
      cancelButtonText: '<i class="fas fa-times"></i> Cancelar',
      confirmButtonColor: iconColor,
      cancelButtonColor: '#6b7280',
      width: '480px'
    }).then((result) => {
      if (result.isConfirmed) {
        this.adminUsuariosService.toggleEstado(usuario.id).subscribe({
          next: (response) => {
            Swal.fire({
              icon: 'success',
              title: '¡Listo!',
              text: response.message,
              confirmButtonColor: '#667eea'
            });
            this.cargarUsuarios();
          },
          error: (error) => {
            console.error('Error al cambiar estado:', error);
            Swal.fire({
              icon: 'error',
              title: 'Error',
              text: error.error.message || 'No se pudo cambiar el estado',
              confirmButtonColor: '#dc2626'
            });
          }
        });
      }
    });
  }

  eliminarUsuario(usuario: Usuario): void {
    Swal.fire({
      title: '',
      html: `
        <style>
          .eliminar-modal {
            text-align: center;
            padding: 8px;
          }
          .eliminar-icon {
            width: 64px;
            height: 64px;
            background: #fee2e2;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 16px;
            font-size: 28px;
            color: #dc2626;
            animation: shake 0.5s;
          }
          @keyframes shake {
            0%, 100% { transform: translateX(0); }
            25% { transform: translateX(-10px); }
            75% { transform: translateX(10px); }
          }
          .eliminar-title {
            font-size: 22px;
            font-weight: 600;
            color: #1f2937;
            margin: 0 0 12px 0;
          }
          .eliminar-message {
            font-size: 15px;
            color: #6b7280;
            margin: 0 0 20px 0;
          }
          .usuario-card-delete {
            background: #f9fafb;
            padding: 16px;
            border-radius: 10px;
            border: 2px solid #fecaca;
            margin: 20px 0;
          }
          .usuario-card-delete-nombre {
            font-size: 16px;
            font-weight: 600;
            color: #1f2937;
            margin: 0 0 4px 0;
          }
          .usuario-card-delete-email {
            font-size: 14px;
            color: #6b7280;
            margin: 0;
          }
          .warning-box {
            background: #fef2f2;
            border: 2px solid #fecaca;
            border-radius: 10px;
            padding: 14px;
            margin-top: 20px;
          }
          .warning-box-content {
            display: flex;
            align-items: center;
            gap: 10px;
            color: #dc2626;
            font-size: 13px;
            font-weight: 600;
          }
          .warning-icon {
            font-size: 20px;
          }
        </style>
        <div class="eliminar-modal">
          <div class="eliminar-icon">
            <i class="fas fa-trash-alt"></i>
          </div>
          <h3 class="eliminar-title">¿Eliminar usuario?</h3>
          <p class="eliminar-message">¿Estás seguro que deseas eliminar permanentemente al siguiente usuario?</p>
          <div class="usuario-card-delete">
            <p class="usuario-card-delete-nombre">${usuario.nombre}</p>
            <p class="usuario-card-delete-email">${usuario.email}</p>
          </div>
          <div class="warning-box">
            <div class="warning-box-content">
              <span class="warning-icon">⚠️</span>
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
        this.adminUsuariosService.eliminarUsuario(usuario.id).subscribe({
          next: (response) => {
            Swal.fire({
              icon: 'success',
              title: '¡Usuario eliminado!',
              text: response.message,
              confirmButtonColor: '#667eea'
            });
            this.cargarUsuarios();
          },
          error: (error) => {
            console.error('Error al eliminar usuario:', error);
            Swal.fire({
              icon: 'error',
              title: 'Error',
              text: error.error.message || 'No se pudo eliminar el usuario',
              confirmButtonColor: '#dc2626'
            });
          }
        });
      }
    });
  }

  verDetalles(usuario: Usuario): void {
    const rolBadge = usuario.rol === 'admin' 
      ? '<span style="background: #dbeafe; color: #1e40af; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 600;">👑 ADMIN</span>'
      : '<span style="background: #dbeafe; color: #1e40af; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 600;">👤 CLIENTE</span>';
    
    const estadoBadge = usuario.is_active
      ? '<span style="background: #dcfce7; color: #16a34a; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 600;">✓ ACTIVO</span>'
      : '<span style="background: #fee2e2; color: #dc2626; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 600;">✕ INACTIVO</span>';

    const empresaHtml = usuario.empresa 
      ? `
        <div class="info-item">
          <span class="info-label">🏢 Empresa</span>
          <span class="info-value">${usuario.empresa.nombre}</span>
        </div>
        <div class="info-item">
          <span class="info-label">📄 NIT</span>
          <span class="info-value">${usuario.empresa.nit}</span>
        </div>
      ` 
      : `
        <div class="info-item">
          <span class="info-label">🏢 Empresa</span>
          <span class="info-value" style="color: #9ca3af;">Sin empresa asignada</span>
        </div>
      `;

    const contactoHtml = usuario.telefono || usuario.direccion || usuario.ciudad || usuario.pais
      ? `
        <div class="seccion">
          <h4>📞 Información de Contacto</h4>
          ${usuario.telefono ? `
            <div class="info-item">
              <span class="info-label">Teléfono</span>
              <span class="info-value">${usuario.telefono}</span>
            </div>
          ` : ''}
          ${usuario.direccion ? `
            <div class="info-item">
              <span class="info-label">Dirección</span>
              <span class="info-value">${usuario.direccion}</span>
            </div>
          ` : ''}
          ${usuario.ciudad || usuario.pais ? `
            <div class="info-item">
              <span class="info-label">Ubicación</span>
              <span class="info-value">${[usuario.ciudad, usuario.pais].filter(Boolean).join(', ')}</span>
            </div>
          ` : ''}
        </div>
      `
      : '';

    const fecha2faIcon = usuario.otp_enabled 
      ? '<i class="fas fa-shield-alt" style="color: #16a34a;"></i>'
      : '<i class="fas fa-shield-alt" style="color: #9ca3af;"></i>';
    
    const fecha2faText = usuario.otp_enabled 
      ? '<span style="color: #16a34a; font-weight: 600;">Habilitado</span>'
      : '<span style="color: #6b7280;">Deshabilitado</span>';

    Swal.fire({
      title: '',
      html: `
        <style>
          .detalle-usuario-modal {
            text-align: left;
            padding: 8px;
          }
          .usuario-header {
            text-align: center;
            padding: 20px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            margin: -20px -20px 24px -20px;
            border-radius: 12px 12px 0 0;
            color: white;
          }
          .usuario-avatar {
            width: 80px;
            height: 80px;
            background: rgba(255, 255, 255, 0.2);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 16px;
            font-size: 36px;
            backdrop-filter: blur(10px);
          }
          .usuario-nombre {
            font-size: 22px;
            font-weight: 600;
            margin: 0 0 8px 0;
            color: white;
          }
          .usuario-email {
            font-size: 14px;
            color: rgba(255, 255, 255, 0.9);
            margin: 0;
          }
          .badges-container {
            display: flex;
            gap: 8px;
            justify-content: center;
            margin-top: 12px;
          }
          .seccion {
            background: #f9fafb;
            padding: 16px;
            border-radius: 10px;
            margin-bottom: 16px;
            border: 1px solid #e5e7eb;
          }
          .seccion h4 {
            margin: 0 0 12px 0;
            font-size: 15px;
            font-weight: 600;
            color: #1f2937;
            display: flex;
            align-items: center;
            gap: 8px;
          }
          .info-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 10px 0;
            border-bottom: 1px solid #f3f4f6;
          }
          .info-item:last-child {
            border-bottom: none;
            padding-bottom: 0;
          }
          .info-label {
            font-weight: 500;
            color: #6b7280;
            font-size: 13px;
          }
          .info-value {
            font-weight: 600;
            color: #1f2937;
            font-size: 14px;
            text-align: right;
          }
          .fecha-badge {
            background: #eff6ff;
            color: #1e40af;
            padding: 8px 12px;
            border-radius: 8px;
            font-size: 13px;
            display: inline-flex;
            align-items: center;
            gap: 6px;
          }
        </style>
        <div class="detalle-usuario-modal">
          <div class="usuario-header">
            <div class="usuario-avatar">
              <i class="fas fa-user"></i>
            </div>
            <h3 class="usuario-nombre">${usuario.nombre}</h3>
            <p class="usuario-email">${usuario.email}</p>
            <div class="badges-container">
              ${rolBadge}
              ${estadoBadge}
            </div>
          </div>

          <div class="seccion">
            <h4>💼 Información General</h4>
            ${empresaHtml}
            <div class="info-item">
              <span class="info-label">🔐 Autenticación 2FA</span>
              <span class="info-value">${fecha2faIcon} ${fecha2faText}</span>
            </div>
            <div class="info-item">
              <span class="info-label">📅 Usuario desde</span>
              <span class="info-value">
                <span class="fecha-badge">
                  <i class="far fa-calendar"></i>
                  ${new Date(usuario.creado_en).toLocaleDateString('es-CO', { 
                    day: '2-digit', 
                    month: 'short', 
                    year: 'numeric'
                  })}
                </span>
              </span>
            </div>
          </div>

          ${contactoHtml}
        </div>
      `,
      showConfirmButton: true,
      confirmButtonText: 'Cerrar',
      confirmButtonColor: '#667eea',
      width: '520px',
      customClass: {
        popup: 'detalle-usuario-popup'
      }
    });
  }

  getRolBadgeClass(rol: string): string {
    return rol === 'admin' ? 'badge-primary' : 'badge-info';
  }

  getEstadoBadgeClass(is_active: boolean): string {
    return is_active ? 'badge-success' : 'badge-secondary';
  }

  getPaginaArray(): number[] {
    const pages: number[] = [];
    const maxPagesToShow = 5;
    let start = Math.max(1, this.paginaActual - Math.floor(maxPagesToShow / 2));
    let end = Math.min(this.totalPaginas, start + maxPagesToShow - 1);
    
    if (end - start < maxPagesToShow - 1) {
      start = Math.max(1, end - maxPagesToShow + 1);
    }
    
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    
    return pages;
  }

  // Métodos de localización
  cargarPaises(): void {
    this.cargandoPaises = true;
    this.apiService.obtenerPaises().subscribe({
      next: (response: any) => {
        this.paises = response.countries || [];
        this.cargandoPaises = false;
      },
      error: (error: any) => {
        console.error('Error al cargar países:', error);
        this.cargandoPaises = false;
        Swal.fire('Error', 'No se pudieron cargar los países', 'error');
      }
    });
  }

  buscarPaises(): void {
    if (!this.busquedaPais || this.busquedaPais.length < 2) {
      this.cargarPaises();
      return;
    }

    this.cargandoPaises = true;
    this.apiService.buscarPaises(this.busquedaPais).subscribe({
      next: (response: any) => {
        this.paises = response.countries || [];
        this.cargandoPaises = false;
      },
      error: (error: any) => {
        console.error('Error al buscar países:', error);
        this.cargandoPaises = false;
      }
    });
  }

  onPaisChange(): void {
    this.ciudades = [];
    this.formularioUsuario.ciudad = '';
    
    if (!this.paisSeleccionado) {
      this.formularioUsuario.pais = '';
      return;
    }

    // Buscar el nombre del país seleccionado
    const pais = this.paises.find(p => p.code === this.paisSeleccionado);
    if (pais) {
      this.formularioUsuario.pais = pais.name;
      this.cargarCiudades(this.paisSeleccionado);
    }
  }

  cargarCiudades(countryCode: string): void {
    this.cargandoCiudades = true;
    this.apiService.obtenerCiudades(countryCode).subscribe({
      next: (response: any) => {
        this.ciudades = response.cities || [];
        this.cargandoCiudades = false;
      },
      error: (error: any) => {
        console.error('Error al cargar ciudades:', error);
        this.cargandoCiudades = false;
        Swal.fire('Aviso', 'No se pudieron cargar las ciudades. Puedes escribirla manualmente.', 'info');
      }
    });
  }

  onCiudadChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    this.formularioUsuario.ciudad = select.value;
  }
}

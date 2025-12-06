import { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';
import { adminGuard } from './guards/admin.guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/landing/landing.component').then(m => m.LandingComponent),
    children: [
      { path: 'funcionalidades', loadComponent: () => import('./pages/funcionalidades/funcionalidades.component').then(m => m.FuncionalidadesComponent) },
      { path: 'planes', loadComponent: () => import('./pages/planes/planes.component').then(m => m.PlanesComponent) },
      { path: 'acerca', loadComponent: () => import('./pages/acerca/acerca.component').then(m => m.AcercaComponent) },
      { path: 'preguntas', loadComponent: () => import('./pages/preguntas/preguntas.component').then(m => m.PreguntasComponent) },
    ]
  },
  { path: 'login', loadComponent: () => import('./pages/auth/login.component').then(m => m.LoginComponent) },
  { path: 'registro', loadComponent: () => import('./pages/auth/registro.component').then(m => m.RegistroComponent) },
  { path: 'cuenta', loadComponent: () => import('./pages/account/account.component').then(m => m.AccountComponent), canActivate: [authGuard] },
  
  // Rutas legales
  { path: 'terminos-condiciones', loadComponent: () => import('./pages/legal/terminos-condiciones/terminos-condiciones.component').then(m => m.TerminosCondicionesComponent) },
  { path: 'politica-privacidad', loadComponent: () => import('./pages/legal/politica-privacidad/politica-privacidad.component').then(m => m.PoliticaPrivacidadComponent) },
  { path: 'acuerdo-servicio', loadComponent: () => import('./pages/legal/acuerdo-servicio/acuerdo-servicio.component').then(m => m.AcuerdoServicioComponent) },
  
  // Rutas de administración (solo para usuarios con rol 'admin')
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
        loadComponent: () => import('./pages/admin/admin-empresas/admin-empresas.component').then(m => m.AdminEmpresasComponent) 
      },
      { 
        path: 'suscripciones', 
        loadComponent: () => import('./pages/admin/admin-suscripciones/admin-suscripciones.component').then(m => m.AdminSuscripcionesComponent) 
      },
      { 
        path: 'planes', 
        loadComponent: () => import('./pages/admin/admin-planes/admin-planes.component').then(m => m.AdminPlanesComponent) 
      },
      { 
        path: 'servicios', 
        loadComponent: () => import('./pages/admin/admin-servicios/admin-servicios.component').then(m => m.AdminServiciosComponent) 
      },
      { 
        path: 'plan-servicios', 
        loadComponent: () => import('./pages/admin/admin-plan-servicios/admin-plan-servicios.component').then(m => m.AdminPlanServiciosComponent) 
      },
      { 
        path: 'soporte', 
        loadComponent: () => import('./pages/admin/admin-soporte/admin-soporte.component').then(m => m.AdminSoporteComponent) 
      }
    ]
  },
  
  { path: '**', redirectTo: '' }
];

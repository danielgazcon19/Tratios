import { Component, inject, OnInit, HostListener } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { LoginComponent } from './pages/auth/login.component';
import { LoginSuccessResponse } from './services/api.service';
import { AuthSessionService } from './services/auth-session.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, CommonModule, LoginComponent],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
  host: {
    '(document:click)': 'onDocumentClick($event)'
  }
})
export class AppComponent implements OnInit {
  showLoginModal = false;
  menuOpen = false;
  userMenuOpen = false;
  currentUser: LoginSuccessResponse['usuario'] | null = null;
  private router = inject(Router);
  private authSession = inject(AuthSessionService);

  ngOnInit() {
    // Suscribirse a cambios en el usuario (login/logout)
    this.authSession.currentUser$.subscribe(user => {
      this.currentUser = user;
    });
  }

  // Cerrar menú de usuario al hacer clic fuera
  onDocumentClick(event: MouseEvent) {
    const target = event.target as HTMLElement;
    const userMenuContainer = target.closest('.user-menu-container');
    
    if (!userMenuContainer && this.userMenuOpen) {
      this.userMenuOpen = false;
    }
  }

  openLoginModal() {
    this.showLoginModal = true;
  }
  
  closeLoginModal() {
    this.showLoginModal = false;
  }

  toggleMenu() {
    this.menuOpen = !this.menuOpen;
  }

  closeMenu() {
    this.menuOpen = false;
  }

  toggleUserMenu() {
    this.userMenuOpen = !this.userMenuOpen;
  }

  closeUserMenu() {
    this.userMenuOpen = false;
  }

  goToAccount() {
    this.closeUserMenu();
    this.closeMenu();
    this.router.navigate(['/cuenta']);
  }

  goToAdmin() {
    this.closeUserMenu();
    this.closeMenu();
    this.router.navigate(['/admin/empresas']);
  }

  logout() {
    this.authSession.clearSession(); // Esto automáticamente actualiza currentUser$ a null
    this.closeUserMenu();
    this.closeMenu();
    this.router.navigate(['/']);
  }

  handleLoginSuccess(response: LoginSuccessResponse) {
    this.authSession.storeSession(response); // Esto automáticamente actualiza currentUser$
    this.closeLoginModal();
    this.router.navigate(['/cuenta']);
  }

  scrollToSection(sectionId: string) {
    this.closeMenu();

    const extras = { fragment: sectionId, queryParamsHandling: 'preserve' as const };
    const onLanding =
      this.router.url === '/' ||
      this.router.url === '' ||
      this.router.url.startsWith('/#') ||
      this.router.url.startsWith('/?');

    const navigatePromise = onLanding
      ? this.router.navigate([], extras)
      : this.router.navigate([''], extras);

    const attemptScroll = (tries = 0) => {
      const element = document.getElementById(sectionId);
      if (element) {
        const yOffset = -90;
        const y = element.getBoundingClientRect().top + window.pageYOffset + yOffset;
        window.scrollTo({ top: y, behavior: 'smooth' });
      } else if (tries < 5) {
        setTimeout(() => attemptScroll(tries + 1), 75);
      }
    };

    navigatePromise
      .catch(() => void 0)
      .finally(() => {
        setTimeout(() => attemptScroll(), 50);
      });
  }
}

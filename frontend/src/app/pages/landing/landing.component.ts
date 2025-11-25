import { Component, OnInit, OnDestroy } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { PlanesComponent } from '../planes/planes.component';
import { FuncionalidadesComponent } from '../funcionalidades/funcionalidades.component';
import { AcercaComponent } from '../acerca/acerca.component';
import { PreguntasComponent } from '../preguntas/preguntas.component';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [RouterLink, CommonModule, PlanesComponent, FuncionalidadesComponent, AcercaComponent, PreguntasComponent],
  templateUrl: './landing.component.html',
  styleUrls: ['./landing.component.css']
})
export class LandingComponent implements OnInit, OnDestroy {
  images = [
    {
      src: 'assets/visor-landing/control-total.png',
      title: 'Control Total',
      description: 'Gestiona tu inventario y contratos desde un solo lugar'
    },
    {
      src: 'assets/visor-landing/facturacion.png',
      title: 'Facturación Automática',
      description: 'Genera reportes y facturas en segundos'
    },
    {
      src: 'assets/visor-landing/alertas.png',
      title: 'Alertas Inteligentes',
      description: 'Recordatorios de vencimientos y pagos pendientes'
    },
    {
      src: 'assets/visor-landing/acceso-nube.png',
      title: 'Acceso en la Nube',
      description: 'Disponible desde cualquier dispositivo, donde estés'
    },
    {
      src: 'assets/visor-landing/seguridad.png',
      title: 'Seguridad Avanzada',
      description: 'Protege tu información con encriptación de nivel bancario'
    },
    {
      src: 'assets/visor-landing/pagos.png',
      title: 'Múltiples Métodos de Pago',
      description: 'Acepta pagos con tarjeta, transferencia y más'
    },
    {
      src: 'assets/visor-landing/ventas.png',
      title: 'Aumenta tus Ventas',
      description: 'Toma decisiones con datos en tiempo real'
    }
  ];

  // Word Cloud - Servicios destacados (optimizado)
  serviceWords = [
    { text: 'Inventario', size: 1.4, color: 'primary', angle: -5 },
    { text: 'Facturación', size: 1.1, color: 'accent', angle: 3 },
    { text: 'Reportes', size: 0.9, color: 'secondary', angle: -2 },
    { text: 'Alertas', size: 1, color: 'primary', angle: 4 },
    { text: 'Seguridad', size: 1.2, color: 'accent', angle: -3 },
    { text: 'Contratos', size: 1.5, color: 'secondary', angle: 2 },
    { text: 'Pagos', size: 1.1, color: 'primary', angle: -4 },
    { text: 'Dashboard', size: 0.8, color: 'accent', angle: 5 },
    { text: 'Análisis', size: 0.9, color: 'secondary', angle: -2 },
    { text: 'Automatización', size: 0.8, color: 'primary', angle: 3 },
    { text: 'Control', size: 1, color: 'accent', angle: -3 },
    { text: 'Nube', size: 0.75, color: 'secondary', angle: 4 },
    { text: 'Entregas', size: 0.85, color: 'primary', angle: -1 },
    { text: 'Productos', size: 0.9, color: 'accent', angle: 2 },
    { text: 'Clientes', size: 1.2, color: 'secondary', angle: -5 },
    { text: 'Ventas', size: 1.3, color: 'primary', angle: 1 },
    { text: 'Caja', size: 0.8, color: 'accent', angle: -4 },
    { text: 'Infracciones', size: 0.7, color: 'secondary', angle: 3 },
    { text: 'CMR', size: 1, color: 'primary', angle: -2 },
    { text: 'Migracion', size: 0.9, color: 'accent', angle: 4 },
    { text: 'Soporte', size: 1.1, color: 'secondary', angle: -3 }
  ];

  currentImageIndex = 0;
  private autoSlideInterval: any;
  private readonly AUTO_SLIDE_DURATION = 5000; // 5 segundos

  ngOnInit() {
    this.startAutoSlide();
  }

  ngOnDestroy() {
    this.stopAutoSlide();
  }

  private startAutoSlide() {
    this.autoSlideInterval = setInterval(() => {
      this.nextImage();
    }, this.AUTO_SLIDE_DURATION);
  }

  private stopAutoSlide() {
    if (this.autoSlideInterval) {
      clearInterval(this.autoSlideInterval);
    }
  }

  private restartAutoSlide() {
    this.stopAutoSlide();
    this.startAutoSlide();
  }

  nextImage() {
    this.currentImageIndex = (this.currentImageIndex + 1) % this.images.length;
  }

  prevImage() {
    this.currentImageIndex = this.currentImageIndex === 0 
      ? this.images.length - 1 
      : this.currentImageIndex - 1;
    this.restartAutoSlide();
  }

  goToImage(index: number) {
    this.currentImageIndex = index;
    this.restartAutoSlide();
  }

  onSliderMouseEnter() {
    this.stopAutoSlide();
  }

  onSliderMouseLeave() {
    this.startAutoSlide();
  }

  scrollToSection(sectionId: string) {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }
}
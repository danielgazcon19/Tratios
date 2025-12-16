import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-acuerdo-servicio',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './acuerdo-servicio.component.html',
  styleUrls: ['./acuerdo-servicio.component.css']
})
export class AcuerdoServicioComponent {
  lastUpdate = '3 de diciembre de 2025';

  severityLevels = [
    {
      level: 'Crítica',
      color: '#7c2d12',
      bgColor: '#fafafa',
      days: 'Hábiles y no hábiles',
      response: ['Respuesta en 4 horas'],
      description: 'Todos los fallos críticos que no permitan la conexión, interacción o respuesta con el API, plataforma web o software. Caída completa del sistema o funcionalidad crítica inoperante que afecta a todos los usuarios.'
    },
    {
      level: 'Alta',
      color: '#991b1b',
      bgColor: '#fafafa',
      days: 'Hábiles y no hábiles',
      response: ['Respuesta en 12 horas'],
      description: 'Fallas graves que afectan significativamente el funcionamiento del sistema pero existe una solución alternativa temporal. Afecta a múltiples usuarios o funcionalidades importantes.'
    },
    {
      level: 'Media',
      color: '#b45309',
      bgColor: '#fafafa',
      days: 'Hábiles',
      response: ['Respuesta en 48 horas'],
      description: 'Fallas en el proceso de experiencia relacionados con funcionalidades parciales o características que no afectan el objetivo principal de la plataforma. Afecta a usuarios específicos o funcionalidades no críticas.'
    },
    {
      level: 'Baja',
      color: '#166534',
      bgColor: '#fafafa',
      days: 'Hábiles',
      response: ['Respuesta en 72 horas'],
      description: 'Requerimientos de actualización en imagen, logos, cambios de textos, asesoría o preguntas frecuentes. Mejoras menores o ajustes estéticos que no afectan la operación.'
    }
  ];
}

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
      level: 'Alta',
      color: '#991b1b',
      bgColor: '#fafafa',
      days: 'Hábiles y no hábiles',
      response: [
        'Día y hora hábil: Una (1) hora para dar respuesta.',
        'Día hábil y hora no hábil: Se da respuesta al siguiente día a partir de las 8am.',
        'Día no hábil: Si la solicitud se hace de 8am a 8pm se da respuesta en dos (2) horas, si la solicitud se realiza después de las 8pm, se da respuesta al día siguiente a partir de las 8am.'
      ],
      description: 'Todos los fallos críticos que no permitan la conexión, interacción o respuesta con el API, plataforma web o software.'
    },
    {
      level: 'Media',
      color: '#b45309',
      bgColor: '#fafafa',
      days: 'Hábiles',
      response: ['Cuatro (4) horas hábiles.'],
      description: 'Fallas en el proceso de experiencia relacionados con funcionalidades parciales o características que no afectan el objetivo principal de la plataforma.'
    },
    {
      level: 'Baja',
      color: '#166534',
      bgColor: '#fafafa',
      days: 'Hábiles',
      response: ['Seis (6) horas hábiles.'],
      description: 'Requerimientos de actualización en imagen, logos, cambios de textos, asesoría o preguntas frecuentes.'
    }
  ];
}

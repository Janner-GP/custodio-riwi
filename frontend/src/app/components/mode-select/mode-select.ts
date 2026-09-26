import { Component, inject } from '@angular/core';
import { ApiService } from '../../services/api.service';
import { ModeService } from '../../services/mode.service';
import { VoiceService } from '../../services/voice.service';

@Component({
  selector: 'app-mode-select',
  standalone: true,
  templateUrl: './mode-select.html',
})
export class ModeSelect {
  api = inject(ApiService);
  mode = inject(ModeService);
  voice = inject(VoiceService);

  constructor() {
    this.verificarVoz();
  }

  verificarVoz() {
    this.api.disponibilidadVoz.set(null);
    this.api.consultarDisponibilidadVoz().subscribe({
      next: (estado) => this.api.disponibilidadVoz.set(estado),
      error: () => this.api.disponibilidadVoz.set({ available: false, reason: 'unavailable' }),
    });
  }
}

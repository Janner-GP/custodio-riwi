import { Component, inject } from '@angular/core';
import { Avatar } from './components/avatar/avatar';
import { Chat } from './components/chat/chat';
import { ModeSelect } from './components/mode-select/mode-select';
import { Personalidad } from './components/personalidad/personalidad';
import { ApiService } from './services/api.service';
import { ModeService } from './services/mode.service';
import { VoiceService } from './services/voice.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [Avatar, Chat, Personalidad, ModeSelect],
  templateUrl: './app.html',
})
export class App {
  voice = inject(VoiceService);
  api = inject(ApiService);
  mode = inject(ModeService);

  constructor() {
    // Si el navegador recuerda el modo voz, no montamos el chat hasta verificar la cuota.
    if (this.mode.modo() === 'voz') this.verificarDisponibilidadVoz();
  }

  verificarDisponibilidadVoz() {
    this.api.disponibilidadVoz.set(null);
    this.api.consultarDisponibilidadVoz().subscribe({
      next: (estado) => {
        this.api.disponibilidadVoz.set(estado);
        if (!estado.available && this.mode.modo() === 'voz') {
          this.voice.detener();
          this.mode.cambiar();
        }
      },
      error: () => {
        this.api.disponibilidadVoz.set({ available: false, reason: 'unavailable' });
        if (this.mode.modo() === 'voz') {
          this.voice.detener();
          this.mode.cambiar();
        }
      },
    });
  }
}

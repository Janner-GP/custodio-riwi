import { Component, inject } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { Avatar } from './components/avatar/avatar';
import { ApiService } from './services/api.service';
import { ModeService } from './services/mode.service';
import { VoiceService } from './services/voice.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [Avatar, RouterOutlet],
  templateUrl: './app.html',
})
export class App {
  voice = inject(VoiceService);
  api = inject(ApiService);
  mode = inject(ModeService);
  private router = inject(Router);

  salirModo() {
    this.voice.detener();
    this.mode.cambiar();
    this.router.navigateByUrl('/');
  }
}

import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ModeService } from '../../services/mode.service';
import { VoiceService } from '../../services/voice.service';

@Component({
  selector: 'app-mode-select',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './mode-select.html',
})
export class ModeSelect {
  mode = inject(ModeService);
  voice = inject(VoiceService);

  constructor() {
    this.mode.cambiar();
  }
}

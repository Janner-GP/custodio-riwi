import { Component, inject } from '@angular/core';
import { ModeService } from '../../services/mode.service';
import { VoiceService } from '../../services/voice.service';

@Component({
  selector: 'app-mode-select',
  standalone: true,
  templateUrl: './mode-select.html',
})
export class ModeSelect {
  mode = inject(ModeService);
  voice = inject(VoiceService);
}

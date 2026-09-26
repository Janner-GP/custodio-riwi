import { Component, inject, OnDestroy } from '@angular/core';
import { ModeService } from '../../services/mode.service';
import { VoiceService } from '../../services/voice.service';
import { Chat } from '../chat/chat';
import { Personalidad } from '../personalidad/personalidad';

@Component({
  selector: 'app-text-mode',
  standalone: true,
  imports: [Chat, Personalidad],
  template: `
    <div class="grid grid-cols-[1.3fr_1fr] items-start gap-5 max-[860px]:grid-cols-1">
      <app-chat />
      <app-personalidad />
    </div>
  `,
})
export class TextMode implements OnDestroy {
  private voice = inject(VoiceService);

  constructor() {
    inject(ModeService).elegir('texto');
  }

  ngOnDestroy() {
    this.voice.detener();
  }
}

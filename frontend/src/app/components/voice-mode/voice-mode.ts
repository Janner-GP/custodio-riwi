import { Component, inject, OnDestroy } from '@angular/core';
import { ModeService } from '../../services/mode.service';
import { VoiceService } from '../../services/voice.service';
import { Chat } from '../chat/chat';

@Component({
  selector: 'app-voice-mode',
  standalone: true,
  imports: [Chat],
  template: `
    <div class="mx-auto max-w-[520px]">
      <app-chat />
    </div>
  `,
})
export class VoiceMode implements OnDestroy {
  private voice = inject(VoiceService);

  constructor() {
    inject(ModeService).elegir('voz');
  }

  ngOnDestroy() {
    this.voice.detener();
  }
}

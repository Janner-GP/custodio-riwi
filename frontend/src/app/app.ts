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
}

import { Routes } from '@angular/router';
import { ModeSelect } from './components/mode-select/mode-select';
import { TextMode } from './components/text-mode/text-mode';
import { VoiceMode } from './components/voice-mode/voice-mode';

export const routes: Routes = [
  { path: '', component: ModeSelect },
  { path: 'texto', component: TextMode },
  { path: 'voz', component: VoiceMode },
  { path: '**', redirectTo: '' },
];

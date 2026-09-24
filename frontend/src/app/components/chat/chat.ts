import { NgClass } from '@angular/common';
import { Component, ElementRef, ViewChild, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';
import { ModeService } from '../../services/mode.service';
import { VoiceService } from '../../services/voice.service';
import { Avatar } from '../avatar/avatar';

interface MensajeVista {
  texto: string;
  tipo: 'bot' | 'user' | 'error';
}

const SALUDO_INICIAL =
  '¡Ajá, ¿qué molleja! Yo soy Custodio, mijo. Pregúntame lo que quieras de la Costa: carnaval, cumbia, comida, lo que sea.';

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [FormsModule, NgClass, Avatar],
  templateUrl: './chat.html',
})
export class Chat {
  api = inject(ApiService);
  voice = inject(VoiceService);
  mode = inject(ModeService);

  @ViewChild('chatLog') chatLogRef!: ElementRef<HTMLDivElement>;

  mensajes = signal<MensajeVista[]>([{ texto: SALUDO_INICIAL, tipo: 'bot' }]);
  entrada = signal('');
  enviando = signal(false);
  vozActiva = signal(true);
  enseniando = signal(false);

  constructor() {
    if (this.mode.modo() === 'voz') {
      this.vozActiva.set(true);
      this.voice.hablar(SALUDO_INICIAL, true, () => this.escucharSiguiente());
    }
  }

  private scrollAbajo() {
    setTimeout(() => {
      const el = this.chatLogRef?.nativeElement;
      if (el) el.scrollTop = el.scrollHeight;
    });
  }

  private agregarMensaje(texto: string, tipo: MensajeVista['tipo']) {
    this.mensajes.update((m) => [...m, { texto, tipo }]);
    this.scrollAbajo();
  }

  private escucharSiguiente() {
    if (this.mode.modo() !== 'voz' || !this.voice.micSupported() || this.voice.ocupado()) return;
    this.voice.escuchar((texto) => this.manejarResultadoVoz(texto));
  }

  private manejarResultadoVoz(texto: string) {
    if (this.enseniando()) {
      this.guardarAportePorVoz(texto);
      return;
    }
    this.entrada.set(texto);
    this.enviar();
  }

  private guardarAportePorVoz(texto: string) {
    const contenido = texto.trim();
    this.enseniando.set(false);
    if (!contenido) {
      this.escucharSiguiente();
      return;
    }
    this.api.addAporte(contenido, 'Dictado por voz').subscribe({
      next: () => {
        this.voice.hablar('Listo, ya me aprendí eso, mijo.', true, () => this.escucharSiguiente());
      },
      error: () => {
        this.voice.hablar('Erda, no logré guardar eso. Intenta otra vez.', true, () => this.escucharSiguiente());
      },
    });
  }

  alternarEnsenar() {
    this.enseniando.update((v) => !v);
  }

  enviar() {
    if (this.enviando()) return;
    const mensaje = this.entrada().trim();
    if (!mensaje) return;
    this.agregarMensaje(mensaje, 'user');
    this.entrada.set('');
    this.enviando.set(true);

    this.api.chat(mensaje).subscribe({
      next: (data) => {
        this.agregarMensaje(data.respuesta, 'bot');
        this.api.status.set('Conectado');
        this.api.statusError.set(false);
        this.enviando.set(false);
        this.voice.hablar(data.respuesta, this.vozActiva(), () => this.escucharSiguiente());
      },
      error: (err) => {
        const mensajeError = err?.error?.detail || 'Algo falló hablando con Custodio.';
        this.agregarMensaje(mensajeError, 'error');
        this.api.status.set('Error de conexión con la API');
        this.api.statusError.set(true);
        this.enviando.set(false);
        this.voice.hablar(mensajeError, this.vozActiva(), () => this.escucharSiguiente());
      },
    });
  }

  usarMicrofono() {
    // Bloquea empezar a escuchar mientras Custodio piensa o habla, pero siempre deja
    // cancelar una escucha que ya esté activa.
    if (!this.voice.listening() && (this.voice.ocupado() || this.enviando())) return;
    this.voice.escuchar((texto) => this.manejarResultadoVoz(texto));
  }

  salir() {
    this.voice.detener();
    this.mode.cambiar();
  }

  reiniciar() {
    this.api.resetChat().subscribe(() => {
      const saludo = 'Listo, mijo. Empezamos de cero. ¿Qué quieres saber de la Costa?';
      this.mensajes.set([{ texto: saludo, tipo: 'bot' }]);
      if (this.mode.modo() === 'voz') {
        this.voice.hablar(saludo, true, () => this.escucharSiguiente());
      }
    });
  }
}

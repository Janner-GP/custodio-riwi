import { Injectable, inject, signal } from '@angular/core';
import { Subscription } from 'rxjs';
import { ApiService } from './api.service';

@Injectable({ providedIn: 'root' })
export class VoiceService {
  private api = inject(ApiService);

  readonly hablando = signal(false);
  readonly bocaScale = signal(1);
  /** true desde que Custodio empieza a preparar su respuesta hablada hasta que termina de decirla.
   *  Más amplio que `hablando` (que solo cubre el audio ya sonando): cubre también el hueco
   *  mientras se pide el audio a ElevenLabs, para que no se pueda activar el micrófono ahí. */
  readonly ocupado = signal(false);

  readonly listening = signal(false);
  readonly micStatus = signal('');
  readonly micSupported = signal(false);

  private audioCtx: AudioContext | null = null;
  private animacionId: number | null = null;
  private recognition: any = null;
  private audioActual: HTMLAudioElement | null = null;
  private solicitudTts: Subscription | null = null;
  private audioUrl: string | null = null;
  private cicloVoz = 0;

  constructor() {
    this.inicializarReconocimiento();
  }

  private inicializarReconocimiento() {
    const SpeechRecognitionAPI =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognitionAPI) {
      this.micSupported.set(false);
      return;
    }
    this.micSupported.set(true);
    this.recognition = new SpeechRecognitionAPI();
    this.recognition.lang = 'es-CO';
    this.recognition.continuous = false;
    this.recognition.interimResults = false;

    this.recognition.onstart = () => {
      this.listening.set(true);
      this.micStatus.set('Escuchando…');
    };
    this.recognition.onerror = () => {
      this.micStatus.set('No te escuché bien, intenta otra vez.');
    };
    this.recognition.onend = () => {
      this.listening.set(false);
      if (this.micStatus() === 'Escuchando…') this.micStatus.set('');
    };
  }

  escuchar(onResult: (texto: string) => void) {
    if (!this.recognition) return;
    if (this.listening()) {
      this.recognition.stop();
      return;
    }
    this.recognition.onresult = (event: any) => {
      const texto = event.results[0][0].transcript;
      onResult(texto);
    };
    this.micStatus.set('');
    this.recognition.start();
  }

  private iniciarAudioContext() {
    if (!this.audioCtx) {
      this.audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (this.audioCtx.state === 'suspended') this.audioCtx.resume();
  }

  private animarBoca(audioEl: HTMLAudioElement) {
    const source = this.audioCtx!.createMediaElementSource(audioEl);
    const analyser = this.audioCtx!.createAnalyser();
    analyser.fftSize = 256;
    source.connect(analyser);
    analyser.connect(this.audioCtx!.destination);

    const datos = new Uint8Array(analyser.frequencyBinCount);

    const loop = () => {
      analyser.getByteFrequencyData(datos);
      let suma = 0;
      for (let i = 0; i < datos.length; i++) suma += datos[i];
      const promedio = suma / datos.length;
      const apertura = Math.min(1, promedio / 55);
      this.bocaScale.set(1 + apertura * 3.2);
      this.animacionId = requestAnimationFrame(loop);
    };
    loop();
  }

  private iniciarBocaSimulada() {
    const inicio = performance.now();
    const loop = (t: number) => {
      const seg = (t - inicio) / 1000;
      const onda = Math.sin(seg * 9) * 0.5 + Math.sin(seg * 17) * 0.3 + Math.random() * 0.2;
      const apertura = Math.max(0, Math.min(1, 0.45 + onda * 0.4));
      this.bocaScale.set(1 + apertura * 3.2);
      this.animacionId = requestAnimationFrame(loop);
    };
    this.animacionId = requestAnimationFrame(loop);
  }

  private detenerBoca() {
    if (this.animacionId) cancelAnimationFrame(this.animacionId);
    this.animacionId = null;
    this.bocaScale.set(1);
    this.hablando.set(false);
  }

  /** Corta el audio y cancela una generación de voz que todavía esté pendiente. */
  private detenerAudio() {
    this.cicloVoz++;
    this.solicitudTts?.unsubscribe();
    this.solicitudTts = null;
    if (this.audioActual) {
      this.audioActual.onplay = null;
      this.audioActual.onended = null;
      this.audioActual.onerror = null;
      this.audioActual.pause();
      this.audioActual.removeAttribute('src');
      this.audioActual.load();
      this.audioActual = null;
    }
    if (this.audioUrl) URL.revokeObjectURL(this.audioUrl);
    this.audioUrl = null;
  }

  async hablar(texto: string, voiceEnabled: boolean, onEnd?: () => void) {
    // Nunca dejar que dos respuestas habladas se solapen: si algo seguía sonando, se corta primero.
    this.detenerAudio();

    if (!voiceEnabled) {
      onEnd?.();
      return;
    }

    const cicloActual = this.cicloVoz;
    this.ocupado.set(true);
    let finalizado = false;
    const terminar = () => {
      if (cicloActual !== this.cicloVoz || finalizado) return;
      finalizado = true;
      this.solicitudTts = null;
      this.ocupado.set(false);
      onEnd?.();
    };

    this.iniciarAudioContext();

    this.solicitudTts = this.api.tts(texto).subscribe({
      next: (blob) => {
        if (cicloActual !== this.cicloVoz) return;
        const url = URL.createObjectURL(blob);
        this.audioUrl = url;
        const audioEl = new Audio(url);
        audioEl.crossOrigin = 'anonymous';
        this.audioActual = audioEl;

        audioEl.onplay = () => {
          if (cicloActual === this.cicloVoz) this.hablando.set(true);
        };
        audioEl.onended = () => {
          if (cicloActual !== this.cicloVoz) return;
          this.detenerBoca();
          URL.revokeObjectURL(url);
          this.audioUrl = null;
          this.audioActual = null;
          terminar();
        };
        audioEl.onerror = () => {
          if (cicloActual !== this.cicloVoz) return;
          this.detenerBoca();
          URL.revokeObjectURL(url);
          this.audioUrl = null;
          this.audioActual = null;
          this.micStatus.set('No se pudo reproducir la voz de ElevenLabs.');
          terminar();
        };

        this.animarBoca(audioEl);
        audioEl.play().catch(() => {
          if (cicloActual !== this.cicloVoz) return;
          this.detenerBoca();
          URL.revokeObjectURL(url);
          this.audioUrl = null;
          this.audioActual = null;
          this.micStatus.set('No se pudo reproducir la voz de ElevenLabs.');
          terminar();
        });
      },
      error: (error) => {
        if (cicloActual !== this.cicloVoz) return;
        this.detenerBoca();
        this.mostrarErrorTts(error);
        terminar();
      },
    });
  }

  private mostrarErrorTts(error: unknown) {
    const mostrar = (respuesta: string) => {
      if (respuesta.includes('quota_exceeded') || respuesta.includes('credits remaining')) {
        this.micStatus.set('ElevenLabs agotó los créditos. Puedes seguir chateando por texto.');
      } else {
        this.micStatus.set('No se pudo generar la voz de ElevenLabs. Revisa la conexión y la configuración.');
      }
    };

    const cuerpo = (error as { error?: unknown } | null)?.error;
    if (cuerpo instanceof Blob) {
      void cuerpo.text().then(mostrar, () => mostrar(''));
    } else {
      mostrar(typeof cuerpo === 'string' ? cuerpo : (JSON.stringify(cuerpo ?? '') ?? ''));
    }
  }

  /** Corta cualquier audio, síntesis o escucha en curso (p. ej. al salir del modo voz). */
  detener() {
    if (this.recognition && this.listening()) {
      this.recognition.stop();
    }
    this.detenerAudio();
    this.detenerBoca();
    this.ocupado.set(false);
    this.micStatus.set('');
  }
}

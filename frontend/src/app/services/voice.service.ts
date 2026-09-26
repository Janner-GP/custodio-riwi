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
  private vozEspanol: SpeechSynthesisVoice | null = null;
  private vozMasculinaIdentificada = false;
  private audioActual: HTMLAudioElement | null = null;
  private solicitudTts: Subscription | null = null;
  private audioUrl: string | null = null;
  private cicloVoz = 0;

  constructor() {
    this.inicializarReconocimiento();
    this.elegirVoz();
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.onvoiceschanged = () => this.elegirVoz();
    }
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
    try {
      const AudioContextAPI = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextAPI) return;
      if (!this.audioCtx) this.audioCtx = new AudioContextAPI();
      if (this.audioCtx.state === 'suspended') void this.audioCtx.resume().catch(() => {});
    } catch {
      this.audioCtx = null;
    }
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
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
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
    let fallbackIniciado = false;
    const terminar = () => {
      if (cicloActual !== this.cicloVoz || finalizado) return;
      finalizado = true;
      this.solicitudTts = null;
      this.ocupado.set(false);
      onEnd?.();
    };
    const usarFallback = () => {
      if (cicloActual !== this.cicloVoz || fallbackIniciado) return;
      fallbackIniciado = true;
      this.hablarConNavegador(texto, cicloActual, terminar);
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
          usarFallback();
        };

        if (this.audioCtx) this.animarBoca(audioEl);
        audioEl.play().catch(() => {
          if (cicloActual !== this.cicloVoz) return;
          this.detenerBoca();
          URL.revokeObjectURL(url);
          this.audioUrl = null;
          this.audioActual = null;
          usarFallback();
        });
      },
      error: (error) => {
        if (cicloActual !== this.cicloVoz) return;
        this.detenerBoca();
        this.mostrarErrorTts(error);
        usarFallback();
      },
    });
  }

  private mostrarErrorTts(error: unknown) {
    const mostrar = (respuesta: string) => {
      if (respuesta.includes('quota_exceeded') || respuesta.includes('credits remaining')) {
        this.micStatus.set('ElevenLabs no tiene créditos; usando la voz del dispositivo.');
      } else {
        this.micStatus.set('ElevenLabs no está disponible; usando la voz del dispositivo.');
      }
    };

    const cuerpo = (error as { error?: unknown } | null)?.error;
    if (cuerpo instanceof Blob) {
      void cuerpo.text().then(mostrar, () => mostrar(''));
    } else {
      mostrar(typeof cuerpo === 'string' ? cuerpo : (JSON.stringify(cuerpo ?? '') ?? ''));
    }
  }

  private elegirVoz() {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    const voces = window.speechSynthesis.getVoices();
    const vocesEspanol = voces.filter((voz) => voz.lang?.toLowerCase().startsWith('es'));
    // Los navegadores no exponen de forma consistente el género. Preferimos una voz
    // masculina reconocible; si el dispositivo no la tiene, usamos su voz española
    // disponible con el tono más grave posible en vez de dejar a Custodio en silencio.
    const vozMasculina = vocesEspanol.find((voz) => {
      const gender = (voz as SpeechSynthesisVoice & { gender?: string }).gender?.toLowerCase();
      const nombre = voz.name.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      return gender === 'male' ||
        /\b(jorge|juan|pablo|raul|alvaro|andres|carlos|diego|miguel|antonio|daniel|enrique|sergio|luis|hugo|mateo|male|masculin(?:o)?|hombre)\b/i.test(nombre);
    });
    this.vozMasculinaIdentificada = !!vozMasculina;
    this.vozEspanol = vozMasculina ??
      vocesEspanol.find((voz) => voz.lang.toLowerCase() === 'es-co') ??
      vocesEspanol[0] ??
      null;
  }

  private hablarConNavegador(texto: string, cicloActual: number, onEnd: () => void) {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      this.micStatus.set('Este navegador no tiene una voz de respaldo disponible.');
      onEnd();
      return;
    }

    const sintesis = window.speechSynthesis;
    // Algunos navegadores cargan su catálogo de voces después de iniciar la app.
    this.elegirVoz();
    sintesis.cancel();
    const utterance = new SpeechSynthesisUtterance(texto);
    utterance.lang = this.vozEspanol?.lang || 'es-CO';
    if (this.vozEspanol) utterance.voice = this.vozEspanol;
    utterance.pitch = this.vozMasculinaIdentificada ? 1 : 0.72;
    utterance.rate = 0.96;
    utterance.onstart = () => {
      if (cicloActual !== this.cicloVoz) return;
      this.hablando.set(true);
      this.iniciarBocaSimulada();
    };
    utterance.onend = () => {
      if (cicloActual !== this.cicloVoz) return;
      this.detenerBoca();
      onEnd();
    };
    utterance.onerror = () => {
      if (cicloActual !== this.cicloVoz) return;
      this.detenerBoca();
      onEnd();
    };
    this.micStatus.set(this.vozMasculinaIdentificada
      ? 'Usando una voz masculina del dispositivo.'
      : 'Usando la voz en español del dispositivo con tono grave.');
    sintesis.speak(utterance);
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

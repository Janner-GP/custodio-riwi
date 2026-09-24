import { Injectable, signal } from '@angular/core';

export type ModoChat = 'texto' | 'voz';

const STORAGE_KEY = 'custodio-modo';

@Injectable({ providedIn: 'root' })
export class ModeService {
  readonly modo = signal<ModoChat | null>(this.leerGuardado());

  private leerGuardado(): ModoChat | null {
    try {
      const valor = localStorage.getItem(STORAGE_KEY);
      return valor === 'texto' || valor === 'voz' ? valor : null;
    } catch {
      return null;
    }
  }

  elegir(modo: ModoChat) {
    this.modo.set(modo);
    try {
      localStorage.setItem(STORAGE_KEY, modo);
    } catch {
      /* localStorage no disponible */
    }
  }

  cambiar() {
    this.modo.set(null);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* localStorage no disponible */
    }
  }
}

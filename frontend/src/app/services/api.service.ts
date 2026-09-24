import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable } from 'rxjs';
import { ChatResponse, Personalidad } from '../models/personalidad.model';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private http = inject(HttpClient);
  private base = '/api';

  readonly status = signal('Conectado');
  readonly statusError = signal(false);

  getPersonalidad(): Observable<Personalidad> {
    return this.http.get<Personalidad>(`${this.base}/personalidad`);
  }

  addAporte(texto: string, autor: string): Observable<Personalidad> {
    return this.http.post<Personalidad>(`${this.base}/personalidad/aporte`, { texto, autor });
  }

  deleteAporte(idx: number): Observable<Personalidad> {
    return this.http.delete<Personalidad>(`${this.base}/personalidad/aporte/${idx}`);
  }

  chat(mensaje: string): Observable<ChatResponse> {
    return this.http.post<ChatResponse>(`${this.base}/chat`, { mensaje });
  }

  resetChat(): Observable<{ ok: boolean }> {
    return this.http.post<{ ok: boolean }>(`${this.base}/chat/reset`, {});
  }

  tts(texto: string): Observable<Blob> {
    return this.http.post(`${this.base}/tts`, { texto }, { responseType: 'blob' });
  }
}

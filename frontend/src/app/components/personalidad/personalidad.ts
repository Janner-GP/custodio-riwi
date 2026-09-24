import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';
import { ModeService } from '../../services/mode.service';
import { VoiceService } from '../../services/voice.service';
import { Aporte } from '../../models/personalidad.model';

@Component({
  selector: 'app-personalidad',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './personalidad.html',
})
export class Personalidad implements OnInit {
  private api = inject(ApiService);
  voice = inject(VoiceService);
  mode = inject(ModeService);

  aportes = signal<Aporte[]>([]);
  autor = signal('');
  texto = signal('');

  ngOnInit() {
    this.cargar();
  }

  private cargar() {
    this.api.getPersonalidad().subscribe((data) => this.aportes.set(data.aportes));
  }

  dictarAutor() {
    this.voice.escuchar((texto) => this.autor.set(texto));
  }

  dictarTexto() {
    this.voice.escuchar((texto) => this.texto.set(texto));
  }

  agregar() {
    const texto = this.texto().trim();
    if (!texto) return;
    const autor = this.autor().trim();
    this.api.addAporte(texto, autor).subscribe({
      next: (data) => {
        this.aportes.set(data.aportes);
        this.texto.set('');
        this.autor.set('');
        if (this.mode.modo() === 'voz') {
          this.voice.hablar('Listo, mijo, ya guardé ese aporte a mi personalidad.', true);
        }
      },
      error: (err) => alert(err?.error?.detail || 'No se pudo guardar el aporte.'),
    });
  }

  eliminar(idx: number) {
    this.api.deleteAporte(idx).subscribe((data) => this.aportes.set(data.aportes));
  }
}

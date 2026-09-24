export interface Aporte {
  autor: string;
  texto: string;
}

export interface Personalidad {
  base: string;
  aportes: Aporte[];
}

export interface ChatResponse {
  respuesta: string;
}

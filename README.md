# Custodio — Agente cultural costeño

Aplicación web con un agente de IA llamado **Custodio**: costeño de Barranquilla,
sombrero, chanclas, bermuda y camisilla, relajado, especializado en temas culturales de la Costa Caribe colombiana.

Usa la API gratuita de **Google Gemini** (nivel gratis con límite de mensajes por minuto/día — suficiente
para uso personal).

Puedes ir agregando "aportes" de personalidad (los prompts que te den distintas personas) desde la propia
interfaz, sin tocar código: se suman al carácter base de Custodio.

## Estructura del proyecto

```
custodio/
├── backend/                # API FastAPI (gestionada con uv)
│   ├── app/
│   │   ├── main.py         # rutas de la API
│   │   ├── config.py       # settings (variables de entorno)
│   │   ├── gemini.py       # integración con Google Gemini
│   │   ├── personalidad.py # persistencia de personalidad/historial en JSON
│   │   └── schemas.py      # modelos Pydantic
│   ├── data/                # se crea sola: personalidad.json + historial.json
│   ├── pyproject.toml / uv.lock
│   ├── .env.example
│   └── Dockerfile
├── frontend/                # SPA Angular
│   ├── src/app/
│   │   ├── components/      # chat, personalidad, avatar animado
│   │   └── services/        # api.service (HTTP) y voice.service (voz)
│   ├── nginx.conf           # sirve el build y hace proxy de /api al backend
│   └── Dockerfile
└── docker-compose.yml        # orquesta backend + frontend
```

## 1. Requisitos

- Docker y Docker Compose (forma recomendada de correr todo), **o**
- Para desarrollo local sin Docker: Python 3.12+ con [uv](https://docs.astral.sh/uv/) para el backend,
  y Node.js 22+ con Angular CLI para el frontend.
- Una API key gratuita de Google AI Studio (ver abajo).

## 2. Conseguir la API key (gratis)

1. Entra a https://aistudio.google.com/apikey
2. Inicia sesión con tu cuenta de Google
3. Clic en **Create API key**
4. Copia la key

> El nivel gratuito tiene límites de uso (mensajes por minuto y por día). Para chatear normalmente
> con Custodio es más que suficiente. Si algún día lo superas, verás un error claro en el chat.

**Importante de seguridad:** nunca compartas tu API key por chat, correo o la subas a un repositorio
público. Va solo en tu archivo `backend/.env` local. Si alguna vez la compartes sin querer, entra a
https://aistudio.google.com/apikey y bórrala, luego crea una nueva.

## 3. Configurar variables de entorno

```bash
cp backend/.env.example backend/.env
```

Abre `backend/.env` y reemplaza:

```
GOOGLE_API_KEY=pega_aqui_tu_api_key_de_aistudio.google.com
```

por tu key real. Opcionalmente configura `ELEVENLABS_API_KEY` y `ELEVENLABS_VOICE_ID` (ver sección de voz).

## 4. Correr todo con Docker Compose (recomendado)

Desde la raíz del proyecto:

```bash
docker compose up --build
```

- Frontend (Angular servido con nginx): **http://localhost:4200**
- Backend (API FastAPI): **http://localhost:8000** (docs interactivas en `/docs`)

El frontend proxya `/api/*` hacia el contenedor del backend, así que no hay problemas de CORS entre
contenedores. Los datos (`personalidad.json`, `historial.json`) se guardan en un volumen Docker
(`custodio-data`) para que persistan entre reinicios.

## 5. Correr en desarrollo local (sin Docker)

**Backend:**

```bash
cd backend
uv sync
uv run uvicorn app.main:app --reload --port 8000
```

**Frontend** (en otra terminal):

```bash
cd frontend
npm install
npm start
```

Esto levanta Angular en **http://localhost:4200** con un proxy configurado (`proxy.conf.json`) que
redirige `/api/*` a `http://localhost:8000`, igual que en producción.

## 6. Voz (hablarle y que te responda)

**Escucharte (micrófono):** gratis, usa el navegador (Chrome/Edge/Brave). Al hacer clic en 🎤 transcribe
lo que dices y lo envía como si lo hubieras escrito.

**Que te responda hablando — con ElevenLabs (voz natural):**

1. Entra a https://elevenlabs.io y crea una cuenta (tiene nivel gratis limitado por mes, luego es de pago).
2. Ve a **Profile → API Keys** y copia tu key.
3. Pégala en `backend/.env` en `ELEVENLABS_API_KEY=...`
4. Elige una voz en https://elevenlabs.io/app/voice-library — busca voces en español latino que te suenen
   naturales (no hay una etiquetada exactamente "costeña de Barranquilla", pero puedes probar varias voces
   masculinas de español latino/caribeño hasta encontrar la que más te guste). Cada voz tiene un **Voice ID**
   (lo ves en los detalles de la voz o dándole "Use this voice" y copiando el ID). Pégalo en `backend/.env`
   en `ELEVENLABS_VOICE_ID=...` (si lo dejas vacío usa un ID de ejemplo que puede no sonar como quieres).
5. Reinicia el backend (`docker compose up --build backend` o el proceso local).

Si no configuras `ELEVENLABS_API_KEY`, la app cae automáticamente a la voz gratuita del navegador
(la genérica, sin acento costeño real) para que igual puedas usarla.

El avatar mueve la boca de verdad, sincronizada en tiempo real con el volumen del audio que suena
(no es una animación fija, reacciona a lo que efectivamente se está escuchando).

## 7. Uso

- **Panel izquierdo (Conversación):** chatea directamente con Custodio.
- **Panel derecho (Personalidad de Custodio):** aquí pegas los prompts que te den las personas
  (puedes poner de quién es cada aporte). Se guardan automáticamente y se suman a la personalidad
  base de Custodio en cada nueva respuesta. Puedes eliminar cualquier aporte con el botón "✕".
- **"Empezar de nuevo":** borra el historial de la conversación (no borra la personalidad).

## 8. Personalizar más a fondo

Si quieres ajustar el carácter base de Custodio (más allá de los aportes de la gente), edita
la variable `BASE_PERSONALITY` en `backend/app/personalidad.py`.

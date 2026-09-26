import requests
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response

from app.config import settings
from app.gemini import responder
from app.personalidad import (
    cargar_historial,
    cargar_personalidad,
    construir_system_prompt,
    guardar_historial,
    guardar_personalidad,
)
from app.schemas import AporteIn, MensajeIn, TextoIn

app = FastAPI(title="Custodio API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/personalidad")
def get_personalidad():
    return cargar_personalidad()


@app.post("/api/personalidad/aporte")
def add_aporte(body: AporteIn):
    texto = body.texto.strip()
    autor = body.autor.strip()
    if not texto:
        raise HTTPException(status_code=400, detail="El prompt no puede estar vacío")
    data = cargar_personalidad()
    data["aportes"].append({"autor": autor, "texto": texto})
    guardar_personalidad(data)
    return data


@app.delete("/api/personalidad/aporte/{idx}")
def del_aporte(idx: int):
    data = cargar_personalidad()
    if 0 <= idx < len(data["aportes"]):
        data["aportes"].pop(idx)
        guardar_personalidad(data)
    return data


@app.post("/api/chat")
def chat(body: MensajeIn):
    mensaje = body.mensaje.strip()
    if not mensaje:
        raise HTTPException(status_code=400, detail="Mensaje vacío")

    historial = cargar_historial()
    historial.append({"role": "user", "content": mensaje})

    try:
        historial_previo = [
            {"role": ("model" if m["role"] == "assistant" else "user"), "parts": [{"text": m["content"]}]}
            for m in historial[:-1][-20:]
        ]
        texto_respuesta = responder(mensaje, historial_previo, construir_system_prompt())
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error llamando a la API: {e}")

    historial.append({"role": "assistant", "content": texto_respuesta})
    guardar_historial(historial)

    return {"respuesta": texto_respuesta}


@app.post("/api/chat/reset")
def reset_chat():
    guardar_historial([])
    return {"ok": True}


@app.post("/api/tts")
def tts(body: TextoIn):
    if not settings.elevenlabs_api_key:
        raise HTTPException(status_code=400, detail="Falta ELEVENLABS_API_KEY en tu archivo .env")

    texto = body.texto.strip()
    if not texto:
        raise HTTPException(status_code=400, detail="Texto vacío")

    try:
        r = requests.post(
            f"https://api.elevenlabs.io/v1/text-to-speech/{settings.elevenlabs_voice_id}",
            headers={
                "xi-api-key": settings.elevenlabs_api_key,
                "Content-Type": "application/json",
                "Accept": "audio/mpeg",
            },
            json={
                "text": texto,
                "model_id": "eleven_flash_v2_5",
                "voice_settings": {
                    "stability": 0.45,
                    "similarity_boost": 0.85,
                    "style": 0.6,
                    "use_speaker_boost": True,
                },
            },
            timeout=30,
        )
        if r.status_code != 200:
            raise HTTPException(
                status_code=502, detail=f"ElevenLabs devolvió {r.status_code}: {r.text[:200]}"
            )
        return Response(content=r.content, media_type="audio/mpeg")
    except requests.RequestException as e:
        raise HTTPException(status_code=500, detail=f"Error llamando a ElevenLabs: {e}")

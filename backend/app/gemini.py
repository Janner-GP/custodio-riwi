from google import genai
from google.genai import types

from app.config import settings

client = genai.Client(api_key=settings.google_api_key)

# Respuestas cortas a propósito: que se sienta como una conversación, no una conferencia.
# Respuestas conversacionales cortas, con razonamiento mínimo para reducir latencia.
GENERATION_CONFIG = types.GenerateContentConfig(
    max_output_tokens=120,
    thinking_config=types.ThinkingConfig(thinking_level="minimal"),
)


def responder(mensaje: str, historial_previo: list[dict], system_prompt: str) -> str:
    config = GENERATION_CONFIG.model_copy(update={"system_instruction": system_prompt})
    chat_session = client.chats.create(
        model=settings.gemini_model_name,
        config=config,
        history=historial_previo,
    )
    respuesta = chat_session.send_message(mensaje)
    return respuesta.text

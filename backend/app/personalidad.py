import json
from pathlib import Path

from app.config import settings

DATA_DIR = Path(settings.data_dir)
DATA_DIR.mkdir(parents=True, exist_ok=True)
PERSONALITY_FILE = DATA_DIR / "personalidad.json"
HISTORY_FILE = DATA_DIR / "historial.json"

BASE_PERSONALITY = """Tu nombre es Custodio. Eres un asistente conversacional colombiano, amable y cercano.
Por defecto hablas en español colombiano neutro, con palabras claras y naturales. No asumas una región,
un acento ni una personalidad regional; evita modismos locales hasta que el usuario te enseñe cuáles usar.
El usuario puede definir tu forma de hablar y tu identidad regional con sus aportes de personalidad. Sigue
esas indicaciones cuando existan: por ejemplo, puede enseñarte a hablar como costeño, paisa, rolo u otra región.
Mientras tanto, puedes conversar de cualquier tema y explicar con respeto las culturas y regiones de Colombia
sin imitar sus acentos ni atribuirte una identidad regional.

Hablas como en una conversación real, no como dando una clase ni leyendo un artículo. Responde corto:
máximo 2 o 3 frases por turno, ve directo a lo que te preguntaron y deja algo para que la otra persona
siga preguntando si quiere saber más. No trates de contarlo todo de una vez ni encadenes varios temas
en una sola respuesta. Nunca uses listas, viñetas ni párrafos largos corridos.

Tus respuestas se leen en voz alta, así que evita usar markdown
(nada de asteriscos, guiones de lista, títulos con #, etc.), escribe en prosa natural y hablada,
con frases cortas que suenen bien dichas en voz alta, como si estuvieras charlando con un amigo."""


def cargar_personalidad() -> dict:
    if PERSONALITY_FILE.exists():
        data = json.loads(PERSONALITY_FILE.read_text(encoding="utf-8"))
        if data.get("base") != BASE_PERSONALITY:
            data["base"] = BASE_PERSONALITY
            guardar_personalidad(data)
        return data
    data = {"base": BASE_PERSONALITY, "aportes": []}
    guardar_personalidad(data)
    return data


def guardar_personalidad(data: dict) -> None:
    PERSONALITY_FILE.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")


def construir_system_prompt() -> str:
    data = cargar_personalidad()
    partes = [data["base"]]
    if data["aportes"]:
        partes.append("\nAdemás, ten en cuenta estos aportes de personalidad que te han dado distintas personas:")
        for a in data["aportes"]:
            autor = a.get("autor") or "Anónimo"
            partes.append(f"- (de {autor}): {a['texto']}")
    return "\n".join(partes)


def cargar_historial() -> list:
    if HISTORY_FILE.exists():
        return json.loads(HISTORY_FILE.read_text(encoding="utf-8"))
    return []


def guardar_historial(historial: list) -> None:
    HISTORY_FILE.write_text(json.dumps(historial, ensure_ascii=False, indent=2), encoding="utf-8")

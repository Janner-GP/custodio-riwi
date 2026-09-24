from pydantic import BaseModel


class AporteIn(BaseModel):
    texto: str
    autor: str = ""


class MensajeIn(BaseModel):
    mensaje: str


class TextoIn(BaseModel):
    texto: str

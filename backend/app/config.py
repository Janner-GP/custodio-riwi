from pydantic_settings import BaseSettings, SettingsConfigDict
from dotenv import load_dotenv
import os

load_dotenv()

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    google_api_key: str = os.getenv("GOOGLE_API_KEY", "")
    gemini_model_name: str = "gemini-3.5-flash-lite"
    elevenlabs_api_key: str = os.getenv("ELEVENLABS_API_KEY", "")
    elevenlabs_voice_id: str = os.getenv("ELEVENLABS_VOICE_ID", "Nh2zY9kknu6z4pZy6FhD")
    port: int = 8000
    cors_origins: list[str] = ["http://localhost:4200", "https://custodio-app.riwi.io"]
    data_dir: str = "data"


settings = Settings()

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    google_api_key: str = ""
    gemini_model_name: str = "gemini-3.5-flash-lite"
    elevenlabs_api_key: str = ""
    elevenlabs_voice_id: str = "Nh2zY9kknu6z4pZy6FhD"
    port: int = 8000
    cors_origins: list[str] = ["http://localhost:4200"]
    data_dir: str = "data"


settings = Settings()

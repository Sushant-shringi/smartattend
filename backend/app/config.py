import os
import json
from typing import List, Union
from pydantic_settings import BaseSettings
from pydantic import field_validator

class Settings(BaseSettings):
    PROJECT_NAME: str = "SmartAttend"
    API_V1_STR: str = "/api/v1"
    SECRET_KEY: str = "super-secret-smartattend-key-change-in-production-long-random-string"
    REFRESH_SECRET_KEY: str = "super-secret-refresh-key-change-in-production-long-random-string"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # Database
    DATABASE_URL: str = "sqlite:///./smartattend.db"

    # Attendance defaults
    DEFAULT_RSSI_THRESHOLD: int = -85
    DEFAULT_LATE_THRESHOLD_MINUTES: int = 5
    DEFAULT_SESSION_DURATION_MINUTES: int = 50
    MAX_FUTURE_TIME_SKEW_SECONDS: int = 180
    # Local/demo testing only: allows the browser BLE simulator to submit attendance.
    DEMO_ATTENDANCE_MODE: bool = True

    # CORS
    CORS_ORIGINS: Union[List[str], str] = [
        "http://localhost:5173",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000",
        "http://localhost:8000",
    ]

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> List[str]:
        if isinstance(v, str) and not v.startswith("["):
            return [i.strip() for i in v.split(",")]
        elif isinstance(v, str) and v.startswith("["):
            return json.loads(v)
        elif isinstance(v, list):
            return v
        return []

    class Config:
        env_file = ".env"
        case_sensitive = True
        extra = "allow"

settings = Settings()

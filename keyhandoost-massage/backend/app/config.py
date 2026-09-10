import os
from pathlib import Path

APP_NAME = "سامانه مدیریت نامه‌ها"
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./letters.db")
SECRET_KEY = os.getenv("SECRET_KEY", "dev-only-change-me-before-deployment")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "480"))
UPLOAD_DIR = Path(os.getenv("UPLOAD_DIR", "./uploads"))
MAX_ATTACHMENT_SIZE = 5 * 1024 * 1024
ALLOWED_EXTENSIONS = {".pdf", ".png", ".jpg", ".jpeg", ".txt", ".doc", ".docx", ".zip"}

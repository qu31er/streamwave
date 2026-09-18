import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    MODERATOR_USERNAME = os.getenv('MODERATOR_USERNAME', 'qu31er').lower().strip()
    SECRET_KEY = os.getenv('SECRET_KEY', 'insecure-change-me-in-production')
    ALGORITHM = 'HS256'
    TOKEN_EXPIRE_DAYS = 30
    DATABASE_URL = os.getenv('DATABASE_URL', 'sqlite:///./streamwave.db')
    UPLOAD_DIR = os.getenv('UPLOAD_DIR', './uploads')
    MAX_UPLOAD_MB = int(os.getenv('MAX_UPLOAD_MB', '200'))

config = Config()
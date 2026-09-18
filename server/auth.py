from datetime import datetime, timedelta
from fastapi import Depends, HTTPException, status, Header
from jose import jwt, JWTError
from passlib.context import CryptContext
from sqlalchemy.orm import Session
from database import get_db
from models import User
from config import config

pwd = CryptContext(schemes=['bcrypt'], deprecated='auto')

def hash_password(p: str) -> str:
    return pwd.hash(p)

def verify_password(p: str, h: str) -> bool:
    try:
        return pwd.verify(p, h)
    except Exception:
        return False

def create_token(user_id: int) -> str:
    exp = datetime.utcnow() + timedelta(days=config.TOKEN_EXPIRE_DAYS)
    return jwt.encode(
        {'sub': str(user_id), 'exp': exp},
        config.SECRET_KEY,
        algorithm=config.ALGORITHM,
    )

def decode_token(token: str):
    try:
        payload = jwt.decode(token, config.SECRET_KEY, algorithms=[config.ALGORITHM])
        return int(payload['sub'])
    except (JWTError, KeyError, ValueError):
        return None

def get_current_user(
    authorization: str = Header(default=None),
    db: Session = Depends(get_db),
) -> User:
    if not authorization or not authorization.startswith('Bearer '):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, 'Нет токена')

    user_id = decode_token(authorization[7:])
    if not user_id:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, 'Токен недействителен')

    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, 'Пользователь не найден')
    return user

def get_optional_user(
    authorization: str = Header(default=None),
    db: Session = Depends(get_db),
):
    if not authorization or not authorization.startswith('Bearer '):
        return None
    user_id = decode_token(authorization[7:])
    if not user_id:
        return None
    return db.get(User, user_id)

def require_moderator(user: User = Depends(get_current_user)) -> User:
    if not user.is_moderator:
        raise HTTPException(status.HTTP_403_FORBIDDEN, 'Только для модераторов')
    return user
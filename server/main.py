import os
import shutil
from pathlib import Path
from typing import Optional
from datetime import datetime

from fastapi import FastAPI, Depends, HTTPException, UploadFile, File, Form, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from config import config
from database import Base, engine, get_db
from models import User, Track, Album, Playlist
from schemas import UserRegister, UserLogin, UserPublic, AuthResponse, PlaylistCreate
import auth as auth_module

Base.metadata.create_all(bind=engine)

app = FastAPI(title='StreamWave API')

app.add_middleware(
    CORSMiddleware,
    allow_origins=['*'],
    allow_methods=['*'],
    allow_headers=['*'],
)

UPLOAD_DIR = Path(config.UPLOAD_DIR)
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
for sub in ('covers', 'audio', 'video', 'avatars', 'banners'):
    (UPLOAD_DIR / sub).mkdir(exist_ok=True)

app.mount('/uploads', StaticFiles(directory=str(UPLOAD_DIR)), name='uploads')


def save_upload(file: UploadFile, subdir: str) -> Optional[str]:
    if not file or not file.filename:
        return None
    safe = file.filename.replace('/', '_').replace('\\', '_')
    unique = f"{os.urandom(6).hex()}_{safe}"
    dest = UPLOAD_DIR / subdir / unique
    with dest.open('wb') as buf:
        shutil.copyfileobj(file.file, buf)
    return f'/uploads/{subdir}/{unique}'


def track_to_dict(t: Track) -> dict:
    return {
        'id': t.id,
        'owner_id': t.owner_id,
        'artist_name': t.artist_name,
        'title': t.title,
        'description': t.description or '',
        'lyrics': t.lyrics or '',
        'cover_url': t.cover_path,
        'audio_url': t.audio_path,
        'video_url': t.video_path,
        'album_id': t.album_id,
        'status': t.status,
        'plays': t.plays,
        'created_at': t.created_at.isoformat(),
    }


def user_to_dict(u: User) -> dict:
    return {
        'id': u.id,
        'username': u.username,
        'role': u.role,
        'is_moderator': u.is_moderator,
        'avatar': u.avatar,
        'banner': u.banner,
    }


# ============================================
# AUTH
# ============================================
@app.post('/api/register', response_model=AuthResponse)
def register(data: UserRegister, db: Session = Depends(get_db)):
    username = data.username.strip()
    if len(username) < 3:
        raise HTTPException(400, 'Логин слишком короткий')
    if len(data.password) < 4:
        raise HTTPException(400, 'Пароль слишком короткий')
    if db.query(User).filter(User.username == username).first():
        raise HTTPException(400, 'Такой логин уже занят')

    is_mod = username.lower() == config.MODERATOR_USERNAME

    user = User(
        username=username,
        email=data.email,
        password_hash=auth_module.hash_password(data.password),
        role=data.role if data.role in ('listener', 'artist') else 'listener',
        is_moderator=is_mod,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    token = auth_module.create_token(user.id)
    return {'token': token, 'user': user}


@app.post('/api/login', response_model=AuthResponse)
def login(data: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == data.username.strip()).first()
    if not user or not auth_module.verify_password(data.password, user.password_hash):
        raise HTTPException(401, 'Неверный логин или пароль')
    token = auth_module.create_token(user.id)
    return {'token': token, 'user': user}


@app.get('/api/me', response_model=UserPublic)
def me(user: User = Depends(auth_module.get_current_user)):
    return user


@app.patch('/api/me/profile')
def update_profile(
    avatar: Optional[UploadFile] = File(None),
    banner: Optional[UploadFile] = File(None),
    user: User = Depends(auth_module.get_current_user),
    db: Session = Depends(get_db),
):
    if avatar and avatar.filename:
        user.avatar = save_upload(avatar, 'avatars')
    if banner and banner.filename:
        user.banner = save_upload(banner, 'banners')
    db.commit()
    db.refresh(user)
    return user_to_dict(user)


# ============================================
# USERS
# ============================================
@app.get('/api/users/{user_id}', response_model=UserPublic)
def get_user(user_id: int, db: Session = Depends(get_db)):
    u = db.get(User, user_id)
    if not u:
        raise HTTPException(404, 'Пользователь не найден')
    return u


# ============================================
# TRACKS
# ============================================
@app.get('/api/tracks')
def list_tracks(
    status_filter: Optional[str] = None,
    owner_id: Optional[int] = None,
    db: Session = Depends(get_db),
    user: Optional[User] = Depends(auth_module.get_optional_user),
):
    q = db.query(Track)

    if owner_id:
        q = q.filter(Track.owner_id == owner_id)

    if status_filter == 'pending':
        if not user:
            raise HTTPException(403, 'Нужна авторизация')
        if user.is_moderator:
            q = q.filter(Track.status == 'pending')
        else:
            q = q.filter(Track.owner_id == user.id, Track.status == 'pending')
    elif status_filter:
        q = q.filter(Track.status == status_filter)
    else:
        q = q.filter(Track.status == 'approved')

    tracks = q.order_by(Track.created_at.desc()).all()
    return [track_to_dict(t) for t in tracks]


@app.get('/api/tracks/{track_id}')
def get_track(track_id: int, db: Session = Depends(get_db)):
    t = db.get(Track, track_id)
    if not t:
        raise HTTPException(404, 'Трек не найден')
    return track_to_dict(t)


@app.post('/api/tracks')
def create_track(
    title: str = Form(...),
    description: str = Form(''),
    lyrics: str = Form(''),
    album_id: Optional[int] = Form(None),
    cover: Optional[UploadFile] = File(None),
    audio: Optional[UploadFile] = File(None),
    video: Optional[UploadFile] = File(None),
    user: User = Depends(auth_module.get_current_user),
    db: Session = Depends(get_db),
):
    if user.role != 'artist':
        raise HTTPException(403, 'Только исполнители могут загружать')
    if not audio or not audio.filename:
        raise HTTPException(400, 'Нужен аудиофайл')

    t = Track(
        owner_id=user.id,
        artist_name=user.username,
        title=title.strip(),
        description=description,
        lyrics=lyrics,
        album_id=album_id,
        cover_path=save_upload(cover, 'covers') if cover else None,
        audio_path=save_upload(audio, 'audio'),
        video_path=save_upload(video, 'video') if video else None,
        status='pending',
    )
    db.add(t)
    db.commit()
    db.refresh(t)
    return track_to_dict(t)


@app.delete('/api/tracks/{track_id}')
def delete_track(
    track_id: int,
    user: User = Depends(auth_module.get_current_user),
    db: Session = Depends(get_db),
):
    t = db.get(Track, track_id)
    if not t:
        raise HTTPException(404, 'Не найден')
    if t.owner_id != user.id and not user.is_moderator:
        raise HTTPException(403, 'Нет прав')
    db.delete(t)
    db.commit()
    return {'ok': True}


@app.post('/api/tracks/{track_id}/play')
def track_play(track_id: int, db: Session = Depends(get_db)):
    t = db.get(Track, track_id)
    if not t:
        raise HTTPException(404, 'Не найден')
    t.plays = (t.plays or 0) + 1
    db.commit()
    return {'ok': True, 'plays': t.plays}


# ============================================
# MODERATION
# ============================================
@app.get('/api/moderation/pending')
def moderation_pending(
    mod: User = Depends(auth_module.require_moderator),
    db: Session = Depends(get_db),
):
    tracks = db.query(Track).filter(Track.status == 'pending').order_by(Track.created_at.asc()).all()
    return [track_to_dict(t) for t in tracks]


@app.post('/api/moderation/{track_id}/approve')
def moderation_approve(
    track_id: int,
    mod: User = Depends(auth_module.require_moderator),
    db: Session = Depends(get_db),
):
    t = db.get(Track, track_id)
    if not t:
        raise HTTPException(404, 'Трек не найден')
    t.status = 'approved'
    t.reject_reason = None
    db.commit()
    return {'ok': True}


@app.post('/api/moderation/{track_id}/reject')
def moderation_reject(
    track_id: int,
    reason: str = Form(''),
    mod: User = Depends(auth_module.require_moderator),
    db: Session = Depends(get_db),
):
    t = db.get(Track, track_id)
    if not t:
        raise HTTPException(404, 'Трек не найден')
    t.status = 'rejected'
    t.reject_reason = reason
    db.commit()
    return {'ok': True}


# ============================================
# PLAYLISTS
# ============================================
@app.get('/api/playlists')
def my_playlists(
    user: User = Depends(auth_module.get_current_user),
    db: Session = Depends(get_db),
):
    pls = db.query(Playlist).filter(Playlist.owner_id == user.id).all()
    return [{'id': p.id, 'name': p.name, 'owner_id': p.owner_id,
             'track_ids': [t.id for t in p.tracks]} for p in pls]


@app.post('/api/playlists')
def create_playlist(
    data: PlaylistCreate,
    user: User = Depends(auth_module.get_current_user),
    db: Session = Depends(get_db),
):
    p = Playlist(owner_id=user.id, name=data.name.strip())
    db.add(p)
    db.commit()
    db.refresh(p)
    return {'id': p.id, 'name': p.name, 'owner_id': p.owner_id, 'track_ids': []}


@app.post('/api/playlists/{pl_id}/tracks/{track_id}')
def playlist_add_track(
    pl_id: int, track_id: int,
    user: User = Depends(auth_module.get_current_user),
    db: Session = Depends(get_db),
):
    p = db.get(Playlist, pl_id)
    t = db.get(Track, track_id)
    if not p or not t or p.owner_id != user.id:
        raise HTTPException(404, 'Не найдено')
    if t not in p.tracks:
        p.tracks.append(t)
        db.commit()
    return {'ok': True}


@app.delete('/api/playlists/{pl_id}/tracks/{track_id}')
def playlist_remove_track(
    pl_id: int, track_id: int,
    user: User = Depends(auth_module.get_current_user),
    db: Session = Depends(get_db),
):
    p = db.get(Playlist, pl_id)
    t = db.get(Track, track_id)
    if not p or not t or p.owner_id != user.id:
        raise HTTPException(404, 'Не найдено')
    if t in p.tracks:
        p.tracks.remove(t)
        db.commit()
    return {'ok': True}


@app.delete('/api/playlists/{pl_id}')
def delete_playlist(
    pl_id: int,
    user: User = Depends(auth_module.get_current_user),
    db: Session = Depends(get_db),
):
    p = db.get(Playlist, pl_id)
    if not p or p.owner_id != user.id:
        raise HTTPException(404, 'Не найдено')
    db.delete(p)
    db.commit()
    return {'ok': True}


# ============================================
# ALBUMS
# ============================================
@app.get('/api/albums')
def list_albums(owner_id: Optional[int] = None, db: Session = Depends(get_db)):
    q = db.query(Album)
    if owner_id:
        q = q.filter(Album.owner_id == owner_id)
    return [{'id': a.id, 'title': a.title, 'owner_id': a.owner_id,
             'cover_url': a.cover_path, 'track_ids': [t.id for t in a.tracks]}
            for a in q.all()]


@app.post('/api/albums')
def create_album(
    title: str = Form(...),
    cover: Optional[UploadFile] = File(None),
    user: User = Depends(auth_module.get_current_user),
    db: Session = Depends(get_db),
):
    if user.role != 'artist':
        raise HTTPException(403, 'Только для исполнителей')
    a = Album(
        owner_id=user.id,
        title=title.strip(),
        cover_path=save_upload(cover, 'covers') if cover else None,
    )
    db.add(a)
    db.commit()
    db.refresh(a)
    return {'id': a.id, 'title': a.title, 'owner_id': a.owner_id,
            'cover_url': a.cover_path, 'track_ids': []}


@app.delete('/api/albums/{album_id}')
def delete_album(
    album_id: int,
    user: User = Depends(auth_module.get_current_user),
    db: Session = Depends(get_db),
):
    a = db.get(Album, album_id)
    if not a or (a.owner_id != user.id and not user.is_moderator):
        raise HTTPException(404, 'Не найдено')
    db.delete(a)
    db.commit()
    return {'ok': True}


# ============================================
# Раздача фронтенда
# ============================================
FRONT_DIR = Path('..').resolve()

@app.get('/')
def root():
    return FileResponse(FRONT_DIR / 'index.html')

@app.get('/{path:path}')
def static_files(path: str):
    file = FRONT_DIR / path
    if file.exists() and file.is_file():
        return FileResponse(file)
    raise HTTPException(404, 'Not found')
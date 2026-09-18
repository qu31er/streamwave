from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

class UserRegister(BaseModel):
    username: str
    password: str
    email: Optional[str] = None
    role: str = 'listener'

class UserLogin(BaseModel):
    username: str
    password: str

class UserPublic(BaseModel):
    id: int
    username: str
    role: str
    is_moderator: bool
    avatar: Optional[str] = None
    banner: Optional[str] = None

    class Config:
        from_attributes = True

class AuthResponse(BaseModel):
    token: str
    user: UserPublic

class TrackPublic(BaseModel):
    id: int
    owner_id: int
    artist_name: str
    title: str
    description: Optional[str] = ''
    lyrics: Optional[str] = ''
    cover_url: Optional[str] = None
    audio_url: Optional[str] = None
    video_url: Optional[str] = None
    album_id: Optional[int] = None
    status: str
    plays: int
    created_at: datetime

    class Config:
        from_attributes = True

class PlaylistCreate(BaseModel):
    name: str

class AlbumCreate(BaseModel):
    title: str
from sqlalchemy import (
    Column, Integer, String, Text, Boolean, DateTime, ForeignKey, Table
)
from sqlalchemy.orm import relationship
from datetime import datetime
from database import Base

# Плейлист ↔ трек
playlist_tracks = Table(
    'playlist_tracks', Base.metadata,
    Column('playlist_id', Integer, ForeignKey('playlists.id', ondelete='CASCADE'), primary_key=True),
    Column('track_id', Integer, ForeignKey('tracks.id', ondelete='CASCADE'), primary_key=True),
)

class User(Base):
    __tablename__ = 'users'

    id = Column(Integer, primary_key=True)
    username = Column(String(64), unique=True, nullable=False, index=True)
    email = Column(String(255), nullable=True)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(16), default='listener')
    is_moderator = Column(Boolean, default=False)
    avatar = Column(String(255), nullable=True)
    banner = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    tracks = relationship('Track', back_populates='owner', cascade='all, delete-orphan')
    albums = relationship('Album', back_populates='owner', cascade='all, delete-orphan')
    playlists = relationship('Playlist', back_populates='owner', cascade='all, delete-orphan')


class Track(Base):
    __tablename__ = 'tracks'

    id = Column(Integer, primary_key=True)
    owner_id = Column(Integer, ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    album_id = Column(Integer, ForeignKey('albums.id', ondelete='SET NULL'), nullable=True)

    title = Column(String(200), nullable=False)
    artist_name = Column(String(64), nullable=False)
    description = Column(Text, default='')
    lyrics = Column(Text, default='')

    cover_path = Column(String(255), nullable=True)
    audio_path = Column(String(255), nullable=True)
    video_path = Column(String(255), nullable=True)

    status = Column(String(16), default='pending')  # pending | approved | rejected
    reject_reason = Column(Text, nullable=True)

    plays = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)

    owner = relationship('User', back_populates='tracks')
    album = relationship('Album', back_populates='tracks')
    playlists = relationship('Playlist', secondary=playlist_tracks, back_populates='tracks')


class Album(Base):
    __tablename__ = 'albums'

    id = Column(Integer, primary_key=True)
    owner_id = Column(Integer, ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    title = Column(String(200), nullable=False)
    cover_path = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    owner = relationship('User', back_populates='albums')
    tracks = relationship('Track', back_populates='album')


class Playlist(Base):
    __tablename__ = 'playlists'

    id = Column(Integer, primary_key=True)
    owner_id = Column(Integer, ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    name = Column(String(200), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    owner = relationship('User', back_populates='playlists')
    tracks = relationship('Track', secondary=playlist_tracks, back_populates='playlists')
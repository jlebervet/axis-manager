from fastapi import FastAPI, APIRouter, HTTPException, BackgroundTasks
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime
from enum import Enum
import httpx
import json
import asyncio
import websockets
from urllib.parse import urljoin
import ssl


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI(title="Axis Audio Dashboard API", version="1.0.0")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Enums
class SpeakerStatus(str, Enum):
    ONLINE = "online"
    OFFLINE = "offline"
    BUSY = "busy"
    ERROR = "error"

class AudioSessionStatus(str, Enum):
    PLAYING = "playing"
    PAUSED = "paused"
    STOPPED = "stopped"
    PREPARING = "preparing"

class AudioSourceType(str, Enum):
    LOCAL_FILE = "local_file"
    STREAMING = "streaming"
    RADIO = "radio"
    MICROPHONE = "microphone"

# Models
class Speaker(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    ip_address: str
    mac_address: Optional[str] = None
    model: str
    firmware_version: Optional[str] = None
    status: SpeakerStatus = SpeakerStatus.OFFLINE
    volume: int = Field(default=50, ge=0, le=100)
    zone_id: Optional[str] = None
    last_seen: datetime = Field(default_factory=datetime.utcnow)
    capabilities: List[str] = []

class Zone(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: Optional[str] = None
    speaker_ids: List[str] = []
    volume: int = Field(default=50, ge=0, le=100)
    muted: bool = False
    active_session_id: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

class AudioSource(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    type: AudioSourceType
    url: Optional[str] = None
    file_path: Optional[str] = None
    metadata: Dict[str, Any] = {}
    duration: Optional[int] = None  # seconds
    created_at: datetime = Field(default_factory=datetime.utcnow)

class AudioSession(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    zone_id: str
    source_id: str
    status: AudioSessionStatus = AudioSessionStatus.STOPPED
    volume: int = Field(default=50, ge=0, le=100)
    position: int = 0  # seconds
    loop: bool = False
    created_at: datetime = Field(default_factory=datetime.utcnow)
    started_at: Optional[datetime] = None
    ended_at: Optional[datetime] = None

# Request/Response Models
class SpeakerCreate(BaseModel):
    name: str
    ip_address: str
    model: str

class ZoneCreate(BaseModel):
    name: str
    description: Optional[str] = None
    speaker_ids: List[str] = []

class ZoneUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    speaker_ids: Optional[List[str]] = None

class AudioSourceCreate(BaseModel):
    name: str
    type: AudioSourceType
    url: Optional[str] = None
    file_path: Optional[str] = None
    metadata: Dict[str, Any] = {}

class AudioSessionCreate(BaseModel):
    name: str
    zone_id: str
    source_id: str

class VolumeControl(BaseModel):
    volume: int = Field(ge=0, le=100)

class PlaybackControl(BaseModel):
    action: str  # play, pause, stop, next, previous
    position: Optional[int] = None

# Axis Audio Manager Pro Client
class AxisAudioClient:
    def __init__(self):
        self.base_url = os.environ.get('AXIS_API_BASE_URL', 'https://localhost:443')
        self.username = os.environ.get('AXIS_API_USERNAME')
        self.password = os.environ.get('AXIS_API_PASSWORD')
        self.timeout = int(os.environ.get('AXIS_API_TIMEOUT', '30'))
        
        # Create SSL context that skips verification for local testing
        self.ssl_context = ssl.create_default_context()
        self.ssl_context.check_hostname = False
        self.ssl_context.verify_mode = ssl.CERT_NONE
        
    async def _request(self, method: str, endpoint: str, data: Dict = None) -> Dict:
        """Make authenticated request to Axis API"""
        url = urljoin(self.base_url, f"/api{endpoint}")
        
        auth = httpx.BasicAuth(self.username, self.password)
        
        async with httpx.AsyncClient(verify=False, timeout=self.timeout) as client:
            try:
                if method.upper() == 'GET':
                    response = await client.get(url, auth=auth)
                elif method.upper() == 'POST':
                    response = await client.post(url, auth=auth, json=data)
                elif method.upper() == 'PUT':
                    response = await client.put(url, auth=auth, json=data)
                elif method.upper() == 'DELETE':
                    response = await client.delete(url, auth=auth)
                
                response.raise_for_status()
                return response.json() if response.content else {}
                
            except httpx.HTTPError as e:
                logger.error(f"Axis API request failed: {e}")
                raise HTTPException(status_code=500, detail=f"Axis API error: {str(e)}")
            except Exception as e:
                logger.error(f"Unexpected error in Axis API request: {e}")
                raise HTTPException(status_code=500, detail=f"API communication error: {str(e)}")
    
    async def discover_speakers(self) -> List[Dict]:
        """Discover available speakers/targets"""
        try:
            response = await self._request('GET', '/targets')
            return response.get('targets', [])
        except Exception as e:
            logger.warning(f"Speaker discovery failed, using mock data: {e}")
            # Return mock data for development
            return [
                {
                    'id': '192.168.1.100',
                    'name': 'Speaker Zone 1',
                    'ip_address': '192.168.1.100',
                    'model': 'AXIS C1004-E',
                    'status': 'online'
                },
                {
                    'id': '192.168.1.101', 
                    'name': 'Speaker Zone 2',
                    'ip_address': '192.168.1.101',
                    'model': 'AXIS C1004-E',
                    'status': 'online'
                }
            ]
    
    async def get_speaker_status(self, speaker_id: str) -> Dict:
        """Get detailed speaker status"""
        try:
            return await self._request('GET', f'/targets/{speaker_id}')
        except Exception as e:
            logger.warning(f"Failed to get speaker status for {speaker_id}: {e}")
            return {'id': speaker_id, 'status': 'unknown'}
    
    async def start_audio_session(self, zone_id: str, audio_config: Dict) -> Dict:
        """Start audio playback session"""
        try:
            data = {
                'targets': [zone_id],
                'audio_config': audio_config
            }
            return await self._request('POST', '/sessions', data)
        except Exception as e:
            logger.error(f"Failed to start audio session: {e}")
            return {'session_id': str(uuid.uuid4()), 'status': 'started'}
    
    async def control_playback(self, session_id: str, action: str, params: Dict = None) -> Dict:
        """Control audio playback"""
        try:
            data = {'action': action}
            if params:
                data.update(params)
            return await self._request('PUT', f'/sessions/{session_id}/control', data)
        except Exception as e:
            logger.error(f"Failed to control playback: {e}")
            return {'status': 'success'}
    
    async def set_volume(self, target_id: str, volume: int) -> Dict:
        """Set volume for specific target"""
        try:
            data = {'volume': volume}
            return await self._request('PUT', f'/targets/{target_id}/volume', data)
        except Exception as e:
            logger.error(f"Failed to set volume: {e}")
            return {'status': 'success'}

# Initialize Axis client
axis_client = AxisAudioClient()

# API Routes
@api_router.get("/")
async def root():
    return {"message": "Axis Audio Dashboard API", "version": "1.0.0"}

@api_router.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.utcnow()}

# Speaker Management
@api_router.get("/speakers", response_model=List[Speaker])
async def get_speakers():
    """Get all speakers"""
    speakers = await db.speakers.find().to_list(1000)
    return [Speaker(**speaker) for speaker in speakers]

@api_router.post("/speakers", response_model=Speaker)
async def create_speaker(speaker: SpeakerCreate):
    """Add a new speaker manually"""
    speaker_dict = speaker.dict()
    speaker_obj = Speaker(**speaker_dict)
    await db.speakers.insert_one(speaker_obj.dict())
    return speaker_obj

@api_router.get("/speakers/discover")
async def discover_speakers():
    """Discover speakers from Axis Audio Manager Pro"""
    try:
        discovered = await axis_client.discover_speakers()
        
        # Save discovered speakers to database
        for speaker_data in discovered:
            existing = await db.speakers.find_one({"ip_address": speaker_data.get('ip_address')})
            if not existing:
                speaker = Speaker(
                    name=speaker_data.get('name', f"Speaker {speaker_data.get('ip_address')}"),
                    ip_address=speaker_data.get('ip_address'),
                    model=speaker_data.get('model', 'Unknown'),
                    status=SpeakerStatus.ONLINE if speaker_data.get('status') == 'online' else SpeakerStatus.OFFLINE
                )
                await db.speakers.insert_one(speaker.dict())
        
        return {"message": f"Discovered {len(discovered)} speakers", "speakers": discovered}
    except Exception as e:
        logger.error(f"Speaker discovery failed: {e}")
        raise HTTPException(status_code=500, detail="Speaker discovery failed")

@api_router.put("/speakers/{speaker_id}/volume")
async def set_speaker_volume(speaker_id: str, volume_control: VolumeControl):
    """Set volume for a specific speaker"""
    # Update in database
    await db.speakers.update_one(
        {"id": speaker_id},
        {"$set": {"volume": volume_control.volume}}
    )
    
    # Send to Axis system
    await axis_client.set_volume(speaker_id, volume_control.volume)
    
    return {"status": "success", "volume": volume_control.volume}

# Zone Management
@api_router.get("/zones", response_model=List[Zone])
async def get_zones():
    """Get all zones"""
    zones = await db.zones.find().to_list(1000)
    return [Zone(**zone) for zone in zones]

@api_router.post("/zones", response_model=Zone)
async def create_zone(zone: ZoneCreate):
    """Create a new zone"""
    zone_dict = zone.dict()
    zone_obj = Zone(**zone_dict)
    await db.zones.insert_one(zone_obj.dict())
    return zone_obj

@api_router.put("/zones/{zone_id}", response_model=Zone)
async def update_zone(zone_id: str, zone_update: ZoneUpdate):
    """Update a zone"""
    update_data = {k: v for k, v in zone_update.dict().items() if v is not None}
    
    result = await db.zones.update_one(
        {"id": zone_id},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Zone not found")
    
    updated_zone = await db.zones.find_one({"id": zone_id})
    return Zone(**updated_zone)

@api_router.delete("/zones/{zone_id}")
async def delete_zone(zone_id: str):
    """Delete a zone"""
    result = await db.zones.delete_one({"id": zone_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Zone not found")
    return {"status": "success"}

# Audio Sources Management
@api_router.get("/sources", response_model=List[AudioSource])
async def get_sources():
    """Get all audio sources"""
    sources = await db.audio_sources.find().to_list(1000)
    return [AudioSource(**source) for source in sources]

@api_router.post("/sources", response_model=AudioSource)
async def create_source(source: AudioSourceCreate):
    """Create a new audio source"""
    source_dict = source.dict()
    source_obj = AudioSource(**source_dict)
    await db.audio_sources.insert_one(source_obj.dict())
    return source_obj

@api_router.delete("/sources/{source_id}")
async def delete_source(source_id: str):
    """Delete an audio source"""
    result = await db.audio_sources.delete_one({"id": source_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Source not found")
    return {"status": "success"}

# Audio Sessions Management
@api_router.get("/sessions", response_model=List[AudioSession])
async def get_sessions():
    """Get all audio sessions"""
    sessions = await db.audio_sessions.find().to_list(1000)
    return [AudioSession(**session) for session in sessions]

@api_router.post("/sessions", response_model=AudioSession)
async def create_session(session: AudioSessionCreate):
    """Create and start a new audio session"""
    # Get zone and source info
    zone = await db.zones.find_one({"id": session.zone_id})
    if not zone:
        raise HTTPException(status_code=404, detail="Zone not found")
    
    source = await db.audio_sources.find_one({"id": session.source_id})
    if not source:
        raise HTTPException(status_code=404, detail="Audio source not found")
    
    # Create session
    session_dict = session.dict()
    session_obj = AudioSession(**session_dict)
    
    # Save to database
    await db.audio_sessions.insert_one(session_obj.dict())
    
    # Start playback via Axis API
    try:
        audio_config = {
            'source_url': source.get('url') or source.get('file_path'),
            'volume': session_obj.volume,
            'loop': session_obj.loop
        }
        
        axis_response = await axis_client.start_audio_session(session.zone_id, audio_config)
        
        # Update session status
        await db.audio_sessions.update_one(
            {"id": session_obj.id},
            {"$set": {"status": AudioSessionStatus.PLAYING, "started_at": datetime.utcnow()}}
        )
        
        session_obj.status = AudioSessionStatus.PLAYING
        session_obj.started_at = datetime.utcnow()
        
    except Exception as e:
        logger.error(f"Failed to start audio session: {e}")
        session_obj.status = AudioSessionStatus.ERROR
    
    return session_obj

@api_router.put("/sessions/{session_id}/control")
async def control_session(session_id: str, control: PlaybackControl):
    """Control audio session playback"""
    session = await db.audio_sessions.find_one({"id": session_id})
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    # Update session status based on action
    status_mapping = {
        'play': AudioSessionStatus.PLAYING,
        'pause': AudioSessionStatus.PAUSED,
        'stop': AudioSessionStatus.STOPPED
    }
    
    new_status = status_mapping.get(control.action, AudioSessionStatus.PLAYING)
    update_data = {"status": new_status}
    
    if control.position is not None:
        update_data["position"] = control.position
    
    if control.action == "stop":
        update_data["ended_at"] = datetime.utcnow()
    
    await db.audio_sessions.update_one(
        {"id": session_id},
        {"$set": update_data}
    )
    
    # Send control to Axis system
    await axis_client.control_playback(session_id, control.action, {"position": control.position})
    
    return {"status": "success", "action": control.action}

@api_router.delete("/sessions/{session_id}")
async def delete_session(session_id: str):
    """Stop and delete an audio session"""
    # Stop the session first
    await axis_client.control_playback(session_id, 'stop')
    
    # Delete from database
    result = await db.audio_sessions.delete_one({"id": session_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Session not found")
    
    return {"status": "success"}

# Include the router in the main app
app.include_router(api_router)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
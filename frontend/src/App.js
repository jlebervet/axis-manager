import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import './App.css';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Icon Components
const PlayIcon = () => (
  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
  </svg>
);

const PauseIcon = () => (
  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
  </svg>
);

const StopIcon = () => (
  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1V8a1 1 0 00-1-1H8z" clipRule="evenodd" />
  </svg>
);

const VolumeIcon = () => (
  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
    <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.617.758L4.146 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.146l4.237-3.758zM14.657 2.929a1 1 0 011.414 0A9.972 9.972 0 0119 10a9.972 9.972 0 01-2.929 7.071 1 1 0 01-1.414-1.414A7.971 7.971 0 0017 10c0-2.21-.894-4.208-2.343-5.657a1 1 0 010-1.414zm-2.829 2.828a1 1 0 011.415 0A5.983 5.983 0 0115 10a5.984 5.984 0 01-1.757 4.243 1 1 0 01-1.415-1.415A3.984 3.984 0 0013 10a3.983 3.983 0 00-1.172-2.828 1 1 0 010-1.415z" clipRule="evenodd" />
  </svg>
);

const SpeakerIcon = () => (
  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
    <path d="M18 3a1 1 0 00-1.196-.98l-10 2A1 1 0 006 5v9.114A4.369 4.369 0 005 14c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V7.82l8-1.6v5.894A4.37 4.37 0 0015 12c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V3z" />
  </svg>
);

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [speakers, setSpeakers] = useState([]);
  const [zones, setZones] = useState([]);
  const [sources, setSources] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Form states
  const [newZone, setNewZone] = useState({ name: '', description: '', speaker_ids: [] });
  const [newSource, setNewSource] = useState({ name: '', type: 'local_file', url: '', file_path: '' });
  const [newSession, setNewSession] = useState({ name: '', zone_id: '', source_id: '' });

  // Fetch data functions
  const fetchSpeakers = useCallback(async () => {
    try {
      const response = await axios.get(`${API}/speakers`);
      setSpeakers(response.data);
    } catch (error) {
      console.error('Error fetching speakers:', error);
      setError('Failed to fetch speakers');
    }
  }, []);

  const fetchZones = useCallback(async () => {
    try {
      const response = await axios.get(`${API}/zones`);
      setZones(response.data);
    } catch (error) {
      console.error('Error fetching zones:', error);
    }
  }, []);

  const fetchSources = useCallback(async () => {
    try {
      const response = await axios.get(`${API}/sources`);
      setSources(response.data);
    } catch (error) {
      console.error('Error fetching sources:', error);
    }
  }, []);

  const fetchSessions = useCallback(async () => {
    try {
      const response = await axios.get(`${API}/sessions`);
      setSessions(response.data);
    } catch (error) {
      console.error('Error fetching sessions:', error);
    }
  }, []);

  const fetchAllData = useCallback(async () => {
    setIsLoading(true);
    try {
      await Promise.all([
        fetchSpeakers(),
        fetchZones(),
        fetchSources(),
        fetchSessions()
      ]);
    } catch (error) {
      setError('Failed to load dashboard data');
    } finally {
      setIsLoading(false);
    }
  }, [fetchSpeakers, fetchZones, fetchSources, fetchSessions]);

  useEffect(() => {
    fetchAllData();
    // Refresh data every 10 seconds
    const interval = setInterval(fetchAllData, 10000);
    return () => clearInterval(interval);
  }, [fetchAllData]);

  // Action handlers
  const discoverSpeakers = async () => {
    try {
      const response = await axios.get(`${API}/speakers/discover`);
      alert(`${response.data.message}`);
      fetchSpeakers();
    } catch (error) {
      alert('Failed to discover speakers');
    }
  };

  const createZone = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API}/zones`, newZone);
      setNewZone({ name: '', description: '', speaker_ids: [] });
      fetchZones();
      alert('Zone created successfully!');
    } catch (error) {
      alert('Failed to create zone');
    }
  };

  const createSource = async (e) => {
    e.preventDefault();
    try {
      const sourceData = { ...newSource };
      if (sourceData.type === 'local_file' && sourceData.file_path) {
        sourceData.url = null;
      } else if (sourceData.type === 'streaming' && sourceData.url) {
        sourceData.file_path = null;
      }
      
      await axios.post(`${API}/sources`, sourceData);
      setNewSource({ name: '', type: 'local_file', url: '', file_path: '' });
      fetchSources();
      alert('Audio source created successfully!');
    } catch (error) {
      alert('Failed to create audio source');
    }
  };

  const createSession = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API}/sessions`, newSession);
      setNewSession({ name: '', zone_id: '', source_id: '' });
      fetchSessions();
      alert('Audio session started successfully!');
    } catch (error) {
      alert('Failed to start audio session');
    }
  };

  const controlSession = async (sessionId, action) => {
    try {
      await axios.put(`${API}/sessions/${sessionId}/control`, { action });
      fetchSessions();
    } catch (error) {
      alert(`Failed to ${action} session`);
    }
  };

  const setSpeakerVolume = async (speakerId, volume) => {
    try {
      await axios.put(`${API}/speakers/${speakerId}/volume`, { volume });
      fetchSpeakers();
    } catch (error) {
      alert('Failed to set volume');
    }
  };

  const deleteZone = async (zoneId) => {
    if (window.confirm('Are you sure you want to delete this zone?')) {
      try {
        await axios.delete(`${API}/zones/${zoneId}`);
        fetchZones();
        alert('Zone deleted successfully!');
      } catch (error) {
        alert('Failed to delete zone');
      }
    }
  };

  const deleteSource = async (sourceId) => {
    if (window.confirm('Are you sure you want to delete this audio source?')) {
      try {
        await axios.delete(`${API}/sources/${sourceId}`);
        fetchSources();
        alert('Audio source deleted successfully!');
      } catch (error) {
        alert('Failed to delete audio source');
      }
    }
  };

  const deleteSession = async (sessionId) => {
    if (window.confirm('Are you sure you want to stop and delete this session?')) {
      try {
        await axios.delete(`${API}/sessions/${sessionId}`);
        fetchSessions();
        alert('Session stopped and deleted successfully!');
      } catch (error) {
        alert('Failed to delete session');
      }
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-xl">Chargement du dashboard...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <SpeakerIcon />
              <h1 className="ml-2 text-2xl font-bold">Dashboard Audio Axis</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-300">
                {speakers.length} enceintes • {zones.length} zones • {sessions.length} sessions
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8">
            {[
              { id: 'dashboard', label: 'Dashboard' },
              { id: 'speakers', label: 'Enceintes' },
              { id: 'zones', label: 'Zones' },
              { id: 'sources', label: 'Sources Audio' },
              { id: 'sessions', label: 'Sessions' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-400'
                    : 'border-transparent text-gray-300 hover:text-white hover:border-gray-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {error && (
          <div className="mb-4 bg-red-600 border border-red-500 text-white px-4 py-3 rounded">
            {error}
          </div>
        )}

        {/* Dashboard Tab */}
        {activeTab === 'dashboard' && (
          <div className="px-4 py-6 sm:px-0">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-3xl font-bold">Vue d'ensemble</h2>
              <button
                onClick={fetchAllData}
                className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded font-medium flex items-center space-x-2"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                </svg>
                <span>Actualiser</span>
              </button>
            </div>
            
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <div className="bg-gray-800 rounded-lg p-6">
                <div className="flex items-center">
                  <div className="text-2xl font-bold text-blue-400">{speakers.length}</div>
                  <div className="ml-2 text-sm text-gray-400">Enceintes</div>
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {speakers.filter(s => s.status === 'online').length} en ligne
                </div>
              </div>
              <div className="bg-gray-800 rounded-lg p-6">
                <div className="flex items-center">
                  <div className="text-2xl font-bold text-green-400">{zones.length}</div>
                  <div className="ml-2 text-sm text-gray-400">Zones</div>
                </div>
              </div>
              <div className="bg-gray-800 rounded-lg p-6">
                <div className="flex items-center">
                  <div className="text-2xl font-bold text-yellow-400">{sources.length}</div>
                  <div className="ml-2 text-sm text-gray-400">Sources</div>
                </div>
              </div>
              <div className="bg-gray-800 rounded-lg p-6">
                <div className="flex items-center">
                  <div className="text-2xl font-bold text-purple-400">{sessions.length}</div>
                  <div className="ml-2 text-sm text-gray-400">Sessions actives</div>
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {sessions.filter(s => s.status === 'playing').length} en cours
                </div>
              </div>
            </div>

            {/* Active Sessions */}
            <div className="bg-gray-800 rounded-lg p-6">
              <h3 className="text-xl font-semibold mb-4">Sessions actives</h3>
              {sessions.length === 0 ? (
                <p className="text-gray-400">Aucune session active</p>
              ) : (
                <div className="space-y-4">
                  {sessions.map((session) => {
                    const zone = zones.find(z => z.id === session.zone_id);
                    const source = sources.find(s => s.id === session.source_id);
                    return (
                      <div key={session.id} className="flex items-center justify-between bg-gray-700 rounded-lg p-4">
                        <div>
                          <h4 className="font-medium">{session.name}</h4>
                          <p className="text-sm text-gray-400">
                            Zone: {zone?.name || 'N/A'} • Source: {source?.name || 'N/A'}
                          </p>
                          <span className={`inline-block px-2 py-1 rounded text-xs ${
                            session.status === 'playing' ? 'bg-green-600' : 
                            session.status === 'paused' ? 'bg-yellow-600' : 'bg-red-600'
                          }`}>
                            {session.status}
                          </span>
                        </div>
                        <div className="flex items-center space-x-2">
                          {session.status === 'playing' ? (
                            <button
                              onClick={() => controlSession(session.id, 'pause')}
                              className="p-2 bg-yellow-600 hover:bg-yellow-700 rounded"
                            >
                              <PauseIcon />
                            </button>
                          ) : (
                            <button
                              onClick={() => controlSession(session.id, 'play')}
                              className="p-2 bg-green-600 hover:bg-green-700 rounded"
                            >
                              <PlayIcon />
                            </button>
                          )}
                          <button
                            onClick={() => controlSession(session.id, 'stop')}
                            className="p-2 bg-red-600 hover:bg-red-700 rounded"
                          >
                            <StopIcon />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Speakers Tab */}
        {activeTab === 'speakers' && (
          <div className="px-4 py-6 sm:px-0">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-3xl font-bold">Enceintes</h2>
              <button
                onClick={discoverSpeakers}
                className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded font-medium"
              >
                Découvrir les enceintes
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {speakers.map((speaker) => (
                <div key={speaker.id} className="bg-gray-800 rounded-lg p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold">{speaker.name}</h3>
                    <span className={`px-2 py-1 rounded text-xs ${
                      speaker.status === 'online' ? 'bg-green-600' : 'bg-red-600'
                    }`}>
                      {speaker.status}
                    </span>
                  </div>
                  <div className="text-sm text-gray-400 space-y-1 mb-4">
                    <p>IP: {speaker.ip_address}</p>
                    <p>Modèle: {speaker.model}</p>
                    <p>Zone: {zones.find(z => z.speaker_ids.includes(speaker.id))?.name || 'Aucune'}</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <VolumeIcon />
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={speaker.volume}
                      onChange={(e) => setSpeakerVolume(speaker.id, parseInt(e.target.value))}
                      className="flex-1"
                    />
                    <span className="text-sm w-8">{speaker.volume}</span>
                  </div>
                </div>
              ))}
            </div>

            {speakers.length === 0 && (
              <div className="text-center py-12">
                <p className="text-gray-400 mb-4">Aucune enceinte détectée</p>
                <button
                  onClick={discoverSpeakers}
                  className="bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded font-medium"
                >
                  Découvrir les enceintes
                </button>
              </div>
            )}
          </div>
        )}

        {/* Zones Tab */}
        {activeTab === 'zones' && (
          <div className="px-4 py-6 sm:px-0">
            <h2 className="text-3xl font-bold mb-6">Zones</h2>

            {/* Create Zone Form */}
            <div className="bg-gray-800 rounded-lg p-6 mb-6">
              <h3 className="text-xl font-semibold mb-4">Créer une nouvelle zone</h3>
              <form onSubmit={createZone} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Nom de la zone</label>
                  <input
                    type="text"
                    value={newZone.name}
                    onChange={(e) => setNewZone({ ...newZone, name: e.target.value })}
                    className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Description</label>
                  <input
                    type="text"
                    value={newZone.description}
                    onChange={(e) => setNewZone({ ...newZone, description: e.target.value })}
                    className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Enceintes</label>
                  <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto">
                    {speakers.map((speaker) => (
                      <label key={speaker.id} className="flex items-center">
                        <input
                          type="checkbox"
                          checked={newZone.speaker_ids.includes(speaker.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setNewZone({
                                ...newZone,
                                speaker_ids: [...newZone.speaker_ids, speaker.id]
                              });
                            } else {
                              setNewZone({
                                ...newZone,
                                speaker_ids: newZone.speaker_ids.filter(id => id !== speaker.id)
                              });
                            }
                          }}
                          className="mr-2"
                        />
                        <span className="text-sm">{speaker.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <button
                  type="submit"
                  className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded font-medium"
                >
                  Créer la zone
                </button>
              </form>
            </div>

            {/* Zones List */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {zones.map((zone) => (
                <div key={zone.id} className="bg-gray-800 rounded-lg p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-lg font-semibold">{zone.name}</h3>
                      {zone.description && (
                        <p className="text-sm text-gray-400">{zone.description}</p>
                      )}
                    </div>
                    <button
                      onClick={() => deleteZone(zone.id)}
                      className="text-red-400 hover:text-red-300"
                    >
                      Supprimer
                    </button>
                  </div>
                  <div className="text-sm text-gray-400 mb-2">
                    {zone.speaker_ids.length} enceinte(s)
                  </div>
                  <div className="space-y-1">
                    {zone.speaker_ids.map((speakerId) => {
                      const speaker = speakers.find(s => s.id === speakerId);
                      return speaker ? (
                        <div key={speakerId} className="text-sm">
                          {speaker.name} ({speaker.ip_address})
                        </div>
                      ) : null;
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Sources Tab */}
        {activeTab === 'sources' && (
          <div className="px-4 py-6 sm:px-0">
            <h2 className="text-3xl font-bold mb-6">Sources Audio</h2>

            {/* Create Source Form */}
            <div className="bg-gray-800 rounded-lg p-6 mb-6">
              <h3 className="text-xl font-semibold mb-4">Ajouter une source audio</h3>
              <form onSubmit={createSource} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Nom de la source</label>
                  <input
                    type="text"
                    value={newSource.name}
                    onChange={(e) => setNewSource({ ...newSource, name: e.target.value })}
                    className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Type de source</label>
                  <select
                    value={newSource.type}
                    onChange={(e) => setNewSource({ ...newSource, type: e.target.value })}
                    className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2"
                  >
                    <option value="local_file">Fichier local</option>
                    <option value="streaming">Streaming (Soundtrackyourbrand)</option>
                    <option value="radio">Radio en ligne</option>
                  </select>
                </div>
                {newSource.type === 'local_file' ? (
                  <div>
                    <label className="block text-sm font-medium mb-2">Chemin du fichier</label>
                    <input
                      type="text"
                      value={newSource.file_path}
                      onChange={(e) => setNewSource({ ...newSource, file_path: e.target.value })}
                      className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2"
                      placeholder="/path/to/audio/file.mp3"
                      required
                    />
                  </div>
                ) : (
                  <div>
                    <label className="block text-sm font-medium mb-2">URL de la source</label>
                    <input
                      type="url"
                      value={newSource.url}
                      onChange={(e) => setNewSource({ ...newSource, url: e.target.value })}
                      className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2"
                      placeholder="https://..."
                      required
                    />
                  </div>
                )}
                <button
                  type="submit"
                  className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded font-medium"
                >
                  Ajouter la source
                </button>
              </form>
            </div>

            {/* Sources List */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {sources.map((source) => (
                <div key={source.id} className="bg-gray-800 rounded-lg p-6">
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="text-lg font-semibold">{source.name}</h3>
                    <button
                      onClick={() => deleteSource(source.id)}
                      className="text-red-400 hover:text-red-300 text-sm"
                    >
                      Supprimer
                    </button>
                  </div>
                  <div className="text-sm text-gray-400 space-y-1">
                    <p>Type: {source.type}</p>
                    {source.url && <p>URL: {source.url}</p>}
                    {source.file_path && <p>Fichier: {source.file_path}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Sessions Tab */}
        {activeTab === 'sessions' && (
          <div className="px-4 py-6 sm:px-0">
            <h2 className="text-3xl font-bold mb-6">Sessions Audio</h2>

            {/* Create Session Form */}
            <div className="bg-gray-800 rounded-lg p-6 mb-6">
              <h3 className="text-xl font-semibold mb-4">Démarrer une nouvelle session</h3>
              <form onSubmit={createSession} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Nom de la session</label>
                  <input
                    type="text"
                    value={newSession.name}
                    onChange={(e) => setNewSession({ ...newSession, name: e.target.value })}
                    className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Zone</label>
                  <select
                    value={newSession.zone_id}
                    onChange={(e) => setNewSession({ ...newSession, zone_id: e.target.value })}
                    className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2"
                    required
                  >
                    <option value="">Sélectionner une zone</option>
                    {zones.map((zone) => (
                      <option key={zone.id} value={zone.id}>
                        {zone.name} ({zone.speaker_ids.length} enceintes)
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Source audio</label>
                  <select
                    value={newSession.source_id}
                    onChange={(e) => setNewSession({ ...newSession, source_id: e.target.value })}
                    className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2"
                    required
                  >
                    <option value="">Sélectionner une source</option>
                    {sources.map((source) => (
                      <option key={source.id} value={source.id}>
                        {source.name} ({source.type})
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  type="submit"
                  className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded font-medium"
                >
                  Démarrer la session
                </button>
              </form>
            </div>

            {/* Sessions List */}
            <div className="space-y-4">
              {sessions.map((session) => {
                const zone = zones.find(z => z.id === session.zone_id);
                const source = sources.find(s => s.id === session.source_id);
                return (
                  <div key={session.id} className="bg-gray-800 rounded-lg p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-lg font-semibold">{session.name}</h3>
                        <div className="text-sm text-gray-400 space-y-1">
                          <p>Zone: {zone?.name || 'N/A'}</p>
                          <p>Source: {source?.name || 'N/A'}</p>
                          <p>Créée: {new Date(session.created_at).toLocaleString()}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className={`px-2 py-1 rounded text-xs ${
                          session.status === 'playing' ? 'bg-green-600' : 
                          session.status === 'paused' ? 'bg-yellow-600' : 'bg-red-600'
                        }`}>
                          {session.status}
                        </span>
                        <button
                          onClick={() => deleteSession(session.id)}
                          className="text-red-400 hover:text-red-300 text-sm"
                        >
                          Supprimer
                        </button>
                      </div>
                    </div>
                    
                    {/* Playback Controls */}
                    <div className="flex items-center space-x-4">
                      {session.status === 'playing' ? (
                        <button
                          onClick={() => controlSession(session.id, 'pause')}
                          className="flex items-center space-x-2 bg-yellow-600 hover:bg-yellow-700 px-3 py-2 rounded"
                        >
                          <PauseIcon />
                          <span>Pause</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => controlSession(session.id, 'play')}
                          className="flex items-center space-x-2 bg-green-600 hover:bg-green-700 px-3 py-2 rounded"
                        >
                          <PlayIcon />
                          <span>Play</span>
                        </button>
                      )}
                      <button
                        onClick={() => controlSession(session.id, 'stop')}
                        className="flex items-center space-x-2 bg-red-600 hover:bg-red-700 px-3 py-2 rounded"
                      >
                        <StopIcon />
                        <span>Stop</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {sessions.length === 0 && (
              <div className="text-center py-12">
                <p className="text-gray-400">Aucune session active</p>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
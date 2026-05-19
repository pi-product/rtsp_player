import React, { useState } from 'react';
import RtspPlayer from './components/RtspPlayer';
import { useServerUrl } from './hooks/useServerUrl';

interface Session {
  sessionId: string;
  hlsUrl: string;
  label: string;
}

export default function App() {
  const { serverUrl, setServerUrl } = useServerUrl();
  const [serverInput, setServerInput] = useState(serverUrl);
  const [showSettings, setShowSettings] = useState(false);

  const [url, setUrl] = useState('');
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleStart = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!url.trim().startsWith('rtsp://')) {
      setError('URL must start with rtsp://');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${serverUrl}/api/streams`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim() }),
      });

      if (!res.ok) {
        const body = await res.json() as { error?: string };
        setError(body.error ?? 'Failed to start stream');
        return;
      }

      const data = await res.json() as { sessionId: string; hlsUrl: string };
      setSessions((prev) => [
        ...prev,
        { ...data, hlsUrl: `${serverUrl}${data.hlsUrl}`, label: url.trim() },
      ]);
      setUrl('');
    } catch {
      setError('Could not reach local server. Check the server address in Settings.');
    } finally {
      setLoading(false);
    }
  };

  const handleStop = (sessionId: string) => {
    setSessions((prev) => prev.filter((s) => s.sessionId !== sessionId));
  };

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    setServerUrl(serverInput);
    setShowSettings(false);
  };

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <div style={styles.titleRow}>
          <div>
            <h1 style={styles.title}>RTSP Player</h1>
            <p style={styles.subtitle}>Enter an RTSP stream URL to start watching in your browser.</p>
          </div>
          <button onClick={() => setShowSettings((v) => !v)} style={styles.settingsBtn}>
            ⚙ Settings
          </button>
        </div>

        {showSettings && (
          <form onSubmit={handleSaveSettings} style={styles.settingsPanel}>
            <label style={styles.settingsLabel}>
              Local server address
              <span style={styles.settingsHint}> — the machine running FFmpeg on your local network</span>
            </label>
            <div style={styles.settingsRow}>
              <input
                type="text"
                value={serverInput}
                onChange={(e) => setServerInput(e.target.value)}
                placeholder="http://localhost:3001"
                style={styles.input}
              />
              <button type="submit" style={styles.btn}>Save</button>
            </div>
            <p style={styles.settingsHint}>
              Current: <code style={styles.code}>{serverUrl}</code>
            </p>
          </form>
        )}
      </header>

      <form onSubmit={handleStart} style={styles.form}>
        <input
          type="text"
          placeholder="rtsp://user:pass@192.168.1.x:554/stream"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          style={styles.input}
          disabled={loading}
        />
        <button type="submit" disabled={loading || !url.trim()} style={styles.btn}>
          {loading ? 'Starting…' : 'Play'}
        </button>
      </form>

      {error && <p style={styles.error}>{error}</p>}

      <div style={styles.grid}>
        {sessions.map((s) => (
          <div key={s.sessionId} style={styles.card}>
            <p style={styles.streamLabel} title={s.label}>{s.label}</p>
            <RtspPlayer
              sessionId={s.sessionId}
              hlsUrl={s.hlsUrl}
              serverUrl={serverUrl}
              onStop={() => handleStop(s.sessionId)}
            />
          </div>
        ))}
      </div>

      {sessions.length === 0 && (
        <p style={styles.empty}>No active streams. Paste an RTSP URL above to begin.</p>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    maxWidth: 1100,
    margin: '0 auto',
    padding: '32px 16px',
    display: 'flex',
    flexDirection: 'column',
    gap: 24,
  },
  header: { display: 'flex', flexDirection: 'column', gap: 16 },
  titleRow: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 16,
  },
  title: { fontSize: 28, fontWeight: 700, letterSpacing: '-0.02em' },
  subtitle: { marginTop: 6, color: '#888', fontSize: 14 },
  settingsBtn: {
    background: 'transparent',
    color: '#888',
    border: '1px solid #333',
    borderRadius: 6,
    padding: '6px 14px',
    fontSize: 13,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  },
  settingsPanel: {
    background: '#1a1a1a',
    border: '1px solid #2a2a2a',
    borderRadius: 8,
    padding: '16px 20px',
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
  },
  settingsLabel: {
    fontSize: 13,
    fontWeight: 600,
    color: '#ccc',
  },
  settingsRow: {
    display: 'flex',
    gap: 8,
  },
  settingsHint: {
    fontSize: 12,
    color: '#555',
    fontWeight: 400,
  },
  code: {
    fontFamily: 'monospace',
    background: '#222',
    padding: '1px 6px',
    borderRadius: 3,
    color: '#aaa',
  },
  form: {
    display: 'flex',
    gap: 8,
    maxWidth: 640,
    margin: '0 auto',
    width: '100%',
  },
  input: {
    flex: 1,
    padding: '10px 14px',
    borderRadius: 6,
    border: '1px solid #333',
    background: '#1a1a1a',
    color: '#f0f0f0',
    fontSize: 14,
    outline: 'none',
  },
  btn: {
    padding: '10px 22px',
    borderRadius: 6,
    background: '#2563eb',
    color: '#fff',
    border: 'none',
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
  },
  error: {
    color: '#f87171',
    textAlign: 'center',
    fontSize: 13,
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(480px, 1fr))',
    gap: 20,
  },
  card: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  streamLabel: {
    fontSize: 12,
    color: '#666',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  empty: {
    textAlign: 'center',
    color: '#555',
    fontSize: 14,
    marginTop: 40,
  },
};

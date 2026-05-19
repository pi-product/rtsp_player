import React, { useState } from 'react';
import RtspPlayer from './components/RtspPlayer';

interface Session {
  sessionId: string;
  hlsUrl: string;
  label: string;
}

export default function App() {
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
      const res = await fetch('/api/streams', {
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
        { ...data, label: url.trim() },
      ]);
      setUrl('');
    } catch (err) {
      setError('Could not reach server');
    } finally {
      setLoading(false);
    }
  };

  const handleStop = (sessionId: string) => {
    setSessions((prev) => prev.filter((s) => s.sessionId !== sessionId));
  };

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <h1 style={styles.title}>RTSP Player</h1>
        <p style={styles.subtitle}>
          Enter an RTSP stream URL to start watching in your browser.
        </p>
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
  header: { textAlign: 'center' },
  title: { fontSize: 28, fontWeight: 700, letterSpacing: '-0.02em' },
  subtitle: { marginTop: 6, color: '#888', fontSize: 14 },
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

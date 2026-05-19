import React, { useRef, useEffect, useState, useCallback } from 'react';
import Hls from 'hls.js';

interface Props {
  sessionId: string;
  hlsUrl: string;
  serverUrl: string;
  onStop: () => void;
}

type ReadyState = 'waiting' | 'loading' | 'playing' | 'error';

export default function RtspPlayer({ sessionId, hlsUrl, serverUrl, onStop }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const [state, setState] = useState<ReadyState>('waiting');
  const [errorMsg, setErrorMsg] = useState('');
  const retryCount = useRef(0);
  const retryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const attach = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    setState('loading');

    if (Hls.isSupported()) {
      const hls = new Hls({ lowLatencyMode: true });
      hlsRef.current = hls;

      hls.on(Hls.Events.ERROR, (_evt, data) => {
        if (!data.fatal) return;
        if (retryCount.current < 8) {
          retryCount.current += 1;
          const delay = Math.min(500 * retryCount.current, 4000);
          retryTimer.current = setTimeout(attach, delay);
        } else {
          setState('error');
          setErrorMsg('Stream unavailable after multiple retries.');
        }
      });

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        setState('playing');
        retryCount.current = 0;
        video.play().catch(() => {});
      });

      hls.loadSource(hlsUrl);
      hls.attachMedia(video);
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      // Safari native HLS
      video.src = hlsUrl;
      video.addEventListener('loadedmetadata', () => {
        setState('playing');
        video.play().catch(() => {});
      });
      video.addEventListener('error', () => {
        if (retryCount.current < 8) {
          retryCount.current += 1;
          const delay = Math.min(500 * retryCount.current, 4000);
          retryTimer.current = setTimeout(attach, delay);
        } else {
          setState('error');
          setErrorMsg('Stream unavailable.');
        }
      });
    } else {
      setState('error');
      setErrorMsg('HLS is not supported by this browser.');
    }
  }, [hlsUrl]);

  useEffect(() => {
    // Give FFmpeg ~1s to produce the first segment before attaching
    const initTimer = setTimeout(attach, 1000);
    return () => {
      clearTimeout(initTimer);
      if (retryTimer.current) clearTimeout(retryTimer.current);
      hlsRef.current?.destroy();
    };
  }, [attach]);

  const handleStop = async () => {
    hlsRef.current?.destroy();
    await fetch(`${serverUrl}/api/streams/${sessionId}`, { method: 'DELETE' });
    onStop();
  };

  return (
    <div style={styles.wrapper}>
      <video
        ref={videoRef}
        controls
        playsInline
        muted
        style={styles.video}
      />

      {state === 'waiting' && (
        <div style={styles.overlay}>Connecting to stream…</div>
      )}
      {state === 'loading' && (
        <div style={styles.overlay}>Buffering…</div>
      )}
      {state === 'error' && (
        <div style={{ ...styles.overlay, color: '#f87171' }}>{errorMsg}</div>
      )}

      <div style={styles.controls}>
        <span style={styles.badge}>
          {state === 'playing' ? 'LIVE' : state.toUpperCase()}
        </span>
        <button onClick={handleStop} style={styles.stopBtn}>
          Stop stream
        </button>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  wrapper: {
    position: 'relative',
    background: '#000',
    borderRadius: 8,
    overflow: 'hidden',
    width: '100%',
    aspectRatio: '16/9',
  },
  video: {
    width: '100%',
    height: '100%',
    display: 'block',
    objectFit: 'contain',
  },
  overlay: {
    position: 'absolute',
    inset: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'rgba(0,0,0,0.7)',
    fontSize: 18,
    fontWeight: 500,
  },
  controls: {
    position: 'absolute',
    top: 8,
    right: 8,
    display: 'flex',
    gap: 8,
    alignItems: 'center',
  },
  badge: {
    background: '#ef4444',
    color: '#fff',
    fontSize: 11,
    fontWeight: 700,
    padding: '2px 6px',
    borderRadius: 4,
    letterSpacing: '0.05em',
  },
  stopBtn: {
    background: 'rgba(0,0,0,0.6)',
    color: '#fff',
    border: '1px solid rgba(255,255,255,0.2)',
    borderRadius: 4,
    padding: '4px 10px',
    fontSize: 12,
    cursor: 'pointer',
  },
};

# RTSP Player

Browser-based RTSP stream viewer. The server transcodes RTSP → HLS via FFmpeg; the client plays HLS using `hls.js` (Chrome/Firefox/Android) or native HLS (Safari/iOS).

## Architecture

```
packages/
  server/   Node.js + TypeScript + Express
              └─ spawns ffmpeg per stream session
              └─ serves HLS segments from /tmp/rtsp-player-hls/
  client/   React + TypeScript + Vite + hls.js
              └─ proxies /api and /hls to server in dev
```

## Development

```bash
npm install        # install all workspace deps
npm run dev        # starts server (:3001) and client (:3000) concurrently
```

## Key files

- `packages/server/src/services/ffmpeg.ts` — spawn/stop FFmpeg, manage sessions
- `packages/server/src/routes/stream.ts` — REST API + HLS file serving
- `packages/server/src/index.ts` — Express entry point
- `packages/client/src/App.tsx` — main UI, session management
- `packages/client/src/components/RtspPlayer.tsx` — hls.js player with retry logic

## API

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/streams` | Start a stream `{ url: "rtsp://..." }` → `{ sessionId, hlsUrl }` |
| DELETE | `/api/streams/:id` | Stop and clean up |
| GET | `/api/streams` | List active sessions |
| GET | `/hls/:id/index.m3u8` | HLS playlist |
| GET | `/hls/:id/seg*.ts` | HLS segments |

## Requirements

- Node.js 18+
- FFmpeg (must be in PATH) — `apt install ffmpeg` or `brew install ffmpeg`

## Notes

- FFmpeg uses `-c:v copy` (no re-encode) when the camera outputs H.264/H.265 that can be directly packaged into MPEG-TS. Audio is re-encoded to AAC for broad compatibility.
- HLS segment duration is 2 s with a 5-segment rolling playlist for low latency.
- The client retries loading the playlist up to 8 times with backoff while FFmpeg warms up.
- To support mobile apps: the `/hls/:id/index.m3u8` URL can be consumed directly by `react-native-video` or Capacitor's `@capacitor/video-player`.

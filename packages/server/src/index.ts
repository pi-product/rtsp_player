import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { getHlsOutputDir } from './services/ffmpeg';
import streamRouter from './routes/stream';

const app = express();
const PORT = Number(process.env.PORT ?? 3001);

// Ensure HLS output directory exists
fs.mkdirSync(getHlsOutputDir(), { recursive: true });

app.use(cors());
app.use(express.json());

// HLS file serving (before API routes so /hls/* works cleanly)
app.use('/hls/:sessionId', (req, res, next) => {
  const { sessionId } = req.params;
  const file = req.path.replace(/^\//, '') || 'index.m3u8';
  const filePath = path.join(getHlsOutputDir(), sessionId, file);

  if (!fs.existsSync(filePath)) {
    // Playlist may not exist yet — tell client to retry
    res.status(503).json({ error: 'Stream not ready yet, retry in a moment' });
    return;
  }

  const ext = path.extname(file);
  const contentType =
    ext === '.m3u8' ? 'application/vnd.apple.mpegurl' : 'video/mp2t';

  res.setHeader('Content-Type', contentType);
  res.setHeader('Cache-Control', 'no-cache');
  fs.createReadStream(filePath).pipe(res);
});

app.use('/api/streams', streamRouter);

app.get('/health', (_req, res) => res.json({ ok: true }));

app.listen(PORT, () => {
  console.log(`RTSP Player server running on http://localhost:${PORT}`);
});

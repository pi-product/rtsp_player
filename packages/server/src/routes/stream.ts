import { Router, Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import {
  startStream,
  stopStream,
  getSession,
  listSessions,
  getHlsOutputDir,
} from '../services/ffmpeg';

const router = Router();

// POST /api/streams — start transcoding an RTSP URL
router.post('/', (req: Request, res: Response) => {
  const { url } = req.body as { url?: string };

  if (!url || !url.startsWith('rtsp://')) {
    res.status(400).json({ error: 'rtsp:// URL required' });
    return;
  }

  const sessionId = uuidv4();
  const session = startStream(sessionId, url);

  res.status(201).json({
    sessionId: session.id,
    hlsUrl: `/hls/${session.id}/index.m3u8`,
  });
});

// DELETE /api/streams/:id — stop and clean up a stream
router.delete('/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const stopped = stopStream(id);
  if (!stopped) {
    res.status(404).json({ error: 'Session not found' });
    return;
  }
  res.status(204).send();
});

// GET /api/streams — list active sessions (debug/admin)
router.get('/', (_req: Request, res: Response) => {
  const sessions = listSessions().map((s) => ({
    id: s.id,
    rtspUrl: s.rtspUrl,
    createdAt: s.createdAt,
  }));
  res.json(sessions);
});

// GET /api/streams/:id — check if a session is alive
router.get('/:id', (req: Request, res: Response) => {
  const session = getSession(req.params.id);
  if (!session) {
    res.status(404).json({ error: 'Session not found' });
    return;
  }
  res.json({
    id: session.id,
    rtspUrl: session.rtspUrl,
    createdAt: session.createdAt,
    hlsUrl: `/hls/${session.id}/index.m3u8`,
  });
});

// Serve HLS playlist + segments
router.use('/hls/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const file = req.path.replace(/^\//, '') || 'index.m3u8';
  const filePath = path.join(getHlsOutputDir(), id, file);

  if (!fs.existsSync(filePath)) {
    res.status(404).send('Not found');
    return;
  }

  const ext = path.extname(file);
  const contentType =
    ext === '.m3u8' ? 'application/vnd.apple.mpegurl' : 'video/mp2t';

  res.setHeader('Content-Type', contentType);
  res.setHeader('Cache-Control', 'no-cache');
  fs.createReadStream(filePath).pipe(res);
});

export default router;

import { spawn, ChildProcess } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';

export interface StreamSession {
  id: string;
  rtspUrl: string;
  outputDir: string;
  process: ChildProcess;
  createdAt: Date;
}

const sessions = new Map<string, StreamSession>();

export function getHlsOutputDir(): string {
  return path.join(os.tmpdir(), 'rtsp-player-hls');
}

export function startStream(sessionId: string, rtspUrl: string): StreamSession {
  const outputDir = path.join(getHlsOutputDir(), sessionId);
  fs.mkdirSync(outputDir, { recursive: true });

  const playlistPath = path.join(outputDir, 'index.m3u8');

  // FFmpeg: RTSP → HLS with low-latency settings
  const args = [
    '-rtsp_transport', 'tcp',      // use TCP for more reliable RTSP
    '-i', rtspUrl,
    '-c:v', 'copy',                // pass-through video (no re-encode when possible)
    '-c:a', 'aac',                 // transcode audio to AAC for broad compatibility
    '-f', 'hls',
    '-hls_time', '2',              // 2-second segments for low latency
    '-hls_list_size', '5',         // keep 5 segments in playlist
    '-hls_flags', 'delete_segments+append_list',
    '-hls_segment_filename', path.join(outputDir, 'seg%03d.ts'),
    playlistPath,
  ];

  const proc = spawn('ffmpeg', args, {
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  proc.stderr?.on('data', (data: Buffer) => {
    const line = data.toString().trim();
    if (line) process.stderr.write(`[ffmpeg:${sessionId.slice(0, 8)}] ${line}\n`);
  });

  const session: StreamSession = {
    id: sessionId,
    rtspUrl,
    outputDir,
    process: proc,
    createdAt: new Date(),
  };

  sessions.set(sessionId, session);

  proc.on('exit', () => sessions.delete(sessionId));

  return session;
}

export function stopStream(sessionId: string): boolean {
  const session = sessions.get(sessionId);
  if (!session) return false;

  session.process.kill('SIGTERM');
  sessions.delete(sessionId);

  fs.rm(session.outputDir, { recursive: true, force: true }, () => {});
  return true;
}

export function getSession(sessionId: string): StreamSession | undefined {
  return sessions.get(sessionId);
}

export function listSessions(): StreamSession[] {
  return Array.from(sessions.values());
}

// Clean up all sessions on process exit
process.on('SIGTERM', () => {
  for (const session of sessions.values()) {
    session.process.kill('SIGTERM');
  }
});

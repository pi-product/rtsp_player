import { useState } from 'react';

const STORAGE_KEY = 'rtsp_server_url';

export function useServerUrl() {
  const [serverUrl, setServerUrlState] = useState<string>(
    () => localStorage.getItem(STORAGE_KEY) ?? 'http://localhost:3001'
  );

  const setServerUrl = (url: string) => {
    const trimmed = url.replace(/\/$/, '');
    localStorage.setItem(STORAGE_KEY, trimmed);
    setServerUrlState(trimmed);
  };

  return { serverUrl, setServerUrl };
}

import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';

interface DetectedProvider {
  id: string;
  name: string;
  installed: boolean;
  version: string | null;
  path: string | null;
}

export function useCliAgentDetection() {
  const [detected, setDetected] = useState<DetectedProvider[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    invoke<DetectedProvider[]>('detect_providers')
      .then(setDetected)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const installedIds = detected.filter((d) => d.installed).map((d) => d.id);

  return { detected, installedIds, loading };
}

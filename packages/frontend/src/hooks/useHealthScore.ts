'use client';

import { useEffect, useState } from 'react';

interface HealthScore {
  score: number;
  status: 'healthy' | 'degraded' | 'unhealthy';
  updatedAt: number;
}

export function useHealthScore() {
  const [health, setHealth] = useState<HealthScore | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchHealth = async () => {
      try {
        const res = await fetch('/api/health/system');
        if (!res.ok) throw new Error('Failed to fetch health');
        const data = await res.json();
        setHealth({
          score: data.score,
          status: data.status,
          updatedAt: data.timestamp,
        });
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Unknown error'));
      } finally {
        setLoading(false);
      }
    };

    fetchHealth();
    const interval = setInterval(fetchHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  return { health, loading, error };
}
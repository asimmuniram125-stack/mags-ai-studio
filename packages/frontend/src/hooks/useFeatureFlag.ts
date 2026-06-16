'use client';

import { useEffect, useState } from 'react';

export function useFeatureFlag(key: string): boolean {
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/v1/feature-flags/resolve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ keys: [key] }),
    })
      .then((res) => res.json())
      .then((data) => {
        setEnabled(data[key]?.enabled || false);
      })
      .finally(() => setLoading(false));
  }, [key]);

  return enabled && !loading;
}

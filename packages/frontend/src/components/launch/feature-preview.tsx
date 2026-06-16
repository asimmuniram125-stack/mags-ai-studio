'use client';

import { useFeatureFlag } from '@/hooks/useFeatureFlag';

export function FeaturePreview({ featureKey, children, fallback }: {
  featureKey: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  const enabled = useFeatureFlag(featureKey);

  if (!enabled) {
    return fallback || null;
  }

  return <>{children}</>;
}

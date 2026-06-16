'use client';

import { useEffect, useState } from 'react';
import { ReleaseDashboard } from '@/components/launch/release-dashboard';
import { ChangelogView } from '@/components/launch/changelog-view';
import { ReleaseTimeline } from '@/components/launch/release-timeline';

export default function LaunchCenterPage() {
  const [releases, setReleases] = useState([]);
  const [currentRelease, setCurrentRelease] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReleases();
    const interval = setInterval(fetchReleases, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  async function fetchReleases() {
    try {
      const res = await fetch('/api/v1/launch/history');
      const data = await res.json();
      setReleases(data);

      const current = await fetch('/api/v1/launch/current');
      const currentData = await current.json();
      setCurrentRelease(currentData);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return <div className="p-8 text-center">Loading release information...</div>;
  }

  return (
    <div className="space-y-8 p-8">
      <div>
        <h1 className="text-4xl font-bold mb-2">Launch Center</h1>
        <p className="text-gray-600">Monitor releases and deployment status</p>
      </div>

      <ReleaseDashboard currentRelease={currentRelease} />
      <ReleaseTimeline releases={releases} />

      {currentRelease && (
        <ChangelogView releaseId={currentRelease.id} />
      )}
    </div>
  );
}

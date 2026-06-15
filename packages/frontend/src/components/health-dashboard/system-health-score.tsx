'use client';

import { useEffect, useState } from 'react';

interface HealthData {
  score: number;
  status: 'healthy' | 'degraded' | 'unhealthy';
  components: Array<{
    name: string;
    status: 'healthy' | 'degraded' | 'unhealthy';
  }>;
  timestamp: number;
}

export function SystemHealthScore() {
  const [health, setHealth] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHealth = async () => {
      try {
        const res = await fetch('/api/health/system');
        const data = await res.json();
        setHealth(data);
      } catch (error) {
        console.error('Failed to fetch health:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchHealth();
    const interval = setInterval(fetchHealth, 30000); // Refresh every 30 seconds

    return () => clearInterval(interval);
  }, []);

  if (loading) return <div>Loading health status...</div>;
  if (!health) return <div>Failed to load health status</div>;

  const getColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'text-green-600';
      case 'degraded':
        return 'text-yellow-600';
      case 'unhealthy':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-lg font-bold mb-4">System Health</h2>

      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium">Overall Score</span>
          <span className={`text-2xl font-bold ${getColor(health.status)}`}>
            {health.score}/100
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all ${
              health.score >= 85
                ? 'bg-green-600'
                : health.score >= 70
                  ? 'bg-yellow-600'
                  : 'bg-red-600'
            }`}
            style={{ width: `${health.score}%` }}
          />
        </div>
      </div>

      <div className="space-y-2">
        <h3 className="text-sm font-semibold mb-3">Components</h3>
        {health.components.map((component) => (
          <div key={component.name} className="flex items-center justify-between p-2 bg-gray-50 rounded">
            <span className="text-sm capitalize">{component.name}</span>
            <span className={`text-xs font-medium px-2 py-1 rounded ${getColor(component.status)}`}>
              {component.status}
            </span>
          </div>
        ))}
      </div>

      <div className="mt-4 text-xs text-gray-500">
        Last updated: {new Date(health.timestamp).toLocaleTimeString()}
      </div>
    </div>
  );
}
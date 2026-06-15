'use client';

import { useEffect, useState } from 'react';

export function OfflineFallback() {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (!isOnline) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center p-8">
          <div className="text-6xl mb-4">📵</div>
          <h1 className="text-2xl font-bold mb-2">You are offline</h1>
          <p className="text-gray-600 mb-4">
            Some features are limited while you are offline. Your changes will sync when you're back online.
          </p>
          <div className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-lg">
            <span className="inline-block w-2 h-2 bg-blue-700 rounded-full animate-pulse"></span>
            <span>Waiting for connection...</span>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
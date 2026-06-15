'use client';

import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCollaborationStore } from '@/stores/collaboration.store';
import { useOrganizationStore } from '@/stores/organization.store';
import { Presence } from '@/types/collaboration';
import clsx from 'clsx';

export function PresenceIndicators() {
  const { currentOrganization } = useOrganizationStore();
  const { presences, getPresences } = useCollaborationStore();

  useEffect(() => {
    if (currentOrganization) {
      getPresences(currentOrganization.id);

      // Refresh every 5 seconds
      const interval = setInterval(() => {
        getPresences(currentOrganization.id);
      }, 5000);

      return () => clearInterval(interval);
    }
  }, [currentOrganization, getPresences]);

  const onlinePresences = presences.filter((p) => p.status !== 'OFFLINE');

  return (
    <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 backdrop-blur">
      <h4 className="text-sm font-semibold text-white mb-3">Active Now</h4>

      <div className="space-y-2">
        <AnimatePresence>
          {onlinePresences.length === 0 ? (
            <p className="text-xs text-gray-400">No one online</p>
          ) : (
            onlinePresences.map((presence, idx) => (
              <motion.div
                key={`${presence.userId}-${idx}`}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="flex items-center gap-2"
              >
                <div
                  className={clsx('w-2 h-2 rounded-full', {
                    'bg-green-500': presence.status === 'ONLINE',
                    'bg-yellow-500': presence.status === 'AWAY',
                    'bg-gray-500': presence.status === 'OFFLINE',
                    'bg-blue-500 animate-pulse': presence.status === 'TYPING',
                  })}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-300 truncate">
                    {presence.user?.name || presence.user?.email}
                  </p>
                  {presence.currentResource && (
                    <p className="text-xs text-gray-500 truncate">
                      {presence.currentResource}
                    </p>
                  )}
                </div>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

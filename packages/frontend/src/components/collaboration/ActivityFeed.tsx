'use client';

import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCollaborationStore } from '@/stores/collaboration.store';
import { useOrganizationStore } from '@/stores/organization.store';
import { ActivityLog } from '@/types/collaboration';
import { Clock, Code2, Users, Share2, Trash2, Edit3 } from 'lucide-react';
import clsx from 'clsx';

export function ActivityFeed() {
  const { currentOrganization } = useOrganizationStore();
  const { activityLogs, fetchActivityFeed, isLoading } = useCollaborationStore();

  useEffect(() => {
    if (currentOrganization) {
      fetchActivityFeed(currentOrganization.id);

      // Refresh every 10 seconds
      const interval = setInterval(() => {
        fetchActivityFeed(currentOrganization.id);
      }, 10000);

      return () => clearInterval(interval);
    }
  }, [currentOrganization, fetchActivityFeed]);

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'CREATED':
        return <Code2 size={16} className="text-green-400" />;
      case 'UPDATED':
        return <Edit3 size={16} className="text-blue-400" />;
      case 'DELETED':
        return <Trash2 size={16} className="text-red-400" />;
      case 'SHARED':
        return <Share2 size={16} className="text-purple-400" />;
      case 'MEMBER_ADDED':
        return <Users size={16} className="text-green-400" />;
      default:
        return <Clock size={16} className="text-gray-400" />;
    }
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'CREATED':
        return 'text-green-300';
      case 'UPDATED':
        return 'text-blue-300';
      case 'DELETED':
        return 'text-red-300';
      case 'SHARED':
        return 'text-purple-300';
      default:
        return 'text-gray-300';
    }
  };

  return (
    <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6 backdrop-blur">
      <h3 className="text-lg font-semibold text-white mb-4">Recent Activity</h3>

      <div className="space-y-3 max-h-96 overflow-y-auto">
        <AnimatePresence>
          {activityLogs.length === 0 ? (
            <p className="text-gray-400 text-sm">No activity yet</p>
          ) : (
            activityLogs.map((log, idx) => (
              <motion.div
                key={log.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ delay: idx * 0.05 }}
                className="flex items-start gap-3 p-3 bg-slate-700/30 rounded-lg border border-slate-600"
              >
                <div className="mt-0.5">{getActionIcon(log.action)}</div>

                <div className="flex-1 min-w-0">
                  <p className={clsx('font-medium text-sm', getActionColor(log.action))}>
                    {log.user?.name || 'Unknown'} {log.action.toLowerCase()} a{' '}
                    {log.resourceType.toLowerCase()}
                  </p>
                  {log.resourceName && (
                    <p className="text-xs text-gray-400 truncate mt-1">
                      {log.resourceName}
                    </p>
                  )}
                  <p className="text-xs text-gray-500 mt-1">
                    {new Date(log.timestamp).toLocaleTimeString()}
                  </p>
                </div>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

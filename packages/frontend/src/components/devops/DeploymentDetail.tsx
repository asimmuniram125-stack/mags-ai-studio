'use client';

import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { useDeploymentStore } from '@/stores/deployment.store';

export function DeploymentDetail({ deployment }: { deployment: any }) {
  const { logs, metrics } = useDeploymentStore();

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6 bg-slate-800/50 border border-slate-700 rounded-lg p-6"
    >
      {/* Header */}
      <div className="space-y-2">
        <h2 className="text-2xl font-bold text-white">{deployment.name}</h2>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-400">Version: {deployment.version}</span>
          <span className="text-sm text-gray-400">Environment: {deployment.environment}</span>
          <span className={`text-sm px-2 py-1 rounded ${
            deployment.healthStatus === 'HEALTHY' 
              ? 'bg-green-500/20 text-green-300'
              : deployment.healthStatus === 'UNHEALTHY'
              ? 'bg-red-500/20 text-red-300'
              : 'bg-yellow-500/20 text-yellow-300'
          }`}>
            {deployment.healthStatus}
          </span>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-4 gap-4">
        {metrics.slice(0, 4).map((metric, idx) => (
          <div key={idx} className="bg-slate-700/50 border border-slate-600 rounded p-4">
            <p className="text-gray-400 text-sm">{metric.metric}</p>
            <p className="text-2xl font-bold text-white mt-2">
              {metric.value}
              <span className="text-lg ml-2 text-gray-400">{metric.unit}</span>
            </p>
          </div>
        ))}
      </div>

      {/* Logs */}
      <div>
        <h3 className="font-semibold text-white mb-3">Recent Logs</h3>
        <div className="bg-slate-700/50 border border-slate-600 rounded p-4 font-mono text-sm max-h-48 overflow-y-auto space-y-1">
          {logs.slice(-10).map((log, idx) => (
            <div key={idx} className="text-gray-300">
              <span className="text-gray-500">[{log.timestamp.toLocaleTimeString()}]</span>
              {' '}
              <span className="text-blue-300">{log.level}</span>
              {' '}
              {log.message}
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
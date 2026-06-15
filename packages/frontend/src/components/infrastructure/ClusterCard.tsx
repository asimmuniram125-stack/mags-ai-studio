'use client';

import { motion } from 'framer-motion';
import { Cluster, ClusterStatus } from '@/types/infrastructure';
import { useRouter } from 'next/navigation';
import { Server, AlertCircle, CheckCircle, Zap } from 'lucide-react';
import clsx from 'clsx';

interface ClusterCardProps {
  cluster: Cluster;
}

export function ClusterCard({ cluster }: ClusterCardProps) {
  const router = useRouter();

  const statusIcons = {
    [ClusterStatus.ACTIVE]: <CheckCircle className="text-green-400" size={20} />,
    [ClusterStatus.CREATING]: <Zap className="text-yellow-400 animate-pulse" size={20} />,
    [ClusterStatus.DEGRADED]: <AlertCircle className="text-yellow-400" size={20} />,
    [ClusterStatus.FAILED]: <AlertCircle className="text-red-400" size={20} />,
    [ClusterStatus.SCALING]: <Zap className="text-blue-400 animate-pulse" size={20} />,
    [ClusterStatus.DESTROYING]: <Zap className="text-red-400 animate-pulse" size={20} />,
  };

  const statusColors = {
    [ClusterStatus.ACTIVE]: 'bg-green-900/20 text-green-300 border-green-500/50',
    [ClusterStatus.CREATING]: 'bg-yellow-900/20 text-yellow-300 border-yellow-500/50',
    [ClusterStatus.DEGRADED]: 'bg-yellow-900/20 text-yellow-300 border-yellow-500/50',
    [ClusterStatus.FAILED]: 'bg-red-900/20 text-red-300 border-red-500/50',
    [ClusterStatus.SCALING]: 'bg-blue-900/20 text-blue-300 border-blue-500/50',
    [ClusterStatus.DESTROYING]: 'bg-red-900/20 text-red-300 border-red-500/50',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4 }}
      onClick={() => router.push(`/infrastructure/cluster/${cluster.id}`)}
      className={clsx(
        'bg-slate-800/50 border rounded-lg p-6 backdrop-blur cursor-pointer transition-all',
        statusColors[cluster.status as keyof typeof statusColors],
      )}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-500/20 rounded-lg">
            <Server className="text-blue-400" size={24} />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">{cluster.name}</h3>
            <p className="text-sm text-gray-400">{cluster.region}</p>
          </div>
        </div>
        {statusIcons[cluster.status as keyof typeof statusIcons]}
      </div>

      <div className="space-y-2 text-sm mb-4">
        <div className="flex justify-between">
          <span className="text-gray-400">Nodes:</span>
          <span className="text-white font-medium">{cluster.nodeCount}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-400">Type:</span>
          <span className="text-white font-medium">{cluster.nodeType}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-400">K8s:</span>
          <span className="text-white font-medium">{cluster.kubernetesVersion}</span>
        </div>
      </div>

      <div className="flex gap-2">
        <button
          onClick={(e) => {
            e.stopPropagation();
            router.push(`/infrastructure/cluster/${cluster.id}/scale`);
          }}
          className="flex-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm font-medium transition-colors"
        >
          Scale
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            router.push(`/infrastructure/cluster/${cluster.id}/settings`);
          }}
          className="flex-1 px-3 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded text-sm font-medium transition-colors"
        >
          Settings
        </button>
      </div>
    </motion.div>
  );
}

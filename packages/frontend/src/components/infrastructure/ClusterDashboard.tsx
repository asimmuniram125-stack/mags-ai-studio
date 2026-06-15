'use client';

import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { useInfrastructureStore } from '@/stores/infrastructure.store';
import { infraWebSocketService } from '@/services/infrastructure-websocket';
import { ClusterCard } from './ClusterCard';
import { ClusterHealthChart } from './ClusterHealthChart';
import { DeploymentTimeline } from './DeploymentTimeline';
import { ScalingActivityMonitor } from './ScalingActivityMonitor';
import { Plus, Loader } from 'lucide-react';
import { useRouter } from 'next/navigation';

export function ClusterDashboard() {
  const router = useRouter();
  const { clusters, fetchClusters, isLoading, error } = useInfrastructureStore();

  useEffect(() => {
    fetchClusters();
    infraWebSocketService.initSession('user123', 'org123');

    clusters.forEach((cluster) => {
      infraWebSocketService.watchCluster(cluster.id);
    });

    return () => {
      clusters.forEach((cluster) => {
        infraWebSocketService.unwatchCluster(cluster.id);
      });
    };
  }, [fetchClusters, clusters]);

  const handleCreateCluster = () => {
    router.push('/infrastructure/cluster/create');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-950 p-6">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-white">Infrastructure</h1>
            <p className="text-gray-400 mt-2">Global cluster management & deployment</p>
          </div>
          <button
            onClick={handleCreateCluster}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
          >
            <Plus size={20} />
            New Cluster
          </button>
        </div>
      </motion.div>

      {error && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mb-6 p-4 bg-red-900/20 border border-red-500/50 rounded-lg text-red-300"
        >
          {error}
        </motion.div>
      )}

      {isLoading && clusters.length === 0 ? (
        <div className="flex items-center justify-center h-64">
          <Loader className="animate-spin text-blue-400" size={32} />
        </div>
      ) : (
        <div className="space-y-8">
          {/* Clusters Grid */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {clusters.map((cluster) => (
              <ClusterCard key={cluster.id} cluster={cluster} />
            ))}
          </motion.div>

          {/* Health Charts */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="grid grid-cols-1 lg:grid-cols-2 gap-6"
          >
            {clusters.map((cluster) => (
              <ClusterHealthChart key={`health-${cluster.id}`} clusterId={cluster.id} />
            ))}
          </motion.div>

          {/* Activity Monitors */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="grid grid-cols-1 lg:grid-cols-2 gap-6"
          >
            <DeploymentTimeline />
            <ScalingActivityMonitor />
          </motion.div>
        </div>
      )}
    </div>
  );
}

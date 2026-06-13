'use client';

import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAgentStore } from '@/stores/agents.store';
import { AgentList } from './AgentList';
import { CreateAgentModal } from './CreateAgentModal';
import { AgentDetail } from './AgentDetail';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import React from 'react';

export function AgentDashboard() {
  const { agents, activeAgent, fetchAgents, isLoading } = useAgentStore();
  const [showCreateModal, setShowCreateModal] = React.useState(false);

  useEffect(() => {
    fetchAgents();
  }, [fetchAgents]);

  if (isLoading && agents.length === 0) {
    return <LoadingSpinner fullScreen />;
  }

  return (
    <div className="h-full flex gap-4 p-6 bg-slate-900">
      {/* Agent List Sidebar */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="w-80 space-y-4"
      >
        <button
          onClick={() => setShowCreateModal(true)}
          className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition"
        >
          + Create Agent
        </button>

        <AgentList agents={agents} />
      </motion.div>

      {/* Agent Detail Panel */}
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        className="flex-1"
      >
        {activeAgent ? (
          <AgentDetail agent={activeAgent} />
        ) : (
          <div className="h-full flex items-center justify-center text-gray-400">
            <p>Select an agent to view details</p>
          </div>
        )}
      </motion.div>

      {/* Create Modal */}
      {showCreateModal && (
        <CreateAgentModal onClose={() => setShowCreateModal(false)} />
      )}
    </div>
  );
}

'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { AgentCard } from './AgentCard';
import { Agent } from '@/types/agent';

interface AgentListProps {
  agents: Agent[];
}

export function AgentList({ agents }: AgentListProps) {
  if (agents.length === 0) {
    return (
      <div className="p-4 text-center text-gray-400">
        <p>No agents created yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-3 bg-slate-800 rounded-lg p-4">
      <h3 className="text-sm font-semibold text-gray-300 mb-3">Your Agents</h3>
      <AnimatePresence>
        {agents.map((agent) => (
          <motion.div
            key={agent.id}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <AgentCard agent={agent} />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

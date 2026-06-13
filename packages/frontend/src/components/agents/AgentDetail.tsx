'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Agent } from '@/types/agent';
import { TaskPanel } from '../tasks/TaskPanel';

interface AgentDetailProps {
  agent: Agent;
}

export function AgentDetail({ agent }: AgentDetailProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'tasks' | 'memory'>('overview');

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="h-full flex flex-col bg-slate-800 rounded-lg p-6"
    >
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-3xl font-bold text-white">{agent.name}</h2>
            <p className="text-gray-400 mt-1">{agent.description}</p>
          </div>
          <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
            agent.isActive
              ? 'bg-green-500/20 text-green-400'
              : 'bg-gray-500/20 text-gray-400'
          }`}>
            {agent.isActive ? 'Active' : 'Inactive'}
          </span>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-slate-700 rounded-lg p-3">
            <p className="text-gray-400 text-sm">Tasks Completed</p>
            <p className="text-2xl font-bold text-white">{agent.taskCount}</p>
          </div>
          <div className="bg-slate-700 rounded-lg p-3">
            <p className="text-gray-400 text-sm">Success Rate</p>
            <p className="text-2xl font-bold text-green-400">
              {Math.round(agent.successRate * 100)}%
            </p>
          </div>
          <div className="bg-slate-700 rounded-lg p-3">
            <p className="text-gray-400 text-sm">Total Tokens</p>
            <p className="text-2xl font-bold text-white">{agent.totalTokens}</p>
          </div>
          <div className="bg-slate-700 rounded-lg p-3">
            <p className="text-gray-400 text-sm">Model</p>
            <p className="text-lg font-bold text-white">{agent.modelId}</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-700 mb-6">
        {(['overview', 'tasks', 'memory'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 font-semibold transition ${
              activeTab === tab
                ? 'border-b-2 border-blue-500 text-white'
                : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'overview' && (
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-gray-300 mb-2">System Prompt</h3>
              <p className="text-gray-400 text-sm bg-slate-700 p-3 rounded-lg">
                {agent.systemPrompt}
              </p>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-gray-300 mb-2">Tools</h3>
              <div className="flex flex-wrap gap-2">
                {agent.tools.length > 0 ? (
                  agent.tools.map((tool) => (
                    <span
                      key={tool}
                      className="px-3 py-1 bg-blue-500/20 text-blue-300 rounded-full text-sm"
                    >
                      {tool}
                    </span>
                  ))
                ) : (
                  <p className="text-gray-400 text-sm">No tools configured</p>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'tasks' && <TaskPanel agentId={agent.id} />}

        {activeTab === 'memory' && (
          <div className="text-gray-400 text-sm">
            <p>Memory management coming soon...</p>
          </div>
        )}
      </div>
    </motion.div>
  );
}

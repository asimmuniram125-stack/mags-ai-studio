'use client';

import { useState } from 'react';
import { useAgentStore } from '@/stores/agents.store';
import { Agent } from '@/types/agent';

interface AgentCardProps {
  agent: Agent;
}

export function AgentCard({ agent }: AgentCardProps) {
  const { setActiveAgent, activeAgent } = useAgentStore();
  const isActive = activeAgent?.id === agent.id;

  const agentTypeEmoji: Record<string, string> = {
    coding: '💻',
    research: '🔬',
    data_analyst: '📊',
    devops: '⚙️',
    ui_ux: '🎨',
    security: '🔐',
    assistant: '🤖',
  };

  return (
    <button
      onClick={() => setActiveAgent(agent)}
      className={`w-full text-left p-3 rounded-lg transition ${
        isActive
          ? 'bg-blue-600 text-white'
          : 'bg-slate-700 text-gray-300 hover:bg-slate-600'
      }`}
    >
      <div className="flex items-start gap-2">
        <span className="text-2xl">{agentTypeEmoji[agent.type] || '🤖'}</span>
        <div className="flex-1 min-w-0">
          <p className="font-semibold truncate">{agent.name}</p>
          <p className="text-xs opacity-75 truncate">{agent.type}</p>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs bg-slate-600 px-2 py-0.5 rounded">
              {agent.taskCount} tasks
            </span>
            <span className="text-xs opacity-50">
              {Math.round(agent.successRate * 100)}% success
            </span>
          </div>
        </div>
      </div>
    </button>
  );
}

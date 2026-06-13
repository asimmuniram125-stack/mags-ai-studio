'use client';

import { useCallback, useState } from 'react';
import { motion } from 'framer-motion';
import { WorkflowNode, WorkflowEdge } from '@/types/workflow';
import { WorkflowNode as NodeComponent } from './WorkflowNode';

interface WorkflowCanvasProps {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  onNodesChange: (nodes: WorkflowNode[]) => void;
  onEdgesChange: (edges: WorkflowEdge[]) => void;
}

export function WorkflowCanvas({
  nodes,
  edges,
  onNodesChange,
  onEdgesChange,
}: WorkflowCanvasProps) {
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [draggedNode, setDraggedNode] = useState<string | null>(null);

  const handleNodeDragStart = (nodeId: string) => {
    setDraggedNode(nodeId);
  };

  const handleNodeDragEnd = (nodeId: string, newX: number, newY: number) => {
    const updatedNodes = nodes.map((n) =>
      n.id === nodeId ? { ...n, position: { x: newX, y: newY } } : n,
    );
    onNodesChange(updatedNodes);
    setDraggedNode(null);
  };

  const handleAddNode = (type: string) => {
    const newNodeId = `node-${Date.now()}`;
    const newNode: WorkflowNode = {
      id: newNodeId,
      type: type as 'agent' | 'condition' | 'action',
      data: {
        label: `${type} Node`,
      },
      position: { x: Math.random() * 400, y: Math.random() * 400 },
    };
    onNodesChange([...nodes, newNode]);
  };

  const handleDeleteNode = (nodeId: string) => {
    const updatedNodes = nodes.filter((n) => n.id !== nodeId);
    const updatedEdges = edges.filter(
      (e) => e.source !== nodeId && e.target !== nodeId,
    );
    onNodesChange(updatedNodes);
    onEdgesChange(updatedEdges);
  };

  return (
    <div className="h-full flex flex-col gap-4">
      {/* Toolbar */}
      <div className="flex gap-2 p-4 bg-slate-800 rounded-lg">
        <button
          onClick={() => handleAddNode('agent')}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition"
        >
          + Agent Node
        </button>
        <button
          onClick={() => handleAddNode('condition')}
          className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold transition"
        >
          + Condition Node
        </button>
        <button
          onClick={() => handleAddNode('action')}
          className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition"
        >
          + Action Node
        </button>
      </div>

      {/* Canvas */}
      <div className="flex-1 bg-slate-700 rounded-lg border border-slate-600 relative overflow-hidden">
        <svg className="absolute inset-0 w-full h-full opacity-10">
          <defs>
            <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
              <path d="M 20 0 L 0 0 0 20" fill="none" stroke="white" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>

        {/* Nodes */}
        <div className="absolute inset-0">
          {nodes.map((node) => (
            <motion.div
              key={node.id}
              draggable
              onDragEnd={(e: any) =>
                handleNodeDragEnd(node.id, e.clientX, e.clientY)
              }
              style={{
                position: 'absolute',
                left: node.position.x,
                top: node.position.y,
              }}
              className="cursor-move"
            >
              <NodeComponent
                node={node}
                isSelected={selectedNodeId === node.id}
                onSelect={() => setSelectedNodeId(node.id)}
                onDelete={() => handleDeleteNode(node.id)}
              />
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}

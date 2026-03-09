import React, { useMemo, useCallback } from 'react';
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  Node,
  Edge,
  Handle,
  Position,
  MarkerType
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Message } from '../types';
import { getBranchPath } from '../utils/treeHelpers';

interface Props {
  messages: Message[];
  currentNodeId: string | null;
  onNodeSelect: (id: string) => void;
}

// Custom Node Component
const ChatNode = ({ data }: { data: any }) => {
  const isUser = data.role === 'user';
  const isActive = data.isActive;
  const isInPath = data.isInPath;

  return (
    <div 
      className={`px-4 py-2 shadow-md rounded-xl border-2 min-w-[150px] max-w-[250px] cursor-pointer transition-all ${
        isActive 
          ? 'border-primary-500 shadow-primary-500/50 scale-105' 
          : isInPath
            ? 'border-primary-400/50 hover:border-primary-400'
            : 'border-gray-700 hover:border-gray-500'
      } ${
        isUser ? 'bg-blue-900/80' : 'bg-gray-800/80'
      }`}
      onClick={() => data.onSelect(data.id)}
    >
      <Handle type="target" position={Position.Top} className="w-2 h-2 !bg-gray-500" />
      <div className="flex items-center gap-2 mb-1">
        <div className="w-6 h-6 rounded-full overflow-hidden bg-gray-700 flex items-center justify-center text-xs shrink-0">
          {isUser ? <i className="fas fa-user text-gray-300"></i> : <i className="fas fa-robot text-primary-400"></i>}
        </div>
        <div className="text-xs font-bold text-gray-300 truncate">
          {isUser ? 'User' : 'AI'}
        </div>
      </div>
      <div className="text-xs text-gray-200 line-clamp-3">
        {data.content}
      </div>
      <Handle type="source" position={Position.Bottom} className="w-2 h-2 !bg-gray-500" />
    </div>
  );
};

const nodeTypes = {
  chatNode: ChatNode,
};

const ChatTree: React.FC<Props> = ({ messages, currentNodeId, onNodeSelect }) => {
  
  // Layout logic: Simple hierarchical layout
  const { initialNodes, initialEdges } = useMemo(() => {
    const nodes: Node[] = [];
    const edges: Edge[] = [];
    
    if (messages.length === 0) return { initialNodes: nodes, initialEdges: edges };

    const messageMap = new Map(messages.map(m => [m.id, m]));
    const rootNodes = messages.filter(m => !m.parentId);
    
    const activePath = currentNodeId ? getBranchPath(messages, currentNodeId) : [];
    const activePathIds = new Set(activePath.map(m => m.id));

    // Calculate depths and widths
    const levels: { [depth: number]: Message[] } = {};
    
    const traverse = (msgId: string, depth: number) => {
      const msg = messageMap.get(msgId);
      if (!msg) return;
      
      if (!levels[depth]) levels[depth] = [];
      levels[depth].push(msg);
      
      if (msg.childrenIds) {
        msg.childrenIds.forEach(childId => traverse(childId, depth + 1));
      }
    };

    rootNodes.forEach(root => traverse(root.id, 0));

    // Create nodes and edges based on levels
    const nodeWidth = 280;
    const nodeHeight = 120;
    
    Object.keys(levels).forEach(depthStr => {
      const depth = parseInt(depthStr);
      const levelNodes = levels[depth];
      const totalWidth = levelNodes.length * nodeWidth;
      let startX = -totalWidth / 2;

      levelNodes.forEach((msg, index) => {
        const isActive = msg.id === currentNodeId;
        const isInPath = activePathIds.has(msg.id);

        nodes.push({
          id: msg.id,
          type: 'chatNode',
          position: { x: startX + (index * nodeWidth), y: depth * nodeHeight },
          data: { 
            id: msg.id,
            role: msg.role, 
            content: msg.candidates?.[msg.currentIndex || 0] || msg.content,
            isActive: isActive,
            isInPath: isInPath,
            onSelect: onNodeSelect
          },
        });

        if (msg.parentId) {
          const isEdgeActive = activePathIds.has(msg.id) && activePathIds.has(msg.parentId);
          edges.push({
            id: `e-${msg.parentId}-${msg.id}`,
            source: msg.parentId,
            target: msg.id,
            type: 'smoothstep',
            animated: isEdgeActive,
            style: { stroke: isEdgeActive ? '#3b82f6' : '#4b5563', strokeWidth: isEdgeActive ? 3 : 2 },
            markerEnd: {
              type: MarkerType.ArrowClosed,
              color: isEdgeActive ? '#3b82f6' : '#4b5563',
            },
          });
        }
      });
    });

    return { initialNodes: nodes, initialEdges: edges };
  }, [messages, currentNodeId, onNodeSelect]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // Update nodes when initialNodes change (e.g., new message or active node change)
  React.useEffect(() => {
    setNodes(initialNodes);
    setEdges(initialEdges);
  }, [initialNodes, initialEdges, setNodes, setEdges]);

  return (
    <div className="w-full h-full bg-gray-950 rounded-xl overflow-hidden border border-gray-800">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        fitView
        minZoom={0.1}
        maxZoom={1.5}
        defaultViewport={{ x: 0, y: 0, zoom: 0.8 }}
        proOptions={{ hideAttribution: true }}
      >
        <Background color="#374151" gap={16} size={1} />
        <Controls className="bg-gray-800 border-gray-700 fill-gray-300" />
        <MiniMap 
          nodeColor={(node) => {
            if (node.data.isActive) return '#3b82f6';
            if (node.data.isInPath) return '#60a5fa';
            return node.data.role === 'user' ? '#1e3a8a' : '#1f2937';
          }}
          maskColor="rgba(15, 15, 18, 0.7)"
          className="bg-gray-900 border border-gray-700 rounded-lg"
        />
      </ReactFlow>
    </div>
  );
};

export default ChatTree;

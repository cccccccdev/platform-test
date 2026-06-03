import { useState, useCallback, useMemo, useRef, type DragEvent } from 'react';
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  type Connection,
  type Node,
  type Edge,
  type NodeTypes,
  type OnNodesDelete,
  type OnConnect,
  type OnEdgesDelete,
  BackgroundVariant,
  Panel,
  ReactFlowProvider,
  type NodeMouseHandler,
  type EdgeMouseHandler,
  MarkerType,
  useReactFlow,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useSearchParams, Link } from 'react-router-dom';
import { Button, message, Modal, Input, Typography, Space } from 'antd';
import { LeftOutlined } from '@ant-design/icons';
import StateNode from './StateNode';
import ComponentPanel from './ComponentPanel';
import PropertyPanel from './PropertyPanel';

const { TextArea } = Input;
const { Text } = Typography;

// ─────────────────────────────────────────────────
// Types - using simple object type to avoid Record constraint
// ─────────────────────────────────────────────────
type NodeData = {
  name: string;
  description?: string;
  [key: string]: unknown;
};

type EdgeData = {
  label?: string;
  [key: string]: unknown;
};

type AnyNode = Node<NodeData>;
type AnyEdge = Edge<EdgeData>;

// ─────────────────────────────────────────────────
// Initial preset data (updated per user flow)
// ─────────────────────────────────────────────────
const initialNodes: AnyNode[] = [
  // States only
  { id: 's1', type: 'stateNode', position: { x: 100, y: 200 }, data: { name: 'INIT', description: 'Payment request entry', businessStatus: 'init' } },
  { id: 's2', type: 'stateNode', position: { x: 420, y: 60 }, data: { name: 'WAITING_OTP', description: 'Waiting for OTP input' } },
  { id: 's3', type: 'stateNode', position: { x: 660, y: 60 }, data: { name: 'VERIFYING_OTP', description: 'Verifying OTP' } },
  { id: 's4', type: 'stateNode', position: { x: 420, y: 280 }, data: { name: 'AUTHENTICATING', description: '3DS authentication in progress' } },
  { id: 's5', type: 'stateNode', position: { x: 420, y: 480 }, data: { name: 'PROGRESSING', description: 'Frictionless debit processing' } },
  { id: 's6', type: 'stateNode', position: { x: 880, y: 480 }, data: { name: 'SUCCESS', description: 'Debit successful', businessStatus: 'success' } },
  { id: 's7', type: 'stateNode', position: { x: 880, y: 240 }, data: { name: 'FAILED', description: 'Debit failed', businessStatus: 'fail' } },
];

const initialEdges: AnyEdge[] = [
  // State-to-state connections only
  { id: 'e1', source: 's1', target: 's2', type: 'smoothstep', markerEnd: { type: MarkerType.ArrowClosed }, style: { stroke: '#333', strokeWidth: 2 }, data: { label: 'otp_verify_required' } },
  { id: 'e2', source: 's1', target: 's4', type: 'smoothstep', markerEnd: { type: MarkerType.ArrowClosed }, style: { stroke: '#333', strokeWidth: 2 }, data: { label: '3ds_verify_required' } },
  { id: 'e3', source: 's1', target: 's5', type: 'smoothstep', markerEnd: { type: MarkerType.ArrowClosed }, style: { stroke: '#333', strokeWidth: 2 }, data: { label: 'frictionless' } },
  { id: 'e4', source: 's1', target: 's7', type: 'smoothstep', markerEnd: { type: MarkerType.ArrowClosed }, style: { stroke: '#333', strokeWidth: 2 }, data: { label: 'not_supported' } },
  { id: 'e5', source: 's2', target: 's3', type: 'smoothstep', markerEnd: { type: MarkerType.ArrowClosed }, style: { stroke: '#333', strokeWidth: 2 }, data: { label: 'user_submit_otp' } },
  { id: 'e6', source: 's3', target: 's4', type: 'smoothstep', markerEnd: { type: MarkerType.ArrowClosed }, style: { stroke: '#333', strokeWidth: 2 }, data: { label: '' } },
  { id: 'e7', source: 's4', target: 's5', type: 'smoothstep', markerEnd: { type: MarkerType.ArrowClosed }, style: { stroke: '#333', strokeWidth: 2 }, data: { label: '' } },
  { id: 'e8', source: 's4', target: 's7', type: 'smoothstep', markerEnd: { type: MarkerType.ArrowClosed }, style: { stroke: '#333', strokeWidth: 2 }, data: { label: 'auth_failed' } },
  { id: 'e9', source: 's5', target: 's6', type: 'smoothstep', markerEnd: { type: MarkerType.ArrowClosed }, style: { stroke: '#333', strokeWidth: 2 }, data: { label: 'debit_success' } },
  { id: 'e10', source: 's5', target: 's7', type: 'smoothstep', markerEnd: { type: MarkerType.ArrowClosed }, style: { stroke: '#333', strokeWidth: 2 }, data: { label: 'debit_failed' } },
];

// Helper: is edge dashed?
function isEdgeDashed(edge: Edge): boolean {
  const style = edge.style as { strokeDasharray?: string };
  return !!(style && style.strokeDasharray);
}

// ─────────────────────────────────────────────────
// Canvas Content Component
// ─────────────────────────────────────────────────
function CanvasContent({ bt, ability }: { bt: string; ability: string }) {
  const [nodes, setNodes, onNodesChange] = useNodesState<AnyNode>(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState<AnyEdge>(initialEdges);
  const [selectedNode, setSelectedNode] = useState<AnyNode | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<AnyEdge | null>(null);
  const [selectedNodes, setSelectedNodes] = useState<string[]>([]);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [currentEditNode, setCurrentEditNode] = useState<AnyNode | null>(null);
  const reactFlowWrapper = useRef<HTMLDivElement>(null);

  const { screenToFlowPosition } = useReactFlow();

  const nodeTypes: NodeTypes = useMemo(
    () => ({
      stateNode: StateNode as any,
    }),
    [],
  );

  // ─────────────────────────────────────────────────
  // Selection change handler (for multi-select)
  // ─────────────────────────────────────────────────
  const onSelectionChange = useCallback(({ nodes: selected }: { nodes: Node[] }) => {
    const ids = selected.map(n => n.id);
    setSelectedNodes(ids);
    if (ids.length === 0) {
      setSelectedNode(null);
    } else if (ids.length === 1) {
      const node = nodes.find(n => n.id === ids[0]);
      setSelectedNode(node as AnyNode || null);
    } else {
      setSelectedNode(null);
    }
  }, [nodes]);

  // ─────────────────────────────────────────────────
  // onConnect: validate edge rules + auto-detect line type
  // ─────────────────────────────────────────────────
  const onConnect: OnConnect = useCallback(
    (connection: Connection) => {
      const fromNode = nodes.find(n => n.id === connection.source);
      const toNode = nodes.find(n => n.id === connection.target);
      if (!fromNode || !toNode) return;

      // Auto-detect line type: dashed only for State → State
      const isDashed = fromNode.type === 'stateNode' && toNode.type === 'stateNode';

      const newEdge: AnyEdge = {
        id: `e-${connection.source}-${connection.target}-${Date.now()}`,
        source: connection.source!,
        target: connection.target!,
        type: 'smoothstep',
        markerEnd: { type: MarkerType.ArrowClosed, color: '#333' },
        style: {
          stroke: '#333',
          strokeWidth: 2,
          strokeDasharray: isDashed ? '6 3' : '',
        },
        data: { label: '' },
      };

      setEdges(eds => addEdge(newEdge as Edge, eds) as AnyEdge[]);
      message.success('Connection created');
    },
    [nodes, setEdges],
  );

  const onNodesDelete: OnNodesDelete = useCallback(
    (deleted: Node[]) => {
      if (deleted.length > 0) {
        setSelectedNode(null);
        message.info(`Deleted ${deleted.length} node(s)`);
      }
    },
    [],
  );

  const onEdgesDelete: OnEdgesDelete = useCallback(
    (deleted: Edge[]) => {
      if (deleted.length > 0) {
        setSelectedEdge(null);
        message.info(`Deleted ${deleted.length} edge(s)`);
      }
    },
    [],
  );

  // ─────────────────────────────────────────────────
  // Node / Edge selection
  // ─────────────────────────────────────────────────
  const onNodeClick: NodeMouseHandler<AnyNode> = useCallback(
    (_, node) => {
      setSelectedNode(node as AnyNode);
      setSelectedEdge(null);
    },
    [],
  );

  const onEdgeClick: EdgeMouseHandler<AnyEdge> = useCallback(
    (_, edge) => {
      setSelectedEdge(edge as AnyEdge);
      setSelectedNode(null);
    },
    [],
  );

  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
    setSelectedEdge(null);
  }, []);

  // ─────────────────────────────────────────────────
  // Drag & Drop from component panel
  // ─────────────────────────────────────────────────
  const onDragOver = useCallback((event: DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: DragEvent) => {
      event.preventDefault();
      const type = event.dataTransfer.getData('application/reactflow');
      if (!type) return;

      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      const id = `${type}_${Date.now()}`;
      const name = type === 'state' ? `State_${id}` : `State_${id}`;
      const nodeType = 'stateNode';

      const newNode: AnyNode = {
        id,
        type: nodeType,
        position,
        data: { name, description: '' },
      };

      setNodes(nds => nds.concat(newNode));
      message.success(`Added ${type} node`);
    },
    [screenToFlowPosition, setNodes],
  );

  // ─────────────────────────────────────────────────
  // Double-click to edit node
  // ─────────────────────────────────────────────────
  const onNodeDoubleClick: NodeMouseHandler<AnyNode> = useCallback(
    (_, node) => {
      const anyNode = node as AnyNode;
      setCurrentEditNode(anyNode);
      setSelectedNode(anyNode);
      setEditName(anyNode.data.name);
      setEditDescription(anyNode.data.description || '');
      setEditModalOpen(true);
    },
    [],
  );

  const handleEditOk = useCallback(() => {
    if (!editName.trim()) {
      message.warning('Name is required');
      return;
    }
    setNodes(nds =>
      nds.map(n =>
        n.id === currentEditNode?.id
          ? { ...n, data: { ...n.data, name: editName.trim(), description: editDescription } }
          : n,
      ),
    );
    setSelectedNode(prev =>
      prev && prev.id === currentEditNode?.id
        ? { ...prev, data: { ...prev.data, name: editName.trim(), description: editDescription } }
        : prev,
    );
    setEditModalOpen(false);
    setCurrentEditNode(null);
    message.success('Node updated');
  }, [editName, editDescription, currentEditNode, setNodes, setSelectedNode]);

  const handleEditCancel = useCallback(() => {
    setEditModalOpen(false);
    setCurrentEditNode(null);
  }, []);

  // ─────────────────────────────────────────────────
  // Delete with keyboard
  // ─────────────────────────────────────────────────
  const onKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectedNode(null);
        setSelectedEdge(null);
        setSelectedNodes([]);
        return;
      }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        // If multiple nodes selected, delete all
        if (selectedNodes.length > 1) {
          setNodes(nds => nds.filter(n => !selectedNodes.includes(n.id)));
          setSelectedNodes([]);
          message.info(`Deleted ${selectedNodes.length} nodes`);
          return;
        }
        if (selectedNode) {
          const nodeId = selectedNode.id;
          setNodes(nds => nds.filter(n => n.id !== nodeId));
          setSelectedNode(null);
          message.info('Node deleted');
        } else if (selectedEdge) {
          const edgeId = selectedEdge.id;
          setEdges(eds => eds.filter(ed => ed.id !== edgeId));
          setSelectedEdge(null);
          message.info('Edge deleted');
        }
      }
    },
    [selectedNode, selectedEdge, selectedNodes, setNodes, setEdges],
  );

  // ─────────────────────────────────────────────────
  // Property panel callbacks
  // ─────────────────────────────────────────────────
  const handleNodeUpdate = useCallback(
    (id: string, data: Partial<NodeData>) => {
      setNodes(nds =>
        nds.map(n =>
          n.id === id ? { ...n, data: { ...n.data, ...data } } : n,
        ),
      );
      setSelectedNode(prev => (prev && prev.id === id ? { ...prev, data: { ...prev.data, ...data } } : prev));
    },
    [setNodes],
  );

  const handleEdgeEndpointsUpdate = useCallback(
    (id: string, source: string, target: string) => {
      setEdges(eds =>
        eds.map(e =>
          e.id === id
            ? { ...e, source, target }
            : e,
        ) as AnyEdge[],
      );
      setSelectedEdge(prev =>
        prev && prev.id === id
          ? { ...prev, source, target }
          : prev,
      );
    },
    [setEdges],
  );

  const handleEdgeLabelUpdate = useCallback(
    (id: string, label: string) => {
      setEdges(eds =>
        eds.map(e =>
          e.id === id
            ? { ...e, label, data: { ...e.data, label } }
            : e,
        ) as AnyEdge[],
      );
      setSelectedEdge(prev =>
        prev && prev.id === id
          ? { ...prev, label, data: { ...prev.data, label } }
          : prev,
      );
    },
    [setEdges],
  );

  const handleDeleteNode = useCallback(
    (id: string) => {
      setNodes(nds => nds.filter(n => n.id !== id));
      setSelectedNode(null);
      message.info('Node deleted');
    },
    [setNodes],
  );

  const handleDeleteEdge = useCallback(
    (id: string) => {
      setEdges(eds => eds.filter(e => e.id !== id));
      setSelectedEdge(null);
      message.info('Edge deleted');
    },
    [setEdges],
  );

  // ─────────────────────────────────────────────────
  // Statistics & validation
  // ─────────────────────────────────────────────────
  const stateCount = nodes.filter(n => n.type === 'stateNode').length;
  const canSave = stateCount >= 1;

  // ─────────────────────────────────────────────────
  // Save logic
  // ─────────────────────────────────────────────────
  const handleSaveDraft = useCallback(() => {
    if (!canSave) {
      message.error('At least 1 State node required to save');
      return;
    }

    const saveData = {
      ability: {
        businessType: bt,
        name: ability,
      },
      states: nodes
        .filter(n => n.type === 'stateNode')
        .map(n => ({
          id: n.id,
          name: n.data.name,
          description: n.data.description || '',
          x: n.position.x,
          y: n.position.y,
        })),
      transitions: edges.map(e => ({
        id: e.id,
        from: e.source,
        to: e.target,
        type: isEdgeDashed(e) ? 'dashed' : 'solid',
        label: e.data?.label || '',
      })),
    };

    console.log('Draft saved:', JSON.stringify(saveData, null, 2));
    message.success('Draft saved successfully', 2);
    setTimeout(() => {
      window.location.href = `/basic-info/capability/stateMachine?bt=${bt}&ability=${ability}`;
    }, 500);
  }, [bt, ability, nodes, edges, canSave]);

  return (
    <>
      {/* Top Bar */}
      <div
        style={{
          height: 56,
          background: '#fff',
          borderBottom: '1px solid #e5e5e5',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 24px',
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Link to="/basic-info/capability">
            <Button type="text" icon={<LeftOutlined />}>
              Back to Capability
            </Button>
          </Link>
          <span style={{ color: '#ccc' }}>|</span>
          <span style={{ fontSize: 14 }}>
            <span style={{ color: '#999' }}>Basic Info / Capability / </span>
            <span style={{ fontWeight: 500 }}>stateMachine</span>
          </span>
        </div>
        <Space>
          <Button
            onClick={handleSaveDraft}
            disabled={!canSave}
            title={!canSave ? 'At least 1 State node required to save' : undefined}
          >
            Save Draft
          </Button>
          <Button
            type="primary"
            onClick={() => {
              message.success('Submitted successfully', 2);
              setTimeout(() => {
                window.location.href = `/basic-info/capability/stateMachine?bt=${bt}&ability=${ability}`;
              }, 500);
            }}
            disabled={!canSave}
          >
            Submit
          </Button>
        </Space>
      </div>

      {/* Context Bar */}
      <div
        style={{
          background: '#fafafa',
          borderBottom: '1px solid #e5e5e5',
          padding: '8px 24px',
          fontSize: 13,
          color: '#666',
          display: 'flex',
          gap: 24,
        }}
      >
        <span>
          <Text strong style={{ color: '#333' }}>Business Type:</Text> {bt}
        </span>
        <span>
          <Text strong style={{ color: '#333' }}>Ability:</Text> {ability}
        </span>
      </div>

      {/* Main Content */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        <ComponentPanel />

        <div
          ref={reactFlowWrapper}
          style={{ flex: 1, background: '#f5f5f5' }}
          onDragOver={onDragOver}
          onDrop={onDrop}
          onKeyDown={onKeyDown as any}
          tabIndex={0}
        >
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodesDelete={onNodesDelete}
            onEdgesDelete={onEdgesDelete}
            onNodeClick={onNodeClick}
            onEdgeClick={onEdgeClick}
            onPaneClick={onPaneClick}
            onNodeDoubleClick={onNodeDoubleClick}
            onSelectionChange={onSelectionChange}
            nodeTypes={nodeTypes}
            fitView
            minZoom={0.25}
            maxZoom={2}
            selectNodesOnDrag
            defaultEdgeOptions={{
              type: 'smoothstep',
              markerEnd: { type: MarkerType.ArrowClosed, color: '#333' },
              style: { stroke: '#333', strokeWidth: 2 },
            }}
          >
            <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#ccc" />
            <Controls />
            <MiniMap
              nodeColor={node => (node.type === 'stateNode' ? '#22c55e' : '#fff')}
              maskColor="rgba(0,0,0,0.1)"
            />
            <Panel position="top-left">
              <div
                style={{
                  fontSize: 12,
                  color: '#999',
                  background: 'rgba(255,255,255,0.8)',
                  padding: '4px 8px',
                  borderRadius: 4,
                }}
              >
                Drag components from left panel to canvas
              </div>
            </Panel>
          </ReactFlow>
        </div>

        {(selectedNode || selectedEdge) && (
          <PropertyPanel
            selectedNode={selectedNode}
            selectedEdge={selectedEdge}
            nodes={nodes}
            edges={edges}
            onNodeUpdate={handleNodeUpdate}
            onEdgeEndpointsUpdate={handleEdgeEndpointsUpdate}
            onEdgeLabelUpdate={handleEdgeLabelUpdate}
            onDeleteNode={handleDeleteNode}
            onDeleteEdge={handleDeleteEdge}
          />
        )}
      </div>

      {/* Bottom Bar */}
      <div
        style={{
          height: 40,
          background: '#fafafa',
          borderTop: '1px solid #e5e5e5',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 24px',
          fontSize: 12,
          color: '#666',
          flexShrink: 0,
        }}
      >
        <span>
          States: {stateCount}
        </span>
        {canSave ? (
          <span style={{ color: '#22c55e' }}>✓ Ready to save</span>
        ) : (
          <span style={{ color: '#ef4444' }}>⚠ At least 1 State node required to save</span>
        )}
      </div>

      {/* Edit Node Modal */}
      <Modal
        title="Edit Node"
        open={editModalOpen}
        onOk={handleEditOk}
        onCancel={handleEditCancel}
        okText="OK"
        cancelText="Cancel"
        width={400}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, paddingTop: 8 }}>
          <div>
            <label style={{ display: 'block', marginBottom: 6, fontWeight: 500, fontSize: 13 }}>
              Name *
            </label>
            <Input
              value={editName}
              onChange={e => setEditName(e.target.value)}
              placeholder="Enter node name"
              autoFocus
              onKeyDown={e => {
                if (e.key === 'Enter') handleEditOk();
                if (e.key === 'Escape') handleEditCancel();
              }}
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: 6, fontWeight: 500, fontSize: 13 }}>
              Description
            </label>
            <TextArea
              value={editDescription}
              onChange={e => setEditDescription(e.target.value)}
              placeholder="Enter description (optional)"
              rows={3}
              onKeyDown={e => {
                if (e.key === 'Escape') handleEditCancel();
              }}
            />
          </div>
        </div>
      </Modal>
    </>
  );
}

// ─────────────────────────────────────────────────
// Main Export (wraps with ReactFlowProvider)
// ─────────────────────────────────────────────────
export default function StateMachineCanvas() {
  const [searchParams] = useSearchParams();
  const bt = searchParams.get('bt') || '';
  const ability = searchParams.get('ability') || '';

  return (
    <div style={{ width: '100vw', height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <ReactFlowProvider>
        <CanvasContent bt={bt} ability={ability} />
      </ReactFlowProvider>
    </div>
  );
}
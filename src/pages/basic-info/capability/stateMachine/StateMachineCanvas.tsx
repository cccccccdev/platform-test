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
import { Button, message, Modal, Input, Typography } from 'antd';
import { LeftOutlined } from '@ant-design/icons';
import StateNode from './StateNode';
import StepNode from './StepNode';
import ResultNode from './ResultNode';
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
  // States
  { id: 's1', type: 'stateNode', position: { x: 100, y: 200 }, data: { name: 'INIT', description: '支付请求入口', businessStatus: 'init' } },
  { id: 's2', type: 'stateNode', position: { x: 420, y: 60 }, data: { name: 'WAITING_OTP', description: '等待用户输入OTP' } },
  { id: 's3', type: 'stateNode', position: { x: 660, y: 60 }, data: { name: 'VERIFYING_OTP', description: '验证OTP' } },
  { id: 's4', type: 'stateNode', position: { x: 420, y: 280 }, data: { name: 'AUTHENTICATING', description: '3DS认证中' } },
  { id: 's5', type: 'stateNode', position: { x: 420, y: 480 }, data: { name: 'PROGRESSING', description: '无摩擦扣款处理中' } },
  { id: 's6', type: 'stateNode', position: { x: 880, y: 480 }, data: { name: 'SUCCESS', description: '扣款成功', businessStatus: 'success' } },
  { id: 's7', type: 'stateNode', position: { x: 880, y: 240 }, data: { name: 'FAILED', description: '扣款失败', businessStatus: 'fail' } },
  // Steps
  { id: 'p1', type: 'stepNode', position: { x: 250, y: 200 }, data: { name: 'InitDebit', description: '初始化扣款并路由' } },
  { id: 'p2', type: 'stepNode', position: { x: 880, y: 60 }, data: { name: 'Verify', description: '验证OTP' } },
  { id: 'p3', type: 'stepNode', position: { x: 660, y: 280 }, data: { name: 'QueryAuthResult', description: '轮询认证结果' } },
  { id: 'p4', type: 'stepNode', position: { x: 660, y: 480 }, data: { name: 'QueryDebitResult', description: '查询扣款结果' } },
  // Results
  { id: 'r1', type: 'resultNode', position: { x: 880, y: 170 }, data: { name: 'default', description: '默认结果' } },
  { id: 'r2', type: 'resultNode', position: { x: 880, y: 370 }, data: { name: 'auth_success', description: '认证成功结果' } },
  { id: 'r3', type: 'resultNode', position: { x: 880, y: 580 }, data: { name: 'Success_Result', description: '成功结果' } },
  { id: 'r4', type: 'resultNode', position: { x: 660, y: 580 }, data: { name: 'Fail_Result', description: '失败结果' } },
];

const initialEdges: AnyEdge[] = [
  // INIT → InitDebit
  { id: 'e1', source: 's1', target: 'p1', type: 'smoothstep', markerEnd: { type: MarkerType.ArrowClosed }, style: { stroke: '#333', strokeWidth: 2 }, data: { label: '' } },
  // InitDebit branches
  { id: 'e2', source: 'p1', target: 's2', type: 'smoothstep', markerEnd: { type: MarkerType.ArrowClosed }, style: { stroke: '#333', strokeWidth: 2 }, data: { label: 'otp_verify_required' }, label: 'otp_verify_required' },
  { id: 'e3', source: 'p1', target: 's4', type: 'smoothstep', markerEnd: { type: MarkerType.ArrowClosed }, style: { stroke: '#333', strokeWidth: 2 }, data: { label: '3ds_verify_required' }, label: '3ds_verify_required' },
  { id: 'e4', source: 'p1', target: 's5', type: 'smoothstep', markerEnd: { type: MarkerType.ArrowClosed }, style: { stroke: '#333', strokeWidth: 2 }, data: { label: 'frictionless' }, label: 'frictionless' },
  { id: 'e5', source: 'p1', target: 's7', type: 'smoothstep', markerEnd: { type: MarkerType.ArrowClosed }, style: { stroke: '#333', strokeWidth: 2 }, data: { label: 'not_supported' }, label: 'not_supported' },
  // WAITING_OTP ↔ VERIFYING_OTP (虚线)
  { id: 'e6', source: 's2', target: 's3', type: 'smoothstep', markerEnd: { type: MarkerType.ArrowClosed }, style: { stroke: '#333', strokeWidth: 2, strokeDasharray: '6 3' }, data: { label: 'user_submit_otp' }, label: 'user_submit_otp' },
  // VERIFYING_OTP → Verify → default → AUTHENTICATING
  { id: 'e7', source: 's3', target: 'p2', type: 'smoothstep', markerEnd: { type: MarkerType.ArrowClosed }, style: { stroke: '#333', strokeWidth: 2 }, data: { label: '' } },
  { id: 'e8', source: 'p2', target: 'r1', type: 'smoothstep', markerEnd: { type: MarkerType.ArrowClosed }, style: { stroke: '#333', strokeWidth: 2 }, data: { label: 'default' }, label: 'default' },
  { id: 'e9', source: 'r1', target: 's4', type: 'smoothstep', markerEnd: { type: MarkerType.ArrowClosed }, style: { stroke: '#333', strokeWidth: 2 }, data: { label: '' } },
  // AUTHENTICATING → QueryAuthResult
  { id: 'e10', source: 's4', target: 'p3', type: 'smoothstep', markerEnd: { type: MarkerType.ArrowClosed }, style: { stroke: '#333', strokeWidth: 2 }, data: { label: '' } },
  // QueryAuthResult → auth_success / auth_failed
  { id: 'e11', source: 'p3', target: 'r2', type: 'smoothstep', markerEnd: { type: MarkerType.ArrowClosed }, style: { stroke: '#333', strokeWidth: 2 }, data: { label: 'auth_success' }, label: 'auth_success' },
  { id: 'e12', source: 'p3', target: 's7', type: 'smoothstep', markerEnd: { type: MarkerType.ArrowClosed }, style: { stroke: '#333', strokeWidth: 2 }, data: { label: 'auth_failed' }, label: 'auth_failed' },
  // auth_success → PROGRESSING
  { id: 'e13', source: 'r2', target: 's5', type: 'smoothstep', markerEnd: { type: MarkerType.ArrowClosed }, style: { stroke: '#333', strokeWidth: 2 }, data: { label: '' } },
  // PROGRESSING → QueryDebitResult
  { id: 'e14', source: 's5', target: 'p4', type: 'smoothstep', markerEnd: { type: MarkerType.ArrowClosed }, style: { stroke: '#333', strokeWidth: 2 }, data: { label: '' } },
  // QueryDebitResult → debit_success / debit_failed
  { id: 'e15', source: 'p4', target: 'r3', type: 'smoothstep', markerEnd: { type: MarkerType.ArrowClosed }, style: { stroke: '#333', strokeWidth: 2 }, data: { label: 'debit_success' }, label: 'debit_success' },
  { id: 'e16', source: 'p4', target: 'r4', type: 'smoothstep', markerEnd: { type: MarkerType.ArrowClosed }, style: { stroke: '#333', strokeWidth: 2 }, data: { label: 'debit_failed' }, label: 'debit_failed' },
  // debit_success → SUCCESS, debit_failed → FAILED
  { id: 'e17', source: 'r3', target: 's6', type: 'smoothstep', markerEnd: { type: MarkerType.ArrowClosed }, style: { stroke: '#333', strokeWidth: 2 }, data: { label: '' } },
  { id: 'e18', source: 'r4', target: 's7', type: 'smoothstep', markerEnd: { type: MarkerType.ArrowClosed }, style: { stroke: '#333', strokeWidth: 2 }, data: { label: '' } },
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
      stepNode: StepNode as any,
      resultNode: ResultNode as any,
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

      const fromType = fromNode.type === 'stateNode' ? 'state' : fromNode.type === 'resultNode' ? 'result' : 'step';
      const toType = toNode.type === 'stateNode' ? 'state' : toNode.type === 'resultNode' ? 'result' : 'step';

      // Auto-detect line type: dashed only for State → State or Result → Result
      const isDashed = (fromType === 'state' && toType === 'state') || (fromType === 'result' && toType === 'result');

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
      const name = type === 'state' ? `State_${id}` : type === 'step' ? `Step_${id}` : `Result_${id}`;
      const nodeType = type === 'state' ? 'stateNode' : type === 'step' ? 'stepNode' : 'resultNode';

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

  const handleEdgeTypeUpdate = useCallback(
    (id: string, isDashed: boolean) => {
      setEdges(eds =>
        eds.map(e =>
          e.id === id
            ? ({
                ...e,
                style: {
                  ...e.style,
                  strokeDasharray: isDashed ? '6 3' : '',
                },
              } as AnyEdge)
            : e,
        ) as AnyEdge[],
      );
      setSelectedEdge(prev =>
        prev && prev.id === id
          ? {
              ...prev,
              style: {
                ...prev.style,
                strokeDasharray: isDashed ? '6 3' : '',
              },
            }
          : prev,
      );
    },
    [setEdges],
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
  const stepCount = nodes.filter(n => n.type === 'stepNode').length;
  const resultCount = nodes.filter(n => n.type === 'resultNode').length;
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
      steps: nodes
        .filter(n => n.type === 'stepNode')
        .map(n => ({
          id: n.id,
          name: n.data.name,
          description: n.data.description || '',
          x: n.position.x,
          y: n.position.y,
        })),
      results: nodes
        .filter(n => n.type === 'resultNode')
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
    message.success('Draft saved successfully');
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
        <Button
          type="primary"
          onClick={handleSaveDraft}
          disabled={!canSave}
          title={!canSave ? 'At least 1 State node required to save' : undefined}
        >
          Save Draft
        </Button>
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

        <PropertyPanel
          selectedNode={selectedNode}
          selectedEdge={selectedEdge}
          nodes={nodes}
          edges={edges}
          onNodeUpdate={handleNodeUpdate}
          onEdgeTypeUpdate={handleEdgeTypeUpdate}
          onEdgeEndpointsUpdate={handleEdgeEndpointsUpdate}
          onEdgeLabelUpdate={handleEdgeLabelUpdate}
          onDeleteNode={handleDeleteNode}
          onDeleteEdge={handleDeleteEdge}
        />
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
          States: {stateCount} | Steps: {stepCount} | Results: {resultCount}
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
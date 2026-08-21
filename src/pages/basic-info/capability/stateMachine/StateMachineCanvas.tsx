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
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Button, message, Modal, Input, Space, Tag } from 'antd';
import { LeftOutlined } from '@ant-design/icons';
import StateNode from './StateNode';
import ComponentPanel from './ComponentPanel';
import PropertyPanel from './PropertyPanel';

const { TextArea } = Input;
// ─────────────────────────────────────────────────
// Types - using simple object type to avoid Record constraint
// ─────────────────────────────────────────────────
type NodeData = {
  name: string;
  description?: string;
  businessStatus?: string;
  nodeType?: 'init' | 'state';
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
  { id: 's1', type: 'stateNode', position: { x: 100, y: 200 }, data: { name: 'INIT', description: 'Payment request entry', businessStatus: 'INIT', nodeType: 'init' } },
  { id: 's2', type: 'stateNode', position: { x: 420, y: 60 }, data: { name: 'WAITING_OTP', description: 'Waiting for OTP input' } },
  { id: 's3', type: 'stateNode', position: { x: 660, y: 60 }, data: { name: 'VERIFYING_OTP', description: 'Verifying OTP' } },
  { id: 's4', type: 'stateNode', position: { x: 420, y: 280 }, data: { name: 'AUTHENTICATING', description: '3DS authentication in progress' } },
  { id: 's5', type: 'stateNode', position: { x: 420, y: 480 }, data: { name: 'PROGRESSING', description: 'Frictionless debit processing' } },
  { id: 's6', type: 'stateNode', position: { x: 880, y: 480 }, data: { name: 'SUCCESS', description: 'Debit successful', businessStatus: 'SUCCESS' } },
  { id: 's7', type: 'stateNode', position: { x: 880, y: 240 }, data: { name: 'FAILED', description: 'Debit failed', businessStatus: 'FAIL' } },
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

const smsSingleMessageNodes: AnyNode[] = [
  { id: 'sms_init', type: 'stateNode', position: { x: 160, y: 120 }, data: { name: 'INIT', description: 'SMS request initialized', businessStatus: 'INIT', nodeType: 'init' } },
  { id: 'sms_submitted', type: 'stateNode', position: { x: 560, y: 120 }, data: { name: 'SUBMITTED', description: 'Request submitted to channel; waiting for final result', businessStatus: 'PENDING' } },
  { id: 'sms_failed', type: 'stateNode', position: { x: 160, y: 360 }, data: { name: 'FAILED', description: 'SMS failed, rejected, expired, or invalid', businessStatus: 'FAIL' } },
  { id: 'sms_delivered', type: 'stateNode', position: { x: 560, y: 360 }, data: { name: 'DELIVERED', description: 'SMS delivered successfully', businessStatus: 'SUCCESS' } },
];

const smsSingleMessageEdges: AnyEdge[] = [
  { id: 'sms_e1', source: 'sms_init', target: 'sms_submitted', type: 'smoothstep', markerEnd: { type: MarkerType.ArrowClosed }, style: { stroke: '#333', strokeWidth: 2 }, data: { label: 'submitted' } },
  { id: 'sms_e2', source: 'sms_init', target: 'sms_failed', type: 'smoothstep', markerEnd: { type: MarkerType.ArrowClosed }, style: { stroke: '#333', strokeWidth: 2 }, data: { label: 'submit_failed' } },
  { id: 'sms_e3', source: 'sms_submitted', target: 'sms_delivered', type: 'smoothstep', markerEnd: { type: MarkerType.ArrowClosed }, style: { stroke: '#333', strokeWidth: 2 }, data: { label: 'delivered' } },
  { id: 'sms_e4', source: 'sms_submitted', target: 'sms_failed', type: 'smoothstep', markerEnd: { type: MarkerType.ArrowClosed }, style: { stroke: '#333', strokeWidth: 2 }, data: { label: 'failed' } },
];

const smsSingleMessageDetailedNodes: AnyNode[] = [
  { id: 'sms_d_init', type: 'stateNode', position: { x: 60, y: 260 }, data: { name: 'INIT', description: 'SMS request initialized', businessStatus: 'INIT', nodeType: 'init' } },
  { id: 'sms_d_submitted', type: 'stateNode', position: { x: 380, y: 150 }, data: { name: 'SUBMITTED', description: 'Accepted by the SMS provider and awaiting delivery result', businessStatus: 'PENDING' } },
  { id: 'sms_d_system_error', type: 'stateNode', position: { x: 380, y: 410 }, data: { name: 'SYSTEM_ERROR', description: 'Our system failed before the SMS request could be submitted to the provider', businessStatus: 'FAIL' } },
  { id: 'sms_d_delivered', type: 'stateNode', position: { x: 760, y: 20 }, data: { name: 'DELIVERED', description: 'SMS delivered to the recipient device', businessStatus: 'SUCCESS' } },
  { id: 'sms_d_rejected', type: 'stateNode', position: { x: 760, y: 160 }, data: { name: 'REJECTED', description: 'Rejected because of content, carrier policy, blacklist, invalid number, or another pre-delivery rule', businessStatus: 'FAIL' } },
  { id: 'sms_d_undeliverable', type: 'stateNode', position: { x: 760, y: 300 }, data: { name: 'UNDELIVERABLE', description: 'Accepted but ultimately could not be delivered to the recipient', businessStatus: 'FAIL' } },
  { id: 'sms_d_expired', type: 'stateNode', position: { x: 760, y: 440 }, data: { name: 'EXPIRED', description: 'Not delivered before the message validity period elapsed', businessStatus: 'FAIL' } },
];

const smsSingleMessageDetailedEdges: AnyEdge[] = [
  { id: 'sms_d_e1', source: 'sms_d_init', target: 'sms_d_submitted', type: 'smoothstep', markerEnd: { type: MarkerType.ArrowClosed }, style: { stroke: '#333', strokeWidth: 2 }, data: { label: 'submitted' } },
  { id: 'sms_d_e2', source: 'sms_d_init', target: 'sms_d_system_error', type: 'smoothstep', markerEnd: { type: MarkerType.ArrowClosed }, style: { stroke: '#333', strokeWidth: 2 }, data: { label: 'system_error' } },
  { id: 'sms_d_e3', source: 'sms_d_submitted', target: 'sms_d_delivered', type: 'smoothstep', markerEnd: { type: MarkerType.ArrowClosed }, style: { stroke: '#333', strokeWidth: 2 }, data: { label: 'delivered' } },
  { id: 'sms_d_e4', source: 'sms_d_submitted', target: 'sms_d_rejected', type: 'smoothstep', markerEnd: { type: MarkerType.ArrowClosed }, style: { stroke: '#333', strokeWidth: 2 }, data: { label: 'rejected' } },
  { id: 'sms_d_e5', source: 'sms_d_submitted', target: 'sms_d_undeliverable', type: 'smoothstep', markerEnd: { type: MarkerType.ArrowClosed }, style: { stroke: '#333', strokeWidth: 2 }, data: { label: 'undeliverable' } },
  { id: 'sms_d_e6', source: 'sms_d_submitted', target: 'sms_d_expired', type: 'smoothstep', markerEnd: { type: MarkerType.ArrowClosed }, style: { stroke: '#333', strokeWidth: 2 }, data: { label: 'expired' } },
];

function getInitialGraph(sm: string): { nodes: AnyNode[]; edges: AnyEdge[] } {
  if (sm === 'SMS_Single_Message_StateMachine') {
    return { nodes: smsSingleMessageNodes, edges: smsSingleMessageEdges };
  }
  if (sm === 'SMS_Single_Message_Detailed_StateMachine') {
    return { nodes: smsSingleMessageDetailedNodes, edges: smsSingleMessageDetailedEdges };
  }
  return { nodes: initialNodes, edges: initialEdges };
}

// Helper: is edge dashed?
function isEdgeDashed(edge: Edge): boolean {
  const style = edge.style as { strokeDasharray?: string };
  return !!(style && style.strokeDasharray);
}

// ─────────────────────────────────────────────────
// Validation
// ─────────────────────────────────────────────────
interface ValidationError {
  type: 'node' | 'edge' | 'general';
  message: string;
  nodeId?: string;
  edgeId?: string;
}

function validateStateMachine(nodes: AnyNode[], edges: AnyEdge[]): ValidationError[] {
  const errors: ValidationError[] = [];

  // Filter state nodes
  const stateNodes = nodes.filter(n => n.type === 'stateNode');
  const initNodes = stateNodes.filter(n => n.data?.name === 'INIT' || n.data?.nodeType === 'init');

  // Check at least 1 INIT State
  if (initNodes.length === 0) {
    errors.push({ type: 'general', message: 'At least 1 INIT State is required' });
  }

  // Check at least 1 normal State node
  const normalNodes = stateNodes.filter(n => n.data?.name !== 'INIT' && n.data?.nodeType !== 'init');
  if (normalNodes.length === 0) {
    errors.push({ type: 'general', message: 'At least 1 State node is required' });
  }

  // Check each node
  for (const node of stateNodes) {
    const isInit = node.data?.name === 'INIT' || node.data?.nodeType === 'init';

    // Node Name not empty
    if (!node.data?.name || node.data.name.trim() === '') {
      errors.push({ type: 'node', message: 'Node Name cannot be empty', nodeId: node.id });
    }

    // Description not empty
    if (!node.data?.description || node.data.description.trim() === '') {
      errors.push({ type: 'node', message: 'Description cannot be empty', nodeId: node.id });
    }

    // Business Status Mapping not empty (for normal nodes)
    if (!isInit && (!node.data?.businessStatus || node.data.businessStatus.trim() === '')) {
      errors.push({ type: 'node', message: 'Business Status Mapping cannot be empty', nodeId: node.id });
    }

    // INIT must have name INIT
    if (isInit && node.data?.name !== 'INIT') {
      errors.push({ type: 'node', message: 'INIT node name must be INIT', nodeId: node.id });
    }

    // INIT must have businessStatus INIT
    if (isInit && node.data?.businessStatus !== 'INIT') {
      errors.push({ type: 'node', message: 'INIT node business status must be INIT', nodeId: node.id });
    }
  }

  // Check for duplicate node names
  const nodeNames = stateNodes.map(n => n.data?.name).filter(Boolean);
  const duplicates = nodeNames.filter((name, idx) => nodeNames.indexOf(name) !== idx);
  if (duplicates.length > 0) {
    errors.push({ type: 'general', message: `Duplicate Node Names: ${[...new Set(duplicates)].join(', ')}` });
  }

  // Check each edge
  for (const edge of edges) {
    const sourceNode = stateNodes.find(n => n.id === edge.source);
    const targetNode = stateNodes.find(n => n.id === edge.target);

    // From/To nodes must exist
    if (!sourceNode) {
      errors.push({ type: 'edge', message: 'Edge source node not found', edgeId: edge.id });
    }
    if (!targetNode) {
      errors.push({ type: 'edge', message: 'Edge target node not found', edgeId: edge.id });
    }

    // No INIT -> INIT
    if (sourceNode?.data?.name === 'INIT' && targetNode?.data?.name === 'INIT') {
      errors.push({ type: 'edge', message: 'INIT -> INIT edge is not allowed', edgeId: edge.id });
    }

    // No self-loop for SUCCESS/FAIL nodes
    const sourceIsEndNode = sourceNode?.data?.businessStatus === 'SUCCESS' || sourceNode?.data?.businessStatus === 'FAIL';
    if (sourceIsEndNode && edge.source === edge.target) {
      errors.push({ type: 'edge', message: 'SUCCESS/FAIL node cannot have self-loop', edgeId: edge.id });
    }
  }

  // Check for duplicate edges
  const edgeKeys = edges.map(e => `${e.source}-${e.target}`);
  const duplicateEdges = edgeKeys.filter((key, idx) => edgeKeys.indexOf(key) !== idx);
  if (duplicateEdges.length > 0) {
    errors.push({ type: 'general', message: 'Duplicate edges are not allowed' });
  }

  // INIT cannot have incoming edges
  for (const edge of edges) {
    const target = stateNodes.find(n => n.id === edge.target);
    if (target?.data?.name === 'INIT' && target?.data?.nodeType === 'init') {
      errors.push({ type: 'edge', message: 'INIT node cannot have incoming edges', edgeId: edge.id });
    }
  }

  // Each node should have at least one incoming or outgoing arc (if more than 1 node)
  if (stateNodes.length > 1) {
    for (const node of stateNodes) {
      const hasIncoming = edges.some(e => e.target === node.id);
      const hasOutgoing = edges.some(e => e.source === node.id);
      if (!hasIncoming && !hasOutgoing) {
        errors.push({ type: 'node', message: `Node ${node.data?.name || node.id} has no connections`, nodeId: node.id });
      }
    }
  }

  return errors;
}

// ─────────────────────────────────────────────────
// Canvas Content Component
// ─────────────────────────────────────────────────
function CanvasContent({ bt, ability, sm, mode }: { bt: string; ability: string; sm: string; mode: string }) {
  const navigate = useNavigate();
  const initialGraph = useMemo(() => getInitialGraph(sm), [sm]);
  const [nodes, setNodes, onNodesChange] = useNodesState<AnyNode>(initialGraph.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState<AnyEdge>(initialGraph.edges);
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

      // Check for duplicate edge
      const duplicate = edges.find(e => e.source === connection.source && e.target === connection.target);
      if (duplicate) {
        Modal.error({ title: 'Error', content: 'Duplicate edge not allowed', okText: 'OK' });
        return;
      }

      // Check INIT -> INIT
      if (fromNode.data?.name === 'INIT' && toNode.data?.name === 'INIT') {
        Modal.error({ title: 'Error', content: 'INIT -> INIT edge is not allowed', okText: 'OK' });
        return;
      }

      // Check: Cannot point TO INIT node
      if (toNode.data?.name === 'INIT' || toNode.data?.nodeType === 'init') {
        Modal.error({ title: 'Error', content: 'Initial node INIT, cannot be entered from other states', okText: 'OK' });
        return;
      }

      // Check: Terminal node (SUCCESS/FAIL) cannot have outgoing edges
      const sourceIsEndNode = fromNode.data?.businessStatus === 'SUCCESS' || fromNode.data?.businessStatus === 'FAIL';
      if (sourceIsEndNode) {
        Modal.error({ title: 'Error', content: 'Terminal node, unable to transition to next state', okText: 'OK' });
        return;
      }

      const newEdge: AnyEdge = {
        id: `e-${connection.source}-${connection.target}-${Date.now()}`,
        source: connection.source!,
        target: connection.target!,
        type: 'smoothstep',
        markerEnd: { type: MarkerType.ArrowClosed, color: '#333' },
        style: {
          stroke: '#333',
          strokeWidth: 2,
        },
        data: { label: '' },
      };

      setEdges(eds => addEdge(newEdge as Edge, eds) as AnyEdge[]);
      message.success('Connection created');
    },
    [nodes, edges, setEdges],
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
      const isInit = type === 'init_state';

      const newNode: AnyNode = {
        id,
        type: 'stateNode',
        position,
        data: {
          name: isInit ? 'INIT' : '',
          description: '',
          businessStatus: isInit ? 'INIT' : '',
          nodeType: isInit ? 'init' : 'state',
        },
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
      // Also delete related edges
      setEdges(eds => eds.filter(e => e.source !== id && e.target !== id));
      setNodes(nds => nds.filter(n => n.id !== id));
      setSelectedNode(null);
      message.info('Node deleted');
    },
    [setNodes, setEdges],
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
  const renderedNodes = useMemo(
    () => mode === 'view'
      ? nodes.map(node => ({
          ...node,
          data: {
            ...node.data,
            viewMode: 'detail',
          },
        }))
      : nodes,
    [mode, nodes],
  );

  // ─────────────────────────────────────────────────
  // Save logic
  // ─────────────────────────────────────────────────
  // localStorage key for state machine statuses
  const STORAGE_KEY = 'stateMachineStatuses';

  const saveStatusToStorage = (name: string, status: 'DRAFT' | 'SUBMITTED') => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      const statuses = stored ? JSON.parse(stored) : {};
      statuses[name] = status;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(statuses));
    } catch {}
  };

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
    if (sm) {
      saveStatusToStorage(sm, 'DRAFT');
    }
    message.success('Draft saved successfully', 2);
    setTimeout(() => {
      navigate(`/basic-info/capability/stateMachine?bt=${bt}&ability=${ability}`);
    }, 500);
  }, [bt, ability, nodes, edges, canSave, sm, navigate]);

  // Get current status from storage
  const getCurrentStatus = (): 'DRAFT' | 'SUBMITTED' => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const statuses = JSON.parse(stored);
        return statuses[sm] || 'DRAFT';
      }
    } catch {}
    return 'DRAFT';
  };

  const currentStatus = getCurrentStatus();

  // Submit button enabled when in edit mode and has nodes
  const canSubmit = mode === 'edit' && nodes.length > 0;

  const handleSubmit = useCallback(() => {
    const errors = validateStateMachine(nodes, edges);
    if (errors.length > 0) {
      errors.forEach(err => message.error(err.message));
      return;
    }
    if (sm) {
      saveStatusToStorage(sm, 'SUBMITTED');
    }
    message.success('Submitted successfully', 2);
    setTimeout(() => {
      navigate(`/basic-info/capability/stateMachine?bt=${bt}&ability=${ability}`);
    }, 500);
  }, [nodes, edges, sm, bt, ability, navigate]);

  return (
    <>
      <div style={{ height: 76, background: '#fff', padding: '14px 24px 10px', flexShrink: 0 }}>
        <div style={{ color: '#8c8c8c', fontSize: 13, marginBottom: 12 }}>Basic Info&nbsp;&nbsp;/&nbsp;&nbsp;State Machine&nbsp;&nbsp;/&nbsp;&nbsp;<span style={{ color: '#262626' }}>{mode === 'view' ? 'State Machine Detail' : 'State Machine Editor'}</span></div>
        <div style={{ color: '#262626', fontSize: 18, fontWeight: 600 }}>{mode === 'view' ? 'State Machine Detail' : 'State Machine Editor'}</div>
      </div>

      {/* Top Bar */}
      <div
        style={{
          height: 76,
          background: '#fff',
          border: '1px solid #e2e8f0',
          borderRadius: 12,
          margin: '16px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 16px',
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Link to={bt && ability ? `/basic-info/capability/link-state-machine?bt=${bt}&ability=${ability}` : '/basic-info/capability/stateMachine'}>
            <Button icon={<LeftOutlined />} />
          </Link>
          <span><span style={{ display: 'block', fontSize: 15, fontWeight: 600, color: '#0f172a' }}>{sm || 'New State Machine'}</span><span style={{ display: 'block', marginTop: 3, color: '#94a3b8', fontSize: 12 }}>{ability || 'No description'}</span></span>
          <Tag color={currentStatus === 'SUBMITTED' ? 'success' : 'orange'}>{currentStatus}</Tag>
        </div>
        {mode === 'edit' && (
          <Space>
            <Button
              onClick={handleSaveDraft}
              disabled={!canSave}
            >
              Save Draft
            </Button>
            <Button
              type="primary"
              onClick={handleSubmit}
              disabled={!canSubmit}
            >
              Submit
            </Button>
          </Space>
        )}
      </div>

      {/* Main Content */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', margin: '0 20px 16px', border: '1px solid #e2e8f0', borderRadius: 12, background: '#fff' }}>
        <ComponentPanel disabled={mode === 'view'} />

        <div
          ref={reactFlowWrapper}
          style={{ flex: 1, background: '#f7faff' }}
          onDragOver={onDragOver}
          onDrop={onDrop}
          onKeyDown={onKeyDown as any}
          tabIndex={0}
        >
          <ReactFlow
            nodes={renderedNodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={mode === 'edit' ? onConnect : undefined}
            onNodesDelete={mode === 'edit' ? onNodesDelete : undefined}
            onEdgesDelete={mode === 'edit' ? onEdgesDelete : undefined}
            onNodeClick={onNodeClick}
            onEdgeClick={onEdgeClick}
            onPaneClick={onPaneClick}
            onNodeDoubleClick={mode === 'edit' ? onNodeDoubleClick : undefined}
            onSelectionChange={onSelectionChange}
            nodeTypes={nodeTypes}
            fitView
            minZoom={0.25}
            maxZoom={2}
            selectNodesOnDrag
            nodesDraggable={mode === 'edit'}
            nodesConnectable={mode === 'edit'}
            defaultEdgeOptions={{
              type: 'smoothstep',
              markerEnd: { type: MarkerType.ArrowClosed, color: '#333' },
              style: { stroke: '#333', strokeWidth: 2 },
            }}
          >
            <Background variant={BackgroundVariant.Dots} gap={24} size={1} color="#cbd9ea" />
            <Controls />
            <MiniMap
              nodeColor={node => (node.type === 'stateNode' ? '#22c55e' : '#fff')}
              maskColor="rgba(0,0,0,0.1)"
            />
            {mode === 'edit' && (
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
            )}
          </ReactFlow>
        </div>

        {mode === 'edit' && (selectedNode || selectedEdge) && (
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
  const sm = searchParams.get('sm') || '';
  const mode = searchParams.get('mode') || 'edit';

  return (
    <div style={{ width: '100%', height: 'calc(100vh - 64px)', minHeight: 720, display: 'flex', flexDirection: 'column', background: '#f1f5f9', overflow: 'hidden' }}>
      <ReactFlowProvider>
        <CanvasContent bt={bt} ability={ability} sm={sm} mode={mode} />
      </ReactFlowProvider>
    </div>
  );
}

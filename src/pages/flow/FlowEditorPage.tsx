import { useState, useCallback, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  MarkerType,
  Handle,
  Position,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import type { Connection, Node, Edge, NodeTypes } from '@xyflow/react';
import {
  Card,
  Button,
  Space,
  Tag,
  Tabs,
  Dropdown,
  message,
  Modal,
  Form,
  Input,
  Select,
  Steps,
  Timeline,
  Alert,
} from 'antd';
import {
  SaveOutlined,
  CloudUploadOutlined,
  BugOutlined,
  ArrowLeftOutlined,
  PlayCircleOutlined,
} from '@ant-design/icons';
import { useFlowStore, useActionStore } from '../../store';
import { NodeConfigPanel } from './NodeConfigPanel';
import type { FlowNode, FlowEdge, FlowEnv } from '../../domain/flow/types';

const LAYER_COLORS: Record<string, string> = {
  L2: '#1890ff',
  L3: '#722ed1',
  L4: '#52c41a',
};

const NODE_COLORS: Record<string, string> = {
  // L2 Atomic nodes
  'L2.HTTP_BUILD': '#1890ff',
  'L2.HTTP_SEND': '#13c2c2',
  'L2.MAP_FIELD': '#722ed1',
  'L2.STATE_SET': '#fa8c16',
  'L2.MQ_PUBLISH': '#52c41a',
  'L2.GEN_RRN': '#eb2f96',
  'L2.REQUERY_POLL': '#a0d911',
  'L2.CALLBACK_PARSE': '#13c2c2',
  // L3 Composite nodes
  'L3.PAY_REQUEST': '#1890ff',
  'L3.REFUND_FLOW': '#ff4d4f',
  'L3.QUERY_FLOW': '#fa8c16',
  'L3.WITHDRAW_FLOW': '#722ed1',
  'L3.TRANSFER_FLOW': '#13c2c2',
  'L3.CAPTURE_FLOW': '#52c41a',
  'L3.BALANCE_QUERY': '#eb2f96',
  'L3.USER_AUTH': '#a0d911',
  'L3.NOTIFY_FLOW': '#fa8c16',
  'L3.RECONCILE_FLOW': '#722ed1',
  'L3.CONTRACT_FLOW': '#ed0960',
  'L3.UPLOAD_FLOW': '#fa8c16',
  'L3.CLOSE_FLOW': '#52c41a',
  'L3.CREDIT_GRANT': '#1890ff',
  // L4 Template nodes
  'L4-T01': '#52c41a',
  'L4-T02': '#52c41a',
  'L4-T05': '#52c41a',
};

const NODE_LABELS: Record<string, string> = {
  // L2 Atomic
  'L2.HTTP_BUILD': '构建HTTP请求',
  'L2.HTTP_SEND': '发送HTTP请求',
  'L2.MAP_FIELD': '字段映射',
  'L2.STATE_SET': '设置订单状态',
  'L2.MQ_PUBLISH': '发送MQ消息',
  'L2.GEN_RRN': '生成RRN流水号',
  'L2.REQUERY_POLL': '重查状态',
  'L2.CALLBACK_PARSE': '解析回调',
  // L3 Composite
  'L3.PAY_REQUEST': '支付请求',
  'L3.REFUND_FLOW': '退款处理',
  'L3.QUERY_FLOW': '订单查询',
  'L3.WITHDRAW_FLOW': '提现流程',
  'L3.TRANSFER_FLOW': '转账流程',
  'L3.CAPTURE_FLOW': '收单流程',
  'L3.BALANCE_QUERY': '余额查询',
  'L3.USER_AUTH': '用户鉴权',
  'L3.NOTIFY_FLOW': '回调通知',
  'L3.RECONCILE_FLOW': '对账流程',
  'L3.CONTRACT_FLOW': '签章授权',
  'L3.UPLOAD_FLOW': '凭证上传',
  'L3.CLOSE_FLOW': '关单截停',
  'L3.CREDIT_GRANT': '信用授予',
  // L4 Templates
  'L4-T01': '入金流程',
  'L4-T02': '出金流程',
  'L4-T05': '退款流程',
};

const NODE_ICONS: Record<string, string> = {
  // L2 Atomic
  'L2.HTTP_BUILD': '🌐',
  'L2.HTTP_SEND': '📡',
  'L2.MAP_FIELD': '🔄',
  'L2.STATE_SET': '📋',
  'L2.MQ_PUBLISH': '📤',
  'L2.GEN_RRN': '🔢',
  'L2.REQUERY_POLL': '🔁',
  'L2.CALLBACK_PARSE': '📥',
  // L3 Composite
  'L3.PAY_REQUEST': '💳',
  'L3.REFUND_FLOW': '💰',
  'L3.QUERY_FLOW': '🔍',
  'L3.WITHDRAW_FLOW': '💸',
  'L3.TRANSFER_FLOW': '🔀',
  'L3.CAPTURE_FLOW': '📦',
  'L3.BALANCE_QUERY': '💎',
  'L3.USER_AUTH': '🔐',
  'L3.NOTIFY_FLOW': '📢',
  'L3.RECONCILE_FLOW': '📊',
  'L3.CONTRACT_FLOW': '📝',
  'L3.UPLOAD_FLOW': '📤',
  'L3.CLOSE_FLOW': '🚫',
  'L3.CREDIT_GRANT': '💳',
  // L4 Templates
  'L4-T01': '⬇️',
  'L4-T02': '⬆️',
  'L4-T05': '↩️',
};

interface CustomNodeData {
  label: string;
  nodeType: string;
  config: Record<string, unknown>;
  color: string;
  layer: 'L2' | 'L3' | 'L4';
  [key: string]: unknown;
}

function FlowNodeComponent({
  data,
  selected,
}: {
  data: CustomNodeData;
  selected?: boolean;
}) {
  const color = data.color || '#999';
  const layer = data.layer || 'L2';

  return (
    <div
      style={{
        background: selected ? '#fff' : '#fafafa',
        border: `2px solid ${color}`,
        borderRadius: 10,
        padding: '10px 14px',
        minWidth: 160,
        boxShadow: selected
          ? `0 0 0 2px ${color}30, 0 4px 12px rgba(0,0,0,0.1)`
          : '0 2px 8px rgba(0,0,0,0.06)',
        transition: 'box-shadow 0.15s ease',
        fontFamily:
          "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      }}
    >
      <Handle
        type="target"
        position={Position.Left}
        style={{
          background: color,
          width: 8,
          height: 8,
          border: '2px solid #fff',
          left: -4,
        }}
      />
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: 6,
            background: color + '20',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 12,
            fontWeight: 600,
            color: color,
          }}
        >
          {layer}
        </div>
        <span style={{ fontSize: 16 }}>{NODE_ICONS[data.nodeType] || '📦'}</span>
        <div>
          <div style={{ fontWeight: 600, fontSize: 13, color: '#1a1a2e' }}>
            {NODE_LABELS[data.nodeType] || data.nodeType}
          </div>
          <div style={{ fontSize: 10, color: '#888', marginTop: 2 }}>
            {data.nodeType}
          </div>
        </div>
      </div>
      <Handle
        type="source"
        position={Position.Right}
        style={{
          background: color,
          width: 8,
          height: 8,
          border: '2px solid #fff',
          right: -4,
        }}
      />
    </div>
  );
}

const nodeTypes: NodeTypes = {
  flowNode: FlowNodeComponent as any,
};

// PaletteNode: Draggable node item in the left palette
function PaletteNode({
  type,
  color,
  layer,
}: {
  type: string;
  color: string;
  layer: 'L2' | 'L3' | 'L4';
}) {
  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData('application/reactflow', type);
        e.dataTransfer.effectAllowed = 'move';
      }}
      style={{
        padding: '6px 8px',
        border: `1.5px solid ${color}`,
        borderRadius: 6,
        background: '#fff',
        cursor: 'grab',
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        fontSize: 11,
        transition: 'all 0.15s',
        color: '#333',
        userSelect: 'none',
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.background = color + '12';
        (e.currentTarget as HTMLElement).style.transform = 'translateX(2px)';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.background = '#fff';
        (e.currentTarget as HTMLElement).style.transform = 'translateX(0)';
      }}
    >
      <div
        style={{
          width: 20,
          height: 20,
          borderRadius: 4,
          background: color,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#fff',
          fontSize: 9,
          fontWeight: 600,
        }}
      >
        {layer}
      </div>
      <span style={{ fontSize: 12 }}>{NODE_ICONS[type]}</span>
      <span
        style={{
          flex: 1,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {NODE_LABELS[type] || type}
      </span>
    </div>
  );
}

function FlowCanvas({
  flow,
  flowId,
  updateDraftFlowGraph,
  onNodeSelect,
  onSaveRef,
}: {
  flow: any;
  flowId: string;
  updateDraftFlowGraph: (flowId: string, graph: any) => void;
  onNodeSelect: (node: FlowNode | null) => void;
  onSaveRef: React.MutableRefObject<(() => void) | null>;
}) {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  const draftGraph = flow?.versions?.Draft?.flowGraph;

  // Get branch keys for a node
  const getNodeBranchKeys = (nodeId: string): string[] => {
    const storeNode = draftGraph?.nodes?.find((n: any) => n.nodeId === nodeId);
    if (storeNode?.nodeType === 'ConditionBranch') {
      return storeNode?.config?.outputs?.map((o: any) => o.outputKey) || [];
    }
    const currentNode = nodes.find((n) => n.id === nodeId);
    if (currentNode?.data?.nodeType === 'L3.CONDITION_BRANCH') {
      return (currentNode.data.config as any)?.outputs?.map((o: any) => o.outputKey) || [];
    }
    return [];
  };

  // Sync from store on mount / store change
  useEffect(() => {
    if (!draftGraph) return;
    if (draftGraph.nodes?.length > 0) {
      const mapped: Node[] = draftGraph.nodes.map((n: any, idx: number) => {
        const layer = n.nodeType.startsWith('L4') ? 'L4' : n.nodeType.startsWith('L3') ? 'L3' : 'L2';
        return {
          id: n.nodeId,
          type: 'flowNode',
          position: n.ui || { x: 280 * (idx % 3), y: 200 * Math.floor(idx / 3) },
          data: {
            label: NODE_LABELS[n.nodeType] || n.nodeType,
            nodeType: n.nodeType,
            config: n.config || {},
            color: NODE_COLORS[n.nodeType] || '#999',
            layer,
            debugPoint: n.debugPoint || { pre: false, post: false },
          } as CustomNodeData,
          draggable: true,
        };
      });
      setNodes(mapped);
    }
    if (draftGraph.edges?.length > 0) {
      const mapped: Edge[] = draftGraph.edges.map((e: any) => ({
        id: e.edgeId,
        source: e.fromNodeId,
        target: e.toNodeId,
        label: e.branchOutputKey || (e.edgeType === 'BRANCH' ? '?' : undefined),
        type: e.edgeType === 'BRANCH' ? 'step' : 'smoothstep',
        markerEnd: {
          type: MarkerType.ArrowClosed,
          width: 12,
          height: 12,
          color: e.edgeType === 'BRANCH' ? '#fa8c16' : '#1890ff',
        },
        style: {
          stroke: e.edgeType === 'BRANCH' ? '#fa8c16' : '#1890ff',
          strokeWidth: 2,
        },
      }));
      setEdges(mapped);
    }
  }, [draftGraph]);

  const onConnect = useCallback(
    (params: Connection) => {
      if (!params.source || !params.target) return;

      const branchKeys = getNodeBranchKeys(params.source);
      if (branchKeys.length > 0) {
        setEdges((eds) =>
          addEdge(
            {
              ...params,
              type: 'step',
              label: '?',
              markerEnd: {
                type: MarkerType.ArrowClosed,
                width: 12,
                height: 12,
                color: '#fa8c16',
              },
              style: { stroke: '#fa8c16', strokeWidth: 2 },
            },
            eds
          )
        );
        message.info('请在右侧配置面板中选择分支输出');
        return;
      }
      setEdges((eds) =>
        addEdge(
          {
            ...params,
            type: 'smoothstep',
            markerEnd: {
              type: MarkerType.ArrowClosed,
              width: 12,
              height: 12,
              color: '#1890ff',
            },
            style: { stroke: '#1890ff', strokeWidth: 2 },
          },
          eds
        )
      );
    },
    [nodes, draftGraph]
  );

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      const nodeType = event.dataTransfer.getData('application/reactflow');
      if (!nodeType) return;
      const reactFlowBounds = event.currentTarget.getBoundingClientRect();
      const position = {
        x: event.clientX - reactFlowBounds.left,
        y: event.clientY - reactFlowBounds.top,
      };
      const layer = nodeType.startsWith('L4') ? 'L4' : nodeType.startsWith('L3') ? 'L3' : 'L2';
      const newNode: Node = {
        id: `N_${Date.now()}`,
        type: 'flowNode',
        position,
        data: {
          label: NODE_LABELS[nodeType] || nodeType,
          nodeType,
          config: {},
          color: NODE_COLORS[nodeType] || '#999',
          layer,
          debugPoint: { pre: false, post: false },
        } as CustomNodeData,
        draggable: true,
      };
      setNodes((nds) => [...nds, newNode]);
    },
    [setNodes]
  );

  const handleNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      const storeNode = draftGraph?.nodes?.find((n: any) => n.nodeId === node.id);
      onNodeSelect(
        storeNode ||
          {
            nodeId: node.id,
            nodeType: node.data.nodeType,
            ui: { x: node.position.x, y: node.position.y },
            config: node.data.config || {},
          } as FlowNode
      );
    },
    [draftGraph, onNodeSelect]
  );

  const onNodesDelete = useCallback(
    (deleted: Node[]) => {
      deleted.forEach((n) => {
        setEdges((eds) => eds.filter((e) => e.source !== n.id && e.target !== n.id));
      });
      if (deleted.some((n) => nodes.find((sn) => sn.id === n.id))) {
        onNodeSelect(null);
      }
    },
    [setEdges, onNodeSelect, nodes]
  );

  const nodesRef = useRef(nodes);
  const edgesRef = useRef(edges);

  useEffect(() => {
    nodesRef.current = nodes;
  }, [nodes]);

  useEffect(() => {
    edgesRef.current = edges;
  }, [edges]);

  const doSave = useCallback(() => {
    const flowNodes = nodesRef.current.map((n) => ({
      nodeId: n.id,
      nodeType: n.data.nodeType,
      ui: { x: n.position.x, y: n.position.y },
      debugPoint: n.data.debugPoint || { pre: false, post: false },
      config: n.data.config || {},
    }));
    const flowEdges: FlowEdge[] = edgesRef.current.map((e) => ({
      edgeId: e.id,
      fromNodeId: e.source,
      toNodeId: e.target,
      edgeType: e.type === 'step' ? 'BRANCH' : 'NEXT',
      branchOutputKey: (e.label as string) || undefined,
    }));
    updateDraftFlowGraph(flowId, {
      ...(flow.versions.Draft?.flowGraph || {
        flowId,
        name: flow.name,
        nodes: [],
        edges: [],
      }),
      nodes: flowNodes,
      edges: flowEdges,
    } as any);
    message.success('保存成功');
  }, [flowId, flow, updateDraftFlowGraph]);

  useEffect(() => {
    onSaveRef.current = doSave;
  }, [doSave, onSaveRef]);

  return (
    <div style={{ height: '100%' }} onDrop={onDrop} onDragOver={onDragOver}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={handleNodeClick}
        nodeTypes={nodeTypes}
        onNodesDelete={onNodesDelete}
        onEdgesDelete={(deleted) =>
          deleted.forEach((e) =>
            setEdges((eds) => eds.filter((ed) => ed.id !== e.id))
          )
        }
        deleteKeyCode={['Backspace', 'Delete']}
        defaultViewport={{ x: 30, y: 30, zoom: 1 }}
        minZoom={0.3}
        maxZoom={2}
        fitView={nodes.length > 0}
        fitViewOptions={{ padding: 0.3 }}
        attributionPosition="bottom-right"
        proOptions={{ hideAttribution: true }}
      >
        <Background gap={20} size={1} color="#d0d0d0" />
        <Controls
          showInteractive={false}
          style={{ bottom: 16, right: 16, borderRadius: 8 }}
        />
        <MiniMap
          nodeColor={(n) => (n.data as unknown as CustomNodeData)?.color || '#999'}
          style={{ bottom: 16, left: 16 }}
          maskColor="rgba(0,0,0,0.04)"
          pannable
          zoomable
        />
      </ReactFlow>
    </div>
  );
}

export default function FlowEditorPage() {
  const { flowId } = useParams<{ flowId: string }>();
  const navigate = useNavigate();
  const { flows, updateDraftFlowGraph, deployFlow } = useFlowStore();
  const { l2Atomics, l3Composites, l4Templates } = useActionStore();
  const [selectedNode, setSelectedNode] = useState<FlowNode | null>(null);
  const [activeTab, setActiveTab] = useState('config');
  const [isDebugModalOpen, setIsDebugModalOpen] = useState(false);
  const [isDebugRunning, setIsDebugRunning] = useState(false);
  const [debugResult, setDebugResult] = useState<{
    status: 'SUCCESS' | 'FAIL';
    steps: any[];
    error?: string;
  } | null>(null);
  const [debugStep, setDebugStep] = useState(0);
  const [form] = Form.useForm();
  const saveRef = useRef<(() => void) | null>(null);

  const flow = flows.find((f) => f.flowId === flowId);

  const handleDeploy = (env: FlowEnv) => {
    if (!flowId) return;
    deployFlow(flowId, env);
    message.success(`发布到${env}成功`);
  };

  const handleOpenDebug = () => {
    setIsDebugModalOpen(true);
    setDebugResult(null);
    setDebugStep(0);
    form.setFieldsValue({
      orderId: `ORD_${Date.now()}`,
      amount: 10000,
      currency: 'VND',
      channel: flow?.businessType || 'DEPOSIT',
    });
  };

  const handleRunDebug = async () => {
    if (!flow) return;
    setIsDebugRunning(true);
    setDebugResult(null);
    setDebugStep(0);

    const nodes = flow.versions.Draft?.flowGraph?.nodes || [];
    const steps: any[] = [];

    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];
      setDebugStep(i);
      await new Promise((resolve) => setTimeout(resolve, 500));

      steps.push({
        nodeId: node.nodeId,
        nodeType: node.nodeType,
        status: 'SUCCESS',
        input: { ...node.config },
        output: getMockOutput(node),
        duration: 100 + ((i + 1) * 137) % 500,
      });
    }

    setDebugStep(nodes.length);
    setIsDebugRunning(false);
    setDebugResult({
      status: 'SUCCESS',
      steps,
    });
    message.success('调试执行完成');
  };

  const getMockOutput = (node: FlowNode): any => {
    switch (node.nodeType as string) {
      case 'L2.HTTP_BUILD':
        return { requestBuilt: true, method: 'POST', url: '/api/v1/pay' };
      case 'L2.HTTP_SEND':
        return { code: '00', message: 'SUCCESS', data: { transactionId: `TXN_${Date.now()}` } };
      case 'L2.MAP_FIELD':
        return { mappedFields: ['merchantRef', 'channelRef'] };
      case 'L2.STATE_SET':
        return { previousState: 'INIT', currentState: 'SUCCESS' };
      case 'L2.MQ_PUBLISH':
        return { topic: 'order.completed', success: true };
      case 'L2.REQUERY_POLL':
        return { status: 'PENDING', attempts: 0 };
      case 'L2.GEN_RRN':
        return { rrn: `RRN${Date.now()}` };
      case 'L2.CALLBACK_PARSE':
        return { parsedData: { code: '00', status: 'SUCCESS' } };
      default:
        return { success: true };
    }
  };

  const handleNodeSelect = useCallback((node: FlowNode | null) => {
    setSelectedNode(node);
  }, []);

  const handleConfigChange = useCallback((_nodeId: string, config: any) => {
    setSelectedNode((prev) => (prev ? { ...prev, config } : null));
  }, []);

  const configPanel = selectedNode ? (
    <NodeConfigPanel
      node={selectedNode}
      onChange={(config) => handleConfigChange(selectedNode.nodeId, config)}
      onClose={() => setSelectedNode(null)}
    />
  ) : (
    <div style={{ padding: 32, textAlign: 'center', color: '#bbb' }}>
      <div style={{ fontSize: 40, marginBottom: 12 }}>👆</div>
      <div style={{ fontSize: 13 }}>点击画布中的节点查看配置</div>
    </div>
  );

  if (!flow) {
    return (
      <Card>
        <div style={{ textAlign: 'center' }}>
          <p>未找到 Flow: {flowId}</p>
          <Button onClick={() => navigate('/flow')}>返回列表</Button>
        </div>
      </Card>
    );
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        gap: 8,
      }}
    >
      {/* Header */}
      <Card size="small" styles={{ body: { padding: '8px 16px' } }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <Space size="middle">
            <Button
              icon={<ArrowLeftOutlined />}
              onClick={() => navigate('/flow')}
              size="small"
            />
            <span style={{ fontWeight: 600, fontSize: 14 }}>{flow.name}</span>
            <Tag color="blue">{flow.l4TemplateId || 'No Template'}</Tag>
          </Space>
          <Space size="small">
            <Button icon={<BugOutlined />} size="small" onClick={handleOpenDebug}>
              调试
            </Button>
            <Button
              icon={<SaveOutlined />}
              size="small"
              onClick={() => saveRef.current?.()}
            >
              保存
            </Button>
            <Dropdown
              menu={{
                items: [
                  {
                    key: 'Daily',
                    label: '发布到 Daily',
                    onClick: () => handleDeploy('Daily'),
                  },
                  {
                    key: 'Pre',
                    label: '发布到 Pre',
                    onClick: () => handleDeploy('Pre'),
                  },
                  {
                    key: 'Prod',
                    label: '发布到 Prod',
                    onClick: () => handleDeploy('Prod'),
                  },
                ],
              }}
            >
              <Button type="primary" icon={<CloudUploadOutlined />} size="small">
                发布
              </Button>
            </Dropdown>
          </Space>
        </div>
      </Card>

      {/* Main Content */}
      <div
        style={{
          display: 'flex',
          flex: 1,
          gap: 8,
          overflow: 'hidden',
        }}
      >
        {/* Left: Node Palette - Organized by L2/L3/L4 layers */}
        <Card
          size="small"
          styles={{ body: { padding: 10, width: 220, overflow: 'auto' } }}
          style={{ overflow: 'hidden' }}
        >
          <div
            style={{
              fontWeight: 600,
              fontSize: 11,
              color: '#999',
              marginBottom: 10,
              letterSpacing: 0.5,
              textTransform: 'uppercase',
            }}
          >
            节点组件
          </div>

          {/* L2 Atomic Nodes */}
          <div style={{ marginBottom: 16 }}>
            <div
              style={{
                fontSize: 10,
                fontWeight: 600,
                color: LAYER_COLORS['L2'],
                marginBottom: 6,
                display: 'flex',
                alignItems: 'center',
                gap: 4,
              }}
            >
              <span
                style={{
                  background: LAYER_COLORS['L2'],
                  color: '#fff',
                  padding: '1px 4px',
                  borderRadius: 2,
                  fontSize: 9,
                }}
              >
                L2
              </span>
              原子节点
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {l2Atomics.map((l2) => (
                <PaletteNode
                  key={l2.code}
                  type={l2.code}
                  color={NODE_COLORS[l2.code] || LAYER_COLORS['L2']}
                  layer="L2"
                />
              ))}
            </div>
          </div>

          {/* L3 Composite Nodes */}
          <div style={{ marginBottom: 16 }}>
            <div
              style={{
                fontSize: 10,
                fontWeight: 600,
                color: LAYER_COLORS['L3'],
                marginBottom: 6,
                display: 'flex',
                alignItems: 'center',
                gap: 4,
              }}
            >
              <span
                style={{
                  background: LAYER_COLORS['L3'],
                  color: '#fff',
                  padding: '1px 4px',
                  borderRadius: 2,
                  fontSize: 9,
                }}
              >
                L3
              </span>
              组合节点
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {l3Composites.map((l3) => (
                <PaletteNode
                  key={l3.code}
                  type={l3.code}
                  color={NODE_COLORS[l3.code] || LAYER_COLORS['L3']}
                  layer="L3"
                />
              ))}
            </div>
          </div>

          {/* L4 Template Nodes */}
          <div style={{ marginBottom: 16 }}>
            <div
              style={{
                fontSize: 10,
                fontWeight: 600,
                color: LAYER_COLORS['L4'],
                marginBottom: 6,
                display: 'flex',
                alignItems: 'center',
                gap: 4,
              }}
            >
              <span
                style={{
                  background: LAYER_COLORS['L4'],
                  color: '#fff',
                  padding: '1px 4px',
                  borderRadius: 2,
                  fontSize: 9,
                }}
              >
                L4
              </span>
              模板节点
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {l4Templates.map((t) => (
                <PaletteNode
                  key={t.templateId}
                  type={t.templateId}
                  color={NODE_COLORS[t.templateId] || LAYER_COLORS['L4']}
                  layer="L4"
                />
              ))}
            </div>
          </div>

          <div
            style={{
              marginTop: 16,
              padding: 10,
              background: '#f9f9f9',
              borderRadius: 6,
              fontSize: 10.5,
              color: '#aaa',
              lineHeight: 1.8,
            }}
          >
            💡 拖拽节点到画布
            <br />
            💡 拖拽圆点创建连线
            <br />
            💡 按 Delete 删除选中
          </div>
        </Card>

        {/* Center: Canvas */}
        <Card
          size="small"
          styles={{ body: { padding: 0, height: '100%' } }}
          style={{ flex: 1, overflow: 'hidden' }}
        >
          <FlowCanvas
            flow={flow}
            flowId={flowId!}
            updateDraftFlowGraph={updateDraftFlowGraph}
            onNodeSelect={handleNodeSelect}
            onSaveRef={saveRef}
          />
        </Card>

        {/* Right: Config Panel */}
        <Card
          size="small"
          styles={{ body: { padding: 0, width: 320, overflow: 'hidden' } }}
          style={{ overflow: 'hidden' }}
        >
          <Tabs
            activeKey={activeTab}
            onChange={setActiveTab}
            items={[
              {
                key: 'config',
                label: '节点配置',
                children: configPanel,
              },
              {
                key: 'outline',
                label: '流程大纲',
                children: (
                  <div
                    style={{
                      padding: 16,
                      textAlign: 'center',
                      color: '#ccc',
                      fontSize: 12,
                    }}
                  >
                    从左侧拖拽节点开始编排
                  </div>
                ),
              },
            ]}
          />
        </Card>
      </div>

      {/* Debug Modal */}
      <Modal
        title={
          <Space>
            <BugOutlined />
            Flow调试
          </Space>
        }
        open={isDebugModalOpen}
        onCancel={() => !isDebugRunning && setIsDebugModalOpen(false)}
        footer={[
          <Button
            key="cancel"
            onClick={() => setIsDebugModalOpen(false)}
            disabled={isDebugRunning}
          >
            关闭
          </Button>,
          <Button
            key="run"
            type="primary"
            icon={<PlayCircleOutlined />}
            onClick={handleRunDebug}
            loading={isDebugRunning}
            disabled={isDebugRunning}
          >
            {isDebugRunning ? '执行中...' : '执行调试'}
          </Button>,
        ]}
        width={700}
        maskClosable={!isDebugRunning}
        closable={!isDebugRunning}
      >
        <div style={{ marginTop: 16 }}>
          {!debugResult ? (
            <>
              <Alert
                message="调试说明"
                description="填写测试参数后点击执行调试，系统将模拟Flow中每个节点的处理过程，展示输入输出及耗时。"
                type="info"
                showIcon
                style={{ marginBottom: 16 }}
              />
              <Form form={form} layout="vertical">
                <Form.Item name="orderId" label="订单号" rules={[{ required: true }]}>
                  <Input placeholder="ORD_xxx" />
                </Form.Item>
                <Form.Item name="amount" label="金额" rules={[{ required: true }]}>
                  <Input type="number" placeholder="10000" />
                </Form.Item>
                <Form.Item name="currency" label="币种" rules={[{ required: true }]}>
                  <Select>
                    <Select.Option value="VND">VND - 越南盾</Select.Option>
                    <Select.Option value="CNY">CNY - 人民币</Select.Option>
                    <Select.Option value="USD">USD - 美元</Select.Option>
                  </Select>
                </Form.Item>
                <Form.Item name="channel" label="渠道">
                  <Input placeholder="MOMO, WECHAT" />
                </Form.Item>
              </Form>

              {isDebugRunning && flow && (
                <div style={{ marginTop: 24 }}>
                  <div
                    style={{ marginBottom: 8, fontWeight: 500, color: '#666' }}
                  >
                    执行进度
                  </div>
                  <Steps
                    size="small"
                    current={debugStep}
                    items={(flow.versions.Draft?.flowGraph?.nodes || []).map(
                      (n: any) => ({
                        title: NODE_LABELS[n.nodeType] || n.nodeType,
                        description: n.nodeId,
                      })
                    )}
                  />
                </div>
              )}
            </>
          ) : (
            <div style={{ marginTop: 16 }}>
              <Alert
                message={`调试${debugResult.status === 'SUCCESS' ? '成功' : '失败'}`}
                description={
                  debugResult.error ||
                  `Flow执行完成，共 ${debugResult.steps.length} 个节点`
                }
                type={debugResult.status === 'SUCCESS' ? 'success' : 'error'}
                showIcon
                style={{ marginBottom: 16 }}
              />
              <Card title="执行详情" size="small">
                <Timeline
                  items={debugResult.steps.map((step: any, _idx: number) => ({
                    color: step.status === 'SUCCESS' ? 'green' : 'red',
                    children: (
                      <div>
                        <Space>
                          <Tag
                            color={NODE_COLORS[step.nodeType] || '#999'}
                          >
                            {step.nodeType}
                          </Tag>
                          <strong>{step.nodeId}</strong>
                          <Tag
                            color={
                              step.status === 'SUCCESS' ? 'success' : 'error'
                            }
                          >
                            {step.status}
                          </Tag>
                          <span style={{ color: '#999', fontSize: 11 }}>
                            {step.duration}ms
                          </span>
                        </Space>
                        <div
                          style={{
                            marginTop: 4,
                            fontSize: 11,
                            color: '#666',
                          }}
                        >
                          <div>输入: {JSON.stringify(step.input)}</div>
                          <div>输出: {JSON.stringify(step.output)}</div>
                        </div>
                      </div>
                    ),
                  }))}
                />
              </Card>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}

import { useState, useCallback, useMemo, useEffect } from 'react';
import { Button, Space, Select, Modal, Typography, Table, Tag, Breadcrumb } from 'antd';
import { PlusOutlined, EyeOutlined, EditOutlined, SettingOutlined } from '@ant-design/icons';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { ReactFlow, Background, Controls, MiniMap, Handle, Position } from '@xyflow/react';
import type { Node, Edge } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import FlowConfigModal from './FlowConfigModal';
import FlowSettingsModal from './FlowSettingsModal';
import type { FlowConfig, TriggerType } from './types';

const { Text, Title } = Typography;

// State node component for rendering in state machine modal
function StateNode({ data }: { data: any }) {
  return (
    <div
      style={{
        width: 80,
        height: 80,
        borderRadius: '50%',
        background: '#22c55e',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        userSelect: 'none',
      }}
    >
      <Handle type="target" position={Position.Top} style={{ top: -5, background: '#1890ff', border: '2px solid #fff', width: 10, height: 10 }} />
      <span style={{ color: '#fff', fontSize: 13, fontWeight: 500, textAlign: 'center', padding: 8, wordBreak: 'break-word', lineHeight: 1.3 }}>
        {data?.name}
      </span>
      <Handle type="source" position={Position.Bottom} style={{ bottom: -5, background: '#1890ff', border: '2px solid #fff', width: 10, height: 10 }} />
    </div>
  );
}

const stateNodeTypes = { stateNode: StateNode };

// State machine selector modal
function StateMachineSelectorModal({
  visible,
  stateMachines,
  onSelect,
  onCancel,
}: {
  visible: boolean;
  stateMachines: { name: string; description?: string }[];
  onSelect: (name: string) => void;
  onCancel: () => void;
}) {
  const [selected, setSelected] = useState<string | null>(null);

  return (
    <Modal
      title="Select StateMachine"
      open={visible}
      onCancel={() => {
        setSelected(null);
        onCancel();
      }}
      onOk={() => selected && onSelect(selected)}
      okText="Confirm"
      cancelText="Cancel"
      width={500}
    >
      <div style={{ padding: '16px 0' }}>
        <Text type="secondary" style={{ display: 'block', marginBottom: 12 }}>
          Select a state machine to configure flows for each state
        </Text>
        <Select
          placeholder="Select StateMachine"
          style={{ width: '100%' }}
          value={selected}
          onChange={setSelected}
          options={stateMachines.map(sm => ({ label: sm.name, value: sm.name }))}
        />
      </div>
    </Modal>
  );
}

export default function ConfigEditorPage() {
  const { channelCode } = useParams<{ channelCode: string; ability: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // State machine related states
  const [showStateMachineSelector, setShowStateMachineSelector] = useState(false);
  const [selectedStateMachine, setSelectedStateMachine] = useState<string | null>(null);
  const [stateMachineNodes, setStateMachineNodes] = useState<Node[]>([]);
  const [stateMachineEdges, setStateMachineEdges] = useState<Edge[]>([]);

  // Show state machine modal
  const [showStateMachineModal, setShowStateMachineModal] = useState(false);

  // Flow config modal - direct flow creation without state node click
  const [showFlowConfigModal, setShowFlowConfigModal] = useState(false);
  const [editingFlow, setEditingFlow] = useState<FlowConfig | null>(null);

  // Flow settings modal - for editing flow settings
  const [showFlowSettingsModal, setShowFlowSettingsModal] = useState(false);
  const [editingFlowForSettings, setEditingFlowForSettings] = useState<FlowConfig | null>(null);

  // Flows list for this state machine
  const [flows, setFlows] = useState<FlowConfig[]>([]);

  // Mock state machines - in real app this would come from API/state management
  const availableStateMachines = useMemo(() => [
    { name: 'Default_Refund_StateMachine', description: 'REFUND state machine' },
    { name: 'BankCard_Debit_StateMachine', description: 'Bank card debit state machine' },
  ], []);

  // Auto-select state machine if passed via query param, otherwise use first available
  useEffect(() => {
    const smParam = searchParams.get('sm');
    let smName: string;

    if (smParam) {
      smName = decodeURIComponent(smParam);
    } else {
      // Default to first available state machine
      smName = availableStateMachines[0]?.name || '';
    }

    if (smName) {
      const flow = getStateMachineFlow(smName);
      setStateMachineNodes(flow.nodes);
      setStateMachineEdges(flow.edges);
      setSelectedStateMachine(smName);
    }
  }, [searchParams]);

  // Get state machine flow data - extracting States only with their connections
  const getStateMachineFlow = useCallback((_smName: string) => {
    // States: INIT, WAITING_OTP, VERIFYING_OTP, AUTHENTICATING, PROGRESSING, SUCCESS, FAILED
    const states = [
      { id: 's1', name: 'INIT', x: 100, y: 200 },
      { id: 's2', name: 'WAITING_OTP', x: 420, y: 60 },
      { id: 's3', name: 'VERIFYING_OTP', x: 660, y: 60 },
      { id: 's4', name: 'AUTHENTICATING', x: 420, y: 280 },
      { id: 's5', name: 'PROGRESSING', x: 420, y: 480 },
      { id: 's6', name: 'SUCCESS', x: 880, y: 480 },
      { id: 's7', name: 'FAILED', x: 880, y: 240 },
    ];

    const nodes: Node[] = states.map(s => ({
      id: s.id,
      type: 'stateNode',
      position: { x: s.x, y: s.y },
      data: { name: s.name },
    }));

    // State-to-state connections
    const edges: Edge[] = [
      { id: 'e1', source: 's1', target: 's2', type: 'smoothstep', markerEnd: { type: 'arrowclosed' }, style: { stroke: '#333', strokeWidth: 2 }, data: { label: '' } },
      { id: 'e2', source: 's1', target: 's4', type: 'smoothstep', markerEnd: { type: 'arrowclosed' }, style: { stroke: '#333', strokeWidth: 2 }, data: { label: '' } },
      { id: 'e3', source: 's1', target: 's5', type: 'smoothstep', markerEnd: { type: 'arrowclosed' }, style: { stroke: '#333', strokeWidth: 2 }, data: { label: '' } },
      { id: 'e4', source: 's1', target: 's7', type: 'smoothstep', markerEnd: { type: 'arrowclosed' }, style: { stroke: '#333', strokeWidth: 2 }, data: { label: '' } },
      { id: 'e5', source: 's2', target: 's3', type: 'smoothstep', markerEnd: { type: 'arrowclosed' }, style: { stroke: '#333', strokeWidth: 2, strokeDasharray: '6 3' }, data: { label: '' } },
      { id: 'e6', source: 's3', target: 's4', type: 'smoothstep', markerEnd: { type: 'arrowclosed' }, style: { stroke: '#333', strokeWidth: 2 }, data: { label: '' } },
      { id: 'e7', source: 's4', target: 's5', type: 'smoothstep', markerEnd: { type: 'arrowclosed' }, style: { stroke: '#333', strokeWidth: 2 }, data: { label: '' } },
      { id: 'e8', source: 's4', target: 's7', type: 'smoothstep', markerEnd: { type: 'arrowclosed' }, style: { stroke: '#333', strokeWidth: 2 }, data: { label: '' } },
      { id: 'e9', source: 's5', target: 's6', type: 'smoothstep', markerEnd: { type: 'arrowclosed' }, style: { stroke: '#333', strokeWidth: 2 }, data: { label: '' } },
      { id: 'e10', source: 's5', target: 's7', type: 'smoothstep', markerEnd: { type: 'arrowclosed' }, style: { stroke: '#333', strokeWidth: 2 }, data: { label: '' } },
    ];

    return { nodes, edges };
  }, []);

  const handleStateMachineSelect = useCallback((smName: string) => {
    const flow = getStateMachineFlow(smName);
    setStateMachineNodes(flow.nodes);
    setStateMachineEdges(flow.edges);
    setSelectedStateMachine(smName);
    setShowStateMachineSelector(false);
  }, [getStateMachineFlow]);

  // Direct flow creation - opens FlowConfigModal
  const handleAddFlow = () => {
    setEditingFlow(null);
    setShowFlowConfigModal(true);
  };

  // Edit existing flow - open settings modal
  const handleEditFlow = (flowId: string) => {
    const flow = flows.find(f => f.id === flowId);
    if (flow) {
      setEditingFlowForSettings(flow);
      setShowFlowSettingsModal(true);
    }
  };

  // Delete flow - reserved for future use
  // const handleDeleteFlow = (flowId: string) => {
  //   setFlows(prev => prev.filter(f => f.id !== flowId));
  // };

  const handleFlowConfigSave = (config: FlowConfig) => {
    console.log('Flow config saved:', config);
    setFlows(prev => [...prev, config]);
  };

  const handleFlowSettingsSave = (config: FlowConfig) => {
    console.log('Flow settings saved:', config);
    setFlows(prev => prev.map(f => f.id === config.id ? config : f));
    setShowFlowSettingsModal(false);
    setEditingFlowForSettings(null);
  };

  const handleFlowConfigNext = () => {
    const flowType = editingFlow?.flowType || 'outbound';
    const config: FlowConfig = {
      id: editingFlow?.id || `flow_${Date.now()}`,
      name: editingFlow?.name || `Flow_${Date.now()}`,
      executionType: editingFlow?.executionType || 'single',
      flowType: flowType,
      endType: editingFlow?.endType || 'wait_external',
      isConfigured: true,
    };
    handleFlowConfigSave(config);
    setShowFlowConfigModal(false);
    setEditingFlow(null);
  };

  // Trigger type display helper
  const getTriggerLabel = (type: TriggerType) => {
    switch (type) {
      case 'UPSTREAM_TRIGGERED': return 'Upstream Trigger';
      case 'EXTERNAL_INBOUND_TRIGGERED': return 'External Trigger';
      case 'CALLBACK_TRIGGERED': return 'Callback Trigger';
      case 'ASYNC_TRIGGERED': return 'Async Trigger';
      case 'SCHEDULED_TRIGGERED': return 'Scheduled Trigger';
      default: return 'Unknown';
    }
  };

  return (
    <div style={{ padding: 24 }}>
      {/* State Machine Selector Modal */}
      <StateMachineSelectorModal
        visible={showStateMachineSelector}
        stateMachines={availableStateMachines}
        onSelect={handleStateMachineSelect}
        onCancel={() => setShowStateMachineSelector(false)}
      />

      {/* View State Machine Modal */}
      <Modal
        title={<Space><span>State Machine:</span><Text strong>{selectedStateMachine}</Text><Button size="small" onClick={() => { setShowStateMachineModal(false); setShowStateMachineSelector(true); }} style={{ marginLeft: 8 }}>Change StateMachine</Button></Space>}
        open={showStateMachineModal}
        onCancel={() => setShowStateMachineModal(false)}
        footer={null}
        width={800}
      >
        <div style={{ height: 400 }}>
          <ReactFlow
            nodes={stateMachineNodes}
            edges={stateMachineEdges}
            nodeTypes={stateNodeTypes}
            fitView={true}
            style={{ height: '100%' }}
          >
            <Background color="#e8e8e8" gap={16} />
            <Controls />
            <MiniMap />
          </ReactFlow>
        </div>
      </Modal>

      {/* Breadcrumb */}
      <Breadcrumb
        style={{ marginBottom: 16 }}
        items={[
          { title: 'Channel Integration', href: `/channel-integration` },
          { title: channelCode, href: `/channel-integration/${channelCode}/integration` },
          { title: 'Config Integration', href: `/channel-integration/${channelCode}/integration` },
          { title: 'Flow Configuration' },
        ]}
      />

      {/* Header - always show */}
      {selectedStateMachine && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div>
            <Title level={4} style={{ marginTop: 0, marginBottom: 4 }}>Flow Configuration</Title>
            <Text type="secondary">
              StateMachine: <Text strong>{selectedStateMachine}</Text>
            </Text>
          </div>
          <Space>
            <Button icon={<EyeOutlined />} onClick={() => setShowStateMachineModal(true)}>
              View StateMachine
            </Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={handleAddFlow}>Add Flow</Button>
          </Space>
        </div>
      )}

      {/* Main Content Area - Flow List */}
      {selectedStateMachine && (
        <div style={{ background: '#fff', border: '1px solid #e8e8e8', borderRadius: 8, overflow: 'hidden' }}>
          <Table
            dataSource={flows}
            rowKey="id"
            pagination={false}
            locale={{ emptyText: 'No flows configured. Click "Add Flow" to create your first flow.' }}
          >
              <Table.Column title="Flow ID" dataIndex="id" key="id" width={180} />
              <Table.Column title="Flow Name" dataIndex="name" key="name" />
              <Table.Column title="Trigger Type" dataIndex="triggerType" key="triggerType" width={140} render={(type: TriggerType) => (
                <Tag color={
                  type === 'UPSTREAM_TRIGGERED' ? 'blue' :
                  type === 'EXTERNAL_INBOUND_TRIGGERED' ? 'purple' :
                  type === 'CALLBACK_TRIGGERED' ? 'orange' :
                  type === 'ASYNC_TRIGGERED' ? 'green' :
                  type === 'SCHEDULED_TRIGGERED' ? 'cyan' : 'default'
                }>
                  {getTriggerLabel(type)}
                </Tag>
              )} />
              <Table.Column title="Triggered By" key="triggeredBy" width={180} render={(_: any, record: FlowConfig) => {
                // UPSTREAM_TRIGGERED or EXTERNAL_INBOUND_TRIGGERED - show Trigger Action
                if (record.triggerType === 'UPSTREAM_TRIGGERED' || record.triggerType === 'EXTERNAL_INBOUND_TRIGGERED') {
                  const actions = record.triggerEvents || [];
                  return actions.length > 0 ? (
                    <Space wrap>
                      {actions.map((action, idx) => (
                        <Tag key={idx} color="blue">{action}</Tag>
                      ))}
                    </Space>
                  ) : <span style={{ color: '#999' }}>-</span>;
                }
                // CALLBACK_TRIGGERED - show CALLBACK
                if (record.triggerType === 'CALLBACK_TRIGGERED') {
                  return <Tag color="orange">CALLBACK</Tag>;
                }
                // ASYNC_TRIGGERED - show flow names that trigger this flow
                if (record.triggerType === 'ASYNC_TRIGGERED') {
                  const triggeringFlows = flows.filter(f => f.outputEvents?.some(e => e.eventName === record.name));
                  return triggeringFlows.length > 0 ? (
                    <Space wrap>
                      {triggeringFlows.map(f => (
                        <Tag key={f.id} color="green">{f.name}</Tag>
                      ))}
                    </Space>
                  ) : <span style={{ color: '#999' }}>-</span>;
                }
                // SCHEDULED_TRIGGERED - show Trigger Sub-state
                if (record.triggerType === 'SCHEDULED_TRIGGERED') {
                  const subState = record.stateConditions?.[0]?.value;
                  return subState ? <Tag color="cyan">{subState}</Tag> : <span style={{ color: '#999' }}>-</span>;
                }
                return <span style={{ color: '#999' }}>-</span>;
              }} />
              <Table.Column title="Status" key="status" width={100} render={(_: any, record: FlowConfig) => (
                <Tag color={record.isConfigured ? 'success' : 'default'}>
                  {record.isConfigured ? 'Configured' : 'Draft'}
                </Tag>
              )} />
              <Table.Column title="Operation" key="operation" width={180} render={(_: any, record: FlowConfig) => (
                <Space>
                  <Button
                    type="text"
                    size="small"
                    icon={<SettingOutlined />}
                    onClick={() => handleEditFlow(record.id)}
                  >
                    Settings
                  </Button>
                  <Button
                    type="text"
                    size="small"
                    icon={<EditOutlined />}
                    onClick={() => navigate(`/channel-integration/${channelCode}/integration/config/COLLECTION/CARD_PAY/${record.id}`)}
                  >
                    Edit Components
                  </Button>
                </Space>
              )} />
            </Table>
        </div>
      )}

      {/* Flow Config Modal */}
      <FlowConfigModal
        visible={showFlowConfigModal}
        stateName="INIT"
        existingFlows={flows}
        availableEvents={[]}
        editingFlow={editingFlow}
        onSave={handleFlowConfigSave}
        onNext={handleFlowConfigNext}
        onCancel={() => {
          setShowFlowConfigModal(false);
          setEditingFlow(null);
        }}
      />

      {/* Flow Settings Modal */}
      <FlowSettingsModal
        visible={showFlowSettingsModal}
        flow={editingFlowForSettings}
        existingFlows={flows}
        onSave={handleFlowSettingsSave}
        onCancel={() => {
          setShowFlowSettingsModal(false);
          setEditingFlowForSettings(null);
        }}
      />

      {/* Debug info */}
      {!selectedStateMachine && !showStateMachineSelector && (
        <div style={{ padding: 20, background: '#fff', textAlign: 'center' }}>
          <Text>No state machine selected. Please select one.</Text>
        </div>
      )}
    </div>
  );
}
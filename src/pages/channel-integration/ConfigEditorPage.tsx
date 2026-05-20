import { useState, useCallback, useMemo } from 'react';
import { Button, Space, message, Breadcrumb, Select, Modal, Typography } from 'antd';
import { useParams, useNavigate } from 'react-router-dom';
import { ReactFlow, Background, Controls, MiniMap, Handle, Position } from '@xyflow/react';
import type { Node, Edge } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import StateFlowListPage from './StateFlowListPage';
import StateConfigModal from './StateConfigModal';

const { Text, Title } = Typography;

// State node component matching StateMachineCanvas style
function StateNode({ data, selected }: { data: any; selected?: boolean }) {
  return (
    <div
      style={{
        width: 80,
        height: 80,
        borderRadius: '50%',
        background: selected ? '#16a34a' : '#22c55e',
        border: selected ? '3px solid #3b82f6' : 'none',
        boxShadow: selected ? '0 0 0 2px #3b82f6, 0 4px 12px rgba(0,0,0,0.15)' : '0 2px 8px rgba(0,0,0,0.1)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        userSelect: 'none',
        transition: 'background 0.15s, border 0.15s',
      }}
    >
      <Handle type="target" position={Position.Top} style={{ top: -5, background: '#1890ff', border: '2px solid #fff', width: 10, height: 10 }} />
      <Handle type="source" position={Position.Bottom} style={{ bottom: -5, background: '#1890ff', border: '2px solid #fff', width: 10, height: 10 }} />
      <span style={{ color: '#fff', fontSize: 13, fontWeight: 500, textAlign: 'center', padding: 8, wordBreak: 'break-word', lineHeight: 1.3 }}>
        {data?.name}
      </span>
    </div>
  );
}

const nodeTypes = { stateNode: StateNode };

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
  const { channelCode, ability } = useParams<{ channelCode: string; ability: string }>();
  const navigate = useNavigate();

  // State machine related states
  const [showStateMachineSelector, setShowStateMachineSelector] = useState(true);
  const [selectedStateMachine, setSelectedStateMachine] = useState<string | null>(null);
  const [stateMachineNodes, setStateMachineNodes] = useState<Node[]>([]);
  const [stateMachineEdges, setStateMachineEdges] = useState<Edge[]>([]);

  // State config modal
  const [showStateConfigModal, setShowStateConfigModal] = useState(false);
  const [selectedStateForConfig, setSelectedStateForConfig] = useState<string | null>(null);
  const [selectedStateIsDashed, setSelectedStateIsDashed] = useState(false);

  // Flow list page for specific state (after state config)
  const [selectedStateForFlow, setSelectedStateForFlow] = useState<string | null>(null);
  const [showFlowListPage, setShowFlowListPage] = useState(false);

  // Mock state machines - in real app this would come from API/state management
  const availableStateMachines = useMemo(() => [
    { name: 'Default_Refund_StateMachine', description: 'REFUND状态机' },
    { name: 'BankCard_Debit_StateMachine', description: '银行卡扣款状态机' },
  ], []);

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
      { id: 'e5', source: 's2', target: 's3', type: 'smoothstep', markerEnd: { type: 'arrowclosed' }, style: { stroke: '#333', strokeWidth: 2, strokeDasharray: '6 3' }, data: { label: '虚线' } },
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

  // Handle state node click - show state config modal first
  const handleStateNodeClick = useCallback((stateName: string, isDashed: boolean) => {
    setSelectedStateForConfig(stateName);
    setSelectedStateIsDashed(isDashed);
    setShowStateConfigModal(true);
  }, []);

  // Handle state config save - then show flow list only for non-dashed states
  const handleStateConfigSave = useCallback((config: any) => {
    console.log('State config saved:', config);
    setShowStateConfigModal(false);
    // Only show flow list for solid line states (non-dashed)
    if (!selectedStateIsDashed) {
      setSelectedStateForFlow(selectedStateForConfig);
      setShowFlowListPage(true);
    }
  }, [selectedStateForConfig, selectedStateIsDashed]);

  // 返回列表
  const handleBack = () => {
    navigate(`/channel-integration/${channelCode}/integration/config`);
  };

  // 保存草稿
  const handleSaveDraft = () => {
    message.success('Saved successfully', 2);
  };

  // 提交
  const handleSubmit = () => {
    message.success('Submitted, version v1.2.0 generated');
  };

  // Whether to show split view (state machine on left, flow on right)
  const isSplitView = showFlowListPage;

  return (
    <div style={{ padding: 24 }}>
      {/* 面包屑 */}
      <Breadcrumb
        style={{ marginBottom: 16 }}
        items={[
          { title: 'Channel Integration', onClick: () => navigate('/channel-integration') },
          { title: channelCode },
          { title: 'Integration' },
          { title: 'Config Integration', onClick: handleBack },
          { title: ability },
        ]}
      />

      {/* State Machine Selector Modal */}
      <StateMachineSelectorModal
        visible={showStateMachineSelector}
        stateMachines={availableStateMachines}
        onSelect={handleStateMachineSelect}
        onCancel={() => setShowStateMachineSelector(false)}
      />

      {/* Header - always show */}
      {(selectedStateMachine || showFlowListPage) && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div>
            <Title level={4} style={{ marginTop: 0, marginBottom: 4 }}>State Machine Flow</Title>
            <Text type="secondary">
              StateMachine: <Text strong>{selectedStateMachine}</Text>
              {selectedStateForFlow && <span> | Selected State: <Text strong style={{ color: '#22c55e' }}>{selectedStateForFlow}</Text></span>}
            </Text>
          </div>
          <Space>
            <Button onClick={() => {
              if (showFlowListPage) {
                setShowFlowListPage(false);
                setSelectedStateForFlow(null);
              } else {
                setShowStateMachineSelector(true);
              }
            }}>
              {showFlowListPage ? 'Back to State Machine' : 'Change StateMachine'}
            </Button>
            <Button onClick={handleSaveDraft}>Save Draft</Button>
            <Button type="primary" onClick={handleSubmit}>Submit</Button>
          </Space>
        </div>
      )}

      {/* Main Content Area - Split View or Full View */}
      {selectedStateMachine && (
        <div style={{
          display: 'flex',
          gap: 16,
          height: isSplitView ? 'calc(100vh - 280px)' : 500,
          transition: 'all 0.3s ease'
        }}>
          {/* Left Panel - State Machine Canvas */}
          <div style={{
            flex: isSplitView ? '0 0 45%' : '1',
            background: '#fafafa',
            border: '1px solid #e8e8e8',
            borderRadius: 8,
            padding: 16,
            overflow: 'hidden',
            transition: 'flex 0.3s ease'
          }}>
            <div style={{ width: '100%', height: '100%' }}>
              <ReactFlow
                key={isSplitView ? 'split' : 'full'}
                nodes={stateMachineNodes}
                edges={stateMachineEdges}
                nodeTypes={nodeTypes}
                fitView={true}
                onNodeClick={(_event, node) => {
                  const stateName = (node.data as any)?.name as string | undefined;
                  if (stateName && !isSplitView) {
                    // Check if this state has dashed connection
                    const hasDashedEdge = stateMachineEdges.some(
                      e => e.source === node.id && e.style && (e.style as any).strokeDasharray
                    );
                    handleStateNodeClick(stateName, !!hasDashedEdge);
                  }
                }}
                style={{ height: '100%' }}
              >
                <Background color="#e8e8e8" gap={16} />
                <Controls />
                <MiniMap />
              </ReactFlow>
            </div>
            <Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 8 }}>
              {isSplitView ? 'Click a state to select it' : 'Note: Click on a state node to configure'}
            </Text>
          </div>

          {/* Right Panel - Flow List or Flow Editor */}
          {isSplitView && (
            <div style={{
              flex: '1',
              background: '#fff',
              border: '1px solid #e8e8e8',
              borderRadius: 8,
              overflow: 'hidden',
              transition: 'flex 0.3s ease'
            }}>
              {showFlowListPage && (
                <StateFlowListPage
                  channelCode={channelCode || 'GTB_NG'}
                  bt={ability || 'CARD_PAY'}
                  stateName={selectedStateForFlow || ''}
                  onBack={() => {
                    setShowFlowListPage(false);
                    setSelectedStateForFlow(null);
                  }}
                  autoShowConfigModal={true}
                />
              )}
            </div>
          )}
        </div>
      )}

      {/* State Config Modal */}
      <StateConfigModal
        visible={showStateConfigModal}
        stateName={selectedStateForConfig || ''}
        isDashed={selectedStateIsDashed}
        onSave={handleStateConfigSave}
        onCancel={() => {
          setShowStateConfigModal(false);
          setSelectedStateForConfig(null);
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
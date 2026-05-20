import { useState, useEffect } from 'react';
import { Button, Space, Typography, Card, Tag, Empty } from 'antd';
import { PlusOutlined, ArrowRightOutlined } from '@ant-design/icons';
import type { FlowConfig } from './types';
import FlowConfigModal from './FlowConfigModal';

const { Text, Title } = Typography;

interface StateFlowListPageProps {
  channelCode: string;
  bt: string;
  stateName: string;
  onBack: () => void;
  onFlowSelect?: (flow: FlowConfig) => void;
  autoShowConfigModal?: boolean;
}

export default function StateFlowListPage({ channelCode, bt, stateName, onBack, autoShowConfigModal = false }: StateFlowListPageProps) {
  const [flows, setFlows] = useState<FlowConfig[]>([
    {
      id: 'flow_default_1',
      name: '',
      executionType: 'single',
      flowType: 'forward',
      endType: 'wait_external',
      isConfigured: false,
      triggerEvents: [],
    }
  ]);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [editingFlow, setEditingFlow] = useState<FlowConfig | null>(null);

  // Auto-open config modal when autoShowConfigModal is true
  useEffect(() => {
    if (autoShowConfigModal) {
      setShowConfigModal(true);
      setEditingFlow(flows[0] || null);
    }
  }, [autoShowConfigModal]);

  // Get available events from all flows (events they can generate)
  const availableEvents = flows
    .filter(f => f.endType === 'event' && f.eventConfigs)
    .flatMap(f => f.eventConfigs!.map(e => e.conditions.map(c => c.field).join('')))
    .filter(Boolean);

  const handleAddFlow = () => {
    setEditingFlow(null);
    setShowConfigModal(true);
  };

  const handleSaveFlow = (config: FlowConfig) => {
    if (editingFlow) {
      // Update existing flow
      setFlows(flows.map(f => f.id === editingFlow.id ? config : f));
    } else {
      // Add new flow
      setFlows([...flows, config]);
    }
    setShowConfigModal(false);
    setEditingFlow(null);
  };

  const handleFlowClick = (flow: FlowConfig) => {
    // Always open config modal to edit the flow
    // Only way to enter component config canvas is via Next button in FlowConfigModal
    setEditingFlow(flow);
    setShowConfigModal(true);
  };

  const handleNextFromConfig = () => {
    // Get flow type from editing flow or default to forward
    const flowType = editingFlow?.flowType || 'forward';
    const flowName = editingFlow?.name || `Flow_${stateName}_${Date.now()}`;
    const config: FlowConfig = {
      id: editingFlow?.id || `flow_${Date.now()}`,
      name: flowName,
      executionType: editingFlow?.executionType || 'single',
      flowType: flowType,
      endType: editingFlow?.endType || 'wait_external',
      isConfigured: true,
    };

    if (editingFlow) {
      setFlows(flows.map(f => f.id === editingFlow.id ? config : f));
    } else {
      setFlows([...flows, config]);
    }
    setShowConfigModal(false);
    setEditingFlow(null);

    // Navigate to component editor page (FlowEditorPage)
    const url = `/channel-integration/${channelCode}/integration/config/${bt}/${stateName}/0?flowType=${flowType}`;
    window.location.href = url;
  };

  const getEndTypeLabel = (endType: string) => {
    switch (endType) {
      case 'event': return 'Generate Event';
      case 'state': return 'Generate State';
      case 'wait_upstream': return 'Wait Upstream';
      case 'wait_external': return 'Wait External';
      default: return endType;
    }
  };

  const getEndTypeColor = (endType: string) => {
    switch (endType) {
      case 'event': return 'blue';
      case 'state': return 'green';
      case 'wait_upstream': return 'orange';
      case 'wait_external': return 'purple';
      default: return 'default';
    }
  };

  return (
    <div style={{ padding: 16, height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16
      }}>
        <div>
          <Title level={5} style={{ marginTop: 0, marginBottom: 4 }}>
            Flows for State: <Text style={{ color: '#22c55e' }}>{stateName}</Text>
          </Title>
          <Text type="secondary" style={{ fontSize: 12 }}>
            Click on a flow to edit
          </Text>
        </div>
        <Space>
          <Button size="small" danger onClick={onBack}>Close</Button>
          <Button type="primary" size="small" icon={<PlusOutlined />} onClick={handleAddFlow}>
            Add Flow
          </Button>
        </Space>
      </div>

      {/* Flow List */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        {flows.length === 0 ? (
          <Empty
            description="No flows configured"
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          >
            <Button type="primary" size="small" icon={<PlusOutlined />} onClick={handleAddFlow}>
              Add First Flow
            </Button>
          </Empty>
        ) : (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
            {flows.map(flow => (
              <Card
                key={flow.id}
                hoverable
                onClick={() => handleFlowClick(flow)}
                style={{
                  width: 240,
                  border: flow.executionType === 'loop' ? '2px solid #fa8c16' : '1px solid #e8e8e8',
                  cursor: 'pointer',
                }}
                bodyStyle={{ padding: 12 }}
              >
                {/* Flow Header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                  {flow.executionType === 'loop' && (
                    <Tag color="orange" style={{ marginRight: 4, fontSize: 10 }}>Loop</Tag>
                  )}
                  <Text strong style={{ fontSize: 13, flex: 1 }}>{flow.name}</Text>
                  {!flow.isConfigured && (
                    <Tag color="red" style={{ fontSize: 10 }}>Unconf</Tag>
                  )}
                </div>

                {/* Flow Info */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Text type="secondary" style={{ fontSize: 11 }}>Exec:</Text>
                    <Tag color={flow.executionType === 'loop' ? 'orange' : 'default'} style={{ fontSize: 10, margin: 0 }}>
                      {flow.executionType === 'loop' ? 'Loop' : 'Single'}
                    </Tag>
                    <Tag color={flow.flowType === 'forward' ? 'blue' : 'cyan'} style={{ fontSize: 10, margin: 0 }}>
                      {flow.flowType === 'forward' ? 'Fwd' : 'Bwd'}
                    </Tag>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Text type="secondary" style={{ fontSize: 11 }}>End:</Text>
                    <Tag color={getEndTypeColor(flow.endType)} style={{ fontSize: 10, margin: 0 }}>
                      {getEndTypeLabel(flow.endType)}
                    </Tag>
                  </div>

                  {flow.triggerEvents && flow.triggerEvents.length > 0 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Text type="secondary" style={{ fontSize: 11 }}>Triggers:</Text>
                      <Space size={2}>
                        {flow.triggerEvents.slice(0, 2).map((evt, idx) => (
                          <Tag key={idx} color="blue" style={{ fontSize: 9, margin: 0 }}>{evt}</Tag>
                        ))}
                      </Space>
                    </div>
                  )}
                </div>

                {/* Enter Icon */}
                <div style={{
                  position: 'absolute',
                  right: 12,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  opacity: 0.4
                }}>
                  <ArrowRightOutlined />
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Flow Config Modal */}
      <FlowConfigModal
        visible={showConfigModal}
        stateName={stateName}
        existingFlows={flows}
        availableEvents={availableEvents}
        onSave={handleSaveFlow}
        onNext={handleNextFromConfig}
        onCancel={() => {
          setShowConfigModal(false);
          setEditingFlow(null);
        }}
      />
    </div>
  );
}
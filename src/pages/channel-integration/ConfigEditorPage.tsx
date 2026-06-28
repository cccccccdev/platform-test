import { useState } from 'react';
import { Breadcrumb, Button, message, Modal, Space, Table, Tag, Typography } from 'antd';
import { EditOutlined, EyeOutlined, PlusOutlined, SettingOutlined } from '@ant-design/icons';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import FlowConfigModal from './FlowConfigModal';
import FlowSettingsModal from './FlowSettingsModal';
import { useConfigIntegrationStore } from './configIntegrationStore';
import type { FlowConfig, TriggerType } from './types';

const { Text, Title } = Typography;

const triggerLabels: Record<TriggerType, string> = {
  UPSTREAM_TRIGGERED: 'Upstream Trigger',
  EXTERNAL_INBOUND_TRIGGERED: 'External Trigger',
  CALLBACK_TRIGGERED: 'Callback Trigger',
  ASYNC_TRIGGERED: 'Async Trigger',
  SCHEDULED_TRIGGERED: 'Scheduled Trigger',
};

export default function ConfigEditorPage() {
  const {
    channelCode = '',
    bt = '',
    ability: abilityCode = '',
    versionId = '',
  } = useParams<{
    channelCode: string;
    bt: string;
    ability: string;
    versionId: string;
  }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const readOnly = searchParams.get('mode') === 'detail';
  const [showFlowConfigModal, setShowFlowConfigModal] = useState(false);
  const [editingFlow, setEditingFlow] = useState<FlowConfig | null>(null);
  const [previewStateMachine, setPreviewStateMachine] = useState(false);

  const ability = useConfigIntegrationStore((state) =>
    (state.abilitiesByChannel[channelCode] ?? []).find(
      (item) => item.bt === bt && item.ability === abilityCode
    )
  );
  const version = ability?.versions.find((item) => item.id === versionId);
  const addFlow = useConfigIntegrationStore((state) => state.addFlow);
  const updateFlow = useConfigIntegrationStore((state) => state.updateFlow);
  const updateVersion = useConfigIntegrationStore((state) => state.updateVersion);

  if (!ability || !version) {
    return (
      <div style={{ padding: 24 }}>
        <Title level={4}>Flow Configuration not found</Title>
        <Button onClick={() => navigate(`/channel-integration/${channelCode}/integration`)}>
          Back to Config Integration
        </Button>
      </div>
    );
  }

  const flows = version.flows;

  const handleFlowSave = (flow: FlowConfig) => {
    addFlow(channelCode, bt, abilityCode, versionId, flow);
  };

  const handleSettingsSave = (flow: FlowConfig) => {
    updateFlow(channelCode, bt, abilityCode, versionId, flow.id, flow);
    setEditingFlow(null);
  };

  const handleSaveDraft = () => {
    updateVersion(channelCode, bt, abilityCode, versionId, {
      publishStatus: 'draft',
      badges: [],
    });
    message.success('Flow Version saved as Draft in the current runtime');
  };

  const handleSubmit = () => {
    if (flows.length === 0) {
      message.error('Create at least one Flow before Submit');
      return;
    }
    const incomplete = flows.find((flow) => !flow.isConfigured);
    if (incomplete) {
      message.error(`Flow ${incomplete.name} is not fully configured`);
      return;
    }
    updateVersion(channelCode, bt, abilityCode, versionId, { publishStatus: 'submitted' });
    message.success('Flow Version submitted');
  };

  return (
    <div style={{ padding: 24 }}>
      <Breadcrumb
        style={{ marginBottom: 16 }}
        items={[
          { title: 'Channel Integration', href: '/channel-integration' },
          { title: channelCode, href: `/channel-integration/${channelCode}/integration` },
          { title: 'Config Integration', href: `/channel-integration/${channelCode}/integration` },
          { title: readOnly ? 'Flow Configuration Detail' : 'Flow Configuration' },
        ]}
      />

      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <Title level={4} style={{ margin: 0 }}>{readOnly ? 'Flow Configuration Detail' : 'Flow Configuration'}</Title>
          <Space wrap style={{ marginTop: 8 }}>
            <Text>Channel: <Text strong>{channelCode}</Text></Text>
            <Text>BT: <Text strong>{bt}</Text></Text>
            <Text>Ability: <Text strong>{abilityCode}</Text></Text>
            <Text>Version: <Text strong>{version.version}</Text></Text>
            <Tag color={version.publishStatus === 'submitted' ? 'orange' : version.publishStatus === 'published' ? 'blue' : 'default'}>
              {version.publishStatus}
            </Tag>
          </Space>
        </div>
        <Space>
          <Button icon={<EyeOutlined />} onClick={() => setPreviewStateMachine(true)}>
            {ability.stateMachine}
          </Button>
          {!readOnly && (
            <>
              <Button onClick={handleSaveDraft}>Save Draft</Button>
              <Button type="primary" onClick={handleSubmit}>Submit</Button>
              <Button icon={<PlusOutlined />} onClick={() => setShowFlowConfigModal(true)}>New Flow</Button>
            </>
          )}
        </Space>
      </div>

      <Table<FlowConfig>
        dataSource={flows}
        rowKey="id"
        pagination={false}
        locale={{ emptyText: 'No flows configured for this Version' }}
        columns={[
          { title: 'Flow ID', dataIndex: 'id', width: 200 },
          { title: 'Flow Name', dataIndex: 'name' },
          {
            title: 'Trigger Type',
            dataIndex: 'triggerType',
            width: 180,
            render: (triggerType?: TriggerType) => triggerType
              ? <Tag>{triggerLabels[triggerType]}</Tag>
              : <span style={{ color: '#999' }}>-</span>,
          },
          {
            title: 'Direction',
            dataIndex: 'flowType',
            width: 110,
            render: (flowType: string) => <Tag color={flowType === 'inbound' ? 'purple' : 'blue'}>{flowType}</Tag>,
          },
          {
            title: 'Status',
            width: 110,
            render: (_value, flow) => (
              <Tag color={flow.isConfigured ? 'success' : 'default'}>
                {flow.isConfigured ? 'Configured' : 'Draft'}
              </Tag>
            ),
          },
          {
            title: 'Operation',
            width: 260,
            render: (_value, flow) => (
              <Space>
                <Button
                  type="text"
                  icon={<SettingOutlined />}
                  disabled={readOnly}
                  onClick={() => setEditingFlow(flow)}
                >
                  Settings
                </Button>
                <Button
                  type="text"
                  icon={<EditOutlined />}
                  onClick={() => navigate(
                    `/channel-integration/${channelCode}/integration/config/${bt}/${abilityCode}/versions/${versionId}/flows/${flow.id}?flowType=${flow.flowType}${readOnly ? '&mode=detail' : ''}`
                  )}
                >
                  {readOnly ? 'View Components' : 'Edit Components'}
                </Button>
              </Space>
            ),
          },
        ]}
      />

      <FlowConfigModal
        visible={showFlowConfigModal}
        stateName=""
        existingFlows={flows}
        availableEvents={[]}
        onSave={handleFlowSave}
        onCancel={() => setShowFlowConfigModal(false)}
      />

      <FlowSettingsModal
        visible={Boolean(editingFlow)}
        flow={editingFlow}
        existingFlows={flows}
        onSave={handleSettingsSave}
        onCancel={() => setEditingFlow(null)}
      />

      <Modal
        title={`State Machine: ${ability.stateMachine}`}
        open={previewStateMachine}
        footer={null}
        onCancel={() => setPreviewStateMachine(false)}
      >
        <div style={{ padding: 32, textAlign: 'center', color: '#666' }}>
          Read-only State Machine preview
        </div>
      </Modal>
    </div>
  );
}

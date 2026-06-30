import { useState } from 'react';
import { Badge, Breadcrumb, Button, Modal, Space, Table, Tag, Typography } from 'antd';
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
  REQUERY_TRIGGERED: 'Requery Trigger',
};

const stateMachineSubStates: Record<string, string[]> = {
  Default_Refund_StateMachine: ['INIT', 'PROGRESSING', 'SUCCESS', 'FAILED'],
  BankCard_Debit_StateMachine: ['INIT', 'WAITING_OTP', 'VERIFYING_OTP', 'AUTHENTICATING', 'PROGRESSING', 'SUCCESS', 'FAILED'],
};

const flowStatusColors: Record<string, string> = {
  DRAFT: 'default',
  SUBMITTED: 'orange',
};

const statusColors: Record<string, string> = {
  DRAFT: 'default',
  DAILY: 'blue',
  PRE: 'orange',
  PROD: 'green',
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
  const [draftConfirmFlow, setDraftConfirmFlow] = useState<FlowConfig | null>(null);

  const ability = useConfigIntegrationStore((state) =>
    (state.abilitiesByChannel[channelCode] ?? []).find(
      (item) => item.bt === bt && item.ability === abilityCode
    )
  );
  const version = ability?.versions.find((item) => item.id === versionId);
  const addFlow = useConfigIntegrationStore((state) => state.addFlow);
  const updateFlow = useConfigIntegrationStore((state) => state.updateFlow);

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
  const groupId = version.groupId;
  const availableSubStates = stateMachineSubStates[ability.stateMachine] ?? [];

  const handleFlowSave = (flow: FlowConfig) => {
    addFlow(channelCode, bt, abilityCode, groupId, flow);
  };

  const handleSettingsSave = (flow: FlowConfig) => {
    updateFlow(channelCode, bt, abilityCode, groupId, flow.id, flow);
    setEditingFlow(null);
  };

  const handleEditComponents = (flow: FlowConfig) => {
    if (flow.submittedContent && flow.status === 'SUBMITTED') {
      setDraftConfirmFlow(flow);
    } else {
      navigateToFlowEditor(flow);
    }
  };

  const navigateToFlowEditor = (flow: FlowConfig) => {
    navigate(
      `/channel-integration/${channelCode}/integration/config/${bt}/${abilityCode}/versions/${versionId}/flows/${flow.id}?flowType=${flow.flowType}${readOnly ? '&mode=detail' : ''}`
    );
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
            <Text>Group ID: <Text strong>{version.groupId}</Text></Text>
            <Text>Version: <Text strong>{version.version}</Text></Text>
            <Tag color={statusColors[version.status] || 'default'}>{version.status}</Tag>
            {version.remark && <Text type="secondary">({version.remark})</Text>}
          </Space>
        </div>
        <Space>
          <Button icon={<EyeOutlined />} onClick={() => setPreviewStateMachine(true)}>
            {ability.stateMachine}
          </Button>
          {!readOnly && (
            <Button icon={<PlusOutlined />} onClick={() => setShowFlowConfigModal(true)}>New Flow</Button>
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
            title: 'Triggered By',
            width: 150,
            render: (_value, flow) => (
              <span>{flow.triggerEvents?.[0] ?? flow.contextActions?.[0] ?? '-'}</span>
            ),
          },
          {
            title: 'Status',
            width: 100,
            render: (_value, flow) => (
              <Tag color={flowStatusColors[flow.status ?? 'DRAFT']}>{flow.status ?? 'DRAFT'}</Tag>
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
                <Badge dot={flow.status === 'SUBMITTED' && Boolean(flow.submittedContent)}>
                  <Button
                    type="text"
                    icon={<EditOutlined />}
                    onClick={() => handleEditComponents(flow)}
                  >
                    {readOnly ? 'View Components' : 'Edit Components'}
                  </Button>
                </Badge>
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
        availableActions={ability.actions ?? []}
        availableSubStates={availableSubStates}
        onSave={handleFlowSave}
        onCancel={() => setShowFlowConfigModal(false)}
      />

      <FlowSettingsModal
        visible={Boolean(editingFlow)}
        flow={editingFlow}
        availableActions={ability.actions ?? []}
        availableSubStates={availableSubStates}
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

      <Modal
        title="Unsaved Draft Detected"
        open={Boolean(draftConfirmFlow)}
        onCancel={() => setDraftConfirmFlow(null)}
        footer={[
          <Button key="cancel" onClick={() => setDraftConfirmFlow(null)}>Cancel</Button>,
          <Button key="discard" onClick={() => {
            if (draftConfirmFlow) {
              updateFlow(channelCode, bt, abilityCode, groupId, draftConfirmFlow.id, {
                submittedContent: undefined,
              });
              navigateToFlowEditor({ ...draftConfirmFlow, submittedContent: undefined });
              setDraftConfirmFlow(null);
            }
          }}>
            Discard Draft
          </Button>,
          <Button key="continue" type="primary" onClick={() => {
            if (draftConfirmFlow) {
              navigateToFlowEditor(draftConfirmFlow);
              setDraftConfirmFlow(null);
            }
          }}>
            Continue Editing Draft
          </Button>,
        ]}
      >
        <p>
          This flow has an unsubmitted draft. You can continue editing the draft or discard it and
          edit the last submitted version.
        </p>
      </Modal>
    </div>
  );
}

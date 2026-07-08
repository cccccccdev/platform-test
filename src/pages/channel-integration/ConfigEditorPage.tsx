import { useState } from 'react';
import { Badge, Breadcrumb, Button, message, Modal, Space, Table, Tag, Typography } from 'antd';
import { DeleteOutlined, EditOutlined, EyeOutlined, PlusOutlined, SettingOutlined } from '@ant-design/icons';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import FlowConfigModal from './FlowConfigModal';
import FlowSettingsModal from './FlowSettingsModal';
import { useConfigIntegrationStore } from './configIntegrationStore';
import type { FlowConfig, TriggerType } from './types';
import StateMachinePreviewModal from './StateMachinePreviewModal';

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
  const runtimeDetail = searchParams.get('source') === 'runtime';
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
  const deleteFlow = useConfigIntegrationStore((state) => state.deleteFlow);
  const updateFlow = useConfigIntegrationStore((state) => state.updateFlow);

  if (!ability || !version) {
    return (
      <div style={{ padding: 24 }}>
        <Title level={4}>Flow Configuration not found</Title>
        <Button onClick={() => navigate(`/channel-integration/${channelCode}/integration/config/flow-groups`)}>
          Back to Flow Groups
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

  const handleDeleteFlow = (flow: FlowConfig) => {
    Modal.confirm({
      title: 'Delete Flow',
      content: `Delete Flow "${flow.name}"? This action cannot be undone.`,
      okText: 'Delete',
      okButtonProps: { danger: true },
      cancelText: 'Cancel',
      onOk: () => {
        deleteFlow(channelCode, bt, abilityCode, groupId, flow.id);
        message.success('Flow deleted');
      },
    });
  };

  const handleEditComponents = (flow: FlowConfig) => {
    if (flow.submittedContent && flow.status === 'SUBMITTED') {
      setDraftConfirmFlow(flow);
    } else {
      navigateToFlowEditor(flow);
    }
  };

  const navigateToFlowEditor = (flow: FlowConfig) => {
    const basePath = runtimeDetail
      ? `/channel-integration/${channelCode}/channel-info/runtime-control/flow-groups/${bt}/${abilityCode}/versions/${versionId}/flows/${flow.id}`
      : `/channel-integration/${channelCode}/integration/config/flow-groups/${bt}/${abilityCode}/versions/${versionId}/flows/${flow.id}`;
    navigate(`${basePath}?flowType=${flow.flowType}${readOnly ? '&mode=detail' : ''}${runtimeDetail ? '&source=runtime' : ''}`);
  };

  return (
    <div style={{ padding: 24 }}>
      <Breadcrumb
        style={{ marginBottom: 16 }}
        items={runtimeDetail
          ? [
              { title: channelCode, href: `/channel-integration/${channelCode}/channel-info` },
              { title: 'Channel Info', href: `/channel-integration/${channelCode}/channel-info` },
              { title: 'Runtime Control' },
              { title: 'Flow Groups' },
              { title: readOnly ? 'Flow Configuration Detail' : 'Flow Configuration' },
            ]
          : [
              { title: 'Channel Integration', href: '/channel-integration' },
              { title: channelCode, href: `/channel-integration/${channelCode}/integration/config/flow-groups` },
              { title: 'Config Integration' },
              { title: 'Flow Groups', href: `/channel-integration/${channelCode}/integration/config/flow-groups` },
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
            width: 170,
            render: (_value, flow) => flow.triggerEvents?.[0] ?? flow.contextActions?.[0] ?? '-',
          },
          {
            title: 'Trigger Sub-State',
            width: 240,
            render: (_value, flow) => {
              const triggerSubState = flow.stateConditions?.find((condition) => condition.field === 'subState')?.value;
              return flow.triggerType === 'REQUERY_TRIGGERED' && triggerSubState ? <Tag color="gold">{triggerSubState}</Tag> : <span style={{ color: '#999' }}>N/A</span>;
            },
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
            width: 340,
            render: (_value, flow) => (
              <Space>
                {!readOnly && version.status !== 'PROD' && (
                  <Button
                    type="text"
                    icon={<SettingOutlined />}
                    onClick={() => setEditingFlow(flow)}
                  >
                    Settings
                  </Button>
                )}
                <Badge dot={flow.status === 'SUBMITTED' && Boolean(flow.submittedContent)}>
                  <Button
                    type="text"
                    icon={<EditOutlined />}
                    onClick={() => handleEditComponents(flow)}
                  >
                    {readOnly ? 'View Components' : 'Edit Components'}
                  </Button>
                </Badge>
                {!readOnly && flow.status === 'DRAFT' && (
                  <Button type="text" danger icon={<DeleteOutlined />} onClick={() => handleDeleteFlow(flow)}>
                    Delete
                  </Button>
                )}
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
        existingFlows={flows}
        availableActions={ability.actions ?? []}
        availableSubStates={availableSubStates}
        onSave={handleSettingsSave}
        onCancel={() => setEditingFlow(null)}
      />

      <StateMachinePreviewModal
        open={previewStateMachine}
        stateMachine={ability.stateMachine}
        onClose={() => setPreviewStateMachine(false)}
      />

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

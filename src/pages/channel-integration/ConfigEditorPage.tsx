import { useState } from 'react';
import { Badge, Breadcrumb, Button, message, Modal, Space, Tag, Typography } from 'antd';
import { DeleteOutlined, EditOutlined, EyeOutlined, PlusOutlined, SettingOutlined } from '@ant-design/icons';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import FlowConfigModal from './FlowConfigModal';
import FlowSettingsModal from './FlowSettingsModal';
import { useConfigIntegrationStore } from './configIntegrationStore';
import { useMatchCapabilityStore } from './matchCapabilityStore';
import type { FlowConfig, InboundEndpoint, TriggerType } from './types';
import StateMachinePreviewModal, { isNoStateMachine, stateMachineDisplayName } from './StateMachinePreviewModal';

const { Text, Title } = Typography;

const triggerLabels: Record<TriggerType, string> = {
  UPSTREAM_TRIGGERED: 'Upstream Trigger',
  EXTERNAL_INBOUND_TRIGGERED: 'External Trigger',
  CALLBACK_TRIGGERED: 'Callback Trigger',
  ASYNC_TRIGGERED: 'Async Trigger',
  REQUERY_TRIGGERED: 'Requery Trigger',
};

const stateMachineSubStates: Record<string, string[]> = {
  Wallet_Debit_StateMachine: ['PAYMENT_PENDING_WAIT_CALLBACK', 'PAYMENT_PENDING_WAIT_REQUERY', 'PAYMENT_SUCCESS', 'PAYMENT_FAILED_BY_CHANNEL'],
  Fund_Notification_StateMachine: ['PAYMENT_PENDING_WAIT_CALLBACK', 'PAYMENT_SUCCESS', 'PAYMENT_FAILED_BY_CHANNEL', 'BILL_QUERY_SUCCESS', 'BILL_QUERY_FAILED'],
  Default_Refund_StateMachine: ['INIT', 'PROGRESSING', 'SUCCESS', 'FAILED'],
  BankCard_Debit_StateMachine: ['INIT', 'WAITING_OTP', 'VERIFYING_OTP', 'AUTHENTICATING', 'PROGRESSING', 'SUCCESS', 'FAILED'],
  SMS_Single_Message_StateMachine: ['INIT', 'SUBMITTED', 'DELIVERED', 'FAILED'],
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
const EMPTY_INBOUND_ENDPOINTS: InboundEndpoint[] = [];

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
  const channelInboundEndpoints = useMatchCapabilityStore((state) => state.endpointsByChannel[channelCode]);
  const inboundEndpoints = channelInboundEndpoints ?? EMPTY_INBOUND_ENDPOINTS;

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
  const noStateMachine = isNoStateMachine(ability.stateMachine);
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
      content: `Delete Flow "${flow.name}"? The current Group Version will be updated after deletion. This action cannot be undone.`,
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

  const renderTriggerCondition = (flow: FlowConfig) => {
    if (flow.triggerType === 'EXTERNAL_INBOUND_TRIGGERED' || flow.triggerType === 'CALLBACK_TRIGGERED') {
      const inboundUri = inboundEndpoints.find((endpoint) => endpoint.id === flow.inboundUriId);
      return <span title={inboundUri?.url ?? flow.inboundUriId ?? ''} style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        <Text type="secondary" style={{ fontSize: 11 }}>Inbound URI&nbsp;</Text>
        {inboundUri?.url ?? flow.inboundUriId ?? 'N/A'}
      </span>;
    }
    if (flow.triggerType === 'REQUERY_TRIGGERED') {
      const triggerState = flow.stateConditions?.[0]?.value;
      return <span>
        <Text type="secondary" style={{ fontSize: 11 }}>Sub-state&nbsp;</Text>
        {triggerState ?? 'N/A'}
      </span>;
    }
    return <span style={{ color: '#8c8c8c' }}>N/A</span>;
  };

  return (
    <div className="flow-configuration-page">
      <section className="flow-configuration-heading">
        <Breadcrumb
        items={runtimeDetail
          ? [
              { title: channelCode, onClick: () => navigate(`/channel-integration/${channelCode}/channel-info`) },
              { title: 'Channel Info', onClick: () => navigate(`/channel-integration/${channelCode}/channel-info`) },
              { title: 'Runtime Control' },
              { title: 'Flow Groups' },
              { title: readOnly ? 'Flow Group Detail' : 'Flow Configuration' },
            ]
          : [
              { title: 'Channel List', onClick: () => navigate('/channel-integration') },
              { title: 'Config Integration' },
              { title: 'Flow Groups', onClick: () => navigate(`/channel-integration/${channelCode}/integration/config/flow-groups`) },
              { title: readOnly ? 'Flow Group Detail' : 'Flow Group Config' },
            ]}
        />
        <Title level={4}>{readOnly ? 'Flow Group Detail' : 'Flow Group Config'}</Title>
      </section>

      <main className="flow-configuration-content">
        <div className="flow-configuration-toolbar">
          <Space wrap className="flow-configuration-context">
            <Text>Channel: <Text strong>{channelCode}</Text></Text>
            <Text>Business Type: <Text strong>{bt}</Text></Text>
            <Text>Ability: <Text strong>{abilityCode}</Text></Text>
            <Text>Group ID: <Text strong>{version.groupId}</Text></Text>
            <Text>Group Version: <Text strong>{version.version}</Text></Text>
            {version.remark && <Text>Description: <Text strong>{version.remark}</Text></Text>}
            <Text>Status: <Tag color={statusColors[version.status] || 'default'}>{version.status}</Tag></Text>
          </Space>
          <Space className="flow-configuration-actions">
          {noStateMachine ? (
            <Tag color="default" style={{ padding: '4px 8px' }}>
              {stateMachineDisplayName(ability.stateMachine)}
            </Tag>
          ) : (
            <Button icon={<EyeOutlined />} onClick={() => setPreviewStateMachine(true)}>
              {ability.stateMachine}
            </Button>
          )}
          {!readOnly && (
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setShowFlowConfigModal(true)}>New Flow</Button>
          )}
          </Space>
        </div>

      <div className="flow-configuration-table">
        <div className="flow-configuration-grid flow-configuration-grid-header"><span>Flow ID</span><span>Flow Name</span><span>Trigger Type</span><span>Triggered By</span><span>Trigger Condition</span><span>Status</span><span className="flow-configuration-operation-cell">Operation</span></div>
        {flows.length ? flows.map((flow) => <div key={flow.id} className="flow-configuration-grid flow-configuration-grid-row">
          <span>{flow.id}</span><span style={{ fontWeight: 600 }}>{flow.name}</span><span><Tag>{flow.triggerType ? triggerLabels[flow.triggerType] : '-'}</Tag></span><span>{flow.triggerEvents?.[0] ?? flow.contextActions?.[0] ?? '-'}</span>{renderTriggerCondition(flow)}<span><Tag color={flowStatusColors[flow.status ?? 'DRAFT']}>{flow.status ?? 'DRAFT'}</Tag></span><Space className="flow-configuration-operation flow-configuration-operation-cell">
            {!readOnly && version.status !== 'PROD' && <Button type="text" icon={<SettingOutlined />} onClick={() => setEditingFlow(flow)}>Settings</Button>}
            <Badge dot={flow.status === 'SUBMITTED' && Boolean(flow.submittedContent)}><Button type="text" icon={<EditOutlined />} onClick={() => handleEditComponents(flow)}>{readOnly ? 'View Components' : 'Edit Components'}</Button></Badge>
            {!readOnly && version.status !== 'PROD' && <Button type="text" danger icon={<DeleteOutlined />} onClick={() => handleDeleteFlow(flow)}>Delete</Button>}
          </Space>
        </div>) : <div style={{ padding: 24, color: '#8c8c8c', textAlign: 'center' }}>No flows configured. Click &quot;New Flow&quot; to create your first Flow.</div>}
      </div>
      </main>

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

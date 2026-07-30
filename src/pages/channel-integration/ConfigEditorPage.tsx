import { useState } from 'react';
import { Badge, Breadcrumb, Button, Form, Input, message, Modal, Select, Space, Table, Tag, Tooltip, Typography } from 'antd';
import { CopyOutlined, DeleteOutlined, EditOutlined, EyeOutlined, PlusOutlined, SettingOutlined } from '@ant-design/icons';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import FlowConfigModal from './FlowConfigModal';
import FlowSettingsModal from './FlowSettingsModal';
import { useConfigIntegrationStore } from './configIntegrationStore';
import { useMatchCapabilityStore } from './matchCapabilityStore';
import { getActionsForTrigger } from './flowTemplates';
import type { FlowConfig, TriggerType } from './types';
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

const triggerActionOf = (flow: FlowConfig) => flow.triggerEvents?.[0] ?? flow.contextActions?.[0];

const copyActionFieldName = (triggerType?: TriggerType) => {
  if (triggerType === 'CALLBACK_TRIGGERED') return 'originalRequestAction';
  if (triggerType === 'ASYNC_TRIGGERED' || triggerType === 'REQUERY_TRIGGERED') return 'referenceAction';
  return 'triggerAction';
};

const clearCopiedMappingFields = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(clearCopiedMappingFields);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([key, item]) => {
    if (['source', 'sourceValue', 'target', 'targetValue'].includes(key)) return [key, undefined];
    return [key, clearCopiedMappingFields(item)];
  }));
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
  const [copyingFlow, setCopyingFlow] = useState<FlowConfig | null>(null);
  const [previewStateMachine, setPreviewStateMachine] = useState(false);
  const [draftConfirmFlow, setDraftConfirmFlow] = useState<FlowConfig | null>(null);
  const [copyForm] = Form.useForm();

  const ability = useConfigIntegrationStore((state) =>
    (state.abilitiesByChannel[channelCode] ?? []).find(
      (item) => item.bt === bt && item.ability === abilityCode
    )
  );
  const version = ability?.versions.find((item) => item.id === versionId);
  const addFlow = useConfigIntegrationStore((state) => state.addFlow);
  const deleteFlow = useConfigIntegrationStore((state) => state.deleteFlow);
  const updateFlow = useConfigIntegrationStore((state) => state.updateFlow);
  const inboundEndpoints = useMatchCapabilityStore((state) => state.endpointsByChannel[channelCode] ?? []);

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
  const inboundUriValue = (flow: FlowConfig) => {
    if (!flow.inboundUriId) return 'N/A';
    return inboundEndpoints.find((endpoint) => endpoint.id === flow.inboundUriId)?.url ?? flow.inboundUriId;
  };

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

  const openCopyFlow = (flow: FlowConfig) => {
    setCopyingFlow(flow);
    copyForm.setFieldsValue({
      flowName: `${flow.name} Copy`,
      triggerAction: undefined,
      originalRequestAction: undefined,
      referenceAction: undefined,
      triggerSubState: flow.stateConditions?.find((condition) => condition.field === 'subState')?.value,
    });
  };

  const handleCopyFlow = async () => {
    if (!copyingFlow) return;
    const values = await copyForm.validateFields();
    const actionField = copyActionFieldName(copyingFlow.triggerType);
    const selectedAction = values[actionField];
    const copiedId = `flow_${Date.now()}`;
    const copiedFlow: FlowConfig = {
      ...structuredClone(copyingFlow),
      id: copiedId,
      name: values.flowName,
      triggerEvents: actionField === 'triggerAction' || actionField === 'originalRequestAction' ? [selectedAction] : [],
      contextActions: actionField === 'referenceAction' ? [selectedAction] : [],
      stateConditions: values.triggerSubState
        ? [{ id: 'trigger-sub-state', field: 'subState', operator: '==', value: values.triggerSubState }]
        : [],
      status: 'DRAFT',
      submittedContent: undefined,
      isConfigured: false,
      canvasNodes: copyingFlow.canvasNodes?.map((node) => ({
        ...structuredClone(node),
        id: `${copiedId}_${node.id}`,
        status: node.status === 'complete' ? 'need_review' : node.status,
        config: node.config ? clearCopiedMappingFields(node.config) as Record<string, unknown> : undefined,
      })),
      canvasEdges: copyingFlow.canvasEdges?.map((edge) => ({
        ...structuredClone(edge),
        id: `${copiedId}_${edge.id}`,
        source: `${copiedId}_${edge.source}`,
        target: `${copiedId}_${edge.target}`,
      })),
    };
    addFlow(channelCode, bt, abilityCode, groupId, copiedFlow);
    setCopyingFlow(null);
    copyForm.resetFields();
    message.success('Flow copied. Please review SPI mappings before submitting.');
    navigateToFlowEditor(copiedFlow);
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
  const copyActionField = copyActionFieldName(copyingFlow?.triggerType);
  const originalCopyAction = copyingFlow ? triggerActionOf(copyingFlow) : undefined;
  const copyActionOptions = copyingFlow?.triggerType
    ? getActionsForTrigger(copyingFlow.triggerType, ability.actions ?? [], flows)
      .filter((action) => action !== originalCopyAction)
      .filter((action) => !flows.some((flow) => flow.id !== copyingFlow.id && flow.triggerType === copyingFlow.triggerType && triggerActionOf(flow) === action))
      .map((action) => ({ value: action, label: action }))
    : [];

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

      <Table<FlowConfig>
        className="flow-configuration-table"
        dataSource={flows}
        rowKey="id"
        pagination={false}
        scroll={{ x: 1500 }}
        locale={{ emptyText: 'No flows configured. Click "New Flow" to create your first Flow.' }}
        columns={[
          { title: 'Flow ID', dataIndex: 'id', width: 200 },
          { title: 'Flow Name', dataIndex: 'name', width: 240 },
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
            title: 'Trigger Condition',
            width: 240,
            render: (_value, flow) => {
              const triggerSubState = flow.stateConditions?.find((condition) => condition.field === 'subState')?.value;
              if (flow.triggerType === 'EXTERNAL_INBOUND_TRIGGERED' || flow.triggerType === 'CALLBACK_TRIGGERED') {
                const uri = inboundUriValue(flow);
                return (
                  <Space size={6} className="flow-trigger-condition">
                    <Tag>Inbound URI</Tag>
                    <Tooltip title={uri}>
                      <Text className="flow-trigger-condition-value">{uri}</Text>
                    </Tooltip>
                  </Space>
                );
              }
              if (flow.triggerType === 'REQUERY_TRIGGERED' && triggerSubState) {
                return (
                  <Space size={6} className="flow-trigger-condition">
                    <Tag>Sub-state</Tag>
                    <Text>{triggerSubState}</Text>
                  </Space>
                );
              }
              return <span style={{ color: '#999' }}>N/A</span>;
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
            fixed: 'right',
            render: (_value, flow) => (
              <Space className="flow-configuration-operation">
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
                {!readOnly && version.status !== 'PROD' && (
                  <Button type="text" icon={<CopyOutlined />} onClick={() => openCopyFlow(flow)}>
                    Copy
                  </Button>
                )}
                {!readOnly && version.status !== 'PROD' && (
                  <Button type="text" danger icon={<DeleteOutlined />} onClick={() => handleDeleteFlow(flow)}>
                    Delete
                  </Button>
                )}
              </Space>
            ),
          },
        ]}
      />
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

      <Modal
        title="Copy Flow"
        open={Boolean(copyingFlow)}
        width={620}
        okText="Copy and Edit Components"
        onOk={() => void handleCopyFlow()}
        onCancel={() => {
          setCopyingFlow(null);
          copyForm.resetFields();
        }}
      >
        {copyingFlow && (
          <Form form={copyForm} layout="vertical" style={{ marginTop: 12 }}>
            <Form.Item
              name="flowName"
              label="Flow Name"
              rules={[
                { required: true, message: 'Please enter Flow Name' },
                { validator: (_, value) => !value || !flows.some((flow) => flow.name === value) ? Promise.resolve() : Promise.reject(new Error('Flow Name already exists')) },
              ]}
            >
              <Input placeholder="Enter Flow Name" />
            </Form.Item>
            <Form.Item label="Trigger Type">
              <Input disabled value={copyingFlow.triggerType ? triggerLabels[copyingFlow.triggerType] : '-'} />
            </Form.Item>
            <Form.Item
              name={copyActionField}
              label={copyingFlow.triggerType === 'CALLBACK_TRIGGERED' ? 'Original Request Action' : copyingFlow.triggerType === 'ASYNC_TRIGGERED' || copyingFlow.triggerType === 'REQUERY_TRIGGERED' ? 'Reference Action' : 'Trigger Action'}
              rules={[{ required: true, message: 'Please select a new Action' }]}
              extra="Action must be reselected because copied component mappings need to bind to the new SPI."
            >
              <Select
                placeholder={copyActionOptions.length ? 'Select a new Action' : 'No available Action'}
                disabled={copyActionOptions.length === 0}
                options={copyActionOptions}
              />
            </Form.Item>
            {copyingFlow.stateConditions?.some((condition) => condition.field === 'subState') && (
              <Form.Item
                name="triggerSubState"
                label="Trigger Sub-State"
                rules={[{ required: true, message: 'Please select Trigger Sub-State' }]}
              >
                <Select
                  placeholder={availableSubStates.length ? 'Select Trigger Sub-State' : 'No Sub-State available'}
                  disabled={availableSubStates.length === 0}
                  options={availableSubStates.map((subState) => ({ label: subState, value: subState }))}
                />
              </Form.Item>
            )}
          </Form>
        )}
      </Modal>

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

import { useMemo, useState } from 'react';
import {
  Button,
  Breadcrumb,
  Form,
  message,
  Modal,
  Pagination,
  Select,
  Space,
  Table,
  Tag,
  Tooltip,
  Typography,
} from 'antd';
import { DownOutlined, EyeOutlined, PlusOutlined, RightOutlined } from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import { abilityOptions, capabilityActionOptions, mockBusinessTypes } from '../../mock/data';
import { CLOUD_DEPLOY_SEQUENCES, useConfigIntegrationStore } from './configIntegrationStore';
import type { CloudType, ConfigAbility, DeployRecord, FlowGroupVersion } from './types';
import StateMachinePreviewModal, { isNoStateMachine, stateMachineDisplayName } from './StateMachinePreviewModal';

const { Text } = Typography;

const linkedStateMachines: Record<string, string[]> = {
  'COLLECTION:CARD_PAY': ['Default_Refund_StateMachine', 'BankCard_Debit_StateMachine'],
  'COLLECTION:USSD_PAY': ['BankCard_Debit_StateMachine'],
  'COLLECTION:WALLET_PAY': ['Default_Refund_StateMachine'],
  'DISBURSEMENT:BANK_TRF': ['Default_Refund_StateMachine'],
  'BANK_CARD_DEBIT:INFO_PAYMENT': ['BankCard_Debit_StateMachine'],
  'WALLET_DEBIT:TRANSFER': ['Default_Refund_StateMachine'],
  'SMS:SINGLE_MESSAGE': ['SMS_Single_Message_StateMachine'],
  'SMS:BULK_MESSAGE': ['Default_Refund_StateMachine'],
  'KYC:FINGERPRINT_VERIFY': ['Default_Refund_StateMachine'],
  'FUND_NOTIFICATION:CUSTOMER_VALIDATION': ['Default_Refund_StateMachine'],
};

function AddCapabilitiesModal({
  open,
  existingAbilities,
  availableBusinessTypes,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  existingAbilities: ConfigAbility[];
  availableBusinessTypes: string[];
  onConfirm: (bt: string, ability: string, actions: string[], stateMachine: string) => void;
  onCancel: () => void;
}) {
  const [form] = Form.useForm();
  const bt = Form.useWatch('bt', form) as string | undefined;
  const ability = Form.useWatch('ability', form) as string | undefined;

  const availableAbilities = (abilityOptions[bt ?? ''] ?? []).filter(
    (candidate) => !existingAbilities.some((item) => item.bt === bt && item.ability === candidate)
  );
  const availableActions = capabilityActionOptions[`${bt}:${ability}`] ?? [];
  const stateMachines = linkedStateMachines[`${bt}:${ability}`] ?? [];

  const resetAndCancel = () => {
    form.resetFields();
    onCancel();
  };

  return (
    <Modal
      title="Add Capabilities"
      open={open}
      okText="Confirm"
      onCancel={resetAndCancel}
      onOk={() => {
        void form.validateFields().then((values) => {
          onConfirm(values.bt, values.ability, values.actions, values.stateMachine);
          form.resetFields();
        });
      }}
    >
      <Form form={form} layout="vertical">
        <Form.Item name="bt" label="Business Type" rules={[{ required: true }]}>
          <Select
            placeholder="Select Business Type"
            options={availableBusinessTypes.map((item) => ({ label: item, value: item }))}
            onChange={() => form.setFieldsValue({ ability: undefined, actions: undefined, stateMachine: undefined })}
          />
        </Form.Item>
        <Form.Item name="ability" label="Ability" rules={[{ required: true }]}>
          <Select
            disabled={!bt}
            placeholder={availableAbilities.length ? 'Select Ability' : 'No available Ability'}
            options={availableAbilities.map((item) => ({ label: item, value: item }))}
            onChange={() => form.setFieldsValue({ actions: undefined, stateMachine: undefined })}
          />
        </Form.Item>
        <Form.Item name="actions" label="Actions" rules={[{ required: true, type: 'array', min: 1, message: 'Select at least one Action' }]}>
          <Select
            mode="multiple"
            disabled={!ability}
            placeholder={availableActions.length ? 'Select Actions' : 'No available Action'}
            options={availableActions.map((item) => ({ label: item, value: item }))}
          />
        </Form.Item>
        <Form.Item name="stateMachine" label="State Machine" rules={[{ required: true }]}>
          <Select
            disabled={!ability}
            placeholder={stateMachines.length ? 'Select State Machine' : 'No linked State Machine'}
            options={stateMachines.map((item) => ({ label: item, value: item }))}
          />
        </Form.Item>
      </Form>
    </Modal>
  );
}

function ConfigCapabilitiesModal({
  open,
  ability,
  availableActions,
  stateMachineOptions,
  onCancel,
  onSave,
}: {
  open: boolean;
  ability: ConfigAbility;
  availableActions: string[];
  stateMachineOptions: string[];
  onCancel: () => void;
  onSave: (nextActions: string[], nextStateMachine: string) => void;
}) {
  const [form] = Form.useForm();
  const hasFlowGroups = ability.versions.length > 0;

  return (
    <Modal
      title="Config Capabilities"
      open={open}
      okText="Save"
      onCancel={() => {
        form.resetFields();
        onCancel();
      }}
      onOk={() => {
        void form.validateFields().then((values) => {
          onSave(values.actions, values.stateMachine);
        });
      }}
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={{
          bt: ability.bt,
          ability: ability.ability,
          stateMachine: ability.stateMachine,
          actions: ability.actions,
        }}
      >
        <Form.Item name="bt" label="Business Type">
          <Select disabled />
        </Form.Item>
        <Form.Item name="ability" label="Ability">
          <Select disabled />
        </Form.Item>
        <Form.Item
          name="stateMachine"
          label="State Machine"
          rules={[{ required: true }]}
          extra={hasFlowGroups
            ? 'State Machine cannot be changed because this Ability already contains a Flow Group.'
            : 'State Machine can be changed until the first Flow Group is created.'}
        >
          <Select
            disabled={hasFlowGroups}
            options={stateMachineOptions.map((item) => ({ label: item, value: item }))}
          />
        </Form.Item>
        <Form.Item name="actions" label="Actions" rules={[{ required: true, type: 'array', min: 1, message: 'At least one Action is required' }]}>
          <Select
            mode="multiple"
            placeholder="Select Actions"
            options={availableActions.map((item) => ({ label: item, value: item }))}
          />
        </Form.Item>
      </Form>
    </Modal>
  );
}

function RemarkCell({ remark }: { remark?: string }) {
  if (!remark) return <span style={{ color: '#999' }}>-</span>;
  if (remark.length <= 50) return <span>{remark}</span>;
  return <Tooltip title={remark}><span>{remark.slice(0, 50)}...</span></Tooltip>;
}

const statusColors: Record<string, string> = {
  UNDEPLOYED: 'default',
  DAILY: 'blue',
  PRE: 'orange',
  PROD: 'green',
};

function getVersionStatus(records: DeployRecord[], version: string) {
  const versionRecords = records.filter((record) => record.version === version);
  if (versionRecords.some((record) => record.env === 'PROD')) return 'PROD';
  if (versionRecords.some((record) => record.env === 'PRE')) return 'PRE';
  if (versionRecords.some((record) => record.env === 'DAILY')) return 'DAILY';
  return 'UNDEPLOYED';
}

function getGroupVersions(group: FlowGroupVersion) {
  return Array.from(new Set([group.version, ...group.deployRecords.map((record) => record.version)]))
    .sort((a, b) => b.localeCompare(a));
}

export default function ConfigAbilityListPage() {
  const { channelCode = '' } = useParams<{ channelCode: string }>();
  const navigate = useNavigate();
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [showAddCapabilities, setShowAddCapabilities] = useState(false);
  const [previewStateMachine, setPreviewStateMachine] = useState<string | null>(null);
  const [deployStatusGroup, setDeployStatusGroup] = useState<{ ability: ConfigAbility; group: FlowGroupVersion } | null>(null);
  const [deployStatusVersion, setDeployStatusVersion] = useState<string | null>(null);
  const [deployTarget, setDeployTarget] = useState<{
    ability: ConfigAbility;
    group: FlowGroupVersion;
    allowUnsubmittedDrafts: boolean;
  } | null>(null);
  const [selectedCloud, setSelectedCloud] = useState<CloudType | undefined>();
  const [configAbility, setConfigAbility] = useState<ConfigAbility | null>(null);
  const pageSize = 10;

  const abilities = useConfigIntegrationStore(
    (state) => state.abilitiesByChannel[channelCode] ?? []
  );
  const addAbility = useConfigIntegrationStore((state) => state.addAbility);
  const createFlowGroup = useConfigIntegrationStore((state) => state.createFlowGroup);
  const cloneGroup = useConfigIntegrationStore((state) => state.cloneGroup);
  const deleteGroup = useConfigIntegrationStore((state) => state.deleteGroup);
  const deployGroup = useConfigIntegrationStore((state) => state.deployGroup);
  const getDeployPreview = useConfigIntegrationStore((state) => state.getDeployPreview);
  const updateAbilityConfig = useConfigIntegrationStore((state) => state.updateAbilityConfig);

  const paginatedAbilities = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return abilities.slice(start, start + pageSize);
  }, [abilities, currentPage]);

  const toggleExpand = (key: string) => {
    setExpandedRows((previous) => {
      const next = new Set(previous);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const groupConfigPath = (ability: ConfigAbility, group: FlowGroupVersion) =>
    `/channel-integration/${channelCode}/integration/config/flow-groups/${ability.bt}/${ability.ability}/versions/${group.id}`;

  const handleCreateFlowGroup = (ability: ConfigAbility) => {
    const group = createFlowGroup(channelCode, ability.bt, ability.ability);
    if (!group) {
      message.warning('A non-PROD Flow Group already exists. Resolve or delete it before creating another.');
      return;
    }
    message.success('Flow Group created');
    navigate(groupConfigPath(ability, group));
  };

  const handleClone = (ability: ConfigAbility, group: FlowGroupVersion) => {
    const clone = cloneGroup(channelCode, ability.bt, ability.ability, group.groupId);
    if (!clone) {
      message.warning('Only PROD Groups can be cloned, and no non-PROD Group can exist under the same Ability.');
      return;
    }
    message.success(`Group cloned from ${group.groupId}, Version ${group.version}`);
    navigate(groupConfigPath(ability, clone));
  };

  const openDeployModal = (
    ability: ConfigAbility,
    group: FlowGroupVersion,
    allowUnsubmittedDrafts = false
  ) => {
    const draftFlows = group.flows.filter((flow) => flow.status === 'DRAFT');
    if (group.flows.length === 0) {
      message.error('Group has no Flows. Create and submit at least one Flow first.');
      return;
    }
    if (draftFlows.length > 0) {
      message.error(`Submit the following Flow(s) first: ${draftFlows.map((flow) => flow.name).join(', ')}.`);
      return;
    }
    const flowsWithDrafts = group.flows.filter(
      (flow) => flow.status === 'SUBMITTED' && flow.submittedContent != null
    );
    if (flowsWithDrafts.length > 0 && !allowUnsubmittedDrafts) {
      Modal.confirm({
        title: 'Unsubmitted Drafts Detected',
        content: `${flowsWithDrafts.map((flow) => flow.name).join(', ')} contain unpublished drafts. The drafts will not be included. Continue with the last submitted content?`,
        okText: 'Continue Deploying (Publish Last Submitted Content)',
        cancelText: 'Cancel',
        onOk: () => openDeployModal(ability, group, true),
      });
      return;
    }
    setSelectedCloud(undefined);
    setDeployTarget({ ability, group, allowUnsubmittedDrafts });
  };

  const confirmDeploy = () => {
    if (!deployTarget || !selectedCloud) return;
    const result = deployGroup(
      channelCode,
      deployTarget.ability.bt,
      deployTarget.ability.ability,
      deployTarget.group.groupId,
      selectedCloud,
      deployTarget.allowUnsubmittedDrafts
    );
    if (!result.success) {
      message.error(result.error);
      return;
    }
    message.success(`Version ${deployTarget.group.version} deployed to ${selectedCloud} - ${result.targetEnv}`);
    setDeployTarget(null);
    setSelectedCloud(undefined);
  };

  const confirmDeleteGroup = (ability: ConfigAbility, group: FlowGroupVersion) => {
    Modal.confirm({
      title: 'Confirm Delete',
      content: `Delete Flow Group ${group.groupId} (current Version ${group.version})? This removes the Group ID from Flow Configuration. This cannot be undone.`,
      okButtonProps: { danger: true },
      onOk: () => {
        deleteGroup(channelCode, ability.bt, ability.ability, group.groupId);
        message.success('Flow Group deleted');
      },
    });
  };

  const renderStatus = (group: FlowGroupVersion) => {
    const color = statusColors[group.status] || 'default';
    return <Tag color={color}>{group.status}</Tag>;
  };

  const renderGroupOperations = (ability: ConfigAbility, group: FlowGroupVersion) => {
    const items: React.ReactNode[] = [];

    if (group.status === 'UNDEPLOYED' || group.status === 'DAILY' || group.status === 'PRE') {
      items.push(
        <Button key="config" type="link" onClick={() => navigate(groupConfigPath(ability, group))}>
          Config
        </Button>
      );
    }
    if (group.status === 'PROD') {
      items.push(
        <Button key="clone" type="link" onClick={() => handleClone(ability, group)}>
          Clone
        </Button>
      );
      items.push(
        <Button key="detail" type="link" onClick={() => navigate(`${groupConfigPath(ability, group)}?mode=detail`)}>
          Detail
        </Button>
      );
    }
    items.push(
      <Button key="deploy" type="link" onClick={() => openDeployModal(ability, group)}>
        Deploy
      </Button>
    );
    items.push(
      <Button
        key="deployStatus"
        type="link"
        onClick={() => {
          setDeployStatusGroup({ ability, group });
          setDeployStatusVersion(group.version);
        }}
      >
        Deploy Status
      </Button>
    );
    if (group.status !== 'PROD') {
      items.push(
        <Button key="delete" type="link" danger onClick={() => confirmDeleteGroup(ability, group)}>
          Delete
        </Button>
      );
    }
    return <Space wrap>{items}</Space>;
  };

  const expandedRowRender = (ability: ConfigAbility) => (
    <Table<FlowGroupVersion>
      dataSource={ability.versions}
      rowKey="id"
      pagination={false}
      size="small"
      locale={{ emptyText: 'No Flow Group yet. Click "Create Flow Group" to add one.' }}
      columns={[
        {
          title: 'Group ID',
          width: 210,
          render: (_value, group) => (
            <Space size={8} wrap>
              <Text strong>{group.groupId}</Text>
              <Tag color="processing">Version {group.version}</Tag>
            </Space>
          ),
        },
        { title: 'Status', width: 120, render: (_value, group) => renderStatus(group) },
        { title: 'Remark', render: (_value, group) => <RemarkCell remark={group.remark} /> },
        { title: 'Operator', dataIndex: 'operator', width: 110 },
        { title: 'Operation Time', dataIndex: 'operationTime', width: 180 },
        { title: 'Operation', width: 430, render: (_value, group) => renderGroupOperations(ability, group) },
      ]}
    />
  );

  const renderActions = (actions: string[]) => {
    const maxVisible = 3;
    const visible = actions.slice(0, maxVisible);
    const rest = actions.slice(maxVisible);
    return (
      <Space size={4} wrap>
        {visible.map((action) => <Tag key={action}>{action}</Tag>)}
        {rest.length > 0 && (
          <Tooltip title={rest.join(', ')}>
            <Tag>+{rest.length}</Tag>
          </Tooltip>
        )}
      </Space>
    );
  };

  const columns = [
    {
      title: '',
      width: 50,
      render: (_value: unknown, ability: ConfigAbility) => {
        const key = `${ability.bt}-${ability.ability}`;
        return (
          <Button
            type="text"
            icon={expandedRows.has(key) ? <DownOutlined /> : <RightOutlined />}
            onClick={() => toggleExpand(key)}
          />
        );
      },
    },
    { title: 'Business Type', dataIndex: 'bt' },
    { title: 'Ability', dataIndex: 'ability' },
    {
      title: 'Actions',
      dataIndex: 'actions',
      render: (actions: string[]) => renderActions(actions ?? []),
    },
    {
      title: 'State Machine',
      dataIndex: 'stateMachine',
      render: (stateMachine: string) => isNoStateMachine(stateMachine) ? (
        <Tooltip title="Legacy migrated information has no State Machine association">
          <Tag color="default">{stateMachineDisplayName(stateMachine)}</Tag>
        </Tooltip>
      ) : (
        <Button type="link" icon={<EyeOutlined />} onClick={() => setPreviewStateMachine(stateMachine)}>
          {stateMachine}
        </Button>
      ),
    },
    {
      title: 'Operation',
      width: 280,
      render: (_value: unknown, ability: ConfigAbility) => (
        <Space>
          <Button size="small" onClick={() => setConfigAbility(ability)}>
            Config
          </Button>
          <Button type="primary" size="small" onClick={() => handleCreateFlowGroup(ability)}>
            Create Flow Group
          </Button>
        </Space>
      ),
    },
  ];

  const deployPreview = deployTarget && selectedCloud
    ? getDeployPreview(
        channelCode,
        deployTarget.ability.bt,
        deployTarget.ability.ability,
        deployTarget.group.groupId,
        selectedCloud
      )
    : null;

  return (
    <div style={{ padding: 24 }}>
      <Breadcrumb style={{ marginBottom: 16 }} items={[{ title: 'Channel Integration' }, { title: 'Flow Groups' }]} />
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between' }}>
        <div>
          <h2 style={{ margin: 0 }}>Flow Groups</h2>
          <Text type="secondary">Channel: {channelCode}</Text>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setShowAddCapabilities(true)}>
          Add Capabilities
        </Button>
      </div>

      <Table<ConfigAbility>
        dataSource={paginatedAbilities}
        columns={columns}
        rowKey={(ability) => `${ability.bt}-${ability.ability}`}
        pagination={false}
        expandable={{
          expandedRowRender,
          expandedRowKeys: Array.from(expandedRows),
          showExpandColumn: false,
        }}
      />
      {abilities.length > pageSize && (
        <div style={{ marginTop: 16, textAlign: 'right' }}>
          <Pagination
            current={currentPage}
            total={abilities.length}
            pageSize={pageSize}
            onChange={setCurrentPage}
            showSizeChanger={false}
          />
        </div>
      )}

      <AddCapabilitiesModal
        open={showAddCapabilities}
        existingAbilities={abilities}
        availableBusinessTypes={(mockBusinessTypes[channelCode] ?? [])
          .filter((item) => item.mode === 'Config Integration')
          .map((item) => item.bt)}
        onCancel={() => setShowAddCapabilities(false)}
        onConfirm={(bt, ability, actions, stateMachine) => {
          if (abilities.some((item) => item.bt === bt && item.ability === ability)) {
            message.error('This Ability already exists in the current Channel');
            return;
          }
          addAbility(channelCode, { bt, ability, actions, stateMachine, versions: [] });
          setShowAddCapabilities(false);
          setCurrentPage(1);
          message.success('Capabilities added');
        }}
      />

      {configAbility && (
        <ConfigCapabilitiesModal
          open
          ability={configAbility}
          availableActions={capabilityActionOptions[`${configAbility.bt}:${configAbility.ability}`] ?? configAbility.actions}
          stateMachineOptions={linkedStateMachines[`${configAbility.bt}:${configAbility.ability}`] ?? [configAbility.stateMachine]}
          onCancel={() => setConfigAbility(null)}
          onSave={(nextActions, nextStateMachine) => {
            const result = updateAbilityConfig(
              channelCode,
              configAbility.bt,
              configAbility.ability,
              nextActions,
              nextStateMachine
            );
            if (!result.success && result.errors) {
              Modal.error({
                title: 'Cannot save Actions',
                content: (
                  <ul style={{ margin: 0, paddingLeft: 20 }}>
                    {result.errors.map((err, i) => <li key={i}>{err}</li>)}
                  </ul>
                ),
              });
              return;
            }
            setConfigAbility(null);
            message.success('Capabilities updated');
          }}
        />
      )}

      <StateMachinePreviewModal
        open={Boolean(previewStateMachine)}
        stateMachine={previewStateMachine ?? ''}
        onClose={() => setPreviewStateMachine(null)}
      />

      <Modal
        title="Deploy Flow Group"
        open={Boolean(deployTarget)}
        okText="Deploy"
        cancelText="Cancel"
        okButtonProps={{ disabled: !selectedCloud || !deployPreview?.targetEnv }}
        onOk={confirmDeploy}
        onCancel={() => {
          setDeployTarget(null);
          setSelectedCloud(undefined);
        }}
        width={640}
      >
        {deployTarget && (
          <div style={{ padding: '12px 20px 4px' }}>
            <Space size={20} wrap style={{ marginBottom: 28 }}>
              <span><strong>Group ID:</strong> {deployTarget.group.groupId}</span>
              <span><strong>Version:</strong> <Tag color="green">{deployTarget.group.version}</Tag></span>
              <span><strong>Ability:</strong> {deployTarget.ability.bt} / {deployTarget.ability.ability}</span>
            </Space>

            <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', rowGap: 24, alignItems: 'center' }}>
              <Text strong><span style={{ color: '#ff4d4f' }}>* </span>Cloud</Text>
              <Select<CloudType>
                value={selectedCloud}
                placeholder="Select Cloud"
                onChange={setSelectedCloud}
                style={{ width: '100%' }}
                options={(Object.keys(CLOUD_DEPLOY_SEQUENCES) as CloudType[]).map((cloud) => ({
                  label: cloud,
                  value: cloud,
                }))}
              />

              <Text strong>Current Status</Text>
              <Text>{selectedCloud ? deployPreview?.currentStatus ?? '-' : '-'}</Text>

              <Text strong>Deploy to</Text>
              <Select
                disabled
                value={deployPreview?.targetEnv ?? undefined}
                placeholder={selectedCloud && deployPreview?.isComplete ? 'Already deployed to PROD' : '-'}
                style={{ width: '100%' }}
                options={deployPreview?.targetEnv ? [{ label: deployPreview.targetEnv, value: deployPreview.targetEnv }] : []}
              />
            </div>

            {selectedCloud && (
              <Text type="secondary" style={{ display: 'block', marginTop: 20 }}>
                Release sequence: {CLOUD_DEPLOY_SEQUENCES[selectedCloud].join(' → ')}. Environments cannot be skipped.
              </Text>
            )}
          </div>
        )}
      </Modal>

      <Modal
        title="Deploy Status"
        open={Boolean(deployStatusGroup)}
        footer={null}
        width={900}
        onCancel={() => {
          setDeployStatusGroup(null);
          setDeployStatusVersion(null);
        }}
      >
        {deployStatusGroup && (() => {
          const versions = getGroupVersions(deployStatusGroup.group);
          const selectedVersion = deployStatusVersion ?? deployStatusGroup.group.version;
          const selectedRecords = deployStatusGroup.group.deployRecords.filter((record) => record.version === selectedVersion);
          const clouds = (Object.keys(CLOUD_DEPLOY_SEQUENCES) as CloudType[])
            .filter((cloud) => selectedRecords.some((record) => record.cloud === cloud));
          return <>
            <div style={{ padding: '8px 4px 20px' }}>
              <div style={{ marginBottom: 22 }}><strong>Channel:</strong> {channelCode}</div>
              <Space size={28} wrap style={{ marginBottom: 18 }}>
                <span><strong>Group ID:</strong> {deployStatusGroup.group.groupId}</span>
                <span><strong>Business Type:</strong> {deployStatusGroup.ability.bt}</span>
                <span><strong>Ability:</strong> {deployStatusGroup.ability.ability}</span>
              </Space>
              <div style={{ display: 'grid', gridTemplateColumns: '120px minmax(260px, 420px)', gap: 16, alignItems: 'center' }}>
                <Text strong>Version</Text>
                <Select
                  value={selectedVersion}
                  onChange={setDeployStatusVersion}
                  options={versions.map((version) => ({
                    value: version,
                    label: `${version} (${getVersionStatus(deployStatusGroup.group.deployRecords, version)})`,
                  }))}
                />
              </div>
            </div>
            <Table<CloudType>
              rowKey={(cloud) => cloud}
              pagination={false}
              dataSource={clouds}
              locale={{ emptyText: 'No deployment records for this Version' }}
              columns={[
                { title: 'Cloud', width: 180, render: (_v: unknown, cloud: CloudType) => <Text style={{ fontSize: 16 }}>{cloud}</Text> },
                {
                  title: 'Environment',
                  render: (_v: unknown, cloud: CloudType) => (
                    <Space wrap size={14}>
                      {CLOUD_DEPLOY_SEQUENCES[cloud].map((env) => {
                        const rec = selectedRecords.find((r: DeployRecord) => r.cloud === cloud && r.env === env);
                        return rec ? (
                          <Tooltip
                            key={env}
                            title={(
                              <div>
                                <div>Version: {rec.version}</div>
                                <div>Operator: {rec.operator}</div>
                                <div>Operation Time: {rec.operationTime}</div>
                              </div>
                            )}
                          >
                            <Tag color="green" style={{ cursor: 'help', paddingInline: 14, fontSize: 14 }}>{env}</Tag>
                          </Tooltip>
                        ) : (
                          <Tag key={env} style={{ paddingInline: 14, fontSize: 14 }}>{env}</Tag>
                        );
                      })}
                    </Space>
                  ),
                },
              ]}
            />
          </>;
        })()}
      </Modal>
    </div>
  );
}

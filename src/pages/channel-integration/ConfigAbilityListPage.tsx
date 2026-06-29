import { useMemo, useState } from 'react';
import {
  Button,
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
import { abilityOptions, capabilityActionOptions } from '../../mock/data';
import { useConfigIntegrationStore } from './configIntegrationStore';
import type { ConfigAbility, FlowVersion } from './types';

const { Text } = Typography;

const linkedStateMachines: Record<string, string[]> = {
  'COLLECTION:CARD_PAY': ['Default_Refund_StateMachine', 'BankCard_Debit_StateMachine'],
  'COLLECTION:USSD_PAY': ['BankCard_Debit_StateMachine'],
  'COLLECTION:WALLET_PAY': ['Default_Refund_StateMachine'],
  'DISBURSEMENT:BANK_TRF': ['Default_Refund_StateMachine'],
};

function AddCapabilitiesModal({
  open,
  existingAbilities,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  existingAbilities: ConfigAbility[];
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
            options={Object.keys(abilityOptions).map((item) => ({ label: item, value: item }))}
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
  onCancel,
  onSave,
}: {
  open: boolean;
  ability: ConfigAbility;
  availableActions: string[];
  onCancel: () => void;
  onSave: (nextActions: string[]) => void;
}) {
  const [form] = Form.useForm();

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
          onSave(values.actions);
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
        <Form.Item name="stateMachine" label="State Machine">
          <Select disabled />
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

export default function ConfigAbilityListPage() {
  const { channelCode = '' } = useParams<{ channelCode: string }>();
  const navigate = useNavigate();
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [showAddCapabilities, setShowAddCapabilities] = useState(false);
  const [previewStateMachine, setPreviewStateMachine] = useState<string | null>(null);
  const [deployStatus, setDeployStatus] = useState<{ ability: ConfigAbility; version: FlowVersion } | null>(null);
  const [configAbility, setConfigAbility] = useState<ConfigAbility | null>(null);
  const pageSize = 10;

  const abilities = useConfigIntegrationStore(
    (state) => state.abilitiesByChannel[channelCode] ?? []
  );
  const addAbility = useConfigIntegrationStore((state) => state.addAbility);
  const createVersion = useConfigIntegrationStore((state) => state.createVersion);
  const cloneVersion = useConfigIntegrationStore((state) => state.cloneVersion);
  const deleteVersion = useConfigIntegrationStore((state) => state.deleteVersion);
  const deployVersion = useConfigIntegrationStore((state) => state.deployVersion);
  const updateAbilityActions = useConfigIntegrationStore((state) => state.updateAbilityActions);

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

  const versionPath = (ability: ConfigAbility, version: FlowVersion) =>
    `/channel-integration/${channelCode}/integration/config/${ability.bt}/${ability.ability}/versions/${version.id}`;

  const handleNewVersion = (ability: ConfigAbility) => {
    const version = createVersion(channelCode, ability.bt, ability.ability);
    if (!version) {
      message.warning('A Draft Version already exists. Configure, submit, or delete it first.');
      return;
    }
    navigate(versionPath(ability, version));
  };

  const handleClone = (ability: ConfigAbility, version: FlowVersion) => {
    const clone = cloneVersion(channelCode, ability.bt, ability.ability, version.id);
    if (!clone) {
      message.warning('A Draft Version already exists. Resolve it before cloning.');
      return;
    }
    message.success('Version cloned into a new runtime Draft');
    navigate(versionPath(ability, clone));
  };

  const handleDeploy = (ability: ConfigAbility, version: FlowVersion) => {
    const deploy = () => {
      const target = deployVersion(channelCode, ability.bt, ability.ability, version.id);
      if (!target) {
        message.error('Only Submitted or Deployed versions can be deployed');
        return;
      }
      message.success(`Version deployed to BD - ${target}`);
    };
    if (version.hasUnsubmittedDraft) {
      Modal.confirm({
        title: 'Unsubmitted Draft detected',
        content: 'The Draft changes will not be included in this deployment. Continue with the last submitted content?',
        okText: 'Continue Deploying',
        onOk: deploy,
      });
      return;
    }
    deploy();
  };

  const confirmDelete = (ability: ConfigAbility, version: FlowVersion) => {
    Modal.confirm({
      title: 'Confirm Delete',
      content: `Delete ${version.version}?`,
      okButtonProps: { danger: true },
      onOk: () => {
        deleteVersion(channelCode, ability.bt, ability.ability, version.id);
        message.success('Version deleted');
      },
    });
  };

  const renderStatus = (version: FlowVersion) => {
    if (version.publishStatus === 'draft') return <Tag>Draft</Tag>;
    if (version.publishStatus === 'submitted') return <Tag color="orange">Submitted</Tag>;
    return <Tag color="green">Deployed</Tag>;
  };

  const renderOperations = (ability: ConfigAbility, version: FlowVersion) => {
    const hasProd = version.badges.some((badge) => badge.env === 'PROD');
    const openEditor = () => navigate(versionPath(ability, version));
    const openConfig = () => {
      if (version.hasUnsubmittedDraft) {
        Modal.confirm({
          title: 'Unsubmitted Draft detected',
          content: 'Load the saved Draft? Choosing Start Fresh discards the Draft and reloads the last submitted content.',
          okText: 'Load Draft',
          cancelText: 'Start Fresh',
          onOk: openEditor,
          onCancel: openEditor,
        });
        return;
      }
      if (version.publishStatus === 'deployed') {
        Modal.confirm({ title: 'This Version has deployment records', content: 'Submitting changes returns it to Submitted and removes existing deployment records.', okText: 'Continue Editing', onOk: openEditor });
        return;
      }
      openEditor();
    };
    return <Space wrap>
      {version.publishStatus === 'deployed' && hasProd && <Button type="link" onClick={() => handleClone(ability, version)}>Clone</Button>}
      {version.publishStatus === 'deployed' && hasProd && <Button type="link" onClick={() => navigate(`${versionPath(ability, version)}?mode=detail`)}>Detail</Button>}
      {(version.publishStatus === 'draft' || version.publishStatus === 'submitted' || (version.publishStatus === 'deployed' && !hasProd)) && <Button type="link" onClick={openConfig}>Config</Button>}
      {(version.publishStatus === 'submitted' || version.publishStatus === 'deployed') && <Button type="link" onClick={() => handleDeploy(ability, version)}>Deploy</Button>}
      {version.publishStatus === 'deployed' && <Button type="link" onClick={() => setDeployStatus({ ability, version })}>Deploy Status</Button>}
      {(version.publishStatus === 'draft' || version.publishStatus === 'submitted' || (version.publishStatus === 'deployed' && !hasProd)) && <Button type="link" danger onClick={() => confirmDelete(ability, version)}>Delete</Button>}
      <Button type="link" onClick={() => message.info(`Operation log for ${version.version}`)}>Log</Button>
    </Space>;
  };

  const expandedRowRender = (ability: ConfigAbility) => (
    <Table<FlowVersion>
      dataSource={ability.versions}
      rowKey="id"
      pagination={false}
      size="small"
      locale={{ emptyText: 'No Flow Version yet' }}
      columns={[
        { title: 'Version', dataIndex: 'version', width: 110 },
        { title: 'Status', width: 140, render: (_value, version) => renderStatus(version) },
        { title: 'Remark', render: (_value, version) => <RemarkCell remark={version.remark} /> },
        { title: 'Operator', dataIndex: 'operator', width: 110 },
        { title: 'Operation Time', dataIndex: 'operationTime', width: 180 },
        { title: 'Operation', width: 320, render: (_value, version) => renderOperations(ability, version) },
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
      render: (stateMachine: string) => (
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
          <Button type="primary" size="small" onClick={() => handleNewVersion(ability)}>
            New Flow Version
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between' }}>
        <div>
          <h2 style={{ margin: 0 }}>Config Integration</h2>
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
          onCancel={() => setConfigAbility(null)}
          onSave={(nextActions) => {
            const result = updateAbilityActions(channelCode, configAbility.bt, configAbility.ability, nextActions);
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
            message.success('Actions updated');
          }}
        />
      )}

      <Modal
        title={`State Machine: ${previewStateMachine ?? ''}`}
        open={Boolean(previewStateMachine)}
        footer={null}
        onCancel={() => setPreviewStateMachine(null)}
      >
        <div style={{ padding: 32, textAlign: 'center', color: '#666' }}>
          Read-only State Machine preview
        </div>
      </Modal>

      <Modal title="Deploy Status" open={Boolean(deployStatus)} footer={null} width={820} onCancel={() => setDeployStatus(null)}>
        {deployStatus && <>
          <Space size={24} wrap style={{ marginBottom: 20 }}>
            <span><strong>Channel:</strong> {channelCode}</span>
            <span><strong>Version:</strong> <Tag color="green">{deployStatus.version.version}</Tag></span>
            <span><strong>Ability:</strong> {deployStatus.ability.bt} / {deployStatus.ability.ability}</span>
          </Space>
          <Table
            rowKey="cloud"
            pagination={false}
            dataSource={[...new Set(deployStatus.version.badges.map((badge) => badge.cloud))].map((cloud) => ({ cloud }))}
            columns={[
              { title: 'Cloud', dataIndex: 'cloud', width: 220 },
              { title: 'Environment', render: (_value, row) => <Space>{(['DAILY', 'PRE', 'PROD'] as const).map((env) => <Tag key={env} color={deployStatus.version.badges.some((badge) => badge.cloud === row.cloud && badge.env === env) ? 'green' : 'default'}>{env}</Tag>)}</Space> },
            ]}
          />
        </>}
      </Modal>
    </div>
  );
}

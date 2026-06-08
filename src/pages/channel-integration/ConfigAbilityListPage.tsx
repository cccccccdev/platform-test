import { useState, useEffect, useMemo } from 'react';
import { Table, Button, Space, Select, Tag, Tooltip, Typography, message, Modal, Form, Pagination } from 'antd';
import { PlusOutlined, DownOutlined, RightOutlined } from '@ant-design/icons';
import { useParams, useNavigate } from 'react-router-dom';
import type { ConfigAbility, FlowVersion } from './types';

const { Text } = Typography;

// Mock data for Config Abilities with versions
const getMockConfigAbilities = (): ConfigAbility[] => [
  {
    bt: 'COLLECTION',
    ability: 'CARD_PAY',
    versions: [
      {
        id: 'v1',
        version: 'v1.0.0',
        stateMachine: 'Default_Refund_StateMachine',
        publishStatus: 'published',
        badges: [{ cloud: 'BD', env: 'DAILY' }, { cloud: 'ALIYUN', env: 'PROD' }],
        remark: 'Initial version for card payment collection',
        operator: 'admin',
        operationTime: '2026-06-01 10:30:00',
      },
      {
        id: 'v2',
        version: 'v1.1.0',
        stateMachine: 'Default_Refund_StateMachine',
        publishStatus: 'submitted',
        badges: [],
        remark: 'Add timeout handling',
        operator: 'admin',
        operationTime: '2026-06-05 14:20:00',
      },
    ],
  },
  {
    bt: 'COLLECTION',
    ability: 'USSD_PAY',
    versions: [
      {
        id: 'v3',
        version: 'v0.0.1',
        stateMachine: 'BankCard_Debit_StateMachine',
        publishStatus: 'draft',
        badges: [],
        remark: '',
        operator: 'admin',
        operationTime: '2026-06-06 09:00:00',
      },
    ],
  },
  {
    bt: 'DISBURSEMENT',
    ability: 'BANK_TRF',
    versions: [
      {
        id: 'v4',
        version: 'v0.9.0',
        stateMachine: 'Default_Refund_StateMachine',
        publishStatus: 'published',
        badges: [{ cloud: 'ONELOOP', env: 'PROD' }],
        remark: 'Bank transfer disbursement - beta',
        operator: 'admin',
        operationTime: '2026-05-28 16:45:00',
      },
    ],
  },
];

// Add Ability Modal
function AddAbilityModal({
  visible,
  onOk,
  onCancel,
}: {
  visible: boolean;
  onOk: (bt: string, ability: string) => void;
  onCancel: () => void;
}) {
  const [form] = Form.useForm();
  const [selectedBT, setSelectedBT] = useState<string>('');

  const abilityOptions = useMemo(() => {
    const options: Record<string, string[]> = {
      COLLECTION: ['CARD_PAY', 'USSD_PAY', 'WALLET_PAY'],
      DISBURSEMENT: ['BANK_TRF'],
    };
    return options[selectedBT] || [];
  }, [selectedBT]);

  const handleOk = () => {
    form.validateFields().then((values) => {
      onOk(values.bt, values.ability);
      form.resetFields();
      setSelectedBT('');
    });
  };

  return (
    <Modal
      title="Add Ability"
      open={visible}
      onOk={handleOk}
      onCancel={onCancel}
      okText="Confirm"
      cancelText="Cancel"
    >
      <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
        <Form.Item
          name="bt"
          label="Business Type"
          rules={[{ required: true, message: 'Please select Business Type' }]}
        >
          <Select
            placeholder="Select Business Type"
            onChange={(val) => {
              form.setFieldsValue({ ability: undefined });
              setSelectedBT(val);
            }}
          >
            {['COLLECTION', 'DISBURSEMENT'].map((bt) => (
              <Select.Option key={bt} value={bt}>{bt}</Select.Option>
            ))}
          </Select>
        </Form.Item>
        <Form.Item
          name="ability"
          label="Ability"
          rules={[{ required: true, message: 'Please select Ability' }]}
        >
          <Select placeholder="Select Ability">
            {abilityOptions.map((a) => (
              <Select.Option key={a} value={a}>{a}</Select.Option>
            ))}
          </Select>
        </Form.Item>
      </Form>
    </Modal>
  );
}

// New Flow Version Modal (for creating new version)
function NewFlowVersionModal({
  visible,
  stateMachines,
  onOk,
  onCancel,
}: {
  visible: boolean;
  stateMachines: { name: string }[];
  onOk: (smName: string) => void;
  onCancel: () => void;
}) {
  const [selected, setSelected] = useState<string | null>(null);

  const handleOk = () => {
    if (selected) {
      onOk(selected);
      setSelected(null);
    }
  };

  return (
    <Modal
      title="New Flow Version"
      open={visible}
      onOk={handleOk}
      onCancel={onCancel}
      okText="Confirm"
      cancelText="Cancel"
      width={500}
    >
      <div style={{ padding: '16px 0' }}>
        <Text type="secondary" style={{ display: 'block', marginBottom: 12 }}>
          Select a state machine for the new flow version
        </Text>
        <Select
          placeholder="Select StateMachine"
          style={{ width: '100%' }}
          value={selected}
          onChange={setSelected}
          options={stateMachines.map((sm) => ({ label: sm.name, value: sm.name }))}
        />
      </div>
    </Modal>
  );
}

// Edit Warning Modal (for non-Draft versions)
function EditWarningModal({
  visible,
  onOk,
  onCancel,
}: {
  visible: boolean;
  onOk: () => void;
  onCancel: () => void;
}) {
  return (
    <Modal
      title="Warning"
      open={visible}
      onOk={onOk}
      onCancel={onCancel}
      okText="Confirm"
      cancelText="Cancel"
      width={600}
    >
      <div style={{ padding: '8px 0' }}>
        <p style={{ marginBottom: 16 }}>
          You are about to edit a version that has already been submitted or published.
        </p>
        <p style={{ marginBottom: 16 }}>
          After you submit changes, all existing deployment records of this version will be cleared, and this version will return to Draft status.
        </p>
        <p>
          If you do not want to affect the current deployment status, use <strong>Clone</strong> to create a new Draft version and edit the cloned version instead.
        </p>
      </div>
    </Modal>
  );
}

// Remark tooltip wrapper
function RemarkCell({ remark }: { remark?: string }) {
  if (!remark) return <span style={{ color: '#999' }}>-</span>;
  if (remark.length <= 50) return <span>{remark}</span>;
  return (
    <Tooltip title={remark}>
      <span>{remark.substring(0, 50)}...</span>
    </Tooltip>
  );
}

export default function ConfigAbilityListPage() {
  const { channelCode } = useParams<{ channelCode: string }>();
  const navigate = useNavigate();

  // Data state
  const [abilities, setAbilities] = useState<ConfigAbility[]>([]);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  // Modal states
  const [showAddAbilityModal, setShowAddAbilityModal] = useState(false);
  const [showNewFlowVersionModal, setShowNewFlowVersionModal] = useState(false);
  const [showEditWarningModal, setShowEditWarningModal] = useState(false);
  const [targetAbility, setTargetAbility] = useState<ConfigAbility | null>(null);
  const [targetVersion, setTargetVersion] = useState<FlowVersion | null>(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // Mock state machines
  const stateMachines = [
    { name: 'Default_Refund_StateMachine' },
    { name: 'BankCard_Debit_StateMachine' },
  ];

  // Load mock data
  useEffect(() => {
    setAbilities(getMockConfigAbilities());
  }, [channelCode]);

  // Pagination logic
  const paginatedAbilities = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return abilities.slice(start, start + pageSize);
  }, [abilities, currentPage]);

  const totalPages = Math.ceil(abilities.length / pageSize);

  // Toggle row expansion
  const toggleExpand = (key: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(key)) {
      newExpanded.delete(key);
    } else {
      newExpanded.add(key);
    }
    setExpandedRows(newExpanded);
  };

  // Add new Ability
  const handleAddAbility = (bt: string, ability: string) => {
    const newAbility: ConfigAbility = {
      bt,
      ability,
      versions: [],
    };
    setAbilities((prev) => [newAbility, ...prev]);
    message.success('Ability added successfully');
    setShowAddAbilityModal(false);
    setCurrentPage(1);
  };

  // New Flow Version
  const handleNewFlowVersion = (ability: ConfigAbility) => {
    setTargetAbility(ability);
    setShowNewFlowVersionModal(true);
  };

  const handleNewFlowVersionConfirm = (smName: string) => {
    if (targetAbility) {
      const newVersion: FlowVersion = {
        id: `v_${Date.now()}`,
        version: `v0.0.${targetAbility.versions.length + 1}`,
        stateMachine: smName,
        publishStatus: 'draft',
        badges: [],
        remark: '',
        operator: 'admin',
        operationTime: new Date().toLocaleString(),
      };
      setAbilities((prev) =>
        prev.map((a) =>
          a.bt === targetAbility.bt && a.ability === targetAbility.ability
            ? { ...a, versions: [newVersion, ...a.versions] }
            : a
        )
      );
      message.success('New Flow Version created');
      setShowNewFlowVersionModal(false);
      setTargetAbility(null);
      // Navigate to flow config page with state machine
      navigate(`/channel-integration/${channelCode}/integration/config/${targetAbility.bt}/${targetAbility.ability}?sm=${encodeURIComponent(smName)}`);
    }
  };

  // Version operations
  const handleVersionConfig = (version: FlowVersion, ability: ConfigAbility) => {
    if (version.publishStatus === 'draft') {
      navigate(`/channel-integration/${channelCode}/integration/config/${ability.bt}/${ability.ability}`);
    } else {
      setTargetVersion(version);
      setTargetAbility(ability);
      setShowEditWarningModal(true);
    }
  };

  const handleEditWarningConfirm = () => {
    if (targetVersion && targetAbility) {
      setShowEditWarningModal(false);
      navigate(`/channel-integration/${channelCode}/integration/config/${targetAbility.bt}/${targetAbility.ability}`);
    }
  };

  const handleVersionDetail = (version: FlowVersion, ability: ConfigAbility) => {
    navigate(`/channel-integration/${channelCode}/integration/config/${ability.bt}/${ability.ability}/${version.id}`);
  };

  const handleVersionDeploy = (version: FlowVersion, _ability: ConfigAbility) => {
    message.info(`Deploying ${version.version}...`);
  };

  const handleVersionClone = (version: FlowVersion, ability: ConfigAbility) => {
    const clonedVersion: FlowVersion = {
      ...version,
      id: `v_${Date.now()}`,
      version: `v${parseFloat(version.version.replace('v', '')) + 1}`,
      publishStatus: 'draft',
      badges: [],
      operator: 'admin',
      operationTime: new Date().toLocaleString(),
    };
    setAbilities((prev) =>
      prev.map((a) =>
        a.bt === ability.bt && a.ability === ability.ability
          ? { ...a, versions: [clonedVersion, ...a.versions] }
          : a
      )
    );
    message.success('Version cloned successfully');
  };

  const handleVersionDelete = (version: FlowVersion, ability: ConfigAbility) => {
    Modal.confirm({
      title: 'Confirm Delete',
      content: `Are you sure you want to delete version ${version.version}? This cannot be undone.`,
      okText: 'Confirm Delete',
      okButtonProps: { danger: true },
      cancelText: 'Cancel',
      onOk: () => {
        setAbilities((prev) =>
          prev.map((a) =>
            a.bt === ability.bt && a.ability === ability.ability
              ? { ...a, versions: a.versions.filter((v) => v.id !== version.id) }
              : a
          )
        );
        message.success('Version deleted');
      },
    });
  };

  // Render publish status tags
  const renderPublishStatus = (version: FlowVersion) => {
    if (version.publishStatus === 'draft') {
      return <Tag color="default">Draft</Tag>;
    }
    if (version.publishStatus === 'submitted') {
      return <Tag color="orange">Submitted</Tag>;
    }
    // published - show badges
    if (version.badges.length === 0) {
      return <Tag color="default">Draft</Tag>;
    }
    return (
      <Space wrap>
        {version.badges.map((b) => (
          <Tag key={`${b.cloud}-${b.env}`} color="blue">{b.cloud} · {b.env}</Tag>
        ))}
      </Space>
    );
  };

  // Render version operations based on status
  const renderVersionOperations = (version: FlowVersion, ability: ConfigAbility) => {
    const isDraft = version.publishStatus === 'draft';
    const hasProd = version.badges.some((b) => b.env === 'PROD');

    if (isDraft) {
      return (
        <Space>
          <Button type="link" size="small" onClick={() => handleVersionConfig(version, ability)}>Config</Button>
          <Button type="link" size="small" danger onClick={() => handleVersionDelete(version, ability)}>Delete</Button>
        </Space>
      );
    }

    if (hasProd) {
      return (
        <Space>
          <Button type="link" size="small" onClick={() => handleVersionDetail(version, ability)}>Detail</Button>
          <Button type="link" size="small" onClick={() => handleVersionDeploy(version, ability)}>Deploy</Button>
          <Button type="link" size="small" onClick={() => handleVersionClone(version, ability)}>Clone</Button>
        </Space>
      );
    }

    // Submitted or published to DAILY/PRE only
    return (
      <Space>
        <Button type="link" size="small" onClick={() => handleVersionConfig(version, ability)}>Config</Button>
        <Button type="link" size="small" onClick={() => handleVersionDeploy(version, ability)}>Deploy</Button>
        <Button type="link" size="small" danger onClick={() => handleVersionDelete(version, ability)}>Delete</Button>
        <Button type="link" size="small" onClick={() => handleVersionClone(version, ability)}>Clone</Button>
      </Space>
    );
  };

  // Main row expansion renderer
  const expandedRowRender = (ability: ConfigAbility) => {
    if (ability.versions.length === 0) {
      return (
        <div style={{ padding: '16px', textAlign: 'center', color: '#999' }}>
          No flow versions yet. Click "New Flow Version" to create one.
        </div>
      );
    }

    return (
      <Table
        dataSource={ability.versions}
        rowKey="id"
        pagination={false}
        size="small"
        style={{ background: '#fafafa' }}
        columns={[
          {
            title: 'Version',
            dataIndex: 'version',
            key: 'version',
            width: 100,
          },
          {
            title: 'State Machine',
            dataIndex: 'stateMachine',
            key: 'stateMachine',
            width: 200,
          },
          {
            title: 'Publish Status',
            key: 'publishStatus',
            width: 200,
            render: (_: any, record: FlowVersion) => renderPublishStatus(record),
          },
          {
            title: 'Remark',
            key: 'remark',
            render: (_: any, record: FlowVersion) => <RemarkCell remark={record.remark} />,
          },
          {
            title: 'Operator',
            dataIndex: 'operator',
            key: 'operator',
            width: 100,
          },
          {
            title: 'Operation Time',
            dataIndex: 'operationTime',
            key: 'operationTime',
            width: 160,
          },
          {
            title: 'Operation',
            key: 'operation',
            width: 280,
            render: (_: any, record: FlowVersion) => renderVersionOperations(record, ability),
          },
        ]}
      />
    );
  };

  // Main table columns
  const columns = [
    {
      title: '',
      key: 'expand',
      width: 50,
      render: (_: any, record: ConfigAbility) => (
        <Button
          type="text"
          size="small"
          icon={expandedRows.has(`${record.bt}-${record.ability}`) ? <DownOutlined /> : <RightOutlined />}
          onClick={() => toggleExpand(`${record.bt}-${record.ability}`)}
        />
      ),
    },
    {
      title: 'Business Type',
      dataIndex: 'bt',
      key: 'bt',
      render: (bt: string) => <span style={{ fontWeight: 600, fontSize: 14 }}>{bt}</span>,
    },
    {
      title: 'Ability',
      dataIndex: 'ability',
      key: 'ability',
      render: (ability: string) => <span>{ability}</span>,
    },
    {
      title: 'Operation',
      key: 'operation',
      width: 180,
      render: (_: any, record: ConfigAbility) => (
        <Button type="primary" size="small" onClick={() => handleNewFlowVersion(record)}>
          New Flow Version
        </Button>
      ),
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      {/* Page header */}
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ margin: 0 }}>Config Integration</h2>
          <Text type="secondary" style={{ marginTop: 4, display: 'block' }}>Channel: {channelCode}</Text>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setShowAddAbilityModal(true)}>
          Add Ability
        </Button>
      </div>

      {/* Main table with expandable rows */}
      {abilities.length === 0 ? (
        <div style={{ padding: 48, textAlign: 'center', background: '#fff', borderRadius: 8 }}>
          <div style={{ marginBottom: 16, color: '#999' }}>No Ability configured yet</div>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setShowAddAbilityModal(true)}>
            Add Ability
          </Button>
        </div>
      ) : (
        <>
          <Table
            dataSource={paginatedAbilities}
            columns={columns}
            rowKey={(record) => `${record.bt}-${record.ability}`}
            pagination={false}
            expandable={{
              expandedRowRender,
              expandedRowKeys: Array.from(expandedRows),
              showExpandColumn: false,
            }}
          />
          {totalPages > 1 && (
            <div style={{ marginTop: 16, textAlign: 'right' }}>
              <Pagination
                current={currentPage}
                total={abilities.length}
                pageSize={pageSize}
                onChange={setCurrentPage}
                showQuickJumper={false}
              />
            </div>
          )}
        </>
      )}

      {/* Modals */}
      <AddAbilityModal
        visible={showAddAbilityModal}
        onOk={handleAddAbility}
        onCancel={() => setShowAddAbilityModal(false)}
      />

      <NewFlowVersionModal
        visible={showNewFlowVersionModal}
        stateMachines={stateMachines}
        onOk={handleNewFlowVersionConfirm}
        onCancel={() => {
          setShowNewFlowVersionModal(false);
          setTargetAbility(null);
        }}
      />

      <EditWarningModal
        visible={showEditWarningModal}
        onOk={handleEditWarningConfirm}
        onCancel={() => {
          setShowEditWarningModal(false);
          setTargetVersion(null);
          setTargetAbility(null);
        }}
      />
    </div>
  );
}

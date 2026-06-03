import { useState, useEffect } from 'react';
import { Table, Button, Space, Select, Tag, Tooltip, Breadcrumb, message, Modal, Form } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useParams, useNavigate } from 'react-router-dom';
import { mockAbilities, abilityOptions } from '../../mock/data';
import type { Ability } from './types';
import DeployModal from './DeployModal';
import StatusModal from './StatusModal';
import ControlModal from './ControlModal';

export default function ConfigAbilityListPage() {
  const { channelCode } = useParams<{ channelCode: string }>();
  const navigate = useNavigate();
  const [abilities, setAbilities] = useState<Ability[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form] = Form.useForm();
  const [selectedBT, setSelectedBT] = useState<string>('');

  // Deploy/Status/Control modal state
  const [deployTarget, setDeployTarget] = useState<Ability | null>(null);
  const [statusTarget, setStatusTarget] = useState<Ability | null>(null);
  const [controlTarget, setControlTarget] = useState<Ability | null>(null);

  // Initialize mock data
  useEffect(() => {
    setAbilities([...mockAbilities]);
  }, [channelCode]);

  // Get Config Integration BT list
  const configBTs = ['COLLECTION', 'DISBURSEMENT'];

  // Add Ability
  const handleAdd = async () => {
    try {
      const values = await form.validateFields();
      const newAbility: Ability = {
        bt: values.bt,
        ability: values.ability,
        publishStatus: 'draft',
        badges: [],
      };
      setAbilities((prev) => [...prev, newAbility]);
      message.success('Ability added successfully');
      setIsModalOpen(false);
      form.resetFields();
      setSelectedBT('');
    } catch {}
  };

  // Delete Ability
  const handleDelete = (record: Ability) => {
    Modal.confirm({
      title: 'Confirm Delete',
      content: 'Are you sure you want to delete this Ability config? This cannot be undone.',
      okText: 'Confirm Delete',
      okButtonProps: { danger: true },
      cancelText: 'Cancel',
      onOk: () => {
        setAbilities((prev) => prev.filter((a) => !(a.bt === record.bt && a.ability === record.ability)));
        message.success('Ability deleted');
      },
    });
  };

  // Render publish status
  const renderPublishStatus = (record: Ability) => {
    if (record.publishStatus === 'draft') {
      return <Tag color="default">Draft</Tag>;
    }
    if (record.publishStatus === 'pending') {
      return <Tag color="orange">Pending Publish</Tag>;
    }
    // published: render badges
    const visible = record.badges.slice(0, 2);
    const hidden = record.badges.slice(2);
    return (
      <Space wrap>
        {visible.map((b) => (
          <Tag key={`${b.cloud}-${b.env}`} color="blue">{b.cloud} · {b.env}</Tag>
        ))}
        {hidden.length > 0 && (
          <Tooltip title={hidden.map((b) => `${b.cloud} · ${b.env}`).join('、')}>
            <Tag color="blue">+{hidden.length}</Tag>
          </Tooltip>
        )}
      </Space>
    );
  };

  // Render operation column
  const renderActions = (record: Ability) => {
    const isDraft = record.publishStatus === 'draft';
    if (isDraft) {
      return (
        <Space>
          <Button size="small" onClick={() => navigate(`/channel-integration/${channelCode}/integration/config/${record.bt}/${record.ability}`)}>
            Modify
          </Button>
          <Button size="small" danger onClick={() => handleDelete(record)}>
            Delete
          </Button>
        </Space>
      );
    }
    return (
      <Space wrap>
        <Button size="small" onClick={() => navigate(`/channel-integration/${channelCode}/integration/config/${record.bt}/${record.ability}`)}>
          Modify
        </Button>
        <Button size="small">Detail</Button>
        <Button size="small" type="primary" onClick={() => setDeployTarget(record)}>
          Deploy
        </Button>
        <Button size="small" onClick={() => setStatusTarget(record)}>
          Status
        </Button>
        <Button size="small">Log</Button>
        <Button size="small" onClick={() => setControlTarget(record)}>
          Control
        </Button>
      </Space>
    );
  };

  // Table column definition
  const columns = [
    {
      title: 'Business Type',
      dataIndex: 'bt',
      key: 'bt',
      render: (bt: string) => <span style={{ fontWeight: 600 }}>{bt}</span>,
    },
    {
      title: 'Ability',
      dataIndex: 'ability',
      key: 'ability',
    },
    {
      title: 'Publish Status',
      key: 'publishStatus',
      render: (_: any, record: Ability) => renderPublishStatus(record),
    },
    {
      title: 'Operation',
      key: 'action',
      render: (_: any, record: Ability) => renderActions(record),
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      {/* Breadcrumb */}
      <Breadcrumb
        style={{ marginBottom: 16 }}
        items={[
          { title: 'Channel Integration', onClick: () => navigate('/channel-integration') },
          { title: channelCode },
          { title: 'Integration' },
          { title: 'Config Integration' },
        ]}
      />

      {/* Page title and buttons */}
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ margin: 0 }}>Config Integration</h2>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setIsModalOpen(true)}>
          + Add Ability
        </Button>
      </div>

      {/* List */}
      <Table
        dataSource={abilities}
        columns={columns}
        rowKey={(record) => `${record.bt}-${record.ability}`}
        pagination={false}
        locale={{ emptyText: 'No Ability yet, click + Add Ability to create' }}
      />

      {/* Add Ability modal */}
      <Modal
        title="Add Ability"
        open={isModalOpen}
        onOk={handleAdd}
        onCancel={() => {
          setIsModalOpen(false);
          form.resetFields();
          setSelectedBT('');
        }}
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
              {configBTs.map((bt) => (
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
              {(abilityOptions[selectedBT] || []).map((a) => (
                <Select.Option key={a} value={a}>{a}</Select.Option>
              ))}
            </Select>
          </Form.Item>
        </Form>
      </Modal>

      {/* Deploy modal */}
      <DeployModal
        open={!!deployTarget}
        bt={deployTarget?.bt || ''}
        ability={deployTarget?.ability || ''}
        onOk={() => {
          setDeployTarget(null);
          message.success('Deployed successfully');
        }}
        onCancel={() => setDeployTarget(null)}
      />

      {/* Status modal */}
      <StatusModal
        open={!!statusTarget}
        bt={statusTarget?.bt || ''}
        ability={statusTarget?.ability || ''}
        onCancel={() => setStatusTarget(null)}
      />

      {/* Control modal */}
      <ControlModal
        open={!!controlTarget}
        ability={controlTarget?.ability || ''}
        cloud="AWS"
        env="Production"
        onCancel={() => setControlTarget(null)}
      />
    </div>
  );
}
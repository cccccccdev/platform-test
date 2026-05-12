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

  // Deploy/Status/Control 弹窗状态
  const [deployTarget, setDeployTarget] = useState<Ability | null>(null);
  const [statusTarget, setStatusTarget] = useState<Ability | null>(null);
  const [controlTarget, setControlTarget] = useState<Ability | null>(null);

  // 初始化加载 Mock 数据
  useEffect(() => {
    setAbilities([...mockAbilities]);
  }, [channelCode]);

  // 获取 Config Integration 的 BT 列表
  const configBTs = ['COLLECTION', 'DISBURSEMENT'];

  // 新增 Ability
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

  // 删除 Ability
  const handleDelete = (record: Ability) => {
    Modal.confirm({
      title: '确认删除',
      content: '确认删除该 Ability 配置？删除后不可恢复。',
      okText: 'Confirm Delete',
      okButtonProps: { danger: true },
      cancelText: 'Cancel',
      onOk: () => {
        setAbilities((prev) => prev.filter((a) => !(a.bt === record.bt && a.ability === record.ability)));
        message.success('Ability deleted');
      },
    });
  };

  // 渲染发布状态
  const renderPublishStatus = (record: Ability) => {
    if (record.publishStatus === 'draft') {
      return <Tag color="default">草稿</Tag>;
    }
    if (record.publishStatus === 'pending') {
      return <Tag color="orange">待发布</Tag>;
    }
    // published：渲染 badges
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

  // 渲染操作列
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

  // 表格列定义
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
      title: '发布状态',
      key: 'publishStatus',
      render: (_: any, record: Ability) => renderPublishStatus(record),
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: Ability) => renderActions(record),
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      {/* 面包屑 */}
      <Breadcrumb
        style={{ marginBottom: 16 }}
        items={[
          { title: 'Channel Integration', onClick: () => navigate('/channel-integration') },
          { title: channelCode },
          { title: 'Integration' },
          { title: 'Config Integration' },
        ]}
      />

      {/* 页面标题和按钮 */}
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ margin: 0 }}>Config Integration</h2>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setIsModalOpen(true)}>
          + Add Ability
        </Button>
      </div>

      {/* 列表 */}
      <Table
        dataSource={abilities}
        columns={columns}
        rowKey={(record) => `${record.bt}-${record.ability}`}
        pagination={false}
        locale={{ emptyText: '暂无 Ability，点击 + Add Ability 创建' }}
      />

      {/* 新增 Ability 弹窗 */}
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
            rules={[{ required: true, message: '请选择 Business Type' }]}
          >
            <Select
              placeholder="选择 Business Type"
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
            rules={[{ required: true, message: '请选择 Ability' }]}
          >
            <Select placeholder="选择 Ability">
              {(abilityOptions[selectedBT] || []).map((a) => (
                <Select.Option key={a} value={a}>{a}</Select.Option>
              ))}
            </Select>
          </Form.Item>
        </Form>
      </Modal>

      {/* Deploy 弹窗 */}
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

      {/* Status 弹窗 */}
      <StatusModal
        open={!!statusTarget}
        bt={statusTarget?.bt || ''}
        ability={statusTarget?.ability || ''}
        onCancel={() => setStatusTarget(null)}
      />

      {/* Control 弹窗 */}
      <ControlModal
        open={!!controlTarget}
        ability={controlTarget?.ability || ''}
        cloud="AWS"
        env="生产"
        onCancel={() => setControlTarget(null)}
      />
    </div>
  );
}
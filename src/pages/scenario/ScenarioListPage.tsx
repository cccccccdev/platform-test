import { useState } from 'react';
import { Table, Button, Space, Tag, Modal, Form, Select, message, Popconfirm, Input } from 'antd';
import { PlusOutlined, EditOutlined, EyeOutlined, FileTextOutlined, ControlOutlined, SearchOutlined } from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import { useScenarioStore, useChannelStore, useActionStore } from '../../store';
import { BUSINESS_TYPE_LABELS } from '../../domain/scenario/types';
import type { Scenario, BusinessType } from '../../domain/scenario/types';

export default function ScenarioListPage() {
  const { channelId } = useParams<{ channelId: string }>();
  const navigate = useNavigate();
  const { scenarios, addScenario, deleteScenario } = useScenarioStore();
  const { channels } = useChannelStore();
  const { l4Templates } = useActionStore();
  const [searchText, setSearchText] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form] = Form.useForm();

  // Filter scenarios by current channel
  const channel = channels.find(c => c.channelId === channelId);
  const channelScenarios = scenarios.filter(s =>
    s.channels.some(c => c.channelId === channelId)
  );

  const filteredScenarios = channelScenarios.filter(s =>
    s.name.toLowerCase().includes(searchText.toLowerCase()) ||
    s.scenarioId.toLowerCase().includes(searchText.toLowerCase())
  );

  const handleCreateScenario = async () => {
    try {
      const values = await form.validateFields();
      const scenarioId = `SC_${Date.now()}`;
      const newScenario: Scenario = {
        scenarioId,
        name: values.name,
        businessType: values.businessType,
        description: values.description,
        channels: [{ channelId: channelId!, channelName: channel?.name || '', abilities: values.abilities || [], status: 'active' }],
        l4TemplateId: values.l4TemplateId,
        supportedL3Nodes: [],
        status: 'active',
        priority: 1,
      };
      addScenario(newScenario);
      message.success('场景创建成功');
      setIsModalOpen(false);
      form.resetFields();
      // Navigate to scenario edit page
      navigate(`/channel/${channelId}/scenario/${scenarioId}/edit`);
    } catch {}
  };

  const handleDeleteScenario = (scenarioId: string) => {
    deleteScenario(scenarioId);
    message.success('场景删除成功');
  };

  const columns = [
    { title: '场景ID', dataIndex: 'scenarioId', key: 'scenarioId', width: 120 },
    { title: '场景名称', dataIndex: 'name', key: 'name' },
    {
      title: 'L4模板',
      dataIndex: 'l4TemplateId',
      key: 'l4TemplateId',
      render: (templateId: string) => {
        const template = l4Templates.find(t => t.templateId === templateId);
        return template ? <Tag color="green">{template.name}</Tag> : <Tag>{templateId}</Tag>;
      },
    },
    {
      title: '业务类型',
      dataIndex: 'businessType',
      key: 'businessType',
      render: (type: BusinessType) => (
        <Tag color="blue">{BUSINESS_TYPE_LABELS[type] || type}</Tag>
      ),
    },
    {
      title: '渠道/能力',
      key: 'channels',
      render: (_: any, record: Scenario) => (
        <Space wrap>
          {record.channels.map(c => (
            <Tag key={c.channelId}>{c.channelName}: {c.abilities.join(', ')}</Tag>
          ))}
        </Space>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={status === 'active' ? 'green' : 'red'}>
          {status === 'active' ? '活跃' : '停用'}
        </Tag>
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: 280,
      render: (_: any, record: Scenario) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => navigate(`/channel/${channelId}/scenario/${record.scenarioId}/edit`)}
          >
            Modify
          </Button>
          <Button
            type="link"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => navigate(`/channel/${channelId}/scenario/${record.scenarioId}/detail`)}
          >
            Detail
          </Button>
          <Button
            type="link"
            size="small"
            icon={<ControlOutlined />}
            onClick={() => navigate(`/channel/${channelId}/scenario/${record.scenarioId}/control`)}
          >
            Control
          </Button>
          <Button
            type="link"
            size="small"
            icon={<FileTextOutlined />}
            onClick={() => navigate(`/channel/${channelId}/scenario/${record.scenarioId}/log`)}
          >
            Log
          </Button>
          <Popconfirm
            title="确定删除该场景？"
            onConfirm={() => handleDeleteScenario(record.scenarioId)}
            okText="删除"
            cancelText="取消"
            okButtonProps={{ danger: true }}
          >
            <Button type="link" size="small" danger>删除</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Space>
          <Input
            placeholder="搜索场景ID或名称"
            prefix={<SearchOutlined />}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            style={{ width: 250 }}
            allowClear
          />
          <span style={{ color: '#999', fontSize: 13 }}>
            共 {filteredScenarios.length} 个场景
          </span>
        </Space>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setIsModalOpen(true)}>
          新建场景
        </Button>
      </div>

      {/* Scenario Table */}
      <Table
        columns={columns}
        dataSource={filteredScenarios}
        rowKey="scenarioId"
        pagination={{ pageSize: 10 }}
      />

      {/* Create Scenario Modal */}
      <Modal
        title="新建场景"
        open={isModalOpen}
        onOk={handleCreateScenario}
        onCancel={() => {
          setIsModalOpen(false);
          form.resetFields();
        }}
        width={600}
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="name" label="场景名称" rules={[{ required: true, message: '请输入场景名称' }]}>
            <Input placeholder="如: MoMo钱包入金" />
          </Form.Item>
          <Form.Item name="businessType" label="业务类型" rules={[{ required: true, message: '请选择业务类型' }]}>
            <Select placeholder="选择业务类型">
              <Select.Option value="DEPOSIT">入金</Select.Option>
              <Select.Option value="WITHDRAWAL">出金</Select.Option>
              <Select.Option value="REFUND">退款</Select.Option>
              <Select.Option value="TRANSFER">转账</Select.Option>
              <Select.Option value="QUERY">查询</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item name="l4TemplateId" label="L4模板" rules={[{ required: true, message: '请选择L4模板' }]}>
            <Select placeholder="选择L4模板">
              {l4Templates.map(t => (
                <Select.Option key={t.templateId} value={t.templateId}>
                  {t.templateId} - {t.name}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="abilities" label="渠道能力">
            <Select mode="multiple" placeholder="选择支持的能力">
              <Select.Option value="wallet">wallet - 钱包</Select.Option>
              <Select.Option value="card">card - 银行卡</Select.Option>
              <Select.Option value="account">account - 账户</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item name="description" label="描述">
            <Input.TextArea rows={2} placeholder="场景描述" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

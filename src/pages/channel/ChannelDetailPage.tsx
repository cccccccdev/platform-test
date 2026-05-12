import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Table, Button, Space, Tag, Modal, Form, Input, Select, message, Popconfirm } from 'antd';
import { PlusOutlined, EditOutlined, FileTextOutlined, CloudOutlined, HistoryOutlined, ControlOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import { useChannelStore, useScenarioStore, useActionStore } from '../../store';
import type { Scenario } from '../../domain/scenario/types';

const BUSINESS_TYPE_OPTIONS = ['DEPOSIT', 'WITHDRAWAL', 'REFUND', 'TRANSFER', 'QUERY'];
const ABILITY_OPTIONS = ['wallet', 'card'];
const ACTION_OPTIONS = ['pay', 'refund', 'withdraw', 'query'];

export default function ChannelDetailPage() {
  const { channelId } = useParams<{ channelId: string }>();
  const navigate = useNavigate();
  const { channels } = useChannelStore();
  const { scenarios, addScenario, deleteScenario, scenarioVersions } = useScenarioStore();
  const { l4Templates } = useActionStore();
  const channel = channels.find((c) => c.channelId === channelId);

  // Filter scenarios for this channel
  const channelScenarios = scenarios.filter(s => s.channels.some(c => c.channelId === channelId));

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingScenario, setEditingScenario] = useState<Scenario | null>(null);
  const [form] = Form.useForm();

  if (!channel) {
    return (
      <Card>
        <div style={{ textAlign: 'center' }}>
          <p>未找到渠道: {channelId}</p>
          <Button onClick={() => navigate('/channel')}>返回列表</Button>
        </div>
      </Card>
    );
  }

  const handleBack = () => navigate('/channel');

  const handleOpenModal = (scenario?: Scenario) => {
    if (scenario) {
      setEditingScenario(scenario);
      form.setFieldsValue({
        name: scenario.name,
        l4TemplateId: scenario.l4TemplateId,
        businessType: scenario.businessType,
        ability: scenario.channels.find(c => c.channelId === channelId)?.abilities || [],
        action: [],
      });
    } else {
      setEditingScenario(null);
      form.resetFields();
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingScenario(null);
    form.resetFields();
  };

  const handleSaveScenario = async () => {
    try {
      const values = await form.validateFields();
      if (editingScenario) {
        message.success('场景更新成功');
      } else {
        const newScenario: Scenario = {
          scenarioId: `SC_${Date.now()}`,
          name: values.name,
          businessType: values.businessType,
          description: '',
          channels: [{
            channelId: channelId!,
            channelName: channel.name,
            abilities: values.ability || [],
            status: 'active',
          }],
          l4TemplateId: values.l4TemplateId,
          supportedL3Nodes: [],
          status: 'active',
          priority: 1,
        };
        addScenario(newScenario);
        message.success('场景创建成功');
      }
      handleCloseModal();
    } catch {}
  };

  const handleDeleteScenario = (scenarioId: string) => {
    deleteScenario(scenarioId);
    message.success('场景删除成功');
  };

  const getL4TemplateName = (l4TemplateId?: string) => {
    const template = l4Templates.find(t => t.templateId === l4TemplateId);
    return template?.name || l4TemplateId || '-';
  };

  const columns = [
    {
      title: '场景名称',
      dataIndex: 'name',
      key: 'name',
      render: (name: string, record: Scenario) => (
        <div>
          <div style={{ fontWeight: 500 }}>{name}</div>
          <div style={{ fontSize: 11, color: '#999' }}>{record.scenarioId}</div>
        </div>
      ),
    },
    {
      title: 'L4模版',
      key: 'l4Template',
      render: (_: any, record: Scenario) => (
        <Tag color="green">{getL4TemplateName(record.l4TemplateId)}</Tag>
      ),
    },
    {
      title: 'Business Type',
      dataIndex: 'businessType',
      key: 'businessType',
      render: (bt: string) => <Tag color="blue">{bt}</Tag>,
    },
    {
      title: 'Ability/Action',
      key: 'abilities',
      render: (_: any, record: Scenario) => {
        const channelData = record.channels.find(c => c.channelId === channelId);
        return (
          <Space wrap size={4}>
            {channelData?.abilities.map((ab) => (
              <Tag key={ab} color="purple" style={{ fontSize: 11 }}>{ab}</Tag>
            ))}
          </Space>
        );
      },
    },
    {
      title: '版本',
      key: 'version',
      render: (_: any, record: Scenario) => {
        const versions = scenarioVersions[record.scenarioId] || [];
        return <Tag>{versions.length} 个版本</Tag>;
      },
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={status === 'active' ? 'green' : 'default'}>
          {status === 'active' ? '活跃' : '停用'}
        </Tag>
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: 380,
      render: (_: any, record: Scenario) => (
        <Space size={4}>
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
            icon={<FileTextOutlined />}
            onClick={() => navigate(`/channel/${channelId}/scenario/${record.scenarioId}/detail`)}
          >
            Detail
          </Button>
          <Button
            type="link"
            size="small"
            icon={<CloudOutlined />}
            onClick={() => navigate(`/channel/${channelId}/scenario/${record.scenarioId}/deploy`)}
          >
            Deploy Status
          </Button>
          <Button
            type="link"
            size="small"
            icon={<HistoryOutlined />}
            onClick={() => navigate(`/channel/${channelId}/scenario/${record.scenarioId}/log`)}
          >
            Log
          </Button>
          <Button
            type="link"
            size="small"
            icon={<ControlOutlined />}
            onClick={() => navigate(`/channel/${channelId}/scenario/${record.scenarioId}/control`)}
          >
            Control
          </Button>
          <Popconfirm
            title="确定删除该场景？"
            onConfirm={() => handleDeleteScenario(record.scenarioId)}
            okText="删除"
            cancelText="取消"
            okButtonProps={{ danger: true }}
          >
            <Button type="link" size="small" danger>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      {/* Header */}
      <Card size="small" styles={{ body: { padding: '12px 16px' } }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Space size="middle">
            <Button icon={<ArrowLeftOutlined />} onClick={handleBack} size="small" />
            <span style={{ fontWeight: 600, fontSize: 16 }}>{channel.name}</span>
            <Tag>{channelId}</Tag>
          </Space>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => handleOpenModal()}>
            新建场景
          </Button>
        </div>
      </Card>

      {/* Scenario Table */}
      <Card style={{ marginTop: 16 }}>
        <Table
          dataSource={channelScenarios}
          columns={columns}
          rowKey="scenarioId"
          pagination={{ pageSize: 10 }}
        />
      </Card>

      {/* Create/Edit Scenario Modal */}
      <Modal
        title={editingScenario ? '编辑场景' : '新建场景'}
        open={isModalOpen}
        onOk={handleSaveScenario}
        onCancel={handleCloseModal}
        width={500}
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item
            name="name"
            label="场景名称"
            rules={[{ required: true, message: '请输入场景名称' }]}
          >
            <Input placeholder="如: MoMo钱包入金" />
          </Form.Item>

          <Form.Item
            name="l4TemplateId"
            label="L4模版"
            rules={[{ required: true, message: '请选择L4模版' }]}
          >
            <Select placeholder="选择L4模版">
              {l4Templates.map((t) => (
                <Select.Option key={t.templateId} value={t.templateId}>
                  {t.name} - {t.description}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="businessType"
            label="Business Type"
            rules={[{ required: true, message: '请选择Business Type' }]}
          >
            <Select placeholder="选择Business Type">
              {BUSINESS_TYPE_OPTIONS.map((t) => (
                <Select.Option key={t} value={t}>{t}</Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="ability"
            label="Ability (多选)"
            rules={[{ required: true, message: '请选择Ability' }]}
          >
            <Select mode="multiple" placeholder="选择Ability">
              {ABILITY_OPTIONS.map((a) => (
                <Select.Option key={a} value={a}>{a}</Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="action"
            label="Action (多选)"
          >
            <Select mode="multiple" placeholder="选择Action">
              {ACTION_OPTIONS.map((a) => (
                <Select.Option key={a} value={a}>{a}</Select.Option>
              ))}
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

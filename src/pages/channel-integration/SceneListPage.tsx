import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Table, Button, Space, Tag, Modal, Form, Select, Input, message, Breadcrumb } from 'antd';
import { PlusOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import { useScenarioStore, useChannelStore, useActionStore } from '../../store';
import type { Scenario } from '../../domain/scenario/types';
import DeployStatusModal from './components/DeployStatusModal';
import LogModal from './components/LogModal';
import ControlModal from './components/ControlModal';
import InstanceSelectionModal from './components/InstanceSelectionModal';

const BUSINESS_TYPE_OPTIONS = ['DEPOSIT', 'WITHDRAWAL', 'REFUND', 'TRANSFER', 'QUERY'];
const ABILITY_OPTIONS = ['wallet', 'card'];
const ACTION_OPTIONS = ['pay', 'refund', 'withdraw', 'query'];

export default function SceneListPage() {
  const { channelCode } = useParams<{ channelCode: string }>();
  const navigate = useNavigate();
  const { channels } = useChannelStore();
  const { scenarios, addScenario, scenarioVersions } = useScenarioStore();
  const { l4Templates } = useActionStore();
  const channel = channels.find((c) => c.channelId === channelCode);

  // Filter scenarios for this channel
  const channelScenarios = scenarios.filter(s => s.channels.some(c => c.channelId === channelCode));

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingScenario, setEditingScenario] = useState<Scenario | null>(null);
  const [form] = Form.useForm();

  // Deploy Status Modal
  const [isDeployModalOpen, setIsDeployModalOpen] = useState(false);
  const [deployScenario, setDeployScenario] = useState<Scenario | null>(null);

  // Log Modal
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [logScenario, setLogScenario] = useState<Scenario | null>(null);

  // Control Modal
  const [isControlModalOpen, setIsControlModalOpen] = useState(false);
  const [controlScenario, setControlScenario] = useState<Scenario | null>(null);

  // Instance Selection Modal
  const [isInstanceModalOpen, setIsInstanceModalOpen] = useState(false);
  const [detailScenario, setDetailScenario] = useState<Scenario | null>(null);

  if (!channel) {
    return (
      <Card>
        <div style={{ textAlign: 'center' }}>
          <p>未找到渠道: {channelCode}</p>
          <Button onClick={() => navigate('/channel-integration')}>返回列表</Button>
        </div>
      </Card>
    );
  }

  const handleBack = () => navigate('/channel-integration');

  const handleOpenModal = (scenario?: Scenario) => {
    if (scenario) {
      setEditingScenario(scenario);
      form.setFieldsValue({
        name: scenario.name,
        l4TemplateId: scenario.l4TemplateId,
        businessType: scenario.businessType,
        ability: scenario.channels.find(c => c.channelId === channelCode)?.abilities || [],
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
            channelId: channelCode!,
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

  const getL4TemplateName = (l4TemplateId?: string) => {
    const template = l4Templates.find(t => t.templateId === l4TemplateId);
    return template?.name || l4TemplateId || '-';
  };

  const getStatusBadge = (scenarioId: string) => {
    const versions = scenarioVersions[scenarioId] || [];
    if (versions.length === 0) return <Tag color="default">[Temporary]</Tag>;
    const latestVersion = versions[versions.length - 1];
    const status = latestVersion.status;
    const colorMap: Record<string, string> = {
      Temporary: 'orange',
      Published: 'green',
    };
    return <Tag color={colorMap[status] || 'default'}>[{status}]</Tag>;
  };

  const columns = [
    {
      title: 'Scene Name',
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
      title: 'L4 Template',
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
      title: 'Ability',
      key: 'abilities',
      render: (_: any, record: Scenario) => {
        const channelData = record.channels.find(c => c.channelId === channelCode);
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
      title: 'Action',
      key: 'action',
      render: (_: any, record: Scenario) => {
        const channelData = record.channels.find(c => c.channelId === channelCode);
        const actions = (channelData as any)?.actions || [];
        return (
          <Space wrap size={4}>
            {actions.map((ac: string) => (
              <Tag key={ac} style={{ fontSize: 11 }}>{ac}</Tag>
            ))}
          </Space>
        );
      },
    },
    {
      title: 'Status',
      key: 'status',
      render: (_: any, record: Scenario) => getStatusBadge(record.scenarioId),
    },
    {
      title: '操作',
      key: 'action',
      width: 400,
      render: (_: any, record: Scenario) => (
        <Space size={4}>
          <Button
            type="link"
            size="small"
            onClick={() => navigate(`/channel-integration/${channelCode}/scenes/${record.scenarioId}/modify`)}
          >
            Modify
          </Button>
          <Button
            type="link"
            size="small"
            onClick={() => {
              setDetailScenario(record);
              setIsInstanceModalOpen(true);
            }}
          >
            Detail
          </Button>
          <Button
            type="link"
            size="small"
            onClick={() => {
              setDeployScenario(record);
              setIsDeployModalOpen(true);
            }}
          >
            Deploy Status
          </Button>
          <Button
            type="link"
            size="small"
            onClick={() => {
              setLogScenario(record);
              setIsLogModalOpen(true);
            }}
          >
            Log
          </Button>
          <Button
            type="link"
            size="small"
            onClick={() => {
              setControlScenario(record);
              setIsControlModalOpen(true);
            }}
          >
            Control
          </Button>
          <Button
            type="link"
            size="small"
            onClick={() => navigate(`/channel-integration/${channelCode}/scenes/${record.scenarioId}/api-debug`)}
          >
            API Debug
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      {/* 面包屑 */}
      <Breadcrumb
        style={{ marginBottom: 16 }}
        items={[
          { title: '接入平台 2.0' },
          { title: 'Channel Integration' },
          { title: channelCode },
        ]}
      />

      {/* Header */}
      <Card size="small" styles={{ body: { padding: '12px 16px' } }} style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Space size="middle">
            <Button icon={<ArrowLeftOutlined />} onClick={handleBack} size="small" />
            <span style={{ fontWeight: 600, fontSize: 16 }}>{channel.name}</span>
            <Tag>{channelCode}</Tag>
          </Space>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => handleOpenModal()}>
            New Scene
          </Button>
        </div>
      </Card>

      {/* Scenario Table */}
      <Card>
        <Table
          dataSource={channelScenarios}
          columns={columns}
          rowKey="scenarioId"
          pagination={{ pageSize: 10 }}
        />
      </Card>

      {/* Create/Edit Scenario Modal */}
      <Modal
        title={editingScenario ? 'Edit Scene' : 'New Scene'}
        open={isModalOpen}
        onOk={handleSaveScenario}
        onCancel={handleCloseModal}
        width={500}
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item
            name="name"
            label="Scene Name"
            rules={[{ required: true, message: '请输入Scene Name' }]}
          >
            <Input placeholder="如: MoMo钱包入金" />
          </Form.Item>

          <Form.Item
            name="l4TemplateId"
            label="L4 Template"
            rules={[{ required: true, message: '请选择L4 Template' }]}
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

      {/* Deploy Status Modal */}
      {deployScenario && (
        <DeployStatusModal
          visible={isDeployModalOpen}
          scenarioId={deployScenario.scenarioId}
          scenarioName={deployScenario.name}
          versions={scenarioVersions[deployScenario.scenarioId] || []}
          onClose={() => {
            setIsDeployModalOpen(false);
            setDeployScenario(null);
          }}
        />
      )}

      {/* Log Modal */}
      {logScenario && (
        <LogModal
          visible={isLogModalOpen}
          scenarioName={logScenario.name}
          onClose={() => {
            setIsLogModalOpen(false);
            setLogScenario(null);
          }}
        />
      )}

      {/* Control Modal */}
      {controlScenario && (
        <ControlModal
          visible={isControlModalOpen}
          scenarioName={controlScenario.name}
          onClose={() => {
            setIsControlModalOpen(false);
            setControlScenario(null);
          }}
        />
      )}

      {/* Instance Selection Modal for Detail */}
      {detailScenario && (
        <InstanceSelectionModal
          visible={isInstanceModalOpen}
          scenarioName={detailScenario.name}
          versions={scenarioVersions[detailScenario.scenarioId] || []}
          onCancel={() => {
            setIsInstanceModalOpen(false);
            setDetailScenario(null);
          }}
          onConfirm={(version) => {
            setIsInstanceModalOpen(false);
            setDetailScenario(null);
            // Navigate to detail page with version info
            navigate(`/channel-integration/${channelCode}/scenes/${detailScenario.scenarioId}/detail/${version.versionNo}`, {
              state: { selectedVersion: version },
            });
          }}
        />
      )}
    </div>
  );
}

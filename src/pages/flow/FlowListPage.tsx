import { useState } from 'react';
import { Button, Input, Space, Tag, Modal, Form, Select, message, Card, Row, Col, Popconfirm, Badge } from 'antd';
import { PlusOutlined, SearchOutlined, EditOutlined, DeleteOutlined, PlayCircleOutlined, ForkOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useFlowStore } from '../../store';
import type { FlowEntity } from '../../domain/flow/types';

const L4_TEMPLATES = [
  { id: 'L4-T01', name: 'Inbound Deposit', desc: '入金' },
  { id: 'L4-T02', name: 'Outbound Transfer', desc: '出金' },
  { id: 'L4-T03', name: 'Card Debit', desc: '银行卡扣款' },
  { id: 'L4-T04', name: 'Wallet Payment', desc: '钱包支付' },
  { id: 'L4-T05', name: 'Refund', desc: '退款' },
  { id: 'L4-T06', name: 'General Query', desc: '通用查询' },
];

const STATUS_COLORS: Record<string, string> = {
  Draft: 'default',
  Daily: 'blue',
  Pre: 'orange',
  Prod: 'green',
};

const BUSINESS_TYPE_LABELS: Record<string, string> = {
  DEPOSIT: '入金',
  WITHDRAWAL: '出金',
  REFUND: '退款',
  TRANSFER: '转账',
  QUERY: '查询',
};

export default function FlowListPage() {
  const { flows, addFlow, deleteFlow } = useFlowStore();
  const navigate = useNavigate();
  const [searchText, setSearchText] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form] = Form.useForm();

  const filteredFlows = flows.filter(
    (f) =>
      f.flowId.toLowerCase().includes(searchText.toLowerCase()) ||
      f.name.toLowerCase().includes(searchText.toLowerCase())
  );

  const getVersionStatus = (flow: FlowEntity) => {
    const versions = Object.keys(flow.versions);
    if (versions.includes('Prod')) return 'Prod';
    if (versions.includes('Pre')) return 'Pre';
    if (versions.includes('Daily')) return 'Daily';
    return 'Draft';
  };

  const getNodeCount = (flow: FlowEntity) => {
    return flow.versions.Draft?.flowGraph?.nodes?.length || 0;
  };

  const getEdgeCount = (flow: FlowEntity) => {
    return flow.versions.Draft?.flowGraph?.edges?.length || 0;
  };

  const handleCreateFlow = async () => {
    try {
      const values = await form.validateFields();
      const flowId = `F_${Date.now()}`;
      const newFlow: FlowEntity = {
        flowId,
        name: values.name,
        l4TemplateId: values.l4TemplateId,
        businessType: values.businessType,
        ability: values.ability,
        action: values.action,
        versions: {
          Draft: {
            env: 'Draft',
            versionNo: 1,
            flowGraph: {
              flowId,
              name: values.name,
              l4TemplateId: values.l4TemplateId,
              nodes: [],
              edges: [],
            },
          },
        },
      };
      addFlow(newFlow);
      message.success('Flow创建成功');
      setIsModalOpen(false);
      form.resetFields();
      navigate(`/flow/editor/${flowId}`);
    } catch {}
  };

  const handleDeleteFlow = (flowId: string) => {
    deleteFlow(flowId);
    message.success('Flow删除成功');
  };

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Space>
          <Input
            placeholder="搜索Flow ID或名称"
            prefix={<SearchOutlined />}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            style={{ width: 250 }}
            allowClear
          />
          <span style={{ color: '#999', fontSize: 13 }}>
            共 {filteredFlows.length} 个Flow
          </span>
        </Space>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setIsModalOpen(true)}>
          创建Flow
        </Button>
      </div>

      {/* Flow Cards */}
      <Row gutter={[16, 16]}>
        {filteredFlows.map((flow) => (
          <Col key={flow.flowId} xs={24} sm={12} lg={8} xl={6}>
            <Card
              hoverable
              style={{
                borderTop: `3px solid ${STATUS_COLORS[getVersionStatus(flow)] === 'green' ? '#52c41a' : STATUS_COLORS[getVersionStatus(flow)] === 'orange' ? '#fa8c16' : STATUS_COLORS[getVersionStatus(flow)] === 'blue' ? '#1890ff' : '#d9d9d9'}`,
              }}
              actions={[
                <Button
                  type="text"
                  size="small"
                  icon={<EditOutlined />}
                  onClick={() => navigate(`/flow/editor/${flow.flowId}`)}
                >
                  编辑
                </Button>,
                <Button
                  type="text"
                  size="small"
                  icon={<PlayCircleOutlined />}
                  onClick={() => message.info('调试功能')}
                >
                  调试
                </Button>,
                <Popconfirm
                  key="delete"
                  title="确定删除该Flow？"
                  description="删除后不可恢复"
                  onConfirm={() => handleDeleteFlow(flow.flowId)}
                  okText="删除"
                  cancelText="取消"
                  okButtonProps={{ danger: true }}
                >
                  <Button type="text" size="small" danger icon={<DeleteOutlined />}>
                    删除
                  </Button>
                </Popconfirm>,
              ]}
            >
              <Card.Meta
                avatar={
                  <div
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: 8,
                      background: '#f0f5ff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 20,
                    }}
                  >
                    <ForkOutlined style={{ color: '#1890ff' }} />
                  </div>
                }
                title={
                  <Space>
                    <span>{flow.name}</span>
                    <Badge
                      status={getVersionStatus(flow) === 'Prod' ? 'success' : getVersionStatus(flow) === 'Pre' ? 'warning' : getVersionStatus(flow) === 'Daily' ? 'processing' : 'default'}
                      text={
                        <Tag color={STATUS_COLORS[getVersionStatus(flow)]}>
                          {getVersionStatus(flow)}
                        </Tag>
                      }
                    />
                  </Space>
                }
                description={
                  <div style={{ fontSize: 12, color: '#666' }}>
                    <div style={{ marginBottom: 4 }}>ID: {flow.flowId}</div>
                    <div style={{ marginBottom: 4 }}>
                      模板: <Tag color="blue">{flow.l4TemplateId || '无'}</Tag>
                    </div>
                    <div style={{ marginBottom: 4 }}>
                      业务类型:{' '}
                      <Tag>{flow.businessType ? (BUSINESS_TYPE_LABELS[flow.businessType] || flow.businessType) : '未设置'}</Tag>
                    </div>
                    <div style={{ display: 'flex', gap: 16, marginTop: 8 }}>
                      <span>
                        节点: <strong>{getNodeCount(flow)}</strong>
                      </span>
                      <span>
                        连线: <strong>{getEdgeCount(flow)}</strong>
                      </span>
                      <span>
                        版本: <strong>v{flow.versions.Draft?.versionNo || 1}</strong>
                      </span>
                    </div>
                  </div>
                }
              />
            </Card>
          </Col>
        ))}
      </Row>

      {/* Empty State */}
      {filteredFlows.length === 0 && (
        <Card style={{ textAlign: 'center', padding: 40 }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🔀</div>
          <div style={{ fontSize: 16, color: '#666', marginBottom: 8 }}>暂无Flow</div>
          <div style={{ fontSize: 13, color: '#999', marginBottom: 16 }}>点击创建按钮添加第一个Flow</div>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setIsModalOpen(true)}>
            创建Flow
          </Button>
        </Card>
      )}

      {/* Create Flow Modal */}
      <Modal
        title="创建Flow"
        open={isModalOpen}
        onOk={handleCreateFlow}
        onCancel={() => {
          setIsModalOpen(false);
          form.resetFields();
        }}
        width={600}
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="name" label="Flow名称" rules={[{ required: true, message: '请输入Flow名称' }]}>
            <Input placeholder="如: MoMo入金Flow" />
          </Form.Item>
          <Form.Item name="l4TemplateId" label="L4模板" rules={[{ required: true, message: '请选择流程模板' }]}>
            <Select placeholder="选择流程模板">
              {L4_TEMPLATES.map((t) => (
                <Select.Option key={t.id} value={t.id}>
                  {t.id} - {t.name} ({t.desc})
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="businessType" label="业务类型">
            <Select placeholder="选择业务类型" allowClear>
              <Select.Option value="DEPOSIT">入金</Select.Option>
              <Select.Option value="WITHDRAWAL">出金</Select.Option>
              <Select.Option value="REFUND">退款</Select.Option>
              <Select.Option value="TRANSFER">转账</Select.Option>
              <Select.Option value="QUERY">查询</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item name="ability" label="能力">
            <Input placeholder="如: card, wallet" />
          </Form.Item>
          <Form.Item name="action" label="动作">
            <Input placeholder="如: pay, refund" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

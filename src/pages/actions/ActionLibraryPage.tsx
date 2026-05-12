import { useState } from 'react';
import { Card, Tabs, Table, Tag, Space, Collapse, Input, Row, Col, Statistic, Button, Modal, Form, Select, message, Typography } from 'antd';
import { ApiOutlined, AppstoreOutlined, BuildOutlined, SearchOutlined, QuestionCircleOutlined, PlusOutlined, EditOutlined } from '@ant-design/icons';
import { useActionStore } from '../../store';
import type { L3Composite, L4Template } from '../../domain/context/types';

const { Text } = Typography;

const CATEGORY_COLORS: Record<string, string> = {
  '请求构建': 'blue',
  '网络请求': 'cyan',
  '数据操作': 'green',
  '流程控制': 'orange',
  '定时任务': 'purple',
  '原子操作': 'gold',
  '响应处理': 'magenta',
};

export default function ActionLibraryPage() {
  const { l2Atomics, l3Composites, l4Templates } = useActionStore();
  const [activeTab, setActiveTab] = useState('l2');
  const [searchText, setSearchText] = useState('');

  // Modal states
  const [isL3ModalOpen, setIsL3ModalOpen] = useState(false);
  const [isL4ModalOpen, setIsL4ModalOpen] = useState(false);
  const [editingL3, setEditingL3] = useState<L3Composite | null>(null);
  const [editingL4, setEditingL4] = useState<L4Template | null>(null);
  const [form] = Form.useForm();

  // Filter data based on search
  const filterData = <T extends { code?: string; name?: string; function?: string }>(data: T[]): T[] => {
    if (!searchText) return data;
    const lower = searchText.toLowerCase();
    return data.filter(
      (item) =>
        item.code?.toLowerCase().includes(lower) ||
        item.name?.toLowerCase().includes(lower) ||
        item.function?.toLowerCase().includes(lower)
    );
  };

  // Filter L4 templates based on search
  const filterL4Templates = (data: L4Template[]): L4Template[] => {
    if (!searchText) return data;
    const lower = searchText.toLowerCase();
    return data.filter(
      (item) =>
        item.templateId?.toLowerCase().includes(lower) ||
        item.name?.toLowerCase().includes(lower) ||
        item.description?.toLowerCase().includes(lower)
    );
  };

  // L3 Create/Edit
  const handleCreateL3 = () => {
    setEditingL3(null);
    form.resetFields();
    setIsL3ModalOpen(true);
  };

  const handleEditL3 = (record: L3Composite) => {
    setEditingL3(record);
    form.setFieldsValue(record);
    setIsL3ModalOpen(true);
  };

  const handleSaveL3 = async () => {
    try {
      await form.validateFields();
      message.success(editingL3 ? 'L3组件已更新' : 'L3组件已创建');
      setIsL3ModalOpen(false);
    } catch {}
  };

  // L4 Create/Edit
  const handleCreateL4 = () => {
    setEditingL4(null);
    form.resetFields();
    setIsL4ModalOpen(true);
  };

  const handleEditL4 = (record: L4Template) => {
    setEditingL4(record);
    form.setFieldsValue(record);
    setIsL4ModalOpen(true);
  };

  const handleSaveL4 = async () => {
    try {
      await form.validateFields();
      message.success(editingL4 ? 'L4模板已更新' : 'L4模板已创建');
      setIsL4ModalOpen(false);
    } catch {}
  };

  const l2Columns = [
    { title: '编号', dataIndex: 'code', key: 'code', width: 140, render: (code: string) => <code style={{ fontSize: 11 }}>{code}</code> },
    { title: '名称', dataIndex: 'name', key: 'name', width: 120 },
    {
      title: '类别',
      dataIndex: 'category',
      key: 'category',
      width: 100,
      render: (cat: string) => <Tag color={CATEGORY_COLORS[cat] || 'default'}>{cat}</Tag>,
    },
    { title: '功能', dataIndex: 'function', key: 'function', ellipsis: true },
    {
      title: '输入',
      dataIndex: 'input',
      key: 'input',
      width: 180,
      render: (arr: string[]) => (
        <Space wrap size={[2, 2]}>
          {arr?.map((item) => (
            <Tag key={item} style={{ fontSize: 10 }}>
              {item}
            </Tag>
          ))}
        </Space>
      ),
    },
    { title: '输出', dataIndex: 'output', key: 'output', width: 100 },
  ];

  const l3Columns = [
    { title: '编号', dataIndex: 'code', key: 'code', width: 140, render: (code: string) => <code style={{ fontSize: 11 }}>{code}</code> },
    { title: '名称', dataIndex: 'name', key: 'name', width: 120 },
    { title: '功能', dataIndex: 'function', key: 'function', ellipsis: true },
    { title: '描述', dataIndex: 'description', key: 'description', ellipsis: true },
    {
      title: '状态机',
      key: 'states',
      render: (_: any, record: L3Composite) => (
        <Space wrap size={[2, 2]}>
          <Tag color="blue" style={{ fontSize: 10 }}>
            初始: {record.initialState}
          </Tag>
          {record.states.map((state) => (
            <Tag key={state} color={state === record.initialState ? 'green' : 'default'} style={{ fontSize: 10 }}>
              {state}
            </Tag>
          ))}
        </Space>
      ),
    },
    {
      title: 'L4映射',
      key: 'l4StateMapping',
      render: (_: any, record: L3Composite) => (
        <Space wrap size={[2, 2]}>
          {record.l4StateMapping.map((mapping) => (
            <Tag key={mapping.l3State} color="purple" style={{ fontSize: 10 }}>
              {mapping.l3State} → {mapping.l4State}
            </Tag>
          ))}
        </Space>
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: 100,
      render: (_: any, record: L3Composite) => (
        <Button type="link" size="small" icon={<EditOutlined />} onClick={() => handleEditL3(record)}>
          编辑
        </Button>
      ),
    },
  ];

  const l4Columns = [
    { title: '模板ID', dataIndex: 'templateId', key: 'templateId', width: 100, render: (id: string) => <Tag color="green">{id}</Tag> },
    { title: '名称', dataIndex: 'name', key: 'name', width: 160 },
    { title: '描述', dataIndex: 'description', key: 'description', ellipsis: true },
    {
      title: '状态',
      dataIndex: 'states',
      key: 'states',
      render: (states: string[]) => (
        <Space size={[2, 2]}>
          {states?.map((s) => (
            <Tag key={s} style={{ fontSize: 10 }}>
              {s}
            </Tag>
          ))}
        </Space>
      ),
    },
    {
      title: '初始状态',
      dataIndex: 'initialState',
      key: 'initialState',
      width: 80,
      render: (s: string) => <Tag color="blue">{s}</Tag>,
    },
    {
      title: '操作',
      key: 'action',
      width: 100,
      render: (_: any, record: L4Template) => (
        <Button type="link" size="small" icon={<EditOutlined />} onClick={() => handleEditL4(record)}>
          编辑
        </Button>
      ),
    },
  ];

  const tabItems = [
    {
      key: 'l2',
      label: (
        <span>
          <ApiOutlined />
          L2 原子节点 ({l2Atomics.length})
        </span>
      ),
      children: (
        <Card>
          <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 16 }}>
            <Input
              placeholder="搜索编号、名称、功能..."
              prefix={<SearchOutlined />}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              style={{ width: 250 }}
              allowClear
            />
            <span style={{ color: '#999', fontSize: 13 }}>
              共 {filterData(l2Atomics).length} 个原子节点
            </span>
          </div>
          <Table
            dataSource={filterData(l2Atomics)}
            columns={l2Columns}
            rowKey="code"
            pagination={{ pageSize: 10 }}
            size="small"
          />
        </Card>
      ),
    },
    {
      key: 'l3',
      label: (
        <span>
          <BuildOutlined />
          L3 组合节点 ({l3Composites.length})
        </span>
      ),
      children: (
        <Card
          extra={
            <Button type="primary" icon={<PlusOutlined />} onClick={handleCreateL3}>
              创建L3组件
            </Button>
          }
        >
          <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 16 }}>
            <Input
              placeholder="搜索编号、名称、功能..."
              prefix={<SearchOutlined />}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              style={{ width: 250 }}
              allowClear
            />
            <span style={{ color: '#999', fontSize: 13 }}>
              共 {filterData(l3Composites).length} 个组合节点
            </span>
          </div>
          <Table
            dataSource={filterData(l3Composites)}
            columns={l3Columns}
            rowKey="code"
            pagination={{ pageSize: 10 }}
            size="small"
          />
        </Card>
      ),
    },
    {
      key: 'l4',
      label: (
        <span>
          <AppstoreOutlined />
          L4 流程模板 ({l4Templates.length})
        </span>
      ),
      children: (
        <Card
          extra={
            <Button type="primary" icon={<PlusOutlined />} onClick={handleCreateL4}>
              创建L4模板
            </Button>
          }
        >
          <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 16 }}>
            <Input
              placeholder="搜索模板ID、名称..."
              prefix={<SearchOutlined />}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              style={{ width: 250 }}
              allowClear
            />
            <span style={{ color: '#999', fontSize: 13 }}>
              共 {filterL4Templates(l4Templates).length} 个流程模板
            </span>
          </div>
          <Table
            dataSource={filterL4Templates(l4Templates)}
            columns={l4Columns}
            rowKey="templateId"
            pagination={{ pageSize: 10 }}
            size="small"
          />
        </Card>
      ),
    },
  ];

  return (
    <div>
      {/* Header with statistics */}
      <Card style={{ marginBottom: 16 }}>
        <Row gutter={24}>
          <Col span={8}>
            <Statistic
              title={<span><ApiOutlined style={{ color: '#1890ff' }} /> L2 原子节点</span>}
              value={l2Atomics.length}
              valueStyle={{ color: '#1890ff' }}
            />
          </Col>
          <Col span={8}>
            <Statistic
              title={<span><BuildOutlined style={{ color: '#722ed1' }} /> L3 组合节点</span>}
              value={l3Composites.length}
              valueStyle={{ color: '#722ed1' }}
            />
          </Col>
          <Col span={8}>
            <Statistic
              title={<span><AppstoreOutlined style={{ color: '#52c41a' }} /> L4 流程模板</span>}
              value={l4Templates.length}
              valueStyle={{ color: '#52c41a' }}
            />
          </Col>
        </Row>
        <Collapse
          items={[
            {
              key: 'info',
              label: (
                <span style={{ color: '#666' }}>
                  <QuestionCircleOutlined /> 层级说明
                </span>
              ),
              children: (
                <Row gutter={[24, 16]}>
                  <Col span={8}>
                    <div style={{ marginBottom: 8 }}>
                      <Tag color="blue" style={{ marginRight: 8 }}>L2</Tag>
                      <span style={{ color: '#666' }}>原子节点</span>
                    </div>
                    <p style={{ color: '#999', fontSize: 12, marginLeft: 40 }}>
                      平台提供的最小技术单元，不可拆分，是构建L3的唯一材料。
                    </p>
                  </Col>
                  <Col span={8}>
                    <div style={{ marginBottom: 8 }}>
                      <Tag color="purple" style={{ marginRight: 8 }}>L3</Tag>
                      <span style={{ color: '#666' }}>组合节点</span>
                    </div>
                    <p style={{ color: '#999', fontSize: 12, marginLeft: 40 }}>
                      L2原子节点的组合，完成特定功能模块。
                    </p>
                  </Col>
                  <Col span={8}>
                    <div style={{ marginBottom: 8 }}>
                      <Tag color="green" style={{ marginRight: 8 }}>L4</Tag>
                      <span style={{ color: '#666' }}>流程模板</span>
                    </div>
                    <p style={{ color: '#999', fontSize: 12, marginLeft: 40 }}>
                      面向场景的完整业务流程解决方案。
                    </p>
                  </Col>
                </Row>
              ),
            },
          ]}
        />
      </Card>

      <Tabs activeKey={activeTab} onChange={setActiveTab} items={tabItems} />

      {/* L3 Create/Edit Modal */}
      <Modal
        title={editingL3 ? '编辑L3组件' : '创建L3组件'}
        open={isL3ModalOpen}
        onOk={handleSaveL3}
        onCancel={() => setIsL3ModalOpen(false)}
        width={600}
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="code" label="组件编号" rules={[{ required: true }]}>
            <Input placeholder="如：PAY_REQUEST" disabled={!!editingL3} />
          </Form.Item>
          <Form.Item name="name" label="组件名称" rules={[{ required: true }]}>
            <Input placeholder="如：支付下单" />
          </Form.Item>
          <Form.Item name="function" label="功能描述" rules={[{ required: true }]}>
            <Input placeholder="组件实现的功能" />
          </Form.Item>
          <Form.Item name="description" label="组件说明">
            <Input.TextArea rows={2} placeholder="组件的详细说明" />
          </Form.Item>
          <Form.Item name="states" label="状态列表" rules={[{ required: true }]}>
            <Select mode="tags" placeholder="输入状态名称，按回车添加">
              {['init', 'pending', 'success', 'fail'].map(s => <Select.Option key={s} value={s}>{s}</Select.Option>)}
            </Select>
          </Form.Item>
          <Form.Item name="initialState" label="初始状态" rules={[{ required: true }]}>
            <Select placeholder="选择初始状态">
              {['init', 'pending', 'success', 'fail'].map(s => <Select.Option key={s} value={s}>{s}</Select.Option>)}
            </Select>
          </Form.Item>
        </Form>
      </Modal>

      {/* L4 Create/Edit Modal with State Machine */}
      <Modal
        title={editingL4 ? '编辑L4模板' : '创建L4模板'}
        open={isL4ModalOpen}
        onOk={handleSaveL4}
        onCancel={() => setIsL4ModalOpen(false)}
        width={600}
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="templateId" label="模板ID" rules={[{ required: true }]}>
            <Input placeholder="如：L4-TXX" disabled={!!editingL4} />
          </Form.Item>
          <Form.Item name="name" label="模板名称" rules={[{ required: true }]}>
            <Input placeholder="如：入金流程模板" />
          </Form.Item>
          <Form.Item name="description" label="模板描述">
            <Input.TextArea rows={2} placeholder="模板功能描述" />
          </Form.Item>
          <Form.Item name="states" label="状态列表" rules={[{ required: true }]}>
            <Select mode="tags" placeholder="输入状态名称，按回车添加">
              {['INIT', 'PENDING', 'SUCCESS', 'FAIL'].map(s => <Select.Option key={s} value={s}>{s}</Select.Option>)}
            </Select>
          </Form.Item>
          <Form.Item name="initialState" label="初始状态" rules={[{ required: true }]}>
            <Select placeholder="选择初始状态">
              {['INIT', 'PENDING', 'SUCCESS', 'FAIL'].map(s => <Select.Option key={s} value={s}>{s}</Select.Option>)}
            </Select>
          </Form.Item>

          {/* State Machine Preview */}
          <div style={{ marginTop: 16, padding: 16, background: '#fafafa', borderRadius: 8 }}>
            <Text strong style={{ marginBottom: 12, display: 'block' }}>状态机预览</Text>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              {['INIT', 'PENDING', 'SUCCESS', 'FAIL'].map((state, idx) => (
                <div key={state} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Tag
                    color={state === 'INIT' ? 'blue' : state === 'SUCCESS' ? 'green' : state === 'FAIL' ? 'red' : 'orange'}
                    style={{ padding: '4px 12px' }}
                  >
                    {state}
                  </Tag>
                  {idx < 3 && <Text type="secondary">→</Text>}
                </div>
              ))}
            </div>
            <Text type="secondary" style={{ fontSize: 11, marginTop: 8, display: 'block' }}>
              状态流转: INIT → PENDING → SUCCESS/FAIL
            </Text>
          </div>
        </Form>
      </Modal>
    </div>
  );
}

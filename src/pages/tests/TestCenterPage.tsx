import { useState } from 'react';
import { Card, Table, Button, Space, Tag, Tabs, Modal, Form, Input, Select, message, Progress } from 'antd';
import { PlayCircleOutlined, PlusOutlined, CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';
import { useTestStore, useFlowStore } from '../../store';
import type { TestCase, TestSuite } from '../../domain/testing/types';

export default function TestCenterPage() {
  const { testCases, testSuites, addTestCase, addTestSuite } = useTestStore();
  const { flows } = useFlowStore();
  const [activeTab, setActiveTab] = useState('cases');
  const [isCaseModalOpen, setIsCaseModalOpen] = useState(false);
  const [isSuiteModalOpen, setIsSuiteModalOpen] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionProgress, setExecutionProgress] = useState(0);
  const [form] = Form.useForm();

  const handleCreateCase = async () => {
    try {
      const values = await form.validateFields();
      const newCase: TestCase = {
        id: `TC_${Date.now()}`,
        name: values.name,
        flowId: values.flowId,
        versionNo: 1,
        category: values.category,
        input: {},
        assertions: [],
        lastResult: 'PENDING',
      };
      addTestCase(newCase);
      message.success('测试用例创建成功');
      setIsCaseModalOpen(false);
      form.resetFields();
    } catch {}
  };

  const handleCreateSuite = async () => {
    try {
      const values = await form.validateFields();
      const newSuite: TestSuite = {
        id: `TS_${Date.now()}`,
        name: values.name,
        description: values.description,
        flowId: values.flowId,
        caseIds: [],
        executionStrategy: 'SEQUENTIAL',
        continueOnFailure: false,
        coverageThreshold: 80,
      };
      addTestSuite(newSuite);
      message.success('测试套件创建成功');
      setIsSuiteModalOpen(false);
      form.resetFields();
    } catch {}
  };

  const handleExecuteCase = (_caseId: string) => {
    setIsExecuting(true);
    setExecutionProgress(0);
    const interval = setInterval(() => {
      setExecutionProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsExecuting(false);
          message.success('测试执行完成');
          return 100;
        }
        return prev + 10;
      });
    }, 200);
  };

  const caseColumns = [
    { title: '用例名称', dataIndex: 'name', key: 'name' },
    { title: '关联Flow', dataIndex: 'flowId', key: 'flowId' },
    {
      title: '分类',
      dataIndex: 'category',
      key: 'category',
      render: (cat: string) => <Tag>{cat}</Tag>,
    },
    {
      title: '最近结果',
      dataIndex: 'lastResult',
      key: 'lastResult',
      render: (result: string) => {
        if (result === 'PASS') return <Tag icon={<CheckCircleOutlined />} color="success">通过</Tag>;
        if (result === 'FAIL') return <Tag icon={<CloseCircleOutlined />} color="error">失败</Tag>;
        return <Tag>未执行</Tag>;
      },
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: TestCase) => (
        <Button
          type="primary"
          size="small"
          icon={<PlayCircleOutlined />}
          onClick={() => handleExecuteCase(record.id)}
          loading={isExecuting}
        >
          执行
        </Button>
      ),
    },
  ];

  const suiteColumns = [
    { title: '套件名称', dataIndex: 'name', key: 'name' },
    { title: '描述', dataIndex: 'description', key: 'description' },
    { title: '关联Flow', dataIndex: 'flowId', key: 'flowId' },
    { title: '用例数', key: 'caseCount', render: (_: any, record: TestSuite) => record.caseIds?.length || 0 },
    {
      title: '覆盖率门禁',
      key: 'threshold',
      render: (_: any, record: TestSuite) => `${record.coverageThreshold || 80}%`,
    },
    {
      title: '最近结果',
      dataIndex: 'lastResult',
      key: 'lastResult',
      render: (result: string) => {
        if (result === 'PASS') return <Tag color="success">通过</Tag>;
        if (result === 'FAIL') return <Tag color="error">失败</Tag>;
        return <Tag>未执行</Tag>;
      },
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, _record: TestSuite) => (
        <Button type="primary" size="small" icon={<PlayCircleOutlined />}>
          执行套件
        </Button>
      ),
    },
  ];

  const tabItems = [
    {
      key: 'cases',
      label: '测试用例',
      children: (
        <Card
          extra={
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setIsCaseModalOpen(true)}>
              创建用例
            </Button>
          }
        >
          {isExecuting && (
            <div style={{ marginBottom: 16 }}>
              <Progress percent={executionProgress} status="active" />
              <p style={{ textAlign: 'center', color: '#666' }}>测试执行中...</p>
            </div>
          )}
          <Table dataSource={testCases} columns={caseColumns} rowKey="id" pagination={{ pageSize: 10 }} />
        </Card>
      ),
    },
    {
      key: 'suites',
      label: '测试套件',
      children: (
        <Card
          extra={
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setIsSuiteModalOpen(true)}>
              创建套件
            </Button>
          }
        >
          <Table dataSource={testSuites} columns={suiteColumns} rowKey="id" pagination={{ pageSize: 10 }} />
        </Card>
      ),
    },
    {
      key: 'report',
      label: '覆盖率报告',
      children: (
        <Card>
          <div style={{ textAlign: 'center', padding: 40 }}>
            <p style={{ fontSize: 16, color: '#666' }}>暂无测试执行记录</p>
            <p style={{ color: '#999' }}>执行测试后查看覆盖率报告</p>
          </div>
        </Card>
      ),
    },
  ];

  return (
    <div>
      <Card title="测试中心" style={{ marginBottom: 16 }}>
        <Space>
          <span>测试门禁：Daily→Pre 需要Happy Path通过，Pre→Prod 需要全套件通过+覆盖率达标</span>
        </Space>
      </Card>
      <Tabs activeKey={activeTab} onChange={setActiveTab} items={tabItems} />

      <Modal title="创建测试用例" open={isCaseModalOpen} onOk={handleCreateCase} onCancel={() => setIsCaseModalOpen(false)}>
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="用例名称" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="flowId" label="关联Flow" rules={[{ required: true }]}>
            <Select>
              {flows.map((f) => (
                <Select.Option key={f.flowId} value={f.flowId}>
                  {f.name} ({f.flowId})
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="category" label="场景分类">
            <Select>
              <Select.Option value="Happy Path">Happy Path</Select.Option>
              <Select.Option value="Error Path">Error Path</Select.Option>
              <Select.Option value="Boundary">Boundary</Select.Option>
              <Select.Option value="Requery">Requery</Select.Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>

      <Modal title="创建测试套件" open={isSuiteModalOpen} onOk={handleCreateSuite} onCancel={() => setIsSuiteModalOpen(false)}>
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="套件名称" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="description" label="描述">
            <Input />
          </Form.Item>
          <Form.Item name="flowId" label="关联Flow" rules={[{ required: true }]}>
            <Select>
              {flows.map((f) => (
                <Select.Option key={f.flowId} value={f.flowId}>
                  {f.name}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="coverageThreshold" label="覆盖率门禁(%)">
            <Input type="number" defaultValue={80} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

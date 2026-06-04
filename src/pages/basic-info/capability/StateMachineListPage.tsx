import { useState, useEffect } from 'react';
import { Table, Button, Input, Modal, Form, Typography, Breadcrumb, Popconfirm, Space, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useSearchParams } from 'react-router-dom';
import { PlusOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

interface StateMachineItem {
  id: string;
  name: string;
  description?: string;
  status: 'draft' | 'submitted';
  createTime: string;
  updateTime: string;
  operator: string;
}

// localStorage key for state machine statuses
const STORAGE_KEY = 'stateMachineStatuses';

function getStoredStatuses(): Record<string, 'draft' | 'submitted'> {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

function saveStatus(name: string, status: 'draft' | 'submitted') {
  const statuses = getStoredStatuses();
  statuses[name] = status;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(statuses));
}

export default function StateMachineListPage() {
  const [searchParams] = useSearchParams();
  const bt = searchParams.get('bt') || '';
  const ability = searchParams.get('ability') || '';

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createForm] = Form.useForm();
  const [stateMachineList, setStateMachineList] = useState<StateMachineItem[]>([
    {
      id: 'sm1',
      name: 'Default_Refund_StateMachine',
      description: 'REFUND state machine',
      status: 'submitted',
      createTime: '2026-05-19 10:00:00',
      updateTime: '2026-05-19 10:00:00',
      operator: 'admin',
    },
    {
      id: 'sm2',
      name: 'BankCard_Debit_StateMachine',
      description: 'Bank card debit state machine',
      status: 'draft',
      createTime: '2026-05-19 11:00:00',
      updateTime: '2026-05-19 11:00:00',
      operator: 'admin',
    },
  ]);

  // Sync status from localStorage when component mounts
  useEffect(() => {
    const storedStatuses = getStoredStatuses();
    setStateMachineList(prev => prev.map(sm => ({
      ...sm,
      status: storedStatuses[sm.name] || sm.status,
    })));
  }, []);

  const handleCreate = async () => {
    try {
      const values = await createForm.validateFields();
      const newItem: StateMachineItem = {
        id: `sm_${Date.now()}`,
        name: values.name,
        description: values.description || '',
        status: 'draft',
        createTime: new Date().toLocaleString(),
        updateTime: new Date().toLocaleString(),
        operator: '—',
      };
      saveStatus(newItem.name, 'draft');
      setStateMachineList(prev => [...prev, newItem]);
      setCreateModalOpen(false);
      createForm.resetFields();
      window.location.href = `/basic-info/capability/stateMachine/canvas?bt=${bt}&ability=${ability}&sm=${newItem.name}`;
    } catch {}
  };

  const handleDelete = (id: string) => {
    setStateMachineList(prev => prev.filter(item => item.id !== id));
  };

  const columns: ColumnsType<StateMachineItem> = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      render: (name) => (
        <Button type="link" onClick={() => { window.location.href = `/basic-info/capability/stateMachine/canvas?bt=${bt}&ability=${ability}&sm=${name}`; }}>
          {name}
        </Button>
      ),
    },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
    },
    {
      title: 'Create Time',
      dataIndex: 'createTime',
      key: 'createTime',
      width: 180,
    },
    {
      title: 'Update Time',
      dataIndex: 'updateTime',
      key: 'updateTime',
      width: 180,
    },
    {
      title: 'Operator',
      dataIndex: 'operator',
      key: 'operator',
      width: 120,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: 'draft' | 'submitted') => (
        <Tag color={status === 'submitted' ? 'success' : 'default'}>
          {status === 'submitted' ? 'Submitted' : 'Draft'}
        </Tag>
      ),
    },
    {
      title: 'Operation',
      key: 'operation',
      width: 180,
      render: (_, record) => (
        <Space>
          <Button type="link" onClick={() => { window.location.href = `/basic-info/capability/stateMachine/canvas?bt=${bt}&ability=${ability}&sm=${record.name}`; }}>
            Modify
          </Button>
          <Popconfirm
            title="Delete this state machine?"
            onConfirm={() => handleDelete(record.id)}
            okText="OK"
            cancelText="Cancel"
          >
            <Button type="link" danger>Delete</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: '0 24px' }}>
      <Breadcrumb
        style={{ margin: '16px 0' }}
        items={[
          { title: 'Basic Info' },
          { title: 'Capability', href: '/basic-info/capability' },
          { title: 'stateMachine' },
        ]}
      />

      <div style={{ background: '#fff', padding: 24, borderRadius: 8 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div>
            <Title level={4} style={{ marginTop: 0, marginBottom: 4 }}>StateMachine</Title>
            <Text type="secondary">Business Type: {bt} | Ability: {ability}</Text>
          </div>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateModalOpen(true)}>
            Create StateMachine
          </Button>
        </div>

        {/* State Machine Table */}
        <Table
          dataSource={stateMachineList}
          columns={columns}
          rowKey="id"
          pagination={false}
          locale={{ emptyText: 'No StateMachine' }}
        />
      </div>

      <Modal
        title="Create StateMachine"
        open={createModalOpen}
        onCancel={() => {
          setCreateModalOpen(false);
          createForm.resetFields();
        }}
        onOk={handleCreate}
        okText="OK"
        cancelText="Cancel"
      >
        <Form form={createForm} layout="vertical">
          <Form.Item
            label="StateMachine Name"
            name="name"
            rules={[{ required: true, message: 'Please enter StateMachine name' }]}
          >
            <Input placeholder="Enter StateMachine name" />
          </Form.Item>
          <Form.Item label="Description" name="description">
            <Input.TextArea placeholder="Enter description (optional)" rows={3} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

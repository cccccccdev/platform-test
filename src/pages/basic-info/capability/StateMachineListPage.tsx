import { useState } from 'react';
import { Table, Button, Input, Modal, Form, Typography, Breadcrumb, Popconfirm, Space, Tabs, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useSearchParams } from 'react-router-dom';
import { PlusOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

interface StateMachineItem {
  id: string;
  name: string;
  country: string;
  description?: string;
  createTime: string;
  updateTime: string;
  operator: string;
}

const countries = [
  { code: 'NG', name: 'Nigeria' },
  { code: 'GH', name: 'Ghana' },
  { code: 'KE', name: 'Kenya' },
  { code: 'UG', name: 'Uganda' },
  { code: 'TZ', name: 'Tanzania' },
  { code: 'ET', name: 'Ethiopia' },
  { code: 'SN', name: 'Senegal' },
  { code: 'CI', name: 'Côte d\'Ivoire' },
  { code: 'CM', name: 'Cameroon' },
  { code: 'ZM', name: 'Zambia' },
];

export default function StateMachineListPage() {
  const [searchParams] = useSearchParams();
  const bt = searchParams.get('bt') || '';
  const ability = searchParams.get('ability') || '';

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createForm] = Form.useForm();
  const [selectedCountry, setSelectedCountry] = useState<string>('NG');
  const [stateMachineList, setStateMachineList] = useState<StateMachineItem[]>([
    {
      id: 'sm1',
      name: 'Default_Refund_StateMachine',
      country: 'NG',
      description: 'REFUND state machine',
      createTime: '2026-05-19 10:00:00',
      updateTime: '2026-05-19 10:00:00',
      operator: 'admin',
    },
    {
      id: 'sm2',
      name: 'BankCard_Debit_StateMachine',
      country: 'NG',
      description: 'Bank card debit state machine',
      createTime: '2026-05-19 11:00:00',
      updateTime: '2026-05-19 11:00:00',
      operator: 'admin',
    },
  ]);

  const handleCreate = async () => {
    try {
      const values = await createForm.validateFields();
      const newItem: StateMachineItem = {
        id: `sm_${Date.now()}`,
        name: values.name,
        country: selectedCountry,
        description: values.description || '',
        createTime: new Date().toLocaleString(),
        updateTime: new Date().toLocaleString(),
        operator: '—',
      };
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
        </div>

        {/* Country Tabs */}
        <Tabs
          activeKey={selectedCountry}
          onChange={(key) => {
            setSelectedCountry(key);
            setCreateModalOpen(true);
          }}
          style={{ marginBottom: 16 }}
          tabBarStyle={{ borderBottom: '1px solid #f0f0f0' }}
          tabBarExtraContent={
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateModalOpen(true)}>
              Create StateMachine
            </Button>
          }
        >
          {countries.map(c => (
            <Tabs.TabPane
              key={c.code}
              tab={<span>{c.name} <Tag style={{ marginLeft: 4, fontSize: 10 }}>{stateMachineList.filter(sm => sm.country === c.code).length}</Tag></span>}
            />
          ))}
        </Tabs>

        {/* State Machine Table filtered by country */}
        <Table
          dataSource={stateMachineList.filter(sm => sm.country === selectedCountry)}
          columns={columns}
          rowKey="id"
          pagination={false}
          locale={{ emptyText: 'No StateMachine in this country' }}
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
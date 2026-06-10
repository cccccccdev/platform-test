import { useState, useEffect } from 'react';
import { Table, Button, Input, Modal, Form, Typography, Breadcrumb, Popconfirm, Space, Tag, Select, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useSearchParams } from 'react-router-dom';
import { PlusOutlined, LinkOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

interface StateMachineItem {
  id: string;
  name: string;
  description?: string;
  status: 'draft' | 'submitted';
  createTime: string;
  updateTime: string;
  operator: string;
  linkedBt?: string;
  linkedAbility?: string;
}

// localStorage keys
const STORAGE_KEY = 'stateMachineStatuses';
const SM_LIST_KEY = 'stateMachineList';

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

function getStoredList(): StateMachineItem[] {
  try {
    const stored = localStorage.getItem(SM_LIST_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function saveList(list: StateMachineItem[]) {
  localStorage.setItem(SM_LIST_KEY, JSON.stringify(list));
}

// Mock business types and abilities for linking
const mockBusinessTypes = [
  { value: 'COLLECTION', label: 'COLLECTION' },
  { value: 'PAYMENT', label: 'PAYMENT' },
  { value: 'REFUND', label: 'REFUND' },
  { value: 'TRANSFER', label: 'TRANSFER' },
];

const mockAbilities = [
  { value: 'CARD_PAY', label: 'CARD_PAY' },
  { value: 'USSD_PAY', label: 'USSD_PAY' },
  { value: 'QR_PAY', label: 'QR_PAY' },
  { value: 'BANK_TRANSFER', label: 'BANK_TRANSFER' },
];

export default function StateMachineListPage() {
  const [searchParams] = useSearchParams();
  const bt = searchParams.get('bt') || '';
  const ability = searchParams.get('ability') || '';

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [linkModalOpen, setLinkModalOpen] = useState(false);
  const [editingSM, setEditingSM] = useState<StateMachineItem | null>(null);
  const [createForm] = Form.useForm();
  const [linkForm] = Form.useForm();
  const [stateMachineList, setStateMachineList] = useState<StateMachineItem[]>([]);

  // Load from localStorage
  useEffect(() => {
    const storedList = getStoredList();
    if (storedList.length > 0) {
      setStateMachineList(storedList);
    } else {
      // Default demo data
      setStateMachineList([
        {
          id: 'sm1',
          name: 'Default_Refund_StateMachine',
          description: 'REFUND state machine',
          status: 'submitted',
          createTime: '2026-05-19 10:00:00',
          updateTime: '2026-05-19 10:00:00',
          operator: 'admin',
          linkedBt: 'REFUND',
          linkedAbility: 'CARD_PAY',
        },
        {
          id: 'sm2',
          name: 'BankCard_Debit_StateMachine',
          description: 'Bank card debit state machine',
          status: 'draft',
          createTime: '2026-05-19 11:00:00',
          updateTime: '2026-05-19 11:00:00',
          operator: 'admin',
          linkedBt: 'PAYMENT',
          linkedAbility: 'CARD_PAY',
        },
      ]);
    }
  }, []);

  // Sync status from localStorage
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
        linkedBt: bt || values.linkedBt || '',
        linkedAbility: ability || values.linkedAbility || '',
      };
      saveStatus(newItem.name, 'draft');
      const updatedList = [...stateMachineList, newItem];
      setStateMachineList(updatedList);
      saveList(updatedList);
      setCreateModalOpen(false);
      createForm.resetFields();
      message.success('StateMachine created');
    } catch {}
  };

  const handleDelete = (id: string) => {
    const updatedList = stateMachineList.filter(item => item.id !== id);
    setStateMachineList(updatedList);
    saveList(updatedList);
    message.success('Deleted');
  };

  const handleLink = async () => {
    try {
      const values = await linkForm.validateFields();
      if (!editingSM) return;

      const updatedList = stateMachineList.map(sm =>
        sm.id === editingSM.id
          ? { ...sm, linkedBt: values.linkedBt, linkedAbility: values.linkedAbility, updateTime: new Date().toLocaleString() }
          : sm
      );
      setStateMachineList(updatedList);
      saveList(updatedList);
      setLinkModalOpen(false);
      linkForm.resetFields();
      setEditingSM(null);
      message.success('Linked successfully');
    } catch {}
  };

  const handleUnlink = (id: string) => {
    const updatedList = stateMachineList.map(sm =>
      sm.id === id
        ? { ...sm, linkedBt: '', linkedAbility: '', updateTime: new Date().toLocaleString() }
        : sm
    );
    setStateMachineList(updatedList);
    saveList(updatedList);
    message.success('Unlinked');
  };

  const openLinkModal = (sm: StateMachineItem) => {
    setEditingSM(sm);
    linkForm.setFieldsValue({
      linkedBt: sm.linkedBt || bt,
      linkedAbility: sm.linkedAbility || ability,
    });
    setLinkModalOpen(true);
  };

  const columns: ColumnsType<StateMachineItem> = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      render: (name, record) => (
        <Button type="link" onClick={() => {
          const queryParams = new URLSearchParams();
          if (record.linkedBt) queryParams.set('bt', record.linkedBt);
          if (record.linkedAbility) queryParams.set('ability', record.linkedAbility);
          queryParams.set('sm', name);
          window.location.href = `/basic-info/capability/stateMachine/canvas?${queryParams.toString()}`;
        }}>
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
      title: 'Linked Business Type',
      dataIndex: 'linkedBt',
      key: 'linkedBt',
      width: 150,
      render: (bt) => bt ? <Tag color="blue">{bt}</Tag> : <Text type="secondary">-</Text>,
    },
    {
      title: 'Linked Ability',
      dataIndex: 'linkedAbility',
      key: 'linkedAbility',
      width: 150,
      render: (ability) => ability ? <Tag color="purple">{ability}</Tag> : <Text type="secondary">-</Text>,
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
      width: 280,
      render: (_, record) => (
        <Space size="small">
          <Button type="link" size="small" onClick={() => {
            const queryParams = new URLSearchParams();
            if (record.linkedBt) queryParams.set('bt', record.linkedBt);
            if (record.linkedAbility) queryParams.set('ability', record.linkedAbility);
            queryParams.set('sm', record.name);
            window.location.href = `/basic-info/capability/stateMachine/canvas?${queryParams.toString()}`;
          }}>
            Edit
          </Button>
          <Button type="link" size="small" icon={<LinkOutlined />} onClick={() => openLinkModal(record)}>
            Link
          </Button>
          {(record.linkedBt || record.linkedAbility) && (
            <Button type="link" size="small" danger onClick={() => handleUnlink(record.id)}>
              Unlink
            </Button>
          )}
          <Popconfirm
            title="Delete this state machine?"
            onConfirm={() => handleDelete(record.id)}
            okText="OK"
            cancelText="Cancel"
          >
            <Button type="link" size="small" danger>Delete</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  // Determine if this is a standalone page (not from capability)
  const isStandalone = !bt && !ability;

  return (
    <div style={{ padding: '0 24px' }}>
      <Breadcrumb
        style={{ margin: '16px 0' }}
        items={[
          { title: 'Basic Info', href: '/basic-info' },
          ...(isStandalone ? [{ title: 'StateMachine' }] : [
            { title: 'Capability', href: '/basic-info/capability' },
            { title: 'StateMachine' },
          ]),
        ]}
      />

      <div style={{ background: '#fff', padding: 24, borderRadius: 8 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div>
            <Title level={4} style={{ marginTop: 0, marginBottom: 4 }}>StateMachine</Title>
            {isStandalone ? (
              <Text type="secondary">Create and manage state machines, link to Business Type abilities</Text>
            ) : (
              <Space>
                <Text type="secondary">Business Type: </Text>
                <Tag color="blue">{bt}</Tag>
                <Text type="secondary">Ability: </Text>
                <Tag color="purple">{ability}</Tag>
              </Space>
            )}
          </div>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateModalOpen(true)}>
            Create StateMachine
          </Button>
        </div>

        <Table
          dataSource={stateMachineList}
          columns={columns}
          rowKey="id"
          pagination={false}
          locale={{ emptyText: 'No StateMachine' }}
        />
      </div>

      {/* Create Modal */}
      <Modal
        title="Create StateMachine"
        open={createModalOpen}
        onCancel={() => { setCreateModalOpen(false); createForm.resetFields(); }}
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
          {isStandalone && (
            <>
              <Form.Item label="Linked Business Type" name="linkedBt">
                <Select placeholder="Select business type (optional)" options={mockBusinessTypes} allowClear style={{ width: '100%' }} />
              </Form.Item>
              <Form.Item label="Linked Ability" name="linkedAbility">
                <Select placeholder="Select ability (optional)" options={mockAbilities} allowClear style={{ width: '100%' }} />
              </Form.Item>
            </>
          )}
        </Form>
      </Modal>

      {/* Link Modal */}
      <Modal
        title="Link StateMachine to Business Type & Ability"
        open={linkModalOpen}
        onCancel={() => { setLinkModalOpen(false); linkForm.resetFields(); setEditingSM(null); }}
        onOk={handleLink}
        okText="Link"
        cancelText="Cancel"
      >
        <Form form={linkForm} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item label="StateMachine Name">
            <Input value={editingSM?.name} disabled />
          </Form.Item>
          <Form.Item label="Business Type" name="linkedBt" rules={[{ required: true, message: 'Please select Business Type' }]}>
            <Select placeholder="Select business type" options={mockBusinessTypes} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item label="Ability" name="linkedAbility" rules={[{ required: true, message: 'Please select Ability' }]}>
            <Select placeholder="Select ability" options={mockAbilities} style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
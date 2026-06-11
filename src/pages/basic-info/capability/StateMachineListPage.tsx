import { useState, useEffect } from 'react';
import { Table, Button, Input, Modal, Form, Typography, Breadcrumb, Popconfirm, Space, Tag, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useSearchParams } from 'react-router-dom';
import { PlusOutlined, RightOutlined, DownOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

interface StateMachineItem {
  id: string;
  name: string;
  description?: string;
  status: 'DRAFT' | 'SUBMITTED';
  operator: string;
  operationTime: string;
}

// localStorage keys
const STORAGE_KEY = 'stateMachineStatuses';
const SM_LIST_KEY = 'stateMachineList';
const LINKED_SM_KEY = 'linkedStateMachines';

interface LinkedSMRecord {
  bt: string;
  ability: string;
  smName: string;
  operator: string;
  operationTime: string;
}

function getStoredStatuses(): Record<string, 'DRAFT' | 'SUBMITTED'> {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

function saveStatus(name: string, status: 'DRAFT' | 'SUBMITTED') {
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

function getLinkedSMList(): LinkedSMRecord[] {
  try {
    const stored = localStorage.getItem(LINKED_SM_KEY);
    const parsed = stored ? JSON.parse(stored) : [];
    // Merge with mock data if no stored data
    if (parsed.length === 0) {
      return [
        { bt: 'BANK_CARD_DEBIT', ability: 'REFUND', smName: 'Default_Refund_StateMachine', operator: 'admin', operationTime: '2026-05-19 10:00:00' },
        { bt: 'INFO_PAYMENT', ability: 'TRANSACTION', smName: 'Default_Refund_StateMachine', operator: 'admin', operationTime: '2026-05-20 14:30:00' },
        { bt: 'BANK_CARD_DEBIT', ability: 'RE_QUERY', smName: 'BankCard_Debit_StateMachine', operator: 'admin', operationTime: '2026-05-21 09:15:00' },
      ];
    }
    return parsed;
  } catch {
    return [];
  }
}

function isStateMachineLinked(smName: string): boolean {
  const linkedList = getLinkedSMList();
  return linkedList.some(r => r.smName === smName);
}

function isStateMachineReferenced(smName: string): boolean {
  // Placeholder: In real implementation, this would check Channel Integration references
  // For now, return false to allow modify/delete
  return false;
}

export default function StateMachineListPage() {
  const [searchParams] = useSearchParams();
  const bt = searchParams.get('bt') || '';
  const ability = searchParams.get('ability') || '';

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createForm] = Form.useForm();
  const [stateMachineList, setStateMachineList] = useState<StateMachineItem[]>([]);
  const [expandedRowKeys, setExpandedRowKeys] = useState<string[]>([]);

  const getLinkedRecordsForSM = (smName: string): LinkedSMRecord[] => {
    const allLinked = getLinkedSMList();
    return allLinked.filter(r => r.smName === smName);
  };

  // Load from localStorage
  useEffect(() => {
    const storedList = getStoredList();
    const storedStatuses = getStoredStatuses();
    if (storedList.length > 0) {
      setStateMachineList(storedList.map(sm => ({
        ...sm,
        status: storedStatuses[sm.name] || sm.status,
      })));
    } else {
      // Default demo data
      setStateMachineList([
        {
          id: 'sm1',
          name: 'Default_Refund_StateMachine',
          description: 'REFUND state machine',
          status: 'SUBMITTED',
          operator: 'admin',
          operationTime: '2026-05-19 10:00:00',
        },
        {
          id: 'sm2',
          name: 'BankCard_Debit_StateMachine',
          description: 'Bank card debit state machine',
          status: 'DRAFT',
          operator: 'admin',
          operationTime: '2026-05-19 11:00:00',
        },
      ]);
    }
  }, []);

  const handleCreate = async () => {
    try {
      const values = await createForm.validateFields();
      // Validate name: only letters, numbers, underscores, hyphens
      const nameRegex = /^[a-zA-Z0-9_-]+$/;
      if (!nameRegex.test(values.name)) {
        message.error('StateMachine Name only supports letters, numbers, underscores and hyphens');
        return;
      }

      // Check for duplicate name
      const exists = stateMachineList.some(sm => sm.name === values.name);
      if (exists) {
        message.error('StateMachine name already exists');
        return;
      }

      const newItem: StateMachineItem = {
        id: `sm_${Date.now()}`,
        name: values.name,
        description: values.description || '',
        status: 'DRAFT',
        operator: '—',
        operationTime: new Date().toLocaleString(),
      };
      saveStatus(newItem.name, 'DRAFT');
      const updatedList = [...stateMachineList, newItem];
      setStateMachineList(updatedList);
      saveList(updatedList);
      setCreateModalOpen(false);
      createForm.resetFields();
      message.success('StateMachine created');
    } catch {}
  };

  const handleDelete = (id: string, name: string) => {
    if (isStateMachineLinked(name)) {
      message.error('Cannot delete: StateMachine is linked in Capability');
      return;
    }
    if (isStateMachineReferenced(name)) {
      message.error('Cannot delete: StateMachine is referenced in Channel Integration');
      return;
    }
    const updatedList = stateMachineList.filter(item => item.id !== id);
    setStateMachineList(updatedList);
    saveList(updatedList);
    message.success('Deleted');
  };

  const openModify = (sm: StateMachineItem) => {
    const queryParams = new URLSearchParams();
    queryParams.set('sm', sm.name);
    queryParams.set('mode', 'edit');
    window.location.href = `/basic-info/capability/stateMachine/canvas?${queryParams.toString()}`;
  };

  const openDetail = (sm: StateMachineItem) => {
    const queryParams = new URLSearchParams();
    queryParams.set('sm', sm.name);
    queryParams.set('mode', 'view');
    window.location.href = `/basic-info/capability/stateMachine/canvas?${queryParams.toString()}`;
  };

  const columns: ColumnsType<StateMachineItem> = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      render: (name, record) => {
        const isExpanded = expandedRowKeys.includes(record.id);
        return (
          <Space>
            <span
              style={{ cursor: 'pointer', color: '#1890ff', fontSize: 12 }}
              onClick={() => {
                if (isExpanded) {
                  setExpandedRowKeys(expandedRowKeys.filter(k => k !== record.id));
                } else {
                  setExpandedRowKeys([...expandedRowKeys, record.id]);
                }
              }}
            >
              {isExpanded ? <DownOutlined /> : <RightOutlined />}
            </span>
            <Button type="link" onClick={() => openModify(record)}>
              {name}
            </Button>
          </Space>
        );
      },
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (status: 'DRAFT' | 'SUBMITTED') => (
        <Tag color={status === 'SUBMITTED' ? 'success' : 'default'}>
          {status}
        </Tag>
      ),
    },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
    },
    {
      title: 'Operator',
      dataIndex: 'operator',
      key: 'operator',
      width: 120,
    },
    {
      title: 'Operation Time',
      dataIndex: 'operationTime',
      key: 'operationTime',
      width: 180,
    },
    {
      title: 'Operation',
      key: 'operation',
      width: 200,
      render: (_, record) => {
        const linked = isStateMachineLinked(record.name);
        const referenced = isStateMachineReferenced(record.name);
        const canModify = !linked && !referenced;
        const canDelete = !linked && !referenced;

        return (
          <Space size="small">
            <Button
              type="link"
              size="small"
              disabled={!canModify}
              onClick={() => openModify(record)}
            >
              Modify
            </Button>
            <Button type="link" size="small" onClick={() => openDetail(record)}>
              Detail
            </Button>
            <Popconfirm
              title="Delete this state machine?"
              onConfirm={() => handleDelete(record.id, record.name)}
              okText="OK"
              cancelText="Cancel"
              disabled={!canDelete}
            >
              <Button type="link" size="small" danger disabled={!canDelete}>
                Delete
              </Button>
            </Popconfirm>
          </Space>
        );
      },
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
          ...(isStandalone ? [{ title: 'State Machine' }] : [
            { title: 'Capability', href: '/basic-info/capability' },
            { title: 'State Machine' },
          ]),
        ]}
      />

      <div style={{ background: '#fff', padding: 24, borderRadius: 8 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div>
            <Title level={4} style={{ marginTop: 0, marginBottom: 4 }}>State Machine</Title>
            {isStandalone ? (
              <Text type="secondary">Create and manage state machines</Text>
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
            Create
          </Button>
        </div>

        <Table
          dataSource={stateMachineList}
          columns={columns}
          rowKey="id"
          pagination={false}
          expandable={{
            expandedRowKeys,
            onExpandedRowsChange: (keys) => setExpandedRowKeys(keys as string[]),
            expandedRowRender: (record) => {
              const linkedRecords = getLinkedRecordsForSM(record.name);
              return (
                <div style={{ padding: '8px 0' }}>
                  {linkedRecords.length === 0 ? (
                    <div style={{ color: '#999' }}>No linked Business Type & Ability</div>
                  ) : (
                     <Table
                      dataSource={linkedRecords}
                      rowKey={(r) => `${r.bt}-${r.ability}-${r.smName}`}
                      pagination={false}
                      size="small"
                      style={{ marginTop: 8, background: '#fafafa' }}
                    >
                      <Table.Column title="Business Type" dataIndex="bt" render={(bt) => <Tag color="blue">{bt}</Tag>} />
                      <Table.Column title="Ability" dataIndex="ability" render={(ability) => <Tag color="purple">{ability}</Tag>} />
                      <Table.Column title="Operator" dataIndex="operator" />
                      <Table.Column title="Operation Time" dataIndex="operationTime" />
                    </Table>
                  )}
                </div>
              );
            },
          }}
          locale={{ emptyText: '暂无 State Machine' }}
        />
      </div>

      {/* Create Modal */}
      <Modal
        title="Create State Machine"
        open={createModalOpen}
        onCancel={() => { setCreateModalOpen(false); createForm.resetFields(); }}
        onOk={handleCreate}
        okText="Create"
        cancelText="Cancel"
      >
        <Form form={createForm} layout="vertical">
          <Form.Item
            label="State Machine Name"
            name="name"
            rules={[{ required: true, message: 'Please enter StateMachine name' }]}
            extra="Only supports letters, numbers, underscores and hyphens"
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
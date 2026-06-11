import { useState } from 'react';
import { Table, Button, Space, message, Breadcrumb, Select, Form, Typography, Tag, Card, Empty, Tooltip, Modal } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { LeftOutlined, EyeOutlined, DeleteOutlined, PlusOutlined, RightOutlined, DownOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

const LINKED_SM_KEY = 'linkedStateMachines';
const SM_LIST_KEY = 'stateMachineList';
const STORAGE_KEY = 'stateMachineStatuses';

interface LinkedSMRecord {
  bt: string;
  ability: string;
  smName: string;
  operator: string;
  operationTime: string;
}

interface StateMachineItem {
  id: string;
  name: string;
  description?: string;
  status?: 'DRAFT' | 'SUBMITTED';
}

function getLinkedSM(): LinkedSMRecord[] {
  try {
    const stored = localStorage.getItem(LINKED_SM_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function saveLinkedSM(records: LinkedSMRecord[]) {
  localStorage.setItem(LINKED_SM_KEY, JSON.stringify(records));
}

function getStateMachineList(): StateMachineItem[] {
  try {
    const stored = localStorage.getItem(SM_LIST_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function getStoredStatuses(): Record<string, 'DRAFT' | 'SUBMITTED'> {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

export default function LinkStateMachinePage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const bt = searchParams.get('bt') || '';
  const ability = searchParams.get('ability') || '';

  const [form] = Form.useForm();
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [expandedRowKeys, setExpandedRowKeys] = useState<string[]>([]);
  const [unLinkModalOpen, setUnLinkModalOpen] = useState(false);

  const linkedRecords = getLinkedSM().filter(r => r.bt === bt && r.ability === ability);

  // Mock function to get channel codes referencing this state machine
  // In real implementation, this would query backend API or localStorage
  const getReferencingChannels = (smName: string): string[] => {
    // Mock data - return some sample channels for any state machine
    // In production, this would check actual channel integration data
    const allChannels = ['GTB_NG', 'ECBANK', 'PAYPAL', 'STRIPE', 'ALIPAY', 'ABC_PAY', 'WECHAT_PAY', 'UNION_PAY'];
    // Generate deterministic mock channels based on smName
    const hash = smName.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const count = (hash % 4) + 1; // 1-5 channels
    const channels: string[] = [];
    for (let i = 0; i < count; i++) {
      const idx = (hash + i) % allChannels.length;
      if (!channels.includes(allChannels[idx])) {
        channels.push(allChannels[idx]);
      }
    }
    return channels;
  };

  const availableStateMachines = () => {
    const list = getStateMachineList();
    const statuses = getStoredStatuses();
    const linkedNames = linkedRecords.map(r => r.smName);
    return list
      .filter(sm => statuses[sm.name] === 'SUBMITTED' && !linkedNames.includes(sm.name))
      .map(sm => ({ label: sm.name, value: sm.name }));
  };

  const handleAdd = () => {
    const values = form.getFieldsValue();
    if (!values.smName || !Array.isArray(values.smName) || values.smName.length === 0) {
      message.warning('Please select at least one StateMachine');
      return;
    }

    const toAdd = values.smName.filter((sm: string) => !linkedRecords.some(r => r.smName === sm));
    if (toAdd.length === 0) {
      message.info('Selected StateMachine(s) already linked');
      return;
    }

    const records = getLinkedSM();
    // Remove existing for this BT+Ability
    const filtered = records.filter(r => !(r.bt === bt && r.ability === ability));
    // Add existing linked
    linkedRecords.forEach(r => filtered.push(r));
    // Add new ones
    toAdd.forEach(smName => {
      filtered.push({
        bt,
        ability,
        smName,
        operator: 'admin',
        operationTime: new Date().toLocaleString(),
      });
    });

    saveLinkedSM(filtered);
    message.success(`Added ${toAdd.length} StateMachine(s)`);
    form.resetFields();
    setAddModalOpen(false);
    setRefreshKey(k => k + 1);
  };

  const handleUnLink = (smName: string) => {
    const channels = getReferencingChannels(smName);
    if (channels.length > 0) {
      setUnLinkModalOpen(true);
      return;
    }
    const records = getLinkedSM();
    const filtered = records.filter(r => !(r.bt === bt && r.ability === ability && r.smName === smName));
    saveLinkedSM(filtered);
    message.success('UnLinked');
    setRefreshKey(k => k + 1);
  };

  return (
    <div style={{ padding: '0 24px', minHeight: '100vh', background: '#f5f5f5' }}>
      <Breadcrumb
        style={{ margin: '16px 0' }}
        items={[
          { title: 'Basic Info', href: '/basic-info' },
          { title: 'Capability', href: '/basic-info/capability' },
          { title: 'Link StateMachine' },
        ]}
      />

      {/* Header Card */}
      <Card
        bordered={false}
        style={{ marginBottom: 16, borderRadius: 8 }}
        bodyStyle={{ padding: '20px 24px' }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div>
            <Space size="large" style={{ marginBottom: 8 }}>
              <Button
                icon={<LeftOutlined />}
                onClick={() => navigate(`/basic-info/capability`)}
              >
                Back
              </Button>
              <Title level={4} style={{ marginTop: 0, marginBottom: 0 }}>Link StateMachine</Title>
            </Space>
            <div>
              <Space size={16}>
                <Text type="secondary">Business Type:</Text>
                <Tag color="blue" style={{ margin: 0, fontSize: 13, padding: '4px 12px' }}>{bt}</Tag>
              </Space>
              <Space size={16}>
                <Text type="secondary">Ability:</Text>
                <Tag color="purple" style={{ margin: 0, fontSize: 13, padding: '4px 12px' }}>{ability}</Tag>
              </Space>
            </div>
          </div>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setAddModalOpen(true)}
          >
            Link
          </Button>
        </div>
      </Card>

      {/* Main Content */}
      <Card
        bordered={false}
        style={{ borderRadius: 8 }}
        bodyStyle={{ padding: 0 }}
      >
        {/* Linked State Machines Section */}
        <div style={{ padding: 24 }}>
          {linkedRecords.length === 0 ? (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={
                <span style={{ color: '#999' }}>No StateMachine linked. Click Add to link a StateMachine.</span>
              }
              style={{
                padding: '60px 0',
                background: '#fafafa',
                borderRadius: 8,
                border: '1px dashed #d9d9d9'
              }}
            />
          ) : (
            <Table
              dataSource={linkedRecords}
              rowKey={(record) => `${record.smName}-${record.operationTime}`}
              pagination={false}
              size="middle"
              bordered
              expandable={{
                expandedRowKeys,
                onExpandedRowsChange: (keys) => setExpandedRowKeys(keys as string[]),
                expandedRowRender: (record) => {
                  const channels = getReferencingChannels(record.smName);
                  return (
                    <div style={{ padding: '8px 16px', background: '#fafafa', borderRadius: 6, marginLeft: 40 }}>
                      <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 8 }}>Referenced by Channels:</Text>
                      {channels.length > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                          {channels.map(ch => <Tag key={ch} color="green">{ch}</Tag>)}
                        </div>
                      ) : (
                        <Text type="secondary">No channel references</Text>
                      )}
                    </div>
                  );
                },
              }}
            >
              <Table.Column
                title=""
                key="expand"
                width={40}
                render={(_, record) => {
                  const key = `${record.smName}-${record.operationTime}`;
                  const isExpanded = expandedRowKeys.includes(key);
                  return (
                    <span
                      style={{ cursor: 'pointer', color: '#1890ff', fontSize: 12 }}
                      onClick={() => {
                        if (isExpanded) {
                          setExpandedRowKeys(expandedRowKeys.filter(k => k !== key));
                        } else {
                          setExpandedRowKeys([...expandedRowKeys, key]);
                        }
                      }}
                    >
                      {isExpanded ? <DownOutlined /> : <RightOutlined />}
                    </span>
                  );
                }}
              />
              <Table.Column
                title="StateMachine Name"
                dataIndex="smName"
                width="35%"
                render={(smName) => (
                  <Tag color="blue" style={{ fontSize: 13, padding: '4px 12px' }}>{smName}</Tag>
                )}
              />
              <Table.Column
                title="Operator"
                dataIndex="operator"
                width="20%"
                render={(operator) => <Text type="secondary">{operator}</Text>}
              />
              <Table.Column
                title="Operation Time"
                dataIndex="operationTime"
                width="30%"
                render={(time) => <Text type="secondary">{time}</Text>}
              />
              <Table.Column
                title="Operation"
                width="15%"
                render={(_, record) => (
                  <Space size="small">
                    <Tooltip title="Preview">
                      <Button
                        type="text"
                        size="small"
                        icon={<EyeOutlined />}
                        onClick={() => {
                          const queryParams = new URLSearchParams();
                          queryParams.set('sm', record.smName);
                          queryParams.set('mode', 'view');
                          queryParams.set('bt', bt);
                          queryParams.set('ability', ability);
                          navigate(`/basic-info/capability/stateMachine/canvas?${queryParams.toString()}`);
                        }}
                      >
                        Preview
                      </Button>
                    </Tooltip>
                    <Tooltip title="UnLink">
                      <Button
                        type="text"
                        size="small"
                        danger
                        icon={<DeleteOutlined />}
                        onClick={() => handleUnLink(record.smName)}
                      >
                        UnLink
                      </Button>
                    </Tooltip>
                  </Space>
                )}
              />
            </Table>
          )}
        </div>
      </Card>

      {/* Link StateMachine Modal */}
      <Modal
        title="Link StateMachine"
        open={addModalOpen}
        onCancel={() => {
          setAddModalOpen(false);
          form.resetFields();
        }}
        onOk={handleAdd}
        okText="Confirm"
        cancelText="Cancel"
        width={500}
      >
        <div style={{ padding: '16px 0' }}>
          <div style={{ marginBottom: 16, padding: 12, background: '#fafafa', borderRadius: 6 }}>
            <Space size="large">
              <Text><Text strong>Business Type:</Text> <Tag color="blue">{bt}</Tag></Text>
              <Text><Text strong>Ability:</Text> <Tag color="purple">{ability}</Tag></Text>
            </Space>
          </div>

          <Form form={form} layout="vertical">
            <Form.Item
              name="smName"
              label="Select StateMachines"
              rules={[{ required: true, message: 'Please select at least one StateMachine' }]}
            >
              <Select
                mode="multiple"
                placeholder="Select Submitted StateMachines"
                options={availableStateMachines()}
                showSearch
                filterOption={(input, option) =>
                  (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                }
                maxTagCount={3}
                style={{ width: '100%' }}
              />
            </Form.Item>
          </Form>

          <Text type="secondary" style={{ fontSize: 12 }}>
            Only SUBMITTED state machines are available for selection
          </Text>
        </div>
      </Modal>

      {/* UnLink Error Modal */}
      <Modal
        title="Unable to UnLink"
        open={unLinkModalOpen}
        onCancel={() => setUnLinkModalOpen(false)}
        footer={[
          <Button key="confirm" type="primary" onClick={() => setUnLinkModalOpen(false)}>
            Confirm
          </Button>,
        ]}
      >
        <Text>This state machine has been associated with channels and cannot be removed.</Text>
      </Modal>
    </div>
  );
}
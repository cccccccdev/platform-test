import { useState } from 'react';
import { Table, Button, Space, message, Breadcrumb, Select, Form, Typography, Empty, Modal, Badge } from 'antd';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { LeftOutlined } from '@ant-design/icons';
import { useConfigIntegrationStore } from '../../channel-integration/configIntegrationStore';

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

const DEFAULT_LINKED_STATE_MACHINES: LinkedSMRecord[] = [
  { bt: 'BANK_CARD_DEBIT', ability: 'REFUND', smName: 'Default_Refund_StateMachine', operator: 'admin', operationTime: '2026-05-19 10:00:00' },
  { bt: 'BANK_CARD_DEBIT', ability: 'INFO_PAYMENT', smName: 'BankCard_Debit_StateMachine', operator: 'admin', operationTime: '2026-05-21 09:15:00' },
  { bt: 'SMS', ability: 'SINGLE_MESSAGE', smName: 'SMS_Single_Message_StateMachine', operator: 'Bailly', operationTime: '2026-07-03 09:52:37' },
  { bt: 'SMS', ability: 'SINGLE_MESSAGE', smName: 'SMS_Single_Message_Detailed_StateMachine', operator: 'Bailly', operationTime: '2026-08-18 10:00:00' },
];

const DEFAULT_STATE_MACHINES: StateMachineItem[] = [
  { id: 'sm1', name: 'Default_Refund_StateMachine', description: 'REFUND state machine', status: 'SUBMITTED' },
  { id: 'sm2', name: 'BankCard_Debit_StateMachine', description: 'Bank card debit state machine', status: 'SUBMITTED' },
  { id: 'sm_sms_single_message', name: 'SMS_Single_Message_StateMachine', description: 'Single SMS lifecycle', status: 'SUBMITTED' },
  { id: 'sm_sms_single_message_detailed', name: 'SMS_Single_Message_Detailed_StateMachine', description: 'Single SMS lifecycle with detailed failure states', status: 'SUBMITTED' },
];

function mergeBy<T>(records: T[], defaults: T[], keyOf: (record: T) => string): T[] {
  const keys = new Set(records.map(keyOf));
  return [...records, ...defaults.filter((record) => !keys.has(keyOf(record)))];
}

function getLinkedSM(): LinkedSMRecord[] {
  try {
    const stored = localStorage.getItem(LINKED_SM_KEY);
    const parsed = stored ? JSON.parse(stored) : [];
    return mergeBy(parsed, DEFAULT_LINKED_STATE_MACHINES, (item) => `${item.bt}:${item.ability}:${item.smName}`);
  } catch {
    return DEFAULT_LINKED_STATE_MACHINES;
  }
}

function saveLinkedSM(records: LinkedSMRecord[]) {
  localStorage.setItem(LINKED_SM_KEY, JSON.stringify(records));
}

function getStateMachineList(): StateMachineItem[] {
  try {
    const stored = localStorage.getItem(SM_LIST_KEY);
    const parsed = stored ? JSON.parse(stored) : [];
    return mergeBy(parsed, DEFAULT_STATE_MACHINES, (item) => item.name);
  } catch {
    return DEFAULT_STATE_MACHINES;
  }
}

function getStoredStatuses(): Record<string, 'DRAFT' | 'SUBMITTED'> {
  const defaults: Record<string, 'DRAFT' | 'SUBMITTED'> = {
    Default_Refund_StateMachine: 'SUBMITTED',
    BankCard_Debit_StateMachine: 'SUBMITTED',
    SMS_Single_Message_StateMachine: 'SUBMITTED',
    SMS_Single_Message_Detailed_StateMachine: 'SUBMITTED',
  };
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return { ...defaults, ...(stored ? JSON.parse(stored) : {}) };
  } catch {
    return defaults;
  }
}

function formatOperationTime(value: string | Date): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  const pad = (part: number) => String(part).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

export default function LinkStateMachinePage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const bt = searchParams.get('bt') || '';
  const ability = searchParams.get('ability') || '';

  const [form] = Form.useForm();
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [, setRefreshKey] = useState(0);
  const [unLinkModalOpen, setUnLinkModalOpen] = useState(false);
  const [referenceStateMachineName, setReferenceStateMachineName] = useState<string | null>(null);
  const abilitiesByChannel = useConfigIntegrationStore((state) => state.abilitiesByChannel);

  const linkedRecords = getLinkedSM().filter(r => r.bt === bt && r.ability === ability);

  interface ChannelRef {
    channelCode: string;
  }
  const getReferencingChannels = (smName: string): ChannelRef[] => Object.entries(abilitiesByChannel)
    .flatMap(([channelCode, abilities]) => abilities
      .filter((item) => item.bt === bt && item.ability === ability && item.stateMachine === smName && item.versions.length > 0)
      .map(() => ({
        channelCode,
      })));

  const availableStateMachines = () => {
    const list = getStateMachineList();
    const statuses = getStoredStatuses();
    const linkedNames = linkedRecords.map(r => r.smName);
    return list
      .filter(sm => statuses[sm.name] === 'SUBMITTED' && !linkedNames.includes(sm.name))
      .map(sm => ({ label: sm.name, value: sm.name }));
  };

  const getStateMachineDescription = (smName: string) =>
    getStateMachineList().find(item => item.name === smName)?.description || '—';

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
    toAdd.forEach((smName: string) => {
      filtered.push({
        bt,
        ability,
        smName,
        operator: 'admin',
        operationTime: formatOperationTime(new Date()),
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
      message.error('Cannot UnLink: StateMachine is referenced by Flow Group');
      return;
    }
    const records = getLinkedSM();
    const filtered = records.filter(r => !(r.bt === bt && r.ability === ability && r.smName === smName));
    saveLinkedSM(filtered);
    message.success('UnLinked');
    setRefreshKey(k => k + 1);
  };

  return (
    <div className="linked-state-machine-page">
      <section className="linked-state-machine-heading">
        <Breadcrumb items={[
          { title: 'Basic Info', href: '/basic-info' },
          { title: 'Capability', href: '/basic-info/capability' },
          { title: 'Linked State Machine' },
        ]} />
        <button className="linked-state-machine-back" type="button" onClick={() => navigate('/basic-info/capability')}>
          <LeftOutlined /><Title level={4}>Linked State Machine</Title>
        </button>
      </section>

      <main className="linked-state-machine-content">
        <div className="linked-state-machine-meta">
          <span><strong>Business Type:</strong> {bt}</span>
          <span><strong>Ability:</strong> {ability}</span>
        </div>
        <div className="linked-state-machine-actions">
          <Button type="primary" onClick={() => setAddModalOpen(true)}>Link</Button>
        </div>

        <div className="linked-state-machine-table-wrap">
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
              className="linked-state-machine-table"
              dataSource={linkedRecords}
              rowKey={(record) => `${record.smName}-${record.operationTime}`}
              pagination={false}
              size="middle"
            >
              <Table.Column
                title="State Machine Name"
                dataIndex="smName"
                width="20%"
                render={(smName) => <Text>{smName}</Text>}
              />
              <Table.Column
                title="Description"
                width="24%"
                render={(_, record) => <Text>{getStateMachineDescription(record.smName)}</Text>}
              />
              <Table.Column
                title="Operator"
                dataIndex="operator"
                width="15%"
                render={(operator) => <Text type="secondary">{operator}</Text>}
              />
              <Table.Column
                title="Operation Time"
                dataIndex="operationTime"
                width="19%"
                render={(time) => <Text type="secondary">{formatOperationTime(time)}</Text>}
              />
              <Table.Column
                title="Operation"
                width="22%"
                render={(_, record) => {
                  const hasReferences = getReferencingChannels(record.smName).length > 0;
                  return (
                  <Space size="middle" className="linked-state-machine-operation">
                    <Button type="link" onClick={() => {
                      const queryParams = new URLSearchParams();
                      queryParams.set('sm', record.smName);
                      queryParams.set('mode', 'view');
                      queryParams.set('bt', bt);
                      queryParams.set('ability', ability);
                      navigate(`/basic-info/capability/stateMachine/canvas?${queryParams.toString()}`);
                    }}>Preview</Button>
                    <Badge dot={hasReferences} color="#52c41a" offset={[-2, 4]}>
                      <Button type="link" onClick={() => setReferenceStateMachineName(record.smName)}>References</Button>
                    </Badge>
                    <Button
                      type="link"
                      danger
                      disabled={hasReferences}
                      onClick={() => handleUnLink(record.smName)}
                    >Unlink</Button>
                  </Space>
                  );
                }}
              />
            </Table>
          )}
        </div>
      </main>

      {/* Link StateMachine Modal */}
      <Modal
        className="linked-state-machine-modal"
        title="Link State Machine"
        open={addModalOpen}
        onCancel={() => {
          setAddModalOpen(false);
          form.resetFields();
        }}
        onOk={handleAdd}
        okText="Link"
        cancelText="Cancel"
        width={560}
      >
        <div className="linked-state-machine-modal-body">
          <div className="state-machine-modal-context">
            <span><strong>Business Type:</strong> {bt}</span>
            <span><strong>Ability:</strong> {ability}</span>
          </div>

          <Form form={form} layout="vertical">
            <Form.Item
              name="smName"
              label="Select State Machine"
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

      <Modal
        className="reference-relationship-modal state-machine-context-modal"
        title="View Reference Relationship"
        open={referenceStateMachineName !== null}
        onCancel={() => setReferenceStateMachineName(null)}
        footer={null}
        width={640}
      >
        <div className="state-machine-modal-context reference-relationship-context">
          <span><strong>Business Type:</strong> {bt}</span>
          <span><strong>Ability:</strong> {ability}</span>
          <span><strong>State Machine Name:</strong> {referenceStateMachineName}</span>
        </div>
        <Table
          className="reference-relationship-table"
          dataSource={referenceStateMachineName ? getReferencingChannels(referenceStateMachineName) : []}
          rowKey="channelCode"
          pagination={false}
          size="small"
          locale={{
            emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No Channel Integration references yet." />,
          }}
        >
          <Table.Column title="Channel" dataIndex="channelCode" />
        </Table>
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

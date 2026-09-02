import { useState } from 'react';
import { Button, Form, Input, Modal, Select, Space, Table, Tooltip, message } from 'antd';
import { QuestionCircleOutlined } from '@ant-design/icons';
import { create } from 'zustand';

interface ChainReference {
  code: string;
  name: string;
}

interface ChainMapping {
  id: string;
  chainCode: string;
  chainName: string;
  channelChainCode: string;
  operator: string;
  operationTime: string;
}

interface ChainMappingForm {
  chainCode: string;
  chainName: string;
  channelChainCode: string;
}

interface ChainMappingStore {
  recordsByScope: Record<string, ChainMapping[]>;
  saveMapping: (scope: string, mapping: ChainMapping) => void;
}

const CHAIN_REFERENCES: ChainReference[] = [
  { code: 'ERC20', name: 'Ethereum' },
  { code: 'TRC20', name: 'Tron' },
  { code: 'SOLANA', name: 'Solana' },
  { code: 'ARBITRUM', name: 'Arbitrum' },
  { code: 'BASE', name: 'Base' },
];

const COBO_MAPPINGS: ChainMapping[] = [
  { id: 'cobo_erc20', chainCode: 'ERC20', chainName: 'Ethereum', channelChainCode: 'ETH', operator: 'Bailly', operationTime: '2026-09-02 10:18:24' },
  { id: 'cobo_trc20', chainCode: 'TRC20', chainName: 'Tron', channelChainCode: 'TRON', operator: 'Bailly', operationTime: '2026-09-02 10:20:11' },
  { id: 'cobo_solana', chainCode: 'SOLANA', chainName: 'Solana', channelChainCode: 'SOL', operator: 'Rick', operationTime: '2026-09-02 10:24:36' },
];

const initialRecordsByScope = ['ALIYUN', 'BD', 'MFB'].reduce<Record<string, ChainMapping[]>>((clouds, cloud) => {
  ['DAILY', 'PRE', 'PROD'].forEach((env) => {
    clouds[`COBO::${cloud}::${env}`] = structuredClone(COBO_MAPPINGS);
  });
  return clouds;
}, {});

const useChainMappingStore = create<ChainMappingStore>((set) => ({
  recordsByScope: initialRecordsByScope,
  saveMapping: (scope, mapping) => set((state) => {
    const current = state.recordsByScope[scope] ?? [];
    const exists = current.some((record) => record.id === mapping.id);
    return {
      recordsByScope: {
        ...state.recordsByScope,
        [scope]: exists
          ? current.map((record) => record.id === mapping.id ? mapping : record)
          : [...current, mapping],
      },
    };
  }),
}));

function formatOperationTime() {
  const now = new Date();
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
}

export default function ChannelInfoChainPage({
  channelCode,
  cloud,
  env,
}: {
  channelCode: string;
  cloud: string;
  env: string;
}) {
  const scope = `${channelCode}::${cloud}::${env}`;
  const records = useChainMappingStore((state) => state.recordsByScope[scope] ?? []);
  const saveMapping = useChainMappingStore((state) => state.saveMapping);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ChainMapping | null>(null);
  const [form] = Form.useForm<ChainMappingForm>();
  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    setModalOpen(true);
  };

  const openEdit = (record: ChainMapping) => {
    setEditing(record);
    form.setFieldsValue(record);
    setModalOpen(true);
  };

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      const channelChainCode = values.channelChainCode.trim();
      const duplicateInner = records.some((record) => record.chainCode === values.chainCode && record.id !== editing?.id);
      const duplicateOuter = records.some((record) => record.channelChainCode === channelChainCode && record.id !== editing?.id);

      if (duplicateInner) {
        form.setFields([{ name: 'chainName', errors: ['This Chain already has a mapping in the current environment.'] }]);
        return;
      }
      if (duplicateOuter) {
        form.setFields([{ name: 'channelChainCode', errors: ['This Channel Chain Code is already mapped in the current environment.'] }]);
        return;
      }

      const chain = CHAIN_REFERENCES.find((item) => item.code === values.chainCode);
      if (!chain) return;
      saveMapping(scope, {
        id: editing?.id ?? `chain_${Date.now()}`,
        chainCode: chain.code,
        chainName: chain.name,
        channelChainCode,
        operator: 'Current User',
        operationTime: formatOperationTime(),
      });
      setModalOpen(false);
      message.success(editing ? 'Chain mapping updated and effective immediately.' : 'Chain mapping created and effective immediately.');
    } catch {
      // Ant Design renders field-level validation feedback.
    }
  };

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <div style={{ background: '#fff', padding: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
          <Button type="primary" onClick={openCreate}>Create</Button>
        </div>
        <Table<ChainMapping>
          rowKey="id"
          dataSource={records}
          pagination={{ pageSize: 10, showSizeChanger: true, showTotal: (total) => `Total ${total} items` }}
          columns={[
            { title: 'Chain Code', dataIndex: 'chainCode', width: 180 },
            { title: 'Chain Name', dataIndex: 'chainName' },
            { title: 'Channel Chain Code', dataIndex: 'channelChainCode', width: 220 },
            { title: 'Operator', dataIndex: 'operator', width: 160 },
            { title: 'Operation Time', dataIndex: 'operationTime', width: 200 },
            { title: 'Operation', width: 100, render: (_, record) => <Button type="link" size="small" onClick={() => openEdit(record)}>Edit</Button> },
          ]}
          locale={{ emptyText: 'No Chain mappings in the current environment.' }}
        />
      </div>

      <Modal
        title={editing ? 'Edit Chain Mapping' : 'Create Chain Mapping'}
        open={modalOpen}
        onOk={handleSave}
        okText="Save"
        cancelText="Cancel"
        onCancel={() => setModalOpen(false)}
        destroyOnHidden
        width={560}
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item
            name="chainName"
            label={(
              <Space size={5}>
                Chain Name
                <Tooltip title="Select an internal Chain maintained in Basic Info.">
                  <QuestionCircleOutlined style={{ color: '#8c8c8c', cursor: 'help' }} />
                </Tooltip>
              </Space>
            )}
            rules={[{ required: true, message: 'Select Chain Name' }]}
          >
            <Select
              showSearch
              disabled={Boolean(editing)}
              optionFilterProp="searchText"
              placeholder="Select Chain Name"
              onChange={(chainName) => {
                const chain = CHAIN_REFERENCES.find((item) => item.name === chainName);
                form.setFieldValue('chainCode', chain?.code);
              }}
              options={CHAIN_REFERENCES.map((chain) => ({
                value: chain.name,
                label: chain.name,
                searchText: `${chain.code} ${chain.name}`,
              }))}
            />
          </Form.Item>
          <Form.Item
            name="chainCode"
            label={(
              <Space size={5}>
                Chain Code
                <Tooltip title="Automatically populated from the selected Chain Name.">
                  <QuestionCircleOutlined style={{ color: '#8c8c8c', cursor: 'help' }} />
                </Tooltip>
              </Space>
            )}
            rules={[{ required: true, message: 'Chain Code is required' }]}
          >
            <Input disabled placeholder="Automatically populated" />
          </Form.Item>
          <Form.Item
            name="channelChainCode"
            label={(
              <Space size={5}>
                Channel Chain Code
                <Tooltip title="The value required by this channel for outbound requests and returned by the channel in responses or callbacks.">
                  <QuestionCircleOutlined style={{ color: '#8c8c8c', cursor: 'help' }} />
                </Tooltip>
              </Space>
            )}
            rules={[
              { required: true, whitespace: true, message: 'Enter Channel Chain Code' },
              { max: 128, message: 'Channel Chain Code cannot exceed 128 characters' },
              { pattern: /^[A-Za-z0-9_-]+$/, message: 'Use letters, numbers, underscores, or hyphens only' },
            ]}
          >
            <Input placeholder="For example, ETH" />
          </Form.Item>
        </Form>
      </Modal>
    </Space>
  );
}

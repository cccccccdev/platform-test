import { useState, useEffect } from 'react';
import { Modal, Form, Input, Select, Button, Space, Typography, Divider, Tag } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import type { EventCondition } from './types';

const { Text } = Typography;

interface StateConfigModalProps {
  visible: boolean;
  stateName: string;
  isDashed: boolean; // true if this state is connected via dashed line (虚线)
  onSave: (config: { conditions: EventCondition[] }) => void;
  onCancel: () => void;
}

const operatorOptions = [
  { value: '==', label: '==' },
  { value: '!=', label: '!=' },
  { value: '>', label: '>' },
  { value: '<', label: '<' },
  { value: '>=', label: '>=' },
  { value: '<=', label: '<=' },
  { value: 'contains', label: 'contains' },
  { value: 'startsWith', label: 'startsWith' },
  { value: 'isEmpty', label: 'isEmpty' },
  { value: 'isNotEmpty', label: 'isNotEmpty' },
];

const fieldSourceOptions = [
  { label: 'channelResponse.status', value: 'channelResponse.status' },
  { label: 'channelResponse.message', value: 'channelResponse.message' },
  { label: 'channelResponse.code', value: 'channelResponse.code' },
  { label: 'channelResponse.data', value: 'channelResponse.data' },
  { label: 'spi.request.amount', value: 'spi.request.amount' },
  { label: 'spi.request.currency', value: 'spi.request.currency' },
  { label: 'spi.request.reference', value: 'spi.request.reference' },
];

export default function StateConfigModal({ visible, stateName, isDashed, onSave, onCancel }: StateConfigModalProps) {
  const [form] = Form.useForm();
  const [conditions, setConditions] = useState<EventCondition[]>([
    { id: '1', field: '', operator: '==', value: '', logic: 'AND' }
  ]);

  useEffect(() => {
    if (visible) {
      form.resetFields();
      setConditions([{ id: '1', field: '', operator: '==', value: '', logic: 'AND' }]);
    }
  }, [visible, form]);

  const handleAddCondition = () => {
    setConditions([
      ...conditions,
      { id: String(Date.now()), field: '', operator: '==', value: '', logic: 'AND' }
    ]);
  };

  const handleUpdateCondition = (index: number, updates: Partial<EventCondition>) => {
    const newConditions = [...conditions];
    newConditions[index] = { ...newConditions[index], ...updates };
    setConditions(newConditions);
  };

  const handleRemoveCondition = (index: number) => {
    setConditions(conditions.filter((_, i) => i !== index));
  };

  const handleOk = () => {
    onSave({
      conditions: conditions.filter(c => c.field),
    });
  };

  // For dashed line states - just show waiting message
  if (isDashed) {
    return (
      <Modal
        title={<Space>
          <span>Configure State:</span>
          <Text strong style={{ color: '#22c55e' }}>{stateName}</Text>
        </Space>}
        open={visible}
        onCancel={onCancel}
        onOk={handleOk}
        okText="Confirm"
        cancelText="Cancel"
        width={500}
      >
        <div style={{ padding: '24px 0', textAlign: 'center' }}>
          <div style={{
            padding: '16px 24px',
            background: '#f6ffed',
            border: '1px solid #b7eb8f',
            borderRadius: 8,
            fontSize: 14,
            color: '#52c41a'
          }}>
            <Tag color="green" style={{ marginRight: 8 }}>Wait</Tag>
            等待内部/外部请求后切换至下一个state
          </div>
          <Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 12 }}>
            This state waits for internal or external callback before transitioning
          </Text>
        </div>
      </Modal>
    );
  }

  // For solid line states - show condition configuration
  return (
    <Modal
      title={<Space>
        <span>Configure State:</span>
        <Text strong style={{ color: '#22c55e' }}>{stateName}</Text>
      </Space>}
      open={visible}
      onCancel={onCancel}
      onOk={handleOk}
      okText="Confirm"
      cancelText="Cancel"
      width={600}
    >
      <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
        {/* State Name Display */}
        <Form.Item label="State Name">
          <Input disabled value={stateName} />
        </Form.Item>

        <Divider />

        {/* Condition Configuration */}
        <div style={{ marginBottom: 16 }}>
          <Text strong style={{ fontSize: 13, display: 'block', marginBottom: 12 }}>
            Transition Conditions
          </Text>
          <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 12 }}>
            Configure conditions that determine how this state transitions to the next state
          </Text>

          {conditions.map((cond, idx) => (
            <div key={cond.id} style={{ marginBottom: 12, padding: 12, background: '#fafafa', borderRadius: 6, border: '1px solid #e8e8e8' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <Text strong style={{ fontSize: 11 }}>Condition {idx + 1}</Text>
                {idx > 0 && (
                  <Select
                    size="small"
                    value={cond.logic}
                    onChange={(val) => handleUpdateCondition(idx, { logic: val })}
                    style={{ width: 70 }}
                  >
                    <Select.Option value="AND">AND</Select.Option>
                    <Select.Option value="OR">OR</Select.Option>
                  </Select>
                )}
                {conditions.length > 1 && (
                  <Button
                    type="text"
                    size="small"
                    danger
                    icon={<DeleteOutlined />}
                    onClick={() => handleRemoveCondition(idx)}
                  />
                )}
              </div>
              <Space direction="horizontal" size={8}>
                <Select
                  placeholder="Field"
                  value={cond.field}
                  onChange={(val) => handleUpdateCondition(idx, { field: val })}
                  style={{ width: 180 }}
                  allowClear
                >
                  {fieldSourceOptions.map(opt => (
                    <Select.Option key={opt.value} value={opt.value}>{opt.label}</Select.Option>
                  ))}
                </Select>
                <Select
                  value={cond.operator}
                  onChange={(val) => handleUpdateCondition(idx, { operator: val })}
                  style={{ width: 100 }}
                >
                  {operatorOptions.map(op => (
                    <Select.Option key={op.value} value={op.value}>{op.label}</Select.Option>
                  ))}
                </Select>
                {!['isEmpty', 'isNotEmpty'].includes(cond.operator) && (
                  <Input
                    placeholder="Value"
                    value={cond.value}
                    onChange={(e) => handleUpdateCondition(idx, { value: e.target.value })}
                    style={{ width: 120 }}
                  />
                )}
              </Space>
            </div>
          ))}
          <Button
            type="link"
            size="small"
            icon={<PlusOutlined />}
            onClick={handleAddCondition}
          >
            + Add Condition
          </Button>
        </div>

        {/* Condition Summary */}
        <div style={{
          padding: '8px 12px',
          background: '#e6f7ff',
          border: '1px solid #91d5ff',
          borderRadius: 4,
          fontSize: 12,
          color: '#1890ff'
        }}>
          <Tag color="blue" style={{ marginRight: 8 }}>Info</Tag>
          When conditions match, transition to the next state based on configuration
        </div>
      </Form>
    </Modal>
  );
}
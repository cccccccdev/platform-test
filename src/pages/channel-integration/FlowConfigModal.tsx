import { useState, useEffect } from 'react';
import { Modal, Form, Input, Select, Radio, Button, Space, Typography, Tag } from 'antd';
import type { FlowConfig, TriggerType } from './types';

const { Text } = Typography;

interface FlowConfigModalProps {
  visible: boolean;
  stateName: string;
  existingFlows: FlowConfig[];
  availableEvents: string[];
  editingFlow?: FlowConfig | null;
  onSave: (config: FlowConfig) => void;
  onNext?: () => void;
  onCancel: () => void;
}

const triggerTypeOptions = [
  { value: 'upstream', label: 'Upstream Trigger' },
  { value: 'external', label: 'External Trigger' },
  { value: 'timer', label: 'Timer Trigger' },
  { value: 'callback', label: 'Callback Trigger' },
];

// All available actions for this ability
const allActions = ['TRANSACTION', 'QUERY', 'VERIFY', 'CANCEL', 'REVERSAL', 'INBOUND_TRANSACTION', 'INBOUND_QUERY'];

const stateOptions = [
  { value: 'INIT', label: 'INIT' },
  { value: 'WAITING_OTP', label: 'WAITING_OTP' },
  { value: 'VERIFYING_OTP', label: 'VERIFYING_OTP' },
  { value: 'AUTHENTICATING', label: 'AUTHENTICATING' },
  { value: 'PROGRESSING', label: 'PROGRESSING' },
  { value: 'SUCCESS', label: 'SUCCESS' },
  { value: 'FAILED', label: 'FAILED' },
];

export default function FlowConfigModal({
  visible,
  stateName,
  existingFlows: _existingFlows,
  availableEvents: _availableEvents,
  editingFlow: _editingFlow,
  onSave,
  onNext,
  onCancel,
}: FlowConfigModalProps) {
  const [form] = Form.useForm();
  const [triggerType, setTriggerType] = useState<TriggerType>('upstream');
  const [selectedActions, setSelectedActions] = useState<string[]>([]);
  const [subStates, setSubStates] = useState<string[]>([]);

  useEffect(() => {
    if (visible) {
      form.resetFields();
      setTriggerType('upstream');
      setSelectedActions([]);
      setSubStates([]);
    }
  }, [visible, form]);

  // Check if should show INIT as default sub-state
  const showInitDefault = selectedActions.includes('transaction') && selectedActions.includes('INBOUND');

  const handleOk = () => {
    const values = form.getFieldsValue();
    const config: FlowConfig = {
      id: `flow_${Date.now()}`,
      name: values.name || `Flow_${stateName}_${Date.now()}`,
      executionType: 'single',
      flowType: 'outbound',
      endType: 'wait_external',
      triggerType,
      triggerEvents: selectedActions,
      isConfigured: true,
    };

    onSave(config);
    onCancel();
  };

  return (
    <Modal
      title="Flow Basic Info"
      open={visible}
      onCancel={onCancel}
      footer={
        <Space>
          <Button onClick={onCancel}>Cancel</Button>
          <Button onClick={handleOk}>Confirm</Button>
          {onNext && (
            <Button type="primary" onClick={() => {
              handleOk();
              onNext();
            }}>
              Next
            </Button>
          )}
        </Space>
      }
      width={600}
    >
      <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
        {/* Flow Name */}
        <Form.Item label="Flow Name" name="name">
          <Input placeholder={`Flow_${stateName}_${Date.now()}`} />
        </Form.Item>

        {/* Trigger Type */}
        <Form.Item label="Trigger Type">
          <Radio.Group
            value={triggerType}
            onChange={(e) => {
              setTriggerType(e.target.value);
              setSelectedActions([]);
            }}
            style={{ display: 'flex', flexDirection: 'column', gap: 8 }}
          >
            {triggerTypeOptions.map(opt => (
              <Radio key={opt.value} value={opt.value}>
                <Text>{opt.label}</Text>
              </Radio>
            ))}
          </Radio.Group>
        </Form.Item>

        {/* Action Selection - for all trigger types */}
        <Form.Item label="Action">
          <Select
            mode="multiple"
            placeholder="Select action"
            value={selectedActions}
            onChange={(val) => setSelectedActions(val)}
            style={{ width: '100%' }}
            allowClear
          >
            {allActions.map(opt => (
              <Select.Option key={opt} value={opt}>
                <Tag color="blue">{opt}</Tag>
              </Select.Option>
            ))}
          </Select>
        </Form.Item>

        {/* Sub-states */}
        <Form.Item label="Start Sub-state">
          {showInitDefault ? (
            <Input value="INIT" disabled />
          ) : (
            <Select
              mode="multiple"
              placeholder="Select sub-states"
              value={subStates}
              onChange={(val) => setSubStates(val)}
              style={{ width: '100%' }}
              allowClear
            >
              {stateOptions.map(opt => (
                <Select.Option key={opt.value} value={opt.value}>
                  {opt.label}
                </Select.Option>
              ))}
            </Select>
          )}
          {showInitDefault && (
            <Text type="secondary" style={{ fontSize: 11, display: 'block', marginTop: 4 }}>
              When transaction and INBOUND are selected, sub-state defaults to INIT
            </Text>
          )}
        </Form.Item>
      </Form>
    </Modal>
  );
}
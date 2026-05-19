import { useState, useEffect } from 'react';
import { Modal, Form, Input, Select, Radio, Button, Space, Typography, Divider, Tag } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import type { FlowConfig, ExecutionType, FlowType, EventCondition } from './types';

const { Text } = Typography;

interface FlowConfigModalProps {
  visible: boolean;
  stateName: string;
  existingFlows: FlowConfig[];
  availableEvents: string[];
  onSave: (config: FlowConfig) => void;
  onNext?: () => void;
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

export default function FlowConfigModal({
  visible,
  stateName,
  existingFlows,
  availableEvents,
  onSave,
  onNext,
  onCancel,
}: FlowConfigModalProps) {
  const [form] = Form.useForm();
  const [executionType, setExecutionType] = useState<ExecutionType>('single');
  const [flowType, setFlowType] = useState<FlowType>('forward');
  const [generateEvent, setGenerateEvent] = useState(true);
  const [eventConditions, setEventConditions] = useState<EventCondition[]>([
    { id: '1', field: '', operator: '==', value: '', logic: 'AND' }
  ]);
  const [selectedEvents, setSelectedEvents] = useState<string[]>([]);

  useEffect(() => {
    if (visible) {
      form.resetFields();
      setExecutionType('single');
      setFlowType('forward');
      setGenerateEvent(true);
      setEventConditions([{ id: '1', field: '', operator: '==', value: '', logic: 'AND' }]);
      setSelectedEvents([]);
    }
  }, [visible, form]);

  const handleAddCondition = () => {
    setEventConditions([
      ...eventConditions,
      { id: String(Date.now()), field: '', operator: '==', value: '', logic: 'AND' }
    ]);
  };

  const handleUpdateCondition = (index: number, updates: Partial<EventCondition>) => {
    const newConditions = [...eventConditions];
    newConditions[index] = { ...newConditions[index], ...updates };
    setEventConditions(newConditions);
  };

  const handleRemoveCondition = (index: number) => {
    setEventConditions(eventConditions.filter((_, i) => i !== index));
  };

  const handleOk = () => {
    const values = form.getFieldsValue();
    const config: FlowConfig = {
      id: `flow_${Date.now()}`,
      name: values.name || `Flow_${stateName}_${Date.now()}`,
      executionType,
      flowType,
      endType: generateEvent ? 'event' : 'wait_external',
      triggerEvents: selectedEvents,
      isConfigured: true,
    };

    if (generateEvent) {
      config.eventConfigs = [{
        conditions: eventConditions.filter(c => c.field),
        defaultAction: 'skip',
        defaultValue: '',
      }];
    }

    onSave(config);
  };

  const isLoopFlow = executionType === 'loop';

  return (
    <Modal
      title={<Space>
        <span>Configure Flow for State:</span>
        <Text strong style={{ color: '#22c55e' }}>{stateName}</Text>
      </Space>}
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

        {/* Execution Type */}
        <Form.Item label="Execution Type">
          <Radio.Group
            value={executionType}
            onChange={(e) => setExecutionType(e.target.value)}
            style={{ display: 'flex', flexDirection: 'column', gap: 8 }}
          >
            <Radio value="single">
              <div>
                <Text strong>Single Execution</Text>
                <Text type="secondary" style={{ fontSize: 11, display: 'block' }}>
                  Execute the flow once
                </Text>
              </div>
            </Radio>
            <Radio value="loop">
              <div>
                <Text strong>Loop Execution</Text>
                <Text type="secondary" style={{ fontSize: 11, display: 'block' }}>
                  Execute the flow repeatedly
                </Text>
              </div>
            </Radio>
          </Radio.Group>
        </Form.Item>

        {/* Flow Type */}
        <Form.Item label="Flow Type">
          <Radio.Group
            value={flowType}
            onChange={(e) => setFlowType(e.target.value)}
            style={{ display: 'flex', flexDirection: 'column', gap: 8 }}
          >
            <Radio value="forward">
              <div>
                <Text strong>Forward</Text>
                <Text type="secondary" style={{ fontSize: 11, display: 'block' }}>
                  Forward flow execution
                </Text>
              </div>
            </Radio>
            <Radio value="backward">
              <div>
                <Text strong>Backward</Text>
                <Text type="secondary" style={{ fontSize: 11, display: 'block' }}>
                  Backward flow execution (callback/requery)
                </Text>
              </div>
            </Radio>
          </Radio.Group>
        </Form.Item>

        {/* Loop indicator */}
        {isLoopFlow && (
          <div style={{
            padding: '8px 12px',
            background: '#fff7e6',
            border: '1px solid #ffd591',
            borderRadius: 4,
            marginBottom: 16,
            fontSize: 12,
            color: '#fa8c16'
          }}>
            <Tag color="orange" style={{ marginRight: 8 }}>Loop</Tag>
            This is a loop execution flow
          </div>
        )}

        <Divider />

        {/* Generate Event Option */}
        <Form.Item label="Flow End Type">
          <Radio.Group
            value={generateEvent ? 'event' : 'none'}
            onChange={(e) => setGenerateEvent(e.target.value === 'event')}
            style={{ display: 'flex', flexDirection: 'column', gap: 8 }}
          >
            <Radio value="event">
              <div>
                <Text strong>Generate Event</Text>
                <Text type="secondary" style={{ fontSize: 11, display: 'block' }}>
                  End flow by generating one or more events based on conditions
                </Text>
              </div>
            </Radio>
            <Radio value="none">
              <div>
                <Text strong>No Event</Text>
                <Text type="secondary" style={{ fontSize: 11, display: 'block' }}>
                  End flow without generating any event
                </Text>
              </div>
            </Radio>
          </Radio.Group>
        </Form.Item>

        {/* Event Condition Configuration - only show if generateEvent is true */}
        {generateEvent && (
          <div style={{ background: '#fafafa', padding: 16, borderRadius: 8, marginBottom: 16 }}>
            <Text strong style={{ fontSize: 12, display: 'block', marginBottom: 12 }}>
              Event Generation Rules
            </Text>
            <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 12 }}>
              Configure conditions that determine what events to generate
            </Text>
            <div style={{ marginBottom: 12 }}>
              {eventConditions.map((cond, idx) => (
                <div key={cond.id} style={{ marginBottom: 12, padding: 12, background: '#fff', borderRadius: 6, border: '1px solid #e8e8e8' }}>
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
                    {eventConditions.length > 1 && (
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
                      style={{ width: 160 }}
                      allowClear
                    >
                      {fieldSourceOptions.map(opt => (
                        <Select.Option key={opt.value} value={opt.value}>{opt.label}</Select.Option>
                      ))}
                    </Select>
                    <Select
                      value={cond.operator}
                      onChange={(val) => handleUpdateCondition(idx, { operator: val })}
                      style={{ width: 80 }}
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
                        style={{ width: 100 }}
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
          </div>
        )}

        {/* No Event - show info message */}
        {!generateEvent && (
          <div style={{
            padding: '8px 12px',
            background: '#f6ffed',
            border: '1px solid #b7eb8f',
            borderRadius: 4,
            marginBottom: 16,
            fontSize: 12,
            color: '#52c41a'
          }}>
            Flow will end without generating any event
          </div>
        )}

        {/* Trigger Events for new flow (if there are existing flows with events) */}
        {existingFlows.length > 0 && availableEvents.length > 0 && (
          <>
            <Divider />
            <Form.Item label="Trigger Events (for new flow)">
              <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 8 }}>
                Select events from previous flows that trigger this flow
              </Text>
              <Select
                mode="multiple"
                placeholder="Select trigger events"
                value={selectedEvents}
                onChange={setSelectedEvents}
                style={{ width: '100%' }}
                allowClear
              >
                {availableEvents.map(evt => (
                  <Select.Option key={evt} value={evt}>
                    <Tag color="blue">{evt}</Tag>
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>
          </>
        )}
      </Form>
    </Modal>
  );
}
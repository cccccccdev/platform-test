import { useState, useEffect } from 'react';
import { Modal, Form, Input, Select, Radio, Button, Space, Typography, Divider, Tag } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import type { FlowConfig, ExecutionType, FlowType, EventCondition, FlowEvent } from './types';

const { Text } = Typography;

interface FlowConfigModalProps {
  visible: boolean;
  stateName: string;
  existingFlows: FlowConfig[];
  availableEvents: string[];
  editingFlow?: FlowConfig | null; // If provided, we're editing an existing flow
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
  editingFlow,
  onSave,
  onNext,
  onCancel,
}: FlowConfigModalProps) {
  const [form] = Form.useForm();
  const [executionType, setExecutionType] = useState<ExecutionType>('single');
  const [flowType, setFlowType] = useState<FlowType>('outbound');
  const [generateEvent, setGenerateEvent] = useState(true);
  const [events, setEvents] = useState<FlowEvent[]>([
    { id: '1', eventName: '', conditions: [{ id: 'c1', field: '', operator: '==', value: '', logic: 'AND' }] }
  ]);
  const [selectedEvents, setSelectedEvents] = useState<string[]>([]);

  useEffect(() => {
    if (visible) {
      form.resetFields();
      setExecutionType('single');
      setFlowType('outbound');
      setGenerateEvent(true);
      setEvents([{ id: '1', eventName: '', conditions: [{ id: 'c1', field: '', operator: '==', value: '', logic: 'AND' }] }]);
      setSelectedEvents([]);
    }
  }, [visible, form]);

  const handleAddEvent = () => {
    setEvents([
      ...events,
      { id: String(Date.now()), eventName: '', conditions: [{ id: 'c1', field: '', operator: '==', value: '', logic: 'AND' }] }
    ]);
  };

  const handleRemoveEvent = (eventId: string) => {
    setEvents(events.filter(e => e.id !== eventId));
  };

  const handleUpdateEventName = (eventId: string, eventName: string) => {
    setEvents(events.map(e => e.id === eventId ? { ...e, eventName } : e));
  };

  const handleAddConditionToEvent = (eventId: string) => {
    setEvents(events.map(e => {
      if (e.id === eventId) {
        return {
          ...e,
          conditions: [...e.conditions, { id: String(Date.now()), field: '', operator: '==', value: '', logic: 'AND' }]
        };
      }
      return e;
    }));
  };

  const handleUpdateCondition = (eventId: string, condIndex: number, updates: Partial<EventCondition>) => {
    setEvents(events.map(e => {
      if (e.id === eventId) {
        const newConditions = [...e.conditions];
        newConditions[condIndex] = { ...newConditions[condIndex], ...updates };
        return { ...e, conditions: newConditions };
      }
      return e;
    }));
  };

  const handleRemoveCondition = (eventId: string, condIndex: number) => {
    setEvents(events.map(e => {
      if (e.id === eventId) {
        return { ...e, conditions: e.conditions.filter((_, i) => i !== condIndex) };
      }
      return e;
    }));
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
      // Filter events that have event name configured and at least one condition field
      const validEvents = events.filter(e => e.eventName && e.conditions.some(c => c.field));
      config.events = validEvents;
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
            <Radio value="outbound">
              <div>
                <Text strong>Outbound</Text>
                <Text type="secondary" style={{ fontSize: 11, display: 'block' }}>
                  Outbound flow execution (request/response)
                </Text>
              </div>
            </Radio>
            <Radio value="inbound">
              <div>
                <Text strong>Inbound</Text>
                <Text type="secondary" style={{ fontSize: 11, display: 'block' }}>
                  Inbound flow execution (callback/requery)
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

        {/* Event Configuration - only show if generateEvent is true */}
        {generateEvent && (
          <div style={{ background: '#fafafa', padding: 16, borderRadius: 8, marginBottom: 16 }}>
            <Text strong style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>
              Event Generation Rules
            </Text>
            <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 12 }}>
              Configure events to generate when conditions match. Multiple events can be configured.
            </Text>

            {events.map((event, eventIdx) => (
              <div key={event.id} style={{ marginBottom: 16, padding: 12, background: '#fff', borderRadius: 6, border: '1px solid #e8e8e8' }}>
                {/* Event Header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                  <Tag color="blue" style={{ fontSize: 11 }}>Event {eventIdx + 1}</Tag>
                  <Input
                    placeholder="Event name (e.g., payment_success)"
                    value={event.eventName}
                    onChange={(e) => handleUpdateEventName(event.id, e.target.value)}
                    style={{ flex: 1, fontSize: 12 }}
                  />
                  {events.length > 1 && (
                    <Button
                      type="text"
                      size="small"
                      danger
                      icon={<DeleteOutlined />}
                      onClick={() => handleRemoveEvent(event.id)}
                    />
                  )}
                </div>

                {/* Conditions for this event */}
                <div style={{ marginBottom: 8 }}>
                  {event.conditions.map((cond, condIdx) => (
                    <div key={cond.id} style={{ marginBottom: 8, padding: 8, background: '#fafafa', borderRadius: 4 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                        <Text type="secondary" style={{ fontSize: 10 }}>Condition {condIdx + 1}</Text>
                        {condIdx > 0 && (
                          <Select
                            size="small"
                            value={cond.logic}
                            onChange={(val) => handleUpdateCondition(event.id, condIdx, { logic: val })}
                            style={{ width: 60 }}
                          >
                            <Select.Option value="AND">AND</Select.Option>
                            <Select.Option value="OR">OR</Select.Option>
                          </Select>
                        )}
                        {event.conditions.length > 1 && (
                          <Button
                            type="text"
                            size="small"
                            danger
                            icon={<DeleteOutlined />}
                            onClick={() => handleRemoveCondition(event.id, condIdx)}
                          />
                        )}
                      </div>
                      <Space direction="horizontal" size={6}>
                        <Select
                          placeholder="Field"
                          value={cond.field}
                          onChange={(val) => handleUpdateCondition(event.id, condIdx, { field: val })}
                          style={{ width: 140 }}
                          allowClear
                        >
                          {fieldSourceOptions.map(opt => (
                            <Select.Option key={opt.value} value={opt.value}>{opt.label}</Select.Option>
                          ))}
                        </Select>
                        <Select
                          value={cond.operator}
                          onChange={(val) => handleUpdateCondition(event.id, condIdx, { operator: val })}
                          style={{ width: 70 }}
                        >
                          {operatorOptions.map(op => (
                            <Select.Option key={op.value} value={op.value}>{op.label}</Select.Option>
                          ))}
                        </Select>
                        {!['isEmpty', 'isNotEmpty'].includes(cond.operator) && (
                          <Input
                            placeholder="Value"
                            value={cond.value}
                            onChange={(e) => handleUpdateCondition(event.id, condIdx, { value: e.target.value })}
                            style={{ width: 90 }}
                          />
                        )}
                      </Space>
                    </div>
                  ))}
                  <Button
                    type="link"
                    size="small"
                    icon={<PlusOutlined />}
                    onClick={() => handleAddConditionToEvent(event.id)}
                    style={{ fontSize: 11, padding: '0 0' }}
                  >
                    + Add Condition
                  </Button>
                </div>
              </div>
            ))}

            <Button
              type="dashed"
              size="small"
              icon={<PlusOutlined />}
              onClick={handleAddEvent}
              block
            >
              + Add Event
            </Button>
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

        {/* Trigger Events - only show for new flows when there are existing flows */}
        {existingFlows.length > 0 && !editingFlow && (
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
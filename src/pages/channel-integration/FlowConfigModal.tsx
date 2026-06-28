import { useState, useEffect } from 'react';
import { Modal, Form, Input, Select, Radio, Button, Space, Typography, Tooltip } from 'antd';
import { QuestionCircleOutlined } from '@ant-design/icons';
import { useParams } from 'react-router-dom';
import { useMatchCapabilityStore } from './matchCapabilityStore';
import type { FlowConfig, TriggerType } from './types';

const { Text } = Typography;

// Trigger Type options with descriptions
const triggerTypeOptions = [
  {
    value: 'UPSTREAM_TRIGGERED',
    label: 'UPSTREAM_TRIGGERED',
    labelCn: '上游触发',
    description: '由内部上游系统调用网关触发，通常用于内部业务请求发起的正向交易、验证或查询类 Flow。',
  },
  {
    value: 'EXTERNAL_INBOUND_TRIGGERED',
    label: 'EXTERNAL_INBOUND_TRIGGERED',
    labelCn: '外部触发',
    description: '特指 Inbound 类型，完全由外部系统发起的一笔新的业务请求，不依赖前序 Outbound 请求。',
  },
  {
    value: 'CALLBACK_TRIGGERED',
    label: 'CALLBACK_TRIGGERED',
    labelCn: 'CALLBACK 触发',
    description: '特指存在前序 Outbound 请求的前提下，外部渠道发来对应回调请求，用于处理原请求的异步结果或后续通知。',
  },
  {
    value: 'ASYNC_TRIGGERED',
    label: 'ASYNC_TRIGGERED',
    labelCn: '异步触发',
    description: '特指由前序 Flow 中的 asyncExecuteFlow 组件异步触发的 Flow。',
  },
  {
    value: 'SCHEDULED_TRIGGERED',
    label: 'SCHEDULED_TRIGGERED',
    labelCn: '定时任务触发',
    description: '特指由平台定时任务触发的 Flow，主要用于重查询 Flow。',
  },
];

// All available actions for Trigger Action / Original Request Action
const triggerActionOptions = [
  { value: 'TRANSACTION', label: 'TRANSACTION' },
  { value: 'QUERY', label: 'QUERY' },
  { value: 'VERIFY', label: 'VERIFY' },
  { value: 'CANCEL', label: 'CANCEL' },
  { value: 'REVERSAL', label: 'REVERSAL' },
  { value: 'INBOUND_TRANSACTION', label: 'INBOUND_TRANSACTION' },
  { value: 'INBOUND_QUERY', label: 'INBOUND_QUERY' },
];

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

export default function FlowConfigModal({
  visible,
  stateName: _stateName,
  existingFlows,
  availableEvents: _availableEvents,
  editingFlow: _editingFlow,
  onSave,
  onCancel,
}: FlowConfigModalProps) {
  const [form] = Form.useForm();
  const { channelCode = '' } = useParams<{ channelCode: string }>();
  const inboundUris = useMatchCapabilityStore((state) =>
    (state.endpointsByChannel[channelCode] ?? []).filter((endpoint) => endpoint.uriType === 'new')
  );
  const [triggerType, setTriggerType] = useState<string>('UPSTREAM_TRIGGERED');
  const [hasChanges, setHasChanges] = useState(false);

  // Get Reference Action options from existing flows
  const referenceActionOptions = existingFlows
    .filter(f => f.triggerType === 'UPSTREAM_TRIGGERED' || f.triggerType === 'EXTERNAL_INBOUND_TRIGGERED')
    .flatMap(f => f.triggerEvents || [])
    .filter((v, i, a) => a.indexOf(v) === i)
    .map(v => ({ value: v, label: v }));

  // Get Original Request Action options from existing flows
  const originalRequestActionOptions = existingFlows
    .filter(f => f.triggerType === 'UPSTREAM_TRIGGERED')
    .flatMap(f => f.triggerEvents || [])
    .filter((v, i, a) => a.indexOf(v) === i)
    .map(v => ({ value: v, label: v }));

  useEffect(() => {
    if (visible) {
      form.resetFields();
      setTriggerType('UPSTREAM_TRIGGERED');
      setHasChanges(false);
    }
  }, [visible, form]);

  // Check if flow name is unique
  const isFlowNameUnique = (name: string) => {
    return !existingFlows.some(f => f.name === name);
  };

  const handleTriggerTypeChange = (e: any) => {
    setTriggerType(e.target.value);
    form.setFieldValue('triggerAction', undefined);
    form.setFieldValue('originalRequestAction', undefined);
    form.setFieldValue('referenceActions', undefined);
    form.setFieldValue('triggerSubState', undefined);
    form.setFieldValue('inboundUriId', undefined);
  };

  const handleValuesChange = () => {
    setHasChanges(true);
  };

  const handleClose = () => {
    if (hasChanges) {
      Modal.confirm({
        title: 'Discard Changes',
        content: 'You have unsaved changes. Are you sure you want to discard them?',
        okText: 'Discard',
        cancelText: 'Cancel',
        onOk: () => onCancel(),
      });
    } else {
      onCancel();
    }
  };

  const handleAdd = () => {
    form.validateFields().then((values) => {
      if (!isFlowNameUnique(values.flowName)) {
        form.setFields([
          { name: 'flowName', errors: ['Flow Name already exists in this version'] },
        ]);
        return;
      }

      const config: FlowConfig = {
        id: `flow_${Date.now()}`,
        name: values.flowName,
        executionType: 'single',
        flowType:
          triggerType === 'EXTERNAL_INBOUND_TRIGGERED' || triggerType === 'CALLBACK_TRIGGERED'
            ? 'inbound'
            : 'outbound',
        endType: 'wait_external',
        triggerType: triggerType as TriggerType,
        // Ensure triggerEvents is always an array
        triggerEvents: Array.isArray(values.triggerAction) ? values.triggerAction : values.triggerAction ? [values.triggerAction] : Array.isArray(values.originalRequestAction) ? values.originalRequestAction : values.originalRequestAction ? [values.originalRequestAction] : [],
        contextActions: values.referenceActions || [],
        inboundUriId: values.inboundUriId,
        isConfigured: false,
      };

      onSave(config);
      onCancel();
    });
  };

  const renderDynamicFields = () => {
    switch (triggerType) {
      case 'UPSTREAM_TRIGGERED':
        return (
          <Form.Item name="triggerAction" label="Trigger Action" rules={[{ required: true, message: 'Please select Trigger Action' }]}>
            <Select placeholder="Select action" options={triggerActionOptions} />
          </Form.Item>
        );

      case 'EXTERNAL_INBOUND_TRIGGERED':
        return (<>
          <Form.Item name="inboundUriId" label="Inbound URI" rules={[{ required: true, message: 'Select Match Capability URI' }]}>
            <Select placeholder="Select a stable URI ID" options={inboundUris.map((endpoint) => ({ value: endpoint.id, label: `${endpoint.method} ${endpoint.url}` }))} />
          </Form.Item>
          <Form.Item
            name="triggerAction"
            label="Trigger Action"
            rules={[{ required: true, message: 'Please select Trigger Action' }]}
          >
            <Select placeholder="Select action">
              {triggerActionOptions.map(opt => (
                <Select.Option key={opt.value} value={opt.value}>
                  {opt.label}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
        </>);

      case 'CALLBACK_TRIGGERED':
        return (<>
          <Form.Item name="inboundUriId" label="Inbound URI" rules={[{ required: true, message: 'Select Match Capability URI' }]}>
            <Select placeholder="Select a stable URI ID" options={inboundUris.map((endpoint) => ({ value: endpoint.id, label: `${endpoint.method} ${endpoint.url}` }))} />
          </Form.Item>
          <Form.Item
            name="originalRequestAction"
            label="Original Request Action"
            rules={[{ required: true, message: 'Please select Original Request Action' }]}
          >
            <Select placeholder="Select action">
              {originalRequestActionOptions.map(opt => (
                  <Select.Option key={opt.value} value={opt.value}>
                    {opt.label}
                  </Select.Option>
                ))}
            </Select>
          </Form.Item>
        </>);

      case 'ASYNC_TRIGGERED':
        return (
          <Form.Item
            name="referenceActions"
            label="Reference Action"
            rules={[{ required: true, message: 'Please select Reference Action' }]}
          >
            <Select mode="multiple" placeholder="Select action(s)">
              {referenceActionOptions.map(opt => (
                  <Select.Option key={opt.value} value={opt.value}>
                    {opt.label}
                  </Select.Option>
                ))}
            </Select>
          </Form.Item>
        );

      case 'SCHEDULED_TRIGGERED':
        return (
          <Form.Item
            name="referenceActions"
            label="Context Action"
            rules={[{ required: true, message: 'Please select Context Action' }]}
          >
            <Select mode="multiple" placeholder="Select action(s)">
              {referenceActionOptions.map(opt => (
                <Select.Option key={opt.value} value={opt.value}>
                  {opt.label}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
        );

      default:
        return null;
    }
  };

  return (
    <Modal
      title="New Flow"
      open={visible}
      onCancel={handleClose}
      footer={[
        <Button key="cancel" onClick={handleClose}>
          Cancel
        </Button>,
        <Button key="add" type="primary" onClick={handleAdd}>
          Add
        </Button>,
      ]}
      width={600}
      closeIcon={<span />}
    >
      <Form
        form={form}
        layout="vertical"
        style={{ marginTop: 16 }}
        onValuesChange={handleValuesChange}
      >
        {/* Flow Name */}
        <Form.Item
          name="flowName"
          label="Flow Name"
          rules={[
            { required: true, message: 'Please enter Flow Name' },
            { validator: (_, value) => isFlowNameUnique(value) ? Promise.resolve() : Promise.reject('Flow Name already exists') },
          ]}
        >
          <Input placeholder="Enter Flow Name" />
        </Form.Item>

        {/* Trigger Type */}
        <Form.Item
          label={
            <Space>
              Trigger Type
              <span style={{ color: '#ff4d4f' }}>*</span>
            </Space>
          }
        >
          <Radio.Group
            value={triggerType}
            onChange={handleTriggerTypeChange}
            style={{ display: 'flex', flexDirection: 'column', gap: 12 }}
          >
            {triggerTypeOptions.map(opt => (
              <Radio key={opt.value} value={opt.value} style={{ height: 'auto', padding: '8px 0' }}>
                <Space>
                  <Text>{opt.label}</Text>
                  <Text type="secondary">({opt.labelCn})</Text>
                  <Tooltip title={opt.description}>
                    <QuestionCircleOutlined style={{ color: '#999' }} />
                  </Tooltip>
                </Space>
              </Radio>
            ))}
          </Radio.Group>
        </Form.Item>

        {/* Dynamic Fields */}
        {renderDynamicFields()}
      </Form>
    </Modal>
  );
}

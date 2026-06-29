import { useState, useEffect, useMemo } from 'react';
import { message, Modal, Form, Input, Select, Radio, Button, Space, Typography, Tooltip } from 'antd';
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

interface FlowConfigModalProps {
  visible: boolean;
  stateName: string;
  existingFlows: FlowConfig[];
  availableEvents: string[];
  availableActions: string[];
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
  availableActions,
  editingFlow: _editingFlow,
  onSave,
  onCancel,
}: FlowConfigModalProps) {
  const [form] = Form.useForm();
  const { channelCode = '' } = useParams<{ channelCode: string }>();
  const endpointsByChannel = useMatchCapabilityStore((state) => state.endpointsByChannel);
  const inboundUris = useMemo(
    () => (endpointsByChannel[channelCode] ?? []).filter((endpoint) => endpoint.uriType === 'new'),
    [channelCode, endpointsByChannel]
  );
  const [triggerType, setTriggerType] = useState<string>('UPSTREAM_TRIGGERED');
  const [hasChanges, setHasChanges] = useState(false);

  const actionSelectOptions = availableActions.map((a) => ({ value: a, label: a }));

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

  const validateActionsInAvailable = (actions: string[]): string | null => {
    const invalid = actions.filter((a) => !availableActions.includes(a));
    if (invalid.length > 0) {
      return `Action(s) ${invalid.join(', ')} are not in the available Actions for this Ability. Please add them via Config Integration first.`;
    }
    return null;
  };

  const handleAdd = () => {
    form.validateFields().then((values) => {
      if (!isFlowNameUnique(values.flowName)) {
        form.setFields([
          { name: 'flowName', errors: ['Flow Name already exists in this version'] },
        ]);
        return;
      }

      const selectedActions: string[] = [];
      if (values.triggerAction) {
        selectedActions.push(...(Array.isArray(values.triggerAction) ? values.triggerAction : [values.triggerAction]));
      }
      if (values.originalRequestAction) {
        selectedActions.push(...(Array.isArray(values.originalRequestAction) ? values.originalRequestAction : [values.originalRequestAction]));
      }
      if (values.referenceActions) {
        selectedActions.push(...values.referenceActions);
      }

      const validationError = validateActionsInAvailable(selectedActions);
      if (validationError) {
        message.error(validationError);
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

  const emptyActions = availableActions.length === 0;
  const placeholderText = emptyActions ? 'No Actions available – add Actions via Config Integration' : 'Select action';

  const renderDynamicFields = () => {
    switch (triggerType) {
      case 'UPSTREAM_TRIGGERED':
        return (
          <Form.Item name="triggerAction" label="Trigger Action" rules={[{ required: true, message: 'Please select Trigger Action' }]}>
            <Select placeholder={placeholderText} disabled={emptyActions} options={actionSelectOptions} />
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
            <Select placeholder={placeholderText} disabled={emptyActions} options={actionSelectOptions} />
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
            <Select placeholder={placeholderText} disabled={emptyActions} options={actionSelectOptions} />
          </Form.Item>
        </>);

      case 'ASYNC_TRIGGERED':
        return (
          <Form.Item
            name="referenceActions"
            label="Reference Action"
            rules={[{ required: true, message: 'Please select Reference Action' }]}
          >
            <Select mode="multiple" placeholder={placeholderText} disabled={emptyActions} options={actionSelectOptions} />
          </Form.Item>
        );

      case 'SCHEDULED_TRIGGERED':
        return (
          <Form.Item
            name="referenceActions"
            label="Context Action"
            rules={[{ required: true, message: 'Please select Context Action' }]}
          >
            <Select mode="multiple" placeholder={placeholderText} disabled={emptyActions} options={actionSelectOptions} />
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

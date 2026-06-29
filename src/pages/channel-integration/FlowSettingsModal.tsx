import { useState, useEffect } from 'react';
import { message, Modal, Form, Input, Select, Radio, Button, Space, Typography, Tooltip } from 'antd';
import { QuestionCircleOutlined } from '@ant-design/icons';
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

// State Machine states for Trigger Sub-state
const stateMachineStates = [
  { value: 'INIT', label: 'INIT' },
  { value: 'WAITING_OTP', label: 'WAITING_OTP' },
  { value: 'VERIFYING_OTP', label: 'VERIFYING_OTP' },
  { value: 'AUTHENTICATING', label: 'AUTHENTICATING' },
  { value: 'PROGRESSING', label: 'PROGRESSING' },
  { value: 'SUCCESS', label: 'SUCCESS' },
  { value: 'FAILED', label: 'FAILED' },
];

interface FlowSettingsModalProps {
  visible: boolean;
  flow: FlowConfig | null;
  availableActions: string[];
  onSave: (config: FlowConfig) => void;
  onCancel: () => void;
}

export default function FlowSettingsModal({
  visible,
  flow,
  availableActions,
  onSave,
  onCancel,
}: FlowSettingsModalProps) {
  const [form] = Form.useForm();
  const [triggerType, setTriggerType] = useState<string>('UPSTREAM_TRIGGERED');
  const [hasChanges, setHasChanges] = useState(false);
  const [showChangeWarning, setShowChangeWarning] = useState(false);
  const [pendingTriggerType, setPendingTriggerType] = useState<string | null>(null);

  const actionSelectOptions = availableActions.map((a) => ({ value: a, label: a }));

  useEffect(() => {
    if (visible && flow) {
      form.setFieldsValue({
        flowName: flow.name,
        triggerAction: flow.triggerEvents?.[0] || undefined,
        originalRequestAction: flow.triggerEvents?.[0] || undefined,
        referenceActions: flow.outputEvents?.map(e => e.eventName) || [],
        triggerSubState: flow.stateConditions?.[0]?.value || undefined,
      });
      setTriggerType(flow.triggerType || 'UPSTREAM_TRIGGERED');
      setHasChanges(false);
    }
  }, [visible, flow, form]);

  const handleValuesChange = () => {
    setHasChanges(true);
  };

  const handleTriggerTypeChange = (e: any) => {
    const newType = e.target.value;
    // Show warning when changing trigger type that affects SPI
    if (newType !== triggerType) {
      setPendingTriggerType(newType);
      setShowChangeWarning(true);
    }
  };

  const handleWarningConfirm = () => {
    if (pendingTriggerType) {
      setTriggerType(pendingTriggerType);
      form.setFieldValue('triggerAction', undefined);
      form.setFieldValue('originalRequestAction', undefined);
      form.setFieldValue('referenceActions', undefined);
      form.setFieldValue('triggerSubState', undefined);
      setHasChanges(true);
    }
    setShowChangeWarning(false);
    setPendingTriggerType(null);
  };

  const handleWarningCancel = () => {
    setShowChangeWarning(false);
    setPendingTriggerType(null);
  };

  const handleActionChange = (fieldName: string, _newAction: string, isRemoving?: boolean) => {
    if (isRemoving) {
      setPendingTriggerType(fieldName === 'triggerAction' ? triggerType : triggerType);
      setShowChangeWarning(true);
    } else {
      setHasChanges(true);
    }
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

  const handleConfirm = () => {
    form.validateFields().then((values) => {
      if (!flow) return;

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

      const invalid = selectedActions.filter((a) => !availableActions.includes(a));
      if (invalid.length > 0) {
        message.error(`Action(s) ${invalid.join(', ')} are not in the available Actions for this Ability. Please add them via Config Integration first.`);
        return;
      }

      const updatedConfig: FlowConfig = {
        ...flow,
        name: values.flowName,
        triggerType: triggerType as TriggerType,
        triggerEvents: Array.isArray(values.triggerAction) ? values.triggerAction :
          values.triggerAction ? [values.triggerAction] :
          Array.isArray(values.originalRequestAction) ? values.originalRequestAction :
          values.originalRequestAction ? [values.originalRequestAction] : [],
        outputEvents: values.referenceActions?.map((action: string) => ({ eventName: action })) || [],
        stateConditions: values.triggerSubState ? [{ id: '1', field: 'state', operator: '==', value: values.triggerSubState }] : [],
      };

      onSave(updatedConfig);
      onCancel();
    });
  };

  const renderDynamicFields = () => {
    const emptyActions = availableActions.length === 0;
    const placeholderText = emptyActions ? 'No Actions available' : 'Select action';

    switch (triggerType) {
      case 'UPSTREAM_TRIGGERED':
      case 'EXTERNAL_INBOUND_TRIGGERED':
        return (
          <Form.Item
            name="triggerAction"
            label="Trigger Action"
            rules={[{ required: true, message: 'Please select Trigger Action' }]}
          >
            <Select
              placeholder={placeholderText}
              disabled={emptyActions}
              options={actionSelectOptions}
              onChange={() => handleActionChange('triggerAction', '', false)}
            />
          </Form.Item>
        );

      case 'CALLBACK_TRIGGERED':
        return (
          <Form.Item
            name="originalRequestAction"
            label="Original Request Action"
            rules={[{ required: true, message: 'Please select Original Request Action' }]}
          >
            <Select
              placeholder={placeholderText}
              disabled={emptyActions}
              options={actionSelectOptions}
              onChange={() => handleActionChange('originalRequestAction', '', false)}
            />
          </Form.Item>
        );

      case 'ASYNC_TRIGGERED':
        return (
          <Form.Item
            name="referenceActions"
            label="Reference Action"
            rules={[{ required: true, message: 'Please select Reference Action' }]}
          >
            <Select
              mode="multiple"
              placeholder={placeholderText}
              disabled={emptyActions}
              options={actionSelectOptions}
              onChange={(values) => {
                const currentValues = form.getFieldValue('referenceActions') || [];
                const isRemoving = values.length < currentValues.length;
                if (isRemoving) {
                  handleActionChange('referenceActions', '', true);
                } else {
                  setHasChanges(true);
                }
              }}
            />
          </Form.Item>
        );

      case 'SCHEDULED_TRIGGERED':
        return (
          <>
            <Form.Item
              name="triggerSubState"
              label="Trigger Sub-state"
              rules={[{ required: true, message: 'Please select Trigger Sub-state' }]}
            >
              <Select
                placeholder="Select sub-state"
                onChange={() => setHasChanges(true)}
              >
                {stateMachineStates.map(opt => (
                  <Select.Option key={opt.value} value={opt.value}>
                    {opt.label}
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>
            <Form.Item
              name="referenceActions"
              label="Reference Action"
              rules={[{ required: true, message: 'Please select Reference Action' }]}
            >
              <Select
                mode="multiple"
                placeholder={placeholderText}
                disabled={emptyActions}
                options={actionSelectOptions}
                onChange={(values) => {
                  const currentValues = form.getFieldValue('referenceActions') || [];
                  const isRemoving = values.length < currentValues.length;
                  if (isRemoving) {
                    handleActionChange('referenceActions', '', true);
                  } else {
                    setHasChanges(true);
                  }
                }}
              />
            </Form.Item>
          </>
        );

      default:
        return null;
    }
  };

  if (!flow) return null;

  return (
    <>
      <Modal
        title="Flow Settings"
        open={visible}
        onCancel={handleClose}
        footer={[
          <Button key="cancel" onClick={handleClose}>
            Cancel
          </Button>,
          <Button key="confirm" type="primary" onClick={handleConfirm}>
            Confirm
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
          {/* Flow ID - read only */}
          <Form.Item label="Flow ID">
            <Input value={flow.id} disabled />
          </Form.Item>

          {/* Flow Name */}
          <Form.Item
            name="flowName"
            label="Flow Name"
            rules={[{ required: true, message: 'Please enter Flow Name' }]}
          >
            <Input placeholder="Enter Flow Name" />
          </Form.Item>

          {/* Trigger Type */}
          <Form.Item label={<Space>Trigger Type<span style={{ color: '#ff4d4f' }}>*</span></Space>}>
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

      {/* Change Warning Modal */}
      <Modal
        title="Warning"
        open={showChangeWarning}
        onCancel={handleWarningCancel}
        footer={[
          <Button key="cancel" onClick={handleWarningCancel}>
            Cancel
          </Button>,
          <Button key="confirm" type="primary" danger onClick={handleWarningConfirm}>
            Confirm
          </Button>,
        ]}
        width={500}
      >
        <div style={{ padding: '8px 0' }}>
          <p style={{ marginBottom: 16 }}>
            You are about to change the Trigger Type or remove an Action.
          </p>
          <p style={{ marginBottom: 16 }}>
            This action will clear all existing component configurations in this Flow. You will need to reconfigure the components after saving.
          </p>
          <p>
            If you do not want to lose your current configuration, click Cancel and keep your existing setup.
          </p>
        </div>
      </Modal>
    </>
  );
}

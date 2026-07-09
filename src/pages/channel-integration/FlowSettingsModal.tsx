import { useState, useEffect, useMemo } from 'react';
import { Alert, message, Modal, Form, Input, Select, Radio, Button, Space, Typography, Tooltip } from 'antd';
import { QuestionCircleOutlined } from '@ant-design/icons';
import type { FlowConfig, TriggerType } from './types';
import { ACTION_HELP, getActionsForTrigger, TRIGGER_TYPE_DESCRIPTIONS } from './flowTemplates';
import { useParams } from 'react-router-dom';
import { useMatchCapabilityStore } from './matchCapabilityStore';

const { Text } = Typography;

const firstValue = (value?: string | string[]) => Array.isArray(value) ? value[0] : value;
const triggerActionOf = (flow: FlowConfig) => flow.triggerEvents?.[0] ?? flow.contextActions?.[0];
const triggerSubStateOf = (flow: FlowConfig) => flow.stateConditions?.find((condition) => condition.field === 'subState')?.value;

// Trigger Type options with descriptions
const triggerTypeOptions = [
  {
    value: 'UPSTREAM_TRIGGERED',
    label: 'UPSTREAM_TRIGGERED',
    labelCn: '上游触发',
    description: TRIGGER_TYPE_DESCRIPTIONS.UPSTREAM_TRIGGERED,
  },
  {
    value: 'EXTERNAL_INBOUND_TRIGGERED',
    label: 'EXTERNAL_INBOUND_TRIGGERED',
    labelCn: '外部触发',
    description: TRIGGER_TYPE_DESCRIPTIONS.EXTERNAL_INBOUND_TRIGGERED,
  },
  {
    value: 'CALLBACK_TRIGGERED',
    label: 'CALLBACK_TRIGGERED',
    labelCn: 'CALLBACK 触发',
    description: TRIGGER_TYPE_DESCRIPTIONS.CALLBACK_TRIGGERED,
  },
  {
    value: 'ASYNC_TRIGGERED',
    label: 'ASYNC_TRIGGERED',
    labelCn: '异步触发',
    description: TRIGGER_TYPE_DESCRIPTIONS.ASYNC_TRIGGERED,
  },
  {
    value: 'REQUERY_TRIGGERED',
    label: 'REQUERY_TRIGGERED',
    labelCn: '重查触发',
    description: TRIGGER_TYPE_DESCRIPTIONS.REQUERY_TRIGGERED,
  },
];

interface FlowSettingsModalProps {
  visible: boolean;
  flow: FlowConfig | null;
  existingFlows: FlowConfig[];
  availableActions: string[];
  availableSubStates: string[];
  onSave: (config: FlowConfig) => void;
  onCancel: () => void;
}

export default function FlowSettingsModal({
  visible,
  flow,
  existingFlows,
  availableActions,
  availableSubStates,
  onSave,
  onCancel,
}: FlowSettingsModalProps) {
  const [form] = Form.useForm();
  const { channelCode = '' } = useParams<{ channelCode: string }>();
  const endpointsByChannel = useMatchCapabilityStore((state) => state.endpointsByChannel);
  const inboundUris = useMemo(() => endpointsByChannel[channelCode] ?? [], [channelCode, endpointsByChannel]);
  const [triggerType, setTriggerType] = useState<TriggerType>('UPSTREAM_TRIGGERED');
  const [hasChanges, setHasChanges] = useState(false);
  const [showChangeWarning, setShowChangeWarning] = useState(false);
  const [pendingTriggerType, setPendingTriggerType] = useState<string | null>(null);

  const eligibleActions = useMemo(() => {
    const currentAction = flow ? triggerActionOf(flow) : undefined;
    const usedBySameTrigger = new Set(existingFlows
      .filter((item) => item.id !== flow?.id && item.triggerType === triggerType)
      .map(triggerActionOf)
      .filter(Boolean));
    return getActionsForTrigger(triggerType, availableActions, existingFlows)
      .filter((action) => action === currentAction || !usedBySameTrigger.has(action));
  }, [triggerType, availableActions, existingFlows, flow]);
  const actionSelectOptions = eligibleActions.map((a) => ({ value: a, label: a }));
  const actionLabel = (label: string) => (
    <Space>{label}<Tooltip title={ACTION_HELP[triggerType as TriggerType]}><QuestionCircleOutlined style={{ color: '#999' }} /></Tooltip></Space>
  );

  useEffect(() => {
    if (visible && flow) {
      form.setFieldsValue({
        flowName: flow.name,
        triggerAction: flow.triggerEvents?.[0] || undefined,
        originalRequestAction: flow.triggerEvents?.[0] || undefined,
        referenceActions: flow.contextActions?.[0] || undefined,
        triggerSubState: flow.stateConditions?.[0]?.value || undefined,
        inboundUriId: flow.inboundUriId,
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
      setTriggerType(pendingTriggerType as TriggerType);
      form.setFieldValue('triggerAction', undefined);
      form.setFieldValue('originalRequestAction', undefined);
      form.setFieldValue('referenceActions', undefined);
      form.setFieldValue('triggerSubState', undefined);
      form.setFieldValue('inboundUriId', undefined);
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

  const validateFlowRouteKey = (values: any) => {
    if (!flow) return false;
    const action = firstValue(values.triggerAction) ?? firstValue(values.originalRequestAction) ?? firstValue(values.referenceActions);
    const uri = values.inboundUriId;
    const subState = values.triggerSubState;

    if ((triggerType === 'UPSTREAM_TRIGGERED' || triggerType === 'ASYNC_TRIGGERED') && action) {
      const duplicate = existingFlows.some((item) => item.id !== flow.id && item.triggerType === triggerType && triggerActionOf(item) === action);
      if (duplicate) {
        message.error('Action already exists for this Trigger Type in current Version.');
        return false;
      }
    }

    if ((triggerType === 'EXTERNAL_INBOUND_TRIGGERED' || triggerType === 'CALLBACK_TRIGGERED') && uri && action) {
      const duplicate = existingFlows.some((item) =>
        item.id !== flow.id &&
        (item.triggerType === 'EXTERNAL_INBOUND_TRIGGERED' || item.triggerType === 'CALLBACK_TRIGGERED') &&
        item.inboundUriId === uri &&
        triggerActionOf(item) === action
      );
      if (duplicate) {
        form.setFields([{ name: 'inboundUriId', errors: ['URI + Action already exists in current Version'] }]);
        return false;
      }
    }

    if (triggerType === 'REQUERY_TRIGGERED' && subState && action) {
      const duplicate = existingFlows.some((item) =>
        item.id !== flow.id &&
        item.triggerType === 'REQUERY_TRIGGERED' &&
        triggerSubStateOf(item) === subState &&
        triggerActionOf(item) === action
      );
      if (duplicate) {
        form.setFields([{ name: 'triggerSubState', errors: ['Sub-State + Action already exists in current Version'] }]);
        return false;
      }
    }

    return true;
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
        selectedActions.push(...(Array.isArray(values.referenceActions) ? values.referenceActions : [values.referenceActions]));
      }

      const invalid = selectedActions.filter((a) => !availableActions.includes(a));
      if (invalid.length > 0) {
        message.error(`Action(s) ${invalid.join(', ')} are not in the available Actions for this Ability. Please add them via Config Integration first.`);
        return;
      }
      if (!validateFlowRouteKey(values)) return;

      const updatedConfig: FlowConfig = {
        ...flow,
        name: values.flowName,
        triggerType: flow.triggerType,
        triggerEvents: Array.isArray(values.triggerAction) ? values.triggerAction :
          values.triggerAction ? [values.triggerAction] :
          Array.isArray(values.originalRequestAction) ? values.originalRequestAction :
          values.originalRequestAction ? [values.originalRequestAction] : [],
        contextActions: Array.isArray(values.referenceActions) ? values.referenceActions : values.referenceActions ? [values.referenceActions] : [],
        stateConditions: values.triggerSubState ? [{ id: 'trigger-sub-state', field: 'subState', operator: '==', value: values.triggerSubState }] : [],
        inboundUriId: values.inboundUriId,
        flowType: flow.triggerType === 'EXTERNAL_INBOUND_TRIGGERED' || flow.triggerType === 'CALLBACK_TRIGGERED' ? 'inbound' : 'outbound',
      };

      onSave(updatedConfig);
      onCancel();
    });
  };

  const renderDynamicFields = () => {
    const emptyActions = eligibleActions.length === 0;
    const placeholderText = emptyActions ? 'No eligible Actions available' : 'Select action';

    switch (triggerType) {
      case 'UPSTREAM_TRIGGERED':
        return (
          <Form.Item
            name="triggerAction"
            label={actionLabel('Trigger Action')}
            rules={[{ required: true, message: 'Please select Trigger Action' }]}
          >
            <Select
              placeholder={placeholderText}
              disabled
              options={actionSelectOptions}
              onChange={() => handleActionChange('triggerAction', '', false)}
            />
          </Form.Item>
        );

      case 'EXTERNAL_INBOUND_TRIGGERED':
        return <>
          <Form.Item name="inboundUriId" label="Inbound URI" rules={[{ required: true, message: 'Select Route Matching URI' }]}>
            <Select showSearch optionFilterProp="label" placeholder="Select an Inbound Endpoint from Route Matching" options={inboundUris.map((endpoint) => ({ value: endpoint.id, label: `${endpoint.method} ${endpoint.url}` }))} />
          </Form.Item>
          <Form.Item name="triggerAction" label={actionLabel('Trigger Action')} rules={[{ required: true, message: 'Please select Trigger Action' }]}>
            <Select placeholder={placeholderText} disabled options={actionSelectOptions} onChange={() => handleActionChange('triggerAction', '', false)} />
          </Form.Item>
        </>;

      case 'CALLBACK_TRIGGERED':
        return (<>
          <Form.Item name="inboundUriId" label="Inbound URI" rules={[{ required: true, message: 'Select Route Matching URI' }]}>
            <Select showSearch optionFilterProp="label" placeholder="Select an Inbound Endpoint from Route Matching" options={inboundUris.map((endpoint) => ({ value: endpoint.id, label: `${endpoint.method} ${endpoint.url}` }))} />
          </Form.Item>
          <Form.Item
            name="originalRequestAction"
            label={actionLabel('Original Request Action')}
            rules={[{ required: true, message: 'Please select Original Request Action' }]}
          >
            <Select
              placeholder={placeholderText}
              disabled
              options={actionSelectOptions}
              onChange={() => handleActionChange('originalRequestAction', '', false)}
            />
          </Form.Item>
        </>);

      case 'ASYNC_TRIGGERED':
        return (
          <Form.Item
            name="referenceActions"
            label={actionLabel('Reference Action')}
            rules={[{ required: true, message: 'Please select Reference Action' }]}
          >
            <Select
              placeholder={placeholderText}
              disabled
              options={actionSelectOptions}
              onChange={() => setHasChanges(true)}
            />
          </Form.Item>
        );

      case 'REQUERY_TRIGGERED':
        return (
          <>
            <Form.Item
              name="triggerSubState"
              label="Trigger Sub-State"
              rules={[
                { required: true, message: 'Please select Trigger Sub-State' },
                {
                  validator: (_, value) => !value || availableSubStates.includes(value)
                    ? Promise.resolve()
                    : Promise.reject(new Error('Trigger Sub-State is not available in the current State Machine')),
                },
              ]}
            >
              <Select
                placeholder={availableSubStates.length ? 'Select Trigger Sub-State' : 'No Sub-State available in the current State Machine'}
                disabled={availableSubStates.length === 0}
                options={availableSubStates.map((subState) => ({ label: subState, value: subState }))}
                onChange={() => setHasChanges(true)}
              />
            </Form.Item>
            <Form.Item
              name="referenceActions"
              label={actionLabel('Reference Action')}
              rules={[{ required: true, message: 'Please select Reference Action' }]}
            >
              <Select
                placeholder={placeholderText}
                disabled
                options={actionSelectOptions}
                onChange={() => setHasChanges(true)}
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
          <Alert
            type="warning"
            showIcon
            message="Flow Name changes take effect after this Flow Group is deployed to the target environment."
            style={{ marginBottom: 16 }}
          />

          {/* Trigger Type */}
          <Form.Item label={<Space>Trigger Type<span style={{ color: '#ff4d4f' }}>*</span></Space>}>
            <Radio.Group
              value={triggerType}
              disabled
              onChange={handleTriggerTypeChange}
              style={{ display: 'flex', flexDirection: 'column', gap: 12 }}
            >
              {triggerTypeOptions.map(opt => (
                <Radio key={opt.value} value={opt.value} style={{ height: 'auto', padding: '8px 0' }}>
                  <Space>
                    <Text>{opt.label}</Text>
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

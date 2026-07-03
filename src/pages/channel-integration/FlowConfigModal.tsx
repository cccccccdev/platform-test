import { useState, useEffect, useMemo } from 'react';
import { message, Modal, Form, Input, Select, Radio, Button, Space, Typography, Tooltip } from 'antd';
import { QuestionCircleOutlined } from '@ant-design/icons';
import { useParams } from 'react-router-dom';
import { useMatchCapabilityStore } from './matchCapabilityStore';
import type { FlowConfig, TriggerType } from './types';
import { ACTION_HELP, buildTemplateCanvas, getActionsForTrigger, getTemplates, TRIGGER_TYPE_DESCRIPTIONS } from './flowTemplates';

const { Text } = Typography;

// Trigger Type options with descriptions
const triggerTypeOptions = [
  {
    value: 'UPSTREAM_TRIGGERED',
    label: 'UPSTREAM_TRIGGERED',
    description: TRIGGER_TYPE_DESCRIPTIONS.UPSTREAM_TRIGGERED,
  },
  {
    value: 'EXTERNAL_INBOUND_TRIGGERED',
    label: 'EXTERNAL_INBOUND_TRIGGERED',
    description: TRIGGER_TYPE_DESCRIPTIONS.EXTERNAL_INBOUND_TRIGGERED,
  },
  {
    value: 'CALLBACK_TRIGGERED',
    label: 'CALLBACK_TRIGGERED',
    description: TRIGGER_TYPE_DESCRIPTIONS.CALLBACK_TRIGGERED,
  },
  {
    value: 'ASYNC_TRIGGERED',
    label: 'ASYNC_TRIGGERED',
    description: TRIGGER_TYPE_DESCRIPTIONS.ASYNC_TRIGGERED,
  },
  {
    value: 'REQUERY_TRIGGERED',
    label: 'REQUERY_TRIGGERED',
    description: TRIGGER_TYPE_DESCRIPTIONS.REQUERY_TRIGGERED,
  },
];

interface FlowConfigModalProps {
  visible: boolean;
  stateName: string;
  existingFlows: FlowConfig[];
  availableEvents: string[];
  availableActions: string[];
  availableSubStates: string[];
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
  availableSubStates,
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
  const [triggerType, setTriggerType] = useState<TriggerType>('UPSTREAM_TRIGGERED');
  const [hasChanges, setHasChanges] = useState(false);

  const eligibleActions = useMemo(() => getActionsForTrigger(triggerType, availableActions, existingFlows), [triggerType, availableActions, existingFlows]);
  const actionSelectOptions = eligibleActions.map((a) => ({ value: a, label: a }));
  const actionField = triggerType === 'CALLBACK_TRIGGERED' ? 'originalRequestAction' : triggerType === 'ASYNC_TRIGGERED' || triggerType === 'REQUERY_TRIGGERED' ? 'referenceActions' : 'triggerAction';
  const selectedAction = Form.useWatch(actionField, form);
  const normalizedAction = Array.isArray(selectedAction) ? selectedAction[0] : selectedAction;
  const templateOptions = getTemplates(triggerType, normalizedAction);

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
    setTriggerType(e.target.value as TriggerType);
    form.setFieldValue('triggerAction', undefined);
    form.setFieldValue('originalRequestAction', undefined);
    form.setFieldValue('referenceActions', undefined);
    form.setFieldValue('triggerSubState', undefined);
    form.setFieldValue('inboundUriId', undefined);
    form.setFieldValue('template', undefined);
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
        selectedActions.push(...(Array.isArray(values.referenceActions) ? values.referenceActions : [values.referenceActions]));
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
        template: values.template,
        // Ensure triggerEvents is always an array
        triggerEvents: Array.isArray(values.triggerAction) ? values.triggerAction : values.triggerAction ? [values.triggerAction] : Array.isArray(values.originalRequestAction) ? values.originalRequestAction : values.originalRequestAction ? [values.originalRequestAction] : [],
        contextActions: Array.isArray(values.referenceActions) ? values.referenceActions : values.referenceActions ? [values.referenceActions] : [],
        stateConditions: values.triggerSubState
          ? [{ id: 'trigger-sub-state', field: 'subState', operator: '==', value: values.triggerSubState }]
          : [],
        inboundUriId: values.inboundUriId,
        isConfigured: false,
        status: 'DRAFT',
        ...buildTemplateCanvas(values.template),
      };

      onSave(config);
      onCancel();
    });
  };

  const emptyActions = eligibleActions.length === 0;
  const placeholderText = emptyActions ? 'No eligible Actions available' : 'Select action';

  useEffect(() => {
    form.setFieldValue('template', templateOptions.length === 1 ? templateOptions[0] : undefined);
  }, [form, normalizedAction, triggerType, templateOptions.length]);

  const actionLabel = (label: string) => (
    <Space>{label}<Tooltip title={ACTION_HELP[triggerType]}><QuestionCircleOutlined style={{ color: '#999' }} /></Tooltip></Space>
  );

  const renderDynamicFields = () => {
    switch (triggerType) {
      case 'UPSTREAM_TRIGGERED':
        return (
          <Form.Item name="triggerAction" label={actionLabel('Trigger Action')} rules={[{ required: true, message: 'Please select Trigger Action' }]}>
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
            label={actionLabel('Trigger Action')}
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
            label={actionLabel('Original Request Action')}
            rules={[{ required: true, message: 'Please select Original Request Action' }]}
          >
            <Select placeholder={placeholderText} disabled={emptyActions} options={actionSelectOptions} />
          </Form.Item>
        </>);

      case 'ASYNC_TRIGGERED':
        return (
          <Form.Item
            name="referenceActions"
            label={actionLabel('Reference Action')}
            rules={[{ required: true, message: 'Please select Reference Action' }]}
          >
            <Select placeholder={placeholderText} disabled={emptyActions} options={actionSelectOptions} />
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
              />
            </Form.Item>
            <Form.Item
              name="referenceActions"
              label={actionLabel('Reference Action')}
              rules={[{ required: true, message: 'Please select Reference Action' }]}
            >
              <Select placeholder={placeholderText} disabled={emptyActions} options={actionSelectOptions} />
            </Form.Item>
          </>
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

        <Form.Item
          name="template"
          label="Template"
          rules={[{ required: true, message: 'Please select a Template' }]}
        >
          <Select
            placeholder={normalizedAction ? 'Select template' : 'Select an Action first'}
            disabled={!normalizedAction || templateOptions.length <= 1}
            options={templateOptions.map((template) => ({ label: template, value: template }))}
          />
        </Form.Item>
      </Form>
    </Modal>
  );
}

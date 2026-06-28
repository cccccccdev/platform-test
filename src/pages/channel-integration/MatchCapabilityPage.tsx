import { useEffect, useState } from 'react';
import {
  Breadcrumb,
  Button,
  Collapse,
  Form,
  Input,
  message,
  Modal,
  Radio,
  Select,
  Space,
  Table,
  Tag,
  Tooltip,
} from 'antd';
import { DeleteOutlined, HolderOutlined, PlusOutlined } from '@ant-design/icons';
import { useBlocker, useNavigate, useParams } from 'react-router-dom';
import { abilityOptions, capabilityActionOptions } from '../../mock/data';
import { useMatchCapabilityStore } from './matchCapabilityStore';
import type { InboundEndpoint, MatchRule } from './types';

interface NewEndpointForm {
  name: string;
  url: string;
  fields: string;
  matchType: 'A' | 'B';
}

const createId = (prefix: string) =>
  `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

export default function MatchCapabilityPage() {
  const { channelCode = '' } = useParams<{ channelCode: string }>();
  const navigate = useNavigate();
  const [form] = Form.useForm<NewEndpointForm>();
  const [showNewEndpointModal, setShowNewEndpointModal] = useState(false);
  const [draggingRule, setDraggingRule] = useState<{
    endpointId: string;
    ruleId: string;
  } | null>(null);

  const endpoints = useMatchCapabilityStore(
    (state) => state.endpointsByChannel[channelCode] ?? []
  );
  const isDirty = useMatchCapabilityStore(
    (state) => state.dirtyByChannel[channelCode] ?? false
  );
  const addEndpointToStore = useMatchCapabilityStore((state) => state.addEndpoint);
  const updateEndpointInStore = useMatchCapabilityStore((state) => state.updateEndpoint);
  const saveChannel = useMatchCapabilityStore((state) => state.saveChannel);
  const discardChannel = useMatchCapabilityStore((state) => state.discardChannel);
  const submitChannel = useMatchCapabilityStore((state) => state.submitChannel);

  const blocker = useBlocker(({ currentLocation, nextLocation }) =>
    isDirty && currentLocation.pathname !== nextLocation.pathname
  );

  useEffect(() => {
    const preventUnload = (event: BeforeUnloadEvent) => {
      if (!isDirty) return;
      event.preventDefault();
    };
    window.addEventListener('beforeunload', preventUnload);
    return () => window.removeEventListener('beforeunload', preventUnload);
  }, [isDirty]);

  const updateEndpoint = (endpoint: InboundEndpoint, updates: Partial<InboundEndpoint>) => {
    updateEndpointInStore(channelCode, endpoint.id, updates);
  };

  const updateRule = (
    endpoint: InboundEndpoint,
    ruleId: string,
    updates: Partial<MatchRule>
  ) => {
    updateEndpoint(endpoint, {
      rules: endpoint.rules.map((rule) =>
        rule.id === ruleId ? { ...rule, ...updates } : rule
      ),
    });
  };

  const updateRuleFieldValue = (
    endpoint: InboundEndpoint,
    rule: MatchRule,
    fieldName: string,
    value: string
  ) => {
    updateRule(endpoint, rule.id, {
      fieldValues: { ...rule.fieldValues, [fieldName]: value },
    });
  };

  const deleteRule = (endpoint: InboundEndpoint, ruleId: string) => {
    updateEndpoint(endpoint, {
      rules: endpoint.rules.filter((rule) => rule.id !== ruleId),
    });
  };

  const addRule = (endpoint: InboundEndpoint) => {
    const fieldValues = Object.fromEntries(
      endpoint.matchFields.map((field) => [field, ''])
    );
    const newRule: MatchRule = {
      id: createId('rule'),
      fieldValues,
      bt: '',
      ability: '',
      action: '',
    };
    updateEndpoint(endpoint, { rules: [...endpoint.rules, newRule] });
  };

  const reorderRule = (endpoint: InboundEndpoint, targetRuleId: string) => {
    if (!draggingRule || draggingRule.endpointId !== endpoint.id) return;
    if (draggingRule.ruleId === targetRuleId) return;
    const sourceIndex = endpoint.rules.findIndex((rule) => rule.id === draggingRule.ruleId);
    const targetIndex = endpoint.rules.findIndex((rule) => rule.id === targetRuleId);
    if (sourceIndex < 0 || targetIndex < 0) return;
    const rules = [...endpoint.rules];
    const [movedRule] = rules.splice(sourceIndex, 1);
    rules.splice(targetIndex, 0, movedRule);
    updateEndpoint(endpoint, { rules });
    setDraggingRule(null);
  };

  const checkRuleConflict = (endpoint: InboundEndpoint, ruleId: string) => {
    const rule = endpoint.rules.find((item) => item.id === ruleId);
    if (!rule || endpoint.matchFields.length === 0) return false;

    return endpoint.rules.some((other) => {
      if (other.id === ruleId) return false;
      const values = endpoint.matchFields.map((field) => rule.fieldValues[field] ?? '');
      const otherValues = endpoint.matchFields.map((field) => other.fieldValues[field] ?? '');
      if (values.some((value) => !value || value === '*')) return false;
      if (otherValues.some((value) => !value || value === '*')) return false;
      return values.every((value, index) => value === otherValues[index]);
    });
  };

  const validateEndpoint = (endpoint: InboundEndpoint): string | null => {
    if (!endpoint.name.trim() || !endpoint.url.trim()) {
      return `${endpoint.name || 'Unnamed endpoint'}: Endpoint Name and URI are required`;
    }
    if (endpoint.matchType === 'A' && !endpoint.singleNoField) {
      return `${endpoint.name}: Please select an order number field`;
    }
    if (endpoint.matchType === 'B') {
      if (endpoint.matchFields.length === 0) {
        return `${endpoint.name}: Please select at least one match field`;
      }
      if (endpoint.rules.length === 0) {
        return `${endpoint.name}: Please add at least one match rule`;
      }
      for (const rule of endpoint.rules) {
        if (endpoint.matchFields.some((field) => !rule.fieldValues[field]?.trim())) {
          return `${endpoint.name}: Every rule must provide a value for every match field`;
        }
        if (!rule.bt || !rule.ability || !rule.action) {
          return `${endpoint.name}: Every rule must select BT, Ability and Action`;
        }
        if (!(abilityOptions[rule.bt] ?? []).includes(rule.ability)) {
          return `${endpoint.name}: Rule contains an invalid BT and Ability combination`;
        }
        if (!(capabilityActionOptions[`${rule.bt}:${rule.ability}`] ?? []).includes(rule.action)) {
          return `${endpoint.name}: Rule contains an Action not supported by the selected Capability`;
        }
        if (checkRuleConflict(endpoint, rule.id)) {
          return `${endpoint.name}: Duplicate non-wildcard rule detected`;
        }
      }
    }
    return null;
  };

  const handleSave = () => {
    saveChannel(channelCode);
    message.success('Draft saved in the current runtime');
  };

  const handleSubmit = () => {
    const duplicateUri = endpoints.find(
      (endpoint, index) => endpoints.findIndex((item) => item.url === endpoint.url) !== index
    );
    if (duplicateUri) {
      message.error(`Duplicate URI: ${duplicateUri.url}`);
      return;
    }
    for (const endpoint of endpoints) {
      const error = validateEndpoint(endpoint);
      if (error) {
        message.error(error);
        return;
      }
    }
    submitChannel(channelCode);
    message.success('Submitted successfully; draft endpoint versions were advanced');
  };

  const handleCreateEndpoint = async () => {
    const values = await form.validateFields();
    if (endpoints.some((endpoint) => endpoint.name === values.name)) {
      form.setFields([{ name: 'name', errors: ['Endpoint Name already exists'] }]);
      return;
    }
    if (endpoints.some((endpoint) => endpoint.url === values.url)) {
      form.setFields([{ name: 'url', errors: ['URI already exists'] }]);
      return;
    }

    const fields = values.fields
      .split(',')
      .map((field) => field.trim())
      .filter(Boolean);
    const endpoint: InboundEndpoint = {
      id: createId('endpoint'),
      name: values.name.trim(),
      url: values.url.trim(),
      fields,
      matchType: values.matchType,
      singleNoField: '',
      matchFields: [],
      rules: [],
      version: 'v0.0.1',
      configStatus: 'draft',
    };
    addEndpointToStore(channelCode, endpoint);
    form.resetFields();
    setShowNewEndpointModal(false);
    message.success('Endpoint added to the current runtime');
  };

  return (
    <div style={{ padding: 24 }}>
      <Breadcrumb
        style={{ marginBottom: 16 }}
        items={[
          { title: 'Channel Integration', onClick: () => navigate('/channel-integration') },
          { title: channelCode },
          { title: 'Integration' },
          { title: 'Match Capability' },
        ]}
      />

      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between' }}>
        <Space>
          <strong>Channel: {channelCode}</strong>
          {isDirty && <Tag color="orange">Unsaved runtime changes</Tag>}
        </Space>
        <Space>
          <Button icon={<PlusOutlined />} onClick={() => setShowNewEndpointModal(true)}>
            Add Endpoint
          </Button>
          <Button onClick={handleSave}>Save Draft</Button>
          <Button type="primary" onClick={handleSubmit}>Submit</Button>
        </Space>
      </div>

      <Collapse
        accordion
        items={endpoints.map((endpoint) => ({
          key: endpoint.id,
          label: (
            <Space>
              <span style={{ fontWeight: 600 }}>{endpoint.name}</span>
              <span style={{ color: '#888' }}>{endpoint.url}</span>
              <Tag>{endpoint.version}</Tag>
              <Tag color={endpoint.configStatus === 'submitted' ? 'green' : 'orange'}>
                {endpoint.configStatus === 'submitted' ? 'Submitted' : 'Draft'}
              </Tag>
            </Space>
          ),
          children: (
            <div>
              <div style={{ marginBottom: 16 }}>
                <Radio.Group
                  value={endpoint.matchType}
                  onChange={(event) => updateEndpoint(endpoint, {
                    matchType: event.target.value as 'A' | 'B',
                  })}
                >
                  <Radio value="A">基于单号匹配</Radio>
                  <Radio value="B">基于字段组合匹配 Ability</Radio>
                </Radio.Group>
              </div>

              {endpoint.matchType === 'A' && (
                <div style={{ marginBottom: 16 }}>
                  <span style={{ marginRight: 8 }}>单号字段：</span>
                  <Select
                    style={{ width: 300 }}
                    placeholder="请选择携带平台单号的字段"
                    value={endpoint.singleNoField || undefined}
                    onChange={(value) => updateEndpoint(endpoint, { singleNoField: value })}
                    options={endpoint.fields.map((field) => ({ label: field, value: field }))}
                  />
                </div>
              )}

              {endpoint.matchType === 'B' && (
                <>
                  <div style={{ marginBottom: 16 }}>
                    <span style={{ marginRight: 8 }}>参与匹配的字段：</span>
                    <Select
                      mode="multiple"
                      style={{ width: 520 }}
                      placeholder="选择参与匹配的字段"
                      value={endpoint.matchFields}
                      onChange={(value) => updateEndpoint(endpoint, { matchFields: value })}
                      options={endpoint.fields.map((field) => ({ label: field, value: field }))}
                    />
                  </div>

                  {endpoint.matchFields.length > 0 && (
                    <Table<MatchRule>
                      dataSource={endpoint.rules}
                      rowKey="id"
                      pagination={false}
                      size="small"
                      footer={() => (
                        <Button
                          type="dashed"
                          block
                          icon={<PlusOutlined />}
                          onClick={() => addRule(endpoint)}
                        >
                          Add Rule
                        </Button>
                      )}
                      onRow={(rule) => ({
                        draggable: true,
                        onDragStart: () => setDraggingRule({
                          endpointId: endpoint.id,
                          ruleId: rule.id,
                        }),
                        onDragOver: (event) => event.preventDefault(),
                        onDrop: () => reorderRule(endpoint, rule.id),
                        onDragEnd: () => setDraggingRule(null),
                        style: {
                          opacity: draggingRule?.ruleId === rule.id ? 0.55 : 1,
                          cursor: 'grab',
                        },
                      })}
                      columns={[
                        {
                          title: '',
                          width: 40,
                          render: () => <HolderOutlined style={{ color: '#999', cursor: 'grab' }} />,
                        },
                        ...endpoint.matchFields.map((fieldName) => ({
                          title: fieldName,
                          width: 170,
                          render: (_value: unknown, rule: MatchRule) => {
                            const conflict = checkRuleConflict(endpoint, rule.id);
                            return (
                              <Tooltip title={conflict ? 'Duplicate non-wildcard rule' : ''}>
                                <Input
                                  status={conflict ? 'error' : undefined}
                                  placeholder="值或 *"
                                  value={rule.fieldValues[fieldName] ?? ''}
                                  onChange={(event) => updateRuleFieldValue(
                                    endpoint,
                                    rule,
                                    fieldName,
                                    event.target.value
                                  )}
                                />
                              </Tooltip>
                            );
                          },
                        })),
                        { title: '', width: 40, render: () => <span style={{ color: '#999' }}>→</span> },
                        {
                          title: 'BT',
                          width: 150,
                          render: (_value: unknown, rule: MatchRule) => (
                            <Select
                              style={{ width: '100%' }}
                              placeholder="Select BT"
                              value={rule.bt || undefined}
                              onChange={(value) => updateRule(endpoint, rule.id, {
                                bt: value,
                                ability: '',
                                action: '',
                              })}
                              options={Object.keys(abilityOptions).map((bt) => ({ label: bt, value: bt }))}
                            />
                          ),
                        },
                        {
                          title: 'Ability',
                          width: 150,
                          render: (_value: unknown, rule: MatchRule) => (
                            <Select
                              style={{ width: '100%' }}
                              placeholder="Select Ability"
                              value={rule.ability || undefined}
                              disabled={!rule.bt}
                              onChange={(value) => updateRule(endpoint, rule.id, {
                                ability: value,
                                action: '',
                              })}
                              options={(abilityOptions[rule.bt] ?? []).map((ability) => ({
                                label: ability,
                                value: ability,
                              }))}
                            />
                          ),
                        },
                        {
                          title: 'Action',
                          width: 150,
                          render: (_value: unknown, rule: MatchRule) => (
                            <Select
                              style={{ width: '100%' }}
                              placeholder="Select Action"
                              value={rule.action || undefined}
                              disabled={!rule.ability}
                              onChange={(value) => updateRule(endpoint, rule.id, { action: value })}
                              options={(capabilityActionOptions[`${rule.bt}:${rule.ability}`] ?? []).map(
                                (action) => ({ label: action, value: action })
                              )}
                            />
                          ),
                        },
                        {
                          title: '操作',
                          width: 60,
                          render: (_value: unknown, rule: MatchRule) => (
                            <Button
                              type="text"
                              size="small"
                              danger
                              icon={<DeleteOutlined />}
                              onClick={() => deleteRule(endpoint, rule.id)}
                            />
                          ),
                        },
                      ]}
                      scroll={{ x: 'max-content' }}
                    />
                  )}
                </>
              )}
            </div>
          ),
        }))}
      />

      <Modal
        title="Add Endpoint"
        open={showNewEndpointModal}
        onOk={() => void handleCreateEndpoint()}
        onCancel={() => {
          form.resetFields();
          setShowNewEndpointModal(false);
        }}
        okText="Add"
      >
        <Form<NewEndpointForm>
          form={form}
          layout="vertical"
          initialValues={{ matchType: 'A' }}
        >
          <Form.Item name="name" label="Endpoint Name" rules={[{ required: true }]}>
            <Input placeholder="e.g. callback_endpoint" />
          </Form.Item>
          <Form.Item name="url" label="URI" rules={[{ required: true }]}>
            <Input placeholder="e.g. /inbound/channel/callback" />
          </Form.Item>
          <Form.Item
            name="fields"
            label="Available Fields"
            rules={[{ required: true, message: 'Enter at least one field' }]}
            extra="Comma-separated; runtime-only demo input"
          >
            <Input placeholder="body.reference, body.status, header.x-event-type" />
          </Form.Item>
          <Form.Item name="matchType" label="Match Type" rules={[{ required: true }]}>
            <Radio.Group>
              <Radio value="A">基于单号匹配</Radio>
              <Radio value="B">基于字段组合匹配</Radio>
            </Radio.Group>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="Discard unsaved changes?"
        open={blocker.state === 'blocked'}
        okText="Discard and leave"
        cancelText="Stay"
        okButtonProps={{ danger: true }}
        onOk={() => {
          discardChannel(channelCode);
          blocker.proceed?.();
        }}
        onCancel={() => blocker.reset?.()}
      >
        Current runtime changes have not been saved.
      </Modal>
    </div>
  );
}

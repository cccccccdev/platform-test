import { useMemo, useState } from 'react';
import type { ColumnsType } from 'antd/es/table';
import { Breadcrumb, Button, Form, Input, Modal, Select, Table, Tag, Typography, message } from 'antd';
import { useSearchParams } from 'react-router-dom';
import './CapabilityFeaturesPage.css';
import {
  FEATURE_OPERATION_TIME,
  FEATURE_OPERATOR,
  useCapabilityFeatureStore,
} from './capabilityFeatureStore';
import type { FeatureDefinition, FeatureInputMode } from './capabilityFeatureStore';

const { Title, Text } = Typography;

interface FeatureDraft {
  feature: string;
  inputMode: FeatureInputMode;
  options: string[];
  description: string;
}

const INPUT_MODE_OPTIONS: FeatureInputMode[] = [
  'True/False',
  'Custom Single Select',
  'Custom Multiple Select',
  'Custom Multiple Input',
  'Text Input',
];

const createDraft = (): FeatureDraft => ({
  feature: '',
  inputMode: 'True/False',
  options: [],
  description: '',
});

const requiresOptions = (mode: FeatureInputMode) =>
  mode === 'Custom Single Select' || mode === 'Custom Multiple Select';

const normalizeTokens = (values: string[]) => values
  .flatMap((value) => value.split(/[，,;]/))
  .map((value) => value.trim())
  .filter((value, index, list) => Boolean(value) && list.indexOf(value) === index);

export default function CapabilityFeaturesPage() {
  const [searchParams] = useSearchParams();
  const businessType = searchParams.get('bt') || 'BANK_CARD_DEBIT';
  const ability = searchParams.get('ability') || 'REFUND';
  const rows = useCapabilityFeatureStore((state) => state.definitions);
  const addDefinition = useCapabilityFeatureStore((state) => state.addDefinition);
  const updateDefinition = useCapabilityFeatureStore((state) => state.updateDefinition);
  const [addOpen, setAddOpen] = useState(false);
  const [addDraft, setAddDraft] = useState<FeatureDraft>(createDraft);
  const [configOpen, setConfigOpen] = useState(false);
  const [configDraft, setConfigDraft] = useState<FeatureDraft | null>(null);
  const [originalConfig, setOriginalConfig] = useState<FeatureDraft | null>(null);
  const [configNewOptions, setConfigNewOptions] = useState<string[]>([]);

  const canAdd = Boolean(
    addDraft.feature.trim()
    && addDraft.description.trim()
    && (!requiresOptions(addDraft.inputMode) || addDraft.options.length > 0),
  );

  const canSaveConfig = useMemo(() => {
    if (!configDraft || !originalConfig || !configDraft.description.trim()) return false;
    const nextOptions = normalizeTokens([...configDraft.options, ...configNewOptions]);
    if (requiresOptions(configDraft.inputMode) && nextOptions.length === 0) return false;
    return configDraft.description !== originalConfig.description || configNewOptions.length > 0;
  }, [configDraft, configNewOptions, originalConfig]);

  const openAdd = () => {
    setAddDraft(createDraft());
    setAddOpen(true);
  };

  const submitAdd = () => {
    if (!canAdd) return;
    const feature = addDraft.feature.trim();
    if (rows.some((row) => row.feature === feature)) {
      message.error(`Feature ${feature} already exists.`);
      return;
    }
    addDefinition({
      key: `${feature}-${Date.now()}`,
      feature,
      inputMode: addDraft.inputMode,
      options: requiresOptions(addDraft.inputMode) ? normalizeTokens(addDraft.options) : [],
      description: addDraft.description.trim(),
      operationTime: FEATURE_OPERATION_TIME,
      operator: FEATURE_OPERATOR,
    });
    setAddOpen(false);
    message.success(`Feature ${feature} added.`);
  };

  const openConfig = (row: FeatureDefinition) => {
    const draft: FeatureDraft = {
      feature: row.feature,
      inputMode: row.inputMode,
      options: [...row.options],
      description: row.description,
    };
    setConfigDraft(draft);
    setOriginalConfig({ ...draft, options: [...draft.options] });
    setConfigNewOptions([]);
    setConfigOpen(true);
  };

  const closeConfig = () => {
    setConfigOpen(false);
    setConfigDraft(null);
    setOriginalConfig(null);
    setConfigNewOptions([]);
  };

  const submitConfig = () => {
    if (!configDraft || !canSaveConfig) return;
    const nextOptions = normalizeTokens([...configDraft.options, ...configNewOptions]);
    updateDefinition(configDraft.feature, {
      options: nextOptions,
      description: configDraft.description.trim(),
      operationTime: FEATURE_OPERATION_TIME,
      operator: FEATURE_OPERATOR,
    });
    closeConfig();
    message.success(`Feature ${configDraft.feature} updated.`);
  };

  const columns: ColumnsType<FeatureDefinition> = [
    {
      title: 'Feature',
      dataIndex: 'feature',
      key: 'feature',
      width: 190,
      fixed: 'left',
      render: (value: string) => <Text className="capability-feature-name">{value}</Text>,
    },
    {
      title: 'Input Mode',
      dataIndex: 'inputMode',
      key: 'inputMode',
      width: 230,
      render: (value: FeatureInputMode) => <Tag className="capability-feature-mode">{value}</Tag>,
    },
    {
      title: 'Options',
      dataIndex: 'options',
      key: 'options',
      width: 220,
      render: (options: string[]) => options.length ? options.join(', ') : '-',
    },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
      width: 360,
    },
    {
      title: 'Operation Time',
      dataIndex: 'operationTime',
      key: 'operationTime',
      width: 210,
    },
    {
      title: 'Operator',
      dataIndex: 'operator',
      key: 'operator',
      width: 170,
    },
    {
      title: 'Operation',
      key: 'operation',
      width: 130,
      fixed: 'right',
      render: (_, row) => <Button type="link" onClick={() => openConfig(row)}>Config</Button>,
    },
  ];

  return (
    <div className="capability-features-page">
      <section className="capability-features-heading">
        <Breadcrumb items={[{ title: 'Basic Info' }, { title: 'Capability' }, { title: 'Features' }]} />
        <Title level={4}>Features</Title>
      </section>

      <main className="capability-features-panel">
        <div className="capability-features-toolbar">
          <div className="capability-features-context">
            <span><strong>Business Type:</strong>{businessType}</span>
            <span><strong>Ability:</strong>{ability}</span>
          </div>
          <Button type="primary" onClick={openAdd}>Add Feature</Button>
        </div>

        <Table
          className="capability-features-table"
          columns={columns}
          dataSource={rows}
          pagination={{ pageSize: 10, showSizeChanger: false, position: ['bottomRight'] }}
          scroll={{ x: 1510 }}
        />
      </main>

      <Modal
        title="Add Feature"
        open={addOpen}
        onCancel={() => setAddOpen(false)}
        onOk={submitAdd}
        okText="Add"
        cancelText="Cancel"
        okButtonProps={{ disabled: !canAdd }}
        width={620}
        className="capability-feature-modal"
        destroyOnHidden
      >
        <Form labelCol={{ span: 6 }} wrapperCol={{ span: 18 }} colon={false}>
          <Form.Item label="Feature" required>
            <Input value={addDraft.feature} onChange={(event) => setAddDraft({ ...addDraft, feature: event.target.value })} />
          </Form.Item>
          <Form.Item label="Input Mode" required>
            <Select
              value={addDraft.inputMode}
              options={INPUT_MODE_OPTIONS.map((value) => ({ label: value, value }))}
              onChange={(inputMode) => setAddDraft({ ...addDraft, inputMode, options: [] })}
            />
          </Form.Item>
          {requiresOptions(addDraft.inputMode) && (
            <Form.Item label="Options" required>
              <Select
                mode="tags"
                value={addDraft.options}
                tokenSeparators={[',', '，', ';']}
                placeholder="MANUAL,AUTO"
                open={false}
                onChange={(options) => setAddDraft({ ...addDraft, options: normalizeTokens(options) })}
              />
            </Form.Item>
          )}
          <Form.Item label="Description" required>
            <Input.TextArea rows={3} value={addDraft.description} onChange={(event) => setAddDraft({ ...addDraft, description: event.target.value })} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="Config"
        open={configOpen}
        onCancel={closeConfig}
        onOk={submitConfig}
        okText="Save"
        cancelText="Cancel"
        okButtonProps={{ disabled: !canSaveConfig }}
        width={620}
        className="capability-feature-modal"
        destroyOnHidden
      >
        {configDraft && (
          <Form labelCol={{ span: 6 }} wrapperCol={{ span: 18 }} colon={false}>
            <Form.Item label="Feature" required>
              <Input value={configDraft.feature} disabled />
            </Form.Item>
            <Form.Item label="Input Mode" required>
              <Input value={configDraft.inputMode} disabled />
            </Form.Item>
            {requiresOptions(configDraft.inputMode) && (
              <Form.Item label="Options" required>
                <div className="capability-feature-config-options">
                  {configDraft.options.map((option) => <Tag key={option}>{option}</Tag>)}
                  <Select
                    mode="tags"
                    value={configNewOptions}
                    tokenSeparators={[',', '，', ';']}
                    placeholder="Add option"
                    open={false}
                    onChange={(options) => setConfigNewOptions(normalizeTokens(options).filter((option) => !configDraft.options.includes(option)))}
                  />
                </div>
              </Form.Item>
            )}
            <Form.Item label="Description" required>
              <Input.TextArea rows={3} value={configDraft.description} onChange={(event) => setConfigDraft({ ...configDraft, description: event.target.value })} />
            </Form.Item>
          </Form>
        )}
      </Modal>
    </div>
  );
}

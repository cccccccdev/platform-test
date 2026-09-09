import { useMemo, useState } from 'react';
import { Button, Collapse, Empty, Form, Input, Modal, Select, Space, Table, Tag, Typography, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useNavigate, useSearchParams } from 'react-router-dom';
import type { ConfigAbility } from './types';
import {
  FEATURE_OPERATION_TIME,
  FEATURE_OPERATOR,
  channelFeatureKey,
  useCapabilityFeatureStore,
} from '../basic-info/capability/capabilityFeatureStore';
import type { FeatureDefinition } from '../basic-info/capability/capabilityFeatureStore';
import './ChannelInfoCapabilityPage.css';

const { Text } = Typography;
type CapabilityRow = { key: string; ability: string; actions: string[] };

interface ChannelFeatureDraft {
  definition: FeatureDefinition;
  value: string;
}

interface PendingApproval extends ChannelFeatureDraft {
  originalValue: string;
}

const splitValue = (value: string) => value.split(/[，,;]/).map((item) => item.trim()).filter(Boolean);

export default function ChannelInfoCapabilityPage({ channelCode, cloud, env, configuredAbilities }: {
  channelCode: string;
  cloud: string;
  env: string;
  configuredAbilities: ConfigAbility[];
}) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const businessType = searchParams.get('featureBt') ?? '';
  const selectedAbility = searchParams.get('featureAbility') ?? '';
  const definitions = useCapabilityFeatureStore((state) => state.definitions);
  const channelValues = useCapabilityFeatureStore((state) => state.channelValues);
  const channelHistory = useCapabilityFeatureStore((state) => state.channelHistory);
  const saveChannelValue = useCapabilityFeatureStore((state) => state.saveChannelValue);
  const submitChannelApproval = useCapabilityFeatureStore((state) => state.submitChannelApproval);
  const [configDraft, setConfigDraft] = useState<ChannelFeatureDraft | null>(null);
  const [originalValue, setOriginalValue] = useState('');
  const [pendingApproval, setPendingApproval] = useState<PendingApproval | null>(null);
  const [approvalReason, setApprovalReason] = useState('');
  const [historyFeature, setHistoryFeature] = useState<FeatureDefinition | null>(null);

  const groups = useMemo(() => {
    const byBusinessType = new Map<string, CapabilityRow[]>();
    configuredAbilities.forEach((capability) => {
      const publishedVersions = capability.versions.filter((version) =>
        version.badges.some((badge) => badge.cloud === cloud && badge.env === env));
      if (!publishedVersions.length) return;
      const actions = Array.from(new Set(publishedVersions.flatMap((version) =>
        version.flows.flatMap((flow) => flow.triggerEvents ?? []))));
      const rows = byBusinessType.get(capability.bt) ?? [];
      rows.push({ key: `${capability.bt}:${capability.ability}`, ability: capability.ability, actions });
      byBusinessType.set(capability.bt, rows);
    });
    return Array.from(byBusinessType.entries());
  }, [cloud, configuredAbilities, env]);

  const keyFor = (feature: string) => channelFeatureKey(channelCode, cloud, env, businessType, selectedAbility, feature);
  const valueFor = (feature: string) => channelValues[keyFor(feature)] ?? '';

  const openConfig = (definition: FeatureDefinition) => {
    const value = valueFor(definition.feature);
    setOriginalValue(value);
    setConfigDraft({ definition, value: value || (definition.inputMode === 'True/False' ? 'false' : '') });
  };

  const closeConfig = () => {
    setConfigDraft(null);
    setOriginalValue('');
  };

  const canSave = Boolean(configDraft?.value.trim() && configDraft.value !== originalValue);

  const saveConfig = () => {
    if (!configDraft || !canSave) return;
    if (env === 'PROD') {
      setPendingApproval({ ...configDraft, originalValue });
      setApprovalReason('');
      closeConfig();
      return;
    }
    saveChannelValue(keyFor(configDraft.definition.feature), configDraft.value, '-');
    message.success(`${configDraft.definition.feature} updated.`);
    closeConfig();
  };

  const submitApproval = () => {
    if (!pendingApproval || !approvalReason.trim()) return;
    submitChannelApproval(keyFor(pendingApproval.definition.feature), pendingApproval.value, approvalReason.trim());
    message.success('Feature change submitted for approval.');
    setPendingApproval(null);
    setApprovalReason('');
  };

  const renderValueControl = (draft: ChannelFeatureDraft) => {
    const update = (value: string) => setConfigDraft({ ...draft, value });
    switch (draft.definition.inputMode) {
      case 'True/False':
        return <Select value={draft.value || undefined} options={[{ value: 'false' }, { value: 'true' }]} onChange={update} />;
      case 'Custom Single Select':
        return <Select value={draft.value || undefined} options={draft.definition.options.map((value) => ({ value }))} onChange={update} />;
      case 'Custom Multiple Select':
        return <Select mode="multiple" value={splitValue(draft.value)} options={draft.definition.options.map((value) => ({ value }))} onChange={(values) => update(values.join(','))} />;
      case 'Custom Multiple Input':
        return <Select mode="tags" value={splitValue(draft.value)} tokenSeparators={[',', '，', ';']} open={false} onChange={(values) => update(values.join(','))} />;
      case 'Text Input':
        return <Input value={draft.value} onChange={(event) => update(event.target.value)} />;
    }
  };

  if (!businessType || !selectedAbility) {
    if (!groups.length) return <Empty description="No published Capability in the current Cloud and Env." />;
    return <Collapse
      defaultActiveKey={groups.map(([groupBusinessType]) => groupBusinessType)}
      items={groups.map(([groupBusinessType, rows]) => ({
        key: groupBusinessType,
        label: <Space><strong>{groupBusinessType}</strong><Tag color="purple">CONFIG</Tag></Space>,
        children: <Table<CapabilityRow>
          rowKey="key"
          dataSource={rows}
          pagination={false}
          columns={[
            { title: 'Name', dataIndex: 'ability', key: 'ability' },
            { title: 'Operation', key: 'operation', width: 180, render: (_, row) => <Button type="link" onClick={() => navigate(`/channel-integration/${encodeURIComponent(channelCode)}/channel-info?featureBt=${encodeURIComponent(groupBusinessType)}&featureAbility=${encodeURIComponent(row.ability)}`)}>Features</Button> },
          ]}
          expandable={{
            defaultExpandAllRows: true,
            expandedRowRender: (row) => <div style={{ paddingLeft: 28 }}>
              {row.actions.length ? row.actions.map((action) => <div key={action} style={{ padding: '8px 0' }}>{action}</div>) : <span style={{ color: '#8c8c8c' }}>No Action</span>}
            </div>,
          }}
        />,
      }))}
    />;
  }

  const columns: ColumnsType<FeatureDefinition> = [
    { title: 'Feature', dataIndex: 'feature', key: 'feature', width: 260, fixed: 'left', render: (value: string) => <Text strong>{value}</Text> },
    { title: 'Value', key: 'value', width: 360, render: (_, row) => valueFor(row.feature) || '-' },
    { title: 'Operation', key: 'operation', width: 260, fixed: 'right', render: (_, row) => <Space size={18}><Button type="link" onClick={() => openConfig(row)}>Config</Button><Button type="link" onClick={() => setHistoryFeature(row)}>Change History</Button></Space> },
  ];

  const historyKey = historyFeature ? keyFor(historyFeature.feature) : '';
  const historyRows = historyFeature ? (channelHistory[historyKey]?.length ? channelHistory[historyKey] : [{
    version: '202605260001', featureValue: valueFor(historyFeature.feature) || '-', operator: FEATURE_OPERATOR,
    operationTime: FEATURE_OPERATION_TIME, approvalStatus: env === 'PROD' ? 'Approved' : '-',
  }]) : [];

  return <div className="channel-capability-features">
    <div className="channel-capability-feature-context">
      <span><strong>Business Type:</strong>{businessType}</span>
      <span><strong>Ability:</strong>{selectedAbility}</span>
    </div>
    <Table columns={columns} dataSource={definitions} rowKey="key" pagination={{ pageSize: 10, showSizeChanger: false }} scroll={{ x: 880 }} />

    <Modal title="Config Feature" open={Boolean(configDraft)} onCancel={closeConfig} onOk={saveConfig} okText="Save" cancelText="Cancel" okButtonProps={{ disabled: !canSave }} width={620} className="channel-capability-feature-modal" destroyOnHidden>
      {configDraft && <Form labelCol={{ span: 6 }} wrapperCol={{ span: 18 }} colon={false}>
        <Form.Item label="Feature" required><Input value={configDraft.definition.feature} disabled /></Form.Item>
        <Form.Item label="Input Mode" required><Input value={configDraft.definition.inputMode} disabled /></Form.Item>
        <Form.Item label="Value" required>{renderValueControl(configDraft)}</Form.Item>
        <Form.Item label="Description" required><Input.TextArea rows={3} value={configDraft.definition.description} disabled /></Form.Item>
      </Form>}
    </Modal>

    <Modal title="Feature Change Detected" open={Boolean(pendingApproval)} onCancel={() => setPendingApproval(null)} onOk={submitApproval} okText="Submit" cancelText="Cancel" okButtonProps={{ disabled: !approvalReason.trim() }} width={720} className="channel-capability-approval-modal" destroyOnHidden>
      {pendingApproval && <>
        <div className="channel-capability-change-summary">You are changing <strong>{pendingApproval.definition.feature}</strong> from <strong>{pendingApproval.originalValue || '-'}</strong> to <strong>{pendingApproval.value || '-'}</strong>.</div>
        <Form layout="vertical"><Form.Item label="Reason for change" required><Input.TextArea rows={4} value={approvalReason} onChange={(event) => setApprovalReason(event.target.value)} /></Form.Item></Form>
      </>}
    </Modal>

    <Modal title="Change History" open={Boolean(historyFeature)} onCancel={() => setHistoryFeature(null)} footer={null} width={1120} className="channel-capability-history-modal" destroyOnHidden>
      {historyFeature && <>
        <div className="channel-capability-history-context">
          <div><strong>Channel:</strong><span>{channelCode}</span></div><div><strong>Business Type:</strong><span>{businessType}</span></div>
          <div><strong>Ability:</strong><span>{selectedAbility}</span></div><div><strong>Feature:</strong><span>{historyFeature.feature}</span></div>
          <div><strong>Feature Description:</strong><span>{historyFeature.description}</span></div>
        </div>
        <Table rowKey="version" dataSource={historyRows} pagination={{ pageSize: 10, showSizeChanger: false }} scroll={{ x: 970 }} columns={[
          { title: 'Version', dataIndex: 'version', key: 'version', width: 170 }, { title: 'Feature Value', dataIndex: 'featureValue', key: 'featureValue', width: 220 },
          { title: 'Operator', dataIndex: 'operator', key: 'operator', width: 190 }, { title: 'Operation Time', dataIndex: 'operationTime', key: 'operationTime', width: 210 },
          { title: 'Approval Status', dataIndex: 'approvalStatus', key: 'approvalStatus', width: 180, render: (status: string) => status === '-' ? '-' : <Tag color={status === 'Pending Approval' ? 'gold' : 'green'}>{status}</Tag> },
        ]} />
      </>}
    </Modal>
  </div>;
}

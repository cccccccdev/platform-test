import { useState } from 'react';
import { Alert, Button, Divider, Drawer, Input, message, Select, Space, Switch, Tag } from 'antd';
import { ArrowLeftOutlined, CloudUploadOutlined, DeleteOutlined, LockOutlined, PlusOutlined, SaveOutlined } from '@ant-design/icons';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { capabilityActionOptions } from '../../mock/data';
import { useConfigIntegrationStore } from './configIntegrationStore';
import { useMatchCapabilityStore } from './matchCapabilityStore';
import type { CapabilityDecisionVersion, InboundEndpoint, InboundRequestField, LegacyInboundComponent, MatchRule, MatchingType } from './types';
import CanvasContextPanel from './CanvasContextPanel';

const matchingTypeOptions: Array<{ value: MatchingType; label: string }> = [
  { value: 'single', label: 'Single Type' },
  { value: 'order_no', label: 'Distinguish types by order no' },
  { value: 'type_field', label: 'Distinguish types by type field' },
  { value: 'custom', label: 'Custom' },
];

const createRule = (): MatchRule => ({
  id: `result_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
  fieldValues: {},
  bt: '',
  ability: '',
  action: '',
});

const createRequestField = (source: InboundRequestField['source']): InboundRequestField => ({
  id: `field_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
  source,
  name: '',
  type: 'String',
  moc: 'yes',
  description: '',
});

export default function MatchCapabilityEditorPage() {
  const { channelCode = '', uriId = '', decisionVersionId = '' } = useParams<{ channelCode: string; uriId: string; decisionVersionId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const endpoint = useMatchCapabilityStore((state) =>
    (state.endpointsByChannel[channelCode] ?? []).find((item) => item.id === uriId)
  );
  const updateDecisionVersion = useMatchCapabilityStore((state) => state.updateDecisionVersion);
  const saveChannel = useMatchCapabilityStore((state) => state.saveChannel);
  const submitVersion = useMatchCapabilityStore((state) => state.submitVersion);
  const abilities = useConfigIntegrationStore((state) => state.abilitiesByChannel[channelCode] ?? []);
  const configuration = endpoint?.versions.find((version) => version.id === decisionVersionId);
  const [selectedRuleId, setSelectedRuleId] = useState<string | null>(configuration?.rules[0]?.id ?? null);
  const [activeDrawer, setActiveDrawer] = useState<'uri' | 'match' | null>(null);
  const readOnly = searchParams.get('mode') === 'detail';
  if (!endpoint || !configuration) {
    return <div style={{ padding: 24 }}><h3>Capability Matching Version not found</h3><Button onClick={() => navigate(-1)}>Back</Button></div>;
  }

  if (configuration.sourceType === 'legacy') {
    return <LegacyInboundFlowEditor channelCode={channelCode} endpoint={endpoint} configuration={configuration} readOnly={readOnly} />;
  }

  const update = (updates: Partial<typeof configuration>) => updateDecisionVersion(channelCode, endpoint.id, configuration.id, updates);
  const fieldPath = (field: InboundRequestField) => `${field.source}.${field.name}`;
  const syncRequestFields = (requestFields: InboundRequestField[]) => {
    const validFields = requestFields.filter((field) => field.name.trim());
    const paths = validFields.map(fieldPath);
    const rules = configuration.matchType === 'type_field'
      ? configuration.rules.map((rule) => ({
          ...rule,
          fieldValues: Object.fromEntries(validFields.map((field) => {
            const previous = configuration.requestFields.find((item) => item.id === field.id);
            return [fieldPath(field), rule.fieldValues[fieldPath(field)] ?? (previous ? rule.fieldValues[fieldPath(previous)] : '') ?? ''];
          })),
        }))
      : configuration.rules;
    update({
      requestFields,
      fields: paths,
      matchFields: configuration.matchType === 'type_field' ? paths : configuration.matchFields,
      singleNoField: configuration.matchType === 'order_no' && validFields[0] ? fieldPath(validFields[0]) : configuration.singleNoField,
      rules,
    });
  };
  const addRequestField = (source: InboundRequestField['source']) => syncRequestFields([
    ...configuration.requestFields,
    createRequestField(source),
  ]);
  const updateRequestField = (fieldId: string, updates: Partial<InboundRequestField>) => syncRequestFields(
    configuration.requestFields.map((field) => field.id === fieldId ? { ...field, ...updates } : field)
  );
  const deleteRequestField = (fieldId: string) => syncRequestFields(configuration.requestFields.filter((field) => field.id !== fieldId));
  const updateRule = (ruleId: string, updates: Partial<MatchRule>) => update({
    rules: configuration.rules.map((rule) => rule.id === ruleId ? { ...rule, ...updates } : rule),
  });
  const addResult = () => {
    const rule = createRule();
    if (configuration.matchType === 'type_field') {
      rule.fieldValues = Object.fromEntries(configuration.matchFields.map((field) => [field, '']));
    }
    update({ rules: [...configuration.rules, rule] });
    setSelectedRuleId(rule.id);
  };
  const deleteResult = (ruleId: string) => {
    update({ rules: configuration.rules.filter((rule) => rule.id !== ruleId) });
    if (selectedRuleId === ruleId) setSelectedRuleId(null);
  };

  const validate = (): string | null => {
    if (!endpoint.url || !endpoint.method) return 'URI Basic Info is incomplete';
    if (configuration.matchType !== 'single' && configuration.requestFields.length === 0) return 'Common Request must contain at least one field';
    if (configuration.requestFields.some((field) => !field.name.trim())) return 'Every Common Request field requires a Field Name';
    if (configuration.matchType === 'single' && configuration.rules.length !== 1) return 'Single Type requires exactly one Capability Result';
    if ((configuration.matchType === 'order_no' || configuration.matchType === 'custom') && configuration.rules.length === 0) return 'Declare at least one candidate Capability Result';
    if (configuration.matchType === 'order_no' && (configuration.requestFields.length !== 1 || !configuration.singleNoField || !configuration.referenceField)) return 'Order No requires exactly one match field and a reference type';
    if (configuration.matchType === 'type_field' && configuration.matchFields.length === 0) return 'Type Field requires at least one input field';
    if (configuration.matchType === 'custom' && !configuration.customScript?.trim()) return 'Custom Script is required';
    for (const rule of configuration.rules) {
      if (!rule.bt || !rule.ability || !rule.action) return 'Every Capability Result must include BT, Ability and Action';
      if (!abilities.some((item) => item.bt === rule.bt && item.ability === rule.ability)) return `Ability ${rule.bt} / ${rule.ability} does not exist in ${channelCode}`;
      if (configuration.matchType === 'type_field' && configuration.matchFields.some((field) => rule.fieldValues[field] === undefined || rule.fieldValues[field] === '')) return 'Every Type Value combination must provide all field values; use EMPTY_STR for an empty string';
    }
    if (configuration.matchType === 'type_field') {
      const combinations = configuration.rules.map((rule) => configuration.matchFields.map((field) => rule.fieldValues[field]).join('\u0001'));
      if (new Set(combinations).size !== combinations.length) return 'Duplicate Type Value combination detected';
    }
    return null;
  };

  const handleSave = () => {
    saveChannel(channelCode);
    message.success('URI Configuration saved as Draft');
    navigate(`/channel-integration/${channelCode}/integration/match-capability`);
  };
  const handleSubmit = () => {
    const error = validate();
    if (error) return void message.error(error);
    submitVersion(channelCode, endpoint.id, configuration.id);
    message.success('Capability Matching submitted. The current Version is ready to deploy.');
    navigate(`/channel-integration/${channelCode}/integration/match-capability`);
  };

  const btOptions = endpoint.businessTypes.map((value) => ({ value }));
  const selectedRule = configuration.rules.find((rule) => rule.id === selectedRuleId);
  const renderRequestField = (field: InboundRequestField) => (
    <div key={field.id} style={{ display: 'grid', gridTemplateColumns: '1.2fr .8fr .65fr 1.3fr 34px', gap: 6, marginTop: 8, alignItems: 'center' }}>
      <Input disabled={readOnly} placeholder="Field Name" value={field.name} onChange={(event) => updateRequestField(field.id, { name: event.target.value })} />
      <Select disabled={readOnly} value={field.type} options={['String', 'Number', 'Boolean', 'Object'].map((value) => ({ value }))} onChange={(type) => updateRequestField(field.id, { type })} />
      <Select disabled={readOnly} value={field.moc} options={[{ value: 'yes', label: 'MOC: yes' }, { value: 'no', label: 'MOC: no' }]} onChange={(moc) => updateRequestField(field.id, { moc })} />
      <Input disabled={readOnly} placeholder="Description" value={field.description} onChange={(event) => updateRequestField(field.id, { description: event.target.value })} />
      {!readOnly && <Button type="text" danger icon={<DeleteOutlined />} onClick={() => deleteRequestField(field.id)} />}
    </div>
  );
  const renderFieldSection = (source: InboundRequestField['source'], title: string) => {
    const fields = configuration.requestFields.filter((field) => field.source === source);
    return (
      <div style={{ marginTop: 14, padding: 12, background: '#fafafa', borderRadius: 8 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><strong>{title}</strong>{!readOnly && <Button size="small" type="text" icon={<PlusOutlined />} onClick={() => addRequestField(source)}>Add Field</Button>}</div>
        {fields.length ? fields.map(renderRequestField) : <div style={{ color: '#8c8c8c', fontSize: 11, padding: '10px 0 2px' }}>No field configured</div>}
      </div>
    );
  };

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: '#f5f7fa' }}>
      <div style={{ height: 58, padding: '0 20px', display: 'flex', alignItems: 'center', background: '#fff', borderBottom: '1px solid #f0f0f0' }}>
        <Button type="text" icon={<ArrowLeftOutlined />} onClick={() => navigate(`/channel-integration/${channelCode}/integration/match-capability`)}>Back</Button>
        <Divider type="vertical" />
        <strong>{readOnly ? 'Capability Matching Detail' : 'Configure Capability Matching'}</strong>
        <div style={{ flex: 1 }} />
        {!readOnly && <Space><Button icon={<SaveOutlined />} onClick={handleSave}>Save Draft</Button><Button type="primary" icon={<CloudUploadOutlined />} onClick={handleSubmit}>Submit</Button></Space>}
      </div>

      <div style={{ padding: '12px 16px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr repeat(6, 1fr)', background: '#fff', border: '1px solid #e8e8e8', borderRadius: 8, padding: 14 }}>
          {[
            ['URI', endpoint.url], ['Business Type', endpoint.businessTypes.join(', ')], ['Method', endpoint.method],
            ['Matching ID', configuration.id], ['Version', configuration.version], ['Status', configuration.configStatus], ['URI ID', endpoint.id],
          ].map(([label, value]) => <div key={label} style={{ padding: '0 14px', borderRight: label === 'URI ID' ? 'none' : '1px solid #f0f0f0' }}><div style={{ color: '#8c8c8c', fontSize: 10 }}>{label}</div><div style={{ marginTop: 4, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis' }}>{value}</div></div>)}
        </div>
      </div>

      <div style={{ flex: 1, minHeight: 0, display: 'grid', gridTemplateColumns: '292px 304px minmax(430px, 1fr)', margin: '0 16px 16px', background: '#fff', border: '1px solid #e8e8e8', borderRadius: 8, overflow: 'hidden' }}>
        <CanvasContextPanel channelCode={channelCode} mode="matching" readOnly={readOnly} />

        <div style={{ borderRight: '1px solid #f0f0f0', overflow: 'auto' }}>
          <div style={{ padding: 14, fontWeight: 600, borderBottom: '1px solid #f0f0f0' }}>Component Library</div>
          <div style={{ padding: 12 }}>
            <Input.Search size="small" placeholder="Search components..." disabled />
            <div onClick={() => setActiveDrawer('match')} style={{ marginTop: 14, padding: 12, border: '1px solid #d9d9d9', borderRadius: 7, background: '#fafafa', cursor: 'pointer' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><strong>matchCapability</strong><Tag>Single Use</Tag></div>
              <div style={{ color: '#8c8c8c', fontSize: 11 }}>Identify Capability Result</div>
            </div>
            <Alert type="info" showIcon message="URI canvas components are system-managed" style={{ marginTop: 14 }} />
          </div>
        </div>

        <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          <div style={{ height: 44, display: 'flex', alignItems: 'center', padding: '0 16px', borderBottom: '1px solid #f0f0f0', fontWeight: 600 }}>Canvas</div>
          <div style={{ flex: 1, overflow: 'auto', padding: 36, backgroundImage: 'radial-gradient(#d9d9d9 1px, transparent 1px)', backgroundSize: '16px 16px' }}>
            <button onClick={() => setActiveDrawer('match')} style={{ display: 'block', width: 300, margin: '80px auto 0', padding: 16, textAlign: 'left', border: '2px solid #1677ff', borderRadius: 10, background: '#e6f4ff', boxShadow: '0 4px 12px rgba(22,119,255,.12)', cursor: 'pointer' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span><Tag color="blue">CORE</Tag><strong>matchCapability</strong></span><Tag color={configuration.rules.length ? 'green' : 'orange'}>{configuration.rules.length ? 'Configured' : 'Not Started'}</Tag></div>
              <div style={{ color: '#595959', fontSize: 11, marginTop: 6 }}>{matchingTypeOptions.find((item) => item.value === configuration.matchType)?.label}</div>
            </button>
          </div>
        </div>
      </div>

      <Drawer title="Inbound Pre-processing" width={520} open={activeDrawer === 'uri'} onClose={() => setActiveDrawer(null)}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><strong>Pre-processing · Decryption</strong><Switch disabled={readOnly} checked={configuration.decryptEnabled} onChange={(decryptEnabled) => update({ decryptEnabled })} /></div>
        <div style={{ color: '#8c8c8c', fontSize: 11, marginTop: 6 }}>{configuration.decryptEnabled ? 'Decryption runs before capability matching.' : 'No decryption configured.'}</div>
        <Divider />
        <div style={{ fontWeight: 600, marginBottom: 8 }}>Fallback Behavior</div>
        <Select disabled={readOnly} value={configuration.fallbackBehavior} style={{ width: '100%' }} onChange={(fallbackBehavior) => update({ fallbackBehavior })} options={[
          { value: 'reject', label: 'Reject request' }, { value: 'alert_and_reject', label: 'Alert and reject' }, { value: 'manual_review', label: 'Manual review queue' },
        ]} />
      </Drawer>

      <Drawer title="matchCapability Configuration" width={720} open={activeDrawer === 'match'} onClose={() => setActiveDrawer(null)}>
        <div style={{ paddingBottom: 24 }}>
            <div style={{ color: '#8c8c8c', fontSize: 11, marginBottom: 6 }}>Matching Type</div>
            <Select disabled={readOnly} value={configuration.matchType} style={{ width: '100%' }} options={matchingTypeOptions} onChange={(matchType) => update({
              matchType,
              requestFields: [],
              fields: [],
              matchFieldSource: undefined,
              matchFields: [],
              singleNoField: '',
              referenceField: undefined,
              rules: (matchType === 'single' ? [configuration.rules[0] ?? createRule()] : configuration.rules).map((rule) => ({ ...rule, fieldValues: {} })),
            })} />

            <Divider>Common Request</Divider>
            {configuration.matchType === 'single' && <Alert type="info" showIcon message="Single Type does not require additional request discriminator fields." />}

            {configuration.matchType === 'order_no' && <div style={{ marginTop: 12, padding: 12, background: '#fafafa', borderRadius: 8 }}>
              <strong>Unique Order Match Parameter</strong>
              <div style={{ color: '#8c8c8c', fontSize: 11, marginTop: 4 }}>Only one parameter can be defined in Query Parameters, Request Header, or Request Body.</div>
              <Select disabled={readOnly} value={configuration.matchFieldSource} placeholder="Select parameter source" style={{ width: '100%', marginTop: 10 }} options={[{ value: 'query', label: 'Query Parameters' }, { value: 'header', label: 'Request Header' }, { value: 'body', label: 'Request Body' }]} onChange={(source: InboundRequestField['source']) => {
                const current = configuration.requestFields[0];
                const next = current ? { ...current, source } : createRequestField(source);
                update({ matchFieldSource: source });
                syncRequestFields([next]);
              }} />
              {configuration.requestFields[0] && renderRequestField(configuration.requestFields[0])}
              <Select disabled={readOnly} value={configuration.referenceField} placeholder="Match to order reference" style={{ width: '100%', marginTop: 10 }} options={[{ value: 'requestReference' }, { value: 'responseReference' }]} onChange={(referenceField) => update({ referenceField })} />
            </div>}

            {(configuration.matchType === 'type_field' || configuration.matchType === 'custom') && <div>
              {renderFieldSection('query', 'Query Parameters')}
              {renderFieldSection('header', 'Request Header')}
              {renderFieldSection('body', 'Request Body')}
            </div>}

            {configuration.matchType === 'custom' && <div style={{ marginTop: 16 }}>
              <strong>Groovy Script</strong>
              <Input.TextArea disabled={readOnly} value={configuration.customScript} onChange={(event) => update({ customScript: event.target.value })} rows={9} style={{ marginTop: 8, fontFamily: 'monospace', background: '#1f1f1f', color: '#f5f5f5' }} />
            </div>}

            <Divider />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><strong>{configuration.matchType === 'type_field' ? 'Type Value Combinations' : 'Capability Results'}</strong>{!readOnly && configuration.matchType !== 'single' && <Button type="text" icon={<PlusOutlined />} onClick={addResult}>Add</Button>}</div>
            {configuration.rules.map((rule, index) => <div key={rule.id} onClick={() => setSelectedRuleId(rule.id)} style={{ marginTop: 10, padding: 12, border: selectedRule?.id === rule.id ? '1px solid #722ed1' : '1px solid #e8e8e8', borderRadius: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}><span>Result {index + 1}</span>{!readOnly && configuration.matchType !== 'single' && <Button type="text" danger size="small" icon={<DeleteOutlined />} onClick={(event) => { event.stopPropagation(); deleteResult(rule.id); }} />}</div>
              {configuration.matchType === 'type_field' && configuration.matchFields.map((field) => <Input key={field} disabled={readOnly} addonBefore={field} placeholder="Value or EMPTY_STR" value={rule.fieldValues[field]} onChange={(event) => updateRule(rule.id, { fieldValues: { ...rule.fieldValues, [field]: event.target.value } })} style={{ marginBottom: 6 }} />)}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
                <Select disabled={readOnly} placeholder="Business Type" value={rule.bt || undefined} options={btOptions} onChange={(bt) => updateRule(rule.id, { bt, ability: '', action: '' })} />
                <Select disabled={readOnly || !rule.bt} placeholder="Ability" value={rule.ability || undefined} options={abilities.filter((item) => item.bt === rule.bt).map((item) => ({ value: item.ability }))} onChange={(ability) => updateRule(rule.id, { ability, action: '' })} />
                <Select disabled={readOnly || !rule.ability} placeholder="Action" value={rule.action || undefined} options={(capabilityActionOptions[`${rule.bt}:${rule.ability}`] ?? ['TRANSACTION', 'QUERY', 'VERIFY']).map((value) => ({ value }))} onChange={(action) => updateRule(rule.id, { action })} />
              </div>
            </div>)}
            {configuration.rules.length === 0 && <div style={{ padding: 20, textAlign: 'center', color: '#8c8c8c' }}>No Capability Result configured</div>}
        </div>
      </Drawer>

    </div>
  );
}

function LegacyInboundFlowEditor({
  channelCode,
  endpoint,
  configuration,
  readOnly,
}: {
  channelCode: string;
  endpoint: InboundEndpoint;
  configuration: CapabilityDecisionVersion;
  readOnly: boolean;
}) {
  const navigate = useNavigate();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const updateDecisionVersion = useMatchCapabilityStore((state) => state.updateDecisionVersion);
  const saveChannel = useMatchCapabilityStore((state) => state.saveChannel);
  const submitVersion = useMatchCapabilityStore((state) => state.submitVersion);
  const components = configuration.legacyComponents ?? [];
  const selected = components.find((component) => component.id === selectedId);

  const updateComponent = (component: LegacyInboundComponent, key: string, value: string | boolean) => {
    updateDecisionVersion(channelCode, endpoint.id, configuration.id, {
      legacyComponents: components.map((item) => item.id === component.id ? { ...item, config: { ...item.config, [key]: value } } : item),
    });
  };

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: '#f5f7fa' }}>
      <div style={{ height: 58, padding: '0 20px', display: 'flex', alignItems: 'center', background: '#fff', borderBottom: '1px solid #f0f0f0' }}>
        <Button type="text" icon={<ArrowLeftOutlined />} onClick={() => navigate(`/channel-integration/${channelCode}/integration/match-capability`)}>Back</Button>
        <Divider type="vertical" />
        <Space><Tag color="purple">Legacy 1.0</Tag><strong>{readOnly ? 'Inbound Flow Detail' : 'Configure Legacy Inbound Flow'}</strong></Space>
        <div style={{ flex: 1 }} />
        {!readOnly && <Space>
          <Button icon={<SaveOutlined />} onClick={() => { saveChannel(channelCode); message.success('Legacy Inbound Flow draft saved'); }}>Save Draft</Button>
          <Button type="primary" icon={<CloudUploadOutlined />} onClick={() => { submitVersion(channelCode, endpoint.id, configuration.id); message.success('Legacy Capability Matching submitted. The current Version is ready to deploy.'); navigate(`/channel-integration/${channelCode}/integration/match-capability`); }}>Submit</Button>
        </Space>}
      </div>

      <div style={{ padding: '12px 16px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr repeat(5, 1fr)', background: '#fff', border: '1px solid #e8e8e8', borderRadius: 8, padding: 14 }}>
          {[
            ['URI', endpoint.url], ['Flow Name', configuration.name], ['Matching ID', configuration.id], ['Version', configuration.version], ['Status', configuration.configStatus], ['Endpoint ID', endpoint.id],
          ].map(([label, value]) => <div key={label} style={{ padding: '0 14px', borderRight: label === 'Endpoint ID' ? 'none' : '1px solid #f0f0f0' }}><div style={{ color: '#8c8c8c', fontSize: 10 }}>{label}</div><div style={{ marginTop: 4, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis' }}>{value}</div></div>)}
        </div>
      </div>

      <Alert
        type="info"
        showIcon
        message="Legacy Inbound Flow compatibility mode"
        description="The original component set and order are fixed. Components cannot be added, removed, or reordered; supported forms remain configurable."
        style={{ margin: '0 16px 12px' }}
      />

      <div style={{ flex: 1, minHeight: 0, display: 'grid', gridTemplateColumns: '292px 304px minmax(430px, 1fr)', margin: '0 16px 16px', background: '#fff', border: '1px solid #e8e8e8', borderRadius: 8, overflow: 'hidden' }}>
        <CanvasContextPanel channelCode={channelCode} mode="matching" readOnly={readOnly} />

        <div style={{ borderRight: '1px solid #f0f0f0', overflow: 'auto' }}>
          <div style={{ padding: 14, fontWeight: 600, borderBottom: '1px solid #f0f0f0' }}>Component Library</div>
          <div style={{ padding: 12 }}>
            {components.map((component) => <div key={component.id} style={{ marginBottom: 9, padding: 11, border: '1px solid #e8e8e8', borderRadius: 7, background: '#fafafa' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><strong>{component.code}</strong><Tag icon={<LockOutlined />}>Fixed</Tag></div>
              <div style={{ color: '#8c8c8c', fontSize: 11 }}>{component.name}</div>
            </div>)}
          </div>
        </div>

        <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          <div style={{ height: 44, display: 'flex', alignItems: 'center', padding: '0 16px', borderBottom: '1px solid #f0f0f0', fontWeight: 600 }}>Legacy Inbound Flow Canvas</div>
          <div style={{ flex: 1, overflow: 'auto', padding: 30, backgroundImage: 'radial-gradient(#d9d9d9 1px, transparent 1px)', backgroundSize: '16px 16px' }}>
            {components.map((component, index) => <div key={component.id}>
              <button onClick={() => setSelectedId(component.id)} style={{ display: 'block', width: 330, margin: '0 auto', padding: 14, textAlign: 'left', border: '1px solid #9254de', borderRadius: 8, background: '#f9f0ff', cursor: 'pointer' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span><Tag color="purple">Legacy</Tag><strong>{component.code}</strong></span><Tag color="green">Configured</Tag></div>
                <div style={{ color: '#595959', fontSize: 11, marginTop: 5 }}>Click to {readOnly ? 'view' : 'configure'} · position locked</div>
              </button>
              {index < components.length - 1 && <div style={{ textAlign: 'center', fontSize: 24, lineHeight: '38px' }}>↓</div>}
            </div>)}
          </div>
        </div>
      </div>

      <Drawer title={selected ? `${selected.code} Configuration` : 'Legacy Component Configuration'} width={560} open={Boolean(selected)} onClose={() => setSelectedId(null)}>
        {selected && <div>
          <Alert type="info" showIcon message="Component position and type are inherited from the 1.0 Flow." style={{ marginBottom: 18 }} />
          {selected.code === 'asyncExecuteFlow' && <Alert
            type="warning"
            showIcon
            message="Legacy forward Flow ID reference"
            description="This 1.0 component currently points to Flow ID 371. Its mapping to the 2.0 stable Flow identity and Version scope must be verified during migration."
            style={{ marginBottom: 18 }}
          />}
          {Object.entries(selected.config).map(([key, value]) => <div key={key} style={{ marginBottom: 16 }}>
            <div style={{ color: '#595959', marginBottom: 6 }}>{key}</div>
            {typeof value === 'boolean'
              ? <Switch disabled={readOnly} checked={value} onChange={(checked) => updateComponent(selected, key, checked)} />
              : <Input disabled={readOnly} value={String(value)} onChange={(event) => updateComponent(selected, key, event.target.value)} />}
          </div>)}
        </div>}
      </Drawer>
    </div>
  );
}

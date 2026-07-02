import { useCallback, useEffect, useState } from 'react';
import type { DragEvent } from 'react';
import { Alert, Button, Divider, Drawer, Input, message, Select, Space, Switch, Tag, Typography } from 'antd';
import { ArrowLeftOutlined, CheckCircleOutlined, CloudUploadOutlined, DeleteOutlined, LockOutlined, PlusOutlined, SaveOutlined } from '@ant-design/icons';
import { ReactFlow, Background, Controls, MiniMap, Handle, Position, addEdge, MarkerType } from '@xyflow/react';
import type { Connection, Edge, Node } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { capabilityActionOptions } from '../../mock/data';
import { useConfigIntegrationStore } from './configIntegrationStore';
import { useMatchCapabilityStore } from './matchCapabilityStore';
import type { CapabilityDecisionVersion, InboundEndpoint, InboundRequestField, LegacyInboundComponent, MatchRule, MatchingType } from './types';
import CanvasContextPanel from './CanvasContextPanel';

const matchingTypeOptions: Array<{ value: MatchingType; label: string }> = [
  { value: 'single', label: 'Single Type' },
  { value: 'order_no', label: 'By Order' },
  { value: 'type_field', label: 'By Field' },
];

const requestFormats = ['Custom', 'FORM_DATA', 'JSON', 'X_WWW_FORM_URLENCODED', 'XML'].map((value) => ({ value }));
const { Text } = Typography;

type MatchLibraryComponent = { code: 'inboundPreprocess' | 'condition' | 'specifyCapability' | 'matchCapabilityByOrder'; description: string; usage: 'single' | 'multiple' };
const MATCH_COMPONENTS: MatchLibraryComponent[] = [
  { code: 'inboundPreprocess', description: 'Parse Common Request, message format and decryption', usage: 'single' },
  { code: 'condition', description: 'Branch by field rules or Groovy script', usage: 'multiple' },
  { code: 'specifyCapability', description: 'Specify Business Type, Ability and Action', usage: 'multiple' },
  { code: 'matchCapabilityByOrder', description: 'Resolve Capability from a matched gateway order', usage: 'single' },
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
  const [activeDrawer, setActiveDrawer] = useState<'preprocess' | 'condition' | 'capability' | 'order' | null>(null);
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
    return rule.id;
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
    if (configuration.matchType === 'order_no' && configuration.rules.length > 0) return 'By Order obtains Capability from the matched order and must not configure Capability Result nodes';
    if (configuration.matchType === 'order_no' && (configuration.requestFields.length !== 1 || !configuration.singleNoField || !configuration.referenceField)) return 'Order No requires exactly one match field and a reference type';
    if (configuration.matchType === 'type_field' && configuration.matchFields.length === 0) return 'Type Field requires at least one input field';
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

      <div style={{ flex: 1, minHeight: 0, display: 'flex', margin: '0 16px 16px', background: '#fff', border: '1px solid #e8e8e8', borderRadius: 8, overflow: 'hidden' }}>
        <CanvasContextPanel channelCode={channelCode} mode="matching" readOnly={readOnly} />
        <MatchCapabilityCanvas
          configuration={configuration}
          readOnly={readOnly}
          onOpenDrawer={(drawer, ruleId) => { if (ruleId) setSelectedRuleId(ruleId); setActiveDrawer(drawer); }}
          onAddResult={addResult}
        />
      </div>

      <Drawer title="inboundPreprocess Configuration" width={760} open={activeDrawer === 'preprocess'} onClose={() => setActiveDrawer(null)}>
        <div style={{ paddingBottom: 24 }}>
            <Alert type="info" showIcon message="Request Message Format is defined here once and inherited by the target Flow at runtime." style={{ marginBottom: 14 }} />
            <div style={{ color: '#8c8c8c', fontSize: 11, marginBottom: 6 }}>Callback Type Model</div>
            <Select disabled={readOnly} value={configuration.matchType} style={{ width: '100%' }} options={matchingTypeOptions} onChange={(matchType) => update({
              matchType,
              requestFields: [],
              fields: [],
              matchFieldSource: undefined,
              matchFields: [],
              singleNoField: '',
              referenceField: undefined,
              rules: matchType === 'order_no' ? [] : (matchType === 'single' ? [configuration.rules[0] ?? createRule()] : (configuration.rules.length ? configuration.rules : [createRule(), createRule()])).map((rule) => ({ ...rule, fieldValues: {} })),
            })} />

            <div style={{ color: '#8c8c8c', fontSize: 11, margin: '14px 0 6px' }}>Request Message Format</div>
            <Select disabled={readOnly} value={configuration.requestMessageFormat ?? 'JSON'} style={{ width: '100%' }} options={requestFormats} onChange={(requestMessageFormat) => update({ requestMessageFormat })} />

            <Divider>Common Request</Divider>
            {configuration.matchType === 'single' && <Alert type="info" showIcon message="Single Type does not require additional request discriminator fields." />}

            {(configuration.matchType === 'type_field' || configuration.matchType === 'order_no') && <div>
              {renderFieldSection('path', 'Path Variables')}
              {renderFieldSection('query', 'Query Parameters')}
              {renderFieldSection('header', 'Request Header')}
              {renderFieldSection('body', 'Request Body')}
            </div>}
            <Divider />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><strong>Decryption before matching</strong><Switch disabled={readOnly} checked={configuration.decryptEnabled} onChange={(decryptEnabled) => update({ decryptEnabled })} /></div>
            {configuration.decryptEnabled && <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 12 }}><Select placeholder="Encrypted field" options={configuration.requestFields.map((field) => ({ value: fieldPath(field) }))} /><Select placeholder="Algorithm" options={['AES (CBC)', 'AES (ECB)', 'Custom', 'RSA'].map((value) => ({ value }))} /></div>}
        </div>
      </Drawer>

      <Drawer title="condition Configuration" width={780} open={activeDrawer === 'condition'} onClose={() => setActiveDrawer(null)}>
        <Alert type="info" showIcon message="Each effective branch must connect to exactly one specifyCapability component." />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 18 }}><strong>Branches</strong>{!readOnly && <Button type="primary" ghost icon={<PlusOutlined />} onClick={addResult}>Add Branch</Button>}</div>
        {configuration.rules.map((rule, index) => <div key={rule.id} style={{ marginTop: 10, padding: 12, border: '1px solid #e8e8e8', borderRadius: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}><strong>Branch {index + 1}</strong>{!readOnly && <Button type="text" danger icon={<DeleteOutlined />} onClick={() => deleteResult(rule.id)} />}</div>
          {configuration.matchFields.map((field) => <Input key={field} disabled={readOnly} addonBefore={field} placeholder="Value, EMPTY_STR or *" value={rule.fieldValues[field]} onChange={(event) => updateRule(rule.id, { fieldValues: { ...rule.fieldValues, [field]: event.target.value } })} style={{ marginTop: 8 }} />)}
          <Button type="link" style={{ paddingLeft: 0, marginTop: 4 }} onClick={() => { setSelectedRuleId(rule.id); setActiveDrawer('capability'); }}>Configure target Capability →</Button>
        </div>)}
        <Divider>Optional Groovy condition</Divider>
        <Input.TextArea disabled={readOnly} value={configuration.customScript} onChange={(event) => update({ customScript: event.target.value })} rows={8} placeholder="Use a Groovy condition when field comparisons are not sufficient." style={{ fontFamily: 'monospace', background: '#1f1f1f', color: '#f5f5f5' }} />
      </Drawer>

      <Drawer title="specifyCapability Configuration" width={620} open={activeDrawer === 'capability'} onClose={() => setActiveDrawer(null)}>
        {selectedRule ? <><Alert type="info" showIcon message="This component terminates one matching path and declares its unique Capability Result." style={{ marginBottom: 18 }} /><div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
          <Select disabled={readOnly} placeholder="Business Type" value={selectedRule.bt || undefined} options={btOptions} onChange={(bt) => updateRule(selectedRule.id, { bt, ability: '', action: '' })} />
          <Select disabled={readOnly || !selectedRule.bt} placeholder="Ability" value={selectedRule.ability || undefined} options={abilities.filter((item) => item.bt === selectedRule.bt).map((item) => ({ value: item.ability }))} onChange={(ability) => updateRule(selectedRule.id, { ability, action: '' })} />
          <Select disabled={readOnly || !selectedRule.ability} placeholder="Action" value={selectedRule.action || undefined} options={(capabilityActionOptions[`${selectedRule.bt}:${selectedRule.ability}`] ?? ['TRANSACTION', 'QUERY', 'VERIFY']).map((value) => ({ value }))} onChange={(action) => updateRule(selectedRule.id, { action })} />
        </div></> : <Alert type="warning" showIcon message="Select a specifyCapability component from the canvas first." />}
      </Drawer>

      <Drawer title="matchCapabilityByOrder Configuration" width={650} open={activeDrawer === 'order'} onClose={() => setActiveDrawer(null)}>
        <Alert type="info" showIcon message="Capability is read automatically from the matched gateway order; no specifyCapability component is required." style={{ marginBottom: 18 }} />
        <div style={{ color: '#8c8c8c', fontSize: 11, marginBottom: 6 }}>Common Request field</div>
        <Select disabled={readOnly} value={configuration.singleNoField || undefined} placeholder="Select the single order reference field" style={{ width: '100%' }} options={configuration.requestFields.map((field) => ({ value: fieldPath(field) }))} onChange={(singleNoField) => update({ singleNoField })} />
        <div style={{ color: '#8c8c8c', fontSize: 11, margin: '14px 0 6px' }}>Compare with gateway order</div>
        <Select disabled={readOnly} value={configuration.referenceField} placeholder="Select reference" style={{ width: '100%' }} options={[{ value: 'requestReference' }, { value: 'responseReference' }]} onChange={(referenceField) => update({ referenceField })} />
      </Drawer>

    </div>
  );
}

function MatchComponentLibrary({ onAdd, readOnly }: { onAdd: (code: MatchLibraryComponent['code']) => void; readOnly: boolean }) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [searchText, setSearchText] = useState('');
  const filtered = MATCH_COMPONENTS.filter((item) => item.code.toLowerCase().includes(searchText.toLowerCase()) || item.description.toLowerCase().includes(searchText.toLowerCase()));
  const handleDragStart = (event: DragEvent, code: MatchLibraryComponent['code']) => {
    event.dataTransfer.setData('application/reactflow', code);
    event.dataTransfer.effectAllowed = 'move';
  };
  if (!isExpanded) return <div onClick={() => setIsExpanded(true)} style={{ width: 32, height: '100%', background: '#fafafa', borderRight: '1px solid #f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', writingMode: 'vertical-rl', fontSize: 12, fontWeight: 500, color: '#666', gap: 4 }}><span>Component Library</span><span>→</span></div>;
  return <div style={{ width: 304, height: '100%', background: '#fff', borderRight: '1px solid #f0f0f0', display: 'flex', flexDirection: 'column' }}>
    <div style={{ padding: '8px 12px', borderBottom: '1px solid #f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}><span style={{ fontWeight: 600, fontSize: 13 }}>Component Library</span><Button type="text" size="small" onClick={() => setIsExpanded(false)}>← Collapse</Button></div>
    <div style={{ padding: '8px 12px', borderBottom: '1px solid #f0f0f0' }}><Input placeholder="Search components..." prefix={<span style={{ color: '#999', fontSize: 12 }}>🔍</span>} value={searchText} onChange={(event) => setSearchText(event.target.value)} size="small" /></div>
    {!readOnly && <div style={{ padding: '4px 12px', background: '#e6f7ff', fontSize: 10, color: '#1890ff', textAlign: 'center' }}>Drag or click a component to add it</div>}
    <div style={{ flex: 1, overflow: 'auto', padding: 8 }}>{filtered.map((component) => <div key={component.code} draggable={!readOnly} onDragStart={(event) => handleDragStart(event, component.code)} onClick={() => !readOnly && onAdd(component.code)} style={{ padding: '8px 12px', marginBottom: 6, border: '1px solid #e8e8e8', borderRadius: 6, cursor: readOnly ? 'default' : 'grab', fontSize: 12, background: '#fff' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}><div><div style={{ fontWeight: 500 }}>{component.code}</div><div style={{ color: '#888', fontSize: 10 }}>{component.description}</div></div><Tag color={component.usage === 'single' ? 'default' : 'green'} style={{ fontSize: 9, margin: 0, height: 20 }}>{component.usage === 'single' ? 'Single Use' : 'Multiple'}</Tag></div>
    </div>)}{filtered.length === 0 && <Text type="secondary" style={{ fontSize: 12 }}>No matching components</Text>}</div>
  </div>;
}

function MatchFlowNode({ data }: { data: Record<string, any> }) {
  const configured = Boolean(data.isConfigured);
  return <div onClick={() => data.onConfig?.()} style={{ border: `1.5px solid ${configured ? '#52c41a' : '#d9d9d9'}`, borderRadius: 8, background: configured ? '#fafff0' : '#fafafa', padding: '10px 14px', minWidth: 220, position: 'relative', cursor: 'pointer' }}>
    <Handle type="target" position={Position.Top} style={{ background: '#1890ff' }} />
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><span style={{ fontSize: 12, color: configured ? '#52c41a' : '#999' }}>{configured ? '●' : '○'}</span><span style={{ flex: 1, fontWeight: 600, fontSize: 12 }}>{data.code}</span>{configured && <CheckCircleOutlined style={{ color: '#52c41a', fontSize: 12 }} />}</div>
    <div style={{ color: '#8c8c8c', fontSize: 10, margin: '3px 0 0 20px' }}>{data.description}</div>
    <Handle type="source" position={Position.Bottom} style={{ background: '#1890ff' }} />
  </div>;
}

const matchNodeTypes = { flowNode: MatchFlowNode };

function seedMatchGraph(configuration: CapabilityDecisionVersion, onOpenDrawer: (drawer: 'preprocess' | 'condition' | 'capability' | 'order', ruleId?: string) => void): { nodes: Node[]; edges: Edge[] } {
  const makeNode = (id: string, code: MatchLibraryComponent['code'], x: number, y: number, description: string, drawer: 'preprocess' | 'condition' | 'capability' | 'order', ruleId?: string): Node => ({ id, type: 'flowNode', position: { x, y }, data: { code, description, isConfigured: true, ruleId, onConfig: () => onOpenDrawer(drawer, ruleId) } });
  const preprocess = makeNode('preprocess', 'inboundPreprocess', 320, 50, `${matchingTypeOptions.find((item) => item.value === configuration.matchType)?.label} · ${configuration.requestMessageFormat ?? 'JSON'}`, 'preprocess');
  if (configuration.matchType === 'order_no') return { nodes: [preprocess, makeNode('order', 'matchCapabilityByOrder', 320, 210, configuration.referenceField ? `Compare with ${configuration.referenceField}` : 'Configure order reference comparison', 'order')], edges: [{ id: 'match_e1', source: 'preprocess', target: 'order', type: 'smoothstep', markerEnd: { type: MarkerType.ArrowClosed } }] };
  if (configuration.matchType === 'single') {
    const rule = configuration.rules[0];
    return { nodes: [preprocess, makeNode(`cap_${rule?.id ?? 'single'}`, 'specifyCapability', 320, 210, rule?.ability ? `${rule.bt} / ${rule.ability} / ${rule.action}` : 'Specify Capability Result', 'capability', rule?.id)], edges: [{ id: 'match_e1', source: 'preprocess', target: `cap_${rule?.id ?? 'single'}`, type: 'smoothstep', markerEnd: { type: MarkerType.ArrowClosed } }] };
  }
  const condition = makeNode('condition', 'condition', 320, 200, 'Branch by field rules or Groovy script', 'condition');
  const resultNodes = configuration.rules.map((rule, index) => makeNode(`cap_${rule.id}`, 'specifyCapability', 80 + index * 300, 380, rule.ability ? `${rule.bt} / ${rule.ability} / ${rule.action}` : 'Specify Capability Result', 'capability', rule.id));
  return { nodes: [preprocess, condition, ...resultNodes], edges: [{ id: 'match_e1', source: 'preprocess', target: 'condition', type: 'smoothstep', markerEnd: { type: MarkerType.ArrowClosed } }, ...resultNodes.map((node, index) => ({ id: `match_branch_${index}`, source: 'condition', target: node.id, type: 'smoothstep', markerEnd: { type: MarkerType.ArrowClosed } }))] };
}

function MatchCapabilityCanvas({ configuration, readOnly, onOpenDrawer, onAddResult }: { configuration: CapabilityDecisionVersion; readOnly: boolean; onOpenDrawer: (drawer: 'preprocess' | 'condition' | 'capability' | 'order', ruleId?: string) => void; onAddResult: () => string }) {
  const initial = seedMatchGraph(configuration, onOpenDrawer);
  const [nodes, setNodes] = useState<Node[]>(initial.nodes);
  const [edges, setEdges] = useState<Edge[]>(initial.edges);
  const graphKey = `${configuration.matchType}:${configuration.rules.map((rule) => rule.id).join(',')}`;
  useEffect(() => { const next = seedMatchGraph(configuration, onOpenDrawer); setNodes(next.nodes); setEdges(next.edges); }, [graphKey]);
  const addComponent = useCallback((code: MatchLibraryComponent['code']) => {
    const libraryItem = MATCH_COMPONENTS.find((item) => item.code === code);
    if (libraryItem?.usage === 'single' && nodes.some((node) => node.data.code === code)) return void message.warning(`${code} can only be added once`);
    const ruleId = code === 'specifyCapability' ? onAddResult() : undefined;
    const drawer = code === 'inboundPreprocess' ? 'preprocess' : code === 'condition' ? 'condition' : code === 'matchCapabilityByOrder' ? 'order' : 'capability';
    const node: Node = { id: `${code}_${Date.now()}`, type: 'flowNode', position: { x: 320, y: nodes.length * 120 + 50 }, data: { code, description: libraryItem?.description, isConfigured: false, ruleId, onConfig: () => onOpenDrawer(drawer, ruleId) } };
    setNodes((current) => [...current, node]);
  }, [nodes, onAddResult, onOpenDrawer]);
  const onConnect = useCallback((connection: Connection) => setEdges((current) => addEdge({ ...connection, id: `edge_${Date.now()}`, type: 'smoothstep', markerEnd: { type: MarkerType.ArrowClosed } }, current)), []);
  const onDrop = useCallback((event: DragEvent) => { event.preventDefault(); const code = event.dataTransfer.getData('application/reactflow') as MatchLibraryComponent['code']; if (MATCH_COMPONENTS.some((item) => item.code === code)) addComponent(code); }, [addComponent]);
  return <><MatchComponentLibrary onAdd={addComponent} readOnly={readOnly} /><div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}><div style={{ height: 42, padding: '0 16px', display: 'flex', alignItems: 'center', background: '#fff', borderBottom: '1px solid #f0f0f0', fontWeight: 600, fontSize: 13 }}>Canvas</div><div style={{ flex: 1, minHeight: 0 }} onDrop={readOnly ? undefined : onDrop} onDragOver={(event) => { if (!readOnly) { event.preventDefault(); event.dataTransfer.dropEffect = 'move'; } }}><ReactFlow nodes={nodes} edges={edges} onConnect={readOnly ? undefined : onConnect} onNodesChange={(changes) => setNodes((current) => current.map((node) => { const move = changes.find((change) => change.type === 'position' && change.id === node.id); return move && 'position' in move && move.position ? { ...node, position: move.position } : node; }))} onNodeClick={(_event, node) => (node.data as any).onConfig?.()} nodeTypes={matchNodeTypes} fitView minZoom={0.1} maxZoom={2}><Background color="#e8e8e8" gap={16} /><Controls /><MiniMap /></ReactFlow></div></div></>;
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

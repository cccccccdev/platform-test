import { useCallback, useEffect, useState } from 'react';
import type { DragEvent } from 'react';
import { Alert, Button, Cascader, Divider, Drawer, Input, message, Select, Space, Switch, Tag, Typography } from 'antd';
import { ArrowLeftOutlined, CheckCircleOutlined, CloudUploadOutlined, DeleteOutlined, LockOutlined, SaveOutlined } from '@ant-design/icons';
import { ReactFlow, Background, Controls, MiniMap, Handle, Position, addEdge, MarkerType } from '@xyflow/react';
import type { Connection, Edge, Node } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { capabilityActionOptions } from '../../mock/data';
import { useConfigIntegrationStore } from './configIntegrationStore';
import { useMatchCapabilityStore } from './matchCapabilityStore';
import type { CapabilityDecisionVersion, ConfigAbility, InboundEndpoint, InboundRequestField, LegacyInboundComponent, MatchRule } from './types';
import CanvasContextPanel from './CanvasContextPanel';
import ConditionConfigurationDrawer, { ConditionNodeDrawer } from './ConditionConfigurationDrawer';
import InboundPreprocessDrawer from './InboundPreprocessDrawer';

const { Text } = Typography;

const EMPTY_ABILITIES: ConfigAbility[] = [];

type MatchLibraryComponent = { code: 'inboundPreprocess' | 'condition' | 'specifyCapability' | 'matchCapabilityByOrder'; description: string; usage: 'single' | 'multiple'; scopes: Array<'Route Matching' | 'Outbound' | 'Inbound'> };
const MATCH_COMPONENTS: MatchLibraryComponent[] = [
  { code: 'inboundPreprocess', description: 'Parse Common Request, message format and decryption', usage: 'single', scopes: ['Route Matching'] },
  { code: 'condition', description: 'Branch by field rules or Groovy script', usage: 'multiple', scopes: ['Route Matching', 'Outbound', 'Inbound'] },
  { code: 'specifyCapability', description: 'Specify Business Type, Ability and Action', usage: 'multiple', scopes: ['Route Matching'] },
  { code: 'matchCapabilityByOrder', description: 'Resolve Capability from a matched gateway order', usage: 'single', scopes: ['Route Matching'] },
];

const createRule = (): MatchRule => ({
  id: `result_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
  fieldValues: {},
  bt: '',
  ability: '',
  action: '',
});

const requestFieldSourceLabels: Record<InboundRequestField['source'], string> = {
  path: 'Path Variables',
  query: 'Query Parameters',
  header: 'Headers',
  body: 'Body',
};

const buildRequestFieldCascaderOptions = (requestFields: InboundRequestField[]) =>
  (Object.entries(requestFieldSourceLabels) as Array<[InboundRequestField['source'], string]>).map(([source, label]) => ({
    label,
    value: source,
    isLeaf: false,
    children: requestFields
      .filter((field) => field.source === source)
      .map((field) => ({ label: field.name, value: field.name })),
  }));

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
  const abilitiesByChannel = useConfigIntegrationStore((state) => state.abilitiesByChannel);
  const abilities = abilitiesByChannel[channelCode] ?? EMPTY_ABILITIES;
  const configuration = endpoint?.versions.find((version) => version.id === decisionVersionId);
  const [selectedRuleId, setSelectedRuleId] = useState<string | null>(configuration?.rules[0]?.id ?? null);
  const [activeDrawer, setActiveDrawer] = useState<'preprocess' | 'condition' | 'capability' | 'order' | null>(null);
  const [capabilityDraft, setCapabilityDraft] = useState<Pick<MatchRule, 'bt' | 'ability' | 'action'>>({ bt: '', ability: '', action: '' });
  const [orderDraft, setOrderDraft] = useState<{ singleNoField: string; referenceField?: 'requestReference' | 'responseReference' }>({ singleNoField: '' });
  const [showSubmitRemark, setShowSubmitRemark] = useState(false);
  const [submitRemark, setSubmitRemark] = useState('');
  const readOnly = searchParams.get('mode') === 'detail';
  const runtimeDetail = searchParams.get('source') === 'runtime';
  if (!endpoint || !configuration) {
    return <div style={{ padding: 24 }}><h3>Route Matching Version not found</h3><Button onClick={() => navigate(-1)}>Back</Button></div>;
  }

  if (runtimeDetail && readOnly) {
    const orderCapabilityNodes = [
      { id: 'preprocess', title: 'inboundPreprocess', subtitle: `Prepare matching fields · ${configuration.requestMessageFormat ?? 'JSON'}` },
      { id: 'order', title: 'matchCapabilityByOrder', subtitle: configuration.referenceField ? `Compare with ${configuration.referenceField}` : 'Order reference matching' },
    ];
    const capabilityNodes = configuration.sourceType === 'legacy'
      ? (configuration.legacyComponents ?? []).map((component) => ({ id: component.id, title: component.code, subtitle: component.name }))
      : configuration.matchType === 'order_no'
        ? orderCapabilityNodes
        : configuration.rules.map((rule) => ({
            id: rule.id,
            title: configuration.matchType === 'single' ? 'specifyCapability' : `specifyCapability · ${rule.fieldValues ? Object.values(rule.fieldValues).join(' / ') : ''}`,
            subtitle: rule.ability ? `${rule.bt} / ${rule.ability} / ${rule.action}` : 'Capability Result',
          }));
    const canvasNodes = configuration.matchType === 'type_field' && configuration.sourceType !== 'legacy'
      ? [{ id: 'preprocess', title: 'inboundPreprocess', subtitle: `Prepare matching fields · ${configuration.requestMessageFormat ?? 'JSON'}` }, { id: 'condition', title: 'condition', subtitle: 'Branch by field rules' }, ...capabilityNodes]
      : capabilityNodes;
    return (
      <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: '#f5f7fa' }}>
        <div style={{ height: 58, padding: '0 20px', display: 'flex', alignItems: 'center', background: '#fff', borderBottom: '1px solid #f0f0f0' }}>
          <Button type="text" icon={<ArrowLeftOutlined />} onClick={() => navigate(-1)}>Back</Button>
          <Divider type="vertical" />
          <strong>Runtime Control / Route Matching Detail</strong>
        </div>
        <div style={{ padding: '12px 16px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr repeat(4, 1fr)', background: '#fff', border: '1px solid #e8e8e8', borderRadius: 8, padding: 14 }}>
            {[
              ['URI', endpoint.url], ['Method', endpoint.method],
              ['Matching ID', configuration.id], ['Version', configuration.version], ['Status', configuration.configStatus],
            ].map(([label, value], index, items) => <div key={label} style={{ padding: '0 14px', borderRight: index === items.length - 1 ? 'none' : '1px solid #f0f0f0' }}><div style={{ color: '#8c8c8c', fontSize: 10 }}>{label}</div><div style={{ marginTop: 4, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis' }}>{value}</div></div>)}
          </div>
        </div>
        <div style={{ flex: 1, minHeight: 0, display: 'flex', margin: '0 16px 16px', background: '#fff', border: '1px solid #e8e8e8', borderRadius: 8, overflow: 'hidden' }}>
          <div style={{ width: 292, borderRight: '1px solid #f0f0f0', background: '#fff', overflow: 'auto' }}>
            <div style={{ height: 42, padding: '0 16px', display: 'flex', alignItems: 'center', borderBottom: '1px solid #f0f0f0', fontWeight: 600, fontSize: 13 }}>Context</div>
            <div style={{ padding: 14 }}>
              <div style={{ color: '#8c8c8c', fontSize: 11, marginBottom: 6 }}>Channel</div>
              <Tag style={{ marginBottom: 16 }}>{channelCode}</Tag>
              <div style={{ color: '#8c8c8c', fontSize: 11, marginBottom: 6 }}>Route Matching Fields</div>
              {configuration.requestFields.length ? configuration.requestFields.map((field) => (
                <div key={field.id} style={{ padding: '8px 10px', border: '1px solid #f0f0f0', borderRadius: 6, marginBottom: 8 }}>
                  <div style={{ fontWeight: 600 }}>{field.source}.{field.name}</div>
                  <div style={{ color: '#8c8c8c', fontSize: 11 }}>{field.type} · {field.moc === 'yes' ? 'required' : 'optional'}</div>
                </div>
              )) : <Text type="secondary">No request fields.</Text>}
            </div>
          </div>
          <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
            <div style={{ height: 42, padding: '0 16px', display: 'flex', alignItems: 'center', background: '#fff', borderBottom: '1px solid #f0f0f0', fontWeight: 600, fontSize: 13 }}>Canvas</div>
            <div style={{ flex: 1, overflow: 'auto', padding: 36, backgroundImage: 'radial-gradient(#d9d9d9 1px, transparent 1px)', backgroundSize: '16px 16px' }}>
              {canvasNodes.map((node, index) => (
                <div key={node.id}>
                  <div style={{ width: 360, margin: '0 auto', padding: 14, border: '1px solid #9254de', borderRadius: 8, background: '#f9f0ff' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                      <strong>{node.title}</strong>
                      <Tag color="green">Configured</Tag>
                    </div>
                    <div style={{ color: '#595959', fontSize: 11, marginTop: 5 }}>{node.subtitle}</div>
                  </div>
                  {index < canvasNodes.length - 1 && <div style={{ textAlign: 'center', fontSize: 24, lineHeight: '42px' }}>↓</div>}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (configuration.sourceType === 'legacy') {
    return <LegacyInboundFlowEditor channelCode={channelCode} endpoint={endpoint} configuration={configuration} readOnly={readOnly} />;
  }

  const update = (updates: Partial<typeof configuration>) => updateDecisionVersion(channelCode, endpoint.id, configuration.id, updates);
  const fieldPath = (field: InboundRequestField) => `${field.source}.${field.name}`;
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
    navigate(`/channel-integration/${channelCode}/integration/config/route-matching`);
  };
  const handleSubmit = () => {
    const error = validate();
    if (error) return void message.error(error);
    setSubmitRemark(configuration.remark ?? '');
    setShowSubmitRemark(true);
  };
  const confirmSubmit = () => {
    submitVersion(channelCode, endpoint.id, configuration.id, submitRemark);
    message.success('Route Matching submitted. The current Version is ready to deploy.');
    navigate(`/channel-integration/${channelCode}/integration/config/route-matching`);
  };

  const btOptions = [...new Set(abilities.map((item) => item.bt))].map((value) => ({ value }));
  const selectedRule = configuration.rules.find((rule) => rule.id === selectedRuleId);
  const pathVariables = [...endpoint.url.matchAll(/\{([A-Za-z_][A-Za-z0-9_]*)\}/g)].map((match) => match[1]);
  const requestFieldOptions = buildRequestFieldCascaderOptions(configuration.requestFields);
  const isConfiguredRequestField = (fieldPathValue: string) => configuration.requestFields.some((field) => fieldPath(field) === fieldPathValue);
  const openDrawer = (drawer: 'preprocess' | 'condition' | 'capability' | 'order', ruleId?: string) => {
    if (ruleId) setSelectedRuleId(ruleId);
    const rule = configuration.rules.find((item) => item.id === (ruleId ?? selectedRuleId));
    if (drawer === 'capability' && rule) setCapabilityDraft({ bt: rule.bt, ability: rule.ability, action: rule.action });
    if (drawer === 'order') setOrderDraft({ singleNoField: configuration.singleNoField, referenceField: configuration.referenceField });
    setActiveDrawer(drawer);
  };
  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: '#f5f7fa' }}>
      <div style={{ height: 58, padding: '0 20px', display: 'flex', alignItems: 'center', background: '#fff', borderBottom: '1px solid #f0f0f0' }}>
        <Button type="text" icon={<ArrowLeftOutlined />} onClick={() => readOnly ? navigate(-1) : navigate(`/channel-integration/${channelCode}/integration/config/route-matching`)}>Back</Button>
        <Divider type="vertical" />
        <strong>{runtimeDetail ? 'Runtime Control / Route Matching Detail' : readOnly ? 'Route Matching Detail' : 'Configure Route Matching'}</strong>
        <div style={{ flex: 1 }} />
        {!readOnly && <Space><Button icon={<SaveOutlined />} onClick={handleSave}>Save Draft</Button><Button type="primary" icon={<CloudUploadOutlined />} onClick={handleSubmit}>Submit</Button></Space>}
      </div>

      <div style={{ padding: '12px 16px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr repeat(4, 1fr)', background: '#fff', border: '1px solid #e8e8e8', borderRadius: 8, padding: 14 }}>
            {[
              ['URI', endpoint.url], ['Method', endpoint.method],
              ['Matching ID', configuration.id], ['Version', configuration.version], ['Status', configuration.configStatus],
            ].map(([label, value], index, items) => <div key={label} style={{ padding: '0 14px', borderRight: index === items.length - 1 ? 'none' : '1px solid #f0f0f0' }}><div style={{ color: '#8c8c8c', fontSize: 10 }}>{label}</div><div style={{ marginTop: 4, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis' }}>{value}</div></div>)}
          </div>
      </div>

      <div style={{ flex: 1, minHeight: 0, display: 'flex', margin: '0 16px 16px', background: '#fff', border: '1px solid #e8e8e8', borderRadius: 8, overflow: 'hidden' }}>
        <CanvasContextPanel channelCode={channelCode} mode="matching" readOnly={readOnly} />
        <MatchCapabilityCanvas
          configuration={configuration}
          readOnly={readOnly}
          onOpenDrawer={openDrawer}
          onAddResult={addResult}
          onDeleteResult={deleteResult}
        />
      </div>

      <Drawer title="Submit Route Matching" width={520} open={showSubmitRemark} onClose={() => setShowSubmitRemark(false)} extra={<Space><Button onClick={() => setShowSubmitRemark(false)}>Cancel</Button><Button type="primary" onClick={confirmSubmit}>Submit</Button></Space>}>
        <Alert type="info" showIcon message="Description will be shown in the Route Matching list." style={{ marginBottom: 16 }} />
        <div style={{ color: '#595959', marginBottom: 6 }}>Description</div>
        <Input.TextArea value={submitRemark} maxLength={200} showCount rows={5} placeholder="Describe this Matching record or configuration change" onChange={(event) => setSubmitRemark(event.target.value)} />
      </Drawer>

      <InboundPreprocessDrawer
        open={activeDrawer === 'preprocess'}
        readOnly={readOnly}
        initialValues={configuration as unknown as Record<string, unknown>}
        pathVariables={pathVariables}
        endpointPath={endpoint.url}
        onClose={() => setActiveDrawer(null)}
        onSave={(values) => {
          const endpointPathFields = pathVariables.map((name, index) => ({ id: `path_${index}`, name, type: 'String', required: true, description: 'Defined by Endpoint Path' }));
          const flatSources: Array<[InboundRequestField['source'], Array<Record<string, unknown>>]> = [
            ['path', endpointPathFields],
            ['query', (values.preprocessQueryFields as Array<Record<string, unknown>>) ?? []],
            ['header', (values.preprocessHeaderFields as Array<Record<string, unknown>>) ?? []],
          ];
          const flattenBody = (fields: Array<Record<string, unknown>>, prefix = ''): InboundRequestField[] => fields.flatMap((field, index) => {
            const name = prefix ? `${prefix}.${String(field.name ?? '')}` : String(field.name ?? '');
            const current = name ? [{ id: String(field.id ?? `body_${index}`), source: 'body' as const, name, type: (field.type ?? 'String') as InboundRequestField['type'], moc: field.required ? 'yes' as const : 'no' as const, description: String(field.description ?? '') }] : [];
            return [...current, ...flattenBody((field.children as Array<Record<string, unknown>>) ?? [], name)];
          });
          const flatRequestFields = flatSources.flatMap(([source, fields]) => fields
            .filter((field) => field.name)
            .map((field, index) => ({
              id: String(field.id ?? `${source}_${index}`),
              source,
              name: String(field.name),
              type: (field.type ?? 'String') as InboundRequestField['type'],
              moc: field.required ? 'yes' as const : 'no' as const,
              description: String(field.description ?? ''),
            })));
          const requestFields = flatRequestFields.concat(flattenBody((values.preprocessBodyFields as Array<Record<string, unknown>>) ?? []));
          update({ ...(values as Partial<typeof configuration>), requestFields, fields: requestFields.map(fieldPath), matchFields: requestFields.map(fieldPath) });
          setActiveDrawer(null);
          message.success('Inbound preprocessing configuration saved');
        }}
      />

      <Drawer title="specifyCapability Configuration" width={620} open={activeDrawer === 'capability'} onClose={() => setActiveDrawer(null)} extra={!readOnly && <Space><Button onClick={() => setActiveDrawer(null)}>Cancel</Button><Button type="primary" onClick={() => { if (!selectedRule || !capabilityDraft.bt || !capabilityDraft.ability || !capabilityDraft.action) return void message.error('Business Type, Ability and Action are required'); updateRule(selectedRule.id, capabilityDraft); setActiveDrawer(null); message.success('Capability configuration submitted'); }}>Submit</Button></Space>}>
        {selectedRule ? <><Alert type="info" showIcon message="This component terminates one matching path and declares its unique Capability Result." style={{ marginBottom: 18 }} /><div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
          <Select disabled={readOnly} placeholder="Business Type" value={capabilityDraft.bt || undefined} options={btOptions} onChange={(bt) => setCapabilityDraft({ bt, ability: '', action: '' })} />
          <Select disabled={readOnly || !capabilityDraft.bt} placeholder="Ability" value={capabilityDraft.ability || undefined} options={abilities.filter((item) => item.bt === capabilityDraft.bt).map((item) => ({ value: item.ability }))} onChange={(ability) => setCapabilityDraft((draft) => ({ ...draft, ability, action: '' }))} />
          <Select disabled={readOnly || !capabilityDraft.ability} placeholder="Action" value={capabilityDraft.action || undefined} options={(capabilityActionOptions[`${capabilityDraft.bt}:${capabilityDraft.ability}`] ?? ['TRANSACTION', 'QUERY', 'VERIFY']).map((value) => ({ value }))} onChange={(action) => setCapabilityDraft((draft) => ({ ...draft, action }))} />
        </div></> : <Alert type="warning" showIcon message="Select a specifyCapability component from the canvas first." />}
      </Drawer>

      <Drawer title="matchCapabilityByOrder Configuration" width={650} open={activeDrawer === 'order'} onClose={() => setActiveDrawer(null)} extra={!readOnly && <Space><Button onClick={() => setActiveDrawer(null)}>Cancel</Button><Button type="primary" onClick={() => { if (!orderDraft.singleNoField || !orderDraft.referenceField) return void message.error('Common Request Field and gateway order reference are required'); if (!isConfiguredRequestField(orderDraft.singleNoField)) return void message.error('Common Request Field must be selected from inboundPreprocess fields'); update(orderDraft); setActiveDrawer(null); message.success('Order matching configuration submitted'); }}>Submit</Button></Space>}>
        <Alert type="info" showIcon message="This component must be connected immediately after inboundPreprocess. Capability is read automatically from the matched gateway order." style={{ marginBottom: 18 }} />
        <div style={{ color: '#8c8c8c', fontSize: 11, marginBottom: 6 }}>Common Request field</div>
        <Cascader
          disabled={readOnly}
          value={orderDraft.singleNoField ? orderDraft.singleNoField.split(/\.(.+)/).filter(Boolean) as string[] : undefined}
          placeholder="Select from inboundPreprocess"
          style={{ width: '100%' }}
          options={requestFieldOptions as any}
          changeOnSelect={false}
          onChange={(value) => {
            const selectedPath = value.filter((item): item is string | number => item != null).join('.');
            if (value.length !== 2 || !isConfiguredRequestField(selectedPath)) return;
            setOrderDraft((draft) => ({ ...draft, singleNoField: selectedPath }));
          }}
        />
        <div style={{ color: '#8c8c8c', fontSize: 11, margin: '14px 0 6px' }}>Compare with gateway order</div>
        <Select disabled={readOnly} value={orderDraft.referenceField} placeholder="Select reference" style={{ width: '100%' }} options={[{ value: 'requestReference' }, { value: 'responseReference' }]} onChange={(referenceField) => setOrderDraft((draft) => ({ ...draft, referenceField }))} />
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
      <div style={{ marginTop: 5 }}>{component.scopes.map((scope) => <Tag key={scope} color={scope === 'Route Matching' ? 'purple' : scope === 'Outbound' ? 'blue' : 'cyan'} style={{ fontSize: 9 }}>{scope}</Tag>)}</div>
    </div>)}{filtered.length === 0 && <Text type="secondary" style={{ fontSize: 12 }}>No matching components</Text>}</div>
  </div>;
}

function MatchFlowNode({ data }: { data: Record<string, any> }) {
  const configured = Boolean(data.isConfigured);
  return <div onClick={() => data.onConfig?.()} style={{ border: `1.5px solid ${configured ? '#52c41a' : '#d9d9d9'}`, borderRadius: 8, background: configured ? '#fafff0' : '#fafafa', padding: '10px 14px', minWidth: 220, position: 'relative', cursor: 'pointer' }}>
    <Handle type="target" position={Position.Top} style={{ background: '#1890ff' }} />
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><span style={{ fontSize: 12, color: configured ? '#52c41a' : '#999' }}>{configured ? '●' : '○'}</span><span style={{ flex: 1, fontWeight: 600, fontSize: 12 }}>{data.code}</span>{configured && <CheckCircleOutlined style={{ color: '#52c41a', fontSize: 12 }} />}{data.onDelete && <Button aria-label={`Delete ${data.code}`} type="text" size="small" danger icon={<DeleteOutlined />} onClick={(event) => { event.stopPropagation(); data.onDelete(); }} />}</div>
    <div style={{ color: '#8c8c8c', fontSize: 10, margin: '3px 0 0 20px' }}>{data.description}</div>
    <Handle type="source" position={Position.Bottom} style={{ background: '#1890ff' }} />
  </div>;
}

const matchNodeTypes = { flowNode: MatchFlowNode };

function seedMatchGraph(configuration: CapabilityDecisionVersion, onOpenDrawer: (drawer: 'preprocess' | 'condition' | 'capability' | 'order', ruleId?: string, nodeId?: string) => void, onDelete: (nodeId: string, ruleId?: string) => void): { nodes: Node[]; edges: Edge[] } {
  const makeNode = (id: string, code: MatchLibraryComponent['code'], x: number, y: number, description: string, drawer: 'preprocess' | 'condition' | 'capability' | 'order', ruleId?: string): Node => ({ id, type: 'flowNode', position: { x, y }, data: { code, description, isConfigured: true, ruleId, onConfig: () => onOpenDrawer(drawer, ruleId, id), onDelete: () => onDelete(id, ruleId) } });
  const preprocess = makeNode('preprocess', 'inboundPreprocess', 320, 50, `Prepare matching fields · ${configuration.requestMessageFormat ?? 'JSON'}`, 'preprocess');
  if (configuration.matchType === 'order_no') {
    const orderNode = makeNode('order', 'matchCapabilityByOrder', 320, 210, configuration.referenceField ? `Compare with ${configuration.referenceField}` : 'Configure order reference comparison', 'order');
    return {
      nodes: [preprocess, orderNode],
      edges: [
        { id: 'match_e1', source: 'preprocess', target: 'order', type: 'smoothstep', markerEnd: { type: MarkerType.ArrowClosed } },
      ],
    };
  }
  if (configuration.matchType === 'single') {
    const rule = configuration.rules[0];
    return { nodes: [makeNode(`cap_${rule?.id ?? 'single'}`, 'specifyCapability', 320, 120, rule?.ability ? `${rule.bt} / ${rule.ability} / ${rule.action}` : 'Specify one Capability Result', 'capability', rule?.id)], edges: [] };
  }
  const condition = makeNode('condition', 'condition', 320, 200, 'Branch by field rules or Groovy script', 'condition');
  const resultNodes = configuration.rules.map((rule, index) => makeNode(`cap_${rule.id}`, 'specifyCapability', 80 + index * 300, 380, rule.ability ? `${rule.bt} / ${rule.ability} / ${rule.action}` : 'Specify Capability Result', 'capability', rule.id));
  return { nodes: [preprocess, condition, ...resultNodes], edges: [{ id: 'match_e1', source: 'preprocess', target: 'condition', type: 'smoothstep', markerEnd: { type: MarkerType.ArrowClosed } }, ...resultNodes.map((node, index) => ({ id: `match_branch_${index}`, source: 'condition', target: node.id, type: 'smoothstep', markerEnd: { type: MarkerType.ArrowClosed } }))] };
}

function MatchCapabilityCanvas({ configuration, readOnly, onOpenDrawer, onAddResult, onDeleteResult }: { configuration: CapabilityDecisionVersion; readOnly: boolean; onOpenDrawer: (drawer: 'preprocess' | 'condition' | 'capability' | 'order', ruleId?: string) => void; onAddResult: () => string; onDeleteResult: (ruleId: string) => void }) {
  const [showConditionNode, setShowConditionNode] = useState(false);
  const [selectedConditionNodeId, setSelectedConditionNodeId] = useState<string | null>(null);
  const openCanvasDrawer = useCallback((drawer: 'preprocess' | 'condition' | 'capability' | 'order', ruleId?: string, nodeId?: string) => {
    if (drawer === 'condition') { setSelectedConditionNodeId(nodeId ?? null); setShowConditionNode(true); }
    else onOpenDrawer(drawer, ruleId);
  }, [onOpenDrawer]);
  const initial = seedMatchGraph(configuration, openCanvasDrawer, () => undefined);
  const [nodes, setNodes] = useState<Node[]>(initial.nodes);
  const [edges, setEdges] = useState<Edge[]>(initial.edges);
  const [selectedConditionEdge, setSelectedConditionEdge] = useState<Edge | null>(null);
  const removeNode = useCallback((nodeId: string, ruleId?: string) => {
    setNodes((current) => current.filter((node) => node.id !== nodeId));
    setEdges((current) => current.filter((edge) => edge.source !== nodeId && edge.target !== nodeId));
    if (ruleId) onDeleteResult(ruleId);
  }, [onDeleteResult]);
  useEffect(() => {
    if (readOnly) return;
    setNodes((current) => current.map((node) => ({ ...node, data: { ...node.data, onDelete: () => removeNode(node.id, node.data.ruleId as string | undefined) } })));
  }, [readOnly, removeNode]);
  const addComponent = useCallback((code: MatchLibraryComponent['code']) => {
    const libraryItem = MATCH_COMPONENTS.find((item) => item.code === code);
    if (libraryItem?.usage === 'single' && nodes.some((node) => node.data.code === code)) return void message.warning(`${code} can only be added once`);
    const ruleId = code === 'specifyCapability' ? onAddResult() : undefined;
    const drawer = code === 'inboundPreprocess' ? 'preprocess' : code === 'condition' ? 'condition' : code === 'matchCapabilityByOrder' ? 'order' : 'capability';
    const nodeId = `${code}_${Date.now()}`;
    const node: Node = { id: nodeId, type: 'flowNode', position: { x: 320, y: nodes.length * 120 + 50 }, data: { code, description: libraryItem?.description, isConfigured: false, ruleId, onConfig: () => openCanvasDrawer(drawer, ruleId, nodeId), onDelete: () => removeNode(nodeId, ruleId) } };
    setNodes((current) => [...current, node]);
  }, [nodes, onAddResult, openCanvasDrawer, removeNode]);
  const onConnect = useCallback((connection: Connection) => {
    const sourceCode = nodes.find((node) => node.id === connection.source)?.data.code;
    const targetCode = nodes.find((node) => node.id === connection.target)?.data.code;
    if (targetCode === 'matchCapabilityByOrder' && sourceCode !== 'inboundPreprocess') {
      return void message.warning('matchCapabilityByOrder must be connected immediately after inboundPreprocess');
    }
    if (sourceCode === 'matchCapabilityByOrder') {
      return void message.warning('matchCapabilityByOrder determines Capability at runtime and cannot connect to downstream components');
    }
    const edge: Edge = { ...connection, id: `edge_${Date.now()}`, type: 'smoothstep', markerEnd: { type: MarkerType.ArrowClosed } };
    setEdges((current) => addEdge(edge, current));
    if (sourceCode === 'condition') setSelectedConditionEdge(edge);
  }, [nodes]);
  const onDrop = useCallback((event: DragEvent) => { event.preventDefault(); const code = event.dataTransfer.getData('application/reactflow') as MatchLibraryComponent['code']; if (MATCH_COMPONENTS.some((item) => item.code === code)) addComponent(code); }, [addComponent]);
  const conditionBranches = edges.filter((edge) => edge.source === selectedConditionNodeId).map((edge, index) => { const condition = edge.data?.condition as any; return { name: condition?.branchName ?? `Branch ${index + 1}`, target: String(nodes.find((node) => node.id === edge.target)?.data.code ?? 'Unknown'), summary: condition?.scriptMode ? 'Groovy Script' : condition?.groups?.length ? `${condition.groups.length} condition group(s)` : '' }; });
  const selectedConditionConfig = nodes.find((node) => node.id === selectedConditionNodeId)?.data.config as Record<string, unknown> | undefined;
  return <>{!readOnly && <MatchComponentLibrary onAdd={addComponent} readOnly={readOnly} />}<div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}><div style={{ height: 42, padding: '0 16px', display: 'flex', alignItems: 'center', background: '#fff', borderBottom: '1px solid #f0f0f0', fontWeight: 600, fontSize: 13 }}>Canvas</div><div style={{ flex: 1, minHeight: 0 }}><ReactFlow nodes={nodes} edges={edges} onDrop={readOnly ? undefined : onDrop} onDragOver={(event) => { if (!readOnly) { event.preventDefault(); event.dataTransfer.dropEffect = 'move'; } }} onConnect={readOnly ? undefined : onConnect} onEdgeClick={(_event, edge) => { if (nodes.find((node) => node.id === edge.source)?.data.code === 'condition') setSelectedConditionEdge(edge); }} onNodesChange={readOnly ? undefined : (changes) => setNodes((current) => current.map((node) => { const move = changes.find((change) => change.type === 'position' && change.id === node.id); return move && 'position' in move && move.position ? { ...node, position: move.position } : node; }))} onNodeClick={(_event, node) => (node.data as any).onConfig?.()} nodeTypes={matchNodeTypes} fitView minZoom={0.1} maxZoom={2}><Background color="#e8e8e8" gap={16} /><Controls /><MiniMap /></ReactFlow></div></div><ConditionNodeDrawer open={showConditionNode} branches={conditionBranches} endCurrentFlow={Boolean(selectedConditionConfig?.endCurrentFlow)} readOnly={readOnly} onClose={() => setShowConditionNode(false)} onSave={({ endCurrentFlow }) => { setNodes((current) => current.map((node) => node.id === selectedConditionNodeId ? { ...node, data: { ...node.data, config: { ...(node.data.config as Record<string, unknown> | undefined), endCurrentFlow } } } : node)); setShowConditionNode(false); }} /><ConditionConfigurationDrawer open={Boolean(selectedConditionEdge)} targetComponent={String(nodes.find((node) => node.id === selectedConditionEdge?.target)?.data.code ?? '')} fieldOptions={configuration.requestFields.map((field) => ({ label: `${field.source}.${field.name}`, value: `${field.source}.${field.name}`, type: field.type }))} value={selectedConditionEdge?.data?.condition as any} readOnly={readOnly} onClose={() => setSelectedConditionEdge(null)} onSave={(condition) => { setEdges((current) => current.map((edge) => edge.id === selectedConditionEdge?.id ? { ...edge, data: { ...edge.data, condition } } : edge)); setSelectedConditionEdge(null); message.success('Branch condition saved'); }} /></>;
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
  const [showSubmitRemark, setShowSubmitRemark] = useState(false);
  const [submitRemark, setSubmitRemark] = useState(configuration.remark ?? '');
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
  const confirmSubmit = () => {
    submitVersion(channelCode, endpoint.id, configuration.id, submitRemark);
    message.success('Legacy Route Matching submitted. The current Version is ready to deploy.');
    navigate(`/channel-integration/${channelCode}/integration/config/route-matching`);
  };

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: '#f5f7fa' }}>
      <div style={{ height: 58, padding: '0 20px', display: 'flex', alignItems: 'center', background: '#fff', borderBottom: '1px solid #f0f0f0' }}>
        <Button type="text" icon={<ArrowLeftOutlined />} onClick={() => readOnly ? navigate(-1) : navigate(`/channel-integration/${channelCode}/integration/config/route-matching`)}>Back</Button>
        <Divider type="vertical" />
        <Space><Tag color="purple">Legacy 1.0</Tag><strong>{readOnly ? 'Inbound Flow Detail' : 'Configure Legacy Inbound Flow'}</strong></Space>
        <div style={{ flex: 1 }} />
        {!readOnly && <Space>
          <Button icon={<SaveOutlined />} onClick={() => { saveChannel(channelCode); message.success('Legacy Inbound Flow draft saved'); }}>Save Draft</Button>
          <Button type="primary" icon={<CloudUploadOutlined />} onClick={() => { setSubmitRemark(configuration.remark ?? ''); setShowSubmitRemark(true); }}>Submit</Button>
        </Space>}
      </div>

      <div style={{ padding: '12px 16px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr repeat(4, 1fr)', background: '#fff', border: '1px solid #e8e8e8', borderRadius: 8, padding: 14 }}>
          {[
              ['URI', endpoint.url], ['Description', configuration.remark || '-'], ['Matching ID', configuration.id], ['Version', configuration.version], ['Status', configuration.configStatus],
          ].map(([label, value], index, items) => <div key={label} style={{ padding: '0 14px', borderRight: index === items.length - 1 ? 'none' : '1px solid #f0f0f0' }}><div style={{ color: '#8c8c8c', fontSize: 10 }}>{label}</div><div style={{ marginTop: 4, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis' }}>{value}</div></div>)}
        </div>
      </div>

      <Alert
        type="info"
        showIcon
        message="Legacy Inbound Flow compatibility mode"
        description="The original component set and order are fixed. Components cannot be added, removed, or reordered; supported forms remain configurable."
        style={{ margin: '0 16px 12px' }}
      />

      <div style={{ flex: 1, minHeight: 0, display: 'grid', gridTemplateColumns: readOnly ? '292px minmax(430px, 1fr)' : '292px 304px minmax(430px, 1fr)', margin: '0 16px 16px', background: '#fff', border: '1px solid #e8e8e8', borderRadius: 8, overflow: 'hidden' }}>
        <CanvasContextPanel channelCode={channelCode} mode="matching" readOnly={readOnly} />

        {!readOnly && <div style={{ borderRight: '1px solid #f0f0f0', overflow: 'auto' }}>
          <div style={{ padding: 14, fontWeight: 600, borderBottom: '1px solid #f0f0f0' }}>Component Library</div>
          <div style={{ padding: 12 }}>
            {components.map((component) => <div key={component.id} style={{ marginBottom: 9, padding: 11, border: '1px solid #e8e8e8', borderRadius: 7, background: '#fafafa' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><strong>{component.code}</strong><Tag icon={<LockOutlined />}>Fixed</Tag></div>
              <div style={{ color: '#8c8c8c', fontSize: 11 }}>{component.name}</div>
            </div>)}
          </div>
        </div>}

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

      <Drawer title="Submit Route Matching" width={520} open={showSubmitRemark} onClose={() => setShowSubmitRemark(false)} extra={<Space><Button onClick={() => setShowSubmitRemark(false)}>Cancel</Button><Button type="primary" onClick={confirmSubmit}>Submit</Button></Space>}>
        <Alert type="info" showIcon message="Description will be shown in the Route Matching list." style={{ marginBottom: 16 }} />
        <div style={{ color: '#595959', marginBottom: 6 }}>Description</div>
        <Input.TextArea value={submitRemark} maxLength={200} showCount rows={5} placeholder="Describe this Matching record or configuration change" onChange={(event) => setSubmitRemark(event.target.value)} />
      </Drawer>

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

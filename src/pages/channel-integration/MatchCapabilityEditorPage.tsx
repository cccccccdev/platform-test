import { useMemo, useState } from 'react';
import { Alert, Button, Divider, Input, message, Select, Space, Switch, Table, Tag } from 'antd';
import { ArrowLeftOutlined, CloudUploadOutlined, DeleteOutlined, PlusOutlined, SaveOutlined } from '@ant-design/icons';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { capabilityActionOptions } from '../../mock/data';
import { useConfigIntegrationStore } from './configIntegrationStore';
import { useMatchCapabilityStore } from './matchCapabilityStore';
import type { FlowConfig, InboundEndpoint, MatchRule, MatchingType } from './types';

interface CoverageRow {
  key: string;
  rule: MatchRule;
  version: string;
  versionId?: string;
  weight: string;
  flow: FlowConfig | null;
  status: string;
}

const matchingTypeOptions: Array<{ value: MatchingType; label: string }> = [
  { value: 'single', label: 'Single Type' },
  { value: 'order_no', label: 'Distinguish types by order no' },
  { value: 'type_field', label: 'Distinguish types by type field' },
  { value: 'custom', label: 'Custom' },
];

const requestTypeOptions = [
  { value: 'CALLBACK', label: 'CALLBACK' },
  { value: 'EXTERNAL_INBOUND', label: 'EXTERNAL_INBOUND' },
];

const createRule = (): MatchRule => ({
  id: `result_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
  fieldValues: {},
  bt: '',
  ability: '',
  action: '',
  requestType: 'CALLBACK',
});

const statusColor: Record<string, string> = {
  Ready: 'green',
  Missing: 'orange',
  Conflict: 'red',
  'Not Published': 'default',
  'Ability Missing': 'red',
  'Flow Missing': 'orange',
};

export default function MatchCapabilityEditorPage() {
  const { channelCode = '', uriId = '' } = useParams<{ channelCode: string; uriId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const endpoint = useMatchCapabilityStore((state) =>
    (state.endpointsByChannel[channelCode] ?? []).find((item) => item.id === uriId)
  );
  const updateEndpoint = useMatchCapabilityStore((state) => state.updateEndpoint);
  const saveChannel = useMatchCapabilityStore((state) => state.saveChannel);
  const submitEndpoint = useMatchCapabilityStore((state) => state.submitEndpoint);
  const abilities = useConfigIntegrationStore((state) => state.abilitiesByChannel[channelCode] ?? []);
  const [selectedRuleId, setSelectedRuleId] = useState<string | null>(endpoint?.rules[0]?.id ?? null);
  const readOnly = searchParams.get('mode') === 'detail' || endpoint?.uriType === 'legacy';

  const coverageRows = useMemo<CoverageRow[]>(() => {
    if (!endpoint) return [];
    return endpoint.rules.flatMap<CoverageRow>((rule): CoverageRow[] => {
      const ability = abilities.find((item) => item.bt === rule.bt && item.ability === rule.ability);
      if (!ability) return [{ key: `${rule.id}-missing`, rule, version: '-', weight: '-', flow: null, status: 'Ability Missing' }];
      if (ability.versions.length === 0) return [{ key: `${rule.id}-flow-missing`, rule, version: '-', weight: '-', flow: null, status: 'Flow Missing' }];
      return ability.versions.map<CoverageRow>((version, versionIndex) => {
        const triggerType = rule.requestType === 'CALLBACK' ? 'CALLBACK_TRIGGERED' : 'EXTERNAL_INBOUND_TRIGGERED';
        const flows = version.flows.filter((flow) => flow.inboundUriId === endpoint.id && flow.triggerType === triggerType &&
          (flow.triggerEvents?.includes(rule.action) || flow.contextActions?.includes(rule.action))
        );
        const status = flows.length > 1 ? 'Conflict' : flows.length === 0 ? 'Missing' : version.publishStatus === 'published' ? 'Ready' : 'Not Published';
        return { key: `${rule.id}-${version.id}`, rule, version: version.version, versionId: version.id, weight: versionIndex === 0 ? '100%' : '0%', flow: flows[0] ?? null, status };
      });
    });
  }, [abilities, endpoint]);

  if (!endpoint) {
    return <div style={{ padding: 24 }}><h3>URI not found</h3><Button onClick={() => navigate(-1)}>Back</Button></div>;
  }

  const update = (updates: Partial<InboundEndpoint>) => updateEndpoint(channelCode, endpoint.id, updates);
  const updateRule = (ruleId: string, updates: Partial<MatchRule>) => update({
    rules: endpoint.rules.map((rule) => rule.id === ruleId ? { ...rule, ...updates } : rule),
  });
  const addResult = () => {
    const rule = createRule();
    if (endpoint.matchType === 'type_field') {
      rule.fieldValues = Object.fromEntries(endpoint.matchFields.map((field) => [field, '']));
    }
    update({ rules: [...endpoint.rules, rule] });
    setSelectedRuleId(rule.id);
  };
  const deleteResult = (ruleId: string) => {
    update({ rules: endpoint.rules.filter((rule) => rule.id !== ruleId) });
    if (selectedRuleId === ruleId) setSelectedRuleId(null);
  };

  const validate = (): string | null => {
    if (!endpoint.url || !endpoint.method) return 'URI Basic Info is incomplete';
    if (endpoint.fields.length === 0) return 'Request Definition must contain at least one field';
    if (endpoint.matchType === 'single' && endpoint.rules.length !== 1) return 'Single Type requires exactly one Capability Result';
    if ((endpoint.matchType === 'order_no' || endpoint.matchType === 'custom') && endpoint.rules.length === 0) return 'Declare at least one candidate Capability Result';
    if (endpoint.matchType === 'order_no' && (!endpoint.singleNoField || !endpoint.referenceField)) return 'Order No requires one match field and a reference type';
    if (endpoint.matchType === 'type_field' && endpoint.matchFields.length === 0) return 'Type Field requires at least one input field';
    if (endpoint.matchType === 'custom' && !endpoint.customScript?.trim()) return 'Custom Script is required';
    for (const rule of endpoint.rules) {
      if (!rule.bt || !rule.ability || !rule.action || !rule.requestType) return 'Every Capability Result must include BT, Ability, Action and Request Type';
      if (!abilities.some((item) => item.bt === rule.bt && item.ability === rule.ability)) return `Ability ${rule.bt} / ${rule.ability} does not exist in ${channelCode}`;
      if (endpoint.matchType === 'type_field' && endpoint.matchFields.some((field) => rule.fieldValues[field] === undefined || rule.fieldValues[field] === '')) return 'Every Type Value combination must provide all field values; use EMPTY_STR for an empty string';
    }
    if (endpoint.matchType === 'type_field') {
      const combinations = endpoint.rules.map((rule) => endpoint.matchFields.map((field) => rule.fieldValues[field]).join('\u0001'));
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
    submitEndpoint(channelCode, endpoint.id);
    const missing = coverageRows.filter((row) => ['Missing', 'Flow Missing', 'Not Published'].includes(row.status)).length;
    message.success(missing ? `Submitted with ${missing} Version Coverage warning(s)` : 'URI Configuration submitted');
    navigate(`/channel-integration/${channelCode}/integration/match-capability`);
  };

  const targetStatus = (rule: MatchRule) => {
    const statuses = coverageRows.filter((row) => row.rule.id === rule.id).map((row) => row.status);
    if (statuses.includes('Ability Missing')) return 'Ability Missing';
    if (statuses.includes('Conflict')) return 'Conflict';
    if (statuses.includes('Ready')) return 'Ready';
    return 'Flow Missing';
  };

  const btOptions = [...new Set(abilities.map((item) => item.bt))].map((value) => ({ value }));
  const selectedRule = endpoint.rules.find((rule) => rule.id === selectedRuleId);

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: '#f5f7fa' }}>
      <div style={{ height: 58, padding: '0 20px', display: 'flex', alignItems: 'center', background: '#fff', borderBottom: '1px solid #f0f0f0' }}>
        <Button type="text" icon={<ArrowLeftOutlined />} onClick={() => navigate(`/channel-integration/${channelCode}/integration/match-capability`)}>Back</Button>
        <Divider type="vertical" />
        <strong>{readOnly ? 'Match Capability Detail' : 'Config Match Capability'}</strong>
        <div style={{ flex: 1 }} />
        {!readOnly && <Space><Button icon={<SaveOutlined />} onClick={handleSave}>Save Draft</Button><Button type="primary" icon={<CloudUploadOutlined />} onClick={handleSubmit}>Submit</Button></Space>}
      </div>

      <div style={{ padding: '12px 16px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr repeat(5, 1fr)', background: '#fff', border: '1px solid #e8e8e8', borderRadius: 8, padding: 14 }}>
          {[
            ['URI', endpoint.url], ['Method', endpoint.method], ['URI Type', endpoint.uriType === 'legacy' ? 'Legacy' : 'New'],
            ['Version', endpoint.version], ['Config Status', endpoint.configStatus], ['URI ID', endpoint.id],
          ].map(([label, value]) => <div key={label} style={{ padding: '0 14px', borderRight: label === 'URI ID' ? 'none' : '1px solid #f0f0f0' }}><div style={{ color: '#8c8c8c', fontSize: 10 }}>{label}</div><div style={{ marginTop: 4, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis' }}>{value}</div></div>)}
        </div>
      </div>

      {endpoint.uriType === 'legacy' && <Alert type="info" showIcon message="Legacy URI is readonly" description="The imported 1.0 inbound Flow is displayed as-is. Create a New URI to redesign or publish it with the 2.0 model." style={{ margin: '0 16px 12px' }} />}

      <div style={{ flex: 1, minHeight: 0, display: 'grid', gridTemplateColumns: '270px minmax(430px, 1fr) 470px', margin: '0 16px 16px', background: '#fff', border: '1px solid #e8e8e8', borderRadius: 8, overflow: 'hidden' }}>
        <div style={{ borderRight: '1px solid #f0f0f0', overflow: 'auto' }}>
          <div style={{ padding: 14, fontWeight: 600, borderBottom: '1px solid #f0f0f0' }}>URI Configuration</div>
          <div style={{ padding: 14 }}>
            <div style={{ fontWeight: 600, marginBottom: 10 }}>Request Definition</div>
            <div style={{ color: '#8c8c8c', fontSize: 11, marginBottom: 6 }}>Content Type</div>
            <Select disabled={readOnly} value="application/json" style={{ width: '100%', marginBottom: 12 }} options={[{ value: 'application/json' }, { value: 'application/xml' }, { value: 'text/plain' }]} />
            <div style={{ color: '#8c8c8c', fontSize: 11, marginBottom: 6 }}>Available Request Fields</div>
            <Select mode="tags" disabled={readOnly} value={endpoint.fields} style={{ width: '100%' }} onChange={(fields) => update({ fields })} tokenSeparators={[',']} placeholder="query.*, header.*, body.*" />
            <Divider />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><strong>Pre-processing</strong><Switch disabled={readOnly} checked={endpoint.decryptEnabled} onChange={(decryptEnabled) => update({ decryptEnabled })} /></div>
            <div style={{ color: '#8c8c8c', fontSize: 11, marginTop: 6 }}>{endpoint.decryptEnabled ? 'Decryption runs before capability matching.' : 'No decryption configured.'}</div>
            <Divider />
            <div style={{ fontWeight: 600, marginBottom: 8 }}>Fallback Behavior</div>
            <Select disabled={readOnly} value={endpoint.fallbackBehavior} style={{ width: '100%' }} onChange={(fallbackBehavior) => update({ fallbackBehavior })} options={[
              { value: 'reject', label: 'Reject request' }, { value: 'alert_and_reject', label: 'Alert and reject' }, { value: 'manual_review', label: 'Manual review queue' },
            ]} />
          </div>
        </div>

        <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          <div style={{ height: 44, display: 'flex', alignItems: 'center', padding: '0 16px', borderBottom: '1px solid #f0f0f0', fontWeight: 600 }}>Match Capability Canvas</div>
          <div style={{ flex: 1, minHeight: 330, overflow: 'auto', padding: 28, backgroundImage: 'radial-gradient(#d9d9d9 1px, transparent 1px)', backgroundSize: '16px 16px' }}>
            <div style={{ width: 280, margin: '0 auto', padding: 16, border: '2px solid #1677ff', borderRadius: 10, background: '#e6f4ff', boxShadow: '0 4px 12px rgba(22,119,255,.12)' }}>
              <Tag color="blue">CORE</Tag><strong>matchCapability</strong>
              <div style={{ color: '#595959', fontSize: 11, marginTop: 6 }}>{matchingTypeOptions.find((item) => item.value === endpoint.matchType)?.label}</div>
            </div>
            <div style={{ textAlign: 'center', fontSize: 26, lineHeight: '42px' }}>↓</div>
            <div style={{ display: 'grid', gridTemplateColumns: endpoint.rules.length > 1 ? 'repeat(2, minmax(220px, 1fr))' : 'minmax(240px, 360px)', justifyContent: 'center', gap: 12 }}>
              {endpoint.rules.length === 0 ? <div style={{ textAlign: 'center', color: '#8c8c8c', padding: 30, border: '1px dashed #d9d9d9', background: '#fff' }}>Configure a Capability Result to generate Dispatch Target</div> : endpoint.rules.map((rule) => {
                const status = targetStatus(rule);
                return <button key={rule.id} onClick={() => setSelectedRuleId(rule.id)} style={{ textAlign: 'left', padding: 14, border: selectedRuleId === rule.id ? '2px solid #722ed1' : '1px solid #d9d9d9', borderRadius: 8, background: '#fff', cursor: 'pointer' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><strong>Dispatch Target</strong><Tag color={statusColor[status]}>{status}</Tag></div>
                  <div style={{ marginTop: 8 }}>{rule.bt || '-'} / {rule.ability || '-'} / {rule.action || '-'}</div>
                  <div style={{ color: '#8c8c8c', fontSize: 11, marginTop: 5 }}>{rule.requestType}</div>
                </button>;
              })}
            </div>
            {endpoint.uriType === 'legacy' && <><div style={{ textAlign: 'center', fontSize: 26, lineHeight: '42px' }}>↓</div>{['parseServletRequest', 'loadCredential', 'loadGlobalVariable', 'callbackRequest'].map((code) => <div key={code} style={{ width: 280, margin: '8px auto', padding: 12, border: '1px solid #bfbfbf', borderRadius: 8, background: '#fafafa', color: '#595959' }}><Tag>Readonly</Tag>{code}</div>)}</>}
          </div>

          <div style={{ borderTop: '1px solid #f0f0f0', padding: 14, maxHeight: 260, overflow: 'auto' }}>
            <div style={{ fontWeight: 600, marginBottom: 10 }}>Target Distribution · Version Coverage</div>
            <Table<CoverageRow> size="small" pagination={false} rowKey="key" dataSource={coverageRows} columns={[
              { title: 'Capability Result', render: (_, row) => `${row.rule.bt} / ${row.rule.ability} / ${row.rule.action}` },
              { title: 'Request Type', render: (_, row) => row.rule.requestType },
              { title: 'Flow Version', dataIndex: 'version' },
              { title: 'Weight', dataIndex: 'weight' },
              { title: 'Matching Flow', render: (_, row) => row.flow ? <Button type="link" size="small" onClick={() => navigate(`/channel-integration/${channelCode}/integration/config/${row.rule.bt}/${row.rule.ability}/versions/${row.versionId}/flows/${row.flow!.id}?mode=detail`)}>{row.flow.name}</Button> : '-' },
              { title: 'Coverage', dataIndex: 'status', render: (status) => <Tag color={statusColor[status]}>{status}</Tag> },
            ]} />
          </div>
        </div>

        <div style={{ borderLeft: '1px solid #f0f0f0', overflow: 'auto' }}>
          <div style={{ padding: 14, fontWeight: 600, borderBottom: '1px solid #f0f0f0' }}>matchCapability Properties</div>
          <div style={{ padding: 16 }}>
            <div style={{ color: '#8c8c8c', fontSize: 11, marginBottom: 6 }}>Matching Type</div>
            <Select disabled={readOnly} value={endpoint.matchType} style={{ width: '100%' }} options={matchingTypeOptions} onChange={(matchType) => update({ matchType, matchFields: [], singleNoField: '', referenceField: undefined, rules: matchType === 'single' ? [endpoint.rules[0] ?? createRule()] : endpoint.rules })} />

            {endpoint.matchType === 'order_no' && <div style={{ marginTop: 16, padding: 12, background: '#fafafa', borderRadius: 8 }}>
              <strong>Unique Order Match Field</strong>
              <Select disabled={readOnly} value={endpoint.matchFieldSource} placeholder="Field source" style={{ width: '100%', marginTop: 10 }} options={[{ value: 'query', label: 'Query Parameters' }, { value: 'header', label: 'Request Header' }, { value: 'body', label: 'Request Body' }]} onChange={(matchFieldSource) => update({ matchFieldSource, singleNoField: '' })} />
              <Select disabled={readOnly || !endpoint.matchFieldSource} value={endpoint.singleNoField || undefined} placeholder="Select one field" style={{ width: '100%', marginTop: 8 }} options={endpoint.fields.filter((field) => field.startsWith(`${endpoint.matchFieldSource}.`)).map((value) => ({ value }))} onChange={(singleNoField) => update({ singleNoField })} />
              <Select disabled={readOnly} value={endpoint.referenceField} placeholder="Match to" style={{ width: '100%', marginTop: 8 }} options={[{ value: 'requestReference' }, { value: 'responseReference' }]} onChange={(referenceField) => update({ referenceField })} />
            </div>}

            {endpoint.matchType === 'type_field' && <div style={{ marginTop: 16 }}>
              <strong>Common Input Fields</strong>
              <Select mode="multiple" disabled={readOnly} value={endpoint.matchFields} style={{ width: '100%', marginTop: 8 }} options={endpoint.fields.map((value) => ({ value }))} onChange={(matchFields) => update({ matchFields, rules: endpoint.rules.map((rule) => ({ ...rule, fieldValues: Object.fromEntries(matchFields.map((field) => [field, rule.fieldValues[field] ?? ''])) })) })} />
            </div>}

            {endpoint.matchType === 'custom' && <div style={{ marginTop: 16 }}>
              <strong>Groovy Script</strong>
              <Input.TextArea disabled={readOnly} value={endpoint.customScript} onChange={(event) => update({ customScript: event.target.value })} rows={9} style={{ marginTop: 8, fontFamily: 'monospace', background: '#1f1f1f', color: '#f5f5f5' }} />
            </div>}

            <Divider />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><strong>{endpoint.matchType === 'type_field' ? 'Type Value Combinations' : 'Capability Results'}</strong>{!readOnly && endpoint.matchType !== 'single' && <Button type="text" icon={<PlusOutlined />} onClick={addResult}>Add</Button>}</div>
            {endpoint.rules.map((rule, index) => <div key={rule.id} onClick={() => setSelectedRuleId(rule.id)} style={{ marginTop: 10, padding: 12, border: selectedRule?.id === rule.id ? '1px solid #722ed1' : '1px solid #e8e8e8', borderRadius: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}><span>Result {index + 1}</span>{!readOnly && endpoint.matchType !== 'single' && <Button type="text" danger size="small" icon={<DeleteOutlined />} onClick={(event) => { event.stopPropagation(); deleteResult(rule.id); }} />}</div>
              {endpoint.matchType === 'type_field' && endpoint.matchFields.map((field) => <Input key={field} disabled={readOnly} addonBefore={field} placeholder="Value or EMPTY_STR" value={rule.fieldValues[field]} onChange={(event) => updateRule(rule.id, { fieldValues: { ...rule.fieldValues, [field]: event.target.value } })} style={{ marginBottom: 6 }} />)}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                <Select disabled={readOnly} placeholder="Business Type" value={rule.bt || undefined} options={btOptions} onChange={(bt) => updateRule(rule.id, { bt, ability: '', action: '' })} />
                <Select disabled={readOnly || !rule.bt} placeholder="Ability" value={rule.ability || undefined} options={abilities.filter((item) => item.bt === rule.bt).map((item) => ({ value: item.ability }))} onChange={(ability) => updateRule(rule.id, { ability, action: '' })} />
                <Select disabled={readOnly || !rule.ability} placeholder="Action" value={rule.action || undefined} options={(capabilityActionOptions[`${rule.bt}:${rule.ability}`] ?? ['TRANSACTION', 'QUERY', 'VERIFY']).map((value) => ({ value }))} onChange={(action) => updateRule(rule.id, { action })} />
                <Select disabled={readOnly} value={rule.requestType} options={requestTypeOptions} onChange={(requestType) => updateRule(rule.id, { requestType })} />
              </div>
            </div>)}
            {endpoint.rules.length === 0 && <div style={{ padding: 20, textAlign: 'center', color: '#8c8c8c' }}>No Capability Result configured</div>}
          </div>
        </div>
      </div>
    </div>
  );
}

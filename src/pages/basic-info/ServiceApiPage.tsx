import { useState, type ReactNode } from 'react';
import { Breadcrumb, Button, Input, message, Modal, Popover, Select, Typography } from 'antd';
import { ExclamationCircleOutlined, FilterOutlined, LeftOutlined } from '@ant-design/icons';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { getDemoReturnUrl } from './demoNavigation';
import { EFFECT_TAG_OPTIONS, serviceApiRequestFields, serviceApiResponseFields, type EffectTag } from './serviceApiReferenceData';
import SpiSchemaTree from './capability/SpiSchemaTree';
import InterfaceCopyButton from './capability/InterfaceCopyButton';
import { fieldsToTree, validateEffectTags, validateSpiTree, type SpiFieldNode } from './capability/spiSchemaModel';
import './capability/CapabilitySpiPage.css';
import './ServiceApiPage.css';

const { Title } = Typography;

interface SavedApiConfig {
  method: string;
  url: string;
  description: string;
  request: SpiFieldNode[];
  response: SpiFieldNode[];
}

interface ApiShareSnapshot extends SavedApiConfig {
  businessType: string;
  service: string;
  action: string;
}

const isShareSnapshot = (value: unknown): value is ApiShareSnapshot => {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<ApiShareSnapshot>;
  const validNodes = (nodes: unknown, depth = 0): nodes is SpiFieldNode[] => Array.isArray(nodes) && depth < 24 && nodes.length < 2000
    && nodes.every((node: unknown) => Boolean(node && typeof node === 'object'
      && typeof (node as SpiFieldNode).id === 'string'
      && typeof (node as SpiFieldNode).name === 'string'
      && typeof (node as SpiFieldNode).type === 'string'
      && typeof (node as SpiFieldNode).description === 'string'
      && validNodes((node as SpiFieldNode).children, depth + 1)));
  return typeof candidate.businessType === 'string' && typeof candidate.service === 'string' && typeof candidate.action === 'string'
    && typeof candidate.method === 'string' && typeof candidate.url === 'string' && typeof candidate.description === 'string'
    && validNodes(candidate.request) && validNodes(candidate.response);
};

const API_DEMO_STORAGE_KEY = 'basic-info-service-api-demo-v1';
const readSavedApiConfigs = (): Record<string, SavedApiConfig> => {
  try { return JSON.parse(localStorage.getItem(API_DEMO_STORAGE_KEY) || '{}') as Record<string, SavedApiConfig>; }
  catch { return {}; }
};

const REQUEST_CATALOG = fieldsToTree(serviceApiRequestFields);
const RESPONSE_CATALOG = fieldsToTree(serviceApiResponseFields);

const filterByTags = (fields: SpiFieldNode[], tags: EffectTag[]): SpiFieldNode[] => {
  if (!tags.length) return fields;
  return fields.flatMap((field) => {
    const children = filterByTags(field.children, tags);
    return tags.includes(field.effectTag as EffectTag) || children.length ? [{ ...field, children }] : [];
  });
};

function InterfaceDetails({ config, editing, businessType, service, action, actions, onDescriptionChange }: {
  config: SavedApiConfig;
  editing: boolean;
  businessType: string;
  service: string;
  action: string;
  actions?: ReactNode;
  onDescriptionChange?: (description: string) => void;
}) {
  return <section className="interface-overview" aria-label="API interface details">
    <div className="interface-overview-top">
      <div className="bt-ability-settings-context interface-overview-context">
        <span>Business Type: <strong>{businessType}</strong></span>
        <span>Service: <strong>{service}</strong></span>
        <span>Action: <strong>{action}</strong></span>
      </div>
      {actions && <div className="interface-overview-actions">{actions}</div>}
    </div>
    <div className="interface-overview-endpoint"><span className="interface-overview-method">{config.method}</span><code>{config.url}</code></div>
    {editing ? <label className="interface-overview-description-edit"><span>Description</span><Input value={config.description} placeholder="Optional description" onChange={(event) => onDescriptionChange?.(event.target.value)} /></label>
      : config.description && <p className="interface-overview-description">{config.description}</p>}
  </section>;
}

export default function ServiceApiPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const businessType = searchParams.get('bt') || '';
  const serviceName = searchParams.get('service') || '';
  const actionName = searchParams.get('action') || '';
  const demoReturnUrl = getDemoReturnUrl(searchParams, businessType);
  const backUrl = demoReturnUrl || `/basic-info/service?bt=${encodeURIComponent(businessType)}`;
  const [savedConfigs, setSavedConfigs] = useState<Record<string, SavedApiConfig>>(readSavedApiConfigs);
  const [draft, setDraft] = useState<SavedApiConfig | null>(null);
  const [draftKey, setDraftKey] = useState<string | null>(null);
  const [draftTags, setDraftTags] = useState<EffectTag[]>([]);
  const [appliedTags, setAppliedTags] = useState<EffectTag[]>([]);
  const [filterOpen, setFilterOpen] = useState<'request' | 'response' | null>(null);
  const apiKey = JSON.stringify([businessType, serviceName, actionName]);
  const editing = draft !== null && draftKey === apiKey;
  const initial: SavedApiConfig = { method: 'POST', url: '/api/service', description: `${businessType} ${serviceName} ${actionName} service API`, request: REQUEST_CATALOG, response: RESPONSE_CATALOG };
  const visibleConfig: SavedApiConfig = { ...initial, ...savedConfigs[apiKey], ...(editing ? draft : {}) };
  const schemaError = validateSpiTree(visibleConfig.request) || validateSpiTree(visibleConfig.response)
    || validateEffectTags(visibleConfig.request) || validateEffectTags(visibleConfig.response);
  const updateDraft = (changes: Partial<SavedApiConfig>) => setDraft((current) => current && draftKey === apiKey ? { ...current, ...changes } : current);
  const cancel = () => { setDraft(null); setDraftKey(null); };
  const confirmCancel = () => Modal.confirm({
    title: 'Are you sure you want to cancel? All entered content will be lost.',
    icon: <ExclamationCircleOutlined style={{ color: '#faad14' }} />,
    okText: 'Confirm', okButtonProps: { danger: true, ghost: true }, cancelText: 'Cancel', onOk: cancel,
  });
  const submit = () => {
    if (!editing || !draft || schemaError) return;
    const next = { ...savedConfigs, [apiKey]: draft };
    setSavedConfigs(next);
    localStorage.setItem(API_DEMO_STORAGE_KEY, JSON.stringify(next));
    cancel();
    message.success('API configuration saved.');
  };
  const share = async () => {
    const snapshot: ApiShareSnapshot = { businessType, service: serviceName, action: actionName, ...visibleConfig };
    const url = `${window.location.origin}${window.location.pathname}#/shared/service-api?${new URLSearchParams({ snapshot: JSON.stringify(snapshot) })}`;
    try { await navigator.clipboard.writeText(url); message.success('Read-only API link copied.'); }
    catch { message.error('Could not copy the API link.'); }
  };
  const requestFields = editing ? visibleConfig.request : filterByTags(visibleConfig.request, appliedTags);
  const responseFields = editing ? visibleConfig.response : filterByTags(visibleConfig.response, appliedTags);
  const effectTagHeader = (section: 'request' | 'response') => <div className="service-api-tag-header">
    <span>EFFECT TAG</span>
    {!editing && <Popover trigger="click" placement="bottomLeft" open={filterOpen === section} onOpenChange={(open) => { setFilterOpen(open ? section : null); if (open) setDraftTags(appliedTags); }} content={<div className="service-api-tag-filter" aria-label="Effect Tag filter">
      <Select mode="multiple" maxCount={3} value={draftTags} options={EFFECT_TAG_OPTIONS.map((tag) => ({ label: tag, value: tag }))} onChange={setDraftTags} getPopupContainer={(trigger) => trigger.parentElement ?? document.body} placeholder="Select 1–3 Effect Tags" aria-label="Select Effect Tags" />
      <div className="service-api-tag-filter-actions">
        <Button size="small" onClick={() => { setDraftTags([]); setAppliedTags([]); setFilterOpen(null); }}>Reset</Button>
        <Button type="primary" size="small" disabled={draftTags.length === 0} onClick={() => { setAppliedTags(draftTags); setFilterOpen(null); }}>Query</Button>
      </div>
    </div>}><Button type="text" size="small" className={appliedTags.length ? 'service-api-filter-trigger active' : 'service-api-filter-trigger'} icon={<FilterOutlined />} aria-label={`Filter ${section} by Effect Tag${appliedTags.length ? `, ${appliedTags.length} active` : ''}`} aria-pressed={appliedTags.length > 0} /></Popover>}
  </div>;

  return <div className="service-api-page capability-spi-page">
    <header className="capability-spi-heading">
      <Breadcrumb items={[{ title: 'Basic Info', href: '/basic-info/country' }, { title: demoReturnUrl ? 'Demo' : 'Service', href: backUrl }, { title: businessType }, { title: serviceName }, { title: actionName }, { title: 'API' }]} />
      <button className="capability-spi-back" type="button" onClick={() => navigate(backUrl)}><LeftOutlined /><Title level={4}>API</Title></button>
    </header>
    <main className={`service-api-panel capability-spi-panel ${editing ? 'editing' : ''}`}>
      <InterfaceDetails config={visibleConfig} editing={editing} businessType={businessType} service={serviceName} action={actionName}
        actions={!editing && <><Button onClick={() => void share()}>Share</Button><InterfaceCopyButton kind="API" businessType={businessType} serviceOrAbility={{ label: 'Service', value: serviceName }} action={actionName} method={visibleConfig.method} url={visibleConfig.url} description={visibleConfig.description} request={visibleConfig.request} response={visibleConfig.response} /><Button type="primary" onClick={() => { setDraft(structuredClone(visibleConfig)); setDraftKey(apiKey); }}>Config</Button></>}
        onDescriptionChange={(description) => updateDraft({ description })} />
      <SpiSchemaTree key={`${apiKey}-request`} title="Request Params" fields={requestFields} catalog={REQUEST_CATALOG} effectTagOptions={EFFECT_TAG_OPTIONS} effectTagHeader={effectTagHeader('request')} editing={editing} onChange={(request) => updateDraft({ request })} />
      <SpiSchemaTree key={`${apiKey}-response`} title="Response Params" fields={responseFields} catalog={RESPONSE_CATALOG} effectTagOptions={EFFECT_TAG_OPTIONS} effectTagHeader={effectTagHeader('response')} editing={editing} onChange={(response) => updateDraft({ response })} />
    </main>
    {editing && <footer className="capability-spi-edit-footer">{schemaError && <span className="capability-spi-submit-error" role="alert">{schemaError}</span>}<Button onClick={confirmCancel}>Cancel</Button><Button type="primary" disabled={Boolean(schemaError)} onClick={submit}>Submit</Button></footer>}
  </div>;
}

export function ServiceApiSharedPage() {
  const [searchParams] = useSearchParams();
  let parsed: unknown = null;
  try { parsed = JSON.parse(searchParams.get('snapshot') || 'null') as unknown; }
  catch { /* Invalid share links show an explicit empty state. */ }
  if (!isShareSnapshot(parsed)) {
    return <main className="service-api-shared-invalid"><h1>API link unavailable</h1><p>This link is incomplete or invalid. Ask the sender to share it again.</p></main>;
  }
  const snapshot = parsed;
  return <div className="service-api-page capability-spi-page service-api-shared-page">
    <header className="capability-spi-heading"><Title level={4}>Service API</Title></header>
    <main className="service-api-panel capability-spi-panel">
      <InterfaceDetails config={snapshot} editing={false} businessType={snapshot.businessType} service={snapshot.service} action={snapshot.action} />
      <SpiSchemaTree title="Request Params" fields={snapshot.request} catalog={snapshot.request} effectTagOptions={EFFECT_TAG_OPTIONS} editing={false} onChange={() => {}} />
      <SpiSchemaTree title="Response Params" fields={snapshot.response} catalog={snapshot.response} effectTagOptions={EFFECT_TAG_OPTIONS} editing={false} onChange={() => {}} />
    </main>
  </div>;
}

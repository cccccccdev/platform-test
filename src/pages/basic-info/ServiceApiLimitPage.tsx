import { useState } from 'react';
import { Breadcrumb, Button, Checkbox, Input, Modal, Select, Tag, Typography, message } from 'antd';
import { EditOutlined, LeftOutlined } from '@ant-design/icons';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { getDemoReturnUrl } from './demoNavigation';
import { serviceApiRequestFields, serviceApiResponseFields } from './serviceApiReferenceData';
import { fieldsToTree, type SpiFieldNode } from './capability/spiSchemaModel';
import { apiLimitScopeKey, canDeployField, deployApiLimitFields, submitApiLimits, type ApiLimitStore, type DeployEnvironment, type FieldLimitState } from './serviceApiLimitModel';
import './ServiceApiLimitPage.css';

const { Title, Text } = Typography;
const COUNTRY_CODES = ['NG', 'TZ', 'GH', 'BD', 'CI', 'SN', 'KE', 'SHADOW', 'PK', 'GSA', 'ZA', 'UG', 'SG', 'HK', 'GB', 'CN', 'PH', 'BF'];
const REQUIRED_FIELDS = new Set(['route', 'country', 'tenant', 'capability', 'businessType', 'service', 'action', 'identity', 'requestReference']);
const LIMIT_STORAGE_KEY = 'basic-info-service-api-limit-demo-v1';
const API_STORAGE_KEY = 'basic-info-service-api-demo-v1';
const REQUEST_FALLBACK = fieldsToTree(serviceApiRequestFields);
const RESPONSE_FALLBACK = fieldsToTree(serviceApiResponseFields);

type Direction = 'request' | 'response';
type PageMode = 'view' | 'config' | 'deploy';
interface LimitField { key: string; name: string; type: string; description: string; depth: number; mandatory: boolean; }
interface SavedApiShape { method?: string; url?: string; description?: string; request?: SpiFieldNode[]; response?: SpiFieldNode[]; }

function readStore(): ApiLimitStore {
  try { return JSON.parse(localStorage.getItem(LIMIT_STORAGE_KEY) || '{}') as ApiLimitStore; }
  catch { return {}; }
}
function readApiConfig(key: string): SavedApiShape {
  try { return (JSON.parse(localStorage.getItem(API_STORAGE_KEY) || '{}') as Record<string, SavedApiShape>)[key] || {}; }
  catch { return {}; }
}
function flattenFields(nodes: SpiFieldNode[], direction: Direction, depth = 0): LimitField[] {
  return nodes.flatMap((node) => {
    const row: LimitField = {
      key: `${direction}:${node.id}`, name: node.name, type: node.type, description: node.description,
      depth, mandatory: node.required || REQUIRED_FIELDS.has(node.name),
    };
    return [row, ...flattenFields(node.children || [], direction, depth + 1)];
  });
}
function timestamp() {
  const date = new Date();
  const two = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${two(date.getMonth() + 1)}-${two(date.getDate())} ${two(date.getHours())}:${two(date.getMinutes())}:${two(date.getSeconds())}`;
}
const defaultLimit = (field: LimitField): FieldLimitState => ({ mandatory: field.mandatory, pattern: '', minLength: '', maxLength: '' });

export default function ServiceApiLimitPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const businessType = searchParams.get('bt') || '';
  const serviceName = searchParams.get('service') || '';
  const actionName = searchParams.get('action') || '';
  const country = searchParams.get('country') || 'NG';
  const demoReturnUrl = getDemoReturnUrl(searchParams, businessType);
  const backUrl = demoReturnUrl || `/basic-info/service?bt=${encodeURIComponent(businessType)}`;
  const [store, setStore] = useState<ApiLimitStore>(readStore);
  const [mode, setMode] = useState<PageMode>('view');
  const [draft, setDraft] = useState<Record<string, FieldLimitState>>({});
  const [dirtyKeys, setDirtyKeys] = useState<Set<string>>(new Set());
  const [fieldModalKey, setFieldModalKey] = useState<string | null>(null);
  const [fieldModalDraft, setFieldModalDraft] = useState<FieldLimitState | null>(null);
  const [environment, setEnvironment] = useState<DeployEnvironment>();
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());

  const apiKey = JSON.stringify([businessType, serviceName, actionName]);
  const apiConfig = readApiConfig(apiKey);
  const requestFields = flattenFields(Array.isArray(apiConfig.request) ? apiConfig.request : REQUEST_FALLBACK, 'request');
  const responseFields = flattenFields(Array.isArray(apiConfig.response) ? apiConfig.response : RESPONSE_FALLBACK, 'response');
  const allFields = [...requestFields, ...responseFields];
  const scope = apiLimitScopeKey(businessType, serviceName, actionName, country);
  const countryState = store[scope];
  const currentFields = mode === 'config' ? draft : countryState?.fields || {};

  const persist = (next: ApiLimitStore) => { setStore(next); localStorage.setItem(LIMIT_STORAGE_KEY, JSON.stringify(next)); };
  const startConfig = () => {
    setDraft(Object.fromEntries(allFields.map((field) => [field.key, countryState?.fields[field.key] || defaultLimit(field)])));
    setDirtyKeys(new Set());
    setMode('config');
  };
  const openFieldLimit = (field: LimitField) => {
    if (mode === 'deploy') return;
    if (mode === 'view') startConfig();
    setFieldModalKey(field.key);
    setFieldModalDraft({ ...(mode === 'config' ? draft[field.key] : countryState?.fields[field.key]) || defaultLimit(field) });
  };
  const saveFieldLimit = () => {
    if (!fieldModalKey || !fieldModalDraft) return;
    const min = fieldModalDraft.minLength === '' ? undefined : Number(fieldModalDraft.minLength);
    const max = fieldModalDraft.maxLength === '' ? undefined : Number(fieldModalDraft.maxLength);
    if ((min !== undefined && (!Number.isInteger(min) || min < 0)) || (max !== undefined && (!Number.isInteger(max) || max < 0)) || (min !== undefined && max !== undefined && min > max)) {
      message.error('Enter valid lengths; maximum length must not be less than minimum length.');
      return;
    }
    setDraft((current) => ({ ...current, [fieldModalKey]: fieldModalDraft }));
    setDirtyKeys((current) => new Set(current).add(fieldModalKey));
    setFieldModalKey(null);
    setFieldModalDraft(null);
  };
  const submitConfig = () => {
    if (!allFields.length || (countryState?.submitted && !dirtyKeys.size)) return;
    persist({ ...store, [scope]: submitApiLimits(countryState, draft, allFields.map((field) => field.key), dirtyKeys, timestamp(), 'Current User') });
    setMode('view');
  };
  const submitDeploy = () => {
    if (!countryState || !environment || !selectedKeys.size) return;
    persist({ ...store, [scope]: deployApiLimitFields(countryState, environment, selectedKeys, timestamp(), 'Current User') });
    setSelectedKeys(new Set());
    setEnvironment(undefined);
    setMode('view');
  };
  const cancel = () => {
    setMode('view'); setFieldModalKey(null); setFieldModalDraft(null);
    setSelectedKeys(new Set()); setEnvironment(undefined);
  };
  const toggleSelected = (keys: string[], checked: boolean) => {
    setSelectedKeys((current) => {
      const next = new Set(current);
      for (const key of keys) if (checked) next.add(key); else next.delete(key);
      return next;
    });
  };
  const updateMandatory = (field: LimitField, checked: boolean) => {
    setDraft((current) => ({ ...current, [field.key]: { ...(current[field.key] || defaultLimit(field)), mandatory: checked } }));
    setDirtyKeys((current) => new Set(current).add(field.key));
  };
  const renderTable = (title: string, fields: LimitField[]) => {
    const eligible = fields.filter((field) => canDeployField(countryState?.fields[field.key]?.status, environment)).map((field) => field.key);
    return <section className="service-api-limit-section">
      <Title level={5}>{title}</Title>
      <div className={`service-api-limit-table${mode === 'config' ? ' is-config' : ''}`}>
        <div className="service-api-limit-head">
          <span className="service-api-limit-name">{mode === 'deploy' && <Checkbox disabled={!eligible.length} checked={Boolean(eligible.length) && eligible.every((key) => selectedKeys.has(key))} indeterminate={eligible.some((key) => selectedKeys.has(key)) && !eligible.every((key) => selectedKeys.has(key))} onChange={(event) => toggleSelected(eligible, event.target.checked)} aria-label={`Select eligible ${title} fields`} />}API</span>
          <span>Field Type</span><span>Description</span><span>Mandatory</span><span>Field Limit</span>
          {mode !== 'config' && <><span>Deploy Status</span><span>Operate Time</span><span>Operator</span></>}
        </div>
        {fields.map((field) => {
          const state = currentFields[field.key];
          const eligibleForDeploy = canDeployField(countryState?.fields[field.key]?.status, environment);
          return <div className="service-api-limit-row" key={field.key}>
            <span className="service-api-limit-name" style={{ paddingLeft: field.depth * 20 }}>
              {mode === 'deploy' && <Checkbox disabled={!eligibleForDeploy} checked={selectedKeys.has(field.key)} onChange={(event) => toggleSelected([field.key], event.target.checked)} aria-label={`Select ${field.name}`} />}
              <Text strong={field.depth === 0}>{field.name}</Text>
            </span>
            <Text>{field.type}</Text><Text>{field.description}</Text>
            <Checkbox checked={state?.mandatory ?? field.mandatory} disabled={mode !== 'config'} onChange={(event) => updateMandatory(field, event.target.checked)} aria-label={`${field.name} mandatory`} />
            {field.type === 'Object' ? <span /> : <Button type="text" className="service-api-limit-edit" icon={<EditOutlined />} aria-label={`Edit ${field.name} field limit`} onClick={() => openFieldLimit(field)} disabled={mode === 'deploy'} />}
            {mode !== 'config' && <>
              {state?.status ? <Tag color={state.status === 'DRAFT' ? 'green' : 'purple'}>{state.status === 'DRAFT' ? 'Draft' : state.status}</Tag> : <span />}
              <Text className="service-api-limit-audit">{state?.operateTime || ''}</Text>
              <Text className="service-api-limit-audit">{state?.operator || ''}</Text>
            </>}
          </div>;
        })}
      </div>
    </section>;
  };

  return <div className="service-api-limit-page">
    <section className="service-api-limit-heading">
      <Breadcrumb items={[{ title: 'Basic Info', href: '/basic-info/country' }, { title: demoReturnUrl ? 'Demo' : 'Service', href: backUrl }, { title: 'API Limit' }]} />
      <button className="service-api-limit-back" type="button" onClick={() => navigate(backUrl)}><LeftOutlined /><Title level={4}>API Limit</Title></button>
    </section>
    <main className="service-api-limit-panel">
      <nav className="service-api-country-tabs" aria-label="Country API limits">
        {COUNTRY_CODES.map((code) => <button type="button" key={code} className={code === country ? 'active' : ''} disabled={mode !== 'view'} onClick={() => { const next = new URLSearchParams(searchParams); next.set('country', code); setSearchParams(next); }}>{code}</button>)}
      </nav>
      <div className="service-api-limit-toolbar">
        <div className="capability-page-context"><Text>Country: <Text strong>{country}</Text></Text><Text>Business Type: <Text strong>{businessType}</Text></Text><Text>Service: <Text strong>{serviceName}</Text></Text><Text>Action: <Text strong>{actionName}</Text></Text></div>
        {mode === 'view' && <div className="service-api-limit-actions"><Button type="primary" onClick={startConfig}>Config</Button>{countryState?.submitted && <Button type="primary" onClick={() => { setMode('deploy'); setEnvironment(undefined); setSelectedKeys(new Set()); }}>Deploy</Button>}</div>}
      </div>
      <div className="service-api-limit-meta"><Text><Text strong>Method:</Text> {apiConfig.method || 'POST'}</Text><Text><Text strong>URL:</Text> {apiConfig.url || '/api/service'}</Text><Text><Text strong>Description:</Text> {apiConfig.description || '—'}</Text></div>
      {mode === 'deploy' && <div className="service-api-limit-environment"><label htmlFor="service-api-limit-environment">* Environment</label><Select id="service-api-limit-environment" placeholder="Daily/Pre/Prod" value={environment} onChange={(value: DeployEnvironment) => { setEnvironment(value); setSelectedKeys(new Set()); }} options={(['DAILY', 'PRE', 'PROD'] as DeployEnvironment[]).map((value) => ({ value, label: value }))} /></div>}
      {renderTable('Request Params', requestFields)}
      {renderTable('Response Params', responseFields)}
    </main>
    {mode !== 'view' && <div className="service-api-limit-footer"><Button onClick={cancel}>Cancel</Button><Button type="primary" disabled={mode === 'config' ? !allFields.length || Boolean(countryState?.submitted && !dirtyKeys.size) : !environment || !selectedKeys.size} onClick={mode === 'config' ? submitConfig : submitDeploy}>Submit</Button></div>}
    <Modal title="Field Limit" open={fieldModalKey !== null} onCancel={() => { setFieldModalKey(null); setFieldModalDraft(null); }} onOk={saveFieldLimit} okText="Submit" cancelText="Cancel" destroyOnHidden>
      {fieldModalDraft && <div className="service-api-field-limit-form">
        <label><span>Pattern:</span><div><Select showSearch allowClear placeholder="Please Select" value={fieldModalDraft.pattern || undefined} onChange={(value) => setFieldModalDraft({ ...fieldModalDraft, pattern: value || '' })} options={['^[a-zA-Z0-9_]+$', '^[0-9]+$', '^[a-zA-Z]+$'].map((value) => ({ value, label: value }))} /><small>For example: ^[a-zA-Z0-9_]+$</small></div></label>
        <label><span>Length:</span><div className="service-api-field-limit-length"><Input placeholder="Min Length" inputMode="numeric" value={fieldModalDraft.minLength} onChange={(event) => setFieldModalDraft({ ...fieldModalDraft, minLength: event.target.value })} /><Input placeholder="Max Length" inputMode="numeric" value={fieldModalDraft.maxLength} onChange={(event) => setFieldModalDraft({ ...fieldModalDraft, maxLength: event.target.value })} /></div></label>
      </div>}
    </Modal>
  </div>;
}

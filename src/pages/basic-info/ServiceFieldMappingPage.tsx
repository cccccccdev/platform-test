import { useState } from 'react';
import { Breadcrumb, Button, Checkbox, Select, Tag, Typography } from 'antd';
import { ArrowRightOutlined, LeftOutlined } from '@ant-design/icons';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { serviceApiRequestFields, serviceApiResponseFields } from './serviceApiReferenceData';
import { fieldsToTree, type SpiFieldNode } from './capability/spiSchemaModel';
import { getDefaultSpiMappingSchema } from './capability/CapabilitySpiPage';
import { canDeployField, type DeployEnvironment } from './serviceApiLimitModel';
import { defaultApiMapping, deployMapping, flattenMappingFields, submitMapping, type MappingField, type SavedMapping } from './serviceFieldMappingModel';
import { getDemoReturnUrl } from './demoNavigation';
import './ServiceFieldMappingPage.css';

const { Title, Text } = Typography;
const MAPPING_STORAGE_KEY = 'basic-info-service-field-mapping-demo-v1';
const API_STORAGE_KEY = 'basic-info-service-api-demo-v1';
const SPI_STORAGE_KEY = 'basic-info-config-spi-demo-v1';
type Mode = 'view' | 'config' | 'deploy';
type Tab = 'config' | 'code';
type Direction = 'request' | 'response';
interface SavedSchema { request?: SpiFieldNode[]; response?: SpiFieldNode[]; }

function readRecord<T>(key: string): Record<string, T> {
  try { return JSON.parse(localStorage.getItem(key) || '{}') as Record<string, T>; }
  catch { return {}; }
}
function timestamp() {
  const date = new Date();
  const two = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${two(date.getMonth() + 1)}-${two(date.getDate())} ${two(date.getHours())}:${two(date.getMinutes())}:${two(date.getSeconds())}`;
}

export default function ServiceFieldMappingPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [tab, setTab] = useState<Tab>('config');
  const [mode, setMode] = useState<Mode>('view');
  const [store, setStore] = useState<Record<string, SavedMapping>>(() => readRecord<SavedMapping>(MAPPING_STORAGE_KEY));
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [dirtyKeys, setDirtyKeys] = useState<Set<string>>(new Set());
  const [environment, setEnvironment] = useState<DeployEnvironment>();
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const businessType = searchParams.get('bt') || '';
  const service = searchParams.get('service') || '';
  const ability = searchParams.get('ability') || '';
  const action = searchParams.get('action') || '';
  const abilityAction = searchParams.get('abilityAction') || action;
  const backQuery = new URLSearchParams({ bt: businessType, service });
  const demoReturnUrl = getDemoReturnUrl(searchParams, businessType);
  const backUrl = demoReturnUrl || `/basic-info/service/capability?${backQuery.toString()}`;
  const scope = JSON.stringify([businessType, service, ability, action, abilityAction, tab]);
  const saved = store[scope];
  const savedApi = readRecord<SavedSchema>(API_STORAGE_KEY)[JSON.stringify([businessType, service, action])];
  const savedSpi = readRecord<SavedSchema>(SPI_STORAGE_KEY)[JSON.stringify([businessType, ability, abilityAction, tab])];
  const defaultSpi = getDefaultSpiMappingSchema(businessType, ability, abilityAction, tab);
  const apiTrees = {
    request: Array.isArray(savedApi?.request) ? savedApi.request : fieldsToTree(serviceApiRequestFields),
    response: Array.isArray(savedApi?.response) ? savedApi.response : fieldsToTree(serviceApiResponseFields),
  };
  const spiTrees = {
    request: Array.isArray(savedSpi?.request) ? savedSpi.request : defaultSpi.request,
    response: Array.isArray(savedSpi?.response) ? savedSpi.response : defaultSpi.response,
  };
  const apiFields = {
    request: flattenMappingFields(apiTrees.request, 'request'),
    response: flattenMappingFields(apiTrees.response, 'response'),
  };
  const spiFields = {
    request: flattenMappingFields(spiTrees.request, 'request'),
    response: flattenMappingFields(spiTrees.response, 'response'),
  };
  const leafFields = [...spiFields.request, ...spiFields.response].filter((field) => field.leaf);
  const mappedPath = (field: MappingField, direction: Direction) =>
    mode === 'config' ? draft[field.key] || '' : saved?.fields[field.key]?.apiPath ?? defaultApiMapping(field, apiFields[direction]);
  const persist = (next: Record<string, SavedMapping>) => { setStore(next); localStorage.setItem(MAPPING_STORAGE_KEY, JSON.stringify(next)); };
  const beginConfig = () => {
    setDraft(Object.fromEntries((['request', 'response'] as Direction[]).flatMap((direction) =>
      spiFields[direction].filter((field) => field.leaf).map((field) => [field.key, saved?.fields[field.key]?.apiPath ?? defaultApiMapping(field, apiFields[direction])]))));
    setDirtyKeys(new Set());
    setMode('config');
  };
  const updateApiPath = (key: string, path: string) => {
    setDraft((current) => ({ ...current, [key]: path }));
    setDirtyKeys((current) => new Set(current).add(key));
  };
  const submitConfig = () => {
    if (!leafFields.length || (saved?.submitted && !dirtyKeys.size)) return;
    persist({ ...store, [scope]: submitMapping(saved, draft, leafFields.map((field) => field.key), dirtyKeys, timestamp(), 'Current User') });
    setMode('view');
  };
  const submitDeploy = () => {
    if (!saved || !environment || !selectedKeys.size) return;
    persist({ ...store, [scope]: deployMapping(saved, environment, selectedKeys, timestamp(), 'Current User') });
    setSelectedKeys(new Set()); setEnvironment(undefined); setMode('view');
  };
  const cancel = () => { setMode('view'); setEnvironment(undefined); setSelectedKeys(new Set()); };
  const toggleSelected = (keys: string[], checked: boolean) => {
    setSelectedKeys((current) => {
      const next = new Set(current);
      for (const key of keys) if (checked) next.add(key); else next.delete(key);
      return next;
    });
  };
  const renderSection = (direction: Direction) => {
    const request = direction === 'request';
    const fields = spiFields[direction];
    const eligible = fields.filter((field) => field.leaf && canDeployField(saved?.fields[field.key]?.status, environment)).map((field) => field.key);
    return <section className="field-mapping-section" key={direction}>
      <Title level={5}><span className="field-mapping-marker" />{request ? 'Request (API TO SPI)' : 'Response (SPI TO API)'}</Title>
      <div className="field-mapping-scroll">
        <div className={`field-mapping-grid field-mapping-head${mode === 'config' ? ' is-config' : ''}${mode === 'deploy' ? ' is-deploy' : ''}`}>
          {mode === 'deploy' && <Checkbox aria-label={`Select eligible ${direction} mappings`} disabled={!eligible.length} checked={Boolean(eligible.length) && eligible.every((key) => selectedKeys.has(key))} indeterminate={eligible.some((key) => selectedKeys.has(key)) && !eligible.every((key) => selectedKeys.has(key))} onChange={(event) => toggleSelected(eligible, event.target.checked)} />}
          <span>{request ? 'API' : 'SPI'}</span><span>{request ? 'API Field Type' : 'SPI Field Type'}</span>
          <span aria-hidden="true" /><span>{request ? 'SPI' : 'API'}</span><span>{request ? 'SPI Field Type' : 'API Field Type'}</span>
          {mode !== 'config' && <><span>Deploy Status</span><span>Operate Time</span><span>Operator</span></>}
        </div>
        {fields.map((field) => {
          const apiPath = mappedPath(field, direction);
          const apiField = apiFields[direction].find((candidate) => candidate.path === apiPath);
          const state = saved?.fields[field.key];
          const eligibleForDeploy = field.leaf && canDeployField(state?.status, environment);
          const apiOptions = apiFields[direction].filter((candidate) => candidate.leaf && candidate.type === field.type)
            .map((candidate) => ({ value: candidate.path, label: candidate.path }));
          const spiName = <div className="field-mapping-fixed" title={field.path} style={{ paddingLeft: field.depth * 16 }}>{field.path}</div>;
          const spiType = <div className="field-mapping-fixed">{field.type}</div>;
          const apiName = field.leaf ? <Select value={apiPath || undefined} options={apiOptions} showSearch optionFilterProp="label" allowClear placeholder={mode === 'config' ? 'Select API field' : '—'} disabled={mode !== 'config'} onChange={(path: string | undefined) => updateApiPath(field.key, path || '')} aria-label={`API field for ${field.path}`} /> : <span />;
          const apiType = field.leaf ? <div className="field-mapping-fixed">{apiField?.type || '—'}</div> : <span />;
          const status = state?.status;
          return <div className={`field-mapping-grid field-mapping-row${mode === 'config' ? ' is-config' : ''}${mode === 'deploy' ? ' is-deploy' : ''}${!field.leaf ? ' object-row' : ''}`} key={field.key}>
            {mode === 'deploy' && <Checkbox disabled={!eligibleForDeploy} checked={selectedKeys.has(field.key)} onChange={(event) => toggleSelected([field.key], event.target.checked)} aria-label={`Select ${field.path} mapping`} />}
            {request ? apiName : spiName}{request ? apiType : spiType}
            {field.leaf ? <ArrowRightOutlined className="field-mapping-arrow" /> : <span />}
            {request ? spiName : apiName}{request ? spiType : apiType}
            {mode !== 'config' && <>{field.leaf ? status ? <Tag color={status === 'DRAFT' ? 'green' : 'purple'}>{status === 'DRAFT' ? 'Draft' : status}</Tag> : <Text>—</Text> : <span />}
              <Text className="field-mapping-audit">{field.leaf ? state?.operateTime || '—' : ''}</Text>
              <Text className="field-mapping-audit">{field.leaf ? state?.operator || '—' : ''}</Text></>}
          </div>;
        })}
      </div>
    </section>;
  };

  return <div className="service-field-mapping-page">
    <section className="capability-features-heading">
      <Breadcrumb items={[
        { title: 'Basic Info', href: '/basic-info/country' },
        { title: demoReturnUrl ? 'Demo' : 'Service', href: demoReturnUrl || `/basic-info/service?bt=${encodeURIComponent(businessType)}` },
        ...(!demoReturnUrl ? [{ title: 'Service Capability', href: backUrl }] : []),
        { title: 'Field Mapping' },
      ]} />
      <button className="capability-child-back" type="button" onClick={() => navigate(backUrl)}><LeftOutlined /><Title level={4}>Field Mapping</Title></button>
    </section>
    <div className="field-mapping-tabs" role="tablist" aria-label="Mapping implementation type">
      <button type="button" role="tab" aria-selected={tab === 'config'} className={tab === 'config' ? 'active' : ''} disabled={mode !== 'view'} onClick={() => setTab('config')}>Config</button>
      <button type="button" role="tab" aria-selected={tab === 'code'} className={tab === 'code' ? 'active' : ''} disabled={mode !== 'view'} onClick={() => setTab('code')}>Code</button>
    </div>
    <main className="field-mapping-panel">
      <div className="field-mapping-toolbar">
        <div className="capability-page-context">
          <Text>Business Type: <Text strong>{businessType}</Text></Text>
          <Text>Service: <Text strong>{service}</Text></Text>
          <Text>Ability: <Text strong>{ability}</Text></Text>
          <Text>Action: <Text strong>{action}</Text></Text>
        </div>
        {tab === 'config' && mode === 'view' && <div><Button type="primary" onClick={beginConfig}>Config</Button><Button type="primary" disabled={!saved?.submitted} onClick={() => { setEnvironment(undefined); setSelectedKeys(new Set()); setMode('deploy'); }}>Deploy</Button></div>}
      </div>
      {tab === 'config' ? <>
        {mode === 'deploy' && <div className="field-mapping-environment"><label htmlFor="field-mapping-environment">* Environment</label><Select id="field-mapping-environment" placeholder="Daily/Pre/Prod" value={environment} onChange={(value: DeployEnvironment) => { setEnvironment(value); setSelectedKeys(new Set()); }} options={(['DAILY', 'PRE', 'PROD'] as DeployEnvironment[]).map((value) => ({ value, label: value }))} /></div>}
        {renderSection('request')}{renderSection('response')}
      </> : <div className="field-mapping-code-placeholder"><Text strong>Code mapping</Text><Text type="secondary">Code-based field mapping is retained as a separate implementation mode. Configuration details are not included in this demo.</Text></div>}
    </main>
    {mode !== 'view' && <div className="field-mapping-footer"><Button onClick={cancel}>Cancel</Button><Button type="primary" disabled={mode === 'config' ? !leafFields.length || Boolean(saved?.submitted && !dirtyKeys.size) : !environment || !selectedKeys.size} onClick={mode === 'config' ? submitConfig : submitDeploy}>Submit</Button></div>}
  </div>;
}

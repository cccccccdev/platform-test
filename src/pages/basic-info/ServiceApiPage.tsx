import { useMemo, useState } from 'react';
import { Breadcrumb, Button, Input, Select, Typography, message } from 'antd';
import { LeftOutlined } from '@ant-design/icons';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useServiceStore } from './serviceStore';
import {
  EFFECT_TAG_OPTIONS,
  serviceApiRequestFields,
  serviceApiResponseFields,
  type EffectTag,
  type ServiceApiField,
} from './serviceApiReferenceData';
import './ServiceApiPage.css';

const { Title, Text } = Typography;

function ApiFieldTable({ title, fields }: { title: string; fields: ServiceApiField[] }) {
  return (
    <section className="service-api-section">
      <Title level={5}>{title}</Title>
      <div className="service-api-field-table">
        <div className="service-api-field-head"><span>API</span><span>Field Type</span><span>Effect Tag</span><span>Description</span></div>
        {fields.map((field) => (
          <div className="service-api-field-row" key={field.key}>
            <Text className={field.depth ? 'nested' : ''} strong={!field.depth}>{field.name}</Text>
            <Text>{field.type}</Text>
            <Select value={field.effectTag} options={[{ label: field.effectTag, value: field.effectTag }]} disabled />
            <Input value={field.description} disabled />
          </div>
        ))}
      </div>
    </section>
  );
}

export default function ServiceApiPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const businessType = searchParams.get('bt') || '';
  const serviceName = searchParams.get('service') || '';
  const actionName = searchParams.get('action') || '';
  const service = useServiceStore((state) => (state.records[businessType] || []).find((item) => item.name === serviceName));
  const action = service?.actions.find((item) => item.name === actionName);
  const [draftTags, setDraftTags] = useState<EffectTag[]>([]);
  const [appliedTags, setAppliedTags] = useState<EffectTag[]>([]);

  const filterFields = (fields: ServiceApiField[]) => appliedTags.length === 0
    ? fields
    : fields.filter((field) => appliedTags.includes(field.effectTag));
  const requestFields = useMemo(() => filterFields(serviceApiRequestFields), [appliedTags]);
  const responseFields = useMemo(() => filterFields(serviceApiResponseFields), [appliedTags]);

  const resetFilter = () => {
    setDraftTags([]);
    setAppliedTags([]);
  };

  return (
    <div className="service-api-page">
      <section className="capability-features-heading">
        <Breadcrumb items={[
          { title: 'Basic Info', href: '/basic-info/country' },
          { title: 'Service', href: `/basic-info/service?bt=${encodeURIComponent(businessType)}` },
          { title: 'API' },
        ]} />
        <button className="capability-child-back" type="button" onClick={() => navigate(`/basic-info/service?bt=${encodeURIComponent(businessType)}`)}>
          <LeftOutlined />
          <Title level={4}>API</Title>
        </button>
      </section>

      <main className="service-api-panel">
        <div className="service-api-toolbar">
          <div className="capability-page-context">
            <Text>Business Type: <Text strong>{businessType}</Text></Text>
            <Text>Service: <Text strong>{serviceName}</Text></Text>
            <Text>Action: <Text strong>{actionName}</Text></Text>
            <Text>Operator: <Text strong>{action?.operator || '—'}</Text></Text>
            <Text>Operate Time: <Text strong>{action?.operateTime || '—'}</Text></Text>
          </div>
          <div className="service-api-top-actions">
            <Button onClick={() => message.info('Share is not included in the current demo')}>Share</Button>
            <Button type="primary" onClick={() => message.info('API configuration is not included in the current demo')}>Config</Button>
          </div>
        </div>

        <section className="service-api-meta">
          <Text><span className="required-label">Method:</span> POST</Text>
          <Text><span className="required-label">URL:</span> /api/service</Text>
          <label><span>Description:</span><Input value={`${businessType} ${serviceName} ${actionName} service API`} disabled /></label>
        </section>

        <section className="service-api-filter" aria-label="Effect Tag filter">
          <label htmlFor="service-api-effect-tags">Effect Tag:</label>
          <Select
            id="service-api-effect-tags"
            mode="multiple"
            maxCount={3}
            value={draftTags}
            options={EFFECT_TAG_OPTIONS.map((tag) => ({ label: tag, value: tag }))}
            onChange={setDraftTags}
            placeholder="Please select 1–3 Effect Tags"
          />
          <Button type="primary" disabled={draftTags.length === 0} onClick={() => setAppliedTags(draftTags)}>Query</Button>
          <Button onClick={resetFilter}>Reset</Button>
        </section>

        <ApiFieldTable title="Request Params" fields={requestFields} />
        <ApiFieldTable title="Response Params" fields={responseFields} />
      </main>
    </div>
  );
}

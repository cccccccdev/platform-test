import { Breadcrumb, Button, Checkbox, Tag, Typography, message } from 'antd';
import { LeftOutlined } from '@ant-design/icons';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useServiceStore } from './serviceStore';
import { serviceApiRequestFields, serviceApiResponseFields, type ServiceApiField } from './serviceApiReferenceData';
import './ServiceApiLimitPage.css';

const { Title, Text } = Typography;
const COUNTRY_CODES = ['NG', 'TZ', 'GH', 'BD', 'CI', 'SN', 'KE', 'SHADOW', 'PK', 'GSA', 'ZA', 'UG', 'SG', 'HK', 'GB', 'CN', 'PH', 'BF'];
const REQUIRED_FIELDS = new Set(['route', 'country', 'tenant', 'capability', 'businessType', 'service', 'action', 'identity', 'requestReference']);

function fieldLimit(field: ServiceApiField) {
  if (field.type === 'Object') return '—';
  if (field.name === 'country') return 'ISO 3166-1 alpha-2';
  if (field.name.toLowerCase().includes('reference')) return '1–64 characters';
  if (field.name === 'content') return '1–2,000 characters';
  return 'Maximum 128 characters';
}

function LimitTable({ title, fields }: { title: string; fields: ServiceApiField[] }) {
  return (
    <section className="service-api-limit-section">
      <Title level={5}>{title}</Title>
      <div className="service-api-limit-table">
        <div className="service-api-limit-head">
          <span>API</span><span>Field Type</span><span>Description</span><span>Mandatory</span><span>Field Limit</span><span>Deploy Status</span><span>Operate Time</span><span>Operator</span>
        </div>
        {fields.map((field) => (
          <div className="service-api-limit-row" key={field.key}>
            <Text className={field.depth ? 'nested' : ''} strong={!field.depth}>{field.name}</Text>
            <Text>{field.type}</Text>
            <Text>{field.description}</Text>
            <Checkbox checked={REQUIRED_FIELDS.has(field.name)} disabled />
            <Text type={field.type === 'Object' ? 'secondary' : undefined}>{fieldLimit(field)}</Text>
            <Tag color="green">Prod</Tag>
            <Text className="service-api-limit-audit">2026-09-10<br />16:20:00</Text>
            <Text className="service-api-limit-audit">system</Text>
          </div>
        ))}
      </div>
    </section>
  );
}

export default function ServiceApiLimitPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const businessType = searchParams.get('bt') || '';
  const serviceName = searchParams.get('service') || '';
  const actionName = searchParams.get('action') || '';
  const service = useServiceStore((state) => (state.records[businessType] || []).find((item) => item.name === serviceName));
  const action = service?.actions.find((item) => item.name === actionName);

  return (
    <div className="service-api-limit-page">
      <section className="capability-features-heading">
        <Breadcrumb items={[
          { title: 'Basic Info', href: '/basic-info/country' },
          { title: 'Service', href: `/basic-info/service?bt=${encodeURIComponent(businessType)}` },
          { title: 'API Limit' },
        ]} />
        <button className="capability-child-back" type="button" onClick={() => navigate(`/basic-info/service?bt=${encodeURIComponent(businessType)}`)}>
          <LeftOutlined />
          <Title level={4}>API Limit</Title>
        </button>
      </section>

      <main className="service-api-limit-panel">
        <nav className="service-api-country-tabs" aria-label="Country API limits">
          {COUNTRY_CODES.map((country) => <span key={country} className={country === 'NG' ? 'active' : ''}>{country}</span>)}
        </nav>

        <div className="service-api-limit-toolbar">
          <div className="capability-page-context">
            <Text>Country: <Text strong>NG</Text></Text>
            <Text>Business Type: <Text strong>{businessType}</Text></Text>
            <Text>Service: <Text strong>{serviceName}</Text></Text>
            <Text>Action: <Text strong>{actionName}</Text></Text>
            <Text>Operator: <Text strong>{action?.operator || '—'}</Text></Text>
            <Text>Operate Time: <Text strong>{action?.operateTime || '—'}</Text></Text>
          </div>
          <Button type="primary" onClick={() => message.info('API Limit configuration is not included in the current demo')}>Config</Button>
        </div>

        <div className="service-api-limit-meta">
          <Text><Text strong>Method:</Text> POST</Text>
          <Text><Text strong>URL:</Text> /api/service</Text>
          <Text><Text strong>Description:</Text> Country-specific API field constraints</Text>
        </div>

        <LimitTable title="Request Params" fields={serviceApiRequestFields} />
        <LimitTable title="Response Params" fields={serviceApiResponseFields} />
      </main>
    </div>
  );
}

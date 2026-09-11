import { useState } from 'react';
import { Breadcrumb, Button, Select, Tag, Typography, message } from 'antd';
import { ArrowRightOutlined, LeftOutlined } from '@ant-design/icons';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { requestFieldMappings, responseFieldMappings, type FieldMappingRow } from './serviceCapabilityReferenceData';

const { Title, Text } = Typography;

function MappingSection({ direction, rows }: { direction: 'request' | 'response'; rows: FieldMappingRow[] }) {
  const request = direction === 'request';
  return (
    <section className="field-mapping-section">
      <Title level={5}><span className="field-mapping-marker" />{request ? 'Request (API to SPI)' : 'Response (SPI to API)'}</Title>
      <div className="field-mapping-grid field-mapping-head">
        <span>{request ? 'API' : 'SPI'}</span>
        <span>{request ? 'API Field Type' : 'SPI Field Type'}</span>
        <span aria-hidden="true" />
        <span>{request ? 'SPI' : 'API'}</span>
        <span>{request ? 'SPI Field Type' : 'API Field Type'}</span>
        <span>Deploy Status</span>
        <span>Operate Time</span>
        <span>Operator</span>
      </div>
      {rows.map((row) => {
        const source = request ? row.api : row.spi;
        const sourceType = request ? row.apiType : row.spiType;
        const target = request ? row.spi : row.api;
        const targetType = request ? row.spiType : row.apiType;
        return (
          <div className={`field-mapping-grid field-mapping-row ${row.spiType === 'Object' ? 'object-row' : ''}`} key={row.key}>
            <div className={row.level ? 'nested-field' : ''}><Select value={source} placeholder="Not mapped" options={source ? [{ value: source, label: source }] : []} disabled={row.spiType === 'Object'} /></div>
            <Select value={sourceType} placeholder="—" options={sourceType ? [{ value: sourceType, label: sourceType }] : []} disabled />
            <ArrowRightOutlined className="field-mapping-arrow" />
            <div className={row.level ? 'nested-field' : ''}><Select value={target} placeholder="Not mapped" options={target ? [{ value: target, label: target }] : []} disabled={request || row.spiType === 'Object'} /></div>
            <Select value={targetType} placeholder="—" options={targetType ? [{ value: targetType, label: targetType }] : []} disabled />
            <Tag color="green">Prod</Tag>
            <Text className="field-mapping-audit">2026-09-10<br />16:20:00</Text>
            <Text className="field-mapping-audit">system</Text>
          </div>
        );
      })}
    </section>
  );
}

export default function ServiceFieldMappingPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [tab, setTab] = useState<'config' | 'code'>('config');
  const businessType = searchParams.get('bt') || '';
  const service = searchParams.get('service') || '';
  const ability = searchParams.get('ability') || '';
  const action = searchParams.get('action') || '';
  const backQuery = new URLSearchParams({ bt: businessType, service });

  return (
    <div className="service-field-mapping-page">
      <section className="capability-features-heading">
        <Breadcrumb items={[
          { title: 'Basic Info', href: '/basic-info/country' },
          { title: 'Service', href: `/basic-info/service?bt=${encodeURIComponent(businessType)}` },
          { title: 'Service Capability', href: `/basic-info/service/capability?${backQuery.toString()}` },
          { title: 'Field Mapping' },
        ]} />
        <button className="capability-child-back" type="button" onClick={() => navigate(`/basic-info/service/capability?${backQuery.toString()}`)}>
          <LeftOutlined />
          <Title level={4}>Field Mapping</Title>
        </button>
      </section>

      <div className="field-mapping-tabs" role="tablist" aria-label="Mapping implementation type">
        <button type="button" role="tab" aria-selected={tab === 'config'} className={tab === 'config' ? 'active' : ''} onClick={() => setTab('config')}>Config</button>
        <button type="button" role="tab" aria-selected={tab === 'code'} className={tab === 'code' ? 'active' : ''} onClick={() => setTab('code')}>Code</button>
      </div>

      <main className="field-mapping-panel">
        <div className="field-mapping-toolbar">
          <div className="capability-page-context">
            <Text>Business Type: <Text strong>{businessType}</Text></Text>
            <Text>Service: <Text strong>{service}</Text></Text>
            <Text>Ability: <Text strong>{ability}</Text></Text>
            <Text>Action: <Text strong>{action}</Text></Text>
          </div>
          <div>
            <Button type="primary" onClick={() => message.success('Mapping configuration saved')}>Config</Button>
            <Button type="primary" onClick={() => message.success('Mapping deployed')}>Deploy</Button>
          </div>
        </div>
        {tab === 'config' ? (
          <>
            <MappingSection direction="request" rows={requestFieldMappings} />
            <MappingSection direction="response" rows={responseFieldMappings} />
          </>
        ) : (
          <div className="field-mapping-code-placeholder">
            <Text strong>Code mapping</Text>
            <Text type="secondary">Code-based field mapping is retained as a separate implementation mode. Configuration details are not included in this demo.</Text>
          </div>
        )}
      </main>
    </div>
  );
}

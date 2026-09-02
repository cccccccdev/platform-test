import { Alert, Breadcrumb, Button, Table, Tabs, Tag } from 'antd';
import { useParams } from 'react-router-dom';

type InboundEndpointRow = {
  key: string;
  version: string;
  endpointPath: string;
  businessType: string;
  operator: string;
  operationTime: string;
};

type OutboundEndpointRow = {
  key: string;
  version: string;
  endpointName: string;
  businessType: string;
  operator: string;
  operationTime: string;
};

type SecuritySchemaRow = {
  key: string;
  version: string;
  name: string;
  algorithm: string;
  operator: string;
  operationTime: string;
};

const legacyInboundEndpointsByChannel: Record<string, InboundEndpointRow[]> = {
  EVEXIN: [
    { key: 'evexin_legacy_1', version: '20251118094622', endpointPath: '/callback/evexin/sms/delivery-report', businessType: 'SMS', operator: 'Bailly', operationTime: '2025-11-18 09:46:22' },
    { key: 'evexin_legacy_2', version: '20250307142736', endpointPath: '/callback/evexin/sms/status-notify', businessType: 'SMS', operator: 'Avery', operationTime: '2025-03-07 14:27:36' },
  ],
  CHANNEL_A: [
    { key: 'channel_a_legacy_1', version: '20241023110518', endpointPath: '/callback/channel_a/payment/status', businessType: 'PAYMENT', operator: 'admin', operationTime: '2024-10-23 11:05:18' },
  ],
};

const legacyOutboundEndpoints: OutboundEndpointRow[] = [
  { key: 'legacy_outbound_1', version: '20260820122454', endpointName: 'Download Policy Output', businessType: 'INSURANCE', operator: 'Abayomi Mustapha', operationTime: '2026-08-20 12:24:55' },
  { key: 'legacy_outbound_2', version: '20260820115713', endpointName: 'Query Policy Status', businessType: 'INSURANCE', operator: 'Abayomi Mustapha', operationTime: '2026-08-20 11:57:14' },
  { key: 'legacy_outbound_3', version: '20260820115651', endpointName: 'Create Policy', businessType: 'INSURANCE', operator: 'Abayomi Mustapha', operationTime: '2026-08-20 11:56:52' },
];

const legacySecuritySchemas: Array<{ title: string; algorithmTitle: string; rows: SecuritySchemaRow[] }> = [
  { title: 'Signing Algorithm', algorithmTitle: 'Signature Algorithm', rows: [{ key: 'signing_1', version: '20260819091005', name: 'Sign jsonRequest', algorithm: 'NEW_CUSTOM', operator: 'Abayomi Mustapha', operationTime: '2026-08-19 09:10:05' }] },
  { title: 'Signature Verification Algorithm', algorithmTitle: 'Verification Algorithm', rows: [{ key: 'verification_1', version: '20260819153207', name: 'Signature verification', algorithm: 'NEW_CUSTOM', operator: 'Abayomi Mustapha', operationTime: '2026-08-19 15:32:08' }] },
  { title: 'Encryption Protocol', algorithmTitle: 'Encryption Protocol', rows: [{ key: 'encryption_1', version: '20260818054055', name: 'JsonRequest encryption', algorithm: 'CUSTOM', operator: 'Abayomi Mustapha', operationTime: '2026-08-18 05:40:56' }] },
  { title: 'Decryption Protocol', algorithmTitle: 'Decryption Protocol', rows: [{ key: 'decryption_1', version: '20260820115338', name: 'Response decryption', algorithm: 'CUSTOM', operator: 'Abayomi Mustapha', operationTime: '2026-08-20 11:53:39' }] },
];

export default function MetadataPage() {
  const { channelCode = '' } = useParams();
  const rows = legacyInboundEndpointsByChannel[channelCode] ?? [];

  const operationColumn = {
    title: 'Operation',
    width: '18%',
    render: () => <div className="metadata-operation"><Button type="link">Config</Button><Button type="link">Detail</Button><Button type="link">Log</Button></div>,
  };

  const securityContent = <section className="metadata-panel">
    <div className="metadata-channel"><strong>Channel:</strong><span>{channelCode}</span></div>
    {legacySecuritySchemas.map((section) => <div className="metadata-security-section" key={section.title}>
      <strong className="metadata-section-title">{section.title}</strong>
      <Table<SecuritySchemaRow>
        rowKey="key"
        dataSource={section.rows}
        pagination={{ pageSize: 10, position: ['bottomRight'] }}
        columns={[
          { title: 'Version', dataIndex: 'version', width: '17%', render: (value: string) => <Tag color="green">{value}</Tag> },
          { title: 'Name', dataIndex: 'name', width: '16%' },
          { title: section.algorithmTitle, dataIndex: 'algorithm', width: '18%' },
          { title: 'Operator', dataIndex: 'operator', width: '16%' },
          { title: 'Operation Time', dataIndex: 'operationTime', width: '18%' },
          operationColumn,
        ]}
      />
    </div>)}
  </section>;

  const outboundContent = <section className="metadata-panel">
    <Alert
      type="info"
      showIcon
      message="This page displays legacy outbound endpoints only. New outbound endpoints can now only be created in Flow Groups."
      className="metadata-legacy-notice"
    />
    <div className="metadata-channel"><strong>Channel:</strong><span>{channelCode}</span></div>
    <Table<OutboundEndpointRow>
      rowKey="key"
      dataSource={legacyOutboundEndpoints}
      pagination={{ pageSize: 10, position: ['bottomRight'] }}
      columns={[
        { title: 'Version', dataIndex: 'version', width: '14%', render: (value: string) => <Tag color="green">{value}</Tag> },
        { title: 'Endpoint Name', dataIndex: 'endpointName', width: '16%' },
        { title: 'Business Type', dataIndex: 'businessType', width: '25%', render: (value: string) => <Tag>{value}</Tag> },
        { title: 'Operator', dataIndex: 'operator', width: '13%' },
        { title: 'Operation Time', dataIndex: 'operationTime', width: '15%' },
        operationColumn,
      ]}
    />
  </section>;

  const inboundContent = <section className="metadata-panel">
    <Alert
      type="info"
      showIcon
      message="This page displays legacy inbound endpoints only. New inbound endpoints can now only be created in Route Matching."
      className="metadata-legacy-notice"
    />
    <div className="metadata-channel"><strong>Channel:</strong><span>{channelCode}</span></div>
    <Table<InboundEndpointRow>
      rowKey="key"
      dataSource={rows}
      pagination={{ pageSize: 10, position: ['bottomRight'] }}
      columns={[
        { title: 'Version', dataIndex: 'version', width: '23%', render: (value: string) => <Tag color="green">{value}</Tag> },
        { title: 'Endpoint Path', dataIndex: 'endpointPath', width: '31%' },
        { title: 'Business Type', dataIndex: 'businessType', width: '18%' },
        { title: 'Operator', dataIndex: 'operator', width: '10%' },
        { title: 'Operation Time', dataIndex: 'operationTime', width: '12%' },
        operationColumn,
      ]}
    />
  </section>;

  return <main className="metadata-page">
      <header className="integration-overview-heading">
        <Breadcrumb items={[{ title: 'Channel Integration' }, { title: 'Integration' }, { title: 'Config Integration' }, { title: 'Metadata' }]} />
        <h1>Metadata</h1>
      </header>
      <div className="metadata-content">
        <Tabs
          defaultActiveKey="security"
          type="card"
          items={[
            { key: 'security', label: 'Security', children: securityContent },
            { key: 'outbound', label: 'Outbound Endpoints', children: outboundContent },
            { key: 'inbound', label: 'Inbound Endpoints', children: inboundContent },
          ]}
        />
      </div>
  </main>;
}

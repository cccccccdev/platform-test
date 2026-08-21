import { Alert, Breadcrumb, Button, Table, Tabs, Tag } from 'antd';
import { useNavigate, useParams } from 'react-router-dom';
import { Brand, UserProfile } from '../../components/PlatformChrome';

type InboundEndpointRow = {
  key: string;
  version: string;
  endpointPath: string;
  businessType: string;
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

export default function MetadataPage() {
  const navigate = useNavigate();
  const { channelCode = '' } = useParams();
  const rows = legacyInboundEndpointsByChannel[channelCode] ?? [];

  const inboundContent = <section className="metadata-panel">
    <Alert
      type="info"
      showIcon
      message="This page displays legacy inbound endpoints only. New inbound endpoints can now only be created in Route Matching."
      className="metadata-inbound-notice"
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
        { title: 'Operation', width: '18%', render: () => <div className="metadata-operation"><Button type="link">Config</Button><Button type="link">Detail</Button><Button type="link">Log</Button></div> },
      ]}
    />
  </section>;

  return <div className="channel-list-shell metadata-page">
    <aside className="channel-list-sidebar">
      <div className="legacy-sidebar-brand" onClick={() => navigate('/home')}><Brand /></div>
      <div className="legacy-sidebar-section">Channel Integration <span>⌃</span></div>
      <div className="channel-list-active" onClick={() => navigate('/channel-integration')}>Channel List</div>
    </aside>
    <div className="channel-list-main">
      <header className="legacy-header"><UserProfile /></header>
      <div className="legacy-page-heading">
        <Breadcrumb items={[{ title: 'Channel Integration' }, { title: 'Channel List' }, { title: 'Metadata' }]} />
        <h1>Metadata</h1>
      </div>
      <main className="metadata-content">
        <Tabs
          defaultActiveKey="inbound"
          type="card"
          items={[
            { key: 'security', label: 'Security', children: <section className="metadata-panel"><div className="metadata-channel"><strong>Channel:</strong><span>{channelCode}</span></div></section> },
            { key: 'outbound', label: 'Outbound Endpoints', children: <section className="metadata-panel"><div className="metadata-channel"><strong>Channel:</strong><span>{channelCode}</span></div></section> },
            { key: 'inbound', label: 'Inbound Endpoints', children: inboundContent },
          ]}
        />
      </main>
    </div>
  </div>;
}

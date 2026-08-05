import { Alert, Breadcrumb, Card, Tabs, Typography } from 'antd';
import { useParams } from 'react-router-dom';

const { Text, Title } = Typography;

export default function MetadataPage() {
  const { channelCode = '' } = useParams();

  return (
    <div style={{ padding: 24, minHeight: '100%', background: '#f5f6f8' }}>
      <Breadcrumb
        items={[
          { title: 'Channel Integration' },
          { title: 'Channel List' },
          { title: 'Metadata' },
        ]}
      />
      <Title level={3} style={{ margin: '16px 0 20px' }}>Metadata</Title>

      <Card styles={{ body: { padding: 0 } }}>
        <div style={{ padding: '18px 24px 0' }}>
          <Text type="secondary">Channel: </Text>
          <Text strong>{channelCode}</Text>
        </div>
        <Tabs
          defaultActiveKey="security"
          tabBarStyle={{ padding: '0 24px', marginTop: 14, marginBottom: 0 }}
          items={[
            {
              key: 'security',
              label: 'Security',
              children: (
                <div style={{ padding: 24 }}>
                  <Alert
                    type="info"
                    showIcon
                    message="移除 Authentication，其余与 1.0 完全保持一致。"
                    description="保留加密、解密、加签和验签配置。"
                  />
                </div>
              ),
            },
            {
              key: 'outbound',
              label: 'Outbound Endpoints',
              children: (
                <div style={{ padding: 24 }}>
                  <Alert type="info" showIcon message="与 1.0 完全保持一致。" />
                </div>
              ),
            },
            {
              key: 'inbound',
              label: 'Inbound Endpoints',
              children: (
                <div style={{ padding: 24 }}>
                  <Alert
                    type="info"
                    showIcon
                    message="与 1.0 相比，仅移除 Add Endpoint 功能（在 Route Matching 中创建），其余完全保持一致。"
                  />
                </div>
              ),
            },
          ]}
        />
      </Card>
    </div>
  );
}

import { useParams, useNavigate } from 'react-router-dom';
import { Card, Button, Breadcrumb, Space, Alert } from 'antd';
import { mockChannels } from '../../mock/data';

export default function BasicInfoPage() {
  const { channelCode } = useParams<{ channelCode: string }>();
  const navigate = useNavigate();
  const channel = mockChannels.find((c) => c.code === channelCode);

  return (
    <div style={{ padding: 24 }}>
      <Breadcrumb
        style={{ marginBottom: 16 }}
        items={[
          { title: 'Omnicore Solution' },
          { title: 'Channel Integration', href: '/channel-integration' },
          { title: channelCode },
          { title: 'Basic Info' },
        ]}
      />

      <Card title="Basic Information">
        {channel ? (
          <div>
            <p><strong>Channel Code:</strong> {channel.code}</p>
            <p><strong>Status:</strong> {channel.status}</p>
            <p><strong>Operator:</strong> {channel.operator}</p>
            <p><strong>Operation Time:</strong> {channel.operationTime}</p>
          </div>
        ) : (
          <Alert type="warning" message="Channel not found" />
        )}
        <Space style={{ marginTop: 16 }}>
          <Button onClick={() => navigate(`/channel-integration`)}>
            Back
          </Button>
        </Space>
      </Card>
    </div>
  );
}

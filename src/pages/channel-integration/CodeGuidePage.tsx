import { Card, Breadcrumb, Typography, Button, Tabs, message } from 'antd';
import { CopyOutlined } from '@ant-design/icons';
import { useParams, useNavigate } from 'react-router-dom';

const { Title, Text } = Typography;

export default function CodeGuidePage() {
  const { channelCode, ability } = useParams<{ channelCode: string; bt: string; ability: string }>();
  const navigate = useNavigate();

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    message.success('已复制');
  };

  return (
    <div style={{ padding: 24 }}>
      <Breadcrumb
        style={{ marginBottom: 16 }}
        items={[
          { title: 'Channel Integration', onClick: () => navigate('/channel-integration') },
          { title: channelCode },
          { title: 'Integration' },
          { title: 'Code Integration', onClick: () => navigate(`/channel-integration/${channelCode}/integration/code`) },
          { title: ability },
        ]}
      />

      <Title level={4}>Code Integration · {ability}</Title>

      {/* SDK 依赖 */}
      <Card title="SDK 依赖" style={{ marginBottom: 16 }}>
        <pre style={{ background: '#f6f8fa', padding: 16, borderRadius: 6, overflowX: 'auto' }}>
{`<dependency>
  <groupId>com.palmpay</groupId>
  <artifactId>channel-sdk</artifactId>
  <version>2.0.1</version>
</dependency>`}
        </pre>
        <Button
          icon={<CopyOutlined />}
          onClick={() => handleCopy('<dependency>\n  <groupId>com.palmpay</groupId>\n  <artifactId>channel-sdk</artifactId>\n  <version>2.0.1</version>\n</dependency>')}
        >
          Copy
        </Button>
      </Card>

      {/* 接口规范 */}
      <Card title="接口规范" style={{ marginBottom: 16 }}>
        <Text>需实现以下 SPI 接口：</Text>
        <ul>
          <li>ITransactionHandler</li>
          <li>IQueryHandler</li>
          <li>IVerifyHandler</li>
        </ul>
        <Button type="link">View Interface Docs</Button>
      </Card>

      {/* 代码示例 */}
      <Card title="代码示例">
        <Tabs
          items={['TRANSACTION', 'QUERY', 'VERIFY'].map((action) => ({
            key: action,
            label: action,
            children: (
              <pre style={{ background: '#f6f8fa', padding: 16, borderRadius: 6, overflowX: 'auto' }}>
{`// ${action} 接入示例
@Component
public class ${action.charAt(0)}${action.slice(1).toLowerCase()}Handler implements I${action.charAt(0)}${action.slice(1).toLowerCase()}Handler {
  @Override
  public ChannelResponse handle(ChannelRequest request) {
    // TODO: 实现渠道对接逻辑
    return ChannelResponse.success();
  }
}`}
              </pre>
            ),
          }))}
        />
      </Card>
    </div>
  );
}
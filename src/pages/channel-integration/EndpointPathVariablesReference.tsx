import { Space, Tag, Typography } from 'antd';

const { Text } = Typography;

export default function EndpointPathVariablesReference({ variables, endpointPath }: { variables: string[]; endpointPath?: string }) {
  if (variables.length === 0) {
    return <div style={{ padding: 14, color: '#8c8c8c', background: '#fafafa', borderRadius: 6 }}>
      No Path Variables are defined by the selected Inbound Endpoint URI.
    </div>;
  }
  return <div style={{ padding: 14, background: '#fafafa', border: '1px solid #f0f0f0', borderRadius: 6 }}>
    {endpointPath && <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>Endpoint Path: <Text code>{endpointPath}</Text></Text>}
    <Space size={[6, 6]} wrap>
      <Text type="secondary">Defined Path Variables:</Text>
      {variables.map((variable) => <Tag key={variable} color="blue" style={{ margin: 0 }}>{`{${variable}}`}</Tag>)}
    </Space>
  </div>;
}

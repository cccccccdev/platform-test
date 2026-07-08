import { Button, Divider, Tag, Typography } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import { useConfigIntegrationStore } from './configIntegrationStore';

const { Text } = Typography;

export default function RuntimeFlowCanvasPage() {
  const navigate = useNavigate();
  const { channelCode = '', bt = '', ability = '', versionId = '', flowId = '' } = useParams<{
    channelCode: string;
    bt: string;
    ability: string;
    versionId: string;
    flowId: string;
  }>();
  const abilityConfig = useConfigIntegrationStore((state) =>
    (state.abilitiesByChannel[channelCode] ?? []).find((item) => item.bt === bt && item.ability === ability)
  );
  const version = abilityConfig?.versions.find((item) => item.id === versionId);
  const flow = version?.flows.find((item) => item.id === flowId);

  if (!abilityConfig || !version || !flow) {
    return <div style={{ padding: 24 }}><h3>Runtime Flow not found</h3><Button onClick={() => navigate(-1)}>Back</Button></div>;
  }

  const contextItems = [
    ['Channel', channelCode],
    ['Business Type', bt],
    ['Ability', ability],
    ['Trigger Type', flow.triggerType ?? '-'],
    ['Flow Group Version', version.version],
    ['Flow ID', flow.id],
  ];
  const nodes = flow.canvasNodes?.length
    ? flow.canvasNodes.map((node) => ({ id: node.id, title: String(node.componentCode), subtitle: node.status }))
    : [{ id: flow.id, title: flow.name, subtitle: flow.triggerType ?? 'Flow' }];

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: '#f5f7fa' }}>
      <div style={{ height: 56, borderBottom: '1px solid #f0f0f0', background: '#fff', display: 'flex', alignItems: 'center', padding: '0 24px', gap: 16 }}>
        <Button type="text" icon={<ArrowLeftOutlined />} onClick={() => navigate(-1)}>Back</Button>
        <Divider type="vertical" style={{ height: 24 }} />
        <strong>Runtime Control / Flow Detail</strong>
        <Tag color="blue" style={{ margin: 0 }}>{flow.name}</Tag>
      </div>

      <div style={{ padding: '12px 16px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${contextItems.length}, minmax(110px, 1fr))`, background: '#fff', border: '1px solid #e8e8e8', borderRadius: 8, padding: '12px 16px' }}>
          {contextItems.map(([label, value], index) => (
            <div key={label} style={{ minWidth: 0, padding: '0 14px', borderRight: index === contextItems.length - 1 ? 'none' : '1px solid #f0f0f0' }}>
              <div style={{ color: '#8c8c8c', fontSize: 10, marginBottom: 4 }}>{label}</div>
              <div title={String(value)} style={{ fontSize: 12, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{value}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', minHeight: 0 }}>
        <div style={{ width: 292, borderRight: '1px solid #f0f0f0', background: '#fff', overflow: 'auto' }}>
          <div style={{ height: 42, padding: '0 16px', display: 'flex', alignItems: 'center', borderBottom: '1px solid #f0f0f0', fontWeight: 600, fontSize: 13 }}>Context</div>
          <div style={{ padding: 14 }}>
            <div style={{ color: '#8c8c8c', fontSize: 11, marginBottom: 6 }}>Actions</div>
            {(flow.triggerEvents?.length ? flow.triggerEvents : flow.contextActions ?? []).map((action) => <Tag key={action} style={{ marginBottom: 12 }}>{action}</Tag>)}
            <div style={{ color: '#8c8c8c', fontSize: 11, margin: '12px 0 6px' }}>State Conditions</div>
            {flow.stateConditions?.length ? flow.stateConditions.map((condition) => (
              <div key={condition.id} style={{ padding: '8px 10px', border: '1px solid #f0f0f0', borderRadius: 6, marginBottom: 8 }}>
                <div style={{ fontWeight: 600 }}>{condition.field} {condition.operator} {condition.value}</div>
              </div>
            )) : <Text type="secondary">No state condition.</Text>}
          </div>
        </div>
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          <div style={{ height: 42, padding: '0 16px', display: 'flex', alignItems: 'center', background: '#fff', borderBottom: '1px solid #f0f0f0', fontWeight: 600, fontSize: 13 }}>Canvas</div>
          <div style={{ flex: 1, overflow: 'auto', padding: 36, backgroundImage: 'radial-gradient(#d9d9d9 1px, transparent 1px)', backgroundSize: '16px 16px' }}>
            {nodes.map((node, index) => (
              <div key={node.id}>
                <div style={{ width: 360, margin: '0 auto', padding: 14, border: '1px solid #9254de', borderRadius: 8, background: '#f9f0ff' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                    <strong>{node.title}</strong>
                    <Tag color="green">Configured</Tag>
                  </div>
                  <div style={{ color: '#595959', fontSize: 11, marginTop: 5 }}>{node.subtitle}</div>
                </div>
                {index < nodes.length - 1 && <div style={{ textAlign: 'center', fontSize: 24, lineHeight: '42px' }}>↓</div>}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

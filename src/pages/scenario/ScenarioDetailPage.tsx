import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Button, Space, Tag, Modal, Drawer, Form, Input, Select, message, Typography, Timeline, Divider } from 'antd';
import { ArrowLeftOutlined, CheckCircleOutlined, PlayCircleOutlined, BugOutlined } from '@ant-design/icons';
import { useScenarioStore, useActionStore } from '../../store';
import type { ScenarioVersion } from '../../store';

const { Text } = Typography;

const STATE_COLORS: Record<string, string> = {
  INIT: '#1890ff',
  PENDING: '#fa8c16',
  SUCCESS: '#52c41a',
  FAIL: '#ff4d4f',
  NOT_FOUND: '#722ed1',
};

// Debug Drawer for L2
function L2DebugDrawer({
  visible,
  l2Code,
  l2Name,
  endpointId,
  onClose,
}: {
  visible: boolean;
  l2Code: string;
  l2Name: string;
  endpointId?: string;
  onClose: () => void;
}) {
  const [form] = Form.useForm();
  const [debugResult, setDebugResult] = useState<any>(null);
  const [isRunning, setIsRunning] = useState(false);

  const handleRunDebug = async () => {
    try {
      setIsRunning(true);
      const values = await form.validateFields();

      // Simulate debug execution
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Mock result based on L2 type
      let result: any = {};
      switch (l2Code) {
        case 'L2.HTTP_BUILD':
          result = {
            httpRequest: {
              method: values.method || 'POST',
              url: values.url || 'https://api.example.com',
              headers: { 'Content-Type': 'application/json' },
              body: values.body || {},
            },
          };
          break;
        case 'L2.HTTP_SEND':
          result = {
            status: 'SUCCESS',
            statusCode: 200,
            responseTime: '125ms',
            response: { code: '00', message: 'SUCCESS' },
          };
          break;
        case 'L2.MAP_FIELD':
          result = {
            mappedFields: ['merchantRef', 'channelRef'],
            mappingResult: { merchantRef: 'MCH_001', channelRef: 'CH_001' },
          };
          break;
        case 'L2.STATE_SET':
          result = {
            previousState: 'INIT',
            currentState: 'PENDING',
          };
          break;
        case 'L2.MQ_PUBLISH':
          result = {
            topic: 'order.completed',
            messageId: `MSG_${Date.now()}`,
            success: true,
          };
          break;
        case 'L2.GEN_RRN':
          result = {
            rrn: `RRN${Date.now()}`,
          };
          break;
        case 'L2.REQUERY_POLL':
          result = {
            status: 'PENDING',
            attempts: 0,
            strategy: values.strategy || 'EXPONENTIAL',
          };
          break;
        case 'L2.CALLBACK_PARSE':
          result = {
            parsedData: { code: '00', status: 'SUCCESS', message: 'SUCCESS' },
          };
          break;
        default:
          result = { success: true };
      }

      setDebugResult(result);
      setIsRunning(false);
    } catch {
      setIsRunning(false);
    }
  };

  return (
    <Drawer
      title={
        <Space>
          <BugOutlined />
          <span>L2调试 - {l2Name}</span>
          <Tag color="blue">{l2Code}</Tag>
        </Space>
      }
      placement="right"
      width={500}
      open={visible}
      onClose={onClose}
      extra={
        <Button type="primary" icon={<PlayCircleOutlined />} onClick={handleRunDebug} loading={isRunning}>
          执行调试
        </Button>
      }
    >
      <div style={{ marginBottom: 16 }}>
        <Text type="secondary" style={{ fontSize: 12 }}>
          配置调试参数并执行，查看L2节点的输入输出和运行日志
        </Text>
      </div>

      <Form form={form} layout="vertical">
        <Form.Item label="Endpoint">
          <Input value={endpointId || '-'} disabled />
        </Form.Item>

        {l2Code === 'L2.HTTP_BUILD' && (
          <>
            <Form.Item name="method" label="Method" initialValue="POST">
              <Select>
                <Select.Option value="POST">POST</Select.Option>
                <Select.Option value="GET">GET</Select.Option>
              </Select>
            </Form.Item>
            <Form.Item name="url" label="URL">
              <Input placeholder="https://api.example.com" />
            </Form.Item>
            <Form.Item name="body" label="Body">
              <Input.TextArea rows={4} placeholder='{"orderNo": "xxx"}' />
            </Form.Item>
          </>
        )}

        {l2Code === 'L2.REQUERY_POLL' && (
          <Form.Item name="strategy" label="策略" initialValue="EXPONENTIAL">
            <Select>
              <Select.Option value="FIXED">固定间隔</Select.Option>
              <Select.Option value="EXPONENTIAL">指数退避</Select.Option>
            </Select>
          </Form.Item>
        )}
      </Form>

      <Divider />

      {/* Debug Result */}
      {debugResult && (
        <div>
          <Text strong style={{ fontSize: 13, marginBottom: 8, display: 'block' }}>执行结果:</Text>
          <Card size="small" style={{ background: '#1a1a2e', color: '#0f0', fontFamily: 'monospace' }}>
            <pre style={{ margin: 0, fontSize: 11, whiteSpace: 'pre-wrap' }}>
              {JSON.stringify(debugResult, null, 2)}
            </pre>
          </Card>

          <div style={{ marginTop: 16 }}>
            <Text strong style={{ fontSize: 13, marginBottom: 8, display: 'block' }}>运行日志:</Text>
            <Timeline
              items={[
                { color: 'green', children: `${new Date().toLocaleTimeString()} - 开始执行` },
                { color: 'green', children: `${new Date().toLocaleTimeString()} - L2节点执行中` },
                { color: 'green', children: `${new Date().toLocaleTimeString()} - 执行完成` },
              ]}
            />
          </div>
        </div>
      )}
    </Drawer>
  );
}

export default function ScenarioDetailPage() {
  const { channelId, scenarioId } = useParams<{ channelId: string; scenarioId: string }>();
  const navigate = useNavigate();
  const { scenarios, scenarioVersions } = useScenarioStore();
  const { l3Composites, l4Templates, l2Atomics } = useActionStore();

  const scenario = scenarios.find((s) => s.scenarioId === scenarioId);
  const versions = scenarioVersions[scenarioId!] || [];

  // Version selection
  const [isVersionModalOpen, setIsVersionModalOpen] = useState(false);
  const [selectedVersionNo, setSelectedVersionNo] = useState<number | null>(null);
  const selectedVersion = versions.find(v => v.versionNo === selectedVersionNo) || versions[versions.length - 1];

  // L4 template
  const l4Template = l4Templates.find(t => t.templateId === selectedVersion?.l4TemplateId);

  // Debug drawer
  const [isDebugDrawerOpen, setIsDebugDrawerOpen] = useState(false);
  const [debugL2Code, setDebugL2Code] = useState<string | null>(null);

  // Get deployed info
  const getDeployedInfo = (version: ScenarioVersion) => {
    if (version.status === 'Draft') return null;
    return {
      env: version.status,
      app: version.deployedApp || '-',
      time: version.deployedAt ? new Date(version.deployedAt).toLocaleString() : '-',
    };
  };

  const deployedInfo = selectedVersion ? getDeployedInfo(selectedVersion) : null;
  const isDeployed = selectedVersion && selectedVersion.status !== 'Draft';

  // Open version selection modal
  const handleOpenVersionModal = () => {
    setIsVersionModalOpen(true);
  };

  // Select version
  const handleSelectVersion = (versionNo: number) => {
    setSelectedVersionNo(versionNo);
    setIsVersionModalOpen(false);
  };

  // Open debug drawer
  const handleOpenDebug = (l2Code: string) => {
    setDebugL2Code(l2Code);
    setIsDebugDrawerOpen(true);
  };

  if (!scenario) {
    return (
      <Card>
        <div style={{ textAlign: 'center' }}>
          <p>未找到场景: {scenarioId}</p>
          <Button onClick={() => navigate(`/channel/${channelId}/scenario`)}>返回</Button>
        </div>
      </Card>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      {/* Header */}
      <Card size="small" styles={{ body: { padding: '8px 16px' } }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Space size="middle">
            <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(`/channel/${channelId}/scenario`)} size="small" />
            <span style={{ fontWeight: 600, fontSize: 14 }}>{scenario.name}</span>
            <Tag color="blue">{scenario.scenarioId}</Tag>
          </Space>
          <Space size="middle">
            <Button onClick={handleOpenVersionModal}>
              版本选择 (v{selectedVersion?.versionNo || '-'})
            </Button>
            {isDeployed ? (
              <Tag color="green">已发布</Tag>
            ) : (
              <Tag>草稿</Tag>
            )}
          </Space>
        </div>
      </Card>

      {/* Deployed Info Banner */}
      {deployedInfo && (
        <Card size="small" style={{ margin: 8, background: '#f6ffed', border: '1px solid #52c41a' }}>
          <Space>
            <Text>已发布环境:</Text>
            <Tag color="green">{deployedInfo.env}</Tag>
            <Text>应用:</Text>
            <Text strong>{deployedInfo.app}</Text>
            <Text type="secondary">发布时间: {deployedInfo.time}</Text>
          </Space>
        </Card>
      )}

      {/* Main Content - Read Only */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden', margin: 8, gap: 8 }}>
        {/* Left Panel: L3 Components (Read Only) */}
        <Card
          size="small"
          title={<span>L3组件配置</span>}
          style={{ width: 320, display: 'flex', flexDirection: 'column' }}
          styles={{ body: { flex: 1, overflow: 'auto', padding: 12 } }}
        >
          {selectedVersion && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {Object.entries(selectedVersion.l3Configs).map(([l3Code, config]) => {
                const l3 = l3Composites.find(l => l.code === l3Code);
                const isConfigured = config.status === 'configured';

                return (
                  <Card
                    key={l3Code}
                    size="small"
                    style={{
                      borderColor: isConfigured ? '#52c41a' : '#d9d9d9',
                      background: isConfigured ? '#fafff0' : '#fafafa',
                    }}
                    bodyStyle={{ padding: 12 }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                      <div
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: 6,
                          background: isConfigured ? '#52c41a' : '#fa8c16',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#fff',
                          fontSize: 12,
                          fontWeight: 600,
                        }}
                      >
                        {l3Code.replace('L3.', '').substring(0, 2)}
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 13 }}>
                          {l3?.name || l3Code}
                          {isConfigured && <CheckCircleOutlined style={{ color: '#52c41a', marginLeft: 4 }} />}
                        </div>
                        <div style={{ fontSize: 10, color: '#888' }}>{l3Code}</div>
                      </div>
                    </div>

                    {/* L2 Dependencies */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                      {Object.entries(config.l2Dependencies).map(([l2Code, l2Config]) => {
                        const isL2Configured = !!l2Config.endpointId;
                        return (
                          <Tag
                            key={l2Code}
                            color={isL2Configured ? 'green' : 'default'}
                            style={{ fontSize: 10 }}
                            onClick={() => isL2Configured && isDeployed && handleOpenDebug(l2Code)}
                            className={isL2Configured && isDeployed ? 'clickable-tag' : ''}
                          >
                            {l2Code.replace('L2.', '')} {isL2Configured ? '✓' : '○'}
                          </Tag>
                        );
                      })}
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </Card>

        {/* Right Panel: L4 State Machine (Read Only) */}
        <Card
          size="small"
          title={<span>流程状态机</span>}
          style={{ flex: 1 }}
          styles={{ body: { height: '100%', overflow: 'auto', padding: 16 } }}
          extra={
            isDeployed && (
              <Button type="primary" icon={<BugOutlined />} onClick={() => message.info('点击L2节点进行打点调试')}>
                打点调试
              </Button>
            )
          }
        >
          {l4Template && (
            <div>
              {/* State Machine Display */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: 12, background: '#fafafa', borderRadius: 8, marginBottom: 16 }}>
                <Text strong>状态机:</Text>
                {l4Template.states.map((state, idx) => (
                  <div key={state} style={{ display: 'flex', alignItems: 'center' }}>
                    {idx > 0 && <span style={{ margin: '0 8px', color: '#999' }}>→</span>}
                    <Tag color={STATE_COLORS[state] || '#999'} style={{ minWidth: 60, textAlign: 'center' }}>
                      {state}
                    </Tag>
                  </div>
                ))}
              </div>

              {/* Transitions */}
              <div style={{ marginBottom: 16 }}>
                <Text strong style={{ fontSize: 12, marginBottom: 8, display: 'block' }}>流转规则:</Text>
                {l4Template.transitions.map((t, idx) => (
                  <div key={idx} style={{ padding: '8px 12px', background: '#f5f5f5', borderRadius: 4, marginBottom: 8, fontSize: 12 }}>
                    <Tag color="blue">{t.from}</Tag>
                    <span style={{ margin: '0 8px' }}>→</span>
                    <Tag color={STATE_COLORS[t.to] || 'blue'}>{t.to}</Tag>
                    <Text type="secondary" style={{ marginLeft: 8 }}>({t.trigger})</Text>
                  </div>
                ))}
              </div>

              {/* L3 Nodes Canvas */}
              <div>
                <Text strong style={{ fontSize: 12, marginBottom: 8, display: 'block' }}>已配置的L3节点:</Text>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
                  {selectedVersion && Object.entries(selectedVersion.l3Configs).map(([l3Code, config]) => {
                    const l3 = l3Composites.find(l => l.code === l3Code);
                    const isConfigured = config.status === 'configured';

                    return (
                      <Card
                        key={l3Code}
                        size="small"
                        style={{
                          width: 180,
                          borderColor: isConfigured ? '#52c41a' : '#d9d9d9',
                          background: isConfigured ? '#fafff0' : '#fafafa',
                        }}
                        bodyStyle={{ padding: 12 }}
                      >
                        <div style={{ textAlign: 'center', marginBottom: 8 }}>
                          <div style={{
                            width: 40,
                            height: 40,
                            borderRadius: '50%',
                            background: isConfigured ? '#52c41a' : '#fa8c16',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            margin: '0 auto',
                            color: '#fff',
                            fontSize: 16,
                          }}>
                            {isConfigured ? '✓' : '!'}
                          </div>
                          <Text strong style={{ fontSize: 12, display: 'block', marginTop: 4 }}>
                            {l3?.name || l3Code}
                          </Text>
                          <Text type="secondary" style={{ fontSize: 10 }}>{l3Code}</Text>
                        </div>

                        {/* L2 inside */}
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, justifyContent: 'center' }}>
                          {Object.entries(config.l2Dependencies).map(([l2Code, l2Config]) => (
                            <Tag
                              key={l2Code}
                              color={l2Config.endpointId ? 'green' : 'default'}
                              style={{ fontSize: 9, cursor: isDeployed && l2Config.endpointId ? 'pointer' : 'default' }}
                              onClick={() => isDeployed && l2Config.endpointId && handleOpenDebug(l2Code)}
                            >
                              {l2Code.replace('L2.', '')}
                            </Tag>
                          ))}
                        </div>
                      </Card>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* Version Selection Modal */}
      <Modal
        title="选择版本"
        open={isVersionModalOpen}
        onCancel={() => setIsVersionModalOpen(false)}
        footer={null}
        width={400}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {versions.slice().reverse().map((version) => {
            const deployed = getDeployedInfo(version);
            return (
              <Card
                key={version.versionNo}
                size="small"
                hoverable
                onClick={() => handleSelectVersion(version.versionNo)}
                style={{
                  cursor: 'pointer',
                  borderColor: selectedVersionNo === version.versionNo ? '#1890ff' : '#d9d9d9',
                  background: selectedVersionNo === version.versionNo ? '#e6f7ff' : '#fff',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Space>
                    <Tag color={version.status === 'Prod' ? 'green' : version.status === 'Pre' ? 'orange' : version.status === 'Daily' ? 'blue' : 'default'}>
                      v{version.versionNo}
                    </Tag>
                    <Text>{version.status}</Text>
                  </Space>
                  {deployed && (
                    <Text type="secondary" style={{ fontSize: 11 }}>
                      {deployed.env} | {deployed.app}
                    </Text>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      </Modal>

      {/* L2 Debug Drawer */}
      {debugL2Code && (
        <L2DebugDrawer
          visible={isDebugDrawerOpen}
          l2Code={debugL2Code}
          l2Name={l2Atomics.find(l => l.code === debugL2Code)?.name || debugL2Code}
          endpointId={selectedVersion?.l3Configs[Object.keys(selectedVersion.l3Configs)[0]]?.l2Dependencies[debugL2Code]?.endpointId}
          onClose={() => setIsDebugDrawerOpen(false)}
        />
      )}
    </div>
  );
}

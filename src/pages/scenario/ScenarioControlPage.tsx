import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card,
  Button,
  Space,
  Tag,
  Table,
  Modal,
  Form,
  Select,
  message,
  Typography,
  Row,
  Col,
  Steps,
  Slider,
  InputNumber,
  Divider,
  Alert,
  Statistic,
} from 'antd';
import {
  ArrowLeftOutlined,
  CloudOutlined,
  CloudServerOutlined,
  SettingOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons';
import { useScenarioStore, useActionStore } from '../../store';
import type { ScenarioVersion } from '../../store';

const { Text } = Typography;

type EnvType = 'Daily' | 'Pre' | 'Prod';

const ENV_COLORS: Record<EnvType, string> = {
  Daily: '#1890ff',
  Pre: '#fa8c16',
  Prod: '#52c41a',
};

const ENV_LABELS: Record<EnvType, string> = {
  Daily: '日常环境',
  Pre: '预发环境',
  Prod: '生产环境',
};

export default function ScenarioControlPage() {
  const { channelId, scenarioId } = useParams<{ channelId: string; scenarioId: string }>();
  const navigate = useNavigate();
  const { scenarios, scenarioVersions } = useScenarioStore();
  const { l4Templates } = useActionStore();
  const [form] = Form.useForm();

  const scenario = scenarios.find((s) => s.scenarioId === scenarioId);
  const versions = scenarioVersions[scenarioId!] || [];
  const l4Template = l4Templates.find((t) => t.templateId === scenario?.l4TemplateId);

  // Step 1: Select Environment
  const [selectedEnv, setSelectedEnv] = useState<EnvType | null>(null);

  // Step 2: Select Cloud/App
  const [selectedCloud, setSelectedCloud] = useState<string>('');
  const [selectedApp, setSelectedApp] = useState<string>('');

  // Traffic config per environment
  const [trafficConfig, setTrafficConfig] = useState<Record<EnvType, {
    versionNo: number;
    percentage: number;
    enabled: boolean;
  }>>({
    Daily: { versionNo: 1, percentage: 100, enabled: true },
    Pre: { versionNo: 1, percentage: 100, enabled: false },
    Prod: { versionNo: 1, percentage: 100, enabled: false },
  });

  const [isTrafficModalOpen, setIsTrafficModalOpen] = useState(false);

  // Get versions by environment
  const getVersionsByEnv = (env: EnvType) => {
    return versions.filter((v) => {
      if (env === 'Daily') return v.status === 'Daily' || v.status === 'Draft';
      if (env === 'Pre') return v.status === 'Pre' || v.status === 'Daily';
      if (env === 'Prod') return v.status === 'Prod';
      return false;
    });
  };

  const currentEnvVersions = selectedEnv ? getVersionsByEnv(selectedEnv) : [];

  const handleEnvSelect = (env: EnvType) => {
    setSelectedEnv(env);
    const envVersions = getVersionsByEnv(env);
    if (envVersions.length > 0) {
      setTrafficConfig((prev) => ({
        ...prev,
        [env]: {
          ...prev[env],
          versionNo: envVersions[envVersions.length - 1].versionNo,
        },
      }));
    }
  };

  const handleOpenTrafficModal = () => {
    if (!selectedEnv) return;
    form.setFieldsValue({
      versionNo: trafficConfig[selectedEnv].versionNo,
      percentage: trafficConfig[selectedEnv].percentage,
      enabled: trafficConfig[selectedEnv].enabled,
    });
    setIsTrafficModalOpen(true);
  };

  const handleTrafficSave = async () => {
    try {
      const values = await form.validateFields();
      if (!selectedEnv) return;
      setTrafficConfig((prev) => ({
        ...prev,
        [selectedEnv]: {
          versionNo: values.versionNo,
          percentage: values.percentage,
          enabled: values.enabled,
        },
      }));
      message.success('流量配置已更新');
      setIsTrafficModalOpen(false);
    } catch {}
  };

  const handleSwitchVersion = (version: ScenarioVersion) => {
    Modal.confirm({
      title: '确认切换版本',
      content: (
        <div>
          <p>
            确定要将 <strong>{scenario?.name}</strong> 在{' '}
            <Tag color={ENV_COLORS[selectedEnv!]}>{ENV_LABELS[selectedEnv!]}</Tag>{' '}
            切换到版本 v{version.versionNo} 吗？
          </p>
        </div>
      ),
      okText: '确认切换',
      cancelText: '取消',
      onOk: () => {
        if (selectedEnv) {
          setTrafficConfig((prev) => ({
            ...prev,
            [selectedEnv]: {
              ...prev[selectedEnv],
              versionNo: version.versionNo,
            },
          }));
        }
        message.success(`已切换到版本 v${version.versionNo}`);
      },
    });
  };

  if (!scenario) {
    return (
      <Card>
        <div style={{ textAlign: 'center' }}>
          <p>未找到场景: {scenarioId}</p>
          <Button onClick={() => navigate(`/channel/${channelId}`)}>返回</Button>
        </div>
      </Card>
    );
  }

  // Calculate current step
  const currentStep = selectedEnv ? (selectedCloud ? 2 : 1) : 0;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <Card size="small" styles={{ body: { padding: '8px 16px' } }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <Space size="middle">
            <Button
              icon={<ArrowLeftOutlined />}
              onClick={() => navigate(`/channel/${channelId}`)}
              size="small"
            />
            <span style={{ fontWeight: 600, fontSize: 14 }}>{scenario.name}</span>
            <Tag color="blue">{scenario.scenarioId}</Tag>
            <Tag color="green">{l4Template?.name}</Tag>
          </Space>
        </div>
      </Card>

      {/* Step Indicator */}
      <Card size="small" styles={{ body: { padding: '16px 24px' } }}>
        <Steps
          current={currentStep}
          size="small"
          items={[
            { title: '选择环境', icon: <CloudServerOutlined /> },
            { title: '选择Cloud/App', icon: <CloudOutlined /> },
            { title: '流量配置', icon: <SettingOutlined /> },
          ]}
        />
      </Card>

      {/* Main Content */}
      <div style={{ flex: 1, overflow: 'auto', padding: 16 }}>
        {/* Step 1: Environment Selection */}
        <Row gutter={[16, 16]}>
          <Col span={24}>
            <Card title="Step 1: 选择环境">
              <Space size="large">
                {(['Daily', 'Pre', 'Prod'] as EnvType[]).map((env) => {
                  const envVersions = getVersionsByEnv(env);
                  const isSelected = selectedEnv === env;
                  const hasTrafficEnabled = trafficConfig[env].enabled;

                  return (
                    <Card
                      key={env}
                      size="small"
                      style={{
                        width: 200,
                        borderTop: `4px solid ${ENV_COLORS[env]}`,
                        background: isSelected ? `${ENV_COLORS[env]}10` : '#fff',
                        cursor: 'pointer',
                      }}
                      bodyStyle={{ padding: 16 }}
                      onClick={() => handleEnvSelect(env)}
                    >
                      <div
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: 8,
                        }}
                      >
                        <CloudServerOutlined
                          style={{ fontSize: 32, color: ENV_COLORS[env] }}
                        />
                        <div style={{ fontWeight: 600 }}>{ENV_LABELS[env]}</div>
                        <Tag color={ENV_COLORS[env]}>{env}</Tag>
                        <div style={{ fontSize: 12, color: '#666' }}>
                          {envVersions.length} 个版本
                        </div>
                        {hasTrafficEnabled && (
                          <Tag color="green" icon={<CheckCircleOutlined />}>
                            流量启用
                          </Tag>
                        )}
                      </div>
                    </Card>
                  );
                })}
              </Space>
            </Card>
          </Col>
        </Row>

        {/* Step 2: Cloud/App Selection */}
        {selectedEnv && (
          <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
            <Col span={24}>
              <Card title="Step 2: 选择Cloud和应用">
                <Row gutter={16}>
                  <Col span={12}>
                    <div style={{ marginBottom: 8, fontWeight: 500 }}>Cloud</div>
                    <Select
                      placeholder="选择Cloud"
                      style={{ width: '100%' }}
                      value={selectedCloud || undefined}
                      onChange={setSelectedCloud}
                    >
                      <Select.Option value="CLOUD_EU">Cloud EU</Select.Option>
                      <Select.Option value="CLOUD_AS">Cloud Asia</Select.Option>
                      <Select.Option value="CLOUD_US">Cloud US</Select.Option>
                    </Select>
                  </Col>
                  <Col span={12}>
                    <div style={{ marginBottom: 8, fontWeight: 500 }}>应用</div>
                    <Select
                      placeholder="选择应用"
                      style={{ width: '100%' }}
                      value={selectedApp || undefined}
                      onChange={setSelectedApp}
                    >
                      <Select.Option value="payment-app-1">payment-app-1</Select.Option>
                      <Select.Option value="payment-app-2">payment-app-2</Select.Option>
                      <Select.Option value="payment-gateway">payment-gateway</Select.Option>
                    </Select>
                  </Col>
                </Row>
              </Card>
            </Col>
          </Row>
        )}

        {/* Step 3: Traffic Configuration */}
        {selectedEnv && selectedCloud && selectedApp && (
          <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
            <Col span={16}>
              <Card
                title={
                  <Space>
                    <SettingOutlined />
                    <span>Step 3: 流量配置</span>
                  </Space>
                }
                extra={
                  <Button type="primary" onClick={handleOpenTrafficModal}>
                    调整流量
                  </Button>
                }
              >
                <div style={{ marginBottom: 16 }}>
                  <Alert
                    message={`当前配置: ${ENV_LABELS[selectedEnv]} / ${selectedCloud} / ${selectedApp}`}
                    type="info"
                    showIcon
                  />
                </div>

                {/* Traffic Display */}
                <Row gutter={[24, 16]}>
                  <Col span={8}>
                    <Statistic
                      title="当前版本"
                      value={`v${trafficConfig[selectedEnv].versionNo}`}
                      prefix={<Tag color={ENV_COLORS[selectedEnv]}>v{trafficConfig[selectedEnv].versionNo}</Tag>}
                    />
                  </Col>
                  <Col span={8}>
                    <Statistic
                      title="流量权重"
                      value={trafficConfig[selectedEnv].percentage}
                      suffix="%"
                      valueStyle={{ color: ENV_COLORS[selectedEnv] }}
                    />
                  </Col>
                  <Col span={8}>
                    <Statistic
                      title="状态"
                      value={trafficConfig[selectedEnv].enabled ? '启用' : '禁用'}
                      valueStyle={{ color: trafficConfig[selectedEnv].enabled ? '#52c41a' : '#ff4d4f' }}
                    />
                  </Col>
                </Row>

                <Divider />

                {/* Traffic Slider */}
                <div style={{ marginTop: 24 }}>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      marginBottom: 8,
                    }}
                  >
                    <Text>流量权重</Text>
                    <Text strong>{trafficConfig[selectedEnv].percentage}%</Text>
                  </div>
                  <Slider
                    value={trafficConfig[selectedEnv].percentage}
                    onChange={(val) =>
                      setTrafficConfig((prev) => ({
                        ...prev,
                        [selectedEnv]: { ...prev[selectedEnv], percentage: val },
                      }))
                    }
                    marks={{
                      0: '0%',
                      25: '25%',
                      50: '50%',
                      75: '75%',
                      100: '100%',
                    }}
                  />
                </div>

                {/* Version List */}
                <div style={{ marginTop: 24 }}>
                  <Text strong style={{ marginBottom: 12, display: 'block' }}>
                    可用版本
                  </Text>
                  <Space wrap>
                    {currentEnvVersions.map((v) => (
                      <Tag
                        key={v.versionNo}
                        color={
                          v.versionNo === trafficConfig[selectedEnv].versionNo
                            ? ENV_COLORS[selectedEnv]
                            : 'default'
                        }
                        style={{ padding: '4px 12px', cursor: 'pointer' }}
                        onClick={() => handleSwitchVersion(v)}
                      >
                        v{v.versionNo} {v.status === 'Draft' && '(草稿)'}
                      </Tag>
                    ))}
                  </Space>
                </div>
              </Card>
            </Col>

            <Col span={8}>
              <Card title="环境信息">
                <Space direction="vertical" style={{ width: '100%' }} size="middle">
                  <div>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      环境名称
                    </Text>
                    <div style={{ fontWeight: 500 }}>{ENV_LABELS[selectedEnv]}</div>
                  </div>
                  <div>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      Cloud
                    </Text>
                    <div style={{ fontWeight: 500 }}>{selectedCloud}</div>
                  </div>
                  <div>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      应用
                    </Text>
                    <div style={{ fontWeight: 500 }}>{selectedApp}</div>
                  </div>
                  <Divider />
                  <div>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      版本数量
                    </Text>
                    <div style={{ fontWeight: 500 }}>{currentEnvVersions.length}</div>
                  </div>
                  <div>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      流量占比
                    </Text>
                    <div
                      style={{
                        fontWeight: 500,
                        color: ENV_COLORS[selectedEnv],
                      }}
                    >
                      {trafficConfig[selectedEnv].percentage}%
                    </div>
                  </div>
                </Space>
              </Card>
            </Col>
          </Row>
        )}

        {/* All Versions Table */}
        <Card title="版本历史" style={{ marginTop: 16 }}>
          <Table
            dataSource={versions.slice().reverse()}
            rowKey="versionNo"
            pagination={{ pageSize: 5 }}
            columns={[
              {
                title: '版本',
                dataIndex: 'versionNo',
                key: 'versionNo',
                render: (no: number) => <Tag color="blue">v{no}</Tag>,
              },
              {
                title: '状态',
                dataIndex: 'status',
                key: 'status',
                render: (status: string) => (
                  <Tag
                    color={
                      status === 'Prod'
                        ? 'green'
                        : status === 'Pre'
                          ? 'orange'
                          : status === 'Daily'
                            ? 'blue'
                            : 'default'
                    }
                  >
                    {status}
                  </Tag>
                ),
              },
              {
                title: '部署环境',
                dataIndex: 'deployedEnv',
                key: 'deployedEnv',
                render: (env: string) => env || '-',
              },
              {
                title: '部署应用',
                dataIndex: 'deployedApp',
                key: 'deployedApp',
                render: (app: string) => app || '-',
              },
              {
                title: '部署时间',
                dataIndex: 'deployedAt',
                key: 'deployedAt',
                render: (time: string) =>
                  time ? new Date(time).toLocaleString() : '-',
              },
              {
                title: '操作',
                key: 'action',
                render: (_: any, record: ScenarioVersion) => (
                  <Space>
                    <Button
                      type="link"
                      size="small"
                      onClick={() => {
                        const envKey =
                          record.status === 'Prod'
                            ? 'Prod'
                            : record.status === 'Pre'
                              ? 'Pre'
                              : 'Daily';
                        handleEnvSelect(envKey as EnvType);
                        setTrafficConfig((prev) => ({
                          ...prev,
                          [envKey]: {
                            ...prev[envKey as EnvType],
                            versionNo: record.versionNo,
                          },
                        }));
                      }}
                    >
                      部署到此环境
                    </Button>
                  </Space>
                ),
              },
            ]}
          />
        </Card>
      </div>

      {/* Traffic Configuration Modal */}
      <Modal
        title="流量分配配置"
        open={isTrafficModalOpen}
        onOk={handleTrafficSave}
        onCancel={() => setIsTrafficModalOpen(false)}
        width={400}
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="enabled" label="流量启用" valuePropName="checked" initialValue={true}>
            <Select>
              <Select.Option value={true}>启用</Select.Option>
              <Select.Option value={false}>禁用</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="versionNo"
            label="选择版本"
            rules={[{ required: true }]}
          >
            <Select>
              {currentEnvVersions.map((v) => (
                <Select.Option key={v.versionNo} value={v.versionNo}>
                  v{v.versionNo} - {v.deployedApp || v.status}{' '}
                  {v.status === 'Draft' && '(草稿)'}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="percentage"
            label="流量百分比"
            rules={[{ required: true }]}
            initialValue={100}
          >
            <Slider min={0} max={100} />
          </Form.Item>

          <Form.Item name="percentage" label="流量百分比数值">
            <InputNumber
              style={{ width: '100%' }}
              min={0}
              max={100}
              formatter={(value) => `${value}%`}
              parser={(value) => Number(value?.replace('%', '')) as unknown as 0 | 100}
            />
          </Form.Item>

          <Alert
            message="说明"
            description="流量分配仅在多版本并行时生效。单版本部署时流量自动100%。"
            type="info"
            showIcon
          />
        </Form>
      </Modal>
    </div>
  );
}

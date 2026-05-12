import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Button, Space, Tag, Table, Modal, Steps, Select, Typography, message, Alert } from 'antd';
import { ArrowLeftOutlined, CloudOutlined, SyncOutlined } from '@ant-design/icons';
import { useScenarioStore } from '../../store';
import type { ScenarioVersion } from '../../store';

const { Text } = Typography;

const ENV_COLORS: Record<string, string> = {
  Draft: '#d9d9d9',
  Daily: '#1890ff',
  Pre: '#fa8c16',
  Prod: '#52c41a',
};

const ENV_LABELS: Record<string, string> = {
  Draft: '草稿',
  Daily: '日常',
  Pre: '预发',
  Prod: '生产',
};

export default function ScenarioDeployPage() {
  const { channelId, scenarioId } = useParams<{ channelId: string; scenarioId: string }>();
  const navigate = useNavigate();
  const { scenarios, scenarioVersions, addScenarioVersion } = useScenarioStore();

  const scenario = scenarios.find((s) => s.scenarioId === scenarioId);
  const versions = scenarioVersions[scenarioId!] || [];

  // Selected version for viewing
  const [selectedVersionNo, setSelectedVersionNo] = useState<number>(
    versions.length > 0 ? versions[versions.length - 1].versionNo : 1
  );
  const selectedVersion = versions.find((v) => v.versionNo === selectedVersionNo);

  // Deploy modal
  const [isDeployModalOpen, setIsDeployModalOpen] = useState(false);
  const [deployTargetEnv, setDeployTargetEnv] = useState<string | null>(null);
  const [deployApp, setDeployApp] = useState<string>('');
  const [isDeploying, setIsDeploying] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  // Get the current status of each env for the latest version
  const latestVersion = versions.length > 0 ? versions[versions.length - 1] : null;
  const latestVersionNo = latestVersion?.versionNo || 0;

  // Check if version can be deployed to each env
  const canDeployToEnv = (versionNo: number, targetEnv: string): boolean => {
    if (versionNo !== latestVersionNo) return false; // Only latest version

    const version = versions.find(v => v.versionNo === versionNo);
    if (!version) return false;

    // Check if there's a version deployed to the previous env
    const envOrder = ['Draft', 'Daily', 'Pre', 'Prod'];
    const targetIdx = envOrder.indexOf(targetEnv);

    if (targetIdx === 0) return version.status === 'Draft'; // Can deploy to Draft from Draft
    if (targetIdx === 1) return version.status === 'Draft'; // Can deploy to Daily from Draft
    if (targetIdx === 2) {
      // Can deploy to Pre only if Daily is deployed
      const dailyDeployed = versions.some(v => v.status === 'Daily' && v.versionNo >= versionNo);
      return dailyDeployed;
    }
    if (targetIdx === 3) {
      // Can deploy to Prod only if Pre is deployed
      const preDeployed = versions.some(v => v.status === 'Pre' && v.versionNo >= versionNo);
      return preDeployed;
    }
    return false;
  };

  // Get deployable apps for this scenario
  const availableApps = ['payment-app', 'order-app', 'channel-app'];

  // Open deploy modal
  const handleOpenDeployModal = (env: string) => {
    setDeployTargetEnv(env);
    setIsDeployModalOpen(true);
    setCurrentStep(0);
    setIsDeploying(false);
  };

  // Execute deploy
  const handleDeploy = async () => {
    if (!deployTargetEnv || !deployApp) {
      message.warning('请选择应用');
      return;
    }

    setIsDeploying(true);

    // Simulate deploy steps
    const steps = [
      { name: '环境验证', duration: 1000 },
      { name: '配置检查', duration: 1500 },
      { name: '版本发布', duration: 1000 },
      { name: '实例部署', duration: 2000 },
      { name: '健康检查', duration: 1000 },
    ];

    for (let i = 0; i < steps.length; i++) {
      setCurrentStep(i + 1);
      await new Promise(resolve => setTimeout(resolve, steps[i].duration));
    }

    // Create new version with updated status
    const newVersion: ScenarioVersion = {
      versionNo: latestVersionNo + 1,
      l4TemplateId: selectedVersion?.l4TemplateId || '',
      l3Configs: selectedVersion?.l3Configs || {},
      status: deployTargetEnv as any,
      deployedAt: new Date().toISOString(),
      deployedBy: 'admin',
      deployedEnv: deployTargetEnv,
      deployedApp: deployApp,
    };

    addScenarioVersion(scenarioId!, newVersion);

    message.success(`部署成功 - ${deployTargetEnv} 环境`);
    setIsDeployModalOpen(false);
    setIsDeploying(false);
  };

  // Get cloud records (one per env)
  const cloudRecords = [
    { env: 'Daily', label: '日常环境', color: ENV_COLORS.Daily },
    { env: 'Pre', label: '预发环境', color: ENV_COLORS.Pre },
    { env: 'Prod', label: '生产环境', color: ENV_COLORS.Prod },
  ];

  return (
    <div style={{ padding: 24 }}>
      {/* Header */}
      <Card size="small" styles={{ body: { padding: '12px 16px' } }} style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Space size="middle">
            <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(`/channel/${channelId}/scenario`)} size="small" />
            <span style={{ fontWeight: 600, fontSize: 16 }}>{scenario?.name}</span>
            <Tag>发布状态</Tag>
          </Space>
          <Space>
            <Text type="secondary">选择版本:</Text>
            <Select
              value={selectedVersionNo}
              onChange={setSelectedVersionNo}
              style={{ width: 120 }}
            >
              {versions.map(v => (
                <Select.Option key={v.versionNo} value={v.versionNo}>
                  v{v.versionNo} ({v.status})
                </Select.Option>
              ))}
            </Select>
          </Space>
        </div>
      </Card>

      {/* Cloud Deployment Records */}
      <Card title="云部署记录" style={{ marginBottom: 16 }}>
        <Space direction="vertical" style={{ width: '100%' }} size="large">
          {cloudRecords.map(record => {
            // Find the deployed version for this env
            const deployedVersion = versions.find(v => v.status === record.env && v.versionNo <= latestVersionNo);
            const isDeployed = !!deployedVersion;
            const canDeploy = canDeployToEnv(latestVersionNo, record.env);

            return (
              <Card
                key={record.env}
                size="small"
                style={{
                  borderTop: `4px solid ${record.color}`,
                  background: isDeployed ? '#fafff0' : '#fafafa',
                }}
                bodyStyle={{ padding: 16 }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Space>
                    <CloudOutlined style={{ fontSize: 28, color: record.color }} />
                    <div>
                      <Text strong style={{ fontSize: 15 }}>{record.label}</Text>
                      <Tag color={record.color} style={{ marginLeft: 8 }}>{record.env}</Tag>
                    </div>
                  </Space>

                  {isDeployed ? (
                    <Space>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 13 }}>
                          <Text strong>v{deployedVersion?.versionNo}</Text>
                          <Text type="secondary" style={{ marginLeft: 8 }}>
                            {deployedVersion?.deployedApp}
                          </Text>
                        </div>
                        <div style={{ fontSize: 11, color: '#999' }}>
                          {deployedVersion?.deployedAt && new Date(deployedVersion.deployedAt).toLocaleString()}
                        </div>
                      </div>
                      <Tag color="green">已部署</Tag>
                    </Space>
                  ) : (
                    <Space>
                      <Tag>未部署</Tag>
                      {latestVersionNo > 0 && (
                        <Button
                          type="primary"
                          size="small"
                          disabled={!canDeploy}
                          onClick={() => handleOpenDeployModal(record.env)}
                        >
                          Deploy
                        </Button>
                      )}
                    </Space>
                  )}
                </div>

                {!canDeploy && latestVersionNo > 0 && (
                  <Alert
                    type="warning"
                    message="请先完成前置环境的部署"
                    style={{ marginTop: 8 }}
                    showIcon
                  />
                )}
              </Card>
            );
          })}
        </Space>
      </Card>

      {/* Version History */}
      <Card title="版本历史">
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
                <Tag color={ENV_COLORS[status]}>{ENV_LABELS[status] || status}</Tag>
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
              render: (time: string) => time ? new Date(time).toLocaleString() : '-',
            },
            {
              title: '操作',
              key: 'action',
              render: (_: any, record: ScenarioVersion) => (
                record.versionNo === latestVersionNo && record.status === 'Draft' ? (
                  <Button
                    type="primary"
                    size="small"
                    onClick={() => handleOpenDeployModal('Daily')}
                  >
                    发布到Daily
                  </Button>
                ) : (
                  <Text type="secondary">-</Text>
                )
              ),
            },
          ]}
        />
      </Card>

      {/* Deploy Modal */}
      <Modal
        title={`发布到${ENV_LABELS[deployTargetEnv || '']}环境`}
        open={isDeployModalOpen}
        onCancel={() => !isDeploying && setIsDeployModalOpen(false)}
        maskClosable={isDeploying}
        closable={!isDeploying}
        footer={
          isDeploying ? null : (
            [
              <Button key="cancel" onClick={() => setIsDeployModalOpen(false)}>
                取消
              </Button>,
              <Button
                key="deploy"
                type="primary"
                icon={<SyncOutlined />}
                onClick={handleDeploy}
                disabled={!deployApp}
              >
                确认发布
              </Button>,
            ]
          )
        }
      >
        {!isDeploying && (
          <div style={{ padding: 16 }}>
            <Space direction="vertical" style={{ width: '100%' }} size="middle">
              <div>
                <Text strong style={{ display: 'block', marginBottom: 8 }}>选择应用:</Text>
                <Select
                  value={deployApp}
                  onChange={setDeployApp}
                  placeholder="选择应用"
                  style={{ width: '100%' }}
                >
                  {availableApps.map(app => (
                    <Select.Option key={app} value={app}>{app}</Select.Option>
                  ))}
                </Select>
              </div>

              <Alert
                type="info"
                message="发布说明"
                description={`版本将发布到${ENV_LABELS[deployTargetEnv || '']}环境，环境发布顺序: Draft → Daily → Pre → Prod`}
              />
            </Space>
          </div>
        )}

        {isDeploying && (
          <div style={{ padding: 24 }}>
            <Steps
              current={currentStep}
              size="small"
              items={[
                { title: '环境验证' },
                { title: '配置检查' },
                { title: '版本发布' },
                { title: '实例部署' },
                { title: '健康检查' },
              ]}
            />
            <div style={{ marginTop: 24, textAlign: 'center' }}>
              <SyncOutlined spin style={{ fontSize: 24, color: '#1890ff' }} />
              <Text style={{ marginLeft: 8 }}>发布中，请稍候...</Text>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

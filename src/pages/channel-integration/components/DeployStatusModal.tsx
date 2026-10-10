import { useState } from 'react';
import { Modal, Select, Tag, Space, Table, message } from 'antd';

interface DeployStatusModalProps {
  visible: boolean;
  scenarioId: string;
  scenarioName: string;
  versions: any[];
  onClose: () => void;
}

// 云环境配置
const CLOUDS = [
  { id: 'aliyun', name: '阿里云', region: 'cn-hangzhou' },
  { id: 'aws', name: 'AWS', region: 'us-east-1' },
  { id: 'azure', name: 'Azure', region: 'eastus' },
  { id: 'huawei', name: '华为云', region: 'cn-north-4' },
];

// 应用配置
const APPLICATIONS = [
  { id: 'app-payment', name: 'payment-app' },
  { id: 'app-order', name: 'order-app' },
  { id: 'app-finance', name: 'finance-app' },
];

// 环境
const ENVIRONMENTS = [
  { id: 'daily', name: 'Daily', color: 'blue' },
  { id: 'pre', name: 'Pre', color: 'orange' },
  { id: 'prod', name: 'Prod', color: 'green' },
];

export default function DeployStatusModal({
  visible,
  scenarioId,
  scenarioName,
  versions,
  onClose,
}: DeployStatusModalProps) {
  const [selectedVersion, setSelectedVersion] = useState<number>(
    versions.length > 0 ? versions[versions.length - 1].versionNo : 1
  );

  // 模拟部署状态数据
  const getDeployStatus = (cloudId: string, appId: string, envId: string) => {
    // 根据version和cloud生成伪部署状态
    const seed = `${scenarioId}-${selectedVersion}-${cloudId}-${appId}-${envId}`.length;
    return seed % 3 === 0 ? 'deployed' : seed % 3 === 1 ? 'not_deployed' : 'failed';
  };

  const handleDeploy = (cloudId: string, appId: string, envId: string) => {
    message.success(`${CLOUDS.find(c => c.id === cloudId)?.name} - ${APPLICATIONS.find(a => a.id === appId)?.name} - ${ENVIRONMENTS.find(e => e.id === envId)?.name} 部署成功`);
  };

  const handleUndeploy = (cloudId: string, appId: string, envId: string) => {
    message.success(`${CLOUDS.find(c => c.id === cloudId)?.name} - ${APPLICATIONS.find(a => a.id === appId)?.name} - ${ENVIRONMENTS.find(e => e.id === envId)?.name} 取消部署成功`);
  };

  const columns = [
    {
      title: '云',
      dataIndex: 'cloud',
      key: 'cloud',
      width: 120,
      render: (cloud: any) => (
        <Space>
          <span style={{ fontWeight: 500 }}>{cloud.name}</span>
          <Tag style={{ fontSize: 10 }}>{cloud.region}</Tag>
        </Space>
      ),
    },
    {
      title: 'Application',
      dataIndex: 'app',
      key: 'app',
      width: 150,
      render: (app: any) => <Tag color="purple">{app.name}</Tag>,
    },
    {
      title: 'Daily',
      key: 'daily',
      width: 100,
      render: (_: any, record: any) => {
        const status = getDeployStatus(record.cloud.id, record.app.id, 'daily');
        const env = ENVIRONMENTS.find(e => e.id === 'daily')!;
        return (
          <Space direction="vertical" size={4}>
            <Tag color={env.color}>{env.name}</Tag>
            {status === 'deployed' && (
              <Tag color="success" style={{ cursor: 'pointer' }} onClick={() => handleUndeploy(record.cloud.id, record.app.id, 'daily')}>
                ✓ 已发布
              </Tag>
            )}
            {status === 'not_deployed' && (
              <Tag style={{ cursor: 'pointer', borderStyle: 'dashed' }} onClick={() => handleDeploy(record.cloud.id, record.app.id, 'daily')}>
                未发布
              </Tag>
            )}
            {status === 'failed' && (
              <Tag color="error">发布失败</Tag>
            )}
          </Space>
        );
      },
    },
    {
      title: 'Pre',
      key: 'pre',
      width: 100,
      render: (_: any, record: any) => {
        const status = getDeployStatus(record.cloud.id, record.app.id, 'pre');
        const env = ENVIRONMENTS.find(e => e.id === 'pre')!;
        return (
          <Space direction="vertical" size={4}>
            <Tag color={env.color}>{env.name}</Tag>
            {status === 'deployed' && (
              <Tag color="success" style={{ cursor: 'pointer' }} onClick={() => handleUndeploy(record.cloud.id, record.app.id, 'pre')}>
                ✓ 已发布
              </Tag>
            )}
            {status === 'not_deployed' && (
              <Tag style={{ cursor: 'pointer', borderStyle: 'dashed' }} onClick={() => handleDeploy(record.cloud.id, record.app.id, 'pre')}>
                未发布
              </Tag>
            )}
            {status === 'failed' && (
              <Tag color="error">发布失败</Tag>
            )}
          </Space>
        );
      },
    },
    {
      title: 'Prod',
      key: 'prod',
      width: 100,
      render: (_: any, record: any) => {
        const status = getDeployStatus(record.cloud.id, record.app.id, 'prod');
        const env = ENVIRONMENTS.find(e => e.id === 'prod')!;
        return (
          <Space direction="vertical" size={4}>
            <Tag color={env.color}>{env.name}</Tag>
            {status === 'deployed' && (
              <Tag color="success" style={{ cursor: 'pointer' }} onClick={() => handleUndeploy(record.cloud.id, record.app.id, 'prod')}>
                ✓ 已发布
              </Tag>
            )}
            {status === 'not_deployed' && (
              <Tag style={{ cursor: 'pointer', borderStyle: 'dashed' }} onClick={() => handleDeploy(record.cloud.id, record.app.id, 'prod')}>
                未发布
              </Tag>
            )}
            {status === 'failed' && (
              <Tag color="error">发布失败</Tag>
            )}
          </Space>
        );
      },
    },
  ];

  const dataSource = CLOUDS.map(cloud => ({
    key: cloud.id,
    cloud,
    app: APPLICATIONS[0], // 默认第一个应用
  }));

  return (
    <Modal
      title={
        <Space>
          <span>部署状态</span>
          <Tag color="blue">{scenarioName}</Tag>
        </Space>
      }
      open={visible}
      onCancel={onClose}
      footer={null}
      width={800}
    >
      {/* 版本选择 */}
      <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontWeight: 500 }}>选择版本:</span>
        <Select
          value={selectedVersion}
          onChange={setSelectedVersion}
          style={{ width: 120 }}
        >
          {versions.map(v => (
            <Select.Option key={v.versionNo} value={v.versionNo}>
              V{v.versionNo} {v.status && <span>({v.status})</span>}
            </Select.Option>
          ))}
        </Select>
      </div>

      {/* 部署状态表格 */}
      <Table
        columns={columns}
        dataSource={dataSource}
        pagination={false}
        size="small"
      />

      {/* 图例 */}
      <div style={{ marginTop: 16, display: 'flex', gap: 16, fontSize: 12, color: '#666' }}>
        <Space>
          <Tag color="success" style={{ borderStyle: 'solid' }}>✓ 已发布</Tag>
          <span>点击可取消发布</span>
        </Space>
        <Space>
          <Tag style={{ borderStyle: 'dashed' }}>未发布</Tag>
          <span>点击可发布</span>
        </Space>
        <Space>
          <Tag color="error">发布失败</Tag>
          <span>需重新发布</span>
        </Space>
      </div>
    </Modal>
  );
}

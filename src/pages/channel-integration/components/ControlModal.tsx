import { useState } from 'react';
import { Modal, Tag, Space, Table, Switch, Slider, message } from 'antd';
import { ControlOutlined } from '@ant-design/icons';

interface ControlModalProps {
  visible: boolean;
  scenarioName: string;
  onClose: () => void;
}

// 云环境配置
const CLOUDS = [
  { id: 'aliyun', name: '阿里云' },
  { id: 'aws', name: 'AWS' },
  { id: 'azure', name: 'Azure' },
  { id: 'huawei', name: '华为云' },
];

// 应用配置
const APPLICATIONS = [
  { id: 'app-payment', name: 'payment-app' },
  { id: 'app-order', name: 'order-app' },
  { id: 'app-finance', name: 'finance-app' },
];

// 环境配置
const ENVIRONMENTS = [
  { id: 'daily', name: 'Daily', color: 'blue' },
  { id: 'pre', name: 'Pre', color: 'orange' },
  { id: 'prod', name: 'Prod', color: 'green' },
];

interface TrafficControl {
  cloudId: string;
  appId: string;
  envId: string;
  enabled: boolean;
  trafficPercent: number;
}

export default function ControlModal({
  visible,
  scenarioName,
  onClose,
}: ControlModalProps) {
  // 初始化流量控制数据
  const [trafficControls, setTrafficControls] = useState<TrafficControl[]>(() => {
    const controls: TrafficControl[] = [];
    CLOUDS.forEach(cloud => {
      APPLICATIONS.forEach(app => {
        ENVIRONMENTS.forEach(env => {
          controls.push({
            cloudId: cloud.id,
            appId: app.id,
            envId: env.id,
            enabled: env.id === 'prod', // 只有prod默认开启
            trafficPercent: 100,
          });
        });
      });
    });
    return controls;
  });

  const handleToggle = (key: string, enabled: boolean) => {
    setTrafficControls(prev =>
      prev.map(c => (getKey(c) === key ? { ...c, enabled } : c))
    );
    message.success(`流量控制已${enabled ? '启用' : '禁用'}`);
  };

  const handleTrafficChange = (key: string, percent: number) => {
    setTrafficControls(prev =>
      prev.map(c => (getKey(c) === key ? { ...c, trafficPercent: percent } : c))
    );
  };

  const getKey = (c: TrafficControl) => `${c.cloudId}-${c.appId}-${c.envId}`;

  const getControl = (cloudId: string, appId: string, envId: string) =>
    trafficControls.find(
      c => c.cloudId === cloudId && c.appId === appId && c.envId === envId
    );

  const columns = [
    {
      title: '云',
      dataIndex: 'cloud',
      key: 'cloud',
      width: 100,
      render: (cloud: any) => <span style={{ fontWeight: 500 }}>{cloud.name}</span>,
    },
    {
      title: '应用',
      dataIndex: 'app',
      key: 'app',
      width: 130,
      render: (app: any) => <Tag color="purple">{app.name}</Tag>,
    },
    {
      title: '环境',
      key: 'env',
      width: 80,
      render: (_: any, record: any) => {
        const env = ENVIRONMENTS.find(e => e.id === record.envId)!;
        return <Tag color={env.color}>{env.name}</Tag>;
      },
    },
    {
      title: '启用状态',
      key: 'enabled',
      width: 100,
      render: (_: any, record: any) => {
        const control = getControl(record.cloud.id, record.app.id, record.envId);
        const key = getKey(control!);
        return (
          <Switch
            checked={control?.enabled}
            onChange={(checked) => handleToggle(key, checked)}
            checkedChildren="开"
            unCheckedChildren="关"
            size="small"
          />
        );
      },
    },
    {
      title: '流量分配',
      key: 'traffic',
      render: (_: any, record: any) => {
        const control = getControl(record.cloud.id, record.app.id, record.envId);
        const key = getKey(control!);
        return (
          <Space size="small">
            <Slider
              min={0}
              max={100}
              value={control?.trafficPercent || 0}
              onChange={(val) => handleTrafficChange(key, val)}
              style={{ width: 100 }}
              disabled={!control?.enabled}
              tooltip={{ formatter: (val) => `${val}%` }}
            />
            <span style={{ width: 40, fontSize: 12, color: '#666' }}>
              {control?.trafficPercent || 0}%
            </span>
          </Space>
        );
      },
    },
  ];

  // 生成表格数据
  const dataSource = CLOUDS.flatMap(cloud =>
    APPLICATIONS.flatMap(app =>
      ENVIRONMENTS.map(env => ({
        key: `${cloud.id}-${app.id}-${env.id}`,
        cloud,
        app,
        envId: env.id,
      }))
    )
  );

  return (
    <Modal
      title={
        <Space>
          <ControlOutlined />
          <span>流量控制</span>
          <Tag color="blue">{scenarioName}</Tag>
        </Space>
      }
      open={visible}
      onCancel={onClose}
      footer={null}
      width={800}
    >
      {/* 说明 */}
      <div style={{ marginBottom: 16, padding: 12, background: '#f5f5f5', borderRadius: 6 }}>
        <Space>
          <span style={{ fontWeight: 500 }}>说明:</span>
          <span style={{ color: '#666', fontSize: 12 }}>
            启用流量控制后，可通过滑块调整该环境分配的流量百分比。所有流量百分比的和建议为100%。
          </span>
        </Space>
      </div>

      {/* 流量控制表格 */}
      <Table
        columns={columns}
        dataSource={dataSource}
        pagination={false}
        size="small"
      />
    </Modal>
  );
}

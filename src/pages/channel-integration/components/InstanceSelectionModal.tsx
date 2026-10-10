import { useState, useMemo } from 'react';
import { Modal, Select, Space, Typography, Tooltip } from 'antd';
import { InfoCircleOutlined } from '@ant-design/icons';

const { Text } = Typography;

interface InstanceVersion {
  versionNo: number;
  l4TemplateId: string;
  status: 'Temporary' | 'Published';
  deployedAt?: string;
  deployedBy?: string;
  deployedEnv?: string;
  deployedApp?: string;
  deployedCloud?: string;
}

interface InstanceSelectionModalProps {
  visible: boolean;
  scenarioName: string;
  versions: InstanceVersion[];
  onCancel: () => void;
  onConfirm: (version: InstanceVersion) => void;
}

export default function InstanceSelectionModal({
  visible,
  scenarioName,
  versions,
  onCancel,
  onConfirm,
}: InstanceSelectionModalProps) {
  // Only show Published versions
  const publishedVersions = versions.filter(v => v.status === 'Published');

  // Extract unique values for dropdowns
  const cloudOptions = useMemo(() => {
    const clouds = new Set(publishedVersions.map(v => v.deployedCloud).filter(Boolean));
    return Array.from(clouds).sort();
  }, [publishedVersions]);

  const [selectedCloud, setSelectedCloud] = useState<string | null>(null);
  const [selectedApp, setSelectedApp] = useState<string | null>(null);
  const [selectedEnv, setSelectedEnv] = useState<string | null>(null);

  // Application options depend on selected Cloud
  const appOptions = useMemo(() => {
    if (!selectedCloud) return [];
    const apps = new Set(
      publishedVersions
        .filter(v => v.deployedCloud === selectedCloud)
        .map(v => v.deployedApp)
        .filter(Boolean)
    );
    return Array.from(apps).sort();
  }, [selectedCloud, publishedVersions]);

  // Environment options depend on selected Cloud and Application
  const envOptions = useMemo(() => {
    if (!selectedCloud || !selectedApp) return [];
    const envs = new Set(
      publishedVersions
        .filter(v => v.deployedCloud === selectedCloud && v.deployedApp === selectedApp)
        .map(v => v.deployedEnv)
        .filter(Boolean)
    );
    return Array.from(envs).sort();
  }, [selectedCloud, selectedApp, publishedVersions]);

  // Check if a specific combination has no published instances
  const hasNoPublishedInstances = (cloud: string | null, app: string | null, env: string | null): boolean => {
    if (!cloud) return false;
    const filtered = publishedVersions.filter(v => {
      if (app && v.deployedApp !== app) return false;
      if (env && v.deployedEnv !== env) return false;
      return v.deployedCloud === cloud;
    });
    return filtered.length === 0;
  };

  // Find the matching version
  const matchingVersion = useMemo(() => {
    if (!selectedCloud || !selectedApp || !selectedEnv) return null;
    return publishedVersions.find(
      v => v.deployedCloud === selectedCloud && v.deployedApp === selectedApp && v.deployedEnv === selectedEnv
    );
  }, [selectedCloud, selectedApp, selectedEnv, publishedVersions]);

  const canConfirm = !!matchingVersion;

  const handleConfirm = () => {
    if (matchingVersion) {
      onConfirm(matchingVersion);
      // Reset selections
      setSelectedCloud(null);
      setSelectedApp(null);
      setSelectedEnv(null);
    }
  };

  const handleCancel = () => {
    setSelectedCloud(null);
    setSelectedApp(null);
    setSelectedEnv(null);
    onCancel();
  };

  // Get disabled reason for tooltip
  const getAppDisabledReason = () => {
    if (!selectedCloud) return '请先选择 Cloud';
    if (hasNoPublishedInstances(selectedCloud, null, null)) return '该 Cloud 下暂无已发布版本';
    return '';
  };

  const getEnvDisabledReason = () => {
    if (!selectedCloud) return '请先选择 Cloud';
    if (!selectedApp) return '请先选择 Application';
    if (hasNoPublishedInstances(selectedCloud, selectedApp, null)) return '该组合下暂无已发布版本';
    return '';
  };

  return (
    <Modal
      title="选择查看的运行实例"
      open={visible}
      onCancel={handleCancel}
      onOk={handleConfirm}
      okText="Confirm"
      cancelText="Cancel"
      okButtonProps={{ disabled: !canConfirm }}
      width={480}
    >
      <Space direction="vertical" size="middle" style={{ width: '100%', marginTop: 16 }}>
        <div>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {scenarioName}
          </Text>
        </div>

        {/* Cloud Dropdown */}
        <div>
          <div style={{ marginBottom: 4, fontWeight: 500 }}>
            Cloud
          </div>
          <Select
            placeholder="请选择"
            value={selectedCloud}
            onChange={(val) => {
              setSelectedCloud(val);
              setSelectedApp(null);
              setSelectedEnv(null);
            }}
            style={{ width: '100%' }}
          >
            {cloudOptions.map(cloud => (
              <Select.Option key={cloud} value={cloud}>
                {cloud}
              </Select.Option>
            ))}
          </Select>
        </div>

        {/* Application Dropdown */}
        <div>
          <div style={{ marginBottom: 4, fontWeight: 500 }}>
            Application
          </div>
          <Tooltip title={getAppDisabledReason()}>
            <Select
              placeholder="请选择"
              value={selectedApp}
              onChange={(val) => {
                setSelectedApp(val);
                setSelectedEnv(null);
              }}
              style={{ width: '100%' }}
              disabled={!selectedCloud || appOptions.length === 0}
            >
              {appOptions.map(app => (
                <Select.Option key={app} value={app}>
                  {app}
                </Select.Option>
              ))}
            </Select>
          </Tooltip>
        </div>

        {/* Environment Dropdown */}
        <div>
          <div style={{ marginBottom: 4, fontWeight: 500 }}>
            Environment
          </div>
          <Tooltip title={getEnvDisabledReason()}>
            <Select
              placeholder="请选择"
              value={selectedEnv}
              onChange={setSelectedEnv}
              style={{ width: '100%' }}
              disabled={!selectedApp || envOptions.length === 0}
            >
              {envOptions.map(env => (
                <Select.Option key={env} value={env}>
                  {env}
                </Select.Option>
              ))}
            </Select>
          </Tooltip>
        </div>

        {/* Hint */}
        <div style={{ padding: '8px 12px', background: '#f5f5f5', borderRadius: 4 }}>
          <Space>
            <InfoCircleOutlined style={{ color: '#1890ff' }} />
            <Text type="secondary" style={{ fontSize: 12 }}>
              仅展示已发布版本的运行实例，Draft 状态不在此处展示
            </Text>
          </Space>
        </div>
      </Space>
    </Modal>
  );
}

import { Button, Space, Typography } from 'antd';
import { PauseOutlined, RightOutlined, StopOutlined } from '@ant-design/icons';

const { Text } = Typography;

export type DebugStatus = 'running' | 'paused' | 'completed' | 'error';

interface DebugStatusBarProps {
  status: DebugStatus;
  currentL3?: string;
  currentStep?: string;
  instanceInfo?: {
    cloud?: string;
    app?: string;
    env?: string;
    version?: number;
  };
  onContinue: () => void;
  onStepOver: () => void;
  onStop: () => void;
}

export default function DebugStatusBar({
  status,
  currentL3,
  currentStep,
  instanceInfo,
  onContinue,
  onStepOver,
  onStop,
}: DebugStatusBarProps) {
  const isPaused = status === 'paused';
  const isCompleted = status === 'completed';
  const isError = status === 'error';

  const getStatusIcon = () => {
    switch (status) {
      case 'running': return '🔵';
      case 'paused': return '⏸';
      case 'completed': return '✅';
      case 'error': return '❌';
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'running': return `${getStatusIcon()} 执行中`;
      case 'paused': return `${getStatusIcon()} 暂停中`;
      case 'completed': return `${getStatusIcon()} 执行完成`;
      case 'error': return `${getStatusIcon()} 执行失败`;
    }
  };

  return (
    <div style={{
      height: 56,
      padding: '0 24px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderBottom: '1px solid #f0f0f0',
      background: isCompleted ? '#f6ffed' : isError ? '#fff2f0' : isPaused ? '#fffbe6' : '#e6f7ff',
    }}>
      {/* Left: Status & Location */}
      <Space size="middle">
        <Text strong style={{ fontSize: 16 }}>{getStatusText()}</Text>
        {currentL3 && currentStep && (
          <>
            <Text type="secondary">{currentL3}</Text>
            <Text type="secondary">›</Text>
            <Text>{currentStep}</Text>
          </>
        )}
      </Space>

      {/* Center: Control Buttons */}
      <Space size="middle">
        <Button
          icon={<RightOutlined />}
          onClick={onContinue}
          disabled={!isPaused}
        >
          Continue
        </Button>
        <Button
          icon={<PauseOutlined />}
          onClick={onStepOver}
          disabled={!isPaused}
        >
          Step Over
        </Button>
        <Button
          danger
          icon={<StopOutlined />}
          onClick={onStop}
          disabled={isCompleted}
        >
          Stop Debug
        </Button>
      </Space>

      {/* Right: Instance Info */}
      <Space size="middle">
        {instanceInfo && (
          <>
            <Text type="secondary">{instanceInfo.cloud}</Text>
            <Text type="secondary">·</Text>
            <Text type="secondary">{instanceInfo.app}</Text>
            <Text type="secondary">·</Text>
            <Text type="secondary">{instanceInfo.env}</Text>
            <Text type="secondary">·</Text>
            <Text type="secondary">v{instanceInfo.version}</Text>
          </>
        )}
      </Space>
    </div>
  );
}

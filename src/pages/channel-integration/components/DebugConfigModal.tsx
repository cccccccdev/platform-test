import { useState } from 'react';
import { Modal, Input, Radio, Space, Typography, Tooltip } from 'antd';
import { InfoCircleOutlined } from '@ant-design/icons';

const { Text } = Typography;
const { TextArea } = Input;

interface DebugConfigModalProps {
  visible: boolean;
  selectedVersion: {
    deployedCloud?: string;
    deployedApp?: string;
    deployedEnv?: string;
    versionNo: number;
  } | null;
  breakpointCount: number; // Total breakpoints across all L3s
  onCancel: () => void;
  onStartDebug: (config: { spiInput: any; strategy: 'breakpoint' | 'step' | 'run' }) => void;
}

export default function DebugConfigModal({
  visible,
  selectedVersion,
  breakpointCount,
  onCancel,
  onStartDebug,
}: DebugConfigModalProps) {
  const [spiInput, setSpiInput] = useState(`{
  "amount": "",
  "currency": "NGN",
  "merchantId": "",
  "txnRef": "",
  "merchantName": "",
  "callbackUrl": ""
}`);
  const [strategy, setStrategy] = useState<'breakpoint' | 'step' | 'run'>('breakpoint');

  const handleStartDebug = () => {
    try {
      const parsedInput = JSON.parse(spiInput);
      onStartDebug({ spiInput: parsedInput, strategy });
    } catch {
      // If JSON is invalid, try to use as-is
      onStartDebug({ spiInput: {}, strategy });
    }
  };

  const isBreakpointStrategyDisabled = breakpointCount === 0;

  return (
    <Modal
      title="调试目标（只读，继承当前查看实例）"
      open={visible}
      onCancel={onCancel}
      onOk={handleStartDebug}
      okText="Start Debug"
      cancelText="Cancel"
      width={600}
    >
      <Space direction="vertical" size="middle" style={{ width: '100%', marginTop: 16 }}>
        {/* Instance Info - Read Only */}
        <div style={{
          padding: '12px 16px',
          background: '#f5f5f5',
          borderRadius: 4,
          display: 'flex',
          gap: 24,
        }}>
          <Space size="small">
            <Text type="secondary">Cloud:</Text>
            <Text strong>{selectedVersion?.deployedCloud || '-'}</Text>
          </Space>
          <Space size="small">
            <Text type="secondary">Application:</Text>
            <Text strong>{selectedVersion?.deployedApp || '-'}</Text>
          </Space>
          <Space size="small">
            <Text type="secondary">Environment:</Text>
            <Text strong>{selectedVersion?.deployedEnv || '-'}</Text>
          </Space>
          <Space size="small">
            <Text type="secondary">Version:</Text>
            <Text strong>v{selectedVersion?.versionNo}</Text>
          </Space>
        </div>

        {/* SPI Input Injection */}
        <div>
          <div style={{ marginBottom: 4, fontWeight: 500 }}>
            SPI 入参注入 *
          </div>
          <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 8 }}>
            按 spi.request 结构预填骨架，请填写具体值
          </Text>
          <TextArea
            value={spiInput}
            onChange={(e) => setSpiInput(e.target.value)}
            rows={8}
            style={{ fontFamily: 'monospace' }}
            placeholder='{"amount": "", "currency": "NGN", ...}'
          />
        </div>

        {/* Breakpoint Strategy */}
        <div>
          <div style={{ marginBottom: 8, fontWeight: 500 }}>
            断点策略
          </div>
          <Radio.Group
            value={strategy}
            onChange={(e) => setStrategy(e.target.value)}
            style={{ display: 'flex', flexDirection: 'column', gap: 8 }}
          >
            <Radio value="breakpoint" disabled={isBreakpointStrategyDisabled}>
              <Space>
                <span>仅在打点处暂停</span>
                {breakpointCount > 0 && (
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    （已打 {breakpointCount} 个断点）
                  </Text>
                )}
              </Space>
            </Radio>
            {isBreakpointStrategyDisabled && (
              <div style={{ marginLeft: 24, marginTop: -4 }}>
                <Tooltip title="请先在 L2 步骤上打断点">
                  <Space>
                    <InfoCircleOutlined style={{ color: '#fa8c16' }} />
                    <Text type="secondary" style={{ fontSize: 11 }}>
                      请先在 L2 步骤上打断点
                    </Text>
                  </Space>
                </Tooltip>
              </div>
            )}
            <Radio value="step">
              <span>全量步进</span>
              <Text type="secondary" style={{ fontSize: 12, marginLeft: 8 }}>
                （每个 L2 自动暂停）
              </Text>
            </Radio>
            <Radio value="run">
              <span>直接跑完</span>
              <Text type="secondary" style={{ fontSize: 12, marginLeft: 8 }}>
                （执行完整链路仅看结果）
              </Text>
            </Radio>
          </Radio.Group>
        </div>
      </Space>
    </Modal>
  );
}

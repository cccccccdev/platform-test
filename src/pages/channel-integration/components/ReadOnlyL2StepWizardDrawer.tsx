import { Drawer, Button, Typography, Tag } from 'antd';
import { CloseOutlined, CheckCircleFilled, CloseCircleFilled, MinusCircleFilled } from '@ant-design/icons';

const { Text } = Typography;

export type StepStatus = 'current' | 'completed' | 'unconfigured' | 'error' | 'skipped';

export interface StepConfig {
  l2Code: string;
  l2Name: string;
  isOptional: boolean;
  isEnabled: boolean;
}

interface ReadOnlyL2StepWizardDrawerProps {
  visible: boolean;
  l3Code?: string;
  l3Name: string;
  steps: StepConfig[];
  currentStepIndex: number;
  stepStatuses: StepStatus[];
  breakpoints: number[]; // Array of step indices with breakpoints
  drawerWidth?: number;
  onClose: () => void;
  onStepChange: (index: number) => void;
  onBreakpointToggle: (index: number) => void;
  onBack: () => void;
  onNext: () => void;
  children: React.ReactNode;
}

export default function ReadOnlyL2StepWizardDrawer({
  visible,
  l3Name,
  steps,
  currentStepIndex,
  stepStatuses,
  breakpoints,
  drawerWidth = 480,
  onClose,
  onStepChange,
  onBreakpointToggle,
  onBack,
  onNext,
  children,
}: ReadOnlyL2StepWizardDrawerProps) {
  // Get status icon for step indicator
  const getStatusIcon = (status: StepStatus, index: number, hasBreakpoint: boolean) => {
    const baseStyle = { cursor: 'pointer', margin: '0 2px' };

    if (hasBreakpoint) {
      return <span key={index} style={{ ...baseStyle, color: '#ff4d4f', fontSize: 16 }}>🔴</span>;
    }

    switch (status) {
      case 'current':
        return <span key={index} style={{ ...baseStyle, color: '#1890ff', fontSize: 16 }}>●</span>;
      case 'completed':
        return <CheckCircleFilled key={index} style={{ ...baseStyle, color: '#52c41a' }} />;
      case 'error':
        return <CloseCircleFilled key={index} style={{ ...baseStyle, color: '#ff4d4f' }} />;
      case 'skipped':
        return <MinusCircleFilled key={index} style={{ ...baseStyle, color: '#d9d9d9', fontStyle: 'italic' }} />;
      default:
        return <span key={index} style={{ ...baseStyle, color: '#d9d9d9', fontSize: 16 }}>○</span>;
    }
  };

  const currentStep = steps[currentStepIndex];
  const hasBreakpoint = breakpoints.includes(currentStepIndex);

  return (
    <Drawer
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Text type="secondary">{l3Name}</Text>
          <Text type="secondary">›</Text>
          <Text>{currentStep?.l2Name}</Text>
        </div>
      }
      placement="right"
      width={drawerWidth}
      open={visible}
      onClose={onClose}
      closeIcon={<CloseOutlined />}
      styles={{ body: { padding: 0, display: 'flex', flexDirection: 'column' } }}
    >
      {/* Step Indicator with Breakpoint Status */}
      <div style={{
        padding: '16px 24px',
        borderBottom: '1px solid #f0f0f0',
        display: 'flex',
        justifyContent: 'center',
        gap: 8,
        flexWrap: 'wrap',
      }}>
        {steps.map((step, index) => {
          const status = stepStatuses[index] || 'unconfigured';
          const isEnabled = step.isEnabled !== false;
          const isSkipped = step.isOptional && !isEnabled;
          const hasBreakpoint = breakpoints.includes(index);

          return (
            <div
              key={step.l2Code}
              onClick={() => onStepChange(index)}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                cursor: 'pointer',
                opacity: isSkipped ? 0.5 : 1,
              }}
              title={`${step.l2Name}${step.isOptional ? ' (可选)' : ''}`}
            >
              {getStatusIcon(isSkipped ? 'skipped' : status, index, hasBreakpoint)}
              <Text style={{ fontSize: 10, marginTop: 4, color: status === 'current' ? '#1890ff' : '#666' }}>
                {index + 1}
              </Text>
            </div>
          );
        })}
      </div>

      {/* Step Content with Breakpoint Toggle */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        {/* Breakpoint Toggle Bar */}
        <div style={{
          padding: '8px 16px',
          background: hasBreakpoint ? '#fff2f0' : '#fafafa',
          borderBottom: '1px solid #f0f0f0',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}>
          <Button
            size="small"
            type={hasBreakpoint ? 'primary' : 'default'}
            danger={hasBreakpoint}
            onClick={() => onBreakpointToggle(currentStepIndex)}
          >
            {hasBreakpoint ? '🔴 已打断点' : '○ 打断点'}
          </Button>
          <Text type="secondary" style={{ fontSize: 11 }}>
            Step {currentStepIndex + 1}: {currentStep?.l2Name}
            {currentStep?.isOptional && <Tag color="orange" style={{ marginLeft: 4 }}>可选</Tag>}
          </Text>
        </div>

        {/* Content */}
        <div style={{ padding: 16 }}>
          {children}
        </div>
      </div>

      {/* Footer Navigation */}
      <div style={{
        padding: '16px 24px',
        borderTop: '1px solid #f0f0f0',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <Button onClick={onBack} disabled={currentStepIndex === 0}>
          ← Back
        </Button>
        <Button type="primary" onClick={onNext}>
          {currentStepIndex === steps.length - 1 ? 'Last Step' : 'Next Step →'}
        </Button>
      </div>
    </Drawer>
  );
}

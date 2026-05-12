import { useState, useEffect } from 'react';
import { Drawer, Button, Space, Typography, Switch, Tag } from 'antd';
import { CloseOutlined, CheckCircleFilled, CloseCircleFilled, MinusCircleFilled } from '@ant-design/icons';

const { Text } = Typography;

export type StepStatus = 'current' | 'completed' | 'unconfigured' | 'error' | 'skipped';

export interface StepConfig {
  l2Code: string;
  l2Name: string;
  isOptional: boolean;
  isEnabled: boolean; // for optional steps
}

interface L2StepWizardDrawerProps {
  visible: boolean;
  l3Code?: string;
  l3Name: string;
  steps: StepConfig[];
  currentStepIndex: number;
  stepStatuses: StepStatus[];
  drawerWidth?: number;
  onClose: () => void;
  onStepChange: (index: number) => void;
  onStepEnableChange: (index: number, enabled: boolean) => void;
  onBack: () => void;
  onNext: () => void;
  onDone: () => void;
  isLastStep: boolean;
  children: React.ReactNode;
  // Breadcrumb navigation for nested flows
  breadcrumb?: { label: string; onClick: () => void }[];
  onBreadcrumbClick?: (index: number) => void;
}

export default function L2StepWizardDrawer({
  visible,
  l3Name,
  steps,
  currentStepIndex,
  stepStatuses,
  drawerWidth = 480,
  onClose,
  onStepChange,
  onStepEnableChange,
  onBack,
  onNext,
  onDone,
  isLastStep,
  children,
  breadcrumb,
  onBreadcrumbClick,
}: L2StepWizardDrawerProps) {
  const [showOptionalSwitch, setShowOptionalSwitch] = useState(false);

  // Check if current step is optional
  const currentStep = steps[currentStepIndex];
  const isCurrentStepOptional = currentStep?.isOptional ?? false;

  // Calculate if we should show the optional switch for current step
  useEffect(() => {
    const hasOptionalSteps = steps.some(s => s.isOptional);
    setShowOptionalSwitch(hasOptionalSteps && isCurrentStepOptional);
  }, [currentStepIndex, steps]);

  // Get status icon for step indicator
  const getStatusIcon = (status: StepStatus, index: number) => {
    const isClickable = true;
    const baseStyle = { cursor: isClickable ? 'pointer' : 'default', margin: '0 2px' };

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

  return (
    <Drawer
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* Breadcrumb */}
          {breadcrumb && breadcrumb.length > 0 && (
            <>
              {breadcrumb.map((item, idx) => (
                <span key={idx} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  {idx > 0 && <Text type="secondary">›</Text>}
                  <a
                    onClick={() => onBreadcrumbClick?.(idx)}
                    style={{ color: idx === breadcrumb.length - 1 ? '#333' : '#1890ff', fontWeight: idx === breadcrumb.length - 1 ? 600 : 400 }}
                  >
                    {item.label}
                  </a>
                </span>
              ))}
              <Text type="secondary">›</Text>
            </>
          )}
          <span style={{ fontWeight: 600 }}>{l3Name}</span>
          {currentStep && (
            <>
              <Text type="secondary">›</Text>
              <Text>{currentStep.l2Name}</Text>
            </>
          )}
        </div>
      }
      placement="right"
      width={drawerWidth}
      open={visible}
      onClose={onClose}
      closeIcon={<CloseOutlined />}
      styles={{ body: { padding: 0, display: 'flex', flexDirection: 'column' } }}
    >
      {/* Optional step toggle */}
      {showOptionalSwitch && currentStep && (
        <div style={{ padding: '12px 16px', background: '#fafafa', borderBottom: '1px solid #f0f0f0' }}>
          <Space>
            <Text style={{ fontSize: 12 }}>启用此可选步骤</Text>
            <Switch
              size="small"
              checked={currentStep.isEnabled}
              onChange={(checked) => onStepEnableChange(currentStepIndex, checked)}
            />
            {currentStep.isEnabled === false && (
              <Tag color="default" style={{ fontSize: 10 }}>已跳过</Tag>
            )}
          </Space>
        </div>
      )}

      {/* Step Indicator */}
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
          const isEnabled = step.isEnabled !== false; // default true
          const isSkipped = step.isOptional && !isEnabled;

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
              {getStatusIcon(isSkipped ? 'skipped' : status, index)}
              <Text style={{ fontSize: 10, marginTop: 4, color: status === 'current' ? '#1890ff' : '#666' }}>
                {index + 1}
              </Text>
            </div>
          );
        })}
      </div>

      {/* Step Content */}
      <div style={{ flex: 1, overflow: 'auto', padding: 24 }}>
        {children}
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

        <Space>
          <Button onClick={onClose}>Save Draft</Button>
          {isLastStep ? (
            <Button type="primary" onClick={onDone} icon={<CheckCircleFilled />}>
              Done ✓
            </Button>
          ) : (
            <Button type="primary" onClick={onNext}>
              Next Step →
            </Button>
          )}
        </Space>
      </div>
    </Drawer>
  );
}

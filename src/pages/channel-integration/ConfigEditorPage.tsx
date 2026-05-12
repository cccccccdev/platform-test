import { useState } from 'react';
import { Tabs, Button, Space, message, Breadcrumb, Empty } from 'antd';
import { useParams, useNavigate } from 'react-router-dom';
import { actionOptions } from '../../mock/data';
import type { StepConfig } from './types';
import StepModal from './StepModal';
import FlowCanvas from './FlowCanvas';

export default function ConfigEditorPage() {
  const { channelCode, ability } = useParams<{ channelCode: string; ability: string }>();
  const navigate = useNavigate();
  const [currentAction, setCurrentAction] = useState('TRANSACTION');
  const [actionStepConfigs, setActionStepConfigs] = useState<Record<string, StepConfig[]>>({});
  const [showStepModal, setShowStepModal] = useState(false);

  // 判断触发方式
  const handleTabChange = (action: string) => {
    setCurrentAction(action);
    // 如果该 Action 还没有配置 Steps，弹出 StepModal
    if (!actionStepConfigs[action] || actionStepConfigs[action].length === 0) {
      setShowStepModal(true);
    }
  };

  // Step 配置完成
  const handleStepsSubmit = (steps: StepConfig[]) => {
    setActionStepConfigs((prev) => ({ ...prev, [currentAction]: steps }));
    setShowStepModal(false);
    message.success('Steps configured successfully');
  };

  // 编辑 Flow - 跳转到新的画布页面
  // URL format: /channel-integration/:channelCode/integration/config/:bt/:ability/:stepIndex
  // ability param here is actually bt (CARD_PAY), currentAction is the ability (TRANSACTION)
  const handleEditFlow = (stepIndex: number, flowType: 'main' | 'requery' | 'callback') => {
    const url = `/channel-integration/${channelCode}/integration/config/${ability}/${currentAction}/${stepIndex}?flowType=${flowType}`;
    window.location.href = url;
  };

  // 返回列表
  const handleBack = () => {
    navigate(`/channel-integration/${channelCode}/integration/config`);
  };

  // 保存草稿
  const handleSaveDraft = () => {
    message.success('Saved successfully', 2);
  };

  // 提交
  const handleSubmit = () => {
    message.success('Submitted, version v1.2.0 generated');
  };

  const currentSteps = actionStepConfigs[currentAction] || [];

  return (
    <div style={{ padding: 24 }}>
      {/* 面包屑 */}
      <Breadcrumb
        style={{ marginBottom: 16 }}
        items={[
          { title: 'Channel Integration', onClick: () => navigate('/channel-integration') },
          { title: channelCode },
          { title: 'Integration' },
          { title: 'Config Integration', onClick: handleBack },
          { title: ability },
        ]}
      />

      {/* Action Tabs */}
      <Tabs
        activeKey={currentAction}
        onChange={handleTabChange}
        type="card"
        tabBarExtraContent={
          <Space>
            <Button onClick={() => setShowStepModal(true)}>Change Step</Button>
            <Button onClick={handleSaveDraft}>Save Draft</Button>
            <Button type="primary" onClick={handleSubmit}>Submit</Button>
            <Button onClick={() => { console.log('Test Navigate clicked'); handleEditFlow(0, 'main'); }}>Test Navigate</Button>
          </Space>
        }
        items={actionOptions.map((action) => ({
          key: action,
          label: action,
          children: (
            <div style={{ marginTop: 16 }}>
              {currentSteps.length > 0 ? (
                <FlowCanvas
                  action={currentAction}
                  steps={currentSteps}
                  onEditFlow={handleEditFlow}
                />
              ) : (
                <Empty description="点击 Change Step 开始配置" />
              )}
            </div>
          ),
        }))}
      />

      {/* Step Modal */}
      <StepModal
        open={showStepModal}
        action={currentAction}
        existingSteps={actionStepConfigs[currentAction] || []}
        onSubmit={handleStepsSubmit}
        onCancel={() => setShowStepModal(false)}
      />
    </div>
  );
}
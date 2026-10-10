import { useState, useEffect } from 'react';
import { Modal, Steps, InputNumber, Input, Checkbox, Select, Button, Space, message, Form } from 'antd';
import { mockEvents } from '../../mock/data';
import type { StepConfig } from './types';

interface StepModalProps {
  open: boolean;
  action: string;
  existingSteps: StepConfig[];
  onSubmit: (steps: StepConfig[]) => void;
  onCancel: () => void;
}

interface StepFormData {
  name: string;
  finalStateMode: string[];
  produceEvents: string[];
  triggerEvents?: string[];
}

export default function StepModal({ open, action, existingSteps, onSubmit, onCancel }: StepModalProps) {
  const [phase, setPhase] = useState<'count' | 'detail'>('count');
  const [stepCount, setStepCount] = useState(1);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [stepForms, setStepForms] = useState<StepFormData[]>([]);
  const [form] = Form.useForm();

  // 判断触发方式
  const getTriggerMode = (act: string): 'upstream' | 'external' => {
    return act.startsWith('INBOUND') ? 'external' : 'upstream';
  };

  const triggerMode = getTriggerMode(action);

  // 重置状态 - 仅在弹窗打开时初始化
  useEffect(() => {
    if (open) {
      setPhase('count');
      setStepCount(existingSteps.length > 0 ? existingSteps.length : 1);
      setCurrentStepIndex(0);
    }
  }, [open]);

  // 初始化表单数据 - 当 stepCount 或 existingSteps 变化时更新
  useEffect(() => {
    if (!open) return;
    const initialForms: StepFormData[] = Array.from({ length: stepCount }, (_, i) => {
      const existing = existingSteps[i];
      if (existing) {
        return {
          name: existing.name,
          finalStateMode: existing.finalStateMode,
          produceEvents: existing.produceEvents,
          triggerEvents: existing.triggerEvents,
        };
      }
      return {
        name: `Step ${i + 1}`,
        finalStateMode: [],
        produceEvents: [],
        triggerEvents: i > 0 ? [] : undefined,
      };
    });
    setStepForms(initialForms);
  }, [stepCount, existingSteps, open]);

  // 获取前序步骤产生的事件并集（用于触发事件选择）
  const getAvailableTriggerEvents = (stepIndex: number) => {
    const events = new Set<string>();
    for (let i = 0; i < stepIndex; i++) {
      const produceEvents = stepForms[i]?.produceEvents || [];
      produceEvents.forEach((e) => events.add(e));
    }
    return Array.from(events);
  };

  // 获取前序步骤产生的事件并集（包含当前步骤）
  const getAllProduceEvents = () => {
    const events = new Set<string>();
    stepForms.forEach((sf) => {
      (sf.produceEvents || []).forEach((e) => events.add(e));
    });
    return Array.from(events);
  };

  // 从 count 阶段进入 detail 阶段
  const handleNextFromCount = () => {
    // 确保 stepForms 长度与 stepCount 一致
    const newForms: StepFormData[] = Array.from({ length: stepCount }, (_, i) => {
      const existing = stepForms[i];
      if (existing) return existing;
      return {
        name: `Step ${i + 1}`,
        finalStateMode: [],
        produceEvents: [],
        triggerEvents: i > 0 ? [] : undefined,
      };
    });
    setStepForms(newForms);
    setCurrentStepIndex(0);
    setPhase('detail');
    form.resetFields();
    form.setFieldsValue(newForms[0]);
  };

  // 上一步
  const handleBack = () => {
    // 保存当前步骤数据
    const currentValues = form.getFieldsValue() as StepFormData;
    const newForms = [...stepForms];
    newForms[currentStepIndex] = { ...newForms[currentStepIndex], ...currentValues };
    setStepForms(newForms);

    if (currentStepIndex > 0) {
      setCurrentStepIndex((prev) => prev - 1);
      form.resetFields();
      form.setFieldsValue(newForms[currentStepIndex - 1]);
    } else {
      setPhase('count');
    }
  };

  // 下一步
  const handleNext = () => {
    // 保存当前步骤数据
    const currentValues = form.getFieldsValue() as StepFormData;
    const newForms = [...stepForms];
    newForms[currentStepIndex] = { ...newForms[currentStepIndex], ...currentValues };
    setStepForms(newForms);

    if (currentStepIndex < stepCount - 1) {
      setCurrentStepIndex((prev) => prev + 1);
      form.resetFields();
      form.setFieldsValue(newForms[currentStepIndex + 1]);
    } else {
      // 最后一步，提交
      handleSubmit(newForms);
    }
  };

  // 提交
  const handleSubmit = (forms: StepFormData[]) => {
    // 转换为 StepConfig
    const finalSteps: StepConfig[] = forms.map((f, i) => ({
      name: f.name,
      triggerMode: triggerMode,
      finalStateMode: f.finalStateMode as ('requery' | 'callback' | 'sync')[],
      produceEvents: f.produceEvents || [],
      triggerEvents: f.triggerEvents || (i > 0 ? [] : []),
    }));

    // 检查是否减少了 Step
    if (existingSteps.length > stepCount) {
      Modal.confirm({
        title: '确认删除 Steps',
        content: (
          <div>
            <p>减少 Step 将删除以下 Flow 的全部配置，且不可恢复：</p>
            <ul>
              {existingSteps.slice(stepCount).map((s, i) => (
                <li key={i}>Step {stepCount + i + 1} - {s.name}</li>
              ))}
            </ul>
          </div>
        ),
        okText: 'Confirm Delete',
        okButtonProps: { danger: true },
        cancelText: 'Cancel',
        onOk: () => {
          onSubmit(finalSteps);
          message.success('Steps configured');
        },
      });
    } else {
      onSubmit(finalSteps);
      message.success('Steps configured');
    }
  };

  const isLastStep = currentStepIndex === stepCount - 1;
  const availableTriggerEvents = getAvailableTriggerEvents(currentStepIndex);
  const isStep1 = currentStepIndex === 0;

  return (
    <Modal
      title={`Configure Steps for ${action}`}
      open={open}
      onCancel={onCancel}
      footer={null}
      width={700}
      maskClosable={false}
    >
      {phase === 'count' ? (
        <div style={{ padding: '16px 0' }}>
          <Form layout="vertical">
            <Form.Item label="Step Count">
              <InputNumber
                min={1}
                max={10}
                value={stepCount}
                onChange={(val) => setStepCount(val || 1)}
                style={{ width: 200 }}
              />
            </Form.Item>
          </Form>
          <Space style={{ float: 'right' }}>
            <Button onClick={onCancel}>Cancel</Button>
            <Button type="primary" onClick={handleNextFromCount}>Next →</Button>
          </Space>
        </div>
      ) : (
        <div style={{ padding: '16px 0' }}>
          {/* 步骤进度指示器 */}
          <Steps
            size="small"
            current={currentStepIndex}
            items={Array.from({ length: stepCount }, (_, i) => ({ title: `Step ${i + 1}` }))}
            style={{ marginBottom: 24 }}
          />

          <Form form={form} layout="vertical">
            {/* Step Name */}
            <Form.Item
              name="name"
              label="Step Name"
              rules={[{ required: true, message: '请输入 Step Name' }]}
            >
              <Input placeholder="请输入 Step Name" />
            </Form.Item>

            {/* 触发方式 - 只读展示 */}
            <Form.Item label="触发方式">
              <Select
                value={triggerMode}
                disabled
                options={[
                  { label: triggerMode === 'upstream' ? '上游触发' : '外部触发', value: triggerMode },
                ]}
              />
            </Form.Item>

            {/* 触发事件 - 非 Step1 需要选择 */}
            {currentStepIndex > 0 && (
              <Form.Item
                name="triggerEvents"
                label="触发事件"
                rules={[{ required: true, message: '请选择触发事件' }]}
              >
                <Select
                  mode="multiple"
                  placeholder="请选择触发事件（基于前序步骤产生的事件）"
                  options={availableTriggerEvents.map((e) => ({ label: e, value: e }))}
                />
              </Form.Item>
            )}

            {/* 终态获取方式 */}
            <Form.Item
              name="finalStateMode"
              label="终态获取方式"
              rules={[{ required: true, message: '请选择至少一个' }]}
            >
              <Checkbox.Group
                options={[
                  { label: 'requery', value: 'requery' },
                  { label: 'callback', value: 'callback' },
                  { label: 'sync', value: '同步' },
                ]}
              />
            </Form.Item>

            {/* 产生事件 */}
            <Form.Item
              name="produceEvents"
              label={isStep1 ? '产生事件（必填）' : '产生事件（非必填）'}
              rules={isStep1 ? [{ required: true, message: '请选择产生事件' }] : []}
            >
              <Select
                mode="tags"
                placeholder={isStep1 ? '请选择或输入事件名（必填）' : '请选择或输入事件名（非必填）'}
                options={mockEvents.map((e) => ({ label: e, value: e }))}
              />
            </Form.Item>

            {/* 显示已选的事件汇总 */}
            {currentStepIndex > 0 && getAllProduceEvents().length > 0 && (
              <div style={{ marginBottom: 16, padding: '8px 12px', background: '#f5f5f5', borderRadius: 4 }}>
                <span style={{ color: '#666', fontSize: 12 }}>已配置事件：</span>
                <Space wrap style={{ marginTop: 4 }}>
                  {getAllProduceEvents().map((e) => (
                    <span key={e} style={{ background: '#e6f4ff', padding: '2px 8px', borderRadius: 2, fontSize: 12 }}>{e}</span>
                  ))}
                </Space>
              </div>
            )}
          </Form>

          <Space style={{ float: 'right' }}>
            <Button onClick={handleBack}>← Back</Button>
            {isLastStep ? (
              <Button type="primary" onClick={() => handleSubmit(stepForms)}>Submit Steps</Button>
            ) : (
              <Button type="primary" onClick={handleNext}>Next →</Button>
            )}
          </Space>
        </div>
      )}
    </Modal>
  );
}
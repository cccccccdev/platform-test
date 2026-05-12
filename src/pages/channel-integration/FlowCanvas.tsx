import { Card, Tag, Tooltip } from 'antd';
import {
  ThunderboltOutlined,      // 上游触发
  GlobalOutlined,          // 外部触发
  ClockCircleOutlined,     // 定时器触发
  BellOutlined,           // 事件触发 / 事件
} from '@ant-design/icons';
import type { StepConfig } from './types';

interface FlowCanvasProps {
  action: string;
  steps: StepConfig[];
  onEditFlow: (stepIndex: number, flowType: 'main' | 'requery' | 'callback') => void;
}

// 触发类型配置
const triggerConfig: Record<string, { icon: React.ReactNode; label: string; color: string }> = {
  upstream: { icon: <ThunderboltOutlined />, label: '上游触发：等待渠道上游系统响应', color: '#1677ff' },
  external: { icon: <GlobalOutlined />, label: '外部触发：渠道侧主动回调通知', color: '#52c41a' },
  timer: { icon: <ClockCircleOutlined />, label: '定时器触发：定时轮询获取结果', color: '#fa8c16' },
  event: { icon: <BellOutlined />, label: '事件触发：前序步骤产生的事件触发', color: '#722ed1' },
};

// 获取触发方式
const getTriggerMode = (act: string): 'upstream' | 'external' => {
  return act.startsWith('INBOUND') ? 'external' : 'upstream';
};

// Flow 卡片组件
interface FlowCardProps {
  title: string;
  isMain?: boolean;
  onEdit: () => void;
}

function FlowCard({ title, isMain = false, onEdit }: FlowCardProps) {
  return (
    <div
      style={{
        background: '#fff',
        border: isMain ? '2px solid #1677ff' : '1px solid #d9d9d9',
        borderRadius: 8,
        padding: isMain ? '16px 20px' : '10px 14px',
        minWidth: isMain ? 240 : 160,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        boxShadow: isMain ? '0 2px 8px rgba(22,119,255,0.15)' : '0 1px 4px rgba(0,0,0,0.08)',
      }}
    >
      <div style={{ fontWeight: 600, fontSize: isMain ? 14 : 12, color: '#333' }}>{title}</div>
      <div onClick={() => { onEdit(); }} style={{ cursor: 'pointer', color: 'blue' }}>
        Edit
      </div>
    </div>
  );
}

// 触发图标组件
function TriggerIcon({ type }: { type: string }) {
  const config = triggerConfig[type];
  if (!config) return null;

  return (
    <Tooltip title={config.label}>
      <span
        style={{
          fontSize: 20,
          color: config.color,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
        }}
      >
        {config.icon}
      </span>
    </Tooltip>
  );
}

// 不同 Step 的事件使用不同颜色的图标
const stepEventColors = ['#1677ff', '#722ed1', '#13c2c2', '#fa8c16', '#52c41a', '#eb2f96'];

// 事件图标组件 - 每个事件一个不同颜色的铃铛，统一一个 tooltip
function EventIcons({ events, stepIndex }: { events: string[]; stepIndex: number }) {
  if (events.length === 0) return null;

  // 每个事件根据 stepIndex 和事件在数组中的位置分配不同颜色
  const getEventColor = (event: string, idx: number) => {
    const baseColor = stepEventColors[(stepIndex + idx) % stepEventColors.length];
    if (event.includes('SUCCESS') || event.includes('成功')) return '#52c41a';
    if (event.includes('FAILED') || event.includes('失败')) return '#ff4d4f';
    if (event.includes('PENDING') || event.includes('待处理')) return '#fa8c16';
    return baseColor;
  };

  const tooltipContent = (
    <div style={{ fontSize: 12 }}>
      <div style={{ fontWeight: 600, marginBottom: 4 }}>产生的事件</div>
      {events.map((e, i) => (
        <div key={i} style={{ color: getEventColor(e, i), margin: '2px 0' }}>{e}</div>
      ))}
    </div>
  );

  return (
    <Tooltip title={tooltipContent}>
      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        {events.map((e, i) => (
          <BellOutlined key={i} style={{ color: getEventColor(e, i), fontSize: 14 }} />
        ))}
      </span>
    </Tooltip>
  );
}

// 触发图标组件 - 支持多个触发事件（多个不同颜色的铃铛）
// triggerEventSources: 触发事件对应的来源 stepIndex 数组
function TriggerIcons({ types, triggerEventSources, stepIndex }: { types: string[]; triggerEventSources: number[]; stepIndex: number }) {
  if (types.length === 0) return null;

  // 根据事件来源 step 分配颜色
  const getTriggerColor = (sourceStepIndex: number) => {
    return stepEventColors[sourceStepIndex % stepEventColors.length];
  };

  if (types.length === 1) {
    const config = triggerConfig[types[0]];
    const sourceStep = triggerEventSources[0] ?? stepIndex;
    return (
      <Tooltip title={config?.label || types[0]}>
        <span style={{ fontSize: 20, color: getTriggerColor(sourceStep), cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
          <BellOutlined style={{ color: getTriggerColor(sourceStep) }} />
        </span>
      </Tooltip>
    );
  }

  // 多个触发事件：显示多个不同颜色的铃铛
  const tooltipContent = (
    <div style={{ fontSize: 12 }}>
      <div style={{ fontWeight: 600, marginBottom: 4 }}>触发事件</div>
      {types.map((eventName, i) => {
        const sourceStep = triggerEventSources[i] ?? stepIndex;
        return (
          <div key={i} style={{ color: getTriggerColor(sourceStep), margin: '2px 0' }}>
            {eventName}
          </div>
        );
      })}
    </div>
  );

  return (
    <Tooltip title={tooltipContent}>
      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        {types.map((_, i) => {
          const sourceStep = triggerEventSources[i] ?? stepIndex;
          return (
            <BellOutlined key={i} style={{ color: getTriggerColor(sourceStep), fontSize: 14 }} />
          );
        })}
      </span>
    </Tooltip>
  );
}

export default function FlowCanvas({ action, steps, onEditFlow }: FlowCanvasProps) {
  const triggerMode = getTriggerMode(action);

  // 计算某个 step 的触发事件来源 stepIndices
  const getTriggerEventSources = (stepIdx: number): number[] => {
    const sources: number[] = [];
    const triggerEvents = steps[stepIdx]?.triggerEvents || [];
    for (const event of triggerEvents) {
      // 查找哪个前序 step 产生这个事件
      let sourceIdx = -1;
      for (let i = 0; i < stepIdx; i++) {
        if (steps[i].produceEvents.includes(event)) {
          sourceIdx = i;
          break;
        }
      }
      sources.push(sourceIdx >= 0 ? sourceIdx : stepIdx);
    }
    return sources;
  };

  return (
    <div style={{ padding: 16 }}>
      {steps.map((step, stepIndex) => {
        const isFirstStep = stepIndex === 0;
        const hasRequery = step.finalStateMode.includes('requery');
        const hasCallback = step.finalStateMode.includes('callback');

        return (
          <Card
            key={stepIndex}
            size="small"
            style={{ marginBottom: 24, background: '#fafafa' }}
            bodyStyle={{ padding: 0 }}
          >
            {/* Step 标题区 */}
            <div
              style={{
                padding: '12px 16px',
                borderBottom: '1px solid #f0f0f0',
                background: '#fff',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <span style={{ fontWeight: 600, fontSize: 14, color: '#333' }}>Step {stepIndex + 1}</span>
              <span style={{ color: '#666', fontSize: 13 }}>{step.name}</span>
              <div style={{ marginLeft: 'auto', display: 'flex', gap: 4 }}>
                {step.finalStateMode.map((mode) => (
                  <Tag key={mode} color={mode === 'requery' ? 'orange' : 'purple'}>
                    {mode === 'requery' ? 'Requery' : 'Callback'}
                  </Tag>
                ))}
              </div>
            </div>

            <div style={{ padding: 16 }}>
              {/* 主 Flow 行 */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: hasRequery || hasCallback ? 16 : 0 }}>
                {/* 左侧：触发图标 - 非首步使用多个铃铛展示多个触发事件，颜色与来源 step 的事件颜色一致 */}
                {isFirstStep ? (
                  <TriggerIcon type={triggerMode} />
                ) : (
                  <TriggerIcons
                    types={step.triggerEvents && step.triggerEvents.length > 0 ? step.triggerEvents : ['event']}
                    triggerEventSources={getTriggerEventSources(stepIndex)}
                    stepIndex={stepIndex}
                  />
                )}

                {/* 中间：主 Flow 卡片 */}
                <FlowCard
                  title={step.name}
                  isMain
                  onEdit={() => onEditFlow(stepIndex, 'main')}
                />

                {/* 右侧：产生的事件图标（如果有） */}
                {step.produceEvents.length > 0 && (
                  <EventIcons events={step.produceEvents} stepIndex={stepIndex} />
                )}
              </div>

              {/* 子 Flow 区域 - Requery / Callback 并排显示，小框变细长 */}
              {(hasRequery || hasCallback) && (
                <div style={{ display: 'flex', gap: 24, paddingLeft: 32 }}>
                  {/* Requery: 左侧定时器图标，中间小卡片，右侧事件图标 */}
                  {hasRequery && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <TriggerIcon type="timer" />
                      <FlowCard
                        title={`${step.name}-Requery`}
                        onEdit={() => onEditFlow(stepIndex, 'requery')}
                      />
                      <EventIcons events={step.produceEvents} stepIndex={stepIndex} />
                    </div>
                  )}

                  {/* Callback: 左侧事件图标，中间卡片，右侧外部触发图标 */}
                  {hasCallback && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <EventIcons events={step.produceEvents} stepIndex={stepIndex} />
                      <FlowCard
                        title={`${step.name}-Callback`}
                        onEdit={() => onEditFlow(stepIndex, 'callback')}
                      />
                      <TriggerIcon type="external" />
                    </div>
                  )}
                </div>
              )}
            </div>
          </Card>
        );
      })}
    </div>
  );
}
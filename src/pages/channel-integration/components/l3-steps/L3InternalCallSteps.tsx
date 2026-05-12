import { useState } from 'react';
import { Form, Input, Radio, Space, Tag, Checkbox } from 'antd';
import { FieldPicker } from '../common';

function OrderReaderStep() {
  const [enabled, setEnabled] = useState(false);

  return (
    <Space direction="vertical" style={{ width: '100%' }}>
      <Space>
        <span>启用订单关联</span>
        <Checkbox checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
      </Space>

      <div style={{ opacity: enabled ? 1 : 0.5, transition: 'opacity 0.3s' }}>
        <Form.Item label="关联键类型" name="keyType" initialValue="reference">
          <Radio.Group>
            <Radio value="reference">reference</Radio>
            <Radio value="rrn">rrn</Radio>
            <Radio value="custom">自定义字段</Radio>
          </Radio.Group>
        </Form.Item>

        <Form.Item label="关联键来源" name="keySource">
          <FieldPicker placeholder="选择关联键来源字段" />
        </Form.Item>

        <Form.Item label="查找范围" name="lookupScope" initialValue="current">
          <Radio.Group>
            <Radio value="current">当前 Party + Line</Radio>
            <Radio value="global">全局</Radio>
          </Radio.Group>
        </Form.Item>
      </div>
    </Space>
  );
}

function RPCTargetStep() {
  return (
    <Space direction="vertical" style={{ width: '100%' }}>
      <Form.Item label="内部服务名" name="serviceName">
        <Input placeholder="com.example.PaymentService" />
      </Form.Item>

      <Form.Item label="方法名" name="methodName">
        <Input placeholder="queryOrder" />
      </Form.Item>

      <div style={{ fontWeight: 500, marginTop: 8, marginBottom: 8 }}>入参字段映射</div>
      <div style={{ padding: 16, background: '#fafafa', borderRadius: 4 }}>
        <Space direction="vertical" style={{ width: '100%' }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <Input placeholder="入参字段名（RPC 定义）" style={{ width: 180 }} />
            <span>←</span>
            <FieldPicker placeholder="来源字段" />
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <Input placeholder="入参字段名（RPC 定义）" style={{ width: 180 }} />
            <span>←</span>
            <FieldPicker placeholder="来源字段" />
          </div>
        </Space>
      </div>

      <div style={{ fontWeight: 500, marginTop: 16, marginBottom: 8 }}>出参写入 contextVar（可选）</div>
      <div style={{ padding: 16, background: '#fafafa', borderRadius: 4 }}>
        <Space direction="vertical" style={{ width: '100%' }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <Input placeholder="出参字段名" style={{ width: 150 }} />
            <span>→</span>
            <Input placeholder="写入变量名" style={{ width: 150 }} />
          </div>
        </Space>
      </div>
    </Space>
  );
}

export default function L3InternalCallSteps({
  currentStepIndex,
  form,
  readOnly = false,
}: {
  currentStepIndex: number;
  form: any;
  readOnly?: boolean;
}) {
  const steps = [
    { title: 'OrderReader', component: OrderReaderStep, optional: true, width: 480 },
    { title: 'RPC Target', component: RPCTargetStep, optional: false, width: 560 },
  ];

  const CurrentStepComponent = steps[currentStepIndex]?.component;

  return (
    <div style={{ width: steps[currentStepIndex]?.width || 480 }}>
      <div style={{ marginBottom: 16 }}>
        <Space>
          <Tag color="blue">Step {currentStepIndex + 1}</Tag>
          <span style={{ fontWeight: 500 }}>{steps[currentStepIndex]?.title}</span>
          {steps[currentStepIndex]?.optional && (
            <Tag color="orange">可选</Tag>
          )}
        </Space>
      </div>

      <Form form={form} layout="vertical" disabled={readOnly}>
        {CurrentStepComponent && <CurrentStepComponent />}
      </Form>
    </div>
  );
}

export const L3InternalCallSteps_Config = {
  l3Code: 'L3-02',
  l3Name: 'Internal Call',
  totalSteps: 2,
  steps: [
    { l2Code: 'L2-10', l2Name: 'OrderReader', isOptional: true, isEnabled: false, width: 480 },
    { l2Code: 'L2-11', l2Name: 'RPC Target', isOptional: false, isEnabled: true, width: 560 },
  ],
};

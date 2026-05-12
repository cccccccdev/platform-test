import { Form, Input, Select, Space, Tag } from 'antd';
import { FieldPicker } from '../common';

function TimestampGeneratorStep() {
  return (
    <Space direction="vertical" style={{ width: '100%' }}>
      <Form.Item label="时间戳格式" name="timestampFormat" initialValue="unix">
        <Select>
          <Select.Option value="unix">Unix 秒</Select.Option>
          <Select.Option value="unix_ms">Unix 毫秒</Select.Option>
          <Select.Option value="iso8601">ISO8601</Select.Option>
          <Select.Option value="custom">自定义</Select.Option>
        </Select>
      </Form.Item>

      <Form.Item label="格式模板" name="customFormat" style={{ display: 'none' }}>
        <Input placeholder="yyyy-MM-dd HH:mm:ss" />
      </Form.Item>

      <Form.Item label="写入变量名" name="timestampVariable" initialValue="contextVar.timestamp">
        <Input placeholder="contextVar.timestamp" />
      </Form.Item>
    </Space>
  );
}

function OrderCreatorStep() {
  return (
    <Space direction="vertical" style={{ width: '100%' }}>
      <div style={{ fontWeight: 500, marginBottom: 8 }}>订单变量初始化映射</div>
      <div style={{ padding: 16, background: '#fafafa', borderRadius: 4 }}>
        <Space direction="vertical" style={{ width: '100%' }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span style={{ width: 120 }}>amount</span>
            <FieldPicker placeholder="选择字段" />
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span style={{ width: 120 }}>currency</span>
            <FieldPicker placeholder="选择字段" />
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span style={{ width: 120 }}>merchantId</span>
            <FieldPicker placeholder="选择字段" />
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span style={{ width: 120 }}>txnType</span>
            <Input placeholder="固定值: PAYMENT" disabled />
            <Tag color="blue">固定值</Tag>
          </div>
        </Space>
      </div>
    </Space>
  );
}

export default function L3GenerateDataSteps({
  currentStepIndex,
  form,
  readOnly = false,
}: {
  currentStepIndex: number;
  form: any;
  readOnly?: boolean;
}) {
  const steps = [
    { title: 'TimestampGenerator', component: TimestampGeneratorStep, optional: false, width: 480 },
    { title: 'OrderCreator', component: OrderCreatorStep, optional: false, width: 560 },
  ];

  const CurrentStepComponent = steps[currentStepIndex]?.component;

  return (
    <div style={{ width: steps[currentStepIndex]?.width || 480 }}>
      <div style={{ marginBottom: 16 }}>
        <Space>
          <Tag color="blue">Step {currentStepIndex + 1}</Tag>
          <span style={{ fontWeight: 500 }}>{steps[currentStepIndex]?.title}</span>
        </Space>
      </div>

      <Form form={form} layout="vertical" disabled={readOnly}>
        {CurrentStepComponent && <CurrentStepComponent />}
      </Form>
    </div>
  );
}

export const L3GenerateDataSteps_Config = {
  l3Code: 'L3-05',
  l3Name: 'Generate Data',
  totalSteps: 2,
  steps: [
    { l2Code: 'L2-12', l2Name: 'TimestampGenerator', isOptional: false, isEnabled: true, width: 480 },
    { l2Code: 'L2-13', l2Name: 'OrderCreator', isOptional: false, isEnabled: true, width: 560 },
  ],
};

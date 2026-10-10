import { Form, Input, Radio, Space, Tag, InputNumber } from 'antd';
import { ConditionGroupEditor } from '../common';

function RequeryLoaderStep() {
  return (
    <Space direction="vertical" style={{ width: '100%' }}>
      <Form.Item label="重查间隔 (ms)" name="retryInterval" initialValue={5000}>
        <InputNumber min={100} max={60000} defaultValue={5000} style={{ width: 120 }} />
      </Form.Item>

      <Form.Item label="最大重查次数" name="maxRetries" initialValue={5}>
        <InputNumber min={1} max={100} defaultValue={5} style={{ width: 80 }} />
      </Form.Item>

      <Form.Item label="超时关单阈值 (ms)" name="timeoutThreshold" initialValue={300000}>
        <InputNumber min={1000} max={3600000} defaultValue={300000} style={{ width: 120 }} />
      </Form.Item>

      <Form.Item label="间隔策略" name="intervalStrategy" initialValue="fixed">
        <Radio.Group>
          <Radio value="fixed">固定间隔</Radio>
          <Radio value="exponential">指数退避</Radio>
        </Radio.Group>
      </Form.Item>

      <Form.Item label="关单动作" name="closeAction" initialValue="updateStatus">
        <Radio.Group>
          <Radio value="updateStatus">更新状态为 FAILED</Radio>
          <Radio value="callInternal">调用关单 Internal Call</Radio>
        </Radio.Group>
      </Form.Item>
    </Space>
  );
}

function ConditionRouterStep() {
  return (
    <Space direction="vertical" style={{ width: '100%' }}>
      <div style={{ fontWeight: 500, marginBottom: 8 }}>结果判断条件</div>
      <ConditionGroupEditor />
    </Space>
  );
}

function NestedHttpRequestStep() {
  return (
    <Space direction="vertical" style={{ width: '100%' }}>
      <div style={{ background: '#f6ffed', padding: 16, borderRadius: 4, border: '1px solid #b7eb8f' }}>
        <Space direction="vertical" style={{ width: '100%' }}>
          <div>
            <Tag color="green">嵌套 L3-01</Tag>
            <span style={{ marginLeft: 8, fontWeight: 500 }}>HTTP Request 子流</span>
          </div>
          <div style={{ fontSize: 12, color: '#666' }}>
            此步骤将执行 HTTP Request 的 8 步完整流程，轮询直到条件满足
          </div>
        </Space>
      </div>

      <Form.Item label="子流 Endpoint" name="nestedEndpoint">
        <Input placeholder="https://api.example.com/v1/query" />
      </Form.Item>

      <Form.Item label="轮询请求体" name="nestedRequestBody">
        <Input.TextArea
          rows={4}
          placeholder={`{\n  "orderId": "{{orderId}}"\n}`}
          style={{ fontFamily: 'monospace' }}
        />
      </Form.Item>

      <Form.Item label="成功判断条件" name="nestedSuccessCondition">
        <Input placeholder="status == SUCCESS" />
      </Form.Item>
    </Space>
  );
}

export default function L3RequerySteps({
  currentStepIndex,
  form,
  readOnly = false,
}: {
  currentStepIndex: number;
  form: any;
  readOnly?: boolean;
}) {
  const steps = [
    { title: 'RequeryLoader', component: RequeryLoaderStep, optional: false, width: 520 },
    { title: 'ConditionRouter', component: ConditionRouterStep, optional: false, width: 600 },
    { title: 'HTTP Request 子流', component: NestedHttpRequestStep, optional: false, nested: true, width: 720 },
  ];

  const CurrentStepComponent = steps[currentStepIndex]?.component;

  return (
    <div style={{ width: steps[currentStepIndex]?.width || 480 }}>
      <div style={{ marginBottom: 16 }}>
        <Space>
          <Tag color="blue">Step {currentStepIndex + 1}</Tag>
          <span style={{ fontWeight: 500 }}>{steps[currentStepIndex]?.title}</span>
          {steps[currentStepIndex]?.nested && (
            <Tag color="green">嵌套</Tag>
          )}
        </Space>
      </div>

      <Form form={form} layout="vertical" disabled={readOnly}>
        {CurrentStepComponent && <CurrentStepComponent />}
      </Form>
    </div>
  );
}

export const L3RequerySteps_Config = {
  l3Code: 'L3-08',
  l3Name: 'Requery',
  totalSteps: 3,
  steps: [
    { l2Code: 'L2-14', l2Name: 'RequeryLoader', isOptional: false, isEnabled: true, width: 520 },
    { l2Code: 'L2-15', l2Name: 'ConditionRouter', isOptional: false, isEnabled: true, width: 600 },
    { l2Code: 'L2-16', l2Name: 'HTTP Request 子流', isOptional: false, isEnabled: true, nested: true, width: 720 },
  ],
};

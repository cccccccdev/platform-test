import { Form, Input, Space } from 'antd';

function VariableDefinerStep(_props: { form: any }) {
  return (
    <div>
      <Form.Item label="常量定义" name="constants">
        <Input.TextArea
          rows={8}
          placeholder={`{\n  "channelId": "CH001",\n  "merchantId": "M001",\n  "currency": "USD"\n}`}
          style={{ fontFamily: 'monospace' }}
        />
      </Form.Item>

      <div style={{ fontSize: 12, color: '#999', marginTop: 8 }}>
        支持 {'{{variable}}'} 语法引用其他变量
      </div>
    </div>
  );
}

function FieldGeneratorStep(_props: { form: any }) {
  return (
    <div>
      <Form.Item label="字段生成规则" name="fieldRules">
        <Input.TextArea
          rows={10}
          placeholder={`[\n  {\n    "field": "orderId",\n    "type": "uuid"\n  },\n  {\n    "field": "timestamp",\n    "type": "timestamp",\n    "format": "unix"\n  },\n  {\n    "field": "amount",\n    "type": "input",\n    "required": true\n  }\n]`}
          style={{ fontFamily: 'monospace' }}
        />
      </Form.Item>

      <div style={{ marginTop: 16 }}>
        <div style={{ fontWeight: 500, marginBottom: 8 }}>字段类型说明</div>
        <Space direction="vertical" size={4} style={{ fontSize: 12, color: '#666' }}>
          <div>• uuid: 生成 UUID</div>
          <div>• timestamp: 生成时间戳</div>
          <div>• input: 从输入获取</div>
          <div>• constant: 使用常量值</div>
          <div>• expression: 表达式计算</div>
        </Space>
      </div>
    </div>
  );
}

export default function L3SceneInitializerSteps({
  currentStepIndex,
  form,
  readOnly = false,
}: {
  currentStepIndex: number;
  form: any;
  readOnly?: boolean;
}) {
  const steps = [
    { title: 'Variable Definer', component: VariableDefinerStep, optional: false, width: 520 },
    { title: 'Field Generator', component: FieldGeneratorStep, optional: false, width: 600 },
  ];

  const CurrentStepComponent = steps[currentStepIndex]?.component;

  return (
    <div style={{ width: steps[currentStepIndex]?.width || 480 }}>
      <div style={{ marginBottom: 16 }}>
        <span style={{ fontWeight: 500 }}>Step {currentStepIndex + 1}: {steps[currentStepIndex]?.title}</span>
      </div>

      <Form form={form} layout="vertical" disabled={readOnly}>
        {CurrentStepComponent && <CurrentStepComponent form={form} />}
      </Form>
    </div>
  );
}

export const L3SceneInitializerSteps_Config = {
  l3Code: 'L3-11',
  l3Name: 'Scene Initializer',
  totalSteps: 2,
  steps: [
    { l2Code: 'L2-18', l2Name: 'Variable Definer', isOptional: false, isEnabled: true, width: 520 },
    { l2Code: 'L2-19', l2Name: 'Field Generator', isOptional: false, isEnabled: true, width: 600 },
  ],
};

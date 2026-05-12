import { Form, Input, Select, Radio, Tag, Space } from 'antd';

function OrderReaderStep(_props: { form: any }) {
  return (
    <div>
      <Form.Item label="关联键配置" name="关联键">
        <Input placeholder="orderId" />
      </Form.Item>

      <Form.Item label="关联键来源" name="关联键来源">
        <Select>
          <Select.Option value="callback">回调参数</Select.Option>
          <Select.Option value="input">输入参数</Select.Option>
          <Select.Option value="context">上下文</Select.Option>
        </Select>
      </Form.Item>

      <Form.Item label="关联键变量" name="关联键变量">
        <Input placeholder="{{callbackOrderId}}" />
      </Form.Item>
    </div>
  );
}

function ResponseDecryptorStep(_props: { form: any }) {
  return (
    <div>
      <Form.Item label="解密算法" name="decryptAlgorithm">
        <Select>
          <Select.Option value="AES-128-CBC">AES-128-CBC</Select.Option>
          <Select.Option value="AES-256-CBC">AES-256-CBC</Select.Option>
          <Select.Option value="AES-256-GCM">AES-256-GCM</Select.Option>
          <Select.Option value="RSA">RSA</Select.Option>
        </Select>
      </Form.Item>

      <Form.Item label="解密密钥引用" name="decryptKey">
        <Select placeholder="选择解密密钥">
          <Select.Option value="dec_key_001">Decrypt_Key_001</Select.Option>
          <Select.Option value="dec_key_002">Decrypt_Key_002</Select.Option>
        </Select>
      </Form.Item>

      <Form.Item label="解密字段" name="decryptField">
        <Input placeholder="data" />
      </Form.Item>
    </div>
  );
}

function ResponseVerifierStep(_props: { form: any }) {
  return (
    <div>
      <Form.Item label="验签算法" name="verifyAlgorithm">
        <Select>
          <Select.Option value="HMAC-SHA256">HMAC-SHA256</Select.Option>
          <Select.Option value="HMAC-SHA512">HMAC-SHA512</Select.Option>
          <Select.Option value="RSA-SHA256">RSA-SHA256</Select.Option>
        </Select>
      </Form.Item>

      <Form.Item label="验签密钥引用" name="verifyKey">
        <Select placeholder="选择验签密钥">
          <Select.Option value="verify_key_001">Verify_Key_001</Select.Option>
          <Select.Option value="verify_key_002">Verify_Key_002</Select.Option>
        </Select>
      </Form.Item>

      <Form.Item label="响应签名字段" name="signatureField">
        <Input placeholder="sign" />
      </Form.Item>

      <Form.Item label="参与验签字段" name="verifyParams">
        <Input.TextArea
          rows={3}
          placeholder="code,message,amount"
          style={{ fontFamily: 'monospace' }}
        />
      </Form.Item>
    </div>
  );
}

function ResponseParserStep(_props: { form: any }) {
  return (
    <div>
      <Form.Item label="响应格式" name="parseType" initialValue="json">
        <Radio.Group>
          <Radio value="json">JSON</Radio>
          <Radio value="xml">XML</Radio>
          <Radio value="plain">Plain Text</Radio>
        </Radio.Group>
      </Form.Item>

      <Form.Item label="业务状态路径" name="statusPath">
        <Input placeholder="code" style={{ fontFamily: 'monospace' }} />
      </Form.Item>

      <Form.Item label="成功状态值" name="successValues">
        <Select mode="tags" placeholder="00,SUCCESS">
          <Select.Option value="00">00</Select.Option>
          <Select.Option value="SUCCESS">SUCCESS</Select.Option>
        </Select>
      </Form.Item>

      <Form.Item label="响应数据路径" name="dataPath">
        <Input placeholder="data" style={{ fontFamily: 'monospace' }} />
      </Form.Item>

      <Form.Item label="错误信息路径" name="errorPath">
        <Input placeholder="message" style={{ fontFamily: 'monospace' }} />
      </Form.Item>

      <Form.Item label="字段映射" name="fieldMappings">
        <Input.TextArea
          rows={4}
          placeholder={`[\n  { "from": "amount", "to": "transAmount" }\n]`}
          style={{ fontFamily: 'monospace' }}
        />
      </Form.Item>
    </div>
  );
}

function CallbackResponderStep(_props: { form: any }) {
  return (
    <div>
      <Form.Item label="响应格式" name="responseFormat">
        <Radio.Group>
          <Radio value="json">JSON</Radio>
          <Radio value="xml">XML</Radio>
          <Radio value="plain">Plain Text</Radio>
        </Radio.Group>
      </Form.Item>

      <Form.Item label="成功响应体" name="successResponse">
        <Input.TextArea
          rows={4}
          placeholder={`{\n  "code": "SUCCESS",\n  "message": "回调接收成功"\n}`}
          style={{ fontFamily: 'monospace' }}
        />
      </Form.Item>

      <Form.Item label="失败响应体" name="failResponse">
        <Input.TextArea
          rows={4}
          placeholder={`{\n  "code": "FAILED",\n  "message": "{{errorMessage}}"\n}`}
          style={{ fontFamily: 'monospace' }}
        />
      </Form.Item>
    </div>
  );
}

export default function L3CallbackParseSteps({
  currentStepIndex,
  form,
  readOnly = false,
}: {
  currentStepIndex: number;
  form: any;
  readOnly?: boolean;
}) {
  const steps = [
    { title: 'OrderReader', component: OrderReaderStep, optional: false, width: 520 },
    { title: 'ResponseDecryptor', component: ResponseDecryptorStep, optional: true, width: 520 },
    { title: 'ResponseVerifier', component: ResponseVerifierStep, optional: false, width: 560 },
    { title: 'ResponseParser', component: ResponseParserStep, optional: false, width: 560 },
    { title: 'CallbackResponder', component: CallbackResponderStep, optional: false, width: 600 },
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
        {CurrentStepComponent && <CurrentStepComponent form={form} />}
      </Form>
    </div>
  );
}

export const L3CallbackParseSteps_Config = {
  l3Code: 'L3-09',
  l3Name: 'Callback Parse',
  totalSteps: 5,
  steps: [
    { l2Code: 'L2-10', l2Name: 'OrderReader', isOptional: false, isEnabled: true, width: 520 },
    { l2Code: 'L2-07', l2Name: 'ResponseDecryptor', isOptional: true, isEnabled: false, width: 520 },
    { l2Code: 'L2-08', l2Name: 'ResponseVerifier', isOptional: false, isEnabled: true, width: 560 },
    { l2Code: 'L2-09', l2Name: 'ResponseParser', isOptional: false, isEnabled: true, width: 560 },
    { l2Code: 'L2-17', l2Name: 'CallbackResponder', isOptional: false, isEnabled: true, width: 600 },
  ],
};

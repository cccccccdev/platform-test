import { useState } from 'react';
import { Form, Input, Select, Radio, Space, Tag, InputNumber, Button, Table } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { CredentialSelector, EndpointSelector, SignatureRuleEditor } from '../common';
import JsonSampleEditor, { type FieldDef } from '../common/JsonSampleEditor';
import FieldPicker from '../common/FieldPicker';

// RequestBuilder Step (Step 1) - Only handles format + sample JSON + field list
function RequestBuilderStep() {
  const [format, setFormat] = useState<'json' | 'xml' | 'form'>('json');
  const [sampleData, setSampleData] = useState<{ sampleJson: string; fields: FieldDef[] }>({
    sampleJson: '{\n  "amount": 10000,\n  "currency": "NGN",\n  "merchantId": "MCH_001"\n}',
    fields: [
      { key: 'amount', fieldName: 'amount', type: 'Number', required: true },
      { key: 'currency', fieldName: 'currency', type: 'String', required: true },
      { key: 'merchantId', fieldName: 'merchantId', type: 'String', required: true },
    ],
  });

  return (
    <Space direction="vertical" style={{ width: '100%' }}>
      {/* Format Selection */}
      <Form.Item label="报文格式">
        <Radio.Group value={format} onChange={(e) => setFormat(e.target.value)}>
          <Radio value="json">JSON</Radio>
          <Radio value="xml">XML</Radio>
          <Radio value="form">Form</Radio>
        </Radio.Group>
      </Form.Item>

      {/* JSON Sample Editor */}
      <JsonSampleEditor
        mode="request"
        value={sampleData}
        onChange={(val) => setSampleData(val || { sampleJson: '', fields: [] })}
      />
    </Space>
  );
}

// RequestMapper Step (Step 2) - Maps channel fields to internal sources
function RequestMapperStep() {
  const [mappings, setMappings] = useState([
    { key: '1', channelField: 'amount', type: 'Number', sourceType: 'field', sourceValue: 'spi.request.amount' },
    { key: '2', channelField: 'currency', type: 'String', sourceType: 'field', sourceValue: 'spi.request.currency' },
    { key: '3', channelField: 'merchantId', type: 'String', sourceType: 'field', sourceValue: 'spi.request.merchantId' },
  ]);

  const handleMappingChange = (key: string, field: string, value: any) => {
    setMappings(prev => prev.map(m => m.key === key ? { ...m, [field]: value } : m));
  };

  const columns = [
    {
      title: '渠道字段名（只读）',
      dataIndex: 'channelField',
      width: 180,
      render: (text: string) => <Input value={text} disabled style={{ fontFamily: 'monospace', fontSize: 11 }} />
    },
    {
      title: '类型',
      dataIndex: 'type',
      width: 80,
      render: (text: string) => <Tag>{text}</Tag>
    },
    {
      title: '赋值模式',
      dataIndex: 'sourceType',
      width: 120,
      render: (text: string, record: any) => (
        <Select value={text} onChange={(val) => handleMappingChange(record.key, 'sourceType', val)} size="small" style={{ width: '100%' }}>
          <Select.Option value="field">直接赋值</Select.Option>
          <Select.Option value="fixed">固定值</Select.Option>
          <Select.Option value="conditional">条件赋值</Select.Option>
        </Select>
      )
    },
    {
      title: '来源配置',
      dataIndex: 'sourceValue',
      render: (text: string, record: any) => (
        record.sourceType === 'field' ? (
          <FieldPicker value={text} onChange={(val) => handleMappingChange(record.key, 'sourceValue', val)} />
        ) : record.sourceType === 'fixed' ? (
          <Input value={text} onChange={(e) => handleMappingChange(record.key, 'sourceValue', e.target.value)} placeholder="固定值" />
        ) : (
          <Button size="small" onClick={() => {}}>配置条件 →</Button>
        )
      ),
    },
  ];

  return (
    <Space direction="vertical" style={{ width: '100%' }}>
      <div style={{ padding: 12, background: '#f0f5ff', borderRadius: 4 }}>
        <div style={{ fontSize: 11, color: '#666' }}>
          💡 将渠道请求字段映射到系统内部字段来源。字段列表来自 Step 1 定义，如需增删字段请返回 Step 1。
        </div>
      </div>

      <Table
        dataSource={mappings}
        columns={columns}
        rowKey="key"
        size="small"
        pagination={false}
        footer={() => (
          <Button type="dashed" size="small" icon={<PlusOutlined />} disabled>
            新增字段（请在 Step 1 添加）
          </Button>
        )}
        scroll={{ y: 300 }}
      />

      <div style={{ fontSize: 11, color: '#999', marginTop: 8 }}>
        💡 直接赋值：来源二选一（Context 字段引用 / 字符串拼接）
      </div>
    </Space>
  );
}

// AuthHeaderBuilder Step
function AuthHeaderBuilderStep() {
  const [authType, setAuthType] = useState('bearer');

  return (
    <Space direction="vertical" style={{ width: '100%' }}>
      <Form.Item label="认证方式" name="authType" initialValue="bearer">
        <Select onChange={(val) => setAuthType(val)}>
          <Select.Option value="bearer">Bearer Token</Select.Option>
          <Select.Option value="apikey">API Key</Select.Option>
          <Select.Option value="basic">Basic Auth</Select.Option>
          <Select.Option value="oauth2">OAuth2</Select.Option>
          <Select.Option value="none">None</Select.Option>
        </Select>
      </Form.Item>

      {authType === 'bearer' && (
        <Space direction="vertical" style={{ width: '100%' }}>
          <Form.Item label="Token 来源" name="bearerCredential">
            <CredentialSelector credentialType="API_KEY" />
          </Form.Item>
          <Form.Item label="Header 名称" name="bearerHeaderName" initialValue="Authorization">
            <Input placeholder="Authorization" />
          </Form.Item>
        </Space>
      )}

      {authType === 'apikey' && (
        <Space direction="vertical" style={{ width: '100%' }}>
          <Form.Item label="Key 名称" name="apiKeyName">
            <Input placeholder="X-API-Key" />
          </Form.Item>
          <Form.Item label="Key 位置" name="apiKeyLocation" initialValue="header">
            <Radio.Group>
              <Radio value="header">Header</Radio>
              <Radio value="query">Query Param</Radio>
            </Radio.Group>
          </Form.Item>
          <Form.Item label="Credential" name="apiKeyCredential">
            <CredentialSelector credentialType="API_KEY" />
          </Form.Item>
        </Space>
      )}

      {authType === 'basic' && (
        <Space direction="vertical" style={{ width: '100%' }}>
          <Form.Item label="Username Credential" name="basicUsernameCredential">
            <CredentialSelector credentialType="BASIC_AUTH" />
          </Form.Item>
          <Form.Item label="Password Credential" name="basicPasswordCredential">
            <CredentialSelector credentialType="BASIC_AUTH" />
          </Form.Item>
        </Space>
      )}

      {authType === 'oauth2' && (
        <Space direction="vertical" style={{ width: '100%' }}>
          <Form.Item label="Token URL" name="oauth2TokenUrl">
            <Input placeholder="https://auth.example.com/oauth/token" />
          </Form.Item>
          <Form.Item label="Client ID" name="oauth2ClientId">
            <CredentialSelector credentialType="OAUTH2" />
          </Form.Item>
          <Form.Item label="Client Secret" name="oauth2ClientSecret">
            <CredentialSelector credentialType="OAUTH2" />
          </Form.Item>
        </Space>
      )}
    </Space>
  );
}

// SignatureBuilder Step
function SignatureBuilderStep() {
  const [signatureSource, setSignatureSource] = useState('header');

  return (
    <Space direction="vertical" style={{ width: '100%' }}>
      <Form.Item label="签名算法" name="signatureType" initialValue="hmac">
        <Select>
          <Select.Option value="hmac">HMAC-SHA256</Select.Option>
          <Select.Option value="rsa">RSA-SHA256</Select.Option>
          <Select.Option value="md5">MD5</Select.Option>
          <Select.Option value="none">None</Select.Option>
        </Select>
      </Form.Item>

      <Form.Item label="签名字段来源" name="signatureSource" initialValue="header">
        <Radio.Group onChange={(e) => setSignatureSource(e.target.value)}>
          <Radio value="header">Header</Radio>
          <Radio value="body">Body</Radio>
        </Radio.Group>
      </Form.Item>

      {signatureSource === 'header' && (
        <Form.Item label="字段名" name="signatureHeaderName" initialValue="X-Signature">
          <Input placeholder="X-Signature" style={{ width: 150 }} />
        </Form.Item>
      )}

      {signatureSource === 'body' && (
        <Form.Item label="字段路径" name="signatureBodyPath">
          <Input placeholder="signature" style={{ width: 150 }} />
        </Form.Item>
      )}

      <div style={{ fontWeight: 500, marginTop: 8, marginBottom: 8 }}>拼接规则</div>
      <SignatureRuleEditor />
    </Space>
  );
}

// RequestEncryptor Step
function RequestEncryptorStep() {
  const [encryptType, setEncryptType] = useState('aes');

  return (
    <Space direction="vertical" style={{ width: '100%' }}>
      <Form.Item label="加密算法" name="encryptType" initialValue="aes">
        <Select onChange={(val) => setEncryptType(val)}>
          <Select.Option value="aes">AES</Select.Option>
          <Select.Option value="rsa">RSA</Select.Option>
          <Select.Option value="sm4">国密SM4</Select.Option>
          <Select.Option value="none">None</Select.Option>
        </Select>
      </Form.Item>

      {encryptType !== 'none' && (
        <>
          <Form.Item label="加密字段" name="encryptFields">
            <Select mode="tags" placeholder="选择需加密的字段">
              <Select.Option value="body">完整请求体</Select.Option>
              <Select.Option value="header">Header</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item label="加密密钥来源" name="encryptCredential">
            <CredentialSelector credentialType="API_KEY" />
          </Form.Item>
        </>
      )}
    </Space>
  );
}

// HttpExecutor Step
function HttpExecutorStep() {
  return (
    <Space direction="vertical" style={{ width: '100%' }}>
      <Form.Item label="Endpoint" name="endpoint">
        <EndpointSelector />
      </Form.Item>

      <Space>
        <Form.Item label="超时时间" name="timeout" initialValue={30000}>
          <InputNumber min={1000} max={60000} step={1000} />
        </Form.Item>
        <Form.Item label="ms" name="timeoutUnit" style={{ marginLeft: 8 }}>
          <span style={{ color: '#666' }}>ms</span>
        </Form.Item>
      </Space>

      <Form.Item label="重试次数" name="retryCount" initialValue={0}>
        <InputNumber min={0} max={5} />
      </Form.Item>

      <Form.Item label="重试间隔" name="retryInterval" initialValue={1000}>
        <Space>
          <InputNumber min={100} max={10000} step={100} />
          <span style={{ color: '#666' }}>ms</span>
        </Space>
      </Form.Item>
    </Space>
  );
}

// ResponseDecryptor Step
function ResponseDecryptorStep() {
  const [decryptType, setDecryptType] = useState('aes');

  return (
    <Space direction="vertical" style={{ width: '100%' }}>
      <Form.Item label="解密算法" name="decryptType" initialValue="aes">
        <Select onChange={(val) => setDecryptType(val)}>
          <Select.Option value="aes">AES</Select.Option>
          <Select.Option value="rsa">RSA</Select.Option>
          <Select.Option value="sm4">国密SM4</Select.Option>
          <Select.Option value="none">None</Select.Option>
        </Select>
      </Form.Item>

      {decryptType !== 'none' && (
        <>
          <Form.Item label="解密密钥来源" name="decryptCredential">
            <CredentialSelector credentialType="API_KEY" />
          </Form.Item>
        </>
      )}
    </Space>
  );
}

// ResponseVerifier Step
function ResponseVerifierStep() {
  const [verifyType, setVerifyType] = useState('signature');

  return (
    <Space direction="vertical" style={{ width: '100%' }}>
      <Form.Item label="验签方式" name="verifyType" initialValue="signature">
        <Select onChange={(val) => setVerifyType(val)}>
          <Select.Option value="signature">签名验证</Select.Option>
          <Select.Option value="checksum">Checksum</Select.Option>
          <Select.Option value="none">None</Select.Option>
        </Select>
      </Form.Item>

      {verifyType === 'signature' && (
        <>
          <Form.Item label="签名算法" name="verifyAlgorithm" initialValue="hmac">
            <Select>
              <Select.Option value="hmac">HMAC-SHA256</Select.Option>
              <Select.Option value="rsa">RSA-SHA256</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item label="签名字段来源" name="verifySource">
            <CredentialSelector credentialType="API_KEY" />
          </Form.Item>
        </>
      )}
    </Space>
  );
}

// ResponseParser Step
function ResponseParserStep() {
  const [, setParseType] = useState('json');
  const [successRelation, setSuccessRelation] = useState('AND');

  return (
    <Space direction="vertical" style={{ width: '100%' }}>
      <Form.Item label="响应格式" name="parseType" initialValue="json">
        <Radio.Group onChange={(e) => setParseType(e.target.value)}>
          <Radio value="json">JSON</Radio>
          <Radio value="xml">XML</Radio>
          <Radio value="form">Form</Radio>
          <Radio value="plain">纯文本</Radio>
        </Radio.Group>
      </Form.Item>

      <div style={{ fontWeight: 500 }}>成功判断条件</div>
      <div style={{ padding: 16, background: '#fafafa', borderRadius: 4, marginBottom: 16 }}>
        <Space direction="vertical" style={{ width: '100%' }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <Input placeholder="字段路径" style={{ width: 200 }} />
            <Select defaultValue="=" style={{ width: 80 }}>
              <Select.Option value="=">=</Select.Option>
              <Select.Option value="!=">≠</Select.Option>
              <Select.Option value=">">&gt;</Select.Option>
              <Select.Option value=">=">≥</Select.Option>
              <Select.Option value="<">&lt;</Select.Option>
              <Select.Option value="<=">≤</Select.Option>
            </Select>
            <Input placeholder="期望值" style={{ width: 120 }} />
          </div>
          <Radio.Group value={successRelation} onChange={(e) => setSuccessRelation(e.target.value)}>
            <Radio value="AND">AND</Radio>
            <Radio value="OR">OR</Radio>
          </Radio.Group>
        </Space>
      </div>

      <div style={{ fontWeight: 500 }}>响应字段写入 contextVar（可选）</div>
      <div style={{ padding: 16, background: '#fafafa', borderRadius: 4 }}>
        <Space direction="vertical" style={{ width: '100%' }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <Input placeholder="响应字段路径" style={{ width: 180 }} />
            <span>→</span>
            <Input placeholder="写入变量名" style={{ width: 150 }} />
          </div>
        </Space>
      </div>
    </Space>
  );
}

// ResponseMapper Step (Step 10) - two sections
function ResponseMapperStep() {
  const [activeTab, setActiveTab] = useState<'section1' | 'section2'>('section1');
  const [responseData, setResponseData] = useState<{ sampleJson: string; fields: FieldDef[] }>({
    sampleJson: '{\n  "code": "00",\n  "message": "SUCCESS",\n  "data": {\n    "transactionId": "TXN_001"\n  }\n}',
    fields: [
      { key: 'code', fieldName: 'code', type: 'String' as const, required: false },
      { key: 'message', fieldName: 'message', type: 'String' as const, required: false },
      { key: 'data.transactionId', fieldName: 'data.transactionId', type: 'String' as const, required: false },
    ],
  });
  const [responseGroups, setResponseGroups] = useState([
    { id: '1', name: 'SUCCESS', fields: [
      { spiField: 'code', sourceType: 'fixed', sourceValue: '00' },
      { spiField: 'status', sourceType: 'fixed', sourceValue: 'SUCCESS' },
      { spiField: 'transactionId', sourceType: 'field', sourceValue: 'channelResponse.data.transactionId' },
    ]},
    { id: '2', name: 'FAILED', fields: [
      { spiField: 'code', sourceType: 'fixed', sourceValue: 'FAILED' },
      { spiField: 'status', sourceType: 'fixed', sourceValue: 'FAILED' },
    ]},
  ]);

  // Get channelResponse fields from section 1 for section 2 picker
  const channelResponseFields = responseData.fields.map(f => `channelResponse.${f.fieldName}`);

  const handleAddGroup = () => {
    const newGroup = {
      id: `group_${Date.now()}`,
      name: 'NEW_STATE',
      fields: [
        { spiField: 'code', sourceType: 'fixed', sourceValue: '' },
      ],
    };
    setResponseGroups([...responseGroups, newGroup]);
  };

  const handleRemoveGroup = (id: string) => {
    if (responseGroups.length > 1) {
      setResponseGroups(responseGroups.filter(g => g.id !== id));
    }
  };

  return (
    <Space direction="vertical" style={{ width: '100%' }}>
      {/* Section Tabs */}
      <Space style={{ marginBottom: 16 }}>
        <Tag
          color={activeTab === 'section1' ? 'blue' : 'default'}
          onClick={() => setActiveTab('section1')}
          style={{ cursor: 'pointer', padding: '4px 12px' }}
        >
          第一段：渠道响应 → channelResponse
        </Tag>
        <Tag
          color={activeTab === 'section2' ? 'green' : 'default'}
          onClick={() => setActiveTab('section2')}
          style={{ cursor: 'pointer', padding: '4px 12px' }}
        >
          第二段：channelResponse → SPI Response
        </Tag>
      </Space>

      {activeTab === 'section1' && (
        <JsonSampleEditor
          mode="response"
          value={responseData}
          onChange={(val) => setResponseData(val || { sampleJson: '', fields: [] })}
        />
      )}

      {activeTab === 'section2' && (
        <Space direction="vertical" style={{ width: '100%' }}>
          <div style={{ padding: 12, background: '#f6fff0', borderRadius: 4 }}>
            <div style={{ fontSize: 11, color: '#666' }}>
              💡 为每种终态配置 SPI Response 字段来源，系统根据渠道响应匹配对应分组。字段列表来自 spi.response 预置结构。
            </div>
          </div>

          {/* State Groups */}
          {responseGroups.map((group) => (
            <div key={group.id} style={{ marginBottom: 16, border: '1px solid #d9d9d9', borderRadius: 4 }}>
              <div style={{ padding: '8px 12px', background: '#fafafa', borderBottom: '1px solid #d9d9d9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Input
                  value={group.name}
                  addonBefore="终态分组"
                  style={{ width: 200, fontSize: 12 }}
                  onChange={(e) => {
                    const newGroups = responseGroups.map(g => g.id === group.id ? { ...g, name: e.target.value } : g);
                    setResponseGroups(newGroups);
                  }}
                />
                <Button
                  type="text"
                  danger
                  size="small"
                  onClick={() => handleRemoveGroup(group.id)}
                  disabled={responseGroups.length <= 1}
                >
                  删除分组
                </Button>
              </div>
              <div style={{ padding: 12 }}>
                <table style={{ width: '100%', fontSize: 11, borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#f5f5f5' }}>
                      <th style={{ padding: '4px 8px', textAlign: 'left', width: 150 }}>SPI Response字段</th>
                      <th style={{ padding: '4px 8px', textAlign: 'left', width: 180 }}>来源类型</th>
                      <th style={{ padding: '4px 8px', textAlign: 'left' }}>来源值</th>
                    </tr>
                  </thead>
                  <tbody>
                    {group.fields.map((field, idx) => (
                      <tr key={idx}>
                        <td style={{ padding: '4px 8px' }}>{field.spiField}</td>
                        <td style={{ padding: '4px 8px' }}>
                          <Radio.Group
                            value={field.sourceType}
                            onChange={(e) => {
                              const newGroups = responseGroups.map(g => {
                                if (g.id !== group.id) return g;
                                const newFields = g.fields.map((f, i) => i === idx ? { ...f, sourceType: e.target.value } : f);
                                return { ...g, fields: newFields };
                              });
                              setResponseGroups(newGroups);
                            }}
                          >
                            <Radio value="fixed">固定值</Radio>
                            <Radio value="field">字段引用</Radio>
                          </Radio.Group>
                        </td>
                        <td style={{ padding: '4px 8px' }}>
                          {field.sourceType === 'fixed' ? (
                            <Input
                              value={field.sourceValue}
                              onChange={(e) => {
                                const newGroups = responseGroups.map(g => {
                                  if (g.id !== group.id) return g;
                                  const newFields = g.fields.map((f, i) => i === idx ? { ...f, sourceValue: e.target.value } : f);
                                  return { ...g, fields: newFields };
                                });
                                setResponseGroups(newGroups);
                              }}
                              style={{ fontSize: 11, width: 150 }}
                            />
                          ) : (
                            <Select
                              value={field.sourceValue}
                              onChange={(val) => {
                                const newGroups = responseGroups.map(g => {
                                  if (g.id !== group.id) return g;
                                  const newFields = g.fields.map((f, i) => i === idx ? { ...f, sourceValue: val } : f);
                                  return { ...g, fields: newFields };
                                });
                                setResponseGroups(newGroups);
                              }}
                              style={{ fontSize: 11, width: 220 }}
                              placeholder="选择字段"
                            >
                              <Select.OptGroup label="channelResponse">
                                {channelResponseFields.map(f => (
                                  <Select.Option key={f} value={f}>{f}</Select.Option>
                                ))}
                              </Select.OptGroup>
                              <Select.OptGroup label="contextVar">
                                <Select.Option value="contextVar.requestId">contextVar.requestId</Select.Option>
                              </Select.OptGroup>
                            </Select>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}

          <Button type="dashed" onClick={handleAddGroup} style={{ width: '100%' }}>
            + 添加终态分组
          </Button>
        </Space>
      )}
    </Space>
  );
}

// Main L3-01 Steps Component
export default function L3HttpRequestSteps({
  currentStepIndex,
  form,
  readOnly = false,
}: {
  currentStepIndex: number;
  form: any;
  readOnly?: boolean;
}) {
  const steps = [
    { title: 'RequestBuilder', component: RequestBuilderStep, width: 720 },
    { title: 'RequestMapper', component: RequestMapperStep, width: 560 },
    { title: 'AuthHeaderBuilder', component: AuthHeaderBuilderStep, width: 480 },
    { title: 'SignatureBuilder', component: SignatureBuilderStep, optional: true, width: 480 },
    { title: 'RequestEncryptor', component: RequestEncryptorStep, optional: true, width: 520 },
    { title: 'HttpExecutor', component: HttpExecutorStep, width: 540 },
    { title: 'ResponseDecryptor', component: ResponseDecryptorStep, optional: true, width: 520 },
    { title: 'ResponseVerifier', component: ResponseVerifierStep, optional: true, width: 560 },
    { title: 'ResponseParser', component: ResponseParserStep, width: 600 },
    { title: 'ResponseMapper', component: ResponseMapperStep, width: 600 },
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

export const L3HttpRequestSteps_Config = {
  l3Code: 'L3-01',
  l3Name: 'HTTP Request',
  totalSteps: 10,
  steps: [
    { l2Code: 'L2-02', l2Name: 'RequestBuilder', isOptional: false, isEnabled: true, width: 720 },
    { l2Code: 'L2-10', l2Name: 'RequestMapper', isOptional: false, isEnabled: true, width: 560 },
    { l2Code: 'L2-03', l2Name: 'AuthHeaderBuilder', isOptional: false, isEnabled: true, width: 480 },
    { l2Code: 'L2-04', l2Name: 'SignatureBuilder', isOptional: true, isEnabled: false, width: 480 },
    { l2Code: 'L2-05', l2Name: 'RequestEncryptor', isOptional: true, isEnabled: false, width: 520 },
    { l2Code: 'L2-06', l2Name: 'HttpExecutor', isOptional: false, isEnabled: true, width: 540 },
    { l2Code: 'L2-07', l2Name: 'ResponseDecryptor', isOptional: true, isEnabled: false, width: 520 },
    { l2Code: 'L2-08', l2Name: 'ResponseVerifier', isOptional: true, isEnabled: false, width: 560 },
    { l2Code: 'L2-09', l2Name: 'ResponseParser', isOptional: false, isEnabled: true, width: 600 },
    { l2Code: 'L2-12', l2Name: 'ResponseMapper', isOptional: false, isEnabled: true, width: 600 },
  ],
};

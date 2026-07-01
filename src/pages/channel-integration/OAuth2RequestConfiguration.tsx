import { useMemo, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Checkbox,
  Collapse,
  Divider,
  Form,
  Input,
  Radio,
  Select,
  Space,
  Switch,
  Tag,
  Tabs,
  Typography,
} from 'antd';
import type { FormInstance } from 'antd';
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import type { AuthConfig, CredentialItem } from './channelScopeStore';

const { Text, Title } = Typography;
const { TextArea } = Input;

const dataTypeOptions = ['String', 'Integer', 'Long', 'Boolean', 'Object', 'Array'].map((value) => ({ label: value, value }));
const messageFormatOptions = ['Custom', 'FORM_DATA', 'JSON', 'X_WWW_FORM_URLENCODED', 'XML'].map((value) => ({ label: value, value }));
const signingOptions = ['Custom', 'HMAC (SHA256)', 'HMAC (SHA512)', 'MD5', 'RSA (SHA1)', 'RSA (SHA256)', 'RSA (SHA512)', 'SHA1', 'SHA256', 'SHA512'].map((value) => ({ label: value, value }));
const encryptionOptions = ['AES (CBC)', 'AES (ECB)', 'Custom', 'RSA'].map((value) => ({ label: value, value }));
const sourceLocationOptions = [
  { label: 'Path Variables', value: 'pathVariables' },
  { label: 'Query Parameters', value: 'queryParameters' },
  { label: 'Request Headers', value: 'requestHeaders' },
  { label: 'Request Body', value: 'requestBody' },
];
const responseLocationOptions = [
  { label: 'Response Header', value: 'responseHeaders' },
  { label: 'Response Body', value: 'responseBody' },
];

const gridStyle = {
  display: 'grid',
  gridTemplateColumns: 'minmax(130px, 1.1fr) 110px 90px minmax(130px, 1fr) 150px minmax(150px, 1fr) 32px',
  gap: 8,
  alignItems: 'start',
} as const;

const responseGridStyle = {
  display: 'grid',
  gridTemplateColumns: 'minmax(150px, 1.2fr) 110px 90px minmax(150px, 1fr) 32px',
  gap: 8,
  alignItems: 'start',
} as const;

function EmptySection({ text }: { text: string }) {
  return <div style={{ padding: '14px 16px', color: '#8c8c8c', background: '#fafafa', borderRadius: 6 }}>{text}</div>;
}

function ValueSourceField({ form, listName, index, credentials }: { form: FormInstance; listName: string; index: number; credentials: CredentialItem[] }) {
  const sourceType = Form.useWatch([listName, index, 'sourceType'], form);
  const options = sourceType === 'generated'
    ? [
        { label: 'Current Timestamp', value: 'timestamp' },
        { label: 'UUID', value: 'uuid' },
        { label: 'Random Number', value: 'randomNumber' },
      ]
    : credentials.map((item) => ({ label: item.key, value: item.key }));

  return (
    <Form.Item name={[index, 'sourceValue']} rules={[{ required: true, message: 'Select value' }]} style={{ marginBottom: 8 }}>
      <Select placeholder={sourceType === 'generated' ? 'Generated value' : 'Credential field'} options={options} />
    </Form.Item>
  );
}

function RequestFieldList({ form, name, credentials, emptyText }: { form: FormInstance; name: string; credentials: CredentialItem[]; emptyText: string }) {
  return (
    <Form.List name={name}>
      {(fields, { add, remove }) => (
        <>
          {fields.length === 0 ? <EmptySection text={emptyText} /> : (
            <>
              <div style={{ ...gridStyle, padding: '0 2px 6px', color: '#8c8c8c', fontSize: 12 }}>
                <span>API Field</span><span>Type</span><span>MOC</span><span>Description</span><span>Value Source</span><span>Source Value</span><span />
              </div>
              {fields.map((field) => (
                <div key={field.key} style={gridStyle}>
                  <Form.Item name={[field.name, 'name']} rules={[{ required: true, message: 'Enter field' }]} style={{ marginBottom: 8 }}>
                    <Input placeholder="Field name" />
                  </Form.Item>
                  <Form.Item name={[field.name, 'type']} initialValue="String" style={{ marginBottom: 8 }}>
                    <Select options={dataTypeOptions} />
                  </Form.Item>
                  <Form.Item name={[field.name, 'moc']} initialValue="yes" style={{ marginBottom: 8 }}>
                    <Select options={[{ label: 'Yes', value: 'yes' }, { label: 'No', value: 'no' }]} />
                  </Form.Item>
                  <Form.Item name={[field.name, 'description']} style={{ marginBottom: 8 }}>
                    <Input placeholder="Optional" />
                  </Form.Item>
                  <Form.Item name={[field.name, 'sourceType']} initialValue="credential" style={{ marginBottom: 8 }}>
                    <Select options={[{ label: 'Credential Field', value: 'credential' }, { label: 'Generated Value', value: 'generated' }]} />
                  </Form.Item>
                  <ValueSourceField form={form} listName={name} index={field.name} credentials={credentials} />
                  <Button type="text" danger icon={<DeleteOutlined />} aria-label="Delete field" onClick={() => remove(field.name)} />
                </div>
              ))}
            </>
          )}
          <Button type="dashed" block icon={<PlusOutlined />} onClick={() => add({ type: 'String', moc: 'yes', sourceType: 'credential' })} style={{ marginTop: 8 }}>
            Add field
          </Button>
        </>
      )}
    </Form.List>
  );
}

function ResponseFieldList({ name, emptyText }: { name: string; emptyText: string }) {
  return (
    <Form.List name={name}>
      {(fields, { add, remove }) => (
        <>
          {fields.length === 0 ? <EmptySection text={emptyText} /> : (
            <>
              <div style={{ ...responseGridStyle, padding: '0 2px 6px', color: '#8c8c8c', fontSize: 12 }}>
                <span>API Field</span><span>Type</span><span>MOC</span><span>Description</span><span />
              </div>
              {fields.map((field) => (
                <div key={field.key} style={responseGridStyle}>
                  <Form.Item name={[field.name, 'name']} rules={[{ required: true, message: 'Enter field' }]} style={{ marginBottom: 8 }}>
                    <Input placeholder="Field name" />
                  </Form.Item>
                  <Form.Item name={[field.name, 'type']} initialValue="String" style={{ marginBottom: 8 }}>
                    <Select options={dataTypeOptions} />
                  </Form.Item>
                  <Form.Item name={[field.name, 'moc']} initialValue="yes" style={{ marginBottom: 8 }}>
                    <Select options={[{ label: 'Yes', value: 'yes' }, { label: 'No', value: 'no' }]} />
                  </Form.Item>
                  <Form.Item name={[field.name, 'description']} style={{ marginBottom: 8 }}>
                    <Input placeholder="Optional" />
                  </Form.Item>
                  <Button type="text" danger icon={<DeleteOutlined />} aria-label="Delete field" onClick={() => remove(field.name)} />
                </div>
              ))}
            </>
          )}
          <Button type="dashed" block icon={<PlusOutlined />} onClick={() => add({ type: 'String', moc: 'yes' })} style={{ marginTop: 8 }}>
            Add field
          </Button>
        </>
      )}
    </Form.List>
  );
}

function ScriptEditor({ name, label = 'Custom Script' }: { name: string; label?: string }) {
  return (
    <Form.Item label={label} name={name} rules={[{ required: true, message: 'Enter script' }]}>
      <TextArea
        rows={8}
        placeholder={'def execute(param) {\n  return null;\n}\n\nexecute(param);'}
        style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace', background: '#1f1f1f', color: '#f5f5f5' }}
      />
    </Form.Item>
  );
}

function SecuritySection({ form, authentications, currentAuthId, mode }: { form: FormInstance; authentications: AuthConfig[]; currentAuthId?: string; mode: 'authentication' | 'processing' }) {
  const authenticationEnabled = Form.useWatch('oauthSecurityAuthenticationEnabled', form);
  const signingEnabled = Form.useWatch('oauthSecuritySigningEnabled', form);
  const verificationEnabled = Form.useWatch('oauthSecurityVerificationEnabled', form);
  const encryptionEnabled = Form.useWatch('oauthSecurityEncryptionEnabled', form);
  const decryptionEnabled = Form.useWatch('oauthSecurityDecryptionEnabled', form);
  const destinationMode = Form.useWatch('oauthSecurityAuthenticationDestinationMode', form);
  const availableAuth = authentications
    .filter((item) => item.id !== currentAuthId)
    .map((item) => ({ label: `${item.name} · ${item.type}`, value: item.id }));

  return (
    <Collapse
      items={[
        {
          key: 'authentication',
          label: <Space><Form.Item name="oauthSecurityAuthenticationEnabled" valuePropName="checked" noStyle><Switch size="small" /></Form.Item><span>Authentication Scheme</span></Space>,
          children: authenticationEnabled ? (
            <>
              <Alert type="info" showIcon title="The current scheme is excluded from the selectable list." style={{ marginBottom: 16 }} />
              <Form.Item label="Authentication Scheme" name="oauthSecurityAuthenticationId" rules={[{ required: true, message: 'Select a scheme' }]}>
                <Select placeholder="Select another Authentication Scheme" options={availableAuth} />
              </Form.Item>
              <Form.Item label="Auth Destination" name="oauthSecurityAuthenticationDestinationMode" initialValue="default">
                <Radio.Group options={[{ label: 'Default', value: 'default' }, { label: 'Custom', value: 'custom' }]} />
              </Form.Item>
              {destinationMode === 'custom' && (
                <Space align="start" style={{ width: '100%' }}>
                  <Form.Item name="oauthSecurityAuthenticationDestinationLocation" rules={[{ required: true, message: 'Select location' }]} style={{ minWidth: 220 }}>
                    <Select placeholder="Field location" options={sourceLocationOptions} />
                  </Form.Item>
                  <Form.Item name="oauthSecurityAuthenticationDestinationField" rules={[{ required: true, message: 'Enter field' }]} style={{ minWidth: 260 }}>
                    <Input placeholder="Destination field name" />
                  </Form.Item>
                </Space>
              )}
            </>
          ) : <Text type="secondary">Enable to apply another Authentication Scheme to the token request.</Text>,
        },
        {
          key: 'signing',
          label: <Space><Form.Item name="oauthSecuritySigningEnabled" valuePropName="checked" noStyle><Switch size="small" /></Form.Item><span>Signing</span></Space>,
          children: signingEnabled ? (
            <>
              <Form.Item label="Signing Algorithm" name="oauthSecuritySigningAlgorithm" rules={[{ required: true, message: 'Select an algorithm' }]}>
                <Select options={signingOptions} placeholder="Select algorithm" />
              </Form.Item>
              <Form.Item label="Signing Source Fields" name="oauthSecuritySigningSources" rules={[{ required: true, message: 'Select source fields' }]}>
                <Checkbox.Group options={sourceLocationOptions} />
              </Form.Item>
              <Space align="start" style={{ width: '100%' }}>
                <Form.Item label="Destination Location" name="oauthSecuritySigningDestinationLocation" rules={[{ required: true, message: 'Select location' }]} style={{ minWidth: 220 }}>
                  <Select options={sourceLocationOptions} />
                </Form.Item>
                <Form.Item label="Destination Field" name="oauthSecuritySigningDestinationField" rules={[{ required: true, message: 'Enter field' }]} style={{ minWidth: 260 }}>
                  <Input />
                </Form.Item>
              </Space>
              <ScriptEditor name="oauthSecuritySigningScript" />
            </>
          ) : <Text type="secondary">Enable to sign selected request fields.</Text>,
        },
        {
          key: 'verification',
          label: <Space><Form.Item name="oauthSecurityVerificationEnabled" valuePropName="checked" noStyle><Switch size="small" /></Form.Item><span>Signature Verification</span></Space>,
          children: verificationEnabled ? (
            <>
              <Form.Item label="Verification Algorithm" name="oauthSecurityVerificationAlgorithm" rules={[{ required: true, message: 'Select an algorithm' }]}>
                <Select options={signingOptions} placeholder="Select algorithm" />
              </Form.Item>
              <Space align="start" style={{ width: '100%' }}>
                <Form.Item label="Response Signature Location" name="oauthSecuritySignatureLocation" rules={[{ required: true, message: 'Select location' }]} style={{ minWidth: 220 }}>
                  <Select options={responseLocationOptions} />
                </Form.Item>
                <Form.Item label="Response Signature Field" name="oauthSecuritySignatureField" rules={[{ required: true, message: 'Enter field' }]} style={{ minWidth: 260 }}>
                  <Input />
                </Form.Item>
              </Space>
              <Form.Item label="Verification Source Fields" name="oauthSecurityVerificationSources" rules={[{ required: true, message: 'Select source fields' }]}>
                <Checkbox.Group options={responseLocationOptions} />
              </Form.Item>
              <ScriptEditor name="oauthSecurityVerificationScript" />
            </>
          ) : <Text type="secondary">Enable to verify the response signature.</Text>,
        },
        {
          key: 'encryption',
          label: <Space><Form.Item name="oauthSecurityEncryptionEnabled" valuePropName="checked" noStyle><Switch size="small" /></Form.Item><span>Encryption</span></Space>,
          children: encryptionEnabled ? (
            <>
              <Form.Item label="Encryption Algorithm" name="oauthSecurityEncryptionAlgorithm" rules={[{ required: true, message: 'Select an algorithm' }]}>
                <Select options={encryptionOptions} />
              </Form.Item>
              <Form.Item label="Encryption Source Fields" name="oauthSecurityEncryptionSources" rules={[{ required: true, message: 'Select source fields' }]}>
                <Checkbox.Group options={sourceLocationOptions} />
              </Form.Item>
              <Space align="start" style={{ width: '100%' }}>
                <Form.Item label="Destination Location" name="oauthSecurityEncryptionDestinationLocation" rules={[{ required: true, message: 'Select location' }]} style={{ minWidth: 220 }}>
                  <Select options={sourceLocationOptions} />
                </Form.Item>
                <Form.Item label="Encrypted Destination Field" name="oauthSecurityEncryptionDestinationField" rules={[{ required: true, message: 'Enter field' }]} style={{ minWidth: 260 }}>
                  <Input />
                </Form.Item>
              </Space>
            </>
          ) : <Text type="secondary">Enable to encrypt selected request fields.</Text>,
        },
        {
          key: 'decryption',
          label: <Space><Form.Item name="oauthSecurityDecryptionEnabled" valuePropName="checked" noStyle><Switch size="small" /></Form.Item><span>Decryption</span></Space>,
          children: decryptionEnabled ? (
            <>
              <Form.Item label="Decryption Algorithm" name="oauthSecurityDecryptionAlgorithm" rules={[{ required: true, message: 'Select an algorithm' }]}>
                <Select options={encryptionOptions} />
              </Form.Item>
              <Space align="start" style={{ width: '100%' }}>
                <Form.Item label="Encrypted Field Location" name="oauthSecurityEncryptedLocation" rules={[{ required: true, message: 'Select location' }]} style={{ minWidth: 220 }}>
                  <Select options={responseLocationOptions} />
                </Form.Item>
                <Form.Item label="Response Encrypted Field" name="oauthSecurityEncryptedField" rules={[{ required: true, message: 'Enter field' }]} style={{ minWidth: 260 }}>
                  <Input />
                </Form.Item>
              </Space>
              <Form.Item label="Decryption Source Fields" name="oauthSecurityDecryptionSources" rules={[{ required: true, message: 'Select source fields' }]}>
                <Checkbox.Group options={responseLocationOptions} />
              </Form.Item>
            </>
          ) : <Text type="secondary">Enable to decrypt selected response fields.</Text>,
        },
      ].filter((item) => mode === 'authentication' ? item.key === 'authentication' : item.key !== 'authentication')}
    />
  );
}

interface Props {
  form: FormInstance;
  credentials: CredentialItem[];
  credentialVersion: string;
  authentications: AuthConfig[];
  currentAuthId?: string;
}

export default function OAuth2RequestConfiguration({ form, credentials, credentialVersion, authentications, currentAuthId }: Props) {
  const requestInstance = Form.useWatch('oauthRequestInstance', form) ?? 'default';
  const responseInstance = Form.useWatch('oauthResponseInstance', form) ?? 'default';
  const responseCodeMode = Form.useWatch('oauthResponseCodeMode', form) ?? 'default';
  const path = Form.useWatch('oauthPath', form) ?? '';
  const requestBody = Form.useWatch('oauthRequestBody', form) ?? [];
  const responseHeaders = Form.useWatch('oauthResponseHeaders', form) ?? [];
  const responseBody = Form.useWatch('oauthResponseBody', form) ?? [];
  const authName = Form.useWatch('name', form) ?? 'OAuth 2 Scheme';
  const [activeTab, setActiveTab] = useState('params');
  const pathVariables = useMemo(() => {
    const variables: string[] = [];
    const pattern = /\{([^}]+)\}/g;
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(String(path))) !== null) variables.push(match[1]);
    return variables;
  }, [path]);
  const requestBodyOptions = requestBody.filter((item: { name?: string }) => item?.name).map((item: { name: string }) => ({ label: item.name, value: item.name }));
  const responseFieldOptions = [
    ...responseHeaders.filter((item: { name?: string }) => item?.name).map((item: { name: string }) => ({ label: `Header · ${item.name}`, value: `header.${item.name}` })),
    ...responseBody.filter((item: { name?: string }) => item?.name).map((item: { name: string }) => ({ label: `Body · ${item.name}`, value: `body.${item.name}` })),
  ];
  const combinedSourceOptions = [
    { label: 'Credential Fields', options: credentials.map((item) => ({ label: item.key, value: `credential.${item.key}` })) },
    { label: 'Generated Data', options: [
      { label: 'Current Timestamp', value: 'generated.timestamp' },
      { label: 'UUID', value: 'generated.uuid' },
      { label: 'Random Number', value: 'generated.randomNumber' },
    ] },
  ];

  return (
    <div style={{ maxWidth: 1180, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <Space size={10}><Text strong style={{ fontSize: 16 }}>{authName}</Text><Tag color="blue">OAuth 2</Tag></Space>
        <Space><Text type="secondary">Credential Version</Text><Tag style={{ margin: 0 }}>{credentialVersion || '—'}</Tag></Space>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '130px 120px minmax(360px, 1fr)', gap: 0, marginBottom: 6 }}>
        <Form.Item name="oauthMethod" initialValue="POST" rules={[{ required: true }]} style={{ margin: 0 }}>
          <Select size="large" options={['POST', 'GET', 'PUT', 'DELETE'].map((value) => ({ label: value, value }))} />
        </Form.Item>
        <Form.Item name="oauthProtocol" initialValue="HTTPS" rules={[{ required: true }]} style={{ margin: '0 0 0 8px' }}>
          <Select size="large" options={[{ label: 'HTTPS', value: 'HTTPS' }, { label: 'HTTP', value: 'HTTP' }]} />
        </Form.Item>
        <Form.Item name="oauthPath" rules={[{ required: true, message: 'Enter request path' }]} style={{ margin: '0 0 0 8px' }}>
          <Input size="large" placeholder="/oauth/token" />
        </Form.Item>
      </div>
      <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>Configure the channel token endpoint directly. No standalone Endpoint reference is created.</Text>

      <Card styles={{ body: { paddingTop: 0, minHeight: 500 } }}>
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          tabBarGutter={24}
          items={[
            {
              key: 'params',
              label: `Params${pathVariables.length ? ` ${pathVariables.length}` : ''}`,
              children: (
                <>
                  <Title level={5}>Path Variables</Title>
                  {pathVariables.length === 0 ? <EmptySection text="Path variables appear automatically when the request path contains {field}." /> : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {pathVariables.map((item) => (
                        <div key={item} style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 12, alignItems: 'center' }}>
                          <Input value={item} disabled />
                          <Form.Item name={['oauthPathMappings', item]} rules={[{ required: true, message: 'Select value source' }]} style={{ margin: 0 }}>
                            <Select placeholder="Credential field or generated data" options={combinedSourceOptions} />
                          </Form.Item>
                        </div>
                      ))}
                    </div>
                  )}
                  <Divider />
                  <Title level={5}>Query Parameters</Title>
                  <RequestFieldList form={form} name="oauthQueryParameters" credentials={credentials} emptyText="No query parameters configured." />
                </>
              ),
            },
            {
              key: 'authorization',
              label: 'Authorization',
              children: <SecuritySection form={form} authentications={authentications} currentAuthId={currentAuthId} mode="authentication" />,
            },
            {
              key: 'headers',
              label: 'Headers',
              children: <RequestFieldList form={form} name="oauthRequestHeaders" credentials={credentials} emptyText="No request headers configured." />,
            },
            {
              key: 'body',
              label: 'Body',
              children: (
                <>
                  <Form.Item label="Request Message Format" name="oauthRequestMessageFormat" initialValue="JSON" rules={[{ required: true }]}>
                    <Radio.Group optionType="button" buttonStyle="solid" options={messageFormatOptions} />
                  </Form.Item>
                  <RequestFieldList form={form} name="oauthRequestBody" credentials={credentials} emptyText="No request body fields configured." />
                  <Divider />
                  <Form.Item label="Fields Included in Request" name="oauthRequestBodyFieldMode" initialValue="all">
                    <Radio.Group options={[{ label: 'All Fields', value: 'all' }, { label: 'Choose Fields', value: 'selected' }]} />
                  </Form.Item>
                  <Form.Item noStyle shouldUpdate={(prev, next) => prev.oauthRequestBodyFieldMode !== next.oauthRequestBodyFieldMode}>
                    {({ getFieldValue }) => getFieldValue('oauthRequestBodyFieldMode') === 'selected' ? (
                      <Form.Item name="oauthSelectedRequestBodyFields" rules={[{ required: true, message: 'Select fields' }]}>
                        <Select mode="multiple" placeholder="Select request body fields" options={requestBodyOptions} />
                      </Form.Item>
                    ) : null}
                  </Form.Item>
                </>
              ),
            },
            {
              key: 'security',
              label: 'Security',
              children: <SecuritySection form={form} authentications={authentications} currentAuthId={currentAuthId} mode="processing" />,
            },
            {
              key: 'response',
              label: 'Response',
              children: (
                <>
                  <Form.Item label="Response Message Format" name="oauthResponseMessageFormat" initialValue="JSON" rules={[{ required: true }]}>
                    <Radio.Group optionType="button" buttonStyle="solid" options={messageFormatOptions} />
                  </Form.Item>
                  <Title level={5}>Response Header</Title>
                  <ResponseFieldList name="oauthResponseHeaders" emptyText="No response headers configured." />
                  <Divider />
                  <Title level={5}>Response Body</Title>
                  <ResponseFieldList name="oauthResponseBody" emptyText="No response body fields configured." />
                </>
              ),
            },
            {
              key: 'mapping',
              label: 'Mapping',
              children: (
                <>
                  <Title level={5}>Request Mapping</Title>
                  <Form.Item name="oauthRequestInstance" initialValue="default" rules={[{ required: true }]}>
                    <Radio.Group optionType="button" buttonStyle="solid" options={[{ label: 'Default', value: 'default' }, { label: 'Custom Script', value: 'custom' }]} />
                  </Form.Item>
                  {requestInstance === 'custom' ? <ScriptEditor name="oauthRequestCustomScript" /> : (
                    <Alert type="info" showIcon title="Default mapping" description="Configure each API field's source alongside the field in Params, Headers, and Body." />
                  )}
                  <Divider />
                  <Title level={5}>Response Mapping</Title>
                  <Form.Item name="oauthResponseInstance" initialValue="default" rules={[{ required: true }]}>
                    <Radio.Group optionType="button" buttonStyle="solid" options={[{ label: 'Default', value: 'default' }, { label: 'Custom Script', value: 'custom' }]} />
                  </Form.Item>
                  {responseInstance === 'custom' ? <ScriptEditor name="oauthResponseCustomScript" /> : (
                    <>
                      <Alert type="info" showIcon title="OAuth 2 outputs are fixed" description="Token is required. Expiry can also be mapped when Fixed Expiry Duration is selected." style={{ marginBottom: 16 }} />
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                        <Form.Item label="Token" name="oauthTokenSourceField" rules={[{ required: true, message: 'Map an API response field to Token' }]}>
                          <Select placeholder="Select API response field" options={responseFieldOptions} />
                        </Form.Item>
                        <Form.Item label="Expiry" name="oauthExpirySourceField">
                          <Select allowClear placeholder="Optional API response field" options={responseFieldOptions} />
                        </Form.Item>
                      </div>
                    </>
                  )}
                </>
              ),
            },
            {
              key: 'responseCode',
              label: 'Response Code',
              children: (
                <>
                  <Alert type="warning" showIcon title="Fallback behavior" description="Component Instance determines the order status when a response code does not match any configured platform response code." style={{ marginBottom: 16 }} />
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                    <Form.Item label="Component Instance" name="oauthResponseCodeInstance" initialValue="FAIL" rules={[{ required: true }]}>
                      <Select options={[{ label: 'FAIL', value: 'FAIL' }, { label: 'PENDING', value: 'PENDING' }]} />
                    </Form.Item>
                    <Form.Item label="Assembly Mode" name="oauthResponseCodeMode" initialValue="default">
                      <Radio.Group options={[{ label: 'Default', value: 'default' }, { label: 'Custom', value: 'custom' }]} />
                    </Form.Item>
                  </div>
                  {responseCodeMode === 'custom' ? <ScriptEditor name="oauthResponseCodeScript" /> : (
                    <>
                      <Form.Item label="Response Code Assembly" name="oauthResponseCodeAssembly" rules={[{ required: true, message: 'Select at least one field' }]}>
                        <Select mode="multiple" placeholder="Choose fields in assembly order" options={[
                          { label: 'HTTP Status Code', value: '$httpStatus' },
                          { label: 'Response Header Field', value: '$responseHeader' },
                          { label: 'Response Body Field', value: '$responseBody' },
                        ]} />
                      </Form.Item>
                      <Form.Item label="Response Message Field" name="oauthResponseMessageField">
                        <Input placeholder="Optional response field path, e.g. message" />
                      </Form.Item>
                    </>
                  )}
                </>
              ),
            },
          ]}
        />
      </Card>
    </div>
  );
}

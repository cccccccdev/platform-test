import { useMemo, useState } from 'react';
import { Button, Card, Cascader, Checkbox, ConfigProvider, Drawer, Form, Input, Radio, Select, Space, Switch, Tabs, Tag, Typography } from 'antd';
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import { useChannelScopeStore } from './channelScopeStore';
import BodySchemaMappingEditor from './BodySchemaMappingEditor';
import FlatFieldMappingEditor from './FlatFieldMappingEditor';
import { mappingOperationOptions } from './mappingOperationOptions';
import GroovyScriptEditor from './GroovyScriptEditor';
import PathVariableMappingEditor from './PathVariableMappingEditor';

const { Text } = Typography;
const types = ['String', 'Integer', 'Long', 'Boolean', 'Object', 'Array'].map((value) => ({ label: value, value }));
const flatTypes = types.filter((option) => !['Object', 'Array'].includes(option.value));
const formats = ['Custom', 'FORM_DATA', 'JSON', 'X_WWW_FORM_URLENCODED', 'XML'].map((value) => ({ label: value, value }));
const generated = [
  { label: 'Current Timestamp', value: 'generated.current-timestamp', type: 'Long' },
  { label: 'UUID', value: 'generated.uuid', type: 'String' },
  { label: 'Random Number', value: 'generated.random-number', type: 'Long' },
];
const signing = ['Custom', 'HMAC (SHA256)', 'HMAC (SHA512)', 'MD5', 'RSA (SHA1)', 'RSA (SHA256)', 'RSA (SHA512)', 'SHA1', 'SHA256', 'SHA512'].map((value) => ({ label: value, value }));
const encryption = ['AES (CBC)', 'AES (ECB)', 'Custom', 'RSA'].map((value) => ({ label: value, value }));
const requestScriptHelp = `/**
* @param
* param._credential (JSONObject)
* param._globalVariable (JSONObject)
* param._order (JSONObject)
* @return JSONObject containing pathVariables, queryParameters, requestHeaders and requestBody
*/`;
const responseScriptHelp = `/**
* @param param
* param._globalVariable (JSONObject)
* param._order (JSONObject)
* param._responseHeader (JSONObject)
* param._responseBody (JSONObject)
* @return Order
*/`;

const Dot = ({ color }: { color: string }) => <span style={{ display: 'inline-block', width: 7, height: 7, borderRadius: 7, background: color }} />;
const tabLabel = (label: string, state: 'empty' | 'ok' | 'error') => <Space size={6}><span>{label}</span>{state !== 'empty' && <Dot color={state === 'ok' ? '#52c41a' : '#ff4d4f'} />}</Space>;
const emptyStyle = { padding: 14, color: '#8c8c8c', background: '#fafafa', borderRadius: 6 } as const;
function OrderVariableMapping({ sourceOptions, targetOptions }: { sourceOptions: Array<{ label: string; value: string; type: string }>; targetOptions: Array<{ label: string; value: string; type: string }> }) {
  const sourceType = (value?: string) => sourceOptions.find((item) => item.value === value)?.type ?? 'String';
  const targetType = (value?: string) => targetOptions.find((item) => item.value === value)?.type ?? 'String';
  return <Form.List name="orderWrites">{(fields, { add, remove }) => <div style={{ border: '1px solid #e8e8e8', borderRadius: 8, overflow: 'hidden' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', background: '#fafafa', borderBottom: '1px solid #e8e8e8' }}><Space size={8}><Text strong>SPI to Order Variable Mapping</Text><Tag style={{ margin: 0 }}>{fields.length} fields</Tag></Space><Button size="small" type="primary" ghost icon={<PlusOutlined />} onClick={() => add()}>Add Mapping</Button></div>
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(180px,1fr) 85px 24px 150px 24px minmax(180px,1fr) 85px 36px', gap: 8, padding: '7px 8px', color: '#8c8c8c', fontSize: 11, borderBottom: '1px solid #f0f0f0' }}><span>SPI VALUE</span><span>SOURCE TYPE</span><span /><span>OPERATION</span><span /><span>ORDER VARIABLE</span><span>TARGET TYPE</span><span /></div>
    {fields.map((field) => <Form.Item key={field.key} noStyle shouldUpdate>{({ getFieldValue }) => {
      const source = getFieldValue(['orderWrites', field.name, 'source']);
      const target = getFieldValue(['orderWrites', field.name, 'target']);
      return <div style={{ display: 'grid', gridTemplateColumns: 'minmax(180px,1fr) 85px 24px 150px 24px minmax(180px,1fr) 85px 36px', gap: 8, alignItems: 'center', padding: '6px 8px', borderBottom: '1px solid #f5f5f5' }}>
        <Form.Item name={[field.name, 'source']} rules={[{ required: true }]} style={{ margin: 0 }}><Select placeholder="SPI field" options={sourceOptions} /></Form.Item><Text>{sourceType(source)}</Text><span>→</span><Form.Item name={[field.name, 'operation']} style={{ margin: 0 }}><Cascader allowClear placeholder="Optional" options={mappingOperationOptions} expandTrigger="click" /></Form.Item><span>→</span><Form.Item name={[field.name, 'target']} rules={[{ required: true }]} style={{ margin: 0 }}><Select placeholder="Order Variable" options={targetOptions} /></Form.Item><Text>{targetType(target)}</Text><Button type="text" danger icon={<DeleteOutlined />} onClick={() => remove(field.name)} />
      </div>;
    }}</Form.Item>)}
    {fields.length === 0 && <div style={emptyStyle}>No mappings configured.</div>}
  </div>}</Form.List>;
}

type Props = { open: boolean; channelCode: string; onClose: () => void; onSave: (config: Record<string, unknown>) => void };

export default function HttpCallDrawer({ open, channelCode, onClose, onSave }: Props) {
  const [form] = Form.useForm();
  const [activeTab, setActiveTab] = useState('request');
  const [, force] = useState(0);
  const store = useChannelScopeStore();
  const credentials = store.credentialsByChannel[channelCode] ?? [];
  const globals = store.globalVariablesByChannel[channelCode] ?? [];
  const orders = store.orderVariablesByChannel[channelCode] ?? [];
  const auth = store.authenticationsByChannel[channelCode] ?? [];
  const spiRequest = ['amount', 'currency', 'reference', 'customerId', 'accountNumber', 'bankCode', 'timestamp'];
  const spiResponse = ['responseCode', 'responseMessage', 'status', 'channelReference', 'amount', 'currency', 'customerId'];
  const requestTypes: Record<string, string> = { amount: 'Long', timestamp: 'Long' };
  const responseTypes: Record<string, string> = { amount: 'Long' };
  const requestContextOptions = [
    { label: 'SPI Request', options: spiRequest.map(v => ({ label: v, value: `spi.request.${v}`, type: requestTypes[v] ?? 'String' })) },
    { label: 'Global Variables', options: globals.map(v => ({ label: v.name, value: `global.${v.name}`, type: 'String' })) },
    { label: 'Order Variables', options: orders.map(v => ({ label: v.name, value: `order.${v.name}`, type: 'String' })) },
    { label: 'Credentials', options: credentials.map(v => ({ label: v.key, value: `credential.${v.key}`, type: 'String' })) },
  ];
  const responseContextOptions = [
    { label: 'SPI Response', options: spiResponse.map(v => ({ label: v, value: `spi.response.${v}`, type: responseTypes[v] ?? 'String' })) },
    { label: 'Global Variables', options: globals.map(v => ({ label: v.name, value: `global.${v.name}`, type: 'String' })) },
    { label: 'Order Variables', options: orders.map(v => ({ label: v.name, value: `order.${v.name}`, type: 'String' })) },
  ];
  const pathSourceOptions = [
    ...requestContextOptions.map((group) => ({ label: group.label, value: group.label, children: group.options.map(({ label, value, type }) => ({ label, value, type })) })),
    { label: 'Generated Data', value: 'generated', children: generated },
  ];
  const spiReqOptions = spiRequest.map(v => ({ label: v, value: `spi.request.${v}`, type: requestTypes[v] ?? 'String' }));
  const orderOptions = orders.map(v => ({ label: v.name, value: v.name, type: 'String' }));
  const requestMode = Form.useWatch('requestMode', form) ?? 'configuration';
  const responseMode = Form.useWatch('responseMode', form) ?? 'configuration';
  const authEnabled = Form.useWatch('authEnabled', form);
  const authDestination = Form.useWatch('authDestination', form) ?? 'default';
  const signingEnabled = Form.useWatch('signingEnabled', form);
  const encryptionEnabled = Form.useWatch('encryptionEnabled', form);
  const verificationEnabled = Form.useWatch('verificationEnabled', form);
  const decryptionEnabled = Form.useWatch('decryptionEnabled', form);
  const responseCodeMode = Form.useWatch('responseCodeMode', form) ?? 'default';
  const path = Form.useWatch('path', form) ?? '';
  const pathVariables = useMemo(() => {
    const found: string[] = [];
    const pattern = /\{([^}]+)\}/g;
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(String(path))) !== null) if (!found.includes(match[1])) found.push(match[1]);
    return found;
  }, [path]);
  const values = Form.useWatch([], form) ?? {};
  const state = (key: string): 'empty' | 'ok' | 'error' => {
    if (key === 'params') return (values.queryParams?.length || pathVariables.length) ? 'ok' : 'empty';
    if (key === 'authorization') return !authEnabled ? 'empty' : values.authId ? 'ok' : 'error';
    if (key === 'request') return requestMode === 'script' ? (values.requestScript ? 'ok' : 'error') : (values.requestHeaders?.length || values.requestBody?.length || values.orderWrites?.length || signingEnabled || encryptionEnabled) ? 'ok' : 'empty';
    if (key === 'response') return responseMode === 'script' ? (values.responseScript ? 'ok' : 'error') : (values.responseHeaders?.length || values.responseBody?.length || verificationEnabled || decryptionEnabled) ? 'ok' : 'empty';
    return values.responseFallback && (responseCodeMode === 'custom' ? values.responseCodeScript : values.responseCodeAssembly?.length) ? 'ok' : 'error';
  };
  const combinedState = (keys: string[]): 'empty' | 'ok' | 'error' => {
    const states = keys.map(state);
    if (states.includes('error')) return 'error';
    if (states.includes('ok')) return 'ok';
    return 'empty';
  };

  const securityItems = (mode: 'request' | 'response') => mode === 'request' ? [
    { key: 'signing', label: <Space><Form.Item name="signingEnabled" valuePropName="checked" noStyle><Switch size="small" /></Form.Item>Signing</Space>, children: signingEnabled ? <><Form.Item name="signingAlgorithm" label="Signing Algorithm" rules={[{ required: true }]}><Select options={signing} /></Form.Item><Form.Item name="signingSources" label="Signing Source Fields"><Checkbox.Group options={['Path Variables', 'Query Parameters', 'Request Headers', 'Request Body']} /></Form.Item><GroovyScriptEditor name="signingScript" helpText="Use the selected request fields as param input and return the signing result." /><Form.Item name="signingDestination" label="Destination Field"><Input placeholder="Field path" /></Form.Item></> : <Text type="secondary">Enable request signing.</Text> },
    { key: 'encryption', label: <Space><Form.Item name="encryptionEnabled" valuePropName="checked" noStyle><Switch size="small" /></Form.Item>Encryption</Space>, children: encryptionEnabled ? <><Form.Item name="encryptionAlgorithm" label="Encryption Algorithm" rules={[{ required: true }]}><Select options={encryption} /></Form.Item><Form.Item name="encryptionSources" label="Encryption Source Fields"><Checkbox.Group options={['Path Variables', 'Query Parameters', 'Request Headers', 'Request Body']} /></Form.Item><Form.Item name="encryptionDestination" label="Encrypted Destination Field"><Input placeholder="Field path" /></Form.Item></> : <Text type="secondary">Enable request encryption.</Text> },
  ] : [
    { key: 'verification', label: <Space><Form.Item name="verificationEnabled" valuePropName="checked" noStyle><Switch size="small" /></Form.Item>Signature Verification</Space>, children: verificationEnabled ? <><Form.Item name="verificationAlgorithm" label="Algorithm" rules={[{ required: true }]}><Select options={signing} /></Form.Item><Form.Item name="signatureField" label="Response Signature Field"><Input placeholder="Response field path" /></Form.Item><Form.Item name="verificationSources" label="Verification Source Fields"><Checkbox.Group options={['Response Header', 'Response Body']} /></Form.Item></> : <Text type="secondary">Enable response signature verification.</Text> },
    { key: 'decryption', label: <Space><Form.Item name="decryptionEnabled" valuePropName="checked" noStyle><Switch size="small" /></Form.Item>Decryption</Space>, children: decryptionEnabled ? <><Form.Item name="decryptionAlgorithm" label="Algorithm" rules={[{ required: true }]}><Select options={encryption} /></Form.Item><Form.Item name="encryptedField" label="Response Encrypted Field"><Input placeholder="Response field path" /></Form.Item><Form.Item name="decryptionSources" label="Decryption Source Fields"><Checkbox.Group options={['Response Header', 'Response Body']} /></Form.Item></> : <Text type="secondary">Enable response decryption.</Text> },
  ];

  return <Drawer title={<Space><span>Configure HTTP Call</span><Tag color="blue">httpCall</Tag></Space>} width="min(1180px, 92vw)" open={open} onClose={onClose} destroyOnClose extra={<Space><Button onClick={onClose}>Cancel</Button><Button type="primary" onClick={() => form.validateFields().then(v => onSave({ ...v, protocol: 'HTTP' }))}>Save</Button></Space>}>
    <ConfigProvider componentSize="middle" theme={{ token: { fontSize: 14, controlHeight: 32, borderRadius: 5, paddingSM: 10, marginSM: 10, marginXS: 6 }, components: { Form: { itemMarginBottom: 10 }, Card: { bodyPadding: 12, headerHeight: 36 }, Tabs: { horizontalMargin: '0 0 10px 0' } } }}>
    <div style={{ fontSize: 14 }}><Form form={form} layout="vertical" initialValues={{ protocol: 'HTTP', requestMode: 'configuration', responseMode: 'configuration', requestFormat: 'JSON', responseFormat: 'JSON', authDestination: 'default', responseFallback: 'FAIL', responseCodeMode: 'default' }} onValuesChange={() => force(v => v + 1)}>
      <Card size="small" style={{ marginBottom: 14 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '120px 130px minmax(420px, 1fr)', gap: 10 }}>
          <Form.Item label="Method" name="method" rules={[{ required: true }]}><Select options={['POST', 'GET', 'PUT', 'DELETE'].map(value => ({ label: value, value }))} /></Form.Item>
          <Form.Item label="Protocol" name="protocol"><Input disabled value="HTTP" /></Form.Item>
          <Form.Item label="Path" name="path" rules={[{ required: true, message: 'Enter request path' }]}><Input placeholder="/collection/{version}/request-to-pay" /></Form.Item>
        </div>
      </Card>
      <Tabs activeKey={activeTab} onChange={setActiveTab} items={[
        { key: 'request', label: tabLabel('Request', combinedState(['params', 'authorization', 'request'])), children: <>
          <Form.Item name="requestMode" style={{ margin: '10px 0 8px' }}><Radio.Group optionType="button" buttonStyle="solid" options={[{ label: 'Configuration Mode', value: 'configuration' }, { label: 'Script Mode', value: 'script' }]} /></Form.Item>
          <Tabs size="small" tabBarGutter={16} items={requestMode === 'script' ? [
            { key: 'request-script', label: 'Custom Script', children: <GroovyScriptEditor name="requestScript" helpText={requestScriptHelp} /> },
            { key: 'authorization', label: tabLabel('Authentication', state('authorization')), children: <Card size="small" title={<Space><Form.Item name="authEnabled" valuePropName="checked" noStyle><Switch size="small" /></Form.Item>Authentication Scheme</Space>}>{authEnabled ? <><Form.Item name="authId" label="Authentication Scheme" rules={[{ required: true }]}><Select placeholder="Select scheme" options={auth.map(a => ({ label: `${a.name} · ${a.type}`, value: a.id }))} /></Form.Item><Form.Item name="authDestination" label="Auth Destination"><Radio.Group options={[{ label: 'Default', value: 'default' }, { label: 'Custom', value: 'custom' }]} /></Form.Item>{authDestination === 'custom' && <Space align="start"><Form.Item name="authDestinationLocation" label="Target Area" rules={[{ required: true }]}><Select style={{ width: 220 }} options={['Path Variables', 'Query Parameters', 'Request Headers', 'Request Body'].map(value => ({ label: value, value }))} /></Form.Item><Form.Item name="authDestinationField" label="Target Field" rules={[{ required: true }]}><Input style={{ width: 280 }} /></Form.Item></Space>}</> : <Text type="secondary">Enable to apply a Channel Authentication Scheme.</Text>}</Card> },
            { key: 'request-security', label: 'Security', children: <Card size="small"><div style={{ border: '1px solid #f0f0f0', borderRadius: 6, overflow: 'hidden' }}>{securityItems('request').map((item, index) => <div key={item.key} style={{ padding: '12px 14px', borderBottom: index === securityItems('request').length - 1 ? 0 : '1px solid #f0f0f0' }}><div style={{ marginBottom: 8 }}>{item.label}</div><div style={{ paddingLeft: 4 }}>{item.children}</div></div>)}</div></Card> },
          ] : [
            { key: 'path-variables', label: 'Path Vars', children: <PathVariableMappingEditor variables={pathVariables} mappingName="pathMappings" sourceOptions={pathSourceOptions} operationOptions={mappingOperationOptions} emptyText="Path variables appear automatically when Path contains {field}." /> },
            { key: 'params', label: tabLabel('Params', state('params')), children: <Form.Item name="queryParams" initialValue={[]}><FlatFieldMappingEditor title="Query Parameter Mapping" addLabel="Add Parameter" fieldPlaceholder="Query parameter name" sourcePlaceholder="Context field" sourceOptions={requestContextOptions} dataTypeOptions={flatTypes} operationOptions={mappingOperationOptions} /></Form.Item> },
            { key: 'authorization', label: tabLabel('Authentication', state('authorization')), children: <Card size="small" title={<Space><Form.Item name="authEnabled" valuePropName="checked" noStyle><Switch size="small" /></Form.Item>Authentication Scheme</Space>}>{authEnabled ? <><Form.Item name="authId" label="Authentication Scheme" rules={[{ required: true }]}><Select placeholder="Select scheme" options={auth.map(a => ({ label: `${a.name} · ${a.type}`, value: a.id }))} /></Form.Item><Form.Item name="authDestination" label="Auth Destination"><Radio.Group options={[{ label: 'Default', value: 'default' }, { label: 'Custom', value: 'custom' }]} /></Form.Item>{authDestination === 'custom' && <Space align="start"><Form.Item name="authDestinationLocation" label="Target Area" rules={[{ required: true }]}><Select style={{ width: 220 }} options={['Path Variables', 'Query Parameters', 'Request Headers', 'Request Body'].map(value => ({ label: value, value }))} /></Form.Item><Form.Item name="authDestinationField" label="Target Field" rules={[{ required: true }]}><Input style={{ width: 280 }} /></Form.Item></Space>}</> : <Text type="secondary">Enable to apply a Channel Authentication Scheme.</Text>}</Card> },
              { key: 'request-headers', label: 'Headers', children: <Form.Item name="requestHeaders" initialValue={[]}><FlatFieldMappingEditor title="Request Header Mapping" addLabel="Add Header" fieldPlaceholder="Request header name" sourcePlaceholder="Context field" sourceOptions={requestContextOptions} dataTypeOptions={flatTypes} operationOptions={mappingOperationOptions} /></Form.Item> },
              { key: 'request-body', label: 'Body', children: <><Form.Item label="Request Message Format" name="requestFormat"><Select options={formats} /></Form.Item><Form.Item name="requestBody" initialValue={[]}><BodySchemaMappingEditor sourcePlaceholder="Context field" sourceOptions={requestContextOptions} dataTypeOptions={types} operationOptions={mappingOperationOptions} /></Form.Item><Form.Item name="bodyFieldMode" label="Fields Included in Request" style={{ marginTop: 10 }}><Radio.Group options={[{ label: 'Select All Fields', value: 'all' }, { label: 'Choose Fields to Select', value: 'choose' }]} /></Form.Item></> },
              { key: 'request-order', label: 'Order Variable', children: <OrderVariableMapping sourceOptions={spiReqOptions} targetOptions={orderOptions} /> },
              { key: 'request-security', label: 'Security', children: <Card size="small"><div style={{ border: '1px solid #f0f0f0', borderRadius: 6, overflow: 'hidden' }}>{securityItems('request').map((item, index) => <div key={item.key} style={{ padding: '12px 14px', borderBottom: index === securityItems('request').length - 1 ? 0 : '1px solid #f0f0f0' }}><div style={{ marginBottom: 8 }}>{item.label}</div><div style={{ paddingLeft: 4 }}>{item.children}</div></div>)}</div></Card> },
          ]} />
        </> },
        { key: 'response', label: tabLabel('Response', combinedState(responseMode === 'script' ? ['response'] : ['response', 'responseCode'])), children: <>
          <Form.Item name="responseMode" style={{ margin: '10px 0 8px' }}><Radio.Group optionType="button" buttonStyle="solid" options={[{ label: 'Configuration Mode', value: 'configuration' }, { label: 'Script Mode', value: 'script' }]} /></Form.Item>
          <Tabs size="small" tabBarGutter={16} items={responseMode === 'script' ? [
            { key: 'response-script', label: 'Custom Script', children: <GroovyScriptEditor name="responseScript" helpText={responseScriptHelp} /> },
            { key: 'response-security', label: 'Security', children: <Card size="small"><div style={{ border: '1px solid #f0f0f0', borderRadius: 6, overflow: 'hidden' }}>{securityItems('response').map((item, index) => <div key={item.key} style={{ padding: '12px 14px', borderBottom: index === securityItems('response').length - 1 ? 0 : '1px solid #f0f0f0' }}><div style={{ marginBottom: 8 }}>{item.label}</div><div style={{ paddingLeft: 4 }}>{item.children}</div></div>)}</div></Card> },
          ] : [
              { key: 'response-headers', label: 'Headers', children: <Form.Item name="responseHeaders" initialValue={[]}><FlatFieldMappingEditor direction="response" title="Response Header Mapping" addLabel="Add Header" fieldPlaceholder="Response header name" targetPlaceholder="Context field" sourceOptions={[]} targetOptions={responseContextOptions} dataTypeOptions={flatTypes} operationOptions={mappingOperationOptions} /></Form.Item> },
              { key: 'response-body', label: 'Body', children: <><Form.Item label="Response Message Format" name="responseFormat"><Select options={formats} /></Form.Item><Form.Item name="responseBody" initialValue={[]}><BodySchemaMappingEditor direction="response" targetPlaceholder="Context field" sourceOptions={[]} targetOptions={responseContextOptions} dataTypeOptions={types} operationOptions={mappingOperationOptions} /></Form.Item></> },
              { key: 'response-security', label: 'Security', children: <Card size="small"><div style={{ border: '1px solid #f0f0f0', borderRadius: 6, overflow: 'hidden' }}>{securityItems('response').map((item, index) => <div key={item.key} style={{ padding: '12px 14px', borderBottom: index === securityItems('response').length - 1 ? 0 : '1px solid #f0f0f0' }}><div style={{ marginBottom: 8 }}>{item.label}</div><div style={{ paddingLeft: 4 }}>{item.children}</div></div>)}</div></Card> },
              { key: 'response-code', label: tabLabel('Response Code', state('responseCode')), children: <Card size="small"><Form.Item name="responseFallback" label="Component Instance" rules={[{ required: true }]}><Select options={[{ label: 'FAIL', value: 'FAIL' }, { label: 'PENDING', value: 'PENDING' }]} /></Form.Item><Form.Item name="responseCodeMode" label="Assembly Mode"><Radio.Group optionType="button" options={[{ label: 'Default', value: 'default' }, { label: 'Custom', value: 'custom' }]} /></Form.Item>{responseCodeMode === 'custom' ? <GroovyScriptEditor name="responseCodeScript" helpText="Return the assembled response code from the available HTTP response data." /> : <><Form.Item name="responseCodeAssembly" label="Response Code Assembly" rules={[{ required: true }]}><Select mode="multiple" placeholder="Select in assembly order" options={[{ label: 'HTTP Status Code', value: 'httpStatus' }, { label: 'Response Header Field', value: 'responseHeader' }, { label: 'Response Body Field', value: 'responseBody' }]} /></Form.Item><Form.Item name="responseMessageField" label="Response Message Field"><Input placeholder="Optional response field path" /></Form.Item></>}</Card> },
          ]} />
        </> },
      ]} />
    </Form></div>
    </ConfigProvider>
  </Drawer>;
}

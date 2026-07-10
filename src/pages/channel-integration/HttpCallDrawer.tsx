import { useMemo, useState } from 'react';
import { Button, Card, Cascader, Checkbox, ConfigProvider, Drawer, Form, Input, Radio, Select, Space, Switch, Tabs, Tag, Typography } from 'antd';
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import { useChannelScopeStore } from './channelScopeStore';
import BodySchemaMappingEditor, { type BodySchemaNode } from './BodySchemaMappingEditor';
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
const requestMessageScriptHelp = `/**
*
* @param
*
* The data included in param is as follows:
*
* "param" is the field selected to participate in the assembly message
*
* @return Return a request message of string type
*/`;
const responseMessageScriptHelp = `/**
*
* @param param
*
* The data included in param is as follows:
*
* param is the message of the external channel response, of string type
*
* @return Return a object of JSONObject type
*
*/`;
const collectBodyOptions = (nodes: BodySchemaNode[], parent = ''): Array<{ label: string; value: string }> => nodes.flatMap((node) => {
  const path = parent ? `${parent}.${node.name}` : node.name;
  return ['Object', 'Array'].includes(node.type) ? collectBodyOptions(node.children ?? [], path) : [{ label: path, value: path }];
});

const Dot = ({ color }: { color: string }) => <span style={{ display: 'inline-block', width: 7, height: 7, borderRadius: 7, background: color }} />;
const tabLabel = (label: string, state: 'empty' | 'ok' | 'error') => <Space size={6}><span>{label}</span>{state !== 'empty' && <Dot color={state === 'ok' ? '#52c41a' : '#ff4d4f'} />}</Space>;
const emptyStyle = { padding: 14, color: '#8c8c8c', background: '#fafafa', borderRadius: 6 } as const;
const hasValue = (value: unknown) => Array.isArray(value) ? value.length > 0 : value !== undefined && value !== null && value !== '';
const hasRows = (value: unknown): value is Array<Record<string, unknown>> => Array.isArray(value) && value.length > 0;
const hasCascaderValue = (value: unknown) => Array.isArray(value) && value.length > 0;
type TabState = 'empty' | 'ok' | 'error';

const flatFieldState = (fields: unknown, direction: 'request' | 'response' = 'request'): TabState => {
  if (!hasRows(fields)) return 'empty';
  return fields.every((field) => {
    const hasMapping = direction === 'request' ? hasCascaderValue(field.sourceValue) : true;
    return hasValue(field.name) && hasValue(field.type) && hasMapping;
  }) ? 'ok' : 'error';
};

const bodyNodeComplete = (node: BodySchemaNode, direction: 'request' | 'response'): boolean => {
  if (!hasValue(node.name) || !hasValue(node.type)) return false;
  if (['Object', 'Array'].includes(node.type)) return (node.children ?? []).every((child) => bodyNodeComplete(child, direction));
  return direction === 'request' ? hasCascaderValue(node.sourceId) : true;
};

const bodySchemaState = (nodes: unknown, direction: 'request' | 'response' = 'request'): TabState => {
  if (!Array.isArray(nodes) || nodes.length === 0) return 'empty';
  return nodes.every((node) => bodyNodeComplete(node as BodySchemaNode, direction)) ? 'ok' : 'error';
};

const mappingState = (rows: unknown): TabState => {
  if (!hasRows(rows)) return 'empty';
  return rows.every((row) => hasValue(row.source) && hasValue(row.target)) ? 'ok' : 'error';
};

const mergeTabStates = (states: TabState[]): TabState => {
  if (states.includes('error')) return 'error';
  if (states.includes('ok')) return 'ok';
  return 'empty';
};
function OrderVariableMapping({ sourceOptions, targetOptions, name = 'orderWrites', title = 'SPI to Order Variable Mapping', sourceLabel = 'SPI VALUE', targetLabel = 'ORDER VARIABLE' }: { sourceOptions: Array<{ label: string; value: string; type: string }>; targetOptions: Array<{ label: string; value: string; type: string }>; name?: string; title?: string; sourceLabel?: string; targetLabel?: string }) {
  const sourceType = (value?: string) => sourceOptions.find((item) => item.value === value)?.type ?? 'String';
  const targetType = (value?: string) => targetOptions.find((item) => item.value === value)?.type ?? 'String';
  return <Form.List name={name}>{(fields, { add, remove }) => <div style={{ border: '1px solid #e8e8e8', borderRadius: 8, overflow: 'hidden' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', background: '#fafafa', borderBottom: '1px solid #e8e8e8' }}><Space size={8}><Text strong>{title}</Text><Tag style={{ margin: 0 }}>{fields.length} fields</Tag></Space><Button size="small" type="primary" ghost icon={<PlusOutlined />} onClick={() => add()}>Add Mapping</Button></div>
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(180px,1fr) 85px 24px 150px 24px minmax(180px,1fr) 85px 36px', gap: 8, padding: '7px 8px', color: '#8c8c8c', fontSize: 11, borderBottom: '1px solid #f0f0f0' }}><span>{sourceLabel}</span><span>SOURCE TYPE</span><span /><span>OPERATION</span><span /><span>{targetLabel}</span><span>TARGET TYPE</span><span /></div>
    {fields.map((field) => <Form.Item key={field.key} noStyle shouldUpdate>{({ getFieldValue }) => {
      const source = getFieldValue([name, field.name, 'source']);
      const target = getFieldValue([name, field.name, 'target']);
      return <div style={{ display: 'grid', gridTemplateColumns: 'minmax(180px,1fr) 85px 24px 150px 24px minmax(180px,1fr) 85px 36px', gap: 8, alignItems: 'center', padding: '6px 8px', borderBottom: '1px solid #f5f5f5' }}>
        <Form.Item name={[field.name, 'source']} rules={[{ required: true }]} style={{ margin: 0 }}><Select placeholder={sourceLabel} options={sourceOptions} /></Form.Item><Text>{sourceType(source)}</Text><span>→</span><Form.Item name={[field.name, 'operation']} style={{ margin: 0 }}><Cascader allowClear placeholder="Optional" options={mappingOperationOptions} expandTrigger="click" /></Form.Item><span>→</span><Form.Item name={[field.name, 'target']} rules={[{ required: true }]} style={{ margin: 0 }}><Select placeholder={targetLabel} options={targetOptions} /></Form.Item><Text>{targetType(target)}</Text><Button type="text" danger icon={<DeleteOutlined />} onClick={() => remove(field.name)} />
      </div>;
    }}</Form.Item>)}
    {fields.length === 0 && <div style={emptyStyle}>No mappings configured.</div>}
  </div>}</Form.List>;
}

type Props = {
  open: boolean;
  channelCode: string;
  initialValues?: Record<string, unknown>;
  readOnly?: boolean;
  onClose: () => void;
  onSave: (config: Record<string, unknown>) => void;
};

export default function HttpCallDrawer({ open, channelCode, initialValues = {}, readOnly = false, onClose, onSave }: Props) {
  const [form] = Form.useForm();
  const [activeTab, setActiveTab] = useState('request');
  const [, force] = useState(0);
  const store = useChannelScopeStore();
  const credentials = store.credentialsByChannel[channelCode] ?? [];
  const globals = store.globalVariablesByChannel[channelCode] ?? [];
  const orders = store.orderVariablesByChannel[channelCode] ?? [];
  const auth = store.authenticationsByChannel[channelCode] ?? [];
  const spiRequest = channelCode === 'EVEXIN'
    ? ['content', 'mobileNumber', 'requestReference', 'responseReference']
    : ['amount', 'currency', 'reference', 'customerId', 'accountNumber', 'bankCode', 'timestamp'];
  const spiResponse = channelCode === 'EVEXIN'
    ? ['channelResponseCode', 'responseMessage', 'responseReference', 'status']
    : ['responseCode', 'responseMessage', 'status', 'channelReference', 'amount', 'currency', 'customerId'];
  const requestTypes: Record<string, string> = { amount: 'Long', timestamp: 'Long' };
  const responseTypes: Record<string, string> = { amount: 'Long' };
  const requestContextOptions = [
    { label: 'SPI Request', options: spiRequest.map(v => ({ label: v, value: `spi.request.${v}`, type: requestTypes[v] ?? 'String' })) },
    { label: 'Global Variables', options: globals.map(v => ({ label: v.name, value: `global.${v.name}`, type: 'String' })) },
    { label: 'Order Variables', options: orders.map(v => ({ label: v.name, value: `order.${v.name}`, type: 'String' })) },
    { label: 'Credentials', options: credentials.map(v => ({ label: v.key, value: `credential.${v.key}`, type: 'String' })) },
  ];
  const requestValueOptions = [
    ...requestContextOptions,
    { label: 'Generated Data', options: generated },
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
  const spiResOptions = spiResponse.map(v => ({ label: v, value: `spi.response.${v}`, type: responseTypes[v] ?? 'String' }));
  const globalOptions = globals.map(v => ({ label: `${v.name} · ${v.value}`, value: v.name, type: 'String' }));
  const orderOptions = orders.map(v => ({ label: v.name, value: v.name, type: 'String' }));
  const requestMappingMode = Form.useWatch('requestMappingMode', form) ?? 'configuration';
  const responseMappingMode = Form.useWatch('responseMappingMode', form) ?? 'configuration';
  const requestFormat = Form.useWatch('requestFormat', form) ?? 'JSON';
  const responseFormat = Form.useWatch('responseFormat', form) ?? 'JSON';
  const watchedValues = Form.useWatch([], form) ?? {};
  const initialFormValues = { protocol: 'HTTP', requestMappingMode: 'configuration', responseMappingMode: 'configuration', requestFormat: 'JSON', responseFormat: 'JSON', authDestination: 'default', responseFallback: 'FAIL', responseCodeMode: 'default', bodyFieldMode: 'all', ...initialValues };
  const allValues = { ...initialFormValues, ...form.getFieldsValue(true), ...watchedValues } as Record<string, any>;
  const requestBody = allValues.requestBody as BodySchemaNode[] | undefined;
  const requestBodyOptions = collectBodyOptions(requestBody ?? []);
  const responseBody = allValues.responseBody as BodySchemaNode[] | undefined;
  const responseBodyOptions = collectBodyOptions(responseBody ?? []);
  const authEnabled = Form.useWatch('authEnabled', form);
  const authDestination = Form.useWatch('authDestination', form) ?? 'default';
  const signingEnabled = Form.useWatch('signingEnabled', form);
  const encryptionEnabled = Form.useWatch('encryptionEnabled', form);
  const verificationEnabled = Form.useWatch('verificationEnabled', form);
  const decryptionEnabled = Form.useWatch('decryptionEnabled', form);
  const responseCodeMode = Form.useWatch('responseCodeMode', form) ?? 'default';
  const path = allValues.path ?? '';
  const pathVariables = useMemo(() => {
    const found: string[] = [];
    const pattern = /\{([^}]+)\}/g;
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(String(path))) !== null) if (!found.includes(match[1])) found.push(match[1]);
    return found;
  }, [path]);
  const state = (key: string): TabState => {
    if (key === 'path') return pathVariables.length ? 'ok' : 'empty';
    if (key === 'params') return flatFieldState(allValues.queryParams);
    if (key === 'requestHeaders') return flatFieldState(allValues.requestHeaders);
    if (key === 'requestBody') return bodySchemaState(allValues.requestBody);
    if (key === 'orderWrites') return mappingState(allValues.orderWrites);
    if (key === 'requestFields') return requestMappingMode === 'script'
      ? (hasValue(allValues.requestMappingScript) ? 'ok' : 'error')
      : mergeTabStates([state('path'), state('params'), state('requestHeaders'), state('requestBody'), state('orderWrites')]);
    if (key === 'authorization') {
      if (!authEnabled) return 'empty';
      if (!hasValue(allValues.authId)) return 'error';
      if (authDestination === 'custom' && (!hasValue(allValues.authDestinationLocation) || !hasValue(allValues.authDestinationField))) return 'error';
      return 'ok';
    }
    if (key === 'requestSecurity') {
      const signingState: TabState = signingEnabled ? (hasValue(allValues.signingAlgorithm) && hasValue(allValues.signingScript) && hasValue(allValues.signingDestination) ? 'ok' : 'error') : 'empty';
      const encryptionState: TabState = encryptionEnabled ? (hasValue(allValues.encryptionAlgorithm) && hasValue(allValues.encryptionDestination) ? 'ok' : 'error') : 'empty';
      return mergeTabStates([signingState, encryptionState]);
    }
    if (key === 'requestFormat') {
      if (!hasValue(allValues.requestFormat)) return 'error';
      if (allValues.bodyFieldMode === 'choose' && !hasRows(allValues.selectedRequestBodyFields)) return 'error';
      if (allValues.requestFormat === 'Custom' && (!hasValue(allValues.customRequestContentType) || !hasValue(allValues.requestMessageScript))) return 'error';
      return 'ok';
    }
    if (key === 'responseHeaders') return flatFieldState(allValues.responseHeaders, 'response');
    if (key === 'responseBody') return bodySchemaState(allValues.responseBody, 'response');
    if (key === 'responseGlobalMappings') return mappingState(allValues.responseGlobalMappings);
    if (key === 'responseOrderMappings') return mappingState(allValues.responseOrderMappings);
    if (key === 'responseFields') return responseMappingMode === 'script'
      ? (hasValue(allValues.responseMappingScript) ? 'ok' : 'error')
      : mergeTabStates([state('responseHeaders'), state('responseBody'), state('responseGlobalMappings'), state('responseOrderMappings')]);
    if (key === 'responseSecurity') {
      const verificationState: TabState = verificationEnabled ? (hasValue(allValues.verificationAlgorithm) && hasValue(allValues.signatureField) ? 'ok' : 'error') : 'empty';
      const decryptionState: TabState = decryptionEnabled ? (hasValue(allValues.decryptionAlgorithm) && hasValue(allValues.encryptedField) ? 'ok' : 'error') : 'empty';
      return mergeTabStates([verificationState, decryptionState]);
    }
    if (key === 'responseFormat') {
      if (!hasValue(allValues.responseFormat)) return 'error';
      if (allValues.responseFormat === 'Custom' && !hasValue(allValues.responseMessageScript)) return 'error';
      return 'ok';
    }
    if (key === 'responseCode') return hasValue(allValues.responseFallback) && (responseCodeMode === 'custom' ? hasValue(allValues.responseCodeScript) : hasRows(allValues.responseCodeAssembly)) ? 'ok' : 'error';
    if (key === 'request') return mergeTabStates([state('requestFields'), state('authorization'), state('requestSecurity'), state('requestFormat')]);
    if (key === 'response') return mergeTabStates([state('responseFormat'), state('responseFields'), state('responseSecurity'), state('responseCode')]);
    return 'empty';
  };

  const securityItems = (mode: 'request' | 'response') => mode === 'request' ? [
    { key: 'signing', label: <Space><Form.Item name="signingEnabled" valuePropName="checked" noStyle><Switch size="small" /></Form.Item>Signing</Space>, children: signingEnabled ? <><Form.Item name="signingAlgorithm" label="Signing Algorithm" rules={[{ required: true }]}><Select options={signing} /></Form.Item><Form.Item name="signingSources" label="Signing Source Fields"><Checkbox.Group options={['Path Variables', 'Query Parameters', 'Request Headers', 'Request Body']} /></Form.Item><GroovyScriptEditor name="signingScript" helpText="Use the selected request fields as param input and return the signing result." /><Form.Item name="signingDestination" label="Destination Field"><Input placeholder="Field path" /></Form.Item></> : <Text type="secondary">Enable request signing.</Text> },
    { key: 'encryption', label: <Space><Form.Item name="encryptionEnabled" valuePropName="checked" noStyle><Switch size="small" /></Form.Item>Encryption</Space>, children: encryptionEnabled ? <><Form.Item name="encryptionAlgorithm" label="Encryption Algorithm" rules={[{ required: true }]}><Select options={encryption} /></Form.Item><Form.Item name="encryptionSources" label="Encryption Source Fields"><Checkbox.Group options={['Path Variables', 'Query Parameters', 'Request Headers', 'Request Body']} /></Form.Item><Form.Item name="encryptionDestination" label="Encrypted Destination Field"><Input placeholder="Field path" /></Form.Item></> : <Text type="secondary">Enable request encryption.</Text> },
  ] : [
    { key: 'verification', label: <Space><Form.Item name="verificationEnabled" valuePropName="checked" noStyle><Switch size="small" /></Form.Item>Signature Verification</Space>, children: verificationEnabled ? <><Form.Item name="verificationAlgorithm" label="Algorithm" rules={[{ required: true }]}><Select options={signing} /></Form.Item><Form.Item name="signatureField" label="Response Signature Field"><Input placeholder="Response field path" /></Form.Item><Form.Item name="verificationSources" label="Verification Source Fields"><Checkbox.Group options={['Response Header', 'Response Body']} /></Form.Item></> : <Text type="secondary">Enable response signature verification.</Text> },
    { key: 'decryption', label: <Space><Form.Item name="decryptionEnabled" valuePropName="checked" noStyle><Switch size="small" /></Form.Item>Decryption</Space>, children: decryptionEnabled ? <><Form.Item name="decryptionAlgorithm" label="Algorithm" rules={[{ required: true }]}><Select options={encryption} /></Form.Item><Form.Item name="encryptedField" label="Response Encrypted Field"><Input placeholder="Response field path" /></Form.Item><Form.Item name="decryptionSources" label="Decryption Source Fields"><Checkbox.Group options={['Response Header', 'Response Body']} /></Form.Item></> : <Text type="secondary">Enable response decryption.</Text> },
  ];

  return <Drawer title={<Space><span>Configure HTTP Call</span><Tag color="blue">httpCall</Tag></Space>} width="min(1180px, 92vw)" open={open} onClose={onClose} destroyOnClose extra={!readOnly && <Space><Button onClick={onClose}>Cancel</Button><Button type="primary" onClick={() => form.validateFields().then(v => onSave({ ...v, protocol: 'HTTP' }))}>Save</Button></Space>}>
    <ConfigProvider componentSize="middle" theme={{ token: { fontSize: 14, controlHeight: 32, borderRadius: 5, paddingSM: 10, marginSM: 10, marginXS: 6 }, components: { Form: { itemMarginBottom: 10 }, Card: { bodyPadding: 12, headerHeight: 36 }, Tabs: { horizontalMargin: '0 0 10px 0' } } }}>
    <div style={{ fontSize: 14 }}><Form form={form} disabled={readOnly} layout="vertical" initialValues={{ protocol: 'HTTP', requestMappingMode: 'configuration', responseMappingMode: 'configuration', requestFormat: 'JSON', responseFormat: 'JSON', authDestination: 'default', responseFallback: 'FAIL', responseCodeMode: 'default', bodyFieldMode: 'all', ...initialValues }} onValuesChange={() => force(v => v + 1)}>
      <Card size="small" style={{ marginBottom: 14 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '120px 130px minmax(420px, 1fr)', gap: 10 }}>
          <Form.Item label="Method" name="method" rules={[{ required: true }]}><Select options={['POST', 'GET', 'PUT', 'DELETE'].map(value => ({ label: value, value }))} /></Form.Item>
          <Form.Item label="Protocol" name="protocol"><Input disabled value="HTTP" /></Form.Item>
          <Form.Item label="Path" name="path" rules={[{ required: true, message: 'Enter request path' }]}><Input placeholder="/collection/{version}/request-to-pay" /></Form.Item>
        </div>
      </Card>
      <Tabs activeKey={activeTab} onChange={setActiveTab} items={[
        { key: 'request', label: tabLabel('Request', state('request')), children: <Tabs size="small" tabBarGutter={16} items={[
          { key: 'request-fields', label: tabLabel('Fields & Mapping', state('requestFields')), children: <>
            <Form.Item name="requestMappingMode"><Radio.Group optionType="button" buttonStyle="solid" options={[{ label: 'Configuration Mode', value: 'configuration' }, { label: 'Script Mode', value: 'script' }]} /></Form.Item>
            <Tabs size="small" type="card" items={[
              { key: 'path', label: tabLabel('Path Vars', state('path')), children: requestMappingMode === 'configuration' ? <PathVariableMappingEditor variables={pathVariables} mappingName="pathMappings" sourceOptions={pathSourceOptions} operationOptions={mappingOperationOptions} emptyText="Path variables appear automatically when Path contains {field}." /> : <div style={emptyStyle}>{pathVariables.length ? `Defined Path Variables: ${pathVariables.map(v => `{${v}}`).join(', ')}` : 'Path variables appear automatically when Path contains {field}.'}</div> },
              { key: 'params', label: tabLabel('Params', state('params')), children: <Form.Item name="queryParams" initialValue={[]}><FlatFieldMappingEditor schemaOnly={requestMappingMode === 'script'} title="Query Parameter Fields" addLabel="Add Parameter" fieldPlaceholder="Query parameter name" sourcePlaceholder="Select source value" sourceCascader sourceOptions={requestValueOptions} dataTypeOptions={flatTypes} fixedFieldType="String" operationOptions={mappingOperationOptions} /></Form.Item> },
              { key: 'headers', label: tabLabel('Headers', state('requestHeaders')), children: <Form.Item name="requestHeaders" initialValue={[]}><FlatFieldMappingEditor schemaOnly={requestMappingMode === 'script'} title="Request Header Fields" addLabel="Add Header" fieldPlaceholder="Request header name" sourcePlaceholder="Select source value" sourceCascader sourceOptions={requestValueOptions} dataTypeOptions={flatTypes} fixedFieldType="String" operationOptions={mappingOperationOptions} /></Form.Item> },
              { key: 'body', label: tabLabel('Body', state('requestBody')), children: <Form.Item name="requestBody" initialValue={[]}><BodySchemaMappingEditor schemaOnly={requestMappingMode === 'script'} sourcePlaceholder="Select source value" sourceOptions={requestValueOptions} dataTypeOptions={types} operationOptions={mappingOperationOptions} /></Form.Item> },
              { key: 'order', label: tabLabel('Order Variable', state('orderWrites')), children: <OrderVariableMapping sourceOptions={spiReqOptions} targetOptions={orderOptions} /> },
            ]} />
            {requestMappingMode === 'script' && <Card size="small" title="Mapping Script" style={{ marginTop: 12 }}><GroovyScriptEditor name="requestMappingScript" helpText={requestScriptHelp} /></Card>}
          </> },
          { key: 'request-auth', label: tabLabel('Authentication', state('authorization')), children: <Card size="small" title={<Space><Form.Item name="authEnabled" valuePropName="checked" noStyle><Switch size="small" /></Form.Item>Authentication Scheme</Space>}>{authEnabled ? <><Form.Item name="authId" label="Authentication Scheme" rules={[{ required: true }]}><Select placeholder="Select scheme" options={auth.map(a => ({ label: `${a.name} · ${a.type}`, value: a.id }))} /></Form.Item><Form.Item name="authDestination" label="Auth Destination"><Radio.Group options={[{ label: 'Default', value: 'default' }, { label: 'Custom', value: 'custom' }]} /></Form.Item>{authDestination === 'custom' && <Space align="start"><Form.Item name="authDestinationLocation" label="Target Area" rules={[{ required: true }]}><Select style={{ width: 220 }} options={['Path Variables', 'Query Parameters', 'Request Headers', 'Request Body'].map(value => ({ label: value, value }))} /></Form.Item><Form.Item name="authDestinationField" label="Target Field" rules={[{ required: true }]}><Input style={{ width: 280 }} /></Form.Item></Space>}</> : <Text type="secondary">Enable to apply a Channel Authentication Scheme.</Text>}</Card> },
          { key: 'request-security', label: tabLabel('Security', state('requestSecurity')), children: <Card size="small"><div style={{ border: '1px solid #f0f0f0', borderRadius: 6, overflow: 'hidden' }}>{securityItems('request').map((item, index) => <div key={item.key} style={{ padding: '12px 14px', borderBottom: index === securityItems('request').length - 1 ? 0 : '1px solid #f0f0f0' }}><div style={{ marginBottom: 8 }}>{item.label}</div><div style={{ paddingLeft: 4 }}>{item.children}</div></div>)}</div></Card> },
          { key: 'request-format', label: tabLabel('Message Format', state('requestFormat')), children: <Card size="small"><Form.Item label="Request Message Format" name="requestFormat"><Radio.Group options={formats} /></Form.Item><Form.Item label="Request Body Fields Included" name="bodyFieldMode"><Radio.Group options={[{ label: 'All Fields', value: 'all' }, { label: 'Choose Fields', value: 'choose' }]} /></Form.Item>{allValues.bodyFieldMode === 'choose' && <Form.Item name="selectedRequestBodyFields" rules={[{ required: true }]}><Select mode="multiple" placeholder="Select Request Body fields" options={requestBodyOptions} /></Form.Item>}{requestFormat === 'Custom' && <><Form.Item label="Content Type" name="customRequestContentType" rules={[{ required: true }]}><Select placeholder="Select Content Type" options={['application/json', 'application/xml', 'text/plain', 'application/x-www-form-urlencoded'].map(value => ({ label: value, value }))} /></Form.Item><GroovyScriptEditor name="requestMessageScript" helpText={requestMessageScriptHelp} /></>}</Card> },
        ]} /> },
        { key: 'response', label: tabLabel('Response', state('response')), children: <Tabs size="small" tabBarGutter={16} items={[
          { key: 'response-format', label: tabLabel('Message Format', state('responseFormat')), children: <Card size="small"><Form.Item label="Response Message Format" name="responseFormat"><Radio.Group options={formats} /></Form.Item>{responseFormat === 'Custom' && <GroovyScriptEditor name="responseMessageScript" helpText={responseMessageScriptHelp} />}</Card> },
          { key: 'response-fields', label: tabLabel('Fields & Mapping', state('responseFields')), children: <><Form.Item name="responseMappingMode"><Radio.Group optionType="button" buttonStyle="solid" options={[{ label: 'Configuration Mode', value: 'configuration' }, { label: 'Script Mode', value: 'script' }]} /></Form.Item><Tabs type="card" size="small" items={[
            { key: 'headers', label: tabLabel('Headers', state('responseHeaders')), children: <Form.Item name="responseHeaders" initialValue={[]}><FlatFieldMappingEditor schemaOnly={responseMappingMode === 'script'} direction="response" title="Response Header Fields" addLabel="Add Header" fieldPlaceholder="Response header name" targetPlaceholder="Context field" sourceOptions={[]} targetOptions={responseContextOptions} dataTypeOptions={flatTypes} operationOptions={mappingOperationOptions} /></Form.Item> },
            { key: 'body', label: tabLabel('Body', state('responseBody')), children: <Form.Item name="responseBody" initialValue={[]}><BodySchemaMappingEditor schemaOnly={responseMappingMode === 'script'} direction="response" targetPlaceholder="Context field" sourceOptions={[]} targetOptions={responseContextOptions} dataTypeOptions={types} operationOptions={mappingOperationOptions} /></Form.Item> },
            { key: 'global-variable', label: tabLabel('Global Variable', state('responseGlobalMappings')), children: <OrderVariableMapping name="responseGlobalMappings" title="Global Variable to SPI Mapping" sourceLabel="GLOBAL VARIABLE" targetLabel="SPI VALUE" sourceOptions={globalOptions} targetOptions={spiResOptions} /> },
            { key: 'order-variable', label: tabLabel('Order Variable', state('responseOrderMappings')), children: <OrderVariableMapping name="responseOrderMappings" title="Order Variable to SPI Mapping" sourceLabel="ORDER VARIABLE" targetLabel="SPI VALUE" sourceOptions={orderOptions} targetOptions={spiResOptions} /> },
          ]} />{responseMappingMode === 'script' && <Card size="small" title="Mapping Script" style={{ marginTop: 12 }}><GroovyScriptEditor name="responseMappingScript" helpText={responseScriptHelp} /></Card>}</> },
          { key: 'response-security', label: tabLabel('Security', state('responseSecurity')), children: <Card size="small"><div style={{ border: '1px solid #f0f0f0', borderRadius: 6, overflow: 'hidden' }}>{securityItems('response').map((item, index) => <div key={item.key} style={{ padding: '12px 14px', borderBottom: index === securityItems('response').length - 1 ? 0 : '1px solid #f0f0f0' }}><div style={{ marginBottom: 8 }}>{item.label}</div><div style={{ paddingLeft: 4 }}>{item.children}</div></div>)}</div></Card> },
          { key: 'response-code', label: tabLabel('Response Code', state('responseCode')), children: <Card size="small"><Form.Item name="responseFallback" label="Component Instance" rules={[{ required: true }]}><Select options={[{ label: 'FAIL', value: 'FAIL' }, { label: 'PENDING', value: 'PENDING' }]} /></Form.Item><Form.Item name="responseCodeMode" label="Assembly Mode"><Radio.Group optionType="button" options={[{ label: 'Default', value: 'default' }, { label: 'Custom', value: 'custom' }]} /></Form.Item>{responseCodeMode === 'custom' ? <GroovyScriptEditor name="responseCodeScript" helpText="Return the assembled response code from the available HTTP response data." /> : <><Form.Item name="responseCodeAssembly" label="Response Code Assembly" rules={[{ required: true }]}><Select mode="multiple" placeholder="Select in assembly order" options={[{ label: 'HTTP Status Code', value: 'httpStatus' }, { label: 'Response Header Field', value: 'responseHeader' }, ...responseBodyOptions.map((option) => ({ label: `Response Body / ${option.label}`, value: `responseBody.${option.value}` }))]} /></Form.Item><Form.Item name="responseMessageField" label="Response Message Field"><Input placeholder="Optional response field path" /></Form.Item></>}</Card> },
        ]} /> },
      ]} />
    </Form></div>
    </ConfigProvider>
  </Drawer>;
}

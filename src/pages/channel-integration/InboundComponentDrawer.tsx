import { useState } from 'react';
import type { ReactNode } from 'react';
import { Alert, Button, Card, Checkbox, ConfigProvider, Drawer, Form, Input, message, Radio, Select, Space, Switch, Tabs, Tag, Typography } from 'antd';
import BodySchemaMappingEditor, { type BodySchemaNode } from './BodySchemaMappingEditor';
import FlatFieldMappingEditor from './FlatFieldMappingEditor';
import GroovyScriptEditor from './GroovyScriptEditor';
import { mappingOperationOptions } from './mappingOperationOptions';
import EndpointPathVariablesReference from './EndpointPathVariablesReference';
import TargetMappingList, { collectFieldTargetMappings, normalizeTargetMappings, TargetMappingColumnHeaders, validateTargetMappings } from './TargetMappingList';
import type { TargetMapping } from './TargetMappingList';

const { Text } = Typography;
const types = ['String', 'Integer', 'Long', 'Boolean', 'Object', 'Array'].map((value) => ({ label: value, value }));
const flatTypes = types.filter((item) => !['Object', 'Array'].includes(item.value));
const formats = ['Custom', 'FORM_DATA', 'JSON', 'X_WWW_FORM_URLENCODED', 'XML'].map((value) => ({ label: value, value }));
const signing = ['Custom', 'HMAC (SHA256)', 'HMAC (SHA512)', 'MD5', 'RSA (SHA1)', 'RSA (SHA256)', 'RSA (SHA512)', 'SHA1', 'SHA256', 'SHA512'].map((value) => ({ label: value, value }));
const encryption = ['AES (CBC)', 'AES (ECB)', 'Custom', 'RSA'].map((value) => ({ label: value, value }));
const spiRequest = ['amount', 'currency', 'requestReference', 'responseReference', 'customerId', 'accountNumber', 'channelResponseCode', 'channelResponseMessage'];
const spiResponse = ['responseCode', 'responseMessage', 'status', 'requestReference', 'channelReference', 'amount', 'currency'];
const spiRequestOptions = [{ label: 'SPI Request', options: spiRequest.map((value) => ({ label: value, value: `spi.request.${value}`, type: 'String' })) }];
const spiResponseOptions = [{ label: 'SPI Response', options: spiResponse.map((value) => ({ label: value, value: `spi.response.${value}`, type: 'String' })) }];
const Dot = ({ color }: { color: string }) => <span style={{ display: 'inline-block', width: 7, height: 7, borderRadius: 7, background: color }} />;
type TabState = 'empty' | 'ok' | 'error';
const tabLabel = (label: string, state: TabState) => <Space size={6}><span>{label}</span>{state !== 'empty' && <Dot color={state === 'ok' ? '#52c41a' : '#ff4d4f'} />}</Space>;
const hasValue = (value: unknown) => Array.isArray(value) ? value.length > 0 : value !== undefined && value !== null && value !== '';
const hasRows = (value: unknown): value is Array<Record<string, unknown>> => Array.isArray(value) && value.length > 0;
const mergeTabStates = (states: TabState[]): TabState => {
  if (states.includes('error')) return 'error';
  if (states.includes('ok')) return 'ok';
  return 'empty';
};
const flatSchemaState = (fields: unknown): TabState => {
  if (!hasRows(fields)) return 'empty';
  return fields.every((field) => hasValue(field.name) && hasValue(field.type) && normalizeTargetMappings(field).every((mapping) => hasValue(mapping.targetValue))) ? 'ok' : 'error';
};
const bodySchemaNodeComplete = (node: BodySchemaNode): boolean => {
  if (!hasValue(node.name) || !hasValue(node.type)) return false;
  if (['Object', 'Array'].includes(node.type)) return (node.children ?? []).every(bodySchemaNodeComplete);
  return normalizeTargetMappings(node).every((mapping) => hasValue(mapping.targetValue));
};
const bodySchemaState = (nodes: unknown): TabState => {
  if (!Array.isArray(nodes) || nodes.length === 0) return 'empty';
  return nodes.every((node) => bodySchemaNodeComplete(node as BodySchemaNode)) ? 'ok' : 'error';
};

type Props = { open: boolean; initialValues?: Record<string, unknown>; readOnly?: boolean; onClose: () => void; onSave: (config: Record<string, unknown>) => void };
type InboundRequestProps = Props & { pathVariables?: string[]; endpointPath?: string };

export function InboundRequestDrawer({ open, initialValues = {}, readOnly = false, pathVariables = [], endpointPath, onClose, onSave }: InboundRequestProps) {
  const [form] = Form.useForm();
  const [activeTab, setActiveTab] = useState('format');
  const watchedValues = Form.useWatch([], form) ?? {};
  const initialFormValues = { requestMappingMode: 'configuration', codeMappingEnabled: false, codeMappingMode: 'default', ...initialValues };
  const allValues = { ...initialFormValues, ...form.getFieldsValue(true), ...watchedValues } as Record<string, any>;
  const requestMappingMode = Form.useWatch('requestMappingMode', form) ?? 'configuration';
  const decryptionEnabled = Form.useWatch('decryptionEnabled', form);
  const verificationEnabled = Form.useWatch('verificationEnabled', form);
  const codeMappingEnabled = Form.useWatch('codeMappingEnabled', form);
  const codeMappingMode = Form.useWatch('codeMappingMode', form) ?? 'default';
  const effectiveRequestMappingMode = allValues.requestMappingMode ?? requestMappingMode;
  const effectiveDecryptionEnabled = Boolean(allValues.decryptionEnabled ?? decryptionEnabled);
  const effectiveVerificationEnabled = Boolean(allValues.verificationEnabled ?? verificationEnabled);
  const effectiveCodeMappingEnabled = Boolean(allValues.codeMappingEnabled ?? codeMappingEnabled);
  const effectiveCodeMappingMode = allValues.codeMappingMode ?? codeMappingMode;
  const state = (key: string): TabState => {
    if (key === 'format') return 'ok';
    if (key === 'path') {
      if (pathVariables.length === 0) return 'empty';
      return pathVariables.every((variable) => {
        const mapping = allValues.pathVariableMappings?.[variable] ?? {};
        const targets = normalizeTargetMappings({ id: variable, targetMappings: mapping.targetMappings, targetValue: mapping.target, operation: mapping.operation });
        return targets.length > 0 && targets.every((target) => hasValue(target.targetValue));
      }) ? 'ok' : 'error';
    }
    if (key === 'query') return flatSchemaState(allValues.queryParameters);
    if (key === 'header') return flatSchemaState(allValues.requestHeaders);
    if (key === 'body') return bodySchemaState(allValues.requestBody);
    if (key === 'mapping') return effectiveRequestMappingMode === 'script'
      ? (hasValue(allValues.requestMappingScript) ? 'ok' : 'error')
      : mergeTabStates([state('path'), state('query'), state('header'), state('body')]);
    if (key === 'security') {
      const decryptionState: TabState = effectiveDecryptionEnabled ? (hasValue(allValues.decryptionAlgorithm) && hasValue(allValues.encryptedField) ? 'ok' : 'error') : 'empty';
      const verificationState: TabState = effectiveVerificationEnabled ? (hasValue(allValues.verificationAlgorithm) && hasValue(allValues.signatureField) ? 'ok' : 'error') : 'empty';
      return mergeTabStates([decryptionState, verificationState]);
    }
    if (key === 'code') {
      if (!effectiveCodeMappingEnabled) return 'empty';
      if (!hasValue(allValues.componentInstance)) return 'error';
      return effectiveCodeMappingMode === 'custom'
        ? (hasValue(allValues.codeMappingScript) ? 'ok' : 'error')
        : (hasRows(allValues.responseCodeAssembly) ? 'ok' : 'error');
    }
    return 'empty';
  };
  const handleSave = async () => {
    const values = await form.validateFields();
    const pathTargets = pathVariables.flatMap((variable) => {
      const mapping = values.pathVariableMappings?.[variable] ?? {};
      return normalizeTargetMappings({ id: variable, targetMappings: mapping.targetMappings, targetValue: mapping.target, operation: mapping.operation });
    });
    if (effectiveRequestMappingMode !== 'script' && pathVariables.some((variable) => {
      const mapping = values.pathVariableMappings?.[variable] ?? {};
      return normalizeTargetMappings({ id: variable, targetMappings: mapping.targetMappings, targetValue: mapping.target, operation: mapping.operation }).length === 0;
    })) return void message.error('Add at least one Target Mapping for every Path Variable.');
    const mappingError = validateTargetMappings([
      ...pathTargets,
      ...collectFieldTargetMappings(values.queryParameters),
      ...collectFieldTargetMappings(values.requestHeaders),
      ...collectFieldTargetMappings(values.requestBody),
    ]);
    if (mappingError) return void message.error(mappingError);
    onSave(values);
  };
  return <Drawer title={<Space><span>Configure Inbound Request</span><Tag color="cyan">inboundRequest</Tag></Space>} width="min(1180px, 92vw)" open={open} onClose={onClose} destroyOnClose extra={!readOnly && <Space><Button onClick={onClose}>Cancel</Button><Button type="primary" onClick={() => void handleSave()}>Save</Button></Space>}>
    <ConfigProvider componentSize="middle" theme={{ components: { Form: { itemMarginBottom: 10 } } }}>
      <Form form={form} disabled={readOnly} layout="vertical" initialValues={{ requestMappingMode: 'configuration', codeMappingEnabled: false, codeMappingMode: 'default', ...initialValues }}>
        <Tabs activeKey={activeTab} onChange={setActiveTab} items={[
          { key: 'format', label: tabLabel('Message Format', state('format')), children: <Card size="small"><Alert type="info" showIcon message="Request Message Format is inherited from Route Matching · inboundPreprocess." description="The target Flow uses the currently effective preprocessing format. inboundRequest does not override it." /></Card> },
          { key: 'mapping', label: tabLabel('Fields & Mapping', state('mapping')), children: <>
            <Alert type="info" showIcon message="Define the complete request fields using the preprocessed, decrypted request. Do not add an encrypted carrier already consumed by inboundPreprocess." style={{ marginBottom: 12 }} />
            <Form.Item name="requestMappingMode"><Radio.Group optionType="button" buttonStyle="solid" options={[{ label: 'Configuration Mode', value: 'configuration' }, { label: 'Script Mode', value: 'script' }]} /></Form.Item>
            <Tabs type="card" size="small" items={[
              { key: 'path', label: tabLabel('Path Vars', state('path')), children: effectiveRequestMappingMode === 'script'
                ? <EndpointPathVariablesReference variables={pathVariables} endpointPath={endpointPath} />
                : <InboundPathVariableMapping variables={pathVariables} endpointPath={endpointPath} /> },
              { key: 'query', label: tabLabel('Params', state('query')), children: <Form.Item name="queryParameters" initialValue={[]}><FlatFieldMappingEditor schemaOnly={effectiveRequestMappingMode === 'script'} fixedFieldType="String" direction="response" title="Query Parameter Fields" addLabel="Add Parameter" fieldPlaceholder="External field" sourceOptions={[]} targetOptions={spiRequestOptions} dataTypeOptions={flatTypes} operationOptions={mappingOperationOptions} targetPlaceholder="SPI request field" /></Form.Item> },
              { key: 'header', label: tabLabel('Headers', state('header')), children: <Form.Item name="requestHeaders" initialValue={[]}><FlatFieldMappingEditor schemaOnly={effectiveRequestMappingMode === 'script'} fixedFieldType="String" direction="response" title="Request Header Fields" addLabel="Add Header" fieldPlaceholder="External field" sourceOptions={[]} targetOptions={spiRequestOptions} dataTypeOptions={flatTypes} operationOptions={mappingOperationOptions} targetPlaceholder="SPI request field" /></Form.Item> },
              { key: 'body', label: tabLabel('Body', state('body')), children: <Form.Item name="requestBody" initialValue={[]}><BodySchemaMappingEditor schemaOnly={effectiveRequestMappingMode === 'script'} direction="response" sourceOptions={[]} targetOptions={spiRequestOptions} dataTypeOptions={types} operationOptions={mappingOperationOptions} targetPlaceholder="SPI request field" /></Form.Item> },
            ]} />
            {requestMappingMode === 'script' && <Card size="small" title="Mapping Script" style={{ marginTop: 12 }}><GroovyScriptEditor name="requestMappingScript" helpText="Map pathVariables, queryParameters, requestHeaders and the preprocessed requestBody to SPI Request." /></Card>}
          </> },
          { key: 'security', label: tabLabel('Security', state('security')), children: <Card size="small"><div style={{ border: '1px solid #f0f0f0', borderRadius: 6, overflow: 'hidden' }}>
            <SecuritySection title="Decryption" enabledName="decryptionEnabled" enabled={effectiveDecryptionEnabled}><Form.Item name="decryptionAlgorithm" label="Algorithm" rules={[{ required: true }]}><Select options={encryption} /></Form.Item><Form.Item name="encryptedField" label="Encrypted Field"><Input placeholder="Request field not decrypted by A" /></Form.Item><Form.Item name="decryptionSources" label="Decryption Source Fields"><Checkbox.Group options={['Path Variables', 'Query Parameters', 'Request Headers', 'Request Body']} /></Form.Item></SecuritySection>
            <SecuritySection title="Signature Verification" enabledName="verificationEnabled" enabled={effectiveVerificationEnabled}><Form.Item name="verificationAlgorithm" label="Algorithm" rules={[{ required: true }]}><Select options={signing} /></Form.Item><Form.Item name="signatureField" label="Request Signature Field"><Input placeholder="Request header or body field" /></Form.Item><Form.Item name="verificationSources" label="Verification Source Fields"><Checkbox.Group options={['Path Variables', 'Query Parameters', 'Request Headers', 'Request Body']} /></Form.Item></SecuritySection>
          </div></Card> },
          { key: 'code', label: tabLabel('Code Mapping', state('code')), children: <Card size="small" title={<Space><Form.Item name="codeMappingEnabled" valuePropName="checked" noStyle><Switch size="small" /></Form.Item>Channel Response Code</Space>}>{effectiveCodeMappingEnabled ? <><Alert type="info" showIcon message="Interpret this inbound callback request as the channel response to an earlier outbound request." style={{ marginBottom: 12 }} /><Form.Item name="componentInstance" label="Component Instance" rules={[{ required: true }]}><Select options={[{ value: 'FAIL' }, { value: 'PENDING' }]} /></Form.Item><Form.Item name="codeMappingMode" label="Assembly Mode"><Radio.Group optionType="button" options={[{ label: 'Default', value: 'default' }, { label: 'Custom Script', value: 'custom' }]} /></Form.Item>{effectiveCodeMappingMode === 'custom' ? <GroovyScriptEditor name="codeMappingScript" helpText="Return channelResponseCode from the available inbound request fields." /> : <><Form.Item name="responseCodeAssembly" label="Channel Response Code Assembly" rules={[{ required: true }]}><Select mode="multiple" placeholder="Select request fields in assembly order" options={['Path Variable', 'Query Parameter', 'Request Header', 'Request Body'].map((value) => ({ value }))} /></Form.Item><Form.Item name="responseMessageField" label="Channel Response Message Field"><Input placeholder="Optional request field path" /></Form.Item></>}</> : <Text type="secondary">Enable only when the inbound request reports the result of a previous channel request.</Text>}</Card> },
        ]} />
      </Form>
    </ConfigProvider>
  </Drawer>;
}

function InboundPathVariableMapping({ variables, endpointPath }: { variables: string[]; endpointPath?: string }) {
  if (variables.length === 0) return <EndpointPathVariablesReference variables={variables} endpointPath={endpointPath} />;
  const columns = 'minmax(180px,1fr) 80px minmax(460px,2fr)';
  return <div>
    <EndpointPathVariablesReference variables={variables} endpointPath={endpointPath} />
    <div style={{ border: '1px solid #e8e8e8', borderRadius: 8, overflow: 'hidden', marginTop: 10 }}>
      <div style={{ display: 'grid', gridTemplateColumns: columns, gap: 8, padding: '7px 10px', color: '#8c8c8c', fontSize: 11, background: '#fafafa', borderBottom: '1px solid #f0f0f0' }}>
        <span>PATH VARIABLE</span><span>TYPE</span><TargetMappingColumnHeaders />
      </div>
      {variables.map((variable) => <div key={variable} style={{ display: 'grid', gridTemplateColumns: columns, gap: 8, alignItems: 'center', padding: '6px 10px', borderBottom: '1px solid #f5f5f5' }}>
        <Input value={`{${variable}}`} disabled />
        <Text>String</Text>
        <InboundPathVariableTargetMappings variable={variable} variables={variables} />
      </div>)}
    </div>
  </div>;
}

function InboundPathVariableTargetMappings({ variable, variables }: { variable: string; variables: string[] }) {
  const form = Form.useFormInstance();
  const allPathMappings = Form.useWatch('pathVariableMappings', form) ?? {};
  const current = allPathMappings[variable] ?? {};
  const mappings = normalizeTargetMappings({ id: variable, targetMappings: current.targetMappings, targetValue: current.target, operation: current.operation });
  const reservedTargetValues = variables.flatMap((otherVariable) => {
    if (otherVariable === variable) return [];
    const other = allPathMappings[otherVariable] ?? {};
    return normalizeTargetMappings({ id: otherVariable, targetMappings: other.targetMappings, targetValue: other.target, operation: other.operation })
      .map((mapping) => mapping.targetValue)
      .filter((target): target is string => Boolean(target));
  });
  const update = (targetMappings: TargetMapping[]) => {
    form.setFieldValue(['pathVariableMappings', variable, 'targetMappings'], targetMappings);
    form.setFieldValue(['pathVariableMappings', variable, 'target'], undefined);
    form.setFieldValue(['pathVariableMappings', variable, 'operation'], undefined);
  };
  return <TargetMappingList
    value={mappings}
    targetOptions={spiRequestOptions}
    operationOptions={mappingOperationOptions}
    targetPlaceholder="SPI request field"
    reservedTargetValues={reservedTargetValues}
    onChange={update}
  />;
}

export function InboundResponseDrawer({ open, initialValues = {}, readOnly = false, onClose, onSave }: Props) {
  const [form] = Form.useForm();
  const watchedValues = Form.useWatch([], form) ?? {};
  const initialFormValues = { responseMappingMode: 'configuration', responseFormat: 'JSON', ...initialValues };
  const allValues = { ...initialFormValues, ...form.getFieldsValue(true), ...watchedValues } as Record<string, any>;
  const responseMappingMode = Form.useWatch('responseMappingMode', form) ?? 'configuration';
  const responseFormat = Form.useWatch('responseFormat', form) ?? 'JSON';
  const signingEnabled = Form.useWatch('signingEnabled', form);
  const encryptionEnabled = Form.useWatch('encryptionEnabled', form);
  const state = (key: string): TabState => {
    if (key === 'headers') return flatSchemaState(allValues.responseHeaders);
    if (key === 'body') return bodySchemaState(allValues.responseBody);
    if (key === 'mapping') return responseMappingMode === 'script'
      ? (hasValue(allValues.responseMappingScript) ? 'ok' : 'error')
      : mergeTabStates([state('headers'), state('body')]);
    if (key === 'security') {
      const signingState: TabState = signingEnabled ? (hasValue(allValues.signingAlgorithm) && hasValue(allValues.signingDestination) ? 'ok' : 'error') : 'empty';
      const encryptionState: TabState = encryptionEnabled ? (hasValue(allValues.encryptionAlgorithm) && hasValue(allValues.encryptionDestination) ? 'ok' : 'error') : 'empty';
      return mergeTabStates([signingState, encryptionState]);
    }
    if (key === 'format') {
      if (!hasValue(allValues.responseFormat)) return 'error';
      if (allValues.responseFormat === 'Custom' && !hasValue(allValues.responseMessageScript)) return 'error';
      return 'ok';
    }
    return 'empty';
  };
  return <Drawer title={<Space><span>Configure Inbound Response</span><Tag color="green">inboundResponse</Tag></Space>} width="min(1180px, 92vw)" open={open} onClose={onClose} destroyOnClose extra={!readOnly && <Space><Button onClick={onClose}>Cancel</Button><Button type="primary" onClick={() => form.validateFields().then(onSave)}>Save</Button></Space>}>
    <ConfigProvider componentSize="middle" theme={{ components: { Form: { itemMarginBottom: 10 } } }}>
      <Form form={form} disabled={readOnly} layout="vertical" initialValues={{ responseMappingMode: 'configuration', responseFormat: 'JSON', ...initialValues }}>
        <Tabs items={[
          { key: 'mapping', label: tabLabel('Fields & Mapping', state('mapping')), children: <>
            <Form.Item name="responseMappingMode"><Radio.Group optionType="button" buttonStyle="solid" options={[{ label: 'Configuration Mode', value: 'configuration' }, { label: 'Script Mode', value: 'script' }]} /></Form.Item>
            <Tabs type="card" size="small" items={[
              { key: 'header', label: tabLabel('Headers', state('headers')), children: <Form.Item name="responseHeaders" initialValue={[]}><FlatFieldMappingEditor schemaOnly={responseMappingMode === 'script'} fixedFieldType="String" title="Response Header Fields" addLabel="Add Header" fieldPlaceholder="External response field" sourceOptions={spiResponseOptions} dataTypeOptions={flatTypes} operationOptions={mappingOperationOptions} sourcePlaceholder="SPI response field" /></Form.Item> },
              { key: 'body', label: tabLabel('Body', state('body')), children: <Form.Item name="responseBody" initialValue={[]}><BodySchemaMappingEditor schemaOnly={responseMappingMode === 'script'} sourceOptions={spiResponseOptions} dataTypeOptions={types} operationOptions={mappingOperationOptions} sourcePlaceholder="SPI response field" /></Form.Item> },
            ]} />
            {responseMappingMode === 'script' && <Card size="small" title="Mapping Script" style={{ marginTop: 12 }}><GroovyScriptEditor name="responseMappingScript" helpText="Map SPI Response and Flow Context to responseHeaders and responseBody." /></Card>}
          </> },
          { key: 'security', label: tabLabel('Security', state('security')), children: <Card size="small"><div style={{ border: '1px solid #f0f0f0', borderRadius: 6, overflow: 'hidden' }}>
            <SecuritySection title="Signing" enabledName="signingEnabled" enabled={signingEnabled}><Form.Item name="signingAlgorithm" label="Algorithm" rules={[{ required: true }]}><Select options={signing} /></Form.Item><Form.Item name="signingSources" label="Signing Source Fields"><Checkbox.Group options={['Response Headers', 'Response Body']} /></Form.Item><Form.Item name="signingDestination" label="Signature Destination Field"><Input placeholder="Response header or body field" /></Form.Item></SecuritySection>
            <SecuritySection title="Encryption" enabledName="encryptionEnabled" enabled={encryptionEnabled}><Form.Item name="encryptionAlgorithm" label="Algorithm" rules={[{ required: true }]}><Select options={encryption} /></Form.Item><Form.Item name="encryptionSources" label="Encryption Source Fields"><Checkbox.Group options={['Response Headers', 'Response Body']} /></Form.Item><Form.Item name="encryptionDestination" label="Encrypted Destination Field"><Input placeholder="Response field path" /></Form.Item></SecuritySection>
          </div></Card> },
          { key: 'format', label: tabLabel('Message Format', state('format')), children: <Card size="small"><Form.Item name="responseFormat" label="Response Message Format" rules={[{ required: true }]}><Radio.Group options={formats} /></Form.Item>{responseFormat === 'Custom' && <GroovyScriptEditor name="responseMessageScript" helpText="Serialize responseHeaders and responseBody into the final outbound response message." />}</Card> },
        ]} />
      </Form>
    </ConfigProvider>
  </Drawer>;
}

function SecuritySection({ title, enabledName, enabled, children }: { title: string; enabledName: string; enabled?: boolean; children: ReactNode }) {
  return <div style={{ padding: 14, borderBottom: '1px solid #f0f0f0' }}><div style={{ marginBottom: 10 }}><Space><Form.Item name={enabledName} valuePropName="checked" noStyle><Switch size="small" /></Form.Item><Text strong>{title}</Text></Space></div>{enabled ? children : <Text type="secondary">Enable {title.toLowerCase()} when required.</Text>}</div>;
}

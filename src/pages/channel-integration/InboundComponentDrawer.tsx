import { useState } from 'react';
import type { ReactNode } from 'react';
import { Alert, Button, Card, Checkbox, ConfigProvider, Drawer, Form, Input, Radio, Select, Space, Switch, Tabs, Tag, Typography } from 'antd';
import BodySchemaMappingEditor from './BodySchemaMappingEditor';
import FlatFieldMappingEditor from './FlatFieldMappingEditor';
import GroovyScriptEditor from './GroovyScriptEditor';
import { mappingOperationOptions } from './mappingOperationOptions';

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

type Props = { open: boolean; readOnly?: boolean; onClose: () => void; onSave: (config: Record<string, unknown>) => void };

export function InboundRequestDrawer({ open, readOnly = false, onClose, onSave }: Props) {
  const [form] = Form.useForm();
  const [activeTab, setActiveTab] = useState('format');
  const requestMappingMode = Form.useWatch('requestMappingMode', form) ?? 'configuration';
  const decryptionEnabled = Form.useWatch('decryptionEnabled', form);
  const verificationEnabled = Form.useWatch('verificationEnabled', form);
  const codeMappingEnabled = Form.useWatch('codeMappingEnabled', form);
  const codeMappingMode = Form.useWatch('codeMappingMode', form) ?? 'default';
  return <Drawer title={<Space><span>Configure Inbound Request</span><Tag color="cyan">inboundRequest</Tag></Space>} width="min(1180px, 92vw)" open={open} onClose={onClose} destroyOnClose extra={!readOnly && <Space><Button onClick={onClose}>Cancel</Button><Button type="primary" onClick={() => form.validateFields().then(onSave)}>Save</Button></Space>}>
    <ConfigProvider componentSize="middle" theme={{ components: { Form: { itemMarginBottom: 10 } } }}>
      <Form form={form} disabled={readOnly} layout="vertical" initialValues={{ requestMappingMode: 'configuration', codeMappingEnabled: false, codeMappingMode: 'default' }}>
        <Tabs activeKey={activeTab} onChange={setActiveTab} items={[
          { key: 'format', label: 'Message Format', children: <Card size="small"><Alert type="info" showIcon message="Request Message Format is inherited from Match Capability · inboundPreprocess." description="The target Flow uses the currently effective preprocessing format. inboundRequest does not override it." /></Card> },
          { key: 'mapping', label: 'Fields & Mapping', children: <>
            <Alert type="info" showIcon message="Define the complete request fields using the preprocessed, decrypted request. Do not add an encrypted carrier already consumed by inboundPreprocess." style={{ marginBottom: 12 }} />
            <Form.Item name="requestMappingMode"><Radio.Group optionType="button" buttonStyle="solid" options={[{ label: 'Configuration Mode', value: 'configuration' }, { label: 'Script Mode', value: 'script' }]} /></Form.Item>
            <Tabs type="card" size="small" items={[
              { key: 'path', label: 'Path Vars', children: <Form.Item name="pathVariables" initialValue={[]}><FlatFieldMappingEditor schemaOnly={requestMappingMode === 'script'} fixedFieldType="String" direction="response" title="Path Variable Fields" addLabel="Add Variable" fieldPlaceholder="External field" sourceOptions={[]} targetOptions={spiRequestOptions} dataTypeOptions={flatTypes} operationOptions={mappingOperationOptions} targetPlaceholder="SPI request field" /></Form.Item> },
              { key: 'query', label: 'Params', children: <Form.Item name="queryParameters" initialValue={[]}><FlatFieldMappingEditor schemaOnly={requestMappingMode === 'script'} fixedFieldType="String" direction="response" title="Query Parameter Fields" addLabel="Add Parameter" fieldPlaceholder="External field" sourceOptions={[]} targetOptions={spiRequestOptions} dataTypeOptions={flatTypes} operationOptions={mappingOperationOptions} targetPlaceholder="SPI request field" /></Form.Item> },
              { key: 'header', label: 'Headers', children: <Form.Item name="requestHeaders" initialValue={[]}><FlatFieldMappingEditor schemaOnly={requestMappingMode === 'script'} fixedFieldType="String" direction="response" title="Request Header Fields" addLabel="Add Header" fieldPlaceholder="External field" sourceOptions={[]} targetOptions={spiRequestOptions} dataTypeOptions={flatTypes} operationOptions={mappingOperationOptions} targetPlaceholder="SPI request field" /></Form.Item> },
              { key: 'body', label: 'Body', children: <Form.Item name="requestBody" initialValue={[]}><BodySchemaMappingEditor schemaOnly={requestMappingMode === 'script'} direction="response" sourceOptions={[]} targetOptions={spiRequestOptions} dataTypeOptions={types} operationOptions={mappingOperationOptions} targetPlaceholder="SPI request field" /></Form.Item> },
            ]} />
            {requestMappingMode === 'script' && <Card size="small" title="Mapping Script" style={{ marginTop: 12 }}><GroovyScriptEditor name="requestMappingScript" helpText="Map pathVariables, queryParameters, requestHeaders and the preprocessed requestBody to SPI Request." /></Card>}
          </> },
          { key: 'security', label: 'Security', children: <Card size="small"><div style={{ border: '1px solid #f0f0f0', borderRadius: 6, overflow: 'hidden' }}>
            <SecuritySection title="Decryption" enabledName="decryptionEnabled" enabled={decryptionEnabled}><Form.Item name="decryptionAlgorithm" label="Algorithm" rules={[{ required: true }]}><Select options={encryption} /></Form.Item><Form.Item name="encryptedField" label="Encrypted Field"><Input placeholder="Request field not decrypted by A" /></Form.Item><Form.Item name="decryptionSources" label="Decryption Source Fields"><Checkbox.Group options={['Path Variables', 'Query Parameters', 'Request Headers', 'Request Body']} /></Form.Item></SecuritySection>
            <SecuritySection title="Signature Verification" enabledName="verificationEnabled" enabled={verificationEnabled}><Form.Item name="verificationAlgorithm" label="Algorithm" rules={[{ required: true }]}><Select options={signing} /></Form.Item><Form.Item name="signatureField" label="Request Signature Field"><Input placeholder="Request header or body field" /></Form.Item><Form.Item name="verificationSources" label="Verification Source Fields"><Checkbox.Group options={['Path Variables', 'Query Parameters', 'Request Headers', 'Request Body']} /></Form.Item></SecuritySection>
          </div></Card> },
          { key: 'code', label: 'Code Mapping', children: <Card size="small" title={<Space><Form.Item name="codeMappingEnabled" valuePropName="checked" noStyle><Switch size="small" /></Form.Item>Channel Response Code</Space>}>{codeMappingEnabled ? <><Alert type="info" showIcon message="Interpret this inbound callback request as the channel response to an earlier outbound request." style={{ marginBottom: 12 }} /><Form.Item name="componentInstance" label="Component Instance" rules={[{ required: true }]}><Select options={[{ value: 'FAIL' }, { value: 'PENDING' }]} /></Form.Item><Form.Item name="codeMappingMode" label="Assembly Mode"><Radio.Group optionType="button" options={[{ label: 'Default', value: 'default' }, { label: 'Custom Script', value: 'custom' }]} /></Form.Item>{codeMappingMode === 'custom' ? <GroovyScriptEditor name="codeMappingScript" helpText="Return channelResponseCode from the available inbound request fields." /> : <><Form.Item name="responseCodeAssembly" label="Channel Response Code Assembly" rules={[{ required: true }]}><Select mode="multiple" placeholder="Select request fields in assembly order" options={['Path Variable', 'Query Parameter', 'Request Header', 'Request Body'].map((value) => ({ value }))} /></Form.Item><Form.Item name="responseMessageField" label="Channel Response Message Field"><Input placeholder="Optional request field path" /></Form.Item></>}</> : <Text type="secondary">Enable only when the inbound request reports the result of a previous channel request.</Text>}</Card> },
        ]} />
      </Form>
    </ConfigProvider>
  </Drawer>;
}

export function InboundResponseDrawer({ open, readOnly = false, onClose, onSave }: Props) {
  const [form] = Form.useForm();
  const responseMappingMode = Form.useWatch('responseMappingMode', form) ?? 'configuration';
  const responseFormat = Form.useWatch('responseFormat', form) ?? 'JSON';
  const signingEnabled = Form.useWatch('signingEnabled', form);
  const encryptionEnabled = Form.useWatch('encryptionEnabled', form);
  return <Drawer title={<Space><span>Configure Inbound Response</span><Tag color="green">inboundResponse</Tag></Space>} width="min(1180px, 92vw)" open={open} onClose={onClose} destroyOnClose extra={!readOnly && <Space><Button onClick={onClose}>Cancel</Button><Button type="primary" onClick={() => form.validateFields().then(onSave)}>Save</Button></Space>}>
    <ConfigProvider componentSize="middle" theme={{ components: { Form: { itemMarginBottom: 10 } } }}>
      <Form form={form} disabled={readOnly} layout="vertical" initialValues={{ responseMappingMode: 'configuration', responseFormat: 'JSON' }}>
        <Tabs items={[
          { key: 'mapping', label: 'Fields & Mapping', children: <>
            <Form.Item name="responseMappingMode"><Radio.Group optionType="button" buttonStyle="solid" options={[{ label: 'Configuration Mode', value: 'configuration' }, { label: 'Script Mode', value: 'script' }]} /></Form.Item>
            <Tabs type="card" size="small" items={[
              { key: 'header', label: 'Headers', children: <Form.Item name="responseHeaders" initialValue={[]}><FlatFieldMappingEditor schemaOnly={responseMappingMode === 'script'} fixedFieldType="String" title="Response Header Fields" addLabel="Add Header" fieldPlaceholder="External response field" sourceOptions={spiResponseOptions} dataTypeOptions={flatTypes} operationOptions={mappingOperationOptions} sourcePlaceholder="SPI response field" /></Form.Item> },
              { key: 'body', label: 'Body', children: <Form.Item name="responseBody" initialValue={[]}><BodySchemaMappingEditor schemaOnly={responseMappingMode === 'script'} sourceOptions={spiResponseOptions} dataTypeOptions={types} operationOptions={mappingOperationOptions} sourcePlaceholder="SPI response field" /></Form.Item> },
            ]} />
            {responseMappingMode === 'script' && <Card size="small" title="Mapping Script" style={{ marginTop: 12 }}><GroovyScriptEditor name="responseMappingScript" helpText="Map SPI Response and Flow Context to responseHeaders and responseBody." /></Card>}
          </> },
          { key: 'security', label: 'Security', children: <Card size="small"><div style={{ border: '1px solid #f0f0f0', borderRadius: 6, overflow: 'hidden' }}>
            <SecuritySection title="Signing" enabledName="signingEnabled" enabled={signingEnabled}><Form.Item name="signingAlgorithm" label="Algorithm" rules={[{ required: true }]}><Select options={signing} /></Form.Item><Form.Item name="signingSources" label="Signing Source Fields"><Checkbox.Group options={['Response Headers', 'Response Body']} /></Form.Item><Form.Item name="signingDestination" label="Signature Destination Field"><Input placeholder="Response header or body field" /></Form.Item></SecuritySection>
            <SecuritySection title="Encryption" enabledName="encryptionEnabled" enabled={encryptionEnabled}><Form.Item name="encryptionAlgorithm" label="Algorithm" rules={[{ required: true }]}><Select options={encryption} /></Form.Item><Form.Item name="encryptionSources" label="Encryption Source Fields"><Checkbox.Group options={['Response Headers', 'Response Body']} /></Form.Item><Form.Item name="encryptionDestination" label="Encrypted Destination Field"><Input placeholder="Response field path" /></Form.Item></SecuritySection>
          </div></Card> },
          { key: 'format', label: 'Message Format', children: <Card size="small"><Form.Item name="responseFormat" label="Response Message Format" rules={[{ required: true }]}><Radio.Group options={formats} /></Form.Item>{responseFormat === 'Custom' && <GroovyScriptEditor name="responseMessageScript" helpText="Serialize responseHeaders and responseBody into the final outbound response message." />}</Card> },
        ]} />
      </Form>
    </ConfigProvider>
  </Drawer>;
}

function SecuritySection({ title, enabledName, enabled, children }: { title: string; enabledName: string; enabled?: boolean; children: ReactNode }) {
  return <div style={{ padding: 14, borderBottom: '1px solid #f0f0f0' }}><div style={{ marginBottom: 10 }}><Space><Form.Item name={enabledName} valuePropName="checked" noStyle><Switch size="small" /></Form.Item><Text strong>{title}</Text></Space></div>{enabled ? children : <Text type="secondary">Enable {title.toLowerCase()} when required.</Text>}</div>;
}

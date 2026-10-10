import { useState } from 'react';
import { Alert, Button, Card, ConfigProvider, Drawer, Form, Input, Radio, Select, Space, Switch, Tabs, Tag, Typography } from 'antd';
import FlatFieldMappingEditor from './FlatFieldMappingEditor';
import BodySchemaMappingEditor, { type BodySchemaNode } from './BodySchemaMappingEditor';
import { mappingOperationOptions } from './mappingOperationOptions';
import EndpointPathVariablesReference from './EndpointPathVariablesReference';

const { Text } = Typography;
const types = ['String', 'Integer', 'Long', 'Boolean', 'Object', 'Array'].map((value) => ({ label: value, value }));
const flatTypes = types.filter((item) => !['Object', 'Array'].includes(item.value));
const formats = ['Custom', 'FORM_DATA', 'JSON', 'X_WWW_FORM_URLENCODED', 'XML'].map((value) => ({ label: value, value }));
const encryption = ['AES (CBC)', 'AES (ECB)', 'Custom', 'RSA'].map((value) => ({ label: value, value }));
const Dot = ({ color }: { color: string }) => <span style={{ display: 'inline-block', width: 7, height: 7, borderRadius: 7, background: color }} />;
type TabState = 'empty' | 'ok' | 'error';
const tabLabel = (label: string, state: TabState) => <Space size={6}><span>{label}</span>{state !== 'empty' && <Dot color={state === 'ok' ? '#52c41a' : '#ff4d4f'} />}</Space>;
const hasValue = (value: unknown) => Array.isArray(value) ? value.length > 0 : value !== undefined && value !== null && value !== '';
const hasRows = (value: unknown): value is Array<Record<string, unknown>> => Array.isArray(value) && value.length > 0;
const flatSchemaState = (fields: unknown): TabState => {
  if (!hasRows(fields)) return 'empty';
  return fields.every((field) => hasValue(field.name) && hasValue(field.type)) ? 'ok' : 'error';
};
const bodySchemaNodeComplete = (node: BodySchemaNode): boolean => {
  if (!hasValue(node.name) || !hasValue(node.type)) return false;
  if (['Object', 'Array'].includes(node.type)) return (node.children ?? []).every(bodySchemaNodeComplete);
  return true;
};
const bodySchemaState = (nodes: unknown): TabState => {
  if (!Array.isArray(nodes) || nodes.length === 0) return 'empty';
  return nodes.every((node) => bodySchemaNodeComplete(node as BodySchemaNode)) ? 'ok' : 'error';
};

export default function InboundPreprocessDrawer({ open, readOnly, initialValues, pathVariables, endpointPath, onClose, onSave }: { open: boolean; readOnly: boolean; initialValues: Record<string, unknown>; pathVariables: string[]; endpointPath?: string; onClose: () => void; onSave: (values: Record<string, unknown>) => void }) {
  const [form] = Form.useForm();
  const [, force] = useState(0);
  const watchedValues = Form.useWatch([], form) ?? {};
  const initialFormValues = { requestMessageFormat: 'JSON', ...initialValues, decryptEnabled: initialValues.decryptEnabled ?? false };
  const allValues = { ...initialFormValues, ...form.getFieldsValue(true), ...watchedValues } as Record<string, any>;
  const format = allValues.requestMessageFormat ?? 'JSON';
  const decryptionEnabled = Boolean(allValues.decryptEnabled);
  const decryptionAlgorithm = allValues.decryptionAlgorithm;
  const state = (key: string): TabState => {
    if (key === 'format') {
      if (!hasValue(allValues.requestMessageFormat)) return 'error';
      if (allValues.requestMessageFormat === 'Custom' && (!hasValue(allValues.requestContentType) || !hasValue(allValues.requestFormatScript))) return 'error';
      return 'ok';
    }
    if (key === 'path') return pathVariables.length > 0 ? 'ok' : 'empty';
    if (key === 'params') return flatSchemaState(allValues.preprocessQueryFields);
    if (key === 'headers') return flatSchemaState(allValues.preprocessHeaderFields);
    if (key === 'body') return bodySchemaState(allValues.preprocessBodyFields);
    if (key === 'security') {
      if (!decryptionEnabled) return 'empty';
      if (!hasValue(allValues.decryptionAlgorithm) || !hasValue(allValues.encryptedField)) return 'error';
      if (allValues.decryptionAlgorithm === 'Custom' && !hasValue(allValues.decryptionScript)) return 'error';
      return 'ok';
    }
    return 'empty';
  };
  return <Drawer title={<Space><span>inboundPreprocess Configuration</span><Tag color="blue">Route Matching</Tag></Space>} width="min(1080px, 92vw)" open={open} onClose={onClose} destroyOnClose extra={!readOnly && <Space><Button onClick={onClose}>Cancel</Button><Button type="primary" onClick={() => form.validateFields().then(onSave)}>Submit</Button></Space>}>
    <ConfigProvider componentSize="middle" theme={{ components: { Form: { itemMarginBottom: 10 }, Tabs: { horizontalMargin: '0 0 10px 0' } } }}>
      <Form form={form} disabled={readOnly} layout="vertical" initialValues={initialFormValues} onValuesChange={() => force((value) => value + 1)}>
        <Alert type="info" showIcon message="Prepare only the request fields required for capability matching. The selected message format is inherited by the target Flow." style={{ marginBottom: 14 }} />
        <Tabs size="small" items={[
          { key: 'format', label: tabLabel('Message Format', state('format')), children: <Card size="small"><Form.Item name="requestMessageFormat" label="Request Message Format" rules={[{ required: true }]}><Radio.Group options={formats} /></Form.Item>{format === 'Custom' && <><Form.Item name="requestContentType" label="Content Type" rules={[{ required: true }]}><Input placeholder="application/json" /></Form.Item><Form.Item name="requestFormatScript" label="Custom Parse Script" rules={[{ required: true }]}><Input.TextArea rows={14} placeholder={'def execute(rawRequest) {\n  // return parsed request data\n  return null\n}'} style={{ fontFamily: 'monospace', background: '#1f1f1f', color: '#f5f5f5' }} /></Form.Item></>}</Card> },
          { key: 'path', label: tabLabel('Path Vars', state('path')), children: <EndpointPathVariablesReference variables={pathVariables} endpointPath={endpointPath} /> },
          { key: 'params', label: tabLabel('Params', state('params')), children: <Form.Item name="preprocessQueryFields" initialValue={[]}><FlatFieldMappingEditor schemaOnly fixedFieldType="String" title="Query Parameters" addLabel="Add Parameter" fieldPlaceholder="Parameter name" sourceOptions={[]} dataTypeOptions={flatTypes} operationOptions={mappingOperationOptions} /></Form.Item> },
          { key: 'headers', label: tabLabel('Headers', state('headers')), children: <Form.Item name="preprocessHeaderFields" initialValue={[]}><FlatFieldMappingEditor schemaOnly fixedFieldType="String" title="Request Headers" addLabel="Add Header" fieldPlaceholder="Header name" sourceOptions={[]} dataTypeOptions={flatTypes} operationOptions={mappingOperationOptions} /></Form.Item> },
          { key: 'body', label: tabLabel('Body', state('body')), children: <Form.Item name="preprocessBodyFields" initialValue={[]}><BodySchemaMappingEditor schemaOnly sourceOptions={[]} dataTypeOptions={types} operationOptions={mappingOperationOptions} /></Form.Item> },
          { key: 'security', label: tabLabel('Security', state('security')), children: <Card size="small"><div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><Space><Form.Item name="decryptEnabled" valuePropName="checked" noStyle><Switch size="small" /></Form.Item><Text strong>Decryption</Text></Space></div>{decryptionEnabled ? <div style={{ marginTop: 14 }}><Form.Item name="decryptionAlgorithm" label="Algorithm" rules={[{ required: true }]}><Select options={encryption} /></Form.Item><Form.Item name="encryptedField" label="Encrypted Field" rules={[{ required: true }]}><Input placeholder="Request header or body field path" /></Form.Item><Form.Item name="decryptionSourceFields" label="Decryption Source Fields"><Select mode="multiple" options={['Path Variables', 'Query Parameters', 'Request Headers', 'Request Body'].map((value) => ({ value }))} /></Form.Item>{decryptionAlgorithm === 'Custom' && <Form.Item name="decryptionScript" label="Custom Script" rules={[{ required: true }]}><Input.TextArea rows={12} style={{ fontFamily: 'monospace', background: '#1f1f1f', color: '#f5f5f5' }} /></Form.Item>}</div> : <Text type="secondary" style={{ display: 'block', marginTop: 8 }}>Enable when capability matching requires decrypted fields.</Text>}</Card> },
        ]} />
      </Form>
    </ConfigProvider>
  </Drawer>;
}

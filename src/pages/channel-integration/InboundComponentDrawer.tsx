import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { Alert, Button, Card, Checkbox, ConfigProvider, Drawer, Form, Input, message, Radio, Select, Space, Switch, Tabs, Tag, Tooltip, Typography } from 'antd';
import { QuestionCircleOutlined, DeleteOutlined } from '@ant-design/icons';
import BodySchemaMappingEditor, { type BodySchemaNode } from './BodySchemaMappingEditor';
import FlatFieldMappingEditor from './FlatFieldMappingEditor';
import GroovyScriptEditor from './GroovyScriptEditor';
import { mappingOperationOptions } from './mappingOperationOptions';
import { validateOperationConfigs } from './operationConfigs';
import EndpointPathVariablesReference from './EndpointPathVariablesReference';
import { collectFieldTargetMappings, normalizeTargetMappings, targetOptionType, validateTargetMappings } from './TargetMappingList';
import type { TargetMapping } from './TargetMappingList';
import MappingOperationSelector, { type MappingOperationConfig } from './MappingOperationSelector';
import { createInitialConfig, type ConditionalAssignmentConfig } from './conditionalAssignmentModel';
import { operationResultType } from './operationResultType';
import { fallbackStateOptionsFor } from './stateMachineStateOptions';
import { isSubOrderModeEnabled } from '../basic-info/capability/subOrderModeStore';
import ResponseCodeAssemblyEditor from './ResponseCodeAssemblyEditor';

const { Text } = Typography;
const types = ['String', 'Integer', 'Long', 'BigDecimal', 'Boolean', 'Object', 'Array'].map((value) => ({ label: value, value }));
const flatTypes = types.filter((item) => !['Object', 'Array'].includes(item.value));
const formats = ['Custom', 'FORM_DATA', 'JSON', 'X_WWW_FORM_URLENCODED', 'XML'].map((value) => ({ label: value, value }));
const signing = ['Custom', 'HMAC (SHA256)', 'HMAC (SHA512)', 'MD5', 'RSA (SHA1)', 'RSA (SHA256)', 'RSA (SHA512)', 'SHA1', 'SHA256', 'SHA512'].map((value) => ({ label: value, value }));
const encryption = ['AES (CBC)', 'AES (ECB)', 'Custom', 'RSA'].map((value) => ({ label: value, value }));
const unknownResponseHandlingOptions = ['PENDING', 'FAIL'].map((value) => ({ label: value, value }));
const spiRequest = ['amount', 'currency', 'requestReference', 'responseReference', 'customerId', 'accountNumber', 'channelResponseCode', 'channelResponseMessage', 'needNotify'];
/** Demo 造数：SPI Request 侧的类型覆写，未列出的走 String。needNotify 为 Boolean，用于验证 Boolean 条件的退化形态。 */
const spiRequestTypes: Record<string, string> = { amount: 'BigDecimal', needNotify: 'Boolean' };
const spiResponse = ['responseCode', 'responseMessage', 'status', 'requestReference', 'channelReference', 'amount', 'currency'];
const subOrderRequestFields = [
  'feature.featureField',
  'feature.featureValue',
  'identity.requestReference',
  'extraRequest.content',
];
const subOrderResponseFields = [
  'feature.featureField',
  'feature.featureValue',
  'identity.responseReference',
  'result.status',
  'result.responseCode',
  'result.responseMsg',
  'result.channelResponseCode',
  'result.channelResponseMsg',
  'extraResponse.sendTime',
  'extraResponse.sender',
  'extraResponse.deliveryTime',
];
const buildSpiRequestOptions = (subOrderModeEnabled: boolean) => [
  { label: 'SPI Request', options: spiRequest.map((value) => ({ label: value, value: `spi.request.${value}`, type: spiRequestTypes[value] ?? 'String' })) },
  ...(subOrderModeEnabled ? [{
    label: 'SPI Request · subOrderList[*]',
    options: subOrderRequestFields.map((path) => ({ label: path, value: `spi.request.subOrderList._items.${path}`, type: 'String' })),
  }] : []),
];
const buildSpiResponseOptions = (subOrderModeEnabled: boolean) => [
  { label: 'SPI Response', options: spiResponse.map((value) => ({ label: value, value: `spi.response.${value}`, type: value === 'amount' ? 'BigDecimal' : 'String' })) },
  ...(subOrderModeEnabled ? [{
    label: 'SPI Response · subOrderList[*]',
    options: subOrderResponseFields.map((path) => ({ label: path, value: `spi.response.subOrderList._items.${path}`, type: 'String' })),
  }] : []),
];
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
  // 条件赋值的目标行没有外部字段名（取值由条件决定），只校验右侧目标字段。
  return fields.every((field) => (hasValue(field.name) || Boolean(field.conditionalTargetRow)) && hasValue(field.type) && normalizeTargetMappings(field).every((mapping) => hasValue(mapping.targetValue))) ? 'ok' : 'error';
};
const bodySchemaNodeComplete = (node: BodySchemaNode): boolean => {
  if ((!hasValue(node.name) && !node.conditionalTargetRow) || !hasValue(node.type)) return false;
  if (['Object', 'Array'].includes(node.type)) return (node.children ?? []).every(bodySchemaNodeComplete);
  return normalizeTargetMappings(node).every((mapping) => hasValue(mapping.targetValue));
};
const bodySchemaState = (nodes: unknown): TabState => {
  if (!Array.isArray(nodes) || nodes.length === 0) return 'empty';
  return nodes.every((node) => bodySchemaNodeComplete(node as BodySchemaNode)) ? 'ok' : 'error';
};
type ScopedInboundField = { label: string; value: string; scope: string };
const collectInboundBodyFields = (nodes: BodySchemaNode[], parent = ''): ScopedInboundField[] => nodes.flatMap((node) => {
  const path = parent ? `${parent}.${node.name}` : node.name;
  if (['Object', 'Array'].includes(node.type)) return collectInboundBodyFields(node.children ?? [], path);
  return [{ label: `Body / ${path.replace(/\._items(?=\.|$)/g, '[*]')}`, value: `body.${path}`, scope: parent ? `body.${parent}` : 'body' }];
});

type Props = { open: boolean; initialValues?: Record<string, unknown>; readOnly?: boolean; businessType?: string; ability?: string; onClose: () => void; onSave: (config: Record<string, unknown>) => void };
type InboundRequestProps = Props & { pathVariables?: string[]; endpointPath?: string; stateMachine?: string };

export function InboundRequestDrawer({ open, initialValues = {}, readOnly = false, pathVariables = [], endpointPath, stateMachine = '', businessType = '', ability = '', onClose, onSave }: InboundRequestProps) {
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
  const componentInstance = Form.useWatch('componentInstance', form);
  const subOrderComponentInstance = Form.useWatch('subOrderComponentInstance', form);
  const fallbackSubStates = useMemo(() => fallbackStateOptionsFor(stateMachine), [stateMachine]);
  const matchingFallbackSubStates = fallbackSubStates.filter((item) => item.mainState === componentInstance);
  const matchingSubOrderSubStates = fallbackSubStates.filter((item) => item.mainState === subOrderComponentInstance);
  const subOrderModeEnabled = Boolean(businessType && ability && isSubOrderModeEnabled(businessType, ability));
  const spiRequestOptions = buildSpiRequestOptions(subOrderModeEnabled);
  const subOrderFeatureValueField = Form.useWatch('subOrderFeatureValueField', form);
  const requestBody = (allValues.requestBody ?? []) as BodySchemaNode[];
  const scopedRequestFields: ScopedInboundField[] = [
    ...pathVariables.map((value) => ({ label: `Path / ${value}`, value: `path.${value}`, scope: 'path' })),
    ...(Array.isArray(allValues.queryParameters) ? allValues.queryParameters : []).filter((field) => hasValue(field?.name)).map((field) => ({ label: `Params / ${field.name}`, value: `query.${field.name}`, scope: 'query' })),
    ...(Array.isArray(allValues.requestHeaders) ? allValues.requestHeaders : []).filter((field) => hasValue(field?.name)).map((field) => ({ label: `Headers / ${field.name}`, value: `header.${field.name}`, scope: 'header' })),
    ...collectInboundBodyFields(requestBody),
  ];
  const selectedFeatureScope = scopedRequestFields.find((field) => field.value === subOrderFeatureValueField)?.scope;
  const sameLevelRequestFields = scopedRequestFields.filter((field) => field.scope === selectedFeatureScope).map(({ label, value }) => ({ label, value }));
  const allRequestFieldOptions = scopedRequestFields.map(({ label, value }) => ({ label, value }));
  const effectiveRequestMappingMode = allValues.requestMappingMode ?? requestMappingMode;
  const effectiveDecryptionEnabled = Boolean(allValues.decryptionEnabled ?? decryptionEnabled);
  const effectiveVerificationEnabled = Boolean(allValues.verificationEnabled ?? verificationEnabled);
  const effectiveCodeMappingEnabled = Boolean(allValues.codeMappingEnabled ?? codeMappingEnabled);
  const effectiveCodeMappingMode = allValues.codeMappingMode ?? codeMappingMode;
  const state = (key: string): TabState => {
    if (key === 'format') return 'ok';
    if (key === 'path') {
      const conditionalRows = (allValues.pathVariableConditionalRows ?? []) as Array<Record<string, unknown>>;
      if (pathVariables.length === 0 && conditionalRows.length === 0) return 'empty';
      const variablesComplete = pathVariables.every((variable) => {
        const mapping = allValues.pathVariableMappings?.[variable] ?? {};
        const targets = pathVariableTargets(variable, mapping);
        return targets.length > 0 && targets.every((target) => hasValue(target.targetValue));
      });
      // 条件目标行：没有外部字段名是预期的，但必须选好 SPI 目标字段并完成条件配置。
      const conditionalComplete = conditionalRows.every((row) => hasValue(row?.targetValue) && Boolean(row?.conditionalConfig));
      return variablesComplete && conditionalComplete ? 'ok' : 'error';
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
      if (subOrderModeEnabled) {
        const subOrderComplete = hasValue(allValues.subOrderComponentInstance)
          && matchingSubOrderSubStates.some((item) => item.value === allValues.subOrderComponentSubState)
          && hasValue(allValues.subOrderFeatureValueField)
          && hasRows(allValues.subOrderResponseCodeAssembly);
        const parentComplete = !effectiveCodeMappingEnabled || (
          hasValue(allValues.componentInstance)
          && (effectiveCodeMappingMode === 'custom' ? hasValue(allValues.codeMappingScript) : hasRows(allValues.responseCodeAssembly))
        );
        return subOrderComplete && parentComplete ? 'ok' : 'error';
      }
      if (!effectiveCodeMappingEnabled) return 'empty';
      if (!hasValue(allValues.componentInstance) || !hasValue(allValues.componentSubState)) return 'error';
      return effectiveCodeMappingMode === 'custom'
        ? (hasValue(allValues.codeMappingScript) ? 'ok' : 'error')
        : (hasRows(allValues.responseCodeAssembly) ? 'ok' : 'error');
    }
    return 'empty';
  };
  const handleSave = async () => {
    const values = await form.validateFields();
    const pathTargets: TargetMapping[] = pathVariables.flatMap((variable) => {
      const mapping = values.pathVariableMappings?.[variable] ?? {};
      return pathVariableTargets(variable, mapping);
    });
    // 条件目标行不在 Form.Item 注册表中，从表单存储直接读取，并回写到保存值里。
    const conditionalRows = (form.getFieldValue('pathVariableConditionalRows') ?? []) as Array<Record<string, unknown>>;
    const conditionalPathTargets: TargetMapping[] = conditionalRows.flatMap((row, index) => normalizeTargetMappings({ id: `path_conditional_${index}`, ...row }));
    if (effectiveRequestMappingMode !== 'script' && pathVariables.some((variable) => {
      const mapping = values.pathVariableMappings?.[variable] ?? {};
      return pathVariableTargets(variable, mapping).length === 0;
    })) return void message.error('Add at least one Target Mapping for every Path Variable.');
    const mappingError = validateTargetMappings([
      ...pathTargets,
      ...conditionalPathTargets,
      ...collectFieldTargetMappings(values.queryParameters),
      ...collectFieldTargetMappings(values.requestHeaders),
      ...collectFieldTargetMappings(values.requestBody),
    ]);
    if (mappingError) return void message.error(mappingError);
    const operationError = validateOperationConfigs([
      values.pathVariableMappings,
      conditionalRows,
      values.queryParameters,
      values.requestHeaders,
      values.requestBody,
    ]);
    if (operationError) return void message.error(operationError);
    onSave({ ...values, pathVariableConditionalRows: conditionalRows });
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
                : <InboundPathVariableMapping variables={pathVariables} endpointPath={endpointPath} targetOptions={spiRequestOptions} readOnly={readOnly} /> },
              { key: 'query', label: tabLabel('Params', state('query')), children: <Form.Item name="queryParameters" initialValue={[]}><FlatFieldMappingEditor schemaOnly={effectiveRequestMappingMode === 'script'} fixedFieldType="String" direction="response" title="Query Parameter Fields" addLabel="Add Parameter" fieldPlaceholder="External field" sourceOptions={[]} targetOptions={spiRequestOptions} dataTypeOptions={flatTypes} operationOptions={mappingOperationOptions} readOnly={readOnly} targetPlaceholder="SPI request field" /></Form.Item> },
              { key: 'header', label: tabLabel('Headers', state('header')), children: <Form.Item name="requestHeaders" initialValue={[]}><FlatFieldMappingEditor schemaOnly={effectiveRequestMappingMode === 'script'} fixedFieldType="String" direction="response" title="Request Header Fields" addLabel="Add Header" fieldPlaceholder="External field" sourceOptions={[]} targetOptions={spiRequestOptions} dataTypeOptions={flatTypes} operationOptions={mappingOperationOptions} readOnly={readOnly} targetPlaceholder="SPI request field" /></Form.Item> },
              { key: 'body', label: tabLabel('Body', state('body')), children: <Form.Item name="requestBody" initialValue={[]}><BodySchemaMappingEditor schemaOnly={effectiveRequestMappingMode === 'script'} direction="response" sourceOptions={[]} targetOptions={spiRequestOptions} dataTypeOptions={types} operationOptions={mappingOperationOptions} readOnly={readOnly} targetPlaceholder="SPI request field" /></Form.Item> },
            ]} />
            {requestMappingMode === 'script' && <Card size="small" title="Mapping Script" style={{ marginTop: 12 }}><GroovyScriptEditor name="requestMappingScript" helpText="Map pathVariables, queryParameters, requestHeaders and the preprocessed requestBody to SPI Request." /></Card>}
          </> },
          { key: 'security', label: tabLabel('Security', state('security')), children: <Card size="small"><div style={{ border: '1px solid #f0f0f0', borderRadius: 6, overflow: 'hidden' }}>
            <SecuritySection title="Decryption" enabledName="decryptionEnabled" enabled={effectiveDecryptionEnabled}><Form.Item name="decryptionAlgorithm" label="Algorithm" rules={[{ required: true }]}><Select options={encryption} /></Form.Item><Form.Item name="encryptedField" label="Encrypted Field"><Input placeholder="Request field not decrypted by A" /></Form.Item><Form.Item name="decryptionSources" label="Decryption Source Fields"><Checkbox.Group options={['Path Variables', 'Query Parameters', 'Request Headers', 'Request Body']} /></Form.Item></SecuritySection>
            <SecuritySection title="Signature Verification" enabledName="verificationEnabled" enabled={effectiveVerificationEnabled}><Form.Item name="verificationAlgorithm" label="Algorithm" rules={[{ required: true }]}><Select options={signing} /></Form.Item><Form.Item name="signatureField" label="Request Signature Field"><Input placeholder="Request header or body field" /></Form.Item><Form.Item name="verificationSources" label="Verification Source Fields"><Checkbox.Group options={['Path Variables', 'Query Parameters', 'Request Headers', 'Request Body']} /></Form.Item></SecuritySection>
          </div></Card> },
          { key: 'code', label: tabLabel('Code Mapping', state('code')), children: <Card size="small">
            <Alert
              type={subOrderModeEnabled ? 'success' : 'info'}
              showIcon
              message={<Space size={8}><Text strong>SubOrderMode</Text><Tag color={subOrderModeEnabled ? 'green' : 'default'}>{subOrderModeEnabled ? 'Enabled' : 'Disabled'}</Tag></Space>}
              description={subOrderModeEnabled ? `${businessType} + ${ability} is configured for main and sub orders.` : 'This BT + Ability uses the standard single-order response mapping.'}
              style={{ marginBottom: 16 }}
            />
            <div className="http-response-code-order-group">
              <div className="http-response-code-order-header">
                <Typography.Title level={5}>{subOrderModeEnabled ? 'Main Order' : 'Order'}</Typography.Title>
                <Space size={6}><Text type="secondary">Enable Response Mapping</Text><Form.Item name="codeMappingEnabled" valuePropName="checked" noStyle><Switch size="small" /></Form.Item></Space>
              </div>
              {effectiveCodeMappingEnabled && <>
                <div className="http-response-code-subsection">
                  <Text strong>Response Code Assembly</Text>
                  <Form.Item name="codeMappingMode" label="Assembly Mode"><Radio.Group optionType="button" options={[{ label: 'Default', value: 'default' }, { label: 'Custom', value: 'custom' }]} /></Form.Item>
                  {effectiveCodeMappingMode === 'custom'
                    ? <GroovyScriptEditor name="codeMappingScript" helpText={subOrderModeEnabled ? 'Return the main-order response code from the available inbound request fields.' : 'Return channelResponseCode from the available inbound request fields.'} />
                    : <Form.Item name="responseCodeAssembly" label="Response Code Assembly" rules={[{ required: true }]}><ResponseCodeAssemblyEditor prefix={subOrderModeEnabled ? 'MAIN_ORDER' : undefined} options={allRequestFieldOptions} placeholder="Select request field" /></Form.Item>}
                  <Form.Item name="responseMessageField" label="Response Message Field"><Select allowClear placeholder="Select request message field" options={allRequestFieldOptions} /></Form.Item>
                </div>
                <div className="http-response-code-subsection">
                  <div className="http-response-code-subsection-title"><Text strong>Unknown Response Code Handling</Text><Tooltip title="Used only when the assembled Channel Response Code does not match any configured mapping."><QuestionCircleOutlined style={{ color: '#8c8c8c', cursor: 'help' }} /></Tooltip></div>
                  <Form.Item name="componentInstance" label="Main State" rules={[{ required: true }]}><Select placeholder="Select Main State" options={unknownResponseHandlingOptions} onChange={() => form.setFieldValue('componentSubState', undefined)} /></Form.Item>
                  {!subOrderModeEnabled && <Form.Item name="componentSubState" label="Gateway Sub State" rules={[{ required: true }]}><Select disabled={!componentInstance} placeholder={componentInstance ? `Select a ${componentInstance} sub-state` : 'Select Main State first'} options={matchingFallbackSubStates.map((item) => ({ label: item.value, value: item.value }))} /></Form.Item>}
                </div>
              </>}
            </div>
            {subOrderModeEnabled && <div className="http-response-code-order-group">
              <Typography.Title level={5}>Sub Order</Typography.Title>
              <div className="http-response-code-subsection">
                <Text strong>Sub Order Matching &amp; Code Assembly</Text>
                <Form.Item name="subOrderFeatureValueField" label="Feature Value Field" rules={[{ required: true }]}><Select showSearch optionFilterProp="label" placeholder="Select Feature Value Field" options={allRequestFieldOptions} onChange={() => form.setFieldsValue({ subOrderResponseCodeAssembly: undefined, subOrderResponseMessageField: undefined })} /></Form.Item>
                <Form.Item name="subOrderResponseCodeAssembly" label="Response Code Assembly" rules={[{ required: true }]}><ResponseCodeAssemblyEditor prefix="SUB_ORDER" options={subOrderFeatureValueField ? sameLevelRequestFields : []} placeholder={subOrderFeatureValueField ? 'Select same-level field' : 'Select Feature Value Field first'} /></Form.Item>
                <Form.Item name="subOrderResponseMessageField" label="Response Message Field"><Select allowClear disabled={!subOrderFeatureValueField} placeholder={subOrderFeatureValueField ? 'Select a same-level response message field' : 'Select Feature Value Field first'} options={sameLevelRequestFields} /></Form.Item>
              </div>
              <div className="http-response-code-subsection">
                <div className="http-response-code-subsection-title"><Text strong>Unknown Response Code Handling</Text><Tooltip title="Used after Feature Value Field has located a sub-order, when its assembled SUB_ORDER Channel Response Code does not match any configured mapping."><QuestionCircleOutlined style={{ color: '#8c8c8c', cursor: 'help' }} /></Tooltip></div>
                <Form.Item name="subOrderComponentInstance" label="Main State" rules={[{ required: true }]}><Select placeholder="Select Main State" options={unknownResponseHandlingOptions} onChange={() => form.setFieldValue('subOrderComponentSubState', undefined)} /></Form.Item>
                <Form.Item
                  name="subOrderComponentSubState"
                  label="Gateway Sub State"
                  rules={[
                    { required: true, message: 'Select a Gateway Sub State' },
                    {
                      validator: (_, value) => !value || matchingSubOrderSubStates.some((item) => item.value === value)
                        ? Promise.resolve()
                        : Promise.reject(new Error('Select a Gateway Sub State mapped to the current Main State')),
                    },
                  ]}
                >
                  <Select disabled={!subOrderComponentInstance || matchingSubOrderSubStates.length === 0} placeholder={subOrderComponentInstance ? `Select a ${subOrderComponentInstance} sub-state` : 'Select Main State first'} options={matchingSubOrderSubStates.map((item) => ({ label: item.value, value: item.value }))} />
                </Form.Item>
              </div>
            </div>}
          </Card> },
        ]} />
      </Form>
    </ConfigProvider>
  </Drawer>;
}

const pathMappingColumns = 'minmax(150px,1fr) 104px 62px minmax(150px,1fr) 168px 64px minmax(178px,1.05fr) 92px';
const pathTypeOptions = [{ label: 'String', value: 'String' }];

/**
 * 读一行路径变量的目标映射。
 * 行级 target / operation 优先，旧结构 targetMappings 仅作回退——
 * 因为 normalizeTargetMappings 在没有 targetValue 时会返回空数组，
 * 直接用它会丢掉「已选操作类但还没选目标」的中间状态。
 */
const pathVariableTargets = (variable: string, mapping?: Record<string, unknown>): TargetMapping[] => {
  const legacy = Array.isArray(mapping?.targetMappings) ? (mapping?.targetMappings as TargetMapping[])[0] : undefined;
  const targetValue = (mapping?.target as string | undefined) ?? legacy?.targetValue;
  if (!targetValue) return [];
  return [{
    id: legacy?.id ?? `path_${variable}`,
    targetValue,
    operation: (mapping?.operation as string[] | undefined) ?? legacy?.operation,
    operationConfig: (mapping?.operationConfig as MappingOperationConfig | undefined) ?? legacy?.operationConfig,
  }];
};

/** 渲染用读取：目标未选时也要把已选的操作类显示出来，所以不在 target 为空时短路。 */
const pathRowValues = (mapping?: Record<string, unknown>) => {
  const legacy = Array.isArray(mapping?.targetMappings) ? (mapping?.targetMappings as TargetMapping[])[0] : undefined;
  return {
    targetValue: (mapping?.target as string | undefined) ?? legacy?.targetValue,
    operation: (mapping?.operation as string[] | undefined) ?? legacy?.operation,
    operationConfig: (mapping?.operationConfig as MappingOperationConfig | undefined) ?? legacy?.operationConfig,
  };
};

function InboundPathVariableMapping({ variables, endpointPath, targetOptions, readOnly = false }: { variables: string[]; endpointPath?: string; targetOptions: ReturnType<typeof buildSpiRequestOptions>; readOnly?: boolean }) {
  const form = Form.useFormInstance();
  // 条件目标行不在 Form.Item 注册表里，交给本地 state 驱动渲染，避免依赖表单通知时序。
  const [conditionalRows, setConditionalRows] = useState<Array<Record<string, unknown>>>(() => {
    const rows = form.getFieldValue('pathVariableConditionalRows');
    return Array.isArray(rows) ? rows as Array<Record<string, unknown>> : [];
  });
  const writeConditionalRows = (rows: Array<Record<string, unknown>>) => {
    setConditionalRows(rows);
    form.setFieldValue('pathVariableConditionalRows', rows);
  };
  if (variables.length === 0 && conditionalRows.length === 0) return <EndpointPathVariablesReference variables={variables} endpointPath={endpointPath} />;
  /** 条件左值候选 = 本页签左侧已录入的路径变量。 */
  const conditionalFields = variables.map((variable) => ({ id: variable, path: [variable], name: variable, type: 'String' }));
  const setRow = (variable: string, patch: Record<string, unknown>) => {
    const current = (form.getFieldValue(['pathVariableMappings', variable]) ?? {}) as Record<string, unknown>;
    const base = pathVariableTargets(variable, current)[0];
    form.setFieldValue(['pathVariableMappings', variable], {
      ...current,
      target: base?.targetValue,
      operation: base?.operation,
      operationConfig: base?.operationConfig,
      ...patch,
    });
  };
  const addConditionalRow = () => {
    writeConditionalRows([...conditionalRows, {
      conditionalTargetRow: true,
      operation: ['conditional-assignment', 'conditional-assignment'],
      conditionalConfig: createInitialConfig(),
    }]);
  };
  const removeConditionalRow = (index: number) => {
    writeConditionalRows(conditionalRows.filter((_, rowIndex) => rowIndex !== index));
  };
  const updateConditionalRow = (index: number, patch: Record<string, unknown>) => {
    writeConditionalRows(conditionalRows.map((row, rowIndex) => rowIndex === index ? { ...row, ...patch } : row));
  };
  return <div>
    <EndpointPathVariablesReference variables={variables} endpointPath={endpointPath} />
    <div style={{ border: '1px solid #e8e8e8', borderRadius: 8, overflow: 'hidden', marginTop: 10 }}>
      <div style={{ overflowX: 'auto' }}>
        <div style={{ minWidth: 1010 }}>
          <div style={{ display: 'grid', gridTemplateColumns: pathMappingColumns, gap: 8, padding: '7px 10px', color: '#8c8c8c', fontSize: 11, background: '#fafafa', borderBottom: '1px solid #f0f0f0' }}>
            <span>FIELD</span><span>TYPE</span><span>REQUIRED</span><span>DESCRIPTION</span><span>OPERATION</span><span>TYPE</span><span>TARGET VALUE</span><span>TARGET TYPE</span>
          </div>
          {variables.map((variable) => <Form.Item key={variable} noStyle shouldUpdate>
            {() => {
              const mapping = (form.getFieldValue(['pathVariableMappings', variable]) ?? {}) as Record<string, unknown>;
              const row = pathRowValues(mapping);
              return <div style={{ display: 'grid', gridTemplateColumns: pathMappingColumns, gap: 8, alignItems: 'center', padding: '6px 10px', borderBottom: '1px solid #f5f5f5' }}>
                <Input value={variable} disabled />
                <Select value={(mapping.type as string) || 'String'} options={pathTypeOptions} disabled={readOnly} onChange={(type) => setRow(variable, { type })} />
                <div style={{ textAlign: 'center' }}><Switch size="small" checked={Boolean(mapping.required)} disabled={readOnly} onChange={(required) => setRow(variable, { required })} /></div>
                <Input placeholder="Optional" value={(mapping.description as string) || ''} disabled={readOnly} onChange={(event) => setRow(variable, { description: event.target.value })} />
                <MappingOperationSelector
                  value={row.operation}
                  config={row.operationConfig}
                  placeholder="Select operation"
                  options={mappingOperationOptions}
                  readOnly={readOnly}
                  conditionalConfig={mapping.conditionalConfig as ConditionalAssignmentConfig | undefined}
                  conditionalFields={conditionalFields}
                  conditionalTargetLabel={row.targetValue}
                  conditionalTargetType={targetOptionType(targetOptions, row.targetValue)}
                  conditionalFieldPlaceholder="select field"
                  onConditionalConfig={(conditionalConfig) => form.setFieldValue(['pathVariableMappings', variable, 'conditionalConfig'], conditionalConfig)}
                  onChange={(nextOperation, nextConfig) => {
                    // 选中条件赋值：本行操作类清空，并在表末尾新增一个条件目标行。
                    if (nextOperation?.[0] === 'conditional-assignment') {
                      setRow(variable, { operation: undefined, operationConfig: undefined, conditionalConfig: undefined });
                      addConditionalRow();
                      return;
                    }
                    setRow(variable, { operation: nextOperation, operationConfig: nextConfig });
                  }}
                />
                <Text style={{ fontSize: 11 }}>{operationResultType(row.operation) ?? ''}</Text>
                <Select value={row.targetValue} placeholder="Select SPI value" options={targetOptions} disabled={readOnly} onChange={(target) => setRow(variable, { target })} />
                <Text style={{ fontSize: 11 }}>{targetOptionType(targetOptions, row.targetValue)}</Text>
              </div>;
            }}
          </Form.Item>)}
          {conditionalRows.map((row, index) => {
            const target = row.targetValue as string | undefined;
            return <div key={`conditional_${index}`} style={{ display: 'grid', gridTemplateColumns: pathMappingColumns, gap: 8, alignItems: 'center', padding: '6px 10px', borderBottom: '1px solid #f5f5f5', borderTop: '1px solid #d9d9d9' }}>
              {/* 派生行左侧的字段信息无意义，整体让位给一行提示文字（配置在右侧操作类与 TARGET VALUE 里）。 */}
              <div style={{ gridColumn: '1 / 5', color: '#8c8c8c', fontSize: 12 }}>Please config the conditional assignment.</div>
              <MappingOperationSelector
                value={(row.operation as string[] | undefined) ?? ['conditional-assignment', 'conditional-assignment']}
                config={row.operationConfig as MappingOperationConfig | undefined}
                placeholder="Optional"
                options={mappingOperationOptions}
                readOnly={readOnly}
                lockedConditional
                conditionalConfig={row.conditionalConfig as ConditionalAssignmentConfig | undefined}
                conditionalFields={conditionalFields}
                conditionalTargetLabel={target}
                conditionalTargetType={targetOptionType(targetOptions, target)}
                conditionalFieldPlaceholder="select field"
                onConditionalConfig={(conditionalConfig) => updateConditionalRow(index, { conditionalConfig })}
                onChange={() => undefined}
              />
              <Text style={{ fontSize: 11 }}>{operationResultType(row.operation as string[] | undefined) ?? ''}</Text>
              <Select
                value={target}
                placeholder="Select SPI value"
                options={targetOptions}
                status={target ? undefined : 'error'}
                disabled={readOnly}
                onChange={(nextTarget) => updateConditionalRow(index, { targetValue: nextTarget })}
              />
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
                <Text style={{ fontSize: 11 }}>{targetOptionType(targetOptions, target)}</Text>
                <Tooltip title="Delete conditional target"><Button type="text" size="small" danger aria-label="Delete conditional target" icon={<DeleteOutlined />} disabled={readOnly} onClick={() => removeConditionalRow(index)} /></Tooltip>
              </div>
            </div>;
          })}
        </div>
      </div>
    </div>
  </div>;
}

export function InboundResponseDrawer({ open, initialValues = {}, readOnly = false, businessType = '', ability = '', onClose, onSave }: Props) {
  const [form] = Form.useForm();
  const watchedValues = Form.useWatch([], form) ?? {};
  const initialFormValues = { responseMappingMode: 'configuration', responseFormat: 'JSON', ...initialValues };
  const allValues = { ...initialFormValues, ...form.getFieldsValue(true), ...watchedValues } as Record<string, any>;
  const responseMappingMode = Form.useWatch('responseMappingMode', form) ?? 'configuration';
  const responseFormat = Form.useWatch('responseFormat', form) ?? 'JSON';
  const signingEnabled = Form.useWatch('signingEnabled', form);
  const encryptionEnabled = Form.useWatch('encryptionEnabled', form);
  const spiResponseOptions = buildSpiResponseOptions(Boolean(businessType && ability && isSubOrderModeEnabled(businessType, ability)));
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
  return <Drawer title={<Space><span>Configure Inbound Response</span><Tag color="green">inboundResponse</Tag></Space>} width="min(1180px, 92vw)" open={open} onClose={onClose} destroyOnClose extra={!readOnly && <Space><Button onClick={onClose}>Cancel</Button><Button type="primary" onClick={() => void form.validateFields().then((values) => { const operationError = validateOperationConfigs([values.responseHeaders, values.responseBody]); if (operationError) return void message.error(operationError); onSave(values); })}>Save</Button></Space>}>
    <ConfigProvider componentSize="middle" theme={{ components: { Form: { itemMarginBottom: 10 } } }}>
      <Form form={form} disabled={readOnly} layout="vertical" initialValues={{ responseMappingMode: 'configuration', responseFormat: 'JSON', ...initialValues }}>
        <Tabs items={[
          { key: 'mapping', label: tabLabel('Fields & Mapping', state('mapping')), children: <>
            <Form.Item name="responseMappingMode"><Radio.Group optionType="button" buttonStyle="solid" options={[{ label: 'Configuration Mode', value: 'configuration' }, { label: 'Script Mode', value: 'script' }]} /></Form.Item>
            <Tabs type="card" size="small" items={[
              { key: 'header', label: tabLabel('Headers', state('headers')), children: <Form.Item name="responseHeaders" initialValue={[]}><FlatFieldMappingEditor schemaOnly={responseMappingMode === 'script'} fixedFieldType="String" title="Response Header Fields" addLabel="Add Header" fieldPlaceholder="External response field" sourceOptions={spiResponseOptions} dataTypeOptions={flatTypes} operationOptions={mappingOperationOptions} readOnly={readOnly} sourcePlaceholder="SPI response field" /></Form.Item> },
              { key: 'body', label: tabLabel('Body', state('body')), children: <Form.Item name="responseBody" initialValue={[]}><BodySchemaMappingEditor schemaOnly={responseMappingMode === 'script'} sourceOptions={spiResponseOptions} dataTypeOptions={types} operationOptions={mappingOperationOptions} readOnly={readOnly} sourcePlaceholder="SPI response field" /></Form.Item> },
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

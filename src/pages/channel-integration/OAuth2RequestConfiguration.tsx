import { useMemo, useState } from 'react';
import {
  Alert,
  Card,
  Checkbox,
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
import type { AuthConfig, CredentialItem } from './channelScopeStore';
import BodySchemaMappingEditor from './BodySchemaMappingEditor';
import type { BodySchemaNode } from './BodySchemaMappingEditor';
import FlatFieldMappingEditor from './FlatFieldMappingEditor';
import { mappingOperationOptions } from './mappingOperationOptions';
import GroovyScriptEditor from './GroovyScriptEditor';
import PathVariableMappingEditor from './PathVariableMappingEditor';

const hasNamedBodyNode = (nodes: BodySchemaNode[]): boolean =>
  nodes.some((node) => !!node.name || hasNamedBodyNode(node.children ?? []));

const flattenBodyOptions = (nodes: BodySchemaNode[], prefix = ''): Array<{ label: string; value: string }> =>
  nodes.flatMap((node) => {
    if (!node.name) return flattenBodyOptions(node.children ?? [], prefix);
    const path = prefix ? `${prefix}.${node.name}` : node.name;
    return [{ label: path, value: path }, ...flattenBodyOptions(node.children ?? [], path)];
  });

const { Text } = Typography;
const requestScriptHelp = `/**
*
* @param
*
* The data included in param is as follows:
*
** Request Channel
*
* param._credential (JSONObject)
* param._globalVariable (JSONObject)
* param._order (JSONObject)
*
* @return Return a object of JSONObject type
* pathVariables (JSONObject)
* queryParameters (JSONObject)
* requestHeaders (JSONObject)
* requestBody (JSONObject)
*/`;
const responseScriptHelp = `/**
*
* @param param
*
* The data included in param is as follows:
*
* param._globalVariable (JSONObject)
* param._order (JSONObject)
* param._responseHeader (JSONObject)
* param._responseBody (JSONObject)
*
* @return Return a object of Order type
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

const dataTypeOptions = ['String', 'Integer', 'Long', 'Boolean', 'Object', 'Array'].map((value) => ({ label: value, value }));
const flatDataTypeOptions = dataTypeOptions.filter((option) => !['Object', 'Array'].includes(option.value));
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

const GreenDot = () => <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: '#52c41a' }} />;
const RedDot = () => <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: '#ff4d4f' }} />;

function SecuritySection({ form, authentications, currentAuthId, mode }: { form: FormInstance; authentications: AuthConfig[]; currentAuthId?: string; mode: 'authentication' | 'request' | 'response' }) {
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
    <div>
      {(mode === 'authentication') && (
        <div style={{ padding: '8px 0' }}>
          <Space style={{ marginBottom: authenticationEnabled ? 12 : 0 }}>
            <Form.Item name="oauthSecurityAuthenticationEnabled" valuePropName="checked" noStyle><Switch size="small" /></Form.Item>
            <span>Authentication Scheme</span>
          </Space>
          {authenticationEnabled && (
            <div style={{ paddingLeft: 4 }}>
              <Alert type="info" showIcon title="The current scheme is excluded from the selectable list." style={{ marginBottom: 12 }} />
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
            </div>
          )}
          {!authenticationEnabled && <Text type="secondary" style={{ display: 'block', marginTop: 4 }}>Enable to apply another Authentication Scheme to the token request.</Text>}
        </div>
      )}

      {(mode === 'request' || mode === 'response') && (
        <>
          {mode === 'request' ? (
            <>
              <div style={{ padding: '8px 0', borderBottom: '1px solid #f0f0f0' }}>
                <Space style={{ marginBottom: signingEnabled ? 12 : 0 }}>
                  <Form.Item name="oauthSecuritySigningEnabled" valuePropName="checked" noStyle><Switch size="small" /></Form.Item>
                  <span>Signing</span>
                </Space>
                {signingEnabled ? (
                  <div style={{ paddingLeft: 4 }}>
                    <Form.Item label="Signing Algorithm" name="oauthSecuritySigningAlgorithm" rules={[{ required: true, message: 'Select an algorithm' }]}>
                      <Select options={signingOptions} placeholder="Select algorithm" />
                    </Form.Item>
                    <Form.Item label="Signing Source Fields" name="oauthSecuritySigningSources" rules={[{ required: true, message: 'Select source fields' }]}>
                      <Checkbox.Group options={sourceLocationOptions} />
                    </Form.Item>
                    <GroovyScriptEditor name="oauthSecuritySigningScript" helpText="Use the selected request fields as param input and return the signing result." />
                    <Space align="start" style={{ width: '100%' }}>
                      <Form.Item label="Destination Location" name="oauthSecuritySigningDestinationLocation" rules={[{ required: true, message: 'Select location' }]} style={{ minWidth: 220 }}>
                        <Select options={sourceLocationOptions} />
                      </Form.Item>
                      <Form.Item label="Destination Field" name="oauthSecuritySigningDestinationField" rules={[{ required: true, message: 'Enter field' }]} style={{ minWidth: 260 }}>
                        <Input />
                      </Form.Item>
                    </Space>
                  </div>
                ) : <Text type="secondary" style={{ display: 'block', marginTop: 4 }}>Enable to sign selected request fields.</Text>}
              </div>
              <div style={{ padding: '8px 0' }}>
                <Space style={{ marginBottom: encryptionEnabled ? 12 : 0 }}>
                  <Form.Item name="oauthSecurityEncryptionEnabled" valuePropName="checked" noStyle><Switch size="small" /></Form.Item>
                  <span>Encryption</span>
                </Space>
                {encryptionEnabled ? (
                  <div style={{ paddingLeft: 4 }}>
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
                  </div>
                ) : <Text type="secondary" style={{ display: 'block', marginTop: 4 }}>Enable to encrypt selected request fields.</Text>}
              </div>
            </>
          ) : (
            <>
              <div style={{ padding: '8px 0', borderBottom: '1px solid #f0f0f0' }}>
                <Space style={{ marginBottom: verificationEnabled ? 12 : 0 }}>
                  <Form.Item name="oauthSecurityVerificationEnabled" valuePropName="checked" noStyle><Switch size="small" /></Form.Item>
                  <span>Signature Verification</span>
                </Space>
                {verificationEnabled ? (
                  <div style={{ paddingLeft: 4 }}>
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
                    <GroovyScriptEditor name="oauthSecurityVerificationScript" helpText="Use the selected response fields and signature field as param input and return the verification result." />
                  </div>
                ) : <Text type="secondary" style={{ display: 'block', marginTop: 4 }}>Enable to verify the response signature.</Text>}
              </div>
              <div style={{ padding: '8px 0' }}>
                <Space style={{ marginBottom: decryptionEnabled ? 12 : 0 }}>
                  <Form.Item name="oauthSecurityDecryptionEnabled" valuePropName="checked" noStyle><Switch size="small" /></Form.Item>
                  <span>Decryption</span>
                </Space>
                {decryptionEnabled ? (
                  <div style={{ paddingLeft: 4 }}>
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
                  </div>
                ) : <Text type="secondary" style={{ display: 'block', marginTop: 4 }}>Enable to decrypt selected response fields.</Text>}
              </div>
            </>
          )}
        </>
      )}
    </div>
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
  const path = Form.useWatch('oauthPath', form) ?? '';
  const requestBody = (Form.useWatch('oauthRequestBody', form) ?? []) as BodySchemaNode[];
  const responseHeaders = Form.useWatch('oauthResponseHeaders', form) ?? [];
  const responseBody = (Form.useWatch('oauthResponseBody', form) ?? []) as BodySchemaNode[];
  const queryParameters = Form.useWatch('oauthQueryParameters', form) ?? [];
  const pathMappings = Form.useWatch('oauthPathMappings', form) as Record<string, { source?: string[]; operation?: string[] }> | undefined;
  const authName = Form.useWatch('name', form) ?? 'OAuth 2 Scheme';
  const authEnabled = Form.useWatch('oauthSecurityAuthenticationEnabled', form);
  const authSchemeId = Form.useWatch('oauthSecurityAuthenticationId', form);
  const signingEnabled = Form.useWatch('oauthSecuritySigningEnabled', form);
  const encryptionEnabled = Form.useWatch('oauthSecurityEncryptionEnabled', form);
  const verificationEnabled = Form.useWatch('oauthSecurityVerificationEnabled', form);
  const decryptionEnabled = Form.useWatch('oauthSecurityDecryptionEnabled', form);
  const requestHeaders = Form.useWatch('oauthRequestHeaders', form) ?? [];
  const requestMode = Form.useWatch('oauthRequestMappingMode', form) ?? 'configuration';
  const responseMode = Form.useWatch('oauthResponseMappingMode', form) ?? 'configuration';
  const requestFormat = Form.useWatch('oauthRequestMessageFormat', form) ?? 'JSON';
  const responseFormat = Form.useWatch('oauthResponseMessageFormat', form) ?? 'JSON';
  const requestBodyFieldMode = Form.useWatch('oauthRequestBodyFieldMode', form) ?? 'all';
  const [activeTab, setActiveTab] = useState('request');
  const pathVariables = useMemo(() => {
    const variables: string[] = [];
    const pattern = /\{([^}]+)\}/g;
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(String(path))) !== null) variables.push(match[1]);
    return variables;
  }, [path]);
  const paramsDot = useMemo(() => {
    const qps = queryParameters as unknown[] ?? [];
    const hasAnyParam = qps.some((item: unknown) => {
      if (!item || typeof item !== 'object') return false;
      const o = item as { name?: string; sourceValue?: string };
      return !!o.name || !!o.sourceValue;
    });
    const hasAnyPathMapping = pathVariables.some((variable) => pathMappings?.[variable]?.source);
    if (!hasAnyParam && !hasAnyPathMapping) return null;
    const allComplete = qps.every((item: unknown) => {
      if (!item || typeof item !== 'object') return true;
      const o = item as { name?: string; sourceValue?: string };
      return !!o.name && !!o.sourceValue;
    }) && pathVariables.every((variable) => !!pathMappings?.[variable]?.source);
    return allComplete ? 'green' : 'red';
  }, [queryParameters, pathVariables, pathMappings]);

  const authDot = useMemo(() => {
    if (!authEnabled) return null;
    if (authSchemeId) return 'green';
    return 'red';
  }, [authEnabled, authSchemeId]);

  const reqPathVarsDot = useMemo(() => {
    if (!pathVariables.length) return null;
    return pathVariables.every((v) => !!pathMappings?.[v]?.source) ? 'green' : 'red';
  }, [pathVariables, pathMappings]);

  const reqHeadersDot = useMemo(() => {
    const has = (requestHeaders as unknown[]).some((item: unknown) => {
      if (!item || typeof item !== 'object') return false;
      return !!(item as { name?: string }).name;
    });
    return has ? 'green' : null;
  }, [requestHeaders]);

  const reqBodyDot = useMemo(() => {
    return hasNamedBodyNode(requestBody) ? 'green' : null;
  }, [requestBody]);

  const reqSecurityDot = useMemo(() => {
    return (signingEnabled || encryptionEnabled) ? 'green' : null;
  }, [signingEnabled, encryptionEnabled]);

  const respHeadersDot = useMemo(() => {
    const has = (responseHeaders as unknown[]).some((item: unknown) => {
      if (!item || typeof item !== 'object') return false;
      return !!(item as { name?: string }).name;
    });
    return has ? 'green' : null;
  }, [responseHeaders]);

  const respBodyDot = useMemo(() => {
    const has = (responseBody as unknown[]).some((item: unknown) => {
      if (!item || typeof item !== 'object') return false;
      return !!(item as { name?: string }).name;
    });
    return has ? 'green' : null;
  }, [responseBody]);

  const respSecurityDot = useMemo(() => {
    return (verificationEnabled || decryptionEnabled) ? 'green' : null;
  }, [verificationEnabled, decryptionEnabled]);

  const requestBodyOptions = useMemo(() => flattenBodyOptions(requestBody), [requestBody]);
  const responseTargetOptions = [
    { label: 'Token', value: 'token' },
    { label: 'Expiry', value: 'expiry' },
  ];
  const combinedSourceOptions = [
    { label: 'Credential Fields', options: credentials.map((item) => ({ label: item.key, value: `credential.${item.key}` })) },
    { label: 'Generated Data', options: [
      { label: 'Current Timestamp', value: 'generated.timestamp' },
      { label: 'UUID', value: 'generated.uuid' },
      { label: 'Random Number', value: 'generated.randomNumber' },
    ] },
  ];
  const pathSourceOptions = [
    {
      label: 'Credential Fields',
      value: 'credential',
      children: credentials.map((item) => ({ label: item.key, value: `credential.${item.key}`, type: 'String' })),
    },
    {
      label: 'Generated Data',
      value: 'generated',
      children: [
        { label: 'Current Timestamp', value: 'generated.timestamp', type: 'Long' },
        { label: 'UUID', value: 'generated.uuid', type: 'String' },
        { label: 'Random Number', value: 'generated.randomNumber', type: 'Long' },
      ],
    },
  ];

  return (
    <div style={{ maxWidth: 1180, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <Space size={8}><Text strong style={{ fontSize: 14 }}>{authName}</Text><Tag color="blue">OAuth 2</Tag></Space>
        <Space><Text type="secondary" style={{ fontSize: 12 }}>Credential Version</Text><Tag style={{ margin: 0, fontSize: 12 }}>{credentialVersion || '—'}</Tag></Space>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '120px 110px minmax(340px, 1fr)', gap: 0, marginBottom: 4 }}>
        <Form.Item name="oauthMethod" initialValue="POST" rules={[{ required: true }]} style={{ margin: 0 }}>
          <Select size="middle" options={['POST', 'GET', 'PUT', 'DELETE'].map((value) => ({ label: value, value }))} />
        </Form.Item>
        <Form.Item name="oauthProtocol" initialValue="HTTP" style={{ margin: '0 0 0 6px' }}>
          <Select size="middle" disabled options={[{ label: 'HTTP', value: 'HTTP' }, { label: 'HTTPS', value: 'HTTPS' }]} />
        </Form.Item>
        <Form.Item name="oauthPath" rules={[{ required: true, message: 'Enter request path' }]} style={{ margin: '0 0 0 6px' }}>
          <Input size="middle" placeholder="/oauth/token" />
        </Form.Item>
      </div>
      <Text type="secondary" style={{ display: 'block', marginBottom: 6, fontSize: 12 }}>Configure the channel token endpoint directly. No standalone Endpoint reference is created.</Text>

      <Card styles={{ body: { paddingTop: 0, minHeight: 420 } }}>
        <Tabs activeKey={activeTab} onChange={setActiveTab} tabBarGutter={20} size="small" items={[
          { key: 'request', label: 'Request', children: <Tabs size="small" tabBarGutter={16} items={[
            { key: 'fields', label: 'Fields & Mapping', children: <><Form.Item name="oauthRequestMappingMode" initialValue="configuration"><Radio.Group optionType="button" buttonStyle="solid" options={[{ label: 'Configuration Mode', value: 'configuration' }, { label: 'Script Mode', value: 'script' }]} /></Form.Item><Tabs type="card" size="small" items={[
              { key: 'path', label: <Space size={4}><span>Path Vars</span>{reqPathVarsDot === 'green' ? <GreenDot /> : reqPathVarsDot === 'red' ? <RedDot /> : null}</Space>, children: requestMode === 'configuration' ? <PathVariableMappingEditor variables={pathVariables} mappingName="oauthPathMappings" sourceOptions={pathSourceOptions} operationOptions={mappingOperationOptions} emptyText="Path variables appear automatically when the request path contains {field}." /> : <Text type="secondary">{pathVariables.length ? `Defined: ${pathVariables.map(v => `{${v}}`).join(', ')}` : 'Path variables appear automatically from Path.'}</Text> },
              { key: 'params', label: <Space size={4}><span>Params</span>{paramsDot === 'green' ? <GreenDot /> : paramsDot === 'red' ? <RedDot /> : null}</Space>, children: <Form.Item name="oauthQueryParameters" initialValue={[]}><FlatFieldMappingEditor schemaOnly={requestMode === 'script'} title="Query Parameter Fields" addLabel="Add Parameter" fieldPlaceholder="Query parameter name" sourceCascader sourceOptions={combinedSourceOptions} dataTypeOptions={flatDataTypeOptions} fixedFieldType="String" operationOptions={mappingOperationOptions} /></Form.Item> },
              { key: 'headers', label: <Space size={4}><span>Headers</span>{reqHeadersDot && <GreenDot />}</Space>, children: <Form.Item name="oauthRequestHeaders" initialValue={[]}><FlatFieldMappingEditor schemaOnly={requestMode === 'script'} title="Request Header Fields" addLabel="Add Header" fieldPlaceholder="Header name" sourceCascader sourceOptions={combinedSourceOptions} dataTypeOptions={flatDataTypeOptions} fixedFieldType="String" operationOptions={mappingOperationOptions} /></Form.Item> },
              { key: 'body', label: <Space size={4}><span>Body</span>{reqBodyDot && <GreenDot />}</Space>, children: <Form.Item name="oauthRequestBody" initialValue={[]}><BodySchemaMappingEditor schemaOnly={requestMode === 'script'} sourceOptions={combinedSourceOptions} dataTypeOptions={dataTypeOptions} operationOptions={mappingOperationOptions} /></Form.Item> },
            ]} />{requestMode === 'script' && <Card size="small" title="Mapping Script" style={{ marginTop: 12 }}><GroovyScriptEditor name="oauthRequestMappingScript" helpText={requestScriptHelp} /></Card>}</> },
            { key: 'authorization', label: <Space size={4}><span>Authentication</span>{authDot === 'green' ? <GreenDot /> : authDot === 'red' ? <RedDot /> : null}</Space>, children: <SecuritySection form={form} authentications={authentications} currentAuthId={currentAuthId} mode="authentication" /> },
            { key: 'security', label: <Space size={4}><span>Security</span>{reqSecurityDot && <GreenDot />}</Space>, children: <SecuritySection form={form} authentications={authentications} currentAuthId={currentAuthId} mode="request" /> },
            { key: 'format', label: 'Message Format', children: <><Form.Item label="Request Message Format" name="oauthRequestMessageFormat" initialValue="JSON" rules={[{ required: true }]}><Radio.Group options={messageFormatOptions} /></Form.Item><Form.Item label="Request Body Fields Included" name="oauthRequestBodyFieldMode" initialValue="all"><Radio.Group options={[{ label: 'All Fields', value: 'all' }, { label: 'Choose Fields', value: 'selected' }]} /></Form.Item>{requestBodyFieldMode === 'selected' && <Form.Item name="oauthSelectedRequestBodyFields" rules={[{ required: true }]}><Select mode="multiple" placeholder="Select Request Body fields" options={requestBodyOptions} /></Form.Item>}{requestFormat === 'Custom' && <><Form.Item label="Content Type" name="oauthCustomRequestContentType" rules={[{ required: true }]}><Select placeholder="Select Content Type" options={['application/json', 'application/xml', 'text/plain', 'application/x-www-form-urlencoded'].map(value => ({ label: value, value }))} /></Form.Item><GroovyScriptEditor name="oauthRequestMessageScript" helpText={requestMessageScriptHelp} /></>}</> },
          ]} /> },
          { key: 'response', label: 'Response', children: <Tabs size="small" tabBarGutter={16} items={[
            { key: 'format', label: 'Message Format', children: <><Form.Item label="Response Message Format" name="oauthResponseMessageFormat" initialValue="JSON" rules={[{ required: true }]}><Radio.Group options={messageFormatOptions} /></Form.Item>{responseFormat === 'Custom' && <GroovyScriptEditor name="oauthResponseMessageScript" helpText={responseMessageScriptHelp} />}</> },
            { key: 'fields', label: 'Fields & Mapping', children: <><Form.Item name="oauthResponseMappingMode" initialValue="configuration"><Radio.Group optionType="button" buttonStyle="solid" options={[{ label: 'Configuration Mode', value: 'configuration' }, { label: 'Script Mode', value: 'script' }]} /></Form.Item><Tabs type="card" size="small" items={[
              { key: 'headers', label: <Space size={4}><span>Headers</span>{respHeadersDot && <GreenDot />}</Space>, children: <Form.Item name="oauthResponseHeaders" initialValue={[]}><FlatFieldMappingEditor schemaOnly={responseMode === 'script'} direction="response" title="Response Header Fields" addLabel="Add Header" fieldPlaceholder="Response header name" sourceOptions={[]} targetOptions={responseTargetOptions} dataTypeOptions={flatDataTypeOptions} operationOptions={mappingOperationOptions} /></Form.Item> },
              { key: 'body', label: <Space size={4}><span>Body</span>{respBodyDot && <GreenDot />}</Space>, children: <Form.Item name="oauthResponseBody" initialValue={[]}><BodySchemaMappingEditor schemaOnly={responseMode === 'script'} direction="response" sourceOptions={[]} targetOptions={responseTargetOptions} dataTypeOptions={dataTypeOptions} operationOptions={mappingOperationOptions} /></Form.Item> },
            ]} />{responseMode === 'script' && <Card size="small" title="Mapping Script" style={{ marginTop: 12 }}><GroovyScriptEditor name="oauthResponseMappingScript" helpText={responseScriptHelp} /></Card>}</> },
            { key: 'security', label: <Space size={4}><span>Security</span>{respSecurityDot && <GreenDot />}</Space>, children: <SecuritySection form={form} authentications={authentications} currentAuthId={currentAuthId} mode="response" /> },
          ]} /> },
        ]} />
      </Card>
    </div>
  );
}

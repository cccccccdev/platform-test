import { useState } from 'react';
import { Alert, Button, Card, Cascader, Drawer, Empty, Form, Input, Radio, Select, Space, Tabs, Tag, Typography } from 'antd';
import GroovyScriptEditor, { groovyScriptTemplate } from './GroovyScriptEditor';
import PathVariableMappingEditor from './PathVariableMappingEditor';
import { mappingOperationOptions } from './mappingOperationOptions';
import { useChannelScopeStore } from './channelScopeStore';
import {
  buildOrderContextOption,
  buildRequestContextOptions,
  buildRequestValueOptions,
  findCascadePath,
  spiRequestFieldsFor,
  toCascaderOptions,
} from './contextSourceOptions';

const { Text } = Typography;
const contentTypes = ['application/octet-stream', 'application/json', 'text/csv', 'text/plain', 'application/pdf'];
const objectKeyScriptHelp = `Input: param._order, param._globalVariable, param._runtimeVariable.
Return a Map with pathVariables matching the selected Endpoint template.
The platform substitutes the variables and removes the HTTP path separator.
Return raw values, not a URL, bucket name or pre-encoded path.
All template variables must be present. The demo stores configuration only; it does not execute Groovy.`;
const dateScriptExample = `import java.time.Instant
import java.time.ZoneOffset
import java.time.format.DateTimeFormatter

def execute(param) {
    // Example input: timestamp = "2026-10-28T11:21:00Z" (ISO-8601).
    // Adjust the field and parsing to the upstream time format.
    def request = param._order.extraRequest
    def date = Instant.parse(request.timestamp.toString()).atZone(ZoneOffset.UTC)
    return [pathVariables: [
        yyyy: date.format(DateTimeFormatter.ofPattern("yyyy")),
        mm: date.format(DateTimeFormatter.ofPattern("MM")),
        dd: date.format(DateTimeFormatter.ofPattern("dd")),
        batchId: request.batchId,
        filename: request.filename
    ]]
}

execute(param);`;
type Mapping = { mode?: 'context' | 'constant' | 'global'; value?: string };
/** 对象键变量：与 http 的 Path Vars 同构，便于复用同一张表格。 */
type KeyMapping = { source?: string[]; operation?: string[]; operationConfig?: unknown };
type Config = {
  endpointId?: string;
  file?: { sourceType?: 'url' | 'file'; sourceUrl?: Mapping; fileRef?: Mapping; contentType?: string };
  keyMappings?: Record<string, KeyMapping>;
  objectKeyMode?: 'mapping' | 'script';
  objectKeyScript?: string;
  s3?: {
    accessKeyField?: string;
    secretKeyField?: string;
    sessionTokenField?: string;
    encryption?: 'bucket-default' | 'AES256';
  };
};
type Props = {
  open: boolean;
  channelCode: string;
  initialValues?: Record<string, any>;
  readOnly?: boolean;
  onClose: () => void;
  onSave: (config: Record<string, unknown>) => void;
};

// 仅迁移旧 demo 的字段引用，不推测凭证值或目标环境。
function migrateMapping(mapping?: { source?: string[]; operation?: unknown }): Mapping {
  const source = mapping?.source?.at(-1);
  if (!source) return { mode: 'context' };
  if (source === 'constant.octet-stream') return { mode: 'constant', value: 'application/octet-stream' };
  if (source === 'constant.json') return { mode: 'constant', value: 'application/json' };
  if (source.startsWith('global.')) return { mode: 'global', value: source.slice(7) };
  return { mode: 'context', value: source };
}

/**
 * 对象键变量历史上有三种存法：`{ source: [...] }`、`{ mode, value }`、以及顶层 `pathMappings`。
 * 统一收敛成 http Path Vars 同构的 `{ source: [...] }`。
 */
function normalizeKeyMappings(
  current: Record<string, unknown> | undefined,
  legacy: Record<string, unknown> | undefined,
  cascaderOptions: ReturnType<typeof toCascaderOptions>,
): Record<string, KeyMapping> {
  const toSource = (value: unknown): KeyMapping => {
    const entry = value as { source?: string[]; mode?: string; value?: string } | undefined;
    if (entry?.source) return { source: entry.source };
    if (!entry?.value) return {};
    const leaf = entry.mode === 'global' && !entry.value.startsWith('global.') ? `global.${entry.value}` : entry.value;
    return { source: findCascadePath(cascaderOptions, leaf) };
  };
  return Object.fromEntries(Object.entries(current ?? legacy ?? {}).map(([key, value]) => [key, toSource(value)]));
}

export default function S3UploadDrawer({ open, channelCode, initialValues = {}, readOnly = false, onClose, onSave }: Props) {
  const [form] = Form.useForm<Config>();
  const [activeTab, setActiveTab] = useState('credential');
  const store = useChannelScopeStore();
  const endpoints = store.outboundEndpointsByChannel[channelCode] ?? [];
  const globals = store.globalVariablesByChannel[channelCode] ?? [];
  const credentials = store.credentialsByChannel[channelCode] ?? [];
  const orders = store.orderVariablesByChannel[channelCode] ?? [];
  const credentialOptions = credentials.map(c => ({ label: c.key, value: c.key }));
  // 与 http 组件共用同一棵候选树，对象键变量可直接级联选择，不再手输字段路径。
  const cascaderOptions = toCascaderOptions(buildRequestValueOptions({
    orderContextOption: buildOrderContextOption(false),
    requestContextOptions: buildRequestContextOptions({ spiRequest: spiRequestFieldsFor(channelCode), globals, orders, credentials }),
  }));
  const legacyContentType = initialValues.file?.contentType ?? (initialValues.fixedFields?.contentType ? migrateMapping(initialValues.fixedFields.contentType) : undefined);
  const contentType = typeof legacyContentType === 'string' ? legacyContentType
    : legacyContentType?.mode === 'constant' ? legacyContentType.value
    : legacyContentType ? undefined : 'application/octet-stream';
  const contentTypeOptions = [...new Set([...contentTypes, ...(contentType ? [contentType] : [])])].map(value => ({ label: value, value }));
  const initialSourceUrl: Mapping = initialValues.file?.sourceUrl ?? migrateMapping(initialValues.fixedFields?.sourceUrl);
  const initial: Config = {
    endpointId: initialValues.endpointId ?? endpoints.find(e => e.method === 'PUT' && e.protocol === 'HTTPS')?.id,
    file: { sourceType: 'url', ...(initialValues.file ?? {
      sourceUrl: migrateMapping(initialValues.fixedFields?.sourceUrl),
    }), sourceUrl: { ...initialSourceUrl, mode: initialSourceUrl.mode === 'constant' ? undefined : initialSourceUrl.mode }, contentType },
    s3: {
      accessKeyField: initialValues.s3?.accessKeyField,
      secretKeyField: initialValues.s3?.secretKeyField,
      sessionTokenField: initialValues.s3?.sessionTokenField,
      // 不支持 SSE-KMS；历史配置里的 aws:kms 回退到 Bucket default，避免回显一个选不中的值。
      encryption: initialValues.s3?.encryption === 'AES256' ? 'AES256' : 'bucket-default',
    },
    objectKeyMode: initialValues.objectKeyMode ?? 'mapping',
    objectKeyScript: initialValues.objectKeyScript ?? '',
    keyMappings: normalizeKeyMappings(initialValues.keyMappings, initialValues.pathMappings, cascaderOptions),
  };
  const values = { ...initial, ...Form.useWatch([], form) };
  const endpoint = endpoints.find(e => e.id === values.endpointId);
  const endpointValid = endpoint?.method === 'PUT' && endpoint.protocol === 'HTTPS';
  const keyTemplate = endpoint?.path.replace(/^\//, '');
  const pathVariables = [...new Set(Array.from(keyTemplate?.matchAll(/\{([^}]+)\}/g) ?? [], m => m[1]))];
  const hasLegacyMapping = Object.values(initialValues.pathMappings ?? {}).some((m: any) => m.operation);
  // 旧配置里 global 模式只存变量名，回显时补成完整路径才能命中候选树。
  const toCascadeValue = (mapping?: Mapping): string[] | undefined => {
    if (!mapping?.value) return undefined;
    const leaf = mapping.mode === 'global' && !mapping.value.startsWith('global.') ? `global.${mapping.value}` : mapping.value;
    return findCascadePath(cascaderOptions, leaf);
  };
  const selectCascadeValue = (name: ['file', 'sourceUrl'], path: (string | number)[]) => {
    const leaf = String(path[path.length - 1]);
    form.setFieldValue([...name, 'mode'], leaf.startsWith('global.') ? 'global' : 'context');
    form.setFieldValue([...name, 'value'], leaf);
    void form.validateFields([[...name, 'value']]).catch(() => undefined);
  };
  const mappingEditor = (name: ['file', 'sourceUrl'], label: string) => <Card size="small" title={label} style={{ marginBottom: 10 }}>
    <Space align="start" style={{ display: 'flex', flexWrap: 'wrap' }}>
      <Form.Item name={[...name, 'mode']} hidden><Input /></Form.Item>
      <Form.Item noStyle shouldUpdate>{() => {
        const mode = form.getFieldValue([...name, 'mode']) ?? 'context';
        if (mode === 'constant') {
          return <Form.Item name={[...name, 'value']} style={{ marginBottom: 0, minWidth: 420 }} rules={[{ required: true, whitespace: true, message: `Enter ${label.toLowerCase()}` }]}>
            <Input aria-label={label} placeholder="Enter a fixed value" />
          </Form.Item>;
        }
        return <>
          <Cascader
            aria-label={label}
            value={toCascadeValue(form.getFieldValue([...name]) as Mapping | undefined)}
            options={cascaderOptions}
            placeholder="Select source value"
            expandTrigger="click"
            showSearch
            style={{ minWidth: 420 }}
            onChange={(path) => selectCascadeValue(name, path)}
          />
          <Form.Item name={[...name, 'value']} hidden rules={[
            { required: true, message: `Select ${label.toLowerCase()}` },
            { validator: async (_, value: string) => {
              if (value && !findCascadePath(cascaderOptions, value)) throw new Error('Select an existing context value');
            } },
          ]}><Input /></Form.Item>
        </>;
      }}</Form.Item>
    </Space>
  </Card>;

  const save = async () => {
    let data: Config;
    try {
      data = await form.validateFields();
    } catch (error) {
      const fields = (error as { errorFields?: { name: (string | number)[] }[] }).errorFields;
      const field = fields?.[0]?.name;
      if (field) setActiveTab(field[0] === 'file' || field[1] === 'encryption' ? 'file' : ['keyMappings', 'objectKeyMode', 'objectKeyScript'].includes(String(field[0])) ? 'key' : 'credential');
      return;
    }
    if (!endpoint || !endpointValid) return;
    onSave({ component: 'uploadToS3', configVersion: 8, endpointId: endpoint.id, endpointVersion: endpoint.version,
      method: endpoint.method, protocol: endpoint.protocol, s3: { accessKeyField: data.s3?.accessKeyField, secretKeyField: data.s3?.secretKeyField, sessionTokenField: data.s3?.sessionTokenField, encryption: data.s3?.encryption }, file: {
        sourceType: data.file?.sourceType ?? 'url',
        ...(data.file?.sourceType === 'file'
          ? { fileRef: { mode: 'context', value: data.file.fileRef?.value } }
          : { sourceUrl: data.file?.sourceUrl }),
        contentType: data.file?.contentType,
      },
      objectKeyMode: data.objectKeyMode,
      ...(data.objectKeyMode === 'script'
        ? { objectKeyScript: data.objectKeyScript }
        : { keyMappings: Object.fromEntries(pathVariables.map(v => [v, data.keyMappings?.[v]])) }),
    });
  };

  return <Drawer title="Configure AWS S3 Upload" width="min(1100px, 94vw)" open={open} onClose={onClose} destroyOnHidden
    extra={!readOnly && <Space><Button onClick={onClose}>Cancel</Button><Button type="primary" disabled={!endpointValid} onClick={() => void save()}>Save</Button></Space>}>
    <Form form={form} disabled={readOnly} layout="vertical" initialValues={initial}>
      <Card title={<Space><Tag color="blue">uploadToS3</Tag><Text>Upload Endpoint</Text></Space>} size="small" style={{ marginBottom: 16 }}>
        <Form.Item name="endpointId" label="Outbound Endpoint" rules={[{ required: true }]}><Select placeholder="Select a PUT / HTTPS endpoint" options={endpoints.map(e => ({ label: `${e.method} · ${e.protocol} · ${e.path}`, value: e.id }))} /></Form.Item>
        {!endpoints.length && <Empty description="Create an endpoint in Resources → Outbound Endpoint." />}
        {endpoint && <>
          <Space style={{ marginBottom: 12 }}><Tag>{endpoint.method}</Tag><Tag>{endpoint.protocol}</Tag><Tag>Version {endpoint.version}</Tag></Space>
          {!endpointValid && <Alert type="warning" showIcon title="Select a PUT / HTTPS endpoint" description="This upload component requires PUT over HTTPS. Endpoint configuration remains generic." />}
          <Text type="secondary" style={{ display: 'block' }}>Region, bucket and addressing style are resolved from the selected runtime line. Supported: https://bucket.s3.region.amazonaws.com or https://s3.region.amazonaws.com/bucket. Custom endpoints are not supported in this version.</Text>
        </>}
      </Card>
      <Tabs activeKey={activeTab} onChange={setActiveTab} items={[
        { key: 'credential', label: 'Credential Mapping', forceRender: true, children: <>
        <Card size="small" title="AWS Credential Mapping">
          <Tag color="blue" style={{ marginBottom: 12 }}>AWS SigV4 · Platform managed</Tag>
          <Text style={{ display: 'block', marginBottom: 12 }}>Select Credential JSON keys. Actual values are loaded from the runtime Party / Account credentials.</Text>
          {!credentialOptions.length && <Alert type="warning" showIcon title="No credential fields available" description="Create the required field names in Resources → Credentials, then select them here." style={{ marginBottom: 12 }} />}
          {([
            { field: 'accessKeyField', parameter: 'accessKeyId', required: true },
            { field: 'secretKeyField', parameter: 'secretAccessKey', required: true },
            { field: 'sessionTokenField', parameter: 'sessionToken', required: false },
          ] as const).map(({ field, parameter, required }) => <Form.Item key={field} name={['s3', field]} label={parameter} extra={required ? 'Select a key, not the credential value.' : 'Required for temporary credentials; otherwise leave empty.'} rules={[
            { required, message: `Select the Credential JSON key for ${parameter}` },
            { validator: async (_, value: string) => {
              if (value && !credentialOptions.some(option => option.value === value)) throw new Error('This key is not defined in the channel Credential schema');
            } },
          ]}><Select allowClear showSearch optionFilterProp="label" options={credentialOptions} placeholder="Select Credential JSON key" /></Form.Item>)}
        </Card>
        </> },
        { key: 'file', label: 'File Configuration', forceRender: true, children: <>
      <Card size="small" title="File Source" style={{ marginBottom: 16 }}>
          <Alert style={{ marginBottom: 12 }} type="info" showIcon title="One file per upload" description="Use a file URL or an existing File object from the flow context. Both upload the original file bytes." />
          <Form.Item name={['file', 'sourceType']} label="File source" rules={[{ required: true }]}>
            <Radio.Group optionType="button" buttonStyle="solid" options={[{ label: 'File URL', value: 'url' }, { label: 'File object', value: 'file' }]} />
          </Form.Item>
          {values.file?.sourceType === 'file' ? <Card size="small" title={<Space>Source file<Tag>File</Tag></Space>} style={{ marginBottom: 10 }}>
            <Form.Item label="Context field" extra="Reference a File-typed value produced by an earlier step. This is not a URL, file path or file name.">
              <Cascader
                aria-label="Source File context field"
                value={values.file?.fileRef?.value ? findCascadePath(cascaderOptions, values.file.fileRef.value) : undefined}
                options={cascaderOptions}
                placeholder="Select a File context field"
                expandTrigger="click"
                showSearch
                onChange={(path) => {
                  form.setFieldValue(['file', 'fileRef', 'value'], path?.length ? String(path[path.length - 1]) : undefined);
                  void form.validateFields([['file', 'fileRef', 'value']]).catch(() => undefined);
                }}
              />
              <Form.Item name={['file', 'fileRef', 'value']} hidden rules={[{ required: true, message: 'Select the File context field' }]}><Input /></Form.Item>
            </Form.Item>
          </Card> : <>
            {mappingEditor(['file', 'sourceUrl'], 'Source URL')}
            {initialSourceUrl.mode === 'constant' && !values.file?.sourceUrl?.mode && <Alert type="warning" showIcon title="Select a new URL source" description="Fixed source URLs are no longer supported. Select a context field or global variable before saving." style={{ marginBottom: 12 }} />}
          </>}

      </Card>
      <Card size="small" title="Content Type" style={{ marginBottom: 16 }}>
          <Form.Item name={['file', 'contentType']} rules={[{ required: true, message: 'Select a content type' }]} extra="Use application/octet-stream for binary files such as Parquet. This setting describes the content and does not convert it.">
            <Select aria-label="Content Type" options={contentTypeOptions} placeholder="Select content type" showSearch optionFilterProp="label" />
          </Form.Item>
          {legacyContentType && !values.file?.contentType && <Alert type="warning" showIcon title="Select a content type" description="The previous dynamic content type mapping is no longer supported. Select a value before saving." />}
      </Card>
      <Card size="small" title="Storage options" style={{ marginBottom: 16 }}>
        <Form.Item name={['s3', 'encryption']} label="Server-side encryption" rules={[{ required: true }]}><Select options={[{ label: 'Bucket default', value: 'bucket-default' }, { label: 'SSE-S3 (AES256)', value: 'AES256' }]} /></Form.Item>
      </Card>
        </> },
        { key: 'key', label: 'Object Key', forceRender: true, children: <>
      {hasLegacyMapping && <Alert style={{ marginBottom: 12 }} type="warning" showIcon title="Review legacy configuration" description="Legacy path mappings were imported into the object key table. Review the source value and operation of each variable before saving the new configuration." />}
      <Card size="small" title="Object Key Variables" style={{ marginBottom: 16 }}>
          <Form.Item name="objectKeyMode" label="Generation mode" rules={[{ required: true }]}>
            <Radio.Group optionType="button" buttonStyle="solid" options={[{ label: 'Field mapping', value: 'mapping' }, { label: 'Groovy script', value: 'script' }]} />
          </Form.Item>
          {values.objectKeyMode === 'script' ? <>
            <Alert type="info" showIcon title="Generate path variables" description="Return pathVariables for the Endpoint template. Use an explicit time format and time zone when deriving date segments from an upstream timestamp." style={{ marginBottom: 12 }} />
            <Button style={{ marginBottom: 12 }} disabled={readOnly || Boolean(values.objectKeyScript?.trim() && values.objectKeyScript !== groovyScriptTemplate)} onClick={() => form.setFieldValue('objectKeyScript', dateScriptExample)}>Use UTC date example</Button>
            <GroovyScriptEditor name="objectKeyScript" label="Object Key Script" helpText={objectKeyScriptHelp} />
            <Form.Item name="objectKeyScript" hidden rules={[{ validator: async (_, script: string) => {
              if (!script?.trim() || script.trim() === groovyScriptTemplate) throw new Error('Enter a script that returns pathVariables');
            } }]}><Input /></Form.Item>
          </> : <>
            {endpoint && pathVariables.length === 0 && <Text type="secondary">This endpoint path produces a fixed object key. No path variables are required.</Text>}
            {pathVariables.length > 0 && <PathVariableMappingEditor
              variables={pathVariables}
              mappingName="keyMappings"
              sourceOptions={cascaderOptions}
              operationOptions={mappingOperationOptions}
              emptyText="Select an Endpoint to resolve path variables."
              readOnly={readOnly}
            />}
          </>}
          <Text type="secondary">The first slash of the Endpoint path is the HTTP path separator and is excluded from the object key.</Text>
      </Card>
        </> },
      ]} />
    </Form>
  </Drawer>;
}

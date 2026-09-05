import { useEffect, useMemo, useState } from 'react';
import { Alert, Badge, Button, Cascader, Drawer, Dropdown, Input, Select, Space, Table, Tabs, Tag, Tooltip, Typography, message } from 'antd';
import type { MenuProps } from 'antd';
import { ArrowRightOutlined, CaretDownOutlined, CaretRightOutlined, DeleteOutlined, DownOutlined, MinusSquareOutlined, PlusOutlined, PlusSquareOutlined } from '@ant-design/icons';
import type { VariableItem } from './channelScopeStore';

const { Text } = Typography;
type ValueSource = 'flowContext' | 'globalVariable' | 'orderVariable' | 'fixedValue';
type AssignmentSource = 'contextFields' | 'generatedData' | 'fixedValue';
type MappingValue = { source: ValueSource; value: string };
type Assignment = { id: string; source: AssignmentSource; value: string | string[]; operation?: string[]; target: string };
type ResponseField = { name: string; type: string; children?: ResponseField[] };

const RESPONSE_FIELDS: ResponseField[] = [
  { name: 'route', type: 'Object', children: [{ name: 'channel', type: 'String' }, { name: 'serviceChannel', type: 'String' }, { name: 'country', type: 'String' }, { name: 'tenant', type: 'String' }, { name: 'institution', type: 'String' }] },
  { name: 'capability', type: 'Object', children: [{ name: 'businessType', type: 'String' }, { name: 'service', type: 'String' }, { name: 'ability', type: 'String' }, { name: 'action', type: 'String' }] },
  { name: 'identity', type: 'Object', children: [{ name: 'routeOrderId', type: 'Long' }, { name: 'upstreamRequestId', type: 'String' }, { name: 'requestReference', type: 'String' }, { name: 'responseReference', type: 'String' }, { name: 'channelOrderId', type: 'String' }, { name: 'sessionId', type: 'String' }] },
  { name: 'result', type: 'Object', children: [{ name: 'status', type: 'Integer' }, { name: 'responseCode', type: 'String' }, { name: 'responseMsg', type: 'String' }, { name: 'channelResponseCode', type: 'String' }, { name: 'channelResponseMsg', type: 'String' }] },
  { name: 'extraResponse', type: 'Object', children: [{ name: 'feeAmount', type: 'Object', children: [{ name: 'amount', type: 'BigDecimal' }, { name: 'currency', type: 'String' }] }, { name: 'feeType', type: 'String' }, { name: 'exchangeRate', type: 'BigDecimal' }] },
];
const FLOW_CONTEXT_OPTIONS = [
  { value: 'spi.request.sourceAmount.amount', label: 'SPI Request / sourceAmount / amount' },
  { value: 'spi.request.sourceAmount.currency', label: 'SPI Request / sourceAmount / currency' },
  { value: 'spi.request.targetAmount.currency', label: 'SPI Request / targetAmount / currency' },
  { value: 'spi.request.requestReference', label: 'SPI Request / requestReference' },
];
const GENERATED_DATA_OPTIONS = [
  { value: 'date', label: 'Date', children: [{ value: 'timestampMillis', label: 'Timestamp (Milliseconds)' }, { value: 'timestampSeconds', label: 'Timestamp (Seconds)' }, { value: 'iso8601', label: 'ISO 8601' }, { value: 'yyyyMMddHHmmss', label: 'yyyyMMddHHmmss' }] },
  { value: 'random', label: 'Random', children: [{ value: 'uuid', label: 'UUID' }, { value: 'numeric6', label: '6-digit Number' }, { value: 'numeric12', label: '12-digit Number' }, { value: 'alphanumeric16', label: '16-character Alphanumeric' }] },
  { value: 'callback', label: 'Callback', children: [{ value: 'url', label: 'Callback URL' }, { value: 'token', label: 'Callback Token' }] },
];
const ASSIGNMENT_OPERATION_OPTIONS = [
  { value: 'string', label: 'String', children: [{ value: 'uppercase', label: 'To Upper Case' }, { value: 'lowercase', label: 'To Lower Case' }] },
  { value: 'format', label: 'Format', children: [{ value: 'date', label: 'Date Format' }, { value: 'decimal', label: 'Decimal Format' }] },
];
const RESPONSE_CODES = [
  { value: '61000001', label: '61000001 - Success', message: 'Success', mainState: 'SUCCESS' },
  { value: '61000004', label: '61000004 - Transaction in progress', message: 'Transaction in progress', mainState: 'PENDING' },
  { value: '61000002', label: '61000002 - Failure due to unknown reasons', message: 'Failure due to unknown reasons', mainState: 'FAIL' },
];
const SUB_STATES = [
  { value: 'PAYMENT_SUCCESS', mainState: 'SUCCESS' },
  { value: 'PAYMENT_PENDING_WAIT_CALLBACK', mainState: 'PENDING' },
  { value: 'PAYMENT_FAILED_BY_CHANNEL', mainState: 'FAIL' },
];
const isContainer = (field: ResponseField) => ['Object', 'Array'].includes(field.type);
const collectContainerPaths = (fields: ResponseField[], parent = ''): string[] => fields.flatMap((field) => { const path = parent ? `${parent}.${field.name}` : field.name; return isContainer(field) ? [path, ...collectContainerPaths(field.children ?? [], path)] : []; });
const isMappablePath = (path: string) => ['result.channelResponseCode', 'result.channelResponseMsg'].includes(path) || path.startsWith('extraResponse.');
const DEFAULT_COLLAPSED_PATHS = new Set(['route', 'capability', 'identity']);

export type ConfiguredSpiResponseConfig = { subState: string; responseCode: string; mainState: string; assignments: Assignment[]; mappings: Record<string, MappingValue> };

export default function ReturnConfiguredSpiResponseDrawer({ open, globalVariables, orderVariables, initialValues, readOnly, onClose, onSave }: {
  open: boolean;
  globalVariables: VariableItem[];
  orderVariables: Array<{ name: string; value?: string }>;
  initialValues?: Record<string, unknown>;
  readOnly?: boolean;
  onClose: () => void;
  onSave: (config: ConfiguredSpiResponseConfig) => void;
}) {
  const [subState, setSubState] = useState<string>();
  const [responseCode, setResponseCode] = useState<string>();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [mappings, setMappings] = useState<Record<string, MappingValue>>({});
  const [collapsedPaths, setCollapsedPaths] = useState<Set<string>>(() => new Set(DEFAULT_COLLAPSED_PATHS));
  const mainState = SUB_STATES.find((item) => item.value === subState)?.mainState;
  const availableResponseCodes = RESPONSE_CODES.filter((item) => item.mainState === mainState);
  const containerPaths = useMemo(() => collectContainerPaths(RESPONSE_FIELDS), []);
  const assignmentTargets = assignments.map((item) => item.target);
  const assignmentValue = (item: Assignment) => Array.isArray(item.value) ? item.value.join('.') : item.value;
  const assignmentHasValue = (item: Assignment) => Boolean(assignmentValue(item).trim());
  const assignmentStatus = assignments.length === 0
    ? 'default'
    : assignments.every((item) => assignmentHasValue(item) && item.target) && new Set(assignmentTargets).size === assignmentTargets.length ? 'success' : 'error';
  const orderResultStatus = subState && responseCode && mainState ? 'success' : 'error';
  const mappingItems = Object.values(mappings);
  const responseMappingStatus = mappingItems.length === 0 ? 'default' : mappingItems.every((item) => item.value.trim()) ? 'success' : 'error';

  useEffect(() => {
    if (!open) return;
    const saved = initialValues as (ConfiguredSpiResponseConfig & { valueSource?: ValueSource; mappings?: Record<string, MappingValue | string> }) | undefined;
    setSubState(saved?.subState);
    setResponseCode(saved?.responseCode);
    setAssignments((saved?.assignments ?? []).map((item) => ({ ...item, source: ['contextFields', 'generatedData', 'fixedValue'].includes(item.source) ? item.source : item.source === 'fixedValue' ? 'fixedValue' : 'contextFields', value: Array.isArray(item.value) ? item.value : item.source === 'fixedValue' ? item.value : item.value ? ['_order', item.value] : [] })) as Assignment[]);
    setMappings(Object.fromEntries(Object.entries(saved?.mappings ?? {}).map(([path, item]) => [path, typeof item === 'string' ? { source: saved?.valueSource ?? 'globalVariable', value: item } : item])));
    setCollapsedPaths(new Set(DEFAULT_COLLAPSED_PATHS));
  }, [initialValues, open]);

  const save = () => {
    if (!subState || !responseCode || !mainState) return void message.error('Configure Gateway Sub State and Response Code before saving.');
    if (assignments.some((item) => !assignmentHasValue(item) || !item.target)) return void message.error('Complete or remove unfinished Order Variable assignments.');
    const targets = assignments.map((item) => item.target);
    if (new Set(targets).size !== targets.length) return void message.error('An Order Variable can only be assigned once in this component.');
    onSave({ subState, responseCode, mainState, assignments, mappings: Object.fromEntries(Object.entries(mappings).filter(([, item]) => item.value.trim())) });
  };
  const sourceKind = (value: string): AssignmentSource => value.startsWith('generated.') ? 'generatedData' : value.startsWith('_') ? 'contextFields' : 'fixedValue';
  const mappingSourceKind = (value: string): ValueSource => value.startsWith('_globalVariable.') ? 'globalVariable' : value.startsWith('_orderVariable.') ? 'orderVariable' : value.startsWith('_') || value.startsWith('generated.') ? 'flowContext' : 'fixedValue';
  const sourceMenuItems = (includeOrderVariable: boolean): MenuProps['items'] => [
    { key: 'context-fields', label: 'Context Fields', children: [
      { key: '_order', label: '_order', children: FLOW_CONTEXT_OPTIONS.map((item) => ({ key: `_order.${item.value}`, label: item.label.replace('SPI Request / ', '') })) },
      { key: '_globalVariable', label: '_globalVariable', children: globalVariables.map((item) => ({ key: `_globalVariable.${item.id}`, label: `${item.name} · ${item.value}` })) },
      { key: '_credential', label: '_credential', children: [{ key: '_credential.primaryApiKey', label: 'Primary API Key' }, { key: '_credential.clientSecret', label: 'Client Secret' }] },
      ...(includeOrderVariable ? [{ key: '_orderVariable', label: '_orderVariable', children: orderVariables.map((item) => ({ key: `_orderVariable.${item.name}`, label: item.name })) }] : []),
    ] },
    { key: 'generated-data', label: 'Generated Data', children: GENERATED_DATA_OPTIONS.map((group) => ({ key: `generated.${group.value}`, label: group.label, children: group.children.map((item) => ({ key: `generated.${group.value}.${item.value}`, label: item.label })) })) },
    { key: 'fixed-value', label: 'Fixed Value — type directly', disabled: true },
  ];
  const sourceValueControl = (value: string, onChange: (value: string) => void, includeOrderVariable = false) => <Dropdown trigger={['click']} menu={{ items: sourceMenuItems(includeOrderVariable), onClick: ({ key }) => onChange(key) }}><Input size="small" disabled={readOnly} value={value} placeholder="Select or enter a source value" suffix={<DownOutlined style={{ color: '#8c8c8c', fontSize: 10 }} />} onChange={(event) => onChange(event.target.value)} /></Dropdown>;
  const assignmentValueType = (item: Assignment) => assignmentValue(item).startsWith('generated.date.') ? 'Long' : 'String';
  const columnTitle = (label: string) => <span style={{ fontSize: 11, fontWeight: 400 }}>{label}</span>;
  const tabLabel = (label: string, status?: 'success' | 'error') => <Space size={8}><span>{label}</span>{status && <Badge status={status} />}</Space>;
  const columns = 'minmax(340px, 1fr) 42px minmax(300px, 1fr) 100px';
  const renderField = (field: ResponseField, parent = '', depth = 0) => {
    const path = parent ? `${parent}.${field.name}` : field.name;
    const container = isContainer(field);
    const mappable = !container && isMappablePath(path);
    const collapsed = collapsedPaths.has(path);
    const mapping = mappings[path] ?? { source: 'globalVariable' as ValueSource, value: '' };
    const systemValue = path === 'result.status' ? (mainState ?? 'Derived from Main State') : path === 'result.responseCode' ? (responseCode ?? 'Selected in Response Code') : path === 'result.responseMsg' ? (RESPONSE_CODES.find((item) => item.value === responseCode)?.message ?? 'Derived from Response Code') : '';
    return <div key={path}>
      <div style={{ display: 'grid', gridTemplateColumns: columns, gap: 8, alignItems: 'center', minHeight: 48, padding: '6px 12px', borderTop: '1px solid #f0f0f0', background: container ? '#fafafa' : '#fff' }}>
        {mappable ? sourceValueControl(mapping.value, (value) => setMappings((current) => ({ ...current, [path]: { source: mappingSourceKind(value), value } })), true) : <Text type="secondary">{systemValue}</Text>}
        {mappable ? <ArrowRightOutlined style={{ color: '#8c8c8c', justifySelf: 'center' }} /> : <span />}
        <div style={{ display: 'flex', alignItems: 'center', paddingLeft: depth * 20 }}>{container ? <Button type="text" size="small" icon={collapsed ? <CaretRightOutlined /> : <CaretDownOutlined />} onClick={() => setCollapsedPaths((current) => { const next = new Set(current); if (next.has(path)) next.delete(path); else next.add(path); return next; })} /> : <span style={{ width: 32 }} />}<Text strong={container}>{field.name}</Text></div>
        <Text>{field.type}</Text>
      </div>
      {container && !collapsed && (field.children ?? []).map((child) => renderField(child, path, depth + 1))}
    </div>;
  };

  return <Drawer title="Direct SPI Response" width={1160} open={open} onClose={onClose} extra={!readOnly && <Space><Button onClick={onClose}>Cancel</Button><Button type="primary" onClick={save}>Save</Button></Space>}>
    <Alert type="info" showIcon message="Complete the current Flow and return an SPI response without sending an external request." style={{ marginBottom: 16 }} />
    <Tabs items={[
      {
        key: 'order-variable-assignment',
        label: tabLabel('Order Variable', assignmentStatus === 'default' ? undefined : assignmentStatus),
        children: <div style={{ border: '1px solid #e8e8e8', borderRadius: 8, overflow: 'hidden' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', background: '#fafafa', borderBottom: '1px solid #e8e8e8', fontSize: 12 }}><Space size={6}><Text strong style={{ fontSize: 12 }}>Value to Order Variable Mapping</Text><Tag style={{ margin: 0, fontSize: 11 }}>{assignments.length} fields</Tag></Space>{!readOnly && <Button size="small" type="primary" ghost icon={<PlusOutlined />} onClick={() => setAssignments((items) => [...items, { id: `assignment-${Date.now()}`, source: 'contextFields', value: [], target: '' }])}>Add Mapping</Button>}</div>
          <Table size="small" style={{ fontSize: 12 }} pagination={false} rowKey="id" dataSource={assignments} locale={{ emptyText: 'No mappings configured.' }} columns={[
            { title: columnTitle('SOURCE VALUE'), width: 260, render: (_, record) => sourceValueControl(assignmentValue(record), (value) => setAssignments((items) => items.map((item) => item.id === record.id ? { ...item, source: sourceKind(value), value } : item))) },
            { title: columnTitle('SOURCE TYPE'), width: 82, render: (_, record) => <Text style={{ fontSize: 12 }}>{assignmentValueType(record)}</Text> },
            { title: '', width: 24, render: () => <ArrowRightOutlined style={{ color: '#8c8c8c', fontSize: 11 }} /> },
            { title: columnTitle('OPERATION'), width: 135, render: (_, record) => <Cascader size="small" allowClear disabled={readOnly} value={record.operation} placeholder="Optional" options={ASSIGNMENT_OPERATION_OPTIONS} onChange={(operation) => setAssignments((items) => items.map((item) => item.id === record.id ? { ...item, operation: operation.map(String) } : item))} /> },
            { title: '', width: 24, render: () => <ArrowRightOutlined style={{ color: '#8c8c8c', fontSize: 11 }} /> },
            { title: columnTitle('ORDER VARIABLE'), width: 170, render: (_, record) => <Select size="small" showSearch disabled={readOnly} value={record.target || undefined} placeholder="Select variable" options={orderVariables.map((item) => ({ value: item.name, label: item.name }))} onChange={(target) => setAssignments((items) => items.map((item) => item.id === record.id ? { ...item, target } : item))} /> },
            { title: columnTitle('TARGET TYPE'), width: 78, render: () => <Text style={{ fontSize: 12 }}>String</Text> },
            { title: '', width: 48, render: (_, record) => !readOnly && <Button danger type="text" icon={<DeleteOutlined />} onClick={() => setAssignments((items) => items.filter((item) => item.id !== record.id))} /> },
          ]} />
        </div>,
      },
      {
        key: 'order-result',
        label: tabLabel('Response Code', orderResultStatus),
        children: <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, paddingTop: 8 }}><div><Text strong>Gateway Sub State</Text><Select style={{ width: '100%', marginTop: 8 }} disabled={readOnly} value={subState} placeholder="Select Gateway Sub State" options={SUB_STATES.map((item) => ({ value: item.value }))} onChange={(value) => { setSubState(value); const nextMainState = SUB_STATES.find((item) => item.value === value)?.mainState; if (RESPONSE_CODES.find((item) => item.value === responseCode)?.mainState !== nextMainState) setResponseCode(undefined); }} /></div><div><Text strong>Main State</Text><Input style={{ marginTop: 8 }} disabled value={mainState} placeholder="Derived from Gateway Sub State" /></div><div><Text strong>Response Code</Text><Select style={{ width: '100%', marginTop: 8 }} disabled={readOnly || !mainState} value={responseCode} placeholder={mainState ? 'Select Response Code' : 'Select Gateway Sub State first'} options={availableResponseCodes} onChange={setResponseCode} /></div></div>,
      },
      {
        key: 'spi-response-mapping',
        label: tabLabel('SPI Response Mapping', responseMappingStatus === 'default' ? undefined : responseMappingStatus),
        children: <div style={{ border: '1px solid #e8e8e8', borderRadius: 8, overflow: 'hidden' }}><div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 12px', background: '#fafafa' }}><Tag>{Object.values(mappings).filter((item) => item.value.trim()).length} mapped</Tag><Space><Tooltip title="Expand all"><Button size="small" icon={<PlusSquareOutlined />} onClick={() => setCollapsedPaths(new Set())} /></Tooltip><Tooltip title="Collapse all"><Button size="small" icon={<MinusSquareOutlined />} onClick={() => setCollapsedPaths(new Set(containerPaths))} /></Tooltip></Space></div><div style={{ overflowX: 'auto' }}><div style={{ minWidth: 900 }}><div style={{ display: 'grid', gridTemplateColumns: columns, gap: 8, padding: '8px 12px', background: '#fcfcfc', color: '#8c8c8c', fontSize: 11 }}><span>SOURCE VALUE</span><span /><span>SPI RESPONSE FIELD</span><span>TYPE</span></div>{RESPONSE_FIELDS.map((field) => renderField(field))}</div></div></div>,
      },
    ]} />
  </Drawer>;
}

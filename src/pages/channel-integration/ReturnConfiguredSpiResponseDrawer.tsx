import { useEffect, useMemo, useState } from 'react';
import { Alert, Button, Drawer, Input, Radio, Select, Space, Tag, Tooltip, Typography, message } from 'antd';
import { ArrowRightOutlined, CaretDownOutlined, CaretRightOutlined, MinusSquareOutlined, PlusSquareOutlined } from '@ant-design/icons';
import type { VariableItem } from './channelScopeStore';

const { Text } = Typography;
type ValueSource = 'globalVariable' | 'fixedValue';
type ResponseField = { name: string; type: string; required?: boolean; description: string; children?: ResponseField[] };

// Representative STABLECOIN fee/rate query response. Its envelope follows the
// platform SPI model; concrete children remain specific to each Capability SPI.
const RESPONSE_FIELDS: ResponseField[] = [
  { name: 'route', type: 'Object', required: true, description: 'Routing context returned with the response', children: [
    { name: 'channel', type: 'String', description: 'Physical channel' },
    { name: 'serviceChannel', type: 'String', description: 'Logical channel' },
    { name: 'country', type: 'String', required: true, description: 'Country or region code' },
    { name: 'tenant', type: 'String', required: true, description: 'Tenant' },
    { name: 'institution', type: 'String', description: 'Institution when applicable' },
  ] },
  { name: 'capability', type: 'Object', required: true, description: 'Selected capability context', children: [
    { name: 'businessType', type: 'String', required: true, description: 'Business Type' },
    { name: 'service', type: 'String', required: true, description: 'Service propagated for metrics and observability' },
    { name: 'ability', type: 'String', description: 'Gateway execution selector' },
    { name: 'action', type: 'String', required: true, description: 'Action' },
  ] },
  { name: 'identity', type: 'Object', required: true, description: 'Request and response correlation identifiers', children: [
    { name: 'routeOrderId', type: 'Long', description: 'Route order ID' },
    { name: 'upstreamRequestId', type: 'String', description: 'Upstream request ID' },
    { name: 'requestReference', type: 'String', description: 'Channel request reference' },
    { name: 'responseReference', type: 'String', description: 'Channel response reference' },
    { name: 'channelOrderId', type: 'String', description: 'Channel order ID' },
    { name: 'sessionId', type: 'String', required: true, description: 'End-to-end trace session ID' },
  ] },
  { name: 'result', type: 'Object', required: true, description: 'Normalized and channel response result', children: [
    { name: 'status', type: 'Integer', required: true, description: 'Normalized processing status' },
    { name: 'responseCode', type: 'String', required: true, description: 'Internal response code' },
    { name: 'responseMsg', type: 'String', description: 'Internal response message' },
    { name: 'channelResponseCode', type: 'String', description: 'External channel response code' },
    { name: 'channelResponseMsg', type: 'String', description: 'External channel response message' },
  ] },
  { name: 'extraResponse', type: 'Object', description: 'Business-specific response fields', children: [
    { name: 'feeAmount', type: 'Object', description: 'Quoted fee amount', children: [
      { name: 'amount', type: 'BigDecimal', description: 'Fee amount' },
      { name: 'currency', type: 'String', description: 'Fee currency' },
    ] },
    { name: 'feeType', type: 'String', description: 'Fee type' },
    { name: 'exchangeRate', type: 'BigDecimal', description: 'Contract exchange rate used by this demo' },
  ] },
];

const isContainer = (field: ResponseField) => ['Object', 'Array'].includes(field.type);
const collectContainerPaths = (fields: ResponseField[], parent = ''): string[] => fields.flatMap((field) => {
  const path = parent ? `${parent}.${field.name}` : field.name;
  return isContainer(field) ? [path, ...collectContainerPaths(field.children ?? [], path)] : [];
});
const isMappablePath = (path: string) => path === 'result.responseMsg' || path.startsWith('extraResponse.');
const DEFAULT_COLLAPSED_PATHS = new Set(['route', 'capability', 'identity']);
const SYSTEM_FIXED_VALUES: Record<string, string> = {
  'result.status': '1 (SUCCESS)',
  'result.responseCode': '61000001',
};

export type ConfiguredSpiResponseConfig = { valueSource: ValueSource; mappings: Record<string, string> };

export default function ReturnConfiguredSpiResponseDrawer({ open, globalVariables, initialValues, readOnly, onClose, onSave }: {
  open: boolean;
  globalVariables: VariableItem[];
  initialValues?: Record<string, unknown>;
  readOnly?: boolean;
  onClose: () => void;
  onSave: (config: ConfiguredSpiResponseConfig) => void;
}) {
  const [valueSource, setValueSource] = useState<ValueSource>('globalVariable');
  const [mappingDrafts, setMappingDrafts] = useState<Record<ValueSource, Record<string, string>>>({ globalVariable: {}, fixedValue: {} });
  const [collapsedPaths, setCollapsedPaths] = useState<Set<string>>(() => new Set(DEFAULT_COLLAPSED_PATHS));
  const mappings = mappingDrafts[valueSource];
  const containerPaths = useMemo(() => collectContainerPaths(RESPONSE_FIELDS), []);

  useEffect(() => {
    if (!open) return;
    const saved = initialValues as ConfiguredSpiResponseConfig | undefined;
    const savedSource = saved?.valueSource ?? 'globalVariable';
    setValueSource(savedSource);
    setMappingDrafts({ globalVariable: {}, fixedValue: {}, [savedSource]: saved?.mappings ?? {} });
    setCollapsedPaths(new Set(DEFAULT_COLLAPSED_PATHS));
  }, [initialValues, open]);

  const apply = () => {
    const activeMappings = Object.fromEntries(Object.entries(mappings).filter(([path, value]) => isMappablePath(path) && value.trim()));
    if (!Object.keys(activeMappings).length) {
      return void message.error('Configure at least one mapping before saving.');
    }
    onSave({ valueSource, mappings: activeMappings });
  };
  const updateMapping = (path: string, value: string) => setMappingDrafts((current) => ({
    ...current, [valueSource]: { ...current[valueSource], [path]: value },
  }));
  const togglePath = (path: string) => setCollapsedPaths((current) => {
    const next = new Set(current); if (next.has(path)) next.delete(path); else next.add(path); return next;
  });

  const columns = 'minmax(340px, 1.2fr) 42px minmax(320px, 1fr) 110px';
  const renderField = (field: ResponseField, parent = '', depth = 0) => {
    const path = parent ? `${parent}.${field.name}` : field.name;
    const container = isContainer(field);
    const mappable = !container && isMappablePath(path);
    const collapsed = collapsedPaths.has(path);
    return <div key={path}>
      <div style={{ display: 'grid', gridTemplateColumns: columns, gap: 8, alignItems: 'center', minHeight: 48, padding: '6px 12px', borderTop: '1px solid #f0f0f0', background: container ? '#fafafa' : '#fff' }}>
        {!mappable ? <Text type="secondary">{SYSTEM_FIXED_VALUES[path] ? `System fixed · ${SYSTEM_FIXED_VALUES[path]}` : ''}</Text> : valueSource === 'globalVariable' ? <Select
          showSearch allowClear optionFilterProp="label" disabled={readOnly} value={mappings[path] || undefined}
          placeholder="Select Global Variable" options={globalVariables.map((variable) => ({ value: variable.id, label: `${variable.name} · ${variable.value}` }))}
          onChange={(value) => updateMapping(path, value ?? '')}
        /> : <Input disabled={readOnly} value={mappings[path] ?? ''} placeholder={`Enter ${field.type} value`} onChange={(event) => updateMapping(path, event.target.value)} />}
        {mappable ? <ArrowRightOutlined style={{ color: '#8c8c8c', justifySelf: 'center' }} /> : <span />}
        <div style={{ display: 'flex', alignItems: 'center', minWidth: 0, paddingLeft: depth * 20 }}>
          {container ? <Button type="text" size="small" icon={collapsed ? <CaretRightOutlined /> : <CaretDownOutlined />} onClick={() => togglePath(path)} style={{ width: 24, padding: 0, marginRight: 4 }} /> : <span style={{ width: 28 }} />}
          <Text code={!container} strong={container}>{field.name}</Text>
        </div>
        <Tag color={container ? 'purple' : undefined} style={{ width: 'fit-content', margin: 0 }}>{field.type}</Tag>
      </div>
      {container && !collapsed && (field.children ?? []).map((child) => renderField(child, path, depth + 1))}
    </div>;
  };

  return <Drawer title="Return Configured SPI Response" width={1100} open={open} onClose={onClose}
    extra={!readOnly && <Space><Button onClick={onClose}>Cancel</Button><Button type="primary" onClick={apply}>Save</Button></Space>}>
    <Alert type="info" showIcon message="Return an SPI response without sending an external request."
      description="Use the temporary Value Source switch to compare referencing Channel Global Variables with storing Fixed Values directly in this component." style={{ marginBottom: 20 }} />
    <div style={{ marginBottom: 20 }}>
      <Text strong style={{ display: 'block', marginBottom: 8 }}>Value Source</Text>
      <Radio.Group optionType="button" buttonStyle="solid" value={valueSource} disabled={readOnly}
        options={[{ label: 'Global Variable', value: 'globalVariable' }, { label: 'Fixed Value', value: 'fixedValue' }]}
        onChange={(event) => setValueSource(event.target.value)} />
      <Text type="secondary" style={{ display: 'block', marginTop: 8 }}>
        {valueSource === 'globalVariable' ? 'Values are maintained as Channel Global Variables and referenced by this component.' : 'Values are stored directly in this Flow component configuration.'}
      </Text>
    </div>
    <div style={{ border: '1px solid #e8e8e8', borderRadius: 8, overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', background: '#fafafa', borderBottom: '1px solid #e8e8e8' }}>
        <Space size={8}><Text strong>SPI Response Mapping</Text><Tag>{Object.entries(mappings).filter(([path, value]) => isMappablePath(path) && value.trim()).length} mapped</Tag></Space>
        <Space size={6}>
          <Tooltip title="Expand all"><Button size="small" icon={<PlusSquareOutlined />} onClick={() => setCollapsedPaths(new Set())} /></Tooltip>
          <Tooltip title="Collapse all"><Button size="small" icon={<MinusSquareOutlined />} onClick={() => setCollapsedPaths(new Set(containerPaths))} /></Tooltip>
        </Space>
      </div>
      <div style={{ overflowX: 'auto' }}><div style={{ minWidth: 1030 }}>
        <div style={{ display: 'grid', gridTemplateColumns: columns, gap: 8, padding: '8px 12px', background: '#fcfcfc', color: '#8c8c8c', fontSize: 11 }}>
          <span>{valueSource === 'globalVariable' ? 'GLOBAL VARIABLE' : 'FIXED VALUE'}</span><span /><span>SPI RESPONSE FIELD</span><span>TYPE</span>
        </div>
        {RESPONSE_FIELDS.map((field) => renderField(field))}
      </div></div>
    </div>
  </Drawer>;
}

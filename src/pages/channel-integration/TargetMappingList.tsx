import { ArrowRightOutlined, DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import { Button, Cascader, Select, Tooltip, Typography } from 'antd';

const { Text } = Typography;

export interface TargetMapping {
  id: string;
  operation?: string[];
  targetValue?: string;
}

export interface MappingValueOption {
  label: string;
  value: string;
  type?: string;
  disabled?: boolean;
}

export interface MappingOptionGroup {
  label: string;
  options: MappingValueOption[];
}

export type TargetMappingOption = MappingValueOption | MappingOptionGroup;

type OperationOption = { label: string; value: string; children?: Array<{ label: string; value: string }> };

export const normalizeTargetMappings = (source: {
  id?: string;
  targetMappings?: TargetMapping[];
  targetValue?: string;
  operation?: string | string[];
}): TargetMapping[] => {
  if (source.targetMappings) return source.targetMappings;
  if (!source.targetValue) return [];
  return [{
    id: `legacy_${source.id ?? source.targetValue}`,
    targetValue: source.targetValue,
    operation: Array.isArray(source.operation) ? source.operation : source.operation ? [source.operation] : undefined,
  }];
};

export const targetOptionType = (options: TargetMappingOption[], selected?: string): string => {
  for (const option of options) {
    if ('options' in option) {
      const match = option.options.find((item) => item.value === selected);
      if (match) return match.type ?? 'String';
    } else if (option.value === selected) return option.type ?? 'String';
  }
  return '—';
};

export const collectFieldTargetMappings = (fields: unknown): TargetMapping[] => {
  if (!Array.isArray(fields)) return [];
  return fields.flatMap((field) => {
    if (!field || typeof field !== 'object') return [];
    const record = field as { id?: string; targetMappings?: TargetMapping[]; targetValue?: string; operation?: string | string[]; children?: unknown };
    return [...normalizeTargetMappings(record), ...collectFieldTargetMappings(record.children)];
  });
};

export const validateTargetMappings = (mappings: TargetMapping[]): string | undefined => {
  if (mappings.some((mapping) => !mapping.targetValue)) return 'Complete or remove every Target Mapping before saving.';
  const targets = mappings.map((mapping) => mapping.targetValue as string);
  const duplicate = targets.find((target, index) => targets.indexOf(target) !== index);
  return duplicate ? `${duplicate} can only be mapped from one external field in this component.` : undefined;
};

export const createTargetMapping = (): TargetMapping => ({
  id: `target_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
});

const targetMappingColumns = 'minmax(125px, .8fr) 18px minmax(170px, 1fr) 62px 60px';

export function TargetMappingColumnHeaders() {
  return <div style={{ display: 'grid', gridTemplateColumns: targetMappingColumns, gap: 6, alignItems: 'center', paddingLeft: 11 }}>
    <span>OPERATION TYPE</span>
    <span />
    <span>TARGET FIELD</span>
    <span>FIELD TYPE</span>
    <span />
  </div>;
}

export default function TargetMappingList({
  value,
  onChange,
  targetOptions,
  operationOptions,
  targetPlaceholder,
  reservedTargetValues = [],
  onRemoveLast,
}: {
  value: TargetMapping[];
  onChange: (value: TargetMapping[]) => void;
  targetOptions: TargetMappingOption[];
  operationOptions: OperationOption[];
  targetPlaceholder: string;
  reservedTargetValues?: string[];
  onRemoveLast?: () => void;
}) {
  const update = (id: string, updates: Partial<TargetMapping>) => onChange(value.map((mapping) => mapping.id === id ? { ...mapping, ...updates } : mapping));
  const addAfter = (id: string) => {
    const index = value.findIndex((mapping) => mapping.id === id);
    const next = [...value];
    next.splice(index + 1, 0, createTargetMapping());
    onChange(next);
  };
  const remove = (id: string) => {
    if (value.length === 1 && onRemoveLast) {
      onRemoveLast();
      return;
    }
    onChange(value.filter((mapping) => mapping.id !== id));
  };
  const unavailableFor = (mapping: TargetMapping) => new Set([
    ...reservedTargetValues,
    ...value.filter((item) => item.id !== mapping.id).map((item) => item.targetValue).filter((item): item is string => Boolean(item)),
  ]);
  const optionsFor = (mapping: TargetMapping): TargetMappingOption[] => {
    const unavailable = unavailableFor(mapping);
    return targetOptions.map((option) => 'options' in option
      ? { ...option, options: option.options.map((item) => ({ ...item, disabled: item.value !== mapping.targetValue && unavailable.has(item.value) })) }
      : { ...option, disabled: option.value !== mapping.targetValue && unavailable.has(option.value) });
  };

  return <div style={{ borderLeft: '2px solid #d9e2f2', paddingLeft: 9, minWidth: 0 }}>
    {value.length === 0 && <div style={{ display: 'flex', justifyContent: 'flex-end', minHeight: 32, alignItems: 'center' }}>
      <Tooltip title="Add mapping"><Button type="text" size="small" aria-label="Add mapping" icon={<PlusOutlined />} onClick={() => onChange([createTargetMapping()])} /></Tooltip>
    </div>}
    {value.map((mapping) => <div
      key={mapping.id}
      style={{ display: 'grid', gridTemplateColumns: targetMappingColumns, gap: 6, alignItems: 'center', padding: '4px 0', borderTop: '1px solid #f2f3f5' }}
    >
      <Cascader allowClear value={mapping.operation} placeholder="Operation (optional)" options={operationOptions} expandTrigger="click" onChange={(operation) => update(mapping.id, { operation: operation as string[] })} />
      <ArrowRightOutlined style={{ color: '#8c8c8c' }} />
      <Select status={!mapping.targetValue ? 'error' : undefined} value={mapping.targetValue} placeholder={targetPlaceholder} options={optionsFor(mapping)} onChange={(targetValue) => update(mapping.id, { targetValue })} />
      <Text style={{ fontSize: 11 }}>{targetOptionType(targetOptions, mapping.targetValue)}</Text>
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <Tooltip title="Add mapping"><Button type="text" size="small" aria-label="Add mapping" icon={<PlusOutlined />} onClick={() => addAfter(mapping.id)} /></Tooltip>
        <Tooltip title="Remove mapping"><Button type="text" size="small" aria-label="Remove target mapping" danger icon={<DeleteOutlined />} onClick={() => remove(mapping.id)} /></Tooltip>
      </div>
    </div>)}
  </div>;
}

import { useState } from 'react';
import { ArrowRightOutlined, DeleteOutlined, HolderOutlined, PlusOutlined } from '@ant-design/icons';
import { Button, Cascader, Input, Select, Space, Switch, Tag, Tooltip, Typography } from 'antd';

const { Text } = Typography;

export interface FlatMappingField {
  id?: string;
  sourceValue?: string | string[];
  operation?: string | string[];
  name?: string;
  type?: string;
  required?: boolean;
  description?: string;
  targetValue?: string;
}

interface ValueOption {
  label: string;
  value: string;
  type?: string;
}

interface OptionGroup {
  label: string;
  options: ValueOption[];
}

type MappingOption = ValueOption | OptionGroup;

interface Props {
  value?: FlatMappingField[];
  onChange?: (value: FlatMappingField[]) => void;
  title: string;
  addLabel: string;
  fieldPlaceholder: string;
  sourceOptions: MappingOption[];
  dataTypeOptions: Array<{ label: string; value: string }>;
  operationOptions: Array<{ label: string; value: string; children?: Array<{ label: string; value: string }> }>;
  direction?: 'request' | 'response';
  targetOptions?: MappingOption[];
  sourcePlaceholder?: string;
  targetPlaceholder?: string;
  sourceCascader?: boolean;
}

const requestColumns = 'minmax(155px, .9fr) 80px 20px 115px 20px minmax(200px, 1.1fr) 90px 56px minmax(120px, .75fr) 36px';
const responseColumns = 'minmax(200px, 1.1fr) 90px 56px minmax(120px, .75fr) 20px 115px 20px minmax(135px, .8fr) 80px 36px';

const createField = (): FlatMappingField => ({
  id: `mapping_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
  type: 'String',
  required: false,
  description: '',
});

const optionType = (options: MappingOption[], selected?: string | string[]): string => {
  const selectedValue = Array.isArray(selected) ? selected[selected.length - 1] : selected;
  for (const option of options) {
    if ('options' in option) {
      const match = option.options.find((item) => item.value === selectedValue);
      if (match) return match.type ?? 'String';
    } else if (option.value === selectedValue) return option.type ?? 'String';
  }
  return 'String';
};

export default function FlatFieldMappingEditor({
  value = [],
  onChange,
  title,
  addLabel,
  fieldPlaceholder,
  sourceOptions,
  dataTypeOptions,
  operationOptions,
  direction = 'request',
  targetOptions = [],
  sourcePlaceholder = 'Credential or generated data',
  targetPlaceholder = 'Token or Expiry',
  sourceCascader = false,
}: Props) {
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const emit = (next: FlatMappingField[]) => onChange?.(next);
  const update = (index: number, updates: Partial<FlatMappingField>) =>
    emit(value.map((item, itemIndex) => itemIndex === index ? { ...item, ...updates } : item));
  const remove = (index: number) => emit(value.filter((_, itemIndex) => itemIndex !== index));
  const move = (from: number, to: number) => {
    if (from === to) return;
    const next = [...value];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    emit(next);
  };
  const columns = direction === 'request' ? requestColumns : responseColumns;
  const cascaderSourceOptions = sourceOptions.map((option) => 'options' in option
    ? { label: option.label, value: option.label, children: option.options }
    : option);

  return (
    <div style={{ border: '1px solid #e8e8e8', borderRadius: 8, overflow: 'hidden', background: '#fff' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', background: '#fafafa', borderBottom: '1px solid #e8e8e8' }}>
        <Space size={8}><Text strong>{title}</Text><Tag style={{ margin: 0 }}>{value.length} fields</Tag></Space>
        <Button size="small" type="primary" ghost icon={<PlusOutlined />} onClick={() => emit([...value, createField()])}>{addLabel}</Button>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <div style={{ minWidth: 960 }}>
          <div style={{ display: 'grid', gridTemplateColumns: columns, gap: 8, padding: '7px 8px', color: '#8c8c8c', fontSize: 11, background: '#fcfcfc', borderBottom: '1px solid #f0f0f0' }}>
            {direction === 'request' ? <>
              <span>SOURCE VALUE</span><span>SOURCE TYPE</span><span /><span>OPERATION</span><span /><span>FIELD</span><span>TYPE</span><span style={{ textAlign: 'center' }}>REQUIRED</span><span>DESCRIPTION</span><span />
            </> : <>
              <span>FIELD</span><span>TYPE</span><span style={{ textAlign: 'center' }}>REQUIRED</span><span>DESCRIPTION</span><span /><span>OPERATION</span><span /><span>TARGET VALUE</span><span>TARGET TYPE</span><span />
            </>}
          </div>
          <div style={{ maxHeight: 480, overflowY: 'auto' }}>
            {value.map((item, index) => (
              <div
                key={item.id ?? index}
                draggable
                onDragStart={() => setDragIndex(index)}
                onDragEnd={() => setDragIndex(null)}
                onDragOver={(event) => { if (dragIndex !== null) event.preventDefault(); }}
                onDrop={(event) => { event.preventDefault(); if (dragIndex !== null) move(dragIndex, index); setDragIndex(null); }}
                style={{ display: 'grid', gridTemplateColumns: columns, gap: 8, alignItems: 'center', minHeight: 43, padding: '5px 8px', borderBottom: '1px solid #f0f0f0', background: dragIndex === index ? '#e6f4ff' : '#fff' }}
              >
                {direction === 'request' ? <>
                  {sourceCascader
                    ? <Cascader value={item.sourceValue as string[] | undefined} placeholder={sourcePlaceholder} options={cascaderSourceOptions} expandTrigger="click" showSearch onChange={(sourceValue) => update(index, { sourceValue: sourceValue as string[] })} />
                    : <Select value={item.sourceValue as string | undefined} placeholder={sourcePlaceholder} options={sourceOptions} onChange={(sourceValue) => update(index, { sourceValue })} />}
                  <Text style={{ fontSize: 12 }}>{optionType(sourceOptions, item.sourceValue)}</Text>
                  <ArrowRightOutlined style={{ color: '#8c8c8c' }} />
                  <Cascader allowClear value={item.operation as string[] | undefined} placeholder="Select operation (optional)" options={operationOptions} expandTrigger="click" onChange={(operation) => update(index, { operation: operation as string[] })} />
                  <ArrowRightOutlined style={{ color: '#8c8c8c' }} />
                </> : null}
                <div style={{ display: 'flex', alignItems: 'center', minWidth: 0 }}>
                  <Tooltip title="Drag to reorder"><HolderOutlined style={{ color: '#bfbfbf', cursor: 'grab', marginRight: 6 }} /></Tooltip>
                  <Input value={item.name} placeholder={fieldPlaceholder} status={!item.name ? 'error' : undefined} onChange={(event) => update(index, { name: event.target.value })} />
                </div>
                <Select value={item.type ?? 'String'} options={dataTypeOptions} onChange={(type) => update(index, { type })} />
                <div style={{ textAlign: 'center' }}><Switch size="small" checked={!!item.required} onChange={(required) => update(index, { required })} /></div>
                <Input value={item.description} placeholder="Optional" onChange={(event) => update(index, { description: event.target.value })} />
                {direction === 'response' ? <>
                  <ArrowRightOutlined style={{ color: '#8c8c8c' }} />
                  <Cascader allowClear value={item.operation as string[] | undefined} placeholder="Select operation (optional)" options={operationOptions} expandTrigger="click" onChange={(operation) => update(index, { operation: operation as string[] })} />
                  <ArrowRightOutlined style={{ color: '#8c8c8c' }} />
                  <Select value={item.targetValue} placeholder={targetPlaceholder} options={targetOptions} onChange={(targetValue) => update(index, { targetValue })} />
                  <Text style={{ fontSize: 12 }}>{optionType(targetOptions, item.targetValue)}</Text>
                </> : null}
                <Tooltip title="Delete field"><Button type="text" size="small" danger icon={<DeleteOutlined />} onClick={() => remove(index)} /></Tooltip>
              </div>
            ))}
            {value.length === 0 && <div style={{ color: '#8c8c8c', padding: '22px 36px' }}>No fields defined. <Button type="link" size="small" onClick={() => emit([createField()])}>{addLabel}</Button></div>}
          </div>
        </div>
      </div>
    </div>
  );
}

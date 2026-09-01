import { useState } from 'react';
import { ArrowRightOutlined, DeleteOutlined, HolderOutlined, PlusOutlined } from '@ant-design/icons';
import { Button, Cascader, Form, Input, Modal, Select, Space, Switch, Tag, Tooltip, Typography } from 'antd';
import TargetMappingList, { createTargetMapping, normalizeTargetMappings, TargetMappingColumnHeaders } from './TargetMappingList';
import type { TargetMapping } from './TargetMappingList';
import MappingOperationSelector, { type DecimalScaleConfig, type MappingOperationOption } from './MappingOperationSelector';

const { Text } = Typography;

export interface FlatMappingField {
  id?: string;
  sourceValue?: string | string[];
  operation?: string | string[];
  operationConfig?: DecimalScaleConfig;
  name?: string;
  type?: string;
  required?: boolean;
  description?: string;
  targetValue?: string;
  targetMappings?: TargetMapping[];
  generatedDataConfig?: { mode: 'default' | 'customPrefix'; prefix?: string };
}

interface ValueOption {
  label: string;
  value: string;
  type?: string;
  children?: ValueOption[];
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
  operationOptions: MappingOperationOption[];
  direction?: 'request' | 'response';
  targetOptions?: MappingOption[];
  sourcePlaceholder?: string;
  targetPlaceholder?: string;
  sourceCascader?: boolean;
  fixedFieldType?: string;
  schemaOnly?: boolean;
}

const requestColumns = 'minmax(155px, .9fr) 80px 20px 115px 20px minmax(200px, 1.1fr) 90px 56px minmax(120px, .75fr) 36px';
const responseColumns = 'minmax(200px, 1.1fr) 90px 56px minmax(140px, .8fr) minmax(460px, 2.2fr)';

const createField = (withTargetMapping = false): FlatMappingField => ({
  id: `mapping_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
  type: 'String',
  required: false,
  description: '',
  targetMappings: withTargetMapping ? [createTargetMapping()] : undefined,
});

const optionType = (options: MappingOption[], selected?: string | string[]): string => {
  const selectedValue = Array.isArray(selected) ? selected[selected.length - 1] : selected;
  const findType = (items: ValueOption[]): string | undefined => {
    for (const item of items) {
      if (item.value === selectedValue) return item.type ?? 'String';
      const nested = item.children ? findType(item.children) : undefined;
      if (nested) return nested;
    }
    return undefined;
  };
  for (const option of options) {
    if ('options' in option) {
      const type = findType(option.options);
      if (type) return type;
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
  fixedFieldType,
  schemaOnly = false,
}: Props) {
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [referenceConfigIndex, setReferenceConfigIndex] = useState<number | null>(null);
  const [referenceForm] = Form.useForm<{ mode: 'default' | 'customPrefix'; prefix?: string }>();
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
  const schemaColumns = 'minmax(240px, 1.4fr) 90px 56px minmax(180px, 1fr) 36px';
  const columns = schemaOnly ? schemaColumns : direction === 'request' ? requestColumns : responseColumns;
  const cascaderSourceOptions = sourceOptions.map((option) => 'options' in option
    ? { label: option.label, value: option.label, children: option.options }
    : option);
  const selectSource = (index: number, sourceValue: string[]) => {
    update(index, { sourceValue });
    if (sourceValue[sourceValue.length - 1] === 'generated.reference-number') {
      referenceForm.setFieldsValue(value[index].generatedDataConfig ?? { mode: 'default', prefix: '' });
      setReferenceConfigIndex(index);
    }
  };

  return (
    <div style={{ border: '1px solid #e8e8e8', borderRadius: 8, overflow: 'hidden', background: '#fff' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', background: '#fafafa', borderBottom: '1px solid #e8e8e8' }}>
        <Space size={8}><Text strong>{title}</Text><Tag style={{ margin: 0 }}>{value.length} fields</Tag></Space>
        <Button size="small" type="primary" ghost icon={<PlusOutlined />} onClick={() => emit([...value, createField(direction === 'response' && !schemaOnly)])}>{addLabel}</Button>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <div style={{ minWidth: 960 }}>
          <div style={{ display: 'grid', gridTemplateColumns: columns, gap: 8, padding: '7px 8px', color: '#8c8c8c', fontSize: 11, background: '#fcfcfc', borderBottom: '1px solid #f0f0f0' }}>
            {schemaOnly ? <>
              <span>FIELD</span><span>TYPE</span><span style={{ textAlign: 'center' }}>REQUIRED</span><span>DESCRIPTION</span><span />
            </> : direction === 'request' ? <>
              <span>SOURCE VALUE</span><span>SOURCE TYPE</span><span /><span>OPERATION</span><span /><span>FIELD</span><span>TYPE</span><span style={{ textAlign: 'center' }}>REQUIRED</span><span>DESCRIPTION</span><span />
            </> : <>
              <span>FIELD</span><span>TYPE</span><span style={{ textAlign: 'center' }}>REQUIRED</span><span>DESCRIPTION</span><TargetMappingColumnHeaders />
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
                {!schemaOnly && direction === 'request' ? <>
                  {sourceCascader
                    ? <Cascader value={item.sourceValue as string[] | undefined} placeholder={sourcePlaceholder} options={cascaderSourceOptions} expandTrigger="click" showSearch onChange={(sourceValue) => selectSource(index, sourceValue as string[])} />
                    : <Select value={item.sourceValue as string | undefined} placeholder={sourcePlaceholder} options={sourceOptions} onChange={(sourceValue) => update(index, { sourceValue })} />}
                  <Text style={{ fontSize: 12 }}>{optionType(sourceOptions, item.sourceValue)}</Text>
                  <ArrowRightOutlined style={{ color: '#8c8c8c' }} />
                  <MappingOperationSelector value={item.operation as string[] | undefined} config={item.operationConfig} options={operationOptions} onChange={(operation, operationConfig) => update(index, { operation, operationConfig })} />
                  <ArrowRightOutlined style={{ color: '#8c8c8c' }} />
                </> : null}
                <div style={{ display: 'flex', alignItems: 'center', minWidth: 0 }}>
                  <Tooltip title="Drag to reorder"><HolderOutlined style={{ color: '#bfbfbf', cursor: 'grab', marginRight: 6 }} /></Tooltip>
                  <Input value={item.name} placeholder={fieldPlaceholder} status={!item.name ? 'error' : undefined} onChange={(event) => update(index, { name: event.target.value })} />
                </div>
                {fixedFieldType ? <Text>{fixedFieldType}</Text> : <Select value={item.type} placeholder="Type" options={dataTypeOptions} onChange={(type) => update(index, { type })} />}
                <div style={{ textAlign: 'center' }}><Switch size="small" checked={!!item.required} onChange={(required) => update(index, { required })} /></div>
                <Input value={item.description} placeholder="Optional" onChange={(event) => update(index, { description: event.target.value })} />
                {!schemaOnly && direction === 'response' ? <>
                  <TargetMappingList
                    value={normalizeTargetMappings(item)}
                    targetOptions={targetOptions}
                    operationOptions={operationOptions}
                    targetPlaceholder={targetPlaceholder}
                    reservedTargetValues={value.flatMap((other, otherIndex) => otherIndex === index ? [] : normalizeTargetMappings(other).map((mapping) => mapping.targetValue).filter((target): target is string => Boolean(target)))}
                    onChange={(targetMappings) => update(index, { targetMappings, operation: undefined, targetValue: undefined })}
                    onRemoveLast={() => remove(index)}
                  />
                </> : null}
                {(schemaOnly || direction !== 'response') && <Tooltip title="Delete field"><Button type="text" size="small" danger aria-label={`Delete field ${item.name || index + 1}`} icon={<DeleteOutlined />} onClick={() => remove(index)} /></Tooltip>}
              </div>
            ))}
            {value.length === 0 && <div style={{ color: '#8c8c8c', padding: '22px 36px' }}>No fields defined. <Button type="link" size="small" onClick={() => emit([createField(direction === 'response' && !schemaOnly)])}>{addLabel}</Button></div>}
          </div>
        </div>
      </div>
      <Modal
        title="Generate Reference Number"
        open={referenceConfigIndex !== null}
        onCancel={() => setReferenceConfigIndex(null)}
        onOk={() => referenceForm.validateFields().then((config) => {
          if (referenceConfigIndex !== null) update(referenceConfigIndex, { generatedDataConfig: config });
          setReferenceConfigIndex(null);
        })}
      >
        <Form form={referenceForm} layout="vertical" initialValues={{ mode: 'default' }}>
          <Form.Item name="mode" label="Generation Mode" rules={[{ required: true }]}>
            <Select options={[{ label: 'Default', value: 'default' }, { label: 'Custom Prefix', value: 'customPrefix' }]} />
          </Form.Item>
          <Form.Item noStyle shouldUpdate={(previous, current) => previous.mode !== current.mode}>
            {({ getFieldValue }) => getFieldValue('mode') === 'customPrefix' && (
              <Form.Item name="prefix" label="Prefix" rules={[{ required: true, whitespace: true, message: 'Enter a prefix' }]}>
                <Input placeholder="Enter a custom reference prefix" />
              </Form.Item>
            )}
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

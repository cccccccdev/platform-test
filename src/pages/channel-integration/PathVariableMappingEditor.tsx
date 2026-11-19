import { useMemo, useState } from 'react';
import { Cascader, Form, Input, Modal, Select, Typography } from 'antd';
import { ArrowRightOutlined } from '@ant-design/icons';
import MappingOperationSelector, { type MappingOperationConfig, type MappingOperationOption } from './MappingOperationSelector';
import type { ConditionalAssignmentConfig, ConditionalAssignmentField } from './conditionalAssignmentModel';
import { operationResultType } from './operationResultType';

const { Text } = Typography;

export interface PathSourceOption {
  label: string;
  value: string;
  children?: Array<{ label: string; value: string; type?: string; children?: PathSourceOption['children'] }>;
}

interface Props {
  variables: string[];
  mappingName: string;
  sourceOptions: PathSourceOption[];
  operationOptions: MappingOperationOption[];
  emptyText: string;
  readOnly?: boolean;
}

/** 把 PathSourceOption 拍平成条件赋值弹窗的候选字段列表（叶子 value 为完整点分路径）。 */
const flattenConditionalFields = (options: PathSourceOption[]): ConditionalAssignmentField[] => {
  const result: ConditionalAssignmentField[] = [];
  const walk = (items: PathSourceOption['children']) => {
    if (!items) return;
    for (const item of items) {
      if (item.children && item.children.length) {
        walk(item.children);
      } else {
        const path = item.value.split('.');
        result.push({ id: item.value, path, name: path[path.length - 1], type: item.type ?? 'String' });
      }
    }
  };
  for (const group of options) {
    if (group.children) walk(group.children);
  }
  return result;
};

const selectedType = (options: PathSourceOption[], value?: string[]): string => {
  const selected = value?.[value.length - 1];
  const findType = (items: PathSourceOption['children']): string | undefined => {
    if (!items) return undefined;
    for (const item of items) {
      if (item.value === selected) return item.type ?? 'String';
      const nested = item.children ? findType(item.children) : undefined;
      if (nested) return nested;
    }
    return undefined;
  };
  for (const group of options) {
    const type = findType(group.children);
    if (type) return type;
  }
  return 'String';
};

const columns = 'minmax(210px,1fr) 90px 24px 150px 64px 24px minmax(190px,.9fr) 90px';

export default function PathVariableMappingEditor({ variables, mappingName, sourceOptions, operationOptions, emptyText, readOnly = false }: Props) {
  const form = Form.useFormInstance();
  const [referenceVariable, setReferenceVariable] = useState<string | null>(null);
  const [referenceMode, setReferenceMode] = useState<'default' | 'customPrefix'>('default');
  const [referencePrefix, setReferencePrefix] = useState('');
  const conditionalFields = useMemo(() => flattenConditionalFields(sourceOptions), [sourceOptions]);
  if (variables.length === 0) return <div style={{ padding: '14px 16px', color: '#8c8c8c', background: '#fafafa', borderRadius: 6 }}>{emptyText}</div>;
  return (
    <div style={{ border: '1px solid #e8e8e8', borderRadius: 8, overflow: 'hidden' }}>
      <div style={{ display: 'grid', gridTemplateColumns: columns, gap: 8, padding: '7px 10px', color: '#8c8c8c', fontSize: 11, background: '#fafafa', borderBottom: '1px solid #f0f0f0' }}>
        <span>SOURCE VALUE</span><span>SOURCE TYPE</span><span /><span>OPERATION</span><span>TYPE</span><span /><span>PATH VARIABLE</span><span>TARGET TYPE</span>
      </div>
      {variables.map((variable) => (
        <Form.Item key={variable} noStyle shouldUpdate>
          {({ getFieldValue }) => {
            const source = getFieldValue([mappingName, variable, 'source']) as string[] | undefined;
            const operation = getFieldValue([mappingName, variable, 'operation']) as string[] | undefined;
            const operationConfig = getFieldValue([mappingName, variable, 'operationConfig']) as MappingOperationConfig | undefined;
            const conditionalConfig = getFieldValue([mappingName, variable, 'conditionalConfig']) as ConditionalAssignmentConfig | undefined;
            return (
              <div style={{ display: 'grid', gridTemplateColumns: columns, gap: 8, alignItems: 'center', padding: '6px 10px', borderBottom: '1px solid #f5f5f5' }}>
                {/* 本行赋值选中条件赋值后，左侧来源控件没有可填内容，整段让位给一行提示文字。 */}
                {operation?.[0] === 'conditional-assignment'
                  ? <div style={{ gridColumn: '1 / 4', color: '#8c8c8c', fontSize: 12 }}>Please config the conditional assignment.</div>
                  : <>
                    <Form.Item name={[mappingName, variable, 'source']} rules={[{ validator: (_, valueSource: string[] | undefined) => {
                      return valueSource && valueSource.length ? Promise.resolve() : Promise.reject(new Error('Select value source'));
                    } }]} style={{ margin: 0 }}>
                      <Cascader placeholder="Select source value" options={sourceOptions} expandTrigger="click" showSearch onChange={(next) => {
                        if ((next as string[]).at(-1) === 'generated.reference-number') {
                          const existing = form.getFieldValue([mappingName, variable, 'generatedDataConfig']);
                          setReferenceMode(existing?.mode ?? 'default');
                          setReferencePrefix(existing?.prefix ?? '');
                          setReferenceVariable(variable);
                        }
                      }} />
                    </Form.Item>
                    <Text>{selectedType(sourceOptions, source)}</Text>
                    <ArrowRightOutlined style={{ color: '#8c8c8c' }} />
                  </>}
                <MappingOperationSelector
                  value={operation}
                  config={operationConfig}
                  placeholder="Optional"
                  options={operationOptions}
                  fieldOptions={sourceOptions}
                  readOnly={readOnly}
                  conditionalConfig={conditionalConfig}
                  conditionalFields={conditionalFields}
                  conditionalTargetLabel={variable}
                  conditionalTargetType="String"
                  onConditionalConfig={(nextConfig) => form.setFieldValue([mappingName, variable, 'conditionalConfig'], nextConfig)}
                  onChange={(nextOperation, nextConfig) => {
                    form.setFieldValue([mappingName, variable, 'operation'], nextOperation);
                    form.setFieldValue([mappingName, variable, 'operationConfig'], nextConfig);
                  }}
                />
                <Text style={{ fontSize: 12 }}>{operationResultType(operation) ?? ''}</Text>
                <ArrowRightOutlined style={{ color: '#8c8c8c' }} />
                <Input value={`{${variable}}`} disabled />
                <Text>String</Text>
              </div>
            );
          }}
        </Form.Item>
      ))}
      <Modal title="Generate Reference Number" open={referenceVariable !== null} okButtonProps={{ disabled: referenceMode === 'customPrefix' && !referencePrefix.trim() }} onCancel={() => setReferenceVariable(null)} onOk={() => {
        if (referenceVariable) form.setFieldValue([mappingName, referenceVariable, 'generatedDataConfig'], { mode: referenceMode, prefix: referenceMode === 'customPrefix' ? referencePrefix.trim() : undefined });
        setReferenceVariable(null);
      }}>
        <div style={{ marginBottom: 16 }}><Text strong>Generation Mode</Text></div>
        <Select style={{ width: '100%' }} value={referenceMode} onChange={setReferenceMode} options={[{ label: 'Default', value: 'default' }, { label: 'Custom Prefix', value: 'customPrefix' }]} />
        {referenceMode === 'customPrefix' && <div style={{ marginTop: 16 }}><Text strong>Prefix</Text><Input value={referencePrefix} onChange={(event) => setReferencePrefix(event.target.value)} placeholder="Enter a custom reference prefix" style={{ marginTop: 8 }} /></div>}
      </Modal>
    </div>
  );
}

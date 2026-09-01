import { useState } from 'react';
import { Cascader, Form, Input, Modal, Select, Typography } from 'antd';
import { ArrowRightOutlined } from '@ant-design/icons';
import MappingOperationSelector, { type DecimalScaleConfig, type MappingOperationOption } from './MappingOperationSelector';

const { Text } = Typography;

export interface PathSourceOption {
  label: string;
  value: string;
  children: Array<{ label: string; value: string; type?: string; children?: PathSourceOption['children'] }>;
}

interface Props {
  variables: string[];
  mappingName: string;
  sourceOptions: PathSourceOption[];
  operationOptions: MappingOperationOption[];
  emptyText: string;
}

const selectedType = (options: PathSourceOption[], value?: string[]): string => {
  const selected = value?.[value.length - 1];
  const findType = (items: PathSourceOption['children']): string | undefined => {
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

const columns = 'minmax(210px,1fr) 90px 24px 150px 24px minmax(190px,.9fr) 90px';

export default function PathVariableMappingEditor({ variables, mappingName, sourceOptions, operationOptions, emptyText }: Props) {
  const form = Form.useFormInstance();
  const [referenceVariable, setReferenceVariable] = useState<string | null>(null);
  const [referenceMode, setReferenceMode] = useState<'default' | 'customPrefix'>('default');
  const [referencePrefix, setReferencePrefix] = useState('');
  if (variables.length === 0) return <div style={{ padding: '14px 16px', color: '#8c8c8c', background: '#fafafa', borderRadius: 6 }}>{emptyText}</div>;
  return (
    <div style={{ border: '1px solid #e8e8e8', borderRadius: 8, overflow: 'hidden' }}>
      <div style={{ display: 'grid', gridTemplateColumns: columns, gap: 8, padding: '7px 10px', color: '#8c8c8c', fontSize: 11, background: '#fafafa', borderBottom: '1px solid #f0f0f0' }}>
        <span>SOURCE VALUE</span><span>SOURCE TYPE</span><span /><span>OPERATION</span><span /><span>PATH VARIABLE</span><span>TARGET TYPE</span>
      </div>
      {variables.map((variable) => (
        <Form.Item key={variable} noStyle shouldUpdate>
          {({ getFieldValue }) => {
            const source = getFieldValue([mappingName, variable, 'source']) as string[] | undefined;
            const operation = getFieldValue([mappingName, variable, 'operation']) as string[] | undefined;
            const operationConfig = getFieldValue([mappingName, variable, 'operationConfig']) as DecimalScaleConfig | undefined;
            return (
              <div style={{ display: 'grid', gridTemplateColumns: columns, gap: 8, alignItems: 'center', padding: '6px 10px', borderBottom: '1px solid #f5f5f5' }}>
                <Form.Item name={[mappingName, variable, 'source']} rules={[{ required: true, message: 'Select value source' }]} style={{ margin: 0 }}>
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
                <MappingOperationSelector value={operation} config={operationConfig} placeholder="Optional" options={operationOptions} onChange={(nextOperation, nextConfig) => {
                  form.setFieldValue([mappingName, variable, 'operation'], nextOperation);
                  form.setFieldValue([mappingName, variable, 'operationConfig'], nextConfig);
                }} />
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

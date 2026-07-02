import { Cascader, Form, Input, Typography } from 'antd';
import { ArrowRightOutlined } from '@ant-design/icons';

const { Text } = Typography;

export interface PathSourceOption {
  label: string;
  value: string;
  children: Array<{ label: string; value: string; type?: string }>;
}

interface Props {
  variables: string[];
  mappingName: string;
  sourceOptions: PathSourceOption[];
  operationOptions: Array<{ label: string; value: string; children?: Array<{ label: string; value: string }> }>;
  emptyText: string;
}

const selectedType = (options: PathSourceOption[], value?: string[]): string => {
  const selected = value?.[value.length - 1];
  for (const group of options) {
    const match = group.children.find((item) => item.value === selected);
    if (match) return match.type ?? 'String';
  }
  return 'String';
};

const columns = 'minmax(210px,1fr) 90px 24px 150px 24px minmax(190px,.9fr) 90px';

export default function PathVariableMappingEditor({ variables, mappingName, sourceOptions, operationOptions, emptyText }: Props) {
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
            return (
              <div style={{ display: 'grid', gridTemplateColumns: columns, gap: 8, alignItems: 'center', padding: '6px 10px', borderBottom: '1px solid #f5f5f5' }}>
                <Form.Item name={[mappingName, variable, 'source']} rules={[{ required: true, message: 'Select value source' }]} style={{ margin: 0 }}>
                  <Cascader placeholder="Select source value" options={sourceOptions} expandTrigger="click" showSearch />
                </Form.Item>
                <Text>{selectedType(sourceOptions, source)}</Text>
                <ArrowRightOutlined style={{ color: '#8c8c8c' }} />
                <Form.Item name={[mappingName, variable, 'operation']} style={{ margin: 0 }}>
                  <Cascader allowClear placeholder="Optional" options={operationOptions} expandTrigger="click" />
                </Form.Item>
                <ArrowRightOutlined style={{ color: '#8c8c8c' }} />
                <Input value={`{${variable}}`} disabled />
                <Text>String</Text>
              </div>
            );
          }}
        </Form.Item>
      ))}
    </div>
  );
}

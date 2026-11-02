import { MinusCircleOutlined, PlusCircleOutlined } from '@ant-design/icons';
import { Button, Select, Tag, Typography } from 'antd';

const { Text } = Typography;

type AssemblyOption = { label: string; value: string };
type OrderRolePrefix = 'MAIN_ORDER' | 'SUB_ORDER';

interface Props {
  value?: string[];
  onChange?: (value: string[]) => void;
  options: AssemblyOption[];
  prefix?: OrderRolePrefix;
  placeholder?: string;
}

export default function ResponseCodeAssemblyEditor({ value = [], onChange, options, prefix, placeholder = 'Select response field' }: Props) {
  const fields = value.length > 0 ? value : [''];
  const unavailable = options.length === 0;

  const updateField = (index: number, nextValue?: string) => {
    const nextFields = [...fields];
    nextFields[index] = nextValue ?? '';
    onChange?.(nextFields);
  };

  const addField = () => onChange?.([...fields, '']);
  const removeField = () => onChange?.(fields.slice(0, -1));

  return (
    <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 10, width: '100%' }}>
      {prefix && (
        <>
          <Tag color={prefix === 'MAIN_ORDER' ? 'blue' : 'green'} style={{ marginInlineEnd: 0, padding: '5px 9px', lineHeight: '20px' }}>{prefix}</Tag>
          <Text strong>#</Text>
        </>
      )}
      {fields.map((field, index) => (
        <div key={`${index}-${fields.length}`} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Select
            showSearch
            optionFilterProp="label"
            allowClear
            disabled={unavailable}
            value={field || undefined}
            options={options}
            placeholder={placeholder}
            onChange={(nextValue) => updateField(index, nextValue)}
            style={{ width: 250 }}
          />
          {index < fields.length - 1 && <Text strong>#</Text>}
        </div>
      ))}
      <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <Button type="text" shape="circle" icon={<PlusCircleOutlined />} aria-label="Add response code field" disabled={unavailable} onClick={addField} />
        <Button type="text" shape="circle" icon={<MinusCircleOutlined />} aria-label="Remove last response code field" disabled={unavailable || fields.length <= 1} onClick={removeField} />
      </div>
    </div>
  );
}

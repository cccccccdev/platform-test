import { useState } from 'react';
import { Table, Input, Select, Button, Radio } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import FieldPicker from './FieldPicker';

interface ConditionRow {
  key: string;
  field: string;
  operator: string;
  value: string;
}

interface ConditionGroupEditorProps {
  value?: {
    relation: 'AND' | 'OR';
    conditions: ConditionRow[];
  };
  onChange?: (value: ConditionGroupEditorProps['value']) => void;
  disabled?: boolean;
}

const OPERATORS = [
  { value: '=', label: '=' },
  { value: '!=', label: '≠' },
  { value: '>', label: '>' },
  { value: '>=', label: '≥' },
  { value: '<', label: '<' },
  { value: '<=', label: '≤' },
  { value: 'contains', label: '包含' },
  { value: 'notContains', label: '不包含' },
  { value: 'isEmpty', label: '为空' },
  { value: 'isNotEmpty', label: '不为空' },
];

export default function ConditionGroupEditor({
  value,
  onChange,
  disabled = false,
}: ConditionGroupEditorProps) {
  const [relation, setRelation] = useState<'AND' | 'OR'>(value?.relation || 'AND');
  const [conditions, setConditions] = useState<ConditionRow[]>(value?.conditions || []);

  const handleRelationChange = (newRelation: 'AND' | 'OR') => {
    setRelation(newRelation);
    onChange?.({ relation: newRelation, conditions });
  };

  const handleConditionChange = (key: string, field: string, val: string) => {
    const newConditions = conditions.map(c => c.key === key ? { ...c, [field]: val } : c);
    setConditions(newConditions);
    onChange?.({ relation, conditions: newConditions });
  };

  const addCondition = () => {
    const newCondition: ConditionRow = {
      key: `cond_${Date.now()}`,
      field: '',
      operator: '=',
      value: '',
    };
    const newConditions = [...conditions, newCondition];
    setConditions(newConditions);
    onChange?.({ relation, conditions: newConditions });
  };

  const removeCondition = (key: string) => {
    const newConditions = conditions.filter(c => c.key !== key);
    setConditions(newConditions);
    onChange?.({ relation, conditions: newConditions });
  };

  const columns = [
    {
      title: '字段',
      dataIndex: 'field',
      width: 180,
      render: (_: any, record: ConditionRow) => (
        <FieldPicker
          value={record.field}
          onChange={(val) => handleConditionChange(record.key, 'field', val)}
          disabled={disabled}
        />
      ),
    },
    {
      title: '运算符',
      dataIndex: 'operator',
      width: 100,
      render: (_: any, record: ConditionRow) => (
        <Select
          value={record.operator}
          onChange={(val) => handleConditionChange(record.key, 'operator', val)}
          disabled={disabled}
          options={OPERATORS}
          style={{ width: '100%' }}
        />
      ),
    },
    {
      title: '期望值',
      dataIndex: 'value',
      render: (_: any, record: ConditionRow) => {
        const selectedOp = OPERATORS.find(o => o.value === record.operator);
        const needsValue = selectedOp && !['isEmpty', 'isNotEmpty'].includes(selectedOp.value);
        return needsValue ? (
          <Input
            value={record.value}
            onChange={(e) => handleConditionChange(record.key, 'value', e.target.value)}
            placeholder="期望值"
            disabled={disabled}
          />
        ) : null;
      },
    },
    {
      title: '',
      width: 50,
      render: (_: any, record: ConditionRow) => (
        !disabled && (
          <Button type="text" danger size="small" icon={<DeleteOutlined />} onClick={() => removeCondition(record.key)} />
        )
      ),
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: 8 }}>
        <Radio.Group
          value={relation}
          onChange={(e) => handleRelationChange(e.target.value)}
          disabled={disabled}
        >
          <Radio value="AND">AND</Radio>
          <Radio value="OR">OR</Radio>
        </Radio.Group>
      </div>
      <Table
        dataSource={conditions}
        columns={columns}
        rowKey="key"
        size="small"
        pagination={false}
        footer={() => (
          !disabled && (
            <Button type="dashed" size="small" icon={<PlusOutlined />} onClick={addCondition}>
              新增条件
            </Button>
          )
        )}
      />
    </div>
  );
}

export type { ConditionRow };

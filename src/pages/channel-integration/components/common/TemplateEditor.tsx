import { useState, useEffect, useCallback } from 'react';
import { Input, Table, Button, Space, Select } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import FieldPicker from './FieldPicker';

interface MappingRow {
  key: string;
  variableName: string;
  sourceField: string;
  sourceType: 'field' | 'fixed';
  fixedValue?: string;
}

interface TemplateEditorProps {
  value?: {
    format: 'json' | 'xml' | 'form';
    template: string;
    mappings: MappingRow[];
  };
  onChange?: (value: TemplateEditorProps['value']) => void;
  disabled?: boolean;
  defaultFormat?: 'json' | 'xml' | 'form';
}

const VARIABLE_PATTERN = /\{\{([^}]+)\}\}/g;

function extractVariables(template: string): string[] {
  const matches = template.matchAll(VARIABLE_PATTERN);
  return [...matches].map(m => m[1]);
}

export default function TemplateEditor({
  value,
  onChange,
  disabled = false,
  defaultFormat = 'json',
}: TemplateEditorProps) {
  const [format, setFormat] = useState<'json' | 'xml' | 'form'>(value?.format || defaultFormat);
  const [template, setTemplate] = useState(value?.template || '');
  const [mappings, setMappings] = useState<MappingRow[]>(value?.mappings || []);

  useEffect(() => {
    if (value) {
      setFormat(value.format || defaultFormat);
      setTemplate(value.template || '');
      setMappings(value.mappings || []);
    }
  }, [value]);

  const syncMappings = useCallback((newTemplate: string) => {
    const vars = extractVariables(newTemplate);
    setMappings(prev => {
      const existingKeys = new Set(prev.map(m => m.variableName));
      const newRows = vars
        .filter(v => !existingKeys.has(v))
        .map(v => ({
          key: `auto_${v}_${Date.now()}`,
          variableName: v,
          sourceField: '',
          sourceType: 'field' as const,
        }));
      return [...prev.filter(m => vars.includes(m.variableName)), ...newRows];
    });
  }, []);

  useEffect(() => {
    if (template) {
      syncMappings(template);
    }
  }, [template, syncMappings]);

  const handleTemplateChange = (newTemplate: string) => {
    setTemplate(newTemplate);
    onChange?.({ format, template: newTemplate, mappings });
  };

  const handleFormatChange = (newFormat: 'json' | 'xml' | 'form') => {
    setFormat(newFormat);
    onChange?.({ format: newFormat, template, mappings });
  };

  const handleMappingChange = (key: string, field: string, val: string) => {
    setMappings(prev => prev.map(m => m.key === key ? { ...m, [field]: val } : m));
    const newMappings = mappings.map(m => m.key === key ? { ...m, [field]: val } : m);
    onChange?.({ format, template, mappings: newMappings });
  };

  const addMappingRow = () => {
    const newRow: MappingRow = {
      key: `manual_${Date.now()}`,
      variableName: '',
      sourceField: '',
      sourceType: 'field',
    };
    const newMappings = [...mappings, newRow];
    setMappings(newMappings);
    onChange?.({ format, template, mappings: newMappings });
  };

  const removeMapping = (key: string) => {
    const newMappings = mappings.filter(m => m.key !== key);
    setMappings(newMappings);
    onChange?.({ format, template, mappings: newMappings });
  };

  const columns = [
    {
      title: '变量名',
      dataIndex: 'variableName',
      width: 150,
      render: (_: any, record: MappingRow) => (
        <Input
          value={record.variableName}
          onChange={(e) => handleMappingChange(record.key, 'variableName', e.target.value)}
          placeholder="{{variableName}}"
          disabled={disabled}
          style={{ fontFamily: 'monospace' }}
        />
      ),
    },
    {
      title: '来源类型',
      dataIndex: 'sourceType',
      width: 100,
      render: (_: any, record: MappingRow) => (
        <Select
          value={record.sourceType}
          onChange={(val) => handleMappingChange(record.key, 'sourceType', val)}
          disabled={disabled}
          style={{ width: '100%' }}
        >
          <Select.Option value="field">Field Picker</Select.Option>
          <Select.Option value="fixed">固定值</Select.Option>
        </Select>
      ),
    },
    {
      title: '来源字段 / 固定值',
      dataIndex: 'sourceField',
      render: (_: any, record: MappingRow) => (
        record.sourceType === 'field' ? (
          <FieldPicker
            value={record.sourceField}
            onChange={(val) => handleMappingChange(record.key, 'sourceField', val)}
            disabled={disabled}
          />
        ) : (
          <Input
            value={record.fixedValue || ''}
            onChange={(e) => handleMappingChange(record.key, 'fixedValue', e.target.value)}
            placeholder="固定值"
            disabled={disabled}
          />
        )
      ),
    },
    {
      title: '',
      width: 50,
      render: (_: any, record: MappingRow) => (
        !disabled && (
          <Button type="text" danger size="small" icon={<DeleteOutlined />} onClick={() => removeMapping(record.key)} />
        )
      ),
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Top: Template Editor */}
      <div>
        <Space direction="vertical" style={{ width: '100%' }}>
          <Space>
            <span style={{ fontWeight: 500 }}>格式选择:</span>
            <Select
              value={format}
              onChange={handleFormatChange}
              disabled={disabled}
              options={[
                { value: 'json', label: 'JSON' },
                { value: 'xml', label: 'XML' },
                { value: 'form', label: 'Form' },
              ]}
            />
          </Space>
          <Input.TextArea
            value={template}
            onChange={(e) => handleTemplateChange(e.target.value)}
            placeholder={format === 'json' ? '{\n  "amount": "{{amount}}",\n  "currency": "{{currency}}"\n}' : `Enter ${format.toUpperCase()} template`}
            rows={10}
            disabled={disabled}
            style={{ fontFamily: 'monospace' }}
          />
        </Space>
      </div>

      {/* Bottom: Field Mapping */}
      <div>
        <div style={{ marginBottom: 8 }}>
          <span style={{ fontWeight: 500 }}>字段映射</span>
          <span style={{ color: '#999', fontSize: 12 }}> (自动从模板提取 {'{{变量}}'})</span>
        </div>
        <Table
          dataSource={mappings}
          columns={columns}
          rowKey="key"
          size="small"
          pagination={false}
          footer={() => (
            !disabled && (
              <Button type="dashed" size="small" icon={<PlusOutlined />} onClick={addMappingRow}>
                新增行
              </Button>
            )
          )}
        />
      </div>
    </div>
  );
}

export { extractVariables };
export type { MappingRow };

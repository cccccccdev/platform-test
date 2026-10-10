import { useState, useEffect } from 'react';
import { Input, Table, Space, Button, Modal, Select, Tag, Radio } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';

interface FieldDef {
  key: string;
  fieldName: string;
  type: 'String' | 'Number' | 'Boolean' | 'Array' | 'Object';
  required: boolean;
}

interface JsonSampleEditorProps {
  value?: {
    sampleJson: string;
    fields: FieldDef[];
  };
  onChange?: (value: JsonSampleEditorProps['value']) => void;
  disabled?: boolean;
  mode?: 'request' | 'response'; // request = channelRequest, response = channelResponse
}

function parseJsonToFields(jsonStr: string): { fields: FieldDef[]; error?: string } {
  try {
    const parsed = JSON.parse(jsonStr);
    const fields: FieldDef[] = [];

    const extractFields = (obj: any, prefix = '') => {
      if (typeof obj !== 'object' || obj === null) return;

      for (const key of Object.keys(obj)) {
        const fullPath = prefix ? `${prefix}.${key}` : key;
        const value = obj[key];

        let type: FieldDef['type'] = 'String';
        if (typeof value === 'number') type = 'Number';
        else if (typeof value === 'boolean') type = 'Boolean';
        else if (Array.isArray(value)) type = 'Array';
        else if (typeof value === 'object' && value !== null) {
          extractFields(value, fullPath);
          continue;
        }

        fields.push({
          key: fullPath,
          fieldName: fullPath,
          type,
          required: false,
        });
      }
    };

    extractFields(parsed);
    return { fields };
  } catch (e) {
    return { fields: [], error: 'JSON 格式有误，请检查后重试' };
  }
}

function fieldsToJsonSample(fields: FieldDef[]): string {
  const obj: any = {};

  fields.forEach(field => {
    const parts = field.fieldName.split('.');
    let current = obj;

    for (let i = 0; i < parts.length - 1; i++) {
      if (!current[parts[i]]) current[parts[i]] = {};
      current = current[parts[i]];
    }

    const lastPart = parts[parts.length - 1];
    switch (field.type) {
      case 'String': current[lastPart] = ''; break;
      case 'Number': current[lastPart] = 0; break;
      case 'Boolean': current[lastPart] = false; break;
      case 'Array': current[lastPart] = []; break;
      case 'Object': current[lastPart] = {}; break;
    }
  });

  return JSON.stringify(obj, null, 2);
}

export default function JsonSampleEditor({
  value,
  onChange,
  disabled = false,
  mode = 'request',
}: JsonSampleEditorProps) {
  const [sampleJson, setSampleJson] = useState(value?.sampleJson || '{\n  \n}');
  const [fields, setFields] = useState<FieldDef[]>(value?.fields || []);
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    if (value) {
      setSampleJson(value.sampleJson || '{\n  \n}');
      setFields(value.fields || []);
    }
  }, [value]);

  // Real-time sync: fields → JSON sample
  useEffect(() => {
    if (fields.length > 0) {
      const newJson = fieldsToJsonSample(fields);
      if (newJson !== sampleJson && !jsonError) {
        // Only update if there's no parse error and it's different
      }
    }
  }, [fields]);

  const handleJsonChange = (newJson: string) => {
    setSampleJson(newJson);
    try {
      JSON.parse(newJson);
      setJsonError(null);
    } catch {
      setJsonError('JSON 格式有误，请检查后重试');
    }
  };

  const handleParseFields = () => {
    if (fields.length > 0) {
      setIsModalOpen(true);
    } else {
      doParse();
    }
  };

  const doParse = () => {
    setIsModalOpen(false);
    const { fields: newFields, error } = parseJsonToFields(sampleJson);
    if (error) {
      setJsonError(error);
    } else {
      setFields(newFields);
      setJsonError(null);
      onChange?.({ sampleJson, fields: newFields });
    }
  };

  const handleFieldChange = (key: string, newField: Partial<FieldDef>) => {
    const newFields = fields.map(f => f.key === key ? { ...f, ...newField } : f);
    setFields(newFields);
    onChange?.({ sampleJson, fields: newFields });
  };

  const handleAddField = () => {
    const newField: FieldDef = {
      key: `field_${Date.now()}`,
      fieldName: '',
      type: 'String',
      required: false,
    };
    const newFields = [...fields, newField];
    setFields(newFields);
    onChange?.({ sampleJson, fields: newFields });
  };

  const handleRemoveField = (key: string) => {
    const newFields = fields.filter(f => f.key !== key);
    setFields(newFields);
    onChange?.({ sampleJson, fields: newFields });
  };

  // Rebuild JSON from fields when fields change
  useEffect(() => {
    if (fields.length > 0) {
      const newJson = fieldsToJsonSample(fields);
      if (newJson !== sampleJson) {
        setSampleJson(newJson);
      }
    }
  }, [fields.length]); // Only trigger on field count changes

  const columns = [
    {
      title: '字段名',
      dataIndex: 'fieldName',
      width: 200,
      render: (text: string, record: FieldDef) => (
        <Input
          value={text}
          onChange={(e) => handleFieldChange(record.key, { fieldName: e.target.value })}
          placeholder="字段名"
          disabled={disabled}
          style={{ fontFamily: 'monospace', fontSize: 11 }}
        />
      ),
    },
    {
      title: '类型',
      dataIndex: 'type',
      width: 100,
      render: (text: string, record: FieldDef) => (
        <Select
          value={text}
          onChange={(val) => handleFieldChange(record.key, { type: val as FieldDef['type'] })}
          disabled={disabled}
          size="small"
          style={{ width: '100%' }}
        >
          <Select.Option value="String">String</Select.Option>
          <Select.Option value="Number">Number</Select.Option>
          <Select.Option value="Boolean">Boolean</Select.Option>
          <Select.Option value="Array">Array</Select.Option>
          <Select.Option value="Object">Object</Select.Option>
        </Select>
      ),
    },
    {
      title: mode === 'request' ? '必填' : '',
      dataIndex: 'required',
      width: 60,
      render: (text: boolean, record: FieldDef) => mode === 'request' ? (
        <Radio checked={text} onChange={(e) => handleFieldChange(record.key, { required: e.target.checked })} />
      ) : null,
    },
    {
      title: '',
      width: 50,
      render: (_: any, record: FieldDef) => (
        !disabled && (
          <Button type="text" danger size="small" icon={<DeleteOutlined />} onClick={() => handleRemoveField(record.key)} />
        )
      ),
    },
  ];

  const prefix = mode === 'request' ? 'channelRequest' : 'channelResponse';

  return (
    <Space direction="vertical" style={{ width: '100%' }}>
      {/* JSON Editor */}
      <div>
        <Space style={{ marginBottom: 8 }}>
          <span style={{ fontWeight: 500 }}>渠道{mode === 'request' ? '请求' : '响应'}报文样例</span>
          <Button
            size="small"
            onClick={handleParseFields}
            disabled={disabled || !sampleJson.trim()}
          >
            解析字段 ↓
          </Button>
        </Space>
        <Input.TextArea
          value={sampleJson}
          onChange={(e) => handleJsonChange(e.target.value)}
          rows={8}
          disabled={disabled}
          style={{
            fontFamily: 'monospace',
            fontSize: 12,
            borderColor: jsonError ? '#ff4d4f' : undefined,
          }}
          placeholder='{\n  "field": "value"\n}'
        />
        {jsonError && (
          <Tag color="error" style={{ marginTop: 4 }}>{jsonError}</Tag>
        )}
      </div>

      {/* Hint */}
      <div style={{ fontSize: 11, color: '#666', padding: '8px 12px', background: '#f5f5f5', borderRadius: 4 }}>
        💡 {mode === 'request'
          ? '粘贴渠道请求报文样例，点击「解析字段」自动提取字段列表，或在下方手动填写字段'
          : '粘贴渠道响应报文样例，点击「解析字段」自动提取字段列表，或在下方手动填写字段'}
      </div>

      {/* Field List */}
      <div>
        <div style={{ fontWeight: 500, marginBottom: 8 }}>
          渠道字段定义
          {mode === 'response' && (
            <span style={{ fontWeight: 'normal', color: '#666' }}>
              {' '}- 写入目标自动前缀为 <Tag style={{ fontSize: 10 }}>{prefix}.</Tag>
            </span>
          )}
        </div>
        <Table
          dataSource={fields}
          columns={columns}
          rowKey="key"
          size="small"
          pagination={false}
          footer={() => (
            !disabled && (
              <Button type="dashed" size="small" icon={<PlusOutlined />} onClick={handleAddField} style={{ width: '100%' }}>
                新增字段
              </Button>
            )
          )}
          scroll={{ y: 200 }}
        />
      </div>

      {/* Overwrite Confirmation Modal */}
      <Modal
        title="确认覆盖字段列表"
        open={isModalOpen}
        onOk={doParse}
        onCancel={() => setIsModalOpen(false)}
        okText="确认覆盖"
        cancelText="取消"
      >
        <p>解析操作将覆盖当前字段列表，是否继续？</p>
      </Modal>
    </Space>
  );
}

export type { FieldDef };

import { useState } from 'react';
import { Table, Input, Select, Button, Space, Radio } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import FieldPicker from './FieldPicker';

const DELIMITERS = [
  { value: '&', label: '&' },
  { value: '|', label: '|' },
  { value: '', label: '无' },
  { value: ',', label: ',' },
  { value: '_', label: '_' },
  { value: '-', label: '-' },
];

interface SignatureFieldRow {
  key: string;
  field: string;
  delimiter: string;
}

interface SignatureRuleEditorProps {
  value?: {
    algorithm: string;
    credential: string;
    fields: SignatureFieldRow[];
    writeTo: 'header' | 'body' | 'query';
    headerName?: string;
    bodyPath?: string;
    queryParam?: string;
  };
  onChange?: (value: SignatureRuleEditorProps['value']) => void;
  disabled?: boolean;
}

export default function SignatureRuleEditor({
  value,
  onChange,
  disabled = false,
}: SignatureRuleEditorProps) {
  const [algorithm, setAlgorithm] = useState(value?.algorithm || 'HMAC-SHA256');
  const [fields, setFields] = useState<SignatureFieldRow[]>(value?.fields || []);
  const [writeTo, setWriteTo] = useState<'header' | 'body' | 'query'>(value?.writeTo || 'header');
  const [headerName, setHeaderName] = useState(value?.headerName || 'X-Signature');
  const [bodyPath, setBodyPath] = useState(value?.bodyPath || '');
  const [queryParam, setQueryParam] = useState(value?.queryParam || '');

  const emitChange = (updates: {
    algorithm?: string;
    fields?: SignatureFieldRow[];
    writeTo?: 'header' | 'body' | 'query';
    headerName?: string;
    bodyPath?: string;
    queryParam?: string;
  }) => {
    onChange?.({
      algorithm: updates.algorithm ?? algorithm,
      credential: value?.credential ?? '',
      fields: updates.fields ?? fields,
      writeTo: updates.writeTo ?? writeTo,
      headerName: updates.headerName ?? headerName,
      bodyPath: updates.bodyPath ?? bodyPath,
      queryParam: updates.queryParam ?? queryParam,
    });
  };

  const handleFieldChange = (key: string, fieldKey: string, val: string) => {
    const newFields = fields.map(f => f.key === key ? { ...f, [fieldKey]: val } : f);
    setFields(newFields);
    emitChange({ fields: newFields });
  };

  const addField = () => {
    const newField: SignatureFieldRow = {
      key: `sig_field_${Date.now()}`,
      field: '',
      delimiter: '&',
    };
    const newFields = [...fields, newField];
    setFields(newFields);
    emitChange({ fields: newFields });
  };

  const removeField = (key: string) => {
    const newFields = fields.filter(f => f.key !== key);
    setFields(newFields);
    emitChange({ fields: newFields });
  };

  const columns = [
    {
      title: '参与签名字段',
      dataIndex: 'field',
      width: 180,
      render: (_: any, record: SignatureFieldRow) => (
        <FieldPicker
          value={record.field}
          onChange={(val) => handleFieldChange(record.key, 'field', val)}
          disabled={disabled}
        />
      ),
    },
    {
      title: '分隔符',
      dataIndex: 'delimiter',
      width: 100,
      render: (_: any, record: SignatureFieldRow) => (
        <Select
          value={record.delimiter}
          onChange={(val) => handleFieldChange(record.key, 'delimiter', val)}
          disabled={disabled}
          options={DELIMITERS}
          style={{ width: '100%' }}
        />
      ),
    },
    {
      title: '',
      width: 50,
      render: (_: any, record: SignatureFieldRow) => (
        !disabled && (
          <Button type="text" danger size="small" icon={<DeleteOutlined />} onClick={() => removeField(record.key)} />
        )
      ),
    },
  ];

  return (
    <Space direction="vertical" style={{ width: '100%' }}>
      <Space>
        <span>签名算法:</span>
        <Select
          value={algorithm}
          onChange={(val) => { setAlgorithm(val); emitChange({ algorithm: val }); }}
          disabled={disabled}
          options={[
            { value: 'HMAC-SHA256', label: 'HMAC-SHA256' },
            { value: 'HMAC-SHA512', label: 'HMAC-SHA512' },
            { value: 'RSA-SHA256', label: 'RSA-SHA256' },
            { value: 'MD5', label: 'MD5' },
          ]}
          style={{ width: 150 }}
        />
      </Space>

      <div style={{ fontWeight: 500, marginTop: 8, marginBottom: 8 }}>拼接规则</div>
      <Table
        dataSource={fields}
        columns={columns}
        rowKey="key"
        size="small"
        pagination={false}
        footer={() => (
          !disabled && (
            <Button type="dashed" size="small" icon={<PlusOutlined />} onClick={addField}>
              添加字段
            </Button>
          )
        )}
      />

      <div style={{ marginTop: 16 }}>
        <span style={{ fontWeight: 500 }}>签名写入位置</span>
        <Radio.Group
          value={writeTo}
          onChange={(e) => { setWriteTo(e.target.value); emitChange({ writeTo: e.target.value }); }}
          disabled={disabled}
          style={{ marginLeft: 16 }}
        >
          <Radio value="header">Header</Radio>
          <Radio value="body">Body</Radio>
          <Radio value="query">Query</Radio>
        </Radio.Group>
      </div>

      {writeTo === 'header' && (
        <Space>
          <span>字段名:</span>
          <Input
            value={headerName}
            onChange={(e) => { setHeaderName(e.target.value); emitChange({ headerName: e.target.value }); }}
            disabled={disabled}
            style={{ width: 150 }}
          />
        </Space>
      )}
      {writeTo === 'body' && (
        <Space>
          <span>字段路径:</span>
          <Input
            value={bodyPath}
            onChange={(e) => { setBodyPath(e.target.value); emitChange({ bodyPath: e.target.value }); }}
            disabled={disabled}
            style={{ width: 200 }}
          />
        </Space>
      )}
      {writeTo === 'query' && (
        <Space>
          <span>参数名:</span>
          <Input
            value={queryParam}
            onChange={(e) => { setQueryParam(e.target.value); emitChange({ queryParam: e.target.value }); }}
            disabled={disabled}
            style={{ width: 150 }}
          />
        </Space>
      )}
    </Space>
  );
}

export type { SignatureFieldRow };

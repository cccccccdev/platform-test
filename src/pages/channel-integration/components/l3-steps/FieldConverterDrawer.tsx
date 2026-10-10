import { useState } from 'react';
import { Drawer, Form, Input, Select, Radio, Table, Button, Space, InputNumber } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import { FieldPicker } from '../common';

interface MappingRow {
  key: string;
  sourceField: string;
  transformRule: string;
  transformConfig?: any;
  targetField: string;
}

const TRANSFORM_RULES = [
  { value: 'direct', label: '直接映射' },
  { value: 'substring', label: '字符串截取' },
  { value: 'concat', label: '字符串拼接' },
  { value: 'amount', label: '金额换算' },
  { value: 'enum', label: '枚举映射' },
  { value: 'regex', label: '正则提取' },
  { value: 'conditional', label: '条件赋值' },
  { value: 'fixed', label: '固定值' },
];

interface FieldConverterDrawerProps {
  visible: boolean;
  onClose: () => void;
  onSave: (values: any) => void;
  initialValues?: any;
}

export default function FieldConverterDrawer({
  visible,
  onClose,
  onSave,
  initialValues,
}: FieldConverterDrawerProps) {
  const [form] = Form.useForm();
  const [mappings, setMappings] = useState<MappingRow[]>(initialValues?.mappings || []);
  const [targetNamespace, setTargetNamespace] = useState<'contextVar' | 'orderVar'>('contextVar');

  const handleSave = () => {
    const values = form.getFieldsValue();
    onSave({ ...values, mappings, targetNamespace });
  };

  const renderTransformConfig = (record: MappingRow) => {
    switch (record.transformRule) {
      case 'substring':
        return (
          <Space size={8}>
            <InputNumber placeholder="起始位" style={{ width: 80 }} />
            <span>到</span>
            <InputNumber placeholder="结束位" style={{ width: 80 }} />
          </Space>
        );
      case 'amount':
        return (
          <Space size={8}>
            <Select defaultValue="*" style={{ width: 80 }}>
              <Select.Option value="*">×</Select.Option>
              <Select.Option value="/">÷</Select.Option>
            </Select>
            <InputNumber placeholder="系数" style={{ width: 100 }} />
          </Space>
        );
      case 'enum':
        return (
          <div style={{ padding: 8, background: '#fafafa', borderRadius: 4, minWidth: 300 }}>
            <Space direction="vertical" size={4}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <Input placeholder="原始值" style={{ width: 100 }} />
                <span>→</span>
                <Input placeholder="映射值" style={{ width: 100 }} />
                <Button type="text" size="small" icon={<PlusOutlined />} />
              </div>
            </Space>
          </div>
        );
      case 'regex':
        return (
          <Space size={8}>
            <Input placeholder="正则表达式" style={{ width: 150 }} />
            <InputNumber placeholder="捕获组" defaultValue={1} style={{ width: 60 }} />
          </Space>
        );
      case 'conditional':
        return (
          <Space direction="vertical" size={8} style={{ padding: 8, background: '#fafafa', borderRadius: 4 }}>
            <div>满足条件时: <Input placeholder="赋值" style={{ width: 100 }} /></div>
            <div>不满足时: <Input placeholder="赋值" style={{ width: 100 }} /></div>
          </Space>
        );
      case 'fixed':
        return <Input placeholder="固定内容" style={{ width: 150 }} />;
      default:
        return null;
    }
  };

  const columns = [
    {
      title: '来源字段',
      dataIndex: 'sourceField',
      width: 160,
      render: (_: any, record: MappingRow) => (
        <FieldPicker
          value={record.sourceField}
          onChange={(val) => {
            const newMappings = mappings.map(m => m.key === record.key ? { ...m, sourceField: val } : m);
            setMappings(newMappings);
          }}
        />
      ),
    },
    {
      title: '转换规则',
      dataIndex: 'transformRule',
      width: 130,
      render: (_: any, record: MappingRow) => (
        <Select
          value={record.transformRule}
          onChange={(val) => {
            const newMappings = mappings.map(m => m.key === record.key ? { ...m, transformRule: val } : m);
            setMappings(newMappings);
          }}
          options={TRANSFORM_RULES}
          style={{ width: '100%' }}
        />
      ),
    },
    {
      title: '规则配置',
      dataIndex: 'transformConfig',
      render: (_: any, record: MappingRow) => renderTransformConfig(record),
    },
    {
      title: '写入目标',
      dataIndex: 'targetField',
      width: 140,
      render: (_: any, record: MappingRow) => (
        <Input
          value={record.targetField}
          onChange={(e) => {
            const newMappings = mappings.map(m => m.key === record.key ? { ...m, targetField: e.target.value } : m);
            setMappings(newMappings);
          }}
          placeholder="contextVar.xxx"
        />
      ),
    },
    {
      title: '',
      width: 50,
      render: (_: any, record: MappingRow) => (
        <Button type="text" danger size="small" icon={<DeleteOutlined />} onClick={() => {
          setMappings(mappings.filter(m => m.key !== record.key));
        }} />
      ),
    },
  ];

  return (
    <Drawer
      title="Field Mapping"
      open={visible}
      onClose={onClose}
      width={480}
      footer={
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <Button onClick={onClose}>Cancel</Button>
          <Button type="primary" onClick={handleSave}>Save</Button>
        </div>
      }
    >
      <Form form={form} layout="vertical">
        <div style={{ fontWeight: 500, marginBottom: 8 }}>字段映射规则</div>
        <Table
          dataSource={mappings}
          columns={columns}
          rowKey="key"
          size="small"
          pagination={false}
          footer={() => (
            <Button
              type="dashed"
              size="small"
              icon={<PlusOutlined />}
              onClick={() => {
                setMappings([...mappings, {
                  key: `mapping_${Date.now()}`,
                  sourceField: '',
                  transformRule: 'direct',
                  targetField: '',
                }]);
              }}
            >
              新增行
            </Button>
          )}
        />

        <div style={{ marginTop: 24 }}>
          <div style={{ fontWeight: 500, marginBottom: 8 }}>写入目标命名空间</div>
          <Radio.Group
            value={targetNamespace}
            onChange={(e) => setTargetNamespace(e.target.value)}
          >
            <Radio value="contextVar">contextVar</Radio>
            <Radio value="orderVar">orderVar</Radio>
          </Radio.Group>
        </div>
      </Form>
    </Drawer>
  );
}

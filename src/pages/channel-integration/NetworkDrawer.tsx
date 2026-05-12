import { useState } from 'react';
import { Drawer, Form, Select, Table, Input, Space, Button, Divider } from 'antd';
import { CheckCircleOutlined, PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { mockOutboundEndpoints, mockEndpointFields } from '../../mock/data';

interface NetworkDrawerProps {
  open: boolean;
  endpoint?: string;
  onClose: () => void;
  onEndpointChange: (endpoint: string) => void;
}

interface FieldMapping {
  endpointField: string;
  mode: 'direct' | 'condition' | 'fixed';
  contextField?: string;
  fieldType: string;
  operation: string;
  conditions?: Array<{ field: string; op: string; value: string; result: string }>;
  defaultValue?: string;
  fixedValue?: string;
  multiplier?: number;
}

export default function NetworkDrawer({ open, endpoint: initialEndpoint, onClose, onEndpointChange }: NetworkDrawerProps) {
  const [selectedEndpoint, setSelectedEndpoint] = useState<string>(initialEndpoint || '');
  const [mappings, setMappings] = useState<FieldMapping[]>([]);

  // Endpoint 字段变化
  const handleEndpointChange = (val: string) => {
    setSelectedEndpoint(val);
    onEndpointChange(val);
    // 初始化字段映射
    const fields = mockEndpointFields[val] || [];
    setMappings(
      fields.map((f) => ({
        endpointField: f,
        mode: 'direct' as const,
        contextField: '',
        fieldType: 'String',
        operation: '无转换',
      }))
    );
  };

  // 更新映射
  const updateMapping = (index: number, updates: Partial<FieldMapping>) => {
    setMappings((prev) =>
      prev.map((m, i) => (i === index ? { ...m, ...updates } : m))
    );
  };

  // 赋值模式变化时重置
  const handleModeChange = (index: number, mode: 'direct' | 'condition' | 'fixed') => {
    if (mode === 'condition') {
      updateMapping(index, {
        mode,
        conditions: [{ field: '', op: '==', value: '', result: '' }],
      });
    } else {
      updateMapping(index, {
        mode,
        conditions: undefined,
        fixedValue: mode === 'fixed' ? '' : undefined,
      });
    }
  };

  // 添加条件
  const addCondition = (index: number) => {
    const mapping = mappings[index];
    updateMapping(index, {
      conditions: [...(mapping.conditions || []), { field: '', op: '==', value: '', result: '' }],
    });
  };

  // 删除条件
  const removeCondition = (mappingIndex: number, condIndex: number) => {
    const mapping = mappings[mappingIndex];
    updateMapping(mappingIndex, {
      conditions: mapping.conditions?.filter((_, i) => i !== condIndex),
    });
  };

  // 更新条件
  const updateCondition = (mappingIndex: number, condIndex: number, updates: Partial<{ field: string; op: string; value: string; result: string }>) => {
    const mapping = mappings[mappingIndex];
    const newConditions = mapping.conditions?.map((c, i) =>
      i === condIndex ? { ...c, ...updates } : c
    );
    updateMapping(mappingIndex, { conditions: newConditions });
  };

  const columns: ColumnsType<FieldMapping> = [
    {
      title: 'Endpoint字段',
      dataIndex: 'endpointField',
      width: 150,
      render: (f: string) => <span style={{ fontFamily: 'monospace' }}>{f}</span>,
    },
    {
      title: '赋值模式',
      dataIndex: 'mode',
      width: 120,
      render: (mode: string, _: FieldMapping, index: number) => (
        <Select
          value={mode}
          onChange={(val) => handleModeChange(index, val as 'direct' | 'condition' | 'fixed')}
          options={[
            { label: '直接取值', value: 'direct' },
            { label: '条件赋值', value: 'condition' },
            { label: '固定值', value: 'fixed' },
          ]}
        />
      ),
    },
    {
      title: 'Context字段 / 值',
      width: 200,
      render: (_: any, record: FieldMapping, index: number) => {
        if (record.mode === 'direct') {
          return (
            <Input
              value={record.contextField}
              placeholder="点击选择 Context 字段"
              readOnly
              suffix={record.contextField ? <CheckCircleOutlined style={{ color: '#52c41a' }} /> : null}
            />
          );
        }
        if (record.mode === 'condition') {
          return (
            <div>
              {(record.conditions || []).map((cond, i) => (
                <Space key={i} align="center" style={{ marginBottom: 4 }}>
                  <span style={{ color: '#999', width: 20 }}>IF</span>
                  <Input
                    value={cond.field}
                    placeholder="字段路径"
                    style={{ width: 100 }}
                    readOnly
                  />
                  <Select
                    value={cond.op}
                    options={['==', '!=', '>', '<', '>=', '<='].map((op) => ({ label: op, value: op }))}
                    style={{ width: 60 }}
                    onChange={(val) => updateCondition(index, i, { op: val })}
                  />
                  <Input
                    value={cond.value}
                    placeholder="值"
                    style={{ width: 70 }}
                    onChange={(e) => updateCondition(index, i, { value: e.target.value })}
                  />
                  <span style={{ color: '#999' }}>→</span>
                  <Input
                    value={cond.result}
                    placeholder="结果字段"
                    style={{ width: 100 }}
                    readOnly
                  />
                  <DeleteOutlined onClick={() => removeCondition(index, i)} />
                </Space>
              ))}
              <Button type="dashed" size="small" icon={<PlusOutlined />} onClick={() => addCondition(index)}>
                Add Condition
              </Button>
            </div>
          );
        }
        // fixed
        return (
          <Input
            value={record.fixedValue}
            placeholder="输入固定值"
            onChange={(e) => updateMapping(index, { fixedValue: e.target.value })}
          />
        );
      },
    },
    {
      title: '类型',
      dataIndex: 'fieldType',
      width: 100,
      render: (type: string, _: FieldMapping, index: number) => (
        <Select
          value={type}
          onChange={(val) => updateMapping(index, { fieldType: val })}
          options={['String', 'Number', 'Boolean', 'Object'].map((t) => ({ label: t, value: t }))}
        />
      ),
    },
    {
      title: 'Operation',
      dataIndex: 'operation',
      width: 150,
      render: (op: string, _: FieldMapping, index: number) => (
        <Select
          value={op}
          onChange={(val) => updateMapping(index, { operation: val, multiplier: val === '乘以N' ? 100 : undefined })}
          options={[
            { label: '无转换', value: '无转换' },
            { label: '乘以N', value: '乘以N' },
            { label: '字符串格式化', value: '字符串格式化' },
            { label: '自定义表达式', value: '自定义表达式' },
          ]}
        />
      ),
    },
  ];

  return (
    <Drawer
      title="network 组件配置"
      placement="right"
      width={620}
      onClose={onClose}
      open={open}
    >
      {/* Endpoint 选择 */}
      <Form.Item label="Endpoint" required>
        <Select
          value={selectedEndpoint}
          onChange={handleEndpointChange}
          placeholder="请选择 outbound Endpoint"
          options={mockOutboundEndpoints.map((e) => ({ label: `${e.name} (${e.method})`, value: e.name }))}
        />
      </Form.Item>

      <Divider />

      {/* 字段映射表 */}
      {mappings.length > 0 && (
        <Table
          dataSource={mappings}
          columns={columns}
          rowKey="endpointField"
          pagination={false}
          size="small"
          scroll={{ y: 400 }}
        />
      )}
    </Drawer>
  );
}
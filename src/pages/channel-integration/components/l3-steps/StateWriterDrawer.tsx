import { useState } from 'react';
import { Drawer, Form, Input, Select, Space, Tag, Table, Button, Alert } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import { FieldPicker } from '../common';

const STATUS_OPTIONS = [
  { value: 'PENDING', label: 'PENDING - 待处理' },
  { value: 'PROCESSING', label: 'PROCESSING - 处理中' },
  { value: 'SUCCESS', label: 'SUCCESS - 最终成功' },
  { value: 'FAILED', label: 'FAILED - 最终失败' },
  { value: 'CANCELLED', label: 'CANCELLED - 已撤销' },
  { value: 'REFUNDED', label: 'REFUNDED - 已退款' },
];

interface AdditionalField {
  key: string;
  fieldName: string;
  valueSource: string;
}

interface StateWriterDrawerProps {
  visible: boolean;
  onClose: () => void;
  onSave: (values: any) => void;
  initialValues?: any;
}

export default function StateWriterDrawer({
  visible,
  onClose,
  onSave,
  initialValues,
}: StateWriterDrawerProps) {
  const [form] = Form.useForm();
  const [targetState, setTargetState] = useState(initialValues?.targetState || 'SUCCESS');
  const [showValidationError, setShowValidationError] = useState(false);
  const [additionalFields, setAdditionalFields] = useState<AdditionalField[]>(initialValues?.additionalFields || []);

  const handleSave = () => {
    // Simple validation - in real scenario would check against state machine
    if (!targetState) {
      setShowValidationError(true);
      return;
    }
    setShowValidationError(false);
    const values = form.getFieldsValue();
    onSave({ ...values, targetState, additionalFields });
  };

  return (
    <Drawer
      title="State Transition"
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
        <Form.Item label="目标状态" name="targetState">
          <Select
            value={targetState}
            onChange={(val) => setTargetState(val)}
            options={STATUS_OPTIONS}
          />
        </Form.Item>

        {showValidationError && (
          <Alert
            message="不允许的状态迁移路径"
            type="error"
            style={{ marginBottom: 16 }}
          />
        )}

        <Alert
          message="状态流转合法性校验"
          description="平台实时校验：当前态 → 目标态 是否在状态机允许范围内。非法流转时字段边框标红。"
          type="warning"
          style={{ marginBottom: 16 }}
        />

        <Form.Item label="触发条件（可选）" name="triggerCondition">
          <Space size={8}>
            <div style={{ width: 140 }}><FieldPicker placeholder="选择字段" /></div>
            <Select defaultValue="=" style={{ width: 70 }}>
              <Select.Option value="=">=</Select.Option>
              <Select.Option value="!=">≠</Select.Option>
            </Select>
            <Input placeholder="期望值" style={{ width: 100 }} />
          </Space>
        </Form.Item>

        <div style={{ fontWeight: 500, marginTop: 16, marginBottom: 8 }}>附加写入字段（可选）</div>
        <Table
          dataSource={additionalFields}
          columns={[
            {
              title: '字段名',
              dataIndex: 'fieldName',
              render: (_: any, record: AdditionalField) => (
                <Input
                  value={record.fieldName}
                  onChange={(e) => {
                    const newFields = additionalFields.map(f => f.key === record.key ? { ...f, fieldName: e.target.value } : f);
                    setAdditionalFields(newFields);
                  }}
                  placeholder="fieldName"
                />
              ),
            },
            {
              title: '值来源',
              dataIndex: 'valueSource',
              render: (_: any, record: AdditionalField) => (
                <FieldPicker
                  value={record.valueSource}
                  onChange={(val) => {
                    const newFields = additionalFields.map(f => f.key === record.key ? { ...f, valueSource: val } : f);
                    setAdditionalFields(newFields);
                  }}
                  placeholder="选择字段"
                />
              ),
            },
            {
              title: '',
              width: 50,
              render: (_: any, record: AdditionalField) => (
                <Button
                  type="text"
                  danger
                  size="small"
                  icon={<DeleteOutlined />}
                  onClick={() => setAdditionalFields(additionalFields.filter(f => f.key !== record.key))}
                />
              ),
            },
          ]}
          rowKey="key"
          size="small"
          pagination={false}
          footer={() => (
            <Button
              type="dashed"
              size="small"
              icon={<PlusOutlined />}
              onClick={() => setAdditionalFields([...additionalFields, { key: `field_${Date.now()}`, fieldName: '', valueSource: '' }])}
            >
              新增行
            </Button>
          )}
        />

        <Tag color="default" style={{ marginTop: 16 }}>
          终态幂等：若当前已为目标状态，本节点自动跳过
        </Tag>
      </Form>
    </Drawer>
  );
}

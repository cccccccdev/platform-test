import { useState } from 'react';
import { Drawer, Form, Input, Radio, Table, Button, Checkbox } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import { FieldPicker } from '../common';

interface MappingRow {
  key: string;
  variableName: string;
  sourceField: string;
}

interface MqDispatcherDrawerProps {
  visible: boolean;
  onClose: () => void;
  onSave: (values: any) => void;
  initialValues?: any;
}

export default function MqDispatcherDrawer({
  visible,
  onClose,
  onSave,
  initialValues,
}: MqDispatcherDrawerProps) {
  const [form] = Form.useForm();
  const [topic, setTopic] = useState(initialValues?.topic || '');
  const [messageFormat, setMessageFormat] = useState<'json' | 'plain'>('json');
  const [sendStrategy, setSendStrategy] = useState<'at-least-once' | 'at-most-once'>('at-least-once');
  const [failAction, setFailAction] = useState<'ignore' | 'block'>('ignore');
  const [multiTopicEnabled, setMultiTopicEnabled] = useState(false);
  const [templateValue, setTemplateValue] = useState(initialValues?.template || '');
  const [mappings, setMappings] = useState<MappingRow[]>(initialValues?.mappings || []);

  const handleSave = () => {
    const values = form.getFieldsValue();
    onSave({ ...values, topic, messageFormat, sendStrategy, failAction, template: templateValue, mappings, multiTopicEnabled });
  };

  return (
    <Drawer
      title="Notify Downstream"
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
        <Form.Item label="消息队列 Topic *" name="topic" rules={[{ required: true }]}>
          <Input
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="e.g., payment.notify"
          />
        </Form.Item>

        <Form.Item label="消息体格式" name="messageFormat">
          <Radio.Group onChange={(e) => setMessageFormat(e.target.value)} value={messageFormat}>
            <Radio value="json">JSON</Radio>
            <Radio value="plain">纯文本</Radio>
          </Radio.Group>
        </Form.Item>

        <div style={{ fontWeight: 500, marginBottom: 8 }}>消息体模板</div>
        <Input.TextArea
          value={templateValue}
          onChange={(e) => setTemplateValue(e.target.value)}
          rows={8}
          placeholder={`{\n  "orderId": "{{orderId}}",\n  "status": "{{status}}",\n  "amount": "{{amount}}"\n}`}
          style={{ fontFamily: 'monospace' }}
        />

        <div style={{ fontWeight: 500, marginTop: 16, marginBottom: 8 }}>字段映射</div>
        <Table
          dataSource={mappings as MappingRow[]}
          columns={[
            {
              title: '变量名',
              dataIndex: 'variableName',
              width: 140,
              render: (_: any, record: MappingRow) => (
                <Input
                  value={record.variableName}
                  onChange={(e) => {
                    const newMappings = mappings.map(m => m.key === record.key ? { ...m, variableName: e.target.value } : m);
                    setMappings(newMappings);
                  }}
                  placeholder="{{variableName}}"
                  disabled
                  style={{ fontFamily: 'monospace' }}
                />
              ),
            },
            {
              title: '来源字段',
              dataIndex: 'sourceField',
              render: (_: any, record: MappingRow) => (
                <FieldPicker
                  value={record.sourceField}
                  onChange={(val) => {
                    const newMappings = mappings.map(m => m.key === record.key ? { ...m, sourceField: val } : m);
                    setMappings(newMappings);
                  }}
                  placeholder="选择字段"
                />
              ),
            },
            {
              title: '',
              width: 50,
              render: (_: any, record: MappingRow) => (
                <Button
                  type="text"
                  danger
                  size="small"
                  icon={<DeleteOutlined />}
                  onClick={() => setMappings(mappings.filter(m => m.key !== record.key))}
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
              onClick={() => setMappings([...mappings, { key: `mapping_${Date.now()}`, variableName: '', sourceField: '' }])}
            >
              新增行
            </Button>
          )}
        />

        <Form.Item label="发送策略" name="sendStrategy" style={{ marginTop: 16 }}>
          <Radio.Group onChange={(e) => setSendStrategy(e.target.value)} value={sendStrategy}>
            <Radio value="at-least-once">At least once</Radio>
            <Radio value="at-most-once">At most once</Radio>
          </Radio.Group>
        </Form.Item>

        <Form.Item label="失败处理" name="failAction">
          <Radio.Group onChange={(e) => setFailAction(e.target.value)} value={failAction}>
            <Radio value="ignore">忽略，继续主流程</Radio>
            <Radio value="block">阻断主流程，抛出异常</Radio>
          </Radio.Group>
        </Form.Item>

        <div style={{ marginTop: 16 }}>
          <Checkbox checked={multiTopicEnabled} onChange={(e) => setMultiTopicEnabled(e.target.checked)}>
            同时发送到其他 Topic
          </Checkbox>
        </div>
      </Form>
    </Drawer>
  );
}

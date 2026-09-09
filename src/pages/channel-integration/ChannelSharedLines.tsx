import { useState } from 'react';
import { Alert, Button, Card, Checkbox, Form, Input, InputNumber, Modal, Space, Switch, Table, Typography, message } from 'antd';
import { EditOutlined } from '@ant-design/icons';
import type { SharedLine } from './channelInfoPartyLines';

const { Text } = Typography;
type LineFormValues = Omit<SharedLine, 'id' | 'operator' | 'operationTime'>;

interface Props {
  lines: SharedLine[];
  onChange: (lines: SharedLine[]) => void;
}

function now() {
  return new Date().toLocaleString('sv-SE').replace('T', ' ').slice(0, 19);
}

export default function ChannelSharedLines({ lines, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form] = Form.useForm<LineFormValues>();
  const proxyEnabled = Form.useWatch('enableProxy', form);

  const openEditor = (line?: SharedLine) => {
    setEditingId(line?.id ?? null);
    form.setFieldsValue(line ? {
      lineName: line.lineName,
      line: line.line,
      skipSsl: line.skipSsl,
      enableProxy: line.enableProxy,
      proxyServer: line.proxyServer,
      proxyPort: line.proxyPort,
    } : { lineName: '', line: '', skipSsl: false, enableProxy: false });
    setOpen(true);
  };

  const save = async () => {
    const values = await form.validateFields();
    const duplicate = lines.some((line) => line.id !== editingId && line.lineName.trim().toLowerCase() === values.lineName.trim().toLowerCase());
    if (duplicate) {
      form.setFields([{ name: 'lineName', errors: ['Line Name already exists in this Channel environment.'] }]);
      return;
    }
    const next: SharedLine = {
      id: editingId ?? `line_${Date.now()}`,
      ...values,
      lineName: values.lineName.trim(),
      line: values.line.trim().replace(/\/$/, ''),
      operator: 'current.user',
      operationTime: now(),
    };
    onChange(editingId ? lines.map((line) => line.id === editingId ? next : line) : [...lines, next]);
    setOpen(false);
    message.success(editingId ? 'Line updated' : 'Line created');
  };

  return <>
    <Card className="party-runtime-card channel-shared-lines-card">
      <div className="channel-shared-lines-heading">
        <div><h3>Lines</h3><Text type="secondary">Reusable connection resources for the current Channel, Cloud and Environment.</Text></div>
        <Button type="primary" onClick={() => openEditor()}>Add Line</Button>
      </div>
      <Alert type="info" showIcon message="Lines are shared by every Party in this Channel environment. Endpoint routing under each Party only references them." />
      <Table
        rowKey="id"
        dataSource={lines}
        pagination={false}
        scroll={{ x: 1060 }}
        columns={[
          { title: 'Line Name', dataIndex: 'lineName', width: 220 },
          { title: 'Line', dataIndex: 'line', width: 300, render: (value: string) => <Text>{value}</Text> },
          { title: 'Skip SSL', dataIndex: 'skipSsl', width: 100, render: (value: boolean) => value ? 'Yes' : 'No' },
          { title: 'Proxy', dataIndex: 'enableProxy', width: 170, render: (value: boolean, row: SharedLine) => value ? `${row.proxyServer}:${row.proxyPort}` : 'Disabled' },
          { title: 'Operator', dataIndex: 'operator', width: 150 },
          { title: 'Operation Time', dataIndex: 'operationTime', width: 190 },
          { title: 'Operation', width: 100, fixed: 'right' as const, render: (_: unknown, row: SharedLine) => <Button type="link" icon={<EditOutlined />} onClick={() => openEditor(row)}>Config</Button> },
        ]}
      />
    </Card>

    <Modal title={editingId ? 'Config Line' : 'Add Line'} open={open} onCancel={() => setOpen(false)} onOk={() => void save()} okText="Save" width={760} destroyOnHidden>
      <Form form={form} labelCol={{ span: 7 }} wrapperCol={{ span: 14 }} style={{ marginTop: 30 }}>
        <Form.Item name="lineName" label="Line Name" rules={[{ required: true, whitespace: true }]}><Input disabled={Boolean(editingId)} /></Form.Item>
        <Form.Item label="Line" required>
          <Space.Compact block>
            <Form.Item name="line" noStyle rules={[{ required: true }, { type: 'url', message: 'Enter a valid URL' }]}><Input /></Form.Item>
            <Form.Item name="skipSsl" valuePropName="checked" noStyle><Checkbox className="network-route-skip-ssl">Skip SSL</Checkbox></Form.Item>
          </Space.Compact>
        </Form.Item>
        <Form.Item name="enableProxy" label="Enable Proxy" valuePropName="checked"><Switch /></Form.Item>
        {proxyEnabled && <>
          <Form.Item name="proxyServer" label="Proxy - Server" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="proxyPort" label="Proxy - Port" rules={[{ required: true }]}><InputNumber min={1} max={65535} style={{ width: '100%' }} /></Form.Item>
        </>}
      </Form>
    </Modal>
  </>;
}

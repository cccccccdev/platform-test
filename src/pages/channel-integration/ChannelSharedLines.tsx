import { useState } from 'react';
import { Alert, Button, Card, Checkbox, Empty, Form, Input, InputNumber, Modal, Space, Switch, Table, Tooltip, Typography, message } from 'antd';
import { EditOutlined } from '@ant-design/icons';
import type { LineReference, SharedLine } from './channelInfoPartyLines';

const { Text } = Typography;
type LineFormValues = Omit<SharedLine, 'id' | 'operator' | 'operationTime'>;

interface Props {
  lines: SharedLine[];
  references: LineReference[];
  onChange: (lines: SharedLine[]) => void;
}

function now() {
  return new Date().toLocaleString('sv-SE').replace('T', ' ').slice(0, 19);
}

export default function ChannelSharedLines({ lines, references, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [referenceLine, setReferenceLine] = useState<SharedLine | null>(null);
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
      timeout: line.timeout,
    } : { lineName: '', line: '', skipSsl: false, enableProxy: false, timeout: undefined });
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
      <Alert type="info" showIcon message="Lines and their Timeout settings are shared by every Party in this Channel environment. Endpoint routing under each Party only references them." />
      <Table
        rowKey="id"
        dataSource={lines}
        pagination={false}
        scroll={{ x: 1180 }}
        columns={[
          { title: 'Line Name', dataIndex: 'lineName', width: 220 },
          { title: 'Line', dataIndex: 'line', width: 300, render: (value: string) => <Text>{value}</Text> },
          { title: 'Skip SSL', dataIndex: 'skipSsl', width: 100, render: (value: boolean) => value ? 'Yes' : 'No' },
          { title: 'Proxy', dataIndex: 'enableProxy', width: 170, render: (value: boolean, row: SharedLine) => value ? `${row.proxyServer}:${row.proxyPort}` : 'Disabled' },
          { title: 'Timeout', dataIndex: 'timeout', width: 130, render: (value: number) => `${value} ms` },
          { title: 'Operator', dataIndex: 'operator', width: 150 },
          { title: 'Operation Time', dataIndex: 'operationTime', width: 190 },
          { title: 'Operation', width: 190, fixed: 'right' as const, render: (_: unknown, row: SharedLine) => {
            const activeReferences = references.filter((reference) => reference.lineId === row.id);
            return <Space size="small">
              <Button type="link" onClick={() => setReferenceLine(row)}>References</Button>
              <Tooltip title={activeReferences.length ? 'This Line has active Party and Endpoint references and cannot be configured.' : undefined}>
                <span><Button type="link" icon={<EditOutlined />} disabled={activeReferences.length > 0} onClick={() => openEditor(row)}>Config</Button></span>
              </Tooltip>
            </Space>;
          } },
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
        <Form.Item name="timeout" label="Timeout" rules={[{ required: true }]}><InputNumber min={1} addonAfter="ms" style={{ width: '100%' }} /></Form.Item>
        <Form.Item name="enableProxy" label="Enable Proxy" valuePropName="checked"><Switch /></Form.Item>
        {proxyEnabled && <>
          <Form.Item name="proxyServer" label="Proxy - Server" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="proxyPort" label="Proxy - Port" rules={[{ required: true }]}><InputNumber min={1} max={65535} style={{ width: '100%' }} /></Form.Item>
        </>}
      </Form>
    </Modal>

    <Modal title="Line References" open={Boolean(referenceLine)} onCancel={() => setReferenceLine(null)} footer={<Button onClick={() => setReferenceLine(null)}>Close</Button>} width={720}>
      {referenceLine && <>
        <div className="credential-modal-context"><strong>Line:</strong> {referenceLine.lineName}</div>
        <Alert type="info" showIcon message="Only enabled Party and Endpoint references are shown." style={{ marginBottom: 16 }} />
        <Table<LineReference>
          rowKey={(reference) => `${reference.party}:${reference.path}`}
          dataSource={references.filter((reference) => reference.lineId === referenceLine.id)}
          pagination={false}
          locale={{ emptyText: <Empty description="This Line has no active Party and Endpoint references." /> }}
          columns={[
            { title: 'Party', dataIndex: 'party', width: '35%' },
            { title: 'Endpoint', dataIndex: 'path' },
          ]}
        />
      </>}
    </Modal>
  </>;
}

import { useEffect, useState } from 'react';
import { Alert, Button, Drawer, Form, Input, InputNumber, Select, Space, Switch, Tabs, Tag, Typography } from 'antd';
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import { iso8583Ver1987Template, type TcpProfile } from './channelScopeStore';

type Props = {
  open: boolean;
  profile?: TcpProfile | null;
  readOnly?: boolean;
  onClose: () => void;
  onSave: (profile: TcpProfile) => void;
};

const existingDefaults: Omit<TcpProfile, 'id' | 'name'> = {
  status: 'Draft',
  afterConnectBehavior: 'none',
  beforeCloseBehavior: 'none',
  framingType: 'length-prefix',
  frameHeaderSize: '2-bytes',
  frameByteOrder: 'big-endian',
  frameLengthIncludesHeader: false,
  messageProtocol: 'ISO8583:1987',
  mtiEncoding: 'ASCII',
  bitmapEncoding: 'Binary',
  correlationFields: [32, 37, 41, 42],
  fieldDictionary: iso8583Ver1987Template,
};

const formatOptions = ['FIXED', 'LVAR', 'HLVAR', 'HLLVAR'].map(value => ({ label: value, value }));
const codingOptions = ['ASCII', 'BCD', 'BIN', 'BIT'].map(value => ({ label: value, value }));

export default function TcpProfileDrawer({ open, profile, readOnly = false, onClose, onSave }: Props) {
  const [form] = Form.useForm();
  const [activeTab, setActiveTab] = useState('runtime');
  const framingType = Form.useWatch('framingType', form);
  const messageProtocol = Form.useWatch('messageProtocol', form);

  useEffect(() => {
    if (!open) return;
    setActiveTab('runtime');
    form.resetFields();
    if (profile) {
      form.setFieldsValue({
        ...profile,
        afterConnectEnabled: profile.afterConnectBehavior !== 'none',
        beforeCloseEnabled: profile.beforeCloseBehavior !== 'none',
      });
    } else {
      form.setFieldsValue({
        name: '',
        responseTimeout: undefined,
        maxInFlight: undefined,
        framingType: undefined,
        frameHeaderSize: undefined,
        frameByteOrder: undefined,
        frameLengthIncludesHeader: false,
        messageProtocol: undefined,
        mtiEncoding: undefined,
        bitmapEncoding: undefined,
        correlationFields: [],
        fieldDictionary: [],
        afterConnectEnabled: false,
        beforeCloseEnabled: false,
      });
    }
  }, [form, open, profile]);

  const save = async () => {
    const values = await form.validateFields();
    onSave({
      id: profile?.id ?? `tcp_profile_${Date.now()}`,
      ...existingDefaults,
      ...profile,
      name: values.name,
      responseTimeout: values.responseTimeout,
      maxInFlight: values.maxInFlight,
      framingType: values.framingType,
      frameHeaderSize: values.frameHeaderSize,
      frameByteOrder: values.frameByteOrder,
      frameLengthIncludesHeader: values.frameLengthIncludesHeader ?? false,
      messageProtocol: values.messageProtocol,
      mtiEncoding: values.mtiEncoding,
      bitmapEncoding: values.bitmapEncoding,
      correlationFields: values.correlationFields ?? [],
      fieldDictionary: values.fieldDictionary ?? [],
      afterConnectBehavior: values.afterConnectEnabled ? 'sign-on' : 'none',
      beforeCloseBehavior: values.beforeCloseEnabled ? 'sign-off' : 'none',
    });
  };

  const runtime = <div style={{ padding: '16px 4px' }}>
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
      <Form.Item name="responseTimeout" label="Business Response Timeout (seconds)" rules={[{ required: true, message: 'Response timeout is required' }]}><InputNumber min={1} max={300} style={{ width: '100%' }} /></Form.Item>
      <Form.Item name="maxInFlight" label="Max In-flight Requests" rules={[{ required: true, message: 'Max in-flight requests is required' }]}><InputNumber min={1} max={10000} style={{ width: '100%' }} /></Form.Item>
    </div>
  </div>;

  const framing = <div style={{ padding: '16px 4px' }}>
    <Alert type="info" showIcon title="The first release exposes the NPSB length-prefix choices. This is a channel-specific Demo shape, not the final universal framing model." style={{ marginBottom: 16 }} />
    <Form.Item name="framingType" label="Framing Type" rules={[{ required: true }]}><Select placeholder="Select framing type" options={[{ label: 'Length Prefix', value: 'length-prefix' }]} /></Form.Item>
    {framingType === 'length-prefix' && <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
      <Form.Item name="frameHeaderSize" label="Length Header Size" rules={[{ required: true }]}><Select options={[{ label: '2 bytes', value: '2-bytes' }]} /></Form.Item>
      <Form.Item name="frameByteOrder" label="Byte Order" rules={[{ required: true }]}><Select options={[{ label: 'Big Endian (high byte first)', value: 'big-endian' }, { label: 'Little Endian (low byte first)', value: 'little-endian' }]} /></Form.Item>
      <Form.Item name="frameLengthIncludesHeader" label="Header Included in Length" valuePropName="checked"><Switch /></Form.Item>
    </div>}
  </div>;

  const protocol = <div style={{ padding: '16px 4px' }}>
    <Form.Item name="messageProtocol" label="Message Protocol" rules={[{ required: true }]}><Select placeholder="Select message protocol" options={[{ label: 'ISO 8583:1987', value: 'ISO8583:1987' }]} onChange={(value) => { if (value === 'ISO8583:1987' && !(form.getFieldValue('fieldDictionary')?.length)) form.setFieldsValue({ mtiEncoding: 'ASCII', bitmapEncoding: 'Binary', correlationFields: [], fieldDictionary: structuredClone(iso8583Ver1987Template) }); }} /></Form.Item>
    {messageProtocol === 'ISO8583:1987' && <>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 2fr', gap: 16 }}>
        <Form.Item name="mtiEncoding" label="MTI Encoding" rules={[{ required: true }]}><Select options={[{ label: 'ASCII', value: 'ASCII' }, { label: 'BCD', value: 'BCD' }]} /></Form.Item>
        <Form.Item name="bitmapEncoding" label="Bitmap Encoding" rules={[{ required: true }]}><Select options={[{ label: 'Binary', value: 'Binary' }, { label: 'ASCII Hex', value: 'ASCII Hex' }]} /></Form.Item>
        <Form.Item name="correlationFields" label="Correlation Fields"><Select mode="multiple" options={(form.getFieldValue('fieldDictionary') ?? []).map((item: { de: number; field: string }) => ({ label: `DE${item.de} · ${item.field}`, value: item.de }))} /></Form.Item>
      </div>
      <Form.List name="fieldDictionary">
        {(fields, { add, remove }) => <div style={{ border: '1px solid #f0f0f0', borderRadius: 6, overflow: 'hidden' }}>
          <div style={{ minHeight: 44, padding: '8px 12px', background: '#fafafa', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Space><Typography.Text strong>ISO 8583 field dictionary</Typography.Text><Tag>{fields.length} fields</Tag></Space>
            {!readOnly && <Button size="small" icon={<PlusOutlined />} onClick={() => add({ de: undefined, field: '', format: 'FIXED', chars: 'ans', length: '', coding: 'ASCII' })}>Add DE</Button>}
          </div>
          <div style={{ overflowX: 'auto', maxHeight: 440, overflowY: 'auto' }}>
            <div style={{ minWidth: 850 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '72px 1fr 110px 80px 100px 100px 40px', gap: 8, padding: '8px 12px', color: '#667085', fontSize: 12, fontWeight: 600 }}><span>DE</span><span>Field Name</span><span>Format</span><span>Chars</span><span>Length</span><span>Coding</span><span /></div>
              {fields.map(field => <div key={field.key} style={{ display: 'grid', gridTemplateColumns: '72px 1fr 110px 80px 100px 100px 40px', gap: 8, padding: '8px 12px', borderTop: '1px solid #f0f0f0', alignItems: 'start' }}>
                <Form.Item name={[field.name, 'de']} rules={[{ required: true }]} style={{ margin: 0 }}><InputNumber min={2} max={128} controls={false} size="small" style={{ width: '100%' }} /></Form.Item>
                <Form.Item name={[field.name, 'field']} rules={[{ required: true }]} style={{ margin: 0 }}><Input size="small" /></Form.Item>
                <Form.Item name={[field.name, 'format']} rules={[{ required: true }]} style={{ margin: 0 }}><Select size="small" options={formatOptions} /></Form.Item>
                <Form.Item name={[field.name, 'chars']} rules={[{ required: true }]} style={{ margin: 0 }}><Input size="small" /></Form.Item>
                <Form.Item name={[field.name, 'length']} rules={[{ required: true }]} style={{ margin: 0 }}><Input size="small" /></Form.Item>
                <Form.Item name={[field.name, 'coding']} rules={[{ required: true }]} style={{ margin: 0 }}><Select size="small" options={codingOptions} /></Form.Item>
                <Button type="text" danger size="small" icon={<DeleteOutlined />} disabled={readOnly} onClick={() => remove(field.name)} aria-label={`Delete field ${field.name + 1}`} />
              </div>)}
            </div>
          </div>
        </div>}
      </Form.List>
    </>}
  </div>;

  const lifecycle = <div style={{ padding: '16px 4px' }}>
    <Form.Item name="afterConnectEnabled" label="After Connection Established" valuePropName="checked"><Switch /></Form.Item>
    <Form.Item noStyle shouldUpdate={(previous, current) => previous.afterConnectEnabled !== current.afterConnectEnabled}>{({ getFieldValue }) => getFieldValue('afterConnectEnabled') && <div style={{ padding: 12, background: '#fafafa', border: '1px solid #f0f0f0', borderRadius: 6, marginBottom: 16 }}><Form.Item label="Behavior Type"><Select value="Send Request" disabled options={[{ label: 'Send Request', value: 'send-request' }]} /></Form.Item><Form.Item label="Request Configuration"><Input placeholder="Configure request message" disabled /></Form.Item></div>}</Form.Item>
    <Form.Item name="beforeCloseEnabled" label="Before Connection Close" valuePropName="checked"><Switch /></Form.Item>
    <Form.Item noStyle shouldUpdate={(previous, current) => previous.beforeCloseEnabled !== current.beforeCloseEnabled}>{({ getFieldValue }) => getFieldValue('beforeCloseEnabled') && <div style={{ padding: 12, background: '#fafafa', border: '1px solid #f0f0f0', borderRadius: 6 }}><Form.Item label="Behavior Type"><Select value="Send Request" disabled options={[{ label: 'Send Request', value: 'send-request' }]} /></Form.Item><Form.Item label="Request Configuration"><Input placeholder="Configure request message" disabled /></Form.Item></div>}</Form.Item>
  </div>;

  return <Drawer open={open} onClose={onClose} width={980} title={<Space><span>TCP Profile</span><Tag color="blue">Channel Resource</Tag></Space>} extra={!readOnly && <Button type="primary" onClick={() => void save()}>Save Profile</Button>}>
    <Form form={form} layout="vertical" disabled={readOnly}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, padding: '8px 4px 4px', borderBottom: '1px solid #f0f0f0' }}>
        <Form.Item name="name" label="Profile Name" rules={[{ required: true, message: 'Profile Name is required' }]}><Input placeholder="Enter profile name" /></Form.Item>
        <Form.Item label="Connection Lifetime"><Input value="Long-lived" disabled /></Form.Item>
      </div>
      <Tabs activeKey={activeTab} onChange={setActiveTab} items={[{ key: 'runtime', label: 'Connection Runtime', children: runtime }, { key: 'framing', label: 'Framing', children: framing }, { key: 'protocol', label: 'Message Protocol', children: protocol }, { key: 'lifecycle', label: 'Lifecycle Behaviors', children: lifecycle }]} />
    </Form>
  </Drawer>;
}

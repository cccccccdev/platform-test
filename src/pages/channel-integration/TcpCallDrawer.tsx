import { useEffect, useState } from 'react';
import { Button, Card, Cascader, ConfigProvider, Drawer, Form, Input, InputNumber, Modal, Radio, Select, Space, Switch, Tabs, Tag, Typography, message } from 'antd';
import { ArrowRightOutlined, DeleteOutlined } from '@ant-design/icons';
import { type TcpProfile, useChannelScopeStore } from './channelScopeStore';
import GroovyScriptEditor from './GroovyScriptEditor';
import { mappingOperationOptions } from './mappingOperationOptions';

const { Text } = Typography;

const EMPTY_TCP_PROFILES: TcpProfile[] = [];

type Props = {
  open: boolean;
  channelCode: string;
  initialValues?: Record<string, unknown>;
  readOnly?: boolean;
  onClose: () => void;
  onSave: (config: Record<string, unknown>) => void;
};

type FieldDirection = 'request' | 'response';

const inheritFieldSchema = <T extends { de: number }>(rows: T[], profile?: { fieldDictionary: Array<{ de: number; field: string; format: string; chars: string; length: string; coding: string }> }) =>
  rows.map(row => ({ ...row, ...(profile?.fieldDictionary.find(item => item.de === row.de) ?? {}) }));

const requestFields = [
  { de: 2, field: 'Primary Account Number', format: 'HLVAR', chars: 'n', length: '16..19', coding: 'BCD', source: ['SPI Request', 'spi.request.accountNumber'], operation: undefined, mandatory: true },
  { de: 3, field: 'Processing Code', format: 'FIXED', chars: 'n', length: '6', coding: 'BCD', source: ['Fixed Values', 'fixed.280000'], operation: undefined, mandatory: true },
  { de: 4, field: 'Amount Transaction', format: 'FIXED', chars: 'n', length: '12', coding: 'BCD', source: ['SPI Request', 'spi.request.amount'], operation: ['money', 'main-to-fractional'], mandatory: true },
  { de: 7, field: 'Transmission Date & Time', format: 'FIXED', chars: 'n', length: '10', coding: 'BCD', source: ['Generated Data', 'generated.current-timestamp'], operation: ['format', 'timestamp'], mandatory: true },
  { de: 11, field: 'System Trace Audit Number', format: 'FIXED', chars: 'n', length: '6', coding: 'BCD', source: ['Generated Data', 'generated.uuid'], operation: ['custom', 'custom'], mandatory: true },
  { de: 37, field: 'Retrieval Reference Number', format: 'FIXED', chars: 'an', length: '12', coding: 'ASCII', source: ['Generated Data', 'generated.uuid'], operation: ['custom', 'custom'], mandatory: true },
  { de: 47, field: 'Private Data', format: 'HLLVAR', chars: 'ans', length: '0..999', coding: 'ASCII', source: ['Generated Data', 'generated.script'], operation: ['custom', 'custom'], mandatory: false },
];

const responseFields = [
  { de: 2, field: 'Primary Account Number', format: 'HLVAR', chars: 'n', length: '16..19', coding: 'BCD', operation: undefined, target: 'SPI · response.accountNumber', mandatory: false },
  { de: 3, field: 'Processing Code', format: 'FIXED', chars: 'n', length: '6', coding: 'BCD', operation: undefined, target: 'SPI · response.processingCode', mandatory: false },
  { de: 11, field: 'System Trace Audit Number', format: 'FIXED', chars: 'n', length: '6', coding: 'BCD', operation: ['custom', 'custom'], target: 'Order Variable · trace', mandatory: true },
  { de: 37, field: 'Retrieval Reference Number', format: 'FIXED', chars: 'an', length: '12', coding: 'ASCII', operation: ['custom', 'custom'], target: 'SPI · response.responseReference', mandatory: true },
  { de: 39, field: 'Response Code', format: 'FIXED', chars: 'an', length: '2', coding: 'ASCII', operation: undefined, target: 'SPI · response.channelResponseCode', mandatory: true },
  { de: 47, field: 'Private Data', format: 'HLLVAR', chars: 'ans', length: '0..999', coding: 'ASCII', operation: ['custom', 'custom'], target: 'SPI · response.counterpartAccount', mandatory: false },
];

const sourceOptions = [
  { label: 'SPI Request', value: 'SPI Request', children: [
    { label: 'accountNumber', value: 'spi.request.accountNumber' },
    { label: 'amount', value: 'spi.request.amount' },
    { label: 'currency', value: 'spi.request.currency' },
    { label: 'reference', value: 'spi.request.reference' },
  ] },
  { label: 'Global Variables', value: 'Global Variables', children: [{ label: 'channelCode', value: 'global.channelCode' }] },
  { label: 'Order Variables', value: 'Order Variables', children: [{ label: 'requestReference', value: 'order.requestReference' }] },
  { label: 'Credentials', value: 'Credentials', children: [{ label: 'ZAK_KEY_REFERENCE', value: 'credential.ZAK_KEY_REFERENCE' }, { label: 'ZPK_KEY_REFERENCE', value: 'credential.ZPK_KEY_REFERENCE' }] },
  { label: 'Fixed Values', value: 'Fixed Values', children: [{ label: '280000', value: 'fixed.280000' }] },
  { label: 'Generated Data', value: 'Generated Data', children: [{ label: 'Current Timestamp', value: 'generated.current-timestamp' }, { label: 'UUID', value: 'generated.uuid' }, { label: 'Script', value: 'generated.script' }] },
];
const targetOptions = [
  { label: 'SPI · response.channelResponseCode', value: 'SPI · response.channelResponseCode' },
  { label: 'SPI · response.responseReference', value: 'SPI · response.responseReference' },
  { label: 'SPI · response.counterpartAccount', value: 'SPI · response.counterpartAccount' },
  { label: 'Order Variable · trace', value: 'Order Variable · trace' },
];
function fieldGrid(direction: FieldDirection) {
  return direction === 'request'
    ? '220px 20px 130px 20px 58px minmax(150px, 1fr) 82px 55px 75px 78px 80px 32px'
    : '58px 20px minmax(150px, 1fr) 82px 55px 75px 78px 80px 140px 20px 220px 32px';
}

function FieldMappingList({ direction, readOnly }: { direction: FieldDirection; readOnly: boolean }) {
  const name = direction === 'request' ? 'requestFields' : 'responseFields';
  const rows = direction === 'request' ? requestFields : responseFields;
  const form = Form.useFormInstance();
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [scriptName, setScriptName] = useState<string | null>(null);

  const move = (from: number, to: number) => {
    if (from === to) return;
    const current = [...(form.getFieldValue(name) ?? rows)];
    const [moved] = current.splice(from, 1);
    current.splice(to, 0, moved);
    form.setFieldsValue({ [name]: current });
  };

  return <Form.List name={name} initialValue={rows}>
    {(fields, { remove }) => <Card size="small" title={<Space><Text strong>{direction === 'request' ? 'Source Value → DE Mapping' : 'DE → Target Value Mapping'}</Text><Tag>{fields.length} selected</Tag></Space>} extra={<Text type="secondary">Schema inherited from TCP Profile</Text>}>
      <div style={{ overflowX: 'auto' }}>
        <div style={{ minWidth: direction === 'request' ? 1130 : 1050 }}>
          <div style={{ display: 'grid', gridTemplateColumns: fieldGrid(direction), gap: 8, alignItems: 'center', padding: '0 8px 7px', color: '#667085', fontSize: 12, fontWeight: 600 }}>
            {direction === 'request' ? <><span>Source Value</span><span /><span>Operation</span><span /><span>DE</span><span>Field</span></> : <><span>DE</span><span /><span>Field</span></>}
            <span>Format</span><span>Chars</span><span>Length</span><span>Coding</span><span>Mandatory</span><span />
            {direction === 'response' && <><span>Operation</span><span /><span>Target Value</span><span /></>}
          </div>
          {fields.map((field, index) => <div key={field.key} draggable onDragStart={() => setDragIndex(index)} onDragOver={(event) => { if (dragIndex !== null) event.preventDefault(); }} onDrop={(event) => { event.preventDefault(); if (dragIndex !== null) move(dragIndex, index); setDragIndex(null); }} onDragEnd={() => setDragIndex(null)} style={{ display: 'grid', gridTemplateColumns: fieldGrid(direction), gap: 8, alignItems: 'start', padding: '9px 8px', borderTop: '1px solid #f0f0f0', background: dragIndex === index ? '#e6f4ff' : '#fff' }}>
            {direction === 'request' ? <>
              <Form.Item {...field} name={[field.name, 'source']} rules={[{ required: true }]} style={{ margin: 0 }}><Cascader size="small" showSearch options={sourceOptions} placeholder="Source Value" /></Form.Item>
              <ArrowRightOutlined style={{ color: '#8c8c8c', marginTop: 8 }} />
              <Form.Item {...field} name={[field.name, 'operation']} style={{ margin: 0 }}><Cascader size="small" allowClear options={mappingOperationOptions} placeholder="Select operation" /></Form.Item>
              <ArrowRightOutlined style={{ color: '#8c8c8c', marginTop: 8 }} />
              <Form.Item {...field} name={[field.name, 'de']} style={{ margin: 0 }}><InputNumber size="small" disabled style={{ width: '100%' }} /></Form.Item>
              <Form.Item {...field} name={[field.name, 'field']} style={{ margin: 0 }}><Input size="small" disabled /></Form.Item>
            </> : <>
              <Form.Item {...field} name={[field.name, 'de']} style={{ margin: 0 }}><InputNumber size="small" disabled style={{ width: '100%' }} /></Form.Item>
              <ArrowRightOutlined style={{ color: '#8c8c8c', marginTop: 8 }} />
              <Form.Item {...field} name={[field.name, 'field']} style={{ margin: 0 }}><Input size="small" disabled /></Form.Item>
            </>}
            <Form.Item {...field} name={[field.name, 'format']} style={{ margin: 0 }}><Input size="small" disabled /></Form.Item>
            <Form.Item {...field} name={[field.name, 'chars']} style={{ margin: 0 }}><Input size="small" disabled /></Form.Item>
            <Form.Item {...field} name={[field.name, 'length']} style={{ margin: 0 }}><Input size="small" disabled /></Form.Item>
            <Form.Item {...field} name={[field.name, 'coding']} style={{ margin: 0 }}><Input size="small" disabled /></Form.Item>
            <Form.Item {...field} name={[field.name, 'mandatory']} valuePropName="checked" style={{ margin: '4px 0 0' }}><Switch size="small" /></Form.Item>
            {direction === 'response' && <>
              <Form.Item {...field} name={[field.name, 'operation']} style={{ margin: 0 }}><Cascader size="small" options={mappingOperationOptions} placeholder="Select operation" /></Form.Item>
              <ArrowRightOutlined style={{ color: '#8c8c8c', marginTop: 8 }} />
              <Form.Item {...field} name={[field.name, 'target']} rules={[{ required: true }]} style={{ margin: 0 }}><Select size="small" showSearch options={targetOptions} placeholder="Target Value" /></Form.Item>
              <Button type="text" danger icon={<DeleteOutlined />} disabled={readOnly} aria-label={`Delete response DE ${index + 1}`} onClick={() => remove(field.name)} />
            </>}
            {direction === 'request' && <div style={{ display: 'flex', alignItems: 'center' }}><Button type="text" danger icon={<DeleteOutlined />} disabled={readOnly} aria-label={`Delete DE ${index + 1}`} onClick={() => remove(field.name)} /><Form.Item noStyle shouldUpdate={(previous, current) => previous.requestFields?.[field.name]?.source !== current.requestFields?.[field.name]?.source}>
              {({ getFieldValue }) => String(getFieldValue([name, field.name, 'source']) ?? '').includes('Script') && <Button type="link" size="small" onClick={() => setScriptName('Generated Data Script')}>Edit</Button>}
            </Form.Item></div>}
          </div>)}
        </div>
      </div>
      <Modal title={scriptName} open={Boolean(scriptName)} onCancel={() => setScriptName(null)} footer={null} width={760}><GroovyScriptEditor name="generatedDataScript" helpText="Return the complete encoded DE value." /></Modal>
    </Card>}
  </Form.List>;
}

function SecurityPanel({ direction }: { direction: FieldDirection }) {
  const request = direction === 'request';
  return <Card size="small"><div style={{ border: '1px solid #f0f0f0', borderRadius: 6, overflow: 'hidden' }}>
    <div style={{ padding: '12px 14px', borderBottom: '1px solid #f0f0f0' }}><Space><Switch size="small" defaultChecked /><Text strong>{request ? 'MAC Generation' : 'MAC Verification'}</Text></Space>{request ? <div style={{ marginTop: 10, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}><Form.Item label="MAC Field" name="macField" initialValue="DE128"><Select options={[{ label: 'DE128', value: 'DE128' }]} /></Form.Item><Form.Item label="Key Reference" name="macKeyReference" initialValue="Credential · ZAK_KEY_REFERENCE"><Select options={[{ label: 'Credential · ZAK_KEY_REFERENCE', value: 'Credential · ZAK_KEY_REFERENCE' }]} /></Form.Item></div> : <Text type="secondary" style={{ display: 'block', marginTop: 8 }}>Verify the received MAC before mapping the response.</Text>}</div>
    <div style={{ padding: '12px 14px' }}><Space><Switch size="small" /><Text strong>{request ? 'PIN Block Encryption' : 'PIN Block Decryption'}</Text></Space>{request && <div style={{ marginTop: 10 }}><Form.Item label="Key Reference" name="pinKeyReference"><Select placeholder="Select key reference" options={[{ label: 'Credential · ZPK_KEY_REFERENCE', value: 'Credential · ZPK_KEY_REFERENCE' }]} /></Form.Item></div>}</div>
  </div></Card>;
}

export default function TcpCallDrawer({ open, channelCode, initialValues, readOnly = false, onClose, onSave }: Props) {
  const [form] = Form.useForm();
  const [activeTab, setActiveTab] = useState('request');
  const profiles = useChannelScopeStore(state => state.tcpProfilesByChannel[channelCode]) ?? EMPTY_TCP_PROFILES;
  const selectedProfileId = Form.useWatch('profileId', form);
  const selectedProfile = profiles.find(profile => profile.id === selectedProfileId);
  const responseCodeMode = Form.useWatch('responseCodeMode', form) ?? 'default';
  const responseCodeAssembly = Form.useWatch('responseCodeAssembly', form) ?? ['DE39', 'DE47'];

  useEffect(() => {
    if (!open) return;
    const initialProfileId = String(initialValues?.profileId ?? profiles[0]?.id ?? '');
    const initialProfile = profiles.find(profile => profile.id === initialProfileId);
    form.resetFields();
    form.setFieldsValue({
      requestName: 'wallet_payout_request',
      profileId: initialProfileId,
      requestMTI: '0100',
      responseMTI: '0110',
      responseCodeMode: 'default',
      responseCodeAssembly: ['DE39', 'DE47'],
      requestFields: inheritFieldSchema(requestFields, initialProfile),
      responseFields: inheritFieldSchema(responseFields, initialProfile),
      ...initialValues,
    });
  }, [form, initialValues, open, profiles]);

  const save = async () => {
    const values = await form.validateFields();
    onSave({ ...values, protocol: 'TCP', bitmap: 'auto-generated' });
    message.success('tcpCall configuration saved');
  };

  const requestFieldsPanel = <>
    <Card size="small" style={{ marginBottom: 12 }}><div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}><Form.Item label="Request MTI" name="requestMTI"><Input /></Form.Item><Form.Item label="Bitmap"><Input value="Auto-generated" disabled /></Form.Item></div></Card>
    <FieldMappingList direction="request" readOnly={readOnly} />
  </>;
  const responseFieldsPanel = <>
    <Card size="small" style={{ marginBottom: 12 }}><div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}><Form.Item label="Expected Response MTI" name="responseMTI"><Input /></Form.Item><Form.Item label="Correlation Rule"><Input disabled value={selectedProfile ? selectedProfile.correlationFields.map(de => `DE${de}`).join(' + ') : 'Select a TCP Profile'} /></Form.Item></div></Card>
    <FieldMappingList direction="response" readOnly={readOnly} />
  </>;

  const framingSummary = selectedProfile?.framingType === 'length-prefix'
    ? `${selectedProfile.frameHeaderSize === '2-bytes' ? '2-byte' : 'Length'} Length Prefix · ${selectedProfile.frameByteOrder === 'little-endian' ? 'Little Endian' : 'Big Endian'}`
    : 'Inherited from TCP Profile';
  const messageOptions = <Card size="small"><div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}><Form.Item label="Message Protocol"><Input value={selectedProfile?.messageProtocol === 'ISO8583:1987' ? 'ISO 8583:1987' : 'Inherited from TCP Profile'} disabled /></Form.Item><Form.Item label="Framing"><Input value={framingSummary} disabled /></Form.Item><Form.Item label="Field Order"><Input value="Ascending DE Number" disabled /></Form.Item><Form.Item label="Validation"><Space><Switch defaultChecked disabled /><span>Validate against Profile field dictionary</span></Space></Form.Item></div></Card>;
  const responseCode = <Card size="small"><Form.Item label="Component Instance" name="responseFallback"><Select options={[{ label: 'FAIL', value: 'FAIL' }, { label: 'PENDING', value: 'PENDING' }]} /></Form.Item><Form.Item label="Assembly Mode" name="responseCodeMode"><Radio.Group optionType="button" buttonStyle="solid" options={[{ label: 'Default', value: 'default' }, { label: 'Custom', value: 'custom' }]} /></Form.Item>{responseCodeMode === 'custom' ? <GroovyScriptEditor name="responseCodeScript" helpText="Return the assembled response code from the selected ISO 8583 DE values." /> : <><Form.Item label="Response Code Assembly" name="responseCodeAssembly"><Select mode="multiple" placeholder="Select DEs in assembly order" options={responseFields.map((field) => ({ label: `DE${field.de}`, value: `DE${field.de}` }))} /></Form.Item><div style={{ marginTop: -4, marginBottom: 12 }}>{(responseCodeAssembly as string[]).map((de) => { const field = responseFields.find((item) => `DE${item.de}` === de); return <div key={de} style={{ color: '#8c8c8c', fontSize: 12, lineHeight: 1.8 }}><Tag style={{ marginRight: 6 }}>{de}</Tag>{field?.field ?? 'Field name unavailable'}</div>; })}</div></>}<Form.Item label="Response Message Field" name="responseMessageField"><Input placeholder="Optional SPI response field" /></Form.Item></Card>;

  return <Drawer title={<Space><span>Configure TCP Call</span><Tag color="blue">tcpCall</Tag></Space>} width="min(1180px, 92vw)" open={open} onClose={onClose} destroyOnClose extra={!readOnly && <Space><Button onClick={onClose}>Cancel</Button><Button type="primary" onClick={() => void save()}>Save</Button></Space>}>
    <ConfigProvider componentSize="middle" theme={{ token: { fontSize: 14, controlHeight: 32, borderRadius: 5, paddingSM: 10, marginSM: 10, marginXS: 6 }, components: { Form: { itemMarginBottom: 10 }, Card: { bodyPadding: 12, headerHeight: 36 }, Tabs: { horizontalMargin: '0 0 10px 0' } } }}>
      <div style={{ fontSize: 14 }}><Form form={form} disabled={readOnly} layout="vertical">
        <Card size="small" style={{ marginBottom: 14 }}><div style={{ display: 'grid', gridTemplateColumns: 'minmax(260px, 1fr) minmax(300px, 1fr)', gap: 10 }}><Form.Item label="Request Name" name="requestName" rules={[{ required: true }]}><Input /></Form.Item><Form.Item label="TCP Profile" name="profileId" rules={[{ required: true }]}><Select placeholder="Select TCP Profile" options={profiles.map(profile => ({ label: profile.name, value: profile.id }))} onChange={(profileId) => { const nextProfile = profiles.find(profile => profile.id === profileId); form.setFieldsValue({ requestFields: inheritFieldSchema(form.getFieldValue('requestFields') ?? requestFields, nextProfile), responseFields: inheritFieldSchema(form.getFieldValue('responseFields') ?? responseFields, nextProfile) }); }} /></Form.Item></div>{selectedProfile && <Space wrap><Tag color="blue">{selectedProfile.messageProtocol === 'ISO8583:1987' ? 'ISO 8583:1987' : 'Raw / Custom'}</Tag><Tag>2-byte length prefix · big-endian</Tag><Tag>Correlation: {selectedProfile.correlationFields.map(de => `DE${de}`).join(' + ')}</Tag></Space>}</Card>
        <Tabs activeKey={activeTab} onChange={setActiveTab} items={[{ key: 'request', label: 'Request', children: <Tabs size="small" tabBarGutter={16} type="line" items={[{ key: 'request-fields', label: 'Fields & Mapping', children: requestFieldsPanel }, { key: 'request-security', label: 'Security', children: <SecurityPanel direction="request" /> }, { key: 'request-options', label: 'Message Options', children: messageOptions }]} /> }, { key: 'response', label: 'Response', children: <Tabs size="small" tabBarGutter={16} type="line" items={[{ key: 'response-fields', label: 'Fields & Mapping', children: responseFieldsPanel }, { key: 'response-security', label: 'Security', children: <SecurityPanel direction="response" /> }, { key: 'response-code', label: 'Response Code', children: responseCode }]} /> }]} />
      </Form></div>
    </ConfigProvider>
  </Drawer>;
}

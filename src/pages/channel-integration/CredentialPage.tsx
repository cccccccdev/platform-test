import { useMemo, useState } from 'react';
import { Breadcrumb, Button, Card, Form, Input, Modal, Space, Tag, Typography, message } from 'antd';
import { InfoCircleOutlined, PlusOutlined } from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import { Brand, UserProfile } from '../../components/PlatformChrome';

const { Text, Title } = Typography;

const initialFields = ['public', 'private', 'enKey', 'deKey'];

export default function CredentialPage() {
  const { channelCode = '' } = useParams();
  const navigate = useNavigate();
  const [fields, setFields] = useState(initialFields);
  const [configOpen, setConfigOpen] = useState(false);
  const [version, setVersion] = useState('20260820063329');
  const [operationTime, setOperationTime] = useState('2026-08-20 06:33:29');
  const [form] = Form.useForm<{ newFields: { name?: string }[] }>();

  const normalizedChannel = useMemo(() => channelCode || '-', [channelCode]);

  const openConfig = () => {
    form.setFieldsValue({ newFields: [] });
    setConfigOpen(true);
  };

  const submitConfig = async () => {
    const values = await form.validateFields();
    const additions = (values.newFields ?? [])
      .map((item) => item?.name?.trim())
      .filter((item): item is string => Boolean(item));
    const duplicate = additions.find((item, index) => fields.includes(item) || additions.indexOf(item) !== index);
    if (duplicate) {
      message.error(`Credential field already exists: ${duplicate}`);
      return;
    }
    if (additions.length) setFields((current) => [...current, ...additions]);
    const now = new Date();
    const pad = (value: number) => String(value).padStart(2, '0');
    const nextVersion = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
    setVersion(nextVersion);
    setOperationTime(`${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`);
    setConfigOpen(false);
    form.resetFields();
    message.success(additions.length ? 'Credential fields added' : 'Credential configuration submitted');
  };

  return (
    <div className="channel-list-shell">
      <aside className="channel-list-sidebar">
        <div className="legacy-sidebar-brand" onClick={() => navigate('/home')}><Brand /></div>
        <div className="legacy-sidebar-section">Channel Integration <span>⌃</span></div>
        <div className="channel-list-active" onClick={() => navigate('/channel-integration')}>Channel List</div>
      </aside>
      <div className="channel-list-main">
        <header className="legacy-header"><UserProfile /></header>
        <div className="legacy-page-heading">
          <Breadcrumb items={[{ title: 'Channel Integration' }, { title: 'Channel List' }, { title: 'Credential' }]} />
          <h1>Credential</h1>
        </div>
        <main className="channel-list-content">
          <Card styles={{ body: { padding: 24 } }}>
            <div style={{ marginBottom: 18 }}><Text strong>Channel: </Text><Text>{normalizedChannel}</Text></div>
            <div style={{ border: '1px solid #c084e8', background: '#f3e5f8', padding: '18px 20px', marginBottom: 20 }}>
              <Space align="start" size={14}>
                <InfoCircleOutlined style={{ color: '#6d00b9', fontSize: 22, marginTop: 2 }} />
                <div>
                  <Text strong style={{ fontSize: 15 }}>Guidance</Text>
                  <ol style={{ margin: '12px 0 0', paddingLeft: 22, lineHeight: 1.9, color: '#262626' }}>
                    <li>Create the required credential field names for the channel on this page, such as username and password.</li>
                    <li>Credentials refer to information that must be sent when requesting the channel and may vary based on different parties.</li>
                    <li>The actual values of the credentials should be maintained on the party-related page.</li>
                    <li>Credential field names cannot be edited or deleted after creation.</li>
                    <li>If an error occurs during creation, please add a new record to make corrections.</li>
                  </ol>
                </div>
              </Space>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 32, flexWrap: 'wrap', marginBottom: 16 }}>
              <span><Text>Configuration Version: </Text><Tag color="green">{version}</Tag></span>
              <span><Text>Operator: </Text><Text>张爱伟</Text></span>
              <span style={{ marginLeft: 'auto' }}><Text>Operation Time: </Text><Text>{operationTime}</Text></span>
              <Space>
                <Button type="primary" onClick={openConfig}>Config</Button>
                <Button type="primary" onClick={() => message.info('Credential Log is not included in the current Demo scope.')}>Log</Button>
              </Space>
            </div>

            <div style={{ border: '1px solid #f0f0f0' }}>
              <div style={{ padding: '13px 16px', background: '#fafafa', fontWeight: 600 }}>Credential Field</div>
              {fields.map((field) => <div key={field} style={{ padding: '15px 16px', borderTop: '1px solid #f0f0f0' }}>{field}</div>)}
            </div>
          </Card>
        </main>
      </div>

      <Modal
        title={<Title level={4} style={{ margin: 0 }}>Config Credential</Title>}
        open={configOpen}
        onCancel={() => { setConfigOpen(false); form.resetFields(); }}
        onOk={() => void submitConfig()}
        okText="Submit"
        cancelText="Cancel"
        width={560}
      >
        <div style={{ paddingTop: 16 }}>
          <Space direction="vertical" size={12} style={{ width: '100%', marginBottom: 16 }}>
            {fields.map((field) => <Input key={field} value={field} disabled />)}
          </Space>
          <Form form={form} layout="vertical">
            <Form.List name="newFields">
              {(items, { add, remove }) => (
                <>
                  <Space direction="vertical" size={12} style={{ width: '100%' }}>
                    {items.map((item) => (
                      <Space.Compact key={item.key} style={{ width: '100%' }}>
                        <Form.Item {...item} name={[item.name, 'name']} style={{ flex: 1, margin: 0 }} rules={[{ required: true, message: 'Please enter a credential field name.' }]}>
                          <Input placeholder="Credential field name" />
                        </Form.Item>
                        <Button danger onClick={() => remove(item.name)}>Remove</Button>
                      </Space.Compact>
                    ))}
                  </Space>
                  <Button block type="dashed" icon={<PlusOutlined />} onClick={() => add()} style={{ marginTop: 16 }}>Add field</Button>
                </>
              )}
            </Form.List>
          </Form>
        </div>
      </Modal>
    </div>
  );
}

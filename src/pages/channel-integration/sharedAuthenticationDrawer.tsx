import { useEffect } from 'react';
import { Drawer, Button, Modal, Form, Input, Select, Space, message } from 'antd';
import { useChannelScopeStore } from './channelScopeStore';
import type { AuthConfig, AuthType } from './channelScopeStore';

interface Props {
  visible: boolean;
  channelCode: string;
  auth: AuthConfig | null;
  onSave?: (auth: AuthConfig) => void;
  onClose: () => void;
}

const authTypeOptions = [
  { label: 'Basic Auth', value: 'basic' },
  { label: 'Bearer Token', value: 'bearer' },
  { label: 'Custom Auth', value: 'custom' },
  { label: 'OAuth 2', value: 'oauth2' },
];

export default function AuthenticationDrawer({ visible, channelCode, auth, onSave, onClose }: Props) {
  const [form] = Form.useForm();
  const addAuthentication = useChannelScopeStore((s) => s.addAuthentication);
  const credentials = useChannelScopeStore((s) => s.credentialsByChannel[channelCode] ?? []);

  useEffect(() => {
    if (visible) {
      if (auth) {
        form.setFieldsValue({
          name: auth.name,
          type: auth.type,
          username: auth.credentials?.username,
          password: auth.credentials?.password,
          token: auth.credentials?.token,
          customHeader: auth.credentials?.customHeader,
          customValue: auth.credentials?.customValue,
          clientId: auth.credentials?.clientId,
          clientSecret: auth.credentials?.clientSecret,
          authorizationUrl: auth.credentials?.authorizationUrl,
          scopes: auth.credentials?.scopes,
        });
      } else {
        form.resetFields();
      }
    }
  }, [visible, auth, form]);

  const handleSave = async () => {
    const values = await form.validateFields().catch(() => undefined);
    if (!values) return;

    const authType = values.type as AuthType;
    let creds: Record<string, string> = {};

    switch (authType) {
      case 'basic':
        creds = { username: values.username || '', password: values.password || '' };
        break;
      case 'bearer':
        creds = { token: values.token || '' };
        break;
      case 'custom':
        creds = { customHeader: values.customHeader || '', customValue: values.customValue || '' };
        break;
      case 'oauth2':
        creds = {
          clientId: values.clientId || '',
          clientSecret: values.clientSecret || '',
          authorizationUrl: values.authorizationUrl || '',
          scopes: values.scopes || '',
        };
        break;
    }

    const now = new Date().toLocaleString();
    if (auth) {
      Modal.confirm({
        title: 'Confirmation',
        content: 'After modifying Auth settings, you need to update all associated flows referencing this auth method and publish changes for the new configuration to take effect.',
        okText: 'Confirm',
        onOk: () => {
          useChannelScopeStore.getState().updateAuthentication(channelCode, auth.id, {
            name: values.name,
            type: authType,
            credentials: creds,
            operator: 'admin',
            operationTime: now,
          });
          message.success('Authentication updated');
          onClose();
        },
      });
    } else {
      const newAuth: AuthConfig = {
        id: `auth_${Date.now()}`,
        name: values.name,
        type: authType,
        version: 1,
        credentials: creds,
        operator: 'admin',
        operationTime: now,
      };
      addAuthentication(channelCode, newAuth);
      onSave?.(newAuth);
      message.success('Authentication added');
      onClose();
    }
  };

  const getAuthFieldsByType = (type: AuthType | undefined) => {
    switch (type) {
      case 'basic':
        return (
          <>
            <Form.Item label="Username" name="username" rules={[{ required: true, message: 'Please select credential key' }]}>
              <Select placeholder="select credential key">
                {credentials.map((c) => <Select.Option key={c.id} value={c.key}>{c.key}</Select.Option>)}
              </Select>
            </Form.Item>
            <Form.Item label="Password" name="password" rules={[{ required: true, message: 'Please select credential key' }]}>
              <Select placeholder="select credential key">
                {credentials.map((c) => <Select.Option key={c.id} value={c.key}>{c.key}</Select.Option>)}
              </Select>
            </Form.Item>
          </>
        );
      case 'bearer':
        return (
          <Form.Item label="Token" name="token" rules={[{ required: true, message: 'Please select credential key' }]}>
            <Select placeholder="select credential key">
              {credentials.map((c) => <Select.Option key={c.id} value={c.key}>{c.key}</Select.Option>)}
            </Select>
          </Form.Item>
        );
      case 'custom':
        return (
          <>
            <Form.Item label="Header Name" name="customHeader" rules={[{ required: true, message: 'Please enter header name' }]}>
              <Input placeholder="e.g. X-API-Key" />
            </Form.Item>
            <Form.Item label="Header Value" name="customValue" rules={[{ required: true, message: 'Please select credential key' }]}>
              <Select placeholder="select credential key">
                {credentials.map((c) => <Select.Option key={c.id} value={c.key}>{c.key}</Select.Option>)}
              </Select>
            </Form.Item>
          </>
        );
      case 'oauth2':
        return (
          <>
            <Form.Item label="Client ID" name="clientId" rules={[{ required: true, message: 'Please select credential key' }]}>
              <Select placeholder="select credential key">
                {credentials.map((c) => <Select.Option key={c.id} value={c.key}>{c.key}</Select.Option>)}
              </Select>
            </Form.Item>
            <Form.Item label="Client Secret" name="clientSecret" rules={[{ required: true, message: 'Please select credential key' }]}>
              <Select placeholder="select credential key">
                {credentials.map((c) => <Select.Option key={c.id} value={c.key}>{c.key}</Select.Option>)}
              </Select>
            </Form.Item>
            <Form.Item label="Authorization URL" name="authorizationUrl" rules={[{ required: true, message: 'Please enter authorization URL' }]}>
              <Input placeholder="enter authorization URL" />
            </Form.Item>
            <Form.Item label="Scopes" name="scopes">
              <Input placeholder="e.g. read write" />
            </Form.Item>
          </>
        );
      default:
        return <div style={{ color: '#999', fontSize: 12 }}>Select an auth type first</div>;
    }
  };

  return (
    <Drawer
      title={auth ? 'Edit Auth' : 'Create Auth'}
      placement="right"
      width={500}
      open={visible}
      onClose={onClose}
      extra={
        <Space>
          <Button onClick={onClose}>Cancel</Button>
          <Button type="primary" onClick={handleSave}>Save</Button>
        </Space>
      }
    >
      <Form form={form} layout="vertical">
        <Form.Item label="Auth Name" name="name" rules={[{ required: true, message: 'Please enter auth name' }]}>
          <Input placeholder="e.g. My API Key" />
        </Form.Item>
        <Form.Item label="Auth Type" name="type" rules={[{ required: true, message: 'Please select auth type' }]}>
          <Select placeholder="select auth type" options={authTypeOptions} />
        </Form.Item>
        <div style={{ borderTop: '1px solid #f0f0f0', paddingTop: 16, marginTop: 8 }}>
          <Form.Item noStyle shouldUpdate={(prev, curr) => prev.type !== curr.type}>
            {({ getFieldValue }) => getAuthFieldsByType(getFieldValue('type') as AuthType)}
          </Form.Item>
        </div>
      </Form>
    </Drawer>
  );
}

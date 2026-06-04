import { useState, useEffect } from 'react';
import { Breadcrumb, Typography, Table, Button, Space, Modal, Form, Input, Select, Tag, message } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import { mockCredentials } from '../../mock/data';

const { Title } = Typography;

type AuthType = 'basic' | 'bearer' | 'custom' | 'oauth2';

interface AuthConfig {
  id: string;
  name: string;
  type: AuthType;
  version: number;
  credentials?: Record<string, string>;
  operator: string;
  operationTime: string;
}

const authTypeLabels: Record<AuthType, string> = {
  basic: 'Basic Auth',
  bearer: 'Bearer Token',
  custom: 'Custom Auth',
  oauth2: 'OAuth 2',
};

const authTypeColors: Record<AuthType, string> = {
  basic: 'blue',
  bearer: 'green',
  custom: 'purple',
  oauth2: 'orange',
};

export default function AuthenticationPage() {
  const { channelCode } = useParams<{ channelCode: string }>();
  const navigate = useNavigate();
  const [authConfigs, setAuthConfigs] = useState<AuthConfig[]>([]);
  const [credentials, setCredentials] = useState<Array<{ id: string; key: string }>>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAuth, setEditingAuth] = useState<AuthConfig | null>(null);
  const [form] = Form.useForm();

  // Load credentials when channelCode changes
  useEffect(() => {
    if (channelCode) {
      setCredentials(mockCredentials[channelCode] || []);
    }
  }, [channelCode]);

  const handleAddAuth = () => {
    setEditingAuth(null);
    form.resetFields();
    setIsModalOpen(true);
  };

  const handleEditAuth = (auth: AuthConfig) => {
    setEditingAuth(auth);
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
    setIsModalOpen(true);
  };

  const handleDeleteAuth = (id: string) => {
    setAuthConfigs(prev => prev.filter(a => a.id !== id));
    message.success('Deleted successfully', 2);
  };

  const handleModalOk = () => {
    form.validateFields().then(values => {
      const authType = values.type as AuthType;
      let credentials: Record<string, string> = {};

      switch (authType) {
        case 'basic':
          credentials = { username: values.username || '', password: values.password || '' };
          break;
        case 'bearer':
          credentials = { token: values.token || '' };
          break;
        case 'custom':
          credentials = { customHeader: values.customHeader || '', customValue: values.customValue || '' };
          break;
        case 'oauth2':
          credentials = {
            clientId: values.clientId || '',
            clientSecret: values.clientSecret || '',
            authorizationUrl: values.authorizationUrl || '',
            scopes: values.scopes || '',
          };
          break;
      }

      // Show strong confirmation modal
      Modal.confirm({
        title: 'Confirmation',
        content: 'After modifying Auth settings, you need to update all associated flows referencing this auth method and publish changes for the new configuration to take effect.',
        okText: 'Confirm',
        cancelText: undefined,
        onOk: () => {
          const now = new Date().toLocaleString();
          if (editingAuth) {
            // Increment version when modifying
            setAuthConfigs(prev => prev.map(a =>
              a.id === editingAuth.id
                ? { ...a, name: values.name, type: authType, version: a.version + 1, credentials, operator: 'admin', operationTime: now }
                : a
            ));
          } else {
            const newAuth: AuthConfig = {
              id: `auth_${Date.now()}`,
              name: values.name,
              type: authType,
              version: 1,
              credentials,
              operator: 'admin',
              operationTime: now,
            };
            setAuthConfigs(prev => [...prev, newAuth]);
          }
          setIsModalOpen(false);
        },
      });
    });
  };

  const handleModalCancel = () => {
    setIsModalOpen(false);
    form.resetFields();
  };

  const getAuthFieldsByType = (type: AuthType) => {
    switch (type) {
      case 'basic':
        return (
          <>
            <Form.Item label="Username" name="username" rules={[{ required: true, message: 'Please select username' }]}>
              <Select placeholder="select credential key">
                {credentials.map(c => (
                  <Select.Option key={c.id} value={c.key}>{c.key}</Select.Option>
                ))}
              </Select>
            </Form.Item>
            <Form.Item label="Password" name="password" rules={[{ required: true, message: 'Please select password' }]}>
              <Select placeholder="select credential key">
                {credentials.map(c => (
                  <Select.Option key={c.id} value={c.key}>{c.key}</Select.Option>
                ))}
              </Select>
            </Form.Item>
          </>
        );
      case 'bearer':
        return (
          <Form.Item label="Token" name="token" rules={[{ required: true, message: 'Please select token' }]}>
            <Select placeholder="select credential key">
              {credentials.map(c => (
                <Select.Option key={c.id} value={c.key}>{c.key}</Select.Option>
              ))}
            </Select>
          </Form.Item>
        );
      case 'custom':
        return (
          <>
            <Form.Item label="Header Name" name="customHeader" rules={[{ required: true, message: 'Please enter header name' }]}>
              <Input placeholder="e.g. X-API-Key" />
            </Form.Item>
            <Form.Item label="Header Value" name="customValue" rules={[{ required: true, message: 'Please select header value' }]}>
              <Select placeholder="select credential key">
                {credentials.map(c => (
                  <Select.Option key={c.id} value={c.key}>{c.key}</Select.Option>
                ))}
              </Select>
            </Form.Item>
          </>
        );
      case 'oauth2':
        return (
          <>
            <Form.Item label="Client ID" name="clientId" rules={[{ required: true, message: 'Please select client ID' }]}>
              <Select placeholder="select credential key">
                {credentials.map(c => (
                  <Select.Option key={c.id} value={c.key}>{c.key}</Select.Option>
                ))}
              </Select>
            </Form.Item>
            <Form.Item label="Client Secret" name="clientSecret" rules={[{ required: true, message: 'Please select client secret' }]}>
              <Select placeholder="select credential key">
                {credentials.map(c => (
                  <Select.Option key={c.id} value={c.key}>{c.key}</Select.Option>
                ))}
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
        return null;
    }
  };

  const columns = [
    {
      title: 'Version',
      dataIndex: 'version',
      key: 'version',
      width: 80,
    },
    {
      title: 'Auth Name',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: 'Auth Type',
      dataIndex: 'type',
      key: 'type',
      render: (type: AuthType) => (
        <Tag color={authTypeColors[type]}>{authTypeLabels[type]}</Tag>
      ),
    },
    {
      title: 'Operator',
      dataIndex: 'operator',
      key: 'operator',
      width: 120,
    },
    {
      title: 'Operation Time',
      dataIndex: 'operationTime',
      key: 'operationTime',
      width: 180,
    },
    {
      title: 'Operation',
      key: 'operation',
      width: 100,
      render: (_: any, record: AuthConfig) => (
        <Button type="link" size="small" onClick={() => handleEditAuth(record)}>
          Modify
        </Button>
      ),
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <Breadcrumb
        style={{ marginBottom: 16 }}
        items={[
          { title: 'Channel Integration', onClick: () => navigate('/channel-integration') },
          { title: channelCode },
          { title: 'Authentication' },
        ]}
      />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <Title level={4} style={{ margin: 0 }}>Authentication Configuration</Title>
          <div style={{ marginTop: 8, color: '#666' }}>Channel: <span style={{ fontWeight: 600 }}>{channelCode}</span></div>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAddAuth}>
          Create Auth
        </Button>
      </div>

      <Table
        dataSource={authConfigs}
        columns={columns}
        rowKey="id"
        pagination={false}
        locale={{ emptyText: 'No authentication configurations. Click "Add Auth Config" to create one.' }}
      />

      <Modal
        title={editingAuth ? 'Edit Auth' : 'Create Auth'}
        open={isModalOpen}
        onOk={handleModalOk}
        onCancel={handleModalCancel}
        okText="Submit"
        cancelText="Cancel"
        width={500}
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item label="Auth Name" name="name" rules={[{ required: true, message: 'Please enter auth name' }]}>
            <Input placeholder="e.g. My API Key" />
          </Form.Item>
          <Form.Item label="Auth Type" name="type" rules={[{ required: true, message: 'Please select auth type' }]}>
            <Select
              placeholder="select auth type"
              options={[
                { label: 'Basic Auth', value: 'basic' },
                { label: 'Bearer Token', value: 'bearer' },
                { label: 'Custom Auth', value: 'custom' },
                { label: 'OAuth 2', value: 'oauth2' },
              ]}
            />
          </Form.Item>
          <div style={{ borderTop: '1px solid #f0f0f0', paddingTop: 16, marginTop: 8 }}>
            <Form.Item noStyle shouldUpdate={(prev, curr) => prev.type !== curr.type}>
              {({ getFieldValue }) => getAuthFieldsByType(getFieldValue('type') as AuthType)}
            </Form.Item>
          </div>
        </Form>
      </Modal>
    </div>
  );
}
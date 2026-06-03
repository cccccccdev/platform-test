import { useState } from 'react';
import { Breadcrumb, Typography, Table, Button, Space, Modal, Form, Input, Select, Tag, message } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';

const { Title } = Typography;

type AuthType = 'basic' | 'bearer' | 'custom' | 'oauth2';

interface AuthConfig {
  id: string;
  name: string;
  type: AuthType;
  description?: string;
  credentials?: Record<string, string>;
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
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAuth, setEditingAuth] = useState<AuthConfig | null>(null);
  const [form] = Form.useForm();

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
      description: auth.description,
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

      if (editingAuth) {
        setAuthConfigs(prev => prev.map(a =>
          a.id === editingAuth.id
            ? { ...a, name: values.name, type: authType, description: values.description, credentials }
            : a
        ));
        message.success('Updated successfully', 2);
      } else {
        const newAuth: AuthConfig = {
          id: `auth_${Date.now()}`,
          name: values.name,
          type: authType,
          description: values.description,
          credentials,
        };
        setAuthConfigs(prev => [...prev, newAuth]);
        message.success('Added successfully', 2);
      }
      setIsModalOpen(false);
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
            <Form.Item label="Username" name="username" rules={[{ required: true, message: 'Please enter username' }]}>
              <Input placeholder="enter username" />
            </Form.Item>
            <Form.Item label="Password" name="password" rules={[{ required: true, message: 'Please enter password' }]}>
              <Input.Password placeholder="enter password" />
            </Form.Item>
          </>
        );
      case 'bearer':
        return (
          <Form.Item label="Token" name="token" rules={[{ required: true, message: 'Please enter token' }]}>
            <Input placeholder="enter bearer token" />
          </Form.Item>
        );
      case 'custom':
        return (
          <>
            <Form.Item label="Header Name" name="customHeader" rules={[{ required: true, message: 'Please enter header name' }]}>
              <Input placeholder="e.g. X-API-Key" />
            </Form.Item>
            <Form.Item label="Header Value" name="customValue" rules={[{ required: true, message: 'Please enter header value' }]}>
              <Input placeholder="enter header value" />
            </Form.Item>
          </>
        );
      case 'oauth2':
        return (
          <>
            <Form.Item label="Client ID" name="clientId" rules={[{ required: true, message: 'Please enter client ID' }]}>
              <Input placeholder="enter client ID" />
            </Form.Item>
            <Form.Item label="Client Secret" name="clientSecret" rules={[{ required: true, message: 'Please enter client secret' }]}>
              <Input.Password placeholder="enter client secret" />
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
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
      render: (text: string) => text || '-',
    },
    {
      title: 'Operation',
      key: 'operation',
      width: 150,
      render: (_: any, record: AuthConfig) => (
        <Space>
          <Button type="text" size="small" icon={<EditOutlined />} onClick={() => handleEditAuth(record)} />
          <Button type="text" size="small" icon={<DeleteOutlined />} onClick={() => handleDeleteAuth(record.id)} danger />
        </Space>
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
        <Title level={4} style={{ margin: 0 }}>Authentication Configuration</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAddAuth}>
          Add Auth Config
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
        title={editingAuth ? 'Edit Auth Config' : 'Add Auth Config'}
        open={isModalOpen}
        onOk={handleModalOk}
        onCancel={handleModalCancel}
        okText={editingAuth ? 'Update' : 'Add'}
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
          <Form.Item label="Description" name="description">
            <Input.TextArea placeholder="enter description (optional)" rows={2} />
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
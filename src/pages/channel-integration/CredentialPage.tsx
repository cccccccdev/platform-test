import { useState } from 'react';
import { Breadcrumb, Typography, Table, Button, Space, Modal, Form, Input, Tag, message } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';

const { Title } = Typography;

interface CredentialItem {
  id: string;
  key: string;
  description?: string;
}

export default function CredentialPage() {
  const { channelCode } = useParams<{ channelCode: string }>();
  const navigate = useNavigate();
  const [credentials, setCredentials] = useState<CredentialItem[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCredential, setEditingCredential] = useState<CredentialItem | null>(null);
  const [form] = Form.useForm();

  const handleAdd = () => {
    setEditingCredential(null);
    form.resetFields();
    setIsModalOpen(true);
  };

  const handleEdit = (cred: CredentialItem) => {
    setEditingCredential(cred);
    form.setFieldsValue({
      key: cred.key,
      description: cred.description,
    });
    setIsModalOpen(true);
  };

  const handleDelete = (id: string) => {
    setCredentials(prev => prev.filter(c => c.id !== id));
    message.success('Deleted successfully', 2);
  };

  const handleModalOk = () => {
    form.validateFields().then(values => {
      if (editingCredential) {
        setCredentials(prev => prev.map(c =>
          c.id === editingCredential.id
            ? { ...c, key: values.key, description: values.description }
            : c
        ));
        message.success('Updated successfully', 2);
      } else {
        const newCred: CredentialItem = {
          id: `cred_${Date.now()}`,
          key: values.key,
          description: values.description,
        };
        setCredentials(prev => [...prev, newCred]);
        message.success('Added successfully', 2);
      }
      setIsModalOpen(false);
    });
  };

  const handleModalCancel = () => {
    setIsModalOpen(false);
    form.resetFields();
  };

  const columns = [
    {
      title: 'Key',
      dataIndex: 'key',
      key: 'key',
      render: (text: string) => <Tag color="blue">{text}</Tag>,
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
      width: 120,
      render: (_: any, record: CredentialItem) => (
        <Space>
          <Button type="text" size="small" icon={<EditOutlined />} onClick={() => handleEdit(record)} />
          <Button type="text" size="small" icon={<DeleteOutlined />} onClick={() => handleDelete(record.id)} danger />
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
          { title: 'Credential' },
        ]}
      />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <Title level={4} style={{ margin: 0 }}>Channel Credentials</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
          Add Credential Key
        </Button>
      </div>

      <Table
        dataSource={credentials}
        columns={columns}
        rowKey="id"
        pagination={false}
        locale={{ emptyText: 'No credential keys configured. Click "Add Credential Key" to add a new key.' }}
      />

      <Modal
        title={editingCredential ? 'Edit Credential Key' : 'Add Credential Key'}
        open={isModalOpen}
        onOk={handleModalOk}
        onCancel={handleModalCancel}
        okText={editingCredential ? 'Update' : 'Add'}
        cancelText="Cancel"
        width={500}
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item label="Key" name="key" rules={[{ required: true, message: 'Please enter credential key' }]}>
            <Input placeholder="e.g. API_KEY, SECRET_KEY, APP_ID" />
          </Form.Item>
          <Form.Item label="Description" name="description">
            <Input.TextArea placeholder="enter description (optional)" rows={2} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
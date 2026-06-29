import { useEffect } from 'react';
import { Drawer, Button, Form, Input, Space, message } from 'antd';
import { useChannelScopeStore } from './channelScopeStore';
import type { CredentialItem } from './channelScopeStore';

interface Props {
  visible: boolean;
  channelCode: string;
  credential: CredentialItem | null;
  onSave?: (credential: CredentialItem) => void;
  onClose: () => void;
}

export default function CredentialDrawer({ visible, channelCode, credential, onSave, onClose }: Props) {
  const [form] = Form.useForm();
  const addCredential = useChannelScopeStore((s) => s.addCredential);
  const updateCredential = useChannelScopeStore((s) => s.updateCredential);
  const credentials = useChannelScopeStore((s) => s.credentialsByChannel[channelCode] ?? []);

  useEffect(() => {
    if (visible) {
      if (credential) {
        form.setFieldsValue({ key: credential.key, description: credential.description });
      } else {
        form.resetFields();
      }
    }
  }, [visible, credential, form]);

  const handleSave = async () => {
    const values = await form.validateFields().catch(() => undefined);
    if (!values) return;

    const duplicate = credentials.some(
      (c) => c.key === values.key && c.id !== credential?.id
    );
    if (duplicate) {
      form.setFields([{ name: 'key', errors: ['Key already exists in this channel'] }]);
      return;
    }

    if (credential) {
      updateCredential(channelCode, credential.id, { key: values.key, description: values.description });
      message.success('Credential updated');
    } else {
      const newCred: CredentialItem = { id: `cred_${Date.now()}`, key: values.key, description: values.description };
      addCredential(channelCode, newCred);
      onSave?.(newCred);
      message.success('Credential added');
    }
    onClose();
  };

  return (
    <Drawer
      title={credential ? 'Edit Credential Key' : 'Add Credential Key'}
      placement="right"
      width={400}
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
        <Form.Item label="Key" name="key" rules={[{ required: true, message: 'Please enter credential key' }]}>
          <Input placeholder="e.g. API_KEY, SECRET_KEY" />
        </Form.Item>
        <Form.Item label="Description" name="description">
          <Input.TextArea placeholder="Optional description" rows={2} />
        </Form.Item>
      </Form>
    </Drawer>
  );
}

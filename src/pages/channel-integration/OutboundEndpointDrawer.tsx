import { useEffect } from 'react';
import { Button, Drawer, Form, Input, Select, Space, message } from 'antd';
import type { OutboundEndpoint } from './channelScopeStore';

type Props = {
  open: boolean;
  endpoint: OutboundEndpoint | null;
  onClose: () => void;
  onSave: (values: Pick<OutboundEndpoint, 'method' | 'protocol' | 'path'>) => void;
};

export default function OutboundEndpointDrawer({ open, endpoint, onClose, onSave }: Props) {
  const [form] = Form.useForm<Pick<OutboundEndpoint, 'method' | 'protocol' | 'path'>>();

  useEffect(() => {
    if (!open) return;
    form.setFieldsValue(endpoint ? { method: endpoint.method, protocol: endpoint.protocol, path: endpoint.path } : { method: 'POST', protocol: 'HTTP', path: '' });
  }, [endpoint, form, open]);

  const save = async () => {
    const values = await form.validateFields();
    if (!values.path.startsWith('/')) return void message.error('Path must start with /');
    onSave(values);
  };

  return <Drawer
    title={endpoint ? 'Edit Endpoint' : 'Create Endpoint'}
    width={480}
    open={open}
    onClose={onClose}
    destroyOnClose
    extra={<Space><Button onClick={onClose}>Cancel</Button><Button type="primary" onClick={() => void save()}>Save</Button></Space>}
  >
    <Form form={form} layout="vertical">
      <Form.Item name="method" label="Method" rules={[{ required: true }]}><Select options={['POST', 'GET', 'PUT', 'DELETE'].map((value) => ({ label: value, value }))} /></Form.Item>
      <Form.Item name="protocol" label="Protocol" rules={[{ required: true }]}><Select options={['HTTP', 'HTTPS'].map((value) => ({ label: value, value }))} /></Form.Item>
      <Form.Item name="path" label="Path" rules={[{ required: true, message: 'Enter an endpoint path' }]}><Input placeholder="/{field}" /></Form.Item>
    </Form>
  </Drawer>;
}

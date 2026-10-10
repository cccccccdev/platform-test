import { useState } from 'react';
import { Card, Table, Button, Space, Modal, Form, Input, Select, message, Tag } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';

interface Product {
  id: string;
  code: string;
  name: string;
  type: string;
  channel: string;
  status: string;
  description: string;
}

const MOCK_PRODUCTS: Product[] = [
  { id: '1', code: 'QUICK_PAY', name: '快捷支付', type: '线上支付', channel: 'MoMo', status: 'ACTIVE', description: '移动端快捷支付' },
  { id: '2', code: 'WEB_PAY', name: 'Web支付', type: '线上支付', channel: 'WeChat', status: 'ACTIVE', description: 'PC端网页支付' },
  { id: '3', code: 'APP_PAY', name: 'App支付', type: '线上支付', channel: 'WeChat', status: 'ACTIVE', description: '移动端App内支付' },
  { id: '4', code: 'POS_PAY', name: 'POS支付', type: '线下支付', channel: 'UnionPay', status: 'ACTIVE', description: '商户POS机刷卡' },
  { id: '5', code: 'SCAN_PAY', name: '扫码支付', type: '线下支付', channel: 'Alipay', status: 'ACTIVE', description: '用户扫码商家二维码' },
  { id: '6', code: 'REFUND', name: '退款', type: '退款', channel: 'All', status: 'ACTIVE', description: '全额或部分退款' },
  { id: '7', code: 'TRANSFER', name: '转账', type: '转账', channel: 'Internal', status: 'ACTIVE', description: '平台内账户转账' },
  { id: '8', code: 'AUTO_DEDUCT', name: '代扣', type: '代扣', channel: 'UnionPay', status: 'INACTIVE', description: '自动代扣用户资金' },
];

const PRODUCT_TYPES = ['线上支付', '线下支付', '退款', '转账', '代扣'];
const CHANNELS = ['MoMo', 'WeChat', 'Alipay', 'UnionPay', 'Internal', 'All'];

export default function ProductPage() {
  const [products, setProducts] = useState(MOCK_PRODUCTS);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [form] = Form.useForm();

  const columns = [
    {
      title: '产品代码',
      dataIndex: 'code',
      key: 'code',
      render: (code: string) => <Tag color="blue">{code}</Tag>,
    },
    { title: '产品名称', dataIndex: 'name', key: 'name' },
    {
      title: '产品类型',
      dataIndex: 'type',
      key: 'type',
      render: (t: string) => <Tag>{t}</Tag>,
    },
    {
      title: '渠道',
      dataIndex: 'channel',
      key: 'channel',
      render: (c: string) => <Tag color="green">{c}</Tag>,
    },
    { title: '描述', dataIndex: 'description', key: 'description', ellipsis: true },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (s: string) => (
        <Tag color={s === 'ACTIVE' ? 'green' : 'red'}>{s === 'ACTIVE' ? '启用' : '停用'}</Tag>
      ),
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: Product) => (
        <Space>
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => handleEdit(record)}>
            编辑
          </Button>
          <Button type="link" size="small" danger icon={<DeleteOutlined />} onClick={() => handleDelete(record.id)}>
            删除
          </Button>
        </Space>
      ),
    },
  ];

  const handleAdd = () => {
    setEditingProduct(null);
    form.resetFields();
    setIsModalOpen(true);
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    form.setFieldsValue(product);
    setIsModalOpen(true);
  };

  const handleDelete = (id: string) => {
    setProducts(products.filter((p) => p.id !== id));
    message.success('删除成功');
  };

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      if (editingProduct) {
        setProducts(products.map((p) => (p.id === editingProduct.id ? { ...p, ...values } : p)));
        message.success('更新成功');
      } else {
        setProducts([...products, { ...values, id: `${Date.now()}`, status: 'ACTIVE' }]);
        message.success('新增成功');
      }
      setIsModalOpen(false);
    } catch {}
  };

  return (
    <div style={{ padding: '0 24px' }}>
      <Card
        title="产品配置"
        style={{ margin: '24px 0' }}
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
            新增产品
          </Button>
        }
      >
        <Table dataSource={products} columns={columns} rowKey="id" pagination={{ pageSize: 10 }} />
      </Card>

      <Modal
        title={editingProduct ? '编辑产品' : '新增产品'}
        open={isModalOpen}
        onOk={handleSave}
        onCancel={() => setIsModalOpen(false)}
        width={450}
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="code" label="产品代码" rules={[{ required: true }]}>
            <Input placeholder="如：QUICK_PAY" disabled={!!editingProduct} />
          </Form.Item>
          <Form.Item name="name" label="产品名称" rules={[{ required: true }]}>
            <Input placeholder="如：快捷支付" />
          </Form.Item>
          <Form.Item name="type" label="产品类型" rules={[{ required: true }]}>
            <Select>
              {PRODUCT_TYPES.map((t) => (
                <Select.Option key={t} value={t}>{t}</Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="channel" label="渠道" rules={[{ required: true }]}>
            <Select>
              {CHANNELS.map((c) => (
                <Select.Option key={c} value={c}>{c}</Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="description" label="描述">
            <Input.TextArea rows={2} placeholder="产品描述" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

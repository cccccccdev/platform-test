import { useState } from 'react';
import { Card, Table, Button, Space, Modal, Form, Input, Select, message, Tag } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';

interface Merchant {
  id: string;
  merchantId: string;
  name: string;
  country: string;
  businessType: string;
  status: string;
  contact: string;
  email: string;
}

const MOCK_MERCHANTS: Merchant[] = [
  { id: '1', merchantId: 'M10001', name: '测试商户A', country: 'CN', businessType: '线上支付', status: 'ACTIVE', contact: '张三', email: 'zhangsan@test.com' },
  { id: '2', merchantId: 'M10002', name: '测试商户B', country: 'HK', businessType: '线下支付', status: 'ACTIVE', contact: '李四', email: 'lisi@test.com' },
  { id: '3', merchantId: 'M10003', name: '测试商户C', country: 'SG', businessType: '线上支付', status: 'ACTIVE', contact: '王五', email: 'wangwu@test.com' },
  { id: '4', merchantId: 'M10004', name: '测试商户D', country: 'TH', businessType: '扫码支付', status: 'INACTIVE', contact: '赵六', email: 'zhaoliu@test.com' },
  { id: '5', merchantId: 'M10005', name: '测试商户E', country: 'MY', businessType: 'POS支付', status: 'ACTIVE', contact: '钱七', email: 'qianqi@test.com' },
  { id: '6', merchantId: 'M10006', name: '测试商户F', country: 'PH', businessType: 'App支付', status: 'ACTIVE', contact: '孙八', email: 'sunba@test.com' },
];

const COUNTRIES = ['CN', 'HK', 'MO', 'TW', 'SG', 'MY', 'TH', 'PH', 'ID', 'VN'];
const BUSINESS_TYPES = ['线上支付', '线下支付', '扫码支付', 'POS支付', 'App支付', '快捷支付'];

export default function MerchantPage() {
  const [merchants, setMerchants] = useState(MOCK_MERCHANTS);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMerchant, setEditingMerchant] = useState<Merchant | null>(null);
  const [form] = Form.useForm();

  const columns = [
    {
      title: '商户号',
      dataIndex: 'merchantId',
      key: 'merchantId',
      render: (id: string) => <Tag color="blue">{id}</Tag>,
    },
    { title: '商户名称', dataIndex: 'name', key: 'name' },
    {
      title: '国家',
      dataIndex: 'country',
      key: 'country',
      render: (c: string) => <Tag>{c}</Tag>,
    },
    {
      title: '业务类型',
      dataIndex: 'businessType',
      key: 'businessType',
      render: (t: string) => <Tag color="green">{t}</Tag>,
    },
    { title: '联系人', dataIndex: 'contact', key: 'contact' },
    { title: '邮箱', dataIndex: 'email', key: 'email' },
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
      render: (_: any, record: Merchant) => (
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
    setEditingMerchant(null);
    form.resetFields();
    setIsModalOpen(true);
  };

  const handleEdit = (merchant: Merchant) => {
    setEditingMerchant(merchant);
    form.setFieldsValue(merchant);
    setIsModalOpen(true);
  };

  const handleDelete = (id: string) => {
    setMerchants(merchants.filter((m) => m.id !== id));
    message.success('删除成功');
  };

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      if (editingMerchant) {
        setMerchants(merchants.map((m) => (m.id === editingMerchant.id ? { ...m, ...values } : m)));
        message.success('更新成功');
      } else {
        setMerchants([...merchants, { ...values, id: `${Date.now()}`, status: 'ACTIVE' }]);
        message.success('新增成功');
      }
      setIsModalOpen(false);
    } catch {}
  };

  return (
    <div style={{ padding: '0 24px' }}>
      <Card
        title="商户配置"
        style={{ margin: '24px 0' }}
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
            新增商户
          </Button>
        }
      >
        <Table dataSource={merchants} columns={columns} rowKey="id" pagination={{ pageSize: 10 }} />
      </Card>

      <Modal
        title={editingMerchant ? '编辑商户' : '新增商户'}
        open={isModalOpen}
        onOk={handleSave}
        onCancel={() => setIsModalOpen(false)}
        width={450}
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="merchantId" label="商户号" rules={[{ required: true }]}>
            <Input placeholder="如：M10001" disabled={!!editingMerchant} />
          </Form.Item>
          <Form.Item name="name" label="商户名称" rules={[{ required: true }]}>
            <Input placeholder="商户名称" />
          </Form.Item>
          <Form.Item name="country" label="国家" rules={[{ required: true }]}>
            <Select>
              {COUNTRIES.map((c) => (
                <Select.Option key={c} value={c}>{c}</Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="businessType" label="业务类型" rules={[{ required: true }]}>
            <Select>
              {BUSINESS_TYPES.map((t) => (
                <Select.Option key={t} value={t}>{t}</Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="contact" label="联系人" rules={[{ required: true }]}>
            <Input placeholder="联系人姓名" />
          </Form.Item>
          <Form.Item name="email" label="邮箱" rules={[{ type: 'email' }]}>
            <Input placeholder="邮箱地址" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

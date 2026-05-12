import { useState } from 'react';
import { Card, Table, Button, Space, Modal, Form, Input, InputNumber, message, Tag } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';

interface Currency {
  code: string;
  name: string;
  symbol: string;
  precision: number;
  status: string;
}

const MOCK_CURRENCIES: Currency[] = [
  { code: 'CNY', name: '人民币', symbol: '¥', precision: 2, status: 'ACTIVE' },
  { code: 'USD', name: '美元', symbol: '$', precision: 2, status: 'ACTIVE' },
  { code: 'HKD', name: '港币', symbol: 'HK$', precision: 2, status: 'ACTIVE' },
  { code: 'MOP', name: '澳门币', symbol: 'MOP', precision: 2, status: 'ACTIVE' },
  { code: 'THB', name: '泰铢', symbol: '฿', precision: 2, status: 'ACTIVE' },
  { code: 'SGD', name: '新加坡元', symbol: 'S$', precision: 2, status: 'INACTIVE' },
  { code: 'MYR', name: '马来西亚林吉特', symbol: 'RM', precision: 2, status: 'ACTIVE' },
  { code: 'PHP', name: '菲律宾比索', symbol: '₱', precision: 2, status: 'ACTIVE' },
  { code: 'IDR', name: '印尼盾', symbol: 'Rp', precision: 0, status: 'INACTIVE' },
  { code: 'VND', name: '越南盾', symbol: '₫', precision: 0, status: 'ACTIVE' },
];

export default function CurrencyPage() {
  const [currencies, setCurrencies] = useState(MOCK_CURRENCIES);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCurrency, setEditingCurrency] = useState<Currency | null>(null);
  const [form] = Form.useForm();

  const columns = [
    {
      title: '货币代码',
      dataIndex: 'code',
      key: 'code',
      render: (code: string) => <Tag color="blue">{code}</Tag>,
    },
    { title: '货币名称', dataIndex: 'name', key: 'name' },
    { title: '符号', dataIndex: 'symbol', key: 'symbol' },
    {
      title: '精度',
      dataIndex: 'precision',
      key: 'precision',
      render: (p: number) => `${p} 位小数`,
    },
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
      render: (_: any, record: Currency) => (
        <Space>
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => handleEdit(record)}>
            编辑
          </Button>
          <Button type="link" size="small" danger icon={<DeleteOutlined />} onClick={() => handleDelete(record.code)}>
            删除
          </Button>
        </Space>
      ),
    },
  ];

  const handleAdd = () => {
    setEditingCurrency(null);
    form.resetFields();
    setIsModalOpen(true);
  };

  const handleEdit = (currency: Currency) => {
    setEditingCurrency(currency);
    form.setFieldsValue(currency);
    setIsModalOpen(true);
  };

  const handleDelete = (code: string) => {
    setCurrencies(currencies.filter((c) => c.code !== code));
    message.success('删除成功');
  };

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      if (editingCurrency) {
        setCurrencies(currencies.map((c) => (c.code === editingCurrency.code ? { ...c, ...values } : c)));
        message.success('更新成功');
      } else {
        setCurrencies([...currencies, { ...values, status: 'ACTIVE' }]);
        message.success('新增成功');
      }
      setIsModalOpen(false);
    } catch {}
  };

  return (
    <div style={{ padding: '0 24px' }}>
      <Card
        title="货币配置"
        style={{ margin: '24px 0' }}
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
            新增货币
          </Button>
        }
      >
        <Table dataSource={currencies} columns={columns} rowKey="code" pagination={{ pageSize: 10 }} />
      </Card>

      <Modal
        title={editingCurrency ? '编辑货币' : '新增货币'}
        open={isModalOpen}
        onOk={handleSave}
        onCancel={() => setIsModalOpen(false)}
        width={400}
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="code" label="货币代码" rules={[{ required: true }]}>
            <Input placeholder="如：CNY" disabled={!!editingCurrency} />
          </Form.Item>
          <Form.Item name="name" label="货币名称" rules={[{ required: true }]}>
            <Input placeholder="如：人民币" />
          </Form.Item>
          <Form.Item name="symbol" label="货币符号" rules={[{ required: true }]}>
            <Input placeholder="如：¥" />
          </Form.Item>
          <Form.Item name="precision" label="精度（小数位数）" rules={[{ required: true }]}>
            <InputNumber min={0} max={6} style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

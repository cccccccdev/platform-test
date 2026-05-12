import { useState } from 'react';
import { Card, Table, Button, Space, Modal, Form, InputNumber, Select, DatePicker, message, Tag } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';

interface ExchangeRate {
  id: string;
  sourceCurrency: string;
  targetCurrency: string;
  rate: number;
  effectiveDate: string;
  status: string;
}

const MOCK_RATES: ExchangeRate[] = [
  { id: '1', sourceCurrency: 'USD', targetCurrency: 'CNY', rate: 7.24, effectiveDate: '2026-04-15', status: 'ACTIVE' },
  { id: '2', sourceCurrency: 'HKD', targetCurrency: 'CNY', rate: 0.92, effectiveDate: '2026-04-15', status: 'ACTIVE' },
  { id: '3', sourceCurrency: 'MOP', targetCurrency: 'CNY', rate: 0.89, effectiveDate: '2026-04-15', status: 'ACTIVE' },
  { id: '4', sourceCurrency: 'SGD', targetCurrency: 'CNY', rate: 5.38, effectiveDate: '2026-04-15', status: 'ACTIVE' },
  { id: '5', sourceCurrency: 'THB', targetCurrency: 'CNY', rate: 0.21, effectiveDate: '2026-04-15', status: 'ACTIVE' },
  { id: '6', sourceCurrency: 'MYR', targetCurrency: 'CNY', rate: 1.56, effectiveDate: '2026-04-15', status: 'INACTIVE' },
  { id: '7', sourceCurrency: 'PHP', targetCurrency: 'CNY', rate: 0.13, effectiveDate: '2026-04-15', status: 'ACTIVE' },
  { id: '8', sourceCurrency: 'IDR', targetCurrency: 'CNY', rate: 0.00045, effectiveDate: '2026-04-15', status: 'ACTIVE' },
  { id: '9', sourceCurrency: 'VND', targetCurrency: 'CNY', rate: 0.00029, effectiveDate: '2026-04-15', status: 'ACTIVE' },
  { id: '10', sourceCurrency: 'USD', targetCurrency: 'HKD', rate: 7.83, effectiveDate: '2026-04-15', status: 'ACTIVE' },
];

const CURRENCIES = ['CNY', 'USD', 'HKD', 'MOP', 'SGD', 'THB', 'MYR', 'PHP', 'IDR', 'VND'];

export default function ExchangeRatePage() {
  const [rates, setRates] = useState(MOCK_RATES);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRate, setEditingRate] = useState<ExchangeRate | null>(null);
  const [form] = Form.useForm();

  const columns = [
    {
      title: '源货币',
      dataIndex: 'sourceCurrency',
      key: 'sourceCurrency',
      render: (c: string) => <Tag color="blue">{c}</Tag>,
    },
    {
      title: '目标货币',
      dataIndex: 'targetCurrency',
      key: 'targetCurrency',
      render: (c: string) => <Tag color="green">{c}</Tag>,
    },
    {
      title: '汇率',
      dataIndex: 'rate',
      key: 'rate',
      render: (r: number) => r.toFixed(6),
    },
    {
      title: '生效日期',
      dataIndex: 'effectiveDate',
      key: 'effectiveDate',
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (s: string) => (
        <Tag color={s === 'ACTIVE' ? 'green' : 'red'}>{s === 'ACTIVE' ? '生效' : '失效'}</Tag>
      ),
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: ExchangeRate) => (
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
    setEditingRate(null);
    form.resetFields();
    form.setFieldsValue({ effectiveDate: dayjs() });
    setIsModalOpen(true);
  };

  const handleEdit = (rate: ExchangeRate) => {
    setEditingRate(rate);
    form.setFieldsValue({ ...rate, effectiveDate: dayjs(rate.effectiveDate) });
    setIsModalOpen(true);
  };

  const handleDelete = (id: string) => {
    setRates(rates.filter((r) => r.id !== id));
    message.success('删除成功');
  };

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      if (editingRate) {
        setRates(rates.map((r) => (r.id === editingRate.id ? { ...r, ...values, effectiveDate: values.effectiveDate.format('YYYY-MM-DD') } : r)));
        message.success('更新成功');
      } else {
        setRates([...rates, { ...values, id: `${Date.now()}`, effectiveDate: values.effectiveDate.format('YYYY-MM-DD'), status: 'ACTIVE' }]);
        message.success('新增成功');
      }
      setIsModalOpen(false);
    } catch {}
  };

  return (
    <div style={{ padding: '0 24px' }}>
      <Card
        title="汇率配置"
        style={{ margin: '24px 0' }}
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
            新增汇率
          </Button>
        }
      >
        <Table dataSource={rates} columns={columns} rowKey="id" pagination={{ pageSize: 10 }} />
      </Card>

      <Modal
        title={editingRate ? '编辑汇率' : '新增汇率'}
        open={isModalOpen}
        onOk={handleSave}
        onCancel={() => setIsModalOpen(false)}
        width={400}
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="sourceCurrency" label="源货币" rules={[{ required: true }]}>
            <Select>
              {CURRENCIES.map((c) => (
                <Select.Option key={c} value={c}>{c}</Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="targetCurrency" label="目标货币" rules={[{ required: true }]}>
            <Select>
              {CURRENCIES.map((c) => (
                <Select.Option key={c} value={c}>{c}</Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="rate" label="汇率" rules={[{ required: true }]}>
            <InputNumber style={{ width: '100%' }} placeholder="0.000000" step={0.000001} min={0} />
          </Form.Item>
          <Form.Item name="effectiveDate" label="生效日期" rules={[{ required: true }]}>
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

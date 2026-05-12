import { useState } from 'react';
import { Card, Table, Button, Space, Modal, Form, Input, Select, message, Tag } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';

interface Country {
  code: string;
  name: string;
  localName: string;
  region: string;
  timezone: string;
  status: string;
}

const MOCK_COUNTRIES: Country[] = [
  { code: 'CN', name: '中国', localName: 'China', region: '亚太', timezone: 'Asia/Shanghai', status: 'ACTIVE' },
  { code: 'HK', name: '香港', localName: 'Hong Kong', region: '亚太', timezone: 'Asia/Hong_Kong', status: 'ACTIVE' },
  { code: 'MO', name: '澳门', localName: 'Macau', region: '亚太', timezone: 'Asia/Macau', status: 'ACTIVE' },
  { code: 'TW', name: '台湾', localName: 'Taiwan', region: '亚太', timezone: 'Asia/Taipei', status: 'ACTIVE' },
  { code: 'SG', name: '新加坡', localName: 'Singapore', region: '亚太', timezone: 'Asia/Singapore', status: 'ACTIVE' },
  { code: 'MY', name: '马来西亚', localName: 'Malaysia', region: '亚太', timezone: 'Asia/Kuala_Lumpur', status: 'ACTIVE' },
  { code: 'TH', name: '泰国', localName: 'Thailand', region: '亚太', timezone: 'Asia/Bangkok', status: 'ACTIVE' },
  { code: 'PH', name: '菲律宾', localName: 'Philippines', region: '亚太', timezone: 'Asia/Manila', status: 'ACTIVE' },
  { code: 'ID', name: '印度尼西亚', localName: 'Indonesia', region: '亚太', timezone: 'Asia/Jakarta', status: 'INACTIVE' },
  { code: 'VN', name: '越南', localName: 'Vietnam', region: '亚太', timezone: 'Asia/Ho_Chi_Minh', status: 'ACTIVE' },
  { code: 'US', name: '美国', localName: 'United States', region: '北美', timezone: 'America/New_York', status: 'ACTIVE' },
  { code: 'GB', name: '英国', localName: 'United Kingdom', region: '欧洲', timezone: 'Europe/London', status: 'INACTIVE' },
];

const REGIONS = ['亚太', '北美', '欧洲', '南美', '非洲', '中东'];

export default function CountryPage() {
  const [countries, setCountries] = useState(MOCK_COUNTRIES);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCountry, setEditingCountry] = useState<Country | null>(null);
  const [form] = Form.useForm();

  const columns = [
    {
      title: '国家代码',
      dataIndex: 'code',
      key: 'code',
      render: (code: string) => <Tag color="blue">{code}</Tag>,
    },
    { title: '国家名称', dataIndex: 'name', key: 'name' },
    { title: '本地名称', dataIndex: 'localName', key: 'localName' },
    {
      title: '区域',
      dataIndex: 'region',
      key: 'region',
      render: (r: string) => <Tag>{r}</Tag>,
    },
    { title: '时区', dataIndex: 'timezone', key: 'timezone' },
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
      render: (_: any, record: Country) => (
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
    setEditingCountry(null);
    form.resetFields();
    setIsModalOpen(true);
  };

  const handleEdit = (country: Country) => {
    setEditingCountry(country);
    form.setFieldsValue(country);
    setIsModalOpen(true);
  };

  const handleDelete = (code: string) => {
    setCountries(countries.filter((c) => c.code !== code));
    message.success('删除成功');
  };

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      if (editingCountry) {
        setCountries(countries.map((c) => (c.code === editingCountry.code ? { ...c, ...values } : c)));
        message.success('更新成功');
      } else {
        setCountries([...countries, { ...values, status: 'ACTIVE' }]);
        message.success('新增成功');
      }
      setIsModalOpen(false);
    } catch {}
  };

  return (
    <div style={{ padding: '0 24px' }}>
      <Card
        title="国家配置"
        style={{ margin: '24px 0' }}
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
            新增国家
          </Button>
        }
      >
        <Table dataSource={countries} columns={columns} rowKey="code" pagination={{ pageSize: 10 }} />
      </Card>

      <Modal
        title={editingCountry ? '编辑国家' : '新增国家'}
        open={isModalOpen}
        onOk={handleSave}
        onCancel={() => setIsModalOpen(false)}
        width={450}
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="code" label="国家代码" rules={[{ required: true }]}>
            <Input placeholder="如：CN" disabled={!!editingCountry} />
          </Form.Item>
          <Form.Item name="name" label="国家名称" rules={[{ required: true }]}>
            <Input placeholder="如：中国" />
          </Form.Item>
          <Form.Item name="localName" label="本地名称">
            <Input placeholder="如：China" />
          </Form.Item>
          <Form.Item name="region" label="区域" rules={[{ required: true }]}>
            <Select>
              {REGIONS.map((r) => (
                <Select.Option key={r} value={r}>{r}</Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="timezone" label="时区" rules={[{ required: true }]}>
            <Select showSearch>
              {['Asia/Shanghai', 'Asia/Hong_Kong', 'Asia/Macau', 'Asia/Taipei', 'Asia/Singapore', 'Asia/Bangkok', 'Asia/Manila', 'Asia/Jakarta', 'Asia/Ho_Chi_Minh', 'America/New_York', 'Europe/London'].map((tz) => (
                <Select.Option key={tz} value={tz}>{tz}</Select.Option>
              ))}
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

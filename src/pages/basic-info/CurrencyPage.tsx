import { useState } from 'react';
import { Breadcrumb, Button, Form, Input, Modal, Select, Table, Typography, message } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import {
  type CurrencyRecord,
  type CurrencyType,
  useBasicInfoReferenceStore,
} from './basicInfoReferenceStore';

const { Title } = Typography;

const TYPE_OPTIONS: { label: CurrencyType; value: CurrencyType }[] = [
  { label: 'Fiat', value: 'Fiat' },
  { label: 'Stablecoin', value: 'Stablecoin' },
];

const TYPE_DESCRIPTIONS: Record<CurrencyType, string> = {
  Fiat: 'A government-issued currency that can be referenced by Country.',
  Stablecoin: 'A stablecoin used for digital-asset channel capabilities.',
};

export default function CurrencyPage() {
  const currencies = useBasicInfoReferenceStore((state) => state.currencies);
  const addCurrency = useBasicInfoReferenceStore((state) => state.addCurrency);
  const updateCurrency = useBasicInfoReferenceStore((state) => state.updateCurrency);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCurrency, setEditingCurrency] = useState<CurrencyRecord | null>(null);
  const [form] = Form.useForm<CurrencyRecord>();

  const openCreateModal = () => {
    setEditingCurrency(null);
    form.resetFields();
    form.setFieldsValue({ type: 'Fiat' } as CurrencyRecord);
    setModalOpen(true);
  };

  const openEditModal = (currency: CurrencyRecord) => {
    setEditingCurrency(currency);
    form.setFieldsValue(currency);
    setModalOpen(true);
  };

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      const normalizedName = values.name.trim();

      if (editingCurrency) {
        updateCurrency(editingCurrency.code, { name: normalizedName });
        message.success(`${editingCurrency.code} updated`);
      } else {
        const normalizedCode = values.code.trim().toUpperCase();
        if (currencies.some((currency) => currency.code === normalizedCode)) {
          form.setFields([{ name: 'code', errors: ['Currency Code already exists'] }]);
          return;
        }
        addCurrency({ code: normalizedCode, name: normalizedName, type: values.type });
        message.success(`${normalizedCode} created`);
      }
      setModalOpen(false);
    } catch {
      // Ant Design renders field-level validation feedback.
    }
  };

  const columns = [
    { title: 'Code', dataIndex: 'code', key: 'code', width: 180 },
    { title: 'Name', dataIndex: 'name', key: 'name' },
    {
      title: 'Type',
      dataIndex: 'type',
      key: 'type',
      width: 190,
      filters: TYPE_OPTIONS.map((option) => ({ text: option.label, value: option.value })),
      onFilter: (value: boolean | React.Key, record: CurrencyRecord) => record.type === value,
    },
    { title: 'Operator', dataIndex: 'operator', key: 'operator', width: 150 },
    { title: 'Operation Time', dataIndex: 'operationTime', key: 'operationTime', width: 190 },
    {
      title: 'Operation',
      key: 'operation',
      width: 110,
      render: (_: unknown, currency: CurrencyRecord) => (
        <Button type="link" size="small" onClick={() => openEditModal(currency)}>Edit</Button>
      ),
    },
  ];

  return (
    <div className="basic-country-page">
      <section className="state-machine-heading">
        <Breadcrumb items={[{ title: 'Basic Info', href: '/basic-info' }, { title: 'Currency' }]} />
        <div className="state-machine-title-line">
          <Title level={4}>Currency</Title>
        </div>
      </section>

      <div className="basic-country-table-wrap">
        <div className="basic-country-actions">
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreateModal}>Create</Button>
        </div>
        <Table<CurrencyRecord>
          className="basic-country-table"
          dataSource={currencies}
          columns={columns}
          rowKey="code"
          scroll={{ x: 960 }}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showQuickJumper: true,
            pageSizeOptions: [10, 20, 50],
            showTotal: (total) => `Total ${total} items`,
          }}
        />
      </div>

      <Modal
        title={editingCurrency ? `Edit ${editingCurrency.code}` : 'Create Currency'}
        open={modalOpen}
        onOk={handleSave}
        okText="Save"
        cancelText="Cancel"
        onCancel={() => setModalOpen(false)}
        destroyOnHidden
        width={520}
      >
        <Form form={form} layout="horizontal" labelCol={{ span: 7 }} wrapperCol={{ span: 14 }} preserve={false}>
          <Form.Item
            name="code"
            label="Code"
            rules={editingCurrency ? [] : [
              { required: true, message: 'Enter Code' },
              { max: 32, message: 'Code cannot exceed 32 characters' },
              { pattern: /^[A-Za-z0-9_-]+$/, message: 'Use letters, numbers, underscores, or hyphens only' },
            ]}
            extra={editingCurrency
              ? 'Code cannot be changed after creation.'
              : 'Saved as uppercase and used as the internal canonical code.'}
          >
            <Input placeholder="For example, USDT" disabled={Boolean(editingCurrency)} />
          </Form.Item>
          <Form.Item
            name="name"
            label="Name"
            rules={[
              { required: true, whitespace: true, message: 'Enter Name' },
              { max: 128, message: 'Name cannot exceed 128 characters' },
            ]}
          >
            <Input placeholder="For example, Tether USD" />
          </Form.Item>
          <Form.Item
            name="type"
            label="Type"
            rules={editingCurrency ? [] : [{ required: true, message: 'Select Type' }]}
            extra={editingCurrency ? 'Type cannot be changed after creation.' : undefined}
          >
            <Select
              options={TYPE_OPTIONS}
              placeholder="Type"
              disabled={Boolean(editingCurrency)}
              optionRender={(option) => (
                <div>
                  <div>{option.label}</div>
                  <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                    {TYPE_DESCRIPTIONS[option.value as CurrencyType]}
                  </Typography.Text>
                </div>
              )}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

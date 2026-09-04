import { useEffect, useState } from 'react';
import { Breadcrumb, Button, Form, Input, Modal, Table, Tabs, Typography, message } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import {
  type CurrencyRecord,
  type CurrencyType,
  useBasicInfoReferenceStore,
} from './basicInfoReferenceStore';

const { Title } = Typography;

export default function CurrencyPage() {
  const currencies = useBasicInfoReferenceStore((state) => state.currencies);
  const addCurrency = useBasicInfoReferenceStore((state) => state.addCurrency);
  const updateCurrency = useBasicInfoReferenceStore((state) => state.updateCurrency);
  const [activeType, setActiveType] = useState<CurrencyType>('Fiat');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCurrency, setEditingCurrency] = useState<CurrencyRecord | null>(null);
  const [form] = Form.useForm<CurrencyRecord>();

  useEffect(() => {
    if (!modalOpen) return;

    form.resetFields();
    form.setFieldsValue(
      editingCurrency ?? ({ type: activeType } as CurrencyRecord),
    );
  }, [activeType, editingCurrency, form, modalOpen]);

  const openCreateModal = () => {
    setEditingCurrency(null);
    setModalOpen(true);
  };

  const openEditModal = (currency: CurrencyRecord) => {
    setEditingCurrency(currency);
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
    { title: 'Currency Code', dataIndex: 'code', key: 'code', width: 180 },
    { title: 'Currency Name', dataIndex: 'name', key: 'name' },
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
        <Tabs
          activeKey={activeType}
          onChange={(key) => setActiveType(key as CurrencyType)}
          items={[
            { key: 'Fiat', label: 'Fiat' },
            { key: 'Stablecoin', label: 'Stablecoin' },
          ]}
        />
        <div className="basic-country-actions">
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreateModal}>Create</Button>
        </div>
        <Table<CurrencyRecord>
          className="basic-country-table"
          dataSource={currencies.filter((currency) => currency.type === activeType)}
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
            label="Currency Code"
            rules={editingCurrency ? [] : [
              { required: true, message: 'Enter Currency Code' },
              { max: 32, message: 'Currency Code cannot exceed 32 characters' },
              { pattern: /^[A-Za-z0-9_-]+$/, message: 'Use letters, numbers, underscores, or hyphens only' },
            ]}
            extra={editingCurrency
              ? 'Currency Code cannot be changed after creation.'
              : 'Saved as uppercase and used as the internal canonical code.'}
          >
            <Input placeholder="For example, USDT" disabled={Boolean(editingCurrency)} />
          </Form.Item>
          <Form.Item
            name="name"
            label="Currency Name"
            rules={[
              { required: true, whitespace: true, message: 'Enter Currency Name' },
              { max: 128, message: 'Currency Name cannot exceed 128 characters' },
            ]}
          >
            <Input placeholder="For example, Tether USD" />
          </Form.Item>
          <Form.Item name="type" hidden>
            <Input />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

import { useState } from 'react';
import { Button, Form, Input, InputNumber, Modal, Table, message } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { countryReferenceData, type CountryReference } from '../../mock/countries';

type CountryFormValues = Pick<
  CountryReference,
  'code' | 'callingCode' | 'currency' | 'mainUnit' | 'fractionalUnit' | 'ratio' | 'segmentLength'
>;
const columns = [
  { title: 'Country', dataIndex: 'code', key: 'code', width: 96 },
  { title: 'Calling Code', dataIndex: 'callingCode', key: 'callingCode', width: 118 },
  { title: 'Currency', dataIndex: 'currency', key: 'currency', width: 96 },
  { title: 'Main Unit', dataIndex: 'mainUnit', key: 'mainUnit', width: 142 },
  { title: 'Fractional Unit', dataIndex: 'fractionalUnit', key: 'fractionalUnit', width: 142 },
  { title: 'Ratio', dataIndex: 'ratio', key: 'ratio', width: 78 },
  { title: 'Segment Length', dataIndex: 'segmentLength', key: 'segmentLength', width: 132 },
  { title: 'Operator', dataIndex: 'operator', key: 'operator', width: 132 },
  { title: 'Operation Time', dataIndex: 'operationTime', key: 'operationTime', width: 184 },
];

function formatOperationTime() {
  const now = new Date();
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
}

export default function CountryPage() {
  const [countries, setCountries] = useState<CountryReference[]>(countryReferenceData);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form] = Form.useForm<CountryFormValues>();

  const handleCreate = () => {
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      const code = values.code.trim().toUpperCase();
      if (countries.some((country) => country.code === code)) {
        form.setFields([{ name: 'code', errors: ['Country already exists'] }]);
        return;
      }

      setCountries((current) => [
        {
          ...values,
          code,
          callingCode: values.callingCode.trim(),
          currency: values.currency.trim().toUpperCase(),
          mainUnit: values.mainUnit.trim().toUpperCase(),
          fractionalUnit: values.fractionalUnit.trim().toUpperCase(),
          operator: 'Current User',
          operationTime: formatOperationTime(),
        },
        ...current,
      ]);
      setIsModalOpen(false);
      message.success('Country created');
    } catch {}
  };
  return (
    <div className="basic-country-page">
      <div className="basic-country-heading">
        <span>Basic Info</span>
        <h1>Country</h1>
      </div>
      <div className="basic-country-table-wrap">
        <div className="basic-country-actions">
          <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
            Create Country
          </Button>
        </div>
        <Table<CountryReference>
          className="basic-country-table"
          dataSource={countries}
          columns={columns}
          rowKey="code"
          scroll={{ x: 1120 }}
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
        className="create-country-modal"
        title="Create Country"
        open={isModalOpen}
        onOk={handleSave}
        onCancel={() => setIsModalOpen(false)}
        okText="Save"
        cancelText="Cancel"
        width={720}
        destroyOnHidden
      >
        <Form<CountryFormValues>
          form={form}
          layout="horizontal"
          labelCol={{ span: 7 }}
          wrapperCol={{ span: 14 }}
          requiredMark
          preserve={false}
        >
          <Form.Item name="code" label="Country" rules={[{ required: true, message: 'Enter Country' }, { pattern: /^[A-Za-z]{2,10}$/, message: 'Use 2-10 letters' }]}>
            <Input placeholder="Country" maxLength={10} />
          </Form.Item>
          <Form.Item name="callingCode" label="Calling Code" rules={[{ required: true, message: 'Enter Calling Code' }, { pattern: /^\d{1,6}$/, message: 'Use 1-6 digits' }]}>
            <Input prefix="+" placeholder="Calling Code" maxLength={6} inputMode="numeric" />
          </Form.Item>
          <Form.Item name="currency" label="Currency" rules={[{ required: true, message: 'Enter Currency' }, { pattern: /^[A-Za-z]{3,10}$/, message: 'Use 3-10 letters' }]}>
            <Input placeholder="Currency" maxLength={10} />
          </Form.Item>
          <Form.Item name="mainUnit" label="Main Unit" rules={[{ required: true, message: 'Enter Main Unit' }]}>
            <Input placeholder="Main Unit" maxLength={40} />
          </Form.Item>
          <Form.Item name="fractionalUnit" label="Fractional Unit" rules={[{ required: true, message: 'Enter Fractional Unit' }]}>
            <Input placeholder="Fractional Unit" maxLength={40} />
          </Form.Item>
          <Form.Item name="ratio" label="Ratio" rules={[{ required: true, message: 'Enter Ratio' }]}>
            <InputNumber placeholder="Ratio" min={0} precision={0} controls={false} />
          </Form.Item>
          <Form.Item name="segmentLength" label="Segment Length" rules={[{ required: true, message: 'Enter Segment Length' }]}>
            <InputNumber placeholder="Segment Length" min={0} precision={0} controls={false} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

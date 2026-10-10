import { useMemo, useState } from 'react';
import { Breadcrumb, Button, Form, Input, Modal, Space, Table, Typography, message } from 'antd';
import { type BusinessTypeRecord, useBusinessTypeStore } from './businessTypeReferenceData';

const { Title } = Typography;

function operationTimeNow() {
  const now = new Date();
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
}

export default function BusinessTypePage() {
  const records = useBusinessTypeStore((state) => state.records);
  const addBusinessType = useBusinessTypeStore((state) => state.addBusinessType);
  const [filterInput, setFilterInput] = useState('');
  const [query, setQuery] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [form] = Form.useForm<{ businessType: string }>();
  const filteredRecords = useMemo(() => records.filter((record) => record.businessType.toLowerCase().includes(query.toLowerCase())), [query, records]);

  const save = async () => {
    try {
      const values = await form.validateFields();
      const businessType = values.businessType.trim().toUpperCase();
      if (records.some((record) => record.businessType === businessType)) {
        form.setFields([{ name: 'businessType', errors: ['Business Type already exists'] }]);
        return;
      }
      addBusinessType({ businessType, operator: 'Current User', operationTime: operationTimeNow() });
      setModalOpen(false);
      message.success('Business Type created');
    } catch { /* Field errors are rendered by Ant Design. */ }
  };

  return (
    <div className="business-type-page">
      <section className="state-machine-heading">
        <Breadcrumb items={[{ title: 'Basic Info', href: '/basic-info' }, { title: 'Business Type' }]} />
        <div className="state-machine-title-line"><Title level={4}>Business Type</Title></div>
      </section>
      <div className="business-type-content">
        <div className="business-type-filter-panel">
          <label><span>Business Type :</span><Input value={filterInput} placeholder="Business Type" onChange={(event) => setFilterInput(event.target.value)} /></label>
          <Space>
            <Button onClick={() => { setFilterInput(''); setQuery(''); }}>Reset</Button>
            <Button type="primary" onClick={() => setQuery(filterInput.trim())}>Query</Button>
          </Space>
        </div>
        <div className="business-type-table-panel">
          <div className="business-type-create"><Button type="primary" onClick={() => { form.resetFields(); setModalOpen(true); }}>Create</Button></div>
          <Table<BusinessTypeRecord>
            className="business-type-table"
            dataSource={filteredRecords}
            columns={[
              { title: 'Business Type', dataIndex: 'businessType', key: 'businessType' },
              { title: 'Operator', dataIndex: 'operator', key: 'operator' },
              { title: 'Operation Time', dataIndex: 'operationTime', key: 'operationTime' },
            ]}
            rowKey="businessType"
            pagination={{ pageSize: 10, showSizeChanger: true, showQuickJumper: true, pageSizeOptions: [10, 20, 50], showTotal: (total) => `Total ${total} items` }}
          />
        </div>
      </div>
      <Modal className="business-type-modal" title="Create Business Type" open={modalOpen} width={700} okText="Save" cancelText="Cancel" onOk={save} onCancel={() => setModalOpen(false)} destroyOnHidden forceRender>
        <Form form={form} labelCol={{ span: 8 }} wrapperCol={{ span: 14 }} preserve={false}>
          <Form.Item name="businessType" label="Business Type" rules={[{ required: true, whitespace: true, message: 'Enter Business Type' }, { pattern: /^[A-Za-z0-9_]+$/, message: 'Use letters, numbers, and underscores only' }]}>
            <Input placeholder="Business Type" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

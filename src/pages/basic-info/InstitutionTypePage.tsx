import { useMemo, useState } from 'react';
import { Breadcrumb, Button, Form, Input, Modal, Select, Space, Table, Typography, message } from 'antd';
import { useBusinessTypeStore } from './businessTypeReferenceData';
import { type InstitutionTypeRecord, useInstitutionTypeStore } from './institutionTypeReferenceData';

const { Title } = Typography;

interface InstitutionTypeFormValues {
  institutionType: string;
  businessTypes: string[];
}

function operationTimeNow() {
  const now = new Date();
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
}

export default function InstitutionTypePage() {
  const businessTypeRecords = useBusinessTypeStore((state) => state.records);
  const records = useInstitutionTypeStore((state) => state.records);
  const addRecord = useInstitutionTypeStore((state) => state.addRecord);
  const updateRecord = useInstitutionTypeStore((state) => state.updateRecord);
  const [institutionTypeFilter, setInstitutionTypeFilter] = useState('');
  const [businessTypeFilter, setBusinessTypeFilter] = useState<string>();
  const [query, setQuery] = useState({ institutionType: '', businessType: undefined as string | undefined });
  const [modalOpen, setModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<InstitutionTypeRecord | null>(null);
  const [form] = Form.useForm<InstitutionTypeFormValues>();

  const businessTypeOptions = businessTypeRecords.map(({ businessType }) => ({ value: businessType, label: businessType }));
  const filteredRecords = useMemo(() => records.filter((record) => {
    const institutionTypeMatches = record.institutionType.toLowerCase().includes(query.institutionType.trim().toLowerCase());
    const businessTypeMatches = !query.businessType || record.businessTypes.includes(query.businessType);
    return institutionTypeMatches && businessTypeMatches;
  }), [query, records]);

  const openCreate = () => {
    setEditingRecord(null);
    form.resetFields();
    setModalOpen(true);
  };

  const openModify = (record: InstitutionTypeRecord) => {
    setEditingRecord(record);
    form.setFieldsValue({ institutionType: record.institutionType, businessTypes: record.businessTypes });
    setModalOpen(true);
  };

  const save = async () => {
    try {
      const values = await form.validateFields();
      const institutionType = values.institutionType.trim().toUpperCase();
      if (!editingRecord && records.some((record) => record.institutionType === institutionType)) {
        form.setFields([{ name: 'institutionType', errors: ['Institution Type already exists'] }]);
        return;
      }
      if (editingRecord) {
        updateRecord(editingRecord.key, { institutionType, businessTypes: values.businessTypes, operator: 'Current User', operationTime: operationTimeNow() });
        message.success('Institution Type updated');
      } else {
        addRecord({ key: institutionType, institutionType, businessTypes: values.businessTypes, operator: 'Current User', operationTime: operationTimeNow() });
        message.success('Institution Type created');
      }
      setModalOpen(false);
    } catch {
      // Ant Design displays field-level validation feedback.
    }
  };

  const columns = [
    { title: 'Institution Type', dataIndex: 'institutionType', key: 'institutionType', width: 190 },
    {
      title: 'Business Types', dataIndex: 'businessTypes', key: 'businessTypes', width: 260,
      render: (values: string[]) => <div className="institution-type-business-values">{values.map((value) => <span key={value}>{value}</span>)}</div>,
    },
    { title: 'Operator', dataIndex: 'operator', key: 'operator', width: 220 },
    { title: 'Operation Time', dataIndex: 'operationTime', key: 'operationTime', width: 190 },
    {
      title: 'Operation', key: 'operation', width: 120,
      render: (_: unknown, record: InstitutionTypeRecord) => <Button type="link" onClick={() => openModify(record)}>Modify</Button>,
    },
  ];

  return (
    <div className="institution-type-page">
      <section className="state-machine-heading">
        <Breadcrumb items={[{ title: 'Basic Info', href: '/basic-info' }, { title: 'Institution Type' }]} />
        <div className="state-machine-title-line"><Title level={4}>Institution Type</Title></div>
      </section>

      <div className="institution-type-content">
        <div className="institution-type-filter-panel">
          <div className="institution-type-filters">
            <label><span>Institution Type :</span><Input value={institutionTypeFilter} placeholder="Institution Type" onChange={(event) => setInstitutionTypeFilter(event.target.value)} /></label>
            <label><span>Business Type :</span><Select allowClear showSearch value={businessTypeFilter} placeholder="Business Type" options={businessTypeOptions} onChange={setBusinessTypeFilter} /></label>
          </div>
          <Space className="institution-type-filter-actions">
            <Button onClick={() => { setInstitutionTypeFilter(''); setBusinessTypeFilter(undefined); setQuery({ institutionType: '', businessType: undefined }); }}>Reset</Button>
            <Button type="primary" onClick={() => setQuery({ institutionType: institutionTypeFilter, businessType: businessTypeFilter })}>Query</Button>
          </Space>
        </div>

        <div className="institution-type-table-panel">
          <div className="institution-type-create"><Button type="primary" onClick={openCreate}>Create</Button></div>
          <Table<InstitutionTypeRecord>
            className="institution-type-table"
            dataSource={filteredRecords}
            columns={columns}
            rowKey="key"
            scroll={{ x: 980 }}
            pagination={{ pageSize: 10, showSizeChanger: true, pageSizeOptions: [10, 20, 50], showTotal: (total) => `Total ${total} items` }}
          />
        </div>
      </div>

      <Modal
        className="institution-type-modal"
        title={editingRecord ? 'Modify Institution Type' : 'Create Institution Type'}
        open={modalOpen}
        width={700}
        okText="Save"
        cancelText="Cancel"
        onOk={save}
        onCancel={() => setModalOpen(false)}
        destroyOnHidden
        forceRender
      >
        <Form form={form} labelCol={{ span: 8 }} wrapperCol={{ span: 14 }} preserve={false}>
          <Form.Item name="institutionType" label="Institution Type" rules={[{ required: true, whitespace: true, message: 'Enter Institution Type' }, { pattern: /^[A-Za-z0-9_]+$/, message: 'Use letters, numbers, and underscores only' }]}>
            <Input placeholder="Institution Type" disabled={Boolean(editingRecord)} />
          </Form.Item>
          <Form.Item name="businessTypes" label="Business Types" rules={[{ required: true, message: 'Select Business Types' }]}>
            <Select mode="multiple" allowClear showSearch placeholder="Business Types" options={businessTypeOptions} maxTagCount="responsive" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

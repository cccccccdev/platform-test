import { useMemo, useState } from 'react';
import { Breadcrumb, Button, Form, Input, Modal, Select, Space, Table, Tabs, Typography, Upload, message } from 'antd';
import { CloudUploadOutlined } from '@ant-design/icons';
import type { UploadFile } from 'antd/es/upload/interface';
import { useBasicInfoReferenceStore } from './basicInfoReferenceStore';
import { useInstitutionTypeStore } from './institutionTypeReferenceData';
import { useInstitutionReferenceStore } from './institutionReferenceData';
import type { InstitutionRecord } from './institutionReferenceData';

const { Title } = Typography;

interface InstitutionFormValues {
  code: string;
  name: string;
  institutionTypes: string[];
  relationInstitutions?: string[];
}

function operationTimeNow() {
  return new Date().toISOString().slice(0, 19).replace('T', ' ');
}

export default function InstitutionPage() {
  const countries = useBasicInfoReferenceStore((state) => state.countries);
  const institutionTypes = useInstitutionTypeStore((state) => state.records);
  const records = useInstitutionReferenceStore((state) => state.records);
  const addRecord = useInstitutionReferenceStore((state) => state.addRecord);
  const updateRecord = useInstitutionReferenceStore((state) => state.updateRecord);
  const [activeCountry, setActiveCountry] = useState(countries[0]?.code ?? 'GSA');
  const [typeFilter, setTypeFilter] = useState<string>();
  const [codeFilter, setCodeFilter] = useState('');
  const [nameFilter, setNameFilter] = useState('');
  const [query, setQuery] = useState({ type: undefined as string | undefined, code: '', name: '' });
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<InstitutionRecord | null>(null);
  const [logoFiles, setLogoFiles] = useState<UploadFile[]>([]);
  const [form] = Form.useForm<InstitutionFormValues>();

  const countryRecords = useMemo(() => records.filter((record) => record.country === activeCountry), [activeCountry, records]);
  const visibleRecords = useMemo(() => countryRecords.filter((record) =>
    (!query.type || record.institutionTypes.includes(query.type))
    && record.code.toLowerCase().includes(query.code.toLowerCase())
    && record.name.toLowerCase().includes(query.name.toLowerCase())), [countryRecords, query]);
  const typeOptions = institutionTypes.map(({ institutionType }) => ({ value: institutionType, label: institutionType }));
  const relationOptions = countryRecords.filter((record) => record.code !== editing?.code).map((record) => ({ value: record.code, label: `${record.code} - ${record.name}`, searchText: `${record.code} ${record.name} ${record.institutionTypes.join(' ')}` }));

  const openCreate = () => { setEditing(null); form.resetFields(); setLogoFiles([]); setModalOpen(true); };
  const openModify = (record: InstitutionRecord) => {
    setEditing(record);
    form.setFieldsValue({ code: record.code, name: record.name, institutionTypes: record.institutionTypes, relationInstitutions: record.relationInstitutions });
    setLogoFiles(record.logo ? [{ uid: '-1', name: record.logo, status: 'done' }] : []);
    setModalOpen(true);
  };
  const save = async () => {
    try {
      const values = await form.validateFields();
      const code = values.code.trim().toUpperCase();
      if (!editing && countryRecords.some((record) => record.code === code)) {
        form.setFields([{ name: 'code', errors: ['Institution Code already exists in this country'] }]); return;
      }
      const next: InstitutionRecord = { code, name: values.name.trim(), country: activeCountry, institutionTypes: values.institutionTypes, relationInstitutions: values.relationInstitutions ?? [], logo: logoFiles[0]?.name, operator: 'Current User', operationTime: operationTimeNow() };
      if (editing) updateRecord(editing.country, editing.code, next); else addRecord(next);
      setModalOpen(false);
      message.success(editing ? 'Institution updated' : 'Institution created');
    } catch { /* Field errors are rendered by Ant Design. */ }
  };

  return <div className="institution-page">
    <section className="state-machine-heading"><Breadcrumb items={[{ title: 'Basic Info', href: '/basic-info' }, { title: 'Institution' }]} /><div className="state-machine-title-line"><Title level={4}>Institution</Title></div></section>
    <div className="institution-content">
      <Tabs activeKey={activeCountry} onChange={(country) => { setActiveCountry(country); setQuery({ type: undefined, code: '', name: '' }); setTypeFilter(undefined); setCodeFilter(''); setNameFilter(''); }} items={countries.map(({ code }) => ({ key: code, label: code }))} />
      <div className="institution-filters">
        <label><span>Institution Type :</span><Select allowClear showSearch value={typeFilter} options={typeOptions} onChange={setTypeFilter} /></label>
        <label><span>Institution Code :</span><Input value={codeFilter} onChange={(event) => setCodeFilter(event.target.value)} /></label>
        <label><span>Institution Name :</span><Input value={nameFilter} onChange={(event) => setNameFilter(event.target.value)} /></label>
      </div>
      <div className="institution-query-actions"><Space><Button onClick={() => { setTypeFilter(undefined); setCodeFilter(''); setNameFilter(''); setQuery({ type: undefined, code: '', name: '' }); }}>Reset</Button><Button type="primary" onClick={() => setQuery({ type: typeFilter, code: codeFilter.trim(), name: nameFilter.trim() })}>Query</Button></Space></div>
      <div className="institution-table-actions"><Space><Button type="primary" onClick={openCreate}>Create</Button><Button type="primary">Bulk Upload</Button><Button type="primary">File List</Button><Button type="primary">Download</Button></Space></div>
      <Table<InstitutionRecord> className="institution-table" dataSource={visibleRecords} rowKey="code" scroll={{ x: 1100 }} columns={[
        { title: 'Institution Name', dataIndex: 'name', key: 'name', width: 230 }, { title: 'Institution Code', dataIndex: 'code', key: 'code', width: 200 },
        { title: 'Country', dataIndex: 'country', key: 'country', width: 85 }, { title: 'Institution Type', dataIndex: 'institutionTypes', key: 'institutionTypes', width: 180, render: (types: string[]) => types.join(', ') },
        { title: 'Logo', dataIndex: 'logo', key: 'logo', width: 90 }, { title: 'Operator', dataIndex: 'operator', key: 'operator', width: 150 },
        { title: 'Operation Time', dataIndex: 'operationTime', key: 'operationTime', width: 185 }, { title: 'Operations', key: 'operations', width: 100, render: (_, record) => <Button type="link" onClick={() => openModify(record)}>Modify</Button> },
      ]} pagination={{ pageSize: 10, showTotal: (total) => `Total ${total} items` }} />
    </div>
    <Modal className="institution-modal" title={editing ? 'Modify Institution' : 'Create Institution'} open={modalOpen} width={900} okText="Save" cancelText="Cancel" onOk={save} onCancel={() => setModalOpen(false)} destroyOnHidden forceRender>
      <Form form={form} labelCol={{ span: 6 }} wrapperCol={{ span: 16 }} preserve={false}>
        <Form.Item name="code" label="Institution Code" rules={[{ required: true, whitespace: true, message: 'Enter Institution Code' }]}><Input placeholder="Institution Code" disabled={Boolean(editing)} /></Form.Item>
        <Form.Item name="name" label="Institution Name" rules={[{ required: true, whitespace: true, message: 'Enter Institution Name' }]}><Input placeholder="Institution Name" /></Form.Item>
        <Form.Item name="institutionTypes" label="Institution Type" rules={[{ required: true, message: 'Select Institution Type' }]}><Select mode="multiple" allowClear showSearch placeholder="Institution Type" options={typeOptions} /></Form.Item>
        <Form.Item label="Logo"><Upload beforeUpload={() => false} maxCount={1} fileList={logoFiles} onChange={({ fileList }) => setLogoFiles(fileList)}><Button type="primary" icon={<CloudUploadOutlined />}>Upload</Button></Upload></Form.Item>
        <Form.Item name="relationInstitutions" label="Relation Institutions" extra="Search code, name or type first"><Select mode="multiple" allowClear showSearch placeholder="Please search and select relation institutions" optionFilterProp="searchText" options={relationOptions} filterOption={(input, option) => String(option?.searchText ?? '').toLowerCase().includes(input.toLowerCase())} /></Form.Item>
      </Form>
    </Modal>
  </div>;
}

import { useMemo, useState } from 'react';
import { Breadcrumb, Button, Form, Input, Modal, Select, Space, Table, Tabs, Typography, Upload, message } from 'antd';
import { CloudUploadOutlined } from '@ant-design/icons';
import type { UploadFile } from 'antd/es/upload/interface';
import { useBasicInfoReferenceStore } from './basicInfoReferenceStore';
import { useInstitutionTypeStore } from './institutionTypeReferenceData';

const { Title } = Typography;

interface InstitutionRecord {
  code: string;
  name: string;
  country: string;
  institutionTypes: string[];
  logo?: string;
  relationInstitutions: string[];
  operator: string;
  operationTime: string;
}

interface InstitutionFormValues {
  code: string;
  name: string;
  institutionTypes: string[];
  relationInstitutions?: string[];
}

const initialInstitutions: InstitutionRecord[] = [
  { name: 'NEDBANK LIMITED', code: '198765', country: 'GSA', institutionTypes: ['BANK'], relationInstitutions: [], operator: '胡冰楠', operationTime: '2026-05-22 06:53:57' },
  { name: 'VISA', code: 'VISA', country: 'ZA', institutionTypes: ['CARD_SCHEME'], relationInstitutions: [], operator: 'haixia.zhang', operationTime: '2026-05-26 07:31:43' },
  { name: 'MasterCard', code: 'MASTERCARD', country: 'ZA', institutionTypes: ['CARD_SCHEME'], relationInstitutions: [], operator: 'haixia.zhang', operationTime: '2026-05-26 07:31:13' },
  { name: 'VIRTUAL_INSTITUTION', code: 'VIRTUAL_INSTITUTION', country: 'ZA', institutionTypes: ['BANK'], relationInstitutions: [], operator: 'Rick', operationTime: '2025-10-29 02:32:06' },
  { name: '3(Hutchison Telecom HK LTD)', code: 'HT_HK_LTD', country: 'HK', institutionTypes: ['TELECOM_OPERATOR'], relationInstitutions: [], operator: '冯启航 Felix', operationTime: '2025-12-09 13:57:47' },
  { name: 'Multibyte Info Technology Ltd (MVNO)', code: 'MIT_LTD', country: 'HK', institutionTypes: ['TELECOM_OPERATOR'], relationInstitutions: [], operator: '冯启航 Felix', operationTime: '2025-12-09 13:56:50' },
  { name: 'Hong Kong Telecommunications (HKT/CSL)', code: 'TELECOM_HK', country: 'HK', institutionTypes: ['TELECOM_OPERATOR'], relationInstitutions: [], operator: '冯启航 Felix', operationTime: '2025-12-09 13:55:55' },
  { name: 'HK China Telecom Global Limited', code: 'HK_CHINA_TELECOM', country: 'HK', institutionTypes: ['TELECOM_OPERATOR'], relationInstitutions: [], operator: '冯启航 Felix', operationTime: '2025-12-09 13:55:16' },
  { name: 'CITIC Telecom 1616 (CSL MVNO)', code: 'CITIC_TELECOM', country: 'HK', institutionTypes: ['TELECOM_OPERATOR'], relationInstitutions: [], operator: '冯启航 Felix', operationTime: '2025-12-09 13:54:32' },
  { name: 'China Unicom HK Limited', code: 'UNICOM_HK_LIMITED', country: 'HK', institutionTypes: ['TELECOM_OPERATOR'], relationInstitutions: [], operator: '冯启航 Felix', operationTime: '2025-12-09 13:51:06' },
  { name: 'China-HongKong Telecom', code: 'HK_TELECOM', country: 'HK', institutionTypes: ['TELECOM_OPERATOR'], relationInstitutions: [], operator: '冯启航 Felix', operationTime: '2025-12-09 13:50:27' },
  { name: 'China Mobile HK', code: 'CHINA_MOBILE_HK', country: 'HK', institutionTypes: ['TELECOM_OPERATOR'], relationInstitutions: [], operator: '冯启航 Felix', operationTime: '2025-12-09 13:49:35' },
  { name: 'SmarTone HK', code: 'SMARTONE', country: 'HK', institutionTypes: ['TELECOM_OPERATOR'], relationInstitutions: [], operator: '冯启航 Felix', operationTime: '2025-12-09 13:48:28' },
];

function operationTimeNow() {
  return new Date().toISOString().slice(0, 19).replace('T', ' ');
}

export default function InstitutionPage() {
  const countries = useBasicInfoReferenceStore((state) => state.countries);
  const institutionTypes = useInstitutionTypeStore((state) => state.records);
  const [records, setRecords] = useState(initialInstitutions);
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
      setRecords((current) => editing ? current.map((record) => record.country === editing.country && record.code === editing.code ? next : record) : [next, ...current]);
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

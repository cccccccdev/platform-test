import { useMemo, useState } from 'react';
import { Button, Form, Input, Modal, Select, Space, Table, Tabs, message } from 'antd';
import type { ConfigAbility } from './types';

interface InstitutionMapping {
  id: string;
  bt: string;
  ability: string;
  country: string;
  institutionCode: string;
  institutionName: string;
  channelInstitutionCode?: string;
  channelInstitutionName?: string;
  operator: string;
  operationTime: string;
}

interface MappingFormValues {
  institutionCode: string;
  channelInstitutionCode?: string;
  channelInstitutionName?: string;
}

const basicInfoNgInstitutions = [
  { code: 'GTBANK_NG', name: 'GUARANTY TRUST BANK' },
  { code: 'ZENITH_NG', name: 'ZENITH BANK' },
  { code: 'ACCESS_NG', name: 'ACCESS BANK' },
  { code: 'UBA_NG', name: 'UNITED BANK FOR AFRICA' },
  { code: 'FIRST_BANK_NG', name: 'FIRST BANK OF NIGERIA' },
];

const initialMappings: InstitutionMapping[] = [
  { id: 'paystack-gtb', bt: 'BANK_ACCOUNT_CREDIT', ability: 'TRANSFER_INTER', country: 'NG', institutionCode: 'GTBANK_NG', institutionName: 'GUARANTY TRUST BANK', channelInstitutionCode: '058', channelInstitutionName: 'Guaranty Trust Bank', operator: 'Bailly', operationTime: '2026-08-19 03:53:28' },
  { id: 'paystack-zenith', bt: 'BANK_ACCOUNT_CREDIT', ability: 'TRANSFER_INTER', country: 'NG', institutionCode: 'ZENITH_NG', institutionName: 'ZENITH BANK', channelInstitutionCode: '057', channelInstitutionName: 'Zenith Bank', operator: 'Bailly', operationTime: '2026-08-19 03:53:28' },
  { id: 'paystack-access', bt: 'BANK_ACCOUNT_CREDIT', ability: 'TRANSFER_INTER', country: 'NG', institutionCode: 'ACCESS_NG', institutionName: 'ACCESS BANK', channelInstitutionCode: '044', channelInstitutionName: 'Access Bank', operator: 'Bailly', operationTime: '2026-08-19 03:53:28' },
  { id: 'paystack-uba', bt: 'BANK_ACCOUNT_CREDIT', ability: 'TRANSFER_INTER', country: 'NG', institutionCode: 'UBA_NG', institutionName: 'UNITED BANK FOR AFRICA', channelInstitutionCode: '033', channelInstitutionName: 'United Bank for Africa', operator: 'Bailly', operationTime: '2026-08-19 03:53:28' },
  { id: 'paystack-first', bt: 'BANK_ACCOUNT_CREDIT', ability: 'TRANSFER_INTER', country: 'NG', institutionCode: 'FIRST_BANK_NG', institutionName: 'FIRST BANK OF NIGERIA', operator: 'Bailly', operationTime: '2026-08-19 03:53:28' },
];

export default function ChannelInfoInstitutionPage({ channelCode, cloud, env, configuredAbilities }: { channelCode: string; cloud: string; env: string; configuredAbilities: ConfigAbility[] }) {
  const [records, setRecords] = useState<InstitutionMapping[]>(channelCode === 'PAYSTACK_NG' ? initialMappings : []);
  const [bt, setBt] = useState('BANK_ACCOUNT_CREDIT');
  const [ability, setAbility] = useState('TRANSFER_INTER');
  const [country, setCountry] = useState('NG');
  const [filters, setFilters] = useState({ institutionName: '', institutionCode: '', channelInstitutionName: '', channelInstitutionCode: '' });
  const [query, setQuery] = useState(filters);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<InstitutionMapping | null>(null);
  const [form] = Form.useForm<MappingFormValues>();
  const deployedAbilities = useMemo(() => configuredAbilities.filter((item) => item.versions.some((version) => version.badges?.some((badge) => badge.cloud === cloud && badge.env === env))), [cloud, configuredAbilities, env]);
  const scopeAbilities = deployedAbilities.length ? deployedAbilities : channelCode === 'PAYSTACK_NG' ? [{ bt: 'BANK_ACCOUNT_CREDIT', ability: 'TRANSFER_INTER' }] : [];
  const btItems = [...new Set(scopeAbilities.map((item) => item.bt))].map((value) => ({ key: value, label: value }));
  const abilityItems = [...new Set(scopeAbilities.filter((item) => item.bt === bt).map((item) => item.ability))].map((value) => ({ key: value, label: value }));
  const countryItems = channelCode === 'PAYSTACK_NG' && bt === 'BANK_ACCOUNT_CREDIT' ? [{ key: 'NG', label: 'NG' }] : [];
  const selectedInstitutionCode = Form.useWatch('institutionCode', form);
  const selectedInstitution = basicInfoNgInstitutions.find((item) => item.code === selectedInstitutionCode);
  const scoped = useMemo(() => records.filter((record) => record.bt === bt && record.ability === ability && record.country === country), [ability, bt, country, records]);
  const visible = useMemo(() => scoped.filter((record) => record.institutionName.toLowerCase().includes(query.institutionName.toLowerCase()) && record.institutionCode.toLowerCase().includes(query.institutionCode.toLowerCase()) && (record.channelInstitutionName ?? '').toLowerCase().includes(query.channelInstitutionName.toLowerCase()) && (record.channelInstitutionCode ?? '').toLowerCase().includes(query.channelInstitutionCode.toLowerCase())), [query, scoped]);

  const openCreate = () => { setEditing(null); form.resetFields(); setModalOpen(true); };
  const openModify = (record: InstitutionMapping) => { setEditing(record); form.setFieldsValue({ institutionCode: record.institutionCode, channelInstitutionCode: record.channelInstitutionCode, channelInstitutionName: record.channelInstitutionName }); setModalOpen(true); };
  const save = async () => {
    try {
      const values = await form.validateFields();
      const institution = basicInfoNgInstitutions.find((item) => item.code === values.institutionCode);
      if (!institution) return;
      const externalCode = values.channelInstitutionCode?.trim();
      const duplicateInternal = scoped.some((record) => record.id !== editing?.id && record.institutionCode === institution.code);
      const duplicateExternal = externalCode && scoped.some((record) => record.id !== editing?.id && record.channelInstitutionCode === externalCode);
      if (duplicateInternal) { form.setFields([{ name: 'institutionCode', errors: ['Institution Code already has a mapping in this scope'] }]); return; }
      if (duplicateExternal) { form.setFields([{ name: 'channelInstitutionCode', errors: ['Channel Institution Code must be unique in this scope'] }]); return; }
      const next: InstitutionMapping = { id: editing?.id ?? `mapping-${Date.now()}`, bt, ability, country, institutionCode: institution.code, institutionName: institution.name, channelInstitutionCode: externalCode || undefined, channelInstitutionName: values.channelInstitutionName?.trim() || undefined, operator: 'Current User', operationTime: new Date().toISOString().slice(0, 19).replace('T', ' ') };
      setRecords((current) => editing ? current.map((record) => record.id === editing.id ? next : record) : [next, ...current]);
      setModalOpen(false); message.success(editing ? 'Institution mapping updated' : 'Institution mapping created');
    } catch { /* Field errors are rendered by Ant Design. */ }
  };

  const setFilter = (key: keyof typeof filters, value: string) => setFilters((current) => ({ ...current, [key]: value }));
  return <div className="channel-info-institution">
    <Tabs activeKey={bt} onChange={setBt} items={btItems} />
    <Tabs activeKey={ability} onChange={setAbility} items={abilityItems} />
    <Tabs activeKey={country} onChange={setCountry} items={countryItems} />
    <div className="channel-institution-filters">
      <label><span>Institution Name :</span><Input value={filters.institutionName} onChange={(event) => setFilter('institutionName', event.target.value)} /></label>
      <label><span>Channel Institution Name :</span><Input value={filters.channelInstitutionName} onChange={(event) => setFilter('channelInstitutionName', event.target.value)} /></label>
      <label><span>Institution Code :</span><Input value={filters.institutionCode} onChange={(event) => setFilter('institutionCode', event.target.value)} /></label>
      <label><span>Channel Institution Code :</span><Input value={filters.channelInstitutionCode} onChange={(event) => setFilter('channelInstitutionCode', event.target.value)} /></label>
    </div>
    <div className="channel-institution-query"><Space><Button onClick={() => { const empty = { institutionName: '', institutionCode: '', channelInstitutionName: '', channelInstitutionCode: '' }; setFilters(empty); setQuery(empty); }}>Reset</Button><Button type="primary" onClick={() => setQuery(filters)}>Query</Button></Space></div>
    <div className="channel-institution-actions"><Space><Button type="primary" onClick={openCreate}>Create</Button><Button type="primary">Bulk Upload</Button><Button type="primary">File List</Button><Button type="primary">Download</Button></Space></div>
    <Table<InstitutionMapping> rowKey="id" dataSource={visible} scroll={{ x: 1200 }} pagination={{ pageSize: 10, showTotal: (total) => `Total ${total} items` }} columns={[
      { title: 'Institution Code', dataIndex: 'institutionCode', key: 'institutionCode', width: 170 }, { title: 'Institution Name', dataIndex: 'institutionName', key: 'institutionName', width: 260 },
      { title: 'Channel Institution Code', dataIndex: 'channelInstitutionCode', key: 'channelInstitutionCode', width: 210, render: (value) => value ?? '-' }, { title: 'Channel Institution Name', dataIndex: 'channelInstitutionName', key: 'channelInstitutionName', width: 260, render: (value) => value ?? '-' },
      { title: 'Operator', dataIndex: 'operator', key: 'operator', width: 140 }, { title: 'Operation Time', dataIndex: 'operationTime', key: 'operationTime', width: 190 }, { title: 'Operation', key: 'operation', width: 100, render: (_, record) => <Button type="link" onClick={() => openModify(record)}>Modify</Button> },
    ]} />
    <Modal title={editing ? 'Modify Supported Institution' : 'Add Supported Institution'} open={modalOpen} width={560} okText="OK" cancelText="Cancel" onOk={save} onCancel={() => setModalOpen(false)} destroyOnHidden forceRender>
      <Form form={form} labelCol={{ span: 10 }} wrapperCol={{ span: 13 }} preserve={false}>
        <Form.Item label="Business Type"><span>{bt}</span></Form.Item><Form.Item label="Ability"><span>{ability}</span></Form.Item><Form.Item label="Country"><span>{country}</span></Form.Item>
        <Form.Item name="institutionCode" label="Institution Name" rules={[{ required: true, message: 'Select Institution Name' }]}><Select showSearch disabled={Boolean(editing)} placeholder="Institution Name" optionFilterProp="searchText" options={basicInfoNgInstitutions.map((item) => ({ value: item.code, label: item.name, searchText: `${item.code} ${item.name}` }))} /></Form.Item>
        <Form.Item label="Institution Code"><span>{selectedInstitution?.code ?? editing?.institutionCode ?? '-'}</span></Form.Item>
        <Form.Item name="channelInstitutionName" label="Channel Institution Name"><Input /></Form.Item>
        <Form.Item name="channelInstitutionCode" label="Channel Institution Code"><Input /></Form.Item>
      </Form>
    </Modal>
  </div>;
}

import { useEffect, useMemo, useState } from 'react';
import { Alert, Button, Cascader, Form, Input, Modal, Space, Table, Tabs, Upload, message } from 'antd';
import { useInstitutionReferenceStore } from '../basic-info/institutionReferenceData';
import { useChannelInstitutionStore, type ChannelInstitutionMapping } from './channelInstitutionStore';
import type { ConfigAbility } from './types';

interface MappingFormValues { institutionSelection: string[]; channelInstitutionCode?: string; channelInstitutionName?: string }
const operationTimeNow = () => new Date().toISOString().slice(0, 19).replace('T', ' ');

export default function ChannelInfoInstitutionPage({ channelCode, cloud, env, configuredAbilities }: { channelCode: string; cloud: string; env: string; configuredAbilities: ConfigAbility[] }) {
  const institutions = useInstitutionReferenceStore((state) => state.records);
  const records = useChannelInstitutionStore((state) => state.records);
  const saveRecord = useChannelInstitutionStore((state) => state.save);
  const [bt, setBt] = useState(channelCode === 'COBO' ? 'STABLECOIN' : 'BANK_ACCOUNT_CREDIT');
  const [ability, setAbility] = useState(channelCode === 'COBO' ? 'ON_RAMP' : 'TRANSFER_INTER');
  const [country, setCountry] = useState(channelCode === 'COBO' ? 'GSA' : 'NG');
  const [filters, setFilters] = useState({ institutionName: '', institutionCode: '', channelInstitutionName: '', channelInstitutionCode: '' });
  const [query, setQuery] = useState(filters);
  const [modalOpen, setModalOpen] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [editing, setEditing] = useState<ChannelInstitutionMapping | null>(null);
  const [form] = Form.useForm<MappingFormValues>();
  const deployedAbilities = useMemo(() => configuredAbilities.filter((item) => item.versions.some((version) => version.badges?.some((badge) => badge.cloud === cloud && badge.env === env))), [cloud, configuredAbilities, env]);
  const scopeAbilities = deployedAbilities.length ? deployedAbilities : channelCode === 'PAYSTACK_NG' ? [{ bt: 'BANK_ACCOUNT_CREDIT', ability: 'TRANSFER_INTER' }] : [];
  const btItems = [...new Set(scopeAbilities.map((item) => item.bt))].map((value) => ({ key: value, label: value }));
  const abilityItems = [...new Set(scopeAbilities.filter((item) => item.bt === bt).map((item) => item.ability))].map((value) => ({ key: value, label: value }));
  const countryItems = channelCode === 'COBO' && bt === 'STABLECOIN' ? [{ key: 'GSA', label: 'GSA' }] : channelCode === 'PAYSTACK_NG' ? [{ key: 'NG', label: 'NG' }] : [];
  const institutionOptions = useMemo(() => Array.from(new Set(institutions.map((item) => item.country))).sort().map((institutionCountry) => ({ value: institutionCountry, label: institutionCountry, children: institutions.filter((item) => item.country === institutionCountry).map((item) => ({ value: item.code, label: item.name })) })), [institutions]);
  const selectedPath = Form.useWatch('institutionSelection', form);
  const selectedInstitution = selectedPath?.length === 2 ? institutions.find((item) => item.country === selectedPath[0] && item.code === selectedPath[1]) : undefined;
  const displayedInstitutionCode = selectedInstitution ? `${selectedInstitution.code}${selectedInstitution.country === country ? '' : `#${selectedInstitution.country}`}` : editing?.institutionCode ?? '-';
  const scoped = records.filter((item) => item.channelCode === channelCode && item.bt === bt && item.ability === ability && item.country === country);
  const visible = scoped.filter((record) => record.institutionName.toLowerCase().includes(query.institutionName.toLowerCase()) && record.institutionCode.toLowerCase().includes(query.institutionCode.toLowerCase()) && (record.channelInstitutionName ?? '').toLowerCase().includes(query.channelInstitutionName.toLowerCase()) && (record.channelInstitutionCode ?? '').toLowerCase().includes(query.channelInstitutionCode.toLowerCase()));

  useEffect(() => { if (!abilityItems.some((item) => item.key === ability)) setAbility(abilityItems[0]?.key ?? ''); }, [ability, abilityItems]);
  const openCreate = () => { setEditing(null); form.resetFields(); setModalOpen(true); };
  const openModify = (record: ChannelInstitutionMapping) => { setEditing(record); form.setFieldsValue({ institutionSelection: [record.institutionCountry, record.institutionCode.split('#')[0]], channelInstitutionCode: record.channelInstitutionCode, channelInstitutionName: record.channelInstitutionName }); setModalOpen(true); };
  const save = async () => {
    try {
      const values = await form.validateFields();
      const institution = institutions.find((item) => item.country === values.institutionSelection[0] && item.code === values.institutionSelection[1]);
      if (!institution) return;
      const requestInstitutionCode = institution.code;
      // The create API receives the raw code; this composes the persisted value returned by the backend.
      const storedCode = `${requestInstitutionCode}${institution.country === country ? '' : `#${institution.country}`}`;
      const externalCode = values.channelInstitutionCode?.trim();
      if (scoped.some((item) => item.id !== editing?.id && item.institutionCode === storedCode)) { form.setFields([{ name: 'institutionSelection', errors: ['Institution Code already has a mapping in this scope'] }]); return; }
      if (externalCode && scoped.some((item) => item.id !== editing?.id && item.channelInstitutionCode === externalCode)) { form.setFields([{ name: 'channelInstitutionCode', errors: ['Channel Institution Code must be unique in this scope'] }]); return; }
      const operationTime = operationTimeNow();
      saveRecord({ id: editing?.id ?? `mapping-${operationTime.replaceAll(/\D/g, '')}`, channelCode, bt, ability, country, institutionCountry: institution.country, institutionCode: storedCode, institutionName: institution.name, channelInstitutionCode: externalCode || undefined, channelInstitutionName: values.channelInstitutionName?.trim() || undefined, operator: 'Current User', operationTime });
      setModalOpen(false); message.success(editing ? 'Institution mapping updated' : 'Institution mapping created');
    } catch { /* Ant Design renders field errors. */ }
  };
  const setFilter = (key: keyof typeof filters, value: string) => setFilters((current) => ({ ...current, [key]: value }));

  return <div className="channel-info-institution">
    <Tabs activeKey={bt} onChange={setBt} items={btItems} /><Tabs activeKey={ability} onChange={setAbility} items={abilityItems} /><Tabs activeKey={country} onChange={setCountry} items={countryItems} />
    <div className="channel-institution-filters"><label><span>Institution Name :</span><Input value={filters.institutionName} onChange={(event) => setFilter('institutionName', event.target.value)} /></label><label><span>Channel Institution Name :</span><Input value={filters.channelInstitutionName} onChange={(event) => setFilter('channelInstitutionName', event.target.value)} /></label><label><span>Institution Code :</span><Input value={filters.institutionCode} onChange={(event) => setFilter('institutionCode', event.target.value)} /></label><label><span>Channel Institution Code :</span><Input value={filters.channelInstitutionCode} onChange={(event) => setFilter('channelInstitutionCode', event.target.value)} /></label></div>
    <div className="channel-institution-query"><Space><Button onClick={() => { const empty = { institutionName: '', institutionCode: '', channelInstitutionName: '', channelInstitutionCode: '' }; setFilters(empty); setQuery(empty); }}>Reset</Button><Button type="primary" onClick={() => setQuery(filters)}>Query</Button></Space></div>
    <div className="channel-institution-actions"><Space><Button type="primary" onClick={openCreate}>Create</Button><Button type="primary" onClick={() => setBulkOpen(true)}>Bulk Upload</Button><Button type="primary">File List</Button><Button type="primary">Download</Button></Space></div>
    <Table<ChannelInstitutionMapping> rowKey="id" dataSource={visible} scroll={{ x: 1200 }} pagination={{ pageSize: 10, showTotal: (total) => `Total ${total} items` }} columns={[{ title: 'Institution Code', dataIndex: 'institutionCode', width: 170 }, { title: 'Institution Name', dataIndex: 'institutionName', width: 260 }, { title: 'Channel Institution Code', dataIndex: 'channelInstitutionCode', width: 210, render: (value) => value ?? '-' }, { title: 'Channel Institution Name', dataIndex: 'channelInstitutionName', width: 260, render: (value) => value ?? '-' }, { title: 'Operator', dataIndex: 'operator', width: 140 }, { title: 'Operation Time', dataIndex: 'operationTime', width: 190 }, { title: 'Operation', width: 100, render: (_, record) => <Button type="link" onClick={() => openModify(record)}>Modify</Button> }]} />
    <Modal title={editing ? 'Modify Supported Institution' : 'Add Supported Institution'} open={modalOpen} width={600} okText="OK" cancelText="Cancel" onOk={save} onCancel={() => setModalOpen(false)} destroyOnHidden forceRender><Form form={form} labelCol={{ span: 10 }} wrapperCol={{ span: 13 }} preserve={false}><Form.Item label="Business Type"><span>{bt}</span></Form.Item><Form.Item label="Ability"><span>{ability}</span></Form.Item><Form.Item label="Country"><span>{country}</span></Form.Item><Form.Item name="institutionSelection" label="Institution Name" rules={[{ required: true, message: 'Select Institution Name' }]}><Cascader showSearch disabled={Boolean(editing)} placeholder="Country / Institution Name" options={institutionOptions} /></Form.Item><Form.Item label="Institution Code"><span>{displayedInstitutionCode}</span></Form.Item><Form.Item name="channelInstitutionName" label="Channel Institution Name"><Input /></Form.Item><Form.Item name="channelInstitutionCode" label="Channel Institution Code"><Input /></Form.Item></Form></Modal>
    <Modal title="Bulk Upload Institution Mapping" open={bulkOpen} footer={<Button onClick={() => setBulkOpen(false)}>Close</Button>} onCancel={() => setBulkOpen(false)} destroyOnHidden><Alert type="info" showIcon style={{ marginBottom: 16 }} message="Cross-country Institution Codes must be composed in Excel." description={`For page Country ${country}, use the raw Institution Code for ${country} institutions. For another country, upload <institution_code>#<country_code>. Values such as <institution_code>#${country} are invalid and will be rejected.`} /><Upload.Dragger accept=".xlsx,.xls" beforeUpload={() => false} maxCount={1}><p>Click or drag an Excel file to this area</p></Upload.Dragger></Modal>
  </div>;
}

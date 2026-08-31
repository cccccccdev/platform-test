import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Breadcrumb,
  Button,
  Collapse,
  Form,
  Input,
  Menu,
  Modal,
  Popconfirm,
  Select,
  Space,
  Table,
  Tag,
  Upload,
  message,
} from 'antd';
import { ArrowLeftOutlined, DownOutlined, MinusCircleOutlined, RightOutlined, UploadOutlined } from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import { Brand, UserProfile } from '../../components/PlatformChrome';
import { businessTypeOptions, partyOptions } from '../../mock/data';
import { countryCodeOptions } from '../../mock/countries';
import { getCreatedIntegrationRecord } from './channelCreationStore';

type ProfileSection = 'summary' | 'business-types' | 'parties' | 'owners' | 'approvers' | 'integration-records';
type IntegrationMode = 'CONFIG' | 'CODE';

type BusinessTypeRow = {
  bt: string;
  mode: IntegrationMode;
  countries: string[];
  operator: string;
  operationTime: string;
};

type PartyRow = { party: string; operator: string; operationTime: string };
type PersonOption = { label: string; value: string };

type OwnerSettings = {
  productOwners: string[];
  technicalOwners: string[];
  operationOwners: string[];
  bd: string[];
  sre: string[];
  businessOwners: string[];
};

type ApproverSettings = {
  productApprover: string;
  technicalApprover: string;
  operationsApprover: string;
};

type RecordCapabilityScope = {
  businessType: string;
  integrationType: IntegrationMode;
  ability: string;
  countries: string[];
};

type RecordPartyScope = {
  party: string;
  capabilities: RecordCapabilityScope[];
};

type IntegrationRecord = {
  recordId: string;
  recordName: string;
  partyScopes: RecordPartyScope[];
  contracts?: string;
  accessApprovalRecords?: string;
  brdDocuments?: string;
  debugReports?: string;
  prdDocuments: string;
  gatewayDeliverables?: string;
  operator: string;
  operationTime: string;
  linkedToGroup: boolean;
};

const employeeOptions: PersonOption[] = [
  'Amina Bello',
  'Chen Rui',
  'Damilola Adebayo',
  'Fatima Khan',
  'Li Ming',
  'Nadia Rahman',
  'Rahul Mehta',
  'Zhang Wei',
].map((name) => ({ label: name, value: name }));

const abilitiesByBusinessType: Record<string, string[]> = {
  COLLECTION: ['CARD_PAY', 'USSD_PAY', 'WALLET_PAY'],
  DISBURSEMENT: ['BANK_TRF', 'WALLET_PAYOUT'],
  REFUND: ['REFUND_PAY'],
  TRANSFER: ['WALLET_TRF'],
  BANK_CARD_DEBIT: ['INFO_PAYMENT'],
  WALLET_DEBIT: ['TRANSFER'],
  SMS: ['SINGLE_MESSAGE', 'BULK_MESSAGE'],
  KYC: ['FINGERPRINT_VERIFY'],
  FUND_NOTIFICATION: ['CUSTOMER_VALIDATION', 'EXTERNAL_CREDIT'],
};

const sectionTitles: Record<ProfileSection, string> = {
  summary: 'Summary',
  'business-types': 'Business Types & Countries',
  parties: 'Parties',
  owners: 'Channel Owners',
  approvers: 'Approvers',
  'integration-records': 'Integration Records',
};

const now = () => new Date().toLocaleString('sv-SE').replace('T', ' ');

export default function ChannelProfilePage() {
  const navigate = useNavigate();
  const { channelCode = 'CREDIT_SWITCH', section = 'business-types' } = useParams();
  const activeSection = (Object.hasOwn(sectionTitles, section) ? section : 'summary') as ProfileSection;
  const [businessTypeForm] = Form.useForm();
  const [partyForm] = Form.useForm();
  const [ownersForm] = Form.useForm<OwnerSettings>();
  const [approversForm] = Form.useForm<ApproverSettings>();
  const [recordForm] = Form.useForm<any>();
  const [recordDetailForm] = Form.useForm<any>();
  const [businessTypeModalOpen, setBusinessTypeModalOpen] = useState(false);
  const [partyModalOpen, setPartyModalOpen] = useState(false);
  const [recordModalOpen, setRecordModalOpen] = useState(false);
  const [recordDetailOpen, setRecordDetailOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<IntegrationRecord | null>(null);
  const [channelMenuOpen, setChannelMenuOpen] = useState(true);
  const [editingBusinessType, setEditingBusinessType] = useState<string | null>(null);

  const createdRecord = useMemo(() => getCreatedIntegrationRecord(channelCode), [channelCode]);

  const [businessTypes, setBusinessTypes] = useState<BusinessTypeRow[]>(() => {
    if (!createdRecord) return [{ bt: 'WALLET_DEBIT', mode: 'CONFIG', countries: ['TZ'], operator: 'zihao.ye', operationTime: '2026-08-24 07:33:39' }];
    const rows = new Map<string, BusinessTypeRow>();
    createdRecord.partyScopes.forEach(({ capabilities }) => capabilities.forEach((capability) => {
      const existing = rows.get(capability.businessType);
      rows.set(capability.businessType, { bt: capability.businessType, mode: capability.integrationType, countries: Array.from(new Set([...(existing?.countries || []), ...capability.countries])), operator: 'current.user', operationTime: now() });
    }));
    return Array.from(rows.values());
  });
  const [parties, setParties] = useState<PartyRow[]>(() => createdRecord
    ? createdRecord.partyScopes.map(({ party }) => ({ party, operator: 'current.user', operationTime: now() }))
    : [{ party: 'TMUL', operator: 'zihao.ye', operationTime: '2026-08-24 07:33:56' }]);
  const [owners, setOwners] = useState<OwnerSettings>({
    productOwners: ['Nadia Rahman'],
    technicalOwners: ['Chen Rui'],
    operationOwners: ['Amina Bello'],
    bd: [],
    sre: ['Li Ming'],
    businessOwners: [],
  });
  const [approvers, setApprovers] = useState<ApproverSettings>({
    productApprover: 'Fatima Khan',
    technicalApprover: 'Zhang Wei',
    operationsApprover: 'Rahul Mehta',
  });
  const [records, setRecords] = useState<IntegrationRecord[]>(() => createdRecord ? [{
    ...createdRecord,
    recordId: 'IR-000001',
    operator: 'current.user',
    operationTime: now(),
    linkedToGroup: false,
  }] : [{
      recordId: 'IR-000128',
      recordName: 'TMUL Wallet Debit Initial Integration',
      partyScopes: [{ party: 'TMUL', capabilities: [{ businessType: 'WALLET_DEBIT', integrationType: 'CONFIG', ability: 'TRANSFER', countries: ['TZ'] }] }],
      prdDocuments: 'TMUL Wallet Debit PRD.pdf',
      gatewayDeliverables: 'Gateway delivery checklist.xlsx',
      operator: 'zihao.ye',
      operationTime: '2026-08-24 07:36:12',
      linkedToGroup: true,
    }]);

  useEffect(() => {
    if (section === 'business-types' || section === 'parties') {
      navigate(`/channel-integration/${channelCode}/channel-profile/summary`, { replace: true });
    }
  }, [channelCode, navigate, section]);

  const allPartyOptions = useMemo(
    () => Array.from(new Set([...partyOptions, 'TMUL'])).map((value) => ({ label: value, value })),
    [],
  );

  const navigateSection = (key: string) => {
    navigate(`/channel-integration/${channelCode}/channel-profile/${key}`);
  };

  const validateRecordScopes = (scopes: RecordPartyScope[]) => {
    const partyNames = scopes.map(({ party }) => party);
    if (new Set(partyNames).size !== partyNames.length) return 'Each Party can only be added once';
    const integrationTypes = new Map<string, IntegrationMode>();
    for (const scope of scopes) {
      const capabilityKeys = scope.capabilities.map(({ businessType, ability }) => `${businessType}::${ability}`);
      if (new Set(capabilityKeys).size !== capabilityKeys.length) return 'Duplicate Business Type / Ability combinations are not allowed within the same Party';
      for (const capability of scope.capabilities) {
        const configuredType = businessTypes.find(({ bt }) => bt === capability.businessType)?.mode;
        if (configuredType && configuredType !== capability.integrationType) return `Integration Type for ${capability.businessType} is already ${configuredType}`;
        const existingType = integrationTypes.get(capability.businessType);
        if (existingType && existingType !== capability.integrationType) return `Integration Type for ${capability.businessType} must be consistent`;
        integrationTypes.set(capability.businessType, capability.integrationType);
      }
    }
    return null;
  };

  const syncBasicConfiguration = (nextRecords: IntegrationRecord[]) => {
    const nextParties = Array.from(new Set(nextRecords.flatMap((record) => record.partyScopes.map(({ party }) => party))));
    setParties(nextParties.map((party) => ({ party, operator: 'current.user', operationTime: now() })));

    const extracted = new Map<string, BusinessTypeRow>();
    nextRecords.forEach((record) => record.partyScopes.forEach((scope) => scope.capabilities.forEach((capability) => {
      const current = extracted.get(capability.businessType);
      extracted.set(capability.businessType, {
        bt: capability.businessType,
        mode: current?.mode || capability.integrationType,
        countries: Array.from(new Set([...(current?.countries || []), ...capability.countries])),
        operator: 'current.user',
        operationTime: now(),
      });
    })));
    setBusinessTypes(Array.from(extracted.values()));
  };

  const saveBusinessType = async () => {
    try {
      const values = await businessTypeForm.validateFields();
      if (editingBusinessType) {
        const existing = businessTypes.find((item) => item.bt === editingBusinessType);
        const countries = Array.from(new Set([...(existing?.countries || []), ...values.countries]));
        setBusinessTypes((current) => current.map((item) => item.bt === editingBusinessType
          ? { ...item, countries, operator: 'current.user', operationTime: now() }
          : item));
        message.success('Business Type updated');
      } else {
        setBusinessTypes((current) => [...current, {
          bt: values.bt,
          mode: values.mode,
          countries: values.countries,
          operator: 'current.user',
          operationTime: now(),
        }]);
        message.success('Business Type added');
      }
      setBusinessTypeModalOpen(false);
      setEditingBusinessType(null);
      businessTypeForm.resetFields();
    } catch {}
  };

  const saveParty = async () => {
    try {
      const { party } = await partyForm.validateFields();
      setParties((current) => [...current, { party, operator: 'current.user', operationTime: now() }]);
      setPartyModalOpen(false);
      partyForm.resetFields();
      message.success('Supported Party added');
    } catch {}
  };

  const saveRecord = async () => {
    try {
      const values = await recordForm.validateFields();
      const validationError = validateRecordScopes(values.partyScopes);
      if (validationError) {
        message.error(validationError);
        return;
      }
      const nextRecords = [...records, {
        ...values,
        contracts: values.contracts?.map((file: { name: string }) => file.name).join(', '),
        accessApprovalRecords: values.accessApprovalRecords?.map((file: { name: string }) => file.name).join(', '),
        recordId: `IR-${String(129 + records.length).padStart(6, '0')}`,
        operator: 'current.user',
        operationTime: now(),
        linkedToGroup: false,
      }];
      setRecords(nextRecords);
      syncBasicConfiguration(nextRecords);
      setRecordModalOpen(false);
      recordForm.resetFields();
      message.success('Integration Record created');
    } catch {}
  };

  const openRecordDetail = (record: IntegrationRecord) => {
    setSelectedRecord(record);
    recordDetailForm.setFieldsValue({
      ...record,
      contracts: record.contracts ? [{ uid: `${record.recordId}-contract`, name: record.contracts, status: 'done' }] : [],
      accessApprovalRecords: record.accessApprovalRecords ? [{ uid: `${record.recordId}-approval`, name: record.accessApprovalRecords, status: 'done' }] : [],
    });
    setRecordDetailOpen(true);
  };

  const saveRecordDetail = async () => {
    if (!selectedRecord) return;
    try {
      const values = await recordDetailForm.validateFields();
      const validationError = validateRecordScopes(values.partyScopes);
      if (validationError) {
        message.error(validationError);
        return;
      }
      const nextRecords = records.map((record) => record.recordId === selectedRecord.recordId ? {
        ...record,
        ...values,
        partyScopes: record.linkedToGroup ? [...record.partyScopes, ...values.partyScopes.slice(record.partyScopes.length)] : values.partyScopes,
        recordName: record.linkedToGroup ? record.recordName : values.recordName,
        contracts: values.contracts?.map((file: { name: string }) => file.name).join(', '),
        accessApprovalRecords: values.accessApprovalRecords?.map((file: { name: string }) => file.name).join(', '),
        operator: 'current.user',
        operationTime: now(),
      } : record);
      setRecords(nextRecords);
      syncBasicConfiguration(nextRecords);
      setRecordDetailOpen(false);
      message.success('Integration Record updated');
    } catch {}
  };

  const deleteRecord = (record: IntegrationRecord) => {
    if (record.linkedToGroup) return;
    const nextRecords = records.filter((item) => item.recordId !== record.recordId);
    setRecords(nextRecords);
    syncBasicConfiguration(nextRecords);
    message.success('Integration Record deleted');
  };

  const renderPartyScopes = (form: any, lockedExistingPartyCount = 0) => (
    <Form.Item label="Integration Scope" required>
      <Form.List name="partyScopes" initialValue={[{ capabilities: [{}] }]} rules={[{ validator: async (_, scopes) => { if (!scopes?.length) throw new Error('Please add at least one Party'); } }]}>
        {(partyFields, { add: addParty, remove: removeParty }, { errors: partyErrors }) => (
          <>
            <div className="record-party-scope-list">
              {partyFields.map((partyField, partyIndex) => (
                <section className="record-party-scope" key={partyField.key}>
                  {(() => {
                    const scopeLocked = partyIndex < lockedExistingPartyCount;
                    return <>
                  <div className="record-party-scope-heading"><strong>Party {partyIndex + 1}</strong>{!scopeLocked && <Button type="text" danger disabled={partyFields.length === 1} onClick={() => removeParty(partyField.name)}>Remove Party</Button>}</div>
                  <Form.Item name={[partyField.name, 'party']} label="Party" rules={[{ required: true, message: 'Select Party' }]}>
                    <Select disabled={scopeLocked} placeholder="Party" options={allPartyOptions} />
                  </Form.Item>
                  <Form.List name={[partyField.name, 'capabilities']} initialValue={[{}]} rules={[{ validator: async (_, rows) => { if (!rows?.length) throw new Error('Please add at least one capability'); } }]}>
                    {(capabilityFields, { add: addCapability, remove: removeCapability }, { errors: capabilityErrors }) => (
                      <>
                        <div className="record-capability-table-head"><span>Business Type</span><span>Integration Type</span><span>Ability</span><span>Countries</span><span /></div>
                        <div className="record-capability-list">
                          {capabilityFields.map((capabilityField) => (
                            <div className="record-capability-row" key={capabilityField.key}>
                              <Form.Item name={[capabilityField.name, 'businessType']} rules={[{ required: true, message: 'Select Business Type' }]}>
                                <Select disabled={scopeLocked} placeholder="Business Type" options={businessTypeOptions.map((bt) => ({ label: bt, value: bt }))} onChange={() => {
                                  form.setFieldValue(['partyScopes', partyField.name, 'capabilities', capabilityField.name, 'integrationType'], undefined);
                                  form.setFieldValue(['partyScopes', partyField.name, 'capabilities', capabilityField.name, 'ability'], undefined);
                                  form.setFieldValue(['partyScopes', partyField.name, 'capabilities', capabilityField.name, 'countries'], []);
                                }} />
                              </Form.Item>
                              <Form.Item name={[capabilityField.name, 'integrationType']} rules={[{ required: true, message: 'Select Integration Type' }]}>
                                <Select disabled={scopeLocked} placeholder="Integration Type" options={[{ label: 'CONFIG', value: 'CONFIG' }, { label: 'CODE', value: 'CODE' }]} />
                              </Form.Item>
                              <Form.Item noStyle shouldUpdate>
                                {() => {
                                  const businessType = form.getFieldValue(['partyScopes', partyField.name, 'capabilities', capabilityField.name, 'businessType']);
                                  return <Form.Item name={[capabilityField.name, 'ability']} rules={[{ required: true, message: 'Select Ability' }]}><Select disabled={scopeLocked || !businessType} placeholder="Ability" options={(abilitiesByBusinessType[businessType] || []).map((ability) => ({ label: ability, value: ability }))} /></Form.Item>;
                                }}
                              </Form.Item>
                              <Form.Item noStyle shouldUpdate>
                                {() => {
                                  const businessType = form.getFieldValue(['partyScopes', partyField.name, 'capabilities', capabilityField.name, 'businessType']);
                                  const countries = businessTypes.find(({ bt }) => bt === businessType)?.countries || [];
                                  return <Form.Item name={[capabilityField.name, 'countries']} rules={[{ required: true, message: 'Select at least one Country' }]}><Select mode="multiple" disabled={scopeLocked || !businessType} placeholder="Countries" options={(countries.length ? countries : countryCodeOptions).map((country) => ({ label: country, value: country }))} /></Form.Item>;
                                }}
                              </Form.Item>
                              {!scopeLocked && <Button type="text" danger aria-label="Remove capability" icon={<MinusCircleOutlined />} disabled={capabilityFields.length === 1} onClick={() => removeCapability(capabilityField.name)} />}
                            </div>
                          ))}
                        </div>
                        {!scopeLocked && <Button type="dashed" onClick={() => addCapability()}>+ Business Type / Ability / Countries</Button>}
                        <Form.ErrorList errors={capabilityErrors} />
                      </>
                    )}
                  </Form.List>
                    </>;
                  })()}
                </section>
              ))}
            </div>
            <Button type="dashed" className="add-party-button" onClick={() => addParty({ capabilities: [{}] })}>+ Party</Button>
            <Form.ErrorList errors={partyErrors} />
          </>
        )}
      </Form.List>
    </Form.Item>
  );

  const renderBusinessTypes = () => {
    const availableBusinessTypes = businessTypeOptions.filter((bt) => !businessTypes.some((item) => item.bt === bt));
    const existingCountries = businessTypes.find((item) => item.bt === editingBusinessType)?.countries || [];
    return (
      <>
        <Alert className="records-guidance" type="info" showIcon title="Read-only. Business Types, Integration Types, and Countries are extracted automatically from submitted Integration Records." />
        <Table rowKey="bt" pagination={false} dataSource={businessTypes} columns={[
          { title: 'Business Type', dataIndex: 'bt', width: '22%' },
          { title: 'Integration Type', dataIndex: 'mode', width: '16%' },
          { title: 'Supported Countries', dataIndex: 'countries', width: '27%', render: (values: string[]) => <Space wrap>{values.map((value) => <Tag key={value}>{value}</Tag>)}</Space> },
          { title: 'Operator', dataIndex: 'operator', width: '13%' },
          { title: 'Operate Time', dataIndex: 'operationTime', width: '16%' },
        ]} />
        <Modal
          title={editingBusinessType ? 'Edit Business Type' : 'Add Business Type'}
          open={businessTypeModalOpen}
          onCancel={() => setBusinessTypeModalOpen(false)}
          onOk={saveBusinessType}
          okText="Submit"
          width={720}
          className="channel-profile-modal"
        >
          <Form form={businessTypeForm} layout="vertical">
            <Form.Item name="bt" label="Business Type" rules={[{ required: true }]}>
              <Select disabled={Boolean(editingBusinessType)} options={(editingBusinessType ? [editingBusinessType] : availableBusinessTypes).map((value) => ({ label: value, value }))} />
            </Form.Item>
            <Form.Item name="mode" label="Integration Type" rules={[{ required: true }]}>
              <Select disabled={Boolean(editingBusinessType)} options={[{ label: 'CONFIG', value: 'CONFIG' }, { label: 'CODE', value: 'CODE' }]} />
            </Form.Item>
            <Form.Item name="countries" label="Supported Countries" rules={[{ required: true, message: 'Please select at least one Country' }]}>
              <Select mode="multiple" options={countryCodeOptions.map((value) => ({ label: value, value, disabled: existingCountries.includes(value) }))} />
            </Form.Item>
          </Form>
        </Modal>
      </>
    );
  };

  const renderParties = () => (
    <>
      <Alert className="records-guidance" type="info" showIcon title="Read-only. Parties are extracted automatically from submitted Integration Records." />
      <Table rowKey="party" dataSource={parties} pagination={{ pageSize: 10 }} columns={[
        { title: 'Party', dataIndex: 'party', width: '35%' },
        { title: 'Operator', dataIndex: 'operator', width: '30%' },
        { title: 'Operation Time', dataIndex: 'operationTime' },
      ]} />
      <Modal title="Add Supported Party" open={partyModalOpen} onCancel={() => setPartyModalOpen(false)} onOk={saveParty} okText="OK" width={650} className="channel-profile-modal">
        <Form form={partyForm} layout="vertical">
          <Form.Item name="party" label="Party" rules={[{ required: true }]}>
            <Select showSearch options={allPartyOptions.filter((option) => !parties.some((item) => item.party === option.value))} />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );

  const renderOwners = () => (
    <div className="profile-settings-panel">
      <div className="profile-auto-save-meta"><span><strong>Latest Operator:</strong> zihao.ye</span><span><strong>Operation Time:</strong> 2026-08-24 07:35:08</span><span>Changes are saved automatically.</span></div>
      <Alert type="info" showIcon title="Channel Owners support integration collaboration, daily operations, and runtime incident alerts. Each role can include multiple people." />
      <Form form={ownersForm} layout="vertical" initialValues={owners} onValuesChange={(_, values) => setOwners(values as OwnerSettings)}>
        <h3>Primary Owners</h3>
        <div className="profile-form-grid">
          <Form.Item name="productOwners" label="Product Owners" rules={[{ required: true }]}><Select mode="multiple" options={employeeOptions} /></Form.Item>
          <Form.Item name="technicalOwners" label="Technical Owners" rules={[{ required: true }]}><Select mode="multiple" options={employeeOptions} /></Form.Item>
          <Form.Item name="operationOwners" label="Operations Owners" rules={[{ required: true }]}><Select mode="multiple" options={employeeOptions} /></Form.Item>
        </div>
        <h3>Supporting Members</h3>
        <div className="profile-form-grid">
          <Form.Item name="bd" label="BD"><Select mode="multiple" options={employeeOptions} /></Form.Item>
          <Form.Item name="sre" label="SRE"><Select mode="multiple" options={employeeOptions} /></Form.Item>
          <Form.Item name="businessOwners" label="Business Owner"><Select mode="multiple" options={employeeOptions} /></Form.Item>
        </div>
      </Form>
    </div>
  );

  const renderApprovers = () => (
    <div className="profile-settings-panel">
      <div className="profile-auto-save-meta"><span><strong>Latest Operator:</strong> zihao.ye</span><span><strong>Operation Time:</strong> 2026-08-24 07:35:36</span><span>Changes are saved automatically.</span></div>
      <Alert type="info" showIcon title="Changes on this page affect who receives approval requests. For example, approvals are required when switching Route Matching or Flow Groups in Runtime Control, and when changing Response Codes." />
      <Form form={approversForm} layout="vertical" initialValues={approvers} onValuesChange={(_, values) => setApprovers(values as ApproverSettings)}>
        <div className="approver-role-list">
          <Form.Item name="technicalApprover" label="Technical Approver" rules={[{ required: true }]}><Select options={employeeOptions} /></Form.Item>
          <Form.Item name="productApprover" label="Product Approver" rules={[{ required: true }]}><Select options={employeeOptions} /></Form.Item>
          <Form.Item name="operationsApprover" label="Operations Approver" rules={[{ required: true }]}><Select options={employeeOptions} /></Form.Item>
        </div>
      </Form>
    </div>
  );

  const renderSummary = () => {
    const partyNames = Array.from(new Set(records.flatMap((record) => record.partyScopes.map(({ party }) => party))));
    const partyScopeMap = new Map<string, Array<RecordCapabilityScope & { key: string }>>();
    records.forEach((record) => record.partyScopes.forEach((scope) => {
      const current = partyScopeMap.get(scope.party) || [];
      current.push(...scope.capabilities.map((capability, index) => ({ ...capability, key: `${record.recordId}-${scope.party}-${capability.businessType}-${capability.ability}-${index}` })));
      partyScopeMap.set(scope.party, current);
    }));
    return (
      <div className="channel-summary">
        <section className="channel-summary-section">
          <h2>Integration Scope</h2>
          <Collapse className="summary-party-collapse" defaultActiveKey={partyNames.slice(0, 1)} items={partyNames.map((party) => ({
            key: party,
            label: party,
            children: <Table rowKey="key" pagination={false} dataSource={partyScopeMap.get(party) || []} columns={[
              { title: 'Business Type', dataIndex: 'businessType', width: '26%' },
              { title: 'Ability', dataIndex: 'ability', width: '24%' },
              { title: 'Countries', dataIndex: 'countries', width: '30%', render: (values: string[]) => <Space wrap>{values.map((value) => <Tag key={value}>{value}</Tag>)}</Space> },
              { title: 'Integration Type', dataIndex: 'integrationType', width: '20%' },
            ]} />,
          }))} />
        </section>
        <section className="channel-summary-people">
          <div className="channel-summary-section">
            <h2>Channel Owners</h2>
            <dl className="summary-role-list">
              <div><dt>Product Owners</dt><dd>{owners.productOwners.join(', ')}</dd></div>
              <div><dt>Technical Owners</dt><dd>{owners.technicalOwners.join(', ')}</dd></div>
              <div><dt>Operations Owners</dt><dd>{owners.operationOwners.join(', ')}</dd></div>
              <div><dt>BD</dt><dd>{owners.bd.join(', ') || '-'}</dd></div>
              <div><dt>SRE</dt><dd>{owners.sre.join(', ') || '-'}</dd></div>
              <div><dt>Business Owner</dt><dd>{owners.businessOwners.join(', ') || '-'}</dd></div>
            </dl>
          </div>
          <div className="channel-summary-section">
            <h2>Approvers</h2>
            <dl className="summary-role-list">
              <div><dt>Technical Approver</dt><dd>{approvers.technicalApprover}</dd></div>
              <div><dt>Product Approver</dt><dd>{approvers.productApprover}</dd></div>
              <div><dt>Operations Approver</dt><dd>{approvers.operationsApprover}</dd></div>
            </dl>
          </div>
        </section>
      </div>
    );
  };

  const renderRecords = () => (
    <>
      <Alert className="records-guidance" type="info" showIcon title="A Record can include multiple contracting Parties. Each Party can cover multiple Business Type / Ability combinations, and each combination defines its own supported Countries." />
      <div className="channel-profile-toolbar"><Button type="primary" onClick={() => setRecordModalOpen(true)}>Create Integration Record</Button></div>
      <Table rowKey="recordId" dataSource={records} pagination={false} columns={[
        { title: 'Record ID', dataIndex: 'recordId', width: 110 },
        { title: 'Record Name', dataIndex: 'recordName', width: 220 },
        { title: 'Parties', dataIndex: 'partyScopes', width: 180, render: (scopes: RecordPartyScope[]) => <Space wrap>{scopes.map(({ party }) => <Tag key={party}>{party}</Tag>)}</Space> },
        { title: 'Operator', dataIndex: 'operator', width: 110 },
        { title: 'Operation Time', dataIndex: 'operationTime', width: 170 },
        { title: 'Operation', width: 130, render: (_, row: IntegrationRecord) => <Space size={12}>
          <Button type="link" onClick={() => openRecordDetail(row)}>Config</Button>
          <Popconfirm title="Delete this Integration Record?" description="This action cannot be undone." disabled={row.linkedToGroup} onConfirm={() => deleteRecord(row)} okText="Delete" cancelText="Cancel">
            <Button className="record-delete-button" type="link" danger disabled={row.linkedToGroup} title={row.linkedToGroup ? 'A Record linked to a Group cannot be deleted' : undefined}>Delete</Button>
          </Popconfirm>
        </Space> },
      ]} />
      <Modal title="Create Integration Record" open={recordModalOpen} onCancel={() => setRecordModalOpen(false)} onOk={saveRecord} okText="Create" width={860} className="channel-profile-modal integration-record-modal">
        <Form form={recordForm} layout="vertical">
          <Form.Item name="recordName" label="Record Name" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="debugReports" label="Debug Report" rules={[{ required: true }]}><Input placeholder="Required file name or document link" /></Form.Item>
          <Form.Item name="prdDocuments" label="PRD Document" rules={[{ required: true }]}><Input placeholder="Required file name or document link" /></Form.Item>
          {renderPartyScopes(recordForm)}
          <div className="profile-form-grid two-columns">
            <Form.Item name="contracts" label="Contract" valuePropName="fileList" getValueFromEvent={(event) => event?.fileList}><Upload beforeUpload={() => false} maxCount={1}><Button icon={<UploadOutlined />}>Upload</Button></Upload></Form.Item>
            <Form.Item name="accessApprovalRecords" label="Access Approval Records" valuePropName="fileList" getValueFromEvent={(event) => event?.fileList}><Upload beforeUpload={() => false} maxCount={1}><Button icon={<UploadOutlined />}>Upload</Button></Upload></Form.Item>
            <Form.Item name="brdDocuments" label="BRD Document"><Input placeholder="File name or document link" /></Form.Item>
            <Form.Item name="gatewayDeliverables" label="Gateway Deliverable Documents"><Input placeholder="File name or document link" /></Form.Item>
          </div>
        </Form>
      </Modal>
      <Modal
        title="Config Integration Record"
        open={recordDetailOpen}
        onCancel={() => setRecordDetailOpen(false)}
        onOk={saveRecordDetail}
        okText="Save"
        width={860}
        className="channel-profile-modal integration-record-modal"
      >
        {selectedRecord && <Form form={recordDetailForm} layout="vertical">
          <div className="record-detail-meta"><span><strong>Record ID:</strong> {selectedRecord.recordId}</span><span><strong>Latest Operator:</strong> {selectedRecord.operator}</span><span><strong>Operation Time:</strong> {selectedRecord.operationTime}</span></div>
          {selectedRecord.linkedToGroup && <Alert type="info" showIcon title="This Record is linked to a Group. Existing configuration cannot be changed and the Record cannot be deleted, but a new Party can still be added." />}
          <Form.Item name="recordName" label="Record Name" rules={[{ required: true }]}><Input disabled={selectedRecord.linkedToGroup} /></Form.Item>
          <Form.Item name="debugReports" label="Debug Report" rules={[{ required: true }]}><Input placeholder="Required file name or document link" /></Form.Item>
          <Form.Item name="prdDocuments" label="PRD Document" rules={[{ required: true }]}><Input placeholder="Required file name or document link" /></Form.Item>
          {renderPartyScopes(recordDetailForm, selectedRecord.linkedToGroup ? selectedRecord.partyScopes.length : 0)}
          <div className="profile-form-grid two-columns">
            <Form.Item name="contracts" label="Contract" valuePropName="fileList" getValueFromEvent={(event) => event?.fileList}><Upload beforeUpload={() => false} maxCount={1}><Button icon={<UploadOutlined />}>Upload</Button></Upload></Form.Item>
            <Form.Item name="accessApprovalRecords" label="Access Approval Records" valuePropName="fileList" getValueFromEvent={(event) => event?.fileList}><Upload beforeUpload={() => false} maxCount={1}><Button icon={<UploadOutlined />}>Upload</Button></Upload></Form.Item>
            <Form.Item name="brdDocuments" label="BRD Document"><Input placeholder="File name or document link" /></Form.Item>
            <Form.Item name="gatewayDeliverables" label="Gateway Deliverable Documents"><Input placeholder="File name or document link" /></Form.Item>
          </div>
        </Form>}
      </Modal>
    </>
  );

  const content = activeSection === 'summary' ? renderSummary()
    : activeSection === 'business-types' ? renderBusinessTypes()
    : activeSection === 'parties' ? renderParties()
      : activeSection === 'owners' ? renderOwners()
        : activeSection === 'approvers' ? renderApprovers()
          : renderRecords();

  return (
    <div className="channel-profile-shell">
      <aside className="integration-sidebar channel-info-sidebar channel-profile-sidebar">
        <div className="integration-brand" onClick={() => navigate('/home')}><Brand /></div>
        <button type="button" className="sidebar-back" onClick={() => navigate('/channel-integration')}>
          <span className="sidebar-back-icon"><ArrowLeftOutlined /></span>
          <span>Channel List</span>
        </button>
        <button type="button" className="channel-info-sidebar-context" aria-expanded={channelMenuOpen} onClick={() => setChannelMenuOpen((open) => !open)}>
          <span>{channelCode}</span>
          {channelMenuOpen ? <DownOutlined /> : <RightOutlined />}
        </button>
        {channelMenuOpen && <Menu
          className="integration-menu channel-info-menu"
          mode="inline"
          theme="dark"
          selectedKeys={[activeSection]}
          onClick={({ key }) => navigateSection(key)}
          items={[
            { key: 'integration-records', label: 'Integration Records' },
            { key: 'owners', label: 'Channel Owners' },
            { key: 'approvers', label: 'Approvers' },
            { key: 'summary', label: 'Summary' },
          ]}
        />}
      </aside>
      <div className="channel-profile-main">
        <header className="legacy-header"><UserProfile name="Current User" /></header>
        <div className="legacy-page-heading">
          <Breadcrumb items={[{ title: 'Channel Integration' }, { title: 'Channel List' }, { title: 'Channel Profile' }, { title: sectionTitles[activeSection] }]} />
          <h1>{sectionTitles[activeSection]}</h1>
        </div>
        <main className="channel-profile-content">
          <section className="channel-profile-card">
            {content}
          </section>
        </main>
      </div>
    </div>
  );
}

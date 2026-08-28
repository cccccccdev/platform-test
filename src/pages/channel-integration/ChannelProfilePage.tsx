import { useMemo, useState } from 'react';
import {
  Alert,
  Breadcrumb,
  Button,
  Descriptions,
  Form,
  Input,
  Menu,
  Modal,
  Select,
  Space,
  Table,
  Tag,
  Upload,
  message,
} from 'antd';
import { ArrowLeftOutlined, DownOutlined, RightOutlined, UploadOutlined } from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import { Brand, UserProfile } from '../../components/PlatformChrome';
import { businessTypeOptions, countryOptions, partyOptions } from '../../mock/data';

type ProfileSection = 'business-types' | 'parties' | 'owners' | 'approvers' | 'integration-records';
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

type IntegrationRecord = {
  recordId: string;
  recordName: string;
  party: string;
  capabilities: string[];
  countries: string[];
  contracts?: string;
  accessApprovalRecords?: string;
  brdDocuments?: string;
  debugReports?: string;
  prdDocuments: string;
  gatewayDeliverables?: string;
  remark?: string;
  operator: string;
  operationTime: string;
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
  const activeSection = (Object.hasOwn(sectionTitles, section) ? section : 'business-types') as ProfileSection;
  const [businessTypeForm] = Form.useForm();
  const [partyForm] = Form.useForm();
  const [ownersForm] = Form.useForm<OwnerSettings>();
  const [approversForm] = Form.useForm<ApproverSettings>();
  const [recordForm] = Form.useForm<IntegrationRecord>();
  const [businessTypeModalOpen, setBusinessTypeModalOpen] = useState(false);
  const [partyModalOpen, setPartyModalOpen] = useState(false);
  const [recordModalOpen, setRecordModalOpen] = useState(false);
  const [channelMenuOpen, setChannelMenuOpen] = useState(true);
  const [editingBusinessType, setEditingBusinessType] = useState<string | null>(null);

  const [businessTypes, setBusinessTypes] = useState<BusinessTypeRow[]>([
    { bt: 'WALLET_DEBIT', mode: 'CONFIG', countries: ['Tanzania'], operator: 'zihao.ye', operationTime: '2026-08-24 07:33:39' },
  ]);
  const [parties, setParties] = useState<PartyRow[]>([
    { party: 'TMUL', operator: 'zihao.ye', operationTime: '2026-08-24 07:33:56' },
  ]);
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
  const [records, setRecords] = useState<IntegrationRecord[]>([
    {
      recordId: 'IR-000128',
      recordName: 'TMUL Wallet Debit Initial Integration',
      party: 'TMUL',
      capabilities: ['WALLET_DEBIT::TRANSFER'],
      countries: ['Tanzania'],
      prdDocuments: 'TMUL Wallet Debit PRD.pdf',
      gatewayDeliverables: 'Gateway delivery checklist.xlsx',
      operator: 'zihao.ye',
      operationTime: '2026-08-24 07:36:12',
    },
  ]);

  const allPartyOptions = useMemo(
    () => Array.from(new Set([...partyOptions, 'TMUL'])).map((value) => ({ label: value, value })),
    [],
  );

  const capabilityOptions = useMemo(() => businessTypes.flatMap(({ bt }) =>
    (abilitiesByBusinessType[bt] || []).map((ability) => ({
      label: `${bt} + ${ability}`,
      value: `${bt}::${ability}`,
    }))), [businessTypes]);

  const navigateSection = (key: string) => {
    navigate(`/channel-integration/${channelCode}/channel-profile/${key}`);
  };

  const saveBusinessType = async () => {
    try {
      const values = await businessTypeForm.validateFields();
      if (editingBusinessType) {
        setBusinessTypes((current) => current.map((item) => item.bt === editingBusinessType
          ? { ...item, mode: values.mode, countries: values.countries, operator: 'current.user', operationTime: now() }
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

  const saveOwners = async () => {
    try {
      const values = await ownersForm.validateFields();
      setOwners(values);
      message.success('Channel Owners updated');
    } catch {}
  };

  const saveApprovers = async () => {
    try {
      const values = await approversForm.validateFields();
      setApprovers(values);
      message.success('Approvers updated');
    } catch {}
  };

  const saveRecord = async () => {
    try {
      const values = await recordForm.validateFields();
      setRecords((current) => [...current, {
        ...values,
        recordId: `IR-${String(129 + current.length).padStart(6, '0')}`,
        operator: 'current.user',
        operationTime: now(),
      }]);
      setRecordModalOpen(false);
      recordForm.resetFields();
      message.success('Integration Record created');
    } catch {}
  };

  const renderBusinessTypes = () => {
    const availableBusinessTypes = businessTypeOptions.filter((bt) => !businessTypes.some((item) => item.bt === bt));
    return (
      <>
        <div className="channel-profile-toolbar">
          <Button type="primary" onClick={() => {
            setEditingBusinessType(null);
            businessTypeForm.resetFields();
            setBusinessTypeModalOpen(true);
          }}>Add Business Type</Button>
        </div>
        <Table rowKey="bt" pagination={false} dataSource={businessTypes} columns={[
          { title: 'Business Type', dataIndex: 'bt', width: '22%' },
          { title: 'Integration Type', dataIndex: 'mode', width: '16%' },
          { title: 'Supported Countries', dataIndex: 'countries', width: '27%', render: (values: string[]) => <Space wrap>{values.map((value) => <Tag key={value}>{value}</Tag>)}</Space> },
          { title: 'Operator', dataIndex: 'operator', width: '13%' },
          { title: 'Operate Time', dataIndex: 'operationTime', width: '16%' },
          { title: 'Operation', width: '6%', render: (_, row: BusinessTypeRow) => <Button type="link" onClick={() => {
            setEditingBusinessType(row.bt);
            businessTypeForm.setFieldsValue(row);
            setBusinessTypeModalOpen(true);
          }}>Edit</Button> },
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
              <Select options={[{ label: 'CONFIG', value: 'CONFIG' }, { label: 'CODE', value: 'CODE' }]} />
            </Form.Item>
            <Form.Item name="countries" label="Supported Countries" rules={[{ required: true, message: 'Please select at least one Country' }]}>
              <Select mode="multiple" options={countryOptions.map((value) => ({ label: value, value }))} />
            </Form.Item>
          </Form>
        </Modal>
      </>
    );
  };

  const renderParties = () => (
    <>
      <div className="channel-profile-toolbar"><Button type="primary" onClick={() => setPartyModalOpen(true)}>Add Supported Party</Button></div>
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
      <Alert type="info" showIcon title="Channel Owners support integration collaboration, daily operations, and runtime incident alerts. Each role can include multiple people." />
      <Form form={ownersForm} layout="vertical" initialValues={owners} onFinish={saveOwners}>
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
        <div className="profile-save-row"><span>Operator: zihao.ye | Operation Time: 2026-08-24 07:35:08</span><Button type="primary" htmlType="submit">Save</Button></div>
      </Form>
    </div>
  );

  const renderApprovers = () => (
    <div className="profile-settings-panel">
      <Alert type="info" showIcon title="Approval templates resolve people from these roles. Actual channel owners and incident alert recipients are maintained under Channel Owners." />
      <Form form={approversForm} layout="vertical" initialValues={approvers} onFinish={saveApprovers}>
        <div className="approver-role-list">
          <Form.Item name="technicalApprover" label="Technical Approver" rules={[{ required: true }]} extra="Approves Route Matching and Flow Group switch changes in Runtime Control, and participates in Response Code change approval."><Select options={employeeOptions} /></Form.Item>
          <Form.Item name="productApprover" label="Product Approver" rules={[{ required: true }]} extra="Participates in Response Code change approval and handles changes that use the Product approval template."><Select options={employeeOptions} /></Form.Item>
          <Form.Item name="operationsApprover" label="Operations Approver" rules={[{ required: true }]} extra="Receives copied notifications from the current approval flows."><Select options={employeeOptions} /></Form.Item>
        </div>
        <div className="profile-save-row"><span>Operator: zihao.ye | Operation Time: 2026-08-24 07:35:36</span><Button type="primary" htmlType="submit">Save</Button></div>
      </Form>
    </div>
  );

  const renderRecords = () => (
    <>
      <Alert className="records-guidance" type="info" showIcon title="Each Record has one Party and can contain multiple explicit Business Type + Ability combinations. A Record ID is required when adding a Capability." />
      <div className="channel-profile-toolbar"><Button type="primary" onClick={() => setRecordModalOpen(true)}>Create Integration Record</Button></div>
      <Table rowKey="recordId" dataSource={records} pagination={false} columns={[
        { title: 'Record ID', dataIndex: 'recordId', width: 110 },
        { title: 'Record Name', dataIndex: 'recordName', width: 220 },
        { title: 'Party', dataIndex: 'party', width: 110 },
        { title: 'BT + Ability', dataIndex: 'capabilities', render: (values: string[]) => <Space wrap>{values.map((value) => <Tag key={value}>{value.replace('::', ' + ')}</Tag>)}</Space> },
        { title: 'Country', dataIndex: 'countries', width: 150, render: (values: string[]) => values.join(', ') },
        { title: 'Operator', dataIndex: 'operator', width: 110 },
        { title: 'Operation Time', dataIndex: 'operationTime', width: 170 },
        { title: 'Operation', width: 80, render: (_, row: IntegrationRecord) => <Button type="link" onClick={() => Modal.info({ title: row.recordName, width: 720, content: <Descriptions column={1} items={[
          { key: 'id', label: 'Record ID', children: row.recordId },
          { key: 'party', label: 'Party', children: row.party },
          { key: 'capabilities', label: 'BT + Ability', children: row.capabilities.map((item) => item.replace('::', ' + ')).join(', ') },
          { key: 'prd', label: 'PRD Document', children: row.prdDocuments },
        ]} /> })}>Detail</Button> },
      ]} />
      <Modal title="Create Integration Record" open={recordModalOpen} onCancel={() => setRecordModalOpen(false)} onOk={saveRecord} okText="Create" width={860} className="channel-profile-modal integration-record-modal">
        <Form form={recordForm} layout="vertical">
          <div className="profile-form-grid two-columns">
            <Form.Item name="recordName" label="Record Name" rules={[{ required: true }]}><Input /></Form.Item>
            <Form.Item name="party" label="Party" rules={[{ required: true }]}><Select options={parties.map(({ party }) => ({ label: party, value: party }))} /></Form.Item>
          </div>
          <Form.Item name="capabilities" label="Business Type + Ability" rules={[{ required: true, message: 'Please select at least one BT + Ability combination' }]}>
            <Select mode="multiple" options={capabilityOptions} />
          </Form.Item>
          <Form.Item name="countries" label="Countries" rules={[{ required: true }]}>
            <Select mode="multiple" options={Array.from(new Set(businessTypes.flatMap((item) => item.countries))).map((value) => ({ label: value, value }))} />
          </Form.Item>
          <div className="profile-form-grid two-columns">
            <Form.Item name="contracts" label="Contract"><Input placeholder="File name or document link" /></Form.Item>
            <Form.Item name="accessApprovalRecords" label="Access Approval Records"><Input placeholder="File name or document link" /></Form.Item>
            <Form.Item name="brdDocuments" label="BRD Document"><Input placeholder="File name or document link" /></Form.Item>
            <Form.Item name="debugReports" label="Debug Report"><Input placeholder="File name or document link" /></Form.Item>
            <Form.Item name="prdDocuments" label="PRD Document" rules={[{ required: true }]}><Input placeholder="Required file name or document link" /></Form.Item>
            <Form.Item name="gatewayDeliverables" label="Gateway Deliverable Documents"><Input placeholder="File name or document link" /></Form.Item>
          </div>
          <Form.Item name="remark" label="Remark"><Input maxLength={35} showCount /></Form.Item>
          <Upload beforeUpload={() => false} multiple><Button icon={<UploadOutlined />}>Attach files</Button></Upload>
        </Form>
      </Modal>
    </>
  );

  const content = activeSection === 'business-types' ? renderBusinessTypes()
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
          defaultOpenKeys={['basic-configuration', 'people-settings']}
          onClick={({ key }) => navigateSection(key)}
          items={[
            { key: 'basic-configuration', label: 'Basic Configuration', children: [
              { key: 'business-types', label: 'Business Types' },
              { key: 'parties', label: 'Parties' },
            ] },
            { key: 'people-settings', label: 'People Settings', children: [
              { key: 'owners', label: 'Channel Owners' },
              { key: 'approvers', label: 'Approvers' },
            ] },
            { key: 'integration-records', label: 'Integration Records' },
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
            <div className="channel-profile-heading"><strong>Channel:</strong><span>{channelCode}</span></div>
            {content}
          </section>
        </main>
      </div>
    </div>
  );
}

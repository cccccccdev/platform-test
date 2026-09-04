import { useState, useEffect } from 'react';
import { Table, Button, Input, Space, Modal, Form, Breadcrumb, Card, message, Steps, Select, Upload, Alert } from 'antd';
import { MinusCircleOutlined, UploadOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { businessTypeOptions, mockChannels, partyOptions } from '../../mock/data';
import { countryCodeOptions } from '../../mock/countries';
import type { Channel } from './types';
import { Brand, UserProfile } from '../../components/PlatformChrome';
import { saveCreatedIntegrationRecord } from './channelCreationStore';
import { isBusinessTypeScopeComplete, toPartyScopes } from './integrationScope';

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

const uploadValue = (event: any) => event?.fileList;
const fileNames = (files?: Array<{ name: string }>) => files?.map(({ name }) => name).join(', ');
const employeeOptions = ['Amina Bello', 'Chen Rui', 'Damilola Adebayo', 'Fatima Khan', 'Li Ming', 'Nadia Rahman', 'Rahul Mehta', 'Zhang Wei'].map((value) => ({ label: value, value }));
const documentValue = (files?: Array<{ name: string }>, link?: string) => [fileNames(files), link?.trim()].filter(Boolean).join(' | ');
const pdfOnly = (file: File) => {
  if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) return false;
  message.error('Only PDF files are accepted for Contract');
  return Upload.LIST_IGNORE;
};

export default function ChannelListPage() {
  const navigate = useNavigate();
  const [channels, setChannels] = useState<Channel[]>([]);
  const [searchText, setSearchText] = useState('');
  const [queriedChannel, setQueriedChannel] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form] = Form.useForm();
  const createValues = Form.useWatch([], form) || {};
  const [highlightedRow, setHighlightedRow] = useState<string | null>(null);
  const [createStep, setCreateStep] = useState(0);

  // Initialize mock data
  useEffect(() => {
    setChannels(mockChannels as unknown as Channel[]);
  }, []);

  // Query by Channel only. Input changes take effect after Query is clicked.
  const filteredChannels = channels.filter((c) => {
    return !queriedChannel || c.code.toLowerCase().includes(queriedChannel.toLowerCase());
  });

  const handleQuery = () => {
    setQueriedChannel(searchText.trim());
  };

  const handleReset = () => {
    setSearchText('');
    setQueriedChannel('');
  };

  // 新建 Channel
  const handleCreate = async () => {
    try {
      const values = await form.validateFields();
      // Check if Channel Code already exists
      if (channels.some((c) => c.code === values.channel)) {
        form.setFields([
          { name: 'channel', errors: ['Channel already exists'] },
        ]);
        return;
      }
      const newChannel: Channel = {
        code: values.channel,
        country: [],
        party: [],
        status: 'Inactive',
        operator: 'admin',
        operationTime: new Date().toLocaleString(),
      };
      saveCreatedIntegrationRecord(newChannel.code, {
        recordName: values.recordName,
        partyScopes: toPartyScopes(values.businessTypeScopes),
        debugReports: documentValue(values.debugReportFiles, values.debugReportLink),
        prdDocuments: documentValue(values.prdDocumentFiles, values.prdDocumentLink),
        contracts: fileNames(values.contracts),
        accessApprovalRecords: values.accessApprovalRecords,
        brdDocuments: values.brdDocuments,
        owners: values.owners,
        approvers: values.approvers,
      });
      setChannels((prev) => [...prev, newChannel]);
      message.success('Channel created successfully');
      setIsModalOpen(false);
      form.resetFields();
      setCreateStep(0);
      // Highlight new row
      setHighlightedRow(newChannel.code);
      setTimeout(() => setHighlightedRow(null), 2000);
      navigate(`/channel-integration/${newChannel.code}/integration`);
    } catch {}
  };

  const closeCreate = () => {
    setIsModalOpen(false);
    setCreateStep(0);
    form.resetFields();
  };

  const nextCreateStep = async () => {
    const fields = createStep === 0 ? ['channel']
      : createStep === 1 ? ['recordName', 'businessTypeScopes']
        : createStep === 2 ? ['owners', 'approvers']
          : ['debugReportLink', 'prdDocumentLink'];
    try {
      await form.validateFields(fields, { recursive: true });
      setCreateStep((step) => step + 1);
    } catch {}
  };

  const canContinueCreate = createStep === 0
    ? Boolean(createValues.channel?.trim()) && !channels.some((channel) => channel.code === createValues.channel)
    : createStep === 1
      ? Boolean(createValues.recordName?.trim()) && isBusinessTypeScopeComplete(createValues.businessTypeScopes)
      : createStep === 2
        ? Boolean(createValues.owners?.productOwners?.length
          && createValues.owners?.technicalOwners?.length
          && createValues.owners?.operationOwners?.length
          && createValues.approvers?.technicalApprover
          && createValues.approvers?.productApprover
          && createValues.approvers?.operationsApprover)
        : Boolean((createValues.debugReportFiles?.length || createValues.debugReportLink?.trim())
          && (createValues.prdDocumentFiles?.length || createValues.prdDocumentLink?.trim()));

  const renderIntegrationScope = () => (
    <Form.List name="businessTypeScopes" initialValue={[{ partyAbilities: [{}] }]} rules={[{ validator: async (_, scopes) => {
      const values = (scopes || []).map((scope: { businessType?: string }) => scope.businessType).filter(Boolean);
      if (new Set(values).size !== values.length) throw new Error('Each Business Type can only be configured once');
    } }]}>
      {(businessTypeFields, { add: addBusinessType, remove: removeBusinessType }, { errors }) => <>
        <div className="record-party-scope-list">
          {businessTypeFields.map((businessTypeField, businessTypeIndex) => <section className="record-party-scope" key={businessTypeField.key}>
            <div className="record-party-scope-heading"><strong>Business Type {businessTypeIndex + 1}</strong><Button type="text" danger disabled={businessTypeFields.length === 1} onClick={() => removeBusinessType(businessTypeField.name)}>Remove Business Type</Button></div>
            <div className="profile-form-grid two-columns">
              <Form.Item name={[businessTypeField.name, 'businessType']} label="Business Type" rules={[{ required: true, message: 'Select Business Type' }]}><Select options={businessTypeOptions.map((value) => ({ label: value, value }))} onChange={() => form.setFieldValue(['businessTypeScopes', businessTypeField.name, 'partyAbilities'], [{}])} /></Form.Item>
              <Form.Item name={[businessTypeField.name, 'integrationType']} label="Integration Type" rules={[{ required: true, message: 'Select Integration Type' }]}><Select options={['CONFIG', 'CODE'].map((value) => ({ label: value, value }))} /></Form.Item>
            </div>
            <Form.List name={[businessTypeField.name, 'partyAbilities']} initialValue={[{}]}>
              {(abilityFields, { add, remove }) => <>
                <div className="record-scope-table-head"><span>Party</span><span>Ability</span><span>Countries</span><span /></div>
                <div className="record-capability-list">
                  {abilityFields.map((abilityField) => <div className="record-scope-row" key={abilityField.key}>
                    <Form.Item name={[abilityField.name, 'party']} rules={[{ required: true, message: 'Select Party' }]}><Select showSearch placeholder="Party" options={partyOptions.map((value) => ({ label: value, value }))} /></Form.Item>
                    <Form.Item noStyle shouldUpdate>{() => {
                      const bt = form.getFieldValue(['businessTypeScopes', businessTypeField.name, 'businessType']);
                      return <Form.Item name={[abilityField.name, 'ability']} rules={[{ required: true, message: 'Select Ability' }]}><Select disabled={!bt} placeholder="Ability" options={(abilitiesByBusinessType[bt] || []).map((value) => ({ label: value, value }))} /></Form.Item>;
                    }}</Form.Item>
                    <Form.Item name={[abilityField.name, 'countries']} rules={[{ required: true, message: 'Select at least one Country' }]}><Select mode="multiple" placeholder="Countries" options={countryCodeOptions.map((value) => ({ label: value, value }))} /></Form.Item>
                    <Button type="text" danger icon={<MinusCircleOutlined />} disabled={abilityFields.length === 1} onClick={() => remove(abilityField.name)} />
                  </div>)}
                </div>
                <Button type="dashed" onClick={() => add()}>+ Party / Ability / Countries</Button>
              </>}
            </Form.List>
          </section>)}
        </div>
        <Button type="dashed" className="add-party-button" onClick={() => addBusinessType({ partyAbilities: [{}] })}>+ Business Type</Button>
        <Form.ErrorList errors={errors} />
      </>}
    </Form.List>
  );

  const renderDocumentSource = (key: 'debugReport' | 'prdDocument', label: string) => (
    <div className="document-source-field">
      <div className="document-source-label"><span>*</span>{label}</div>
      <div className="document-source-help">Upload a file or provide a Yuque link. At least one is required.</div>
      <Form.Item name={`${key}Files`} valuePropName="fileList" getValueFromEvent={uploadValue}>
        <Upload beforeUpload={() => false} maxCount={1}><Button icon={<UploadOutlined />}>Upload File</Button></Upload>
      </Form.Item>
      <div className="document-source-or"><span>or</span></div>
      <Form.Item name={`${key}Link`} dependencies={[`${key}Files`]} rules={[{
        validator: (_, value) => value || form.getFieldValue(`${key}Files`)?.length
          ? Promise.resolve()
          : Promise.reject(new Error('Upload a file or enter a Yuque link')),
      }]}>
        <Input placeholder="Enter Yuque link" />
      </Form.Item>
    </div>
  );

  // Table column definition
  const columns = [
    {
      title: 'Channel',
      dataIndex: 'code',
      key: 'code',
      width: '16%',
      render: (code: string) => (
        <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{code}</span>
      ),
    },
    {
      title: 'Operator',
      dataIndex: 'operator',
      key: 'operator',
      width: '14%',
    },
    {
      title: 'Operation Time',
      dataIndex: 'operationTime',
      key: 'operationTime',
      width: '20%',
    },
    {
      title: 'Operation',
      key: 'action',
      width: '50%',
      render: (_: any, record: Channel) => (
        <Space size={[8, 8]} wrap>
          <Button type="primary" size="small" onClick={() => navigate(`/channel-integration/${record.code}/channel-profile/summary`)}>
            Channel Profile
          </Button>
          <Button type="primary" size="small" onClick={() => navigate(`/channel-integration/${record.code}/integration`)}>
            Integration
          </Button>
          <Button type="primary" size="small" onClick={() => navigate(`/channel-integration/${record.code}/channel-info`)}>
            Channel Info
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div className="channel-list-shell">
      <aside className="channel-list-sidebar">
        <div className="legacy-sidebar-brand" onClick={() => navigate('/home')}><Brand /></div>
        <div className="legacy-sidebar-section">Channel Integration <span>⌃</span></div>
        <div className="channel-list-active">Channel List</div>
      </aside>
      <div className="channel-list-main">
        <header className="legacy-header"><UserProfile /></header>
        <div className="legacy-page-heading">
      {/* Breadcrumb */}
      <Breadcrumb
        items={[
          { title: 'Channel Integration' },
          { title: 'Channel List' },
        ]}
      />
          <h1>Channel List</h1>
        </div>
        <main className="channel-list-content">

      {/* Filter area */}
      <Card size="small" className="legacy-filter-card">
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 16 }}>
          <div style={{ flex: 1 }}>
            <div style={{ marginBottom: 4, color: '#666', fontSize: 12 }}>Channel</div>
            <Input
              placeholder="Channel"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              onPressEnter={handleQuery}
              style={{ maxWidth: 360 }}
            />
          </div>
          <Space>
            <Button onClick={handleReset}>Reset</Button>
            <Button type="primary" onClick={handleQuery}>Query</Button>
          </Space>
        </div>
      </Card>

      {/* Action buttons */}
      <div className="legacy-table-card">
      <div className="legacy-table-actions">
        <Button type="primary" onClick={() => setIsModalOpen(true)}>
          Create
        </Button>
      </div>

      {/* Channel table */}
      <Table
        dataSource={filteredChannels}
        columns={columns}
        rowKey="code"
        pagination={{ pageSize: 10 }}
        tableLayout="fixed"
        rowClassName={(record) => (highlightedRow === record.code ? 'ant-table-row-highlight' : '')}
        locale={{ emptyText: 'No Data' }}
      />
      </div>
      </main>

      {/* Create Channel modal */}
      <Modal
        title="Create Channel"
        open={isModalOpen}
        onCancel={closeCreate}
        width={900}
        className="channel-profile-modal integration-record-modal create-channel-wizard"
        footer={<Space><Button onClick={closeCreate}>Cancel</Button>{createStep > 0 && <Button onClick={() => setCreateStep((step) => step - 1)}>Previous</Button>}{createStep < 4 ? <Button type="primary" disabled={!canContinueCreate} onClick={nextCreateStep}>Next</Button> : <Button type="primary" onClick={handleCreate}>Create Channel</Button>}</Space>}
      >
        <Steps current={createStep} size="small" items={[
          { title: 'Channel' },
          { title: 'Integration Scope' },
          { title: 'People & Approvers' },
          { title: 'Required Documents' },
          { title: 'Optional Documents' },
        ]} />
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <div style={{ display: createStep === 0 ? 'block' : 'none' }}>
          <Form.Item
            name="channel"
            label="Channel"
            rules={[{ required: true, message: 'Please enter Channel name' }]}
          >
            <Input placeholder="Channel name" />
          </Form.Item>
          </div>
          <div style={{ display: createStep === 1 ? 'block' : 'none' }}><Alert type="info" showIcon title="Describe the first integration and define its scope. The description will become the first Integration Record name." />
            <Form.Item name="recordName" label="Integration Description" rules={[{ required: true, message: 'Please describe this integration' }]}><Input placeholder="For example: TMUL wallet debit initial integration" /></Form.Item>
            {renderIntegrationScope()}
          </div>
          <div style={{ display: createStep === 2 ? 'block' : 'none' }}>
            <Alert type="info" showIcon title="Set the channel owners used for collaboration and incident alerts, and the approvers used for controlled changes." />
            <h3>Channel Owners</h3>
            <div className="profile-form-grid two-columns">
              <Form.Item name={['owners', 'productOwners']} label="Product Owners" rules={[{ required: true }]}><Select mode="multiple" options={employeeOptions} /></Form.Item>
              <Form.Item name={['owners', 'technicalOwners']} label="Technical Owners" rules={[{ required: true }]}><Select mode="multiple" options={employeeOptions} /></Form.Item>
              <Form.Item name={['owners', 'operationOwners']} label="Operations Owners" rules={[{ required: true }]}><Select mode="multiple" options={employeeOptions} /></Form.Item>
              <Form.Item name={['owners', 'bd']} label="BD"><Select mode="multiple" options={employeeOptions} /></Form.Item>
              <Form.Item name={['owners', 'sre']} label="SRE"><Select mode="multiple" options={employeeOptions} /></Form.Item>
              <Form.Item name={['owners', 'businessOwners']} label="Business Owner"><Select mode="multiple" options={employeeOptions} /></Form.Item>
            </div>
            <h3>Approvers</h3>
            <div className="profile-form-grid two-columns">
              <Form.Item name={['approvers', 'technicalApprover']} label="Technical Approver" rules={[{ required: true }]}><Select options={employeeOptions} /></Form.Item>
              <Form.Item name={['approvers', 'productApprover']} label="Product Approver" rules={[{ required: true }]}><Select options={employeeOptions} /></Form.Item>
              <Form.Item name={['approvers', 'operationsApprover']} label="Operations Approver" rules={[{ required: true }]}><Select options={employeeOptions} /></Form.Item>
            </div>
          </div>
          <div style={{ display: createStep === 3 ? 'block' : 'none' }}>
            <Alert type="info" showIcon title="Debug Report and PRD Document are required before the channel can be created." />
            <div className="document-source-grid">{renderDocumentSource('debugReport', 'Debug Report')}{renderDocumentSource('prdDocument', 'PRD Document')}</div>
          </div>
          <div style={{ display: createStep === 4 ? 'block' : 'none' }}>
            <Alert type="info" showIcon title="These documents are optional during channel creation and can be completed later in Channel Profile." />
            <div className="profile-form-grid two-columns">
              <Form.Item name="contracts" label="Contract" extra="PDF only; multiple files supported" valuePropName="fileList" getValueFromEvent={uploadValue}><Upload beforeUpload={pdfOnly} multiple accept=".pdf,application/pdf"><Button icon={<UploadOutlined />}>Upload PDF</Button></Upload></Form.Item>
              <Form.Item name="accessApprovalRecords" label="Access Approval Records"><Input placeholder="OA number" /></Form.Item>
              <Form.Item name="brdDocuments" label="BRD Document"><Input placeholder="Yuque link" /></Form.Item>
            </div>
          </div>
        </Form>
      </Modal>
      </div>
    </div>
  );
}

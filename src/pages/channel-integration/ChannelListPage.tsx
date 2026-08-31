import { useState, useEffect } from 'react';
import { Table, Button, Input, Space, Modal, Form, Breadcrumb, Card, message, Steps, Select, Upload, Alert } from 'antd';
import { MinusCircleOutlined, UploadOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { businessTypeOptions, mockChannels, partyOptions } from '../../mock/data';
import { countryCodeOptions } from '../../mock/countries';
import type { Channel } from './types';
import { Brand, UserProfile } from '../../components/PlatformChrome';
import { saveCreatedIntegrationRecord } from './channelCreationStore';

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

export default function ChannelListPage() {
  const navigate = useNavigate();
  const [channels, setChannels] = useState<Channel[]>([]);
  const [searchText, setSearchText] = useState('');
  const [queriedChannel, setQueriedChannel] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form] = Form.useForm();
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
        partyScopes: values.partyScopes,
        debugReports: fileNames(values.debugReports) || '',
        prdDocuments: fileNames(values.prdDocuments) || '',
        contracts: fileNames(values.contracts),
        accessApprovalRecords: fileNames(values.accessApprovalRecords),
        brdDocuments: fileNames(values.brdDocuments),
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
    const fields = createStep === 0 ? ['channel', 'recordName'] : createStep === 1 ? ['partyScopes'] : ['debugReports', 'prdDocuments'];
    try {
      await form.validateFields(fields);
      setCreateStep((step) => step + 1);
    } catch {}
  };

  const renderIntegrationScope = () => (
    <Form.List name="partyScopes" initialValue={[{ capabilities: [{}] }]}>
      {(partyFields, { add: addParty, remove: removeParty }) => <>
        <div className="record-party-scope-list">
          {partyFields.map((partyField, partyIndex) => <section className="record-party-scope" key={partyField.key}>
            <div className="record-party-scope-heading"><strong>Party {partyIndex + 1}</strong><Button type="text" danger disabled={partyFields.length === 1} onClick={() => removeParty(partyField.name)}>Remove Party</Button></div>
            <Form.Item name={[partyField.name, 'party']} label="Party" rules={[{ required: true, message: 'Select Party' }]}>
              <Select showSearch placeholder="Party" options={partyOptions.map((value) => ({ label: value, value }))} />
            </Form.Item>
            <Form.List name={[partyField.name, 'capabilities']} initialValue={[{}]}>
              {(capabilityFields, { add, remove }) => <>
                <div className="record-capability-table-head"><span>Business Type</span><span>Integration Type</span><span>Ability</span><span>Countries</span><span /></div>
                <div className="record-capability-list">
                  {capabilityFields.map((capabilityField) => <div className="record-capability-row" key={capabilityField.key}>
                    <Form.Item name={[capabilityField.name, 'businessType']} rules={[{ required: true, message: 'Select Business Type' }]}>
                      <Select placeholder="Business Type" options={businessTypeOptions.map((value) => ({ label: value, value }))} onChange={() => {
                        form.setFieldValue(['partyScopes', partyField.name, 'capabilities', capabilityField.name, 'ability'], undefined);
                      }} />
                    </Form.Item>
                    <Form.Item name={[capabilityField.name, 'integrationType']} rules={[{ required: true, message: 'Select Integration Type' }]}><Select placeholder="Integration Type" options={['CONFIG', 'CODE'].map((value) => ({ label: value, value }))} /></Form.Item>
                    <Form.Item noStyle shouldUpdate>{() => {
                      const bt = form.getFieldValue(['partyScopes', partyField.name, 'capabilities', capabilityField.name, 'businessType']);
                      return <Form.Item name={[capabilityField.name, 'ability']} rules={[{ required: true, message: 'Select Ability' }]}><Select disabled={!bt} placeholder="Ability" options={(abilitiesByBusinessType[bt] || []).map((value) => ({ label: value, value }))} /></Form.Item>;
                    }}</Form.Item>
                    <Form.Item name={[capabilityField.name, 'countries']} rules={[{ required: true, message: 'Select at least one Country' }]}><Select mode="multiple" placeholder="Countries" options={countryCodeOptions.map((value) => ({ label: value, value }))} /></Form.Item>
                    <Button type="text" danger icon={<MinusCircleOutlined />} disabled={capabilityFields.length === 1} onClick={() => remove(capabilityField.name)} />
                  </div>)}
                </div>
                <Button type="dashed" onClick={() => add()}>+ Business Type / Ability / Countries</Button>
              </>}
            </Form.List>
          </section>)}
        </div>
        <Button type="dashed" className="add-party-button" onClick={() => addParty({ capabilities: [{}] })}>+ Party</Button>
      </>}
    </Form.List>
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
        footer={<Space><Button onClick={closeCreate}>Cancel</Button>{createStep > 0 && <Button onClick={() => setCreateStep((step) => step - 1)}>Previous</Button>}{createStep < 3 ? <Button type="primary" onClick={nextCreateStep}>Next</Button> : <Button type="primary" onClick={handleCreate}>Create Channel</Button>}</Space>}
      >
        <Steps current={createStep} size="small" items={[
          { title: 'Channel & Record' },
          { title: 'Integration Scope' },
          { title: 'Required Documents' },
          { title: 'Optional Documents' },
        ]} />
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <div style={{ display: createStep === 0 ? 'block' : 'none' }}><Alert type="info" showIcon title="Describe the first integration. This description will become the first Integration Record name." />
          <Form.Item
            name="channel"
            label="Channel"
            rules={[{ required: true, message: 'Please enter Channel name' }]}
          >
            <Input placeholder="Channel name" />
          </Form.Item>
          <Form.Item name="recordName" label="Integration Description" rules={[{ required: true, message: 'Please describe this integration' }]}><Input placeholder="For example: TMUL wallet debit initial integration" /></Form.Item></div>
          <div style={{ display: createStep === 1 ? 'block' : 'none' }}>{renderIntegrationScope()}</div>
          <div style={{ display: createStep === 2 ? 'block' : 'none' }}>
            <Alert type="info" showIcon title="Debug Report and PRD Document are required before the channel can be created." />
            <Form.Item name="debugReports" label="Debug Report" valuePropName="fileList" getValueFromEvent={uploadValue} rules={[{ required: true, message: 'Please upload the Debug Report' }]}><Upload beforeUpload={() => false} maxCount={1}><Button icon={<UploadOutlined />}>Upload</Button></Upload></Form.Item>
            <Form.Item name="prdDocuments" label="PRD Document" valuePropName="fileList" getValueFromEvent={uploadValue} rules={[{ required: true, message: 'Please upload the PRD Document' }]}><Upload beforeUpload={() => false} maxCount={1}><Button icon={<UploadOutlined />}>Upload</Button></Upload></Form.Item>
          </div>
          <div style={{ display: createStep === 3 ? 'block' : 'none' }}>
            <Alert type="info" showIcon title="These documents are optional during channel creation and can be completed later in Channel Profile." />
            <div className="profile-form-grid two-columns">
              <Form.Item name="contracts" label="Contract" valuePropName="fileList" getValueFromEvent={uploadValue}><Upload beforeUpload={() => false} maxCount={1}><Button icon={<UploadOutlined />}>Upload</Button></Upload></Form.Item>
              <Form.Item name="accessApprovalRecords" label="Access Approval Records" valuePropName="fileList" getValueFromEvent={uploadValue}><Upload beforeUpload={() => false} maxCount={1}><Button icon={<UploadOutlined />}>Upload</Button></Upload></Form.Item>
              <Form.Item name="brdDocuments" label="BRD Document" valuePropName="fileList" getValueFromEvent={uploadValue}><Upload beforeUpload={() => false} maxCount={1}><Button icon={<UploadOutlined />}>Upload</Button></Upload></Form.Item>
            </div>
          </div>
        </Form>
      </Modal>
      </div>
    </div>
  );
}

import { useMemo, useState } from 'react';
import { Breadcrumb, Button, Card, Form, Modal, Select, Table, Typography, message } from 'antd';
import { useNavigate, useParams } from 'react-router-dom';
import { Brand, UserProfile } from '../../components/PlatformChrome';
import { AnnouncementChrome } from '../../components/AnnouncementOverlays';
import { PARTY_TYPE_LABEL, type PartyType, usePartyStore } from '../basic-info/partyStore';
import { type ChannelPartyRecord, useChannelPartyStore } from './channelPartyStore';

const { Text } = Typography;

type AddPartyFormValues = {
  partyType: PartyType;
  party: string;
};

const PARTY_TYPE_OPTIONS = [
  { value: 'internalParty', label: PARTY_TYPE_LABEL.internalParty },
  { value: 'externalParty', label: PARTY_TYPE_LABEL.externalParty },
];

const NO_RECORDS: ChannelPartyRecord[] = [];

export default function ChannelPartyPage() {
  const { channelCode = '' } = useParams();
  const navigate = useNavigate();
  const parties = usePartyStore((state) => state.parties);
  const recordsByChannel = useChannelPartyStore((state) => state.recordsByChannel);
  const addRecord = useChannelPartyStore((state) => state.addRecord);
  const [addOpen, setAddOpen] = useState(false);
  const [selectedType, setSelectedType] = useState<PartyType>('internalParty');
  const [form] = Form.useForm<AddPartyFormValues>();

  const records = recordsByChannel[channelCode] ?? NO_RECORDS;

  // Party options follow the selected Party Type, and skip parties already supported.
  const partyOptions = useMemo(() => {
    const existing = new Set(records.map((record) => record.party));
    return parties
      .filter((party) => party.type === selectedType && !existing.has(party.code))
      .sort((left, right) => left.code.localeCompare(right.code))
      .map((party) => ({ value: party.code, label: party.code }));
  }, [parties, records, selectedType]);

  const openAdd = () => {
    form.resetFields();
    setSelectedType('internalParty');
    form.setFieldsValue({ partyType: 'internalParty' });
    setAddOpen(true);
  };

  const handleAdd = async () => {
    try {
      const values = await form.validateFields();
      addRecord(channelCode, { party: values.party, type: values.partyType });
      setAddOpen(false);
      message.success(`${values.party} added`);
    } catch {
      // Ant Design renders field-level validation feedback.
    }
  };

  const columns = [
    { title: 'Party', dataIndex: 'party', key: 'party' },
    { title: 'Operator', dataIndex: 'operator', key: 'operator', width: 220 },
    { title: 'Operation Time', dataIndex: 'operationTime', key: 'operationTime', width: 200 },
  ];

  return (
    <div className="channel-list-shell">
      <aside className="channel-list-sidebar">
        <div className="legacy-sidebar-brand" onClick={() => navigate('/home')}><Brand /></div>
        <div className="legacy-sidebar-section">Channel Integration <span>⌃</span></div>
        <div className="channel-list-active" onClick={() => navigate('/channel-integration')}>Channel List</div>
      </aside>
      <div className="channel-list-main">
        <header className="legacy-header announcement-header"><AnnouncementChrome /><UserProfile /></header>
        <div className="legacy-page-heading">
          <Breadcrumb items={[
            { title: 'Channel Integration' },
            { title: 'Channel List' },
            { title: 'Party' },
          ]} />
          <h1>Party</h1>
        </div>
        <main className="channel-list-content">
          <Card styles={{ body: { padding: 24 } }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 18 }}>
              <Text>Channel: </Text>
              <Text>{channelCode}</Text>
              <Button type="primary" style={{ marginLeft: 'auto' }} onClick={openAdd}>
                Add Support Party
              </Button>
            </div>

            <Table<ChannelPartyRecord>
              rowKey="party"
              dataSource={records}
              columns={columns}
              pagination={{
                pageSize: 10,
                showSizeChanger: true,
                pageSizeOptions: ['10', '20', '50'],
                showTotal: (total) => `Total ${total} items`,
              }}
            />
          </Card>
        </main>
      </div>

      <Modal
        title="Add Supported Party"
        open={addOpen}
        onOk={handleAdd}
        onCancel={() => setAddOpen(false)}
        okText="Add"
        cancelText="Cancel"
        width={520}
        destroyOnHidden
      >
        <Form<AddPartyFormValues>
          form={form}
          layout="horizontal"
          labelCol={{ span: 7 }}
          wrapperCol={{ span: 16 }}
          preserve={false}
          initialValues={{ partyType: 'internalParty' }}
        >
          <Form.Item
            name="partyType"
            label="Party Type"
            rules={[{ required: true, message: 'Select Party Type' }]}
          >
            <Select
              options={PARTY_TYPE_OPTIONS}
              onChange={(value: PartyType) => {
                setSelectedType(value);
                form.setFieldValue('party', undefined);
              }}
            />
          </Form.Item>
          <Form.Item
            name="party"
            label="Party"
            rules={[{ required: true, message: 'Select Party' }]}
          >
            <Select
              showSearch
              placeholder="Party"
              optionFilterProp="label"
              options={partyOptions}
              notFoundContent="No Party available for the selected Party Type"
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

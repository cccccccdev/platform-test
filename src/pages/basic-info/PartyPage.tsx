import { useState } from 'react';
import { Breadcrumb, Button, Form, Input, Modal, Table, Tabs, Typography, message } from 'antd';
import {
  PARTY_TYPE_LABEL,
  type PartyRecord,
  type PartyType,
  usePartyStore,
} from './partyStore';

const { Title } = Typography;

type PartyFormValues = {
  code: string;
  officialName: string;
};

const columns = [
  { title: 'Party', dataIndex: 'code', key: 'code', width: 220 },
  { title: 'Official Party Name', dataIndex: 'officialName', key: 'officialName' },
  { title: 'Operator', dataIndex: 'operator', key: 'operator', width: 190 },
  { title: 'Operation Time', dataIndex: 'operationTime', key: 'operationTime', width: 190 },
];

const PARTY_MODAL_WIDTH = 560;

/**
 * Party code rule differs per tab:
 * - internal party: the existing production rule, uppercase letters + underscore only.
 *   Digits are rejected, so `123TEST` / `O1234` are both invalid.
 * - external party: the digits restriction is removed, so `O1234` becomes valid.
 */
function getPartyIdRules(type: PartyType) {
  if (type === 'internalParty') {
    return [
      { required: true, message: 'Enter Party' },
      {
        pattern: /^[A-Z_]+$/,
        message: 'Invalid party input detected. Only uppercase letters (A-Z) and underscores (_) are allowed. Please modify your input:',
      },
    ];
  }

  return [
    { required: true, message: 'Enter Party' },
    {
      pattern: /^[A-Z0-9_]+$/,
      message: 'Invalid party input detected. Only uppercase letters (A-Z), digits (0-9) and underscores (_) are allowed. Please modify your input:',
    },
  ];
}

export default function PartyPage() {
  const parties = usePartyStore((state) => state.parties);
  const addParty = usePartyStore((state) => state.addParty);
  const [activeType, setActiveType] = useState<PartyType>('internalParty');
  const [modalOpen, setModalOpen] = useState(false);
  const [form] = Form.useForm<PartyFormValues>();

  const visibleParties = parties.filter((party) => party.type === activeType);

  const openCreateModal = () => {
    form.resetFields();
    setModalOpen(true);
  };

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      const code = values.code.trim();
      const officialName = values.officialName.trim();

      // One physical table means Party is unique across both tags.
      const duplicated = parties.some(
        (party) => party.code.toUpperCase() === code.toUpperCase(),
      );
      if (duplicated) {
        form.setFields([{ name: 'code', errors: ['Party already exists'] }]);
        return;
      }

      addParty({ code, officialName, type: activeType });
      setModalOpen(false);
      message.success(`${code} created`);
    } catch {
      // Ant Design renders field-level validation feedback.
    }
  };

  return (
    <div className="basic-country-page">
      <section className="state-machine-heading">
        <Breadcrumb items={[{ title: 'Basic Info', href: '/basic-info' }, { title: 'Party' }]} />
        <div className="state-machine-title-line">
          <Title level={4}>Party</Title>
        </div>
      </section>

      <div className="basic-country-table-wrap">
        <Tabs
          activeKey={activeType}
          onChange={(key) => setActiveType(key as PartyType)}
          items={[
            { key: 'internalParty', label: PARTY_TYPE_LABEL.internalParty },
            { key: 'externalParty', label: PARTY_TYPE_LABEL.externalParty },
          ]}
        />
        <div className="basic-country-actions">
          <Button type="primary" onClick={openCreateModal}>
            Create Party
          </Button>
        </div>
        <Table<PartyRecord>
          className="basic-country-table"
          dataSource={visibleParties}
          columns={columns}
          rowKey="code"
          scroll={{ x: 960 }}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showQuickJumper: true,
            pageSizeOptions: [10, 20, 50],
            showTotal: (total) => `Total ${total} items`,
          }}
        />
      </div>

      <Modal
        className="create-country-modal"
        title="Create Party"
        open={modalOpen}
        onOk={handleSave}
        okText="Create"
        cancelText="Cancel"
        onCancel={() => setModalOpen(false)}
        destroyOnHidden
        width={PARTY_MODAL_WIDTH}
      >
        <Form<PartyFormValues>
          form={form}
          layout="horizontal"
          labelCol={{ span: 7 }}
          wrapperCol={{ span: 15 }}
          preserve={false}
        >
          <Form.Item
            name="code"
            label="Party"
            rules={getPartyIdRules(activeType)}
          >
            <Input placeholder="Party Code" />
          </Form.Item>
          <Form.Item
            name="officialName"
            label="Official Party Name"
            rules={[
              { required: true, whitespace: true, message: 'Enter Official Party Name' },
              { max: 128, message: 'Official Party Name cannot exceed 128 characters' },
            ]}
          >
            <Input placeholder="Official Party Name" maxLength={128} showCount />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

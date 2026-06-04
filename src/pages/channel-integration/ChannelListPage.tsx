import { useState, useEffect } from 'react';
import { Table, Button, Input, Space, Modal, Form, Select, Tag, Breadcrumb, Badge, Row, Col, Card, message, Dropdown } from 'antd';
import { SearchOutlined, DownOutlined, FilterOutlined, CloseCircleOutlined } from '@ant-design/icons';
import type { MenuProps } from 'antd';
import { useNavigate } from 'react-router-dom';
import { mockChannels, countryOptions, partyOptions, businessTypeOptions } from '../../mock/data';
import type { Channel } from './types';

export default function ChannelListPage() {
  const navigate = useNavigate();
  const [channels, setChannels] = useState<Channel[]>([]);
  const [searchText, setSearchText] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form] = Form.useForm();
  const [highlightedRow, setHighlightedRow] = useState<string | null>(null);

  // Filter conditions
  const [filterCountry, setFilterCountry] = useState<string[]>([]);
  const [filterParty, setFilterParty] = useState<string | null>(null);
  const [filterBT, setFilterBT] = useState<string | null>(null);
  const [filterAbility, setFilterAbility] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  // Initialize mock data
  useEffect(() => {
    setChannels(mockChannels as unknown as Channel[]);
  }, []);

  // Search and filter
  const filteredChannels = channels.filter((c) => {
    // Channel Code search
    if (searchText && !c.code.toLowerCase().includes(searchText.toLowerCase())) {
      return false;
    }
    // Country filter
    if (filterCountry.length > 0 && !filterCountry.some(country => c.country.includes(country))) {
      return false;
    }
    // Party filter
    if (filterParty && c.party !== filterParty) {
      return false;
    }
    return true;
  });

  // Clear all filters
  const clearFilters = () => {
    setFilterCountry([]);
    setFilterParty(null);
    setFilterBT(null);
    setFilterAbility(null);
    setSearchText('');
  };

  const hasActiveFilters = filterCountry.length > 0 || filterParty || filterBT || filterAbility || searchText;

  // 新建 Channel
  const handleCreate = async () => {
    try {
      const values = await form.validateFields();
      // Check if Channel Code already exists
      if (channels.some((c) => c.code === values.code)) {
        form.setFields([
          { name: 'code', errors: ['Channel Code already exists'] },
        ]);
        return;
      }
      const newChannel: Channel = {
        code: values.code,
        country: values.country,
        party: values.party,
        status: values.status || 'Inactive',
      };
      setChannels((prev) => [...prev, newChannel]);
      message.success('Channel created successfully');
      setIsModalOpen(false);
      form.resetFields();
      // Highlight new row
      setHighlightedRow(newChannel.code);
      setTimeout(() => setHighlightedRow(null), 2000);
    } catch {}
  };

  // Build action menu
  const getActionMenu = (record: Channel): MenuProps => ({
    items: [
    // First group: direct navigation
      { key: 'party', label: 'Party', onClick: () => navigate(`/channel-integration/${record.code}/party`) },
      { key: 'country', label: 'Country', onClick: () => navigate(`/channel-integration/${record.code}/country`) },
      { key: 'business-type', label: 'Business Type', onClick: () => navigate(`/channel-integration/${record.code}/business-type`) },
      { key: 'credential', label: 'Credential', onClick: () => navigate(`/channel-integration/${record.code}/credential`) },
      { key: 'authentication', label: 'Authentication', onClick: () => navigate(`/channel-integration/${record.code}/authentication`) },
      { key: 'debug', label: 'Debug', onClick: () => navigate(`/channel-integration/${record.code}/api-debug`) },
      { type: 'divider' },
    // Second group: submenu
      {
        key: 'integration',
        label: 'Integration',
        children: [
          { key: 'match-capability', label: 'matchCapability', onClick: () => navigate(`/channel-integration/${record.code}/integration/match-capability`) },
          { key: 'config', label: 'Config Integration', onClick: () => navigate(`/channel-integration/${record.code}/integration/config`) },
          { key: 'code', label: 'Code Integration', onClick: () => navigate(`/channel-integration/${record.code}/integration/code`) },
        ],
      },
    ],
  });

  // Table column definition
  const columns = [
    {
      title: 'Channel Code',
      dataIndex: 'code',
      key: 'code',
      render: (code: string) => (
        <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{code}</span>
      ),
    },
    {
      title: 'Country',
      dataIndex: 'country',
      key: 'country',
      render: (country: string[]) => (
        <Space wrap>
          {country.slice(0, 2).map((c) => (
            <Tag key={c} color="blue">{c}</Tag>
          ))}
          {country.length > 2 && (
            <Tag color="blue">+{country.length - 2}</Tag>
          )}
        </Space>
      ),
    },
    {
      title: 'Party',
      dataIndex: 'party',
      key: 'party',
    },
    {
      title: 'Operation',
      key: 'action',
      width: 120,
      render: (_: any, record: Channel) => (
        <Dropdown menu={getActionMenu(record)} trigger={['click']}>
          <Button type="text" size="small">
            Operation <DownOutlined />
          </Button>
        </Dropdown>
      ),
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      {/* Breadcrumb */}
      <Breadcrumb
        style={{ marginBottom: 16 }}
        items={[
          { title: 'Integration Platform 2.0' },
          { title: 'Channel Integration' },
        ]}
      />

      {/* Page title and search */}
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16 }}>
        <Space wrap>
          <Input
            placeholder="Search by Channel Code"
            prefix={<SearchOutlined />}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            style={{ width: 250 }}
          />
          <Button
            icon={<FilterOutlined />}
            onClick={() => setShowFilters(!showFilters)}
            type={showFilters ? 'primary' : 'default'}
          >
            Filter {hasActiveFilters && <Badge count={1} size="small" />}
          </Button>
          {hasActiveFilters && (
            <Button icon={<CloseCircleOutlined />} onClick={clearFilters}>
              Clear Filter
            </Button>
          )}
        </Space>
        <Space>
          <Button>
            Channel Status
          </Button>
          <Button onClick={() => setIsModalOpen(true)}>
            Create Channel
          </Button>
        </Space>
      </div>

      {/* Filter area */}
      {showFilters && (
        <Card size="small" style={{ marginBottom: 16, background: '#fafafa' }}>
          <Row gutter={[16, 16]}>
            <Col span={6}>
              <div style={{ marginBottom: 4, color: '#666', fontSize: 12 }}>Country</div>
              <Select
                mode="multiple"
                placeholder="Select Country"
                value={filterCountry}
                onChange={setFilterCountry}
                style={{ width: '100%' }}
                allowClear
              >
                {countryOptions.map((c) => (
                  <Select.Option key={c} value={c}>{c}</Select.Option>
                ))}
              </Select>
            </Col>
            <Col span={6}>
              <div style={{ marginBottom: 4, color: '#666', fontSize: 12 }}>Party</div>
              <Select
                placeholder="Select Party"
                value={filterParty}
                onChange={setFilterParty}
                style={{ width: '100%' }}
                allowClear
              >
                {partyOptions.map((p) => (
                  <Select.Option key={p} value={p}>{p}</Select.Option>
                ))}
              </Select>
            </Col>
            <Col span={6}>
              <div style={{ marginBottom: 4, color: '#666', fontSize: 12 }}>Business Type</div>
              <Select
                placeholder="Select Business Type"
                value={filterBT}
                onChange={setFilterBT}
                style={{ width: '100%' }}
                allowClear
              >
                {businessTypeOptions.map((bt) => (
                  <Select.Option key={bt} value={bt}>{bt}</Select.Option>
                ))}
              </Select>
            </Col>
            <Col span={6}>
              <div style={{ marginBottom: 4, color: '#666', fontSize: 12 }}>Ability</div>
              <Select
                placeholder="Select Ability"
                value={filterAbility}
                onChange={setFilterAbility}
                style={{ width: '100%' }}
                allowClear
              >
                {['CARD_PAY', 'USSD_PAY', 'WALLET_PAY', 'BANK_TRF'].map((a) => (
                  <Select.Option key={a} value={a}>{a}</Select.Option>
                ))}
              </Select>
            </Col>
          </Row>
        </Card>
      )}

      {/* Selected filter tags display */}
      {hasActiveFilters && (
        <div style={{ marginBottom: 12 }}>
          <Space wrap>
            {searchText && <Tag closable onClose={() => setSearchText('')}>Channel Code: {searchText}</Tag>}
            {filterCountry.map(c => (
              <Tag key={c} closable onClose={() => setFilterCountry(prev => prev.filter(x => x !== c))}>Country: {c}</Tag>
            ))}
            {filterParty && <Tag closable onClose={() => setFilterParty(null)}>Party: {filterParty}</Tag>}
            {filterBT && <Tag closable onClose={() => setFilterBT(null)}>BT: {filterBT}</Tag>}
            {filterAbility && <Tag closable onClose={() => setFilterAbility(null)}>Ability: {filterAbility}</Tag>}
          </Space>
        </div>
      )}

      {/* Channel table */}
      <Table
        dataSource={filteredChannels}
        columns={columns}
        rowKey="code"
        pagination={{ pageSize: 10 }}
        rowClassName={(record) => (highlightedRow === record.code ? 'ant-table-row-highlight' : '')}
        locale={{ emptyText: 'No Data' }}
      />

      {/* New Channel modal */}
      <Modal
        title="New Channel"
        open={isModalOpen}
        onOk={handleCreate}
        onCancel={() => {
          setIsModalOpen(false);
          form.resetFields();
        }}
        okText="Create"
        cancelText="Cancel"
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item
            name="code"
            label="Channel Code"
            rules={[
              { required: true, message: 'Please enter Channel Code' },
              { pattern: /^[A-Z0-9_]+$/, message: 'Only uppercase letters, underscore, and numbers allowed' },
            ]}
          >
            <Input placeholder="e.g., GTB_NG" />
          </Form.Item>
          <Form.Item
            name="country"
            label="Country"
            rules={[{ required: true, message: 'Please select Country' }]}
          >
            <Select mode="multiple" placeholder="Select Country">
              {countryOptions.map((c) => (
                <Select.Option key={c} value={c}>{c}</Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item
            name="party"
            label="Party"
            rules={[{ required: true, message: 'Please select Party' }]}
          >
            <Select placeholder="Select Party">
              {partyOptions.map((p) => (
                <Select.Option key={p} value={p}>{p}</Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item
            name="status"
            label="Status"
            initialValue="Inactive"
          >
            <Select>
              <Select.Option value="Active">Active</Select.Option>
              <Select.Option value="Inactive">Inactive</Select.Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}


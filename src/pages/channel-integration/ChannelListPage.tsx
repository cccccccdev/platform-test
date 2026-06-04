import { useState, useEffect } from 'react';
import { Table, Button, Input, Space, Modal, Form, Select, Tag, Breadcrumb, Card, message, Dropdown, TreeSelect } from 'antd';
import { DownOutlined, CloseCircleOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { mockChannels, countryOptions, partyOptions, businessTypeOptions } from '../../mock/data';
import type { Channel } from './types';

// Mock organization tree data for DingTalk integration
const organizationTreeData = [
  {
    title: 'Technology Division',
    value: 'tech-div',
    children: [
      {
        title: 'Payment Team',
        value: 'payment-team',
        children: [
          { title: 'Zhang San', value: 'zhangsan' },
          { title: 'Li Si', value: 'lisi' },
          { title: 'Wang Wu', value: 'wangwu' },
        ],
      },
      {
        title: 'Backend Team',
        value: 'backend-team',
        children: [
          { title: 'Zhao Liu', value: 'zhaoliu' },
          { title: 'Sun Qi', value: 'sunqi' },
        ],
      },
    ],
  },
  {
    title: 'Product Division',
    value: 'product-div',
    children: [
      {
        title: 'Product Design',
        value: 'product-design',
        children: [
          { title: 'Zhou Ba', value: 'zhouba' },
          { title: 'Wu Jiu', value: 'wujiu' },
        ],
      },
    ],
  },
  {
    title: 'Operations Division',
    value: 'ops-div',
    children: [
      {
        title: 'Operations Support',
        value: 'ops-support',
        children: [
          { title: 'Zheng Shi', value: 'zhengshi' },
        ],
      },
    ],
  },
];

export default function ChannelListPage() {
  const navigate = useNavigate();
  const [channels, setChannels] = useState<Channel[]>([]);
  const [searchText, setSearchText] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form] = Form.useForm();
  const [highlightedRow, setHighlightedRow] = useState<string | null>(null);
  const [basicInfoModalOpen, setBasicInfoModalOpen] = useState(false);
  const [basicInfoChannel, setBasicInfoChannel] = useState<Channel | null>(null);
  const [basicInfoForm] = Form.useForm();

  // Filter conditions
  const [filterCountry, setFilterCountry] = useState<string[]>([]);
  const [filterParty, setFilterParty] = useState<string | null>(null);
  const [filterBT, setFilterBT] = useState<string | null>(null);
  const [filterAbility, setFilterAbility] = useState<string | null>(null);

  // Search trigger - only filter when Search button is clicked
  const [searchTrigger, setSearchTrigger] = useState(false);

  // Initialize mock data
  useEffect(() => {
    setChannels(mockChannels as unknown as Channel[]);
  }, []);

  // Search and filter - only active when searchTrigger is true
  const filteredChannels = channels.filter((c) => {
    // Channel Code search
    if (searchTrigger && searchText && !c.code.toLowerCase().includes(searchText.toLowerCase())) {
      return false;
    }
    // Country filter
    if (searchTrigger && filterCountry.length > 0 && !filterCountry.some(country => c.country.includes(country))) {
      return false;
    }
    // Party filter
    if (searchTrigger && filterParty && c.party !== filterParty) {
      return false;
    }
    return true;
  });

  // Handle Search button click
  const handleSearch = () => {
    setSearchTrigger(true);
  };

  // Clear all filters
  const clearFilters = () => {
    setFilterCountry([]);
    setFilterParty(null);
    setFilterBT(null);
    setFilterAbility(null);
    setSearchText('');
    setSearchTrigger(false);
  };

  const hasActiveFilters = searchTrigger;

  // Handle BasicInfo modal save
  const handleBasicInfoSave = async () => {
    try {
      const values = await basicInfoForm.validateFields();
      if (basicInfoChannel) {
        setChannels(prev => prev.map(c =>
          c.code === basicInfoChannel.code
            ? {
                ...c,
                productOwner: values.productOwner,
                developmentOwner: values.developmentOwner,
                operationOwner: values.operationOwner,
                productApprover: values.productApprover,
                developmentApprover: values.developmentApprover,
                operationApprover: values.operationApprover,
              }
            : c
        ));
        message.success('Basic Info updated successfully');
        setBasicInfoModalOpen(false);
        basicInfoForm.resetFields();
      }
    } catch {}
  };

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
        country: [],
        party: values.party,
        status: 'Inactive',
        productOwner: values.productOwner,
        developmentOwner: values.developmentOwner,
        operationOwner: values.operationOwner,
        productApprover: values.productApprover,
        developmentApprover: values.developmentApprover,
        operationApprover: values.operationApprover,
        operator: 'admin',
        operationTime: new Date().toLocaleString(),
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
      title: 'Operator',
      dataIndex: 'operator',
      key: 'operator',
      width: 120,
    },
    {
      title: 'Operation Time',
      dataIndex: 'operationTime',
      key: 'operationTime',
      width: 180,
    },
    {
      title: 'Operation',
      key: 'action',
      width: 1000,
      render: (_: any, record: Channel) => (
        <Space size="small">
          <Button type="primary" size="small" onClick={() => {
            setBasicInfoChannel(record);
            basicInfoForm.setFieldsValue({
              productOwner: record.productOwner,
              developmentOwner: record.developmentOwner,
              operationOwner: record.operationOwner,
              productApprover: record.productApprover,
              developmentApprover: record.developmentApprover,
              operationApprover: record.operationApprover,
            });
            setBasicInfoModalOpen(true);
          }}>
            BasicInfo
          </Button>
          <Button type="primary" size="small" onClick={() => navigate(`/channel-integration/${record.code}/offline-info`)}>
            OfflineInfo
          </Button>
          <Button type="primary" size="small" onClick={() => navigate(`/channel-integration/${record.code}/api-debug`)}>
            Debug
          </Button>
          <Button type="primary" size="small" onClick={() => navigate(`/channel-integration/${record.code}/business-type`)}>
            Business Type
          </Button>
          <Button type="primary" size="small" onClick={() => navigate(`/channel-integration/${record.code}/country`)}>
            Country
          </Button>
          <Button type="primary" size="small" onClick={() => navigate(`/channel-integration/${record.code}/party`)}>
            Party
          </Button>
          <Button type="primary" size="small" onClick={() => navigate(`/channel-integration/${record.code}/credential`)}>
            Credential
          </Button>
          <Button type="primary" size="small" onClick={() => navigate(`/channel-integration/${record.code}/authentication`)}>
            Authentication
          </Button>
          <Dropdown menu={{ items: [
            { key: 'match-capability', label: 'matchCapability', onClick: () => navigate(`/channel-integration/${record.code}/integration/match-capability`) },
            { key: 'config', label: 'Config Integration', onClick: () => navigate(`/channel-integration/${record.code}/integration/config`) },
            { key: 'code', label: 'Code Integration', onClick: () => navigate(`/channel-integration/${record.code}/integration/code`) },
          ]}} trigger={['click']}>
            <Button type="primary" size="small">
              Integration <DownOutlined />
            </Button>
          </Dropdown>
          <Button type="primary" size="small" onClick={() => navigate(`/channel-integration/${record.code}/channel-info`)}>
            Channel Info
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      {/* Breadcrumb */}
      <Breadcrumb
        style={{ marginBottom: 16 }}
        items={[
          { title: 'Omnicore Solution' },
          { title: 'Channel Integration' },
        ]}
      />

      {/* Page title and buttons */}
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16 }}>
        <Space>
          {hasActiveFilters && (
            <Button icon={<CloseCircleOutlined />} onClick={clearFilters}>
              Clear Filter
            </Button>
          )}
        </Space>
      </div>

      {/* Filter area */}
      <Card size="small" style={{ marginBottom: 16, background: '#fafafa' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <Space wrap align="end">
            <div>
              <div style={{ marginBottom: 4, color: '#666', fontSize: 12 }}>Channel Code</div>
              <Input
                placeholder="Search"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                style={{ width: 150 }}
              />
            </div>
            <div>
              <div style={{ marginBottom: 4, color: '#666', fontSize: 12 }}>Country</div>
              <Select
                mode="multiple"
                placeholder="Select Country"
                value={filterCountry}
                onChange={setFilterCountry}
                style={{ width: 150 }}
                allowClear
              >
                {countryOptions.map((c) => (
                  <Select.Option key={c} value={c}>{c}</Select.Option>
                ))}
              </Select>
            </div>
            <div>
              <div style={{ marginBottom: 4, color: '#666', fontSize: 12 }}>Party</div>
              <Select
                placeholder="Select Party"
                value={filterParty}
                onChange={setFilterParty}
                style={{ width: 150 }}
                allowClear
              >
                {partyOptions.map((p) => (
                  <Select.Option key={p} value={p}>{p}</Select.Option>
                ))}
              </Select>
            </div>
            <div>
              <div style={{ marginBottom: 4, color: '#666', fontSize: 12 }}>Business Type</div>
              <Select
                placeholder="Select Business Type"
                value={filterBT}
                onChange={setFilterBT}
                style={{ width: 150 }}
                allowClear
              >
                {businessTypeOptions.map((bt) => (
                  <Select.Option key={bt} value={bt}>{bt}</Select.Option>
                ))}
              </Select>
            </div>
            <div>
              <div style={{ marginBottom: 4, color: '#666', fontSize: 12 }}>Ability</div>
              <Select
                placeholder="Select Ability"
                value={filterAbility}
                onChange={setFilterAbility}
                style={{ width: 150 }}
                allowClear
              >
                {['CARD_PAY', 'USSD_PAY', 'WALLET_PAY', 'BANK_TRF'].map((a) => (
                  <Select.Option key={a} value={a}>{a}</Select.Option>
                ))}
              </Select>
            </div>
          </Space>
          <Button type="primary" onClick={handleSearch}>
            Search
          </Button>
        </div>
      </Card>

      {/* Action buttons */}
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 8 }}>
        <Button>
          Channel Status
        </Button>
        <Button onClick={() => setIsModalOpen(true)}>
          Create Channel
        </Button>
      </div>

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
        width={600}
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item
            name="code"
            label="Channel Code"
            rules={[
              { required: true, message: 'Please enter Channel Code' },
              { pattern: /^[A-Z0-9_]+$/, message: 'Only uppercase letters, underscore, and numbers allowed' },
            ]}
            tooltip="全局唯一；仅允许大写字母、数字和下划线；创建后不可修改"
          >
            <Input placeholder="e.g., GTB_NG" />
          </Form.Item>
          <Form.Item
            name="party"
            label="Party"
            rules={[{ required: true, message: 'Please select Party' }]}
            tooltip="多选；候选项取自 Basic Info → Party 维护的 Party 字典"
          >
            <Select mode="multiple" placeholder="Select Party">
              {partyOptions.map((p) => (
                <Select.Option key={p} value={p}>{p}</Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item
            name="productOwner"
            label="Product Owner"
            rules={[{ required: true, message: 'Please select Product Owner' }]}
            tooltip="单选；从钉钉组织架构选人"
          >
            <TreeSelect
              placeholder="Select Product Owner"
              treeData={organizationTreeData}
              treeDefaultExpandAll
              style={{ width: '100%' }}
            />
          </Form.Item>
          <Form.Item
            name="developmentOwner"
            label="Development Owner"
            rules={[{ required: true, message: 'Please select Development Owner' }]}
            tooltip="单选；从钉钉组织架构选人"
          >
            <TreeSelect
              placeholder="Select Development Owner"
              treeData={organizationTreeData}
              treeDefaultExpandAll
              style={{ width: '100%' }}
            />
          </Form.Item>
          <Form.Item
            name="operationOwner"
            label="Operation Owner"
            rules={[{ required: true, message: 'Please select Operation Owner' }]}
            tooltip="单选；从钉钉组织架构选人"
          >
            <TreeSelect
              placeholder="Select Operation Owner"
              treeData={organizationTreeData}
              treeDefaultExpandAll
              style={{ width: '100%' }}
            />
          </Form.Item>
          <Form.Item
            name="productApprover"
            label="Product Approver"
            rules={[{ required: true, message: 'Please select Product Approver' }]}
            tooltip="单选；从钉钉组织架构选人"
          >
            <TreeSelect
              placeholder="Select Product Approver"
              treeData={organizationTreeData}
              treeDefaultExpandAll
              style={{ width: '100%' }}
            />
          </Form.Item>
          <Form.Item
            name="developmentApprover"
            label="Development Approver"
            rules={[{ required: true, message: 'Please select Development Approver' }]}
            tooltip="单选；从钉钉组织架构选人"
          >
            <TreeSelect
              placeholder="Select Development Approver"
              treeData={organizationTreeData}
              treeDefaultExpandAll
              style={{ width: '100%' }}
            />
          </Form.Item>
          <Form.Item
            name="operationApprover"
            label="Operation Approver"
            rules={[{ required: true, message: 'Please select Operation Approver' }]}
            tooltip="单选；从钉钉组织架构选人"
          >
            <TreeSelect
              placeholder="Select Operation Approver"
              treeData={organizationTreeData}
              treeDefaultExpandAll
              style={{ width: '100%' }}
            />
          </Form.Item>
        </Form>
      </Modal>

      {/* BasicInfo modal */}
      <Modal
        title="Basic Information"
        open={basicInfoModalOpen}
        onOk={handleBasicInfoSave}
        onCancel={() => {
          setBasicInfoModalOpen(false);
          basicInfoForm.resetFields();
        }}
        okText="Save"
        cancelText="Cancel"
        width={600}
      >
        <Form form={basicInfoForm} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item
            name="productOwner"
            label="Product Owner"
            tooltip="单选；从钉钉组织架构选人"
          >
            <TreeSelect
              placeholder="Select Product Owner"
              treeData={organizationTreeData}
              treeDefaultExpandAll
              style={{ width: '100%' }}
            />
          </Form.Item>
          <Form.Item
            name="developmentOwner"
            label="Development Owner"
            tooltip="单选；从钉钉组织架构选人"
          >
            <TreeSelect
              placeholder="Select Development Owner"
              treeData={organizationTreeData}
              treeDefaultExpandAll
              style={{ width: '100%' }}
            />
          </Form.Item>
          <Form.Item
            name="operationOwner"
            label="Operation Owner"
            tooltip="单选；从钉钉组织架构选人"
          >
            <TreeSelect
              placeholder="Select Operation Owner"
              treeData={organizationTreeData}
              treeDefaultExpandAll
              style={{ width: '100%' }}
            />
          </Form.Item>
          <Form.Item
            name="productApprover"
            label="Product Approver"
            tooltip="单选；从钉钉组织架构选人"
          >
            <TreeSelect
              placeholder="Select Product Approver"
              treeData={organizationTreeData}
              treeDefaultExpandAll
              style={{ width: '100%' }}
            />
          </Form.Item>
          <Form.Item
            name="developmentApprover"
            label="Development Approver"
            tooltip="单选；从钉钉组织架构选人"
          >
            <TreeSelect
              placeholder="Select Development Approver"
              treeData={organizationTreeData}
              treeDefaultExpandAll
              style={{ width: '100%' }}
            />
          </Form.Item>
          <Form.Item
            name="operationApprover"
            label="Operation Approver"
            tooltip="单选；从钉钉组织架构选人"
          >
            <TreeSelect
              placeholder="Select Operation Approver"
              treeData={organizationTreeData}
              treeDefaultExpandAll
              style={{ width: '100%' }}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
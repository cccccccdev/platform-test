import { useState, useEffect } from 'react';
import { Table, Button, Input, Space, Modal, Form, Select, Tag, Breadcrumb, Badge, Row, Col, Card, message, Dropdown } from 'antd';
import { PlusOutlined, SearchOutlined, DownOutlined, FilterOutlined, CloseCircleOutlined } from '@ant-design/icons';
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

  // 筛选条件
  const [filterCountry, setFilterCountry] = useState<string[]>([]);
  const [filterParty, setFilterParty] = useState<string | null>(null);
  const [filterBT, setFilterBT] = useState<string | null>(null);
  const [filterAbility, setFilterAbility] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  // 初始化加载 Mock 数据
  useEffect(() => {
    setChannels(mockChannels as unknown as Channel[]);
  }, []);

  // 搜索过滤
  const filteredChannels = channels.filter((c) => {
    // Channel Code 搜索
    if (searchText && !c.code.toLowerCase().includes(searchText.toLowerCase())) {
      return false;
    }
    // 国家筛选
    if (filterCountry.length > 0 && !filterCountry.some(country => c.country.includes(country))) {
      return false;
    }
    // Party 筛选
    if (filterParty && c.party !== filterParty) {
      return false;
    }
    return true;
  });

  // 清除所有筛选
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
      // 检查 Channel Code 是否已存在
      if (channels.some((c) => c.code === values.code)) {
        form.setFields([
          { name: 'code', errors: ['Channel Code 已存在'] },
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
      // 高亮新行
      setHighlightedRow(newChannel.code);
      setTimeout(() => setHighlightedRow(null), 2000);
    } catch {}
  };

  // 构建操作菜单
  const getActionMenu = (record: Channel): MenuProps => ({
    items: [
      // 第一组：直接跳转
      { key: 'party', label: 'Party', onClick: () => navigate(`/channel-integration/${record.code}/party`) },
      { key: 'country', label: 'Country', onClick: () => navigate(`/channel-integration/${record.code}/country`) },
      { key: 'business-type', label: 'Business Type', onClick: () => navigate(`/channel-integration/${record.code}/business-type`) },
      { key: 'credential', label: 'Credential', onClick: () => navigate(`/channel-integration/${record.code}/credential`) },
      { key: 'authentication', label: 'Authentication', onClick: () => navigate(`/channel-integration/${record.code}/authentication`) },
      { key: 'debug', label: 'Debug', onClick: () => navigate(`/channel-integration/${record.code}/api-debug`) },
      { type: 'divider' },
      // 第二组：二级菜单
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

  // 表格列定义
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
      title: 'Channel Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Space>
          <Badge color={status === 'Active' ? '#52c41a' : '#d9d9d9'} />
          {status}
        </Space>
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: 120,
      render: (_: any, record: Channel) => (
        <Dropdown menu={getActionMenu(record)} trigger={['click']}>
          <Button type="text" size="small">
            操作 <DownOutlined />
          </Button>
        </Dropdown>
      ),
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      {/* 面包屑 */}
      <Breadcrumb
        style={{ marginBottom: 16 }}
        items={[
          { title: '接入平台 2.0' },
          { title: 'Channel Integration' },
        ]}
      />

      {/* 页面标题和搜索 */}
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
            筛选 {hasActiveFilters && <Badge count={1} size="small" />}
          </Button>
          {hasActiveFilters && (
            <Button icon={<CloseCircleOutlined />} onClick={clearFilters}>
              清除筛选
            </Button>
          )}
        </Space>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setIsModalOpen(true)}>
          + New Channel
        </Button>
      </div>

      {/* 筛选区域 */}
      {showFilters && (
        <Card size="small" style={{ marginBottom: 16, background: '#fafafa' }}>
          <Row gutter={[16, 16]}>
            <Col span={6}>
              <div style={{ marginBottom: 4, color: '#666', fontSize: 12 }}>国家</div>
              <Select
                mode="multiple"
                placeholder="选择国家"
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
                placeholder="选择 Party"
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
                placeholder="选择 Business Type"
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
                placeholder="选择 Ability"
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

      {/* 已选筛选条件展示 */}
      {hasActiveFilters && (
        <div style={{ marginBottom: 12 }}>
          <Space wrap>
            {searchText && <Tag closable onClose={() => setSearchText('')}>Channel Code: {searchText}</Tag>}
            {filterCountry.map(c => (
              <Tag key={c} closable onClose={() => setFilterCountry(prev => prev.filter(x => x !== c))}>国家: {c}</Tag>
            ))}
            {filterParty && <Tag closable onClose={() => setFilterParty(null)}>Party: {filterParty}</Tag>}
            {filterBT && <Tag closable onClose={() => setFilterBT(null)}>BT: {filterBT}</Tag>}
            {filterAbility && <Tag closable onClose={() => setFilterAbility(null)}>Ability: {filterAbility}</Tag>}
          </Space>
        </div>
      )}

      {/* 渠道表格 */}
      <Table
        dataSource={filteredChannels}
        columns={columns}
        rowKey="code"
        pagination={{ pageSize: 10 }}
        rowClassName={(record) => (highlightedRow === record.code ? 'ant-table-row-highlight' : '')}
        locale={{ emptyText: '暂无数据' }}
      />

      {/* 新建 Channel 弹窗 */}
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
              { required: true, message: '请输入 Channel Code' },
              { pattern: /^[A-Z0-9_]+$/, message: '仅允许大写字母+下划线+数字' },
            ]}
          >
            <Input placeholder="如: GTB_NG" />
          </Form.Item>
          <Form.Item
            name="country"
            label="Country"
            rules={[{ required: true, message: '请选择 Country' }]}
          >
            <Select mode="multiple" placeholder="选择国家">
              {countryOptions.map((c) => (
                <Select.Option key={c} value={c}>{c}</Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item
            name="party"
            label="Party"
            rules={[{ required: true, message: '请选择 Party' }]}
          >
            <Select placeholder="选择 Party">
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


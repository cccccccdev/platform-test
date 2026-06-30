import { useState, useEffect } from 'react';
import { Table, Button, Input, Space, Modal, Form, Breadcrumb, Card, message } from 'antd';
import { useNavigate } from 'react-router-dom';
import { mockChannels } from '../../mock/data';
import type { Channel } from './types';

export default function ChannelListPage() {
  const navigate = useNavigate();
  const [channels, setChannels] = useState<Channel[]>([]);
  const [searchText, setSearchText] = useState('');
  const [queriedChannel, setQueriedChannel] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form] = Form.useForm();
  const [highlightedRow, setHighlightedRow] = useState<string | null>(null);

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
          <Button type="primary" size="small" onClick={() => navigate(`/channel-integration/${record.code}/offline-info`)}>
            OfflineInfo
          </Button>
          <Button type="primary" size="small" onClick={() => navigate(`/channel-integration/${record.code}/api-debug`)}>
            AI Debug
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
    <div style={{ padding: 24 }}>
      {/* Breadcrumb */}
      <Breadcrumb
        style={{ marginBottom: 16 }}
        items={[
          { title: 'Omnicore Solution' },
          { title: 'Channel Integration' },
        ]}
      />

      {/* Filter area */}
      <Card size="small" style={{ marginBottom: 16, background: '#fafafa' }}>
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
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 8 }}>
        <Button onClick={() => setIsModalOpen(true)}>
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

      {/* Create Channel modal */}
      <Modal
        title="Create Channel"
        open={isModalOpen}
        onOk={handleCreate}
        onCancel={() => {
          setIsModalOpen(false);
          form.resetFields();
        }}
        okText="Submit"
        cancelText="Cancel"
        width={480}
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item
            name="channel"
            label="Channel"
            rules={[{ required: true, message: 'Please enter Channel name' }]}
          >
            <Input placeholder="Channel name" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

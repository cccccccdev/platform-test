import { useState } from 'react';
import { Table, Button, Input, Space, Modal, Form, Select, message, Popconfirm } from 'antd';
import { PlusOutlined, SearchOutlined, EditOutlined, FileTextOutlined, InfoCircleOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useChannelStore } from '../../store';
import type { Channel } from '../../domain/channel/types';

export default function ChannelListPage() {
  const { channels, addChannel, updateChannel, deleteChannel } = useChannelStore();
  const navigate = useNavigate();
  const [searchText, setSearchText] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingChannel, setEditingChannel] = useState<Channel | null>(null);
  const [form] = Form.useForm();

  const filteredChannels = channels.filter(
    (c) => c.channelId.toLowerCase().includes(searchText.toLowerCase())
  );

  const handleOpenModal = (channel?: Channel) => {
    if (channel) {
      setEditingChannel(channel);
      form.setFieldsValue({
        channelId: channel.channelId,
        name: channel.name,
        status: channel.status,
      });
    } else {
      setEditingChannel(null);
      form.resetFields();
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingChannel(null);
    form.resetFields();
  };

  const handleSaveChannel = async () => {
    try {
      const values = await form.validateFields();
      if (editingChannel) {
        updateChannel(editingChannel.channelId, {
          name: values.name,
          status: values.status,
        });
        message.success('渠道更新成功');
      } else {
        const newChannel: Channel = {
          channelId: values.channelId,
          name: values.name,
          status: values.status || 'active',
          businessTypes: [],
        };
        addChannel(newChannel);
        message.success('渠道创建成功');
      }
      handleCloseModal();
    } catch {}
  };

  const handleDeleteChannel = (channelId: string) => {
    deleteChannel(channelId);
    message.success('渠道删除成功');
  };

  const columns = [
    {
      title: 'Channel Code',
      dataIndex: 'channelId',
      key: 'channelId',
      render: (code: string) => (
        <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{code}</span>
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: 300,
      render: (_: any, record: Channel) => (
        <Space>
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleOpenModal(record)}
          >
            Modify
          </Button>
          <Button
            type="link"
            size="small"
            icon={<FileTextOutlined />}
            onClick={() => navigate(`/channel/${record.channelId}/scenario`)}
          >
            Detail
          </Button>
          <Button
            type="link"
            size="small"
            icon={<InfoCircleOutlined />}
            onClick={() => navigate(`/channel/${record.channelId}/info`)}
          >
            Info
          </Button>
          <Popconfirm
            title="确定删除该渠道？"
            onConfirm={() => handleDeleteChannel(record.channelId)}
            okText="删除"
            cancelText="取消"
            okButtonProps={{ danger: true }}
          >
            <Button type="link" size="small" danger>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      {/* Header */}
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Space>
          <Input
            placeholder="搜索Channel Code"
            prefix={<SearchOutlined />}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            style={{ width: 250 }}
          />
          <span style={{ color: '#999', fontSize: 13 }}>
            共 {filteredChannels.length} 个渠道
          </span>
        </Space>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => handleOpenModal()}>
          创建渠道
        </Button>
      </div>

      {/* Channel Table */}
      <Table
        dataSource={filteredChannels}
        columns={columns}
        rowKey="channelId"
        pagination={{ pageSize: 10 }}
      />

      {/* Create/Edit Modal */}
      <Modal
        title={editingChannel ? '编辑渠道' : '创建渠道'}
        open={isModalOpen}
        onOk={handleSaveChannel}
        onCancel={handleCloseModal}
        width={400}
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item
            name="channelId"
            label="Channel Code"
            rules={[{ required: true, message: '请输入Channel Code' }]}
          >
            <Input placeholder="如: MOMO, WECHAT" disabled={!!editingChannel} />
          </Form.Item>
          <Form.Item
            name="name"
            label="渠道名称"
            rules={[{ required: true, message: '请输入渠道名称' }]}
          >
            <Input placeholder="如: MoMo支付" />
          </Form.Item>
          <Form.Item name="status" label="状态" initialValue="active">
            <Select>
              <Select.Option value="active">活跃</Select.Option>
              <Select.Option value="inactive">停用</Select.Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

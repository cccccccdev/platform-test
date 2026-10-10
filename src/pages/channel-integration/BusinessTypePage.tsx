import { useState, useEffect } from 'react';
import { Table, Button, Modal, Form, Select, Radio, message, Breadcrumb, Popconfirm } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useParams, useNavigate } from 'react-router-dom';
import { mockBusinessTypes, businessTypeOptions } from '../../mock/data';
import type { BusinessType } from './types';

export default function BusinessTypePage() {
  const { channelCode } = useParams<{ channelCode: string }>();
  const navigate = useNavigate();
  const [businessTypes, setBusinessTypes] = useState<BusinessType[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form] = Form.useForm();

  // 初始化加载 Mock 数据
  useEffect(() => {
    const data = mockBusinessTypes[channelCode || ''] || [];
    setBusinessTypes([...data]);
  }, [channelCode]);

  // 获取已存在的 BT 列表
  const existingBTs = businessTypes.map((bt) => bt.bt);

  // 可选的 BT（排除已存在的）
  const availableBTs = businessTypeOptions.filter((bt) => !existingBTs.includes(bt));

  // 新增 BT
  const handleAdd = async () => {
    try {
      const values = await form.validateFields();
      const newBT: BusinessType = {
        bt: values.bt,
        mode: values.mode,
      };
      setBusinessTypes((prev) => [...prev, newBT]);
      message.success('Business Type added successfully');
      setIsModalOpen(false);
      form.resetFields();
    } catch {}
  };

  // 修改接入方式
  const handleModeChange = (bt: string, newMode: 'Config Integration' | 'Code Integration') => {
    Modal.confirm({
      title: '确认切换接入方式',
      content: '切换接入方式将清除该 BT 下已有的 Ability 配置，是否继续？',
      okText: 'Confirm',
      cancelText: 'Cancel',
      onOk: () => {
        setBusinessTypes((prev) =>
          prev.map((item) => (item.bt === bt ? { ...item, mode: newMode } : item))
        );
        message.success('接入方式已更新');
      },
    });
  };

  // 删除 BT
  const handleDelete = (bt: string) => {
    Modal.confirm({
      title: '确认删除',
      content: '删除后该 BT 下已有的 Ability 配置将全部清除，且不可恢复。',
      okText: 'Confirm Delete',
      okButtonProps: { danger: true },
      cancelText: 'Cancel',
      onOk: () => {
        setBusinessTypes((prev) => prev.filter((item) => item.bt !== bt));
        message.success('Business Type deleted');
      },
    });
  };

  // 表格列定义
  const columns = [
    {
      title: 'Business Type',
      dataIndex: 'bt',
      key: 'bt',
      render: (bt: string) => <span style={{ fontWeight: 600 }}>{bt}</span>,
    },
    {
      title: '接入方式',
      dataIndex: 'mode',
      key: 'mode',
      render: (mode: 'Config Integration' | 'Code Integration', record: BusinessType) => (
        <Radio.Group
          value={mode}
          onChange={(e) => handleModeChange(record.bt, e.target.value)}
        >
          <Radio value="Config Integration">Config Integration</Radio>
          <Radio value="Code Integration">Code Integration</Radio>
        </Radio.Group>
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: 100,
      render: (_: any, record: BusinessType) => (
        <Popconfirm
          title="确认删除"
          description="删除后该 BT 下已有的 Ability 配置将全部清除，且不可恢复。"
          onConfirm={() => handleDelete(record.bt)}
          okText="Confirm Delete"
          okButtonProps={{ danger: true }}
          cancelText="Cancel"
        >
          <Button type="text" size="small" danger>
            Delete
          </Button>
        </Popconfirm>
      ),
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      {/* 面包屑 */}
      <Breadcrumb
        style={{ marginBottom: 16 }}
        items={[
          { title: 'Channel Integration', onClick: () => navigate('/channel-integration') },
          { title: channelCode },
          { title: 'Business Type' },
        ]}
      />

      {/* 页面标题和按钮 */}
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ margin: 0 }}>Business Type</h2>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setIsModalOpen(true)}>
          + Add Business Type
        </Button>
      </div>

      {/* 列表 */}
      <Table
        dataSource={businessTypes}
        columns={columns}
        rowKey="bt"
        pagination={false}
        locale={{ emptyText: '暂无 Business Type，点击 + Add Business Type 创建' }}
      />

      {/* 新增 BT 弹窗 */}
      <Modal
        title="Add Business Type"
        open={isModalOpen}
        onOk={handleAdd}
        onCancel={() => {
          setIsModalOpen(false);
          form.resetFields();
        }}
        okText="Confirm"
        cancelText="Cancel"
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item
            name="bt"
            label="Business Type"
            rules={[{ required: true, message: '请选择 Business Type' }]}
          >
            <Select placeholder="选择 Business Type">
              {availableBTs.map((bt) => (
                <Select.Option key={bt} value={bt}>{bt}</Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item
            name="mode"
            label="接入方式"
            initialValue="Config Integration"
          >
            <Radio.Group>
              <Radio value="Config Integration">Config Integration</Radio>
              <Radio value="Code Integration">Code Integration</Radio>
            </Radio.Group>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
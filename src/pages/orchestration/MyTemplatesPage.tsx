import { useState } from 'react';
import { Card, Table, Button, Space, Tag, Typography, Modal, message } from 'antd';
import { PlusOutlined, EyeOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { useActionStore } from '../../store';

const { Text } = Typography;

const FLOW_TYPE_NAMES: Record<string, string> = {
  'T01': 'Transaction 同步完成型',
  'T02': 'Transaction 异步+Requery',
  'T03': 'Transaction 多步调用型',
  'T04': 'General Query',
  'T05': 'Callback Flow',
  'T06': 'Inbound Deposit 入金校验型',
};

const STATE_COLORS: Record<string, string> = {
  INIT: '#1890ff',
  PENDING: '#fa8c16',
  SUCCESS: '#52c41a',
  FAIL: '#ff4d4f',
  NOT_FOUND: '#722ed1',
  EMPTY: '#eb2f96',
  EXPIRE: '#a0d911',
  CLOSE: '#999999',
};

export default function MyTemplatesPage() {
  const { l4Templates } = useActionStore();

  // 个人模版库只显示 source === 'Personal' 的模版
  const personalTemplates = l4Templates.filter(t => t.source === 'Personal');

  const [selectedL4, setSelectedL4] = useState<string | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);

  const handleView = (templateId: string) => {
    setSelectedL4(templateId);
    setIsViewModalOpen(true);
  };

  const handleEdit = (_templateId: string) => {
    message.info('个人模版编辑功能开发中');
  };

  const handleDelete = (_templateId: string) => {
    Modal.confirm({
      title: '确定删除该个人模版？',
      content: '删除后不可恢复',
      okText: '删除',
      cancelText: '取消',
      okButtonProps: { danger: true },
      onOk: () => {
        message.success('个人模版删除成功');
      },
    });
  };

  const selectedL4Data = l4Templates.find(t => t.templateId === selectedL4);

  // Render state machine overview
  const renderStateMachine = (template: any) => {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
        {template.states.map((state: string, idx: number) => (
          <div key={state} style={{ display: 'flex', alignItems: 'center' }}>
            {idx > 0 && <span style={{ margin: '0 4px', color: '#999' }}>→</span>}
            <Tag color={STATE_COLORS[state] || '#999'} style={{ fontSize: 10 }}>
              {state}
            </Tag>
          </div>
        ))}
      </div>
    );
  };

  const columns = [
    {
      title: '模版名称',
      dataIndex: 'name',
      key: 'name',
      render: (name: string, record: any) => (
        <div>
          <Text strong>{name}</Text>
          <div style={{ fontSize: 11, color: '#888' }}>{record.templateId}</div>
        </div>
      ),
    },
    {
      title: 'Flow类型',
      dataIndex: 'flowType',
      key: 'flowType',
      width: 120,
      render: (flowType: string) => (
        <Tag color="green">{FLOW_TYPE_NAMES[flowType] || flowType}</Tag>
      ),
    },
    {
      title: '状态机概览',
      key: 'states',
      render: (_: any, record: any) => renderStateMachine(record),
    },
    {
      title: '操作',
      key: 'action',
      width: 200,
      render: (_: any, record: any) => (
        <Space size={4}>
          <Button type="link" size="small" icon={<EyeOutlined />} onClick={() => handleView(record.templateId)}>
            View
          </Button>
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => handleEdit(record.templateId)}>
            Edit
          </Button>
          <Button type="link" size="small" danger icon={<DeleteOutlined />} onClick={() => handleDelete(record.templateId)}>
            Delete
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      {/* Header */}
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ marginBottom: 8 }}>个人模版库</h2>
          <Text type="secondary">共 {personalTemplates.length} 个个人模版</Text>
        </div>
        <Button type="primary" icon={<PlusOutlined />}>
          New Personal Template
        </Button>
      </div>

      {/* Personal Templates Table */}
      <Card>
        <Table
          dataSource={personalTemplates}
          columns={columns}
          rowKey="templateId"
          pagination={{ pageSize: 10 }}
          locale={{ emptyText: '暂无个人模版' }}
        />
      </Card>

      {/* View Modal */}
      <Modal
        title="个人模版详情"
        open={isViewModalOpen}
        onCancel={() => setIsViewModalOpen(false)}
        footer={null}
        width={700}
      >
        {selectedL4Data && (
          <div>
            <div style={{ marginBottom: 16 }}>
              <Text strong>模版名称：</Text>
              <Tag color="green">{selectedL4Data.name}</Tag>
              <Tag>{selectedL4Data.templateId}</Tag>
              <Tag color="blue">{FLOW_TYPE_NAMES[selectedL4Data.flowType]}</Tag>
            </div>

            <div style={{ marginBottom: 16 }}>
              <Text strong>描述：</Text>
              <div>{selectedL4Data.description}</div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <Text strong>状态机：</Text>
              <div style={{ marginTop: 8, padding: 16, background: '#fafafa', borderRadius: 8 }}>
                {selectedL4Data.states.map((state: string, idx: number) => (
                  <div key={state} style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
                    {idx > 0 && (
                      <>
                        {selectedL4Data.transitions
                          .filter((t: any) => t.from === selectedL4Data.states[idx - 1] && t.to === state)
                          .map((t: any, i: number) => (
                            <span key={i} style={{ marginRight: 8, color: '#666', fontSize: 12 }}>
                              ({t.trigger})
                            </span>
                          ))}
                      </>
                    )}
                    <Tag color={STATE_COLORS[state] || '#999'} style={{ minWidth: 60, textAlign: 'center' }}>
                      {state}
                    </Tag>
                    {idx < selectedL4Data.states.length - 1 && (
                      <span style={{ margin: '0 8px', color: '#999' }}>→</span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div>
              <Text strong>流转规则：</Text>
              <div style={{ marginTop: 8 }}>
                {selectedL4Data.transitions.map((t: any, idx: number) => (
                  <Card key={idx} size="small" style={{ marginBottom: 8 }}>
                    <Tag color="blue">{t.from}</Tag>
                    <span style={{ margin: '0 8px' }}>→</span>
                    <Tag color={STATE_COLORS[t.to] || 'blue'}>{t.to}</Tag>
                    <Text type="secondary" style={{ marginLeft: 8 }}>({t.trigger})</Text>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

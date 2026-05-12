import { useState } from 'react';
import { Card, Table, Button, Space, Tag, Typography, Modal, message } from 'antd';
import { PlusOutlined, EyeOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { useActionStore } from '../../store';

const { Text } = Typography;

export default function L3LibraryListPage() {
  const { l3Composites } = useActionStore();
  const [selectedL3, setSelectedL3] = useState<string | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);

  const handleView = (code: string) => {
    setSelectedL3(code);
    setIsViewModalOpen(true);
  };

  const handleEdit = (_code: string) => {
    message.info('L3编辑功能开发中');
  };

  const handleDelete = (_code: string) => {
    Modal.confirm({
      title: '确定删除该L3组件？',
      content: '删除后不可恢复',
      okText: '删除',
      cancelText: '取消',
      okButtonProps: { danger: true },
      onOk: () => {
        message.success('L3组件删除成功');
      },
    });
  };

  const selectedL3Data = l3Composites.find(l3 => l3.code === selectedL3);

  const columns = [
    {
      title: '组件名称',
      dataIndex: 'name',
      key: 'name',
      render: (name: string, record: any) => (
        <div>
          <Text strong>{name}</Text>
          <div style={{ fontSize: 11, color: '#888' }}>{record.code}</div>
        </div>
      ),
    },
    {
      title: 'L2组合',
      dataIndex: 'l2Combination',
      key: 'l2Combination',
      render: (l2s: string[]) => (
        <Space wrap size={2}>
          {l2s.map((l2) => (
            <Tag key={l2} color="blue" style={{ fontSize: 10 }}>
              {l2}
            </Tag>
          ))}
        </Space>
      ),
    },
    {
      title: '整体Input',
      dataIndex: 'input',
      key: 'input',
      render: (input: string[]) => (
        <Space wrap size={2}>
          {input.slice(0, 3).map((f) => (
            <Tag key={f} style={{ fontSize: 10 }}>{f}</Tag>
          ))}
          {input.length > 3 && <Tag style={{ fontSize: 10 }}>...</Tag>}
        </Space>
      ),
    },
    {
      title: '整体Output',
      dataIndex: 'output',
      key: 'output',
      render: (output: string[]) => (
        <Space wrap size={2}>
          {output.slice(0, 3).map((f) => (
            <Tag key={f} style={{ fontSize: 10 }}>{f}</Tag>
          ))}
          {output.length > 3 && <Tag style={{ fontSize: 10 }}>...</Tag>}
        </Space>
      ),
    },
    {
      title: '关联状态数',
      dataIndex: 'states',
      key: 'states',
      width: 100,
      render: (states: any[]) => <Tag>{states.length} 个</Tag>,
    },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      width: 100,
      render: (type: string) => (
        <Tag color={type === 'Platform' ? 'blue' : 'green'}>
          [{type}]
        </Tag>
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: 200,
      render: (_: any, record: any) => (
        <Space size={4}>
          <Button type="link" size="small" icon={<EyeOutlined />} onClick={() => handleView(record.code)}>
            View
          </Button>
          {record.type === 'Custom' && (
            <>
              <Button type="link" size="small" icon={<EditOutlined />} onClick={() => handleEdit(record.code)}>
                Edit
              </Button>
              <Button type="link" size="small" danger icon={<DeleteOutlined />} onClick={() => handleDelete(record.code)}>
                Delete
              </Button>
            </>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      {/* Header */}
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ marginBottom: 8 }}>L3 Component Library</h2>
          <Text type="secondary">共 {l3Composites.length} 个L3组件</Text>
        </div>
        <Button type="primary" icon={<PlusOutlined />}>
          New L3 Component
        </Button>
      </div>

      {/* L3 Table */}
      <Card>
        <Table
          dataSource={l3Composites}
          columns={columns}
          rowKey="code"
          pagination={{ pageSize: 10 }}
        />
      </Card>

      {/* View Modal */}
      <Modal
        title="L3 组件详情"
        open={isViewModalOpen}
        onCancel={() => setIsViewModalOpen(false)}
        footer={null}
        width={600}
      >
        {selectedL3Data && (
          <div>
            <div style={{ marginBottom: 16 }}>
              <Text strong>组件名称：</Text>
              <Tag color="blue">{selectedL3Data.name}</Tag>
              <Tag>{selectedL3Data.code}</Tag>
            </div>

            <div style={{ marginBottom: 16 }}>
              <Text strong>描述：</Text>
              <div>{selectedL3Data.description}</div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <Text strong>L2 组合（执行顺序）：</Text>
              <div style={{ marginTop: 8 }}>
                {selectedL3Data.l2Combination.map((l2, idx) => (
                  <div key={l2} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <Tag color="blue">{l2}</Tag>
                    {idx < selectedL3Data.l2Combination.length - 1 && (
                      <span style={{ color: '#999' }}>→</span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <Text strong>整体 Input：</Text>
              <Space wrap size={4} style={{ marginTop: 8 }}>
                {selectedL3Data.input.map((f: string) => (
                  <Tag key={f}>{f}</Tag>
                ))}
              </Space>
            </div>

            <div style={{ marginBottom: 16 }}>
              <Text strong>整体 Output：</Text>
              <Space wrap size={4} style={{ marginTop: 8 }}>
                {selectedL3Data.output.map((f: string) => (
                  <Tag key={f}>{f}</Tag>
                ))}
              </Space>
            </div>

            <div>
              <Text strong>状态关联配置：</Text>
              <div style={{ marginTop: 8 }}>
                {selectedL3Data.states.map((s: any, idx: number) => (
                  <Card key={idx} size="small" style={{ marginBottom: 8 }}>
                    <div><Tag color="blue">{s.stateValue}</Tag> - {s.stateSource}</div>
                    {s.triggerCondition && (
                      <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>
                        触发条件: {s.triggerCondition}
                      </div>
                    )}
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

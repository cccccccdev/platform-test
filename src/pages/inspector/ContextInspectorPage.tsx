import { useState } from 'react';
import { Card, Table, Tag, Button, Space, Timeline, Collapse, Modal, Descriptions } from 'antd';
import { EyeOutlined } from '@ant-design/icons';
import { useTestStore } from '../../store';
import type { Trace, TraceNode } from '../../domain/testing/types';

// Mock trace data
const MOCK_TRACES: Trace[] = [
  {
    id: 'TR001',
    flowId: 'F_123',
    env: 'Daily',
    status: 'SUCCESS',
    startTime: '2024-03-25 10:00:00',
    endTime: '2024-03-25 10:00:01.234',
    nodes: [
      { nodeId: 'N1', nodeType: 'GenerateData', status: 'SUCCESS', startTime: '10:00:00.000', endTime: '10:00:00.050', output: { rrn: 'RRN123' } },
      { nodeId: 'N2', nodeType: 'HttpRequest', status: 'SUCCESS', startTime: '10:00:00.050', endTime: '10:00:00.800', output: { status: 'SUCCESS' } },
      { nodeId: 'N3', nodeType: 'StateTransition', status: 'SUCCESS', startTime: '10:00:00.800', endTime: '10:00:00.900', output: { state: 'SUCCESS' } },
      { nodeId: 'N4', nodeType: 'MqSend', status: 'SUCCESS', startTime: '10:00:00.900', endTime: '10:00:01.234' },
    ],
    contextSnapshots: [],
  },
  {
    id: 'TR002',
    flowId: 'F_456',
    env: 'Pre',
    status: 'FAIL',
    startTime: '2024-03-25 11:30:00',
    endTime: '2024-03-25 11:30:02.500',
    nodes: [
      { nodeId: 'N1', nodeType: 'GenerateData', status: 'SUCCESS', startTime: '11:30:00.000', endTime: '11:30:00.030' },
      { nodeId: 'N2', nodeType: 'HttpRequest', status: 'FAIL', startTime: '11:30:00.030', endTime: '11:30:02.500', error: 'Connection Timeout' },
    ],
    contextSnapshots: [],
  },
];

export default function ContextInspectorPage() {
  const { traces } = useTestStore();
  const [selectedTrace, setSelectedTrace] = useState<Trace | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const displayTraces = traces.length > 0 ? traces : MOCK_TRACES;

  const handleViewTrace = (trace: Trace) => {
    setSelectedTrace(trace);
    setIsModalOpen(true);
  };

  const columns = [
    { title: 'Trace ID', dataIndex: 'id', key: 'id' },
    { title: 'Flow ID', dataIndex: 'flowId', key: 'flowId' },
    { title: '环境', dataIndex: 'env', key: 'env', render: (env: string) => <Tag>{env}</Tag> },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={status === 'SUCCESS' ? 'success' : status === 'FAIL' ? 'error' : 'warning'}>
          {status}
        </Tag>
      ),
    },
    { title: '开始时间', dataIndex: 'startTime', key: 'startTime' },
    { title: '耗时', key: 'duration', render: (_: any, record: Trace) => {
      if (record.endTime && record.startTime) {
        const start = new Date(record.startTime).getTime();
        const end = new Date(record.endTime).getTime();
        return `${(end - start)}ms`;
      }
      return '-';
    }},
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: Trace) => (
        <Button type="link" icon={<EyeOutlined />} onClick={() => handleViewTrace(record)}>
          查看详情
        </Button>
      ),
    },
  ];

  const getNodeColor = (status: string) => {
    switch (status) {
      case 'SUCCESS': return 'green';
      case 'FAIL': return 'red';
      case 'SKIP': return 'gray';
      default: return 'blue';
    }
  };

  return (
    <div>
      <Card title="上下文调试观测" style={{ marginBottom: 16 }}>
        <Space>
          <span>通过Trace追踪一笔交易的Context在各个环节的完整流转快照</span>
        </Space>
      </Card>

      <Card>
        <Table dataSource={displayTraces} columns={columns} rowKey="id" pagination={{ pageSize: 10 }} />
      </Card>

      <Modal
        title={`Trace详情: ${selectedTrace?.id}`}
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        width={900}
        footer={[
          <Button key="close" onClick={() => setIsModalOpen(false)}>
            关闭
          </Button>,
        ]}
      >
        {selectedTrace && (
          <div>
            <Descriptions bordered size="small" style={{ marginBottom: 16 }}>
              <Descriptions.Item label="Trace ID">{selectedTrace.id}</Descriptions.Item>
              <Descriptions.Item label="Flow ID">{selectedTrace.flowId}</Descriptions.Item>
              <Descriptions.Item label="环境">
                <Tag>{selectedTrace.env}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="状态">
                <Tag color={selectedTrace.status === 'SUCCESS' ? 'success' : 'error'}>
                  {selectedTrace.status}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="开始时间">{selectedTrace.startTime}</Descriptions.Item>
              <Descriptions.Item label="结束时间">{selectedTrace.endTime || '-'}</Descriptions.Item>
            </Descriptions>

            <Card title="执行路径">
              <Timeline
                items={selectedTrace.nodes.map((node: TraceNode) => ({
                  color: getNodeColor(node.status),
                  children: (
                    <div>
                      <Space>
                        <Tag>{node.nodeType}</Tag>
                        <span style={{ fontWeight: 500 }}>{node.nodeId}</span>
                        <Tag color={node.status === 'SUCCESS' ? 'success' : 'error'}>{node.status}</Tag>
                      </Space>
                      {node.error && (
                        <div style={{ color: 'red', marginTop: 4 }}>错误: {node.error}</div>
                      )}
                      {node.output && (
                        <div style={{ marginTop: 4, fontSize: 12, color: '#666' }}>
                          输出: {JSON.stringify(node.output)}
                        </div>
                      )}
                    </div>
                  ),
                }))}
              />
            </Card>

            <Card title="Context快照" style={{ marginTop: 16 }}>
              <Collapse
                items={[
                  {
                    key: 'context',
                    label: '查看完整Context',
                    children: (
                      <pre style={{ fontSize: 11, background: '#f5f5f5', padding: 8, borderRadius: 4 }}>
{`{
  credential: { apiKey: "***", secret: "***" },
  spi: {
    request: { orderId: "ORD123", amount: 10000 },
    response: { status: "SUCCESS", message: "Success" }
  },
  orderVar: { status: "SUCCESS", updatedAt: "..." },
  globalVar: { channelId: "MOMO" },
  generateData: { rrn: "RRN123", timestamp: "..." }
}`}
                      </pre>
                    ),
                  },
                ]}
              />
            </Card>
          </div>
        )}
      </Modal>
    </div>
  );
}

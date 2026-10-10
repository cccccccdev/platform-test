import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Button, Space, Tag, Table, Timeline, Modal, Select } from 'antd';
import { ArrowLeftOutlined, ClockCircleOutlined, CheckCircleOutlined, CloseCircleOutlined, SyncOutlined } from '@ant-design/icons';
import { useScenarioStore } from '../../store';

const LOG_TYPES = [
  { value: 'EDIT', label: '编辑', color: 'blue' },
  { value: 'SUBMIT', label: '提交', color: 'green' },
  { value: 'DEPLOY', label: '部署', color: 'orange' },
  { value: 'ROLLBACK', label: '回滚', color: 'red' },
];

const MOCK_LOGS = [
  { id: 1, versionNo: 3, type: 'DEPLOY', status: 'SUCCESS', env: 'PROD', operator: 'admin', time: '2026-04-15 10:30:00', detail: '部署成功，实例: payment-app-01' },
  { id: 2, versionNo: 3, type: 'SUBMIT', status: 'SUCCESS', env: 'PROD', operator: 'admin', time: '2026-04-15 10:25:00', detail: '提交生产环境发布申请' },
  { id: 3, versionNo: 3, type: 'EDIT', status: 'SUCCESS', env: '-', operator: 'admin', time: '2026-04-15 09:00:00', detail: '修改L3组件配置: L3.PAYMENT_SELECTOR' },
  { id: 4, versionNo: 2, type: 'DEPLOY', status: 'SUCCESS', env: 'PRE', operator: 'admin', time: '2026-04-14 16:00:00', detail: '预发部署成功' },
  { id: 5, versionNo: 2, type: 'ROLLBACK', status: 'SUCCESS', env: 'PROD', operator: 'admin', time: '2026-04-14 15:00:00', detail: '回滚到 v1，原因: 线上验证失败' },
  { id: 6, versionNo: 1, type: 'DEPLOY', status: 'SUCCESS', env: 'PROD', operator: 'admin', time: '2026-04-13 12:00:00', detail: '首次生产部署' },
  { id: 7, versionNo: 1, type: 'SUBMIT', status: 'SUCCESS', env: 'PROD', operator: 'admin', time: '2026-04-13 11:00:00', detail: '提交生产环境发布' },
  { id: 8, versionNo: 1, type: 'EDIT', status: 'SUCCESS', env: '-', operator: 'admin', time: '2026-04-13 09:00:00', detail: '创建场景，配置L3组件' },
];

export default function ScenarioLogPage() {
  const { channelId, scenarioId } = useParams<{ channelId: string; scenarioId: string }>();
  const navigate = useNavigate();
  const { scenarios } = useScenarioStore();

  const scenario = scenarios.find(s => s.scenarioId === scenarioId);

  const [logTypeFilter, setLogTypeFilter] = useState<string | null>(null);
  const [selectedLog, setSelectedLog] = useState<typeof MOCK_LOGS[0] | null>(null);

  const filteredLogs = logTypeFilter
    ? MOCK_LOGS.filter(log => log.type === logTypeFilter)
    : MOCK_LOGS;

  const getLogIcon = (type: string, status: string) => {
    if (status === 'FAIL') return <CloseCircleOutlined style={{ color: '#ff4d4f' }} />;
    switch (type) {
      case 'EDIT': return <SyncOutlined style={{ color: '#1890ff' }} />;
      case 'SUBMIT': return <CheckCircleOutlined style={{ color: '#52c41a' }} />;
      case 'DEPLOY': return <CheckCircleOutlined style={{ color: '#fa8c16' }} />;
      case 'ROLLBACK': return <CloseCircleOutlined style={{ color: '#ff4d4f' }} />;
      default: return <ClockCircleOutlined />;
    }
  };

  const columns = [
    {
      title: '版本',
      dataIndex: 'versionNo',
      key: 'versionNo',
      render: (no: number) => <Tag color="blue">v{no}</Tag>,
    },
    {
      title: '操作类型',
      dataIndex: 'type',
      key: 'type',
      render: (type: string) => {
        const logType = LOG_TYPES.find(t => t.value === type);
        return <Tag color={logType?.color}>{logType?.label || type}</Tag>;
      },
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={status === 'SUCCESS' ? 'green' : 'red'}>{status}</Tag>
      ),
    },
    {
      title: '环境',
      dataIndex: 'env',
      key: 'env',
      render: (env: string) => env !== '-' ? <Tag color="blue">{env}</Tag> : '-',
    },
    {
      title: '操作人',
      dataIndex: 'operator',
      key: 'operator',
    },
    {
      title: '时间',
      dataIndex: 'time',
      key: 'time',
    },
    {
      title: '详情',
      dataIndex: 'detail',
      key: 'detail',
      ellipsis: true,
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: typeof MOCK_LOGS[0]) => (
        <Button type="link" size="small" onClick={() => setSelectedLog(record)}>
          查看详情
        </Button>
      ),
    },
  ];

  if (!scenario) {
    return (
      <Card>
        <div style={{ textAlign: 'center' }}>
          <p>未找到场景: {scenarioId}</p>
          <Button onClick={() => navigate(`/channel/${channelId}`)}>返回</Button>
        </div>
      </Card>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      {/* Header */}
      <Card size="small" styles={{ body: { padding: '8px 16px' } }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Space size="middle">
            <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(`/channel/${channelId}`)} size="small" />
            <span style={{ fontWeight: 600, fontSize: 14 }}>{scenario.name}</span>
            <Tag color="blue">{scenario.scenarioId}</Tag>
          </Space>
          <Space size="middle">
            <Select
              placeholder="筛选操作类型"
              allowClear
              style={{ width: 150 }}
              onChange={(val) => setLogTypeFilter(val)}
            >
              {LOG_TYPES.map(t => (
                <Select.Option key={t.value} value={t.value}>{t.label}</Select.Option>
              ))}
            </Select>
          </Space>
        </div>
      </Card>

      {/* Main Content */}
      <div style={{ flex: 1, overflow: 'auto', padding: 16 }}>
        {/* Timeline View */}
        <Card title="操作时间线" style={{ marginBottom: 16 }}>
          <Timeline
            items={filteredLogs.slice(0, 6).map(log => ({
              color: log.status === 'SUCCESS' ? 'green' : 'red',
              dot: getLogIcon(log.type, log.status),
              children: (
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <Tag color={LOG_TYPES.find(t => t.value === log.type)?.color}>
                    {LOG_TYPES.find(t => t.value === log.type)?.label}
                  </Tag>
                  <span style={{ fontSize: 13 }}>{log.detail}</span>
                  <span style={{ fontSize: 12, color: '#999' }}>{log.time}</span>
                </div>
              ),
            }))}
          />
        </Card>

        {/* Log Table */}
        <Card title="操作日志">
          <Table
            dataSource={filteredLogs}
            rowKey="id"
            pagination={{ pageSize: 10 }}
            columns={columns}
          />
        </Card>
      </div>

      {/* Log Detail Modal */}
      <Modal
        title="日志详情"
        open={!!selectedLog}
        onCancel={() => setSelectedLog(null)}
        footer={[
          <Button key="close" onClick={() => setSelectedLog(null)}>关闭</Button>,
        ]}
        width={600}
      >
        {selectedLog && (
          <div style={{ marginTop: 16 }}>
            <Space direction="vertical" style={{ width: '100%' }} size="large">
              <div style={{ display: 'flex', gap: 24 }}>
                <div>
                  <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>版本</div>
                  <Tag color="blue">v{selectedLog.versionNo}</Tag>
                </div>
                <div>
                  <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>操作类型</div>
                  <Tag color={LOG_TYPES.find(t => t.value === selectedLog.type)?.color}>
                    {LOG_TYPES.find(t => t.value === selectedLog.type)?.label}
                  </Tag>
                </div>
                <div>
                  <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>状态</div>
                  <Tag color={selectedLog.status === 'SUCCESS' ? 'green' : 'red'}>
                    {selectedLog.status}
                  </Tag>
                </div>
                <div>
                  <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>环境</div>
                  {selectedLog.env !== '-' ? <Tag color="blue">{selectedLog.env}</Tag> : '-'}
                </div>
              </div>

              <div>
                <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>操作人</div>
                <div>{selectedLog.operator}</div>
              </div>

              <div>
                <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>时间</div>
                <div>{selectedLog.time}</div>
              </div>

              <div>
                <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>详情</div>
                <div style={{
                  background: '#f5f5f5',
                  padding: 12,
                  borderRadius: 4,
                  fontFamily: 'monospace',
                  fontSize: 13,
                }}>
                  {selectedLog.detail}
                </div>
              </div>
            </Space>
          </div>
        )}
      </Modal>
    </div>
  );
}

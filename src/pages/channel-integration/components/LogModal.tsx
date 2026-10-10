import { useState } from 'react';
import { Modal, Select, Tag, Space, Table } from 'antd';
import { HistoryOutlined } from '@ant-design/icons';

interface LogModalProps {
  visible: boolean;
  scenarioName: string;
  onClose: () => void;
}

// 模拟日志数据
const generateMockLogs = (_scenarioId: string, versionNo?: number) => {
  const logs = [
    {
      id: 'LOG_001',
      operator: 'admin',
      action: '场景编辑',
      version: 3,
      timestamp: '2026-04-16 10:30:25',
      snapshot: 'HTTP Request L3-01 配置完成',
    },
    {
      id: 'LOG_002',
      operator: 'admin',
      action: '提交发布',
      version: 3,
      timestamp: '2026-04-16 10:35:18',
      snapshot: '提交至 Daily 环境',
    },
    {
      id: 'LOG_003',
      operator: 'admin',
      action: '发布成功',
      version: 3,
      timestamp: '2026-04-16 10:35:45',
      snapshot: 'Daily 环境部署完成',
    },
    {
      id: 'LOG_004',
      operator: 'dev_user',
      action: '场景编辑',
      version: 2,
      timestamp: '2026-04-15 14:20:10',
      snapshot: '新增 Field Mapping L3-03',
    },
    {
      id: 'LOG_005',
      operator: 'dev_user',
      action: '提交发布',
      version: 2,
      timestamp: '2026-04-15 14:25:00',
      snapshot: '提交至 Pre 环境',
    },
    {
      id: 'LOG_006',
      operator: 'system',
      action: '版本发布',
      version: 1,
      timestamp: '2026-04-10 09:00:00',
      snapshot: '初始版本发布至 Prod',
    },
  ];

  if (versionNo) {
    return logs.filter(log => log.version === versionNo);
  }
  return logs.filter(log => log.id.startsWith('LOG_00'));
};

export default function LogModal({
  visible,
  scenarioName,
  onClose,
}: LogModalProps) {
  const [selectedVersion, setSelectedVersion] = useState<number | undefined>();
  const logs = generateMockLogs('default', selectedVersion);

  const actionColorMap: Record<string, string> = {
    '场景编辑': 'blue',
    '提交发布': 'green',
    '发布成功': 'success',
    '版本发布': 'purple',
    '发布失败': 'error',
  };

  const columns = [
    {
      title: '操作人',
      dataIndex: 'operator',
      key: 'operator',
      width: 100,
    },
    {
      title: '操作',
      dataIndex: 'action',
      key: 'action',
      width: 100,
      render: (action: string) => (
        <Tag color={actionColorMap[action] || 'default'}>{action}</Tag>
      ),
    },
    {
      title: '版本',
      dataIndex: 'version',
      key: 'version',
      width: 80,
      render: (v: number) => <Tag>V{v}</Tag>,
    },
    {
      title: '时间',
      dataIndex: 'timestamp',
      key: 'timestamp',
      width: 160,
    },
    {
      title: '快照',
      dataIndex: 'snapshot',
      key: 'snapshot',
    },
  ];

  return (
    <Modal
      title={
        <Space>
          <HistoryOutlined />
          <span>操作日志</span>
          <Tag color="blue">{scenarioName}</Tag>
        </Space>
      }
      open={visible}
      onCancel={onClose}
      footer={null}
      width={900}
    >
      {/* 筛选 */}
      <div style={{ marginBottom: 16, display: 'flex', gap: 12 }}>
        <Space>
          <span style={{ fontWeight: 500 }}>版本:</span>
          <Select
            allowClear
            placeholder="全部版本"
            style={{ width: 120 }}
            onChange={(val) => setSelectedVersion(val)}
          >
            <Select.Option value={3}>V3</Select.Option>
            <Select.Option value={2}>V2</Select.Option>
            <Select.Option value={1}>V1</Select.Option>
          </Select>
        </Space>
      </div>

      {/* 日志表格 */}
      <Table
        columns={columns}
        dataSource={logs}
        pagination={{ pageSize: 10 }}
        size="small"
        rowKey="id"
      />
    </Modal>
  );
}

import { Modal, Table, Alert, Tag, Button, Popconfirm, message, Badge } from 'antd';
import { mockVersionHistory } from '../../mock/data';

interface ControlModalProps {
  open: boolean;
  ability: string;
  cloud: string;
  env: string;
  onCancel: () => void;
}

interface VersionRecord {
  version: string;
  time: string;
  status: 'running' | 'stopped';
}

export default function ControlModal({ open, ability, cloud, env, onCancel }: ControlModalProps) {
  const columns = [
    {
      title: '版本',
      dataIndex: 'version',
      render: (v: string) => (
        <>
          <span style={{ fontWeight: 600 }}>{v}</span>
          {v === 'v1.2.0' && <Tag color="blue" style={{ marginLeft: 8 }}>当前</Tag>}
        </>
      ),
    },
    { title: '提交时间', dataIndex: 'time' },
    {
      title: '状态',
      dataIndex: 'status',
      render: (v: 'running' | 'stopped') =>
        v === 'running' ? <Badge status="success" text="运行中" /> : <Badge status="default" text="已停用" />,
    },
    {
      title: '操作',
      render: (_: any, record: VersionRecord) =>
        record.version === 'v1.2.0' ? (
          <Button size="small" disabled>
            回滚到此版本
          </Button>
        ) : (
          <Popconfirm
            title="确认切换到此版本？"
            onConfirm={() => message.success(`已切换到 ${record.version}`)}
          >
            <Button size="small" type="link">
              切换到此版本
            </Button>
          </Popconfirm>
        ),
    },
  ];

  return (
    <Modal
      title={`版本管控 · ${ability} · ${cloud} · ${env}`}
      open={open}
      onCancel={onCancel}
      footer={null}
      width={700}
    >
      <Alert message={`当前运行版本：v1.2.0`} type="info" style={{ marginBottom: 16 }} />
      <Table
        dataSource={mockVersionHistory}
        columns={columns}
        pagination={false}
        size="small"
        rowKey="version"
      />
    </Modal>
  );
}
import { Modal, Table, Badge } from 'antd';
import type { ColumnsType } from 'antd/es/table';

interface StatusModalProps {
  open: boolean;
  bt: string;
  ability: string;
  onCancel: () => void;
}

interface StatusRecord {
  cloud: string;
  app: string;
  env: string;
  version: string;
  status: string;
}

const statusData: StatusRecord[] = [
  { cloud: 'AWS', app: 'payment-core', env: '生产', version: 'v1.2.0', status: '运行中' },
  { cloud: 'AWS', app: 'payment-gateway', env: '生产', version: 'v1.2.0', status: '运行中' },
  { cloud: 'GCP', app: 'payment-core', env: 'PRE', version: 'v1.2.0', status: '运行中' },
  { cloud: 'GCP', app: 'payment-core', env: '测试', version: 'v1.1.0', status: '运行中' },
];

export default function StatusModal({ open, bt, ability, onCancel }: StatusModalProps) {
  const columns: ColumnsType<StatusRecord> = [
    { title: '云', dataIndex: 'cloud' },
    { title: '应用', dataIndex: 'app' },
    { title: '环境', dataIndex: 'env' },
    { title: '版本', dataIndex: 'version' },
    {
      title: '状态',
      dataIndex: 'status',
      render: (v: string) => <Badge status="success" text={v} />,
    },
  ];

  return (
    <Modal
      title={`发布状态 · ${bt} · ${ability}`}
      open={open}
      onCancel={onCancel}
      footer={null}
      width={700}
    >
      <Table
        dataSource={statusData}
        columns={columns}
        pagination={false}
        size="small"
        rowKey={(record) => `${record.cloud}-${record.app}-${record.env}`}
      />
    </Modal>
  );
}
import { useMemo } from 'react';
import { Empty, Modal, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useAnnouncementStore } from './announcementStore';
import { actionLabel } from './types';
import type { AnnouncementLogEntry } from './types';

const ACTION_COLOR: Record<AnnouncementLogEntry['action'], string> = {
  CREATED: 'default',
  UPDATED: 'blue',
  PUBLISHED: 'green',
  OFFLINED: 'orange',
};

type Props = { announcementId: string | null; onClose: () => void };

/** 公告操作日志弹窗：按公告过滤，仅展示动作、操作人、操作时间 */
export default function AnnouncementLogModal({ announcementId, onClose }: Props) {
  const logs = useAnnouncementStore((state) => state.logs);

  const rows = useMemo(
    () => logs.filter((entry) => entry.announcementId === announcementId),
    [logs, announcementId],
  );

  const columns: ColumnsType<AnnouncementLogEntry> = [
    {
      title: 'Action',
      dataIndex: 'action',
      key: 'action',
      width: 180,
      render: (action: AnnouncementLogEntry['action']) => <Tag color={ACTION_COLOR[action]} bordered={false}>{actionLabel(action)}</Tag>,
    },
    { title: 'Operator', dataIndex: 'operator', key: 'operator', width: 200 },
    { title: 'Operated time', dataIndex: 'operatedTime', key: 'operatedTime', width: 220 },
  ];

  return (
    <Modal className="announcement-log-modal" open={Boolean(announcementId)} width={720} title="Operation log" footer={null} onCancel={onClose} destroyOnHidden>
      {rows.length === 0 ? (
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No operation recorded" />
      ) : (
        <Table<AnnouncementLogEntry>
          className="announcement-table"
          rowKey="id"
          size="small"
          columns={columns}
          dataSource={rows}
          pagination={false}
        />
      )}
    </Modal>
  );
}
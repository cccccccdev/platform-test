import { useMemo } from 'react';
import { Empty, Modal, Tag } from 'antd';
import { MarkdownContent } from './MarkdownEditor';
import { useAnnouncementStore } from './announcementStore';
import { formatDate } from './types';
import type { IterationAnnouncement } from './types';

type Props = {
  announcementId: string | null;
  /** 可选传入列表以限定查找范围；未传时回退到全量 store */
  announcements?: IterationAnnouncement[];
  onClose: () => void;
};

/**
 * 迭代公告详情弹窗：以浮层形式展示在当前页面之上，不做整页跳转。
 * 受控组件，由调用方传入 announcementId，便于在任意页面复用。
 */
export default function IterationAnnouncementViewModal({ announcementId, announcements, onClose }: Props) {
  const storeAnnouncements = useAnnouncementStore((state) => state.iterationAnnouncements);

  const announcement = useMemo(
    () => (announcements ?? storeAnnouncements).find((item) => item.id === announcementId),
    [announcements, storeAnnouncements, announcementId],
  );

  return (
    <Modal
      className="iteration-view-modal"
      open={Boolean(announcementId)}
      width={760}
      title="Iteration announcement"
      footer={null}
      onCancel={onClose}
      destroyOnHidden
      maskClosable
    >
      {!announcement ? (
        <Empty description="Announcement not found" />
      ) : (
        <article className="iteration-view">
          <header className="iteration-view-head">
            <h3>{announcement.title}</h3>
            <div className="iteration-view-meta">
              <Tag bordered={false}>{announcement.version}</Tag>
              <span>{announcement.publisher}</span>
              <span>{formatDate(announcement.publishTime)}</span>
            </div>
          </header>
          <MarkdownContent source={announcement.content} className="iteration-view-body" />
        </article>
      )}
    </Modal>
  );
}
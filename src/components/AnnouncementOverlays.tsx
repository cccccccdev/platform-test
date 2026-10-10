import { useEffect, useMemo, useState } from 'react';
import { Badge, Button, Empty, Modal, Popover, Tag } from 'antd';
import { BellOutlined, CloseOutlined, NotificationOutlined, RocketOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAnnouncementStore } from '../pages/announcement/announcementStore';
import { MarkdownContent } from '../pages/announcement/MarkdownEditor';
import { isSystemAnnouncementActive } from '../pages/announcement/types';
import type { IterationAnnouncement } from '../pages/announcement/types';

const READ_KEY = 'announcementIterationReadIds';
const ROTATE_INTERVAL_MS = 5000;

function readReadIds(): string[] {
  try {
    const raw = window.localStorage.getItem(READ_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : [];
  } catch {
    return [];
  }
}

function writeReadIds(ids: string[]) {
  window.localStorage.setItem(READ_KEY, JSON.stringify(ids));
}

/**
 * 全站公告覆盖层：header 滚动条（系统公告多条轮播）+ 迭代公告一次性弹窗 + 浮动控件。
 * 挂在各布局 Header 内，使所有页面可见。
 */
export function AnnouncementChrome() {
  const navigate = useNavigate();
  const systemAnnouncements = useAnnouncementStore((state) => state.systemAnnouncements);
  const iterationAnnouncements = useAnnouncementStore((state) => state.iterationAnnouncements);

  const activeSystems = useMemo(
    () => systemAnnouncements.filter((item) => isSystemAnnouncementActive(item)),
    [systemAnnouncements],
  );
  const publishedIterations = useMemo(
    () => iterationAnnouncements.filter((item) => item.status === 'PUBLISHED'),
    [iterationAnnouncements],
  );

  const [readIds, setReadIds] = useState<string[]>(() => readReadIds());
  const [popupAnnouncement, setPopupAnnouncement] = useState<IterationAnnouncement | null>(null);
  const [floatOpen, setFloatOpen] = useState(false);
  const [rotateIndex, setRotateIndex] = useState(0);

  const unreadIterations = publishedIterations.filter((item) => !readIds.includes(item.id));

  useEffect(() => {
    if (popupAnnouncement || unreadIterations.length === 0) return;
    const timer = window.setTimeout(() => setPopupAnnouncement(unreadIterations[0]), 600);
    return () => window.clearTimeout(timer);
  }, [popupAnnouncement, unreadIterations]);

  const total = activeSystems.length;
  const boundedIndex = total === 0 ? 0 : rotateIndex % total;
  const currentAnnouncement = total === 0 ? undefined : activeSystems[boundedIndex];

  useEffect(() => {
    if (total <= 1) return;
    const timer = window.setInterval(() => setRotateIndex((current) => (current + 1) % total), ROTATE_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [total]);

  useEffect(() => {
    if (boundedIndex >= total) setRotateIndex(0);
  }, [boundedIndex, total]);

  const markRead = (id: string) => {
    setReadIds((current) => {
      if (current.includes(id)) return current;
      const next = [...current, id];
      writeReadIds(next);
      return next;
    });
  };

  const openDetail = (kind: 'system' | 'iteration', id: string) => {
    navigate(`/announcement/detail/${kind}/${id}`);
  };

  const floatContent = (
    <div className="announcement-float-panel">
      <div className="announcement-float-panel-head">
        <strong>Iteration announcements</strong>
        <span>{unreadIterations.length > 0 ? `${unreadIterations.length} unread` : 'All read'}</span>
      </div>
      {publishedIterations.length === 0 ? (
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No iteration announcement" />
      ) : (
        <ul className="announcement-float-list">
          {publishedIterations.map((item) => {
            const unread = !readIds.includes(item.id);
            return (
              <li key={item.id}>
                <button
                  type="button"
                  className={unread ? 'announcement-float-item announcement-float-item-unread' : 'announcement-float-item'}
                  onClick={() => {
                    markRead(item.id);
                    openDetail('iteration', item.id);
                    setFloatOpen(false);
                  }}
                >
                  <span className="announcement-float-item-title">{item.title}</span>
                  <span className="announcement-float-item-meta">
                    <Tag color="purple" bordered={false}>{item.version}</Tag>
                    {item.publishTime.slice(0, 10)}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
      <Button type="link" size="small" onClick={() => { setFloatOpen(false); navigate('/announcement/iteration'); }}>
        View all iteration announcements
      </Button>
    </div>
  );

  return (
    <>
      <div className="announcement-header-bar">
        {currentAnnouncement ? (
          <>
            <NotificationOutlined className="announcement-header-bar-icon" />
            <button
              type="button"
              key={currentAnnouncement.id}
              className="announcement-header-bar-text announcement-header-bar-slide"
              onClick={() => openDetail('system', currentAnnouncement.id)}
              title={currentAnnouncement.title}
            >
              {currentAnnouncement.title}
            </button>
          </>
        ) : (
          <span className="announcement-header-bar-empty">No active system announcement</span>
        )}
      </div>

      <Popover
        open={floatOpen}
        onOpenChange={setFloatOpen}
        trigger="click"
        placement="bottomRight"
        arrow={false}
        rootClassName="announcement-float-popover"
        content={floatContent}
      >
        <Badge count={unreadIterations.length} size="small" offset={[-2, 4]}>
          <button type="button" className="announcement-float-button" aria-label="Open iteration announcements">
            <BellOutlined />
          </button>
        </Badge>
      </Popover>

      <Modal
        className="iteration-popup-modal"
        open={Boolean(popupAnnouncement)}
        width={680}
        title={
          <span className="iteration-popup-title">
            <RocketOutlined /> New iteration announcement
          </span>
        }
        okText="Got it"
        cancelButtonProps={{ style: { display: 'none' } }}
        onOk={() => {
          if (popupAnnouncement) markRead(popupAnnouncement.id);
          setPopupAnnouncement(null);
        }}
        onCancel={() => {
          if (popupAnnouncement) markRead(popupAnnouncement.id);
          setPopupAnnouncement(null);
        }}
        closeIcon={<CloseOutlined />}
        destroyOnHidden
      >
        {popupAnnouncement && (
          <div className="iteration-popup-body">
            <div className="iteration-popup-meta">
              <Tag color="purple" bordered={false}>{popupAnnouncement.version}</Tag>
              <span>{popupAnnouncement.publisher}</span>
              <span>{popupAnnouncement.publishTime}</span>
            </div>
            <h3>{popupAnnouncement.title}</h3>
            <MarkdownContent source={popupAnnouncement.content} className="iteration-popup-markdown" />
            <Button
              type="link"
              onClick={() => {
                markRead(popupAnnouncement.id);
                setPopupAnnouncement(null);
                openDetail('iteration', popupAnnouncement.id);
              }}
            >
              View full announcement
            </Button>
          </div>
        )}
      </Modal>
    </>
  );
}
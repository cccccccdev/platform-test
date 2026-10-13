import { useEffect, useMemo, useRef, useState } from 'react';
import { Badge, Button, Empty, Modal, Popover, Tag } from 'antd';
import { BellOutlined, CloseOutlined, NotificationOutlined, RocketOutlined } from '@ant-design/icons';
import { useAnnouncementStore } from '../pages/announcement/announcementStore';
import IterationAnnouncementViewModal from '../pages/announcement/IterationAnnouncementViewModal';
import IterationReleaseViewModal from '../pages/announcement/IterationReleaseViewModal';
import { MarkdownContent } from '../pages/announcement/MarkdownEditor';
import { isExpired } from '../pages/announcement/types';
import type { IterationAnnouncement } from '../pages/announcement/types';

const READ_KEY = 'announcementIterationReadIds';
const ROTATE_INTERVAL_MS = 5000;
/** 浮动控件浮层内最多展示的迭代公告条数 */
const FLOAT_PREVIEW_LIMIT = 3;

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
 * 全站公告覆盖层：header 滚动条（系统公告轮播）+ 迭代公告浮动控件 + 一次性弹窗。
 * 已下线公告不参与滚动，也不计入未读。
 */
export function AnnouncementChrome() {
  const systemAnnouncements = useAnnouncementStore((state) => state.systemAnnouncements);
  const iterationAnnouncements = useAnnouncementStore((state) => state.iterationAnnouncements);

  const viewportRef = useRef<HTMLDivElement | null>(null);
  const textRef = useRef<HTMLSpanElement | null>(null);
  // 标题超出可视宽度时才启用无缝横向滚动
  const [overflowing, setOverflowing] = useState(false);

  // 仅已发布且未过期的系统公告进入滚动条
  const activeSystems = useMemo(
    () => systemAnnouncements.filter((item) => item.status === 'PUBLISHED' && !isExpired(item)),
    [systemAnnouncements],
  );
  // 仅已发布计入未读
  const publishedIterations = useMemo(
    () => iterationAnnouncements.filter((item) => item.status === 'PUBLISHED'),
    [iterationAnnouncements],
  );

  const [readIds, setReadIds] = useState<string[]>(() => readReadIds());
  const [popupAnnouncement, setPopupAnnouncement] = useState<IterationAnnouncement | null>(null);
  const [floatOpen, setFloatOpen] = useState(false);
  const [rotateIndex, setRotateIndex] = useState(0);

  const unreadIterations = publishedIterations.filter((item) => !readIds.includes(item.id));

  // 浮动控件仅展示最新 3 条迭代公告（按发布日期倒序），不全量平铺；完整列表由全量视图弹窗承载
  const latestIterations = useMemo(
    () =>
      [...publishedIterations]
        .sort((left, right) => right.publishTime.localeCompare(left.publishTime))
        .slice(0, FLOAT_PREVIEW_LIMIT),
    [publishedIterations],
  );

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

  // 测量标题是否溢出可视宽度：溢出才启用横向滚动，避免短标题无谓滚动
  useEffect(() => {
    const viewport = viewportRef.current;
    const text = textRef.current;
    if (!viewport || !text) return;

    const measure = () => {
      setOverflowing(text.scrollWidth > viewport.clientWidth + 1);
    };
    measure();

    const observer = new ResizeObserver(measure);
    observer.observe(viewport);
    observer.observe(text);
    window.addEventListener('resize', measure);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [currentAnnouncement?.id, currentAnnouncement?.title]);

  const markRead = (id: string) => {
    setReadIds((current) => {
      if (current.includes(id)) return current;
      const next = [...current, id];
      writeReadIds(next);
      return next;
    });
  };

  // 就地打开弹窗，不做整页跳转；浮层由本组件渲染在当前页面之上
  const [viewAnnouncementId, setViewAnnouncementId] = useState<string | null>(null);
  const [releaseViewOpen, setReleaseViewOpen] = useState(false);

  const openView = (announcementId: string) => {
    setFloatOpen(false);
    markRead(announcementId);
    setViewAnnouncementId(announcementId);
  };

  const openReleaseView = () => {
    setFloatOpen(false);
    setReleaseViewOpen(true);
  };

  const floatContent = (
    <div className="announcement-float-panel">
      <div className="announcement-float-panel-head">
        <strong>Latest iteration announcements</strong>
        <span>{unreadIterations.length > 0 ? `${unreadIterations.length} unread` : 'All read'}</span>
      </div>
      {publishedIterations.length === 0 ? (
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No published iteration announcement" />
      ) : (
        <ul className="announcement-float-list">
          {latestIterations.map((item) => {
            const unread = !readIds.includes(item.id);
            return (
              <li key={item.id}>
                <button
                  type="button"
                  className={unread ? 'announcement-float-item announcement-float-item-unread' : 'announcement-float-item'}
                  onClick={() => openView(item.id)}
                >
                  <span className="announcement-float-item-title">{item.title}</span>
                  <span className="announcement-float-item-meta">
                    <Tag bordered={false}>{item.version}</Tag>
                    {item.publishTime.slice(0, 10)}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
      <Button type="link" size="small" onClick={openReleaseView}>
        {publishedIterations.length > FLOAT_PREVIEW_LIMIT
          ? `View all ${publishedIterations.length} announcements`
          : 'View all announcements'}
      </Button>
    </div>
  );

  return (
    <>
      <div className="announcement-header-bar">
        {currentAnnouncement ? (
          <>
            <NotificationOutlined className="announcement-header-bar-icon" />
            <div ref={viewportRef} className="announcement-header-bar-viewport">
              <span
                ref={textRef}
                key={currentAnnouncement.id}
                className={overflowing ? 'announcement-header-bar-text announcement-header-bar-scroll' : 'announcement-header-bar-text announcement-header-bar-slide'}
                title={currentAnnouncement.title}
              >
                {currentAnnouncement.title}
              </span>
            </div>
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
              <Tag bordered={false}>{popupAnnouncement.version}</Tag>
              <span>{popupAnnouncement.publisher}</span>
              <span>{popupAnnouncement.publishTime}</span>
            </div>
            <h3>{popupAnnouncement.title}</h3>
            <MarkdownContent source={popupAnnouncement.content} className="iteration-popup-markdown" />
            <Button
              type="link"
              onClick={() => {
                const current = popupAnnouncement;
                setPopupAnnouncement(null);
                openView(current.id);
              }}
            >
              View full announcement
            </Button>
          </div>
        )}
      </Modal>

      <IterationAnnouncementViewModal
        announcementId={viewAnnouncementId}
        announcements={publishedIterations}
        onClose={() => setViewAnnouncementId(null)}
      />
      <IterationReleaseViewModal open={releaseViewOpen} onClose={() => setReleaseViewOpen(false)} />
    </>
  );
}

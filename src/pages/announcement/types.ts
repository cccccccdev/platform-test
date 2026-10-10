export type AnnouncementKind = 'system' | 'iteration';

export type AnnouncementStatus = 'DRAFT' | 'PUBLISHED';

export type SystemAnnouncement = {
  id: string;
  kind: 'system';
  title: string;
  content: string;
  publisher: string;
  publishTime: string;
  /** 内部字段：滚动持续天数。用户不在列表/详情中感知，仅编辑表单可设置 */
  durationDays: number;
  /** 由 publishTime + durationDays 推导，仅供滚动条过滤使用，不对外展示 */
  expireAt: string;
  status: AnnouncementStatus;
};

export type IterationAnnouncement = {
  id: string;
  kind: 'iteration';
  title: string;
  content: string;
  publisher: string;
  publishTime: string;
  version: string;
  status: AnnouncementStatus;
};

export type AnnouncementDraft = {
  id: string;
  kind: AnnouncementKind;
  title: string;
  content: string;
  durationDays: number;
  updateTime: string;
};

export type Announcement = SystemAnnouncement | IterationAnnouncement;

export function formatPublishDate(publishTime: string) {
  return publishTime.slice(0, 10);
}

/** 是否处于滚动期：已发布且未超期。仅内部判断，不向用户展示天数信息 */
export function isSystemAnnouncementActive(announcement: SystemAnnouncement, now: Date = new Date()) {
  return announcement.status === 'PUBLISHED' && new Date(announcement.expireAt).getTime() >= now.getTime();
}
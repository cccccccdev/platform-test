export type AnnouncementKind = 'system' | 'iteration';

/** 公告状态：待发布 → 已发布 → 已下线（单向流转，不可删除、不可回退） */
export type AnnouncementStatus = 'PENDING' | 'PUBLISHED' | 'OFFLINE';

/** 系统公告：仅标题 + 持续天数，无正文 */
export type SystemAnnouncement = {
  id: string;
  kind: 'system';
  title: string;
  publisher: string;
  /** 创建时刻 */
  createTime: string;
  /** 发布时刻，未发布时为空 */
  publishTime: string;
  /** 下线时刻，未下线时为空 */
  offlineTime: string;
  /** 滚动持续天数，仅未下线的已发布公告参与滚动条展示 */
  durationDays: number;
  /** 由 publishTime + durationDays 推导，到期自动转为已下线；未发布时为空 */
  expireAt: string;
  status: AnnouncementStatus;
};

/** 迭代公告：标题 + 版本 + Markdown 正文。版本号在发布时刻由系统生成，用户不可干预 */
export type IterationAnnouncement = {
  id: string;
  kind: 'iteration';
  title: string;
  content: string;
  /** 版本号，发布时按 v+YYYYMMDD 自动生成；未发布为空 */
  version: string;
  publisher: string;
  createTime: string;
  publishTime: string;
  offlineTime: string;
  status: AnnouncementStatus;
};

/** 标题长度上限 */
export const TITLE_MAX_LENGTH = 500;

/** 发布时生成版本号：v + 发布日期（YYYYMMDD）。同一天多条共用同一版本 */
export function generateVersion(publishDateTime: string) {
  return `v${publishDateTime.replace(/\D/g, '').slice(0, 8)}`;
}

export type Announcement = SystemAnnouncement | IterationAnnouncement;

/** 操作日志：只记录动作、操作人、操作时间 */
export type AnnouncementLogEntry = {
  id: string;
  announcementId: string;
  action: 'CREATED' | 'UPDATED' | 'PUBLISHED' | 'OFFLINED';
  operator: string;
  operatedTime: string;
};

export function actionLabel(action: AnnouncementLogEntry['action']) {
  if (action === 'CREATED') return 'Created';
  if (action === 'UPDATED') return 'Updated';
  if (action === 'PUBLISHED') return 'Published';
  return 'Taken offline';
}

/** 操作按钮的可用性由状态决定：仅待发布可编辑，已发布可下线 */
export function canEdit(status: AnnouncementStatus) {
  return status === 'PENDING';
}

export function canPublish(status: AnnouncementStatus) {
  return status === 'PENDING';
}

export function canOffline(status: AnnouncementStatus) {
  return status === 'PUBLISHED';
}

export function formatDate(value: string) {
  return value ? value.slice(0, 10) : '';
}

export function formatDateTime(value: string) {
  return value ? value.slice(0, 16) : '';
}

export function statusLabel(status: AnnouncementStatus) {
  if (status === 'PENDING') return 'Pending';
  if (status === 'PUBLISHED') return 'Published';
  return 'Offline';
}

/** 到期自动下线：已发布且已超出滚动窗口。写操作统一由 store 的 settleExpired 调用 */
export function isExpired(announcement: SystemAnnouncement, now: Date = new Date()) {
  if (announcement.status !== 'PUBLISHED' || !announcement.expireAt) return false;
  return new Date(announcement.expireAt).getTime() < now.getTime();
}

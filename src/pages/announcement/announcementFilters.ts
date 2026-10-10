import type { Announcement } from './types';
import { formatPublishDate } from './types';

export type AnnouncementQuery = {
  title: string;
  publisher?: string;
  dates: [string, string] | null;
};

export const emptyAnnouncementQuery: AnnouncementQuery = { title: '', publisher: undefined, dates: null };

/** 标题模糊查询（大小写不敏感）+ 发布人精确匹配 + 发布日期区间（含端点） */
export function matchAnnouncement(announcement: Announcement, query: AnnouncementQuery) {
  const titleKeyword = query.title.trim().toLowerCase();
  if (titleKeyword && !announcement.title.toLowerCase().includes(titleKeyword)) return false;
  if (query.publisher && announcement.publisher !== query.publisher) return false;
  if (query.dates) {
    const publishDate = formatPublishDate(announcement.publishTime);
    if (publishDate < query.dates[0] || publishDate > query.dates[1]) return false;
  }
  return true;
}

export function publisherOptionsFrom(announcements: Announcement[]) {
  return Array.from(new Set(announcements.map((item) => item.publisher)))
    .sort((left, right) => left.localeCompare(right))
    .map((publisher) => ({ value: publisher, label: publisher }));
}
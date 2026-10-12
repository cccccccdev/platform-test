import { useEffect, useMemo, useRef, useState } from 'react';
import { Modal, Tag } from 'antd';
import { MarkdownContent } from './MarkdownEditor';
import { useAnnouncementStore } from './announcementStore';
import { formatDate } from './types';
import type { IterationAnnouncement } from './types';

/**
 * 版本排序：从大到小，保证最新版本在最上方。
 * 版本号规则为 v+YYYYMMDD（见 types.generateVersion），去掉前缀 v 后按数字段逐位比较；
 * 无法解析的版本排在最后，再按字符串兜底比较。
 */
function compareVersions(left: string, right: string) {
  const parse = (value: string) => {
    const digits = value.trim().replace(/^v/i, '');
    if (!/^\d+$/.test(digits)) return null;
    return digits;
  };
  const a = parse(left);
  const b = parse(right);
  if (!a && !b) return left.localeCompare(right);
  if (!a) return 1;
  if (!b) return -1;
  // 位数不同时补零后按数值比较，避免字典序把 "9" 排在 "10" 之后
  const width = Math.max(a.length, b.length);
  const numberA = Number(a.padStart(width, '0'));
  const numberB = Number(b.padStart(width, '0'));
  return numberB - numberA;
}

type Props = { open: boolean; onClose: () => void };

/**
 * 迭代公告全量视图弹窗：
 * - 左侧列出全部版本（仅含已发布公告的版本），点击可定位
 * - 右侧按版本分组，全量平铺该版本的已发布公告
 * - 左右两侧各自独立滚动，弹窗宽度固定不随内容变化
 * - 仅查看，弹窗内不提供任何编辑或发布操作
 */
export default function IterationReleaseViewModal({ open, onClose }: Props) {
  const iterationAnnouncements = useAnnouncementStore((state) => state.iterationAnnouncements);
  const [activeVersion, setActiveVersion] = useState('');
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const published = useMemo(
    () => iterationAnnouncements.filter((item) => item.status === 'PUBLISHED'),
    [iterationAnnouncements],
  );

  const versions = useMemo(
    () => Array.from(new Set(published.map((item) => item.version))).sort(compareVersions),
    [published],
  );

  // 每次打开默认定位到最新版本
  useEffect(() => {
    if (open) setActiveVersion(versions[0] ?? '');
  }, [open, versions]);

  // 切换版本后把对应区块滚动到视口内
  useEffect(() => {
    if (!open || !activeVersion) return;
    const timer = window.setTimeout(() => {
      sectionRefs.current[activeVersion]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 80);
    return () => window.clearTimeout(timer);
  }, [open, activeVersion]);

  const renderGroup = (version: string, items: IterationAnnouncement[]) => (
    <div
      key={version}
      ref={(node) => {
        sectionRefs.current[version] = node;
      }}
      className="release-view-group"
    >
      <div className="release-view-group-head">
        <Tag color="purple" bordered={false}>{version}</Tag>
        <span>{items.length} announcement{items.length > 1 ? 's' : ''}</span>
      </div>
      {items.map((item) => (
        <article key={item.id} className="release-view-item">
          <h4>{item.title}</h4>
          <div className="release-view-item-meta">
            <span>{item.publisher}</span>
            <span>{formatDate(item.publishTime)}</span>
          </div>
          <MarkdownContent source={item.content} />
        </article>
      ))}
    </div>
  );

  return (
    <Modal
      className="release-view-modal"
      open={open}
      width={1000}
      title="All iteration announcements"
      footer={null}
      onCancel={onClose}
      destroyOnHidden
    >
      <div className="release-view">
        <nav className="release-view-nav">
          <p className="release-view-nav-title">Versions</p>
          {versions.length === 0 ? (
            <p className="release-view-nav-empty">No published announcement</p>
          ) : (
            <ul>
              {versions.map((version) => {
                const count = published.filter((item) => item.version === version).length;
                return (
                  <li key={version}>
                    <button
                      type="button"
                      className={activeVersion === version ? 'release-view-nav-item release-view-nav-item-active' : 'release-view-nav-item'}
                      onClick={() => setActiveVersion(version)}
                    >
                      <span>{version}</span>
                      <em>{count}</em>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </nav>

        <div className="release-view-content">
          {versions.length === 0 ? (
            <p className="release-view-empty">Nothing has been published yet.</p>
          ) : (
            versions.map((version) =>
              renderGroup(version, published.filter((item) => item.version === version)),
            )
          )}
        </div>
      </div>
    </Modal>
  );
}
import { useMemo } from 'react';
import { Breadcrumb, Button, Result, Tag } from 'antd';
import { useNavigate, useParams } from 'react-router-dom';
import { useAnnouncementStore } from './announcementStore';
import { MarkdownContent } from './MarkdownEditor';
import type { Announcement } from './types';

export default function AnnouncementDetailPage() {
  const navigate = useNavigate();
  const { kind = 'system', id = '' } = useParams();
  const systemAnnouncements = useAnnouncementStore((state) => state.systemAnnouncements);
  const iterationAnnouncements = useAnnouncementStore((state) => state.iterationAnnouncements);

  const announcement = useMemo<Announcement | undefined>(
    () => (kind === 'system' ? systemAnnouncements : iterationAnnouncements).find((item) => item.id === id),
    [kind, id, systemAnnouncements, iterationAnnouncements],
  );

  const listPath = kind === 'system' ? '/announcement/system' : '/announcement/iteration';
  const label = kind === 'system' ? 'System Announcement' : 'Iteration Announcement';

  if (!announcement) {
    return (
      <div className="announcement-page">
        <section className="state-machine-heading">
          <Breadcrumb items={[{ title: 'Announcement' }, { title: label, href: listPath }, { title: 'Not found' }]} />
          <div className="state-machine-title-line">{label} detail</div>
        </section>
        <div className="announcement-content">
          <div className="announcement-table-panel">
            <Result
              status="404"
              title="Announcement not found"
              subTitle="It may have been deleted by the publisher."
              extra={<Button type="primary" onClick={() => navigate(listPath)}>Back to list</Button>}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="announcement-page">
      <section className="state-machine-heading">
        <Breadcrumb items={[{ title: 'Announcement' }, { title: label, href: listPath }, { title: announcement.title }]} />
        <div className="state-machine-title-line">{label} detail</div>
      </section>

      <div className="announcement-content">
        <div className="announcement-table-panel announcement-detail-panel">
          <article className="announcement-detail">
            <header className="announcement-detail-head">
              <h2>{announcement.title}</h2>
              <div className="announcement-detail-meta">
                {announcement.kind === 'system' ? (
                  <>
                    <span className="announcement-detail-meta-item">
                      <em>Published by</em>
                      <strong>{announcement.publisher}</strong>
                    </span>
                    <span className="announcement-detail-meta-item">
                      <em>Publish date</em>
                      <strong>{announcement.publishTime}</strong>
                    </span>
                  </>
                ) : (
                  <>
                    <span className="announcement-detail-meta-item">
                      <em>Version</em>
                      <Tag color="purple" bordered={false}>{announcement.version}</Tag>
                    </span>
                    <span className="announcement-detail-meta-item">
                      <em>Published by</em>
                      <strong>{announcement.publisher}</strong>
                    </span>
                    <span className="announcement-detail-meta-item">
                      <em>Publish date</em>
                      <strong>{announcement.publishTime}</strong>
                    </span>
                  </>
                )}
              </div>
            </header>
            <MarkdownContent source={announcement.content} className="announcement-detail-body" />
          </article>
        </div>
      </div>
    </div>
  );
}

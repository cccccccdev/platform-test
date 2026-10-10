import { useMemo, useState } from 'react';
import { Breadcrumb, Button, Popconfirm, Table, Tabs, Tag, Tooltip, message } from 'antd';
import { DeleteOutlined, EditOutlined, PlusOutlined, WarningOutlined } from '@ant-design/icons';
import { useNavigate, useSearchParams } from 'react-router-dom';
import type { ColumnsType } from 'antd/es/table';
import { useAnnouncementStore } from './announcementStore';
import { formatPublishDate } from './types';
import type { Announcement, AnnouncementDraft, AnnouncementKind } from './types';

function deleteConfirmContent(kind: AnnouncementKind) {
  return kind === 'system'
    ? 'Deleting removes this system announcement for every user. Its header bar entry and history record are both removed. This cannot be undone.'
    : 'Deleting removes this iteration announcement for every user. Users who have not read it will no longer be prompted. This cannot be undone.';
}

/**
 * 发布管理页：集中承载带操作性质的能力（发布、编辑草稿、删除已发布）。
 * 用 Tab 区分系统公告与迭代公告；两个列表页保持纯只读。
 */
export default function AnnouncementManagePage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const kindParam = searchParams.get('kind');
  const [kind, setKind] = useState<AnnouncementKind>(kindParam === 'iteration' ? 'iteration' : 'system');

  const switchKind = (next: string) => {
    const nextKind = next as AnnouncementKind;
    setKind(nextKind);
    setSearchParams(nextKind === 'system' ? {} : { kind: nextKind }, { replace: true });
  };

  const systemAnnouncements = useAnnouncementStore((state) => state.systemAnnouncements);
  const iterationAnnouncements = useAnnouncementStore((state) => state.iterationAnnouncements);
  const drafts = useAnnouncementStore((state) => state.drafts);
  const deleteAnnouncement = useAnnouncementStore((state) => state.deleteAnnouncement);
  const deleteDraft = useAnnouncementStore((state) => state.deleteDraft);

  const kindDrafts = useMemo(() => drafts.filter((draft) => draft.kind === kind), [drafts, kind]);
  const published: Announcement[] = kind === 'system' ? systemAnnouncements : iterationAnnouncements;

  const columns: ColumnsType<Announcement> = [
    {
      title: 'Title',
      dataIndex: 'title',
      key: 'title',
      render: (title: string, record) => (
        <button type="button" className="announcement-title-link" onClick={() => navigate(`/announcement/detail/${record.kind}/${record.id}`)}>
          {title}
        </button>
      ),
    },
    ...(kind === 'iteration'
      ? [{
          title: 'Version',
          dataIndex: 'version',
          key: 'version',
          width: 130,
          render: (_: unknown, record: Announcement) =>
            record.kind === 'iteration' ? <Tag color="purple" bordered={false}>{record.version}</Tag> : null,
        }]
      : []),
    { title: 'Publisher', dataIndex: 'publisher', key: 'publisher', width: 170 },
    { title: 'Publish date', dataIndex: 'publishTime', key: 'publishDate', width: 140, render: (publishTime: string) => formatPublishDate(publishTime) },
    {
      title: 'Operation',
      key: 'operation',
      width: 120,
      render: (_, record) => (
        <Popconfirm
          title="Delete this announcement?"
          description={deleteConfirmContent(record.kind)}
          okText="Delete"
          cancelText="Cancel"
          okButtonProps={{ danger: true }}
          onConfirm={() => {
            deleteAnnouncement(record.kind, record.id);
            message.success('Announcement deleted');
          }}
        >
          <Button type="link" size="small" danger icon={<DeleteOutlined />}>Delete</Button>
        </Popconfirm>
      ),
    },
  ];

  const draftItems = (
    <div className="announcement-table-panel">
      <div className="announcement-card-head">
        <strong>Drafts</strong>
        <span>{kindDrafts.length > 0 ? `${kindDrafts.length} draft awaiting completion` : 'No draft'}</span>
      </div>
      {kindDrafts.length === 0 ? (
        <p className="announcement-card-empty">
          Start a new announcement and use “Save draft” to keep unfinished content. Drafts are visible only to their author.
        </p>
      ) : (
        <ul className="announcement-draft-list">
          {kindDrafts.map((draft) => (
            <DraftRow key={draft.id} draft={draft} onDelete={() => { deleteDraft(draft.id); message.success('Draft discarded'); }} />
          ))}
        </ul>
      )}
    </div>
  );

  const publishedItems = (
    <div className="announcement-table-panel">
      <div className="announcement-create">
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => navigate(kind === 'system' ? '/announcement/system/edit/new' : '/announcement/iteration/edit/new')}
        >
          {kind === 'system' ? 'Publish system announcement' : 'Publish iteration announcement'}
        </Button>
      </div>
      <Table<Announcement>
        className="announcement-table"
        rowKey="id"
        size="middle"
        columns={columns}
        dataSource={published}
        pagination={{ pageSize: 10, hideOnSinglePage: true }}
      />
    </div>
  );

  return (
    <div className="announcement-page">
      <section className="state-machine-heading">
        <Breadcrumb items={[{ title: 'Announcement' }, { title: 'Publish Management' }]} />
        <div className="state-machine-title-line">Publish Management</div>
      </section>

      <div className="announcement-content">
        <Tabs
          className="announcement-kind-tabs"
          activeKey={kind}
          onChange={switchKind}
          items={[
            { key: 'system', label: 'System Announcement' },
            { key: 'iteration', label: 'Iteration Announcement' },
          ]}
        />

        {kindDrafts.length > 0 ? (
          <>
            {draftItems}
            {publishedItems}
          </>
        ) : (
          <>
            {publishedItems}
            {draftItems}
          </>
        )}

        <section className="announcement-table-panel announcement-policy-note">
          <WarningOutlined />
          <div>
            <strong>Before you publish</strong>
            <p>
              Published announcements become read-only for every user. Check the title and content carefully — after publishing you can only delete the record, never revise it.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}

function DraftRow({ draft, onDelete }: { draft: AnnouncementDraft; onDelete: () => void }) {
  const navigate = useNavigate();
  const editPath = draft.kind === 'system' ? '/announcement/system/edit/new' : '/announcement/iteration/edit/new';

  return (
    <li>
      <div className="announcement-draft-main">
        <strong>{draft.title || 'Untitled draft'}</strong>
        <span>Saved {draft.updateTime}</span>
      </div>
      <div className="announcement-row-actions">
        <Button type="link" size="small" icon={<EditOutlined />} onClick={() => navigate(`${editPath}?draftId=${draft.id}`)}>Continue editing</Button>
        <Tooltip title="Drafts are private to their author and never appear to other users.">
          <Popconfirm title="Discard this draft?" description="The draft content is permanently lost." okText="Discard" cancelText="Cancel" okButtonProps={{ danger: true }} onConfirm={onDelete}>
            <Button type="link" size="small" danger>Discard</Button>
          </Popconfirm>
        </Tooltip>
      </div>
    </li>
  );
}
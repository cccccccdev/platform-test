import { useEffect, useState } from 'react';
import { Breadcrumb, Button, Popconfirm, Space, Table, Tabs, Tag, Tooltip, message } from 'antd';
import { CloudUploadOutlined, EditOutlined, FileTextOutlined, PlusOutlined, StopOutlined } from '@ant-design/icons';
import { useNavigate, useSearchParams } from 'react-router-dom';
import type { ColumnsType } from 'antd/es/table';
import { useAnnouncementStore } from './announcementStore';
import { canEdit, canOffline, canPublish, formatDate, statusLabel } from './types';
import type { Announcement, AnnouncementKind } from './types';
import AnnouncementLogModal from './AnnouncementLogModal';
import IterationAnnouncementViewModal from './IterationAnnouncementViewModal';

export default function AnnouncementManagePage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [kind, setKind] = useState<AnnouncementKind>(searchParams.get('kind') === 'iteration' ? 'iteration' : 'system');

  const systemAnnouncements = useAnnouncementStore((state) => state.systemAnnouncements);
  const iterationAnnouncements = useAnnouncementStore((state) => state.iterationAnnouncements);
  const publish = useAnnouncementStore((state) => state.publish);
  const offline = useAnnouncementStore((state) => state.offline);
  const settleExpired = useAnnouncementStore((state) => state.settleExpired);

  // 每次进入先结算到期公告，避免过期记录仍显示为已发布
  useEffect(() => {
    settleExpired();
  }, [settleExpired, systemAnnouncements]);

  const switchKind = (next: string) => {
    const nextKind = next as AnnouncementKind;
    setKind(nextKind);
    setSearchParams(nextKind === 'system' ? {} : { kind: nextKind }, { replace: true });
  };

  const openModalParam = (key: string, value: string) => {
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      next.set(key, value);
      return next;
    });
  };

  const viewAnnouncementId = searchParams.get('announcementId');
  const logFor = searchParams.get('logFor');

  const closeModalParam = (key: string) => {
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      next.delete(key);
      return next;
    }, { replace: true });
  };

  const rows: Announcement[] = kind === 'system' ? systemAnnouncements : iterationAnnouncements;

  const columns: ColumnsType<Announcement> = [
    {
      title: 'Title',
      dataIndex: 'title',
      key: 'title',
      render: (title: string, record) =>
        record.kind === 'iteration' ? (
          <button type="button" className="announcement-title-link" onClick={() => openModalParam('announcementId', record.id)}>
            {title}
          </button>
        ) : (
          <span className="announcement-plain-title">{title}</span>
        ),
    },
    ...(kind === 'iteration'
      ? [{
          title: 'Version',
          dataIndex: 'version',
          key: 'version',
          width: 130,
          render: (_: unknown, record: Announcement) => (record.kind === 'iteration' ? <Tag bordered={false}>{record.version}</Tag> : null),
        }]
      : []),
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 130,
      render: (status: Announcement['status']) => <Tag color={status === 'PUBLISHED' ? 'green' : status === 'PENDING' ? 'gold' : 'default'} bordered={false}>{statusLabel(status)}</Tag>,
    },
    { title: 'Publisher', dataIndex: 'publisher', key: 'publisher', width: 160 },
    ...(kind === 'system'
      ? [{
          title: 'Display days',
          dataIndex: 'durationDays',
          key: 'duration',
          width: 130,
          render: (days: number) => `${days} day${days > 1 ? 's' : ''}`,
        }]
      : []),
    { title: 'Publish date', dataIndex: 'publishTime', key: 'publishTime', width: 130, render: (value: string) => formatDate(value) || '—' },
    { title: 'Offline date', dataIndex: 'offlineTime', key: 'offlineTime', width: 130, render: (value: string) => formatDate(value) || '—' },
    {
      title: 'Operation',
      key: 'operation',
      width: 230,
      render: (_: unknown, record: Announcement) => (
        <Space size={4}>
          <Button type="link" size="small" disabled={!canEdit(record.status)} icon={<EditOutlined />} onClick={() => navigate(`/announcement/${record.kind}/edit/${record.id}`)}>
            Edit
          </Button>
          {canPublish(record.status) ? (
            <Popconfirm
              title="Publish this announcement?"
              description="Once published it can no longer be edited. You can only take it offline later."
              okText="Publish"
              cancelText="Cancel"
              onConfirm={() => { publish(record.kind, record.id); message.success('Announcement published'); }}
            >
              <Button type="link" size="small" icon={<CloudUploadOutlined />}>Publish</Button>
            </Popconfirm>
          ) : (
            <Tooltip title={record.status === 'PUBLISHED' ? undefined : 'Only a pending announcement can be published'}>
              <Button type="link" size="small" disabled icon={<CloudUploadOutlined />}>Publish</Button>
            </Tooltip>
          )}
          {canOffline(record.status) ? (
            <Popconfirm
              title="Take this announcement offline?"
              description="It will stop being shown or rotated. The record is kept and cannot be brought back online."
              okText="Take offline"
              cancelText="Cancel"
              onConfirm={() => { offline(record.kind, record.id); message.success('Announcement taken offline'); }}
            >
              <Button type="link" size="small" danger icon={<StopOutlined />}>Offline</Button>
            </Popconfirm>
          ) : (
            <Tooltip title={record.status === 'OFFLINE' ? 'An offline announcement cannot be brought back online' : 'Only a published announcement can be taken offline'}>
              <Button type="link" size="small" disabled danger icon={<StopOutlined />}>Offline</Button>
            </Tooltip>
          )}
          <Button type="link" size="small" icon={<FileTextOutlined />} onClick={() => openModalParam('logFor', record.id)}>Log</Button>
        </Space>
      ),
    },
  ];

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

        <div className="announcement-table-panel">
          <div className="announcement-create">
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => navigate(kind === 'system' ? '/announcement/system/edit/new' : '/announcement/iteration/edit/new')}
            >
              {kind === 'system' ? 'Add system announcement' : 'Add iteration announcement'}
            </Button>
          </div>
          <Table<Announcement>
            className="announcement-table"
            rowKey="id"
            size="middle"
            columns={columns}
            dataSource={rows}
            pagination={{ pageSize: 10, showSizeChanger: true, pageSizeOptions: [10, 20, 50], showTotal: (total) => `Total ${total} items` }}
          />
        </div>

        <section className="announcement-table-panel announcement-policy-note">
          <strong>How status drives the available actions</strong>
          <p>
            A <b>Pending</b> announcement can be edited and published. A <b>Published</b> announcement can only be taken offline.
            An <b>Offline</b> announcement is final — there is no delete and no way to bring it back online.
          </p>
        </section>
      </div>

      <IterationAnnouncementViewModal
        announcementId={viewAnnouncementId}
        announcements={iterationAnnouncements}
        onClose={() => closeModalParam('announcementId')}
      />
      <AnnouncementLogModal announcementId={logFor} onClose={() => closeModalParam('logFor')} />
    </div>
  );
}

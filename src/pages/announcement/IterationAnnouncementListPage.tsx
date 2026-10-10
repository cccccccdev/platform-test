import { useMemo, useState } from 'react';
import { Breadcrumb, Button, DatePicker, Input, Select, Space, Table, Tag } from 'antd';
import { useNavigate } from 'react-router-dom';
import type { ColumnsType } from 'antd/es/table';
import { useAnnouncementStore } from './announcementStore';
import { formatPublishDate } from './types';
import type { IterationAnnouncement } from './types';
import { matchAnnouncement, publisherOptionsFrom } from './announcementFilters';

const { RangePicker } = DatePicker;

export default function IterationAnnouncementListPage() {
  const navigate = useNavigate();
  const announcements = useAnnouncementStore((state) => state.iterationAnnouncements);

  const [titleInput, setTitleInput] = useState('');
  const [publisherInput, setPublisherInput] = useState<string>();
  const [dateInput, setDateInput] = useState<[string, string] | null>(null);
  const [versionInput, setVersionInput] = useState<string | undefined>();
  const [query, setQuery] = useState<{ title: string; publisher?: string; dates: [string, string] | null; version?: string }>({ title: '', publisher: undefined, dates: null });

  const publisherOptions = useMemo(() => publisherOptionsFrom(announcements), [announcements]);
  const versionOptions = useMemo(
    () => Array.from(new Set(announcements.map((item) => item.version))).map((version) => ({ value: version, label: version })),
    [announcements],
  );

  const rows = useMemo(
    () => announcements.filter((item) => matchAnnouncement(item, query) && (!query.version || item.version === query.version)),
    [announcements, query],
  );

  const reset = () => {
    setTitleInput('');
    setPublisherInput(undefined);
    setDateInput(null);
    setVersionInput(undefined);
    setQuery({ title: '', publisher: undefined, dates: null });
  };

  const columns: ColumnsType<IterationAnnouncement> = [
    {
      title: 'Title',
      dataIndex: 'title',
      key: 'title',
      render: (title: string, record) => (
        <button type="button" className="announcement-title-link" onClick={() => navigate(`/announcement/detail/iteration/${record.id}`)}>
          {title}
        </button>
      ),
    },
    { title: 'Version', dataIndex: 'version', key: 'version', width: 150, render: (version: string) => <Tag color="purple" bordered={false}>{version}</Tag> },
    { title: 'Publisher', dataIndex: 'publisher', key: 'publisher', width: 220 },
    { title: 'Publish date', dataIndex: 'publishTime', key: 'publishTime', width: 200, render: (publishTime: string) => formatPublishDate(publishTime) },
  ];

  return (
    <div className="announcement-page">
      <section className="state-machine-heading">
        <Breadcrumb items={[{ title: 'Announcement' }, { title: 'Iteration Announcement' }]} />
        <div className="state-machine-title-line">Iteration Announcement</div>
      </section>

      <div className="announcement-content">
        <div className="announcement-filter-panel">
          <div className="announcement-filters">
            <label>
              <span>Title :</span>
              <Input value={titleInput} placeholder="Title" allowClear onChange={(event) => setTitleInput(event.target.value)} />
            </label>
            <label>
              <span>Publisher :</span>
              <Select allowClear showSearch value={publisherInput} placeholder="Publisher" options={publisherOptions} onChange={setPublisherInput} />
            </label>
            <label>
              <span>Publish Date :</span>
              <RangePicker
                value={null}
                onChange={(dates) => {
                  if (!dates || !dates[0] || !dates[1]) {
                    setDateInput(null);
                    return;
                  }
                  setDateInput([dates[0].format('YYYY-MM-DD'), dates[1].format('YYYY-MM-DD')]);
                }}
              />
            </label>
            <label>
              <span>Version :</span>
              <Select allowClear showSearch value={versionInput} placeholder="All versions" options={versionOptions} onChange={setVersionInput} />
            </label>
          </div>
          <Space className="announcement-filter-actions">
            <Button onClick={reset}>Reset</Button>
            <Button type="primary" onClick={() => setQuery({ title: titleInput, publisher: publisherInput, dates: dateInput, version: versionInput })}>Query</Button>
          </Space>
        </div>

        <div className="announcement-table-panel">
          <Table<IterationAnnouncement>
            className="announcement-table"
            rowKey="id"
            size="middle"
            columns={columns}
            dataSource={rows}
            pagination={{ pageSize: 10, showSizeChanger: true, pageSizeOptions: [10, 20, 50], showTotal: (total) => `Total ${total} items` }}
          />
        </div>
      </div>
    </div>
  );
}
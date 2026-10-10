import { useMemo, useState } from 'react';
import { Breadcrumb, Button, DatePicker, Input, Select, Space, Table } from 'antd';
import { useNavigate } from 'react-router-dom';
import type { ColumnsType } from 'antd/es/table';
import { useAnnouncementStore } from './announcementStore';
import { formatPublishDate } from './types';
import type { SystemAnnouncement } from './types';
import { matchAnnouncement, publisherOptionsFrom } from './announcementFilters';

const { RangePicker } = DatePicker;

export default function SystemAnnouncementListPage() {
  const navigate = useNavigate();
  const announcements = useAnnouncementStore((state) => state.systemAnnouncements);

  const [titleInput, setTitleInput] = useState('');
  const [publisherInput, setPublisherInput] = useState<string>();
  const [dateInput, setDateInput] = useState<[string, string] | null>(null);
  const [query, setQuery] = useState<{ title: string; publisher?: string; dates: [string, string] | null }>({ title: '', publisher: undefined, dates: null });

  const publisherOptions = useMemo(() => publisherOptionsFrom(announcements), [announcements]);
  const rows = useMemo(() => announcements.filter((item) => matchAnnouncement(item, query)), [announcements, query]);

  const reset = () => {
    setTitleInput('');
    setPublisherInput(undefined);
    setDateInput(null);
    setQuery({ title: '', publisher: undefined, dates: null });
  };

  const columns: ColumnsType<SystemAnnouncement> = [
    {
      title: 'Title',
      dataIndex: 'title',
      key: 'title',
      render: (title: string, record) => (
        <button type="button" className="announcement-title-link" onClick={() => navigate(`/announcement/detail/system/${record.id}`)}>
          {title}
        </button>
      ),
    },
    { title: 'Publisher', dataIndex: 'publisher', key: 'publisher', width: 220 },
    { title: 'Publish date', dataIndex: 'publishTime', key: 'publishTime', width: 200, render: (publishTime: string) => formatPublishDate(publishTime) },
  ];

  return (
    <div className="announcement-page">
      <section className="state-machine-heading">
        <Breadcrumb items={[{ title: 'Announcement' }, { title: 'System Announcement' }]} />
        <div className="state-machine-title-line">System Announcement</div>
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
                  const from = dates[0].format('YYYY-MM-DD');
                  const to = dates[1].format('YYYY-MM-DD');
                  setDateInput([from, to]);
                }}
              />
            </label>
          </div>
          <Space className="announcement-filter-actions">
            <Button onClick={reset}>Reset</Button>
            <Button type="primary" onClick={() => setQuery({ title: titleInput, publisher: publisherInput, dates: dateInput })}>Query</Button>
          </Space>
        </div>

        <div className="announcement-table-panel">
          <Table<SystemAnnouncement>
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
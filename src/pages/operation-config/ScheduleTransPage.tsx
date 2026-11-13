import { Breadcrumb, Button, Form, Input, InputNumber, Modal, Select, Space, Switch, Table, Tabs } from 'antd';
import { useState } from 'react';
import { create } from 'zustand';
import { useInstitutionReferenceStore } from '../basic-info/institutionReferenceData';

type Settings = { traffic: number; open: number; close: number; openCount: number; closeCount: number };
type Filters = { code?: string; name?: string; ruleStatus?: string; status?: string };
type Entry = { code: string; name: string; settings: Settings };
type Edit = { code: string; settings: Settings } | 'bulk';
type Change = { id: number; code: string; settings: Settings };
const defaults: Settings = { traffic: 0, open: 85, close: 90, openCount: 10, closeCount: 10 };
const bulkDefaults = { open: 75, close: 85, openCount: 10, closeCount: 10 };
const initialFilters = { status: 'ON' };
const labels: [keyof Settings, string][] = [
  ['traffic', 'Traffic Percentage'], ['open', 'Open'], ['close', 'Close'],
  ['openCount', 'Open Count'], ['closeCount', 'Close Count'],
];
const options = (values: string[]) => values.map((value) => ({ value, label: value }));

const useScheduleTrans = create<{
  settings: Record<string, Settings>;
  changes: Change[];
  save: (codes: string[], values: Settings) => void;
}>((set) => ({
  settings: {},
  changes: [],
  save: (codes, values) => set(({ settings, changes }) => ({
    settings: { ...settings, ...Object.fromEntries(codes.map((code) => [code, values])) },
    changes: [...codes.map((code, index) => ({ id: changes.length + index + 1, code, settings: values })), ...changes],
  })),
}));

export default function ScheduleTransPage() {
  const institutions = useInstitutionReferenceStore((state) => state.records);
  const { settings, changes, save } = useScheduleTrans();
  const [filterForm] = Form.useForm<Filters>();
  const [editForm] = Form.useForm<Settings>();
  const [query, setQuery] = useState<Filters>(initialFilters);
  const [edit, setEdit] = useState<Edit>();
  const [log, setLog] = useState<string>();
  const scope = institutions.filter(({ country, institutionTypes }) => country === 'NG' && institutionTypes.includes('BANK'));
  const rows = scope.filter(({ name, code }) =>
    (!query.name || name.toLowerCase().includes(query.name.trim().toLowerCase())) &&
    (!query.code || code.toLowerCase().includes(query.code.trim().toLowerCase())) &&
    (!query.status || query.status === 'ON') &&
    (!query.ruleStatus || query.ruleStatus === 'DISABLE'),
  ).map(({ code, name }) => ({ code, name, settings: settings[code] ?? defaults }));

  function openEdit(target: Edit) {
    editForm.resetFields();
    editForm.setFieldsValue(target === 'bulk' ? bulkDefaults : target.settings);
    setEdit(target);
  }

  return <div className="operation-config-page">
    <div className="availability-monitoring-heading">
      <Breadcrumb items={[{ title: 'Operation Config' }, { title: 'Schedule Trans' }]} />
      <h1>Schedule Trans</h1>
    </div>
    <div className="availability-monitoring-content">
      <Form form={filterForm} initialValues={initialFilters} onFinish={setQuery} className="availability-monitoring-filter-card">
        <div className="schedule-trans-filters">
          <Form.Item label="Business Type"><Input disabled value="BANK_ACCOUNT_CREDIT" /></Form.Item>
          <Form.Item label="Institution Name" name="name"><Input /></Form.Item>
          <Form.Item label="Rule Status" name="ruleStatus"><Select allowClear options={options(['ENABLE', 'DISABLE'])} /></Form.Item>
          <Form.Item label="Institution Code" name="code"><Input /></Form.Item>
          <Form.Item label="Status" name="status"><Select allowClear options={options(['ON', 'OFF'])} /></Form.Item>
          <Space className="route-event-filter-actions">
            <Button onClick={() => { filterForm.resetFields(); setQuery(initialFilters); }}>Reset</Button>
            <Button htmlType="submit" type="primary">Query</Button>
          </Space>
        </div>
        <Tabs activeKey="NG" items={[{ key: 'NG', label: 'NG' }]} />
      </Form>
      <section className="availability-monitoring-table-card">
        <div className="schedule-trans-actions">
          <Button type="primary" disabled={!scope.length} onClick={() => openEdit('bulk')}>Bulk Modify</Button>
          <Button type="primary" onClick={() => setLog('all')}>Log</Button>
        </div>
        <Table<Entry> rowKey="code" dataSource={rows} scroll={{ x: 1050 }} columns={[
          { title: 'Institution Code', dataIndex: 'code' },
          { title: 'Institution Name', dataIndex: 'name' },
          { title: 'Traffic Percentage', render: (_, row) => row.settings.traffic + '%' },
          { title: 'Open Rule', render: (_, row) => '<' + row.settings.open + '%' },
          { title: 'Close Rule', render: (_, row) => '>' + row.settings.close + '%' },
          { title: 'Open Count', render: (_, row) => row.settings.openCount },
          { title: 'Close Count', render: (_, row) => row.settings.closeCount },
          { title: 'ruleStatus', render: () => 'DISABLE' },
          { title: 'Operation', render: (_, row) => <Space>
            <Button type="link" onClick={() => openEdit(row)}>Modify</Button>
            <Button type="link" onClick={() => setLog(row.code)}>Log</Button>
          </Space> },
          { title: 'Status', render: () => <Switch checked disabled aria-label="Status" /> },
        ]} />
      </section>
    </div>
    <Modal forceRender open={Boolean(edit)} title={edit === 'bulk' ? <span className="schedule-trans-bulk-title">Bulk Modify</span> : 'Modify'}
      onCancel={() => setEdit(undefined)} onOk={() => editForm.submit()}>
      <Form form={editForm} labelCol={{ span: 9 }} wrapperCol={{ span: 15 }} onFinish={(values) => {
        if (!edit) return;
        save(edit === 'bulk' ? scope.map(({ code }) => code) : [edit.code], values);
        setEdit(undefined);
      }}>
        {labels.map(([key, label], index) => {
          const operator = key === 'open' ? '<' : key === 'close' ? '>' : '';
          const percent = index < 3;
          const input = <Form.Item name={key} noStyle rules={[{ required: true, message: 'Required' }]}>
            <InputNumber min={0} max={percent ? 100 : undefined} precision={percent ? undefined : 0}
              addonAfter={percent ? '%' : undefined} style={{ width: '100%' }} />
          </Form.Item>;
          return <Form.Item key={key} label={label} required>
            {operator ? <Space.Compact block><Input value={operator} disabled style={{ width: '35%' }} />
              <div style={{ flex: 1 }}>{input}</div></Space.Compact> : input}
          </Form.Item>;
        })}
      </Form>
    </Modal>
    <Modal title="Log" open={log !== undefined} onCancel={() => setLog(undefined)} footer={null}>
      <Table<Change> rowKey="id" size="small" dataSource={changes.filter(({ code }) => log === 'all' || code === log)}
        columns={[
          { title: 'Institution Code', dataIndex: 'code' },
          { title: 'Traffic Percentage', render: (_, row) => row.settings.traffic + '%' },
          { title: 'Open Rule / Count', render: (_, row) => '<' + row.settings.open + '% / ' + row.settings.openCount },
          { title: 'Close Rule / Count', render: (_, row) => '>' + row.settings.close + '% / ' + row.settings.closeCount },
        ]} />
    </Modal>
  </div>;
}

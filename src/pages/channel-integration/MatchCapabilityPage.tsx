import { useMemo, useState } from 'react';
import { Breadcrumb, Button, Form, Input, message, Modal, Popconfirm, Select, Space, Table, Tag } from 'antd';
import { CopyOutlined, DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import { useMatchCapabilityStore } from './matchCapabilityStore';
import type { InboundEndpoint, UriConfigStatus } from './types';

interface NewUriForm {
  uri: string;
  method: InboundEndpoint['method'];
  description?: string;
}

const statusMeta: Record<UriConfigStatus, { label: string; color: string }> = {
  draft: { label: 'Draft', color: 'default' },
  submitted: { label: 'Submitted', color: 'orange' },
  published: { label: 'Published', color: 'green' },
  deprecated: { label: 'Deprecated', color: 'default' },
  legacy_readonly: { label: 'Legacy Readonly', color: 'purple' },
  error: { label: 'Error', color: 'red' },
};

const createId = () => `uri_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

export default function MatchCapabilityPage() {
  const { channelCode = '' } = useParams<{ channelCode: string }>();
  const navigate = useNavigate();
  const [form] = Form.useForm<NewUriForm>();
  const [showNewUri, setShowNewUri] = useState(false);
  const [inspect, setInspect] = useState<{ type: 'status' | 'log'; endpoint: InboundEndpoint } | null>(null);
  const [filters, setFilters] = useState({ keyword: '', method: '', uriType: '', status: '' });
  const endpoints = useMatchCapabilityStore((state) => state.endpointsByChannel[channelCode] ?? []);
  const addEndpoint = useMatchCapabilityStore((state) => state.addEndpoint);
  const createVersion = useMatchCapabilityStore((state) => state.createVersion);
  const cloneEndpoint = useMatchCapabilityStore((state) => state.cloneEndpoint);
  const deployEndpoint = useMatchCapabilityStore((state) => state.deployEndpoint);
  const deleteEndpoint = useMatchCapabilityStore((state) => state.deleteEndpoint);

  const visibleEndpoints = useMemo(() => endpoints.filter((endpoint) => {
    const keyword = filters.keyword.trim().toLowerCase();
    return (!keyword || endpoint.url.toLowerCase().includes(keyword) || endpoint.rules.some((rule) =>
      `${rule.bt} ${rule.ability} ${rule.action}`.toLowerCase().includes(keyword)
    )) && (!filters.method || endpoint.method === filters.method)
      && (!filters.uriType || endpoint.uriType === filters.uriType)
      && (!filters.status || endpoint.configStatus === filters.status);
  }), [endpoints, filters]);

  const openEditor = (endpoint: InboundEndpoint, mode: 'config' | 'detail') => {
    navigate(`/channel-integration/${channelCode}/integration/match-capability/${endpoint.id}?mode=${mode}`);
  };

  const handleCreate = async () => {
    const values = await form.validateFields();
    const uri = values.uri.trim();
    if (!uri.startsWith('/')) {
      form.setFields([{ name: 'uri', errors: ['URI must start with /'] }]);
      return;
    }
    if (endpoints.some((endpoint) => endpoint.url === uri && endpoint.method === values.method)) {
      form.setFields([{ name: 'uri', errors: ['URI + Request Method already exists'] }]);
      return;
    }
    const endpoint: InboundEndpoint = {
      id: createId(),
      name: uri.split('/').filter(Boolean).join('_') || 'root',
      url: uri,
      method: values.method,
      uriType: 'new',
      description: values.description?.trim() ?? '',
      fields: ['query.reference', 'header.x-event-type', 'body.reference', 'body.type', 'body.status'],
      matchType: 'single',
      singleNoField: '',
      matchFields: [],
      rules: [{
        id: `result_${Date.now()}`,
        fieldValues: {},
        bt: '',
        ability: '',
        action: '',
        requestType: 'CALLBACK',
      }],
      customScript: 'def execute(request) {\n  return null\n}',
      fallbackBehavior: 'alert_and_reject',
      decryptEnabled: false,
      version: 'v0.0.1',
      configStatus: 'draft',
      badges: [],
      referenceCount: 0,
      updatedTime: new Date().toLocaleString(),
      operator: 'admin',
    };
    addEndpoint(channelCode, endpoint);
    setShowNewUri(false);
    form.resetFields();
    openEditor(endpoint, 'config');
  };

  return (
    <div style={{ padding: 24 }}>
      <Breadcrumb style={{ marginBottom: 16 }} items={[
        { title: 'Channel Integration', onClick: () => navigate('/channel-integration') },
        { title: channelCode },
        { title: 'Integration' },
        { title: 'Match Capability' },
      ]} />

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h2 style={{ margin: 0 }}>Match Capability</h2>
          <div style={{ color: '#8c8c8c', marginTop: 4 }}>Channel-level inbound URI recognition and automatic Flow dispatch</div>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setShowNewUri(true)}>New URI</Button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr repeat(3, 1fr)', gap: 12, marginBottom: 16, padding: 16, background: '#fafafa', borderRadius: 8 }}>
        <Input.Search placeholder="Search URI or Target Ability" allowClear onSearch={(keyword) => setFilters((current) => ({ ...current, keyword }))} />
        <Select allowClear placeholder="Request Method" options={['GET', 'POST', 'PUT', 'PATCH'].map((value) => ({ value }))} onChange={(method) => setFilters((current) => ({ ...current, method: method ?? '' }))} />
        <Select allowClear placeholder="URI Type" options={[{ value: 'new', label: 'New' }, { value: 'legacy', label: 'Legacy' }]} onChange={(uriType) => setFilters((current) => ({ ...current, uriType: uriType ?? '' }))} />
        <Select allowClear placeholder="Config Status" options={Object.entries(statusMeta).map(([value, meta]) => ({ value, label: meta.label }))} onChange={(status) => setFilters((current) => ({ ...current, status: status ?? '' }))} />
      </div>

      <Table<InboundEndpoint>
        rowKey="id"
        dataSource={visibleEndpoints}
        pagination={false}
        scroll={{ x: 1450 }}
        columns={[
          { title: 'URI', dataIndex: 'url', width: 230, fixed: 'left', render: (uri, endpoint) => <div><strong>{uri}</strong><div style={{ color: '#8c8c8c', fontSize: 11 }}>{endpoint.description || '-'}</div></div> },
          { title: 'Request Method', dataIndex: 'method', width: 120, render: (method) => <Tag color="blue">{method}</Tag> },
          { title: 'URI Type', dataIndex: 'uriType', width: 100, render: (type) => <Tag color={type === 'legacy' ? 'purple' : 'cyan'}>{type === 'legacy' ? 'Legacy' : 'New'}</Tag> },
          { title: 'Version', dataIndex: 'version', width: 110 },
          { title: 'Target Summary', width: 220, render: (_, endpoint) => {
            const callbackCount = endpoint.rules.filter((rule) => rule.requestType === 'CALLBACK').length;
            const inboundCount = endpoint.rules.filter((rule) => rule.requestType === 'EXTERNAL_INBOUND').length;
            return <div>{endpoint.rules.length} Capability Result(s)<div style={{ color: '#8c8c8c', fontSize: 11 }}>CALLBACK {callbackCount} · EXTERNAL_INBOUND {inboundCount}</div></div>;
          } },
          { title: 'Config Status', dataIndex: 'configStatus', width: 150, render: (status: UriConfigStatus, endpoint) => <Space direction="vertical" size={2}><Tag color={statusMeta[status].color}>{statusMeta[status].label}</Tag>{endpoint.badges?.map((badge) => <Tag key={`${badge.cloud}-${badge.env}`} color="green">{badge.cloud} - {badge.env}</Tag>)}</Space> },
          { title: 'Reference', dataIndex: 'referenceCount', width: 120, render: (count = 0) => `${count} Flow Version(s)` },
          { title: 'Updated Time', dataIndex: 'updatedTime', width: 170 },
          { title: 'Operator', dataIndex: 'operator', width: 100 },
          { title: 'Operation', width: 380, fixed: 'right', render: (_, endpoint) => endpoint.uriType === 'legacy'
            ? <Button type="link" onClick={() => openEditor(endpoint, 'detail')}>Detail</Button>
            : <Space size={0} wrap>
              {endpoint.configStatus === 'draft'
                ? <Button type="link" onClick={() => openEditor(endpoint, 'config')}>Config</Button>
                : <Button type="link" onClick={() => { createVersion(channelCode, endpoint.id); openEditor(endpoint, 'config'); }}>New Version</Button>}
              <Button type="link" onClick={() => openEditor(endpoint, 'detail')}>Detail</Button>
              <Button type="link" icon={<CopyOutlined />} onClick={() => { const clone = cloneEndpoint(channelCode, endpoint.id); if (clone) message.success(`Cloned as ${clone.url}`); }}>Clone</Button>
              {endpoint.configStatus === 'submitted' && <Button type="link" onClick={() => { deployEndpoint(channelCode, endpoint.id); message.success('Deployed to BD - DAILY'); }}>Deploy</Button>}
              <Button type="link" onClick={() => setInspect({ type: 'status', endpoint })}>Status</Button><Button type="link" onClick={() => setInspect({ type: 'log', endpoint })}>Log</Button>
              <Popconfirm title="Delete this URI?" disabled={(endpoint.referenceCount ?? 0) > 0 || endpoint.configStatus === 'published'} onConfirm={() => deleteEndpoint(channelCode, endpoint.id)}>
                <Button type="link" danger disabled={(endpoint.referenceCount ?? 0) > 0 || endpoint.configStatus === 'published'} icon={<DeleteOutlined />}>Delete</Button>
              </Popconfirm>
            </Space> },
        ]}
      />

      <Modal title="New URI" open={showNewUri} onOk={() => void handleCreate()} okText="Create and Configure" onCancel={() => { setShowNewUri(false); form.resetFields(); }}>
        <Form form={form} layout="vertical" initialValues={{ method: 'POST' }}>
          <Form.Item name="uri" label="URI" rules={[{ required: true, message: 'Enter URI' }]}><Input placeholder="/callback/channel/payment" /></Form.Item>
          <Form.Item name="method" label="Request Method" rules={[{ required: true }]}><Select options={['GET', 'POST', 'PUT', 'PATCH'].map((value) => ({ value }))} /></Form.Item>
          <Form.Item name="description" label="Description"><Input.TextArea rows={3} /></Form.Item>
        </Form>
      </Modal>
      <Modal title={inspect?.type === 'status' ? 'Deployment Status' : 'Operation Log'} open={Boolean(inspect)} footer={null} onCancel={() => setInspect(null)}>
        {inspect ? (inspect.type === 'status' ? (
          inspect.endpoint.badges?.length
            ? inspect.endpoint.badges.map((badge) => <div key={`${badge.cloud}-${badge.env}`} style={{ padding: 12, marginBottom: 8, background: '#f6ffed', border: '1px solid #b7eb8f', borderRadius: 6 }}><strong>{badge.cloud} - {badge.env}</strong><Tag color="green" style={{ marginLeft: 12 }}>Running</Tag><div style={{ color: '#8c8c8c', marginTop: 4 }}>Effective Version: {inspect.endpoint.version}</div></div>)
            : <div style={{ color: '#8c8c8c' }}>This URI Version has not been deployed.</div>
        ) : (
          <div><div style={{ padding: '10px 0', borderBottom: '1px solid #f0f0f0' }}><strong>{inspect.endpoint.updatedTime}</strong> · {inspect.endpoint.operator}<div>Updated URI Configuration {inspect.endpoint.version}</div></div><div style={{ padding: '10px 0' }}><strong>2026-06-28 09:00:00</strong> · admin<div>Created URI master record</div></div></div>
        )) : null}
      </Modal>
    </div>
  );
}

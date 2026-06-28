import { useMemo, useState } from 'react';
import { Breadcrumb, Button, Form, Input, message, Modal, Select, Space, Table, Tag } from 'antd';
import { CopyOutlined, DeleteOutlined, DownOutlined, PlusOutlined, RightOutlined } from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import { mockBusinessTypes } from '../../mock/data';
import { useMatchCapabilityStore } from './matchCapabilityStore';
import type { InboundEndpoint, UriConfigStatus } from './types';

interface NewInboundEndpointForm {
  businessType: string;
  path: string;
  method: InboundEndpoint['method'];
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
  const [form] = Form.useForm<NewInboundEndpointForm>();
  const [showNewEndpoint, setShowNewEndpoint] = useState(false);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [inspect, setInspect] = useState<{ type: 'status' | 'log'; endpoint: InboundEndpoint } | null>(null);
  const [filters, setFilters] = useState({ keyword: '', businessType: '', method: '', status: '' });
  const endpointsByChannel = useMatchCapabilityStore((state) => state.endpointsByChannel);
  const endpoints = useMemo(() => endpointsByChannel[channelCode] ?? [], [channelCode, endpointsByChannel]);
  const addEndpoint = useMatchCapabilityStore((state) => state.addEndpoint);
  const createVersion = useMatchCapabilityStore((state) => state.createVersion);
  const cloneEndpoint = useMatchCapabilityStore((state) => state.cloneEndpoint);
  const deployEndpoint = useMatchCapabilityStore((state) => state.deployEndpoint);
  const deleteEndpoint = useMatchCapabilityStore((state) => state.deleteEndpoint);

  const pathPrefix = `/callback/${channelCode.toLowerCase()}/`;
  const configBusinessTypes = (mockBusinessTypes[channelCode] ?? [])
    .filter((item) => item.mode === 'Config Integration')
    .map((item) => item.bt);

  const visibleEndpoints = useMemo(() => endpoints.filter((endpoint) => {
    const keyword = filters.keyword.trim().toLowerCase();
    return (!keyword || endpoint.url.toLowerCase().includes(keyword))
      && (!filters.businessType || endpoint.businessType === filters.businessType)
      && (!filters.method || endpoint.method === filters.method)
      && (!filters.status || endpoint.configStatus === filters.status);
  }), [endpoints, filters]);

  const openEditor = (endpoint: InboundEndpoint, mode: 'config' | 'detail') => {
    navigate(`/channel-integration/${channelCode}/integration/match-capability/${endpoint.id}?mode=${mode}`);
  };

  const toggleExpand = (endpointId: string) => setExpandedRows((previous) => {
    const next = new Set(previous);
    if (next.has(endpointId)) next.delete(endpointId);
    else next.add(endpointId);
    return next;
  });

  const handleCreate = async () => {
    const values = await form.validateFields();
    const suffix = values.path.trim().replace(/^\/+|\/+$/g, '');
    const uri = `${pathPrefix}${suffix}`;
    if (endpoints.some((endpoint) => endpoint.url === uri && endpoint.method === values.method)) {
      form.setFields([{ name: 'path', errors: ['Path + Method already exists in this Channel'] }]);
      return;
    }
    const endpoint: InboundEndpoint = {
      id: createId(),
      name: suffix.replaceAll('/', '_'),
      url: uri,
      businessType: values.businessType,
      method: values.method,
      uriType: 'new',
      description: '',
      fields: ['query.reference', 'header.x-event-type', 'body.reference', 'body.type', 'body.status'],
      matchType: 'single',
      singleNoField: '',
      matchFields: [],
      rules: [{ id: `result_${Date.now()}`, fieldValues: {}, bt: values.businessType, ability: '', action: '', requestType: 'CALLBACK' }],
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
    setShowNewEndpoint(false);
    form.resetFields();
    openEditor(endpoint, 'config');
  };

  const renderStatus = (endpoint: InboundEndpoint) => {
    if (endpoint.configStatus === 'published' && endpoint.badges?.length) {
      return <Space wrap>{endpoint.badges.map((badge) => <Tag key={`${badge.cloud}-${badge.env}`} color="blue">{badge.cloud} - {badge.env}</Tag>)}</Space>;
    }
    const meta = statusMeta[endpoint.configStatus];
    return <Tag color={meta.color}>{meta.label}</Tag>;
  };

  const handleNewVersion = (endpoint: InboundEndpoint) => {
    createVersion(channelCode, endpoint.id);
    openEditor(endpoint, 'config');
  };

  const confirmDelete = (endpoint: InboundEndpoint) => Modal.confirm({
    title: 'Delete Inbound Endpoint?',
    content: endpoint.referenceCount ? 'This Endpoint is referenced and cannot be deleted.' : endpoint.url,
    okButtonProps: { danger: true, disabled: Boolean(endpoint.referenceCount) },
    onOk: () => deleteEndpoint(channelCode, endpoint.id),
  });

  const renderOperations = (endpoint: InboundEndpoint) => {
    if (endpoint.uriType === 'legacy') return <Button type="link" onClick={() => openEditor(endpoint, 'detail')}>Detail</Button>;
    if (endpoint.configStatus === 'draft') return <Space><Button type="link" onClick={() => openEditor(endpoint, 'config')}>Config</Button><Button type="link" danger icon={<DeleteOutlined />} disabled={Boolean(endpoint.referenceCount)} onClick={() => confirmDelete(endpoint)}>Delete</Button></Space>;
    if (endpoint.configStatus === 'submitted') return <Space><Button type="link" onClick={() => openEditor(endpoint, 'detail')}>Detail</Button><Button type="link" onClick={() => { deployEndpoint(channelCode, endpoint.id); message.success('Deployed to BD - DAILY'); }}>Deploy</Button><Button type="link" icon={<CopyOutlined />} onClick={() => { const clone = cloneEndpoint(channelCode, endpoint.id); if (clone) message.success(`Cloned as ${clone.url}`); }}>Clone</Button><Button type="link" onClick={() => setInspect({ type: 'status', endpoint })}>Status</Button><Button type="link" onClick={() => setInspect({ type: 'log', endpoint })}>Log</Button></Space>;
    return <Space><Button type="link" onClick={() => openEditor(endpoint, 'detail')}>Detail</Button><Button type="link" icon={<CopyOutlined />} onClick={() => cloneEndpoint(channelCode, endpoint.id)}>Clone</Button><Button type="link" onClick={() => setInspect({ type: 'status', endpoint })}>Status</Button><Button type="link" onClick={() => setInspect({ type: 'log', endpoint })}>Log</Button></Space>;
  };

  const expandedRowRender = (endpoint: InboundEndpoint) => (
    <Table<InboundEndpoint>
      rowKey="id"
      dataSource={[endpoint]}
      pagination={false}
      size="small"
      columns={[
        { title: 'Endpoint Version', dataIndex: 'version', width: 150 },
        { title: 'Status', width: 220, render: () => renderStatus(endpoint) },
        { title: 'Description', dataIndex: 'description', render: (value) => value || '-' },
        { title: 'Operator', dataIndex: 'operator', width: 110 },
        { title: 'Operation Time', dataIndex: 'updatedTime', width: 190 },
        { title: 'Operation', width: 360, render: () => renderOperations(endpoint) },
      ]}
    />
  );

  return (
    <div style={{ padding: 24 }}>
      <Breadcrumb style={{ marginBottom: 16 }} items={[{ title: 'Channel Integration' }, { title: channelCode }, { title: 'Integration' }, { title: 'Match Capability' }]} />
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div><h2 style={{ margin: 0 }}>Match Capability</h2><div style={{ color: '#8c8c8c', marginTop: 4 }}>Inbound Endpoint and capability matching configuration</div></div>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setShowNewEndpoint(true)}>New Inbound Endpoint</Button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr repeat(3, 1fr)', gap: 12, marginBottom: 16, padding: 16, background: '#fafafa', borderRadius: 8 }}>
        <Input.Search placeholder="Search URI" allowClear onSearch={(keyword) => setFilters((current) => ({ ...current, keyword }))} />
        <Select allowClear placeholder="Business Type" options={configBusinessTypes.map((value) => ({ value }))} onChange={(businessType) => setFilters((current) => ({ ...current, businessType: businessType ?? '' }))} />
        <Select allowClear placeholder="Method" options={['POST', 'GET', 'PUT', 'DELETE'].map((value) => ({ value }))} onChange={(method) => setFilters((current) => ({ ...current, method: method ?? '' }))} />
        <Select allowClear placeholder="Status" options={Object.entries(statusMeta).map(([value, meta]) => ({ value, label: meta.label }))} onChange={(status) => setFilters((current) => ({ ...current, status: status ?? '' }))} />
      </div>

      <Table<InboundEndpoint>
        rowKey="id"
        dataSource={visibleEndpoints}
        pagination={false}
        expandable={{ expandedRowRender, expandedRowKeys: Array.from(expandedRows), showExpandColumn: false }}
        columns={[
          { title: '', width: 50, render: (_, endpoint) => <Button type="text" icon={expandedRows.has(endpoint.id) ? <DownOutlined /> : <RightOutlined />} onClick={() => toggleExpand(endpoint.id)} /> },
          { title: 'URI', dataIndex: 'url', render: (uri) => <strong>{uri}</strong> },
          { title: 'Business Type', dataIndex: 'businessType', width: 180, render: (bt) => <Tag>{bt}</Tag> },
          { title: 'Method', dataIndex: 'method', width: 120, render: (method) => <Tag color="blue">{method}</Tag> },
          { title: 'Latest Version', dataIndex: 'version', width: 150 },
          { title: 'Status', width: 220, render: (_, endpoint) => renderStatus(endpoint) },
          { title: 'Operation', width: 210, render: (_, endpoint) => endpoint.uriType === 'legacy' ? null : <Button type="primary" size="small" disabled={endpoint.configStatus === 'draft'} onClick={() => handleNewVersion(endpoint)}>New Endpoint Version</Button> },
        ]}
      />

      <Modal title="New Inbound Endpoint" open={showNewEndpoint} okText="Create and Configure" onOk={() => void handleCreate()} onCancel={() => { setShowNewEndpoint(false); form.resetFields(); }}>
        <Form form={form} layout="vertical" initialValues={{ method: 'POST' }}>
          <Form.Item name="businessType" label="Business Type" rules={[{ required: true, message: 'Select Business Type' }]}>
            <Select placeholder="Select Config Integration Business Type" options={configBusinessTypes.map((value) => ({ value }))} />
          </Form.Item>
          <Form.Item name="path" label="Path" rules={[{ required: true, message: 'Enter Path' }, { pattern: /^[A-Za-z0-9_/-]+$/, message: 'Use letters, numbers, _, - or /' }]}>
            <Input addonBefore={pathPrefix} placeholder="payment_callback" />
          </Form.Item>
          <Form.Item name="method" label="Method" rules={[{ required: true }]}>
            <Select options={['POST', 'GET', 'PUT', 'DELETE'].map((value) => ({ value }))} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal title={inspect?.type === 'status' ? 'Deployment Status' : 'Operation Log'} open={Boolean(inspect)} footer={null} onCancel={() => setInspect(null)}>
        {inspect ? inspect.type === 'status'
          ? (inspect.endpoint.badges?.length ? inspect.endpoint.badges.map((badge) => <div key={`${badge.cloud}-${badge.env}`} style={{ padding: 12, marginBottom: 8, background: '#f6ffed', borderRadius: 6 }}><strong>{badge.cloud} - {badge.env}</strong><Tag color="green" style={{ marginLeft: 12 }}>Running</Tag></div>) : <div>No deployment record.</div>)
          : <div><strong>{inspect.endpoint.updatedTime}</strong> · {inspect.endpoint.operator}<div>Updated Endpoint Version {inspect.endpoint.version}</div></div>
          : null}
      </Modal>
    </div>
  );
}

import { useMemo, useState } from 'react';
import { Breadcrumb, Button, Form, Input, message, Modal, Select, Space, Table, Tag } from 'antd';
import { CopyOutlined, DeleteOutlined, DownOutlined, PlusOutlined, RightOutlined } from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import { mockBusinessTypes } from '../../mock/data';
import { useMatchCapabilityStore } from './matchCapabilityStore';
import type { CapabilityDecisionVersion, InboundEndpoint, UriConfigStatus } from './types';

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
  const [managingEndpoint, setManagingEndpoint] = useState<InboundEndpoint | null>(null);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [inspect, setInspect] = useState<{ type: 'status' | 'log'; endpoint: InboundEndpoint; version: CapabilityDecisionVersion } | null>(null);
  const [filters, setFilters] = useState({ keyword: '', businessType: '', method: '', status: '' });
  const endpointsByChannel = useMatchCapabilityStore((state) => state.endpointsByChannel);
  const endpoints = useMemo(() => endpointsByChannel[channelCode] ?? [], [channelCode, endpointsByChannel]);
  const addEndpoint = useMatchCapabilityStore((state) => state.addEndpoint);
  const updateEndpoint = useMatchCapabilityStore((state) => state.updateEndpoint);
  const createVersion = useMatchCapabilityStore((state) => state.createVersion);
  const cloneVersion = useMatchCapabilityStore((state) => state.cloneVersion);
  const deployVersion = useMatchCapabilityStore((state) => state.deployVersion);
  const deleteVersion = useMatchCapabilityStore((state) => state.deleteVersion);

  const pathPrefix = `/callback/${channelCode.toLowerCase()}/`;
  const configBusinessTypes = (mockBusinessTypes[channelCode] ?? [])
    .filter((item) => item.mode === 'Config Integration')
    .map((item) => item.bt);

  const visibleEndpoints = useMemo(() => endpoints.filter((endpoint) => {
    const keyword = filters.keyword.trim().toLowerCase();
    return (!keyword || endpoint.url.toLowerCase().includes(keyword))
      && (!filters.businessType || endpoint.businessTypes.includes(filters.businessType))
      && (!filters.method || endpoint.method === filters.method)
      && (!filters.status || endpoint.versions.some((version) => version.configStatus === filters.status));
  }), [endpoints, filters]);

  const openEditor = (endpoint: InboundEndpoint, version: CapabilityDecisionVersion, mode: 'config' | 'detail') => {
    navigate(`/channel-integration/${channelCode}/integration/match-capability/${endpoint.id}/versions/${version.id}?mode=${mode}`);
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
    const decisionVersion: CapabilityDecisionVersion = {
      id: `decision_${Date.now()}`,
      version: 'v0.0.1',
      configStatus: 'draft',
      description: '',
      fields: [],
      requestFields: [],
      matchType: 'single',
      singleNoField: '',
      matchFields: [],
      rules: [{ id: `result_${Date.now()}`, fieldValues: {}, bt: values.businessType, ability: '', action: '', requestType: 'CALLBACK' }],
      customScript: 'def execute(request) {\n  return null\n}',
      fallbackBehavior: 'alert_and_reject',
      decryptEnabled: false,
      badges: [],
      updatedTime: new Date().toLocaleString(),
      operator: 'admin',
    };
    const endpoint: InboundEndpoint = {
      id: createId(),
      name: suffix.replaceAll('/', '_'),
      url: uri,
      businessType: values.businessType,
      businessTypes: [values.businessType],
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
      versions: [decisionVersion],
    };
    addEndpoint(channelCode, endpoint);
    setShowNewEndpoint(false);
    form.resetFields();
    openEditor(endpoint, decisionVersion, 'config');
  };

  const renderStatus = (version: CapabilityDecisionVersion) => {
    if (version.configStatus === 'published' && version.badges?.length) {
      return <Space wrap>{version.badges.map((badge) => <Tag key={`${badge.cloud}-${badge.env}`} color="blue">{badge.cloud} - {badge.env}</Tag>)}</Space>;
    }
    const meta = statusMeta[version.configStatus];
    return <Tag color={meta.color}>{meta.label}</Tag>;
  };

  const handleNewVersion = (endpoint: InboundEndpoint) => {
    const version = createVersion(channelCode, endpoint.id);
    if (!version) return void message.warning('A Draft Capability Decision Version already exists.');
    openEditor(endpoint, version, 'config');
  };

  const renderOperations = (endpoint: InboundEndpoint, version: CapabilityDecisionVersion) => {
    if (endpoint.uriType === 'legacy') return <Button type="link" onClick={() => openEditor(endpoint, version, 'detail')}>Detail</Button>;
    if (version.configStatus === 'draft') return <Space><Button type="link" onClick={() => openEditor(endpoint, version, 'config')}>Config</Button><Button type="link" danger icon={<DeleteOutlined />} onClick={() => deleteVersion(channelCode, endpoint.id, version.id)}>Delete</Button></Space>;
    if (version.configStatus === 'submitted') return <Space><Button type="link" onClick={() => openEditor(endpoint, version, 'detail')}>Detail</Button><Button type="link" onClick={() => { deployVersion(channelCode, endpoint.id, version.id); message.success('Deployed to BD - DAILY'); }}>Deploy</Button><Button type="link" icon={<CopyOutlined />} onClick={() => { const clone = cloneVersion(channelCode, endpoint.id, version.id); if (clone) openEditor(endpoint, clone, 'config'); else message.warning('Resolve the existing Draft first.'); }}>Clone</Button><Button type="link" onClick={() => setInspect({ type: 'status', endpoint, version })}>Status</Button><Button type="link" onClick={() => setInspect({ type: 'log', endpoint, version })}>Log</Button></Space>;
    return <Space><Button type="link" onClick={() => openEditor(endpoint, version, 'detail')}>Detail</Button><Button type="link" icon={<CopyOutlined />} onClick={() => { const clone = cloneVersion(channelCode, endpoint.id, version.id); if (clone) openEditor(endpoint, clone, 'config'); }}>Clone</Button><Button type="link" onClick={() => setInspect({ type: 'status', endpoint, version })}>Status</Button><Button type="link" onClick={() => setInspect({ type: 'log', endpoint, version })}>Log</Button></Space>;
  };

  const expandedRowRender = (endpoint: InboundEndpoint) => (
    <Table<CapabilityDecisionVersion>
      rowKey="id"
      dataSource={endpoint.versions}
      pagination={false}
      size="small"
      columns={[
        { title: 'Capability Decision Version', dataIndex: 'version', width: 210 },
        { title: 'Status', width: 220, render: (_, version) => renderStatus(version) },
        { title: 'Description', dataIndex: 'description', render: (value) => value || '-' },
        { title: 'Operator', dataIndex: 'operator', width: 110 },
        { title: 'Operation Time', dataIndex: 'updatedTime', width: 190 },
        { title: 'Operation', width: 440, render: (_, version) => renderOperations(endpoint, version) },
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
          { title: 'URI', dataIndex: 'url', render: (uri) => <strong>{uri.startsWith(pathPrefix) ? uri.slice(pathPrefix.length) : uri}</strong> },
          { title: 'Business Type', dataIndex: 'businessTypes', width: 260, render: (businessTypes: string[]) => <Space wrap>{businessTypes.map((bt) => <Tag key={bt}>{bt}</Tag>)}</Space> },
          { title: 'Method', dataIndex: 'method', width: 120, render: (method) => <Tag color="blue">{method}</Tag> },
          { title: 'Operation', width: 360, render: (_, endpoint) => endpoint.uriType === 'legacy' ? null : <Space><Button size="small" onClick={() => setManagingEndpoint(endpoint)}>Manage Business Type</Button><Button type="primary" size="small" disabled={endpoint.versions.some((version) => version.configStatus === 'draft')} onClick={() => handleNewVersion(endpoint)}>New Decision Version</Button></Space> },
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

      <Modal title="Manage Business Type" open={Boolean(managingEndpoint)} footer={null} onCancel={() => setManagingEndpoint(null)}>
        {managingEndpoint && <>
          <div style={{ color: '#8c8c8c', marginBottom: 12 }}>Add Config Integration Business Types. A Business Type used by any Capability Decision Version cannot be removed.</div>
          <Select
            mode="multiple"
            style={{ width: '100%' }}
            value={managingEndpoint.businessTypes}
            options={configBusinessTypes.map((value) => ({ value }))}
            onChange={(businessTypes) => {
              const usedBusinessTypes = new Set(managingEndpoint.versions.flatMap((version) => version.rules.map((rule) => rule.bt)).filter(Boolean));
              const blocked = [...usedBusinessTypes].find((bt) => !businessTypes.includes(bt));
              if (blocked) return void message.error(`${blocked} is used by a Capability Decision Version and cannot be removed.`);
              updateEndpoint(channelCode, managingEndpoint.id, { businessTypes, businessType: businessTypes[0] ?? '' });
              setManagingEndpoint({ ...managingEndpoint, businessTypes, businessType: businessTypes[0] ?? '' });
            }}
          />
          <div style={{ marginTop: 12 }}>{[...new Set(managingEndpoint.versions.flatMap((version) => version.rules.map((rule) => rule.bt)).filter(Boolean))].map((bt) => <Tag key={bt} color="orange">{bt} · In Use</Tag>)}</div>
        </>}
      </Modal>

      <Modal title={inspect?.type === 'status' ? 'Deployment Status' : 'Operation Log'} open={Boolean(inspect)} footer={null} onCancel={() => setInspect(null)}>
        {inspect ? inspect.type === 'status'
          ? (inspect.version.badges?.length ? inspect.version.badges.map((badge) => <div key={`${badge.cloud}-${badge.env}`} style={{ padding: 12, marginBottom: 8, background: '#f6ffed', borderRadius: 6 }}><strong>{badge.cloud} - {badge.env}</strong><Tag color="green" style={{ marginLeft: 12 }}>Running</Tag></div>) : <div>No deployment record.</div>)
          : <div><strong>{inspect.version.updatedTime}</strong> · {inspect.version.operator}<div>Updated Capability Decision Version {inspect.version.version}</div></div>
          : null}
      </Modal>
    </div>
  );
}

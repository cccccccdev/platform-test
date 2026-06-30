import { useMemo, useState } from 'react';
import { Breadcrumb, Button, Form, Input, message, Modal, Select, Space, Table, Tag, Tooltip } from 'antd';
import { CopyOutlined, DeleteOutlined, DownOutlined, PlusOutlined, RightOutlined } from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import { mockBusinessTypes } from '../../mock/data';
import { nextMatchingId, useMatchCapabilityStore } from './matchCapabilityStore';
import type { CapabilityDecisionVersion, InboundEndpoint, UriConfigStatus } from './types';

interface NewInboundEndpointForm {
  businessType: string;
  path: string;
  method: InboundEndpoint['method'];
}

const statusMeta: Record<UriConfigStatus, { label: string; color: string }> = {
  DRAFT: { label: 'DRAFT', color: 'default' },
  DAILY: { label: 'DAILY', color: 'blue' },
  PRE: { label: 'PRE', color: 'orange' },
  PROD: { label: 'PROD', color: 'green' },
};

const cloudOptions = ['MFB', 'BD', 'PK', 'ALIYUN', 'ALIYUN_FRANKFURT', 'ONELOOP'].map((value) => ({ value }));
const environmentOrder = ['DAILY', 'PRE', 'PROD'];

const timestampVersion = () => {
  const date = new Date();
  const parts = [date.getFullYear(), date.getMonth() + 1, date.getDate(), date.getHours(), date.getMinutes(), date.getSeconds()];
  return parts.map((part, index) => index === 0 ? String(part) : String(part).padStart(2, '0')).join('');
};

const createId = () => `uri_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

export default function MatchCapabilityPage() {
  const { channelCode = '' } = useParams<{ channelCode: string }>();
  const navigate = useNavigate();
  const [form] = Form.useForm<NewInboundEndpointForm>();
  const [versionForm] = Form.useForm<{ name: string }>();
  const [showNewEndpoint, setShowNewEndpoint] = useState(false);
  const [newVersionEndpoint, setNewVersionEndpoint] = useState<InboundEndpoint | null>(null);
  const [managingEndpoint, setManagingEndpoint] = useState<InboundEndpoint | null>(null);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [inspect, setInspect] = useState<{ endpoint: InboundEndpoint; version: CapabilityDecisionVersion } | null>(null);
  const [deploying, setDeploying] = useState<{ endpoint: InboundEndpoint; version: CapabilityDecisionVersion } | null>(null);
  const [deployCloud, setDeployCloud] = useState<string>();
  const [filters, setFilters] = useState({ keyword: '', businessType: '', method: '', status: '' });
  const endpointsByChannel = useMatchCapabilityStore((state) => state.endpointsByChannel);
  const endpoints = useMemo(() => endpointsByChannel[channelCode] ?? [], [channelCode, endpointsByChannel]);
  const addEndpoint = useMatchCapabilityStore((state) => state.addEndpoint);
  const updateEndpoint = useMatchCapabilityStore((state) => state.updateEndpoint);
  const createVersion = useMatchCapabilityStore((state) => state.createVersion);
  const cloneVersion = useMatchCapabilityStore((state) => state.cloneVersion);
  const deployVersion = useMatchCapabilityStore((state) => state.deployVersion);
  const deleteVersion = useMatchCapabilityStore((state) => state.deleteVersion);
  const discardVersionDraft = useMatchCapabilityStore((state) => state.discardVersionDraft);

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
      id: nextMatchingId(endpointsByChannel),
      version: timestampVersion(),
      name: `${suffix.replaceAll('/', ' ')} Matching`.slice(0, 32),
      sourceType: 'v2',
      configStatus: 'DRAFT',
      fields: [],
      requestFields: [],
      matchType: 'single',
      singleNoField: '',
      matchFields: [],
      rules: [{ id: `result_${Date.now()}`, fieldValues: {}, bt: values.businessType, ability: '', action: '' }],
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
      rules: [{ id: `result_${Date.now()}`, fieldValues: {}, bt: values.businessType, ability: '', action: '' }],
      customScript: 'def execute(request) {\n  return null\n}',
      fallbackBehavior: 'alert_and_reject',
      decryptEnabled: false,
      version: decisionVersion.version,
      configStatus: 'DRAFT',
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
    const meta = statusMeta[version.configStatus];
    return <Tag color={meta.color}>{meta.label}</Tag>;
  };

  const handleNewVersion = async () => {
    if (!newVersionEndpoint) return;
    const { name } = await versionForm.validateFields();
    const configBusinessType = newVersionEndpoint.businessTypes.find((bt) => configBusinessTypes.includes(bt));
    if (!configBusinessType) return void message.warning('Add at least one Config Integration Business Type before creating a 2.0 Matching Version.');
    const version = createVersion(channelCode, newVersionEndpoint.id, name, configBusinessType);
    if (!version) return void message.warning('A Draft Capability Matching Version already exists.');
    setNewVersionEndpoint(null);
    versionForm.resetFields();
    openEditor(newVersionEndpoint, version, 'config');
  };

  const openConfig = (endpoint: InboundEndpoint, version: CapabilityDecisionVersion) => {
    if (version.hasUnsubmittedDraft) {
      Modal.confirm({
        title: 'Unsubmitted draft found',
        content: 'Load the saved draft? Choosing “Discard and Edit” abandons the previous draft and starts from the last submitted configuration.',
        okText: 'Load Draft',
        cancelText: 'Discard and Edit',
        onOk: () => openEditor(endpoint, version, 'config'),
        onCancel: () => {
          discardVersionDraft(channelCode, endpoint.id, version.id);
          const restored = useMatchCapabilityStore.getState().getEndpoints(channelCode).find((item) => item.id === endpoint.id)?.versions.find((item) => item.id === version.id);
          if (restored) openEditor(endpoint, restored, 'config');
        },
      });
      return;
    }
    openEditor(endpoint, version, 'config');
  };

  const openDeploy = (endpoint: InboundEndpoint, version: CapabilityDecisionVersion) => {
    const show = () => { setDeployCloud(undefined); setDeploying({ endpoint, version }); };
    if (!version.hasUnsubmittedDraft) return show();
    Modal.confirm({
      title: 'Unsubmitted draft will not be deployed',
      content: 'Only the latest submitted configuration will be deployed. Continue?',
      okText: 'Continue Deploy',
      onOk: show,
    });
  };

  const currentDeployStatus = deployCloud && deploying
    ? environmentOrder.filter((env) => deploying.version.badges?.some((badge) => badge.cloud === deployCloud && badge.env === env)).at(-1) ?? 'DRAFT'
    : '-';
  const nextDeployEnvironment = currentDeployStatus === 'DRAFT' ? 'DAILY' : currentDeployStatus === 'DAILY' ? (deployCloud === 'ONELOOP' ? 'PROD' : 'PRE') : currentDeployStatus === 'PRE' ? 'PROD' : undefined;
  const deployStatusRows = inspect
    ? [...new Set((inspect.version.badges ?? []).map((badge) => badge.cloud))].map((cloud) => ({
        cloud,
        environments: new Set((inspect.version.badges ?? []).filter((badge) => badge.cloud === cloud).map((badge) => badge.env)),
      }))
    : [];

  const renderOperations = (endpoint: InboundEndpoint, version: CapabilityDecisionVersion) => {
    const clone = () => { const cloned = cloneVersion(channelCode, endpoint.id, version.id); if (cloned) openEditor(endpoint, cloned, 'config'); };
    return <Space wrap>
      {version.sourceType === 'v2' && version.configStatus === 'PROD' && <Button type="link" icon={<CopyOutlined />} onClick={clone}>Clone</Button>}
      {version.configStatus === 'PROD' && <Button type="link" onClick={() => openEditor(endpoint, version, 'detail')}>Detail</Button>}
      {version.configStatus !== 'PROD' && <Button type="link" onClick={() => openConfig(endpoint, version)}>Config</Button>}
      <Button type="link" onClick={() => openDeploy(endpoint, version)}>Deploy</Button>
      {version.configStatus !== 'DRAFT' && <Button type="link" onClick={() => setInspect({ endpoint, version })}>Deploy Status</Button>}
      {version.configStatus === 'DRAFT' && <Button type="link" danger icon={<DeleteOutlined />} onClick={() => Modal.confirm({ title: 'Delete Capability Matching?', content: `Matching ID ${version.id} will be permanently deleted.`, okText: 'Delete', okButtonProps: { danger: true }, onOk: () => deleteVersion(channelCode, endpoint.id, version.id) })}>Delete</Button>}
    </Space>;
  };

  const expandedRowRender = (endpoint: InboundEndpoint) => (
    <Table<CapabilityDecisionVersion>
      rowKey="id"
      dataSource={endpoint.versions}
      pagination={false}
      size="small"
      columns={[
        { title: 'Matching ID', dataIndex: 'id', width: 190 },
        { title: 'Version', dataIndex: 'version', width: 135 },
        { title: 'Name', dataIndex: 'name', width: 260, render: (name, version) => <Space>{version.sourceType === 'legacy' && <Tag color="purple">Legacy 1.0</Tag>}<span>{name}</span></Space> },
        { title: 'Status', width: 220, render: (_, version) => renderStatus(version) },
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
          { title: 'URI', dataIndex: 'url', render: (uri, endpoint) => <Space><strong>{uri.startsWith(pathPrefix) ? uri.slice(pathPrefix.length) : uri}</strong>{endpoint.uriType === 'legacy' && <Tag color="purple">Legacy</Tag>}</Space> },
          { title: 'Business Type', dataIndex: 'businessTypes', width: 260, render: (businessTypes: string[]) => <Space wrap>{businessTypes.map((bt) => <Tag key={bt}>{bt}</Tag>)}</Space> },
          { title: 'Method', dataIndex: 'method', width: 120, render: (method) => <Tag color="blue">{method}</Tag> },
          { title: 'Operation', width: 360, render: (_, endpoint) => <Space><Button size="small" onClick={() => setManagingEndpoint(endpoint)}>Manage Business Type</Button><Button type="primary" size="small" onClick={() => { setNewVersionEndpoint(endpoint); versionForm.resetFields(); }}>New Matching Version</Button></Space> },
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

      <Modal title="New Matching Version" open={Boolean(newVersionEndpoint)} okText="Create and Configure" onOk={() => void handleNewVersion()} onCancel={() => { setNewVersionEndpoint(null); versionForm.resetFields(); }}>
        <Form form={versionForm} layout="vertical">
          <Form.Item name="name" label="Name" rules={[{ required: true, whitespace: true, message: 'Enter a name' }, { max: 32, message: 'Name cannot exceed 32 characters' }]}>
            <Input showCount maxLength={32} placeholder="e.g. Payment Callback Matching" />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="Deploy Capability Matching"
        open={Boolean(deploying)}
        okText="Deploy"
        okButtonProps={{ disabled: !deployCloud || !nextDeployEnvironment }}
        onCancel={() => { setDeploying(null); setDeployCloud(undefined); }}
        onOk={() => {
          if (!deploying || !deployCloud || !nextDeployEnvironment) return;
          deployVersion(channelCode, deploying.endpoint.id, deploying.version.id, deployCloud, nextDeployEnvironment);
          message.success(`Deployed to ${deployCloud} - ${nextDeployEnvironment}`);
          setDeploying(null);
          setDeployCloud(undefined);
        }}
      >
        <div style={{ display: 'grid', gridTemplateColumns: '150px 1fr', gap: '22px 12px', alignItems: 'center', padding: '16px 4px' }}>
          <div><span style={{ color: '#ff4d4f' }}>* </span>Cloud</div>
          <Select value={deployCloud} placeholder="Select Cloud" options={cloudOptions} onChange={setDeployCloud} />
          <div><span style={{ color: '#ff4d4f' }}>* </span>Current Status</div>
          <strong>{currentDeployStatus}</strong>
          <div><span style={{ color: '#ff4d4f' }}>* </span>Deploy to</div>
          <Select disabled value={nextDeployEnvironment} placeholder={currentDeployStatus === 'PROD' ? 'All environments deployed' : 'Select a Cloud first'} options={environmentOrder.map((value) => ({ value }))} />
        </div>
      </Modal>

      <Modal title="Manage Business Type" open={Boolean(managingEndpoint)} footer={null} onCancel={() => setManagingEndpoint(null)}>
        {managingEndpoint && <>
          <div style={{ color: '#8c8c8c', marginBottom: 12 }}>Add Config Integration Business Types. A Business Type used by any Capability Matching Version cannot be removed.</div>
          <Select
            mode="multiple"
            style={{ width: '100%' }}
            value={managingEndpoint.businessTypes}
            options={configBusinessTypes.map((value) => ({ value }))}
            onChange={(businessTypes) => {
              const usedBusinessTypes = new Set(managingEndpoint.versions.flatMap((version) => version.rules.map((rule) => rule.bt)).filter(Boolean));
              const blocked = [...usedBusinessTypes].find((bt) => !businessTypes.includes(bt));
              if (blocked) return void message.error(`${blocked} is used by a Capability Matching Version and cannot be removed.`);
              updateEndpoint(channelCode, managingEndpoint.id, { businessTypes, businessType: businessTypes[0] ?? '' });
              setManagingEndpoint({ ...managingEndpoint, businessTypes, businessType: businessTypes[0] ?? '' });
            }}
          />
          <div style={{ marginTop: 12 }}>{[...new Set(managingEndpoint.versions.flatMap((version) => version.rules.map((rule) => rule.bt)).filter(Boolean))].map((bt) => <Tag key={bt} color="orange">{bt} · In Use</Tag>)}</div>
        </>}
      </Modal>

      <Modal title="Deploy Status" width={900} open={Boolean(inspect)} footer={null} onCancel={() => setInspect(null)}>
        {inspect
          ? <div>
              <div style={{ marginBottom: 24 }}><strong>channel:</strong><span style={{ marginLeft: 12 }}>{channelCode}</span></div>
              <Space size={28} wrap style={{ marginBottom: 24 }}>
                <span><strong>version:</strong><Tag color="green" style={{ marginLeft: 10 }}>{inspect.version.version}</Tag></span>
                <span><strong>matchingId:</strong><span style={{ marginLeft: 10 }}>{inspect.version.id}</span></span>
                <span><strong>name:</strong><span style={{ marginLeft: 10 }}>{inspect.version.name}</span></span>
              </Space>
              <Table
                rowKey="cloud"
                pagination={false}
                dataSource={deployStatusRows}
                columns={[
                  { title: 'Cloud', dataIndex: 'cloud', width: 260 },
                  { title: 'Environment', render: (_, row) => <Space>{environmentOrder.map((env) => {
                    const record = inspect.version.deploymentRecords?.find((item) => item.version === inspect.version.version && item.cloud === row.cloud && item.env === env);
                    const tag = <Tag key={env} color={row.environments.has(env) ? 'green' : 'default'}>{env}</Tag>;
                    return record ? <Tooltip key={env} title={<><div>Operator: {record.operator}</div><div>Operation Time: {record.operationTime}</div></>}>{tag}</Tooltip> : tag;
                  })}</Space> },
                ]}
                locale={{ emptyText: 'No deployment record.' }}
              />
            </div>
          : null}
      </Modal>
    </div>
  );
}

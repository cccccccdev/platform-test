import { useMemo, useState } from 'react';
import { Badge, Breadcrumb, Button, Form, Input, message, Modal, Select, Space, Table, Tag, Tooltip } from 'antd';
import { DownOutlined, PlusOutlined, RightOutlined } from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import { nextMatchingId, useMatchCapabilityStore } from './matchCapabilityStore';
import type { CapabilityDecisionVersion, InboundEndpoint, UriConfigStatus } from './types';

interface NewInboundEndpointForm {
  path: string;
  method: InboundEndpoint['method'];
}

interface NewMatchingForm {
  description: string;
}

const statusMeta: Record<UriConfigStatus, { label: string; color: string }> = {
  UNDEPLOYED: { label: 'UNDEPLOYED', color: 'default' },
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
  const [matchingForm] = Form.useForm<NewMatchingForm>();
  const [showNewEndpoint, setShowNewEndpoint] = useState(false);
  const [newMatchingEndpoint, setNewMatchingEndpoint] = useState<InboundEndpoint | null>(null);
  const [cloneTarget, setCloneTarget] = useState<{ endpoint: InboundEndpoint; version: CapabilityDecisionVersion } | null>(null);
  const [cloneForm] = Form.useForm<NewMatchingForm>();
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [inspect, setInspect] = useState<{ endpoint: InboundEndpoint; version: CapabilityDecisionVersion } | null>(null);
  const [inspectVersion, setInspectVersion] = useState<string | null>(null);
  const [deploying, setDeploying] = useState<{ endpoint: InboundEndpoint; version: CapabilityDecisionVersion } | null>(null);
  const [deployCloud, setDeployCloud] = useState<string>();
  const endpointsByChannel = useMatchCapabilityStore((state) => state.endpointsByChannel);
  const endpoints = useMemo(() => endpointsByChannel[channelCode] ?? [], [channelCode, endpointsByChannel]);
  const addEndpoint = useMatchCapabilityStore((state) => state.addEndpoint);
  const createVersion = useMatchCapabilityStore((state) => state.createVersion);
  const cloneVersion = useMatchCapabilityStore((state) => state.cloneVersion);
  const deployVersion = useMatchCapabilityStore((state) => state.deployVersion);
  const deleteVersion = useMatchCapabilityStore((state) => state.deleteVersion);
  const discardVersionDraft = useMatchCapabilityStore((state) => state.discardVersionDraft);

  const pathPrefix = `/callback/${channelCode.toLowerCase()}/`;

  const openEditor = (endpoint: InboundEndpoint, version: CapabilityDecisionVersion, mode: 'config' | 'detail') => {
    navigate(`/channel-integration/${channelCode}/integration/config/route-matching/${endpoint.id}/versions/${version.id}?mode=${mode}`);
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
      remark: '',
      sourceType: 'v2',
      configStatus: 'UNDEPLOYED',
      fields: [],
      requestFields: [],
      matchType: 'single',
      singleNoField: '',
      matchFields: [],
      rules: [{ id: `result_${Date.now()}`, fieldValues: {}, bt: '', ability: '', action: '' }],
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
      method: values.method,
      uriType: 'new',
      description: '',
      fields: ['query.reference', 'header.x-event-type', 'body.reference', 'body.type', 'body.status'],
      matchType: 'single',
      singleNoField: '',
      matchFields: [],
      rules: [{ id: `result_${Date.now()}`, fieldValues: {}, bt: '', ability: '', action: '' }],
      customScript: 'def execute(request) {\n  return null\n}',
      fallbackBehavior: 'alert_and_reject',
      decryptEnabled: false,
      version: decisionVersion.version,
      configStatus: 'UNDEPLOYED',
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

  const handleNewMatching = async () => {
    if (!newMatchingEndpoint) return;
    const values = await matchingForm.validateFields();
    const version = createVersion(channelCode, newMatchingEndpoint.id, values.description);
    if (!version) return void message.warning('An undeployed Route Matching Version already exists.');
    const endpoint = newMatchingEndpoint;
    setNewMatchingEndpoint(null);
    matchingForm.resetFields();
    openEditor(endpoint, version, 'config');
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

  const handleClone = async () => {
    if (!cloneTarget) return;
    const values = await cloneForm.validateFields();
    const cloned = cloneVersion(channelCode, cloneTarget.endpoint.id, cloneTarget.version.id, values.description);
    if (!cloned) return;
    const endpoint = cloneTarget.endpoint;
    setCloneTarget(null);
    cloneForm.resetFields();
    openEditor(endpoint, cloned, 'config');
  };

  const currentDeployStatus = deployCloud && deploying
    ? environmentOrder.filter((env) => deploying.version.badges?.some((badge) => badge.cloud === deployCloud && badge.env === env)).at(-1) ?? 'UNDEPLOYED'
    : '-';
  const nextDeployEnvironment = currentDeployStatus === 'UNDEPLOYED' ? 'DAILY' : currentDeployStatus === 'DAILY' ? (deployCloud === 'ONELOOP' ? 'PROD' : 'PRE') : currentDeployStatus === 'PRE' ? 'PROD' : undefined;
  const inspectVersionOptions = inspect
    ? [...new Set([inspect.version.version, ...(inspect.version.deploymentRecords ?? []).map((record) => record.version)])]
      .sort((a, b) => b.localeCompare(a))
    : [];
  const selectedInspectVersion = inspectVersion ?? inspect?.version.version ?? '';
  const selectedInspectRecords = inspect?.version.deploymentRecords?.filter((record) => record.version === selectedInspectVersion) ?? [];
  const selectedInspectBadges = inspect && selectedInspectVersion === inspect.version.version && selectedInspectRecords.length === 0
    ? inspect.version.badges ?? []
    : [];
  const getInspectVersionStatus = (version: string) => {
    const environments = (inspect?.version.deploymentRecords ?? [])
      .filter((record) => record.version === version)
      .map((record) => record.env);
    if (version === inspect?.version.version && environments.length === 0) {
      environments.push(...(inspect.version.badges ?? []).map((badge) => badge.env));
    }
    if (environments.includes('PROD')) return 'PROD';
    if (environments.includes('PRE')) return 'PRE';
    if (environments.includes('DAILY')) return 'DAILY';
    return 'UNDEPLOYED';
  };
  const deployStatusClouds = [...new Set([
    ...selectedInspectRecords.map((record) => record.cloud),
    ...selectedInspectBadges.map((badge) => badge.cloud),
  ])];
  const deployStatusRows = deployStatusClouds.map((cloud) => ({
    cloud,
    environments: new Set([
      ...selectedInspectRecords.filter((record) => record.cloud === cloud).map((record) => record.env),
      ...selectedInspectBadges.filter((badge) => badge.cloud === cloud).map((badge) => badge.env),
    ]),
  }));

  const renderOperations = (endpoint: InboundEndpoint, version: CapabilityDecisionVersion) => {
    return <Space wrap className="route-matching-operation">
      {version.sourceType === 'v2' && version.configStatus === 'PROD' && <Button type="link" onClick={() => setCloneTarget({ endpoint, version })}>Clone</Button>}
      {version.configStatus === 'PROD' && <Button type="link" onClick={() => openEditor(endpoint, version, 'detail')}>Detail</Button>}
      {version.configStatus !== 'PROD' && (
        <Badge dot={Boolean(version.hasUnsubmittedDraft)} offset={[-1, 3]}>
          <Button type="link" onClick={() => openConfig(endpoint, version)}>Config</Button>
        </Badge>
      )}
      <Button type="link" onClick={() => openDeploy(endpoint, version)}>Deploy</Button>
      {version.configStatus !== 'UNDEPLOYED' && <Button type="link" onClick={() => { setInspect({ endpoint, version }); setInspectVersion(version.version); }}>Deploy Status</Button>}
      {version.configStatus === 'UNDEPLOYED' && <Button type="link" danger onClick={() => Modal.confirm({ title: 'Delete Route Matching?', content: `Matching ID ${version.id} will be permanently deleted.`, okText: 'Delete', okButtonProps: { danger: true }, onOk: () => deleteVersion(channelCode, endpoint.id, version.id) })}>Delete</Button>}
    </Space>;
  };

  const expandedRowRender = (endpoint: InboundEndpoint) => (
    <Table<CapabilityDecisionVersion>
      className="route-matching-version-table"
      rowKey="id"
      dataSource={endpoint.versions}
      pagination={false}
      size="small"
      columns={[
        { title: 'Matching ID', dataIndex: 'id', width: 190 },
        { title: 'Version', dataIndex: 'version', width: 135 },
        { title: 'Description', dataIndex: 'remark', render: (remark: string | undefined, version) => <Space>{version.sourceType === 'legacy' && <Tag color="purple">Legacy 1.0</Tag>}<span>{remark || '-'}</span></Space> },
        { title: 'Status', width: 130, render: (_, version) => renderStatus(version) },
        { title: 'Operator', dataIndex: 'operator', width: 100 },
        { title: 'Operation Time', dataIndex: 'updatedTime', width: 180 },
        { title: 'Operation', width: 360, render: (_, version) => renderOperations(endpoint, version) },
      ]}
    />
  );

  return (
    <div className="route-matching-page">
      <section className="route-matching-heading">
        <Breadcrumb items={[{ title: 'Channel List' }, { title: 'Config Integration' }, { title: 'Route Matching' }]} />
        <div className="route-matching-title-line">
          <h2>Route Matching</h2>
        </div>
      </section>

      <main className="route-matching-content">
        <div className="route-matching-toolbar">
          <span className="route-matching-channel">Channel: {channelCode}</span>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setShowNewEndpoint(true)}>New Inbound Endpoint</Button>
        </div>

        <Table<InboundEndpoint>
          className="route-matching-table"
          rowKey="id"
          dataSource={endpoints}
          pagination={false}
          expandable={{ expandedRowRender, expandedRowKeys: Array.from(expandedRows), showExpandColumn: false }}
          columns={[
            { title: '', width: 50, render: (_, endpoint) => <Button className="route-matching-expand" type="text" icon={expandedRows.has(endpoint.id) ? <DownOutlined /> : <RightOutlined />} onClick={() => toggleExpand(endpoint.id)} /> },
            { title: 'URI', dataIndex: 'url', render: (uri) => <strong>{uri.startsWith(pathPrefix) ? uri.slice(pathPrefix.length) : uri}</strong> },
            { title: 'Method', dataIndex: 'method', width: 160, render: (method) => <Tag color="blue">{method}</Tag> },
            { title: 'Operation', width: 220, render: (_, endpoint) => <Button type="link" onClick={() => setNewMatchingEndpoint(endpoint)}>New Matching</Button> },
          ]}
        />
      </main>

      <Modal title="New Inbound Endpoint" open={showNewEndpoint} okText="Create and Configure" onOk={() => void handleCreate()} onCancel={() => { setShowNewEndpoint(false); form.resetFields(); }}>
        <Form form={form} layout="vertical" initialValues={{ method: 'POST' }}>
          <Form.Item name="path" label="Path" rules={[{ required: true, message: 'Enter Path' }, { pattern: /^(?:[A-Za-z0-9_-]+|\{[A-Za-z_][A-Za-z0-9_]*\})(?:\/(?:[A-Za-z0-9_-]+|\{[A-Za-z_][A-Za-z0-9_]*\}))*$/, message: 'Use path segments or variables such as callback/{aa}' }]}>
            <Input addonBefore={pathPrefix} placeholder="payment_callback" />
          </Form.Item>
          <Form.Item name="method" label="Method" rules={[{ required: true }]}>
            <Select options={['POST', 'GET', 'PUT', 'DELETE'].map((value) => ({ value }))} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="New Matching"
        open={Boolean(newMatchingEndpoint)}
        okText="Create and Configure"
        onOk={() => void handleNewMatching()}
        onCancel={() => { setNewMatchingEndpoint(null); matchingForm.resetFields(); }}
      >
        <Form form={matchingForm} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item
            name="description"
            label="Description"
            rules={[
              { required: true, whitespace: true, message: 'Description is required' },
              { max: 200, message: 'Description cannot exceed 200 characters' },
            ]}
          >
            <Input.TextArea rows={4} maxLength={200} showCount placeholder="Describe the purpose or configuration of this Matching" />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="Clone Route Matching"
        open={Boolean(cloneTarget)}
        okText="Clone"
        onOk={() => void handleClone()}
        onCancel={() => { setCloneTarget(null); cloneForm.resetFields(); }}
      >
        {cloneTarget && <Space size={24} wrap style={{ marginBottom: 16 }}>
          <span><strong>Source Matching ID:</strong> {cloneTarget.version.id}</span>
          <span><strong>Source Version:</strong> {cloneTarget.version.version}</span>
          <span><strong>Endpoint:</strong> {cloneTarget.endpoint.method} {cloneTarget.endpoint.url}</span>
        </Space>}
        <Form form={cloneForm} layout="vertical">
          <Form.Item
            name="description"
            label="Description"
            rules={[
              { required: true, whitespace: true, message: 'Description is required' },
              { max: 200, message: 'Description cannot exceed 200 characters' },
            ]}
          >
            <Input.TextArea rows={4} maxLength={200} showCount placeholder="Enter a description for the cloned Matching" />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="Deploy Route Matching"
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

      <Modal title="Deploy Status" width={900} open={Boolean(inspect)} footer={null} onCancel={() => { setInspect(null); setInspectVersion(null); }}>
        {inspect
          ? <div>
              <Space size={28} wrap style={{ marginBottom: 20 }}>
                <span><strong>Channel:</strong> {channelCode}</span>
                <span><strong>URI:</strong> {inspect.endpoint.url}</span>
                <span><strong>Method:</strong> {inspect.endpoint.method}</span>
                <span><strong>Matching ID:</strong> {inspect.version.id}</span>
              </Space>
              <div style={{ display: 'grid', gridTemplateColumns: '120px minmax(260px, 420px)', gap: 16, alignItems: 'center', marginBottom: 20 }}>
                <strong>Version</strong>
                <Select
                  value={selectedInspectVersion}
                  onChange={setInspectVersion}
                  options={inspectVersionOptions.map((version) => ({
                    value: version,
                    label: (
                      <Space size={6}>
                        <span>{version} ({getInspectVersionStatus(version)})</span>
                        {version === inspect.version.version && <Tag color="blue">Current</Tag>}
                      </Space>
                    ),
                  }))}
                />
              </div>
              <Table
                rowKey="cloud"
                pagination={false}
                dataSource={deployStatusRows}
                columns={[
                  { title: 'Cloud', dataIndex: 'cloud', width: 260 },
                  { title: 'Environment', render: (_, row) => <Space>{environmentOrder.map((env) => {
                    const record = selectedInspectRecords.find((item) => item.cloud === row.cloud && item.env === env);
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

import { useMemo, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Checkbox,
  Empty,
  Form,
  Input,
  InputNumber,
  Modal,
  Space,
  Switch,
  Table,
  Tabs,
  Tag,
  Tooltip,
  message,
} from 'antd';
import { useLocation, useNavigate } from 'react-router-dom';
import { mockChannelInfoApplications, mockChannelPartyAccounts, mockChannels, mockCredentials } from '../../mock/data';
import { getCreatedIntegrationRecord } from './channelCreationStore';
import { parsePartyPath } from './channelInfoPartyRoute';
import type { InboundEndpoint } from './types';
import './ChannelInfoPartyPage.css';

type CredentialRow = { field: string; value: string };
type CredentialDraft = CredentialRow;
type RequestLineRow = {
  id: string;
  lineName: string;
  line: string;
  weight: number;
  operator: string;
  operationTime: string;
  enabled: boolean;
  skipSsl: boolean;
  enableProxy: boolean;
  proxyServer?: string;
  proxyPort?: number;
};

type NetworkRouteValues = {
  lineName: string;
  line: string;
  weight: number;
  skipSsl: boolean;
  enableProxy: boolean;
  proxyServer?: string;
  proxyPort?: number;
};

interface PartyPageProps {
  channelCode: string;
  cloud: string;
  env: string;
  routeMatchingEndpoints: InboundEndpoint[];
}

function initialRequestLines(channelCode: string): RequestLineRow[] {
  return [{
    id: 'primary',
    lineName: channelCode === 'EVEXIN' ? 'BasrUrl' : 'PRIMARY',
    line: channelCode === 'EVEXIN' ? 'https://api.evexin.com' : `https://api.${channelCode.toLowerCase().replaceAll('_', '-')}.com`,
    weight: 100,
    operator: channelCode === 'EVEXIN' ? 'Adeleye Adedolapo' : 'Zhang Wei',
    operationTime: channelCode === 'EVEXIN' ? '2026-06-26 08:55:57' : '2026-05-19 14:12:20',
    enabled: false,
    skipSsl: false,
    enableProxy: false,
  }];
}

function maskCredential(value: string) {
  if (!value) return '-';
  if (value.length < 5) return '•'.repeat(value.length);
  return `${value.slice(0, 2)}${'•'.repeat(Math.min(8, value.length - 4))}${value.slice(-2)}`;
}

function now() {
  return new Date().toLocaleString('sv-SE').replace('T', ' ').slice(0, 19);
}

export default function ChannelInfoPartyPage({ channelCode, cloud, env, routeMatchingEndpoints }: PartyPageProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const route = parsePartyPath(location.pathname);
  const basePath = `/channel-integration/${encodeURIComponent(channelCode)}/channel-info/party`;
  const environmentKey = `${channelCode}:${cloud}:${env}`;
  const [credentialRows, setCredentialRows] = useState<Record<string, CredentialRow[]>>({});
  const [credentialMeta, setCredentialMeta] = useState<Record<string, { validity: string; operator: string; operationTime: string }>>({});
  const [credentialOpen, setCredentialOpen] = useState(false);
  const [credentialForm] = Form.useForm<{ rows: CredentialDraft[]; validity: string; notStoredInKms: boolean }>();
  const [callbackRows, setCallbackRows] = useState<Record<string, Array<{ id: string; line: string }>>>({});
  const [callbackOpen, setCallbackOpen] = useState(false);
  const [callbackForm] = Form.useForm<{ line: string }>();
  const [callbackDetail, setCallbackDetail] = useState<string | null>(null);
  const [requestLineRows, setRequestLineRows] = useState<Record<string, RequestLineRow[]>>({});
  const [networkRouteOpen, setNetworkRouteOpen] = useState(false);
  const [editingNetworkRouteId, setEditingNetworkRouteId] = useState<string | null>(null);
  const [networkRouteForm] = Form.useForm<NetworkRouteValues>();
  const enableProxy = Form.useWatch('enableProxy', networkRouteForm);
  const [weightEditing, setWeightEditing] = useState(false);
  const [weightDraft, setWeightDraft] = useState<Record<string, number>>({});
  const seededRequestLines = useMemo(() => initialRequestLines(channelCode), [channelCode]);

  const parties = useMemo(() => {
    const integrationRecord = getCreatedIntegrationRecord(channelCode);
    const configured = integrationRecord?.partyScopes.map((item) => item.party) ?? [];
    const seeded = mockChannels.find((item) => item.code === channelCode)?.party ?? [];
    return Array.from(new Set(configured.length ? configured : seeded));
  }, [channelCode]);

  const accounts = useMemo(
    () => mockChannelPartyAccounts[`${channelCode}:${route.party}`] ?? [],
    [channelCode, route.party],
  );

  const credentialKey = `${environmentKey}:${route.party}:${route.account || 'party'}`;
  const defaultCredentials = useMemo<CredentialRow[]>(() => {
    return (mockCredentials[channelCode] ?? []).map((item, index) => ({
      field: item.key,
      value: index === 0 ? `${channelCode}-${route.party}-${route.account || 'party'}-${item.key}-value` : `${item.key}-${route.account || 'party'}-secret-value`,
    }));
  }, [channelCode, route.account, route.party]);
  const currentCredentials = credentialRows[credentialKey] ?? defaultCredentials;
  const meta = credentialMeta[credentialKey] ?? {
    validity: '2034-03-31',
    operator: 'Zhang Wei',
    operationTime: '2026-05-19 11:23:28',
  };

  const accountLineKey = `${environmentKey}:${route.party}:${route.account}`;
  const lineScopeKey = `${environmentKey}:${route.party}:${route.account || 'party'}`;
  const currentRequestLines = requestLineRows[lineScopeKey] ?? seededRequestLines;
  const application = mockChannelInfoApplications[environmentKey] ?? {
    applicationName: 'finance-switch-channel',
    hostSuffix: 'omnicore.com',
  };
  const generatedCallbackBase = `https://${application.applicationName}-${env.toLowerCase()}.${application.hostSuffix}/${route.party.toLowerCase()}`;
  const generatedPartyCallbackRows = [{ id: 'generated', line: generatedCallbackBase }];
  const currentCallbackRows = route.account
    ? callbackRows[accountLineKey] ?? []
    : generatedPartyCallbackRows;

  const publishedEndpoints = useMemo(() => routeMatchingEndpoints.filter((endpoint) => {
    const badges = [
      ...(endpoint.badges ?? []),
      ...(endpoint.versions ?? []).flatMap((version) => version.badges ?? []),
      ...(endpoint.versions ?? []).flatMap((version) => version.deploymentRecords ?? []),
    ];
    return badges.some((badge) => badge.cloud === cloud && badge.env === env);
  }), [cloud, env, routeMatchingEndpoints]);

  const go = (suffix = '') => navigate(`${basePath}${suffix}`);
  const openCredentialConfig = () => {
    credentialForm.setFieldsValue({
      rows: currentCredentials.map((row) => ({ ...row })),
      validity: meta.validity,
      notStoredInKms: true,
    });
    setCredentialOpen(true);
  };

  const saveCredential = async () => {
    const values = await credentialForm.validateFields();
    const rows = (values.rows ?? [])
      .filter((row) => row.field?.trim() || row.value?.trim())
      .map((row) => ({ field: row.field.trim(), value: row.value.trim() }));
    if (!rows.length || rows.some((row) => !row.field || !row.value)) {
      message.error('Complete at least one Credential Field and Credential Value.');
      return;
    }
    setCredentialRows((current) => ({ ...current, [credentialKey]: rows }));
    setCredentialMeta((current) => ({
      ...current,
      [credentialKey]: { validity: values.validity, operator: 'current.user', operationTime: now() },
    }));
    setCredentialOpen(false);
    message.success('Credential configuration saved');
  };

  const createCallbackLine = async () => {
    const { line } = await callbackForm.validateFields();
    setCallbackRows((current) => ({
      ...current,
      [accountLineKey]: [...(current[accountLineKey] ?? []), { id: `${Date.now()}`, line: line.trim() }],
    }));
    callbackForm.resetFields();
    setCallbackOpen(false);
    message.success('Callback line created');
  };

  const openAddNetworkRoute = () => {
    setEditingNetworkRouteId(null);
    networkRouteForm.setFieldsValue({ lineName: '', line: '', weight: 100, skipSsl: false, enableProxy: false, proxyServer: undefined, proxyPort: undefined });
    setNetworkRouteOpen(true);
  };

  const openConfigNetworkRoute = (row: RequestLineRow) => {
    setEditingNetworkRouteId(row.id);
    networkRouteForm.setFieldsValue({
      lineName: row.lineName,
      line: row.line,
      weight: row.weight,
      skipSsl: row.skipSsl,
      enableProxy: row.enableProxy,
      proxyServer: row.proxyServer,
      proxyPort: row.proxyPort,
    });
    setNetworkRouteOpen(true);
  };

  const saveNetworkRoute = async () => {
    const values = await networkRouteForm.validateFields();
    const next: RequestLineRow = {
      id: editingNetworkRouteId ?? `${Date.now()}`,
      ...values,
      operator: 'current.user',
      operationTime: now(),
      enabled: editingNetworkRouteId
        ? currentRequestLines.find((item) => item.id === editingNetworkRouteId)?.enabled ?? false
        : false,
    };
    setRequestLineRows((current) => ({
      ...current,
      [lineScopeKey]: editingNetworkRouteId
        ? currentRequestLines.map((item) => item.id === editingNetworkRouteId ? next : item)
        : [...currentRequestLines, next],
    }));
    setNetworkRouteOpen(false);
    message.success(editingNetworkRouteId ? 'Network route updated' : 'Network route added');
  };

  const startWeightChange = () => {
    setWeightDraft(Object.fromEntries(currentRequestLines.map((item) => [item.id, item.weight])));
    setWeightEditing(true);
  };

  const saveWeights = () => {
    setRequestLineRows((current) => ({
      ...current,
      [lineScopeKey]: currentRequestLines.map((item) => ({ ...item, weight: weightDraft[item.id] ?? item.weight, operator: 'current.user', operationTime: now() })),
    }));
    setWeightEditing(false);
    message.success('Network route weights saved');
  };

  const context = (
    <div className="party-page-context">
      {route.party && <span><strong>Party:</strong> {route.party}</span>}
      {route.account && <span><strong>Account:</strong> {route.account}</span>}
    </div>
  );

  const credentialPage = () => (
    <Card className="party-runtime-card">
      {context}
      <div className="party-credential-meta">
        <span>Validity Period: <Tag color="purple">{meta.validity}</Tag></span>
        <span>Operator: <strong>{meta.operator}</strong></span>
        <span>Operation Time: <strong>{meta.operationTime}</strong></span>
        <span>Approval Status: <b>-</b></span>
        <span>Approval Order Number: <b>-</b></span>
        <span>Approval Approver: <b>-</b></span>
        <Button type="primary" onClick={openCredentialConfig}>Config</Button>
      </div>
      <Table
        rowKey="field"
        dataSource={currentCredentials}
        locale={{ emptyText: <Empty description="No credential configured for this scope." /> }}
        pagination={{ pageSize: 10, showSizeChanger: true, showTotal: (total) => `Total ${total} items` }}
        columns={[
          { title: 'Credential Field', dataIndex: 'field', width: '38%' },
          { title: 'Credential Value', dataIndex: 'value', render: (value: string) => <span className="credential-secret">{maskCredential(value)}</span> },
        ]}
      />
    </Card>
  );

  const requestLineTable = (
    <Table
      rowKey="id"
      dataSource={currentRequestLines}
      pagination={false}
      scroll={{ x: 1120 }}
      columns={[
        { title: 'Line Name', dataIndex: 'lineName', width: 170 },
        { title: 'Line', dataIndex: 'line', width: 300 },
        { title: 'Weight', dataIndex: 'weight', width: 120, render: (weight: number, row: RequestLineRow) => weightEditing
          ? <InputNumber min={0} max={100} value={weightDraft[row.id]} onChange={(value) => setWeightDraft((current) => ({ ...current, [row.id]: value ?? 0 }))} />
          : weight },
        { title: 'Operator', dataIndex: 'operator', width: 150 },
        { title: 'Operation Time', dataIndex: 'operationTime', width: 190 },
        { title: 'Status', dataIndex: 'enabled', width: 100, render: (enabled: boolean) => <Switch checked={enabled} disabled /> },
        { title: 'Operation', width: 110, render: (_, row: RequestLineRow) => <Button type="link" onClick={() => openConfigNetworkRoute(row)}>Config</Button> },
      ]}
    />
  );

  const linePage = () => (
    <div className="party-line-shell">
      <Tabs
        defaultActiveKey="request"
        items={[
          {
            key: 'request',
            label: 'Request Line',
            children: <Card className="party-runtime-card party-line-card">
              {context}
              <Tabs items={[{
                key: 'sms',
                label: 'SMS',
                children: <>
                  <div className="party-line-actions">
                    {weightEditing ? <>
                      <Button onClick={() => setWeightEditing(false)}>Cancel</Button>
                      <Button type="primary" onClick={saveWeights}>Save</Button>
                    </> : <>
                      <Button type="primary" onClick={openAddNetworkRoute}>Add Network Route</Button>
                      <Button type="primary" onClick={startWeightChange}>Change Weight</Button>
                    </>}
                  </div>
                  {requestLineTable}
                </>,
              }]} />
            </Card>,
          },
          {
            key: 'callback',
            label: 'Callback Line',
            children: <Card className="party-runtime-card party-line-card">
              {context}
              {route.account && <div className="party-line-actions"><Button type="primary" onClick={() => setCallbackOpen(true)}>Create Line</Button></div>}
              <Table
                rowKey="id"
                dataSource={currentCallbackRows}
                pagination={{ pageSize: 10, showTotal: (total) => `Total ${total} items` }}
                locale={{ emptyText: <Empty description="No callback line configured for this account." /> }}
                columns={route.account
                  ? [{ title: 'Line', dataIndex: 'line' }]
                  : [
                    { title: 'Line', dataIndex: 'line' },
                    { title: 'Operation', width: 180, render: (_, row) => <Button type="link" onClick={() => setCallbackDetail(row.line)}>Detail</Button> },
                  ]}
              />
            </Card>,
          },
        ]}
      />
    </div>
  );

  let content;
  if (route.view === 'list') {
    content = <Card className="party-runtime-card party-list-card">
      <Table
        rowKey={(party) => party}
        dataSource={parties}
        locale={{ emptyText: <Empty description="No Party is configured for this Channel in Channel Integration." /> }}
        pagination={{ pageSize: 10, showSizeChanger: true, showTotal: (total) => `Total ${total} items` }}
        columns={[
          { title: 'Party', width: '34%', render: (party: string) => party },
          {
            title: 'Operation',
            render: (party: string) => {
              const hasAccounts = Boolean(mockChannelPartyAccounts[`${channelCode}:${party}`]?.length);
              return <Space size={4} wrap>
                <Button type="link" onClick={() => go(`/${encodeURIComponent(party)}/credential`)}>Credential</Button>
                <Button type="link" onClick={() => go(`/${encodeURIComponent(party)}/line`)}>Line</Button>
                <Tooltip title={hasAccounts ? undefined : 'Please create accounts in Channel Integration first.'}>
                  <span><Button type="link" disabled={!hasAccounts} onClick={() => go(`/${encodeURIComponent(party)}/accounts`)}>Accounts</Button></span>
                </Tooltip>
                <Button type="link" onClick={() => go(`/${encodeURIComponent(party)}/portal`)}>Portal</Button>
              </Space>;
            },
          },
        ]}
      />
    </Card>;
  } else if (route.view === 'credential' || route.view === 'account-credential') {
    content = credentialPage();
  } else if (route.view === 'line' || route.view === 'account-line') {
    content = linePage();
  } else if (route.view === 'accounts') {
    content = <Card className="party-runtime-card">
      {context}
      <Table
        rowKey="accountCode"
        dataSource={accounts}
        locale={{ emptyText: <Empty description="No account configured for this party. Please create accounts in Channel Integration first." /> }}
        pagination={{ pageSize: 10, showTotal: (total) => `Total ${total} items` }}
        columns={[
          { title: 'Account', dataIndex: 'accountCode', width: '45%' },
          { title: 'Operation', render: (_, row) => <Space size={4}>
            <Button type="link" onClick={() => go(`/${encodeURIComponent(route.party)}/accounts/${encodeURIComponent(row.accountCode)}/credential`)}>Credential</Button>
            <Button type="link" onClick={() => go(`/${encodeURIComponent(route.party)}/accounts/${encodeURIComponent(row.accountCode)}/line`)}>Line</Button>
          </Space> },
        ]}
      />
    </Card>;
  } else {
    content = <Card className="party-runtime-card">
      {context}
      <Alert
        type="info"
        showIcon
        message="Portal remains on the production 1.0 experience"
        description="The reference workspace contains the Portal entry but no restored Portal page or interaction. This page is intentionally left as a reviewable placeholder until production screenshots are provided."
      />
    </Card>;
  }

  return <>
    {content}

    <Modal title="Config Credential" open={credentialOpen} onCancel={() => setCredentialOpen(false)} onOk={() => void saveCredential()} okText="Save" width={760} destroyOnHidden>
      <div className="credential-modal-context"><strong>Party:</strong> {route.party}{route.account && <><strong>Account:</strong> {route.account}</>}</div>
      <Form form={credentialForm} layout="vertical">
        <Form.List name="rows">
          {(fields) => <>
            <div className="credential-modal-grid credential-modal-head"><span>Credential Field</span><span>Credential Value</span><span /></div>
            {fields.map((field) => <div className="credential-modal-grid" key={field.key}>
                <Form.Item name={[field.name, 'field']} rules={[{ required: true, message: 'Enter Credential Field' }]}><Input disabled /></Form.Item>
                <Form.Item name={[field.name, 'value']} rules={[{ required: true, message: 'Enter Credential Value' }]}><Input.Password visibilityToggle /></Form.Item>
                <span />
              </div>)}
          </>}
        </Form.List>
        <Form.Item name="validity" label="Credential Value Validity Period" rules={[{ required: true }]} style={{ marginTop: 24 }}><Input type="date" /></Form.Item>
        <Form.Item name="notStoredInKms" valuePropName="checked"><Checkbox>not stored in KMS</Checkbox></Form.Item>
      </Form>
    </Modal>

    <Modal title="Create Line" open={callbackOpen} onCancel={() => setCallbackOpen(false)} onOk={() => void createCallbackLine()} okText="Create" destroyOnHidden>
      <Form form={callbackForm} layout="vertical" style={{ marginTop: 20 }}><Form.Item name="line" label="Line" rules={[{ required: true }, { type: 'url', message: 'Enter a valid URL' }]}><Input placeholder="https://callback.example.com/path" /></Form.Item></Form>
    </Modal>

    <Modal title="Line Detail" open={Boolean(callbackDetail)} onCancel={() => setCallbackDetail(null)} footer={null} width={1000}>
      <Table
        className="callback-detail-table"
        rowKey="id"
        dataSource={publishedEndpoints}
        locale={{ emptyText: <Empty description="No Route Matching Endpoint is published to the selected Cloud and Environment." /> }}
        pagination={{ pageSize: 10 }}
        columns={[
          { title: 'Endpoint', dataIndex: 'url', width: '30%' },
          { title: 'URL', dataIndex: 'url', render: (endpoint: string) => `${callbackDetail?.replace(/\/$/, '')}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}` },
          { title: 'Operation', width: 140, render: (_, endpoint: InboundEndpoint) => {
            const url = `${callbackDetail?.replace(/\/$/, '')}${endpoint.url.startsWith('/') ? endpoint.url : `/${endpoint.url}`}`;
            return <Button type="link" onClick={() => void navigator.clipboard.writeText(url).then(() => message.success('URL copied'))}>Copy</Button>;
          } },
        ]}
      />
    </Modal>

    <Modal
      title={editingNetworkRouteId ? 'Config Network Route' : 'Add Network Route'}
      open={networkRouteOpen}
      onCancel={() => setNetworkRouteOpen(false)}
      onOk={() => void saveNetworkRoute()}
      okText="OK"
      width={760}
      destroyOnHidden
      className="network-route-modal"
    >
      <Form form={networkRouteForm} labelCol={{ span: 7 }} wrapperCol={{ span: 14 }} style={{ marginTop: 30 }}>
        <Form.Item name="lineName" label="Line Name" rules={[{ required: true }]}><Input disabled={Boolean(editingNetworkRouteId)} /></Form.Item>
        <Form.Item label="Line" required>
          <Space.Compact block>
            <Form.Item name="line" noStyle rules={[{ required: true }, { type: 'url', message: 'Enter a valid URL' }]}><Input /></Form.Item>
            <Form.Item name="skipSsl" valuePropName="checked" noStyle><Checkbox className="network-route-skip-ssl">Skip SSL</Checkbox></Form.Item>
          </Space.Compact>
        </Form.Item>
        <Form.Item name="weight" label="Weight" rules={[{ required: true }]}><InputNumber min={0} max={100} style={{ width: '100%' }} /></Form.Item>
        <Form.Item name="enableProxy" label="Enable Proxy" valuePropName="checked"><Switch /></Form.Item>
        {enableProxy && <>
          <Form.Item name="proxyServer" label="Proxy - Server" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="proxyPort" label="Proxy - Port" rules={[{ required: true }]}><InputNumber min={1} max={65535} style={{ width: '100%' }} /></Form.Item>
        </>}
      </Form>
    </Modal>
  </>;
}

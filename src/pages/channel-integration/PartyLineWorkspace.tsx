import { useMemo, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Empty,
  Form,
  Input,
  InputNumber,
  Modal,
  Select,
  Space,
  Switch,
  Table,
  Tabs,
  Tag,
  Typography,
  message,
} from 'antd';
import { DownOutlined, RightOutlined } from '@ant-design/icons';
import { mockChannelInfoApplications } from '../../mock/data';
import { useChannelScopeStore, type OutboundEndpoint } from './channelScopeStore';
import { useConfigIntegrationStore } from './configIntegrationStore';
import type { InboundEndpoint } from './types';
import { channelLineScopeKey, initialSharedLines, useChannelLineStore, type LineReference, type SharedLine } from './channelInfoPartyLines';
import ChannelSharedLines from './ChannelSharedLines';

const { Text } = Typography;

type RouteEntry = { lineId: string; weight: number; enabled: boolean };
type EndpointSpecificConfiguration = { timeout: number; routes: RouteEntry[]; everActivated: boolean; operator: string; operationTime: string };
type RoutingConfiguration = { endpointConfigurations: Record<string, EndpointSpecificConfiguration> };

type PublishedEndpoint = OutboundEndpoint & {
  sourceGroups: string[];
  publishedVersion: string;
};

type PathGroup = {
  key: string;
  path: string;
  methods: string[];
  endpointIds: string[];
};

type RoutingOwner = 'party' | 'account';
type RoutingTarget = { kind: 'path'; group: PathGroup; owner: RoutingOwner };

interface Props {
  channelCode: string;
  cloud: string;
  env: string;
  party: string;
  account?: string;
  routeMatchingEndpoints: InboundEndpoint[];
}

function now() {
  return new Date().toLocaleString('sv-SE').replace('T', ' ').slice(0, 19);
}

function redistributeIntegerWeights(routes: RouteEntry[]): Map<string, number> {
  const enabled = routes.filter((route) => route.enabled);
  const total = enabled.reduce((sum, route) => sum + route.weight, 0);
  if (!enabled.length) return new Map();
  if (total <= 0) return new Map(enabled.map((route, index) => [route.lineId, index === 0 ? 100 : 0]));

  const allocations = enabled.map((route) => {
    const exact = route.weight / total * 100;
    return { lineId: route.lineId, original: route.weight, fraction: exact - Math.floor(exact), weight: Math.floor(exact) };
  });
  const ranked = [...allocations].sort((left, right) =>
    right.fraction - left.fraction || right.original - left.original || left.lineId.localeCompare(right.lineId));
  const remainder = 100 - allocations.reduce((sum, item) => sum + item.weight, 0);
  for (let index = 0; index < remainder; index += 1) ranked[index % ranked.length].weight += 1;
  return new Map(allocations.map((item) => [item.lineId, item.weight]));
}

function initialRouting(channelCode: string, endpoints: PublishedEndpoint[]): RoutingConfiguration {
  const endpointConfigurations: Record<string, EndpointSpecificConfiguration> = {};
  for (const endpoint of endpoints) {
    const routes = channelCode === 'EVEXIN' && endpoint.id === 'endpoint_evexin_query_status'
      ? [{ lineId: 'evexin-status', weight: 100, enabled: true }]
      : channelCode === 'EVEXIN'
        ? [
            { lineId: 'evexin-primary', weight: 75, enabled: true },
            { lineId: 'evexin-secondary', weight: 25, enabled: true },
          ]
        : [{ lineId: 'primary', weight: 100, enabled: true }];
    endpointConfigurations[endpoint.id] = {
      timeout: channelCode === 'EVEXIN' && endpoint.id === 'endpoint_evexin_query_status' ? 8000 : 10000,
      routes,
      everActivated: true,
      operator: channelCode === 'EVEXIN' ? 'Bailly' : 'current.user',
      operationTime: '2026-09-09 09:30:00',
    };
  }
  return { endpointConfigurations };
}

function collectPublishedEndpoints(
  endpoints: OutboundEndpoint[],
  abilities: ReturnType<typeof useConfigIntegrationStore.getState>['abilitiesByChannel'][string] | undefined,
  cloud: string,
  env: string,
): PublishedEndpoint[] {
  const references = new Map<string, { groups: Set<string>; version: string }>();
  for (const ability of abilities ?? []) {
    for (const group of ability.versions) {
      const published = group.deployRecords.some((record) => record.cloud === cloud && record.env === env && record.version === group.version)
        || group.badges.some((badge) => badge.cloud === cloud && badge.env === env);
      if (!published) continue;
      for (const flow of group.flows) {
        for (const node of flow.canvasNodes ?? []) {
          const endpointId = typeof node.config?.endpointId === 'string' ? node.config.endpointId : undefined;
          if (!endpointId) continue;
          const snapshotVersion = group.resourceVersions?.endpoints?.[endpointId];
          if (!snapshotVersion) continue;
          const current = references.get(endpointId) ?? { groups: new Set<string>(), version: snapshotVersion };
          current.groups.add(`${ability.bt} / ${ability.ability} / Group ${group.groupId}`);
          references.set(endpointId, current);
        }
      }
    }
  }
  return endpoints
    .filter((endpoint) => references.has(endpoint.id))
    .map((endpoint) => {
      const reference = references.get(endpoint.id)!;
      return { ...endpoint, sourceGroups: [...reference.groups], publishedVersion: reference.version };
    });
}

function initialAccountLine(channelCode: string, account: string): SharedLine[] {
  return [{
    id: `account_${account}_primary`,
    lineName: `${account} Primary`,
    line: channelCode === 'EVEXIN' ? 'https://api.evexin.com' : `https://api.${channelCode.toLowerCase().replaceAll('_', '-')}.com`,
    skipSsl: false,
    enableProxy: false,
    operator: 'Zhang Wei',
    operationTime: '2026-05-19 14:12:20',
  }];
}

function initialAccountRouting(endpoints: PublishedEndpoint[], lines: SharedLine[]): RoutingConfiguration {
  const firstLine = lines[0];
  return {
    endpointConfigurations: Object.fromEntries(endpoints.map((endpoint) => [endpoint.id, {
      timeout: 10000,
      routes: firstLine ? [{ lineId: firstLine.id, weight: 100, enabled: true }] : [],
      everActivated: Boolean(firstLine),
      operator: 'Zhang Wei',
      operationTime: '2026-05-19 14:12:20',
    }])),
  };
}

export default function PartyLineWorkspace({ channelCode, cloud, env, party, account, routeMatchingEndpoints }: Props) {
  const lineScopeKey = channelLineScopeKey(channelCode, cloud, env, party, account);
  const storedLines = useChannelLineStore((state) => state.linesByScope[lineScopeKey]);
  const setLines = useChannelLineStore((state) => state.setLines);
  const lines = storedLines ?? (account ? initialAccountLine(channelCode, account) : initialSharedLines(channelCode));
  const allOutboundEndpoints = useChannelScopeStore((state) => state.outboundEndpointsByChannel[channelCode] ?? []);
  const abilities = useConfigIntegrationStore((state) => state.abilitiesByChannel[channelCode]);
  const publishedEndpoints = useMemo(
    () => collectPublishedEndpoints(allOutboundEndpoints, abilities, cloud, env),
    [abilities, allOutboundEndpoints, cloud, env],
  );
  const pathGroups = useMemo<PathGroup[]>(() => {
    const groups = new Map<string, PathGroup>();
    for (const endpoint of publishedEndpoints) {
      const current = groups.get(endpoint.path) ?? { key: endpoint.path, path: endpoint.path, methods: [], endpointIds: [] };
      if (!current.methods.includes(endpoint.method)) current.methods.push(endpoint.method);
      current.endpointIds.push(endpoint.id);
      groups.set(endpoint.path, current);
    }
    return [...groups.values()];
  }, [publishedEndpoints]);
  const scopeKey = `${channelCode}:${cloud}:${env}:${party}`;
  const [routingByScope, setRoutingByScope] = useState<Record<string, RoutingConfiguration>>({});
  const routing = routingByScope[scopeKey] ?? initialRouting(channelCode, publishedEndpoints);
  const [expandedPathRows, setExpandedPathRows] = useState<string[]>(() => pathGroups.map((group) => group.key));
  const [weightTarget, setWeightTarget] = useState<RoutingTarget | null>(null);
  const [weightOpen, setWeightOpen] = useState(false);
  const [weightDraft, setWeightDraft] = useState<Record<string, number>>({});
  const [associateTarget, setAssociateTarget] = useState<RoutingTarget | null>(null);
  const [associateLineId, setAssociateLineId] = useState<string>();
  const [timeoutTarget, setTimeoutTarget] = useState<RoutingTarget | null>(null);
  const [timeoutForm] = Form.useForm<{ timeout: number }>();
  const [manageLinesOpen, setManageLinesOpen] = useState(false);
  const [callbackRows, setCallbackRows] = useState<Record<string, Array<{ id: string; line: string }>>>({});
  const [callbackOpen, setCallbackOpen] = useState(false);
  const [callbackForm] = Form.useForm<{ line: string }>();
  const [callbackDetail, setCallbackDetail] = useState<string | null>(null);
  const [accountRoutingByScope, setAccountRoutingByScope] = useState<Record<string, RoutingConfiguration>>({});

  const application = mockChannelInfoApplications[`${channelCode}:${cloud}:${env}`] ?? {
    applicationName: 'finance-switch-channel',
    hostSuffix: 'omnicore.com',
  };
  const callbackKey = `${scopeKey}:${account ?? 'party'}`;
  const generatedCallbackBase = `https://${application.applicationName}-${env.toLowerCase()}.${application.hostSuffix}/${party.toLowerCase()}`;
  const callbackData = account ? callbackRows[callbackKey] ?? [] : [{ id: 'generated', line: generatedCallbackBase }];
  const accountLineKey = `${scopeKey}:${account ?? ''}`;
  const accountRouting = accountRoutingByScope[accountLineKey] ?? initialAccountRouting(publishedEndpoints, lines);

  const saveRouting = (next: RoutingConfiguration) => setRoutingByScope((current) => ({ ...current, [scopeKey]: next }));
  const enabledRoutes = (routes: RouteEntry[]) => routes.filter((route) => route.enabled);
  const routingForOwner = (owner: RoutingOwner) => owner === 'account' ? accountRouting : routing;
  const linesForOwner = (_owner: RoutingOwner) => lines;
  const pathSpecific = (group: PathGroup, owner: RoutingOwner) => group.endpointIds
    .map((endpointId) => routingForOwner(owner).endpointConfigurations[endpointId])
    .find(Boolean);
  const pathRoutes = (group: PathGroup, owner: RoutingOwner) => pathSpecific(group, owner)?.routes ?? [];
  const missingCountFor = (owner: RoutingOwner) => pathGroups.filter((group) => enabledRoutes(pathRoutes(group, owner)).length === 0).length;

  const routesForTarget = (target: RoutingTarget) => pathRoutes(target.group, target.owner);
  const everActivatedForTarget = (target: RoutingTarget) => pathSpecific(target.group, target.owner)?.everActivated ?? enabledRoutes(routesForTarget(target)).length > 0;

  const persistTarget = (target: RoutingTarget, routes: RouteEntry[], everActivated: boolean) => {
    const currentRouting = routingForOwner(target.owner);
    const next = { ...currentRouting.endpointConfigurations };
    for (const endpointId of target.group.endpointIds) next[endpointId] = {
      timeout: pathSpecific(target.group, target.owner)?.timeout ?? 10000,
      routes: routes.map((route) => ({ ...route })),
      everActivated,
      operator: 'current.user',
      operationTime: now(),
    };
    const nextRouting = { ...currentRouting, endpointConfigurations: next };
    if (target.owner === 'account') {
      setAccountRoutingByScope((current) => ({ ...current, [accountLineKey]: nextRouting }));
    } else {
      saveRouting(nextRouting);
    }
  };

  const toggleTargetLine = (target: RoutingTarget, lineId: string, nextEnabled: boolean) => {
    const routes = routesForTarget(target);
    const active = enabledRoutes(routes);
    const everActivated = everActivatedForTarget(target);
    if (!nextEnabled && everActivated && active.length <= 1) {
      message.error('At least one Line must remain enabled after this configuration has been activated.');
      return;
    }
    let next = routes.map((route) => {
      if (route.lineId === lineId) {
        return { ...route, enabled: nextEnabled, weight: nextEnabled && active.length === 0 ? 100 : nextEnabled ? route.weight : 0 };
      }
      return route;
    });
    if (!nextEnabled) {
      const redistributed = redistributeIntegerWeights(next);
      next = next.map((route) => route.enabled ? { ...route, weight: redistributed.get(route.lineId) ?? 0 } : route);
    }
    persistTarget(target, next, everActivated || nextEnabled);
    message.success(nextEnabled ? 'Line enabled' : 'Line disabled');
  };

  const openWeightEditor = (target: RoutingTarget) => {
    const active = enabledRoutes(routesForTarget(target));
    if (!active.length) {
      message.error('Enable a Line before changing Weight.');
      return;
    }
    setWeightTarget(target);
    setWeightDraft(Object.fromEntries(active.map((route) => [route.lineId, route.weight])));
    setWeightOpen(true);
  };

  const saveWeights = () => {
    if (!weightTarget) return;
    const routes = routesForTarget(weightTarget);
    const active = enabledRoutes(routes);
    const weights = active.map((route) => Number(weightDraft[route.lineId] ?? 0));
    if (weights.some((weight) => !Number.isInteger(weight) || weight < 0 || weight > 100)) {
      message.error('Weight must be an integer between 0 and 100.');
      return;
    }
    const total = weights.reduce((sum, weight) => sum + weight, 0);
    if (total !== 100) {
      message.error('The total Weight of enabled Lines must equal 100%.');
      return;
    }
    const next = routes.map((route) => route.enabled ? { ...route, weight: Number(weightDraft[route.lineId] ?? 0) } : route);
    persistTarget(weightTarget, next, everActivatedForTarget(weightTarget));
    setWeightOpen(false);
    setWeightTarget(null);
    message.success('Line weights updated');
  };

  const availableLinesFor = (target: RoutingTarget) => {
    const associatedIds = new Set(routesForTarget(target).map((route) => route.lineId));
    return linesForOwner(target.owner).filter((line) => !associatedIds.has(line.id));
  };

  const openAssociateLine = (target: RoutingTarget) => {
    setAssociateTarget(target);
    setAssociateLineId(undefined);
  };

  const associateLine = () => {
    if (!associateTarget || !associateLineId) {
      message.error('Select a Line to associate.');
      return;
    }
    const routes = routesForTarget(associateTarget);
    const next = [...routes, { lineId: associateLineId, weight: 0, enabled: false }];
    persistTarget(associateTarget, next, everActivatedForTarget(associateTarget));
    setExpandedPathRows((rows) => rows.includes(associateTarget.group.key) ? rows : [...rows, associateTarget.group.key]);
    setAssociateTarget(null);
    setAssociateLineId(undefined);
    message.success('Line associated with configuration');
  };

  const openTimeoutEditor = (target: RoutingTarget) => {
    setTimeoutTarget(target);
    timeoutForm.setFieldsValue({ timeout: pathSpecific(target.group, target.owner)?.timeout ?? 10000 });
  };

  const saveTimeout = async () => {
    if (!timeoutTarget) return;
    const { timeout } = await timeoutForm.validateFields();
    const currentRouting = routingForOwner(timeoutTarget.owner);
    const nextConfigurations = { ...currentRouting.endpointConfigurations };
    for (const endpointId of timeoutTarget.group.endpointIds) {
      const current = nextConfigurations[endpointId];
      if (current) nextConfigurations[endpointId] = { ...current, timeout, operator: 'current.user', operationTime: now() };
    }
    const nextRouting = { ...currentRouting, endpointConfigurations: nextConfigurations };
    if (timeoutTarget.owner === 'account') setAccountRoutingByScope((current) => ({ ...current, [accountLineKey]: nextRouting }));
    else saveRouting(nextRouting);
    setTimeoutTarget(null);
    message.success('Timeout updated');
  };

  const createCallbackLine = async () => {
    const { line } = await callbackForm.validateFields();
    setCallbackRows((current) => ({ ...current, [callbackKey]: [...(current[callbackKey] ?? []), { id: `${Date.now()}`, line: line.trim() }] }));
    callbackForm.resetFields();
    setCallbackOpen(false);
    message.success('Callback line created');
  };

  const renderLineTable = (target: RoutingTarget) => {
    const routes = routesForTarget(target);
    const associatedLines = routes
      .map((route) => linesForOwner(target.owner).find((line) => line.id === route.lineId))
      .filter((line): line is SharedLine => Boolean(line));
    return <Table<SharedLine>
      className="party-path-line-table"
      rowKey="id"
      size="small"
      pagination={false}
      dataSource={associatedLines}
      locale={{ emptyText: <Empty description="No Line associated with this configuration." /> }}
      columns={[
        { title: 'Line Name', dataIndex: 'lineName', width: 240 },
        { title: 'Line', dataIndex: 'line', render: (value: string) => <Text>{value}</Text> },
        { title: 'Weight', width: 180, render: (_: unknown, line: SharedLine) => {
          const route = routes.find((item) => item.lineId === line.id) ?? { lineId: line.id, weight: 0, enabled: false };
          return <span className="party-line-weight">{route.weight}%</span>;
        } },
        { title: 'Status', width: 150, render: (_: unknown, line: SharedLine) => {
          const route = routes.find((item) => item.lineId === line.id) ?? { lineId: line.id, weight: 0, enabled: false };
          return <Switch checked={route.enabled} onChange={(enabled) => toggleTargetLine(target, line.id, enabled)} />;
        } },
      ]}
    />;
  };

  const callbackPage = <Card className="party-runtime-card party-line-card">
    <div className="party-page-context"><span><strong>Party:</strong> {party}</span>{account && <span><strong>Account:</strong> {account}</span>}</div>
    {account && <div className="party-line-actions"><Button type="primary" onClick={() => setCallbackOpen(true)}>Create Line</Button></div>}
    <Table
      rowKey="id"
      dataSource={callbackData}
      pagination={{ pageSize: 10, showTotal: (total) => `Total ${total} items` }}
      locale={{ emptyText: <Empty description="No callback line configured for this account." /> }}
      columns={account
        ? [{ title: 'Line', dataIndex: 'line' }]
        : [
            { title: 'Line', dataIndex: 'line' },
            { title: 'Operation', width: 180, render: (_: unknown, row: { line: string }) => <Button type="link" onClick={() => setCallbackDetail(row.line)}>Detail</Button> },
          ]}
    />
  </Card>;

  const routingOwner: RoutingOwner = account ? 'account' : 'party';
  const missingCount = missingCountFor(routingOwner);
  const activeReferences: LineReference[] = pathGroups.flatMap((group) => {
    const configuration = pathSpecific(group, routingOwner);
    return (configuration?.routes ?? [])
      .filter((route) => route.enabled)
      .map((route) => ({ lineId: route.lineId, party, account, path: group.path }));
  });
  const requestLinePage = <Card className="party-runtime-card party-line-card">
    <div className="party-request-line-header">
      <div className="party-page-context"><span><strong>Party:</strong> {party}</span>{account && <span><strong>Account:</strong> {account}</span>}</div>
      <Button type="primary" className="party-manage-lines-button" onClick={() => setManageLinesOpen(true)}>Manage Lines</Button>
    </div>
    <Alert
      type="info"
      showIcon
      message={account
        ? 'Each Endpoint must have its own Account Line configuration. Account Lines are isolated by Account, and runtime requests fail when an Endpoint has no enabled Line.'
        : 'Each Endpoint must have its own Line configuration. Runtime requests fail when an Endpoint has no enabled Line.'}
    />
    {missingCount > 0 && <Alert type="error" showIcon message={`${missingCount} Endpoint${missingCount > 1 ? 's have' : ' has'} no enabled Line.`} />}
    <Table<PathGroup>
      rowKey="key"
      dataSource={pathGroups}
      locale={{ emptyText: <Empty description={`No outbound Endpoint is published to ${cloud} / ${env}.`} /> }}
      pagination={false}
      columns={[
        { title: '', width: 50, render: (_: unknown, group: PathGroup) => pathSpecific(group, routingOwner) ? <Button type="text" icon={expandedPathRows.includes(group.key) ? <DownOutlined /> : <RightOutlined />} onClick={() => setExpandedPathRows((rows) => rows.includes(group.key) ? rows.filter((key) => key !== group.key) : [...rows, group.key])} /> : null },
        { title: 'Endpoint', dataIndex: 'path', render: (value: string) => <Text>{value}</Text> },
        { title: 'Method', dataIndex: 'methods', width: 180, render: (methods: string[]) => <Space wrap>{methods.map((method) => <Tag color="geekblue" key={method}>{method}</Tag>)}</Space> },
        { title: 'Timeout', width: 130, render: (_: unknown, group: PathGroup) => `${pathSpecific(group, routingOwner)?.timeout ?? 10000} ms` },
        { title: 'Operation', width: 330, render: (_: unknown, group: PathGroup) => <Space size="small">
          <Button type="link" size="small" onClick={() => openAssociateLine({ kind: 'path', group, owner: routingOwner })}>Associate Line</Button>
          <Button type="link" size="small" disabled={!enabledRoutes(pathRoutes(group, routingOwner)).length} onClick={() => openWeightEditor({ kind: 'path', group, owner: routingOwner })}>Weight Config</Button>
          <Button type="link" size="small" onClick={() => openTimeoutEditor({ kind: 'path', group, owner: routingOwner })}>Timeout Config</Button>
        </Space> },
      ]}
      expandable={{
        expandedRowRender: (group) => pathSpecific(group, routingOwner) ? renderLineTable({ kind: 'path', group, owner: routingOwner }) : null,
        expandedRowKeys: expandedPathRows.filter((key) => pathGroups.some((group) => group.key === key && Boolean(pathSpecific(group, routingOwner)))),
        showExpandColumn: false,
      }}
    />
  </Card>;

  function renderCallbackModals() {
    return <>
      <Modal title="Create Line" open={callbackOpen} onCancel={() => setCallbackOpen(false)} onOk={() => void createCallbackLine()} okText="Create" destroyOnHidden>
        <Form form={callbackForm} layout="vertical" style={{ marginTop: 20 }}><Form.Item name="line" label="Line" rules={[{ required: true }, { type: 'url', message: 'Enter a valid URL' }]}><Input placeholder="https://callback.example.com/path" /></Form.Item></Form>
      </Modal>
      <Modal title="Line Detail" open={Boolean(callbackDetail)} onCancel={() => setCallbackDetail(null)} footer={null} width={1000}>
        <Table
          className="callback-detail-table"
          rowKey="id"
          dataSource={routeMatchingEndpoints.filter((endpoint) => {
            const badges = [...(endpoint.badges ?? []), ...(endpoint.versions ?? []).flatMap((version) => [...(version.badges ?? []), ...(version.deploymentRecords ?? [])])];
            return badges.some((badge) => badge.cloud === cloud && badge.env === env);
          })}
          locale={{ emptyText: <Empty description="No Route Matching Endpoint is published to the selected Cloud and Environment." /> }}
          pagination={{ pageSize: 10 }}
          columns={[
            { title: 'Endpoint', dataIndex: 'url', width: '30%' },
            { title: 'URL', dataIndex: 'url', render: (endpoint: string) => `${callbackDetail?.replace(/\/$/, '')}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}` },
            { title: 'Operation', width: 140, render: (_: unknown, endpoint: InboundEndpoint) => {
              const url = `${callbackDetail?.replace(/\/$/, '')}${endpoint.url.startsWith('/') ? endpoint.url : `/${endpoint.url}`}`;
              return <Button type="link" onClick={() => void navigator.clipboard.writeText(url).then(() => message.success('URL copied'))}>Copy</Button>;
            } },
          ]}
        />
      </Modal>
    </>;
  }

  return <div className="party-line-shell">
    <Tabs defaultActiveKey="routing" items={[
      { key: 'routing', label: 'Request Line', children: requestLinePage },
      { key: 'callback', label: 'Callback Line', children: callbackPage },
    ]} />

    <Modal title="Weight Config" open={weightOpen} onCancel={() => { setWeightOpen(false); setWeightTarget(null); }} onOk={saveWeights} okText="Save" width={720} destroyOnHidden>
      <Alert type="info" showIcon message="Only enabled Lines are shown. Their configured Weight must total 100%." style={{ marginBottom: 16 }} />
      <Table
        rowKey="lineId"
        pagination={false}
        dataSource={weightTarget ? enabledRoutes(routesForTarget(weightTarget)) : []}
        columns={[
          { title: 'Line', render: (_: unknown, route: RouteEntry) => weightTarget ? linesForOwner(weightTarget.owner).find((line) => line.id === route.lineId)?.lineName ?? 'Missing Line' : 'Missing Line' },
          { title: 'Weight', width: 220, render: (_: unknown, route: RouteEntry) => <InputNumber min={0} max={100} precision={0} step={1} addonAfter="%" value={weightDraft[route.lineId]} onChange={(weight) => setWeightDraft((current) => ({ ...current, [route.lineId]: Number(weight ?? 0) }))} style={{ width: '100%' }} /> },
        ]}
      />
    </Modal>
    <Modal title="Associate Line" open={Boolean(associateTarget)} onCancel={() => { setAssociateTarget(null); setAssociateLineId(undefined); }} onOk={associateLine} okText="Associate" width={620} destroyOnHidden>
      <Alert type="info" showIcon message="Select a Line maintained in the current scope. The new association starts with Status off and Weight 0." style={{ marginBottom: 18 }} />
      <Select
        value={associateLineId}
        onChange={setAssociateLineId}
        placeholder="Select Line"
        style={{ width: '100%' }}
        options={(associateTarget ? availableLinesFor(associateTarget) : []).map((line) => ({ value: line.id, label: `${line.lineName} — ${line.line}` }))}
      />
    </Modal>
    <Modal title="Timeout Config" open={Boolean(timeoutTarget)} onCancel={() => setTimeoutTarget(null)} onOk={() => void saveTimeout()} okText="Save" width={560} destroyOnHidden>
      {timeoutTarget && <>
        <div className="credential-modal-context">
          <span><strong>Endpoint:</strong> {timeoutTarget.group.path}</span>
        </div>
        <Form form={timeoutForm} layout="vertical">
          <Form.Item name="timeout" label="Timeout" rules={[{ required: true }, { type: 'integer', min: 1, message: 'Timeout must be a positive integer.' }]}>
            <InputNumber min={1} precision={0} step={1} addonAfter="ms" style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </>}
    </Modal>
    <Modal title="Manage Lines" open={manageLinesOpen} onCancel={() => setManageLinesOpen(false)} footer={null} width={1180} destroyOnHidden>
      <div className="credential-modal-context">
        <span><strong>Party:</strong> {party}</span>
        {account && <span><strong>Account:</strong> {account}</span>}
      </div>
      <ChannelSharedLines
        lines={lines}
        references={activeReferences}
        onChange={(next) => setLines(lineScopeKey, next)}
      />
    </Modal>
    {renderCallbackModals()}
  </div>;
}

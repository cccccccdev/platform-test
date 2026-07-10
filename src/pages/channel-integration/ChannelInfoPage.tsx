import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Breadcrumb,
  Button,
  Cascader,
  Card,
  Descriptions,
  Drawer,
  Form,
  Input,
  InputNumber,
  Layout,
  Menu,
  Modal,
  Select,
  Space,
  Switch,
  Table,
  Tag,
  Typography,
  message,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { DownOutlined, EyeOutlined, LockOutlined, RightOutlined, UnlockOutlined } from '@ant-design/icons';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { capabilityActionOptions } from '../../mock/data';
import { useConfigIntegrationStore } from './configIntegrationStore';
import { useMatchCapabilityStore } from './matchCapabilityStore';
import type { CapabilityDecisionVersion, ConfigAbility, FlowGroupVersion, InboundEndpoint, InboundRequestField } from './types';
import StateMachinePreviewModal, { NO_STATE_MACHINE, isNoStateMachine } from './StateMachinePreviewModal';
import CanvasContextPanel from './CanvasContextPanel';
import InboundPreprocessDrawer from './InboundPreprocessDrawer';
import { ConditionNodeDrawer } from './ConditionConfigurationDrawer';
import HttpCallDrawer from './HttpCallDrawer';
import { InboundRequestDrawer, InboundResponseDrawer } from './InboundComponentDrawer';

const { Content, Sider } = Layout;
const { Text } = Typography;

type MainState = 'INIT' | 'PENDING' | 'TO_BE_VERIFY' | 'SUCCESS' | 'FAIL';
type PageKey = 'external-internal' | 'internal-external' | 'requery' | 'runtime-route-matching' | 'runtime-flow-groups';
type DetailView = { type: 'event'; record: ExternalRecord } | { type: 'approval'; record: ExternalRecord; approval?: ExternalApprovalRequest };
type Source = 'httpCall' | 'Route Matching';
type ResponseCodeType = 'ALL' | 'Include' | 'Exclude';

const pageKeyFromPath = (pathname: string): PageKey => {
  if (pathname.includes('/channel-info/runtime-control/route-matching')) return 'runtime-route-matching';
  if (pathname.includes('/channel-info/runtime-control/flow-groups')) return 'runtime-flow-groups';
  return 'external-internal';
};

interface PathCapability {
  path: string;
  source: Source;
  bt: string;
  ability?: string;
  flowGroups: string[];
}

interface ExternalRecord {
  id: string;
  path: string;
  source: Source;
  bt: string;
  ability: string;
  channelResponseCode: string;
  channelDescription: string;
  subState: string;
  mainState: MainState;
  responseCode: string;
}

interface ExternalApprovalRequest {
  id: string;
  recordId: string;
  description: string;
  subState: string;
  mainState: MainState;
  responseCode?: string;
  reason: string;
  operator: string;
  operationTime: string;
  approvalStatus: 'Approved' | 'Rejected' | 'In Progress';
}

interface EventOperation {
  id: string;
  recordId: string;
  eventType: 'Closing Order' | 'Approval';
  operator: string;
  operateTime: string;
  enabled: boolean;
}

interface InternalRecord {
  id: string;
  path: string;
  bt: string;
  ability: string;
  subState: string;
  mainState: MainState;
  responseCode: string;
  description: string;
  channelStatus?: string;
  channelResponseCode?: string;
  channelResponseMessage?: string;
}

interface RequeryStrategy {
  id: string;
  bt: string;
  ability: string;
  action: string;
  strategyName: string;
  frequency: number;
  durationMin: number;
  durationMax: number;
  subState: string;
  mainState: MainState;
  type: ResponseCodeType;
  responseCodes: string[];
  requeryFlow: string;
  triggerSubState: string;
  operator: string;
  operationTime: string;
  enabled: boolean;
}

interface RuntimeHistoryTarget {
  kind: 'Route Matching' | 'Flow Groups';
  title: string;
  targetId?: string;
  context: Array<{ label: string; value: string | number }>;
  weight: number;
  enabled: boolean;
}

interface TimeoutTarget {
  label: string;
  paths: Array<{ id: string; path: string; timeout: number; source: string }>;
}

type RuntimeConfigTarget = { kind: 'matching'; endpoint: InboundEndpoint } | { kind: 'group'; ability: ConfigAbility };
type RuntimeDetailView =
  | { kind: 'route-matching'; endpoint: InboundEndpoint; version: CapabilityDecisionVersion }
  | { kind: 'flow-group'; ability: ConfigAbility; group: FlowGroupVersion }
  | { kind: 'flow-canvas'; ability: ConfigAbility; group: FlowGroupVersion; flowId: string };

interface RuntimeDraftItem {
  enabled: boolean;
  weight: number;
}

interface RuntimeApproval {
  id: string;
  kind: 'matching' | 'group';
  targetId: string;
  reason: string;
  operator: string;
  operationTime: string;
  approvalStatus: 'In Progress' | 'Approved' | 'Rejected';
  changes: Array<{ id: string; enabled: boolean; weight: number }>;
}

interface RuntimeComponentDetail {
  title: string;
  componentCode: string;
  source: 'route-matching' | 'flow';
  data: Record<string, unknown>;
  endpointPath?: string;
  pathVariables?: string[];
  requestFields?: CapabilityDecisionVersion['requestFields'];
  conditionBranches?: Array<{ name: string; target: string; summary: string }>;
  endCurrentFlow?: boolean;
}

type RuntimeNodeCard = Omit<RuntimeComponentDetail, 'source'> & {
  id: string;
  source: RuntimeComponentDetail['source'];
  subtitle?: string;
};

const pathCapabilities: PathCapability[] = [
  { path: '/api/msg/v2/sendMsg', source: 'httpCall', bt: 'SMS', ability: 'SINGLE_MESSAGE', flowGroups: ['EVEXIN / Group 526 / SMS_SINGLE_MESSAGE_TRANSACTION'] },
  { path: '/callback/evexin/sms/status', source: 'Route Matching', bt: 'SMS', ability: 'SINGLE_MESSAGE', flowGroups: ['EVEXIN / Route Matching / SMS Status Callback'] },
  { path: '/callback/evexin/sms/status', source: 'Route Matching', bt: 'SMS', ability: 'BULK_MESSAGE', flowGroups: ['EVEXIN / Route Matching / SMS Status Callback'] },
  { path: '/test/path', source: 'httpCall', bt: 'WALLET_DEBIT', ability: 'TRANSFER', flowGroups: ['Group 1 / Flow 1', 'Group 1 / Flow 2'] },
  { path: '/test/path', source: 'httpCall', bt: 'SETTLEMENT_ACCOUNT', ability: 'BALANCE_QUERY', flowGroups: ['Group 2 / Flow 3'] },
  { path: '/callback/payment', source: 'Route Matching', bt: 'FUND_NOTIFICATION', ability: 'PAYMENT_NOTIFY', flowGroups: ['Route Matching / Payment Callback'] },
  { path: '/callback/financial-resource', source: 'Route Matching', bt: 'FUND_NOTIFICATION', ability: 'BILL_QUERY_NOTIFY', flowGroups: ['Route Matching / Resource Callback'] },
];

const internalPathCapabilities: PathCapability[] = pathCapabilities.filter((item) => item.source === 'Route Matching');

const subStates: Array<{ value: string; mainState: MainState }> = [
  { value: 'SUBMITTED', mainState: 'PENDING' },
  { value: 'DELIVERED', mainState: 'SUCCESS' },
  { value: 'FAILED', mainState: 'FAIL' },
  { value: 'PAYMENT_PENDING_WAIT_CALLBACK', mainState: 'PENDING' },
  { value: 'PAYMENT_PENDING_WAIT_REQUERY', mainState: 'PENDING' },
  { value: 'PAYMENT_SUCCESS', mainState: 'SUCCESS' },
  { value: 'PAYMENT_FAILED_BY_CHANNEL', mainState: 'FAIL' },
  { value: 'BALANCE_QUERY_SUCCESS', mainState: 'SUCCESS' },
  { value: 'BALANCE_QUERY_FAILED', mainState: 'FAIL' },
  { value: 'BILL_QUERY_SUCCESS', mainState: 'SUCCESS' },
  { value: 'BILL_QUERY_FAILED', mainState: 'FAIL' },
];

const legacyNoStateMachineSubStates: Array<{ value: string; mainState: MainState }> = [
  { value: 'PENDING', mainState: 'PENDING' },
  { value: 'TO_BE_VERIFY', mainState: 'TO_BE_VERIFY' },
  { value: 'SUCCESS', mainState: 'SUCCESS' },
  { value: 'FAIL', mainState: 'FAIL' },
];

const responseCodesByState: Record<MainState, Array<{ label: string; value: string }>> = {
  INIT: [{ label: '61000000 - Initialized', value: '61000000' }],
  PENDING: [
    { label: '61000004 - Transaction in progress', value: '61000004' },
    { label: '61000003 - Pending', value: '61000003' },
    { label: '61000016 - Channel exception: Retrying', value: '61000016' },
    { label: '62000006 - Request timeout, re-query pending', value: '62000006' },
  ],
  TO_BE_VERIFY: [{ label: '61000004 - To be verified', value: '61000004' }],
  SUCCESS: [{ label: '61000001 - Success', value: '61000001' }],
  FAIL: [
    { label: '61000002 - Failure due to unknown reasons', value: '61000002' },
    { label: '65000003 - The requested phone number is invalid', value: '65000003' },
    { label: '62000001 - Internal processing error', value: '62000001' },
    { label: '63000036 - Bill found, no outstanding payment', value: '63000036' },
    { label: '63000009 - Bill not found', value: '63000009' },
  ],
};

const initialExternalRecords: ExternalRecord[] = [
  { id: 'evexin-send-pending', path: '/api/msg/v2/sendMsg', source: 'httpCall', bt: 'SMS', ability: 'SINGLE_MESSAGE', channelResponseCode: '200#0000#PENDING', channelDescription: 'success', subState: 'SUBMITTED', mainState: 'PENDING', responseCode: '61000004' },
  { id: 'evexin-send-failed-status', path: '/api/msg/v2/sendMsg', source: 'httpCall', bt: 'SMS', ability: 'SINGLE_MESSAGE', channelResponseCode: '200#0000#FAILED', channelDescription: 'success', subState: 'FAILED', mainState: 'FAIL', responseCode: '61000002' },
  { id: 'evexin-send-failed-code', path: '/api/msg/v2/sendMsg', source: 'httpCall', bt: 'SMS', ability: 'SINGLE_MESSAGE', channelResponseCode: '200#9999#', channelDescription: 'failed', subState: 'FAILED', mainState: 'FAIL', responseCode: '61000002' },
  { id: 'evexin-send-invalid-phone', path: '/api/msg/v2/sendMsg', source: 'httpCall', bt: 'SMS', ability: 'SINGLE_MESSAGE', channelResponseCode: '200#6001008#', channelDescription: 'failed', subState: 'FAILED', mainState: 'FAIL', responseCode: '65000003' },
  { id: 'evexin-callback-pending', path: '/callback/evexin/sms/status', source: 'Route Matching', bt: 'SMS', ability: 'SINGLE_MESSAGE', channelResponseCode: 'PENDING', channelDescription: '处理中', subState: 'SUBMITTED', mainState: 'PENDING', responseCode: '61000004' },
  { id: 'evexin-callback-delivered', path: '/callback/evexin/sms/status', source: 'Route Matching', bt: 'SMS', ability: 'SINGLE_MESSAGE', channelResponseCode: 'DELIVERED', channelDescription: '已送达', subState: 'DELIVERED', mainState: 'SUCCESS', responseCode: '61000001' },
  { id: 'evexin-callback-undelivered', path: '/callback/evexin/sms/status', source: 'Route Matching', bt: 'SMS', ability: 'SINGLE_MESSAGE', channelResponseCode: 'UNDELIVERED', channelDescription: '未送达', subState: 'FAILED', mainState: 'FAIL', responseCode: '61000002' },
  { id: 'evexin-callback-reject', path: '/callback/evexin/sms/status', source: 'Route Matching', bt: 'SMS', ability: 'SINGLE_MESSAGE', channelResponseCode: 'REJECT', channelDescription: '拒绝接收', subState: 'FAILED', mainState: 'FAIL', responseCode: '61000002' },
  { id: 'evexin-callback-failed', path: '/callback/evexin/sms/status', source: 'Route Matching', bt: 'SMS', ability: 'SINGLE_MESSAGE', channelResponseCode: 'FAILED', channelDescription: '失败', subState: 'FAILED', mainState: 'FAIL', responseCode: '61000002' },
  { id: 'evexin-callback-expire', path: '/callback/evexin/sms/status', source: 'Route Matching', bt: 'SMS', ability: 'SINGLE_MESSAGE', channelResponseCode: 'EXPIRE', channelDescription: '过期', subState: 'FAILED', mainState: 'FAIL', responseCode: '61000002' },
  { id: 'ext-1', path: '/test/path', source: 'httpCall', bt: 'SETTLEMENT_ACCOUNT', ability: 'BALANCE_QUERY', channelResponseCode: '200#', channelDescription: 'SUCCESS', subState: 'BALANCE_QUERY_SUCCESS', mainState: 'SUCCESS', responseCode: '61000001' },
  { id: 'ext-2', path: '/test/path', source: 'httpCall', bt: 'SETTLEMENT_ACCOUNT', ability: 'BALANCE_QUERY', channelResponseCode: '400#INTERNAL_PROCESSING_ERROR', channelDescription: 'INTERNAL_PROCESSING_ERROR', subState: 'BALANCE_QUERY_FAILED', mainState: 'FAIL', responseCode: '62000001' },
  { id: 'ext-3', path: '/test/path', source: 'httpCall', bt: 'WALLET_DEBIT', ability: 'TRANSFER', channelResponseCode: '202#PROCESSING', channelDescription: 'PROCESSING', subState: 'PAYMENT_PENDING_WAIT_CALLBACK', mainState: 'PENDING', responseCode: '61000003' },
  { id: 'ext-4', path: '/callback/payment', source: 'Route Matching', bt: 'FUND_NOTIFICATION', ability: 'PAYMENT_NOTIFY', channelResponseCode: 'SUCCESS', channelDescription: 'Callback success notification', subState: 'PAYMENT_SUCCESS', mainState: 'SUCCESS', responseCode: '61000001' },
];

const initialInternalRecords: InternalRecord[] = [
  { id: 'int-1', path: '/callback/financial-resource', bt: 'FUND_NOTIFICATION', ability: 'BILL_QUERY_NOTIFY', subState: 'BILL_QUERY_SUCCESS', mainState: 'SUCCESS', responseCode: '61000001', description: 'Unpaid bill found', channelResponseCode: '101', channelResponseMessage: 'Unpaid bill found' },
  { id: 'int-2', path: '/callback/financial-resource', bt: 'FUND_NOTIFICATION', ability: 'BILL_QUERY_NOTIFY', subState: 'BILL_QUERY_FAILED', mainState: 'FAIL', responseCode: '63000036', description: 'Bill found, but no outstanding payment', channelResponseCode: '102', channelResponseMessage: 'Bill found, but no outstanding payment' },
  { id: 'int-3', path: '/callback/payment', bt: 'FUND_NOTIFICATION', ability: 'PAYMENT_NOTIFY', subState: 'PAYMENT_PENDING_WAIT_CALLBACK', mainState: 'PENDING', responseCode: '61000003', description: 'Pending', channelStatus: 'PENDING', channelResponseCode: 'PENDING', channelResponseMessage: 'Pending' },
];

const initialEventOperations: EventOperation[] = [
  { id: 'evt-1', recordId: 'ext-1', eventType: 'Closing Order', operator: 'admin', operateTime: '2026-07-07 15:31:22', enabled: true },
];

const initialRequeryStrategies: RequeryStrategy[] = [
  {
    id: 'rq-1',
    bt: 'WALLET_DEBIT',
    ability: 'TRANSFER',
    action: 'TRANSACTION',
    strategyName: 'REQUERY STRATEGY',
    frequency: 6,
    durationMin: 5,
    durationMax: 3600,
    subState: 'PAYMENT_PENDING_WAIT_CALLBACK',
    mainState: 'PENDING',
    type: 'ALL',
    responseCodes: [],
    requeryFlow: 'Wallet Debit Requery Flow',
    triggerSubState: 'PAYMENT_PENDING_WAIT_CALLBACK',
    operator: 'gufengrong',
    operationTime: '2026-03-19 15:05:25',
    enabled: true,
  },
  {
    id: 'rq-2',
    bt: 'WALLET_DEBIT',
    ability: 'TRANSFER',
    action: 'VERIFY',
    strategyName: 'VERIFY OTP REQUERY',
    frequency: 60,
    durationMin: 3601,
    durationMax: 14400,
    subState: 'PAYMENT_PENDING_WAIT_REQUERY',
    mainState: 'PENDING',
    type: 'Include',
    responseCodes: ['61000003', '62000006'],
    requeryFlow: 'Wallet Debit Verify Requery Flow',
    triggerSubState: 'PAYMENT_PENDING_WAIT_REQUERY',
    operator: 'gufengrong',
    operationTime: '2026-03-19 15:04:52',
    enabled: false,
  },
];

const fileRows = [
  { id: 'file-1', fileName: 'response_code_mapping_20260706.xlsx', type: 'Upload', operator: 'Amina Yusuf', operationTime: '2026-07-06 16:22:18' },
  { id: 'file-2', fileName: 'response_code_export_20260706.xlsx', type: 'Download', operator: 'admin', operationTime: '2026-07-06 16:40:02' },
];

function unique<T>(items: T[]) {
  return Array.from(new Set(items));
}

function businessTypesForEndpoint(endpoint: InboundEndpoint) {
  return unique([
    ...(endpoint.businessTypes ?? []),
    ...(endpoint.businessType ? [endpoint.businessType] : []),
    ...endpoint.rules.map((rule) => rule.bt),
    ...endpoint.versions.flatMap((version) => version.rules.map((rule) => rule.bt)),
  ].filter(Boolean));
}

function mainStateForSubState(subState?: string): MainState | undefined {
  return [...subStates, ...legacyNoStateMachineSubStates].find((item) => item.value === subState)?.mainState;
}

function subStatesForCapability(_channelCode: string, bt?: string, ability?: string) {
  if (!bt || !ability) return [];
  if (isLegacyNoStateMachineCapability(bt, ability)) {
    return legacyNoStateMachineSubStates;
  }
  if (bt === 'SETTLEMENT_ACCOUNT' && ability === 'BALANCE_QUERY') {
    return subStates.filter((item) => item.value.startsWith('BALANCE_QUERY_'));
  }
  if (bt === 'FUND_NOTIFICATION' && ability === 'BILL_QUERY_NOTIFY') {
    return subStates.filter((item) => item.value.startsWith('BILL_QUERY_'));
  }
  if (bt === 'FUND_NOTIFICATION' && ability === 'PAYMENT_NOTIFY') {
    return subStates.filter((item) => item.value.startsWith('PAYMENT_'));
  }
  if (bt === 'SMS' && ability === 'SINGLE_MESSAGE') {
    return subStates.filter((item) => ['SUBMITTED', 'DELIVERED', 'FAILED'].includes(item.value));
  }
  return subStates;
}

function endpointOptionsFrom(items: PathCapability[]) {
  const outbound = unique(items.filter((item) => item.source === 'httpCall').map((item) => item.path))
    .map((path) => ({ label: path, value: path }));
  const inbound = unique(items.filter((item) => item.source === 'Route Matching').map((item) => item.path))
    .map((path) => ({ label: path, value: path }));
  return [
    { label: 'Outbound Endpoints [httpCall]', options: outbound },
    { label: 'Inbound Endpoints [Route Matching]', options: inbound },
  ].filter((group) => group.options.length > 0);
}

function mainStateColor(value: MainState) {
  if (value === 'SUCCESS') return 'green';
  if (value === 'FAIL') return 'red';
  if (value === 'PENDING') return 'gold';
  if (value === 'TO_BE_VERIFY') return 'purple';
  return 'default';
}

function isLegacyNoStateMachineCapability(bt?: string, ability?: string) {
  return bt === 'SETTLEMENT_ACCOUNT' && ability === 'BALANCE_QUERY';
}

function valueOptions(values: string[]) {
  return values.map((value) => ({ label: value, value }));
}

const requestFieldSourceLabels: Record<InboundRequestField['source'], string> = {
  path: 'Path Variables',
  query: 'Query Parameters',
  header: 'Headers',
  body: 'Body',
};

const buildRequestFieldCascaderOptions = (requestFields: InboundRequestField[]) =>
  (Object.entries(requestFieldSourceLabels) as Array<[InboundRequestField['source'], string]>).map(([source, label]) => ({
    label,
    value: source,
    isLeaf: false,
    children: requestFields
      .filter((field) => field.source === source)
      .map((field) => ({ label: field.name, value: field.name })),
  }));

function fallbackRequeryFlowName(bt: string, ability: string, action: string) {
  return `${bt} ${ability} ${action} Requery Flow`.replaceAll('_', ' ');
}

export default function ChannelInfoPage() {
  const { channelCode = 'MTN_UG' } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [pageKey, setPageKey] = useState<PageKey>(() => pageKeyFromPath(location.pathname));
  const [cloud, setCloud] = useState<string>();
  const [env, setEnv] = useState<string>();
  const [applied, setApplied] = useState<{ cloud: string; env: string } | null>(null);
  const [externalRecords, setExternalRecords] = useState<ExternalRecord[]>(initialExternalRecords);
  const [internalRecords, setInternalRecords] = useState<InternalRecord[]>(initialInternalRecords);
  const [eventOperations, setEventOperations] = useState<EventOperation[]>(initialEventOperations);
  const [detailView, setDetailView] = useState<DetailView | null>(null);
  const [requeryStrategies, setRequeryStrategies] = useState<RequeryStrategy[]>(initialRequeryStrategies);
  const [createOpen, setCreateOpen] = useState(false);
  const [eventCreateOpen, setEventCreateOpen] = useState(false);
  const [requeryOpen, setRequeryOpen] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [fileListOpen, setFileListOpen] = useState(false);
  const [externalHistory, setExternalHistory] = useState<ExternalRecord | null>(null);
  const [internalHistory, setInternalHistory] = useState<InternalRecord | null>(null);
  const [editingExternal, setEditingExternal] = useState<ExternalRecord | null>(null);
  const [editingInternal, setEditingInternal] = useState<InternalRecord | null>(null);
  const [editingRequery, setEditingRequery] = useState<RequeryStrategy | null>(null);
  const [subStateLocked, setSubStateLocked] = useState(false);
  const [previewStateMachine, setPreviewStateMachine] = useState<string | null>(null);
  const [approvalOpen, setApprovalOpen] = useState(false);
  const [pendingExternalValues, setPendingExternalValues] = useState<{
    description: string;
    subState: string;
    mainState: MainState;
    responseCode?: string;
  } | null>(null);
  const [approvalRequests, setApprovalRequests] = useState<ExternalApprovalRequest[]>([]);
  const [runtimeHistory, setRuntimeHistory] = useState<RuntimeHistoryTarget | null>(null);
  const [timeoutTarget, setTimeoutTarget] = useState<TimeoutTarget | null>(null);
  const [matchingWeights, setMatchingWeights] = useState<Record<string, number>>({});
  const [groupWeights, setGroupWeights] = useState<Record<string, number>>({});
  const [matchingSwitches, setMatchingSwitches] = useState<Record<string, boolean>>({});
  const [groupSwitches, setGroupSwitches] = useState<Record<string, boolean>>({});
  const [expandedRouteMatchingRows, setExpandedRouteMatchingRows] = useState<string[]>([]);
  const [expandedFlowGroupRows, setExpandedFlowGroupRows] = useState<string[]>([]);
  const [runtimeConfigTarget, setRuntimeConfigTarget] = useState<RuntimeConfigTarget | null>(null);
  const [runtimeDraft, setRuntimeDraft] = useState<Record<string, RuntimeDraftItem>>({});
  const [pendingRuntimeDraft, setPendingRuntimeDraft] = useState<{ target: RuntimeConfigTarget; draft: Record<string, RuntimeDraftItem> } | null>(null);
  const [runtimeApprovalOpen, setRuntimeApprovalOpen] = useState(false);
  const [runtimeApprovals, setRuntimeApprovals] = useState<RuntimeApproval[]>([]);
  const [runtimeDetailView, setRuntimeDetailView] = useState<RuntimeDetailView | null>(null);
  const [runtimeComponentDetail, setRuntimeComponentDetail] = useState<RuntimeComponentDetail | null>(null);
  const [selectedRequeryBt, setSelectedRequeryBt] = useState('WALLET_DEBIT');
  const [selectedRequeryAbility, setSelectedRequeryAbility] = useState('TRANSFER');
  const [selectedRequeryAction, setSelectedRequeryAction] = useState('TRANSACTION');
  const [form] = Form.useForm();
  const [searchForm] = Form.useForm();
  const [bulkForm] = Form.useForm();
  const [eventForm] = Form.useForm<{ eventType: EventOperation['eventType'] }>();
  const [approvalForm] = Form.useForm<{ reason: string }>();
  const [requeryForm] = Form.useForm();
  const [timeoutForm] = Form.useForm();
  const [runtimeApprovalForm] = Form.useForm<{ reason: string }>();
  const endpointsByChannel = useMatchCapabilityStore((state) => state.endpointsByChannel);
  const abilitiesByChannel = useConfigIntegrationStore((state) => state.abilitiesByChannel);
  const selectedPath = Form.useWatch('path', form);
  const selectedBt = Form.useWatch('bt', form);
  const selectedAbility = Form.useWatch('ability', form);
  const selectedSubState = Form.useWatch('subState', form);
  const searchEndpoint = Form.useWatch('endpoint', searchForm);
  const searchBt = Form.useWatch('bt', searchForm);
  const searchAbility = Form.useWatch('ability', searchForm);
  const searchSubState = Form.useWatch('subState', searchForm);
  const selectedSearchMainState = Form.useWatch('mainState', searchForm);
  const bulkEndpoint = Form.useWatch('endpoint', bulkForm);
  const bulkBt = Form.useWatch('bt', bulkForm);
  const selectedRequerySubState = Form.useWatch('subState', requeryForm);
  const selectedRequeryType = Form.useWatch('type', requeryForm);
  const currentMainState = mainStateForSubState(selectedSubState);
  const currentRequeryMainState = mainStateForSubState(selectedRequerySubState);
  const isExternal = pageKey === 'external-internal';
  const isInternal = pageKey === 'internal-external';
  const isRequery = pageKey === 'requery';
  const isRuntimeRouteMatching = pageKey === 'runtime-route-matching';
  const isRuntimeFlowGroups = pageKey === 'runtime-flow-groups';

  useEffect(() => {
    setPageKey(pageKeyFromPath(location.pathname));
  }, [location.pathname]);

  const externalEndpointOptions = useMemo(() => endpointOptionsFrom(pathCapabilities), []);
  const internalEndpointOptions = useMemo(() => endpointOptionsFrom(internalPathCapabilities), []);
  const routeMatchingEndpoints = useMemo(() => endpointsByChannel[channelCode] ?? [], [channelCode, endpointsByChannel]);
  const flowGroupAbilities = useMemo(() => abilitiesByChannel[channelCode] ?? [], [abilitiesByChannel, channelCode]);

  const externalBtOptions = useMemo(() => unique(pathCapabilities.filter((item) => item.path === selectedPath).map((item) => item.bt)).map((value) => ({ label: value, value })), [selectedPath]);
  const externalAbilityOptions = useMemo(() => unique(pathCapabilities.filter((item) => item.path === selectedPath && item.bt === selectedBt).map((item) => item.ability).filter(Boolean)).map((value) => ({ label: value, value })), [selectedBt, selectedPath]);
  const internalBtOptions = useMemo(() => unique(internalPathCapabilities.filter((item) => item.path === selectedPath).map((item) => item.bt)).map((value) => ({ label: value, value })), [selectedPath]);
  const internalAbilityOptions = useMemo(() => unique(internalPathCapabilities.filter((item) => item.path === selectedPath && item.bt === selectedBt).map((item) => item.ability).filter(Boolean)).map((value) => ({ label: value, value })), [selectedBt, selectedPath]);
  const searchBtOptions = useMemo(() => unique((isExternal ? pathCapabilities : internalPathCapabilities).filter((item) => item.path === searchEndpoint).map((item) => item.bt)).map((value) => ({ label: value, value })), [isExternal, searchEndpoint]);
  const searchAbilityOptions = useMemo(() => unique((isExternal ? pathCapabilities : internalPathCapabilities).filter((item) => item.path === searchEndpoint && item.bt === searchBt).map((item) => item.ability).filter(Boolean)).map((value) => ({ label: value, value })), [isExternal, searchBt, searchEndpoint]);
  const searchSubStateOptions = useMemo(() => subStatesForCapability(channelCode ?? '', searchBt, searchAbility).map((item) => ({ label: item.value, value: item.value })), [channelCode, searchAbility, searchBt]);
  const bulkBtOptions = useMemo(() => unique((isExternal ? pathCapabilities : internalPathCapabilities).filter((item) => item.path === bulkEndpoint).map((item) => item.bt)).map((value) => ({ label: value, value })), [bulkEndpoint, isExternal]);
  const bulkAbilityOptions = useMemo(() => unique(pathCapabilities.filter((item) => item.path === bulkEndpoint && item.bt === bulkBt).map((item) => item.ability).filter(Boolean)).map((value) => ({ label: value, value })), [bulkBt, bulkEndpoint]);
  const searchMainState = searchSubState ? mainStateForSubState(searchSubState) : selectedSearchMainState;
  const modalSubStateOptions = useMemo(() => subStatesForCapability(channelCode ?? '', selectedBt, selectedAbility).map((item) => ({ label: item.value, value: item.value })), [channelCode, selectedAbility, selectedBt]);
  const requeryBtOptions = useMemo(() => {
    const fromGroups = flowGroupAbilities.map((item) => item.bt);
    const fromStrategies = requeryStrategies.map((item) => item.bt);
    return unique([...fromGroups, ...fromStrategies]);
  }, [flowGroupAbilities, requeryStrategies]);
  const requeryAbilityOptions = useMemo(() => {
    const fromGroups = flowGroupAbilities.filter((item) => item.bt === selectedRequeryBt).map((item) => item.ability);
    const fromStrategies = requeryStrategies.filter((item) => item.bt === selectedRequeryBt).map((item) => item.ability);
    return unique([...fromGroups, ...fromStrategies]);
  }, [flowGroupAbilities, requeryStrategies, selectedRequeryBt]);
  const selectedRequeryAbilityConfig = useMemo(
    () => flowGroupAbilities.find((item) => item.bt === selectedRequeryBt && item.ability === selectedRequeryAbility),
    [flowGroupAbilities, selectedRequeryAbility, selectedRequeryBt],
  );
  const requeryActionOptions = useMemo(() => {
    const fromGroups = selectedRequeryAbilityConfig?.actions ?? [];
    const fromStrategies = requeryStrategies.filter((item) => item.bt === selectedRequeryBt && item.ability === selectedRequeryAbility).map((item) => item.action);
    return unique([...fromGroups, ...fromStrategies]);
  }, [requeryStrategies, selectedRequeryAbility, selectedRequeryAbilityConfig, selectedRequeryBt]);
  const filteredRequeryStrategies = useMemo(
    () => requeryStrategies.filter((item) => item.bt === selectedRequeryBt && item.ability === selectedRequeryAbility && item.action === selectedRequeryAction),
    [requeryStrategies, selectedRequeryAbility, selectedRequeryAction, selectedRequeryBt],
  );
  const requerySubStateOptions = useMemo(
    () => subStatesForCapability(channelCode ?? '', selectedRequeryBt, selectedRequeryAbility)
      .filter((item) => item.mainState === 'PENDING')
      .map((item) => ({ label: item.value, value: item.value })),
    [channelCode, selectedRequeryAbility, selectedRequeryBt],
  );
  const stateMachineName = useMemo(() => {
    if (isLegacyNoStateMachineCapability(selectedBt, selectedAbility)) return NO_STATE_MACHINE;
    const linked = flowGroupAbilities.find((item) => item.bt === selectedBt && item.ability === selectedAbility)?.stateMachine;
    if (linked) return linked;
    return selectedBt && selectedAbility ? 'Default_Refund_StateMachine' : '';
  }, [flowGroupAbilities, selectedAbility, selectedBt]);
  const requeryStateMachineName = useMemo(() => {
    if (isLegacyNoStateMachineCapability(selectedRequeryBt, selectedRequeryAbility)) return NO_STATE_MACHINE;
    return selectedRequeryAbilityConfig?.stateMachine ?? (selectedRequeryBt && selectedRequeryAbility ? 'Default_Refund_StateMachine' : '');
  }, [selectedRequeryAbility, selectedRequeryAbilityConfig, selectedRequeryBt]);
  const subStateChanged = Boolean(editingExternal && selectedSubState && selectedSubState !== editingExternal.subState);

  const resetForm = () => {
    form.resetFields();
    setEditingExternal(null);
    setEditingInternal(null);
    setSubStateLocked(false);
    setPendingExternalValues(null);
    setCreateOpen(false);
  };

  const resetRequeryForm = () => {
    requeryForm.resetFields();
    setEditingRequery(null);
    setRequeryOpen(false);
  };

  const openCreate = () => {
    form.resetFields();
    setEditingExternal(null);
    setEditingInternal(null);
    setSubStateLocked(false);
    setPendingExternalValues(null);
    setCreateOpen(true);
  };

  const openExternalConfig = (record: ExternalRecord) => {
    setEditingExternal(record);
    setEditingInternal(null);
    form.setFieldsValue(record);
    setSubStateLocked(true);
    setPendingExternalValues(null);
    setCreateOpen(true);
  };

  const openInternalConfig = (record: InternalRecord) => {
    setEditingInternal(record);
    setEditingExternal(null);
    form.setFieldsValue(record);
    setSubStateLocked(false);
    setPendingExternalValues(null);
    setCreateOpen(true);
  };

  const openRequeryCreate = () => {
    requeryForm.resetFields();
    requeryForm.setFieldsValue({ type: 'ALL' });
    setEditingRequery(null);
    setRequeryOpen(true);
  };

  const openRequeryModify = (record: RequeryStrategy) => {
    setSelectedRequeryBt(record.bt);
    setSelectedRequeryAbility(record.ability);
    setSelectedRequeryAction(record.action);
    setEditingRequery(record);
    requeryForm.setFieldsValue(record);
    setRequeryOpen(true);
  };

  const findRequeryFlowName = (action: string, subState: string) => {
    const groups = selectedRequeryAbilityConfig?.versions ?? [];
    const matchedFlow = groups
      .flatMap((group) => group.flows)
      .find((flow) => flow.triggerType === 'REQUERY_TRIGGERED'
        && (flow.contextActions ?? []).includes(action)
        && (flow.stateConditions ?? []).some((condition) => condition.field === 'subState' && condition.value === subState));
    return matchedFlow?.name ?? fallbackRequeryFlowName(selectedRequeryBt, selectedRequeryAbility, action);
  };

  const saveExternal = async () => {
    const values = await form.validateFields();
    const mainState = mainStateForSubState(values.subState);
    if (!mainState) return;
    const source = pathCapabilities.find((item) => item.path === values.path && item.bt === values.bt && item.ability === values.ability)?.source ?? 'httpCall';
    if (editingExternal) {
      if (applied?.env === 'PROD' && values.subState !== editingExternal.subState) {
        setPendingExternalValues({
          description: values.channelDescription,
          subState: values.subState,
          mainState,
          responseCode: values.responseCode,
        });
        approvalForm.resetFields();
        setApprovalOpen(true);
        return;
      }
      setExternalRecords((prev) => prev.map((item) => item.id === editingExternal.id ? { ...item, channelDescription: values.channelDescription, subState: values.subState, mainState, responseCode: values.responseCode } : item));
    } else {
      setExternalRecords((prev) => [{ id: `ext-${Date.now()}`, path: values.path, source, bt: values.bt, ability: values.ability, channelResponseCode: values.channelResponseCode, channelDescription: values.channelDescription, subState: values.subState, mainState, responseCode: values.responseCode }, ...prev]);
    }
    message.success('External->Internal mapping saved');
    resetForm();
  };

  const submitExternalApproval = async () => {
    if (!editingExternal || !pendingExternalValues) return;
    const values = await approvalForm.validateFields();
    setApprovalRequests((prev) => [{
      id: `approval-${Date.now()}`,
      recordId: editingExternal.id,
      ...pendingExternalValues,
      reason: values.reason,
      operator: 'admin',
      operationTime: '2026-07-07 17:10:00',
      approvalStatus: 'In Progress',
    }, ...prev]);
    setApprovalOpen(false);
    approvalForm.resetFields();
    message.success('Modification submitted for approval');
    resetForm();
  };

  const saveInternal = async () => {
    const values = await form.validateFields();
    const mainState = mainStateForSubState(values.subState);
    if (!mainState) return;
    if (!values.channelResponseCode && !values.channelStatus) {
      form.setFields([{ name: 'channelResponseCode', errors: ['Fill Channel Response Code or Channel Status'] }, { name: 'channelStatus', errors: ['Fill Channel Status or Channel Response Code'] }]);
      return;
    }
    if (editingInternal) {
      setInternalRecords((prev) => prev.map((item) => item.id === editingInternal.id ? { ...item, description: values.description, channelResponseCode: values.channelResponseCode, channelStatus: values.channelStatus, channelResponseMessage: values.channelResponseMessage } : item));
    } else {
      setInternalRecords((prev) => [{ id: `int-${Date.now()}`, path: values.path, bt: values.bt, ability: values.ability, subState: values.subState, mainState, responseCode: values.responseCode, description: values.description, channelResponseCode: values.channelResponseCode, channelStatus: values.channelStatus, channelResponseMessage: values.channelResponseMessage }, ...prev]);
    }
    message.success('Internal->External mapping saved');
    resetForm();
  };

  const saveEventOperation = async () => {
    if (detailView?.type !== 'event') return;
    const values = await eventForm.validateFields();
    setEventOperations((prev) => [{
      id: `evt-${Date.now()}`,
      recordId: detailView.record.id,
      eventType: values.eventType,
      operator: 'admin',
      operateTime: '2026-07-07 17:58:00',
      enabled: true,
    }, ...prev]);
    setEventCreateOpen(false);
    eventForm.resetFields();
    message.success('Event operation created');
  };

  const renderApprovalStatus = (status: ExternalApprovalRequest['approvalStatus'] | '-') => {
    if (status === '-') return '-';
    const color = status === 'Approved' ? 'green' : status === 'Rejected' ? 'red' : 'gold';
    return <Tag color={color} style={{ cursor: 'pointer' }}>{status}</Tag>;
  };

  const saveRequery = async () => {
    const values = await requeryForm.validateFields();
    const mainState = mainStateForSubState(values.subState);
    if (!mainState) return;
    const responseCodes = values.type === 'ALL' ? [] : values.responseCodes;
    const payload: RequeryStrategy = {
      id: editingRequery?.id ?? `rq-${Date.now()}`,
      bt: selectedRequeryBt,
      ability: selectedRequeryAbility,
      action: selectedRequeryAction,
      strategyName: values.strategyName,
      frequency: values.frequency,
      durationMin: values.durationMin,
      durationMax: values.durationMax,
      subState: values.subState,
      mainState,
      type: values.type,
      responseCodes,
      requeryFlow: findRequeryFlowName(selectedRequeryAction, values.subState),
      triggerSubState: values.subState,
      operator: editingRequery?.operator ?? 'admin',
      operationTime: '2026-07-07 10:42:00',
      enabled: editingRequery?.enabled ?? false,
    };
    setRequeryStrategies((prev) => editingRequery ? prev.map((item) => item.id === editingRequery.id ? payload : item) : [payload, ...prev]);
    message.success('Requery strategy saved');
    resetRequeryForm();
  };

  const selectRequeryBt = (bt: string) => {
    const nextAbility = unique([
      ...flowGroupAbilities.filter((item) => item.bt === bt).map((item) => item.ability),
      ...requeryStrategies.filter((item) => item.bt === bt).map((item) => item.ability),
    ])[0];
    const nextAction = unique([
      ...(flowGroupAbilities.find((item) => item.bt === bt && item.ability === nextAbility)?.actions ?? []),
      ...requeryStrategies.filter((item) => item.bt === bt && item.ability === nextAbility).map((item) => item.action),
    ])[0];
    setSelectedRequeryBt(bt);
    setSelectedRequeryAbility(nextAbility ?? '');
    setSelectedRequeryAction(nextAction ?? '');
  };

  const selectRequeryAbility = (ability: string) => {
    const nextAction = unique([
      ...(flowGroupAbilities.find((item) => item.bt === selectedRequeryBt && item.ability === ability)?.actions ?? []),
      ...requeryStrategies.filter((item) => item.bt === selectedRequeryBt && item.ability === ability).map((item) => item.action),
    ])[0];
    setSelectedRequeryAbility(ability);
    setSelectedRequeryAction(nextAction ?? '');
  };

  const renderRequeryTabs = (items: string[], selected: string, onSelect: (value: string) => void) => (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 42, minHeight: 48, borderBottom: '1px solid #edf0f2' }}>
      {items.map((item) => {
        const active = item === selected;
        return (
          <button
            key={item}
            type="button"
            onClick={() => onSelect(item)}
            style={{
              appearance: 'none',
              background: 'transparent',
              border: 0,
              borderBottom: active ? '3px solid #722ed1' : '3px solid transparent',
              color: active ? '#722ed1' : '#2f3136',
              cursor: 'pointer',
              font: 'inherit',
              fontSize: 18,
              lineHeight: '46px',
              padding: '0 0 2px',
            }}
          >
            {item}
          </button>
        );
      })}
    </div>
  );

  const runtimeTargetRows = (target: RuntimeConfigTarget) => (
    target.kind === 'matching'
      ? target.endpoint.versions.map((version) => ({ id: version.id, label: version.id, version: version.version }))
      : target.ability.versions.map((group) => ({ id: String(group.groupId), label: `Group ${group.groupId}`, version: group.version }))
  );

  const runtimeTargetId = (target: RuntimeConfigTarget) => target.kind === 'matching' ? target.endpoint.id : `${target.ability.bt}-${target.ability.ability}`;

  const runtimeTargetTitle = (target: RuntimeConfigTarget) => (
    target.kind === 'matching'
      ? `Route Matching Runtime Config · ${target.endpoint.url}`
      : `Flow Groups Runtime Config · ${target.ability.bt} / ${target.ability.ability}`
  );

  const openRuntimeConfig = (target: RuntimeConfigTarget) => {
    const draft = Object.fromEntries(runtimeTargetRows(target).map((row) => {
      const enabled = target.kind === 'matching' ? matchingSwitches[row.id] ?? true : groupSwitches[row.id] ?? true;
      const weight = target.kind === 'matching' ? matchingWeights[row.id] ?? 100 : groupWeights[row.id] ?? 100;
      return [row.id, { enabled, weight }];
    }));
    setRuntimeConfigTarget(target);
    setRuntimeDraft(draft);
  };

  const validateRuntimeDraft = (target: RuntimeConfigTarget, draft: Record<string, RuntimeDraftItem>) => {
    const rows = runtimeTargetRows(target);
    const originallyOpen = rows.some((row) => target.kind === 'matching' ? matchingSwitches[row.id] ?? true : groupSwitches[row.id] ?? true);
    const enabledRows = rows.filter((row) => draft[row.id]?.enabled);
    if (originallyOpen && enabledRows.length === 0) return 'At least one ID must remain enabled.';
    const zeroWeightRows = enabledRows.filter((row) => Number(draft[row.id]?.weight ?? 0) <= 0);
    if (zeroWeightRows.length > 0) return 'Enabled IDs must have a weight greater than 0%.';
    const total = enabledRows.reduce((sum, row) => sum + Number(draft[row.id]?.weight ?? 0), 0);
    if (enabledRows.length > 0 && total !== 100) return 'The weight sum of enabled IDs must be 100%.';
    return null;
  };

  const applyRuntimeDraft = (target: RuntimeConfigTarget, draft: Record<string, RuntimeDraftItem>) => {
    const rows = runtimeTargetRows(target);
    if (target.kind === 'matching') {
      setMatchingSwitches((prev) => ({ ...prev, ...Object.fromEntries(rows.map((row) => [row.id, draft[row.id]?.enabled ?? false])) }));
      setMatchingWeights((prev) => ({ ...prev, ...Object.fromEntries(rows.map((row) => [row.id, draft[row.id]?.weight ?? 0])) }));
    } else {
      setGroupSwitches((prev) => ({ ...prev, ...Object.fromEntries(rows.map((row) => [row.id, draft[row.id]?.enabled ?? false])) }));
      setGroupWeights((prev) => ({ ...prev, ...Object.fromEntries(rows.map((row) => [row.id, draft[row.id]?.weight ?? 0])) }));
    }
  };

  const saveRuntimeConfig = () => {
    if (!runtimeConfigTarget) return;
    const error = validateRuntimeDraft(runtimeConfigTarget, runtimeDraft);
    if (error) return void message.error(error);
    if (applied?.env === 'PROD') {
      setPendingRuntimeDraft({ target: runtimeConfigTarget, draft: runtimeDraft });
      runtimeApprovalForm.resetFields();
      setRuntimeApprovalOpen(true);
      return;
    }
    applyRuntimeDraft(runtimeConfigTarget, runtimeDraft);
    setRuntimeConfigTarget(null);
    setRuntimeDraft({});
    message.success('Runtime config saved');
  };

  const submitRuntimeApproval = async () => {
    if (!pendingRuntimeDraft) return;
    const values = await runtimeApprovalForm.validateFields();
    const rows = runtimeTargetRows(pendingRuntimeDraft.target);
    setRuntimeApprovals((prev) => [{
      id: `runtime-approval-${Date.now()}`,
      kind: pendingRuntimeDraft.target.kind,
      targetId: runtimeTargetId(pendingRuntimeDraft.target),
      reason: values.reason,
      operator: 'admin',
      operationTime: '2026-07-07 18:24:00',
      approvalStatus: 'In Progress',
      changes: rows.map((row) => ({ id: row.id, enabled: pendingRuntimeDraft.draft[row.id]?.enabled ?? false, weight: pendingRuntimeDraft.draft[row.id]?.weight ?? 0 })),
    }, ...prev]);
    setRuntimeApprovalOpen(false);
    setRuntimeConfigTarget(null);
    setPendingRuntimeDraft(null);
    setRuntimeDraft({});
    runtimeApprovalForm.resetFields();
    message.success('Runtime config submitted for approval');
  };

  const openTimeoutConfig = (ability: ConfigAbility, group: FlowGroupVersion) => {
    const paths = group.flows.flatMap((flow, index) => {
      const httpNodes = flow.canvasNodes?.filter((node) => node.componentCode === 'httpCall') ?? [];
      if (httpNodes.length > 0) {
        return httpNodes.map((node, nodeIndex) => ({
          id: `${group.groupId}-${flow.id}-${node.id}-${nodeIndex}`,
          path: String(node.config?.path ?? '/test/path'),
          timeout: Number(node.config?.timeout ?? 10000),
          source: flow.name,
        }));
      }
      return {
        id: `${group.groupId}-${flow.id}-${index}`,
        path: flow.flowType === 'inbound' ? '/callback/payment' : index === 0 ? '/test/path' : '/request-to-pay/status',
        timeout: 10000,
        source: flow.name,
      };
    });
    const deduped = unique(paths.map((item) => item.path)).map((path) => {
      const first = paths.find((item) => item.path === path);
      return first ?? { id: `${group.groupId}-${path}`, path, timeout: 10000, source: 'httpCall' };
    });
    const fallback = deduped.length ? deduped : [{ id: `${group.groupId}-default`, path: '/test/path', timeout: 10000, source: 'httpCall' }];
    setTimeoutTarget({ label: `${ability.bt} / ${ability.ability} / Group ${group.groupId}`, paths: fallback });
    timeoutForm.setFieldsValue({ timeouts: Object.fromEntries(fallback.map((item) => [item.id, item.timeout])) });
  };

  const openFlowGroupDetail = (ability: ConfigAbility, group: FlowGroupVersion) => {
    setRuntimeDetailView({ kind: 'flow-group', ability, group });
  };

  const openRouteMatchingDetail = (endpoint: InboundEndpoint, version: CapabilityDecisionVersion) => {
    setRuntimeDetailView({ kind: 'route-matching', endpoint, version });
  };

  const externalColumns: ColumnsType<ExternalRecord> = [
    {
      title: 'Endpoint',
      dataIndex: 'path',
      width: 250,
      render: (value, record) => (
        <Space size={8}>
          <Tag color={record.source === 'httpCall' ? 'blue' : 'green'} style={{ marginInlineEnd: 0 }}>
            {record.source === 'httpCall' ? 'Outbound' : 'Inbound'}
          </Tag>
          <span>{value}</span>
        </Space>
      ),
    },
    { title: 'Business Type', dataIndex: 'bt', width: 180 },
    { title: 'Ability', dataIndex: 'ability', width: 170 },
    { title: 'Channel Response Code', dataIndex: 'channelResponseCode', width: 210 },
    { title: 'Description', dataIndex: 'channelDescription', width: 220 },
    { title: 'Gateway Sub State', dataIndex: 'subState', width: 240 },
    { title: 'Main State', dataIndex: 'mainState', width: 120, render: (value) => <Tag color={mainStateColor(value)}>{value}</Tag> },
    { title: 'Response Code', dataIndex: 'responseCode', width: 150 },
    { title: 'Operation', key: 'operation', fixed: 'right', width: 230, render: (_, record) => <Space size="small"><Button type="link" size="small" onClick={() => openExternalConfig(record)}>Config</Button><Button type="link" size="small" onClick={() => setDetailView({ type: 'event', record })}>Event</Button><Button type="link" size="small" onClick={() => setExternalHistory(record)}>Change History</Button></Space> },
  ];

  const internalColumns: ColumnsType<InternalRecord> = [
    { title: 'Endpoint', dataIndex: 'path', width: 260 },
    { title: 'Business Type', dataIndex: 'bt', width: 180 },
    { title: 'Ability', dataIndex: 'ability', width: 170 },
    { title: 'Gateway Sub State', dataIndex: 'subState', width: 240 },
    { title: 'Main State', dataIndex: 'mainState', width: 120, render: (value) => <Tag color={mainStateColor(value)}>{value}</Tag> },
    { title: 'Response Code', dataIndex: 'responseCode', width: 150 },
    { title: 'Description', dataIndex: 'description', width: 220 },
    { title: 'Channel Status', dataIndex: 'channelStatus', width: 180, render: (value) => value || '-' },
    { title: 'Channel Response Code', dataIndex: 'channelResponseCode', width: 210, render: (value) => value || '-' },
    { title: 'Channel Response Message', dataIndex: 'channelResponseMessage', width: 240, render: (value) => value || '-' },
    { title: 'Operation', key: 'operation', fixed: 'right', width: 170, render: (_, record) => <Space size="small"><Button type="link" size="small" onClick={() => openInternalConfig(record)}>Config</Button><Button type="link" size="small" onClick={() => setInternalHistory(record)}>Change History</Button></Space> },
  ];

  const requeryColumns: ColumnsType<RequeryStrategy> = [
    { title: 'ReQuery Strategy', dataIndex: 'strategyName', width: 190 },
    { title: 'Frequency', dataIndex: 'frequency', width: 110, render: (value) => `${value}s` },
    { title: 'Duration', key: 'duration', width: 130, render: (_, record) => `${record.durationMin}-${record.durationMax}s` },
    { title: 'Gateway Sub State', dataIndex: 'subState', width: 240 },
    { title: 'Main State', dataIndex: 'mainState', width: 120, render: (value) => <Tag color={mainStateColor(value)}>{value}</Tag> },
    { title: 'Type', dataIndex: 'type', width: 100 },
    { title: 'Response Code', dataIndex: 'responseCodes', width: 220, render: (value: string[], record) => record.type === 'ALL' ? 'All' : value.join(', ') },
    { title: 'Action', dataIndex: 'action', width: 130 },
    { title: 'REQUERY_TRIGGERED Flow', dataIndex: 'requeryFlow', width: 240 },
    { title: 'Trigger Sub-State', dataIndex: 'triggerSubState', width: 240 },
    { title: 'Operator', dataIndex: 'operator', width: 140 },
    { title: 'Operation Time', dataIndex: 'operationTime', width: 190 },
    { title: 'Strategy Switch', dataIndex: 'enabled', width: 130, fixed: 'right', render: (value, record) => <Switch checked={value} onChange={(checked) => setRequeryStrategies((prev) => prev.map((item) => item.id === record.id ? { ...item, enabled: checked } : item))} /> },
    { title: 'Operation', key: 'operation', width: 120, fixed: 'right', render: (_, record) => <Button type="link" size="small" disabled={record.enabled} onClick={() => openRequeryModify(record)}>Modify</Button> },
  ];

  const routeMatchingVersionColumns = (endpoint: InboundEndpoint): ColumnsType<CapabilityDecisionVersion> => [
    { title: 'Matching ID', dataIndex: 'id', width: 150 },
    { title: 'Version', dataIndex: 'version', width: 150 },
    { title: 'Name', dataIndex: 'name', width: 230 },
    { title: 'Weight', width: 100, render: (_, version) => `${matchingWeights[version.id] ?? 100}%` },
    { title: 'Runtime Status', width: 130, render: (_, version) => <Tag color={(matchingSwitches[version.id] ?? true) ? 'green' : 'default'}>{(matchingSwitches[version.id] ?? true) ? 'on' : 'off'}</Tag> },
    {
      title: 'Operation',
      width: 180,
      render: (_, version) => {
        return <Space size="small">
          <Button type="link" size="small" onClick={() => openRouteMatchingDetail(endpoint, version)}>Detail</Button>
        </Space>;
      },
    },
  ];

  const routeMatchingColumns: ColumnsType<InboundEndpoint> = [
    {
      title: '',
      width: 50,
      render: (_, endpoint) => (
        <Button
          type="text"
          icon={expandedRouteMatchingRows.includes(endpoint.id) ? <DownOutlined /> : <RightOutlined />}
          onClick={() => setExpandedRouteMatchingRows((rows) => rows.includes(endpoint.id) ? rows.filter((id) => id !== endpoint.id) : [...rows, endpoint.id])}
        />
      ),
    },
    { title: 'Path', dataIndex: 'url', width: 360 },
    { title: 'Method', dataIndex: 'method', width: 120, render: (value) => <Tag color="blue">{value}</Tag> },
    { title: 'Business Type', render: (_, endpoint) => <Space wrap>{businessTypesForEndpoint(endpoint).map((value) => <Tag key={value}>{value}</Tag>)}</Space> },
    {
      title: 'Operation',
      width: 280,
      render: (_, endpoint) => (
        <Space size="small">
          <Button type="link" size="small" onClick={() => openRuntimeConfig({ kind: 'matching', endpoint })}>Runtime Config</Button>
          <Button type="link" size="small" onClick={() => setRuntimeHistory({ kind: 'Route Matching', title: endpoint.url, targetId: endpoint.id, context: [{ label: 'Path', value: endpoint.url }, { label: 'Method', value: endpoint.method }], weight: 0, enabled: true })}>Change History</Button>
        </Space>
      ),
    },
  ];

  const flowGroupVersionColumns = (ability: ConfigAbility): ColumnsType<FlowGroupVersion> => [
    { title: 'Group ID', dataIndex: 'groupId', width: 120 },
    { title: 'Version', dataIndex: 'version', width: 150 },
    { title: 'Weight', width: 100, render: (_, group) => `${groupWeights[String(group.groupId)] ?? 100}%` },
    { title: 'Runtime Status', width: 130, render: (_, group) => <Tag color={(groupSwitches[String(group.groupId)] ?? true) ? 'green' : 'default'}>{(groupSwitches[String(group.groupId)] ?? true) ? 'on' : 'off'}</Tag> },
    {
      title: 'Operation',
      width: 250,
      render: (_, group) => {
        return <Space size="small" wrap>
          <Button type="link" size="small" onClick={() => openTimeoutConfig(ability, group)}>Timeout Config</Button>
          <Button type="link" size="small" onClick={() => openFlowGroupDetail(ability, group)}>Detail</Button>
        </Space>;
      },
    },
  ];

  const flowGroupColumns: ColumnsType<ConfigAbility> = [
    {
      title: '',
      width: 50,
      render: (_, ability) => {
        const rowKey = `${ability.bt}-${ability.ability}`;
        return (
          <Button
            type="text"
            icon={expandedFlowGroupRows.includes(rowKey) ? <DownOutlined /> : <RightOutlined />}
            onClick={() => setExpandedFlowGroupRows((rows) => rows.includes(rowKey) ? rows.filter((key) => key !== rowKey) : [...rows, rowKey])}
          />
        );
      },
    },
    { title: 'Business Type', dataIndex: 'bt', width: 180 },
    { title: 'Ability', dataIndex: 'ability', width: 180 },
    {
      title: 'State Machine',
      dataIndex: 'stateMachine',
      width: 260,
      render: (stateMachine: string) => isNoStateMachine(stateMachine)
        ? <Tag color="default">No State Machine</Tag>
        : stateMachine,
    },
    { title: 'Actions', dataIndex: 'actions', render: (values: string[]) => <Space wrap>{values.map((value) => <Tag key={value}>{value}</Tag>)}</Space> },
    {
      title: 'Operation',
      width: 280,
      render: (_, ability) => (
        <Space size="small">
          <Button type="link" size="small" onClick={() => openRuntimeConfig({ kind: 'group', ability })}>Runtime Config</Button>
          <Button type="link" size="small" onClick={() => setRuntimeHistory({ kind: 'Flow Groups', title: `${ability.bt} / ${ability.ability}`, targetId: `${ability.bt}-${ability.ability}`, context: [{ label: 'Business Type', value: ability.bt }, { label: 'Ability', value: ability.ability }], weight: 0, enabled: true })}>Change History</Button>
        </Space>
      ),
    },
  ];

  const renderSearchCard = () => (
    <Card size="small">
      <Form form={searchForm} layout="vertical">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
          <Form.Item name="endpoint" label="Endpoint">
            <Select
              allowClear
              options={isExternal ? externalEndpointOptions : internalEndpointOptions}
              placeholder="Select Endpoint"
              onChange={() => searchForm.setFieldsValue({ bt: undefined, ability: undefined, subState: undefined, mainState: undefined })}
            />
          </Form.Item>
          <Form.Item name="bt" label="Business Type">
            <Select
              allowClear
              disabled={!searchEndpoint}
              options={searchBtOptions}
              placeholder="Select Business Type"
              onChange={() => searchForm.setFieldsValue({ ability: undefined, subState: undefined, mainState: undefined })}
            />
          </Form.Item>
          <Form.Item name="ability" label="Ability">
            <Select
              allowClear
              disabled={!searchBt}
              options={searchAbilityOptions}
              placeholder="Select Ability"
              onChange={() => searchForm.setFieldsValue({ subState: undefined, mainState: undefined })}
            />
          </Form.Item>
          <Form.Item name="mainState" label="Main State">
            <Select
              allowClear
              options={valueOptions(['INIT', 'PENDING', 'TO_BE_VERIFY', 'SUCCESS', 'FAIL'])}
              placeholder="Select Main State"
              onChange={() => searchForm.setFieldsValue({ subState: undefined })}
            />
          </Form.Item>
          <Form.Item name="subState" label="Gateway Sub State">
            <Select
              allowClear
              disabled={!searchAbility}
              options={searchSubStateOptions}
              placeholder="Loaded by Channel + BT + Ability"
              onChange={(value) => searchForm.setFieldsValue({ mainState: mainStateForSubState(value) })}
            />
          </Form.Item>
          <Form.Item label="Current Main State"><Input disabled value={searchMainState ?? ''} placeholder="Auto-filled or selected above" /></Form.Item>
          <Form.Item label="Response Code"><Input placeholder="Response Code" /></Form.Item>
          {isExternal ? <Form.Item label="Channel Response Code"><Input placeholder="Channel Response Code" /></Form.Item> : <Form.Item label="Channel Status"><Input placeholder="Channel Status" /></Form.Item>}
        </div>
        <div style={{ textAlign: 'right' }}><Space><Button onClick={() => searchForm.resetFields()}>Reset</Button><Button type="primary">Query</Button></Space></div>
      </Form>
    </Card>
  );

  const renderRequeryPage = () => (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Card style={{ paddingTop: 34 }}>
        <Space direction="vertical" size={12} style={{ width: '100%' }}>
          {renderRequeryTabs(requeryBtOptions, selectedRequeryBt, selectRequeryBt)}
          {renderRequeryTabs(requeryAbilityOptions, selectedRequeryAbility, selectRequeryAbility)}
          {renderRequeryTabs(requeryActionOptions, selectedRequeryAction, setSelectedRequeryAction)}
        </Space>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 28, marginBottom: 16 }}>
          <Button
            type="primary"
            disabled={!selectedRequeryAction}
            onClick={openRequeryCreate}
            style={selectedRequeryAction ? { background: '#722ed1', borderColor: '#722ed1' } : undefined}
          >
            Create Strategy For Action
          </Button>
        </div>
        <Table<RequeryStrategy> rowKey="id" columns={requeryColumns} dataSource={filteredRequeryStrategies} pagination={false} scroll={{ x: 2410 }} />
      </Card>
    </Space>
  );

  const renderRuntimeRouteMatchingPage = () => (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Alert type="info" showIcon message="Runtime Control manages deployed Route Matching records by Path. Each Matching ID can be switched on/off and weighted for traffic control." />
      <Card>
        <Table<InboundEndpoint>
          rowKey="id"
          columns={routeMatchingColumns}
          dataSource={routeMatchingEndpoints}
          pagination={false}
          expandable={{
            expandedRowRender: (endpoint) => <Table<CapabilityDecisionVersion> rowKey="id" columns={routeMatchingVersionColumns(endpoint)} dataSource={endpoint.versions} pagination={false} size="small" />,
            expandedRowKeys: expandedRouteMatchingRows,
            showExpandColumn: false,
          }}
          locale={{ emptyText: 'No Route Matching deployment found for this environment.' }}
        />
      </Card>
    </Space>
  );

  const renderRuntimeFlowGroupsPage = () => (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Alert type="info" showIcon message="Runtime Control manages deployed Flow Groups by Business Type + Ability. Timeout Config is confirmed here and aggregates httpCall paths inside the selected Flow Group." />
      <Card>
        <Table<ConfigAbility>
          rowKey={(ability) => `${ability.bt}-${ability.ability}`}
          columns={flowGroupColumns}
          dataSource={flowGroupAbilities}
          pagination={false}
          expandable={{
            expandedRowRender: (ability) => <Table<FlowGroupVersion> rowKey="id" columns={flowGroupVersionColumns(ability)} dataSource={ability.versions} pagination={false} size="small" />,
            expandedRowKeys: expandedFlowGroupRows,
            showExpandColumn: false,
          }}
          locale={{ emptyText: 'No Flow Group deployment found for this environment.' }}
        />
      </Card>
    </Space>
  );

  const renderRuntimeNodeCard = (node: RuntimeNodeCard, index: number, total: number) => (
    <div key={node.id}>
      <button
        type="button"
        onClick={() => setRuntimeComponentDetail({
          title: node.title,
          componentCode: node.componentCode,
          source: node.source,
          data: node.data,
          endpointPath: node.endpointPath,
          pathVariables: node.pathVariables,
          requestFields: node.requestFields,
          conditionBranches: node.conditionBranches,
          endCurrentFlow: node.endCurrentFlow,
        })}
        style={{ display: 'block', width: 360, margin: '0 auto', padding: 14, textAlign: 'left', border: '1px solid #9254de', borderRadius: 8, background: '#f9f0ff', cursor: 'pointer' }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
          <strong>{node.title}</strong>
          <Tag color="green">Configured</Tag>
        </div>
        {node.subtitle && <div style={{ color: '#595959', fontSize: 11, marginTop: 5 }}>{node.subtitle}</div>}
      </button>
      {index < total - 1 && <div style={{ textAlign: 'center', fontSize: 24, lineHeight: '42px' }}>↓</div>}
    </div>
  );

  const renderRuntimeRouteMatchingDetail = (detail: Extract<RuntimeDetailView, { kind: 'route-matching' }>) => {
    const { endpoint, version } = detail;
    const pathVariables = [...endpoint.url.matchAll(/\{([A-Za-z_][A-Za-z0-9_]*)\}/g)].map((match) => match[1]);
    const nodes = version.sourceType === 'legacy'
      ? (version.legacyComponents ?? []).map((component) => ({
        id: component.id,
        title: component.code,
        componentCode: component.code,
        source: 'route-matching' as const,
        subtitle: component.name,
        endpointPath: endpoint.url,
        pathVariables,
        data: { Component: component.code, Name: component.name, ...component.config },
      }))
      : version.matchType === 'order_no'
        ? [
          { id: 'preprocess', title: 'inboundPreprocess', componentCode: 'inboundPreprocess', source: 'route-matching' as const, subtitle: `Prepare matching fields · ${version.requestMessageFormat ?? 'JSON'}`, endpointPath: endpoint.url, pathVariables, data: { ...version, rules: undefined } },
          { id: 'order', title: 'matchCapabilityByOrder', componentCode: 'matchCapabilityByOrder', source: 'route-matching' as const, subtitle: version.referenceField ? `Compare with ${version.referenceField}` : 'Order reference matching', endpointPath: endpoint.url, pathVariables, requestFields: version.requestFields, data: { matchType: version.matchType, singleNoField: version.singleNoField, referenceField: version.referenceField ?? undefined } },
        ]
        : [
          { id: 'preprocess', title: 'inboundPreprocess', componentCode: 'inboundPreprocess', source: 'route-matching' as const, subtitle: `Prepare matching fields · ${version.requestMessageFormat ?? 'JSON'}`, endpointPath: endpoint.url, pathVariables, data: { ...version, rules: undefined } },
          ...(version.matchType === 'type_field' ? [{ id: 'condition', title: 'condition', componentCode: 'condition', source: 'route-matching' as const, subtitle: 'Branch by field rules', conditionBranches: version.rules.map((rule) => ({ name: `${rule.bt} / ${rule.ability}`, target: 'specifyCapability', summary: `${rule.action}` })), data: { matchFields: version.matchFields, matchType: version.matchType } }] : []),
          ...version.rules.map((rule) => ({ id: rule.id, title: 'specifyCapability', componentCode: 'specifyCapability', source: 'route-matching' as const, subtitle: `${rule.bt} / ${rule.ability} / ${rule.action}`, requestFields: version.requestFields, data: rule as unknown as Record<string, unknown> })),
        ];
    return (
      <div style={{ display: 'flex', minHeight: 620, background: '#fff', border: '1px solid #e8e8e8', borderRadius: 8, overflow: 'hidden' }}>
        <CanvasContextPanel channelCode={channelCode} mode="matching" readOnly />
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          <div style={{ height: 42, padding: '0 16px', display: 'flex', alignItems: 'center', borderBottom: '1px solid #f0f0f0', fontWeight: 600, fontSize: 13 }}>Canvas</div>
          <div style={{ flex: 1, overflow: 'auto', padding: 36, backgroundImage: 'radial-gradient(#d9d9d9 1px, transparent 1px)', backgroundSize: '16px 16px' }}>
            {nodes.map((node, index) => renderRuntimeNodeCard(node, index, nodes.length))}
          </div>
        </div>
      </div>
    );
  };

  const renderRuntimeFlowGroupDetail = (detail: Extract<RuntimeDetailView, { kind: 'flow-group' }>) => (
    <Card>
      <Descriptions column={5} size="small" style={{ marginBottom: 16 }} items={[
        { key: 'bt', label: 'Business Type', children: detail.ability.bt },
        { key: 'ability', label: 'Ability', children: detail.ability.ability },
        { key: 'group', label: 'Group ID', children: detail.group.groupId },
        { key: 'version', label: 'Version', children: detail.group.version },
        { key: 'status', label: 'Status', children: <Tag color={detail.group.status === 'PROD' ? 'green' : 'default'}>{detail.group.status}</Tag> },
      ]} />
      <Table
        rowKey="id"
        pagination={false}
        dataSource={detail.group.flows}
        scroll={{ x: 1280 }}
        columns={[
          { title: 'Flow ID', dataIndex: 'id', width: 220 },
          { title: 'Flow Name', dataIndex: 'name' },
          { title: 'Trigger Type', dataIndex: 'triggerType', width: 190, render: (value) => value ? <Tag>{value}</Tag> : '-' },
          {
            title: 'Triggered By',
            width: 170,
            render: (_, flow) => flow.triggerEvents?.[0] ?? flow.contextActions?.[0] ?? '-',
          },
          {
            title: 'Trigger Sub-State',
            width: 240,
            render: (_, flow) => {
              const triggerSubState = flow.stateConditions?.find((condition) => condition.field === 'subState')?.value;
              return flow.triggerType === 'REQUERY_TRIGGERED' && triggerSubState ? <Tag color="gold">{triggerSubState}</Tag> : <span style={{ color: '#999' }}>N/A</span>;
            },
          },
          { title: 'Operation', width: 180, fixed: 'right', render: (_, flow) => <Button type="link" size="small" onClick={() => setRuntimeDetailView({ kind: 'flow-canvas', ability: detail.ability, group: detail.group, flowId: flow.id })}>View Components</Button> },
        ]}
      />
    </Card>
  );

  const renderRuntimeFlowCanvasDetail = (detail: Extract<RuntimeDetailView, { kind: 'flow-canvas' }>) => {
    const flow = detail.group.flows.find((item) => item.id === detail.flowId);
    if (!flow) return <Card>Flow not found.</Card>;
    const inboundEndpoint = flow.inboundUriId
      ? routeMatchingEndpoints.find((endpoint) => endpoint.id === flow.inboundUriId)
      : undefined;
    const inboundPathVariables = [...(inboundEndpoint?.url ?? '').matchAll(/\{([A-Za-z_][A-Za-z0-9_]*)\}/g)].map((match) => match[1]);
    const nodes = flow.canvasNodes?.length
      ? flow.canvasNodes.map((node) => ({
        id: node.id,
        title: node.componentCode,
        componentCode: node.componentCode,
        source: 'flow' as const,
        subtitle: node.status,
        endpointPath: inboundEndpoint?.url,
        pathVariables: inboundPathVariables,
        data: { Component: node.componentCode, Status: node.status, ...(node.config ?? {}) },
      }))
      : [{ id: flow.id, title: flow.name, componentCode: 'flow', source: 'flow' as const, subtitle: flow.triggerType ?? 'Flow', data: flow as unknown as Record<string, unknown> }];
    return (
      <div style={{ display: 'flex', minHeight: 620, background: '#fff', border: '1px solid #e8e8e8', borderRadius: 8, overflow: 'hidden' }}>
        <CanvasContextPanel
          channelCode={channelCode}
          mode="flow"
          actions={flow.triggerEvents?.length ? flow.triggerEvents : flow.contextActions ?? []}
          readOnly
        />
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          <div style={{ height: 42, padding: '0 16px', display: 'flex', alignItems: 'center', borderBottom: '1px solid #f0f0f0', fontWeight: 600, fontSize: 13 }}>Canvas</div>
          <div style={{ flex: 1, overflow: 'auto', padding: 36, backgroundImage: 'radial-gradient(#d9d9d9 1px, transparent 1px)', backgroundSize: '16px 16px' }}>
            {nodes.map((node, index) => renderRuntimeNodeCard(node, index, nodes.length))}
          </div>
        </div>
      </div>
    );
  };

  const renderEventPage = (record: ExternalRecord) => {
    const rows = eventOperations.filter((item) => item.recordId === record.id);
    return (
      <Space direction="vertical" size={16} style={{ width: '100%' }}>
        <Button type="link" style={{ paddingLeft: 0 }} onClick={() => setDetailView(null)}>Back to External-&gt;Internal</Button>
        <Card>
          <Space size={24} wrap>
            <Text strong>Channel Response Code: <Text>{record.channelResponseCode}</Text></Text>
            <Text strong>Response Code: <Text>{record.responseCode}</Text></Text>
            <Text strong>Gateway Sub State: <Text>{record.subState}</Text></Text>
            <Text strong>Main State: <Tag color={mainStateColor(record.mainState)}>{record.mainState}</Tag></Text>
          </Space>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 32, marginBottom: 16 }}>
            <Button type="primary" onClick={() => { eventForm.resetFields(); setEventCreateOpen(true); }}>Create</Button>
          </div>
          <Table<EventOperation>
            rowKey="id"
            pagination={false}
            dataSource={rows}
            columns={[
              { title: 'Event Type', dataIndex: 'eventType' },
              { title: 'Operator', dataIndex: 'operator', width: 180 },
              { title: 'Operate Time', dataIndex: 'operateTime', width: 220 },
              { title: 'Operation', width: 160, render: () => <Button type="link" size="small">Change History</Button> },
              { title: 'Switch', dataIndex: 'enabled', width: 120, render: (enabled, row) => <Switch checked={enabled} onChange={(checked) => setEventOperations((prev) => prev.map((item) => item.id === row.id ? { ...item, enabled: checked } : item))} /> },
            ]}
            locale={{ emptyText: 'No Data' }}
          />
        </Card>
      </Space>
    );
  };

  const renderApprovalDetailPage = (record: ExternalRecord, approval?: ExternalApprovalRequest) => {
    const finalStatus = approval?.approvalStatus ?? 'Approved';
    return (
      <Space direction="vertical" size={16} style={{ width: '100%' }}>
        <Button type="link" style={{ paddingLeft: 0 }} onClick={() => setDetailView(null)}>Back to External-&gt;Internal</Button>
        <Card>
          <Typography.Title level={4} style={{ textAlign: 'center', marginTop: 0 }}>Basic Information</Typography.Title>
          <Descriptions column={1} size="small" style={{ maxWidth: 720, margin: '0 auto 28px' }} items={[
            { key: 'channel', label: 'Channel', children: channelCode },
            { key: 'endpoint', label: 'Endpoint', children: record.path },
            { key: 'bt', label: 'Business Type', children: record.bt },
            { key: 'ability', label: 'Ability', children: record.ability },
            { key: 'crc', label: 'Channel Response Code', children: record.channelResponseCode },
            { key: 'result', label: 'Final Result', children: renderApprovalStatus(finalStatus) },
          ]} />
          <Typography.Title level={4} style={{ textAlign: 'center' }}>Change Details</Typography.Title>
          <div style={{ maxWidth: 960, margin: '0 auto' }}>
            <Card size="small" title="Previous Config" style={{ marginBottom: 18 }}>
              <Descriptions column={1} size="small" items={[
                { key: 'subState', label: 'Gateway Sub State', children: record.subState },
                { key: 'mainState', label: 'Main State', children: record.mainState },
                { key: 'responseCode', label: 'Response Code', children: record.responseCode },
                { key: 'description', label: 'Description', children: record.channelDescription },
              ]} />
            </Card>
            <Card size="small" title="Updated Config">
              <Descriptions column={1} size="small" items={[
                { key: 'subState', label: 'Gateway Sub State', children: approval?.subState ?? record.subState },
                { key: 'mainState', label: 'Main State', children: approval?.mainState ?? record.mainState },
                { key: 'responseCode', label: 'Response Code', children: approval?.responseCode ?? record.responseCode },
                { key: 'description', label: 'Description', children: approval?.description ?? record.channelDescription },
              ]} />
            </Card>
          </div>
          <Typography.Title level={4} style={{ textAlign: 'center', marginTop: 32 }}>Approval Flow</Typography.Title>
          <Table
            rowKey="node"
            pagination={false}
            dataSource={[
              { node: 'START_PROCESS_INSTANCE', operator: approval?.operator ?? 'admin', operationTime: approval?.operationTime ?? '2026-07-07 17:58:00', result: 'Submitted' },
              { node: finalStatus === 'In Progress' ? 'WAIT_APPROVAL' : 'AGREE', operator: finalStatus === 'In Progress' ? '-' : 'Approver', operationTime: finalStatus === 'In Progress' ? '-' : '2026-07-07 18:08:00', result: finalStatus },
            ]}
            columns={[
              { title: 'Node', dataIndex: 'node' },
              { title: 'Operator', dataIndex: 'operator', width: 180 },
              { title: 'Operation Time', dataIndex: 'operationTime', width: 220 },
              { title: 'Result', dataIndex: 'result', width: 160 },
            ]}
          />
        </Card>
      </Space>
    );
  };

  const closeRuntimeComponentDetail = () => setRuntimeComponentDetail(null);

  const renderRuntimeComponentDetailDrawer = () => {
    const detail = runtimeComponentDetail;
    const code = detail?.componentCode;
    const data = detail?.data ?? {};
    const requestFields = detail?.requestFields ?? [];
    const bt = String(data.bt ?? '');
    const ability = String(data.ability ?? '');
    const action = String(data.action ?? '');

    return (
      <>
        <InboundPreprocessDrawer
          open={code === 'inboundPreprocess'}
          readOnly
          initialValues={data}
          pathVariables={detail?.pathVariables ?? []}
          endpointPath={detail?.endpointPath}
          onClose={closeRuntimeComponentDetail}
          onSave={() => undefined}
        />

        <HttpCallDrawer
          open={code === 'httpCall'}
          channelCode={channelCode}
          initialValues={data}
          readOnly
          onClose={closeRuntimeComponentDetail}
          onSave={() => undefined}
        />

        <InboundRequestDrawer
          open={code === 'inboundRequest'}
          initialValues={data}
          readOnly
          endpointPath={detail?.endpointPath}
          pathVariables={detail?.pathVariables ?? []}
          onClose={closeRuntimeComponentDetail}
          onSave={() => undefined}
        />

        <InboundResponseDrawer
          open={code === 'inboundResponse'}
          initialValues={data}
          readOnly
          onClose={closeRuntimeComponentDetail}
          onSave={() => undefined}
        />

        <ConditionNodeDrawer
          open={code === 'condition'}
          branches={detail?.conditionBranches ?? []}
          endCurrentFlow={Boolean(detail?.endCurrentFlow)}
          readOnly
          onClose={closeRuntimeComponentDetail}
          onSave={() => undefined}
        />

        <Drawer
          title="specifyCapability Configuration"
          width={620}
          open={code === 'specifyCapability'}
          onClose={closeRuntimeComponentDetail}
        >
          <Alert type="info" showIcon message="This component terminates one matching path and declares its unique Capability Result." style={{ marginBottom: 18 }} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
            <Select disabled placeholder="Business Type" value={bt || undefined} options={flowGroupAbilities.map((item) => ({ value: item.bt })).filter((item, index, array) => array.findIndex((target) => target.value === item.value) === index)} />
            <Select disabled placeholder="Ability" value={ability || undefined} options={flowGroupAbilities.filter((item) => item.bt === bt).map((item) => ({ value: item.ability }))} />
            <Select disabled placeholder="Action" value={action || undefined} options={(capabilityActionOptions[`${bt}:${ability}`] ?? [action].filter(Boolean)).map((value) => ({ value }))} />
          </div>
        </Drawer>

        <Drawer
          title="matchCapabilityByOrder Configuration"
          width={650}
          open={code === 'matchCapabilityByOrder'}
          onClose={closeRuntimeComponentDetail}
        >
          <Alert type="info" showIcon message="This component must be connected immediately after inboundPreprocess. Capability is read automatically from the matched gateway order." style={{ marginBottom: 18 }} />
          <div style={{ color: '#8c8c8c', fontSize: 11, marginBottom: 6 }}>Common Request field</div>
          <Cascader
            disabled
            value={typeof data.singleNoField === 'string' ? data.singleNoField.split(/\.(.+)/).filter(Boolean) as string[] : undefined}
            placeholder="Select from inboundPreprocess"
            style={{ width: '100%' }}
            options={buildRequestFieldCascaderOptions(requestFields) as any}
            changeOnSelect={false}
          />
          <div style={{ color: '#8c8c8c', fontSize: 11, margin: '14px 0 6px' }}>Compare with gateway order</div>
          <Select disabled value={typeof data.referenceField === 'string' ? data.referenceField : undefined} placeholder="Select reference" style={{ width: '100%' }} options={[{ value: 'requestReference' }, { value: 'responseReference' }]} />
        </Drawer>

        <Drawer
          title={detail ? `${detail.title} Configuration` : 'Component Configuration'}
          width={560}
          open={Boolean(detail) && !['inboundPreprocess', 'httpCall', 'inboundRequest', 'inboundResponse', 'condition', 'specifyCapability', 'matchCapabilityByOrder'].includes(code ?? '')}
          onClose={closeRuntimeComponentDetail}
        >
          <Alert type="info" showIcon message="Component configuration is shown in the same read-only form style used by Detail mode." style={{ marginBottom: 18 }} />
          <Form disabled layout="vertical">
            {Object.entries(data).map(([key, value]) => (
              <Form.Item key={key} label={key}>
                {typeof value === 'boolean'
                  ? <Switch checked={value} />
                  : <Input.TextArea autoSize={{ minRows: typeof value === 'object' && value !== null ? 4 : 1, maxRows: 10 }} value={typeof value === 'object' && value !== null ? JSON.stringify(value, null, 2) : String(value ?? '-')} />}
              </Form.Item>
            ))}
          </Form>
        </Drawer>
      </>
    );
  };

  const renderActivePage = () => {
    if (runtimeDetailView?.kind === 'route-matching') return renderRuntimeRouteMatchingDetail(runtimeDetailView);
    if (runtimeDetailView?.kind === 'flow-group') return renderRuntimeFlowGroupDetail(runtimeDetailView);
    if (runtimeDetailView?.kind === 'flow-canvas') return renderRuntimeFlowCanvasDetail(runtimeDetailView);
    if (detailView?.type === 'event') return renderEventPage(detailView.record);
    if (detailView?.type === 'approval') return renderApprovalDetailPage(detailView.record, detailView.approval);
    if (isRequery) return renderRequeryPage();
    if (isRuntimeRouteMatching) return renderRuntimeRouteMatchingPage();
    if (isRuntimeFlowGroups) return renderRuntimeFlowGroupsPage();
    return (
      <Space direction="vertical" size={16} style={{ width: '100%' }}>
        <Alert
          type="info"
          showIcon
          message={isExternal
            ? 'Endpoint options are grouped by source from published Flow Group Versions and Route Matching. Same Endpoint + BT + Ability shares one mapping set.'
            : 'Endpoint options are values from Route Matching. Select Endpoint and BT, then choose Gateway Sub State to derive Main State and Response Code candidates.'}
        />
        {renderSearchCard()}
        <Card>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
            <span />
            <Space>
              <Button type="primary" onClick={openCreate}>Create</Button>
              <Button type="primary" onClick={() => setBulkOpen(true)}>Bulk Upload</Button>
              <Button onClick={() => setFileListOpen(true)}>File List</Button>
              <Button onClick={() => message.success(`Downloading current ${title} mappings`)}>Download</Button>
            </Space>
          </div>
          {isExternal ? (
            <Table<ExternalRecord> rowKey="id" columns={externalColumns} dataSource={externalRecords} pagination={{ pageSize: 10 }} scroll={{ x: 1720 }} />
          ) : (
            <Table<InternalRecord> rowKey="id" columns={internalColumns} dataSource={internalRecords} pagination={{ pageSize: 10 }} scroll={{ x: 1930 }} />
          )}
        </Card>
      </Space>
    );
  };

  const title = runtimeDetailView?.kind === 'route-matching'
    ? 'Route Matching Detail'
    : runtimeDetailView?.kind === 'flow-group'
      ? 'Flow Groups Detail'
      : runtimeDetailView?.kind === 'flow-canvas'
        ? 'Flow Detail'
        : detailView?.type === 'event'
    ? 'Event'
    : detailView?.type === 'approval'
      ? 'Approval Detail'
      : isExternal ? 'External->Internal' : isInternal ? 'Internal->External' : isRequery ? 'Requery Strategy' : isRuntimeRouteMatching ? 'Route Matching' : 'Flow Groups';

  const handleRuntimeBack = () => {
    if (runtimeDetailView?.kind === 'flow-canvas') {
      setRuntimeDetailView({ kind: 'flow-group', ability: runtimeDetailView.ability, group: runtimeDetailView.group });
      return;
    }
    if (runtimeDetailView?.kind === 'route-matching') setPageKey('runtime-route-matching');
    if (runtimeDetailView?.kind === 'flow-group') setPageKey('runtime-flow-groups');
    setRuntimeDetailView(null);
  };

  return (
    <Layout style={{ minHeight: '100vh', background: '#f4f6f8' }}>
      <Sider width={260} style={{ background: '#001529', position: 'sticky', top: 0, height: '100vh' }}>
        <div style={{ color: '#fff', fontSize: 20, fontWeight: 700, padding: '24px 24px 18px' }}>Omnicore Solution</div>
        <div style={{ color: '#cbd5e1', padding: '0 24px 14px', fontSize: 15 }}>{channelCode}</div>
        {runtimeDetailView ? (
          <Menu
            theme="dark"
            mode="inline"
            selectedKeys={['runtime-back']}
            onClick={handleRuntimeBack}
            items={[{ key: 'runtime-back', label: 'Back' }]}
          />
        ) : (
          <Menu
            theme="dark"
            mode="inline"
            selectedKeys={[pageKey]}
            defaultOpenKeys={['response-code', 'runtime-control']}
            onClick={(item) => {
              if (item.key === 'external-internal' || item.key === 'internal-external' || item.key === 'requery' || item.key === 'runtime-route-matching' || item.key === 'runtime-flow-groups') {
                setPageKey(item.key);
                resetForm();
                resetRequeryForm();
                if (item.key === 'runtime-route-matching') navigate(`/channel-integration/${channelCode}/channel-info/runtime-control/route-matching`);
                if (item.key === 'runtime-flow-groups') navigate(`/channel-integration/${channelCode}/channel-info/runtime-control/flow-groups`);
                if (item.key !== 'runtime-route-matching' && item.key !== 'runtime-flow-groups') navigate(`/channel-integration/${channelCode}/channel-info`);
              }
            }}
            items={[
              { key: 'capability', label: 'Capability' },
              { key: 'application', label: 'Application' },
              { key: 'party', label: 'Party' },
              { key: 'response-code', label: 'Response Code', children: [{ key: 'external-internal', label: 'External->Internal' }, { key: 'internal-external', label: 'Internal->External' }] },
              { key: 'institution', label: 'Institution' },
              { key: 'requery', label: 'Requery Strategy' },
              { key: 'runtime-control', label: 'Runtime Control', children: [{ key: 'runtime-route-matching', label: 'Route Matching' }, { key: 'runtime-flow-groups', label: 'Flow Groups' }] },
              { key: 'service-channel', label: 'Service Channel' },
            ]}
          />
        )}
      </Sider>
      <Layout>
        <div style={{ background: '#fff', borderBottom: '1px solid #edf0f2', padding: '12px 24px' }}>
          <Space size={18} align="center" wrap>
            <Text strong><span style={{ color: '#ff4d4f' }}>*</span> Cloud:</Text>
            <Select style={{ width: 220 }} placeholder="Select Cloud" value={cloud} onChange={(value) => { setCloud(value); setEnv(undefined); }} options={[{ value: 'ALIYUN' }, { value: 'BD' }, { value: 'MFB' }]} />
            <Text strong><span style={{ color: '#ff4d4f' }}>*</span> Env:</Text>
            <Select style={{ width: 220 }} placeholder="Select Env" value={env} disabled={!cloud} onChange={setEnv} options={[{ value: 'DAILY' }, { value: 'PRE' }, { value: 'PROD' }]} />
            <Button type="primary" onClick={() => cloud && env ? setApplied({ cloud, env }) : message.warning('Please select Cloud and Env first')}>Apply</Button>
          </Space>
        </div>
        <Content style={{ padding: 24 }}>
          <Breadcrumb items={[{ title: channelCode }, ...(runtimeDetailView ? [{ title: 'Runtime Control' }, { title: runtimeDetailView.kind === 'route-matching' ? 'Route Matching' : 'Flow Groups' }, { title }] : isRequery ? [{ title: 'Requery Strategy' }] : isRuntimeRouteMatching || isRuntimeFlowGroups ? [{ title: 'Runtime Control' }, { title }] : [{ title: 'Response Code' }, { title: detailView ? 'External->Internal' : title }, ...(detailView ? [{ title }] : [])])]} style={{ marginBottom: 12 }} />
          <Space align="center" style={{ marginBottom: 18 }}>
            <Typography.Title level={3} style={{ margin: 0 }}>{title}</Typography.Title>
            {applied && <Tag color="green" style={{ fontSize: 14, padding: '4px 10px' }}>{applied.cloud} - {applied.env}</Tag>}
          </Space>

          {!applied ? (
            <Card style={{ height: 280, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ textAlign: 'center', color: '#6b7280' }}>
                <Typography.Title level={4} style={{ color: '#ff4d4f' }}>Please select Cloud and Env</Typography.Title>
                <div>Please specify the Cloud and the Environment first.</div>
              </div>
            </Card>
          ) : renderActivePage()}
        </Content>
      </Layout>

      <Modal title={editingExternal || editingInternal ? 'Config Response Code' : 'Create Response Code'} open={createOpen} width={isExternal ? 760 : 820} onCancel={resetForm} onOk={isExternal ? saveExternal : saveInternal} okText="Save">
        <Form form={form} layout="vertical" style={{ marginTop: 12 }}>
          {isExternal ? (
            <>
              <Form.Item name="path" label="Endpoint" rules={[{ required: true }]}><Select disabled={!!editingExternal} options={externalEndpointOptions} onChange={() => form.setFieldsValue({ bt: undefined, ability: undefined, subState: undefined, responseCode: undefined })} /></Form.Item>
              <Form.Item name="bt" label="Business Type" rules={[{ required: true }]}><Select disabled={!!editingExternal || !selectedPath} options={externalBtOptions} onChange={() => form.setFieldsValue({ ability: undefined })} /></Form.Item>
              <Form.Item name="ability" label="Ability" rules={[{ required: true }]}><Select disabled={!!editingExternal || !selectedBt} options={externalAbilityOptions} onChange={() => form.setFieldsValue({ subState: undefined, responseCode: undefined })} /></Form.Item>
              <Form.Item name="channelResponseCode" label="Channel Response Code" rules={[{ required: true }]}><Input disabled={!!editingExternal} /></Form.Item>
              <Form.Item name="channelDescription" label="Description" rules={[{ required: true }]}><Input /></Form.Item>
            </>
          ) : (
            <>
              <Form.Item name="path" label="Endpoint" rules={[{ required: true }]}><Select disabled={!!editingInternal} options={internalEndpointOptions} onChange={() => form.setFieldsValue({ bt: undefined, ability: undefined, subState: undefined, responseCode: undefined })} /></Form.Item>
              <Form.Item name="bt" label="Business Type" rules={[{ required: true }]}><Select disabled={!!editingInternal || !selectedPath} options={internalBtOptions} onChange={() => form.setFieldsValue({ ability: undefined, subState: undefined, responseCode: undefined })} /></Form.Item>
              <Form.Item name="ability" label="Ability" rules={[{ required: true }]}><Select disabled={!!editingInternal || !selectedBt} options={internalAbilityOptions} onChange={() => form.setFieldsValue({ subState: undefined, responseCode: undefined })} /></Form.Item>
            </>
          )}
          {(isExternal || (isInternal && selectedBt && selectedAbility)) && (
            <div style={{ marginBottom: 8 }}>
              <Button
                type="link"
                size="small"
                icon={<EyeOutlined />}
                disabled={!stateMachineName}
                onClick={() => setPreviewStateMachine(stateMachineName)}
                style={{ paddingLeft: 0 }}
              >
                {isNoStateMachine(stateMachineName)
                  ? 'State Machine: Not Applicable'
                  : `Preview State Machine${stateMachineName ? `: ${stateMachineName}` : ''}`}
              </Button>
              {isNoStateMachine(stateMachineName) && (
                <Text type="secondary">Legacy BT + Ability uses fixed legacy statuses.</Text>
              )}
            </div>
          )}
          <Form.Item label="Gateway Sub State" required>
            <Space.Compact style={{ width: '100%' }}>
              <Form.Item name="subState" noStyle rules={[{ required: true, message: 'Select Gateway Sub State' }]}>
                <Select
                  disabled={!!editingInternal || (!!editingExternal && subStateLocked)}
                  options={modalSubStateOptions}
                  onChange={(value) => {
                    const nextMainState = mainStateForSubState(value);
                    if (!editingExternal || nextMainState !== editingExternal.mainState) {
                      form.setFieldsValue({ responseCode: undefined });
                    }
                  }}
                  placeholder="Loaded by Channel + BT + Ability"
                  style={{ width: '100%' }}
                />
              </Form.Item>
              {editingExternal && (
              <Button
                icon={subStateLocked ? <LockOutlined /> : <UnlockOutlined />}
                disabled={!subStateLocked && subStateChanged}
                onClick={() => setSubStateLocked((locked) => !locked)}
                style={{ width: 42 }}
              />
              )}
            </Space.Compact>
          </Form.Item>
          {editingExternal && subStateChanged && (
            <Alert
              type="warning"
              showIcon
              message="Approval required for Gateway Sub State change"
              description="The selected Gateway Sub State has changed. In PROD, this change must be submitted for approval. The field cannot be locked again until the change is saved or discarded."
              style={{ marginBottom: 16 }}
            />
          )}
          <Form.Item label="Main State"><Input value={currentMainState ?? ''} disabled placeholder="Auto-filled from selected Gateway Sub State" /></Form.Item>
          <Form.Item name="responseCode" label="Response Code" rules={[{ required: true }]}><Select disabled={!!editingInternal || !currentMainState} options={currentMainState ? responseCodesByState[currentMainState] : []} /></Form.Item>
          {!isExternal && (
            <>
              <Form.Item name="description" label="Description" rules={[{ required: true }]}><Input /></Form.Item>
              <Form.Item name="channelResponseCode" label="Channel Response Code"><Input maxLength={20} showCount placeholder="Sent to external channels" /></Form.Item>
              <Form.Item name="channelStatus" label="Channel Status"><Input maxLength={40} showCount placeholder="Sent to external channels" /></Form.Item>
              <Form.Item name="channelResponseMessage" label="Channel Response Message"><Input maxLength={60} showCount placeholder="Optional message sent to external channels" /></Form.Item>
              <Alert type="warning" showIcon message="Channel Response Code and Channel Status cannot both be empty." />
            </>
          )}
        </Form>
      </Modal>

      <Modal
        title="Submit Modification Reason"
        open={approvalOpen}
        okText="Submit for Approval"
        onOk={() => void submitExternalApproval()}
        onCancel={() => {
          setApprovalOpen(false);
          approvalForm.resetFields();
        }}
      >
        <Alert
          type="warning"
          showIcon
          message="Production changes require approval."
          description="Enter the reason for this Response Code mapping change. The submitted record can be reviewed in Change History."
          style={{ marginBottom: 16 }}
        />
        <Form form={approvalForm} layout="vertical">
          <Form.Item name="reason" label="Modification Reason" rules={[{ required: true, whitespace: true, message: 'Please enter a modification reason' }]}>
            <Input.TextArea rows={4} maxLength={200} showCount placeholder="Explain why this production mapping needs to change" />
          </Form.Item>
        </Form>
      </Modal>

      <Modal title={editingRequery ? 'Modify Strategy' : 'Create Strategy'} open={requeryOpen} width={980} onCancel={resetRequeryForm} onOk={saveRequery} okText="Save">
        <Form form={requeryForm} labelCol={{ span: 7 }} wrapperCol={{ span: 17 }} style={{ marginTop: 12 }} initialValues={{ type: 'ALL' }}>
          <Form.Item label="Business Type">
            <Input value={selectedRequeryBt} disabled />
          </Form.Item>
          <Form.Item label="Ability">
            <Input value={selectedRequeryAbility} disabled />
          </Form.Item>
          <Form.Item label="Action">
            <Input value={selectedRequeryAction} disabled />
          </Form.Item>
          <Form.Item label="State Machine">
            <Space>
              <Input
                value={isNoStateMachine(requeryStateMachineName) ? 'No State Machine' : requeryStateMachineName}
                disabled
                style={{ width: 360 }}
              />
              <Button
                disabled={!requeryStateMachineName || isNoStateMachine(requeryStateMachineName)}
                onClick={() => setPreviewStateMachine(requeryStateMachineName)}
              >
                Preview
              </Button>
            </Space>
          </Form.Item>
          <Form.Item name="strategyName" label="Strategy Name" rules={[{ required: true }]}>
            <Input placeholder="Please enter strategy name" />
          </Form.Item>
          <Form.Item name="frequency" label="ReQuery Frequency" rules={[{ required: true }]}>
            <InputNumber min={1} style={{ width: '100%' }} addonAfter="s" placeholder="Enter frequency" />
          </Form.Item>
          <Form.Item label="Duration" required>
            <Space.Compact style={{ width: '100%' }}>
              <Form.Item name="durationMin" noStyle rules={[{ required: true, message: 'Enter min duration' }]}>
                <InputNumber min={0} style={{ width: '45%' }} placeholder="Min" />
              </Form.Item>
              <Input style={{ width: '10%', pointerEvents: 'none', textAlign: 'center' }} value="~" disabled />
              <Form.Item name="durationMax" noStyle rules={[{ required: true, message: 'Enter max duration' }]}>
                <InputNumber min={1} style={{ width: '45%' }} addonAfter="s" placeholder="Max" />
              </Form.Item>
            </Space.Compact>
          </Form.Item>
          <Form.Item name="subState" label="Gateway Sub State" rules={[{ required: true }]}>
            <Select options={requerySubStateOptions} placeholder="Select sub state" onChange={() => requeryForm.setFieldsValue({ responseCodes: undefined })} />
          </Form.Item>
          <Form.Item label="Main State">
            <Input value={currentRequeryMainState ?? ''} disabled placeholder="Auto-filled from selected Gateway Sub State" />
          </Form.Item>
          <Form.Item name="type" label="type" rules={[{ required: true }]}>
            <Select
              placeholder="Select a response code"
              options={valueOptions(['ALL', 'Include', 'Exclude'])}
              onChange={(value) => {
                if (value === 'ALL') requeryForm.setFieldsValue({ responseCodes: [] });
              }}
            />
          </Form.Item>
          <Form.Item
            name="responseCodes"
            label="Response Code"
            rules={[{
              validator: (_, value) => selectedRequeryType === 'ALL' || (value && value.length > 0) ? Promise.resolve() : Promise.reject(new Error('Please select response codes')),
            }]}
          >
            <Select
              mode="multiple"
              disabled={selectedRequeryType === 'ALL'}
              placeholder={selectedRequeryType === 'ALL' ? 'All response codes' : 'Select response codes'}
              options={(currentRequeryMainState ? responseCodesByState[currentRequeryMainState] : responseCodesByState.PENDING).map((item) => ({ label: item.label, value: item.value }))}
            />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={runtimeConfigTarget ? runtimeTargetTitle(runtimeConfigTarget) : 'Runtime Config'}
        open={!!runtimeConfigTarget}
        width={760}
        okText="Submit"
        onCancel={() => { setRuntimeConfigTarget(null); setRuntimeDraft({}); }}
        onOk={saveRuntimeConfig}
      >
        {runtimeConfigTarget && (
          <Table
            rowKey="id"
            pagination={false}
            dataSource={runtimeTargetRows(runtimeConfigTarget)}
            columns={[
              { title: runtimeConfigTarget.kind === 'matching' ? 'Matching ID' : 'Group ID', dataIndex: 'label' },
              { title: 'Version', dataIndex: 'version', width: 180 },
              {
                title: 'Runtime Status',
                width: 160,
                render: (_, row) => (
                  <Switch
                    checked={runtimeDraft[row.id]?.enabled ?? false}
                    onChange={(enabled) => setRuntimeDraft((draft) => {
                      const current = draft[row.id] ?? { weight: 0 };
                      return { ...draft, [row.id]: { ...current, enabled, weight: enabled && Number(current.weight ?? 0) <= 0 ? 100 : current.weight } };
                    })}
                  />
                ),
              },
              {
                title: 'Weight',
                width: 180,
                render: (_, row) => (
                  <InputNumber
                    min={0}
                    max={100}
                    addonAfter="%"
                    disabled={!runtimeDraft[row.id]?.enabled}
                    value={runtimeDraft[row.id]?.weight}
                    onChange={(weight) => setRuntimeDraft((draft) => ({ ...draft, [row.id]: { ...(draft[row.id] ?? { enabled: false }), weight: Number(weight ?? 0) } }))}
                  />
                ),
              },
            ]}
          />
        )}
      </Modal>

      <Modal
        title="Submit Runtime Change Reason"
        open={runtimeApprovalOpen}
        okText="Submit for Approval"
        onOk={() => void submitRuntimeApproval()}
        onCancel={() => {
          setRuntimeApprovalOpen(false);
          setPendingRuntimeDraft(null);
          runtimeApprovalForm.resetFields();
        }}
      >
        <Alert type="warning" showIcon message="Production runtime changes require approval." style={{ marginBottom: 16 }} />
        <Form form={runtimeApprovalForm} layout="vertical">
          <Form.Item name="reason" label="Modification Reason" rules={[{ required: true, whitespace: true, message: 'Please enter a modification reason' }]}>
            <Input.TextArea rows={4} maxLength={200} showCount placeholder="Explain why this runtime config needs to change" />
          </Form.Item>
        </Form>
      </Modal>

      {renderRuntimeComponentDetailDrawer()}

      <Modal
        title="Timeout Config"
        open={!!timeoutTarget}
        width={760}
        onCancel={() => setTimeoutTarget(null)}
        onOk={() => { setTimeoutTarget(null); message.success('Timeout config saved'); }}
        okText="Confirm"
      >
        {timeoutTarget && (
          <>
            <Alert type="info" showIcon message="Timeout Config is confirmed under Runtime Control / Flow Groups. Paths are aggregated from httpCall components inside the selected Flow Group." style={{ marginBottom: 16 }} />
            <Descriptions column={1} size="small" items={[{ key: 'group', label: 'Flow Group', children: timeoutTarget.label }]} style={{ marginBottom: 16 }} />
            <Form form={timeoutForm} layout="vertical">
              {timeoutTarget.paths.map((item) => (
                <Form.Item key={item.id} name={['timeouts', item.id]} label={`${item.path} · ${item.source}`} rules={[{ required: true }]}>
                  <InputNumber min={1} addonAfter="ms" style={{ width: '100%' }} />
                </Form.Item>
              ))}
            </Form>
          </>
        )}
      </Modal>

      <Modal title="Change History" open={!!runtimeHistory} onCancel={() => setRuntimeHistory(null)} footer={<Button onClick={() => setRuntimeHistory(null)}>Close</Button>} width={980}>
        {runtimeHistory && (
          <>
            <Descriptions column={2} size="small" style={{ marginBottom: 16 }} items={[
              { key: 'kind', label: 'Runtime Type', children: runtimeHistory.kind },
              { key: 'title', label: 'Object', children: runtimeHistory.title },
              ...runtimeHistory.context.map((item) => ({ key: item.label, label: item.label, children: item.value })),
            ]} />
            <Table
              rowKey="version"
              pagination={false}
              dataSource={[
                ...runtimeApprovals
                  .filter((item) => item.kind === (runtimeHistory.kind === 'Route Matching' ? 'matching' : 'group') && (!runtimeHistory.targetId || item.targetId === runtimeHistory.targetId))
                  .map((item) => ({
                    version: item.id,
                    weight: item.changes.map((change) => `${change.id}: ${change.enabled ? `${change.weight}%` : 'off'}`).join('; '),
                    runtimeStatus: 'pending approval',
                    operator: item.operator,
                    operationTime: item.operationTime,
                    approvalStatus: item.approvalStatus,
                    reason: item.reason,
                  })),
                { version: '20260707142000', weight: runtimeHistory.weight ? `${runtimeHistory.weight}%` : '-', runtimeStatus: runtimeHistory.enabled ? 'on' : 'off', operator: 'admin', operationTime: '2026-07-07 14:20:00', approvalStatus: 'Approved', reason: '-' },
              ]}
              columns={[
                { title: 'Version', dataIndex: 'version', width: 170 },
                { title: 'Runtime Config', dataIndex: 'weight' },
                { title: 'Runtime Status', dataIndex: 'runtimeStatus', width: 150 },
                { title: 'Reason', dataIndex: 'reason', width: 220 },
                { title: 'Operator', dataIndex: 'operator', width: 150 },
                { title: 'Operation Time', dataIndex: 'operationTime', width: 190 },
                { title: 'Approval Status', dataIndex: 'approvalStatus', width: 150 },
              ]}
            />
          </>
        )}
      </Modal>

      <Modal title="Create Event Operation" open={eventCreateOpen} onCancel={() => { setEventCreateOpen(false); eventForm.resetFields(); }} onOk={() => void saveEventOperation()} okText="Submit" width={720}>
        {detailView?.type === 'event' && (
          <>
            <Descriptions column={1} size="small" style={{ marginBottom: 24 }} items={[
              { key: 'crc', label: 'Channel Response Code', children: detailView.record.channelResponseCode },
              { key: 'responseCode', label: 'Response Code', children: detailView.record.responseCode },
              { key: 'subState', label: 'Gateway Sub State', children: detailView.record.subState },
              { key: 'mainState', label: 'Main State', children: detailView.record.mainState },
            ]} />
            <Form form={eventForm} layout="vertical">
              <Form.Item name="eventType" label="Event Type" rules={[{ required: true, message: 'Select Event Type' }]}>
                <Select options={[{ value: 'Closing Order' }, { value: 'Approval' }]} />
              </Form.Item>
            </Form>
          </>
        )}
      </Modal>

      <Modal title="Bulk Operation" open={bulkOpen} onCancel={() => { setBulkOpen(false); bulkForm.resetFields(); }} onOk={() => { setBulkOpen(false); bulkForm.resetFields(); message.success('Upload submitted'); }} okText="OK" width={680}>
        <Form form={bulkForm} layout="vertical">
          <Form.Item name="endpoint" label="Endpoint" required><Select options={isExternal ? externalEndpointOptions : internalEndpointOptions} onChange={() => bulkForm.setFieldsValue({ bt: undefined, ability: undefined })} /></Form.Item>
          <Form.Item name="bt" label="Business Type" required><Select disabled={!bulkEndpoint} options={bulkBtOptions} onChange={() => bulkForm.setFieldsValue({ ability: undefined })} /></Form.Item>
          {isExternal && <Form.Item name="ability" label="Ability" required><Select disabled={!bulkBt} options={bulkAbilityOptions} /></Form.Item>}
          <Space><Button type="primary">Upload</Button><Button type="link">Download Template</Button></Space>
        </Form>
      </Modal>

      <Modal title="File List" open={fileListOpen} onCancel={() => setFileListOpen(false)} footer={<Button onClick={() => setFileListOpen(false)}>Close</Button>} width={760}>
        <Table rowKey="id" pagination={false} dataSource={fileRows} columns={[{ title: 'File Name', dataIndex: 'fileName' }, { title: 'Type', dataIndex: 'type', width: 120 }, { title: 'Operator', dataIndex: 'operator', width: 150 }, { title: 'Operation Time', dataIndex: 'operationTime', width: 190 }, { title: 'Operation', width: 120, render: (_, row) => <Button type="link" size="small" onClick={() => message.success(`Downloading ${row.fileName}`)}>Download</Button> }]} />
      </Modal>

      <Modal title="Change History" open={!!externalHistory || !!internalHistory} onCancel={() => { setExternalHistory(null); setInternalHistory(null); }} footer={<Button onClick={() => { setExternalHistory(null); setInternalHistory(null); }}>Close</Button>} width={1000}>
        {externalHistory && (
          <>
            <Descriptions column={2} size="small" style={{ marginBottom: 16 }} items={[{ key: 'path', label: 'Endpoint', children: externalHistory.path }, { key: 'bt', label: 'Business Type', children: externalHistory.bt }, { key: 'ability', label: 'Ability', children: externalHistory.ability }, { key: 'crc', label: 'Channel Response Code', children: externalHistory.channelResponseCode }]} />
            <Table
              rowKey="version"
              pagination={false}
              dataSource={[
                ...approvalRequests.filter((item) => item.recordId === externalHistory.id).map((item) => ({
                  version: item.id,
                  description: item.description,
                  subState: item.subState,
                  mainState: item.mainState,
                  responseCode: item.responseCode ?? '-',
                  reason: item.reason,
                  operator: item.operator,
                  operationTime: item.operationTime,
                  approvalStatus: item.approvalStatus,
                })),
                { version: 1, description: externalHistory.channelDescription, subState: externalHistory.subState, mainState: externalHistory.mainState, responseCode: externalHistory.responseCode, reason: '-', operator: 'admin', operationTime: '2026-07-06 20:51:41', approvalStatus: '-' },
              ]}
              columns={[
                { title: 'Version', dataIndex: 'version', width: 160 },
                { title: 'Description', dataIndex: 'description' },
                { title: 'Gateway Sub State', dataIndex: 'subState' },
                { title: 'Main State', dataIndex: 'mainState', width: 130 },
                { title: 'Response Code', dataIndex: 'responseCode', width: 150 },
                { title: 'Reason', dataIndex: 'reason', width: 220 },
                { title: 'Operator', dataIndex: 'operator', width: 140 },
                { title: 'Operation Time', dataIndex: 'operationTime', width: 190 },
                {
                  title: 'Approval Status',
                  dataIndex: 'approvalStatus',
                  width: 160,
                  render: (status, row) => {
                    if (status === '-') return '-';
                    const approval = approvalRequests.find((item) => item.id === row.version);
                    return (
                      <Button
                        type="link"
                        size="small"
                        style={{ padding: 0 }}
                        onClick={() => {
                          setExternalHistory(null);
                          setDetailView({ type: 'approval', record: externalHistory, approval });
                        }}
                      >
                        {renderApprovalStatus(status)}
                      </Button>
                    );
                  },
                },
              ]}
            />
          </>
        )}
        {internalHistory && (
          <>
            <Descriptions column={2} size="small" style={{ marginBottom: 16 }} items={[{ key: 'path', label: 'Endpoint', children: internalHistory.path }, { key: 'bt', label: 'Business Type', children: internalHistory.bt }, { key: 'ability', label: 'Ability', children: internalHistory.ability }, { key: 'responseCode', label: 'Response Code', children: internalHistory.responseCode }, { key: 'state', label: 'Main State', children: internalHistory.mainState }]} />
            <Table rowKey="version" pagination={false} dataSource={[{ version: '20260528215545', description: internalHistory.description, channelStatus: internalHistory.channelStatus || '-', channelResponseCode: internalHistory.channelResponseCode || '-', operator: 'Abayomi Mustapha', operationTime: '2026-05-28 23:54:38', approvalStatus: 'Approved' }, { version: '1', description: internalHistory.description, channelStatus: internalHistory.channelStatus || '-', channelResponseCode: internalHistory.channelResponseCode || '-', operator: 'Abayomi Mustapha', operationTime: '2026-05-26 15:28:38', approvalStatus: '-' }]} columns={[{ title: 'Version', dataIndex: 'version', width: 160 }, { title: 'Description', dataIndex: 'description' }, { title: 'Channel Status', dataIndex: 'channelStatus', width: 170 }, { title: 'Channel Response Code', dataIndex: 'channelResponseCode', width: 210 }, { title: 'Operator', dataIndex: 'operator', width: 180 }, { title: 'Operation Time', dataIndex: 'operationTime', width: 190 }, { title: 'Approval Status', dataIndex: 'approvalStatus', width: 150 }]} />
          </>
        )}
      </Modal>

      <StateMachinePreviewModal
        open={Boolean(previewStateMachine)}
        stateMachine={previewStateMachine ?? ''}
        highlightedState={selectedSubState}
        onClose={() => setPreviewStateMachine(null)}
      />
    </Layout>
  );
}

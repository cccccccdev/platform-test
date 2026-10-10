import { useState, useMemo, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Card, Button, Space, Tag, Typography, Divider, Tooltip, message, Modal, Tabs } from 'antd';
import { ArrowLeftOutlined, SwapOutlined, BugOutlined, CopyOutlined } from '@ant-design/icons';
import { useScenarioStore, useActionStore } from '../../store';
import type { ScenarioVersion } from '../../store';
import { L3_STEP_CONFIGS, L3_COMPONENT_MAP } from './components/l3-steps';
import ReadOnlyL2StepWizardDrawer from './components/ReadOnlyL2StepWizardDrawer';
import DebugConfigModal from './components/DebugConfigModal';
import DebugStatusBar, { type DebugStatus } from './components/DebugStatusBar';
import DebugBottomDrawer, { type LogEntry, type L2ExecutionData, type ContextChange, type TraceNode } from './components/DebugBottomDrawer';
import StopDebugConfirmModal from './components/StopDebugConfirmModal';
import type { StepStatus } from './components/ReadOnlyL2StepWizardDrawer';

const { Text } = Typography;

const STATE_COLORS: Record<string, string> = {
  INIT: '#1890ff',
  PENDING: '#fa8c16',
  SUCCESS: '#52c41a',
  FAIL: '#ff4d4f',
  NOT_FOUND: '#722ed1',
  EMPTY: '#eb2f96',
  EXPIRE: '#a0d911',
};

// Mock SPI data for Detail page (平台内置)
const MOCK_SPI_DATA = {
  title: 'CASHOUT × wallet × pay',
  request: {
    fields: [
      { name: 'amount', type: 'Number', required: true, example: 10000, description: '交易金额（最小单位）' },
      { name: 'currency', type: 'String', required: true, example: 'NGN', description: 'ISO 4217 货币代码' },
      { name: 'merchantId', type: 'String', required: true, example: 'MCH_88888888', description: '商户ID' },
      { name: 'txnRef', type: 'String', required: true, example: 'TXN_20240115_ABC123', description: '商户侧唯一交易参考号' },
      { name: 'accountNumber', type: 'String', required: true, example: '1234567890', description: '目标账户号码' },
      { name: 'bankCode', type: 'String', required: true, example: '044', description: '银行代码' },
      { name: 'email', type: 'String', required: false, example: 'user@example.com', description: '用户邮箱' },
      { name: 'remark', type: 'String', required: false, example: 'Payment for order', description: '交易备注' },
    ],
    example: {
      amount: 10000,
      currency: 'NGN',
      merchantId: 'MCH_88888888',
      txnRef: 'TXN_20240115_ABC123',
      accountNumber: '1234567890',
      bankCode: '044',
      email: 'user@example.com',
      remark: 'Payment for order #12345',
    },
  },
  response: {
    fields: [
      { name: 'code', type: 'String', example: '00', description: '响应码' },
      { name: 'message', type: 'String', example: 'SUCCESS', description: '响应描述' },
      { name: 'txnRef', type: 'String', example: 'TXN_20240115_ABC123', description: '交易参考号' },
      { name: 'transactionId', type: 'String', example: 'PSK_987654321', description: '渠道侧交易ID' },
    ],
    example: {
      code: '00',
      message: 'SUCCESS',
      txnRef: 'TXN_20240115_ABC123',
      transactionId: 'PSK_987654321',
    },
  },
};

// Mock Endpoint data for Detail page
const MOCK_ENDPOINT_DATA = {
  name: 'ISW_CASHOUT_PROD',
  url: 'https://api.interswitchng.com/cashout/v2',
  method: 'POST',
  timeout: 30000,
  format: 'JSON',
  description: 'ISW Cashout 生产环境接口',
  authType: 'Bearer Token',
};

// Breakpoint state type: Map of L3Code -> Array of step indices with breakpoints
type BreakpointMap = Record<string, number[]>;

// Execution state for each L2 node
type L2ExecutionState = 'pending' | 'running' | 'completed' | 'error' | 'breakpoint';
type ExecutionStateMap = Record<string, Record<string, L2ExecutionState>>; // L3Code -> L2Code -> State

export default function SceneDetailPage() {
  const { channelCode, sceneId } = useParams<{ channelCode: string; sceneId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { scenarios, scenarioVersions } = useScenarioStore();
  const { l3Composites, l4Templates } = useActionStore();

  const scenario = scenarios.find((s) => s.scenarioId === sceneId);
  const versions = scenarioVersions[sceneId!] || [];

  // Get selected version from navigation state (set by InstanceSelectionModal)
  const selectedVersion = (location.state as { selectedVersion?: ScenarioVersion })?.selectedVersion
    || versions.find(v => v.status === 'Published')
    || versions[versions.length - 1];

  // Get latest version for comparison
  const latestVersion = versions.length > 0 ? versions[versions.length - 1] : null;
  const isViewingLatest = selectedVersion && latestVersion && selectedVersion.versionNo === latestVersion.versionNo;

  // Get L4 template
  const currentL4 = l4Templates.find(t => t.templateId === selectedVersion?.l4TemplateId);

  // Get Context snapshot for this version
  const contextSnapshot = selectedVersion?.l3Configs || {};

  // Check if current version is deployed (status != Temporary)
  const isDeployed = selectedVersion && selectedVersion.status === 'Published';

  // ========== Breakpoint State ==========
  const [breakpoints, setBreakpoints] = useState<BreakpointMap>({});

  // ========== L3 Step Drawer State ==========
  const [selectedL3Code, setSelectedL3Code] = useState<string | null>(null);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const selectedL3Config = selectedL3Code ? L3_STEP_CONFIGS[selectedL3Code] : null;
  const selectedL3Steps = selectedL3Config?.steps || [];

  // ========== Debug Mode State ==========
  const [isDebugMode, setIsDebugMode] = useState(false);
  const [debugStatus, setDebugStatus] = useState<DebugStatus>('paused');
  const [executionState, setExecutionState] = useState<ExecutionStateMap>({});
  const [currentExecutingL2, setCurrentExecutingL2] = useState<{ l3Code: string; l2Code: string } | null>(null);
  const [currentExecutingL2Name, setCurrentExecutingL2Name] = useState<string>('');
  const [currentExecutingL3Name, setCurrentExecutingL3Name] = useState<string>('');

  // ========== Debug Data ==========
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [selectedL2Execution, setSelectedL2Execution] = useState<L2ExecutionData | null>(null);
  const [contextChanges, setContextChanges] = useState<ContextChange[]>([]);
  const [traceNodes, setTraceNodes] = useState<TraceNode[]>([]);

  // ========== Modals ==========
  const [isDebugModalOpen, setIsDebugModalOpen] = useState(false);
  const [isStopConfirmOpen, setIsStopConfirmOpen] = useState(false);
  const [isSpiSampleModalOpen, setIsSpiSampleModalOpen] = useState(false);
  const [isEndpointSampleModalOpen, setIsEndpointSampleModalOpen] = useState(false);

  // ========== Bottom Drawer ==========
  const [isBottomDrawerOpen, setIsBottomDrawerOpen] = useState(false);

  // Toggle breakpoint for a specific step
  const toggleBreakpoint = useCallback((l3Code: string, stepIndex: number) => {
    // Don't allow breakpoint changes during execution of this L2
    const currentState = executionState[l3Code]?.[selectedL3Steps[stepIndex]?.l2Code];
    if (currentState === 'running' || currentState === 'completed') {
      message.warning('该步骤已执行，无法修改断点');
      return;
    }

    setBreakpoints(prev => {
      const current = prev[l3Code] || [];
      const hasIndex = current.includes(stepIndex);
      if (hasIndex) {
        return {
          ...prev,
          [l3Code]: current.filter(i => i !== stepIndex),
        };
      } else {
        return {
          ...prev,
          [l3Code]: [...current, stepIndex],
        };
      }
    });
  }, [executionState, selectedL3Steps]);

  // Count total breakpoints
  const totalBreakpointCount = useMemo(() => {
    return Object.values(breakpoints).reduce((sum, arr) => sum + arr.length, 0);
  }, [breakpoints]);

  // Get breakpoint count for a specific L3
  const getBreakpointCount = useCallback((l3Code: string): number => {
    return breakpoints[l3Code]?.length || 0;
  }, [breakpoints]);

  // Get step config for selected L3
  const selectedL3StepStatuses: StepStatus[] = selectedL3Steps.map((_: any, idx: number) => {
    const l2Code = selectedL3Steps[idx]?.l2Code;
    const state = selectedL3Code && l2Code ? executionState[selectedL3Code]?.[l2Code] : undefined;
    if (state === 'running') return 'current' as StepStatus;
    if (state === 'completed') return 'completed' as StepStatus;
    if (state === 'error') return 'error' as StepStatus;
    if (idx === currentStepIndex) return 'current' as StepStatus;
    return 'completed' as StepStatus;
  });

  // Get L3 component for selected L3
  const SelectedL3Component = selectedL3Code ? L3_COMPONENT_MAP[selectedL3Code] : null;

  // Get selected L3 step config for drawer width
  const selectedStepWidth = selectedL3Steps[currentStepIndex]?.width || 480;

  // Get current breakpoints for selected L3
  const selectedL3Breakpoints = selectedL3Code ? (breakpoints[selectedL3Code] || []) : [];

  // ========== Mock Debug Data Generation (Complete Flow) ==========
  // Complete flow for L4-T01: L3-11 → L3-05 → L3-01 → L3-04 → L3-06 → L3-10
  const generateMockDebugData = useCallback(() => {
    const mockLogs: LogEntry[] = [
      // L3-11 Scene Initializer
      { key: '1', timestamp: '14:32:05.001', level: 'INFO', l3Code: 'L3-11', l3Name: 'Scene Initializer', l2Code: 'L2-18', l2Name: 'Variable Definer', message: '初始化全局变量完成', duration: 2 },
      { key: '2', timestamp: '14:32:05.003', level: 'INFO', l3Code: 'L3-11', l3Name: 'Scene Initializer', l2Code: 'L2-19', l2Name: 'Field Generator', message: '生成字段完成，共 8 个字段', duration: 3 },

      // L3-05 Generate Data
      { key: '3', timestamp: '14:32:05.010', level: 'INFO', l3Code: 'L3-05', l3Name: 'Generate Data', l2Code: 'L2-11', l2Name: 'TimestampGenerator', message: '生成时间戳: 1713166325001', duration: 1 },
      { key: '4', timestamp: '14:32:05.012', level: 'INFO', l3Code: 'L3-05', l3Name: 'Generate Data', l2Code: 'L2-10', l2Name: 'RrnGenerator', message: '生成 RRN: PP2026041520X5K', duration: 1 },
      { key: '5', timestamp: '14:32:05.015', level: 'INFO', l3Code: 'L3-05', l3Name: 'Generate Data', l2Code: 'L2-13', l2Name: 'OrderCreator', message: '创建订单记录完成', duration: 28 },

      // L3-01 HTTP Request
      { key: '6', timestamp: '14:32:05.050', level: 'INFO', l3Code: 'L3-01', l3Name: 'HTTP Request', l2Code: 'L2-02', l2Name: 'RequestBuilder', message: '构造请求体完成', duration: 2 },
      { key: '7', timestamp: '14:32:05.052', level: 'INFO', l3Code: 'L3-01', l3Name: 'HTTP Request', l2Code: 'L2-03', l2Name: 'AuthHeaderBuilder', message: '构造认证头完成', duration: 1 },
      { key: '8', timestamp: '14:32:05.053', level: 'INFO', l3Code: 'L3-01', l3Name: 'HTTP Request', l2Code: 'L2-06', l2Name: 'HttpExecutor', message: '发起 HTTP 请求 POST https://api.isw.example.com/cashout', duration: 245 },
      { key: '9', timestamp: '14:32:05.298', level: 'INFO', l3Code: 'L3-01', l3Name: 'HTTP Request', l2Code: 'L2-06', l2Name: 'HttpExecutor', message: '收到响应: 200 OK', duration: 245 },
      { key: '10', timestamp: '14:32:05.299', level: 'DEBUG', l3Code: 'L3-01', l3Name: 'HTTP Request', l2Code: 'L2-09', l2Name: 'ResponseParser', message: '解析响应: code=00, status=SUCCESS', duration: 3 },

      // L3-04 Condition Branch
      { key: '11', timestamp: '14:32:05.305', level: 'INFO', l3Code: 'L3-04', l3Name: 'Condition Branch', l2Code: 'L2-16', l2Name: 'ConditionRouter', message: '分支判断: code=00 → BRANCH_SUCCESS', duration: 2 },

      // L3-06 State Transition
      { key: '12', timestamp: '14:32:05.310', level: 'INFO', l3Code: 'L3-06', l3Name: 'State Transition', l2Code: 'L2-14', l2Name: 'StateWriter', message: '状态变更: INIT → SUCCESS', duration: 5 },

      // L3-10 Response Mapping
      { key: '13', timestamp: '14:32:05.318', level: 'INFO', l3Code: 'L3-10', l3Name: 'Response Mapping', l2Code: 'L2-12', l2Name: 'FieldConverter', message: '组装 SPI Response 完成', duration: 2 },
      { key: '14', timestamp: '14:32:05.320', level: 'INFO', l3Code: 'L3-10', l3Name: 'Response Mapping', message: '流程执行完成', duration: 0 },
    ];

    const mockContextChanges: ContextChange[] = [
      {
        key: 'globalVar.channelId',
        changes: [{ source: 'initial', value: 'CH_ISW', timestamp: '14:32:05.001' }, { source: 'L3-11', value: 'CH_ISW', timestamp: '14:32:05.001', isCurrent: true }],
      },
      {
        key: 'globalVar.merchantId',
        changes: [{ source: 'initial', value: 'MCH_88888888', timestamp: '14:32:05.001' }, { source: 'L3-11', value: 'MCH_88888888', timestamp: '14:32:05.002', isCurrent: true }],
      },
      {
        key: 'generatedFields.rrn',
        changes: [{ source: 'L3-05', value: 'PP2026041520X5K', timestamp: '14:32:05.014', isCurrent: true }],
      },
      {
        key: 'generatedFields.timestamp',
        changes: [{ source: 'L3-05', value: '1713166325001', timestamp: '14:32:05.011', isCurrent: true }],
      },
      {
        key: 'orderVar.status',
        changes: [
          { source: 'initial', value: undefined, timestamp: '' },
          { source: 'L3-05', value: 'PENDING', timestamp: '14:32:05.015', isCurrent: true },
        ],
      },
      {
        key: 'channelResponse.code',
        changes: [{ source: 'L3-01', value: '00', timestamp: '14:32:05.299', isCurrent: true }],
      },
      {
        key: 'channelResponse.message',
        changes: [{ source: 'L3-01', value: 'SUCCESS', timestamp: '14:32:05.299', isCurrent: true }],
      },
      {
        key: 'orderVar.status',
        changes: [
          { source: 'initial', value: undefined, timestamp: '' },
          { source: 'L3-05', value: 'PENDING', timestamp: '14:32:05.015' },
          { source: 'L3-06', value: 'SUCCESS', timestamp: '14:32:05.310', isCurrent: true },
        ],
      },
    ];

    const mockTraceNodes: TraceNode[] = [
      {
        l3Code: 'L3-11',
        l3Name: 'Scene Initializer',
        status: 'completed',
        totalDuration: 5,
        l2Nodes: [
          { l2Code: 'L2-18', l2Name: 'Variable Definer', status: 'completed', duration: 2 },
          { l2Code: 'L2-19', l2Name: 'Field Generator', status: 'completed', duration: 3 },
        ],
      },
      {
        l3Code: 'L3-05',
        l3Name: 'Generate Data',
        status: 'completed',
        totalDuration: 32,
        l2Nodes: [
          { l2Code: 'L2-11', l2Name: 'TimestampGenerator', status: 'completed', duration: 1 },
          { l2Code: 'L2-10', l2Name: 'RrnGenerator', status: 'completed', duration: 1 },
          { l2Code: 'L2-13', l2Name: 'OrderCreator', status: 'completed', duration: 28 },
        ],
      },
      {
        l3Code: 'L3-01',
        l3Name: 'HTTP Request',
        status: 'completed',
        totalDuration: 249,
        l2Nodes: [
          { l2Code: 'L2-02', l2Name: 'RequestBuilder', status: 'completed', duration: 2 },
          { l2Code: 'L2-03', l2Name: 'AuthHeaderBuilder', status: 'completed', duration: 1 },
          { l2Code: 'L2-06', l2Name: 'HttpExecutor', status: 'completed', duration: 245 },
          { l2Code: 'L2-09', l2Name: 'ResponseParser', status: 'completed', duration: 3 },
        ],
      },
      {
        l3Code: 'L3-04',
        l3Name: 'Condition Branch',
        status: 'completed',
        totalDuration: 2,
        l2Nodes: [
          { l2Code: 'L2-16', l2Name: 'ConditionRouter', status: 'completed', duration: 2 },
        ],
      },
      {
        l3Code: 'L3-06',
        l3Name: 'State Transition',
        status: 'completed',
        totalDuration: 5,
        l2Nodes: [
          { l2Code: 'L2-14', l2Name: 'StateWriter', status: 'completed', duration: 5 },
        ],
      },
      {
        l3Code: 'L3-10',
        l3Name: 'Response Mapping',
        status: 'completed',
        totalDuration: 2,
        l2Nodes: [
          { l2Code: 'L2-12', l2Name: 'FieldConverter', status: 'completed', duration: 2 },
        ],
      },
    ];

    // Mock L2 execution data for detail view
    const mockL2Execution: L2ExecutionData = {
      l3Code: 'L3-01',
      l3Name: 'HTTP Request',
      l2Code: 'L2-06',
      l2Name: 'HttpExecutor',
      status: 'completed',
      duration: 245,
      timestamp: '14:32:05.053',
      input: {
        url: 'https://api.isw.example.com/cashout',
        method: 'POST',
        headers: {
          'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
          'Content-Type': 'application/json',
          'X-Merchant-Id': 'MCH_88888888',
          'X-Timestamp': '1713166325001',
          'X-Signature': '••••••••••••••••',
        },
        body: {
          amount: 10000,
          currency: 'NGN',
          merchantId: 'MCH_88888888',
          txnRef: 'PP2026041520X5K',
          accountNumber: '1234567890',
          bankCode: '044',
          narration: 'Payment for order #12345',
        },
      },
      output: {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'X-Trace-Id': 'abc-123-xyz-456',
          'X-Response-Time': '245ms',
        },
        body: {
          code: '00',
          message: 'SUCCESS',
          data: {
            reference: 'PS123456',
            status: 'COMPLETED',
            amount: 10000,
            currency: 'NGN',
          },
        },
      },
    };

    setLogs(mockLogs);
    setContextChanges(mockContextChanges);
    setTraceNodes(mockTraceNodes);
    setSelectedL2Execution(mockL2Execution);
  }, []);

  // ========== Debug Actions ==========
  const handleStartDebug = useCallback((config: { spiInput: any; strategy: 'breakpoint' | 'step' | 'run' }) => {
    console.log('Starting debug with config:', config);
    setIsDebugModalOpen(false);
    setIsDebugMode(true);
    setDebugStatus('running');
    setIsBottomDrawerOpen(true);

    // Initialize execution state using L3_STEP_CONFIGS
    const initState: ExecutionStateMap = {};
    if (currentL4) {
      currentL4.nodes.forEach(node => {
        const config = L3_STEP_CONFIGS[node.l3Code];
        if (config?.steps) {
          initState[node.l3Code] = {};
          config.steps.forEach((step: any) => {
            if (step.isEnabled) {
              initState[node.l3Code][step.l2Code] = 'pending';
            }
          });
        }
      });
    }
    setExecutionState(initState);

    // Generate mock data
    generateMockDebugData();

    // Simulate execution flow step by step
    // Step 1: L3-11 completes quickly
    setTimeout(() => {
      setExecutionState(prev => ({
        ...prev,
        'L3-11': {
          'L2-18': 'completed',
          'L2-19': 'completed',
        },
      }));
    }, 500);

    // Step 2: L3-05 completes
    setTimeout(() => {
      setExecutionState(prev => ({
        ...prev,
        'L3-05': {
          'L2-11': 'completed',
          'L2-10': 'completed',
          'L2-13': 'completed',
        },
      }));
    }, 1000);

    // Step 3: L3-01 starts, pause at breakpoint on HttpExecutor
    setTimeout(() => {
      setExecutionState(prev => ({
        ...prev,
        'L3-01': {
          'L2-02': 'completed',
          'L2-03': 'completed',
          'L2-06': 'breakpoint', // Pause at HttpExecutor
        },
      }));
      setDebugStatus('paused');
      setCurrentExecutingL2({ l3Code: 'L3-01', l2Code: 'L2-06' });
      setCurrentExecutingL2Name('HttpExecutor');
      setCurrentExecutingL3Name('HTTP Request');
    }, 1500);
  }, [currentL4, generateMockDebugData]);

  // Helper to complete flow after continue
  const completeFlowAfterContinue = useCallback(() => {
    // Complete remaining L2s for HTTP Request
    setExecutionState(prev => ({
      ...prev,
      'L3-01': { ...prev['L3-01'], 'L2-09': 'completed' },
    }));

    // Move through L3-04, L3-06, L3-10
    setTimeout(() => {
      setExecutionState(prev => ({ ...prev, 'L3-04': { 'L2-16': 'completed' } }));
      setTimeout(() => {
        setExecutionState(prev => ({ ...prev, 'L3-06': { 'L2-14': 'completed' } }));
        setTimeout(() => {
          setExecutionState(prev => ({ ...prev, 'L3-10': { 'L2-12': 'completed' } }));
          setDebugStatus('completed');
          setCurrentExecutingL2(null);
          message.success('调试完成！');
        }, 200);
      }, 300);
    }, 200);
  }, []);

  const handleContinue = useCallback(() => {
    setDebugStatus('running');

    if (currentExecutingL2) {
      // Complete current L2
      setExecutionState(prev => ({
        ...prev,
        [currentExecutingL2.l3Code]: {
          ...prev[currentExecutingL2.l3Code],
          [currentExecutingL2.l2Code]: 'completed',
        },
      }));
    }

    // Continue to end after delay
    setTimeout(() => {
      completeFlowAfterContinue();
    }, 800);
  }, [currentExecutingL2, completeFlowAfterContinue]);

  const handleStepOver = useCallback(() => {
    setDebugStatus('running');

    // Step over to next L2 within the same L3
    const l3Order = ['L3-11', 'L3-05', 'L3-01', 'L3-04', 'L3-06'];
    const l3L2Map: Record<string, string[]> = {
      'L3-11': ['L2-18', 'L2-19'],
      'L3-05': ['L2-11', 'L2-10', 'L2-13'],
      'L3-01': ['L2-02', 'L2-10', 'L2-03', 'L2-06', 'L2-09', 'L2-12'], // RequestBuilder, RequestMapper, AuthHeader, HttpExecutor, ResponseParser, ResponseMapper
      'L3-04': ['L2-16'],
      'L3-06': ['L2-14'],
    };

    if (!currentExecutingL2) return;

    const l2List = l3L2Map[currentExecutingL2.l3Code] || [];
    const currentIdx = l2List.indexOf(currentExecutingL2.l2Code);

    // Complete current L2
    setExecutionState(prev => ({
      ...prev,
      [currentExecutingL2.l3Code]: {
        ...prev[currentExecutingL2.l3Code],
        [currentExecutingL2.l2Code]: 'completed',
      },
    }));

    // Move to next L2 or next L3
    setTimeout(() => {
      if (currentIdx < l2List.length - 1) {
        // Next L2 in same L3
        const nextL2 = l2List[currentIdx + 1];
        setExecutionState(prev => ({
          ...prev,
          [currentExecutingL2.l3Code]: {
            ...prev[currentExecutingL2.l3Code],
            [nextL2]: 'breakpoint',
          },
        }));
        setCurrentExecutingL2({ l3Code: currentExecutingL2.l3Code, l2Code: nextL2 });
        setCurrentExecutingL2Name(nextL2);

        // Get L2 name based on L3 context
        const getL2Name = (l3Code: string, l2Code: string): string => {
          const l3L2Names: Record<string, Record<string, string>> = {
            'L3-01': {
              'L2-02': 'RequestBuilder', 'L2-10': 'RequestMapper', 'L2-03': 'AuthHeaderBuilder',
              'L2-06': 'HttpExecutor', 'L2-09': 'ResponseParser', 'L2-12': 'ResponseMapper',
            },
            'L3-05': {
              'L2-11': 'TimestampGenerator', 'L2-10': 'RrnGenerator', 'L2-13': 'OrderCreator',
            },
            'L3-11': {
              'L2-18': 'Variable Definer', 'L2-19': 'Field Generator',
            },
            'L3-04': {
              'L2-16': 'ConditionRouter',
            },
            'L3-06': {
              'L2-14': 'StateWriter',
            },
          };
          return l3L2Names[l3Code]?.[l2Code] || l2Code;
        };
        setCurrentExecutingL2Name(getL2Name(currentExecutingL2.l3Code, nextL2));
      } else {
        // Move to next L3
        const currentL3Idx = l3Order.indexOf(currentExecutingL2.l3Code);
        if (currentL3Idx < l3Order.length - 1) {
          const nextL3 = l3Order[currentL3Idx + 1];
          const nextL2 = l3L2Map[nextL3][0];
          setExecutionState(prev => ({
            ...prev,
            [nextL3]: {
              ...prev[nextL3],
              [nextL2]: 'breakpoint',
            },
          }));
          setCurrentExecutingL2({ l3Code: nextL3, l2Code: nextL2 });

          const l3Names: Record<string, string> = {
            'L3-11': 'Scene Initializer', 'L3-05': 'Generate Data', 'L3-01': 'HTTP Request',
            'L3-04': 'Condition Branch', 'L3-06': 'State Transition',
          };
          const getL2Name = (l3Code: string, l2Code: string): string => {
            const l3L2Names: Record<string, Record<string, string>> = {
              'L3-01': {
                'L2-02': 'RequestBuilder', 'L2-10': 'RequestMapper', 'L2-03': 'AuthHeaderBuilder',
                'L2-06': 'HttpExecutor', 'L2-09': 'ResponseParser', 'L2-12': 'ResponseMapper',
              },
              'L3-05': {
                'L2-11': 'TimestampGenerator', 'L2-10': 'RrnGenerator', 'L2-13': 'OrderCreator',
              },
              'L3-11': {
                'L2-18': 'Variable Definer', 'L2-19': 'Field Generator',
              },
              'L3-04': {
                'L2-16': 'ConditionRouter',
              },
              'L3-06': {
                'L2-14': 'StateWriter',
              },
            };
            return l3L2Names[l3Code]?.[l2Code] || l2Code;
          };
          setCurrentExecutingL2Name(getL2Name(nextL3, nextL2));
          setCurrentExecutingL3Name(l3Names[nextL3] || nextL3);
        } else {
          // Flow complete
          setDebugStatus('completed');
          setCurrentExecutingL2(null);
          message.success('调试完成！');
        }
      }
      setDebugStatus('paused');
    }, 500);
  }, [currentExecutingL2]);

  const handleStopDebug = useCallback(() => {
    setIsStopConfirmOpen(true);
  }, []);

  const handleConfirmStop = useCallback(() => {
    setIsDebugMode(false);
    setIsStopConfirmOpen(false);
    setDebugStatus('paused');
    setExecutionState({});
    setCurrentExecutingL2(null);
    setIsBottomDrawerOpen(false);
    message.success('调试已终止');
  }, []);

  // Handle L2 selection from logs or canvas
  const handleSelectL2 = useCallback((l2Code: string, l3Code: string) => {
    // Find the L2 name from L3_STEP_CONFIGS
    const config = L3_STEP_CONFIGS[l3Code];
    const step = config?.steps?.find((s: any) => s.l2Code === l2Code);
    const l2Name = step?.l2Name || l2Code;

    // Get L3 name
    const l3 = l3Composites.find(l => l.code === l3Code);
    const l3Name = l3?.name || config?.l3Name || l3Code;

    // Build mock input/output based on L2 type
    let mockInput: any = {};
    let mockOutput: any = {};

    if (l2Code === 'L2-06') { // HttpExecutor
      mockInput = {
        url: 'https://api.isw.example.com/cashout',
        method: 'POST',
        headers: { 'Authorization': 'Bearer eyJ...', 'Content-Type': 'application/json' },
        body: { amount: 10000, currency: 'NGN', merchantId: 'MCH_88888888' },
      };
      mockOutput = {
        statusCode: 200,
        body: { code: '00', message: 'SUCCESS', data: { reference: 'PS123456' } },
      };
    } else if (l2Code === 'L2-02') { // RequestBuilder
      mockInput = { fields: ['amount', 'currency', 'merchantId', 'txnRef'] };
      mockOutput = { requestBody: { amount: 10000, currency: 'NGN' } };
    } else if (l2Code === 'L2-03') { // AuthHeaderBuilder
      mockInput = { credential: { type: 'Bearer Token' } };
      mockOutput = { headers: { 'Authorization': 'Bearer eyJ...' } };
    } else if (l2Code === 'L2-09') { // ResponseParser
      mockInput = { rawResponse: { code: '00', message: 'SUCCESS' } };
      mockOutput = { channelResponse: { code: '00', message: 'SUCCESS', data: {} } };
    } else if (l2Code === 'L2-11') { // TimestampGenerator
      mockOutput = { timestamp: '1713166325001' };
    } else if (l2Code === 'L2-10') { // RrnGenerator
      mockOutput = { rrn: 'PP2026041520X5K' };
    } else if (l2Code === 'L2-13') { // OrderCreator
      mockInput = { txnRef: 'PP2026041520X5K', amount: 10000 };
      mockOutput = { orderId: 'ORD_001', status: 'PENDING' };
    } else if (l2Code === 'L2-16') { // ConditionRouter
      mockInput = { 'channelResponse.code': '00' };
      mockOutput = { branch: 'BRANCH_SUCCESS' };
    } else if (l2Code === 'L2-14') { // StateWriter
      mockInput = { targetState: 'SUCCESS', currentState: 'PENDING' };
      mockOutput = { orderVar: { status: 'SUCCESS' } };
    } else if (l2Code === 'L2-12') { // FieldConverter
      mockInput = { channelResponse: { code: '00' } };
      mockOutput = { spiResponse: { code: '00', message: 'SUCCESS' } };
    }

    setSelectedL2Execution({
      l3Code,
      l3Name,
      l2Code,
      l2Name,
      status: executionState[l3Code]?.[l2Code] || 'pending',
      input: mockInput,
      output: mockOutput,
    });
  }, [l3Composites, executionState]);

  if (!scenario) {
    return (
      <Card>
        <div style={{ textAlign: 'center' }}>
          <p>未找到场景: {sceneId}</p>
          <Button onClick={() => navigate(`/channel-integration/${channelCode}/scenes`)}>返回</Button>
        </div>
      </Card>
    );
  }

  const handleBack = () => {
    navigate(`/channel-integration/${channelCode}/scenes`);
  };

  const handleSwitchInstance = () => {
    navigate(`/channel-integration/${channelCode}/scenes`);
  };

  const handleOpenL3Drawer = (l3Code: string) => {
    setSelectedL3Code(l3Code);
    setCurrentStepIndex(0);
  };

  const handleCloseL3Drawer = () => {
    setSelectedL3Code(null);
    setCurrentStepIndex(0);
  };

  const handleStepChange = (index: number) => {
    setCurrentStepIndex(index);
  };

  const handleBreakpointToggle = (index: number) => {
    if (selectedL3Code) {
      toggleBreakpoint(selectedL3Code, index);
    }
  };

  const handleDrawerBack = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(currentStepIndex - 1);
    }
  };

  const handleNext = () => {
    if (currentStepIndex < selectedL3Steps.length - 1) {
      setCurrentStepIndex(currentStepIndex + 1);
    }
  };

  // Get L2 execution status for display
  const getL2Status = (l3Code: string, l2Code: string): L2ExecutionState => {
    return executionState[l3Code]?.[l2Code] || 'pending';
  };

  // Get status color for canvas display
  const getStatusColor = (status: L2ExecutionState) => {
    switch (status) {
      case 'running': return '#1890ff';
      case 'completed': return '#52c41a';
      case 'error': return '#ff4d4f';
      case 'breakpoint': return '#fa8c16';
      default: return '#d9d9d9';
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      {/* ==================== Top Bar (Debug Mode or Normal) ==================== */}
      {isDebugMode ? (
        <DebugStatusBar
          status={debugStatus}
          currentL3={currentExecutingL3Name}
          currentStep={currentExecutingL2Name}
          instanceInfo={{
            cloud: selectedVersion?.deployedCloud,
            app: selectedVersion?.deployedApp,
            env: selectedVersion?.deployedEnv,
            version: selectedVersion?.versionNo,
          }}
          onContinue={handleContinue}
          onStepOver={handleStepOver}
          onStop={handleStopDebug}
        />
      ) : (
        <div style={{
          height: 56,
          padding: '0 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid #f0f0f0',
          background: '#fff',
        }}>
          {/* Left: Breadcrumb & Instance Info */}
          <Space size="middle">
            <Button icon={<ArrowLeftOutlined />} onClick={handleBack} size="small" />
            <Text strong style={{ fontSize: 16 }}>{scenario.name}</Text>
            <Tag color="blue">{scenario.scenarioId}</Tag>
          </Space>

          {/* Center: Instance Details */}
          <Space size="large" split={<Divider type="vertical" />}>
            <Space size="small">
              <Text type="secondary">Cloud:</Text>
              <Text>{selectedVersion?.deployedCloud || '-'}</Text>
            </Space>
            <Space size="small">
              <Text type="secondary">Application:</Text>
              <Text>{selectedVersion?.deployedApp || '-'}</Text>
            </Space>
            <Space size="small">
              <Text type="secondary">Environment:</Text>
              <Text>{selectedVersion?.deployedEnv || '-'}</Text>
            </Space>
            <Space size="small">
              <Text type="secondary">Version:</Text>
              <Tag color="green">v{selectedVersion?.versionNo}</Tag>
            </Space>
            {selectedVersion?.deployedAt && (
              <Space size="small">
                <Text type="secondary">发布时间:</Text>
                <Text>{new Date(selectedVersion.deployedAt).toLocaleString()}</Text>
              </Space>
            )}
            {selectedVersion?.deployedBy && (
              <Space size="small">
                <Text type="secondary">发布人:</Text>
                <Text>@{selectedVersion.deployedBy}</Text>
              </Space>
            )}
          </Space>

          {/* Right: Actions */}
          <Space size="middle">
            <Button icon={<SwapOutlined />} onClick={handleSwitchInstance}>
              切换实例
            </Button>
            <Button
              type="primary"
              icon={<BugOutlined />}
              disabled={!isDeployed}
              onClick={() => setIsDebugModalOpen(true)}
              title={!isDeployed ? '仅当前运行版本可调试' : undefined}
            >
              Debug
            </Button>
          </Space>
        </div>
      )}

      {/* ==================== Main Content Area ==================== */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* ==================== Left: Context Panel (240px fixed, read-only or live) ==================== */}
        <Card
          size="small"
          title={
            <Space>
              <span>Context</span>
              {isDebugMode ? (
                <Tag color="blue" style={{ fontSize: 10 }}>实时观测</Tag>
              ) : (
                <Tag style={{ fontSize: 10 }}>v{selectedVersion?.versionNo} 发布快照</Tag>
              )}
            </Space>
          }
          extra={<Text type="secondary" style={{ fontSize: 11 }}>{isDebugMode ? '实时' : '只读'}</Text>}
          style={{ width: 240, display: 'flex', flexDirection: 'column' }}
          styles={{ body: { flex: 1, overflow: 'auto', padding: 12 } }}
        >
          {/* Version Diff Warning (only when not in debug mode) */}
          {!isDebugMode && !isViewingLatest && latestVersion && (
            <Card size="small" style={{ background: '#fff7e6', marginBottom: 8 }}>
              <Space>
                <span style={{ fontSize: 12 }}>⚠️</span>
                <Text type="secondary" style={{ fontSize: 11 }}>
                  此版本与最新编辑版本有差异
                </Text>
              </Space>
            </Card>
          )}

          {/* SPI Section */}
          <div style={{ marginBottom: 16 }}>
            <Space style={{ marginBottom: 4 }}>
              <Text type="secondary" style={{ fontSize: 11, textTransform: 'uppercase' }}>SPI</Text>
              <Tag color="blue" style={{ fontSize: 10 }}>v{selectedVersion?.versionNo} 发布快照</Tag>
            </Space>
            <div style={{ paddingLeft: 8, borderLeft: '2px solid #1890ff' }}>
              {/* SPI Title */}
              <Text style={{ fontSize: 12, fontWeight: 500 }}>{MOCK_SPI_DATA.title}</Text>

              {/* spi.request fields */}
              <div style={{ marginTop: 8, fontSize: 11 }}>
                <Text type="secondary" style={{ fontSize: 10 }}>🔵 spi.request</Text>
                {MOCK_SPI_DATA.request.fields.map((field) => (
                  <div key={field.name} style={{ display: 'flex', gap: 4, padding: '1px 0', paddingLeft: 8 }}>
                    <span>{field.name}</span>
                    <span style={{ color: '#999' }}>{field.type}</span>
                    {field.required && <Tag style={{ fontSize: 9, padding: '0 2px' }}>必填</Tag>}
                  </div>
                ))}
              </div>

              {/* spi.response fields */}
              <div style={{ marginTop: 8, fontSize: 11 }}>
                <Text type="secondary" style={{ fontSize: 10 }}>🟣 spi.response</Text>
                {MOCK_SPI_DATA.response.fields.map((field) => (
                  <div key={field.name} style={{ display: 'flex', gap: 4, padding: '1px 0', paddingLeft: 8 }}>
                    <span>{field.name}</span>
                    <span style={{ color: '#999' }}>{field.type}</span>
                  </div>
                ))}
              </div>

              {/* View Example Button */}
              <Button
                type="link"
                size="small"
                style={{ fontSize: 11, padding: 0, marginTop: 8 }}
                onClick={() => setIsSpiSampleModalOpen(true)}
              >
                查看示例 ↗
              </Button>
            </div>
          </div>

          {/* Endpoint Section */}
          <div style={{ marginBottom: 16 }}>
            <Text type="secondary" style={{ fontSize: 11, textTransform: 'uppercase' }}>Endpoint</Text>
            <div style={{ paddingLeft: 8, borderLeft: '2px solid #52c41a' }}>
              <Text style={{ fontSize: 12, fontWeight: 500 }}>{MOCK_ENDPOINT_DATA.name}</Text>

              {/* Endpoint fields */}
              <div style={{ marginTop: 8, fontSize: 11 }}>
                <div style={{ display: 'flex', gap: 4 }}>
                  <Text type="secondary" style={{ width: 60 }}>URL</Text>
                  <Text style={{ wordBreak: 'break-all' }}>{MOCK_ENDPOINT_DATA.url}</Text>
                </div>
                <div style={{ display: 'flex', gap: 4 }}>
                  <Text type="secondary" style={{ width: 60 }}>Method</Text>
                  <Text>{MOCK_ENDPOINT_DATA.method}</Text>
                </div>
                <div style={{ display: 'flex', gap: 4 }}>
                  <Text type="secondary" style={{ width: 60 }}>Timeout</Text>
                  <Text>{MOCK_ENDPOINT_DATA.timeout}ms</Text>
                </div>
                <div style={{ display: 'flex', gap: 4 }}>
                  <Text type="secondary" style={{ width: 60 }}>Format</Text>
                  <Text>{MOCK_ENDPOINT_DATA.format}</Text>
                </div>
                <div style={{ display: 'flex', gap: 4 }}>
                  <Text type="secondary" style={{ width: 60 }}>描述</Text>
                  <Text>{MOCK_ENDPOINT_DATA.description}</Text>
                </div>
                {MOCK_ENDPOINT_DATA.authType && (
                  <div style={{ display: 'flex', gap: 4 }}>
                    <Text type="secondary" style={{ width: 60 }}>认证</Text>
                    <Tag style={{ fontSize: 10 }}>{MOCK_ENDPOINT_DATA.authType}</Tag>
                  </div>
                )}
              </div>

              {/* View Example Button */}
              <Button
                type="link"
                size="small"
                style={{ fontSize: 11, padding: 0, marginTop: 8 }}
                onClick={() => setIsEndpointSampleModalOpen(true)}
              >
                查看示例 ↗
              </Button>
            </div>
          </div>

          {/* Credential Section */}
          <div style={{ marginBottom: 16 }}>
            <Text type="secondary" style={{ fontSize: 11, textTransform: 'uppercase' }}>Credential</Text>
            <div style={{ marginTop: 4, paddingLeft: 8, borderLeft: '2px solid #fa8c16' }}>
              <Space size={4}>
                <Text style={{ fontSize: 12 }}>ISW_API_KEY</Text>
                <Text type="secondary">••••••</Text>
              </Space>
              <br />
              <Space size={4}>
                <Text style={{ fontSize: 12 }}>ISW_SECRET</Text>
                <Text type="secondary">••••••</Text>
              </Space>
            </div>
          </div>

          {/* Global Variable Section */}
          <div style={{ marginBottom: 16 }}>
            <Text type="secondary" style={{ fontSize: 11, textTransform: 'uppercase' }}>Global Variable</Text>
            <div style={{ marginTop: 4, paddingLeft: 8, borderLeft: '2px solid #999' }}>
              <Text style={{ fontSize: 12 }}>MAX_AMOUNT: 5000000</Text>
              <br />
              <Text style={{ fontSize: 12 }}>FEE_RATE: 0.015</Text>
            </div>
          </div>

          {/* Country / Party / Line Section */}
          <div>
            <Text type="secondary" style={{ fontSize: 11, textTransform: 'uppercase' }}>Country / Party / Line</Text>
            <div style={{ marginTop: 4, paddingLeft: 8, borderLeft: '2px solid #722ed1' }}>
              <Text style={{ fontSize: 12 }}>NG / PalmPay / ISW</Text>
            </div>
          </div>
        </Card>

        {/* ==================== Right: Canvas Area (Read-only L4 Flow) ==================== */}
        <Card
          size="small"
          title={<span>流程状态机</span>}
          extra={<Tag color={isDebugMode ? 'blue' : 'green'}>{isDebugMode ? '调试模式' : '只读'}</Tag>}
          style={{ flex: 1, display: 'flex', flexDirection: 'column' }}
          styles={{ body: { flex: 1, overflow: 'auto', padding: 16 } }}
        >
          {currentL4 ? (
            <div>
              {/* State Machine Display */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: 12,
                background: '#fafafa',
                borderRadius: 8,
                marginBottom: 16,
              }}>
                <Text strong>状态机:</Text>
                {currentL4.states.map((state, idx) => (
                  <div key={state} style={{ display: 'flex', alignItems: 'center' }}>
                    {idx > 0 && <span style={{ margin: '0 8px', color: '#999' }}>→</span>}
                    <Tag color={STATE_COLORS[state] || '#999'} style={{ minWidth: 60, textAlign: 'center' }}>
                      {state}
                    </Tag>
                  </div>
                ))}
              </div>

              {/* L4 Nodes - Read Only L3 Cards with Debug Highlighting */}
              <div style={{ marginBottom: 16 }}>
                <Text strong style={{ fontSize: 12, marginBottom: 8, display: 'block' }}>L3 节点:</Text>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
                  {currentL4.nodes.map((node, idx) => {
                    const l3 = l3Composites.find(l => l.code === node.l3Code);
                    const l3Config = contextSnapshot[node.l3Code];
                    const isConfigured = l3Config?.status === 'configured';
                    const bpCount = getBreakpointCount(node.l3Code);
                    const hasRunning = l3?.l2Combination.some(l2 => executionState[node.l3Code]?.[l2] === 'running');
                    const hasBreakpoint = l3?.l2Combination.some(l2 => executionState[node.l3Code]?.[l2] === 'breakpoint');

                    return (
                      <Card
                        key={`${node.l3Code}-${idx}`}
                        size="small"
                        style={{
                          width: 180,
                          borderColor: hasRunning ? '#1890ff' : hasBreakpoint ? '#fa8c16' : isConfigured ? '#52c41a' : '#d9d9d9',
                          background: isConfigured ? '#fafff0' : '#fafafa',
                          cursor: 'pointer',
                          boxShadow: hasRunning ? '0 0 8px rgba(24, 144, 255, 0.5)' :
                                    hasBreakpoint ? '0 0 8px rgba(250, 140, 22, 0.5)' : 'none',
                        }}
                        bodyStyle={{ padding: 12 }}
                        onClick={() => handleOpenL3Drawer(node.l3Code)}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                          <div
                            style={{
                              width: 28,
                              height: 28,
                              borderRadius: 4,
                              background: isConfigured ? '#52c41a' : '#fa8c16',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: '#fff',
                              fontSize: 11,
                              fontWeight: 600,
                            }}
                          >
                            {node.l3Code.replace('L3-', '')}
                          </div>
                          <div>
                            <div style={{ fontWeight: 600, fontSize: 12 }}>
                              {l3?.name || node.l3Code}
                            </div>
                            <div style={{ fontSize: 10, color: '#888' }}>{node.l3Code}</div>
                          </div>
                          {/* Breakpoint count badge */}
                          {bpCount > 0 && (
                            <Tooltip title={`${bpCount} 个断点`}>
                              <div style={{
                                marginLeft: 'auto',
                                background: '#ff4d4f',
                                color: '#fff',
                                borderRadius: '50%',
                                width: 18,
                                height: 18,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: 10,
                                fontWeight: 600,
                              }}>
                                {bpCount}
                              </div>
                            </Tooltip>
                          )}
                        </div>

                        {/* L2 Dependencies with Status */}
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                          {l3?.l2Combination.map((l2Code) => {
                            const l2Status = getL2Status(node.l3Code, l2Code);
                            const isL2Configured = !!l3Config?.l2Dependencies?.[l2Code];
                            return (
                              <Tag
                                key={l2Code}
                                color={isL2Configured ? getStatusColor(l2Status) : 'default'}
                                style={{
                                  fontSize: 9,
                                  borderColor: l2Status === 'running' ? '#1890ff' :
                                             l2Status === 'breakpoint' ? '#fa8c16' : undefined,
                                  borderWidth: l2Status === 'running' || l2Status === 'breakpoint' ? 2 : 1,
                                }}
                              >
                                {l2Code.replace('L2-', '')} {l2Status === 'completed' ? '✓' : l2Status === 'running' ? '●' : l2Status === 'breakpoint' ? '⏸' : '○'}
                              </Tag>
                            );
                          })}
                        </div>

                        {/* Branch indicator if present */}
                        {node.branchKey && (
                          <Tag color="blue" style={{ marginTop: 4, fontSize: 9 }}>
                            {node.branchKey}
                          </Tag>
                        )}
                      </Card>
                    );
                  })}
                </div>
              </div>

              {/* transitions */}
              <div>
                <Text strong style={{ fontSize: 12, marginBottom: 8, display: 'block' }}>流转规则:</Text>
                {currentL4.transitions.map((t, idx) => (
                  <div key={idx} style={{
                    padding: '8px 12px',
                    background: '#f5f5f5',
                    borderRadius: 4,
                    marginBottom: 8,
                    fontSize: 12,
                    display: 'flex',
                    alignItems: 'center',
                  }}>
                    <Tag color="blue">{t.from}</Tag>
                    <span style={{ margin: '0 8px', color: '#999' }}>→</span>
                    <Tag color={STATE_COLORS[t.to] || 'blue'}>{t.to}</Tag>
                    <Text type="secondary" style={{ marginLeft: 8 }}>({t.trigger})</Text>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: 48 }}>
              <Text type="secondary">未找到 L4 模版配置</Text>
            </div>
          )}
        </Card>
      </div>

      {/* ==================== Read-Only L3 Step Wizard Drawer ==================== */}
      {selectedL3Code && selectedL3Config && (
        <ReadOnlyL2StepWizardDrawer
          visible={!!selectedL3Code}
          l3Code={selectedL3Code}
          l3Name={selectedL3Config.l3Name}
          steps={selectedL3Steps}
          currentStepIndex={currentStepIndex}
          stepStatuses={selectedL3StepStatuses}
          breakpoints={selectedL3Breakpoints}
          drawerWidth={selectedStepWidth}
          onClose={handleCloseL3Drawer}
          onStepChange={handleStepChange}
          onBreakpointToggle={handleBreakpointToggle}
          onBack={handleDrawerBack}
          onNext={handleNext}
        >
          {SelectedL3Component && (
            <SelectedL3Component
              currentStepIndex={currentStepIndex}
              form={null}
              readOnly
            />
          )}
        </ReadOnlyL2StepWizardDrawer>
      )}

      {/* ==================== Debug Configuration Modal ==================== */}
      <DebugConfigModal
        visible={isDebugModalOpen}
        selectedVersion={selectedVersion}
        breakpointCount={totalBreakpointCount}
        onCancel={() => setIsDebugModalOpen(false)}
        onStartDebug={handleStartDebug}
      />

      {/* ==================== Stop Debug Confirmation Modal ==================== */}
      <StopDebugConfirmModal
        visible={isStopConfirmOpen}
        onCancel={() => setIsStopConfirmOpen(false)}
        onConfirm={handleConfirmStop}
      />

      {/* ==================== SPI Sample Modal ==================== */}
      <Modal
        title={<Space><span>SPI 报文样例</span><Tag color="blue">{MOCK_SPI_DATA.title}</Tag></Space>}
        open={isSpiSampleModalOpen}
        onCancel={() => setIsSpiSampleModalOpen(false)}
        footer={null}
        width={720}
      >
        <Tabs
          defaultActiveKey="request"
          items={[
            {
              key: 'request',
              label: 'Request 样例',
              children: (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
                    <Button size="small" icon={<CopyOutlined />} onClick={() => {
                      navigator.clipboard.writeText(JSON.stringify(MOCK_SPI_DATA.request.example, null, 2));
                    }}>复制</Button>
                  </div>
                  <pre style={{ background: '#fafafa', padding: 16, borderRadius: 8, fontSize: 12, maxHeight: 400, overflow: 'auto' }}>
{JSON.stringify(MOCK_SPI_DATA.request.example, null, 2)}
                  </pre>
                  <Divider style={{ margin: '16px 0' }} />
                  <Text type="secondary" style={{ fontSize: 11 }}>字段说明：</Text>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11, marginTop: 8 }}>
                    <thead>
                      <tr style={{ background: '#fafafa' }}>
                        <th style={{ padding: '4px 8px', textAlign: 'left' }}>字段名</th>
                        <th style={{ padding: '4px 8px', textAlign: 'left' }}>类型</th>
                        <th style={{ padding: '4px 8px', textAlign: 'center' }}>必填</th>
                        <th style={{ padding: '4px 8px', textAlign: 'left' }}>示例值</th>
                        <th style={{ padding: '4px 8px', textAlign: 'left' }}>说明</th>
                      </tr>
                    </thead>
                    <tbody>
                      {MOCK_SPI_DATA.request.fields.map((f, idx) => (
                        <tr key={idx}>
                          <td style={{ padding: '4px 8px' }}><Text code>{f.name}</Text></td>
                          <td style={{ padding: '4px 8px' }}>{f.type}</td>
                          <td style={{ padding: '4px 8px', textAlign: 'center' }}>{f.required ? '✓' : '选填'}</td>
                          <td style={{ padding: '4px 8px' }}><Text type="secondary">{String(f.example)}</Text></td>
                          <td style={{ padding: '4px 8px' }}>{f.description}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ),
            },
            {
              key: 'response',
              label: 'Response 样例',
              children: (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
                    <Button size="small" icon={<CopyOutlined />} onClick={() => {
                      navigator.clipboard.writeText(JSON.stringify(MOCK_SPI_DATA.response.example, null, 2));
                    }}>复制</Button>
                  </div>
                  <pre style={{ background: '#f6ffed', padding: 16, borderRadius: 8, fontSize: 12, maxHeight: 400, overflow: 'auto' }}>
{JSON.stringify(MOCK_SPI_DATA.response.example, null, 2)}
                  </pre>
                  <Divider style={{ margin: '16px 0' }} />
                  <Text type="secondary" style={{ fontSize: 11 }}>字段说明：</Text>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11, marginTop: 8 }}>
                    <thead>
                      <tr style={{ background: '#fafafa' }}>
                        <th style={{ padding: '4px 8px', textAlign: 'left' }}>字段名</th>
                        <th style={{ padding: '4px 8px', textAlign: 'left' }}>类型</th>
                        <th style={{ padding: '4px 8px', textAlign: 'left' }}>示例值</th>
                        <th style={{ padding: '4px 8px', textAlign: 'left' }}>说明</th>
                      </tr>
                    </thead>
                    <tbody>
                      {MOCK_SPI_DATA.response.fields.map((f, idx) => (
                        <tr key={idx}>
                          <td style={{ padding: '4px 8px' }}><Text code>{f.name}</Text></td>
                          <td style={{ padding: '4px 8px' }}>{f.type}</td>
                          <td style={{ padding: '4px 8px' }}><Text type="secondary">{String(f.example)}</Text></td>
                          <td style={{ padding: '4px 8px' }}>{f.description}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ),
            },
          ]}
        />
      </Modal>

      {/* ==================== Endpoint Sample Modal ==================== */}
      <Modal
        title={<Space><span>Endpoint 样例</span><Tag color="green">{MOCK_ENDPOINT_DATA.name}</Tag></Space>}
        open={isEndpointSampleModalOpen}
        onCancel={() => setIsEndpointSampleModalOpen(false)}
        footer={null}
        width={600}
      >
        <Tabs
          defaultActiveKey="request"
          items={[
            {
              key: 'request',
              label: 'Request 样例',
              children: (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <Text type="secondary" style={{ fontSize: 11 }}>{MOCK_ENDPOINT_DATA.method} {MOCK_ENDPOINT_DATA.url}</Text>
                    <Button size="small" icon={<CopyOutlined />} onClick={() => {
                      navigator.clipboard.writeText(JSON.stringify(MOCK_SPI_DATA.request.example, null, 2));
                    }}>复制</Button>
                  </div>
                  <pre style={{ background: '#fafafa', padding: 16, borderRadius: 8, fontSize: 12, maxHeight: 300, overflow: 'auto' }}>
{JSON.stringify(MOCK_SPI_DATA.request.example, null, 2)}
                  </pre>
                </div>
              ),
            },
            {
              key: 'response',
              label: 'Response 样例',
              children: (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
                    <Button size="small" icon={<CopyOutlined />} onClick={() => {
                      navigator.clipboard.writeText(JSON.stringify(MOCK_SPI_DATA.response.example, null, 2));
                    }}>复制</Button>
                  </div>
                  <pre style={{ background: '#f6ffed', padding: 16, borderRadius: 8, fontSize: 12, maxHeight: 300, overflow: 'auto' }}>
{JSON.stringify(MOCK_SPI_DATA.response.example, null, 2)}
                  </pre>
                </div>
              ),
            },
          ]}
        />
      </Modal>

      {/* ==================== Bottom Debug Drawer ==================== */}
      <DebugBottomDrawer
        visible={isBottomDrawerOpen && isDebugMode}
        logs={logs}
        selectedL2Execution={selectedL2Execution}
        contextChanges={contextChanges}
        traceNodes={traceNodes}
        onClose={() => setIsBottomDrawerOpen(false)}
        onSelectL2={handleSelectL2}
        currentExecutingL2={currentExecutingL2 ? `${currentExecutingL2.l3Code}-${currentExecutingL2.l2Code}` : undefined}
      />
    </div>
  );
}

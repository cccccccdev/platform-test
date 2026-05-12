import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type { FlowEntity, FlowGraph, FlowEnv } from '../domain/flow/types';
import type { Channel, Endpoint, Credential, GlobalVariable, RequeryStrategy } from '../domain/channel/types';
import type { L2Atomic, L3Composite, L4Template } from '../domain/context/types';
import type { Scenario } from '../domain/scenario/types';
import type { TestCase, TestSuite, Trace } from '../domain/testing/types';

// ==================== Flow Store ====================
interface FlowStore {
  flows: FlowEntity[];
  currentFlowId: string | null;
  addFlow: (flow: FlowEntity) => void;
  updateFlow: (flowId: string, updates: Partial<FlowEntity>) => void;
  deleteFlow: (flowId: string) => void;
  setCurrentFlow: (flowId: string | null) => void;
  updateDraftFlowGraph: (flowId: string, graph: FlowGraph) => void;
  deployFlow: (flowId: string, env: FlowEnv) => void;
}

const MOCK_FLOWS: FlowEntity[] = [
  {
    flowId: 'F_001',
    name: 'MoMo入金流程',
    l4TemplateId: 'L4-T01',
    businessType: 'DEPOSIT',
    ability: 'wallet',
    action: 'pay',
    versions: {
      Draft: {
        env: 'Draft',
        versionNo: 3,
        flowGraph: {
          flowId: 'F_001',
          name: 'MoMo入金流程',
          l4TemplateId: 'L4-T01',
          nodes: [
            { nodeId: 'N1', nodeType: 'HttpRequest', ui: { x: 100, y: 150 }, debugPoint: {}, config: { method: 'POST', timeout: 30000 } },
            { nodeId: 'N2', nodeType: 'ConditionBranch', ui: { x: 350, y: 150 }, debugPoint: {}, config: { outputs: [{ outputKey: 'success', label: '成功', ruleCombine: 'AND', rules: [] }, { outputKey: 'fail', label: '失败', ruleCombine: 'AND', rules: [] }] } },
            { nodeId: 'N3', nodeType: 'FieldMapping', ui: { x: 600, y: 80 }, debugPoint: {}, config: { mappings: [{ id: 'm1', fromField: 'orderNo', toField: 'merchantRef', transform: '' }] } },
            { nodeId: 'N4', nodeType: 'MqSend', ui: { x: 600, y: 220 }, debugPoint: {}, config: { topic: 'order.completed', message: '{}' } },
            { nodeId: 'N5', nodeType: 'StateTransition', ui: { x: 850, y: 150 }, debugPoint: {}, config: { targetState: 'SUCCESS' } },
          ],
          edges: [
            { edgeId: 'E1', fromNodeId: 'N1', toNodeId: 'N2', edgeType: 'NEXT' },
            { edgeId: 'E2', fromNodeId: 'N2', toNodeId: 'N3', edgeType: 'BRANCH', branchOutputKey: 'success' },
            { edgeId: 'E3', fromNodeId: 'N2', toNodeId: 'N4', edgeType: 'BRANCH', branchOutputKey: 'fail' },
            { edgeId: 'E4', fromNodeId: 'N3', toNodeId: 'N5', edgeType: 'NEXT' },
            { edgeId: 'E5', fromNodeId: 'N4', toNodeId: 'N5', edgeType: 'NEXT' },
          ],
        },
      },
      Daily: {
        env: 'Daily',
        versionNo: 2,
        flowGraph: {
          flowId: 'F_001',
          name: 'MoMo入金流程',
          l4TemplateId: 'L4-T01',
          nodes: [
            { nodeId: 'N1', nodeType: 'HttpRequest', ui: { x: 100, y: 150 }, debugPoint: {}, config: { method: 'POST', timeout: 30000 } },
            { nodeId: 'N2', nodeType: 'StateTransition', ui: { x: 350, y: 150 }, debugPoint: {}, config: { targetState: 'SUCCESS' } },
          ],
          edges: [
            { edgeId: 'E1', fromNodeId: 'N1', toNodeId: 'N2', edgeType: 'NEXT' },
          ],
        },
        deployedAt: '2026-04-10T08:00:00.000Z',
      },
    },
  },
  {
    flowId: 'F_002',
    name: 'WeChat出金流程',
    l4TemplateId: 'L4-T02',
    businessType: 'WITHDRAWAL',
    ability: 'card',
    action: 'withdraw',
    versions: {
      Draft: {
        env: 'Draft',
        versionNo: 1,
        flowGraph: {
          flowId: 'F_002',
          name: 'WeChat出金流程',
          l4TemplateId: 'L4-T02',
          nodes: [
            { nodeId: 'N1', nodeType: 'HttpRequest', ui: { x: 100, y: 150 }, debugPoint: { pre: true }, config: { method: 'POST' } },
            { nodeId: 'N2', nodeType: 'Requery', ui: { x: 350, y: 150 }, debugPoint: {}, config: { strategy: 'EXPONENTIAL', maxAttempts: 5, interval: 3000 } },
            { nodeId: 'N3', nodeType: 'StateTransition', ui: { x: 600, y: 150 }, debugPoint: { post: true }, config: { targetState: 'SUCCESS', errorState: 'FAIL' } },
          ],
          edges: [
            { edgeId: 'E1', fromNodeId: 'N1', toNodeId: 'N2', edgeType: 'NEXT' },
            { edgeId: 'E2', fromNodeId: 'N2', toNodeId: 'N3', edgeType: 'NEXT' },
          ],
        },
      },
    },
  },
  {
    flowId: 'F_003',
    name: '银行卡退款流程',
    l4TemplateId: 'L4-T05',
    businessType: 'REFUND',
    versions: {
      Draft: {
        env: 'Draft',
        versionNo: 1,
        flowGraph: {
          flowId: 'F_003',
          name: '银行卡退款流程',
          l4TemplateId: 'L4-T05',
          nodes: [],
          edges: [],
        },
      },
    },
  },
];

export const useFlowStore = create<FlowStore>()(
  immer((set) => ({
    flows: MOCK_FLOWS,
    currentFlowId: null,
    addFlow: (flow) => set((state) => { state.flows.push(flow); }),
    updateFlow: (flowId, updates) => set((state) => {
      const idx = state.flows.findIndex((f) => f.flowId === flowId);
      if (idx !== -1) Object.assign(state.flows[idx], updates);
    }),
    deleteFlow: (flowId) => set((state) => {
      state.flows = state.flows.filter((f) => f.flowId !== flowId);
    }),
    setCurrentFlow: (flowId) => set((state) => { state.currentFlowId = flowId; }),
    updateDraftFlowGraph: (flowId, graph) => set((state) => {
      const flow = state.flows.find((f) => f.flowId === flowId);
      if (flow) {
        const draft = flow.versions.Draft;
        flow.versions.Draft = {
          env: 'Draft',
          versionNo: (draft?.versionNo ?? 0) + 1,
          flowGraph: graph,
        };
      }
    }),
    deployFlow: (flowId, env) => set((state) => {
      const flow = state.flows.find((f) => f.flowId === flowId);
      if (flow && flow.versions.Draft) {
        const prevEnv: FlowEnv = env === 'Daily' ? 'Draft' : env === 'Pre' ? 'Daily' : 'Pre';
        if (flow.versions[prevEnv]) {
          flow.versions[env] = {
            ...flow.versions.Draft!,
            env,
            deployedAt: new Date().toISOString(),
          };
        }
      }
    }),
  }))
);

// ==================== Channel Store ====================
interface ChannelStore {
  channels: Channel[];
  endpoints: Endpoint[];
  credentials: Credential[];
  globalVariables: GlobalVariable[];
  requeryStrategies: RequeryStrategy[];
  addChannel: (channel: Channel) => void;
  updateChannel: (channelId: string, updates: Partial<Channel>) => void;
  deleteChannel: (channelId: string) => void;
  addEndpoint: (endpoint: Endpoint) => void;
  updateEndpoint: (endpointId: string, updates: Partial<Endpoint>) => void;
  deleteEndpoint: (endpointId: string) => void;
  addCredential: (credential: Credential) => void;
  updateCredential: (credentialId: string, updates: Partial<Credential>) => void;
  deleteCredential: (credentialId: string) => void;
  addGlobalVariable: (gv: GlobalVariable) => void;
  updateGlobalVariable: (varId: string, updates: Partial<GlobalVariable>) => void;
  deleteGlobalVariable: (varId: string) => void;
  addRequeryStrategy: (strategy: RequeryStrategy) => void;
  updateRequeryStrategy: (strategyId: string, updates: Partial<RequeryStrategy>) => void;
  deleteRequeryStrategy: (strategyId: string) => void;
}

export const useChannelStore = create<ChannelStore>()(
  immer((set) => ({
    channels: [
      {
        channelId: 'CH_MOMO',
        name: 'MoMo支付',
        status: 'active',
        businessTypes: [
          { type: 'DEPOSIT', integrationType: 'CONFIG', capabilities: [{ ability: 'wallet', actions: ['pay', 'refund'] }, { ability: 'card', actions: ['pay'] }] },
          { type: 'WITHDRAWAL', integrationType: 'CONFIG', capabilities: [{ ability: 'card', actions: ['withdraw'] }] },
        ],
      },
      {
        channelId: 'CH_WECHAT',
        name: '微信支付',
        status: 'active',
        businessTypes: [
          { type: 'DEPOSIT', integrationType: 'CONFIG', capabilities: [{ ability: 'wallet', actions: ['pay'] }] },
          { type: 'REFUND', integrationType: 'CONFIG', capabilities: [{ ability: 'wallet', actions: ['refund'] }] },
        ],
      },
      {
        channelId: 'CH_ALIPAY',
        name: '支付宝',
        status: 'inactive',
        businessTypes: [
          { type: 'DEPOSIT', integrationType: 'CODE', capabilities: [{ ability: 'wallet', actions: ['pay'] }] },
        ],
      },
    ],
    endpoints: [
      { endpointId: 'EP001', name: 'MoMo Pay API', path: '/api/v1/momo/pay', method: 'POST', protocol: 'HTTPS', mockEnabled: true },
      { endpointId: 'EP002', name: 'MoMo Query API', path: '/api/v1/momo/query', method: 'GET', protocol: 'HTTPS', mockEnabled: false },
      { endpointId: 'EP003', name: 'WeChat Pay API', path: '/api/v1/wx/pay', method: 'POST', protocol: 'HTTPS', mockEnabled: true },
      { endpointId: 'EP004', name: 'WeChat Refund API', path: '/api/v1/wx/refund', method: 'POST', protocol: 'HTTPS', mockEnabled: false },
    ],
    credentials: [
      {
        credentialId: 'CR_MOMO_001',
        version: 'v2',
        fields: [
          { fieldName: 'appId', fieldType: 'string' },
          { fieldName: 'appSecret', fieldType: 'password' },
          { fieldName: 'merchantId', fieldType: 'string' },
        ],
        values: { appId: 'momo_app_***', merchantId: 'MOMO8888' },
      },
    ],
    globalVariables: [
      { varId: 'GV001', varName: 'MERCHANT_ID', varValue: 'MCH_88888888', version: 'v1' },
      { varId: 'GV002', varName: 'CALLBACK_URL', varValue: 'https://api.example.com/callback', version: 'v1' },
      { varId: 'GV003', varName: 'ENVIRONMENT', varValue: 'PRODUCTION', version: 'v1' },
    ],
    requeryStrategies: [
      { strategyId: 'RS001', businessType: 'DEPOSIT', ability: 'wallet', action: 'pay', responseCodes: ['PENDING', 'PROCESSING'], pendingDuration: 30000, frequency: 5000 },
    ],
    updateChannel: (channelId, updates) => set((state) => {
      const idx = state.channels.findIndex((c) => c.channelId === channelId);
      if (idx !== -1) Object.assign(state.channels[idx], updates);
    }),
    addChannel: (channel) => set((state) => { state.channels.push(channel); }),
    deleteChannel: (channelId) => set((state) => {
      state.channels = state.channels.filter((c) => c.channelId !== channelId);
    }),
    addEndpoint: (endpoint) => set((state) => { state.endpoints.push(endpoint); }),
    updateEndpoint: (endpointId, updates) => set((state) => {
      const idx = state.endpoints.findIndex((e) => e.endpointId === endpointId);
      if (idx !== -1) Object.assign(state.endpoints[idx], updates);
    }),
    deleteEndpoint: (endpointId) => set((state) => {
      state.endpoints = state.endpoints.filter((e) => e.endpointId !== endpointId);
    }),
    addCredential: (credential) => set((state) => { state.credentials.push(credential); }),
    updateCredential: (credentialId, updates) => set((state) => {
      const idx = state.credentials.findIndex((c) => c.credentialId === credentialId);
      if (idx !== -1) Object.assign(state.credentials[idx], updates);
    }),
    deleteCredential: (credentialId) => set((state) => {
      state.credentials = state.credentials.filter((c) => c.credentialId !== credentialId);
    }),
    addGlobalVariable: (gv) => set((state) => { state.globalVariables.push(gv); }),
    updateGlobalVariable: (varId, updates) => set((state) => {
      const idx = state.globalVariables.findIndex((g) => g.varId === varId);
      if (idx !== -1) Object.assign(state.globalVariables[idx], updates);
    }),
    deleteGlobalVariable: (varId) => set((state) => {
      state.globalVariables = state.globalVariables.filter((g) => g.varId !== varId);
    }),
    addRequeryStrategy: (strategy) => set((state) => { state.requeryStrategies.push(strategy); }),
    updateRequeryStrategy: (strategyId, updates) => set((state) => {
      const idx = state.requeryStrategies.findIndex((r) => r.strategyId === strategyId);
      if (idx !== -1) Object.assign(state.requeryStrategies[idx], updates);
    }),
    deleteRequeryStrategy: (strategyId) => set((state) => {
      state.requeryStrategies = state.requeryStrategies.filter((r) => r.strategyId !== strategyId);
    }),
  }))
);

// ==================== Action Library Store ====================
interface ActionStore {
  l2Atomics: L2Atomic[];
  l3Composites: L3Composite[];
  l4Templates: L4Template[];
}

export const useActionStore = create<ActionStore>()(() => ({
  // L2 原子能力（19个）- 按产品方案Block 3完整清单
  l2Atomics: [
    // 分类一：生命周期（1个）
    {
      code: 'L2-01',
      name: 'ContextInit',
      category: '生命周期',
      description: '初始化L1 Context数据总线，将SPI入参、全局变量、Credential注入各命名空间',
      input: ['spiRequest', 'globalConfig', 'credential'],
      output: ['context.spiRequest', 'context.globalVar', 'context.credential'],
      remarks: '每个Flow启动时自动触发，用户不可配置，不在画布中显示为可操作节点',
    },
    // 分类二：请求构造（2个）
    {
      code: 'L2-02',
      name: 'RequestBuilder',
      category: '请求构造',
      description: '将Context中的字段按模板组装成发往渠道的请求体',
      input: ['context任意字段'],
      output: ['context.channelRequest'],
      remarks: '支持JSON/Form/XML模板',
    },
    {
      code: 'L2-03',
      name: 'AuthHeaderBuilder',
      category: '请求构造',
      description: '将Credential中的认证信息构造成HTTP认证请求头',
      input: ['context.credential'],
      output: ['context.authHeader'],
      remarks: '支持Bearer Token/API Key/Basic Auth/OAuth2，Token缓存透明',
    },
    // 分类三：安全处理（4个）
    {
      code: 'L2-04',
      name: 'SignatureBuilder',
      category: '安全处理',
      description: '按渠道规则构造签名串并计算签名值',
      input: ['context.channelRequest', 'context.credential'],
      output: ['context.channelRequest(含签名)', 'context.signatureHeader'],
      remarks: '支持HMAC-SHA256/RSA/MD5及自定义多步哈希拼接',
    },
    {
      code: 'L2-05',
      name: 'RequestEncryptor',
      category: '安全处理',
      description: '对请求体或指定字段进行加密',
      input: ['context.channelRequest', 'context.credential'],
      output: ['context.channelRequest(加密后)'],
      remarks: '支持AES/RSA/国密SM4',
    },
    {
      code: 'L2-07',
      name: 'ResponseDecryptor',
      category: '安全处理',
      description: '对渠道返回的响应体进行解密',
      input: ['context.rawResponse', 'context.credential'],
      output: ['context.rawResponse(解密后)'],
      remarks: '可选，不加密渠道跳过',
    },
    {
      code: 'L2-08',
      name: 'ResponseVerifier',
      category: '安全处理',
      description: '验证渠道响应或Callback报文的签名/完整性',
      input: ['context.rawResponse', 'context.credential'],
      output: [],
      remarks: '验签失败则直接终止Flow，Callback场景必选',
    },
    // 分类四：网络执行（3个）
    {
      code: 'L2-06',
      name: 'HttpExecutor',
      category: '网络执行',
      description: '发起HTTP请求，获取原始响应',
      input: ['context.channelRequest', 'context.authHeader', 'context.signatureHeader'],
      output: ['context.rawResponse'],
      remarks: '内置超时控制、重试策略、TPS限流',
    },
    {
      code: 'L2-09',
      name: 'ResponseParser',
      category: '网络执行',
      description: '将原始响应体解析为结构化数据写入Context',
      input: ['context.rawResponse'],
      output: ['context.channelResponse'],
      remarks: '支持JSON/XML/Form-encoded',
    },
    {
      code: 'L2-19',
      name: 'CallbackResponder',
      category: '网络执行',
      description: '构造并向渠道发送Callback的HTTP响应',
      input: ['响应码', '响应体模板', 'context字段'],
      output: [],
      remarks: '必须在Flow结束前执行',
    },
    // 分类五：数据生成（2个）
    {
      code: 'L2-10',
      name: 'RrnGenerator',
      category: '数据生成',
      description: '生成全局唯一、幂等的渠道参考号（RRN）',
      input: [],
      output: ['context.generateData.rrn'],
      remarks: '内部生成，无外部依赖',
    },
    {
      code: 'L2-11',
      name: 'TimestampGenerator',
      category: '数据生成',
      description: '生成当前时间戳',
      input: [],
      output: ['context.generateData.timestamp'],
      remarks: '支持Unix/ISO8601/自定义格式',
    },
    // 分类六：数据转换（1个）
    {
      code: 'L2-12',
      name: 'FieldConverter',
      category: '数据转换',
      description: '字段映射、类型转换、值枚举替换，支持计算表达式',
      input: ['context任意字段'],
      output: ['context任意字段'],
      remarks: '可写入任意命名空间',
    },
    // 分类七：状态&通知（3个）
    {
      code: 'L2-13',
      name: 'OrderCreator',
      category: '状态通知',
      description: '调用内部订单服务创建订单记录',
      input: ['context.spiRequest', 'context.generateData'],
      output: ['context.orderVar(初始化)'],
      remarks: '仅Transaction Flow使用，Query Flow不触发',
    },
    {
      code: 'L2-14',
      name: 'StateWriter',
      category: '状态通知',
      description: '写入订单状态并记录状态迁移日志',
      input: ['目标状态', 'context.orderVar'],
      output: ['context.orderVar.status(更新)'],
      remarks: '终态幂等，SUCCESS/FAIL写入后不可覆盖，唯一合法状态写入通道',
    },
    {
      code: 'L2-15',
      name: 'MqDispatcher',
      category: '状态通知',
      description: '发送MQ消息通知上游业务域',
      input: ['context.orderVar', 'context.spiRequest'],
      output: [],
      remarks: '支持多Topic，失败自动重试',
    },
    // 分类八：业务逻辑（3个）
    {
      code: 'L2-16',
      name: 'ConditionRouter',
      category: '业务逻辑',
      description: '根据条件表达式决定下一步执行路径',
      input: ['context任意字段'],
      output: [],
      remarks: '支持AND/OR/多路分支/DEFAULT',
    },
    {
      code: 'L2-17',
      name: 'RequeryLoader',
      category: '业务逻辑',
      description: '加载重查策略配置（轮询间隔、最大次数、超时关单阈值）',
      input: ['context.orderVar.rrn'],
      output: ['context.requeryStrategy'],
      remarks: '无',
    },
    {
      code: 'L2-18',
      name: 'OrderReader',
      category: '业务逻辑',
      description: '通过关联键查询已有订单，将订单数据装载进Context',
      input: ['关联键(reference/rrn等)'],
      output: ['context.orderVar(填充)'],
      remarks: 'Callback场景刚需',
    },
  ],

  // L3 业务动作（9个）- 按产品方案Block 4完整清单
  l3Composites: [
    {
      code: 'L3-01',
      name: 'HTTP Request',
      description: '向外部渠道发起完整HTTP请求，是接入工作最核心的节点',
      l2Combination: ['L2-02', 'L2-03', 'L2-04', 'L2-05', 'L2-06', 'L2-07', 'L2-08', 'L2-09'],
      input: ['spiRequest', 'credential', 'channelRequest'],
      output: ['channelResponse'],
      states: [
        { stateValue: 'SUCCESS', stateSource: 'From Code', triggerCondition: '响应码==00' },
        { stateValue: 'FAIL', stateSource: 'From Code', triggerCondition: '响应码!=00' },
      ],
      type: 'Platform',
    },
    {
      code: 'L3-02',
      name: 'Internal Call',
      description: '调用PalmPay内部服务，走内网，不经过任何安全L2',
      l2Combination: ['L2-18', '内部RPC'],
      input: ['spiRequest', 'orderVar'],
      output: ['orderVar', 'channelResponse'],
      states: [
        { stateValue: 'SUCCESS', stateSource: 'Default' },
        { stateValue: 'FAIL', stateSource: 'From Exception' },
      ],
      type: 'Platform',
    },
    {
      code: 'L3-03',
      name: 'Field Mapping',
      description: '纯Context字段转换，不发任何网络请求',
      l2Combination: ['L2-12'],
      input: ['context任意字段'],
      output: ['context任意字段'],
      states: [
        { stateValue: 'SUCCESS', stateSource: 'Default' },
      ],
      type: 'Platform',
    },
    {
      code: 'L3-04',
      name: 'Condition Branch',
      description: '流程条件分叉，决定后续执行哪条路径',
      l2Combination: ['L2-16'],
      input: ['context任意字段'],
      output: [],
      states: [
        { stateValue: 'BRANCH_A', stateSource: 'Custom', triggerCondition: '条件表达式A' },
        { stateValue: 'BRANCH_B', stateSource: 'Custom', triggerCondition: '条件表达式B' },
        { stateValue: 'DEFAULT', stateSource: 'Default' },
      ],
      type: 'Platform',
    },
    {
      code: 'L3-05',
      name: 'Generate Data',
      description: '生成RRN和时间戳，Transaction Flow中同时触发落单',
      l2Combination: ['L2-10', 'L2-11', 'L2-13'],
      input: [],
      output: ['generateData.rrn', 'generateData.timestamp', 'orderVar'],
      states: [
        { stateValue: 'SUCCESS', stateSource: 'Default' },
        { stateValue: 'FAIL', stateSource: 'From Exception' },
      ],
      type: 'Platform',
    },
    {
      code: 'L3-06',
      name: 'State Transition',
      description: '订单状态迁移，是平台内唯一合法的状态写入通道',
      l2Combination: ['L2-14'],
      input: ['orderVar', '目标状态'],
      output: ['orderVar.status'],
      states: [
        { stateValue: 'INIT', stateSource: 'Default' },
        { stateValue: 'PENDING', stateSource: 'From Code', triggerCondition: '业务判断' },
        { stateValue: 'SUCCESS', stateSource: 'From Code', triggerCondition: '业务判断' },
        { stateValue: 'FAIL', stateSource: 'From Code', triggerCondition: '业务判断' },
        { stateValue: 'CLOSE', stateSource: 'From Exception', triggerCondition: '超时' },
      ],
      type: 'Platform',
    },
    {
      code: 'L3-07',
      name: 'Notify Downstream',
      description: '发送MQ消息，通知上游业务域订单状态变更结果',
      l2Combination: ['L2-15'],
      input: ['orderVar', 'spiRequest'],
      output: [],
      states: [
        { stateValue: 'SUCCESS', stateSource: 'Default' },
        { stateValue: 'FAIL', stateSource: 'From Exception' },
      ],
      type: 'Platform',
    },
    {
      code: 'L3-08',
      name: 'Requery',
      description: '读取重查策略，判断时间窗口，自动执行完整重查链路',
      l2Combination: ['L2-17', 'L2-16', 'L3-01'],
      input: ['orderVar.rrn', 'requeryStrategy'],
      output: ['channelResponse', 'orderVar.status'],
      states: [
        { stateValue: 'SUCCESS', stateSource: 'From Code', triggerCondition: '查询成功' },
        { stateValue: 'PENDING', stateSource: 'From Code', triggerCondition: '仍在处理中' },
        { stateValue: 'CLOSE', stateSource: 'From Exception', triggerCondition: '超时关单' },
      ],
      type: 'Platform',
    },
    {
      code: 'L3-09',
      name: 'Callback Parse',
      description: '接收渠道主动推送的Callback，查询原单，验签，解析报文',
      l2Combination: ['L2-18', 'L2-07', 'L2-08', 'L2-09'],
      input: ['rawResponse', 'credential'],
      output: ['orderVar', 'channelResponse'],
      states: [
        { stateValue: 'SUCCESS', stateSource: 'Default' },
        { stateValue: 'FAIL', stateSource: 'From Exception' },
      ],
      type: 'Platform',
    },
    {
      code: 'L3-11',
      name: 'Scene Initializer',
      description: '场景初始化节点，定义全局变量和派生字段，是每个场景的 mandatory 首节点',
      l2Combination: ['L2-A', 'L2-B'],
      input: [],
      output: ['globalVar', 'generatedFields'],
      states: [
        { stateValue: 'SUCCESS', stateSource: 'Default' },
      ],
      type: 'Platform',
    },
  ],

  // L4 流程模版（6个）- 按产品方案Block 2完整清单
  l4Templates: [
    {
      templateId: 'T01',
      name: 'Transaction 同步完成型',
      description: '单次HTTP调用，同步返回终态',
      flowType: 'T01',
      states: ['INIT', 'SUCCESS', 'FAIL'],
      initialState: 'INIT',
      transitions: [
        { from: 'INIT', to: 'SUCCESS', trigger: 'HTTP调用成功' },
        { from: 'INIT', to: 'FAIL', trigger: 'HTTP调用失败' },
      ],
      nodes: [
        { l3Code: 'L3-11' }, // Scene Initializer: mandatory first node
        { l3Code: 'L3-05' },  // Generate Data: 生成RRN/时间戳/落单
        { l3Code: 'L3-01' },  // HTTP Request: 调用渠道接口
        { l3Code: 'L3-04' },  // Condition Branch: 根据channelResponse判断分支
        { l3Code: 'L3-06' },  // State Transition: 写入SUCCESS/FAIL
        { l3Code: 'L3-07' },  // Notify Downstream: MQ通知上游
      ],
      source: 'Public',
    },
    {
      templateId: 'T02',
      name: 'Transaction 异步+Requery',
      description: 'INIT → PENDING → SUCCESS/FAIL/CLOSE，异步轮询场景',
      flowType: 'T02',
      states: ['INIT', 'PENDING', 'SUCCESS', 'FAIL', 'CLOSE'],
      initialState: 'INIT',
      transitions: [
        { from: 'INIT', to: 'PENDING', trigger: '提交成功' },
        { from: 'PENDING', to: 'SUCCESS', trigger: 'Requery成功' },
        { from: 'PENDING', to: 'FAIL', trigger: 'Requery失败' },
        { from: 'PENDING', to: 'CLOSE', trigger: '超时关单' },
      ],
      nodes: [
        { l3Code: 'L3-11' }, // Scene Initializer: mandatory first node
        { l3Code: 'L3-05' },  // Generate Data: 生成RRN/时间戳/落单
        { l3Code: 'L3-01' },  // HTTP Request: 调用渠道接口
        { l3Code: 'L3-04' },  // Condition Branch: 判断success/pending/default
        { l3Code: 'L3-06' },  // State Transition: 写入PENDING/SUCCESS/FAIL
        { l3Code: 'L3-08' },  // Requery: PENDING后异步轮询
        { l3Code: 'L3-07' },  // Notify Downstream: MQ通知上游
      ],
      source: 'Public',
    },
    {
      templateId: 'T03',
      name: 'Transaction 多步调用型',
      description: '同T02，允许多个HTTP Request节点串行',
      flowType: 'T03',
      states: ['INIT', 'PENDING', 'SUCCESS', 'FAIL', 'CLOSE'],
      initialState: 'INIT',
      transitions: [
        { from: 'INIT', to: 'PENDING', trigger: '第一步成功' },
        { from: 'PENDING', to: 'SUCCESS', trigger: '最后一步成功' },
        { from: 'PENDING', to: 'FAIL', trigger: '某步失败' },
        { from: 'PENDING', to: 'CLOSE', trigger: '超时关单' },
      ],
      nodes: [
        { l3Code: 'L3-11' }, // Scene Initializer: mandatory first node
        { l3Code: 'L3-05' },  // Generate Data: 生成RRN/时间戳/落单
        { l3Code: 'L3-01' },  // HTTP Request 1: 第一个接口调用
        { l3Code: 'L3-03' },  // Field Mapping: 多步调用间的字段转换
        { l3Code: 'L3-01' },  // HTTP Request 2: 第二个接口调用
        { l3Code: 'L3-04' },  // Condition Branch: 分支判断
        { l3Code: 'L3-06' },  // State Transition: PENDING/SUCCESS/FAIL
        { l3Code: 'L3-08' },  // Requery: PENDING后异步轮询
        { l3Code: 'L3-07' },  // Notify Downstream: MQ通知
      ],
      source: 'Public',
    },
    {
      templateId: 'T04',
      name: 'General Query',
      description: '不落单、无状态迁移，纯查询',
      flowType: 'T04',
      states: ['INIT', 'SUCCESS', 'FAIL'],
      initialState: 'INIT',
      transitions: [
        { from: 'INIT', to: 'SUCCESS', trigger: '查询成功' },
        { from: 'INIT', to: 'FAIL', trigger: '查询失败' },
      ],
      nodes: [
        { l3Code: 'L3-01' },  // HTTP Request: 调用渠道查询接口
        { l3Code: 'L3-04' },  // Condition Branch: 判断查询结果分支
      ],
      source: 'Public',
    },
    {
      templateId: 'T05',
      name: 'Callback Flow',
      description: '以Callback Parse为强制首节点，PENDING → SUCCESS/FAIL',
      flowType: 'T05',
      states: ['PENDING', 'SUCCESS', 'FAIL'],
      initialState: 'PENDING',
      transitions: [
        { from: 'PENDING', to: 'SUCCESS', trigger: 'Callback解析成功' },
        { from: 'PENDING', to: 'FAIL', trigger: 'Callback解析失败' },
      ],
      nodes: [
        { l3Code: 'L3-09' },  // Callback Parse: 接收渠道回调+查原单+验签+解析
        { l3Code: 'L3-02' },  // Internal Call: 查PalmPay内部原单填充orderVar
        { l3Code: 'L3-04' },  // Condition Branch: 判断Callback结果分支
        { l3Code: 'L3-06' },  // State Transition: 写入SUCCESS/FAIL
        { l3Code: 'L3-07' },  // Notify Downstream: MQ通知上游
      ],
      source: 'Public',
    },
    {
      templateId: 'T06',
      name: 'Inbound Deposit 入金校验型',
      description: 'INIT→FAIL（校验不通过）或 INIT→PENDING→SUCCESS/FAIL/CLOSE（校验通过）',
      flowType: 'T06',
      states: ['INIT', 'PENDING', 'SUCCESS', 'FAIL', 'CLOSE'],
      initialState: 'INIT',
      transitions: [
        { from: 'INIT', to: 'FAIL', trigger: '校验失败' },
        { from: 'INIT', to: 'PENDING', trigger: '校验成功' },
        { from: 'PENDING', to: 'SUCCESS', trigger: '入金成功' },
        { from: 'PENDING', to: 'FAIL', trigger: '入金失败' },
        { from: 'PENDING', to: 'CLOSE', trigger: '超时关单' },
      ],
      nodes: [
        { l3Code: 'L3-11' }, // Scene Initializer: mandatory first node
        { l3Code: 'L3-05' },  // Generate Data: 生成RRN/时间戳/落单
        { l3Code: 'L3-01' },  // HTTP Request: 向渠道发起入金校验请求
        { l3Code: 'L3-04' },  // Condition Branch: 判断校验结果通过/不通过
        { l3Code: 'L3-06' },  // State Transition: 校验不通过→FAIL，校验通过→PENDING
        { l3Code: 'L3-08' },  // Requery: PENDING后异步轮询入金结果
        { l3Code: 'L3-06' },  // State Transition: SUCCESS/FAIL写入
        { l3Code: 'L3-07' },  // Notify Downstream: MQ通知上游
      ],
      source: 'Public',
    },
  ],
}));

// ==================== Scenario Store ====================

export interface ScenarioVersion {
  versionNo: number;
  l4TemplateId: string;
  l3Configs: Record<string, L3NodeConfig>;  // L3 node configs keyed by L3 code
  status: 'Temporary' | 'Published';
  deployedAt?: string;
  deployedBy?: string;
  deployedEnv?: string;  // Environment: DAILY / PRE / PROD
  deployedApp?: string;  // Application name
  deployedCloud?: string;  // Cloud: AWS-NG / AZURE-GH / HUAWEI-UK etc.
}

export interface L3NodeConfig {
  l3Code: string;
  l2Dependencies: Record<string, L2DependencyConfig>;  // L2 code -> config
  status: 'configured' | 'pending';
  inputMappings?: Record<string, string>;
  outputMappings?: Record<string, string>;
}

export interface L2DependencyConfig {
  l2Code: string;
  endpointId?: string;
  method?: string;
  timeout?: number;
  retryCount?: number;
  requeryStrategy?: string;
  requestMappings?: Record<string, string>;
  responseMappings?: Record<string, string>;
}

export interface ScenarioStore {
  scenarios: Scenario[];
  currentScenarioId: string | null;
  scenarioVersions: Record<string, ScenarioVersion[]>;  // scenarioId -> versions
  addScenario: (scenario: Scenario) => void;
  updateScenario: (scenarioId: string, updates: Partial<Scenario>) => void;
  deleteScenario: (scenarioId: string) => void;
  setCurrentScenario: (scenarioId: string | null) => void;
  getScenarioVersions: (scenarioId: string) => ScenarioVersion[];
  addScenarioVersion: (scenarioId: string, version: ScenarioVersion) => void;
  updateScenarioVersion: (scenarioId: string, versionNo: number, updates: Partial<ScenarioVersion>) => void;
  getLatestVersion: (scenarioId: string) => ScenarioVersion | undefined;
}

const MOCK_SCENARIOS: Scenario[] = [
  {
    scenarioId: 'SC_001',
    name: 'MoMo钱包入金',
    businessType: 'DEPOSIT',
    description: 'MoMo支付渠道的钱包入金场景',
    channels: [
      { channelId: 'CH_MOMO', channelName: 'MoMo支付', abilities: ['wallet'], status: 'active' },
    ],
    l4TemplateId: 'L4-T01',
    supportedL3Nodes: ['L3.PAY_REQUEST', 'L3.QUERY_FLOW'],
    status: 'active',
    priority: 1,
  },
  {
    scenarioId: 'SC_002',
    name: 'MoMo银行卡入金',
    businessType: 'DEPOSIT',
    description: 'MoMo支付渠道的银行卡入金场景',
    channels: [
      { channelId: 'CH_MOMO', channelName: 'MoMo支付', abilities: ['card'], status: 'active' },
    ],
    l4TemplateId: 'L4-T01',
    supportedL3Nodes: ['L3.PAY_REQUEST'],
    status: 'active',
    priority: 2,
  },
  {
    scenarioId: 'SC_003',
    name: 'WeChat钱包出金',
    businessType: 'WITHDRAWAL',
    description: '微信支付渠道的钱包出金场景',
    channels: [
      { channelId: 'CH_WECHAT', channelName: '微信支付', abilities: ['card'], status: 'active' },
    ],
    l4TemplateId: 'L4-T02',
    supportedL3Nodes: ['L3.PAY_REQUEST', 'L3.QUERY_FLOW'],
    status: 'active',
    priority: 1,
  },
];

// Mock scenario versions
const MOCK_SCENARIO_VERSIONS: Record<string, ScenarioVersion[]> = {
  'SC_001': [
    {
      versionNo: 1,
      l4TemplateId: 'L4-T01',
      l3Configs: {
        'L3.PAY_REQUEST': {
          l3Code: 'L3.PAY_REQUEST',
          l2Dependencies: {
            'L2.HTTP_BUILD': { l2Code: 'L2.HTTP_BUILD', endpointId: 'EP001', method: 'POST', timeout: 30000 },
            'L2.HTTP_SEND': { l2Code: 'L2.HTTP_SEND', retryCount: 3 },
            'L2.MAP_FIELD': { l2Code: 'L2.MAP_FIELD' },
          },
          status: 'configured',
        },
      },
      status: 'Published',
      deployedAt: '2026-04-10T08:00:00.000Z',
      deployedBy: 'admin',
      deployedEnv: 'PROD',
      deployedApp: 'payment-app',
      deployedCloud: 'AWS-NG',
    },
    {
      versionNo: 2,
      l4TemplateId: 'L4-T01',
      l3Configs: {
        'L3.PAY_REQUEST': {
          l3Code: 'L3.PAY_REQUEST',
          l2Dependencies: {
            'L2.HTTP_BUILD': { l2Code: 'L2.HTTP_BUILD', endpointId: 'EP001', method: 'POST', timeout: 30000 },
            'L2.HTTP_SEND': { l2Code: 'L2.HTTP_SEND', retryCount: 3 },
            'L2.MAP_FIELD': { l2Code: 'L2.MAP_FIELD' },
          },
          status: 'configured',
        },
        'L3.QUERY_FLOW': {
          l3Code: 'L3.QUERY_FLOW',
          l2Dependencies: {
            'L2.HTTP_BUILD': { l2Code: 'L2.HTTP_BUILD', endpointId: 'EP002', method: 'GET', timeout: 10000 },
            'L2.HTTP_SEND': { l2Code: 'L2.HTTP_SEND', retryCount: 5 },
            'L2.REQUERY_POLL': { l2Code: 'L2.REQUERY_POLL' },
          },
          status: 'configured',
        },
      },
      status: 'Temporary',
    },
  ],
  'SC_002': [
    {
      versionNo: 1,
      l4TemplateId: 'L4-T01',
      l3Configs: {
        'L3.PAY_REQUEST': {
          l3Code: 'L3.PAY_REQUEST',
          l2Dependencies: {
            'L2.HTTP_BUILD': { l2Code: 'L2.HTTP_BUILD', endpointId: 'EP001', method: 'POST', timeout: 30000 },
            'L2.HTTP_SEND': { l2Code: 'L2.HTTP_SEND', retryCount: 3 },
            'L2.MAP_FIELD': { l2Code: 'L2.MAP_FIELD' },
          },
          status: 'configured',
        },
      },
      status: 'Published',
      deployedAt: '2026-04-12T10:00:00.000Z',
      deployedBy: 'admin',
      deployedEnv: 'DAILY',
      deployedApp: 'payment-app',
      deployedCloud: 'AWS-NG',
    },
    {
      versionNo: 2,
      l4TemplateId: 'L4-T01',
      l3Configs: {
        'L3.PAY_REQUEST': {
          l3Code: 'L3.PAY_REQUEST',
          l2Dependencies: {
            'L2.HTTP_BUILD': { l2Code: 'L2.HTTP_BUILD', endpointId: 'EP001', method: 'POST', timeout: 30000 },
            'L2.HTTP_SEND': { l2Code: 'L2.HTTP_SEND', retryCount: 3 },
            'L2.MAP_FIELD': { l2Code: 'L2.MAP_FIELD' },
          },
          status: 'configured',
        },
      },
      status: 'Published',
      deployedAt: '2026-04-15T10:00:00.000Z',
      deployedBy: 'alex',
      deployedEnv: 'PRE',
      deployedApp: 'payment-app',
      deployedCloud: 'AZURE-GH',
    },
  ],
  'SC_003': [
    {
      versionNo: 1,
      l4TemplateId: 'L4-T02',
      l3Configs: {
        'L3.PAY_REQUEST': {
          l3Code: 'L3.PAY_REQUEST',
          l2Dependencies: {
            'L2.HTTP_BUILD': { l2Code: 'L2.HTTP_BUILD', endpointId: 'EP003', method: 'POST', timeout: 30000 },
            'L2.HTTP_SEND': { l2Code: 'L2.HTTP_SEND', retryCount: 2 },
            'L2.MAP_FIELD': { l2Code: 'L2.MAP_FIELD' },
          },
          status: 'configured',
        },
        'L3.QUERY_FLOW': {
          l3Code: 'L3.QUERY_FLOW',
          l2Dependencies: {
            'L2.HTTP_BUILD': { l2Code: 'L2.HTTP_BUILD', endpointId: 'EP004', method: 'GET', timeout: 10000 },
            'L2.HTTP_SEND': { l2Code: 'L2.HTTP_SEND', retryCount: 3 },
            'L2.REQUERY_POLL': { l2Code: 'L2.REQUERY_POLL' },
          },
          status: 'pending',
        },
      },
      status: 'Published',
      deployedAt: '2026-04-14T14:00:00.000Z',
      deployedBy: 'admin',
      deployedEnv: 'PRE',
      deployedApp: 'payment-app',
      deployedCloud: 'HUAWEI-UK',
    },
    {
      versionNo: 2,
      l4TemplateId: 'L4-T02',
      l3Configs: {
        'L3.PAY_REQUEST': {
          l3Code: 'L3.PAY_REQUEST',
          l2Dependencies: {
            'L2.HTTP_BUILD': { l2Code: 'L2.HTTP_BUILD', endpointId: 'EP003', method: 'POST', timeout: 30000 },
            'L2.HTTP_SEND': { l2Code: 'L2.HTTP_SEND', retryCount: 2 },
            'L2.MAP_FIELD': { l2Code: 'L2.MAP_FIELD' },
          },
          status: 'configured',
        },
      },
      status: 'Published',
      deployedAt: '2026-04-18T14:32:00.000Z',
      deployedBy: 'alex',
      deployedEnv: 'PROD',
      deployedApp: 'PalmPay',
      deployedCloud: 'AWS-NG',
    },
  ],
};

export const useScenarioStore = create<ScenarioStore>()(
  immer((set, get) => ({
    scenarios: MOCK_SCENARIOS,
    currentScenarioId: null,
    scenarioVersions: MOCK_SCENARIO_VERSIONS,

    addScenario: (scenario) => set((state) => {
      state.scenarios.push(scenario);
      state.scenarioVersions[scenario.scenarioId] = [];
    }),

    updateScenario: (scenarioId, updates) => set((state) => {
      const idx = state.scenarios.findIndex((s) => s.scenarioId === scenarioId);
      if (idx !== -1) Object.assign(state.scenarios[idx], updates);
    }),

    deleteScenario: (scenarioId) => set((state) => {
      state.scenarios = state.scenarios.filter((s) => s.scenarioId !== scenarioId);
      delete state.scenarioVersions[scenarioId];
    }),

    setCurrentScenario: (scenarioId) => set((state) => {
      state.currentScenarioId = scenarioId;
    }),

    getScenarioVersions: (scenarioId) => {
      return get().scenarioVersions[scenarioId] || [];
    },

    addScenarioVersion: (scenarioId, version) => set((state) => {
      if (!state.scenarioVersions[scenarioId]) {
        state.scenarioVersions[scenarioId] = [];
      }
      state.scenarioVersions[scenarioId].push(version);
    }),

    updateScenarioVersion: (scenarioId, versionNo, updates) => set((state) => {
      const versions = state.scenarioVersions[scenarioId];
      if (versions) {
        const idx = versions.findIndex((v) => v.versionNo === versionNo);
        if (idx !== -1) Object.assign(versions[idx], updates);
      }
    }),

    getLatestVersion: (scenarioId) => {
      const versions = get().scenarioVersions[scenarioId] || [];
      return versions.length > 0 ? versions[versions.length - 1] : undefined;
    },
  }))
);

// ==================== Test Store ====================
interface TestStore {
  testCases: TestCase[];
  testSuites: TestSuite[];
  traces: Trace[];
  addTestCase: (tc: TestCase) => void;
  addTestSuite: (ts: TestSuite) => void;
  addTrace: (trace: Trace) => void;
}

export const useTestStore = create<TestStore>()(
  immer((set) => ({
    testCases: [
      { id: 'TC001', name: 'MoMo入金-成功路径', flowId: 'F_001', versionNo: 2, category: 'Happy Path', input: { amount: 10000, currency: 'VND', channel: 'MOMO' }, assertions: [{ type: 'ORDER_STATUS', field: 'status', expectedValue: 'SUCCESS' }], lastResult: 'PASS', lastExecutedAt: '2026-04-15T10:30:00.000Z' },
      { id: 'TC002', name: 'MoMo入金-渠道超时', flowId: 'F_001', versionNo: 2, category: 'Error Path', input: { amount: 10000, currency: 'VND', channel: 'MOMO', mockStrategy: 'TIMEOUT' }, assertions: [{ type: 'ORDER_STATUS', field: 'status', expectedValue: 'FAIL' }], lastResult: 'FAIL', lastExecutedAt: '2026-04-15T10:35:00.000Z' },
      { id: 'TC003', name: 'WeChat出金-重查机制', flowId: 'F_002', versionNo: 1, category: 'Requery', input: { amount: 5000, currency: 'CNY', channel: 'WECHAT' }, assertions: [{ type: 'EXECUTION_PATH', field: 'nodeId', expectedValue: 'N2' }], lastResult: 'PASS', lastExecutedAt: '2026-04-15T11:00:00.000Z' },
    ],
    testSuites: [
      { id: 'TS001', name: 'MoMo入金全链路测试', description: '覆盖所有分支的测试套件', flowId: 'F_001', caseIds: ['TC001', 'TC002'], executionStrategy: 'SEQUENTIAL', continueOnFailure: false, coverageThreshold: 80, lastResult: 'PASS', lastExecutedAt: '2026-04-15T10:40:00.000Z' },
    ],
    traces: [
      {
        id: 'TR001', flowId: 'F_001', env: 'Daily', status: 'SUCCESS', startTime: '2026-04-15T10:30:00.000Z', endTime: '2026-04-15T10:30:01.500Z',
        nodes: [
          { nodeId: 'N1', nodeType: 'HttpRequest', status: 'SUCCESS', startTime: '2026-04-15T10:30:00.000Z', endTime: '2026-04-15T10:30:01.000Z', input: { method: 'POST' }, output: { code: '00', message: 'SUCCESS' } },
          { nodeId: 'N2', nodeType: 'ConditionBranch', status: 'SUCCESS', startTime: '2026-04-15T10:30:01.000Z', endTime: '2026-04-15T10:30:01.100Z', input: { condition: 'code==00' }, output: { branch: 'success' } },
          { nodeId: 'N5', nodeType: 'StateTransition', status: 'SUCCESS', startTime: '2026-04-15T10:30:01.100Z', endTime: '2026-04-15T10:30:01.500Z', input: { targetState: 'SUCCESS' }, output: { orderId: 'ORD_88888' } },
        ],
        contextSnapshots: [],
      },
    ],
    addTestCase: (tc) => set((state) => { state.testCases.push(tc); }),
    addTestSuite: (ts) => set((state) => { state.testSuites.push(ts); }),
    addTrace: (trace) => set((state) => { state.traces.push(trace); }),
  }))
);

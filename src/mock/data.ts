// Mock 数据 - Channel Integration 模块
// 所有数据均为 Mock，不调用真实接口

// 渠道列表
export const mockChannels = [
  { code: 'GTB_NG', country: ['Nigeria'], party: ['PalmPay NG'], status: 'Active', productOwner: 'zhangsan', developmentOwner: 'lisi', operationOwner: 'wangwu', productApprover: 'zhaoliu', developmentApprover: 'sunqi', operationApprover: 'zhouba', operator: 'admin', operationTime: '2026-05-20 10:00:00' },
  { code: 'ZENITH_NG', country: ['Nigeria', 'Ghana'], party: ['PalmPay NG'], status: 'Inactive', productOwner: 'zhangsan', developmentOwner: 'lisi', operationOwner: 'wangwu', productApprover: 'zhaoliu', developmentApprover: 'sunqi', operationApprover: 'zhouba', operator: 'admin', operationTime: '2026-05-20 11:00:00' },
  { code: 'PAYSTACK_NG', country: ['Nigeria'], party: ['PalmPay GH'], status: 'Active', productOwner: 'zhangsan', developmentOwner: 'lisi', operationOwner: 'wangwu', productApprover: 'zhaoliu', developmentApprover: 'sunqi', operationApprover: 'zhouba', operator: 'admin', operationTime: '2026-05-20 12:00:00' },
]

// Credential 列表（按 channelCode 索引）
export const mockCredentials: Record<string, Array<{ id: string; key: string; description?: string }>> = {
  GTB_NG: [
    { id: 'cred_1', key: 'API_KEY', description: 'Main API key' },
    { id: 'cred_2', key: 'SECRET_KEY', description: 'Secret key for signing' },
    { id: 'cred_3', key: 'APP_ID', description: 'Application ID' },
  ],
  ZENITH_NG: [
    { id: 'cred_4', key: 'BEARER_TOKEN', description: 'Bearer token' },
  ],
  PAYSTACK_NG: [
    { id: 'cred_5', key: 'PUBLIC_KEY', description: 'Public key' },
  ],
}

// Business Type 列表（按 channelCode 索引）
export const mockBusinessTypes: Record<string, Array<{ bt: string; mode: 'Config Integration' | 'Code Integration' }>> = {
  GTB_NG: [
    { bt: 'COLLECTION', mode: 'Config Integration' },
    { bt: 'DISBURSEMENT', mode: 'Code Integration' },
  ],
  ZENITH_NG: [
    { bt: 'COLLECTION', mode: 'Config Integration' },
  ],
  PAYSTACK_NG: [],
}

// Ability 列表（Config Integration）
export const mockAbilities: Array<{
  bt: string;
  ability: string;
  publishStatus: 'draft' | 'pending' | 'published';
  badges: Array<{ cloud: string; env: string }>;
}> = [
  {
    bt: 'COLLECTION',
    ability: 'CARD_PAY',
    publishStatus: 'published',
    badges: [{ cloud: 'AWS', env: '生产' }, { cloud: 'GCP', env: '测试' }],
  },
  {
    bt: 'COLLECTION',
    ability: 'USSD_PAY',
    publishStatus: 'draft',
    badges: [],
  },
  {
    bt: 'DISBURSEMENT',
    ability: 'BANK_TRF',
    publishStatus: 'pending',
    badges: [{ cloud: 'AWS', env: 'PRE' }],
  },
]

// outboundEndpoints
export const mockOutboundEndpoints = [
  { name: 'charge_endpoint', url: 'https://api.gtb.ng/charge', method: 'POST' },
  { name: 'query_endpoint', url: 'https://api.gtb.ng/query', method: 'GET' },
  { name: 'refund_endpoint', url: 'https://api.gtb.ng/refund', method: 'POST' },
]

// outboundEndpoints 字段结构
export const mockEndpointFields: Record<string, string[]> = {
  charge_endpoint: ['merchantId', 'amount', 'currency', 'sign', 'callbackUrl'],
  query_endpoint: ['merchantId', 'orderId', 'sign'],
  refund_endpoint: ['merchantId', 'orderId', 'amount', 'sign'],
}

// Match Capability 的内置样例数据。
// 运行期新增和修改只保存在内存中；刷新页面或重启项目后会恢复为这里的样例。
export const mockInboundEndpointsByChannel = {
  GTB_NG: [
    {
      id: 'gtb_callback_endpoint',
      name: 'callback_endpoint',
      url: '/inbound/gtb/callback',
      fields: ['body.orderId', 'body.transType', 'body.channel', 'body.status'],
      matchType: 'A' as const,
      singleNoField: 'body.orderId',
      matchFields: [],
      rules: [],
      version: 'v1.0.0',
      configStatus: 'submitted' as const,
    },
    {
      id: 'gtb_notify_endpoint',
      name: 'notify_endpoint',
      url: '/inbound/gtb/notify',
      fields: ['body.txnRef', 'body.type', 'body.currency', 'header.x-event-source'],
      matchType: 'B' as const,
      singleNoField: '',
      matchFields: ['body.type', 'body.currency', 'header.x-event-source'],
      rules: [
        {
          id: 'gtb_rule_purchase',
          fieldValues: { 'body.type': 'purchase', 'body.currency': 'NGN', 'header.x-event-source': 'card' },
          bt: 'COLLECTION',
          ability: 'CARD_PAY',
          action: 'TRANSACTION',
        },
        {
          id: 'gtb_rule_transfer',
          fieldValues: { 'body.type': 'transfer', 'body.currency': '*', 'header.x-event-source': 'bank' },
          bt: 'DISBURSEMENT',
          ability: 'BANK_TRF',
          action: 'TRANSACTION',
        },
      ],
      version: 'v1.1.0',
      configStatus: 'draft' as const,
    },
  ],
  ZENITH_NG: [
    {
      id: 'zenith_callback_endpoint',
      name: 'callback_endpoint',
      url: '/inbound/zenith/callback',
      fields: ['body.reference', 'body.status'],
      matchType: 'A' as const,
      singleNoField: 'body.reference',
      matchFields: [],
      rules: [],
      version: 'v1.0.0',
      configStatus: 'draft' as const,
    },
  ],
  PAYSTACK_NG: [],
}

// 事件枚举
export const mockEvents = [
  'AUTH_SUCCESS',
  'AUTH_PENDING',
  'AUTH_FAILED',
  'CAPTURE_SUCCESS',
  'CAPTURE_FAILED',
  'SETTLE_SUCCESS',
  'SETTLE_FAILED',
  'NOTIFY_SUCCESS',
  'NOTIFY_FAILED',
]

// Context SPI 字段（按 Action 分）
export const mockSpiFields: Record<string, { request: string[]; response: string[] }> = {
  TRANSACTION: {
    request: ['amount', 'currency', 'merchantId', 'orderId', 'cardNo', 'expiry', 'cvv', 'callbackUrl'],
    response: ['status', 'code', 'message', 'channelRef', 'transactionId'],
  },
  QUERY: {
    request: ['orderId', 'merchantId'],
    response: ['status', 'code', 'channelRef', 'transactionId'],
  },
  VERIFY: {
    request: ['orderId', 'merchantId', 'otp'],
    response: ['status', 'code', 'message'],
  },
  CANCEL: {
    request: ['orderId', 'merchantId'],
    response: ['status', 'code', 'message'],
  },
  REVERSAL: {
    request: ['orderId', 'merchantId', 'amount'],
    response: ['status', 'code', 'reversalRef'],
  },
  INBOUND_TRANSACTION: {
    request: ['channelRef', 'amount', 'currency', 'notifyType'],
    response: ['code', 'message'],
  },
  INBOUND_QUERY: {
    request: ['channelRef', 'queryType'],
    response: ['status', 'code', 'message'],
  },
}

// 版本历史（Control 弹窗用）
export const mockVersionHistory: Array<{ version: string; time: string; status: 'running' | 'stopped' }> = [
  { version: 'v1.2.0', time: '2026-05-07 14:30', status: 'running' },
  { version: 'v1.1.0', time: '2026-04-20 09:10', status: 'stopped' },
  { version: 'v1.0.0', time: '2026-03-15 16:45', status: 'stopped' },
]

// Flow 模板组件（按 Action + Flow 类型）
export const mockFlowTemplates: Record<string, Record<string, string[]>> = {
  TRANSACTION: {
    main: ['initOrder', 'network', 'updateOrder'],
    event: ['network', 'updateOrder'],
    requery: ['network', 'updateOrder'],
    callback: ['parseInboundRequest', 'updateOrder', 'buildInboundResponse', 'sendInboundResponse'],
  },
  QUERY: {
    main: ['network'],
    event: ['network', 'updateOrder'],
    requery: ['network', 'updateOrder'],
  },
  VERIFY: {
    main: ['initOrder', 'network', 'updateOrder'],
    event: ['network', 'updateOrder'],
    requery: ['network', 'updateOrder'],
    callback: ['parseInboundRequest', 'updateOrder', 'buildInboundResponse', 'sendInboundResponse'],
  },
  CANCEL: {
    main: ['initOrder', 'network', 'updateOrder'],
    event: ['network', 'updateOrder'],
    requery: ['network', 'updateOrder'],
    callback: ['parseInboundRequest', 'updateOrder', 'buildInboundResponse', 'sendInboundResponse'],
  },
  REVERSAL: {
    main: ['initOrder', 'network', 'updateOrder'],
    event: ['network', 'updateOrder'],
    requery: ['network', 'updateOrder'],
    callback: ['parseInboundRequest', 'updateOrder', 'buildInboundResponse', 'sendInboundResponse'],
  },
  INBOUND_TRANSACTION: {
    main: ['parseInboundRequest', 'initOrder', 'sendMockOrderMQ', 'buildInboundResponse', 'sendInboundResponse'],
    event: ['network', 'updateOrder'],
  },
  INBOUND_QUERY: {
    main: ['parseInboundRequest', 'requestBusinessAccessLayer', 'buildInboundResponse', 'sendInboundResponse'],
  },
}

// 组件库定义
export const outboundComponents = [
  { name: 'network', label: 'network', description: '核心网络组件' },
  { name: 'generateReference', label: 'generateReference', description: '生成引用号' },
  { name: 'condition', label: 'condition', description: '条件判断' },
  { name: 'initOrder', label: 'initOrder', description: '初始化订单' },
  { name: 'updateOrder', label: 'updateOrder', description: '更新订单' },
]

export const inboundComponents = [
  { name: 'parseInboundRequest', label: 'parseInboundRequest', description: '解析入站请求' },
  { name: 'buildInboundResponse', label: 'buildInboundResponse', description: '构建入站响应' },
  { name: 'sendInboundResponse', label: 'sendInboundResponse', description: '发送入站响应' },
  { name: 'sendMockOrderMQ', label: 'sendMockOrderMQ', description: '发送模拟订单MQ' },
  { name: 'requestBusinessAccessLayer', label: 'requestBusinessAccessLayer', description: '请求业务接入层' },
  { name: 'queryOrder', label: 'queryOrder', description: '查询订单' },
]

// Ability 枚举（按 BT 过滤）
export const abilityOptions: Record<string, string[]> = {
  COLLECTION: ['CARD_PAY', 'USSD_PAY', 'WALLET_PAY'],
  DISBURSEMENT: ['BANK_TRF'],
  REFUND: ['REFUND_PAY'],
  TRANSFER: ['WALLET_TRF'],
}

// Country 枚举
export const countryOptions = ['Nigeria', 'Ghana', 'Kenya', 'Tanzania', 'Uganda', "Côte d'Ivoire"]

// Party 枚举
export const partyOptions = ['PalmPay NG', 'PalmPay GH', 'PalmPay KE']

// Business Type 枚举
export const businessTypeOptions = ['COLLECTION', 'DISBURSEMENT', 'REFUND', 'TRANSFER']

// Action 枚举
export const actionOptions = ['TRANSACTION', 'QUERY', 'VERIFY', 'CANCEL', 'REVERSAL', 'INBOUND_TRANSACTION', 'INBOUND_QUERY']

// Context Data Model - L1 Data Bus

export interface Context {
  credential: Record<string, any>;
  spi: {
    request: Record<string, any>;
    response: Record<string, any>;
  };
  orderVar: Record<string, any>;
  globalVar: Record<string, any>;
  generateData: Record<string, any>;
  channelResponse: Record<string, any>;
  institutionMapping: Record<string, any>;
  transactionSpi?: {
    request: Record<string, any>;
    response: Record<string, any>;
  };
}

// L1 Context Namespaces
export type ContextNamespace = 'spi.request' | 'orderVar' | 'generateData' | 'channelResponse' | 'globalVar';

export const NAMESPACE_COLORS: Record<ContextNamespace, string> = {
  'spi.request': '#1890ff',  // 蓝色
  'orderVar': '#fa8c16',     // 橙色
  'generateData': '#52c41a', // 绿色
  'channelResponse': '#722ed1', // 紫色
  'globalVar': '#999999',    // 无色
};

// L2 Atomic Actions (19个)
export interface L2Atomic {
  code: string;        // L2-01 ~ L2-19
  name: string;
  category: L2Category;
  description: string; // 定位描述
  input: string[];     // 输入字段
  output: string[];    // 输出字段
  remarks?: string;   // 备注
}

export type L2Category =
  | '生命周期'
  | '请求构造'
  | '安全处理'
  | '网络执行'
  | '数据生成'
  | '数据转换'
  | '状态通知'
  | '业务逻辑';

// L3 Composite Actions (9个) - Each L3 has its own state machine
export interface L3StateTransition {
  from: string;
  to: string;
  condition?: string;
}

export interface L4StateMapping {
  l3State: string;
  l4State: string;
}

export interface L3Composite {
  code: string;        // L3-01 ~ L3-09
  name: string;
  description: string;
  l2Combination: string[];  // 构成该L3的L2代码列表
  input: string[];     // 自动推导的整体输入字段
  output: string[];    // 自动推导的整体输出字段
  states: L3StateDefinition[]; // 状态关联配置
  type: 'Platform' | 'Custom';  // 组件类型
}

export interface L3StateDefinition {
  stateValue: string;        // 状态值
  stateSource: 'From Code' | 'From Exception' | 'Default' | 'Custom';
  triggerCondition?: string;  // 触发条件
}

// L4 Flow Templates (6个)
export interface L4Node {
  l3Code: string;       // L3-01 ~ L3-09
  branchKey?: string;   // 分支key，用于条件分支，如 'success' | 'fail'
}

export interface L4Template {
  templateId: string;  // T01 ~ T06
  name: string;
  description: string;
  flowType: 'T01' | 'T02' | 'T03' | 'T04' | 'T05' | 'T06';
  states: string[];
  initialState: string;
  transitions: StateTransition[];
  nodes: L4Node[];      // L4模版预置的L3节点顺序
  source: 'Public' | 'Personal';  // 来源
}

export interface StateTransition {
  from: string;
  to: string;
  trigger: string;
}
